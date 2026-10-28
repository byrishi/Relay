import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { R_CELLS, R_PACKET } from '../brand/Logo';
import { closeEntry, useEntryOpen } from '../lib/entry';
import { ARTIST, TRACKS, toggleSound, useSound } from '../lib/sound';
import { setScrollLock } from '../lib/scroll';
import { Bars } from './Sound';

const ease = [0.76, 0, 0.24, 1] as const;

/**
 * The way in. The mark assembles pixel by pixel, the packet pixel leaves, and
 * the visitor chooses sound on (the default) or off. Pressing Enter is the
 * click browsers require before music may play.
 */
export default function Entry() {
  const open = useEntryOpen();
  const sound = useSound();
  const [withSound, setWithSound] = useState(true);
  const [ready, setReady] = useState(false);
  const enterRef = useRef<HTMLButtonElement>(null);
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The entry now paints its own sheet, so the pre-paint cover can go.
  useEffect(() => { document.documentElement.classList.remove('entry-pending'); }, []);

  useEffect(() => {
    if (!open) return;
    setScrollLock(true);
    const t = setTimeout(() => { setReady(true); enterRef.current?.focus({ preventScroll: true }); }, still ? 0 : 1300);
    return () => { clearTimeout(t); setScrollLock(false); };
  }, [open, still]);

  const enter = () => {
    if (withSound && !sound.on) toggleSound();
    closeEntry();
  };
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Escape') enter(); };

  const cell = 0.86;
  return (
    <AnimatePresence>
      {open && (
        <motion.div key="entry" role="dialog" aria-modal="true" aria-labelledby="entry-title" onKeyDown={onKey}
          className="fixed inset-0 z-[400] bg-signal text-white flex flex-col"
          exit={{ clipPath: 'inset(0 0 100% 0)' }} transition={{ duration: 0.9, ease }}>
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <svg viewBox="-0.5 -0.5 7 8" className="w-[112px] sm:w-[136px] h-auto overflow-visible" aria-hidden="true" shapeRendering="crispEdges">
              {R_CELLS.map(([x, y], i) => (
                <motion.g key={`${x}${y}`}
                  initial={still ? false : { opacity: 0, x: (((i * 37) % 7) - 3) * 0.7, y: (((i * 53) % 9) - 4) * 0.7 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.035 }}>
                  <rect x={x + (1 - cell) / 2} y={y + (1 - cell) / 2} width={cell} height={cell} fill="#fff" />
                </motion.g>
              ))}
              <motion.g
                initial={still ? false : { opacity: 0, x: -1.5, y: 0 }}
                animate={still ? { opacity: 1 } : { opacity: [0, 1, 1, 1], x: [-1.5, 0, 0.7, 0], y: [0, 0, -0.7, 0] }}
                transition={{ duration: 1.6, delay: 0.95, times: [0, 0.25, 0.6, 1], ease: 'easeInOut', repeat: still ? 0 : Infinity, repeatDelay: 1.8 }}>
                <rect x={R_PACKET[0] + (1 - cell) / 2} y={R_PACKET[1] + (1 - cell) / 2} width={cell} height={cell} fill="#8FA0FF" />
              </motion.g>
            </svg>
            <motion.h1 id="entry-title" className="display mt-9 text-[56px] sm:text-[80px]" style={{ ['--w' as string]: 3.4 }}
              initial={still ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}>Relay</motion.h1>
            <motion.p className="mt-3 text-[18px] sm:text-[20px] text-dev-fg-2 max-w-[30ch]"
              initial={still ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.95 }}>
              Send files straight to another device. Free, private, no upload.
            </motion.p>

            <motion.div className="mt-10 flex flex-col items-center gap-5" initial={still ? false : { opacity: 0, y: 14 }} animate={ready || still ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              <button ref={enterRef} onClick={enter}
                className="h-14 px-10 rounded-full bg-white text-signal text-[18px] font-medium hover:bg-pale active:scale-[.98] transition-[background-color,transform]">
                Enter{withSound ? ' with sound' : ''}
              </button>
              <button type="button" role="switch" aria-checked={withSound} onClick={() => setWithSound((v) => !v)}
                className="inline-flex items-center gap-3 text-[15px] text-dev-fg-2 hover:text-white min-h-11">
                <span className={`relative w-11 h-6 rounded-full transition-colors ${withSound ? 'bg-white' : 'bg-white/25'}`} aria-hidden="true">
                  <span className={`absolute top-1 w-4 h-4 rounded-full transition-[left,background-color] duration-300 ${withSound ? 'left-6 bg-signal' : 'left-1 bg-white'}`} />
                </span>
                Sound {withSound ? 'on' : 'off'}
              </button>
            </motion.div>
          </div>
          <motion.div className="px-6 pb-[max(20px,env(safe-area-inset-bottom))] flex items-center justify-center gap-3 text-[14px] text-dev-fg-2"
            initial={still ? false : { opacity: 0 }} animate={{ opacity: ready || still ? 1 : 0 }} transition={{ duration: 0.6 }}>
            <Bars on={withSound} className="text-white" />
            <span>Soundtrack: “{TRACKS[0].title}” by {ARTIST}</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
