import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Lock, KeyRound, Share2, Link2, Plus } from 'lucide-react';
import type { Relay } from '../../hooks/useRelay';
import RelayQR from '../../components/RelayQR';
import { NearbyList, Staged, StagedList } from './shared';
import { useMedia } from '../../lib/useMedia';

const ease = [0.76, 0, 0.24, 1] as const;

/** Waiting room: share the code or QR, optionally stage files, wait for the other device. */
export default function Lobby({ relay, staged, onClearStaged, onStage }: { relay: Relay; staged: Staged; onClearStaged: () => void; onStage: (g: Staged) => void }) {
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
  const wide = useMedia('(min-width: 768px)');
  const qrSize = wide ? 264 : 248;

  return (
    <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="wrap pt-3 md:pt-5 pb-10">
      <motion.section aria-labelledby="lobby-title" className="device" initial={{ clipPath: 'inset(0 0 100% 0 round 28px)' }} animate={{ clipPath: 'inset(0 0 0% 0 round 28px)' }} transition={{ duration: 0.8, ease }}>
        <div className="px-6 md:px-10 pt-9 md:pt-12 pb-6 md:pb-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <h1 id="lobby-title" className="display text-[48px] sm:text-[64px] md:text-[88px] max-w-[12ch]" style={{ ['--w' as string]: 3.4 }}>Connect the other device</h1>
          <p className="text-[17px] md:text-[19px] text-dev-fg-2 max-w-[34ch] leading-snug">Scan the QR code, or open <span className="text-white">{window.location.host}</span> on the other device and enter the code.</p>
        </div>
        <div className="grid md:grid-cols-[auto_1fr] gap-3 p-3 md:p-4">
          <div className="rounded-[20px] bg-white p-4 md:p-5 flex flex-col items-center justify-center">
            {ready ? <RelayQR value={link} size={qrSize} label={`QR code that opens Relay and joins room ${relay.roomCode}`} /> : (
              <div className="flex items-center justify-center text-ink-3" style={{ width: qrSize, height: qrSize }} role="img" aria-label="QR code loading"><span className="blink">Making the code…</span></div>
            )}
            <p className="text-[14px] text-ink-3 mt-3">Point the other device's camera here</p>
          </div>
          <div className="rounded-[20px] bg-dev-2 p-5 md:p-7 flex flex-col min-w-0">
            <p className="text-dev-fg-2">Room code</p>
            <p className="font-mono text-[26px] md:text-[34px] text-white mt-1 select-all break-all" data-testid="room-code" aria-live="polite">{relay.roomCode || 'creating…'}</p>
            <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
              {canShare
                ? <button onClick={share} disabled={!ready} className="key key-signal"><Share2 className="w-5 h-5" aria-hidden="true" /> Share link</button>
                : <button onClick={() => copy('link')} disabled={!ready} className="key key-signal">{copied === 'link' ? <><Check className="w-5 h-5" aria-hidden="true" /> Copied</> : <><Link2 className="w-5 h-5" aria-hidden="true" /> Copy link</>}</button>}
              <button onClick={() => copy('code')} disabled={!ready} className="key key-dark">
                {copied === 'code' ? <><Check className="w-5 h-5" aria-hidden="true" /> Copied</> : <><Copy className="w-5 h-5" aria-hidden="true" /> Copy code</>}
              </button>
            </div>
            <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied to clipboard` : ''}</span>

            <div className="mt-6">
              {staged.length ? <StagedList staged={staged} onClear={onClearStaged} /> : (
                <button onClick={() => fileInput.current?.click()} className="text-[15.5px] text-dev-fg-2 hover:text-white inline-flex items-start gap-2 text-left min-h-11"><Plus className="w-5 h-5 shrink-0" aria-hidden="true" />Add files now. They send once the other device is in.</button>
              )}
              <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { if (e.target.files?.length) onStage([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
            </div>

            {relay.nearbyDevices.length > 0 && (
              <div className="mt-auto pt-6">
                <h2 className="text-dev-fg-2">Or invite a device on this Wi-Fi</h2>
                <NearbyList relay={relay} devices={relay.nearbyDevices} />
              </div>
            )}
          </div>
        </div>
      </motion.section>

      <div className="mt-6 flex flex-col md:flex-row md:items-center gap-x-8 gap-y-3">
        <p className="text-[17px] flex items-center gap-3" role="status">
          <span className="w-2.5 h-2.5 rounded-full bg-signal blink" aria-hidden="true" />Waiting for the other device. You approve it before anything is sent.
        </p>
        <div className="md:ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
          {relay.isHost && (
            relay.passwordEnabled ? (
              <p className="text-[15.5px] text-ok flex items-center gap-2"><Lock className="w-4 h-4" aria-hidden="true" />Password required to join
                <button onClick={() => relay.setRoomPassword('')} className="link text-ink-2 ml-1 min-h-11">Remove</button></p>
            ) : pwOpen ? (
              <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2">
                <label htmlFor="room-pw" className="sr-only">Set room password</label>
                <input id="room-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a password"
                  className="field w-56 h-11 px-4 text-[16px]" />
                <button className="btn btn-signal h-11">Lock</button>
              </form>
            ) : (
              <button onClick={() => setPwOpen(true)} className="min-h-11 text-[15.5px] text-ink-2 hover:text-signal inline-flex items-center gap-2"><KeyRound className="w-4 h-4" aria-hidden="true" />Add a password</button>
            )
          )}
          <button onClick={relay.leaveRoom} className="min-h-11 text-[15.5px] text-ink-2 hover:text-danger">Cancel</button>
        </div>
      </div>
    </motion.div>
  );
}
