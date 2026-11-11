/**
 * RelayRoom: one Relay room with one other device, usable in Node and in the browser.
 *
 * This side creates the room; the first device that joins with the code becomes the peer.
 * Files added with addFiles() are offered to it; files it offers can be accepted
 * automatically (in-chat app) or declined (CLI). It speaks the same protocol as the
 * Relay web app through the shared transfer engine; the server only does signaling.
 *
 * In Node, set globalThis.RTCPeerConnection (node-datachannel) before start().
 */
import { io, type Socket } from 'socket.io-client';
import { WebRTCManager, loadIceServers, type SignalData, type TransferUpdate, type RouteInfo } from '../../src/lib/webrtc';

export const PUBLIC_SERVER = 'https://relay.rishishah.in';

export type ItemStatus = TransferUpdate['status'] | 'waiting';
export interface Item {
  id: string;
  direction: 'send' | 'receive';
  name: string;
  size: number;
  mime: string;
  bytes: number;
  speed: number;
  status: ItemStatus;
  error?: string;
  /** Received file contents (receive direction, when completed). */
  blob?: Blob;
}

export type RoomState = 'starting' | 'waiting' | 'connecting' | 'connected' | 'stopped' | 'error';

export interface RoomOptions {
  server?: string;
  deviceName: string;
  /** Accept files the other device offers (stored in memory / browser storage). Default false. */
  acceptIncoming?: boolean;
  onChange?: (room: RelayRoom) => void;
}

const TERMINAL: ItemStatus[] = ['completed', 'declined', 'cancelled', 'failed'];
export const isTerminal = (s: ItemStatus) => TERMINAL.includes(s);

const rid = (n = 12) => {
  const a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => a[x % a.length]).join('');
};

export class RelayRoom {
  readonly server: string;
  readonly deviceName: string;
  readonly clientId = rid(16);
  readonly pageSession = rid(10);
  state: RoomState = 'starting';
  code = '';
  error = '';
  peerName = '';
  safety = '';
  route?: RouteInfo;
  items: Item[] = [];

  private socket?: Socket;
  private ice: RTCIceServer[] = [];
  private peer?: { clientId: string; socketId: string; name: string; session?: string };
  private manager?: WebRTCManager;
  private outgoing = new Map<string, File>();
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private waiters: (() => void)[] = [];
  private acceptIncoming: boolean;
  onChange?: (room: RelayRoom) => void;

  constructor(opts: RoomOptions) {
    this.server = (opts.server || PUBLIC_SERVER).replace(/\/+$/, '');
    this.deviceName = opts.deviceName.slice(0, 40);
    this.acceptIncoming = !!opts.acceptIncoming;
    this.onChange = opts.onChange;
  }

  get link() { return this.code ? `${this.server}/?code=${encodeURIComponent(this.code)}` : ''; }
  get connected() { return this.state === 'connected'; }

