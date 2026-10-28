import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy, Check, Lock, Laptop, Smartphone, Tablet, Monitor, KeyRound, Share2, Loader2, Link2,
  File as FileIcon, FolderUp, X, UploadCloud, ArrowRight, Plus, ShieldCheck,
} from 'lucide-react';
import RelayQR from '../components/RelayQR';
import { useRelay, Relay, NearbyDevice } from '../hooks/useRelay';
import Connected from '../components/relay/Connected';
import Dialog from '../components/Dialog';
import { collectDropped, collectFolderInput, formatBytes, PickedFiles } from '../components/relay/format';
import { takeSharedFiles } from '../lib/share';

/** Files picked before anyone has joined. They go out as soon as a device is approved. */
type Staged = PickedFiles[];
const stagedSize = (s: Staged) => s.reduce((a, g) => a + g.files.reduce((b, f) => b + f.size, 0), 0);
const stagedCount = (s: Staged) => s.reduce((a, g) => a + g.files.length, 0);

function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'phone') return <Smartphone className={className} aria-hidden="true" />;
  if (kind === 'tablet') return <Tablet className={className} aria-hidden="true" />;
  if (kind === 'laptop') return <Laptop className={className} aria-hidden="true" />;
  return <Monitor className={className} aria-hidden="true" />;
}

function NearbyList({ relay, devices }: { relay: Relay; devices: NearbyDevice[] }) {
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
            className="group w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.05] text-left transition-colors">
            <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0"><KindIcon kind={d.kind} className="w-4 h-4 text-fg-2" /></span>
            <span className="flex-1 min-w-0 text-[14px] text-fg truncate">{d.name}</span>
            <span className="text-[12.5px] text-fg-3 group-hover:text-fg" aria-hidden="true">Connect</span>
            <span className="sr-only">— connect</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function StagedList({ staged, onClear }: { staged: Staged; onClear: () => void }) {
  if (!staged.length) return null;
  const names = staged.map((g) => g.groupName || (g.files.length === 1 ? g.files[0].name : `${g.files.length} files`));
  return (
    <div className="rounded-xl ring2 bg-white/[0.02] p-3.5 flex items-center gap-3" data-testid="staged">
      <span className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0"><FileIcon className="w-4 h-4 text-fg-2" aria-hidden="true" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-fg truncate">{names.join(', ')}</p>
        <p className="text-[12.5px] text-fg-3">{stagedCount(staged)} file{stagedCount(staged) > 1 ? 's' : ''}, {formatBytes(stagedSize(staged))}. Sent once you approve the other device.</p>
      </div>
      <button onClick={onClear} aria-label="Remove staged files" className="p-1.5 rounded-md text-fg-3 hover:text-fg"><X className="w-4 h-4" /></button>
    </div>
  );
}

const H2 = 'text-[36px] md:text-[52px] font-semibold tracking-[-0.04em] leading-[1.04]';
const Kick = ({ children }: { children: React.ReactNode }) => <p className="text-[14px] font-medium text-acc">{children}</p>;

// ── Visuals for the feature grid (drawn from the real product UI) ───────────
function Bar({ pct, className = '' }: { pct: number; className?: string }) {
  return <span className={`block h-1.5 rounded-full bg-white/[0.07] overflow-hidden ${className}`}><span className="block h-full rounded-full grad" style={{ width: `${pct}%` }} /></span>;
}

function SafetyVisual() {
  return (
    <div className="w-full grid grid-cols-2 gap-3" aria-hidden="true">
      {['Your screen', 'Their screen'].map((l) => (
        <div key={l} className="rounded-xl ring2 bg-white/[0.02] px-3 py-4 text-center">
          <p className="text-[11.5px] text-fg-3">{l}</p>
          <p className="font-mono text-[15px] md:text-[17px] tracking-[0.08em] mt-2 leading-relaxed">4821 0937 5512<br />6604 1180</p>
        </div>
      ))}
      <p className="col-span-2 text-center text-[13px] text-ok flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Numbers match. Nobody is in the middle.</p>
    </div>
  );
}

function SizeVisual() {
  return (
    <div className="w-full" aria-hidden="true">
      <p className="text-[56px] md:text-[64px] font-semibold tracking-[-0.05em] leading-none">No limit</p>
      <div className="mt-6 rounded-xl ring2 bg-white/[0.02] p-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-[10px] font-semibold text-fg-2 shrink-0">MOV</span>
        <span className="flex-1 min-w-0">
          <span className="flex justify-between text-[13px]"><span className="truncate">Wedding_Final_4K.mov</span><span className="text-fg-3 ml-3 shrink-0">42.1 GB</span></span>
          <Bar pct={64} className="mt-2" />
          <span className="block text-[12px] text-fg-3 mt-1.5">Writing straight to Downloads</span>
        </span>
      </div>
    </div>
  );
}

function ResumeVisual() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="relative">
        <Bar pct={100} />
        <span className="absolute top-1/2 -translate-y-1/2 w-[3px] h-4 rounded bg-warn" style={{ left: '37%' }} />
      </div>
      <div className="flex justify-between text-[12px] text-fg-3 mt-3"><span>Wi-Fi dropped at 37%</span><span className="text-ok">Finished</span></div>
    </div>
  );
}

