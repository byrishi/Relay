/**
 * Relay transfer engine — direct browser-to-browser over a WebRTC data channel.
 *
 * Protocol v2 (one reliable, ordered channel per peer). Control messages are JSON strings:
 *   sender → receiver   offer{id,name,size,mime,path?,group?}  begin{id,offset}  end{id}
 *                       pause/resume/cancel{id}  text{content}  clip{text}
 *   receiver → sender   accept{id,offset}  decline{id}  ack{id,recv,written}  done{id}  cancel{id,reason?}
 * Binary messages are chunks of the file opened by the last `begin`.
 *
 * Every file is offered first; nothing is streamed until the receiver accepts. The receiver
 * answers with the byte offset it already holds, which is how interrupted transfers resume.
 * Accepted files stream strictly one at a time, so chunks never interleave.
 */
import { Sink, browserSink, cleanupBrowserStorage, crc32Update } from './sinks';

export type SignalData =
  | { type: 'offer'; sdp: string; session?: string }
  | { type: 'answer'; sdp: string; session?: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit; session?: string };

export type TransferStatus =
  | 'offered'      // waiting for the receiver to accept
  | 'queued'       // accepted, waiting for its turn
  | 'transferring'
  | 'paused'
  | 'interrupted'  // connection dropped; resumes automatically on reconnect
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'failed';

export interface GroupInfo { id: string; name: string; count: number; size: number }

export interface FileMeta {
  name: string;
  size: number;
  mime: string;
  /** Path inside a folder transfer, e.g. "photos/2024/a.jpg". */
  path?: string;
  group?: GroupInfo;
}

export interface IncomingOffer extends FileMeta { id: string }

export interface TransferUpdate {
  id: string;
  name: string;
  size: number;
  mime?: string;
  path?: string;
  group?: GroupInfo;
  direction: 'send' | 'receive';
  bytes: number;
  speed: number;
  eta: number;
  avgSpeed?: number;
  status: TransferStatus;
  url?: string;
  blob?: Blob;
  crc?: number;
  savedToDisk?: boolean;
  error?: string;
}

export type ConnectionRoute = 'lan' | 'p2p' | 'relay' | 'unknown';
export interface RouteInfo { route: ConnectionRoute; rttMs?: number; protocol?: string }

// ── Tunables ─────────────────────────────────────────────────────────────────
const MAX_CHUNK = 256 * 1024;
const MIN_CHUNK = 16 * 1024;
const READ_BLOCK = 8 * 1024 * 1024;
const BUFFER_HIGH = 8 * 1024 * 1024;
const BUFFER_LOW = 2 * 1024 * 1024;
const ACK_WINDOW = 64 * 1024 * 1024;
const FLUSH_BYTES = 4 * 1024 * 1024;
const ACK_INTERVAL_MS = 100;
const TICK_MS = 250;
const RECONNECT_GRACE_MS = 12000;

