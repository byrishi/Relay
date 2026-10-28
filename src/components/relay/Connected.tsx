import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldAlert, Check, X, File as FileIcon, Folder, Download, Pause, Play, FolderUp, Plus,
  Copy, Clipboard, History, Trash2, RotateCw, HardDrive, BadgeCheck, ArrowUp, ArrowDown, ArrowRight,
} from 'lucide-react';
import Dialog from '../Dialog';
import { cn } from '../../lib/utils';
import type { Relay, TransferTask, Peer, PendingOffer } from '../../hooks/useRelay';
import { canSaveToDisk, canSaveToFolder, buildZip } from '../../lib/sinks';
import { formatBytes, formatTime, routeLabel, timeAgo, collectFolderInput } from './format';
import Sparkline from './Sparkline';

// ── Peers, approval, safety number ──────────────────────────────────────────
function SafetyDialog({ peer, verified, onVerified, onMismatch, onClose }: {
  peer: Peer; verified: boolean; onVerified: () => void; onMismatch: () => void; onClose: () => void;
}) {
  return (
    <Dialog title={`Verify ${peer.name}`} onClose={onClose}
      description={<>Compare this number with the one on <span className="text-ink font-medium">{peer.name}</span>, in person or on a call. If they match, nobody, not even Relay's server, can read this connection.</>}>
      <div className="lcd text-dev-fg font-mono text-[26px] md:text-[30px] tracking-[0.12em] text-center py-6 select-all" data-testid="safety-number" aria-label={`Safety number ${peer.safety || 'loading'}`}>
        {peer.safety || 'Connecting…'}
      </div>
      {verified
        ? <p className="mt-4 text-[15px] text-ok flex items-center gap-2"><BadgeCheck className="w-4 h-4" aria-hidden="true" /> You confirmed this connection.</p>
        : <p className="mt-4 text-[15px] text-ink-2">Does the other screen show the same number?</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-autofocus onClick={() => { onVerified(); onClose(); }} className="btn btn-signal h-12">They match</button>
        <button onClick={onMismatch} className="btn btn-danger h-12">They don’t match</button>
      </div>
      <button onClick={onClose} className="mt-2 w-full h-11 text-[15px] text-ink-2 hover:text-ink">Not now</button>
    </Dialog>
  );
}

function ApprovalBanner({ peer, relay }: { peer: Peer; relay: Relay }) {
  return (
    <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} aria-labelledby={`approve-${peer.clientId}`}
      className="rounded-[20px] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 bg-white text-ink">
      <ShieldAlert className="w-6 h-6 text-signal shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <h2 id={`approve-${peer.clientId}`} className="text-[18px] font-medium">{peer.name} wants to connect</h2>
        <p className="text-ink-2 text-[15px] mt-1 leading-relaxed">
          Only allow a device you expect. To be sure it's them, check their screen shows <span className="font-mono text-ink whitespace-nowrap">{peer.safety || '…'}</span>.
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex gap-3">
        <button onClick={() => relay.approvePeer(peer.clientId, true)} className="btn btn-signal h-12">Allow</button>
        <button onClick={() => relay.approvePeer(peer.clientId, false)} className="btn btn-line h-12">Block</button>
      </div>
    </motion.section>
  );
}

/** A number that glides to each new value instead of jumping. */
function Eased({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(value);
  useEffect(() => {
    const a = from.current, t0 = performance.now(), ms = 450;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms), v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      if (ref.current) ref.current.textContent = v.toFixed(v < 10 ? 1 : 0);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span ref={ref}>{value.toFixed(value < 10 ? 1 : 0)}</span>;
}

/** The link between the two devices. The stream runs as fast as the real transfer. */
function LinkBand({ relay, peers }: { relay: Relay; peers: Peer[] }) {
  const speed = relay.totalSpeed;
  const busy = speed > 0;
  const [whole, frac] = formatBytes(speed, 1).split(' ');
  // 0 → idle drift, 1 → full speed (≈ 50 MB/s)
  const energy = Math.min(1, Math.log10(1 + speed / 1e5) / 2.7);
  const dur = busy ? 2.4 - energy * 1.9 : 7;
  const other = peers.filter((p) => p.approved).map((p) => p.name).join(', ') || 'Joining…';
  const n = busy ? 10 : 3;
  return (
    <div className="px-6 md:px-10 pb-6 md:pb-8" aria-hidden="true">
      <div className="flex items-end justify-between gap-4">
        <span className="text-dev-fg-2 truncate">{relay.deviceName}</span>
        {busy ? <span className="display text-[44px] md:text-[64px] leading-none tabular-nums shrink-0" style={{ ['--w' as string]: 3 }}><Eased value={parseFloat(whole)} /><span className="text-[18px] ml-1.5 text-dev-fg-2 font-sans">{frac}/s</span></span>
          : <span className="text-dev-fg-2 shrink-0 hidden sm:inline">Ready for files</span>}
        <span className="text-dev-fg-2 truncate text-right">{other}</span>
      </div>
      <div className="relative h-4 mt-4">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-white/20" />
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white" />
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white" />
        <div className="absolute inset-x-4 inset-y-0 overflow-hidden">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="absolute top-1/2 -translate-y-1/2 w-3.5 h-2 rounded-full bg-white stream-dot"
              style={{ animationDuration: `${dur}s`, animationDelay: `${(-dur * i) / n}s`, opacity: busy ? 1 : 0.5 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({ relay }: { relay: Relay }) {
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [verified, setVerified] = useState<Record<string, string>>({}); // clientId -> safety number confirmed
  const peers = Object.values(relay.peers) as Peer[];
  const verifyPeer = verifyId ? relay.peers[verifyId] : undefined;
  const isVerified = (p: Peer) => !!p.safety && verified[p.clientId] === p.safety;
  const names = peers.filter((p) => p.approved).map((p) => p.name);
  return (
    <section aria-labelledby="link-title">
      <div className="px-6 md:px-10 pt-9 md:pt-12 pb-6 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 id="link-title" className="display text-[44px] sm:text-[60px] md:text-[80px] text-balance" style={{ ['--w' as string]: 3.4 }}>
            {names.length ? <>Connected to {names.join(', ')}</> : 'A device is joining'}
          </h1>
          <p className="text-dev-fg-2 mt-3">Encrypted end to end. Room <span className="font-mono text-white">{relay.roomCode}</span>.</p>
        </div>
        <button onClick={relay.leaveRoom} className="key key-dark h-11 self-start shrink-0">Disconnect</button>
      </div>
      <ul className="px-6 md:px-10 pb-8 flex flex-col sm:flex-row sm:flex-wrap gap-2" aria-label="Connected devices">
        {peers.map((p) => (
          <li key={p.clientId}>
            <button onClick={() => setVerifyId(p.clientId)}
              className={cn('w-full sm:w-auto min-h-11 pl-4 pr-1.5 py-1.5 rounded-full text-[15px] flex items-center gap-2.5 transition-colors text-left',
                p.approved === undefined ? 'bg-warn-d/20 text-white' : 'bg-lcd text-dev-fg-2 hover:bg-dev-3')}>
              {isVerified(p) ? <BadgeCheck className="w-4 h-4 text-ok-d shrink-0" aria-hidden="true" /> : <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />}
              <span className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-white font-medium">{p.name}</span>
                <span>{p.approved === undefined ? 'waiting for you' : p.connected ? routeLabel(p.route) : 'Reconnecting…'}</span>
              </span>
              <span className={cn('h-8 px-3.5 rounded-full inline-flex items-center text-[14px] font-medium shrink-0', isVerified(p) ? 'text-ok-d bg-white/10' : 'bg-white text-signal')}>{isVerified(p) ? 'Verified' : 'Verify'}</span>
            </button>
          </li>
        ))}
      </ul>
      <LinkBand relay={relay} peers={peers} />
      <AnimatePresence>
        {verifyPeer && (
          <SafetyDialog peer={verifyPeer} verified={isVerified(verifyPeer)}
            onVerified={() => verifyPeer.safety && setVerified((v) => ({ ...v, [verifyPeer.clientId]: verifyPeer.safety! }))}
            onMismatch={() => { setVerifyId(null); relay.approvePeer(verifyPeer.clientId, false); relay.flash('Disconnected. Start a new room, ideally on a different network.'); }}
            onClose={() => setVerifyId(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

// ── Incoming offers ─────────────────────────────────────────────────────────
function OffersPanel({ relay }: { relay: Relay }) {
  const [always, setAlways] = useState(false);
  // collapse folder offers into one row per folder
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: { offer: PendingOffer; count: number; size: number }[] = [];
    for (const o of relay.offers) {
      if (o.group) {
        if (seen.has(o.group.id)) continue;
        seen.add(o.group.id);
        out.push({ offer: o, count: o.group.count, size: o.group.size });
      } else out.push({ offer: o, count: 1, size: o.size });
    }
    return out;
  }, [relay.offers]);
  if (!rows.length) return null;
  const disk = canSaveToDisk();
  const folder = canSaveToFolder();

  return (
    <section className="rounded-[20px] p-5 md:p-6 bg-white text-ink" data-testid="offers" aria-labelledby="offers-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="offers-h" className="text-[18px] font-medium">Incoming files. Only accept what you expect.</h2>
        {rows.length > 1 && <button onClick={relay.acceptAllOffers} className="btn btn-line h-11">Accept all</button>}
      </div>
      <ul className="mt-4 flex flex-col gap-2.5">
        {rows.map(({ offer: o, count, size }) => (
          <motion.li key={o.group?.id || o.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-bg p-3.5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-10 h-10 rounded-xl bg-pale flex items-center justify-center text-signal shrink-0">
                {o.group ? <Folder className="w-4 h-4" aria-hidden="true" /> : <FileIcon className="w-4 h-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-[16px] font-medium truncate">{o.group ? o.group.name : o.name}</p>
                <p className="text-[14px] text-ink-3 mt-0.5">{o.group ? `${count} files, ` : ''}{formatBytes(size)} from {o.peerName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center [&>.btn]:h-11">
              {!o.group && disk && <button onClick={() => relay.respondToOffer(o.id, 'save-as', always)} className="btn btn-signal"><HardDrive className="w-4 h-4" aria-hidden="true" />Save as…</button>}
              {o.group && folder && <button onClick={() => relay.respondToOffer(o.id, 'folder')} className="btn btn-signal"><FolderUp className="w-4 h-4" aria-hidden="true" />Save to folder…</button>}
              <button onClick={() => relay.respondToOffer(o.id, 'accept', always)} className={cn('btn', (o.group ? folder : disk) ? 'btn-line' : 'btn-signal')}>Accept</button>
              <button onClick={() => relay.respondToOffer(o.id, 'decline')} className="btn text-ink-2 hover:text-danger">Decline</button>
            </div>
          </motion.li>
        ))}
      </ul>
      <label className="mt-4 flex items-center gap-2.5 text-[15px] text-ink-2 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} />
        Always accept files from this device (this session)
      </label>
      {!disk && relay.offers.some((o) => o.size > 2 * 1024 ** 3) && (
        <p className="mt-2 text-[14px] text-warn">Large file: this browser keeps it in its own storage until you press Save. Chrome or Edge on desktop can stream it straight to disk.</p>
      )}
    </section>
  );
}

// ── Transfers ───────────────────────────────────────────────────────────────
interface Row { key: string; task: TransferTask; group?: { tasks: TransferTask[]; done: number } }

function aggregate(tasks: TransferTask[]): Row[] {
  const rows: Row[] = [];
  const groups = new Map<string, TransferTask[]>();
  for (const t of tasks) {
    if (t.group) {
      if (!groups.has(t.group.id)) { groups.set(t.group.id, []); rows.push({ key: t.group.id, task: t }); }
      groups.get(t.group.id)!.push(t);
    } else rows.push({ key: t.id, task: t });
  }
  const rank = ['transferring', 'paused', 'queued', 'offered', 'interrupted', 'failed', 'completed', 'declined', 'cancelled'];
  return rows.map((r) => {
    if (!r.task.group) return r;
    const list = groups.get(r.key)!;
    const g = r.task.group;
    const bytes = list.reduce((a, t) => a + t.bytes, 0);
    const done = list.filter((t) => t.status === 'completed').length;
    const allDone = done === g.count;
    const status = allDone ? 'completed' : (rank.find((s) => list.some((t) => t.status === s)) as TransferTask['status']);
    const speed = list.reduce((a, t) => a + (t.status === 'transferring' ? t.speed : 0), 0);
    const totalBytes = g.size * Math.max(1, r.task.peerIds.length);
    const active = list.find((t) => t.status === 'transferring');
    return {
      key: r.key,
      group: { tasks: list, done },
      task: {
        ...r.task, name: g.name, size: g.size, status, bytes, speed,
        progress: totalBytes ? Math.min(100, (bytes / totalBytes) * 100) : 0,
        eta: speed > 0 ? (totalBytes - bytes) / speed : undefined,
        samples: active?.samples || r.task.samples,
        savedToDisk: list.every((t) => t.savedToDisk),
        error: list.find((t) => t.error)?.error,
      },
    };
  });
}

function GroupDownload({ tasks, name }: { tasks: TransferTask[]; name: string }) {
  const [busy, setBusy] = useState(false);
  const make = () => {
    setBusy(true);
    try {
      const entries = tasks.filter((t) => t.blob && t.crc !== undefined).map((t) => ({ path: t.path || t.name, blob: t.blob!, crc: t.crc! }));
      const zip = buildZip(entries);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zip);
      a.download = `${name}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    } finally { setBusy(false); }
  };
  return (
    <button onClick={make} disabled={busy} className="key key-signal h-11">
      <Download className="w-4 h-4" aria-hidden="true" /> Save .zip
    </button>
  );
}

const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.slice(0, 4).toUpperCase() : 'FILE');
const iconBtn = 'relative z-10 w-10 h-10 flex items-center justify-center text-dev-fg-2 hover:text-dev-fg hover:bg-dev-3 transition-colors';

function TransferRow({ row, relay }: { row: Row; relay: Relay }) {
  const t = row.task;
  const active = ['transferring', 'paused', 'queued', 'offered', 'interrupted'].includes(t.status);
  const bad = ['cancelled', 'failed', 'declined'].includes(t.status);
  const moving = ['transferring', 'paused', 'interrupted'].includes(t.status);
  const label = t.status === 'offered' ? (t.isSending ? 'Waiting for them to accept' : 'Waiting')
    : t.status === 'interrupted' ? 'Connection lost, will resume'
    : t.status === 'queued' ? 'Queued'
    : t.status === 'failed' && t.error ? `Failed: ${t.error}`
    : t.status === 'completed' ? (t.isSending ? 'Sent' : t.savedToDisk ? 'Saved to disk' : 'Received')
    : t.status === 'transferring' ? (t.isSending ? 'Sending' : 'Receiving')
    : t.status.charAt(0).toUpperCase() + t.status.slice(1);

  return (
    <motion.li layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      data-testid="transfer" data-status={t.status}
      className="py-4 grid grid-cols-[44px_1fr] gap-x-3.5 border-t border-dev-line first:border-t-0">
      {t.previewUrl && /^image\//.test(t.mime || '') ? (
        <img src={t.previewUrl} alt="" className="w-11 h-11 object-cover" />
      ) : (
        <span className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-[11px] font-medium',
          t.status === 'completed' ? 'bg-white text-ok' : bad ? 'bg-white text-danger' : 'bg-white/15 text-white')} aria-hidden="true">
          {t.status === 'completed' ? <Check className="w-4 h-4" /> : bad ? <X className="w-4 h-4" /> : t.status === 'interrupted' ? <RotateCw className="w-4 h-4 animate-spin [animation-duration:3s]" /> : row.group ? <Folder className="w-4 h-4" /> : ext(t.name)}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-dev-fg truncate" title={t.name}>{t.name}</p>
            <p className="text-[14px] text-dev-fg-2 mt-0.5 flex flex-wrap gap-x-2">
              <span className="inline-flex items-center gap-1">{t.isSending ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}{row.group ? `${row.group.done}/${row.group.tasks.length} files, ` : ''}{formatBytes(t.size)}</span>
              <span className={cn(t.status === 'transferring' && 'text-dev-fg', bad && 'text-danger-d', (t.status === 'paused' || t.status === 'interrupted') && 'text-warn-d', t.status === 'completed' && 'text-ok-d')}>
                {label}{moving ? `, ${t.progress.toFixed(t.progress < 10 ? 1 : 0)}%` : ''}
              </span>
              {t.status === 'completed' && t.avgSpeed ? <span>avg {formatBytes(t.avgSpeed, 1)}/s</span> : null}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {t.status === 'transferring' && (
              <>
                <Sparkline samples={t.samples} className="w-24 h-7 hidden sm:block" />
                <span className="text-right">
                  <span className="block font-mono text-[14px] text-dev-fg tabular-nums">{t.speed ? formatBytes(t.speed, 1) + '/s' : '--'}</span>
                  <span className="block text-[13px] text-dev-fg-2">{t.eta ? formatTime(t.eta) + ' left' : ''}</span>
                </span>
              </>
            )}
            {active && (
              <span className="flex items-center">
                {t.isSending && !row.group && t.status === 'transferring' && (
                  <button onClick={() => relay.manageTransfer(t, 'pause')} title="Pause" aria-label={`Pause ${t.name}`} className={iconBtn}><Pause className="w-4 h-4" /></button>
                )}
                {t.isSending && !row.group && t.status === 'paused' && (
                  <button onClick={() => relay.manageTransfer(t, 'resume')} title="Resume" aria-label={`Resume ${t.name}`} className={iconBtn}><Play className="w-4 h-4" /></button>
                )}
                <button onClick={() => relay.manageTransfer(t, 'cancel')} title="Cancel" aria-label={`Cancel ${t.name}`} className={`${iconBtn} hover:text-danger-d`}><X className="w-4 h-4" /></button>
              </span>
            )}
            {!t.isSending && t.status === 'completed' && !row.group && t.url && (
              <a href={t.url} download={t.name} className="key key-signal h-11"><Download className="w-4 h-4" aria-hidden="true" /> Save</a>
            )}
            {!t.isSending && t.status === 'completed' && row.group && !t.savedToDisk && <GroupDownload tasks={row.group.tasks} name={t.name} />}
            {!active && (
              <button onClick={() => relay.dismissTransfer(t.id)} title="Remove from list" aria-label={`Remove ${t.name} from the list`} className={iconBtn}><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>
        {moving && <div className={cn('meter mt-3', t.status !== 'transferring' && 'paused')} aria-hidden="true"><i style={{ width: `${t.progress}%` }} /></div>}
      </div>
    </motion.li>
  );
}

// ── History ─────────────────────────────────────────────────────────────────
function HistoryPanel({ relay }: { relay: Relay }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-11 flex items-center gap-2 text-[15px] text-dev-fg-2 hover:text-white">
          <History className="w-3.5 h-3.5" aria-hidden="true" /> History ({relay.history.length})
        </button>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2.5 text-[14px] text-dev-fg-2 cursor-pointer select-none">
            <input type="checkbox" checked={relay.keepHistory} onChange={(e) => relay.setKeepHistory(e.target.checked)} /> Keep history on this device
          </label>
          {relay.history.length > 0 && <button onClick={relay.clearHistory} className="min-h-11 text-[15px] text-dev-fg-2 hover:text-danger-d flex items-center gap-1.5"><Trash2 className="w-3 h-3" aria-hidden="true" />Clear</button>}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 flex flex-col divide-y divide-dev-line overflow-hidden">
            {relay.history.length === 0 && <li className="text-[14px] text-dev-fg-2 py-3">Nothing yet. Only names, sizes and speeds are stored, never file contents.</li>}
            {relay.history.slice(0, 50).map((h) => (
              <li key={h.id + h.at} className="py-2.5 flex items-center justify-between gap-3 text-[14px]">
                <span className="truncate text-dev-fg">{h.direction === 'send' ? '↑' : '↓'} {h.name}</span>
                <span className="text-[14px] text-dev-fg-2 whitespace-nowrap">{formatBytes(h.size)}, {h.status}{h.avgSpeed ? `, ${formatBytes(h.avgSpeed, 1)}/s` : ''}, {h.peer}, {timeAgo(h.at)}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Screen-reader announcements for things that happen without a click ─────
function Announcer({ relay }: { relay: Relay }) {
  const [msg, setMsg] = useState('');
  const seen = useRef<Record<string, string>>({});
  useEffect(() => {
    for (const t of Object.values(relay.transfers) as TransferTask[]) {
      if (seen.current[t.id] === t.status) continue;
      seen.current[t.id] = t.status;
      const name = t.group ? t.group.name : t.name;
      if (t.status === 'completed' && !t.group) setMsg(t.isSending ? `${name} sent.` : `${name} received. Press Save to keep it.`);
      else if (t.status === 'failed') setMsg(`${name} failed${t.error ? `: ${t.error}` : ''}.`);
      else if (t.status === 'declined') setMsg(`${name} was declined.`);
      else if (t.status === 'interrupted') setMsg(`Connection lost. ${name} will resume automatically.`);
    }
  }, [relay.transfers]);
  const offerCount = relay.offers.length;
  useEffect(() => {
    if (offerCount) setMsg(`${relay.offers[offerCount - 1].peerName} wants to send you ${offerCount === 1 ? relay.offers[0].name : `${offerCount} files`}. Accept or decline below.`);
  }, [offerCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = (Object.values(relay.peers) as Peer[]).filter((p) => p.approved === undefined).map((p) => p.name).join(', ');
  useEffect(() => { if (pending) setMsg(`${pending} wants to connect. Allow or block below.`); }, [pending]);
  return <div className="sr-only" role="status" aria-live="polite">{msg}</div>;
}

// ── Main connected view ─────────────────────────────────────────────────────
export default function Connected({ relay }: { relay: Relay }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const pending = (Object.values(relay.peers) as Peer[]).filter((p) => p.approved === undefined);
  const rows = useMemo(() => aggregate((Object.values(relay.transfers) as TransferTask[]).reverse()), [relay.transfers]);
  const busy = relay.totalSpeed > 0;

  return (
    <div className="wrap pt-3 md:pt-5 pb-10">
      <Announcer relay={relay} />
      <div className="device">
        <Header relay={relay} />
        <div className="px-3 md:px-4 flex flex-col gap-3">
          {pending.map((p) => <ApprovalBanner key={p.clientId} peer={p} relay={relay} />)}
          <OffersPanel relay={relay} />
        </div>

        <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-3 p-3 md:p-4">
          <section aria-labelledby="tr-h" className="rounded-[20px] bg-dev-2 p-5 md:p-6 min-w-0">
            <div className="flex items-center justify-between">
              <h2 id="tr-h" className="text-[17px] font-medium">Transfers</h2>
              {rows.length > 0 && <span className="text-dev-fg-2">{rows.length}</span>}
            </div>
            {rows.length > 0 ? (
              <ul className="mt-2">
                <AnimatePresence initial={false}>{rows.map((r) => <TransferRow key={r.key} row={r} relay={relay} />)}</AnimatePresence>
              </ul>
            ) : (
              <div className="mt-4 min-h-[180px] md:min-h-[240px] rounded-2xl border-[1.5px] border-dashed border-white/30 p-5 flex flex-col justify-end gap-2">
                <p className="display text-white text-[40px] md:text-[52px]" style={{ ['--w' as string]: 3.4 }}>
                  <span className="pointer-coarse:hidden">Drop, paste or pick.</span><span className="hidden pointer-coarse:inline">Pick a file.</span>
                </p>
                <p className="text-[14px] text-dev-fg-2">Files go only to devices you allowed, and each one must accept.</p>
              </div>
            )}
          </section>

          <section aria-labelledby="send-title" className="rounded-[20px] bg-dev-2 p-5 md:p-6 flex flex-col">
            <h2 id="send-title" className="text-[17px] font-medium">Send</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button onClick={() => fileInput.current?.click()} className="key key-signal"><Plus className="w-4 h-4" aria-hidden="true" />Choose files</button>
              <button onClick={() => folderInput.current?.click()} className="key key-dark pointer-coarse:hidden"><FolderUp className="w-4 h-4" aria-hidden="true" />Choose a folder</button>
            </div>
            <p className="text-[14.5px] text-dev-fg-2 mt-3 pointer-coarse:hidden">You can also drop files anywhere, or paste with Ctrl/⌘ V.</p>
            <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="file-input"
              onChange={(e) => { if (e.target.files?.length) relay.sendFiles(Array.from(e.target.files)); e.target.value = ''; }} />
            <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="folder-input"
              {...({ webkitdirectory: '', directory: '' } as any)}
              onChange={(e) => {
                if (e.target.files?.length) collectFolderInput(e.target.files).forEach((g) => relay.sendFiles(g.files, { paths: g.paths, groupName: g.groupName }));
                e.target.value = '';
              }} />

            <form onSubmit={(e) => { e.preventDefault(); if (relay.sendText(text)) setText(''); }} className="mt-6 flex gap-2.5">
              <label htmlFor="msg" className="sr-only">Message to send</label>
              <input id="msg" autoComplete="off" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message or link…"
                className="lcd-field flex-1 min-w-0 h-[52px] px-3.5 text-[16px]" />
              <button type="submit" disabled={!text.trim()} aria-label="Send" className="key key-light w-[56px] px-0"><ArrowRight className="w-5 h-5" aria-hidden="true" /></button>
            </form>

            {relay.messages.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2" aria-label="Messages">
                {relay.messages.map((m) => (
                  <li key={m.id} className="lcd p-3.5 flex gap-3 items-start" data-testid="message">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-dev-fg break-words whitespace-pre-wrap">{m.text}</p>
                      <p className="text-[13.5px] text-dev-fg-2 mt-1">{new Date(m.timestamp).toLocaleTimeString()}, {m.isSending ? 'sent' : `from ${m.from || 'peer'}`}{m.kind === 'clip' ? ', clipboard' : ''}</p>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(m.text)} title="Copy" aria-label="Copy message" className={iconBtn}><Copy className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            )}

            <label className="mt-6 flex items-start gap-2.5 text-[14px] text-dev-fg-2 cursor-pointer select-none w-fit">
              <input type="checkbox" checked={relay.clipboardSync} onChange={(e) => relay.setClipboardSync(e.target.checked)} className="mt-0.5" />
              <Clipboard className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /><span>Sync clipboard with approved devices <span className="whitespace-nowrap">(beta, may ask for permission)</span></span>
            </label>
          </section>
        </div>

        <div className="px-6 md:px-8 pb-3">
          <HistoryPanel relay={relay} />
        </div>
      </div>
    </div>
  );
}
