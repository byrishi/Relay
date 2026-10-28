import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, UploadCloud, Copy, Check, Lock, ShieldCheck, CloudOff, UserX, Github, Laptop, Smartphone, Tablet, Monitor,
  Wifi, KeyRound, Share2, Server, HardDrive, RotateCw, FolderUp, Globe, Loader2, Link2, BadgeCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { useRelay, Relay, NearbyDevice } from '../hooks/useRelay';
import Connected from '../components/relay/Connected';
import Dialog from '../components/Dialog';
import { collectDropped } from '../components/relay/format';
import { takeSharedFiles } from '../lib/share';
import { SITE } from '../content/site';

const panel = 'card';
const btnPrimary = 'btn-ink';
const btnGhost = 'btn-line';

function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'phone') return <Smartphone className={className} aria-hidden="true" />;
  if (kind === 'tablet') return <Tablet className={className} aria-hidden="true" />;
  if (kind === 'laptop') return <Laptop className={className} aria-hidden="true" />;
  return <Monitor className={className} aria-hidden="true" />;
}

function NearbyList({ relay, devices, center }: { relay: Relay; devices: NearbyDevice[]; center?: boolean }) {
  if (!devices.length) {
    return (
      <p className={cn('text-sm text-ink-3 flex items-center gap-2', center && 'justify-center')}>
        <span className="relative flex w-2 h-2" aria-hidden="true"><span className="absolute inset-0 rounded-full bg-indigo/50 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-indigo" /></span>
        Looking for devices on this Wi-Fi. Open Relay on another one and it shows up here.
      </p>
    );
  }
  return (
    <ul className={cn('flex flex-wrap gap-2', center && 'justify-center')} data-testid="nearby" aria-label="Nearby devices">
      {devices.map((d) => (
        <li key={d.id}>
          <button onClick={() => relay.inviteNearby(d.id)}
            className="group pl-2 pr-4 h-11 rounded-full bg-white border border-ink/15 hover:border-indigo text-sm text-ink flex items-center gap-2.5 transition-colors">
            <span className="w-7 h-7 rounded-full bg-paper flex items-center justify-center"><KindIcon kind={d.kind} className="w-4 h-4 text-brand" /></span>
            {d.name} <span className="sr-only">— connect</span><ArrowRight className="w-3.5 h-3.5 text-ink-3 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

const PROOF = [
  { icon: CloudOff, title: 'Never uploaded', to: '/how-it-works' },
  { icon: Lock, title: 'Encrypted end to end', to: '/security' },
  { icon: UserX, title: 'No account, no tracking', to: '/privacy' },
  { icon: Github, title: 'Open source', href: SITE.github },
];

/** Section heading in the editorial style: mono eyebrow, sans line with a serif italic accent. */
function Heading({ id, eyebrow, children, center }: { id: string; eyebrow: string; children: React.ReactNode; center?: boolean }) {
  return (
    <div className={cn(center && 'text-center')}>
      <p className="eyebrow" aria-hidden="true">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-[34px] md:text-5xl font-semibold tracking-[-0.03em] text-ink leading-[1.05]">{children}</h2>
    </div>
  );
}
const Em = ({ children }: { children: React.ReactNode }) => <em className="font-serif italic font-normal tracking-normal text-dawn pr-1">{children}</em>;

function Landing({ relay }: { relay: Relay }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      className="w-full flex flex-col flex-1">
      {/* HERO: copy on the left, the particle R lives on the canvas to the right (above on phones) */}
      <section aria-labelledby="hero-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 pt-[38vh] md:pt-0 pb-16 md:min-h-[calc(100vh-112px)] flex flex-col justify-center">
        <div className="max-w-[640px]">
          <a href={SITE.github} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-8 pl-1.5 pr-3.5 rounded-full card text-ink-2 text-[13px] hover:text-ink">
            <span className="h-5 px-2 rounded-full bg-ink text-white text-[11px] font-medium inline-flex items-center">Free</span>
            Open source · MIT license <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <h1 id="hero-title" className="mt-7 text-[46px] leading-[0.98] sm:text-6xl md:text-[84px] font-semibold tracking-[-0.045em] text-ink">
            Transfer files directly.<br />
            <span className="font-serif italic font-normal tracking-[-0.01em] text-dawn pr-2">Without the cloud.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink-2 max-w-[34rem] leading-relaxed">
            Send files of any size straight to another phone or computer. They never touch our servers, and only you and the person you send to can open them.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button onClick={relay.createRoom} className={cn(btnPrimary, 'h-14 px-7 text-base group shadow-[0_14px_30px_-14px_rgb(22_33_58/0.6)]')}>
              Start a transfer <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
            <form className="relative w-full sm:w-[290px] h-14" onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <label htmlFor="join-code" className="sr-only">Room code</label>
              <input id="join-code" type="text" placeholder="Have a code? Enter it" maxLength={48} value={code} aria-label="Room code"
                autoComplete="off" autoCapitalize="none" spellCheck={false}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                className="field w-full h-full pl-5 pr-14 rounded-full text-[15px]" />
              <button type="submit" disabled={!code} aria-label="Join with this code"
                className="absolute right-1.5 top-1.5 bottom-1.5 w-11 flex items-center justify-center rounded-full bg-ink text-white disabled:bg-ink/10 disabled:text-ink-3 transition-colors">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <AnimatePresence>
            {relay.needsPassword && (
              <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onSubmit={(e) => { e.preventDefault(); submit(); }} className="w-full max-w-md mt-3 flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="w-4 h-4 text-ink-3 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <label htmlFor="join-password" className="sr-only">Room password</label>
                  <input id="join-password" type="password" autoFocus placeholder="This room has a password" value={password} aria-label="Room password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="field w-full h-12 pl-10 pr-4 rounded-full text-sm" />
                </div>
                <button className={cn(btnPrimary, 'px-6 h-12 text-sm')}>Unlock</button>
              </motion.form>
            )}
          </AnimatePresence>
          {relay.joinError && <p className="mt-4 text-danger text-sm font-medium" role="alert">{relay.joinError}</p>}

          <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2.5" aria-label="Why it's safe">
            {PROOF.map(({ icon: Icon, title, to, href }) => {
              const inner = <><Icon className="w-4 h-4 text-indigo" aria-hidden="true" /><span>{title}</span></>;
              const cls = 'flex items-center gap-2 text-[14px] text-ink-2 hover:text-ink underline-offset-4 hover:underline';
              return <li key={title}>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link to={to!} className={cls}>{inner}</Link>}</li>;
            })}
          </ul>
        </div>

        <div className="mt-12 md:mt-16 card rounded-[28px] p-5 md:p-6 max-w-[640px]">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-[15px] font-semibold text-ink">Nearby devices</h2>
            <span className="text-[13px] text-ink-3">You appear as <b className="font-medium text-ink-2">{relay.deviceName}</b></span>
          </div>
          <div className="mt-3"><NearbyList relay={relay} devices={relay.nearbyDevices} /></div>
        </div>
      </section>

      {/* WHERE YOUR FILE GOES */}
      <section aria-labelledby="path-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-10 md:gap-16 items-end">
          <Heading id="path-title" eyebrow="01 · The journey">Where your file <Em>actually</Em> goes</Heading>
          <p className="text-ink-2 text-lg leading-relaxed max-w-xl">Most "send a file" services upload it to their servers first. Relay doesn't. Here is the whole journey, start to finish.</p>
        </div>

        <div className="mt-12 card rounded-[32px] p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1fr] items-center gap-6">
            <div className="rounded-3xl bg-paper p-6">
              <Laptop className="w-7 h-7 text-brand" aria-hidden="true" />
              <p className="font-semibold text-ink mt-4 text-lg">Your device</p>
              <p className="text-[15px] text-ink-2 mt-1 leading-relaxed">The file is read in pieces and encrypted here.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 text-indigo px-2" aria-hidden="true">
              <span className="hidden md:block flex-1 h-3 dots-x flow-dots" />
              <span className="md:hidden w-3 h-12 dots-y mx-auto" />
              <span className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-ink text-white text-[13px] font-medium"><Lock className="w-3.5 h-3.5" /> Encrypted, direct</span>
              <span className="hidden md:block flex-1 h-3 dots-x flow-dots" />
            </div>
            <div className="rounded-3xl bg-paper p-6">
              <Smartphone className="w-7 h-7 text-brand" aria-hidden="true" />
              <p className="font-semibold text-ink mt-4 text-lg">Their device</p>
              <p className="text-[15px] text-ink-2 mt-1 leading-relaxed">Decrypted and saved only after they press Accept.</p>
            </div>
          </div>
          <p className="sr-only">Direct, encrypted connection: nothing in between can read it.</p>
          <div className="mt-6 rounded-3xl border border-dashed border-ink/20 p-6 flex flex-col md:flex-row gap-4 md:items-center">
            <span className="w-11 h-11 rounded-2xl bg-paper flex items-center justify-center shrink-0"><Server className="w-5 h-5 text-ink-2" aria-hidden="true" /></span>
            <p className="text-[15px] text-ink-2 leading-relaxed"><b className="text-ink font-semibold">Relay's server only introduces the two devices</b>, like a receptionist who tells two guests which room to meet in. It sees the room code and connection details, never your files, file names or messages, and it stores nothing. <Link to="/security" className="text-indigo underline underline-offset-4">What the server can and can't see</Link></p>
          </div>
        </div>
      </section>

      {/* THREE STEPS */}
      <section aria-labelledby="steps-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <Heading id="steps-title" eyebrow="02 · How">Three steps. <Em>No sign-up.</Em></Heading>
        <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 border-t border-ink/15">
          {[
            { t: 'Open Relay on both devices', b: 'Any browser: phone, tablet or computer. Nothing to install.' },
            { t: 'Connect them', b: 'Share the code or scan the QR. On the same Wi-Fi, just tap the device under Nearby.' },
            { t: 'Approve and send', b: 'Allow the device, drop your files, and the other side presses Accept.' },
          ].map((s, i) => (
            <li key={s.t} className={cn('pt-7 pb-2 md:pr-10', i > 0 && 'md:pl-10 md:border-l border-ink/15', i > 0 && 'border-t md:border-t-0 mt-6 md:mt-0')}>
              <span className="font-serif italic text-6xl text-[#7A8396] leading-none" aria-hidden="true">0{i + 1}</span>
              <h3 className="text-xl font-semibold text-ink mt-5 tracking-tight">{s.t}</h3>
              <p className="text-ink-2 mt-2 leading-relaxed">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* WHY TRUST IT */}
      <section aria-labelledby="trust-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <Heading id="trust-title" eyebrow="03 · Proof">Don't just trust us. <Em>Check.</Em></Heading>
        <p className="text-ink-2 text-lg mt-4 max-w-2xl">Privacy claims are easy to make. Relay is built so you can verify them yourself.</p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: BadgeCheck, t: 'A safety number on both screens', b: 'It is computed on each device from both encryption keys. If the numbers match, nobody, not even our server, is listening in.', link: ['/verify-safety-number', 'How to verify'] },
            { icon: ShieldCheck, t: 'You decide what happens', b: 'New devices need your Allow. Every file needs the receiver’s Accept. Rooms can have a password.', link: ['/security', 'Security model'] },
            { icon: Github, t: 'Open code, published review', b: 'The full source is on GitHub, including an October 2026 security review listing every issue found and fixed.', link: [SITE.github, 'Read the code'] },
            { icon: Globe, t: 'Made by a real person', b: `Relay is built and maintained by ${SITE.author.name}, an independent developer. No investors, no data business.`, link: [SITE.author.url, 'About the maker'] },
          ].map(({ icon: Icon, t, b, link }) => (
            <div key={t} className={cn(panel, 'rounded-[28px] p-7 flex flex-col')}>
              <span className="w-11 h-11 rounded-2xl bg-paper flex items-center justify-center"><Icon className="w-5 h-5 text-indigo" aria-hidden="true" /></span>
              <h3 className="text-xl font-semibold text-ink mt-5 tracking-tight">{t}</h3>
              <p className="text-ink-2 mt-2 leading-relaxed flex-1">{b}</p>
              {link[0].startsWith('/')
                ? <Link to={link[0]} className="inline-flex items-center gap-1.5 mt-5 text-[15px] font-medium text-ink hover:text-indigo">{link[1]} <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
                : <a href={link[0]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-5 text-[15px] font-medium text-ink hover:text-indigo">{link[1]} <ArrowRight className="w-4 h-4" aria-hidden="true" /></a>}
            </div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section aria-labelledby="cap-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 pb-20 md:pb-28">
        <div className="rounded-[36px] bg-ink text-white p-7 md:p-14 relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-dawn opacity-30 blur-3xl" aria-hidden="true" />
          <p className="eyebrow !text-white/70 relative" aria-hidden="true">04 · Capable</p>
          <h2 id="cap-title" className="relative mt-3 text-[34px] md:text-5xl font-semibold tracking-[-0.03em] leading-[1.05]">Built for <em className="font-serif italic font-normal tracking-normal">real-world</em> files</h2>
          <ul className="relative mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: HardDrive, t: 'No size limit', b: 'Chrome and Edge save straight to the folder you pick, even 100 GB.' },
              { icon: RotateCw, t: 'Survives bad Wi-Fi', b: 'If the connection drops, it resumes from where it stopped.' },
              { icon: FolderUp, t: 'Whole folders', b: 'Subfolders kept. Save into a folder or as a ZIP.' },
              { icon: Wifi, t: 'Every device', b: 'iPhone, Android, Windows, Mac, Linux, in any modern browser.' },
            ].map(({ icon: Icon, t, b }) => (
              <li key={t} className="border-t border-white/20 pt-5">
                <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                <h3 className="text-lg font-semibold mt-4">{t}</h3>
                <p className="text-white/80 mt-1.5 leading-relaxed">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SHORT FAQ */}
      <section aria-labelledby="faq-title" className="w-full max-w-6xl mx-auto px-5 md:px-8 pb-8 grid md:grid-cols-[0.8fr_1.2fr] gap-10 md:gap-16">
        <div>
          <Heading id="faq-title" eyebrow="05 · Questions">Common <Em>questions</Em></Heading>
          <p className="mt-5 text-[15px] text-ink-2"><Link to="/faq" className="text-ink font-medium underline underline-offset-4 decoration-ink/30 hover:decoration-ink">All questions</Link> · <Link to="/articles" className="text-ink font-medium underline underline-offset-4 decoration-ink/30 hover:decoration-ink">Guides</Link></p>
        </div>
        <div className="border-t border-ink/15">
          {[
            ['Is it really free?', 'Yes. Relay is free and open source with no plans, no limits and no ads. It costs very little to run because files never pass through our servers.'],
            ['Can you see my files?', 'No. Files travel directly between the two devices, encrypted with keys only those devices have. Compare the safety number on both screens to confirm.'],
            ['What if the other person is offline?', 'Both devices need to be online at the same time, because nothing is stored. If they will download later, a cloud service is the better tool.'],
            ['Is it safe to accept files?', 'You only receive what you accept, from devices you approved. As with email, only open files you expect.'],
          ].map(([q, a]) => (
            <details key={q} className="border-b border-ink/15 py-5 group">
              <summary className="cursor-pointer list-none flex justify-between items-center gap-4 text-ink text-lg font-medium">
                {q}<span className="w-8 h-8 rounded-full border border-ink/15 flex items-center justify-center text-ink-2 group-open:rotate-45 transition-transform shrink-0" aria-hidden="true">+</span>
              </summary>
              <p className="text-ink-2 mt-3 leading-relaxed pr-10">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function Lobby({ relay }: { relay: Relay }) {
  const [copied, setCopied] = useState<'' | 'code' | 'link'>('');
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
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
    <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center w-full max-w-[440px] mx-auto my-auto py-8 px-4">
      <section className="card-solid w-full p-7 md:p-9 flex flex-col items-center rounded-[32px] text-center" aria-labelledby="lobby-title">
        <p className="eyebrow" aria-hidden="true">Step 2 of 3</p>
        <h1 id="lobby-title" className="mt-2 text-[28px] font-semibold tracking-tight text-ink leading-tight">Connect the <em className="font-serif italic font-normal">other device</em></h1>
        <p className="text-ink-2 text-[15px] mt-2 leading-relaxed">On the other phone or computer, scan this QR code with the camera, or open <b className="text-ink font-semibold">{window.location.host}</b> and enter the code.</p>

        <div className="relative mt-7 p-4 bg-white rounded-3xl border border-ink/10 shadow-[0_20px_50px_-30px_rgb(75_82_224/0.55)]" role="img" aria-label={ready ? `QR code that opens Relay and joins room ${relay.roomCode}` : 'QR code loading'}>
          {ready ? <QRCodeSVG value={link} size={184} level="M" fgColor="#16213A" aria-hidden="true" /> : <div className="w-[184px] h-[184px] flex items-center justify-center"><Loader2 className="w-6 h-6 text-ink-3 animate-spin" aria-hidden="true" /></div>}
        </div>

        <p className="eyebrow mt-7">Room code</p>
        <p className="font-mono text-[26px] md:text-3xl text-ink mt-1.5 tracking-wide select-all" data-testid="room-code" aria-live="polite">{relay.roomCode || 'creating…'}</p>

        <div className="grid grid-cols-2 gap-2 w-full mt-6">
          <button onClick={() => copy('code')} disabled={!ready} className={cn(btnGhost, 'h-12 text-sm')}>
            {copied === 'code' ? <><Check className="w-4 h-4 text-ok" aria-hidden="true" /> Copied</> : <><Copy className="w-4 h-4" aria-hidden="true" /> Copy code</>}
          </button>
          {canShare
            ? <button onClick={share} disabled={!ready} className={cn(btnPrimary, 'h-12 text-sm')}><Share2 className="w-4 h-4" aria-hidden="true" /> Share link</button>
            : <button onClick={() => copy('link')} disabled={!ready} className={cn(btnPrimary, 'h-12 text-sm')}>{copied === 'link' ? <><Check className="w-4 h-4" aria-hidden="true" /> Copied</> : <><Link2 className="w-4 h-4" aria-hidden="true" /> Copy link</>}</button>}
        </div>
        <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied to clipboard` : ''}</span>

        <p className="mt-7 text-[15px] text-ink flex items-center gap-2.5" role="status">
          <span className="relative flex w-2.5 h-2.5" aria-hidden="true"><span className="absolute inset-0 rounded-full bg-indigo/50 animate-ping" /><span className="relative w-2.5 h-2.5 rounded-full bg-indigo" /></span>
          Waiting for the other device…
        </p>
        <p className="text-[13px] text-ink-3 mt-1.5">You'll approve it before anything is sent. The room closes when you leave this page.</p>

        {relay.isHost && (
          <div className="w-full mt-6 pt-5 border-t border-ink/10">
            {relay.passwordEnabled ? (
              <p className="text-sm text-ok flex items-center gap-2 justify-center"><Lock className="w-4 h-4" aria-hidden="true" />Password required to join
                <button onClick={() => relay.setRoomPassword('')} className="text-ink-2 hover:text-ink underline underline-offset-4">Remove</button></p>
            ) : pwOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2">
                <label htmlFor="room-pw" className="sr-only">Set room password</label>
                <input id="room-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a password" aria-label="Set room password"
                  className="field flex-1 h-11 px-4 rounded-full text-sm" />
                <button className={cn(btnPrimary, 'px-5 h-11 text-sm')}>Lock</button>
              </form>
            ) : (
              <button onClick={() => setPwOpen(true)} className="text-sm text-ink-2 hover:text-ink inline-flex items-center gap-2"><KeyRound className="w-4 h-4" aria-hidden="true" />Add a password <span className="text-ink-3">(optional)</span></button>
            )}
          </div>
        )}

        {relay.nearbyDevices.length > 0 && (
          <div className="w-full mt-6 pt-5 border-t border-ink/10 flex flex-col gap-3">
            <h2 className="text-sm font-medium text-ink-2">Or invite a device on this Wi-Fi</h2>
            <NearbyList relay={relay} devices={relay.nearbyDevices} center />
          </div>
        )}

        <button onClick={relay.leaveRoom} className="mt-7 text-sm text-ink-2 hover:text-ink underline underline-offset-4">Cancel</button>
      </section>
    </motion.div>
  );
}

export default function Home() {
  const relay = useRelay();
  const [dragging, setDragging] = useState(false);
  const [shared, setShared] = useState<File[]>([]);

  useEffect(() => { takeSharedFiles().then((f) => { if (f.length) setShared(f); }); }, []);

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
    if (relay.appState !== 'CONNECTED' || !e.dataTransfer.items) return;
    for (const g of await collectDropped(e.dataTransfer.items)) {
      relay.sendFiles(g.files, g.groupName ? { paths: g.paths, groupName: g.groupName } : {});
    }
  };

  const hasApprovedPeer = Object.values(relay.peers).some((p) => p.approved && p.connected);

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full relative h-full"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); if (relay.appState === 'CONNECTED') setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false); }}>
      <div className="w-full max-w-[100vw] flex flex-col z-10 flex-1 relative min-h-[calc(100vh-112px)]">
        {shared.length > 0 && (
          <div className={'card mx-auto mt-2 mb-4 rounded-full pl-5 pr-2 py-2 flex items-center gap-3 text-sm text-ink max-w-xl w-[calc(100%-2rem)]'} role="status">
            <Share2 className="w-4 h-4 text-indigo shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{shared.length} shared file{shared.length > 1 ? 's' : ''} ready. {hasApprovedPeer ? '' : 'Connect a device to send.'}</span>
            <button disabled={!hasApprovedPeer} onClick={() => { relay.sendFiles(shared); setShared([]); }} className="btn-ink px-4 h-9 text-xs">Send now</button>
            <button onClick={() => setShared([])} className="px-3 h-9 text-ink-2 hover:text-ink text-xs">Discard</button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {relay.appState === 'LANDING' && <Landing relay={relay} />}
          {relay.appState === 'LOBBY' && <Lobby relay={relay} />}
          {relay.appState === 'CONNECTED' && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full pt-2">
              <Connected relay={relay} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {relay.nearbyInvite && (
          <Dialog title={`${relay.nearbyInvite.name} wants to connect`} testId="nearby-invite" onClose={() => relay.answerNearbyInvite(false)}
            description="A device on your Wi-Fi network is inviting you. Only connect if you recognise it. You'll still choose which files to accept.">
            <div className="flex gap-3">
              <button data-autofocus onClick={() => relay.answerNearbyInvite(true)} className={cn(btnPrimary, 'flex-1 h-11 text-sm')}>Connect</button>
              <button onClick={() => relay.answerNearbyInvite(false)} className={cn(btnGhost, 'flex-1 h-11 text-sm')}>Decline</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] pointer-events-none" role="status" aria-live="polite">
        <AnimatePresence>
          {relay.notice && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
              className="px-5 py-3 rounded-full bg-ink text-white text-sm font-medium shadow-[0_18px_40px_-16px_rgb(22_33_58/0.6)]">
              {relay.notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
            className="fixed inset-3 z-50 rounded-[36px] bg-paper/85 backdrop-blur-md border-2 border-dashed border-indigo flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-12 h-12 text-indigo mb-6" />
            <p className="text-5xl font-semibold text-ink tracking-tight">Drop to <em className="font-serif italic font-normal text-dawn pr-1">send</em></p>
            <p className="text-base text-ink-2 mt-3">Files and folders go straight to the connected device.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
