/**
 * A send session: this machine opens a Relay room, waits for one device to join with the
 * code (or by scanning the QR), then streams the files to it directly over WebRTC.
 *
 * It speaks exactly the same protocol as the Relay web app, using the same transfer engine
 * (src/lib/webrtc.ts) with node-datachannel providing RTCPeerConnection in Node.
 * The signaling server only introduces the two devices; file bytes never pass through it.
 */
import { openAsBlob } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import { io, type Socket } from 'socket.io-client';
import * as wrtc from 'node-datachannel/polyfill';
import { WebRTCManager, loadIceServers, type SignalData, type TransferUpdate, type RouteInfo } from '../../src/lib/webrtc';

// The engine is written against the browser API; give it one.
Object.assign(globalThis, {
  RTCPeerConnection: wrtc.RTCPeerConnection,
  RTCSessionDescription: wrtc.RTCSessionDescription,
  RTCIceCandidate: wrtc.RTCIceCandidate,
});

export const DEFAULT_SERVER = process.env.RELAY_URL || 'https://relay.rishishah.in';

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.json': 'application/json', '.txt': 'text/plain',
  '.md': 'text/markdown', '.csv': 'text/csv', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.apk': 'application/vnd.android.package-archive', '.ipa': 'application/octet-stream',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const rid = (n = 12) => randomBytes(n).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, n) || 'x'.repeat(n);

export interface FileState {
  id: string;
  path: string;
  name: string;
  size: number;
  bytes: number;
  speed: number;
  status: TransferUpdate['status'] | 'waiting';
  error?: string;
}

export type SessionState = 'starting' | 'waiting' | 'connecting' | 'connected' | 'done' | 'stopped' | 'error';

interface PreparedFile { id: string; path: string; file: File; mime: string }

export interface SessionOptions {
  server?: string;
  deviceName?: string;
  onChange?: (s: SendSession) => void;
}

const TERMINAL = ['completed', 'declined', 'cancelled', 'failed'];

export async function prepareFiles(paths: string[]): Promise<PreparedFile[]> {
  if (!paths.length) throw new Error('No files given.');
  const out: PreparedFile[] = [];
  for (const p of paths) {
    const full = resolve(p);
    let st;
    try { st = await stat(full); } catch { throw new Error(`File not found: ${p}`); }
    if (st.isDirectory()) throw new Error(`${p} is a folder. Zip it first, or pass the files inside it.`);
    if (!st.isFile()) throw new Error(`Not a regular file: ${p}`);
    const mime = MIME[extname(full).toLowerCase()] || 'application/octet-stream';
    // openAsBlob reads lazily from disk, so file size is not limited by memory.
    const blob = await openAsBlob(full, { type: mime });
    const file = new File([blob], basename(full), { type: mime, lastModified: st.mtimeMs });
    out.push({ id: `${Date.now()}-${rid(10)}`, path: full, file, mime });
  }
  return out;
}

export class SendSession {
  readonly server: string;
  readonly deviceName: string;
  readonly clientId = rid(16);
  readonly pageSession = rid(10);
  state: SessionState = 'starting';
  code = '';
  error = '';
  peerName = '';
  safety = '';
  route?: RouteInfo;
  readonly files: FileState[];
  readonly startedAt = Date.now();

  private socket?: Socket;
  private ice: RTCIceServer[] = [];
  private peer?: { clientId: string; socketId: string; name: string; session?: string };
  private manager?: WebRTCManager;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private waiters: (() => void)[] = [];
  private onChange?: (s: SendSession) => void;

  constructor(private prepared: PreparedFile[], opts: SessionOptions = {}) {
    this.server = (opts.server || DEFAULT_SERVER).replace(/\/+$/, '');
    this.deviceName = (opts.deviceName || `${hostname().split('.')[0] || 'Computer'} · Relay CLI`).slice(0, 40);
    this.onChange = opts.onChange;
    this.files = prepared.map((p) => ({ id: p.id, path: p.path, name: p.file.name, size: p.file.size, bytes: 0, speed: 0, status: 'waiting' }));
  }

  get link() { return this.code ? `${this.server}/?code=${encodeURIComponent(this.code)}` : ''; }
  get totalBytes() { return this.files.reduce((a, f) => a + f.size, 0); }
  get sentBytes() { return this.files.reduce((a, f) => a + f.bytes, 0); }
  get finished() { return this.files.every((f) => TERMINAL.includes(f.status)); }

