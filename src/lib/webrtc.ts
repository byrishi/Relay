/**
 * Relay transfer engine — direct browser-to-browser over a WebRTC data channel.
 *
 * Protocol (one reliable, ordered channel per peer):
 *   control  = JSON string  { t: 'start' | 'end' | 'cancel' | 'pause' | 'resume' | 'ack' | 'done' | 'text', ... }
 *   payload  = binary chunk, always belonging to the file opened by the last 'start'
 *
 * Files are sent strictly one at a time per peer, so chunks can never interleave.
 * The receiver acks bytes received/written; the sender's progress + speed come from
 * those acks (what actually arrived), not from what was pushed into the local buffer.
 */

export type SignalData =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit };

export type TransferStatus = 'queued' | 'transferring' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface TransferUpdate {
  id: string;
  name: string;
  size: number;
  mime?: string;
  direction: 'send' | 'receive';
  /** Bytes confirmed at the receiver (send) or received (receive). */
  bytes: number;
  /** Smoothed bytes/sec over the last ~2s. */
  speed: number;
  /** Seconds remaining, 0 when unknown. */
  eta: number;
  /** Average bytes/sec for the whole transfer (set on completion). */
  avgSpeed?: number;
  status: TransferStatus;
  url?: string;
  error?: string;
}

export type ConnectionRoute = 'lan' | 'p2p' | 'relay' | 'unknown';
export interface RouteInfo {
  route: ConnectionRoute;
  rttMs?: number;
  protocol?: string;
}

// ---- Tunables -------------------------------------------------------------
const MAX_CHUNK = 256 * 1024;          // upper bound per message (Chrome's SCTP limit)
const MIN_CHUNK = 16 * 1024;
const READ_BLOCK = 8 * 1024 * 1024;    // disk read size, prefetched one block ahead
const BUFFER_HIGH = 8 * 1024 * 1024;   // stop pushing into the channel above this
const BUFFER_LOW = 2 * 1024 * 1024;    // resume when it drains below this
const ACK_WINDOW = 64 * 1024 * 1024;   // max bytes sent but not yet written by receiver
const FLUSH_BYTES = 4 * 1024 * 1024;   // receiver batches disk writes to this size
const ACK_INTERVAL_MS = 100;
const TICK_MS = 250;                   // UI update rate
const RECONNECT_GRACE_MS = 15000;

function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  // Optional TURN fallback for strict NATs (direct P2P is always tried first).
  const env = (import.meta as any).env || {};
  const turnUrls = String(env.VITE_TURN_URLS || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  if (turnUrls.length) {
    servers.push({ urls: turnUrls, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL });
  }
  return servers;
}

/** Rolling-window speed meter: bytes over the last `windowMs`, decays to 0 on stalls. */
class SpeedMeter {
  private samples: { t: number; b: number }[] = [];
  constructor(private windowMs = 2000) {}
  sample(bytes: number, now = performance.now()) {
    this.samples.push({ t: now, b: bytes });
    while (this.samples.length > 2 && now - this.samples[1].t >= this.windowMs) this.samples.shift();
  }
  speed(now = performance.now()) {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = (now - first.t) / 1000;
    return dt > 0 ? Math.max(0, (last.b - first.b) / dt) : 0;
  }
  reset() { this.samples = []; }
}

interface Outgoing {
  id: string;
  file: File;
  status: TransferStatus;
  sent: number;
  acked: number;     // bytes received by peer
  written: number;   // bytes persisted by peer
  meter: SpeedMeter;
  startedAt: number;
  wake?: () => void;  // resolves any wait (pause / ack window / done)
  error?: string;
}

interface Incoming {
  id: string;
  name: string;
  size: number;
  mime: string;
  status: TransferStatus;
  received: number;
  written: number;
  meter: SpeedMeter;
  startedAt: number;
  pending: ArrayBuffer[];
  pendingBytes: number;
  parts: Blob[];
  chain: Promise<void>;
  handle?: any;
  writable?: any;
  opfsName?: string;
  lastAck: number;
  url?: string;
  error?: string;
}

// ---- OPFS housekeeping: drop files left over from closed tabs --------------
let opfsCleaned = false;
async function cleanupOPFS() {
  if (opfsCleaned) return;
  opfsCleaned = true;
  try {
    const dir: any = await navigator.storage?.getDirectory?.();
    if (!dir?.entries) return;
    const stale: string[] = [];
    for await (const [name] of dir.entries()) {
      const m = /^(?:relay-)?(\d{13})-/.exec(name);
      if (m && Date.now() - Number(m[1]) > 6 * 3600 * 1000) stale.push(name);
    }
    for (const name of stale) await dir.removeEntry(name).catch(() => {});
  } catch { /* OPFS unavailable — nothing to clean */ }
}

