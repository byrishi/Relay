import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, QrCode, UploadCloud, Copy, Check, Lock, Zap, HardDrive, Laptop, Smartphone, Tablet, Monitor, Wifi, KeyRound, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '../lib/utils';
import { useRelay, Relay, NearbyDevice } from '../hooks/useRelay';
import Connected from '../components/relay/Connected';
import { collectDropped } from '../components/relay/format';
import { takeSharedFiles } from '../lib/share';

const glass = 'bg-[#070a16]/60 backdrop-blur-2xl border border-white/[0.08] glow-soft';

function KindIcon({ kind, className }: { kind: string; className?: string }) {
  if (kind === 'phone') return <Smartphone className={className} />;
  if (kind === 'tablet') return <Tablet className={className} />;
  if (kind === 'laptop') return <Laptop className={className} />;
  return <Monitor className={className} />;
}

function NearbyList({ relay, devices }: { relay: Relay; devices: NearbyDevice[] }) {
  if (!devices.length) {
    return <p className="text-xs text-white/40 flex items-center gap-2 justify-center"><Wifi className="w-3.5 h-3.5" />Open Relay on another device on this network and it will appear here.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2 justify-center" data-testid="nearby">
      {devices.map((d) => (
        <button key={d.id} onClick={() => relay.inviteNearby(d.id)}
          className="px-3 py-2 rounded-lg bg-white/[0.06] border border-white/15 hover:border-brand-neon/60 hover:bg-white/10 text-sm text-white flex items-center gap-2 transition-colors">
          <KindIcon kind={d.kind} className="w-4 h-4 text-brand-neon" /> {d.name} <ArrowRight className="w-3.5 h-3.5 opacity-50" />
        </button>
      ))}
    </div>
  );
}