  /** Opens the room. Resolves once a code exists (or rejects). */
  start(timeoutMs = 20_000): Promise<string> {
    loadIceServers(this.server).then((s) => { this.ice = s; }).catch(() => {});
    const s = io(this.server, { auth: { clientId: this.clientId }, transports: ['websocket'], reconnection: true });
    this.socket = s;

    s.on('connect', () => {
      if (this.code) this.emitJoin(); // reconnected: get back into our room
      else s.emit('create_room', { deviceName: this.deviceName, session: this.pageSession });
    });

    s.on('room_created', ({ roomCode }: { roomCode: string }) => {
      this.code = roomCode;
      this.set('waiting');
    });

    s.on('room_joined', ({ peers }: { peers: any[] }) => {
      // Back in the room after a socket reconnect; re-adopt our peer if it is still there.
      for (const p of peers || []) if (this.peer && p.clientId === this.peer.clientId) this.peer.socketId = p.id;
    });

    s.on('peer_joined', ({ peerId, clientId, peerDeviceName, session }: any) => {
      if (!clientId || clientId === this.clientId) return;
      // One receiver per session: the first device to join with the code is the one we send to.
      if (this.peer && this.peer.clientId !== clientId) return;
      if (this.peer && session && this.peer.session && this.peer.session !== session) this.dropManager(); // they reloaded
      this.peer = { clientId, socketId: peerId, name: String(peerDeviceName || 'Device'), session };
      this.peerName = this.peer.name;
      this.set('connecting');
      this.ensureConnection();
    });

    s.on('peer_left', ({ clientId, explicit }: any) => {
      if (clientId !== this.peer?.clientId || !explicit) return;
      this.dropManager();
      for (const f of this.files) if (!TERMINAL.includes(f.status)) { f.status = 'cancelled'; f.error = 'The other device left'; }
      this.set(this.finished ? 'done' : 'waiting');
      this.peer = undefined;
    });

    s.on('signal', ({ from, fromClient, signal }: { from: string; fromClient: string; signal: SignalData }) => {
      if (!this.peer || fromClient !== this.peer.clientId) return;
      this.peer.socketId = from;
      let m = this.manager;
      if (signal?.type === 'offer') {
        const fresh = !m || m.isInitiator || (m.remoteSession && signal.session && m.remoteSession !== signal.session);
        if (fresh && !this.iAmInitiator()) m = this.createManager(false);
      } else if (m?.remoteSession && signal?.session && m.remoteSession !== signal.session) {
        return; // stale signal from an old connection
      }
      m?.handleSignal(signal);
    });

    s.on('room_error', ({ code, message }: { code: string; message: string }) => {
      this.error = message || code;
      if (!this.code || code === 'EXPIRED') this.set('error');
    });

    return new Promise((resolveP, rejectP) => {
      const t = setTimeout(() => rejectP(new Error(`Could not reach the Relay server at ${this.server}`)), timeoutMs);
      const check = () => {
        if (this.code) { clearTimeout(t); resolveP(this.code); return true; }
        if (this.state === 'error') { clearTimeout(t); rejectP(new Error(this.error || 'Could not open a room')); return true; }
        return false;
      };
      const loop = () => { if (!check()) this.waiters.push(loop); };
      loop();
      s.on('connect_error', (e) => { if (!this.code) this.error = e.message; });
    });
  }

  /** Resolves when every file has finished (sent, declined or failed), or the session ends. */
  waitUntilDone(timeoutMs?: number): Promise<boolean> {
    return new Promise((res) => {
      const t = timeoutMs ? setTimeout(() => res(false), timeoutMs) : undefined;
      const loop = () => {
        if (this.state === 'done' || this.state === 'stopped' || this.state === 'error') { if (t) clearTimeout(t); res(true); }
        else this.waiters.push(loop);
      };
      loop();
    });
  }

  /** Resolves on the next state or progress change (or after timeoutMs). */
  waitForChange(timeoutMs: number): Promise<void> {
    return new Promise((res) => {
      const t = setTimeout(res, timeoutMs);
      this.waiters.push(() => { clearTimeout(t); res(); });
    });
  }

