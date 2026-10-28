import { forwardRef, lazy, ReactNode, Suspense, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Laptop, Smartphone, Tablet, Monitor, X, Plus, FolderUp, ArrowRight, File as FileIcon, ScanLine } from 'lucide-react';
import type { Relay, NearbyDevice } from '../../hooks/useRelay';
import { collectFolderInput, formatBytes, PickedFiles } from '../../components/relay/format';

/** Files picked before anyone has joined. They go out as soon as a device is approved. */
export type Staged = PickedFiles[];
export const stagedSize = (s: Staged) => s.reduce((a, g) => a + g.files.reduce((b, f) => b + f.size, 0), 0);
export const stagedCount = (s: Staged) => s.reduce((a, g) => a + g.files.length, 0);

// Loaded only when someone opens it, so the camera code never slows the page down.
const Scanner = lazy(() => import('../../components/Scanner'));

export interface LandingProps {
  relay: Relay;
  onStage: (groups: Staged) => void;
}

export function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'phone') return <Smartphone className={className} aria-hidden="true" />;
  if (kind === 'tablet') return <Tablet className={className} aria-hidden="true" />;
  if (kind === 'laptop') return <Laptop className={className} aria-hidden="true" />;
  return <Monitor className={className} aria-hidden="true" />;
}