function NearbyVisual() {
  return (
    <div className="relative w-[210px] h-[170px]" aria-hidden="true">
      {[0, 28, 56].map((i) => <span key={i} className="absolute rounded-full" style={{ inset: `${i * 0.75}px ${i}px`, boxShadow: 'inset 0 0 0 1px rgb(139 144 255 / .22)' }} />)}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-acc shadow-[0_0_24px_6px_rgb(139_144_255/0.5)]" />
      {[['Amber Moth', 'left-[-8px] top-[18px]'], ['Ivory Panda', 'right-[-14px] top-[84px]'], ['Sage Hare', 'left-[40px] bottom-[-4px]']].map(([n, c]) => (
        <span key={n} className={`absolute ${c} text-[12px] px-2.5 py-1 rounded-full bg-s3 ring2 whitespace-nowrap`}>{n}</span>
      ))}
    </div>
  );
}

function FolderVisual() {
  return (
    <pre className="font-mono text-[12.5px] leading-[1.9] text-fg-2 w-full" aria-hidden="true">{`Ladakh/
├─ RAW/        640 files
├─ Edits/
│  └─ final.tif
└─ notes.md`}</pre>
  );
}

function Feature({ title, body, children, wide }: { title: string; body: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <li className={`panel rounded-2xl p-6 md:p-7 flex flex-col min-h-[320px] ${wide ? 'md:col-span-3' : 'md:col-span-2'}`}>
      <div className="flex-1 flex items-center justify-center mb-6">{children}</div>
      <h3 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="text-[14.5px] text-fg-2 mt-1.5 max-w-[40ch] leading-relaxed">{body}</p>
    </li>
  );
}

