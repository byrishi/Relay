import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, ShieldAlert, Check, X, File as FileIcon, Folder, Download, Pause, Play, UploadCloud, FolderUp, Plus,
  Copy, Clipboard, History, Trash2, RotateCw, HardDrive, BadgeCheck, ArrowUp, ArrowDown,
} from 'lucide-react';
import Dialog from '../Dialog';
import Atmosphere from '../Atmosphere';
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
      description={<>Compare this number with the one on <span className="text-fg">{peer.name}</span>, in person or on a call. If they match, nobody, not even Relay's server, can read this connection.</>}>
      <div className="font-mono text-[24px] md:text-[28px] tracking-[0.1em] text-fg text-center py-6 rounded-xl bg-white/[0.03] ring2 select-all" data-testid="safety-number" aria-label={`Safety number ${peer.safety || 'loading'}`}>
        {peer.safety || 'Connecting…'}
      </div>
      {verified
        ? <p className="mt-4 text-[14px] text-ok flex items-center gap-2"><BadgeCheck className="w-4 h-4" aria-hidden="true" /> You confirmed this connection.</p>
        : <p className="mt-4 text-[14px] text-fg-2">Does the other screen show the same number?</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button data-autofocus onClick={() => { onVerified(); onClose(); }} className="btn btn-w btn-lg">They match</button>
        <button onClick={onMismatch} className="btn btn-d btn-lg">They don’t match</button>
      </div>
      <button onClick={onClose} className="mt-2 w-full h-10 text-[14px] text-fg-2 hover:text-fg">Not now</button>
    </Dialog>
  );
}