/** Devices found on the same network. */
export function NearbyList({ relay, devices }: { relay: Relay; devices: NearbyDevice[] }) {
  if (!devices.length) {
    return (
      <p className="text-[15px] text-dev-fg-2 flex items-center gap-2.5 py-3">
        <span className="led led-signal blink" aria-hidden="true" />Looking for devices on this Wi-Fi…
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1.5 mt-2" data-testid="nearby" aria-label="Nearby devices">
      {devices.map((d) => (
        <li key={d.id}>
          <button onClick={() => relay.inviteNearby(d.id)}
            className="group w-full min-h-12 flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-2xl bg-lcd hover:bg-dev-3 text-left transition-colors">
            <KindIcon kind={d.kind} className="w-4 h-4 text-dev-fg-2" />
            <span className="flex-1 min-w-0 text-[15.5px] text-white truncate">{d.name}</span>
            <span className="h-9 px-3.5 rounded-full bg-white text-signal text-[14px] font-medium inline-flex items-center" aria-hidden="true">Connect</span>
            <span className="sr-only">— connect</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function StagedList({ staged, onClear }: { staged: Staged; onClear: () => void }) {
  if (!staged.length) return null;
  const names = staged.map((g) => g.groupName || (g.files.length === 1 ? g.files[0].name : `${g.files.length} files`));
  return (
    <div className="lcd p-3.5 flex items-center gap-3" data-testid="staged">
      <FileIcon className="w-5 h-5 text-dev-fg-2 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-white truncate">{names.join(', ')}</p>
        <p className="text-[14px] text-dev-fg-2 mt-0.5">{stagedCount(staged)} file{stagedCount(staged) > 1 ? 's' : ''}, {formatBytes(stagedSize(staged))}. Sent once you approve the other device.</p>
      </div>
      <button onClick={onClear} aria-label="Remove staged files" className="relative z-10 w-10 h-10 flex items-center justify-center text-dev-fg-2 hover:text-dev-fg"><X className="w-4 h-4" /></button>
    </div>
  );
}

/**
 * The working app as one ultramarine sheet: send on the left, receive on the
 * right. `heading` sits across the top of the sheet.
 */
export const AppWindow = forwardRef<HTMLInputElement, LandingProps & { className?: string; heading?: ReactNode }>(function AppWindow({ relay, onStage, className = '', heading }, codeRef) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [scanning, setScanning] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <div className={`device text-left ${className}`}>
      {heading}
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-3 p-3 md:p-4">
        {/* SEND */}
        <section aria-labelledby="send-h" className="rounded-[20px] bg-dev-2 p-5 md:p-7 flex flex-col pointer-fine:min-h-[360px]">
          <h2 id="send-h" className="text-[17px] font-medium">Send</h2>
          <p className="text-dev-fg-2 mt-1 max-w-[40ch]">Files or whole folders, any size. You get a link and a QR code for the other device.</p>
          <div onClick={() => fileInput.current?.click()} data-cursor="Choose files" aria-hidden="true"
            className="hidden pointer-fine:flex mt-5 flex-1 min-h-[150px] rounded-2xl border-[1.5px] border-dashed border-white/35 hover:border-white/70 hover:bg-white/[0.04] transition-colors items-end p-5 cursor-pointer">
            <p className="display text-[44px] lg:text-[56px] leading-[.9]" style={{ ['--w' as string]: 3.4 }}>Drop files here</p>
          </div>
          <div className="mt-auto pt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={() => fileInput.current?.click()} className="key key-signal"><Plus className="w-5 h-5" aria-hidden="true" />Choose files</button>
            <button onClick={() => folderInput.current?.click()} className="key key-dark pointer-coarse:hidden"><FolderUp className="w-5 h-5" aria-hidden="true" />Choose a folder</button>
          </div>
          <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
            onChange={(e) => { if (e.target.files?.length) onStage([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
          <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
            {...({ webkitdirectory: '', directory: '' } as any)}
            onChange={(e) => { if (e.target.files?.length) onStage(collectFolderInput(e.target.files)); e.target.value = ''; }} />
        </section>
        {/* RECEIVE */}
        <section aria-labelledby="recv-h" className="rounded-[20px] bg-dev-2 p-5 md:p-7 flex flex-col">
          <h2 id="recv-h" className="text-[17px] font-medium">Receive</h2>
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label htmlFor="join-code" className="block text-dev-fg-2 mb-2">Room code</label>
            <div className="flex gap-2">
              <input ref={codeRef} id="join-code" type="text" placeholder="satya-ganga-108" maxLength={48} value={code}
                autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                className="lcd-field flex-1 min-w-0 h-[52px] px-4 font-mono text-[16px]" />
              <button type="submit" disabled={!code} aria-label="Join with this code" className="key key-light w-[52px] px-0"><ArrowRight className="w-5 h-5" aria-hidden="true" /></button>
            </div>
          </form>
          <button onClick={() => setScanning(true)} className="hidden pointer-coarse:inline-flex key key-signal mt-3 w-full">
            <ScanLine className="w-5 h-5" aria-hidden="true" />Scan QR code
          </button>
          <AnimatePresence>
            {scanning && (
              <Suspense fallback={null}>
                <Scanner onClose={() => setScanning(false)} onCode={(c) => { setScanning(false); setCode(c); relay.joinRoom(c); }} />
              </Suspense>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {relay.needsPassword && (
              <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-2 flex gap-2">
                <label htmlFor="join-password" className="sr-only">Room password</label>
                <input id="join-password" type="password" autoFocus placeholder="Room password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className="lcd-field flex-1 min-w-0 h-[52px] px-4 text-[16px]" />
                <button className="key key-light">Unlock</button>
              </motion.form>
            )}
          </AnimatePresence>
          {relay.joinError && <p className="mt-3 text-danger-d text-[15px]" role="alert">{relay.joinError}</p>}
          <div className="mt-6">
            <h3 className="text-dev-fg-2">Nearby on this Wi-Fi</h3>
            <NearbyList relay={relay} devices={relay.nearbyDevices} />
          </div>
          <p className="text-[14px] text-dev-fg-2 mt-auto pt-6">This device appears as <span className="text-white">{relay.deviceName}</span>.</p>
        </section>
      </div>
    </div>
  );
});

// ── Comparison ──────────────────────────────────────────────────────────────
const SERVICES = ['Relay', 'WeTransfer', 'Google Drive', 'AirDrop'];
const COMPARE: [string, string[]][] = [
  ['Files uploaded to a server', ['Never', 'Yes', 'Yes', 'No']],
  ['Free size limit', ['None', '3 GB per 30 days', '15 GB of storage', 'None']],
  ['iPhone, Android, Windows and Mac', ['Yes', 'Yes', 'Yes', 'Apple only']],
  ['Open source', ['Yes, MIT', 'No', 'No', 'No']],
];

export function CompareTable() {
  return (
    <>
      {/* Phones: one block per question, Relay first */}
      <div className="md:hidden flex flex-col gap-6">
        {COMPARE.map(([k, v]) => (
          <div key={k}>
            <h3 className="text-[17px] font-medium">{k}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {v.map((c, i) => (
                <div key={SERVICES[i]} className={`rounded-2xl px-4 py-3 ${i === 0 ? 'bg-signal text-white' : 'bg-paper'}`}>
                  <dt className={`text-[13.5px] ${i === 0 ? 'text-dev-fg-2' : 'text-ink-3'}`}>{SERVICES[i]}</dt>
                  <dd className="text-[16px] mt-0.5">{c}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {/* Larger screens: a table, Relay's column set in ultramarine */}
      <table className="hidden md:table w-full text-[17px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left">
            <td className="w-[34%]" />
            {SERVICES.map((s, i) => <th key={s} scope="col" className={`pt-5 pb-3 px-5 font-medium ${i === 0 ? 'bg-signal text-white rounded-t-[20px]' : 'text-ink-3'}`}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {COMPARE.map(([k, v], r) => (
            <tr key={k}>
              <th scope="row" className="py-5 pr-4 font-normal text-left border-t border-line">{k}</th>
              {v.map((c, i) => <td key={i} className={`py-5 px-5 ${i === 0 ? `bg-signal text-white font-medium border-t border-white/20 ${r === COMPARE.length - 1 ? 'rounded-b-[20px]' : ''}` : 'text-ink-2 border-t border-line'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-6 text-[14px] text-ink-3">Free plans as published by each service, October 2026. <Link to="/best-p2p-file-sharing-apps" className="link text-ink">Read the full comparison</Link></p>
    </>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────────
export const FAQS: [string, string][] = [
  ['Is it really free?', 'Yes. There are no plans, limits or ads. It costs very little to run because files never pass through our servers.'],
  ['Can you see my files?', 'No. Files travel directly between the two devices, encrypted with keys only those devices hold. Compare the safety number on both screens to confirm.'],
  ['Does the other person need to be online?', 'Yes. Both devices must be open at the same time, because nothing is stored anywhere. If they will download later, a cloud service is the better tool.'],
  ['Is it safe to accept files?', 'You only receive what you accept, from devices you approved. As with email, only open files you expect.'],
];

export function Faq() {
  return (
    <div className="border-t border-line">
      {FAQS.map(([q, a]) => (
        <details key={q} className="border-b border-line group">
          <summary className="cursor-pointer list-none flex justify-between items-center gap-6 py-6 text-[20px] md:text-[24px] font-medium leading-snug hover:text-signal transition-colors">
            {q}
            <span className="w-9 h-9 shrink-0 rounded-full bg-pale text-signal flex items-center justify-center transition-transform duration-300 group-open:rotate-45" aria-hidden="true"><Plus className="w-4 h-4" /></span>
          </summary>
          <p className="text-ink-2 pb-7 -mt-1 pr-12 leading-relaxed max-w-[62ch] text-[17.5px]">{a}</p>
        </details>
      ))}
    </div>
  );
}