/** How a file travels: device to device, with the server off to the side. */
function PathDiagram() {
  const lines = [0, 1, 2, 3, 4, 5, 6];
  return (
    <svg viewBox="0 0 760 330" className="w-full h-auto" aria-hidden="true">
      <defs><linearGradient id="beam" x1="0" x2="1"><stop offset="0" stopColor="#7C83FF" /><stop offset=".6" stopColor="#B08CFF" /><stop offset="1" stopColor="#FF8A5C" /></linearGradient></defs>
      <rect x="0.5" y="10.5" width="210" height="124" rx="16" fill="#0C111B" stroke="rgba(255,255,255,.14)" />
      <text x="26" y="64" fontSize="19" fontWeight="600" fill="#F4F6FA">Your device</text>
      <text x="26" y="92" fontSize="14.5" fill="#A1A9BA">encrypts the file</text>
      {lines.map((i) => <line key={i} x1="224" y1={36 + i * 12} x2="536" y2={36 + i * 12} stroke="url(#beam)" strokeOpacity={0.35 + i * 0.08} strokeWidth="3" strokeDasharray="22 9" className="flow-h" style={{ animationDelay: `${i * -0.21}s` }} />)}
      <text x="380" y="138" textAnchor="middle" fontSize="13.5" fill="#A1A9BA">direct, encrypted, nothing in between</text>
      <rect x="549.5" y="10.5" width="210" height="124" rx="16" fill="#0C111B" stroke="rgba(255,255,255,.14)" />
      <text x="576" y="64" fontSize="19" fontWeight="600" fill="#F4F6FA">Their device</text>
      <text x="576" y="92" fontSize="14.5" fill="#A1A9BA">decrypts and saves it</text>
      <path d="M105 140 V270 H262 M655 140 V270 H498" fill="none" stroke="rgba(255,255,255,.22)" strokeDasharray="4 6" strokeWidth="1.25" />
      <rect x="262.5" y="234.5" width="235" height="72" rx="14" fill="#080B12" stroke="rgba(255,255,255,.22)" strokeDasharray="4 5" />
      <text x="380" y="265" textAnchor="middle" fontSize="15.5" fontWeight="600" fill="#F4F6FA">Relay's server</text>
      <text x="380" y="289" textAnchor="middle" fontSize="13" fill="#A1A9BA">introduces them, never sees files</text>
    </svg>
  );
}

const COMPARE: [string, string, string, string, string][] = [
  ['Files uploaded to a server', 'Never', 'Yes', 'Yes', 'No'],
  ['Free size limit', 'None', '3 GB per 30 days', '15 GB of storage', 'None'],
  ['iPhone, Android, Windows and Mac', 'Yes', 'Yes', 'Yes', 'Apple only'],
  ['Open source', 'Yes, MIT', 'No', 'No', 'No'],
];