export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  public isInitiator = false;

  public onSignal?: (data: SignalData) => void;
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onTransferUpdate?: (u: TransferUpdate) => void;
  public onTextReceived?: (text: string) => void;
  public onRoute?: (info: RouteInfo) => void;

  private signalChain: Promise<void> = Promise.resolve();
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private iceRestarts = 0;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  private outQueue: Outgoing[] = [];
  private outgoing = new Map<string, Outgoing>();
  private pumping = false;
  private rx: Incoming | null = null;
  private incoming = new Map<string, Incoming>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private lowWaiters: (() => void)[] = [];

  public init(isInitiator: boolean) {
    this.isInitiator = isInitiator;
    cleanupOPFS();

    const pc = new RTCPeerConnection({ iceServers: iceServers(), iceCandidatePoolSize: 4 });
    this.pc = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) this.onSignal?.({ type: 'candidate', candidate: e.candidate.toJSON() });
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === 'connected') {
        this.clearGrace();
        this.iceRestarts = 0;
        this.detectRoute();
      } else if (s === 'disconnected') {
        // Often transient (wifi blip, network switch) — give it time before tearing down.
        this.startGrace();
      } else if (s === 'failed') {
        this.startGrace();
        this.tryIceRestart();
      } else if (s === 'closed') {
        this.teardown();
      }
    };

    if (isInitiator) {
      this.attachChannel(pc.createDataChannel('relay', { ordered: true }));
      this.makeOffer();
    } else {
      pc.ondatachannel = (e) => this.attachChannel(e.channel);
    }
  }

  // ---- Signaling ----------------------------------------------------------

  private async makeOffer(iceRestart = false) {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
      await this.pc.setLocalDescription(offer);
      const d = this.pc.localDescription!;
      this.onSignal?.({ type: d.type as 'offer', sdp: d.sdp });
    } catch (e) {
      console.error('[relay] createOffer failed', e);
    }
  }

  /** Signals are processed strictly in order; candidates wait for the remote description. */
  public handleSignal(signal: SignalData) {
    this.signalChain = this.signalChain
      .then(() => this.processSignal(signal))
      .catch((e) => console.warn('[relay] signal error', e));
    return this.signalChain;
  }

  private async processSignal(signal: SignalData) {
    const pc = this.pc;
    if (!pc || pc.signalingState === 'closed') return;

    if (signal.type === 'offer') {
      await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await this.flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const d = pc.localDescription!;
      this.onSignal?.({ type: 'answer', sdp: d.sdp });
    } else if (signal.type === 'answer') {
      if (pc.signalingState !== 'have-local-offer') return; // duplicate / stale answer
      await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      await this.flushCandidates();
    } else if (signal.type === 'candidate') {
      if (!pc.remoteDescription) {
        this.pendingCandidates.push(signal.candidate);
        return;
      }
      await pc.addIceCandidate(signal.candidate).catch(() => { /* stale candidate after restart */ });
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
      const s = this.pc?.connectionState;
      if (s !== 'connected') this.teardown();
    }, RECONNECT_GRACE_MS);
  }

  private clearGrace() {
    if (this.graceTimer) clearTimeout(this.graceTimer);
    this.graceTimer = null;
  }

  private async detectRoute() {
    const pc = this.pc;
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      let pair: any;
      stats.forEach((r: any) => {
        if (r.type === 'transport' && r.selectedCandidatePairId) pair = stats.get(r.selectedCandidatePairId);
      });
      if (!pair) {
        stats.forEach((r: any) => {
          if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.selected || r.nominated)) pair = pair || r;
        });
      }
      if (!pair) return this.onRoute?.({ route: 'unknown' });
      const local: any = stats.get(pair.localCandidateId);
      const remote: any = stats.get(pair.remoteCandidateId);
      let route: ConnectionRoute = 'p2p';
      if (local?.candidateType === 'relay' || remote?.candidateType === 'relay') route = 'relay';
      else if (local?.candidateType === 'host' && remote?.candidateType === 'host') route = 'lan';
      this.onRoute?.({
        route,
        rttMs: pair.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) : undefined,
        protocol: local?.protocol,
      });
    } catch {
      this.onRoute?.({ route: 'unknown' });
    }
  }

  // ---- Data channel -------------------------------------------------------

  private attachChannel(ch: RTCDataChannel) {
    this.dc = ch;
    ch.binaryType = 'arraybuffer';
    ch.bufferedAmountLowThreshold = BUFFER_LOW;

    ch.onopen = () => {
      this.onConnect?.();
      this.detectRoute();
      this.pump();
    };
    ch.onclose = () => this.teardown();
    ch.onerror = (e) => console.warn('[relay] channel error', e);
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
      try { this.dc.send(JSON.stringify(msg)); } catch { /* channel closing */ }
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

  // ---- Sending ------------------------------------------------------------

  public sendFile(file: File, id: string) {
    const t: Outgoing = {
      id, file, status: 'queued', sent: 0, acked: 0, written: 0,
      meter: new SpeedMeter(), startedAt: 0,
    };
    this.outgoing.set(id, t);
    this.outQueue.push(t);
    this.emitOut(t);
    this.pump();
  }

  private async pump() {
    if (this.pumping || this.dc?.readyState !== 'open') return;
    this.pumping = true;
    try {
      while (this.outQueue.length && this.dc?.readyState === 'open') {
        const t = this.outQueue.shift()!;
        if (t.status === 'cancelled') continue;
        await this.sendOne(t);
      }
    } finally {
      this.pumping = false;
    }
  }

  private async sendOne(t: Outgoing) {
    const ch = this.dc!;
    const file = t.file;
    const chunk = this.chunkSize();
    if (t.status === 'queued') t.status = 'transferring';
    t.startedAt = performance.now();
    t.meter.reset();
    t.meter.sample(0);
    this.ensureTicker();
    this.ctrl({ t: 'start', id: t.id, name: file.name, size: file.size, mime: file.type });
    this.emitOut(t);

    const read = (off: number) =>
      file.slice(off, Math.min(off + READ_BLOCK, file.size)).arrayBuffer().then((b) => new Uint8Array(b));

    try {
      let offset = 0;
      let next: Promise<Uint8Array> | null = file.size > 0 ? read(0) : null;

      while (next) {
        const block = await next;
        const blockEnd = offset + block.byteLength;
        next = blockEnd < file.size ? read(blockEnd) : null; // prefetch while we send

        for (let i = 0; i < block.byteLength; i += chunk) {
          while (t.status === 'paused') await new Promise<void>((r) => (t.wake = r));
          if (t.status === 'cancelled' || t.status === 'failed') return;
          if (ch.readyState !== 'open') throw new Error('Connection lost');

          if (ch.bufferedAmount > BUFFER_HIGH) await this.waitBufferLow();
          while (t.sent - t.written > ACK_WINDOW && t.status === 'transferring' && ch.readyState === 'open') {
            await new Promise<void>((r) => (t.wake = r));
          }
          if (t.status !== 'transferring') { i -= chunk; continue; } // re-check pause/cancel

          const piece = block.subarray(i, Math.min(i + chunk, block.byteLength));
          ch.send(piece);
          t.sent += piece.byteLength;
        }
        offset = blockEnd;
      }

      this.ctrl({ t: 'end', id: t.id, size: file.size });

      // Wait for the receiver to confirm the file is fully saved.
      while (t.status === 'transferring' || t.status === 'paused') {
        if (ch.readyState !== 'open') throw new Error('Connection lost before confirmation');
        await new Promise<void>((r) => (t.wake = r));
      }
    } catch (e: any) {
      if (t.status === 'transferring' || t.status === 'paused') {
        t.status = 'failed';
        t.error = e?.message || 'Send failed';
        this.emitOut(t);
      }
    }
  }

  private wakeOut(t: Outgoing) {
    const w = t.wake;
    t.wake = undefined;
    w?.();
  }

  // ---- Receiving ----------------------------------------------------------

  private onControl(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }

    switch (m.t) {
      case 'start': return this.rxStart(m);
      case 'end': return this.rxEnd(m);
      case 'text': return this.onTextReceived?.(String(m.content ?? ''));
      case 'pause':
      case 'resume': {
        const r = this.incoming.get(m.id);
        if (r && (r.status === 'transferring' || r.status === 'paused')) {
          r.status = m.t === 'pause' ? 'paused' : 'transferring';
          this.emitIn(r);
        }
        return;
      }
      case 'cancel': {
        const r = this.incoming.get(m.id);
        if (r && (r.status === 'transferring' || r.status === 'paused')) this.rxAbort(r, 'cancelled');
        const t = this.outgoing.get(m.id);
        if (t && (t.status === 'transferring' || t.status === 'paused' || t.status === 'queued')) {
          t.status = m.reason ? 'failed' : 'cancelled';
          t.error = m.reason;
          this.wakeOut(t);
          this.emitOut(t);
        }
        return;
      }
      case 'ack': {
        const t = this.outgoing.get(m.id);
        if (!t) return;
        t.acked = Math.max(t.acked, Number(m.recv) || 0);
        t.written = Math.max(t.written, Number(m.written) || 0);
        this.wakeOut(t);
        return;
      }
      case 'done': {
        const t = this.outgoing.get(m.id);
        if (!t || t.status === 'cancelled') return;
        t.acked = t.written = t.file.size;
        t.status = 'completed';
        this.wakeOut(t);
        this.emitOut(t);
        return;
      }
    }
  }

  private rxStart(m: any) {
    // A new 'start' implicitly closes out anything still open (e.g. after a cancel).
    if (this.rx && (this.rx.status === 'transferring' || this.rx.status === 'paused')) {
      this.rxAbort(this.rx, 'failed', 'Interrupted');
    }
    const r: Incoming = {
      id: String(m.id), name: String(m.name || 'file'), size: Number(m.size) || 0, mime: String(m.mime || ''),
      status: 'transferring', received: 0, written: 0, meter: new SpeedMeter(),
      startedAt: performance.now(), pending: [], pendingBytes: 0, parts: [],
      chain: Promise.resolve(), lastAck: 0,
    };
    r.meter.sample(0);
    this.rx = r;
    this.incoming.set(r.id, r);
    r.chain = this.openStorage(r);
    this.ensureTicker();
    this.emitIn(r);
  }

  private async openStorage(r: Incoming) {
    try {
      const dir: any = await navigator.storage?.getDirectory?.();
      if (!dir) return;
      const safe = r.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
      r.opfsName = `relay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      r.handle = await dir.getFileHandle(r.opfsName, { create: true });
      if (typeof r.handle.createWritable !== 'function') throw new Error('createWritable unsupported');
      r.writable = await r.handle.createWritable();
    } catch {
      // Safari / private mode etc. — fall back to in-memory Blob parts (browser may page these to disk).
      r.writable = undefined;
      if (r.opfsName) this.removeOpfs(r.opfsName);
      r.handle = undefined;
      r.opfsName = undefined;
    }
  }

  private onChunk(buf: ArrayBuffer) {
    const r = this.rx;
    if (!r || (r.status !== 'transferring' && r.status !== 'paused')) return; // stale chunk after cancel
    r.received += buf.byteLength;
    r.pending.push(buf);
    r.pendingBytes += buf.byteLength;
    if (r.pendingBytes >= FLUSH_BYTES) this.rxFlush(r);

    const now = performance.now();
    if (now - r.lastAck > ACK_INTERVAL_MS) {
      r.lastAck = now;
      this.ctrl({ t: 'ack', id: r.id, recv: r.received, written: r.written });
    }
  }

  private rxFlush(r: Incoming) {
    if (!r.pendingBytes) return;
    const batch = r.pending;
    const bytes = r.pendingBytes;
    r.pending = [];
    r.pendingBytes = 0;
    r.chain = r.chain.then(async () => {
      if (r.status === 'cancelled' || r.status === 'failed') return;
      const blob = new Blob(batch);
      if (r.writable) {
        await r.writable.write(blob);
      } else {
        r.parts.push(blob);
        if (r.parts.length >= 64) r.parts = [new Blob(r.parts)];
      }
      r.written += bytes;
      this.ctrl({ t: 'ack', id: r.id, recv: r.received, written: r.written });
    }).catch((e) => {
      const reason = e?.name === 'QuotaExceededError' ? 'Receiver is out of disk space' : 'Receiver could not save the file';
      this.ctrl({ t: 'cancel', id: r.id, reason });
      this.rxAbort(r, 'failed', reason);
    });
  }

  private rxEnd(m: any) {
    const r = this.incoming.get(m.id);
    if (!r || (r.status !== 'transferring' && r.status !== 'paused')) return;
    this.rxFlush(r);
    r.chain = r.chain.then(async () => {
      if (r.status !== 'transferring' && r.status !== 'paused') return;
      if (r.received !== r.size) throw new Error(`Size mismatch (${r.received}/${r.size})`);
      let blob: Blob;
      if (r.writable) {
        await r.writable.close();
        r.writable = undefined;
        blob = await r.handle.getFile();
      } else {
        blob = new Blob(r.parts, { type: r.mime || 'application/octet-stream' });
        r.parts = [];
      }
      r.url = URL.createObjectURL(blob);
      r.status = 'completed';
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
    r.parts = [];
    const writable = r.writable;
    const name = r.opfsName;
    r.writable = undefined;
    r.chain = r.chain.then(async () => {
      try { await writable?.abort?.(); } catch { /* already closed */ }
      if (name) await this.removeOpfs(name);
    });
    if (this.rx === r) this.rx = null;
    this.emitIn(r);
  }

  private async removeOpfs(name: string) {
    try {
      const dir: any = await navigator.storage.getDirectory();
      await dir.removeEntry(name);
    } catch { /* ignore */ }
  }

  // ---- Controls -----------------------------------------------------------

  public manageTransfer(id: string, action: 'pause' | 'resume' | 'cancel') {
    const t = this.outgoing.get(id);
    if (t) {
      if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'failed') return;
      if (action === 'pause' && t.status === 'transferring') {
        t.status = 'paused';
        this.ctrl({ t: 'pause', id });
      } else if (action === 'resume' && t.status === 'paused') {
        t.status = 'transferring';
        t.meter.reset();
        t.meter.sample(t.acked);
        this.ctrl({ t: 'resume', id });
      } else if (action === 'cancel') {
        const wasActive = t.status !== 'queued';
        t.status = 'cancelled';
        if (wasActive) this.ctrl({ t: 'cancel', id });
      }
      this.wakeOut(t);
      this.emitOut(t);
      return;
    }
    const r = this.incoming.get(id);
    if (r && action === 'cancel' && (r.status === 'transferring' || r.status === 'paused')) {
      this.ctrl({ t: 'cancel', id });
      this.rxAbort(r, 'cancelled');
    }
  }

  public sendText(text: string) {
    this.ctrl({ t: 'text', content: text });
  }

  // ---- Progress reporting -------------------------------------------------

  private ensureTicker() {
    if (this.ticker) return;
    this.ticker = setInterval(() => {
      let active = false;
      for (const t of this.outgoing.values()) {
        if (t.status === 'transferring' || t.status === 'paused') {
          active = true;
          t.meter.sample(t.acked);
          this.emitOut(t);
        }
      }
      for (const r of this.incoming.values()) {
        if (r.status === 'transferring' || r.status === 'paused') {
          active = true;
          r.meter.sample(r.received);
          this.emitIn(r);
        }
      }
      if (!active && !this.outQueue.length) {
        clearInterval(this.ticker!);
        this.ticker = null;
      }
    }, TICK_MS);
  }

  private emitOut(t: Outgoing) {
    const size = t.file.size;
    const done = t.status === 'completed';
    const bytes = done ? size : Math.min(t.acked, size);
    const speed = t.status === 'transferring' ? t.meter.speed() : 0;
    const elapsed = (performance.now() - t.startedAt) / 1000;
    this.onTransferUpdate?.({
      id: t.id, name: t.file.name, size, mime: t.file.type, direction: 'send', bytes,
      speed, eta: speed > 0 ? (size - bytes) / speed : 0,
      avgSpeed: done && elapsed > 0 ? size / elapsed : undefined,
      status: t.status, error: t.error,
    });
  }

  private emitIn(r: Incoming) {
    const done = r.status === 'completed';
    const speed = r.status === 'transferring' ? r.meter.speed() : 0;
    const elapsed = (performance.now() - r.startedAt) / 1000;
    this.onTransferUpdate?.({
      id: r.id, name: r.name, size: r.size, mime: r.mime, direction: 'receive',
      bytes: done ? r.size : r.received, speed, eta: speed > 0 ? (r.size - r.received) / speed : 0,
      avgSpeed: done && elapsed > 0 ? r.size / elapsed : undefined,
      status: r.status, url: r.url, error: r.error,
    });
  }

  // ---- Lifecycle ----------------------------------------------------------

  private teardown() {
    if (this.closed) return;
    this.closed = true;
    this.clearGrace();
    for (const t of this.outgoing.values()) {
      if (t.status === 'queued' || t.status === 'transferring' || t.status === 'paused') {
        t.status = 'failed';
        t.error = 'Peer disconnected';
        this.wakeOut(t);
        this.emitOut(t);
      }
    }
    this.outQueue = [];
    for (const r of this.incoming.values()) {
      if (r.status === 'transferring' || r.status === 'paused') this.rxAbort(r, 'failed', 'Peer disconnected');
    }
    this.lowWaiters.forEach((fn) => fn());
    this.lowWaiters = [];
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    try { this.dc?.close(); } catch { /* noop */ }
    try { this.pc?.close(); } catch { /* noop */ }
    this.dc = null;
    this.pc = null;
    this.onDisconnect?.();
  }

  public close() {
    const cb = this.onDisconnect;
    this.onDisconnect = undefined; // explicit close: caller already handles UI
    this.teardown();
    this.onDisconnect = cb;
  }
}