function ApprovalBanner({ peer, relay }: { peer: Peer; relay: Relay }) {
  return (
    <motion.section initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} aria-labelledby={`approve-${peer.clientId}`}
      className="p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 bg-warn/[0.06] border-b border-warn/25">
      <ShieldAlert className="w-5 h-5 text-warn shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <h2 id={`approve-${peer.clientId}`} className="text-[15.5px] font-semibold text-fg">{peer.name} wants to connect</h2>
        <p className="text-fg-2 text-[14px] mt-1 leading-relaxed">
          Only allow a device you expect. To be sure it's them, check their screen shows <span className="font-mono text-fg whitespace-nowrap">{peer.safety || '…'}</span>.
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => relay.approvePeer(peer.clientId, true)} className="btn btn-w btn-lg">Allow</button>
        <button onClick={() => relay.approvePeer(peer.clientId, false)} className="btn btn-d btn-lg">Block</button>
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
    <section aria-labelledby="link-title" className="flex flex-col md:flex-row md:items-end justify-between gap-5">
      <div className="min-w-0">
        <h1 id="link-title" className="text-[28px] md:text-[36px] font-semibold tracking-[-0.035em] leading-[1.1]">
          {names.length ? <>Connected to {names.join(', ')}</> : 'Device joining…'}
        </h1>
        <p className="text-fg-2 text-[14px] mt-2">Encrypted end to end. Room <span className="font-mono text-fg">{relay.roomCode}</span>. You are {relay.deviceName}.</p>
        <ul className="flex flex-wrap gap-2 mt-4" aria-label="Connected devices">
          {peers.map((p) => (
            <li key={p.clientId}>
              <button onClick={() => setVerifyId(p.clientId)}
                className={cn('h-8 pl-3 pr-1 rounded-lg text-[12.5px] flex items-center gap-2 bg-white/[0.03] transition-colors hover:bg-white/[0.07]',
                  p.approved === undefined ? 'shadow-[inset_0_0_0_1px_rgb(247_193_75/0.45)] text-warn' : 'ring2 text-fg-2')}>
                {isVerified(p) ? <BadgeCheck className="w-3.5 h-3.5 text-ok" aria-hidden="true" /> : <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
                <span className="text-fg">{p.name}</span>
                <span aria-hidden="true" className="text-fg-3">·</span>
                <span>{p.approved === undefined ? 'waiting for you' : p.connected ? routeLabel(p.route) : 'Reconnecting…'}</span>
                <span className={cn('h-6 px-2 rounded-md inline-flex items-center font-medium', isVerified(p) ? 'text-ok bg-ok/10' : 'bg-fg text-bg')}>{isVerified(p) ? 'Verified' : 'Verify'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <button onClick={relay.leaveRoom} className="btn btn-d self-start md:self-end">Disconnect</button>
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
    <section className="p-5 md:p-6 border-b border-line bg-acc/[0.04]" data-testid="offers" aria-labelledby="offers-h">
      <div className="flex items-center justify-between gap-3">
        <h2 id="offers-h" className="text-[14px] font-semibold text-fg">Incoming files. Only accept what you expect.</h2>
        {rows.length > 1 && <button onClick={relay.acceptAllOffers} className="btn btn-g">Accept all</button>}
      </div>
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map(({ offer: o, count, size }) => (
          <motion.li key={o.group?.id || o.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl ring2 bg-white/[0.02] p-3.5 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-fg-2 shrink-0">
                {o.group ? <Folder className="w-4 h-4" aria-hidden="true" /> : <FileIcon className="w-4 h-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-[14px] text-fg font-medium truncate">{o.group ? o.group.name : o.name}</p>
                <p className="text-[12.5px] text-fg-2">{o.group ? `${count} files, ` : ''}{formatBytes(size)} from {o.peerName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {!o.group && disk && <button onClick={() => relay.respondToOffer(o.id, 'save-as', always)} className="btn btn-w"><HardDrive className="w-3.5 h-3.5" aria-hidden="true" />Save as…</button>}
              {o.group && folder && <button onClick={() => relay.respondToOffer(o.id, 'folder')} className="btn btn-w"><FolderUp className="w-3.5 h-3.5" aria-hidden="true" />Save to folder…</button>}
              <button onClick={() => relay.respondToOffer(o.id, 'accept', always)} className={cn('btn', (o.group ? folder : disk) ? 'btn-g' : 'btn-w')}>Accept</button>
              <button onClick={() => relay.respondToOffer(o.id, 'decline')} className="btn text-fg-2 hover:text-danger">Decline</button>
            </div>
          </motion.li>
        ))}
      </ul>
      <label className="mt-4 flex items-center gap-2 text-[13px] text-fg-2 cursor-pointer select-none w-fit">
        <input type="checkbox" checked={always} onChange={(e) => setAlways(e.target.checked)} className="w-4 h-4" />
        Always accept files from this device (this session)
      </label>
      {!disk && relay.offers.some((o) => o.size > 2 * 1024 ** 3) && (
        <p className="mt-2 text-[12.5px] text-warn">Large file: this browser keeps it in its own storage until you press Save. Chrome or Edge on desktop can stream it straight to disk.</p>
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
    <button onClick={make} disabled={busy} className="btn btn-w">
      <Download className="w-4 h-4" aria-hidden="true" /> Save .zip
    </button>
  );
}

const ext = (name: string) => (name.includes('.') ? name.split('.').pop()!.slice(0, 4).toUpperCase() : 'FILE');

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
      className="py-4 grid grid-cols-[40px_1fr] gap-x-3.5 border-t border-line first:border-t-0">
      {t.previewUrl && /^image\//.test(t.mime || '') ? (
        <img src={t.previewUrl} alt="" className="w-10 h-10 object-cover rounded-lg ring2" />
      ) : (
        <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-semibold',
          t.status === 'completed' ? 'bg-ok/10 text-ok' : bad ? 'bg-danger/10 text-danger' : 'bg-white/[0.06] text-fg-2')} aria-hidden="true">
          {t.status === 'completed' ? <Check className="w-4 h-4" /> : bad ? <X className="w-4 h-4" /> : t.status === 'interrupted' ? <RotateCw className="w-4 h-4 animate-spin [animation-duration:3s]" /> : row.group ? <Folder className="w-4 h-4" /> : ext(t.name)}
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] text-fg truncate" title={t.name}>{t.name}</p>
            <p className="text-[12.5px] text-fg-3 mt-0.5 flex flex-wrap gap-x-2">
              <span className="inline-flex items-center gap-1">{t.isSending ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}{row.group ? `${row.group.done}/${row.group.tasks.length} files, ` : ''}{formatBytes(t.size)}</span>
              <span className={cn(t.status === 'transferring' && 'text-fg-2', bad && 'text-danger', (t.status === 'paused' || t.status === 'interrupted') && 'text-warn', t.status === 'completed' && 'text-ok')}>
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
                  <span className="block text-[13px] text-fg tabular-nums">{t.speed ? formatBytes(t.speed, 1) + '/s' : '--'}</span>
                  <span className="block text-[11.5px] text-fg-3">{t.eta ? formatTime(t.eta) + ' left' : ''}</span>
                </span>
              </>
            )}
            {active && (
              <span className="flex items-center gap-0.5">
                {t.isSending && !row.group && t.status === 'transferring' && (
                  <button onClick={() => relay.manageTransfer(t, 'pause')} title="Pause" aria-label={`Pause ${t.name}`} className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-white/[0.06]"><Pause className="w-4 h-4" /></button>
                )}
                {t.isSending && !row.group && t.status === 'paused' && (
                  <button onClick={() => relay.manageTransfer(t, 'resume')} title="Resume" aria-label={`Resume ${t.name}`} className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-white/[0.06]"><Play className="w-4 h-4" /></button>
                )}
                <button onClick={() => relay.manageTransfer(t, 'cancel')} title="Cancel" aria-label={`Cancel ${t.name}`} className="p-2 rounded-lg text-fg-2 hover:text-danger hover:bg-white/[0.06]"><X className="w-4 h-4" /></button>
              </span>
            )}
            {!t.isSending && t.status === 'completed' && !row.group && t.url && (
              <a href={t.url} download={t.name} className="btn btn-w"><Download className="w-4 h-4" aria-hidden="true" /> Save</a>
            )}
            {!t.isSending && t.status === 'completed' && row.group && !t.savedToDisk && <GroupDownload tasks={row.group.tasks} name={t.name} />}
            {!active && (
              <button onClick={() => relay.dismissTransfer(t.id)} title="Remove from list" aria-label={`Remove ${t.name} from the list`} className="p-2 rounded-lg text-fg-3 hover:text-fg hover:bg-white/[0.06]"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>
        {moving && (
          <span className="mt-2.5 block h-1.5 rounded-full bg-white/[0.07] overflow-hidden" aria-hidden="true">
            <span className={cn('block h-full rounded-full transition-[width] duration-300', t.status === 'transferring' ? 'grad' : 'bg-warn')} style={{ width: `${t.progress}%` }} />
          </span>
        )}
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
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 text-[13.5px] text-fg-2 hover:text-fg">
          <History className="w-3.5 h-3.5" aria-hidden="true" /> History ({relay.history.length})
        </button>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] text-fg-2 cursor-pointer select-none">
            <input type="checkbox" checked={relay.keepHistory} onChange={(e) => relay.setKeepHistory(e.target.checked)} className="w-4 h-4" /> Keep history on this device
          </label>
          {relay.history.length > 0 && <button onClick={relay.clearHistory} className="text-[13px] text-fg-2 hover:text-danger flex items-center gap-1"><Trash2 className="w-3 h-3" aria-hidden="true" />Clear</button>}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 flex flex-col divide-y divide-white/[0.06] overflow-hidden">
            {relay.history.length === 0 && <li className="text-[13px] text-fg-3 py-3">Nothing yet. Only names, sizes and speeds are stored, never file contents.</li>}
            {relay.history.slice(0, 50).map((h) => (
              <li key={h.id + h.at} className="py-2.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-fg">{h.direction === 'send' ? '↑' : '↓'} {h.name}</span>
                <span className="text-fg-3 whitespace-nowrap">{formatBytes(h.size)}, {h.status}{h.avgSpeed ? `, ${formatBytes(h.avgSpeed, 1)}/s` : ''}, {h.peer}, {timeAgo(h.at)}</span>
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
  const [whole, frac] = formatBytes(speed, 1).split(' ');

  return (
    <div className="relative">
      <Atmosphere />
      <div className="relative z-10 max-w-[1080px] mx-auto px-6 pt-10 md:pt-14 pb-10">
        <Header relay={relay} />
        <Announcer relay={relay} />

        {/* The link: the two marks and the stream between them are drawn behind this band */}
        <div className="h-[200px] md:h-[240px] flex flex-col items-center justify-center text-center select-none" aria-hidden="true">
          {speed > 0 ? (
            <>
              <p className="text-[56px] md:text-[80px] font-semibold tracking-[-0.05em] leading-none tabular-nums [text-shadow:0_0_40px_rgb(5_7_12/0.9)]">{whole}<span className="text-[22px] md:text-[28px] text-fg-2 font-medium tracking-[-0.02em] ml-2">{frac}/s</span></p>
              <p className="mt-3 text-[14px] text-fg-2">Sending directly, encrypted</p>
            </>
          ) : (
            <p className="h-9 px-4 rounded-full bg-bg/80 ring2 text-[13.5px] text-fg-2 flex items-center gap-2.5"><span className="w-1.5 h-1.5 rounded-full bg-ok animate-breathe" />Ready. Drop, paste or choose files.</p>
          )}
        </div>

        <div className="window">
          <div className="window-in">
            {pending.map((p) => <ApprovalBanner key={p.clientId} peer={p} relay={relay} />)}
            <OffersPanel relay={relay} />

            {rows.length > 0 && (
              <section aria-labelledby="tr-h" className="px-5 md:px-6 pt-5 pb-1 border-b border-line">
                <h2 id="tr-h" className="text-[13px] font-medium text-fg-3">Transfers</h2>
                <ul className="mt-1">
                  <AnimatePresence initial={false}>{rows.map((r) => <TransferRow key={r.key} row={r} relay={relay} />)}</AnimatePresence>
                </ul>
              </section>
            )}

            <section aria-labelledby="send-title" className="p-5 md:p-6">
              <h2 id="send-title" className="sr-only">Send files</h2>
              <div onClick={(e) => { if (e.target === e.currentTarget) fileInput.current?.click(); }}
                className="rounded-xl border border-dashed border-white/[0.16] hover:border-acc/60 bg-white/[0.015] transition-colors flex flex-col md:flex-row items-center gap-4 md:gap-6 px-6 py-7 cursor-pointer">
                <span className="w-11 h-11 rounded-xl ring2 bg-white/[0.04] flex items-center justify-center shrink-0 pointer-events-none"><UploadCloud className="w-5 h-5 text-fg" aria-hidden="true" /></span>
                <div className="flex-1 text-center md:text-left pointer-events-none">
                  <p className="text-[16px] font-medium tracking-[-0.015em]">Drop files or folders, or paste with <span className="kbd">Ctrl/⌘ V</span></p>
                  <p className="text-[13.5px] text-fg-3 mt-1">They go only to devices you allowed, and each one must accept.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => fileInput.current?.click()} className="btn btn-w"><Plus className="w-4 h-4" aria-hidden="true" />Choose files</button>
                  <button onClick={() => folderInput.current?.click()} className="btn btn-g"><FolderUp className="w-4 h-4" aria-hidden="true" />Choose a folder</button>
                </div>
              </div>
              <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="file-input"
                onChange={(e) => { if (e.target.files?.length) relay.sendFiles(Array.from(e.target.files)); e.target.value = ''; }} />
              <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="folder-input"
                {...({ webkitdirectory: '', directory: '' } as any)}
                onChange={(e) => {
                  if (e.target.files?.length) collectFolderInput(e.target.files).forEach((g) => relay.sendFiles(g.files, { paths: g.paths, groupName: g.groupName }));
                  e.target.value = '';
                }} />

              <form onSubmit={(e) => { e.preventDefault(); if (relay.sendText(text)) setText(''); }} className="mt-3 flex gap-2">
                <label htmlFor="msg" className="sr-only">Message to send</label>
                <input id="msg" autoComplete="off" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Send a message or link…"
                  className="field flex-1 min-w-0 h-11 px-4 text-[14.5px]" />
                <button type="submit" disabled={!text.trim()} className="btn btn-w h-11 px-5">Send</button>
              </form>

              {relay.messages.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2" aria-label="Messages">
                  {relay.messages.map((m) => (
                    <li key={m.id} className="rounded-xl ring2 bg-white/[0.02] p-3.5 flex gap-3 items-start" data-testid="message">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] text-fg break-words whitespace-pre-wrap">{m.text}</p>
                        <p className="text-[12px] text-fg-3 mt-1">{new Date(m.timestamp).toLocaleTimeString()}, {m.isSending ? 'sent' : `from ${m.from || 'peer'}`}{m.kind === 'clip' ? ', clipboard' : ''}</p>
                      </div>
                      <button onClick={() => navigator.clipboard?.writeText(m.text)} title="Copy" aria-label="Copy message" className="p-2 rounded-lg text-fg-2 hover:text-fg hover:bg-white/[0.06]"><Copy className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="px-5 md:px-6 py-4 border-t border-line flex flex-col gap-3">
              <label className="flex items-center gap-2 text-[13px] text-fg-2 cursor-pointer select-none w-fit">
                <input type="checkbox" checked={relay.clipboardSync} onChange={(e) => relay.setClipboardSync(e.target.checked)} className="w-4 h-4" />
                <Clipboard className="w-3.5 h-3.5" aria-hidden="true" /> Sync clipboard with approved devices <span className="text-fg-3">(beta, your browser may ask for permission)</span>
              </label>
              <HistoryPanel relay={relay} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