  /** Opens the room. Resolves with the room code. */
  start(timeoutMs = 20_000): Promise<string> {
    loadIceServers(this.server).then((s) => { this.ice = s; }).catch(() => {});
    const s = io(this.server, { auth: { clientId: this.clientId }, transports: ['websocket'], reconnection: true });
    this.socket = s;

    s.on('connect', () => {
      if (this.code) this.socket?.emit('join_room', { code: this.code, deviceName: this.deviceName, session: this.pageSession });
      else s.emit('create_room', { deviceName: this.deviceName, session: this.pageSession });
    });
    s.on('connect_error', (e) => { if (!this.code) this.error = e.message; });

    s.on('room_created', ({ roomCode }: { roomCode: string }) => {
      this.code = roomCode;
      this.set('waiting');
    });

    s.on('room_joined', ({ peers }: { peers: any[] }) => {
      for (const p of peers || []) if (this.peer && p.clientId === this.peer.clientId) this.peer.socketId = p.id;
    });

    s.on('peer_joined', ({ peerId, clientId, peerDeviceName, session }: any) => {
      if (!clientId || clientId === this.clientId) return;
      // One device per room: the first one to join with the code.
      if (this.peer && this.peer.clientId !== clientId) return;
      if (this.peer && session && this.peer.session && this.peer.session !== session) this.dropManager(); // reloaded
      this.peer = { clientId, socketId: peerId, name: String(peerDeviceName || 'Device'), session };
      this.peerName = this.peer.name;
      this.set('connecting');
      if (!this.manager && this.iAmInitiator()) this.createManager(true);
    });

    s.on('peer_left', ({ clientId, explicit }: any) => {
      if (clientId !== this.peer?.clientId || !explicit) return;
      this.dropManager();
      for (const it of this.items) if (!isTerminal(it.status)) { it.status = 'cancelled'; it.error = 'The other device left'; it.speed = 0; }
      this.peer = undefined;
      this.peerName = '';
      this.safety = '';
      this.set('waiting');
    });

    s.on('signal', ({ from, fromClient, signal }: { from: string; fromClient: string; signal: SignalData }) => {
      if (!this.peer || fromClient !== this.peer.clientId) return;
      this.peer.socketId = from;
      let m = this.manager;
      if (signal?.type === 'offer') {
        const fresh = !m || m.isInitiator || (m.remoteSession && signal.session && m.remoteSession !== signal.session);
        if (fresh && !this.iAmInitiator()) m = this.createManager(false);
      } else if (m?.remoteSession && signal?.session && m.remoteSession !== signal.session) {
        return; // stale
      }
      m?.handleSignal(signal);
    });

    s.on('room_error', ({ code, message }: { code: string; message: string }) => {
      this.error = message || code;
      if (!this.code || code === 'EXPIRED') this.set('error');
    });

    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(this.error ? `Could not reach ${this.server}: ${this.error}` : `Could not reach the Relay server at ${this.server}`)), timeoutMs);
      const check = () => {
        if (this.code) { clearTimeout(t); resolve(this.code); return; }
        if (this.state === 'error') { clearTimeout(t); reject(new Error(this.error || 'Could not open a room')); return; }
        this.waiters.push(check);
      };
      check();
    });
  }

  /** Queue files for the other device. They are offered as soon as it is connected. */
  addFiles(files: File[]): Item[] {
    const added: Item[] = [];
    for (const f of files) {
      const id = `${Date.now()}-${rid(10)}`;
      this.outgoing.set(id, f);
      const it: Item = { id, direction: 'send', name: f.name, size: f.size, mime: f.type || 'application/octet-stream', bytes: 0, speed: 0, status: 'waiting' };
      this.items.push(it);
      added.push(it);
      if (this.manager?.isOpen) this.manager.sendFile(f, id, { mime: it.mime });
    }
    this.notify();
    return added;
  }

  cancel(id: string) { this.manager?.manageTransfer(id, 'cancel'); }

  /** Resolves on the next change (or after timeoutMs). */
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
    for (const it of this.items) if (!isTerminal(it.status)) { it.status = 'cancelled'; it.speed = 0; }
    this.set('stopped');
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private iAmInitiator() { return !!this.peer && this.clientId < this.peer.clientId; }

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

    m.onSignal = (signal) => { if (this.peer) this.socket?.emit('signal', { to: this.peer.socketId, signal }); };
    m.onConnect = async () => {
      try { this.safety = (await m.safetyNumber()) || ''; } catch { this.safety = ''; } // needs a secure context
      this.set('connected');
      // Offer everything unfinished. Same ids, so interrupted transfers resume.
      for (const it of this.items) {
        const f = this.outgoing.get(it.id);
        if (f && it.direction === 'send' && !isTerminal(it.status)) m.sendFile(f, it.id, { mime: it.mime });
      }
    };
    m.onDisconnect = (reason) => {
      if (this.manager !== m) return;
      this.manager = undefined;
      if (this.state === 'stopped') return;
      this.set(this.peer ? 'connecting' : 'waiting');
      if (reason === 'failed' && this.peer && this.iAmInitiator()) {
        this.reconnectTimer = setTimeout(() => { if (!this.manager && this.peer) this.createManager(true); }, 1500);
      }
    };
    m.onRoute = (r) => { this.route = r; this.notify(); };
    m.onOffer = (o) => {
      if (!this.acceptIncoming) { m.respond(o.id, false, o); return; }
      if (!this.items.some((x) => x.id === o.id)) {
        this.items.push({ id: o.id, direction: 'receive', name: o.name, size: o.size, mime: o.mime || 'application/octet-stream', bytes: 0, speed: 0, status: 'queued' });
      }
      m.respond(o.id, true, o);
      this.notify();
    };
    m.onTransferUpdate = (u) => {
      const it = this.items.find((x) => x.id === u.id && x.direction === u.direction);
      if (!it) return;
      it.bytes = u.bytes;
      it.speed = u.speed;
      it.status = u.status;
      it.error = u.error;
      if (u.blob) it.blob = u.blob;
      this.notify();
    };
    m.init(initiator);
    return m;
  }

  private set(state: RoomState) {
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

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
}
