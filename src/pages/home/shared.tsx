import { forwardRef, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Laptop, Smartphone, Tablet, Monitor, File as FileIcon, FolderUp, X, UploadCloud, Plus, Lock, Check } from 'lucide-react';
import type { Relay, NearbyDevice } from '../../hooks/useRelay';
import { collectFolderInput, formatBytes, PickedFiles } from '../../components/relay/format';

/** Files picked before anyone has joined. They go out as soon as a device is approved. */
export type Staged = PickedFiles[];
export const stagedSize = (s: Staged) => s.reduce((a, g) => a + g.files.reduce((b, f) => b + f.size, 0), 0);
export const stagedCount = (s: Staged) => s.reduce((a, g) => a + g.files.length, 0);

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

export function NearbyList({ relay, devices }: { relay: Relay; devices: NearbyDevice[] }) {
  if (!devices.length) {
    return (
      <p className="text-[13.5px] text-fg-3 flex items-center gap-2.5 py-2 px-2">
        <span className="relative flex w-1.5 h-1.5 shrink-0" aria-hidden="true"><span className="absolute inset-0 rounded-full bg-acc animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-acc" /></span>
        Looking on this Wi-Fi…
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1" data-testid="nearby" aria-label="Nearby devices">
      {devices.map((d) => (
        <li key={d.id}>
          <button onClick={() => relay.inviteNearby(d.id)}
            className="group w-full min-h-11 flex items-center gap-3 p-2 rounded-xl hover:bg-tint/[0.05] text-left transition-colors">
            <span className="w-8 h-8 rounded-lg bg-tint/[0.06] flex items-center justify-center shrink-0"><KindIcon kind={d.kind} className="w-4 h-4 text-fg-2" /></span>
            <span className="flex-1 min-w-0 text-[14.5px] text-fg truncate">{d.name}</span>
            <span className="text-[13px] text-acc" aria-hidden="true">Connect</span>
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
    <div className="rounded-xl ring2 bg-tint/[0.02] p-3.5 flex items-center gap-3" data-testid="staged">
      <span className="w-9 h-9 rounded-lg bg-tint/[0.06] flex items-center justify-center shrink-0"><FileIcon className="w-4 h-4 text-fg-2" aria-hidden="true" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-fg truncate">{names.join(', ')}</p>
        <p className="text-[12.5px] text-fg-3">{stagedCount(staged)} file{stagedCount(staged) > 1 ? 's' : ''}, {formatBytes(stagedSize(staged))}. Sent once you approve the other device.</p>
      </div>
      <button onClick={onClear} aria-label="Remove staged files" className="w-9 h-9 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg"><X className="w-4 h-4" /></button>
    </div>
  );
}

/**
 * The working app, framed as a window: Send (drop or choose files) and
 * Receive (room code, nearby devices). Used by both designs.
 */
export const AppWindow = forwardRef<HTMLInputElement, LandingProps & { className?: string }>(function AppWindow({ relay, onStage, className = '' }, codeRef) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <div className={`window text-left ${className}`}>
      <div className="window-in">
        <div className="h-11 px-4 flex items-center gap-2 border-b border-line" aria-hidden="true">
          <span className="w-[11px] h-[11px] rounded-full bg-tint/[0.12]" /><span className="w-[11px] h-[11px] rounded-full bg-tint/[0.12]" /><span className="w-[11px] h-[11px] rounded-full bg-tint/[0.12]" />
          <span className="mx-auto h-[26px] w-full max-w-[320px] rounded-md bg-tint/[0.04] text-[12px] text-fg-3 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" />relay.rishishah.in</span>
          <span className="w-[49px] hidden sm:block" />
        </div>
        <div className="grid md:grid-cols-[300px_1fr]">
          {/* RECEIVE */}
          <section aria-labelledby="recv-h" className="order-2 md:order-1 p-5 md:p-6 border-t md:border-t-0 md:border-r border-line flex flex-col gap-6">
            <div>
              <h2 id="recv-h" className="text-[13px] font-medium text-fg-3">Receive</h2>
              <form className="mt-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label htmlFor="join-code" className="block text-[14px] text-fg mb-2">Room code</label>
                <div className="flex gap-2">
                  <input ref={codeRef} id="join-code" type="text" placeholder="golden-zephyr-637" maxLength={48} value={code}
                    autoComplete="off" autoCapitalize="none" spellCheck={false} enterKeyHint="go"
                    onChange={(e) => setCode(e.target.value.toLowerCase())}
                    className="field flex-1 min-w-0 h-11 md:h-10 px-3 font-mono text-[16px] md:text-[13.5px]" />
                  <button type="submit" disabled={!code} aria-label="Join with this code" className="btn btn-w h-11 md:h-10 px-4">Join</button>
                </div>
              </form>
              <AnimatePresence>
                {relay.needsPassword && (
                  <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-2 flex gap-2">
                    <label htmlFor="join-password" className="sr-only">Room password</label>
                    <input id="join-password" type="password" autoFocus placeholder="Room password" value={password} aria-label="Room password"
                      onChange={(e) => setPassword(e.target.value)} className="field flex-1 min-w-0 h-11 md:h-10 px-3 text-[16px] md:text-[14px]" />
                    <button className="btn btn-w h-11 md:h-10 px-4">Unlock</button>
                  </motion.form>
                )}
              </AnimatePresence>
              {relay.joinError && <p className="mt-2.5 text-danger text-[13.5px]" role="alert">{relay.joinError}</p>}
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-fg-3">Nearby on this Wi-Fi</h3>
              <div className="mt-2 -mx-2"><NearbyList relay={relay} devices={relay.nearbyDevices} /></div>
              <p className="text-[12.5px] text-fg-3 mt-3">You appear as <span className="text-fg-2">{relay.deviceName}</span></p>
            </div>
          </section>
          {/* SEND */}
          <section aria-labelledby="send-h" className="order-1 md:order-2 p-5 md:p-6">
            <h2 id="send-h" className="text-[13px] font-medium text-fg-3">Send</h2>
            <div className="mt-3 rounded-xl border border-dashed border-tint/[0.16] bg-tint/[0.015] md:min-h-[300px] flex flex-col items-center justify-center text-center px-5 py-8 md:py-10">
              <span className="w-12 h-12 rounded-xl ring2 bg-tint/[0.04] flex items-center justify-center"><UploadCloud className="w-5 h-5 text-fg" aria-hidden="true" /></span>
              <p className="mt-4 md:mt-5 text-[17px] md:text-[18px] font-medium tracking-[-0.02em]">
                <span className="pointer-coarse:hidden">Drop files or folders to send</span>
                <span className="hidden pointer-coarse:inline">Choose what to send</span>
              </p>
              <p className="mt-1.5 text-[14px] text-fg-3 max-w-[36ch]">Any size. You'll get a link and QR code for the other device.</p>
              <div className="mt-6 w-full sm:w-auto grid grid-cols-1 sm:flex gap-2 justify-center">
                <button onClick={() => fileInput.current?.click()} className="btn btn-w h-11 sm:h-9"><Plus className="w-4 h-4" aria-hidden="true" />Choose files</button>
                <button onClick={() => folderInput.current?.click()} className="btn btn-g h-11 sm:h-9 pointer-coarse:hidden"><FolderUp className="w-4 h-4" aria-hidden="true" />Choose a folder</button>
              </div>
            </div>
            <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
              onChange={(e) => { if (e.target.files?.length) onStage([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
            <input ref={folderInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
              {...({ webkitdirectory: '', directory: '' } as any)}
              onChange={(e) => { if (e.target.files?.length) onStage(collectFolderInput(e.target.files)); e.target.value = ''; }} />
          </section>
        </div>
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
      {/* Phones: one card per question, Relay first */}
      <div className="md:hidden flex flex-col gap-3">
        {COMPARE.map(([k, v]) => (
          <div key={k} className="panel rounded-2xl p-4">
            <h3 className="text-[15px] font-semibold">{k}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {v.map((c, i) => (
                <div key={SERVICES[i]} className={`rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-acc/[0.12]' : 'bg-tint/[0.03]'}`}>
                  <dt className={`text-[12px] ${i === 0 ? 'text-fg font-medium' : 'text-fg-2'}`}>{SERVICES[i]}</dt>
                  <dd className={`text-[14px] mt-0.5 ${i === 0 ? 'text-fg font-semibold' : 'text-fg-2'}`}>{c}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {/* Larger screens: a table */}
      <table className="hidden md:table w-full text-[15px] border-collapse">
        <thead>
          <tr className="text-left">
            <td className="py-4 pr-4 w-[34%]" />
            {SERVICES.map((s, i) => <th key={s} scope="col" className={`py-4 px-4 ${i === 0 ? 'font-semibold text-fg bg-acc/[0.08] rounded-t-xl' : 'font-normal text-fg-2'}`}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {COMPARE.map(([k, v]) => (
            <tr key={k} className="border-t border-line">
              <th scope="row" className="py-4 pr-4 font-normal text-fg-2 text-left">{k}</th>
              {v.map((c, i) => <td key={i} className={`py-4 px-4 ${i === 0 ? 'bg-acc/[0.08] text-fg font-semibold' : 'text-fg-2'}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[12.5px] text-fg-3">Free plans as published by each service, October 2026. <Link to="/best-p2p-file-sharing-apps" className="text-fg-2 hover:text-fg underline underline-offset-4 decoration-tint/20">Full comparison</Link></p>
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

export function Faq({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <div className="border-t border-line">
      {FAQS.map(([q, a]) => (
        <details key={q} className="border-b border-line group">
          <summary className={`cursor-pointer list-none flex justify-between items-center gap-4 py-5 font-medium ${size === 'lg' ? 'text-[19px] md:text-[21px]' : 'text-[16.5px]'}`}>
            {q}<Plus className="w-4 h-4 text-fg-3 shrink-0 transition-transform group-open:rotate-45" aria-hidden="true" />
          </summary>
          <p className={`text-fg-2 pb-5 -mt-1 leading-relaxed max-w-[62ch] ${size === 'lg' ? 'text-[17px]' : 'text-[15px]'}`}>{a}</p>
        </details>
      ))}
    </div>
  );
}

// ── How a file travels ──────────────────────────────────────────────────────
function Beam({ lines, vertical }: { lines: number[]; vertical?: boolean }) {
  return (
    <>
      <defs><linearGradient id={vertical ? 'beam-v' : 'beam'} x1="0" x2={vertical ? '0' : '1'} y1="0" y2={vertical ? '1' : '0'}><stop offset="0" stopColor="#7C83FF" /><stop offset=".6" stopColor="#B08CFF" /><stop offset="1" stopColor="#FF8A5C" /></linearGradient></defs>
      {lines.map((i) => vertical
        ? <line key={i} x1={134 + i * 12} y1="112" x2={134 + i * 12} y2="296" stroke="url(#beam-v)" strokeOpacity={0.35 + i * 0.08} strokeWidth="3" strokeDasharray="14 7" className="flow-v" style={{ animationDelay: `${i * -0.17}s` }} />
        : <line key={i} x1="224" y1={36 + i * 12} x2="536" y2={36 + i * 12} stroke="url(#beam)" strokeOpacity={0.35 + i * 0.08} strokeWidth="3" strokeDasharray="22 9" className="flow-h" style={{ animationDelay: `${i * -0.21}s` }} />)}
    </>
  );
}

export function PathDiagram() {
  const lines = [0, 1, 2, 3, 4, 5, 6];
  return (
    <>
      <svg viewBox="0 0 760 330" className="hidden md:block w-full h-auto" aria-hidden="true">
        <Beam lines={lines} />
        <rect x="0.5" y="10.5" width="210" height="124" rx="16" className="svg-fill svg-line" />
        <text x="26" y="64" fontSize="19" fontWeight="600" className="svg-fg">Your device</text>
        <text x="26" y="92" fontSize="14.5" className="svg-fg2">encrypts the file</text>
        <text x="380" y="138" textAnchor="middle" fontSize="13.5" className="svg-fg2">direct, encrypted, nothing in between</text>
        <rect x="549.5" y="10.5" width="210" height="124" rx="16" className="svg-fill svg-line" />
        <text x="576" y="64" fontSize="19" fontWeight="600" className="svg-fg">Their device</text>
        <text x="576" y="92" fontSize="14.5" className="svg-fg2">decrypts and saves it</text>
        <path d="M105 140 V270 H262 M655 140 V270 H498" fill="none" className="svg-dash" strokeDasharray="4 6" strokeWidth="1.25" />
        <rect x="262.5" y="234.5" width="235" height="72" rx="14" className="svg-fill svg-dash" strokeDasharray="4 5" />
        <text x="380" y="265" textAnchor="middle" fontSize="15.5" fontWeight="600" className="svg-fg">Relay's server</text>
        <text x="380" y="289" textAnchor="middle" fontSize="13" className="svg-fg2">introduces them, never sees files</text>
      </svg>
      <svg viewBox="0 0 340 500" className="md:hidden w-full max-w-[340px] mx-auto h-auto" aria-hidden="true">
        <Beam lines={lines} vertical />
        <rect x="50.5" y="8.5" width="239" height="96" rx="16" className="svg-fill svg-line" />
        <text x="170" y="50" textAnchor="middle" fontSize="18" fontWeight="600" className="svg-fg">Your device</text>
        <text x="170" y="76" textAnchor="middle" fontSize="14" className="svg-fg2">encrypts the file</text>
        <rect x="50.5" y="304.5" width="239" height="96" rx="16" className="svg-fill svg-line" />
        <text x="170" y="346" textAnchor="middle" fontSize="18" fontWeight="600" className="svg-fg">Their device</text>
        <text x="170" y="372" textAnchor="middle" fontSize="14" className="svg-fg2">decrypts and saves it</text>
        <rect x="20.5" y="424.5" width="299" height="68" rx="14" className="svg-fill svg-dash" strokeDasharray="4 5" />
        <text x="170" y="453" textAnchor="middle" fontSize="15" fontWeight="600" className="svg-fg">Relay's server</text>
        <text x="170" y="476" textAnchor="middle" fontSize="13" className="svg-fg2">introduces them, never sees files</text>
      </svg>
    </>
  );
}

// ── Small product visuals ───────────────────────────────────────────────────
export function Bar({ pct, className = '' }: { pct: number; className?: string }) {
  return <span className={`block h-1.5 rounded-full bg-tint/[0.08] overflow-hidden ${className}`}><span className="block h-full rounded-full grad" style={{ width: `${pct}%` }} /></span>;
}

export function SafetyVisual() {
  return (
    <div className="w-full grid grid-cols-2 gap-2.5 md:gap-3" aria-hidden="true">
      {['Your screen', 'Their screen'].map((l) => (
        <div key={l} className="rounded-xl ring2 bg-tint/[0.02] px-2 py-4 text-center">
          <p className="text-[11.5px] text-fg-3">{l}</p>
          <p className="font-mono text-[13px] sm:text-[15px] md:text-[17px] tracking-[0.06em] mt-2 leading-relaxed">4821 0937<br />5512 6604<br />1180</p>
        </div>
      ))}
      <p className="col-span-2 text-center text-[13px] text-ok flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Numbers match. Nobody is in the middle.</p>
    </div>
  );
}