// ── ICE servers: public STUN + TURN (short-lived creds from /api/turn, or static env) ──
let turnCache: { servers: RTCIceServer[]; at: number } | null = null;
export async function loadIceServers(backend?: string): Promise<RTCIceServer[]> {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const env = (import.meta as any).env || {};
  const staticTurn = String(env.VITE_TURN_URLS || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (staticTurn.length) servers.push({ urls: staticTurn, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  try {
    if (!turnCache || Date.now() - turnCache.at > 3600_000) {
      const r = await fetch(`${backend || ''}/api/turn`, { cache: 'no-store' });
      turnCache = { servers: r.ok ? ((await r.json()).iceServers || []) : [], at: Date.now() };
    }
    servers.push(...turnCache.servers);
  } catch { /* no TURN endpoint — direct only */ }
  return servers;
}

class SpeedMeter {
  private samples: { t: number; b: number }[] = [];
  constructor(private windowMs = 2000) {}
  sample(bytes: number, now = performance.now()) {
    this.samples.push({ t: now, b: bytes });
    while (this.samples.length > 2 && now - this.samples[1].t >= this.windowMs) this.samples.shift();
  }
  speed(now = performance.now()) {
    if (this.samples.length < 2) return 0;
    const a = this.samples[0], b = this.samples[this.samples.length - 1];
    const dt = (now - a.t) / 1000;
    return dt > 0 ? Math.max(0, (b.b - a.b) / dt) : 0;
  }
  reset(bytes = 0) { this.samples = []; this.sample(bytes); }
}

interface Outgoing {
  id: string;
  file: File;
  meta: FileMeta;
  status: TransferStatus;
  offset: number;     // where streaming starts (resume point)
  sent: number;       // absolute byte position sent
  acked: number;      // absolute bytes the peer received
  written: number;    // absolute bytes the peer persisted
  meter: SpeedMeter;
  startedAt: number;
  startBytes: number;
  wake?: () => void;
  error?: string;
}

/** Receiving state. Lives outside a connection so it survives reconnects (resume). */
interface Incoming {
  id: string;
  meta: FileMeta;
  status: TransferStatus;
  sink: Sink;
  received: number;
  pending: ArrayBuffer[];
  pendingBytes: number;
  chain: Promise<void>;
  meter: SpeedMeter;
  startedAt: number;
  startBytes: number;
  lastAck: number;
  crc?: number;       // running CRC-32 (only for files that are part of a folder)
  result?: { url?: string; blob?: Blob; savedToDisk?: boolean };
  error?: string;
}

/** Interrupted downloads keyed by transfer id, resumable by any later connection. */
const partials = new Map<string, Incoming>();

export function discardPartial(id: string) {
  const r = partials.get(id);
  if (!r) return;
  partials.delete(id);
  r.chain = r.chain.then(() => r.sink.abort()).catch(() => {});
}

const ACTIVE_OUT: TransferStatus[] = ['offered', 'queued', 'transferring', 'paused'];
const ACTIVE_IN: TransferStatus[] = ['queued', 'transferring', 'paused'];

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  public isInitiator = false;
  /** Random id for this connection instance; lets the other side detect a fresh peer. */
  public readonly session = Math.random().toString(36).slice(2, 12);
  public remoteSession?: string;

  public onSignal?: (data: SignalData) => void;
  public onConnect?: () => void;
  public onDisconnect?: (reason: 'closed' | 'failed') => void;
  public onTransferUpdate?: (u: TransferUpdate) => void;
  public onOffer?: (offer: IncomingOffer) => void;
  public onTextReceived?: (text: string) => void;
  public onClipboard?: (text: string) => void;
  public onRoute?: (info: RouteInfo) => void;

  private signalChain: Promise<void> = Promise.resolve();
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private iceRestarts = 0;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private open = false;

  private outgoing = new Map<string, Outgoing>();
  private order: string[] = [];
  private pumping = false;
  private incoming = new Map<string, Incoming>();
  private rx: Incoming | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private lowWaiters: (() => void)[] = [];

  constructor(private iceServers: RTCIceServer[] = []) {}

  get isOpen() { return this.open && this.dc?.readyState === 'open'; }

  public init(isInitiator: boolean) {
    this.isInitiator = isInitiator;
    cleanupBrowserStorage();
    const pc = new RTCPeerConnection({ iceServers: this.iceServers, iceCandidatePoolSize: 4 });
    this.pc = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) this.onSignal?.({ type: 'candidate', candidate: e.candidate.toJSON(), session: this.session });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') { this.clearGrace(); this.iceRestarts = 0; this.detectRoute(); }
      else if (s === 'disconnected') this.startGrace();
      else if (s === 'failed') { this.startGrace(); this.tryIceRestart(); }
      else if (s === 'closed') this.teardown('failed');
    };

    if (isInitiator) {
      this.attachChannel(pc.createDataChannel('relay', { ordered: true }));
      this.makeOffer();
    } else {
      pc.ondatachannel = (e) => this.attachChannel(e.channel);
    }
  }

  // ── Signaling ────────────────────────────────────────────────────────────

  private async makeOffer(iceRestart = false) {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await this.pc.setLocalDescription(offer);
      this.onSignal?.({ type: 'offer', sdp: this.pc.localDescription!.sdp, session: this.session });
    } catch (e) {
      console.error('[relay] createOffer failed', e);
    }
  }

  public handleSignal(signal: SignalData) {
    this.signalChain = this.signalChain
      .then(() => this.processSignal(signal))
      .catch((e) => console.warn('[relay] signal error', e));
    return this.signalChain;
  }

  private async processSignal(signal: SignalData) {
    const pc = this.pc;
    if (!pc || pc.signalingState === 'closed') return;
    if (signal.session) this.remoteSession ||= signal.session;

    if (signal.type === 'offer') {
      await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await this.flushCandidates();
      await pc.setLocalDescription(await pc.createAnswer());
      this.onSignal?.({ type: 'answer', sdp: pc.localDescription!.sdp, session: this.session });
    } else if (signal.type === 'answer') {
      if (pc.signalingState !== 'have-local-offer') return;
      await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      await this.flushCandidates();
    } else if (signal.type === 'candidate') {
      if (!pc.remoteDescription) { this.pendingCandidates.push(signal.candidate); return; }
      await pc.addIceCandidate(signal.candidate).catch(() => {});
    }
  }

  private async flushCandidates() {
    const list = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const c of list) await this.pc?.addIceCandidate(c).catch(() => {});
  }

  private tryIceRestart() {
    if (!this.isInitiator || !this.pc || this.iceRestarts >= 2) return;
    this.iceRestarts++;
    this.makeOffer(true);
  }

  private startGrace() {
    if (this.graceTimer) return;
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (this.pc?.connectionState !== 'connected') this.teardown('failed');
    }, RECONNECT_GRACE_MS);
  }
  private clearGrace() {
    if (this.graceTimer) clearTimeout(this.graceTimer);
    this.graceTimer = null;
  }

  /**
   * Safety number: a hash of both sides' DTLS certificate fingerprints. If the signaling
   * server (or anyone) sat in the middle, the two devices would show different numbers.
   */
  public async safetyNumber(): Promise<string | null> {
    const local = this.pc?.localDescription?.sdp;
    const remote = this.pc?.remoteDescription?.sdp;
    if (!local || !remote) return null;
    const fp = (sdp: string) => (/a=fingerprint:(\S+) (\S+)/i.exec(sdp)?.slice(1).join(' ') || '').toUpperCase();
    const pair = [fp(local), fp(remote)].sort().join('|');
    if (pair === '|') return null;
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pair)));
    // 5 groups of 4 digits (~66 bits)
    let out: string[] = [];
    for (let i = 0; i < 5; i++) {
      const v = ((digest[i * 3] << 16) | (digest[i * 3 + 1] << 8) | digest[i * 3 + 2]) % 10000;
      out.push(String(v).padStart(4, '0'));
    }
    return out.join(' ');
  }

  private async detectRoute() {
    const pc = this.pc;
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      let pair: any;
      stats.forEach((r: any) => { if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId); });
      if (!pair) stats.forEach((r: any) => { if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.selected || r.nominated)) pair ||= r; });
      if (!pair) return this.onRoute?.({ route: 'unknown' });
      const local: any = stats.get(pair.localCandidateId);
      const remote: any = stats.get(pair.remoteCandidateId);
      // A remote "prflx" candidate is one learned during connectivity checks; on a LAN it is
      // still the peer's private address, so classify by address, not just candidate type.
      const isPrivate = (a?: string) => !!a && (/\.local$/i.test(a) || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.)/.test(a) || /^(fc|fd|fe80)/i.test(a));
      const localish = (c: any) => c?.candidateType === 'host' || (c?.candidateType === 'prflx' && isPrivate(c?.address || c?.ip));
      let route: ConnectionRoute = 'p2p';
      if (local?.candidateType === 'relay' || remote?.candidateType === 'relay') route = 'relay';
      else if (localish(local) && localish(remote)) route = 'lan';
      this.onRoute?.({
        route,
        rttMs: pair.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) : undefined,
        protocol: local?.protocol,
      });
    } catch {
      this.onRoute?.({ route: 'unknown' });
    }
  }

  // ── Channel ──────────────────────────────────────────────────────────────

  private attachChannel(ch: RTCDataChannel) {
    this.dc = ch;
    ch.binaryType = 'arraybuffer';
    ch.bufferedAmountLowThreshold = BUFFER_LOW;
    ch.onopen = () => {
      this.open = true;
      this.onConnect?.();
      this.detectRoute();
      setTimeout(() => this.detectRoute(), 1500); // stats settle shortly after open
      // (Re)announce everything still waiting — covers files queued before the channel opened.
      for (const id of this.order) {
        const t = this.outgoing.get(id);
        if (t && (t.status === 'offered' || t.status === 'interrupted')) { t.status = 'offered'; this.sendOffer(t); }
      }
    };
    ch.onclose = () => this.teardown('failed');
    ch.onerror = () => { /* followed by close */ };
    ch.onbufferedamountlow = () => {
      const w = this.lowWaiters;
      this.lowWaiters = [];
      w.forEach((fn) => fn());
    };
    ch.onmessage = (e) => {
      if (typeof e.data === 'string') this.onControl(e.data);
      else this.onChunk(e.data as ArrayBuffer);
    };
  }

  private ctrl(msg: Record<string, unknown>) {
    if (this.dc?.readyState === 'open') {
      try { this.dc.send(JSON.stringify(msg)); } catch { /* closing */ }
    }
  }

  private chunkSize() {
    const max = this.pc?.sctp?.maxMessageSize || 65536;
    return Math.max(MIN_CHUNK, Math.min(MAX_CHUNK, max));
  }

  private waitBufferLow(): Promise<void> {
    return new Promise((resolve) => {
      const ch = this.dc;
      if (!ch || ch.readyState !== 'open' || ch.bufferedAmount <= BUFFER_LOW) return resolve();
      this.lowWaiters.push(resolve);
    });
  }

  // ── Sending ──────────────────────────────────────────────────────────────

  /** Offer a file. It streams once the receiver accepts. Re-calling with the same id resumes. */
  public sendFile(file: File, id: string, extra: Partial<FileMeta> = {}) {
    const existing = this.outgoing.get(id);
    if (existing && ACTIVE_OUT.includes(existing.status)) return; // already offered on this link
    const meta: FileMeta = { name: file.name, size: file.size, mime: file.type, ...extra };
    const t: Outgoing = {
      id, file, meta, status: 'offered', offset: 0, sent: 0, acked: 0, written: 0,
      meter: new SpeedMeter(), startedAt: 0, startBytes: 0,
    };
    this.outgoing.set(id, t);
    if (!this.order.includes(id)) this.order.push(id);
    this.emitOut(t);
    if (this.isOpen) this.sendOffer(t);
  }

  private sendOffer(t: Outgoing) {
    this.ctrl({ t: 'offer', id: t.id, ...t.meta });
  }

  private async pump() {
    if (this.pumping || !this.isOpen) return;
    this.pumping = true;
    try {
      for (;;) {
        if (!this.isOpen) break;
        const next = this.order.map((id) => this.outgoing.get(id)!).find((t) => t?.status === 'queued');
        if (!next) break;
        await this.sendOne(next);
      }
    } finally {
      this.pumping = false;
    }
  }

  private async sendOne(t: Outgoing) {
    const ch = this.dc!;
    const file = t.file;
    const chunk = this.chunkSize();
    (t as { status: TransferStatus }).status = 'transferring'; // (cast: status changes asynchronously)
    t.sent = t.acked = t.written = t.offset;
    t.startedAt = performance.now();
    t.startBytes = t.offset;
    t.meter.reset(t.offset);
    this.ensureTicker();
    this.ctrl({ t: 'begin', id: t.id, offset: t.offset });
    this.emitOut(t);

    const read = (off: number) =>
      file.slice(off, Math.min(off + READ_BLOCK, file.size)).arrayBuffer().then((b) => new Uint8Array(b));

    try {
      let offset = t.offset;
      let next: Promise<Uint8Array> | null = offset < file.size ? read(offset) : null;
      while (next) {
        const block = await next;
        const blockEnd = offset + block.byteLength;
        next = blockEnd < file.size ? read(blockEnd) : null;
        for (let i = 0; i < block.byteLength; i += chunk) {
          while (t.status === 'paused') await new Promise<void>((r) => (t.wake = r));
          if (t.status !== 'transferring') return;
          if (ch.readyState !== 'open') throw new Error('Connection lost');
          if (ch.bufferedAmount > BUFFER_HIGH) await this.waitBufferLow();
          while (t.sent - t.written > ACK_WINDOW && t.status === 'transferring' && ch.readyState === 'open') {
            await new Promise<void>((r) => (t.wake = r));
          }
          if (t.status !== 'transferring') { i -= chunk; continue; }
          if (ch.readyState !== 'open') throw new Error('Connection lost');
          const piece = block.subarray(i, Math.min(i + chunk, block.byteLength));
          ch.send(piece);
          t.sent += piece.byteLength;
        }
        offset = blockEnd;
      }
      this.ctrl({ t: 'end', id: t.id });
      while (t.status === 'transferring' || t.status === 'paused') {
        if (ch.readyState !== 'open') throw new Error('Connection lost');
        await new Promise<void>((r) => (t.wake = r));
      }
    } catch {
      // teardown() marks it interrupted; nothing else to do here
    }
  }

  private wakeOut(t: Outgoing) {
    const w = t.wake;
    t.wake = undefined;
    w?.();
  }

  // ── Receiving ────────────────────────────────────────────────────────────

  private onControl(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;
    const id = typeof m.id === 'string' ? m.id.slice(0, 80) : '';

    switch (m.t) {
      case 'offer': return this.rxOffer(id, m);
      case 'begin': return this.rxBegin(id, Number(m.offset) || 0);
      case 'end': return this.rxEnd(id);
      case 'text': return this.onTextReceived?.(String(m.content ?? '').slice(0, 100_000));
      case 'clip': return this.onClipboard?.(String(m.text ?? '').slice(0, 100_000));
      case 'pause':
      case 'resume': {
        const r = this.incoming.get(id);
        if (r && (r.status === 'transferring' || r.status === 'paused')) {
          r.status = m.t === 'pause' ? 'paused' : 'transferring';
          if (r.status === 'transferring') r.meter.reset(r.received);
          this.emitIn(r);
        }
        return;
      }
      case 'cancel': {
        const r = this.incoming.get(id);
        if (r && ACTIVE_IN.includes(r.status)) this.rxAbort(r, m.reason ? 'failed' : 'cancelled', m.reason);
        const t = this.outgoing.get(id);
        if (t && ACTIVE_OUT.includes(t.status)) {
          t.status = m.reason ? 'failed' : 'cancelled';
          t.error = m.reason ? String(m.reason).slice(0, 200) : undefined;
          this.wakeOut(t);
          this.emitOut(t);
        }
        return;
      }
      case 'accept': {
        const t = this.outgoing.get(id);
        if (!t || t.status !== 'offered') return;
        t.offset = Math.max(0, Math.min(t.file.size, Number(m.offset) || 0));
        t.status = 'queued';
        this.emitOut(t);
        this.pump();
        return;
      }
      case 'decline': {
        const t = this.outgoing.get(id);
        if (!t || t.status !== 'offered') return;
        t.status = 'declined';
        this.emitOut(t);
        return;
      }
      case 'ack': {
        const t = this.outgoing.get(id);
        if (!t) return;
        t.acked = Math.max(t.acked, Number(m.recv) || 0);
        t.written = Math.max(t.written, Number(m.written) || 0);
        this.wakeOut(t);
        return;
      }
      case 'done': {
        const t = this.outgoing.get(id);
        if (!t || !ACTIVE_OUT.includes(t.status)) return;
        t.acked = t.written = t.file.size;
        t.status = 'completed';
        this.wakeOut(t);
        this.emitOut(t);
        return;
      }
    }
  }

  private rxOffer(id: string, m: any) {
    if (!id) return;
    const meta: FileMeta = {
      name: String(m.name || 'file').slice(0, 255),
      size: Math.max(0, Number(m.size) || 0),
      mime: String(m.mime || '').slice(0, 100),
      path: typeof m.path === 'string' ? m.path.slice(0, 1024) : undefined,
      group: m.group && typeof m.group === 'object' ? {
        id: String(m.group.id).slice(0, 80), name: String(m.group.name || 'Folder').slice(0, 255),
        count: Number(m.group.count) || 0, size: Number(m.group.size) || 0,
      } : undefined,
    };

    // Resume: we already hold part of this exact file.
    const partial = partials.get(id);
    if (partial && partial.meta.size === meta.size && partial.meta.name === meta.name) {
      partials.delete(id);
      this.incoming.set(id, partial);
      partial.chain.then(() => {
        partial.status = 'queued';
        partial.received = partial.sink.written;
        this.emitIn(partial);
        this.ctrl({ t: 'accept', id, offset: partial.sink.written });
      });
      return;
    }
    const existing = this.incoming.get(id);
    if (existing && existing.status !== 'interrupted') return; // duplicate offer
    this.onOffer?.({ id, ...meta });
  }

  /** Answer an offer. Pass a sink (e.g. from the Save-as picker) or let it use browser storage. */
  public async respond(id: string, accept: boolean, meta: FileMeta, sink?: Sink | null) {
    if (!accept) { this.ctrl({ t: 'decline', id }); return; }
    const already = this.incoming.get(id);
    if (already && already.status !== 'interrupted') return;
    let s = sink;
    if (!s) s = await browserSink(meta.name);
    const r: Incoming = {
      id, meta, status: 'queued', sink: s, received: 0, pending: [], pendingBytes: 0,
      chain: Promise.resolve(), meter: new SpeedMeter(), startedAt: performance.now(), startBytes: 0, lastAck: 0,
      crc: meta.group && s.kind !== 'dir' ? 0 : undefined,
    };
    this.incoming.set(id, r);
    this.emitIn(r);
    this.ctrl({ t: 'accept', id, offset: 0 });
  }

  private rxBegin(id: string, offset: number) {
    const r = this.incoming.get(id);
    if (!r || r.status !== 'queued') return;
    if (offset !== r.sink.written) {
      this.ctrl({ t: 'cancel', id, reason: 'Resume position mismatch' });
      return this.rxAbort(r, 'failed', 'Resume position mismatch');
    }
    if (this.rx && this.rx !== r && ACTIVE_IN.includes(this.rx.status)) this.rxAbort(this.rx, 'failed', 'Interrupted');
    r.status = 'transferring';
    r.received = offset;
    r.startedAt = performance.now();
    r.startBytes = offset;
    r.meter.reset(offset);
    this.rx = r;
    this.ensureTicker();
    this.emitIn(r);
  }

  private onChunk(buf: ArrayBuffer) {
    const r = this.rx;
    if (!r || (r.status !== 'transferring' && r.status !== 'paused')) return;
    if (r.received + buf.byteLength > r.meta.size) {
      this.ctrl({ t: 'cancel', id: r.id, reason: 'Received more data than announced' });
      return this.rxAbort(r, 'failed', 'Received more data than announced');
    }
    r.received += buf.byteLength;
    r.pending.push(buf);
    r.pendingBytes += buf.byteLength;
    if (r.pendingBytes >= FLUSH_BYTES) this.rxFlush(r);
    const now = performance.now();
    if (now - r.lastAck > ACK_INTERVAL_MS) {
      r.lastAck = now;
      this.ctrl({ t: 'ack', id: r.id, recv: r.received, written: r.sink.written });
    }
  }

  private rxFlush(r: Incoming) {
    if (!r.pendingBytes) return;
    const batch = r.pending;
    r.pending = [];
    r.pendingBytes = 0;
    r.chain = r.chain.then(async () => {
      if (!ACTIVE_IN.includes(r.status) && r.status !== 'interrupted') return;
      if (r.crc !== undefined) for (const b of batch) r.crc = crc32Update(r.crc, new Uint8Array(b));
      await r.sink.write(new Blob(batch));
      if (this.incoming.get(r.id) === r) this.ctrl({ t: 'ack', id: r.id, recv: r.received, written: r.sink.written });
    }).catch((e) => {
      const reason = e?.name === 'QuotaExceededError' ? 'Receiver is out of disk space' : 'Receiver could not save the file';
      this.ctrl({ t: 'cancel', id: r.id, reason });
      this.rxAbort(r, 'failed', reason);
    });
  }

  private rxEnd(id: string) {
    const r = this.incoming.get(id);
    if (!r || (r.status !== 'transferring' && r.status !== 'paused')) return;
    this.rxFlush(r);
    r.chain = r.chain.then(async () => {
      const st = r.status as TransferStatus;
      if (st !== 'transferring' && st !== 'paused') return;
      if (r.sink.written !== r.meta.size) throw new Error(`Size mismatch (${r.sink.written}/${r.meta.size})`);
      r.result = await r.sink.finish(r.meta.mime);
      r.status = 'completed';
      if (this.rx === r) this.rx = null;
      this.ctrl({ t: 'done', id: r.id });
      this.emitIn(r);
    }).catch((e) => {
      const reason = e?.message || 'Failed to finalize file';
      this.ctrl({ t: 'cancel', id: r.id, reason });
      this.rxAbort(r, 'failed', reason);
    });
  }

  private rxAbort(r: Incoming, status: 'cancelled' | 'failed', error?: string) {
    r.status = status;
    r.error = error;
    r.pending = [];
    r.pendingBytes = 0;
    r.chain = r.chain.then(() => r.sink.abort()).catch(() => {});
    partials.delete(r.id);
    if (this.rx === r) this.rx = null;
    this.emitIn(r);
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  public manageTransfer(id: string, action: 'pause' | 'resume' | 'cancel') {
    const t = this.outgoing.get(id);
    if (t) {
      if (!ACTIVE_OUT.includes(t.status) && t.status !== 'interrupted') return;
      if (action === 'pause' && t.status === 'transferring') {
        t.status = 'paused';
        this.ctrl({ t: 'pause', id });
      } else if (action === 'resume' && t.status === 'paused') {
        t.status = 'transferring';
        t.meter.reset(t.acked);
        this.ctrl({ t: 'resume', id });
      } else if (action === 'cancel') {
        t.status = 'cancelled';
        this.ctrl({ t: 'cancel', id });
      }
      this.wakeOut(t);
      this.emitOut(t);
      return;
    }
    const r = this.incoming.get(id) || partials.get(id);
    if (r && action === 'cancel' && (ACTIVE_IN.includes(r.status) || r.status === 'interrupted')) {
      this.ctrl({ t: 'cancel', id });
      this.rxAbort(r, 'cancelled');
    }
  }

  public sendText(text: string) { this.ctrl({ t: 'text', content: text }); }
  public sendClipboard(text: string) { this.ctrl({ t: 'clip', text }); }

  // ── Progress ─────────────────────────────────────────────────────────────

  private ensureTicker() {
    if (this.ticker) return;
    this.ticker = setInterval(() => {
      let active = false;
      for (const t of this.outgoing.values()) {
        if (t.status === 'transferring' || t.status === 'paused') { active = true; t.meter.sample(t.acked); this.emitOut(t); }
      }
      for (const r of this.incoming.values()) {
        if (r.status === 'transferring' || r.status === 'paused') { active = true; r.meter.sample(r.received); this.emitIn(r); }
      }
      if (!active) { clearInterval(this.ticker!); this.ticker = null; }
    }, TICK_MS);
  }

  private emitOut(t: Outgoing) {
    const size = t.file.size;
    const done = t.status === 'completed';
    const bytes = done ? size : Math.min(Math.max(t.acked, t.offset), size);
    const speed = t.status === 'transferring' ? t.meter.speed() : 0;
    const elapsed = (performance.now() - t.startedAt) / 1000;
    this.onTransferUpdate?.({
      id: t.id, name: t.meta.name, size, mime: t.meta.mime, path: t.meta.path, group: t.meta.group,
      direction: 'send', bytes, speed, eta: speed > 0 ? (size - bytes) / speed : 0,
      avgSpeed: done && elapsed > 0 ? (size - t.startBytes) / elapsed : undefined,
      status: t.status, error: t.error,
    });
  }

  private emitIn(r: Incoming) {
    const done = r.status === 'completed';
    const speed = r.status === 'transferring' ? r.meter.speed() : 0;
    const elapsed = (performance.now() - r.startedAt) / 1000;
    this.onTransferUpdate?.({
      id: r.id, name: r.meta.name, size: r.meta.size, mime: r.meta.mime, path: r.meta.path, group: r.meta.group,
      direction: 'receive', bytes: done ? r.meta.size : r.received, speed,
      eta: speed > 0 ? (r.meta.size - r.received) / speed : 0,
      avgSpeed: done && elapsed > 0 ? (r.meta.size - r.startBytes) / elapsed : undefined,
      status: r.status, url: r.result?.url, blob: r.result?.blob, savedToDisk: r.result?.savedToDisk,
      crc: done ? r.crc : undefined, error: r.error,
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /** Unexpected loss keeps transfers resumable; an explicit close cancels them. */
  private teardown(reason: 'closed' | 'failed') {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    this.clearGrace();
    const explicit = reason === 'closed';

    for (const t of this.outgoing.values()) {
      if (ACTIVE_OUT.includes(t.status)) {
        t.status = explicit ? 'cancelled' : 'interrupted';
        this.wakeOut(t);
        this.emitOut(t);
      }
    }
    for (const r of this.incoming.values()) {
      if (!ACTIVE_IN.includes(r.status)) continue;
      if (explicit) { this.rxAbort(r, 'cancelled'); continue; }
      this.rxFlush(r);              // keep every byte we already have
      r.status = 'interrupted';
      partials.set(r.id, r);
      this.emitIn(r);
    }
    this.rx = null;
    this.lowWaiters.forEach((fn) => fn());
    this.lowWaiters = [];
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    try { this.dc?.close(); } catch { /* noop */ }
    try { this.pc?.close(); } catch { /* noop */ }
    this.dc = null;
    this.pc = null;
    this.onDisconnect?.(reason);
  }

  /** Drop the link but keep transfers resumable (also used when replacing a stale link). */
  public drop() { this.teardown('failed'); }

  public close() { this.teardown('closed'); }
}
