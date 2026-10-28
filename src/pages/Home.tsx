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

const panel = 'bg-[#070a16]/70 backdrop-blur-2xl border border-white/[0.09] glow-soft';
const btnPrimary = 'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-neon text-black font-semibold hover:bg-white active:scale-[0.98] transition-all';
const btnGhost = 'inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/15 transition-colors';

function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'phone') return <Smartphone className={className} aria-hidden="true" />;
  if (kind === 'tablet') return <Tablet className={className} aria-hidden="true" />;
  if (kind === 'laptop') return <Laptop className={className} aria-hidden="true" />;
  return <Monitor className={className} aria-hidden="true" />;
}

function NearbyList({ relay, devices }: { relay: Relay; devices: NearbyDevice[] }) {
  if (!devices.length) {
    return <p className="text-sm text-white/65 flex items-center gap-2 justify-center"><Wifi className="w-4 h-4" aria-hidden="true" />Open Relay on another device on this Wi-Fi and it will show up here.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2 justify-center" data-testid="nearby" aria-label="Nearby devices">
      {devices.map((d) => (
        <li key={d.id}>
          <button onClick={() => relay.inviteNearby(d.id)}
            className="px-4 py-2.5 rounded-lg bg-white/[0.07] border border-white/20 hover:border-brand-neon/70 hover:bg-white/10 text-sm text-white flex items-center gap-2 transition-colors">
            <KindIcon kind={d.kind} className="w-4 h-4 text-brand-neon" /> {d.name} <span className="sr-only">— connect</span><ArrowRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}

const PROOF = [
  { icon: CloudOff, title: 'Never uploaded', body: 'Files go straight to the other device. Our server never receives them.', to: '/how-it-works' },
  { icon: Lock, title: 'Encrypted end to end', body: 'Only you and the receiver hold the keys. Check it with a safety number.', to: '/security' },
  { icon: UserX, title: 'No account, no tracking', body: 'No sign-up, no email, no analytics, no ads.', to: '/privacy' },
  { icon: Github, title: 'Open source', body: 'Every line is public and MIT licensed. Read it or run your own.', href: SITE.github },
];

function Landing({ relay }: { relay: Relay }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
      className="w-full flex flex-col items-center flex-1">
      {/* HERO */}
      <section aria-labelledby="hero-title" className="w-full min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)] flex flex-col justify-center items-center text-center px-4 max-w-5xl mx-auto py-14 md:py-20">
        <a href={SITE.github} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-medium mb-8 backdrop-blur-md hover:border-brand-neon/60 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-neon" aria-hidden="true" /> Free &amp; open source · MIT license
        </a>

        <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white mb-6 leading-[1.05]">
          Transfer files directly.<br /><span className="text-luminous">Without the cloud.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 leading-relaxed [text-shadow:0_1px_18px_rgba(3,4,10,0.95),0_0_2px_rgba(3,4,10,0.9)]">
          Send files of any size straight to another phone or computer. They never touch our servers, and only you and the person you send to can open them.
        </p>

        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-3 items-stretch">
          <button onClick={relay.createRoom} className={cn(btnPrimary, 'w-full sm:w-1/2 h-14 text-base group')}>
            Start a transfer <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </button>
          <form className="relative w-full sm:w-1/2 h-14" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <label htmlFor="join-code" className="sr-only">Room code</label>
            <input id="join-code" type="text" placeholder="Have a code? Enter it here" maxLength={48} value={code} aria-label="Room code"
              autoComplete="off" autoCapitalize="none" spellCheck={false}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              className="w-full h-full px-4 pr-14 rounded-lg bg-white/10 hover:bg-white/15 border border-white/25 focus:border-brand-neon focus:bg-white/15 text-white placeholder-white/55 outline-none transition-all text-sm backdrop-blur-md" />
            <button type="submit" disabled={!code} aria-label="Join with this code"
              className="absolute right-1.5 top-1.5 bottom-1.5 w-12 flex items-center justify-center bg-white/15 hover:bg-white hover:text-black rounded-md disabled:opacity-40 text-white">
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <AnimatePresence>
          {relay.needsPassword && (
            <motion.form initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              onSubmit={(e) => { e.preventDefault(); submit(); }} className="w-full max-w-xl mt-3 flex gap-3">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-white/60 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <label htmlFor="join-password" className="sr-only">Room password</label>
                <input id="join-password" type="password" autoFocus placeholder="This room has a password" value={password} aria-label="Room password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-lg bg-white/10 border border-yellow-300/50 focus:border-brand-neon text-white outline-none text-sm placeholder-white/55" />
              </div>
              <button className="px-5 h-12 rounded-lg bg-white text-black text-sm font-semibold">Unlock</button>
            </motion.form>
          )}
        </AnimatePresence>
        {relay.joinError && <p className="mt-4 text-red-300 text-sm font-medium" role="alert">{relay.joinError}</p>}

        {/* proof points */}
        <ul className="mt-10 w-full max-w-3xl grid grid-cols-2 md:grid-cols-4 gap-2 text-left" aria-label="Why it's safe">
          {PROOF.map(({ icon: Icon, title, to, href }) => {
            const inner = <><Icon className="w-4 h-4 text-brand-neon shrink-0" aria-hidden="true" /><span>{title}</span></>;
            const cls = 'flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#070a16]/60 border border-white/10 text-sm text-white/90 hover:border-brand-neon/50 transition-colors backdrop-blur-md';
            return <li key={title}>{href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link to={to!} className={cls}>{inner}</Link>}</li>;
          })}
        </ul>

        <div className="mt-10 w-full max-w-2xl flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/70">Nearby devices <span className="normal-case tracking-normal text-white/60">· you appear as {relay.deviceName}</span></h2>
          <NearbyList relay={relay} devices={relay.nearbyDevices} />
        </div>
      </section>

      {/* WHERE YOUR FILE GOES */}
      <section aria-labelledby="path-title" className="w-full max-w-5xl mx-auto px-4 py-16 md:py-24">
        <div className={cn(panel, 'rounded-3xl p-6 md:p-12')}>
          <h2 id="path-title" className="text-3xl md:text-4xl font-bold tracking-tight text-white">Where your file actually goes</h2>
          <p className="text-white/80 mt-3 max-w-2xl leading-relaxed">Most "send a file" services upload it to their servers first. Relay doesn't. Here is the whole journey.</p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
              <Laptop className="w-8 h-8 mx-auto text-brand-neon" aria-hidden="true" />
              <p className="font-semibold text-white mt-2">Your device</p>
              <p className="text-sm text-white/70">The file is read in pieces and encrypted here.</p>
            </div>
            <div className="flex md:flex-col items-center justify-center gap-2 text-brand-neon" aria-hidden="true">
              <span className="h-px md:h-auto md:w-px flex-1 md:flex-none md:h-10 w-10 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-brand-neon to-transparent" />
              <Lock className="w-5 h-5" />
              <span className="h-px md:h-auto md:w-px flex-1 md:flex-none md:h-10 w-10 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-brand-neon to-transparent" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
              <Smartphone className="w-8 h-8 mx-auto text-brand-neon" aria-hidden="true" />
              <p className="font-semibold text-white mt-2">Their device</p>
              <p className="text-sm text-white/70">Decrypted and saved only after they press Accept.</p>
            </div>
          </div>
          <p className="text-center text-sm text-brand-neon mt-4">Direct, encrypted connection: nothing in between can read it.</p>
          <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-5 flex flex-col md:flex-row gap-4 md:items-center">
            <Server className="w-7 h-7 text-white/70 shrink-0" aria-hidden="true" />
            <p className="text-sm text-white/80 leading-relaxed"><b className="text-white">Relay's server only introduces the two devices</b>, like a receptionist who tells two guests which room to meet in. It sees the room code and connection details, never your files, file names or messages, and it stores nothing. <Link to="/security" className="text-brand-neon underline underline-offset-2">What the server can and can't see</Link></p>
          </div>
        </div>
      </section>

      {/* THREE STEPS */}
      <section aria-labelledby="steps-title" className="w-full max-w-5xl mx-auto px-4 pb-16 md:pb-24">
        <h2 id="steps-title" className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center">Three steps. No sign-up.</h2>
        <ol className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { t: 'Open Relay on both devices', b: 'Any browser: phone, tablet or computer. Nothing to install.' },
            { t: 'Connect them', b: 'Share the code or scan the QR. On the same Wi-Fi, just tap the device under Nearby.' },
            { t: 'Approve and send', b: 'Allow the device, drop your files, and the other side presses Accept.' },
          ].map((s, i) => (
            <li key={s.t} className={cn(panel, 'rounded-2xl p-6')}>
              <span className="inline-flex w-9 h-9 rounded-full bg-brand-neon text-black font-bold items-center justify-center" aria-hidden="true">{i + 1}</span>
              <h3 className="text-lg font-semibold text-white mt-4">{s.t}</h3>
              <p className="text-white/75 mt-2 text-sm leading-relaxed">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* WHY TRUST IT */}
      <section aria-labelledby="trust-title" className="w-full max-w-5xl mx-auto px-4 pb-16 md:pb-24">
        <h2 id="trust-title" className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center">Don't just trust us. Check.</h2>
        <p className="text-white/75 text-center mt-3 max-w-2xl mx-auto">Privacy claims are easy to make. Relay is built so you can verify them yourself.</p>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: BadgeCheck, t: 'A safety number on both screens', b: 'It is computed on each device from both encryption keys. If the numbers match, nobody, not even our server, is listening in.', link: ['/verify-safety-number', 'How to verify'] },
            { icon: ShieldCheck, t: 'You decide what happens', b: 'New devices need your Allow. Every file needs the receiver’s Accept. Rooms can have a password.', link: ['/security', 'Security model'] },
            { icon: Github, t: 'Open code, published review', b: 'The full source is on GitHub, including an October 2026 security review listing every issue found and fixed.', link: [SITE.github, 'Read the code'] },
            { icon: Globe, t: 'Made by a real person', b: `Relay is built and maintained by ${SITE.author.name}, an independent developer. No investors, no data business.`, link: [SITE.author.url, 'About the maker'] },
          ].map(({ icon: Icon, t, b, link }) => (
            <div key={t} className={cn(panel, 'rounded-2xl p-6 flex gap-4')}>
              <Icon className="w-6 h-6 text-brand-neon shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-white">{t}</h3>
                <p className="text-white/75 mt-1.5 text-sm leading-relaxed">{b}</p>
                {link[0].startsWith('/')
                  ? <Link to={link[0]} className="inline-block mt-3 text-sm text-brand-neon underline underline-offset-2">{link[1]}</Link>
                  : <a href={link[0]} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-sm text-brand-neon underline underline-offset-2">{link[1]}</a>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section aria-labelledby="cap-title" className="w-full max-w-5xl mx-auto px-4 pb-16 md:pb-24">
        <h2 id="cap-title" className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center">Built for real-world files</h2>
        <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: HardDrive, t: 'No size limit', b: 'Chrome and Edge save straight to the folder you pick, even 100 GB.' },
            { icon: RotateCw, t: 'Survives bad Wi-Fi', b: 'If the connection drops, it resumes from where it stopped.' },
            { icon: FolderUp, t: 'Whole folders', b: 'Subfolders kept. Save into a folder or as a ZIP.' },
            { icon: Wifi, t: 'Every device', b: 'iPhone, Android, Windows, Mac, Linux, in any modern browser.' },
          ].map(({ icon: Icon, t, b }) => (
            <li key={t} className={cn(panel, 'rounded-2xl p-5')}>
              <Icon className="w-6 h-6 text-brand-neon" aria-hidden="true" />
              <h3 className="text-base font-semibold text-white mt-3">{t}</h3>
              <p className="text-white/75 mt-1.5 text-sm leading-relaxed">{b}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* SHORT FAQ */}
      <section aria-labelledby="faq-title" className="w-full max-w-3xl mx-auto px-4 pb-20 md:pb-28">
        <h2 id="faq-title" className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center">Common questions</h2>
        <div className="mt-8 flex flex-col gap-3">
          {[
            ['Is it really free?', 'Yes. Relay is free and open source with no plans, no limits and no ads. It costs very little to run because files never pass through our servers.'],
            ['Can you see my files?', 'No. Files travel directly between the two devices, encrypted with keys only those devices have. Compare the safety number on both screens to confirm.'],
            ['What if the other person is offline?', 'Both devices need to be online at the same time, because nothing is stored. If they will download later, a cloud service is the better tool.'],
            ['Is it safe to accept files?', 'You only receive what you accept, from devices you approved. As with email, only open files you expect.'],
          ].map(([q, a]) => (
            <details key={q} className={cn(panel, 'rounded-xl px-5 py-4 group')}>
              <summary className="cursor-pointer list-none flex justify-between items-center gap-4 text-white font-medium">
                {q}<span className="text-brand-neon text-xl leading-none group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="text-white/80 mt-3 text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
        <p className="text-center mt-6 text-sm"><Link to="/faq" className="text-brand-neon underline underline-offset-2">All questions</Link> · <Link to="/articles" className="text-brand-neon underline underline-offset-2">Guides</Link></p>
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
      className="flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto py-8 px-4">
      <section className={cn(panel, 'w-full p-6 md:p-9 flex flex-col items-center rounded-2xl text-center')} aria-labelledby="lobby-title">
        <h1 id="lobby-title" className="text-2xl font-bold text-white">Connect the other device</h1>
        <p className="text-white/80 text-sm mt-2 leading-relaxed">On the other phone or computer, scan this QR code with the camera, or open <b className="text-white">{window.location.host}</b> and enter the code.</p>

        <div className="p-3.5 bg-white rounded-xl mt-6" role="img" aria-label={ready ? `QR code that opens Relay and joins room ${relay.roomCode}` : 'QR code loading'}>
          {ready ? <QRCodeSVG value={link} size={176} level="M" aria-hidden="true" /> : <div className="w-[176px] h-[176px] flex items-center justify-center"><Loader2 className="w-6 h-6 text-black animate-spin" aria-hidden="true" /></div>}
        </div>

        <p className="text-white/70 text-xs uppercase tracking-[0.2em] mt-6">Room code</p>
        <p className="font-mono text-2xl md:text-3xl text-white mt-1 tracking-wide select-all" data-testid="room-code" aria-live="polite">{relay.roomCode || 'creating…'}</p>

        <div className="grid grid-cols-2 gap-2 w-full mt-5">
          <button onClick={() => copy('code')} disabled={!ready} className={cn(btnGhost, 'h-11 text-sm')}>
            {copied === 'code' ? <><Check className="w-4 h-4" aria-hidden="true" /> Copied</> : <><Copy className="w-4 h-4" aria-hidden="true" /> Copy code</>}
          </button>
          {canShare
            ? <button onClick={share} disabled={!ready} className={cn(btnGhost, 'h-11 text-sm')}><Share2 className="w-4 h-4" aria-hidden="true" /> Share link</button>
            : <button onClick={() => copy('link')} disabled={!ready} className={cn(btnGhost, 'h-11 text-sm')}>{copied === 'link' ? <><Check className="w-4 h-4" aria-hidden="true" /> Copied</> : <><Link2 className="w-4 h-4" aria-hidden="true" /> Copy link</>}</button>}
        </div>
        <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied to clipboard` : ''}</span>

        <p className="mt-6 text-sm text-white/75 flex items-center gap-2" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-brand-neon" aria-hidden="true" /> Waiting for the other device…
        </p>
        <p className="text-xs text-white/65 mt-1">You'll approve it before anything is sent. The room closes when you leave this page.</p>

        {relay.isHost && (
          <div className="w-full mt-6 pt-5 border-t border-white/10">
            {relay.passwordEnabled ? (
              <p className="text-sm text-brand-neon flex items-center gap-2 justify-center"><Lock className="w-4 h-4" aria-hidden="true" />Password required to join
                <button onClick={() => relay.setRoomPassword('')} className="text-white/75 hover:text-white underline">Remove</button></p>
            ) : pwOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2">
                <label htmlFor="room-pw" className="sr-only">Set room password</label>
                <input id="room-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a password" aria-label="Set room password"
                  className="flex-1 h-11 px-3 rounded-lg bg-white/10 border border-white/20 text-sm text-white outline-none focus:border-brand-neon placeholder-white/55" />
                <button className="px-4 h-11 rounded-lg bg-white text-black text-sm font-semibold">Lock</button>
              </form>
            ) : (
              <button onClick={() => setPwOpen(true)} className="text-sm text-white/80 hover:text-white inline-flex items-center gap-2"><KeyRound className="w-4 h-4" aria-hidden="true" />Add a password <span className="text-white/60">(optional)</span></button>
            )}
          </div>
        )}

        {relay.nearbyDevices.length > 0 && (
          <div className="w-full mt-6 pt-5 border-t border-white/10 flex flex-col gap-3">
            <h2 className="text-sm text-white/80">Or invite a device on this Wi-Fi</h2>
            <NearbyList relay={relay} devices={relay.nearbyDevices} />
          </div>
        )}

        <button onClick={relay.leaveRoom} className="mt-7 text-sm text-white/75 hover:text-white underline underline-offset-2">Cancel</button>
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
      <div className="w-full max-w-[100vw] flex flex-col z-10 flex-1 relative min-h-[calc(100vh-96px)]">
        {shared.length > 0 && (
          <div className={cn(panel, 'mx-auto mt-6 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-white max-w-xl w-[calc(100%-2rem)]')} role="status">
            <Share2 className="w-4 h-4 text-brand-neon shrink-0" aria-hidden="true" />
            <span className="flex-1 text-left">{shared.length} shared file{shared.length > 1 ? 's' : ''} ready. {hasApprovedPeer ? '' : 'Connect a device to send.'}</span>
            <button disabled={!hasApprovedPeer} onClick={() => { relay.sendFiles(shared); setShared([]); }} className="px-3 py-2 rounded-md bg-brand-neon text-black text-xs font-semibold disabled:opacity-40">Send now</button>
            <button onClick={() => setShared([])} className="px-2 py-2 text-white/75 hover:text-white text-xs">Discard</button>
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
              className="px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium shadow-2xl">
              {relay.notice}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-hidden="true"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm border-[3px] border-brand-neon/70 flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-12 h-12 text-brand-neon mb-6" />
            <p className="text-4xl font-bold text-white tracking-tight">Drop to send</p>
            <p className="text-base text-white/80 mt-3">Files and folders go straight to the connected device.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
