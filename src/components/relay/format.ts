import type { RouteInfo } from '../../lib/webrtc';

export function formatBytes(bytes?: number, decimals = 2) {
  if (bytes === undefined || bytes === null) return '';
  if (!+bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals))} ${sizes[i]}`;
}

export function formatTime(seconds?: number) {
  if (seconds === undefined || !isFinite(seconds) || seconds < 0) return '';
  if (seconds < 1) return '< 1s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h) return `${h}h ${m}m`;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function routeLabel(r?: RouteInfo) {
  if (!r) return 'Negotiating…';
  const base = r.route === 'lan' ? 'Direct · Local network'
    : r.route === 'p2p' ? 'Direct · Peer-to-peer'
    : r.route === 'relay' ? 'Relayed via TURN'
    : 'Direct';
  return r.rttMs != null ? `${base} · ${r.rttMs}ms` : base;
}

export function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

export interface PickedFiles { files: File[]; paths: string[]; groupName?: string }

/** Read a drag-and-drop: loose files are sent individually, each dropped folder as one group. */
export async function collectDropped(items: DataTransferItemList): Promise<PickedFiles[]> {
  const loose: File[] = [];
  const groups: PickedFiles[] = [];
  const entries = Array.from(items)
    .filter((i) => i.kind === 'file')
    .map((i) => ({ entry: (i as any).webkitGetAsEntry?.(), file: i.getAsFile() }));

  const readAll = (dir: any): Promise<any[]> => new Promise((resolve, reject) => {
    const reader = dir.createReader();
    const out: any[] = [];
    const next = () => reader.readEntries((batch: any[]) => {
      if (!batch.length) resolve(out); else { out.push(...batch); next(); }
    }, reject);
    next();
  });
  const walk = async (dir: any, prefix: string, files: File[], paths: string[]) => {
    for (const e of await readAll(dir)) {
      if (e.isFile) {
        const f: File = await new Promise((res, rej) => e.file(res, rej));
        files.push(f);
        paths.push(`${prefix}${f.name}`);
      } else if (e.isDirectory) {
        await walk(e, `${prefix}${e.name}/`, files, paths);
      }
    }
  };

  for (const { entry, file } of entries) {
    if (entry?.isDirectory) {
      const files: File[] = [];
      const paths: string[] = [];
      await walk(entry, `${entry.name}/`, files, paths);
      if (files.length) groups.push({ files, paths, groupName: entry.name });
    } else if (file) {
      loose.push(file);
    }
  }
  return [...(loose.length ? [{ files: loose, paths: loose.map((f) => f.name) }] : []), ...groups];
}

/** Files from an <input webkitdirectory>: one group per top-level folder. */
export function collectFolderInput(list: FileList): PickedFiles[] {
  const byTop = new Map<string, PickedFiles>();
  for (const f of Array.from(list)) {
    const rel = (f as any).webkitRelativePath || f.name;
    const top = rel.split('/')[0] || 'Folder';
    if (!byTop.has(top)) byTop.set(top, { files: [], paths: [], groupName: top });
    const g = byTop.get(top)!;
    g.files.push(f);
    g.paths.push(rel);
  }
  return [...byTop.values()];
}