function Landing({ relay }: { relay: Relay }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const submit = () => relay.joinRoom(code, relay.needsPassword ? password : undefined);

  return (
    <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      className="w-full flex flex-col items-center flex-1 relative overflow-hidden">
      <div className="w-full min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-96px)] flex flex-col justify-center items-center text-center px-4 relative z-10 max-w-5xl mx-auto py-16 md:py-24">
        <a href="https://github.com/byrishi/Relay" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-10 backdrop-blur-md hover:bg-white/15 hover:border-brand-neon/50 transition-all">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse" />
          <span className="font-pixel-line tracking-[0.2em] text-[10px] uppercase text-brand-neon">Relay / free &amp; open source</span>
        </a>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[5.5rem] font-bold tracking-tighter text-white mb-6 leading-[1.05]">
          Transfer files directly.<br /><span className="text-luminous">Without the cloud.</span>
        </h1>
        <p className="text-lg md:text-xl text-white/85 max-w-xl mb-12 leading-relaxed font-medium mx-auto [text-shadow:0_1px_18px_rgba(3,4,10,0.95),0_0_2px_rgba(3,4,10,0.9)]">
          Peer-to-peer and encrypted end to end. No accounts, no size limits, completely free. Your files go straight from your device to theirs.
        </p>

        <div className="w-full max-w-xl flex flex-col sm:flex-row gap-4 items-center">
          <button onClick={relay.createRoom}
            className="w-full sm:w-1/2 h-14 bg-brand-neon text-black font-semibold rounded-[8px] hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-3 group">
            Start Transfer <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="relative w-full sm:w-1/2 h-14">
            <input type="text" placeholder="Enter code, e.g. amber-fox-123" maxLength={48} value={code} aria-label="Room code"
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              className="w-full h-full px-5 pr-14 rounded-[8px] bg-white/10 hover:bg-white/15 border border-white/20 focus:border-brand-neon focus:bg-white/20 text-white placeholder-white/45 outline-none transition-all text-sm backdrop-blur-md" />
            <button onClick={submit} disabled={!code} aria-label="Join"
              className="absolute right-1.5 top-1.5 bottom-1.5 w-12 flex items-center justify-center bg-white/10 hover:bg-white hover:text-black rounded-[6px] disabled:opacity-30 text-white/70">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {relay.needsPassword && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-xl mt-4 flex gap-3">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                <input type="password" autoFocus placeholder="Room password" value={password} aria-label="Room password"
                  onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                  className="w-full h-12 pl-10 pr-4 rounded-[8px] bg-white/10 border border-yellow-300/40 focus:border-brand-neon text-white outline-none text-sm" />
              </div>
              <button onClick={submit} className="px-5 h-12 rounded-[8px] bg-white text-black text-sm font-semibold">Unlock</button>
            </motion.div>
          )}
        </AnimatePresence>
        {relay.joinError && <p className="mt-5 text-red-300 text-sm font-medium" role="alert">{relay.joinError}</p>}

        <div className="mt-12 w-full max-w-2xl flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-[0.25em] font-pixel-grid text-white/40">Nearby · you appear as {relay.deviceName}</span>
          <NearbyList relay={relay} devices={relay.nearbyDevices} />
        </div>
      </div>

      <div className="w-full relative z-10 py-28 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {[
            { icon: <Lock className="w-7 h-7" />, title: 'Encrypted end to end', body: 'Files travel over WebRTC, which always encrypts with DTLS. Compare the safety number on both screens to confirm nobody — not even our server — sits in the middle.' },
            { icon: <HardDrive className="w-7 h-7" />, title: 'No size limits', body: 'Chrome and Edge stream straight to the folder you choose, so even 100 GB files never pass through memory. Interrupted transfers pick up where they stopped.' },
            { icon: <Zap className="w-7 h-7" />, title: 'As fast as your network', body: 'No upload-then-download. On the same Wi-Fi, files move at local network speed; across the internet, at the slower of the two connections.' },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-5 p-6 md:p-8 bg-[#070a16]/40 backdrop-blur-2xl border border-white/5 hover:border-brand-neon/30 rounded-3xl transition-all group text-left">
              <div className="w-14 h-14 bg-white/[0.04] border border-surface-border rounded-2xl flex items-center justify-center text-white group-hover:text-brand-neon">{f.icon}</div>
              <h3 className="text-2xl font-bold text-white tracking-tight">{f.title}</h3>
              <p className="text-white/75 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Lobby({ relay }: { relay: Relay }) {
  const [copied, setCopied] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const link = `${window.location.origin}/?code=${relay.roomCode}`;
  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
      className="flex flex-col items-center justify-center w-full max-w-md mx-auto my-auto py-10 px-4">
      <div className={cn(glass, 'w-full p-8 md:p-10 flex flex-col items-center rounded-[12px]')}>
        <div className="w-14 h-14 bg-white flex items-center justify-center mb-6 rounded-[12px]"><QrCode className="w-7 h-7 text-black" /></div>
        <h2 className="text-xl font-pixel-square text-white mb-2 tracking-tight uppercase">Ready to connect</h2>
        <p className="text-white/75 text-center text-sm mb-8">Scan the QR or share the code. You'll approve the device before anything is sent.</p>
        <div className="p-4 bg-white rounded-lg mb-8">
          <QRCodeSVG value={link} size={176} level="M" />
        </div>
        <span className="text-white/45 text-[10px] uppercase font-pixel-line tracking-[0.2em] mb-2">Room code</span>
        <button onClick={copy} data-testid="room-code"
          className="w-full text-2xl md:text-3xl font-pixel-square text-white bg-black/25 px-4 py-6 border border-white/10 rounded-lg text-center relative group hover:border-white/25">
          {relay.roomCode || '…'}
          <span className="absolute inset-0 rounded-lg flex items-center justify-center bg-[#0a0a0a]/95 opacity-0 group-hover:opacity-100 transition-opacity text-sm text-white font-sans font-medium gap-2">
            {copied ? <><Check className="w-4 h-4" /> Link copied</> : <><Copy className="w-4 h-4" /> Copy invite link</>}
          </span>
        </button>

        {relay.isHost && (
          <div className="w-full mt-5">
            {relay.passwordEnabled ? (
              <p className="text-xs text-brand-neon flex items-center gap-2 justify-center"><Lock className="w-3.5 h-3.5" />Password required to join
                <button onClick={() => relay.setRoomPassword('')} className="text-white/40 hover:text-white underline">remove</button></p>
            ) : pwOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2">
                <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Set a password" aria-label="Set room password"
                  className="flex-1 h-10 px-3 rounded-md bg-white/10 border border-white/15 text-sm text-white outline-none focus:border-brand-neon" />
                <button className="px-3 h-10 rounded-md bg-white text-black text-xs font-semibold">Lock</button>
              </form>
            ) : (
              <button onClick={() => setPwOpen(true)} className="text-xs text-white/50 hover:text-white flex items-center gap-2 mx-auto"><KeyRound className="w-3.5 h-3.5" />Add a password</button>
            )}
          </div>
        )}

        {relay.nearbyDevices.length > 0 && (
          <div className="w-full mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
            <span className="text-[10px] uppercase tracking-[0.25em] font-pixel-grid text-white/40 text-center">Or invite a nearby device</span>
            <NearbyList relay={relay} devices={relay.nearbyDevices} />
          </div>
        )}

        <button onClick={relay.leaveRoom} className="mt-8 tracking-widest text-[10px] font-bold text-white/50 hover:text-white uppercase font-mono">Cancel</button>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const relay = useRelay();
  const [dragging, setDragging] = useState(false);
  const [shared, setShared] = useState<File[]>([]);

  // Files handed to us by the OS share sheet (installed app)
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

  const hasApprovedPeer = Object.values(relay.peers).some((p: any) => p.approved && p.connected);

  return (
    <div className="flex-1 flex flex-col items-center justify-start w-full relative h-full"
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { e.preventDefault(); if (relay.appState === 'CONNECTED') setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); if (e.currentTarget === e.target) setDragging(false); }}>
      <div className="w-full max-w-[100vw] flex flex-col z-10 flex-1 relative min-h-[calc(100vh-96px)]">
        {shared.length > 0 && (
          <div className={cn(glass, 'mx-auto mt-6 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-white max-w-xl w-[calc(100%-2rem)]')}>
            <Share2 className="w-4 h-4 text-brand-neon shrink-0" />
            <span className="flex-1 text-left">{shared.length} shared file{shared.length > 1 ? 's' : ''} ready. {hasApprovedPeer ? '' : 'Connect a device to send.'}</span>
            <button disabled={!hasApprovedPeer} onClick={() => { relay.sendFiles(shared); setShared([]); }}
              className="px-3 py-1.5 rounded-md bg-brand-neon text-black text-xs font-semibold disabled:opacity-30">Send now</button>
            <button onClick={() => setShared([])} className="text-white/40 hover:text-white text-xs">Discard</button>
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

      {/* nearby invitation */}
      <AnimatePresence>
        {relay.nearbyInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className={cn(glass, 'max-w-sm w-full rounded-xl p-6 text-center')} data-testid="nearby-invite">
              <Wifi className="w-6 h-6 text-brand-neon mx-auto mb-3" />
              <p className="text-white font-semibold">{relay.nearbyInvite.name}</p>
              <p className="text-white/60 text-sm mt-1 mb-6">wants to connect from your network.</p>
              <div className="flex gap-3">
                <button onClick={() => relay.answerNearbyInvite(true)} className="flex-1 py-2.5 rounded-lg bg-brand-neon text-black font-semibold text-sm">Connect</button>
                <button onClick={() => relay.answerNearbyInvite(false)} className="flex-1 py-2.5 rounded-lg bg-white/10 text-white text-sm">Decline</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {relay.notice && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-lg bg-white text-black text-sm font-medium shadow-2xl">
            {relay.notice}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm border-[3px] border-brand-neon/70 flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-12 h-12 text-brand-neon animate-pulse mb-6" />
            <h2 className="text-4xl font-bold text-white tracking-tight">Drop to send</h2>
            <p className="text-[10px] font-pixel-square tracking-[0.3em] text-brand-neon mt-5 uppercase">Files and folders</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
