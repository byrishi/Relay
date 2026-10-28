/**
 * Where received bytes go.
 *
 *  disk   — a file the user picked with "Save as…" (Chromium desktop). Bytes stream
 *           straight to disk, so file size is limited only by free space.
 *  dir    — a file inside a folder the user picked (folder transfers keep their structure).
 *  opfs   — the browser's private file system; the user saves it afterwards.
 *  memory — Blob parts in memory (fallback for browsers without OPFS writers).
 *
 * Sinks live outside the connection, so an interrupted transfer can resume into the
 * same sink after a reconnect.
 */
export type SinkKind = 'disk' | 'dir' | 'opfs' | 'memory';

export interface SinkResult {
  /** Object URL the user can download from (opfs / memory only). */
  url?: string;
  blob?: Blob;
  savedToDisk?: boolean;
}

export interface Sink {
  kind: SinkKind;
  written: number;
  write(chunk: Blob): Promise<void>;
  finish(mime?: string): Promise<SinkResult>;
  abort(): Promise<void>;
}

export const canSaveToDisk = () => typeof (window as any).showSaveFilePicker === 'function';
export const canSaveToFolder = () => typeof (window as any).showDirectoryPicker === 'function';

function writableSink(kind: 'disk' | 'dir', writable: any, onAbort?: () => Promise<void>): Sink {
  return {
    kind,
    written: 0,
    async write(chunk) { await writable.write(chunk); this.written += chunk.size; },
    async finish() { await writable.close(); return { savedToDisk: true }; },
    async abort() { try { await writable.abort(); } catch { /* closed */ } await onAbort?.(); },
  };
}

/** Must be called from a click handler (needs user activation). Returns null if the user cancels. */
export async function pickDiskSink(suggestedName: string): Promise<Sink | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({ suggestedName });
    const writable = await handle.createWritable();
    return writableSink('disk', writable);
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

