import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ARTIST, TRACKS, toggleSound, useSound } from '../lib/sound';

/** Equaliser bars: still when off, moving while the music plays. */
export function Bars({ on, className = '' }: { on: boolean; className?: string }) {
  return (
    <span className={`flex items-end gap-[2px] h-3.5 w-4 ${className}`} aria-hidden="true">
      {[0.55, 1, 0.7, 0.85].map((h, i) => (
        <span key={i} className={`w-[3px] rounded-full bg-current ${on ? 'eq' : 'opacity-60'}`} style={{ height: on ? undefined : `${h * 35}%`, animationDelay: `${i * -0.23}s` }} />
      ))}
    </span>
  );
}

/** The Sound key in the header. */
export default function Sound({ className = '' }: { className?: string }) {
  const { on, track } = useSound();
  return (
    <button onClick={toggleSound} aria-pressed={on} data-cursor={on ? 'Mute' : 'Play'}
      title={on ? `Playing ${TRACKS[track].title} by ${ARTIST}` : 'Play the Relay soundtrack'}
      className={`h-10 pl-3 pr-3.5 inline-flex items-center gap-2 rounded-full text-[15px] transition-colors ${on ? 'bg-pale text-signal' : 'text-ink-2 hover:text-ink hover:bg-bg-2 shadow-[inset_0_0_0_1px_var(--color-line)]'} ${className}`}>
      <Bars on={on} />
      Sound<span className="sr-only">{on ? ' on' : ' off'}</span>
    </button>
  );
}

/**
 * Tells first-time visitors that Relay has a soundtrack. Browsers never allow
 * music to start on its own, so this asks once; the answer is remembered.
 */
export function SoundInvite() {
  const { on } = useSound();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (navigator.webdriver || localStorage.getItem('relay-sound-invite') || sessionStorage.getItem('relay-entered') || location.pathname === '/') return;
    } catch { return; }
    const t = setTimeout(() => setShow(true), 2600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { if (on) close(); }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setShow(false); try { localStorage.setItem('relay-sound-invite', '1'); } catch { /* private mode */ } };

  return (
    <AnimatePresence>
      {show && (
        <motion.div aria-label="Soundtrack" role="dialog"
          initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed z-[90] left-3 right-3 bottom-[max(12px,env(safe-area-inset-bottom))] sm:left-6 sm:right-auto sm:bottom-6 sm:w-[380px] rounded-[24px] bg-ink text-white p-5 shadow-[0_30px_80px_-20px_rgb(14_18_51/.6)]">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-signal flex items-center justify-center shrink-0"><Bars on className="text-white" /></span>
            <div className="min-w-0">
              <p className="font-medium">Relay has its own soundtrack</p>
              <p className="text-[14px] text-white/70 truncate">“{TRACKS[0].title}” by {ARTIST}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={toggleSound} className="btn h-11 flex-1 bg-white text-signal hover:bg-pale">Play while I send</button>
            <button onClick={close} className="btn h-11 px-4 text-white/80 hover:text-white">Not now</button>
          </div>
          <p className="mt-3 text-[13px] text-white/55">Turn it on or off any time with the Sound key at the top.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
