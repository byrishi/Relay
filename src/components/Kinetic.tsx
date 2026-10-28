import { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Display type that breathes: every letter sits on Aujournuit's width axis.
 * On load the line opens from condensed to its resting width; on desktop the
 * letters near the pointer stretch wide and relax as it moves on.
 */
export function KineticLine({ text, base = 4, peak = 9, radius = 260, className = '', delay = 0 }: {
  text: string; base?: number; peak?: number; radius?: number; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = ref.current!;
    const letters = Array.from(root.querySelectorAll<HTMLSpanElement>('[data-l]'));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const cur = letters.map(() => (still ? base : 1));
    const goal = letters.map(() => base);
    let opened = still;
    let raf = 0;
    let px = -1e4, py = -1e4;
    const start = window.setTimeout(() => { opened = true; }, delay);
    const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; };
    if (fine && !still) window.addEventListener('pointermove', onMove, { passive: true });

    const tick = () => {
      let moving = false;
      letters.forEach((l, i) => {
        let g = opened ? base : 1;
        if (opened && fine && !still) {
          const r = l.getBoundingClientRect();
          const d = Math.hypot(r.left + r.width / 2 - px, r.top + r.height / 2 - py);
          g = base + (peak - base) * Math.max(0, 1 - d / radius) ** 2;
        }
        goal[i] = g;
        const next = cur[i] + (goal[i] - cur[i]) * (opened && cur[i] < base - 0.05 ? 0.06 + i * 0.002 : 0.14);
        if (Math.abs(next - cur[i]) > 0.002) moving = true;
        cur[i] = next;
        l.style.setProperty('--w', next.toFixed(3));
      });
      raf = requestAnimationFrame(tick);
      void moving;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(start); window.removeEventListener('pointermove', onMove); };
  }, [text, base, peak, radius, delay]);

  return (
    <span ref={ref} className={`display block whitespace-nowrap ${className}`} aria-hidden="true">
      {Array.from(text).map((c, i) => <span key={i} data-l className="inline-block" style={{ ['--w' as string]: base, fontVariationSettings: '"wdth" var(--w)' }}>{c === ' ' ? ' ' : c}</span>)}
    </span>
  );
}

/** Wraps kinetic lines with an accessible heading. */
export function KineticHeading({ as: Tag = 'h1', label, id, children, className = '' }: { as?: 'h1' | 'h2'; label: string; id?: string; children: ReactNode; className?: string }) {
  return <Tag id={id} aria-label={label} className={className}>{children}</Tag>;
}

/** Local time, ticking, for the header's status cell. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const zone = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(now).find((p) => p.type === 'timeZoneName')?.value || '';
  return <span className="tabular-nums">{zone} {time}</span>;
}
