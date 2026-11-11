/**
 * Node side: send files from this computer to the device that joins a Relay room.
 * Thin wrapper over RelayRoom that reads files from disk and provides
 * RTCPeerConnection through node-datachannel.
 */
import { openAsBlob } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { hostname } from 'node:os';
import * as wrtc from 'node-datachannel/polyfill';
import { RelayRoom, isTerminal, fmtBytes, PUBLIC_SERVER, type Item, type RoomState } from './room';

// The engine is written against the browser API; give it one.
Object.assign(globalThis, {
  RTCPeerConnection: wrtc.RTCPeerConnection,
  RTCSessionDescription: wrtc.RTCSessionDescription,
  RTCIceCandidate: wrtc.RTCIceCandidate,
});

export { fmtBytes };
export const DEFAULT_SERVER = process.env.RELAY_URL || PUBLIC_SERVER;

const MIME: Record<string, string> = {
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.json': 'application/json', '.txt': 'text/plain',
  '.md': 'text/markdown', '.csv': 'text/csv', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.m4a': 'audio/mp4', '.apk': 'application/vnd.android.package-archive',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export interface PreparedFile { path: string; file: File }

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
    out.push({ path: full, file: new File([blob], basename(full), { type: mime, lastModified: st.mtimeMs }) });
  }
  return out;
}

export type SessionState = RoomState | 'done';

export interface SessionOptions {
  server?: string;
  deviceName?: string;
  onChange?: (s: SendSession) => void;
}

export class SendSession {
  readonly room: RelayRoom;
  readonly files: Item[];
  private onChange?: (s: SendSession) => void;

  constructor(prepared: PreparedFile[], opts: SessionOptions = {}) {
    this.onChange = opts.onChange;
    this.room = new RelayRoom({
      server: opts.server || DEFAULT_SERVER,
      deviceName: opts.deviceName || `${hostname().split('.')[0] || 'Computer'} · Relay CLI`,
    });
    this.files = this.room.addFiles(prepared.map((p) => p.file));
    this.room.onChange = () => this.onChange?.(this);
  }

  get state(): SessionState {
    const s = this.room.state;
    if (s === 'stopped' || s === 'error') return s;
    return this.finished ? 'done' : s;
  }
  get code() { return this.room.code; }
  get link() { return this.room.link; }
  get server() { return this.room.server; }
  get error() { return this.room.error; }
  get peerName() { return this.room.peerName; }
  get safety() { return this.room.safety; }
  get route() { return this.room.route; }
  get finished() { return this.files.every((f) => isTerminal(f.status)); }
  get totalBytes() { return this.files.reduce((a, f) => a + f.size, 0); }
  get sentBytes() { return this.files.reduce((a, f) => a + f.bytes, 0); }

  start() { return this.room.start(); }
  stop() { this.room.stop(); }
  waitForChange(ms: number) { return this.room.waitForChange(ms); }

  /** Resolves when every file has finished, or the session ends. */
  async waitUntilDone(timeoutMs?: number): Promise<boolean> {
    const until = timeoutMs ? Date.now() + timeoutMs : Infinity;
    while (!['done', 'stopped', 'error'].includes(this.state)) {
      const left = until - Date.now();
      if (left <= 0) return false;
      await this.room.waitForChange(Math.min(left, 60_000));
    }
    return true;
  }
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