/** Must be called from a click handler. */
export async function pickDirectory(): Promise<any | null> {
  try {
    return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

const safeSegment = (s: string) => s.replace(/[\u0000-\u001f<>:"\\|?*]/g, '_').replace(/^\.+$/, '_').slice(0, 200) || '_';

/** A file at `relPath` inside a picked directory. Rejects path traversal. */
export async function dirSink(root: any, relPath: string): Promise<Sink> {
  const parts = relPath.split('/').filter((p) => p && p !== '.' && p !== '..').map(safeSegment);
  const fileName = parts.pop() || 'file';
  let dir = root;
  for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
  const fh = await dir.getFileHandle(fileName, { create: true });
  const writable = await fh.createWritable();
  return writableSink('dir', writable, async () => { try { await dir.removeEntry(fileName); } catch { /* ignore */ } });
}

/** Browser-managed storage: OPFS when it supports writers, otherwise memory. */
export async function browserSink(name: string): Promise<Sink> {
  try {
    const root: any = await navigator.storage?.getDirectory?.();
    if (!root) throw new Error('no opfs');
    const safe = name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(-80);
    const opfsName = `relay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const handle = await root.getFileHandle(opfsName, { create: true });
    if (typeof handle.createWritable !== 'function') {
      await root.removeEntry(opfsName).catch(() => {});
      throw new Error('no writer');
    }
    const writable = await handle.createWritable();
    return {
      kind: 'opfs',
      written: 0,
      async write(chunk) { await writable.write(chunk); this.written += chunk.size; },
      async finish(mime) {
        await writable.close();
        const file: File = await handle.getFile();
        const blob = mime && file.type !== mime ? new Blob([file], { type: mime }) : file;
        return { blob, url: URL.createObjectURL(blob) };
      },
      async abort() {
        try { await writable.abort(); } catch { /* closed */ }
        await root.removeEntry(opfsName).catch(() => {});
      },
    };
  } catch {
    let parts: Blob[] = [];
    return {
      kind: 'memory',
      written: 0,
      async write(chunk) {
        parts.push(chunk);
        this.written += chunk.size;
        if (parts.length >= 64) parts = [new Blob(parts)];
      },
      async finish(mime) {
        const blob = new Blob(parts, { type: mime || 'application/octet-stream' });
        parts = [];
        return { blob, url: URL.createObjectURL(blob) };
      },
      async abort() { parts = []; },
    };
  }
}

/** Remove browser-storage files left over from tabs closed more than 6 hours ago. */
let cleaned = false;
export async function cleanupBrowserStorage() {
  if (cleaned) return;
  cleaned = true;
  try {
    const dir: any = await navigator.storage?.getDirectory?.();
    if (!dir?.entries) return;
    const stale: string[] = [];
    for await (const [name] of dir.entries()) {
      const m = /^(?:relay-)?(\d{13})-/.exec(name);
      if (m && Date.now() - Number(m[1]) > 6 * 3600 * 1000) stale.push(name);
    }
    for (const name of stale) await dir.removeEntry(name).catch(() => {});
  } catch { /* unavailable */ }
}

// ── CRC-32 (for building ZIPs of received folders) ────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256 * 8);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  // slicing-by-8 tables for speed
  for (let i = 0; i < 256; i++) {
    for (let s = 1; s < 8; s++) t[s * 256 + i] = (t[(s - 1) * 256 + i] >>> 8) ^ t[t[(s - 1) * 256 + i] & 0xff];
  }
  return t;
})();

export function crc32Update(crc: number, data: Uint8Array): number {
  let c = ~crc >>> 0;
  let i = 0;
  const n = data.length;
  const T = CRC_TABLE;
  for (; i + 8 <= n; i += 8) {
    const a = (c ^ (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24))) >>> 0;
    c = T[7 * 256 + (a & 0xff)] ^ T[6 * 256 + ((a >>> 8) & 0xff)] ^ T[5 * 256 + ((a >>> 16) & 0xff)] ^ T[4 * 256 + (a >>> 24)]
      ^ T[3 * 256 + data[i + 4]] ^ T[2 * 256 + data[i + 5]] ^ T[256 + data[i + 6]] ^ T[data[i + 7]];
  }
  for (; i < n; i++) c = T[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

// ── ZIP (store, ZIP64-capable) assembled from Blobs without copying file data ──
export interface ZipEntry { path: string; blob: Blob; crc: number; mtime?: Date }

export function buildZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const parts: BlobPart[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const dosTime = (d: Date) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dosDate = (d: Date) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  const M32 = 0xffffffff;

  for (const e of entries) {
    const name = enc.encode(e.path.replace(/^\/+/, ''));
    const size = e.blob.size;
    const d = e.mtime || new Date();
    const big = size >= M32 || offset >= M32;

    // local header (+ zip64 extra with sizes when needed)
    const lExtra = big ? 20 : 0;
    const lh = new DataView(new ArrayBuffer(30 + name.length + lExtra));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, big ? 45 : 20, true);
    lh.setUint16(6, 0x0800, true); // UTF-8 names
    lh.setUint16(8, 0, true);      // store
    lh.setUint16(10, dosTime(d), true);
    lh.setUint16(12, dosDate(d), true);
    lh.setUint32(14, e.crc, true);
    lh.setUint32(18, big ? M32 : size, true);
    lh.setUint32(22, big ? M32 : size, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, lExtra, true);
    new Uint8Array(lh.buffer).set(name, 30);
    if (big) {
      const o = 30 + name.length;
      lh.setUint16(o, 0x0001, true); lh.setUint16(o + 2, 16, true);
      lh.setBigUint64(o + 4, BigInt(size), true); lh.setBigUint64(o + 12, BigInt(size), true);
    }
    parts.push(lh.buffer, e.blob);

    const cExtra = big ? 28 : 0;
    const ch = new DataView(new ArrayBuffer(46 + name.length + cExtra));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, big ? 45 : 20, true);
    ch.setUint16(6, big ? 45 : 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dosTime(d), true);
    ch.setUint16(14, dosDate(d), true);
    ch.setUint32(16, e.crc, true);
    ch.setUint32(20, big ? M32 : size, true);
    ch.setUint32(24, big ? M32 : size, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, cExtra, true);
    ch.setUint32(42, big ? M32 : offset, true);
    new Uint8Array(ch.buffer).set(name, 46);
    if (big) {
      const o = 46 + name.length;
      ch.setUint16(o, 0x0001, true); ch.setUint16(o + 2, 24, true);
      ch.setBigUint64(o + 4, BigInt(size), true); ch.setBigUint64(o + 12, BigInt(size), true);
      ch.setBigUint64(o + 20, BigInt(offset), true);
    }
    central.push(new Uint8Array(ch.buffer));
    offset += lh.byteLength + size;
  }

  const cdStart = offset;
  const cdSize = central.reduce((a, c) => a + c.byteLength, 0);
  parts.push(...central.map((c) => c.buffer as ArrayBuffer));
  const needs64 = cdStart >= M32 || entries.length >= 0xffff;

  if (needs64) {
    const z = new DataView(new ArrayBuffer(56 + 20));
    z.setUint32(0, 0x06064b50, true);
    z.setBigUint64(4, 44n, true);
    z.setUint16(12, 45, true); z.setUint16(14, 45, true);
    z.setBigUint64(24, BigInt(entries.length), true);
    z.setBigUint64(32, BigInt(entries.length), true);
    z.setBigUint64(40, BigInt(cdSize), true);
    z.setBigUint64(48, BigInt(cdStart), true);
    z.setUint32(56, 0x07064b50, true);
    z.setBigUint64(64, BigInt(cdStart + cdSize), true);
    z.setUint32(72, 1, true);
    parts.push(z.buffer);
  }
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(8, Math.min(entries.length, 0xffff), true);
  eocd.setUint16(10, Math.min(entries.length, 0xffff), true);
  eocd.setUint32(12, cdSize, true);
  eocd.setUint32(16, needs64 ? M32 : cdStart, true);
  parts.push(eocd.buffer);
  return new Blob(parts, { type: 'application/zip' });
}
