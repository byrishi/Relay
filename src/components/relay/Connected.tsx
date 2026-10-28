import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldAlert, Check, X, File as FileIcon, Folder, Download, Pause, Play, UploadCloud, FolderUp,
  MessageSquare, Copy, Clipboard, History, Trash2, RotateCw, HardDrive, Lock, BadgeCheck,
} from 'lucide-react';
import Dialog from '../Dialog';
import { cn } from '../../lib/utils';
import type { Relay, TransferTask, Peer, PendingOffer } from '../../hooks/useRelay';
import { canSaveToDisk, canSaveToFolder, buildZip } from '../../lib/sinks';
import { formatBytes, formatTime, routeLabel, timeAgo, collectFolderInput } from './format';
import Sparkline from './Sparkline';

const glass = 'card';
const btn = 'px-4 h-10 rounded-full text-sm font-medium transition-colors inline-flex items-center';
const solid = 'bg-ink text-white hover:bg-brand';
const outline = 'bg-white text-ink border border-ink/15 hover:border-ink/40';

// ── Peers, approval, safety number ──────────────────────────────────────────
function SafetyDialog({ peer, verified, onVerified, onMismatch, onClose }: {
  peer: Peer; verified: boolean; onVerified: () => void; onMismatch: () => void; onClose: () => void;
}) {
  return (
    <Dialog title={`Verify ${peer.name}`} onClose={onClose}
      description={<>Compare this number with the one shown on <b className="text-ink">{peer.name}</b>, in person or on a call. If they match, your connection is encrypted end to end and nobody, not even Relay’s server, can read it.</>}>
      <div className="font-mono text-2xl md:text-3xl tracking-[0.12em] text-ink text-center py-6 rounded-2xl bg-paper border border-ink/10 select-all" data-testid="safety-number" aria-label={`Safety number ${peer.safety || 'loading'}`}>
        {peer.safety || 'Connecting…'}
      </div>
      {verified
        ? <p className="mt-4 text-sm text-ok flex items-center gap-2"><BadgeCheck className="w-4 h-4" aria-hidden="true" /> You confirmed this connection.</p>
        : <p className="mt-4 text-sm text-ink-2">Does the other screen show the same number?</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-autofocus onClick={() => { onVerified(); onClose(); }} className="btn-ink h-12 text-sm">They match</button>
        <button onClick={onMismatch} className="h-12 rounded-full bg-white text-danger border border-danger/30 font-medium text-sm hover:bg-danger hover:text-white transition-colors">They don’t match</button>
      </div>
      <button onClick={onClose} className="mt-3 w-full h-10 text-sm text-ink-2 hover:text-ink">Not now</button>
    </Dialog>
  );
}

function ApprovalBanner({ peer, relay }: { peer: Peer; relay: Relay }) {
  return (
    <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} aria-labelledby={`approve-${peer.clientId}`}
      className={cn(glass, 'w-full rounded-[28px] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 !border-warn/40 !bg-[#FFF8EC]/90')}>
      <ShieldAlert className="w-6 h-6 text-warn shrink-0" aria-hidden="true" />
      <div className="flex-1 text-left">
        <h2 id={`approve-${peer.clientId}`} className="text-ink text-base font-semibold"><span className="text-warn">{peer.name}</span> wants to connect</h2>
        <p className="text-ink-2 text-sm mt-1">
          Only allow a device you expect. To be sure it’s them, check their screen shows the safety number <span className="font-mono text-ink whitespace-nowrap">{peer.safety || '…'}</span>.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => relay.approvePeer(peer.clientId, true)} className="btn-ink px-6 h-11 text-sm">Allow</button>
        <button onClick={() => relay.approvePeer(peer.clientId, false)} className="px-6 h-11 rounded-full text-sm font-medium bg-white text-danger border border-danger/30 hover:bg-danger hover:text-white transition-colors">Block</button>
      </div>
    </motion.section>
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
    <section aria-labelledby="link-title" className={cn(glass, 'w-full flex flex-col md:flex-row md:items-center justify-between p-5 md:p-7 gap-5 rounded-[32px]')}>
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-12 h-12 bg-ink flex items-center justify-center shrink-0 rounded-2xl"><Lock className="w-5 h-5 text-white" aria-hidden="true" /></div>
        <div className="min-w-0 text-left">
          <h1 id="link-title" className="text-ink text-2xl font-semibold tracking-tight">
            {names.length ? <>Connected to <em className="font-serif italic font-normal">{names.join(', ')}</em></> : 'Device joining…'}
          </h1>
          <p className="text-ink-3 text-sm mt-1">Encrypted end to end · Room <span className="font-mono">{relay.roomCode}</span> · You are {relay.deviceName}</p>
          <ul className="flex flex-wrap gap-2 mt-3" aria-label="Connected devices">
            {peers.map((p) => (
              <li key={p.clientId}>
                <button onClick={() => setVerifyId(p.clientId)}
                  className={cn('pl-3 pr-1.5 py-1.5 rounded-full border text-xs flex flex-wrap items-center gap-x-2 gap-y-1 text-left bg-white hover:border-ink/40 transition-colors',
                    p.approved === undefined ? 'border-warn/50 text-warn'
                      : isVerified(p) ? 'border-ok/50 text-ok' : 'border-ink/15 text-ink-2')}>
                  {isVerified(p) ? <BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> : <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{p.name}</span>
                  <span className="text-ink-3" aria-hidden="true">·</span>
                  <span>{p.approved === undefined ? 'waiting for you' : p.connected ? routeLabel(p.route) : 'Reconnecting…'}</span>
                  <span className={cn('ml-1 px-2 py-0.5 rounded-full font-medium', isVerified(p) ? 'bg-ok/10' : 'bg-ink text-white')}>{isVerified(p) ? 'Verified' : 'Verify'}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button onClick={relay.leaveRoom}
        className="px-5 h-11 bg-white text-danger border border-danger/30 hover:bg-danger hover:text-white text-sm font-medium rounded-full transition-colors whitespace-nowrap">
        Disconnect
      </button>
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
    <div className="w-full flex flex-col gap-3" data-testid="offers">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-warn">Incoming files: only accept what you expect</h2>
        {rows.length > 1 && <button onClick={relay.acceptAllOffers} className={cn(btn, outline)}>Accept all</button>}
      </div>
      {rows.map(({ offer: o, count, size }) => (
        <motion.div key={o.group?.id || o.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className={cn(glass, 'rounded-3xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 !border-warn/35')}>
          <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="w-11 h-11 rounded-2xl bg-paper flex items-center justify-center text-brand shrink-0">
              {o.group ? <Folder className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] text-ink font-semibold truncate">{o.group ? o.group.name : o.name}</p>
              <p className="text-xs text-ink-3">{o.group ? `${count} files · ` : ''}{formatBytes(size)} · from {o.peerName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {!o.group && disk && <button onClick={() => relay.respondToOffer(o.id, 'save-as', always)} className={cn(btn, solid, 'gap-1.5')}><HardDrive className="w-3.5 h-3.5" />Save as…</button>}
            {o.group && folder && <button onClick={() => relay.respondToOffer(o.id, 'folder')} className={cn(btn, solid, 'gap-1.5')}><FolderUp className="w-3.5 h-3.5" />Save to folder…</button>}
            <button onClick={() => relay.respondToOffer(o.id, 'accept', always)} className={cn(btn, (o.group ? folder : disk) ? outline : solid)}>Accept</button>
            <button onClick={() => relay.respondToOffer(o.id, 'decline')} className={cn(btn, 'text-ink-2 hover:text-danger')}>Decline</button>
          </div>
        </motion.div>
      ))}
      <label className="flex items-center gap-2 text-xs text-ink-2 self-start cursor-pointer select-none">
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} className="accent-[#4B52E0] w-4 h-4" />
        Always accept files from this device (this session)
      </label>
      {!disk && relay.offers.some((o) => o.size > 2 * 1024 ** 3) && (
        <p className="text-xs text-warn text-left">Large file: this browser keeps it in its own storage until you press Save. Chrome or Edge on desktop can stream it straight to disk.</p>
      )}
    </div>
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
    <button onClick={make} disabled={busy} className="btn-ink px-4 h-9 text-xs">
      <Download className="w-4 h-4" /> Save .zip
    </button>
  );
}

function TransferCard({ row, relay }: { row: Row; relay: Relay }) {
  const t = row.task;
  const active = ['transferring', 'paused', 'queued', 'offered', 'interrupted'].includes(t.status);
  const bad = ['cancelled', 'failed', 'declined'].includes(t.status);
  const label = t.status === 'offered' ? (t.isSending ? 'waiting for them to accept' : 'waiting')
    : t.status === 'interrupted' ? 'connection lost · will resume'
    : t.status === 'queued' ? 'queued'
    : t.status === 'failed' && t.error ? `failed: ${t.error}`
    : t.status === 'completed' ? (t.isSending ? 'sent' : t.savedToDisk ? 'saved to disk' : 'received')
    : t.status;

  return (
    <motion.div layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      data-testid="transfer" data-status={t.status}
      className={cn('card p-4 md:p-5 rounded-3xl flex flex-col gap-3 relative overflow-hidden w-full',
        bad ? '!border-danger/30' : t.status === 'interrupted' ? '!border-warn/40' : '')}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {t.previewUrl && /^image\//.test(t.mime || '') ? (
            <img src={t.previewUrl} alt="" className="w-12 h-12 object-cover rounded-2xl border border-ink/10 shrink-0" />
          ) : (
            <div className={cn('w-12 h-12 flex items-center justify-center shrink-0 rounded-2xl',
              t.status === 'completed' ? 'bg-ok/10 text-ok' : bad ? 'bg-danger/10 text-danger' : 'bg-paper text-brand')}>
              {t.status === 'completed' ? <Check className="w-5 h-5" /> : bad ? <X className="w-5 h-5" /> : t.status === 'interrupted' ? <RotateCw className="w-5 h-5 animate-spin [animation-duration:3s]" /> : row.group ? <Folder className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
            </div>
          )}
          <div className="min-w-0 text-left">
            <p className="text-[15px] font-semibold text-ink truncate max-w-[220px] md:max-w-[380px]" title={t.name}>{t.name}</p>
            <div className="flex items-center gap-x-3 gap-y-0.5 text-xs text-ink-3 mt-0.5 flex-wrap">
              <span>{row.group ? `${row.group.done}/${row.group.tasks.length} files · ` : ''}{formatBytes(t.size)}</span>
              <span className={cn(t.status === 'transferring' && 'text-indigo font-semibold', bad && 'text-danger', (t.status === 'paused' || t.status === 'interrupted') && 'text-warn', t.status === 'completed' && 'text-ok font-medium')}>
                {label}{['transferring', 'paused', 'interrupted'].includes(t.status) ? ` · ${t.progress.toFixed(t.progress < 10 ? 1 : 0)}%` : ''}
              </span>
              <span>{t.isSending ? '↑ out' : '↓ in'}</span>
              {t.status === 'completed' && t.avgSpeed ? <span>avg {formatBytes(t.avgSpeed, 1)}/s</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {t.status === 'transferring' && (
            <div className="flex items-center gap-3">
              <Sparkline samples={t.samples} className="w-24 h-7 hidden sm:block" />
              <div className="flex flex-col items-end">
                <span className="text-xs text-ink font-semibold tabular-nums">{t.speed ? formatBytes(t.speed, 1) + '/s' : '--'}</span>
                <span className="text-[11px] text-ink-3">{t.eta ? formatTime(t.eta) + ' left' : ''}</span>
              </div>
            </div>
          )}
          {active && (
            <div className="flex items-center gap-0.5 bg-paper p-1 rounded-full">
              {t.isSending && !row.group && t.status === 'transferring' && (
                <button onClick={() => relay.manageTransfer(t, 'pause')} title="Pause" aria-label={`Pause ${t.name}`} className="p-2 rounded-full hover:bg-white hover:text-warn text-ink-2"><Pause className="w-4 h-4" /></button>
              )}
              {t.isSending && !row.group && t.status === 'paused' && (
                <button onClick={() => relay.manageTransfer(t, 'resume')} title="Resume" aria-label={`Resume ${t.name}`} className="p-2 rounded-full hover:bg-white hover:text-ink text-ink-2"><Play className="w-4 h-4" /></button>
              )}
              <button onClick={() => relay.manageTransfer(t, 'cancel')} title="Cancel" aria-label={`Cancel ${t.name}`} className="p-2 rounded-full hover:bg-white hover:text-danger text-ink-2"><X className="w-4 h-4" /></button>
            </div>
          )}
          {!t.isSending && t.status === 'completed' && !row.group && t.url && (
            <a href={t.url} download={t.name} className="btn-ink px-4 h-9 text-xs"><Download className="w-4 h-4" /> Save</a>
          )}
          {!t.isSending && t.status === 'completed' && row.group && !t.savedToDisk && <GroupDownload tasks={row.group.tasks} name={t.name} />}
          {!active && (
            <button onClick={() => relay.dismissTransfer(t.id)} title="Remove from list" aria-label={`Remove ${t.name} from the list`} className="p-2 rounded-full text-ink-3 hover:text-ink hover:bg-paper"><X className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>
      {['transferring', 'paused', 'interrupted'].includes(t.status) && (
        <div className="absolute bottom-0 left-0 h-[3px] bg-ink/5 w-full">
          <div className={cn('h-full transition-[width] duration-300', t.status === 'transferring' ? 'bg-dawn' : 'bg-warn')} style={{ width: `${t.progress}%` }} />
        </div>
      )}
    </motion.div>
  );
}

// ── History ─────────────────────────────────────────────────────────────────
function HistoryPanel({ relay }: { relay: Relay }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-ink">
          <History className="w-3.5 h-3.5" /> History ({relay.history.length})
        </button>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-ink-2 cursor-pointer select-none">
            <input type="checkbox" checked={relay.keepHistory} onChange={(e) => relay.setKeepHistory(e.target.checked)} className="accent-[#4B52E0] w-4 h-4" /> Keep history on this device
          </label>
          {relay.history.length > 0 && <button onClick={relay.clearHistory} className="text-xs text-ink-2 hover:text-danger flex items-center gap-1"><Trash2 className="w-3 h-3" />Clear</button>}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex flex-col divide-y divide-ink/10 overflow-hidden text-left">
            {relay.history.length === 0 && <li className="text-xs text-ink-3 py-3">Nothing yet. Only names, sizes and speeds are stored, never file contents.</li>}
            {relay.history.slice(0, 50).map((h) => (
              <li key={h.id + h.at} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-ink">{h.direction === 'send' ? '↑' : '↓'} {h.name}</span>
                <span className="text-ink-3 whitespace-nowrap">{formatBytes(h.size)} · {h.status}{h.avgSpeed ? ` · ${formatBytes(h.avgSpeed, 1)}/s` : ''} · {h.peer} · {timeAgo(h.at)}</span>
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
  const speed = relay.totalSpeed;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 items-center px-4 pb-16">
      <Header relay={relay} />
      {pending.map((p) => <ApprovalBanner key={p.clientId} peer={p} relay={relay} />)}

      <Announcer relay={relay} />

      <div className="w-full flex flex-col items-center py-3 select-none relative" aria-hidden="true">
        
        {speed > 0 ? (
          <>
            <span className="font-semibold tracking-[-0.04em] tabular-nums text-5xl md:text-7xl text-ink">{formatBytes(speed, 1)}/s</span>
            <span className="mt-2 font-serif italic text-xl text-ink-2">sending directly, encrypted</span>
          </>
        ) : (
          <span className="text-[15px] text-ink-2 flex items-center gap-2.5 card rounded-full px-5 py-2.5"><span className="w-2 h-2 shrink-0 rounded-full bg-ok animate-breathe" />Ready. Drop, paste or choose files.</span>
        )}
      </div>

      <OffersPanel relay={relay} />

      {rows.length > 0 && (
        <div className="w-full flex flex-col gap-3">
          <h2 className="eyebrow pb-2 text-left">Transfers</h2>
          <AnimatePresence initial={false}>{rows.map((r) => <TransferCard key={r.key} row={r} relay={relay} />)}</AnimatePresence>
        </div>
      )}

      <section aria-labelledby="send-title" onClick={(e) => { if (e.target === e.currentTarget) fileInput.current?.click(); }}
        className="relative w-full border-2 border-ink/15 border-dashed hover:border-indigo bg-white/70 backdrop-blur-xl rounded-[32px] transition-colors flex flex-col items-center justify-center text-center px-6 py-12 md:py-16 cursor-pointer">
        <span className="w-14 h-14 rounded-2xl bg-paper flex items-center justify-center mb-4 pointer-events-none"><UploadCloud className="w-7 h-7 text-indigo" aria-hidden="true" /></span>
        <h2 id="send-title" className="text-2xl md:text-3xl font-semibold text-ink tracking-tight pointer-events-none">Send <em className="font-serif italic font-normal">files</em></h2>
        <p className="text-ink-2 text-[15px] mt-2 max-w-md pointer-events-none leading-relaxed">Drag files or folders here, paste with Ctrl/⌘+V, or choose below. They go only to devices you allowed, and each one must accept.</p>
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          <button onClick={() => fileInput.current?.click()} className="btn-ink px-6 h-12 text-sm">
            <FileIcon className="w-4 h-4" aria-hidden="true" /> Choose files
          </button>
          <button onClick={() => folderInput.current?.click()} className="btn-line px-6 h-12 text-sm">
            <FolderUp className="w-4 h-4" aria-hidden="true" /> Choose a folder
          </button>
        </div>
        <p className="text-ink-3 text-xs mt-5 pointer-events-none">No size limit · Encrypted end to end · Never uploaded</p>
        <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="file-input"
          onChange={(e) => { if (e.target.files?.length) relay.sendFiles(Array.from(e.target.files)); e.target.value = ''; }} />
        <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="folder-input"
          {...({ webkitdirectory: '', directory: '' } as any)}
          onChange={(e) => {
            if (e.target.files?.length) collectFolderInput(e.target.files).forEach((g) => relay.sendFiles(g.files, { paths: g.paths, groupName: g.groupName }));
            e.target.value = '';
          }} />
      </section>

      <form onSubmit={(e) => { e.preventDefault(); if (relay.sendText(text)) setText(''); }}
        className="card w-full flex items-center rounded-full p-1.5 gap-1">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-paper shrink-0" aria-hidden="true"><MessageSquare className="w-[18px] h-[18px] text-ink-2" /></div>
        <label htmlFor="msg" className="sr-only">Message to send</label>
        <input id="msg" autoComplete="off" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message or link…"
          className="flex-1 min-w-0 bg-transparent outline-none text-ink px-3 text-[15px] placeholder:text-ink-3" />
        <button type="submit" disabled={!text.trim()} className="btn-ink px-6 h-11 text-sm">Send</button>
      </form>

      <label className="self-start flex items-center gap-2 text-xs text-ink-2 cursor-pointer select-none">
        <input type="checkbox" checked={relay.clipboardSync} onChange={(e) => relay.setClipboardSync(e.target.checked)} className="accent-[#4B52E0] w-4 h-4" />
        <Clipboard className="w-3.5 h-3.5" /> Sync clipboard with approved devices <span className="text-ink-3">(beta · your browser may ask for permission)</span>
      </label>

      {relay.messages.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          <h2 className="eyebrow text-left">Messages</h2>
          {relay.messages.map((m) => (
            <div key={m.id} className="card rounded-3xl p-4 group flex gap-3 items-start text-left" data-testid="message">
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-ink break-words whitespace-pre-wrap">{m.text}</p>
                <span className="text-[11px] text-ink-3 mt-1 block">
                  {new Date(m.timestamp).toLocaleTimeString()} · {m.isSending ? 'Sent' : `From ${m.from || 'peer'}`}{m.kind === 'clip' ? ' · clipboard' : ''}
                </span>
              </div>
              <button onClick={() => navigator.clipboard?.writeText(m.text)} title="Copy" aria-label="Copy message" className="p-2 rounded-full bg-paper hover:bg-ink hover:text-white text-ink-2 transition-colors"><Copy className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      <HistoryPanel relay={relay} />
    </div>
  );
}