  stop() {
    if (this.state === 'stopped') return;
    clearTimeout(this.reconnectTimer);
    this.manager?.close();
    this.manager = undefined;
    this.socket?.emit('leave_room');
    this.socket?.close();
    for (const f of this.files) if (!TERMINAL.includes(f.status)) f.status = 'cancelled';
    this.set('stopped');
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private emitJoin() {
    this.socket?.emit('join_room', { code: this.code, deviceName: this.deviceName, session: this.pageSession });
  }

  private iAmInitiator() { return !!this.peer && this.clientId < this.peer.clientId; }

  private ensureConnection() {
    if (this.manager) return;
    if (this.iAmInitiator()) this.createManager(true);
    // otherwise the browser is the initiator and will send us an offer
  }

  private dropManager() {
    const m = this.manager;
    this.manager = undefined;
    if (m) { m.onDisconnect = undefined; m.drop(); }
  }

  private createManager(initiator: boolean) {
    this.dropManager();
    clearTimeout(this.reconnectTimer);
    const m = new WebRTCManager(this.ice);
    this.manager = m;

    m.onSignal = (signal) => {
      if (this.peer) this.socket?.emit('signal', { to: this.peer.socketId, signal });
    };
    m.onConnect = async () => {
      this.safety = (await m.safetyNumber()) || '';
      this.set('connected');
      // Offer every file that is not finished. Same ids, so interrupted ones resume.
      for (const p of this.prepared) {
        const f = this.files.find((x) => x.id === p.id)!;
        if (!TERMINAL.includes(f.status)) m.sendFile(p.file, p.id, { mime: p.mime });
      }
    };
    m.onDisconnect = (reason) => {
      if (this.manager !== m) return;
      this.manager = undefined;
      if (this.state === 'stopped' || this.finished) return;
      this.set(this.peer ? 'connecting' : 'waiting');
      if (reason === 'failed' && this.peer && this.iAmInitiator()) {
        this.reconnectTimer = setTimeout(() => { if (!this.manager && this.peer) this.createManager(true); }, 1500);
      }
    };
    m.onRoute = (r) => { this.route = r; this.notify(); };
    m.onTransferUpdate = (u) => {
      const f = this.files.find((x) => x.id === u.id);
      if (!f || u.direction !== 'send') return;
      f.bytes = u.bytes;
      f.speed = u.speed;
      f.status = u.status;
      f.error = u.error;
      if (this.finished) this.set('done'); else this.notify();
    };
    m.init(initiator);
    return m;
  }

  private set(state: SessionState) {
    this.state = state;
    this.notify();
  }

  private notify() {
    const w = this.waiters;
    this.waiters = [];
    w.forEach((fn) => fn());
    this.onChange?.(this);
  }
}

// ── formatting helpers shared by the CLI and the MCP server ──────────────────

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
}

export function describe(s: SendSession) {
  const lines: string[] = [];
  const stateText: Record<SessionState, string> = {
    starting: 'Opening a room…',
    waiting: 'Waiting for the other device to join.',
    connecting: `${s.peerName || 'A device'} joined. Connecting…`,
    connected: `Connected to ${s.peerName}.`,
    done: 'Finished.',
    stopped: 'Stopped.',
    error: `Error: ${s.error}`,
  };
  lines.push(stateText[s.state]);
  if (s.code) lines.push(`Room code: ${s.code}`, `Link: ${s.link}`);
  if (s.safety) lines.push(`Safety number: ${s.safety} (should match the number shown on the other device)`);
  if (s.route) lines.push(`Route: ${{ lan: 'same network', p2p: 'direct over the internet', relay: 'via TURN relay (still encrypted end to end)', unknown: 'direct' }[s.route.route]}`);
  for (const f of s.files) {
    const pct = f.size ? Math.floor((f.bytes / f.size) * 100) : 100;
    const label: Record<string, string> = {
      waiting: 'waiting for the device', offered: 'waiting for the other device to accept', queued: 'queued',
      transferring: `${pct}% · ${fmtBytes(f.speed)}/s`, paused: `paused at ${pct}%`, interrupted: `interrupted at ${pct}%, will resume`,
      completed: 'sent', declined: 'declined by the other device', cancelled: 'cancelled', failed: 'failed',
    };
    lines.push(`- ${f.name} (${fmtBytes(f.size)}): ${label[f.status] || f.status}${f.error ? ` — ${f.error}` : ''}`);
  }
  return lines.join('\n');
}