function Landing({ relay, onStage }: { relay: Relay; onStage: (groups: Staged) => void }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full">
      {/* HERO */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden">
        <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-48 w-[1100px] h-[720px] pointer-events-none" aria-hidden="true" />
        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 md:pt-28 text-center">
          <Link to="/resume-interrupted-file-transfer" className="inline-flex items-center gap-2.5 h-8 pl-1.5 pr-3 rounded-full ring2 bg-white/[0.03] text-[13px] text-fg-2 hover:text-fg transition-colors">
            <span className="h-[22px] px-2.5 rounded-full grad text-[#05070C] text-[11.5px] font-semibold inline-flex items-center">New</span>
            Transfers resume from the exact byte <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
          <h1 id="hero-title" className="h-hero mx-auto mt-7 max-w-[13ch] text-[46px] sm:text-[64px] md:text-[84px] font-semibold tracking-[-0.045em] leading-[0.98] pb-1">
            Send files directly. Nothing in between.
          </h1>
          <p className="mx-auto mt-6 max-w-[560px] text-[17px] md:text-[20px] text-fg-2 leading-[1.5]">
            Relay moves files of any size from one device to another, end-to-end encrypted, without ever uploading them. No account. Free and open source.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center px-6 sm:px-0">
            <button onClick={relay.createRoom} className="btn btn-w btn-lg">Start sending</button>
            <button onClick={() => { codeInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); codeInput.current?.focus({ preventScroll: true }); }} className="btn btn-g btn-lg">Receive with a code</button>
          </div>
          <p className="mt-4 text-[13px] text-fg-3">Works in any browser. Nothing to install.</p>

          {/* The real app, in a window */}
          <div className="window mt-16 md:mt-20 mx-auto max-w-[1080px] text-left">
            <div className="window-in">
              <div className="h-11 px-4 flex items-center gap-2 border-b border-line" aria-hidden="true">
                <span className="w-[11px] h-[11px] rounded-full bg-white/[0.12]" /><span className="w-[11px] h-[11px] rounded-full bg-white/[0.12]" /><span className="w-[11px] h-[11px] rounded-full bg-white/[0.12]" />
                <span className="mx-auto h-[26px] w-full max-w-[320px] rounded-md bg-white/[0.04] text-[12px] text-fg-3 flex items-center justify-center gap-1.5"><Lock className="w-3 h-3" />relay.rishishah.in</span>
                <span className="w-[49px] hidden sm:block" />
              </div>
              <div className="grid md:grid-cols-[300px_1fr]">
                {/* RECEIVE */}
                <section aria-labelledby="recv-h" className="order-2 md:order-1 p-5 md:p-6 border-t md:border-t-0 md:border-r border-line flex flex-col gap-7">
                  <div>
                    <h2 id="recv-h" className="text-[13px] font-medium text-fg-3">Receive</h2>
                    <form className="mt-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                      <label htmlFor="join-code" className="block text-[14px] text-fg mb-2">Room code</label>
                      <div className="flex gap-2">
                        <input ref={codeInput} id="join-code" type="text" placeholder="golden-zephyr-637" maxLength={48} value={code}
                          autoComplete="off" autoCapitalize="none" spellCheck={false}
                          onChange={(e) => setCode(e.target.value.toLowerCase())}
                          className="field flex-1 min-w-0 h-10 px-3 font-mono text-[13.5px]" />
                        <button type="submit" disabled={!code} aria-label="Join with this code" className="btn btn-w h-10">Join</button>
                      </div>
                    </form>
                    <AnimatePresence>
                      {relay.needsPassword && (
                        <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-2 flex gap-2">
                          <label htmlFor="join-password" className="sr-only">Room password</label>
                          <input id="join-password" type="password" autoFocus placeholder="Room password" value={password} aria-label="Room password"
                            onChange={(e) => setPassword(e.target.value)} className="field flex-1 min-w-0 h-10 px-3 text-[14px]" />
                          <button className="btn btn-w h-10">Unlock</button>
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
                  <div className="mt-3 rounded-xl border border-dashed border-white/[0.16] bg-white/[0.015] min-h-[250px] md:min-h-[300px] flex flex-col items-center justify-center text-center px-6 py-10">
                    <span className="w-12 h-12 rounded-xl ring2 bg-white/[0.04] flex items-center justify-center"><UploadCloud className="w-5 h-5 text-fg" aria-hidden="true" /></span>
                    <p className="mt-5 text-[18px] font-medium tracking-[-0.02em]">Drop files or folders to send</p>
                    <p className="mt-1.5 text-[14px] text-fg-3 max-w-[40ch]">Any size. A link and QR code appear for the other device.</p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      <button onClick={() => fileInput.current?.click()} className="btn btn-w"><Plus className="w-4 h-4" aria-hidden="true" />Choose files</button>
                      <button onClick={() => folderInput.current?.click()} className="btn btn-g"><FolderUp className="w-4 h-4" aria-hidden="true" />Choose a folder</button>
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

          <div className="mt-20 md:mt-24">
            <p className="text-[13px] text-fg-3">Works across every device you own</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-x-12 gap-y-3 text-[17px] md:text-[19px] font-semibold tracking-[-0.02em] text-[#7D8597]" aria-label="Supported platforms">
              {['iPhone', 'Android', 'Windows', 'macOS', 'Linux', 'ChromeOS'].map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </div>
      </section>

      {/* PRIVATE BY DESIGN */}
      <section aria-labelledby="private-title" className="max-w-[1200px] mx-auto px-6 pt-36 md:pt-44">
        <Kick>Private by design</Kick>
        <h2 id="private-title" className={`${H2} mt-3 max-w-[17ch]`}>Your files never touch a server. <span className="text-fg-3">Not even ours.</span></h2>
        <p className="mt-5 text-[17px] md:text-[18px] text-fg-2 max-w-[54ch] leading-relaxed">Relay only introduces the two devices. Then the file goes straight across, over an encrypted connection only they can read.</p>
        <ul className="mt-14 grid md:grid-cols-6 gap-3.5">
          <Feature wide title="Verify with one number" body="Both devices compute a safety number from their encryption keys. Same number on both screens, private connection."><SafetyVisual /></Feature>
          <Feature wide title="Any size, really" body="No caps, no compression, no expiring links. Chrome and Edge write large files straight to disk."><SizeVisual /></Feature>
          <Feature title="Survives bad Wi-Fi" body="If the connection drops, the transfer picks up from the exact byte."><ResumeVisual /></Feature>
          <Feature title="Nearby, instantly" body="Devices on the same Wi-Fi appear on their own. Tap one to connect."><NearbyVisual /></Feature>
          <Feature title="Folders stay folders" body="Structure is kept. Save into a folder or as a single ZIP."><FolderVisual /></Feature>
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section aria-labelledby="how-title" className="max-w-[1200px] mx-auto px-6 pt-36 md:pt-44">
        <Kick>How it works</Kick>
        <h2 id="how-title" className={`${H2} mt-3 max-w-[16ch]`}>Three steps. No sign-up.</h2>
        <div className="mt-14 grid md:grid-cols-12 gap-10 md:gap-8 items-center">
          <ol className="md:col-span-5 flex flex-col">
            {[
              { t: 'Open Relay on both devices', b: 'Any browser on a phone, tablet or computer.' },
              { t: 'Connect them', b: 'Scan the QR code, type the room code, or tap the device under Nearby.' },
              { t: 'Approve, then send', b: 'You allow the other device. They accept each file.' },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-5 py-6 border-t border-line first:border-t-0 first:pt-0">
                <span className="w-7 h-7 rounded-full ring2 text-[13px] font-medium text-fg-2 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{s.t}</h3>
                  <p className="text-[15px] text-fg-2 mt-1 leading-relaxed">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className="md:col-span-7 panel rounded-2xl p-6 md:p-9">
            <PathDiagram />
            <figcaption className="text-[13.5px] text-fg-2 mt-4 leading-relaxed">
              Your device encrypts the file and sends it directly to theirs. The server passes the room code and connection details, then steps aside. It never receives files, file names or messages. <Link to="/security" className="text-fg underline underline-offset-4 decoration-white/25 hover:decoration-white">What it can and can't see</Link>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* COMPARE */}
      <section aria-labelledby="cmp-title" className="max-w-[1200px] mx-auto px-6 pt-36 md:pt-44">
        <Kick>Compared</Kick>
        <h2 id="cmp-title" className={`${H2} mt-3 max-w-[16ch]`}>Built for sending, not storing.</h2>
        <div className="mt-12 overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[680px] text-[14.5px] border-collapse">
            <thead>
              <tr className="text-left">
                <td className="py-4 pr-4 w-[34%]" />
                <th scope="col" className="py-4 px-4 font-medium text-fg bg-acc/[0.08] rounded-t-xl">Relay</th>
                <th scope="col" className="py-4 px-4 font-normal text-fg-2">WeTransfer</th>
                <th scope="col" className="py-4 px-4 font-normal text-fg-2">Google Drive</th>
                <th scope="col" className="py-4 px-4 font-normal text-fg-2">AirDrop</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, ...v]) => (
                <tr key={k} className="border-t border-line">
                  <th scope="row" className="py-4 pr-4 font-normal text-fg-2 text-left">{k}</th>
                  {v.map((c, i) => <td key={i} className={`py-4 px-4 ${i === 0 ? 'bg-acc/[0.08] text-fg font-medium' : 'text-fg-2'}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[12.5px] text-fg-3">Free plans as published by each service, October 2026. <Link to="/best-p2p-file-sharing-apps" className="text-fg-2 hover:text-fg underline underline-offset-4 decoration-white/20">Full comparison</Link></p>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="max-w-[1200px] mx-auto px-6 pt-36 md:pt-44 grid md:grid-cols-12 gap-10 md:gap-8">
        <div className="md:col-span-4">
          <h2 id="faq-title" className={H2}>Questions</h2>
          <p className="mt-4 text-fg-2">More in the <Link to="/faq" className="text-fg underline underline-offset-4 decoration-white/25 hover:decoration-white">FAQ</Link> and <Link to="/articles" className="text-fg underline underline-offset-4 decoration-white/25 hover:decoration-white">guides</Link>.</p>
        </div>
        <div className="md:col-span-8 border-t border-line">
          {[
            ['Is it really free?', 'Yes. There are no plans, limits or ads. It costs very little to run because files never pass through our servers.'],
            ['Can you see my files?', 'No. Files travel directly between the two devices, encrypted with keys only those devices hold. Compare the safety number on both screens to confirm.'],
            ['Does the other person need to be online?', 'Yes. Both devices must be open at the same time, because nothing is stored anywhere. If they will download later, a cloud service is the better tool.'],
            ['Is it safe to accept files?', 'You only receive what you accept, from devices you approved. As with email, only open files you expect.'],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-line group">
              <summary className="cursor-pointer list-none flex justify-between items-center gap-4 py-5 text-[16.5px] font-medium">
                {q}<Plus className="w-4 h-4 text-fg-3 shrink-0 transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="text-fg-2 pb-5 -mt-1 leading-relaxed max-w-[62ch] text-[15px]">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section aria-labelledby="final-title" className="max-w-[1200px] mx-auto px-6 pt-36 md:pt-44">
        <div className="relative overflow-hidden rounded-[28px] panel px-6 py-24 md:py-28 text-center">
          <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-64 w-[900px] h-[560px] pointer-events-none" aria-hidden="true" />
          <h2 id="final-title" className={`${H2} relative mx-auto max-w-[14ch]`}>Send your first file in ten seconds.</h2>
          <p className="relative mt-5 text-[17px] text-fg-2">Open Relay on both devices. That's the whole setup.</p>
          <div className="relative mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => { window.scrollTo({ top: 0 }); relay.createRoom(); }} className="btn btn-w btn-lg">Start sending</button>
            <Link to="/security" className="btn btn-g btn-lg">Read the security model</Link>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function Lobby({ relay, staged, onClearStaged, onStage }: { relay: Relay; staged: Staged; onClearStaged: () => void; onStage: (g: Staged) => void }) {
  const [copied, setCopied] = useState<'' | 'code' | 'link'>('');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const link = `${window.location.origin}/?code=${relay.roomCode}`;
  const ready = !!relay.roomCode;
  const copy = (what: 'code' | 'link') => {
    navigator.clipboard?.writeText(what === 'code' ? relay.roomCode : link);
    setCopied(what);
    setTimeout(() => setCopied(''), 2000);
  };
  const share = () => navigator.share?.({ title: 'Join me on Relay', text: `Join my Relay room: ${relay.roomCode}`, url: link }).catch(() => {});
  const canShare = typeof navigator.share === 'function';

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      className="relative w-full max-w-[960px] mx-auto px-6 py-12 md:py-20">
      <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-40 w-[900px] h-[600px] pointer-events-none" aria-hidden="true" />
      <section className="relative window" aria-labelledby="lobby-title">
        <div className="window-in grid md:grid-cols-[auto_1fr]">
          <div className="p-6 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-line">
            {ready ? <RelayQR value={link} size={248} label={`QR code that opens Relay and joins room ${relay.roomCode}`} /> : (
              <div className="w-[248px] h-[248px] rounded-2xl bg-white/[0.04] ring2 flex items-center justify-center" role="img" aria-label="QR code loading"><Loader2 className="w-6 h-6 text-fg-3 animate-spin" aria-hidden="true" /></div>
            )}
            <p className="text-[13px] text-fg-3 mt-4">Scan with the other device's camera</p>
          </div>

          <div className="p-6 md:p-10 flex flex-col">
            <h1 id="lobby-title" className="text-[28px] md:text-[34px] font-semibold tracking-[-0.035em] leading-[1.1]">Connect the other device</h1>
            <p className="text-fg-2 text-[15px] mt-2.5 leading-relaxed max-w-[46ch]">Scan the QR code, or open <span className="text-fg">{window.location.host}</span> on the other device and enter this code.</p>

            <p className="text-[13px] text-fg-3 mt-8">Room code</p>
            <p className="font-mono text-[26px] md:text-[30px] text-fg mt-1 tracking-wide select-all break-all" data-testid="room-code" aria-live="polite">{relay.roomCode || 'creating…'}</p>

            <div className="flex flex-wrap gap-2 mt-5">
              {canShare
                ? <button onClick={share} disabled={!ready} className="btn btn-w"><Share2 className="w-4 h-4" aria-hidden="true" /> Share link</button>
                : <button onClick={() => copy('link')} disabled={!ready} className="btn btn-w">{copied === 'link' ? <><Check className="w-4 h-4" aria-hidden="true" /> Copied</> : <><Link2 className="w-4 h-4" aria-hidden="true" /> Copy link</>}</button>}
              <button onClick={() => copy('code')} disabled={!ready} className="btn btn-g">
                {copied === 'code' ? <><Check className="w-4 h-4 text-ok" aria-hidden="true" /> Copied</> : <><Copy className="w-4 h-4" aria-hidden="true" /> Copy code</>}
              </button>
            </div>
            <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied to clipboard` : ''}</span>

            <div className="mt-7">
              {staged.length ? <StagedList staged={staged} onClear={onClearStaged} /> : (
                <button onClick={() => fileInput.current?.click()} className="text-[14px] text-fg-2 hover:text-fg inline-flex items-center gap-2"><Plus className="w-4 h-4" aria-hidden="true" />Add files now. They send once the other device is in.</button>
              )}
              <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { if (e.target.files?.length) onStage([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
            </div>

            <div className="mt-7 pt-6 border-t border-line">
              <p className="text-[14.5px] text-fg flex items-center gap-2.5" role="status">
                <span className="relative flex w-2 h-2" aria-hidden="true"><span className="absolute inset-0 rounded-full bg-acc animate-ping" /><span className="relative w-2 h-2 rounded-full bg-acc" /></span>
                Waiting for the other device…
              </p>
              <p className="text-[13px] text-fg-3 mt-1.5">You'll approve it before anything is sent. The room closes when you leave this page.</p>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {relay.isHost && (
                relay.passwordEnabled ? (
                  <p className="text-[14px] text-ok flex items-center gap-2"><Lock className="w-4 h-4" aria-hidden="true" />Password required to join
                    <button onClick={() => relay.setRoomPassword('')} className="text-fg-2 hover:text-fg underline underline-offset-4 ml-1">Remove</button></p>
                ) : pwOpen ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2 max-w-sm">
                    <label htmlFor="room-pw" className="sr-only">Set room password</label>
                    <input id="room-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a password" aria-label="Set room password"
                      className="field flex-1 min-w-0 h-9 px-3 text-[14px]" />
                    <button className="btn btn-w">Lock</button>
                  </form>
                ) : (
                  <button onClick={() => setPwOpen(true)} className="self-start text-[14px] text-fg-2 hover:text-fg inline-flex items-center gap-2"><KeyRound className="w-4 h-4" aria-hidden="true" />Add a password (optional)</button>
                )
              )}
              {relay.nearbyDevices.length > 0 && (
                <div>
                  <h2 className="text-[13px] font-medium text-fg-3">Or invite a device on this Wi-Fi</h2>
                  <div className="mt-1.5 -mx-2"><NearbyList relay={relay} devices={relay.nearbyDevices} /></div>
                </div>
              )}
              <button onClick={relay.leaveRoom} className="self-start text-[14px] text-fg-2 hover:text-fg">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

export default function Home() {
  const relay = useRelay();
  const [dragging, setDragging] = useState(false);
  const [staged, setStaged] = useState<Staged>([]);
  const hasApprovedPeer = Object.values(relay.peers).some((p) => p.approved && p.connected);

  const stage = (groups: Staged) => {
    if (!groups.length) return;
    if (relay.appState === 'CONNECTED') {
      groups.forEach((g) => relay.sendFiles(g.files, g.groupName ? { paths: g.paths, groupName: g.groupName } : {}));
      return;
    }
    setStaged((s) => [...s, ...groups]);
    if (relay.appState === 'LANDING') relay.createRoom();
  };
  const stageRef = useRef(stage);
  stageRef.current = stage;

  // Files shared to the installed app (PWA share target) are staged like any others.
  useEffect(() => { takeSharedFiles().then((f) => { if (f.length) stageRef.current([{ files: f, paths: [] }]); }); }, []);

  // Staged files go out the moment a device is approved.
  useEffect(() => {
    if (!hasApprovedPeer || !staged.length || relay.appState !== 'CONNECTED') return;
    staged.forEach((g) => relay.sendFiles(g.files, g.groupName ? { paths: g.paths, groupName: g.groupName } : {}));
    relay.flash(`Sending ${stagedCount(staged)} file${stagedCount(staged) > 1 ? 's' : ''}`);
    setStaged([]);
  }, [hasApprovedPeer, staged, relay.appState, relay.sendFiles, relay.flash]);

  // Leaving the room drops anything still staged.
  const prevState = useRef(relay.appState);
  useEffect(() => {
    if (relay.appState === 'LANDING' && prevState.current !== 'LANDING') setStaged([]);
    prevState.current = relay.appState;
  }, [relay.appState]);

  // Paste to send: files (e.g. screenshots) or text
  useEffect(() => {
    if (relay.appState !== 'CONNECTED') return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length) {
        e.preventDefault();
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        relay.sendFiles(files.map((f) => (f.name === 'image.png' || !f.name ? new File([f], `pasted-${stamp}.${(f.type.split('/')[1] || 'bin')}`, { type: f.type }) : f)));
        relay.flash(`Sending ${files.length} pasted file${files.length > 1 ? 's' : ''}`);
        return;
      }
      const text = e.clipboardData?.getData('text/plain');
      if (text?.trim()) { e.preventDefault(); if (relay.sendText(text)) relay.flash('Sent pasted text'); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [relay.appState, relay.sendFiles, relay.sendText, relay.flash]);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!e.dataTransfer.items) return;
    stage(await collectDropped(e.dataTransfer.items));
  };

  return (
    <div className="flex-1 flex flex-col w-full relative"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (!e.relatedTarget) setDragging(false); }}>
      <AnimatePresence mode="wait">
        {relay.appState === 'LANDING' && <Landing relay={relay} onStage={stage} />}
        {relay.appState === 'LOBBY' && <Lobby relay={relay} staged={staged} onStage={stage} onClearStaged={() => setStaged([])} />}
        {relay.appState === 'CONNECTED' && (
          <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
            <Connected relay={relay} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {relay.nearbyInvite && (
          <Dialog title={`${relay.nearbyInvite.name} wants to connect`} testId="nearby-invite" onClose={() => relay.answerNearbyInvite(false)}
            description="A device on your Wi-Fi network is inviting you. Only connect if you recognise it. You'll still choose which files to accept.">
            <div className="flex gap-2">
              <button data-autofocus onClick={() => relay.answerNearbyInvite(true)} className="btn btn-w btn-lg flex-1">Connect</button>
              <button onClick={() => relay.answerNearbyInvite(false)} className="btn btn-g btn-lg flex-1">Decline</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {relay.notice && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="px-4 py-2.5 rounded-xl bg-s3 ring2 text-[14px] text-fg shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-acc" aria-hidden="true" />{relay.notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
            className="fixed inset-3 z-50 rounded-2xl bg-bg/90 backdrop-blur-md border border-dashed border-acc/60 flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-10 h-10 text-acc" />
            <p className="mt-5 text-[40px] md:text-[56px] font-semibold tracking-[-0.04em]">Drop to send</p>
            <p className="text-[16px] text-fg-2 mt-2">{relay.appState === 'CONNECTED' ? 'Files and folders go straight to the connected device.' : 'You will get a link and QR code for the other device.'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
