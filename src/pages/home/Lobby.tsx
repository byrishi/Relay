import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, Lock, KeyRound, Share2, Loader2, Link2, Plus } from 'lucide-react';
import type { Relay } from '../../hooks/useRelay';
import RelayQR from '../../components/RelayQR';
import { NearbyList, Staged, StagedList } from './shared';
import { useMedia } from '../../lib/useMedia';

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

  const qr = (
    <div className="flex flex-col items-center">
      {ready ? <RelayQR value={link} size={240} label={`QR code that opens Relay and joins room ${relay.roomCode}`} /> : (
        <div className="w-[240px] h-[240px] rounded-2xl bg-tint/[0.04] ring2 flex items-center justify-center" role="img" aria-label="QR code loading"><Loader2 className="w-6 h-6 text-fg-3 animate-spin" aria-hidden="true" /></div>
      )}
      <p className="text-[13px] text-fg-3 mt-4">Scan with the other device's camera</p>
    </div>
  );

  return (
    <motion.div key="lobby" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      className="relative w-full max-w-[960px] mx-auto px-4 md:px-6 py-6 md:py-20">
      <div className="hero-glow absolute left-1/2 -translate-x-1/2 -top-40 w-[900px] h-[600px] pointer-events-none" aria-hidden="true" />
      <section className="relative window" aria-labelledby="lobby-title">
        <div className="window-in grid md:grid-cols-[auto_1fr]">
          {wide && <div className="flex p-10 items-center justify-center border-r border-line">{qr}</div>}

          <div className="p-5 md:p-10 flex flex-col">
            <h1 id="lobby-title" className="text-[26px] md:text-[34px] font-semibold tracking-[var(--tr-2)] leading-[1.1]">Connect the other device</h1>
            <p className="text-fg-2 text-[15px] mt-2.5 leading-relaxed max-w-[46ch]">Scan the QR code, or open <span className="text-fg">{window.location.host}</span> on the other device and enter this code.</p>

            <p className="text-[13px] text-fg-3 mt-6 md:mt-8">Room code</p>
            <p className="font-mono text-[24px] md:text-[30px] text-fg mt-1 tracking-wide select-all break-all" data-testid="room-code" aria-live="polite">{relay.roomCode || 'creating…'}</p>

            <div className="grid grid-cols-2 sm:flex gap-2 mt-5">
              {canShare
                ? <button onClick={share} disabled={!ready} className="btn btn-w h-11 sm:h-9"><Share2 className="w-4 h-4" aria-hidden="true" /> Share link</button>
                : <button onClick={() => copy('link')} disabled={!ready} className="btn btn-w h-11 sm:h-9">{copied === 'link' ? <><Check className="w-4 h-4" aria-hidden="true" /> Copied</> : <><Link2 className="w-4 h-4" aria-hidden="true" /> Copy link</>}</button>}
              <button onClick={() => copy('code')} disabled={!ready} className="btn btn-g h-11 sm:h-9">
                {copied === 'code' ? <><Check className="w-4 h-4 text-ok" aria-hidden="true" /> Copied</> : <><Copy className="w-4 h-4" aria-hidden="true" /> Copy code</>}
              </button>
            </div>
            <span className="sr-only" aria-live="polite">{copied ? `${copied === 'code' ? 'Code' : 'Link'} copied to clipboard` : ''}</span>

            {/* On phones the QR sits under the code, where it's easy to show to the other person */}
            {!wide && <div className="mt-7 pt-7 border-t border-line">{qr}</div>}

            <div className="mt-7">
              {staged.length ? <StagedList staged={staged} onClear={onClearStaged} /> : (
                <button onClick={() => fileInput.current?.click()} className="text-[14px] text-fg-2 hover:text-fg inline-flex items-start gap-2 text-left min-h-11 md:min-h-0"><Plus className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />Add files now. They send once the other device is in.</button>
              )}
              <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true"
                onChange={(e) => { if (e.target.files?.length) onStage([{ files: Array.from(e.target.files), paths: [] }]); e.target.value = ''; }} />
            </div>

            <div className="mt-6 md:mt-7 pt-6 border-t border-line">
              <p className="text-[14.5px] text-fg flex items-center gap-2.5" role="status">
                <span className="relative flex w-2 h-2" aria-hidden="true"><span className="absolute inset-0 rounded-full bg-acc animate-ping" /><span className="relative w-2 h-2 rounded-full bg-acc" /></span>
                Waiting for the other device…
              </p>
              <p className="text-[13px] text-fg-3 mt-1.5">You'll approve it before anything is sent. The room closes when you leave this page.</p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {relay.isHost && (
                relay.passwordEnabled ? (
                  <p className="text-[14px] text-ok flex items-center gap-2"><Lock className="w-4 h-4" aria-hidden="true" />Password required to join
                    <button onClick={() => relay.setRoomPassword('')} className="text-fg-2 hover:text-fg underline underline-offset-4 ml-1">Remove</button></p>
                ) : pwOpen ? (
                  <form onSubmit={(e) => { e.preventDefault(); if (pw) { relay.setRoomPassword(pw); setPw(''); setPwOpen(false); } }} className="flex gap-2 max-w-sm">
                    <label htmlFor="room-pw" className="sr-only">Set room password</label>
                    <input id="room-pw" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Choose a password" aria-label="Set room password"
                      className="field flex-1 min-w-0 h-11 md:h-9 px-3 text-[16px] md:text-[14px]" />
                    <button className="btn btn-w h-11 md:h-9">Lock</button>
                  </form>
                ) : (
                  <button onClick={() => setPwOpen(true)} className="self-start min-h-11 md:min-h-0 text-[14px] text-fg-2 hover:text-fg inline-flex items-center gap-2"><KeyRound className="w-4 h-4" aria-hidden="true" />Add a password (optional)</button>
                )
              )}
              {relay.nearbyDevices.length > 0 && (
                <div>
                  <h2 className="text-[13px] font-medium text-fg-3">Or invite a device on this Wi-Fi</h2>
                  <div className="mt-1.5 -mx-2"><NearbyList relay={relay} devices={relay.nearbyDevices} /></div>
                </div>
              )}
              <button onClick={relay.leaveRoom} className="self-start min-h-11 md:min-h-0 text-[14px] text-fg-2 hover:text-fg">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
