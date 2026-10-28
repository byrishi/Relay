import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, summary, label, select, [data-cursor], [role="button"], [role="switch"]';
const FIELD = 'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"]';
const BLUE_SURFACE = '.device, .bg-signal, [data-surface="blue"]';

/**
 * Cursor for mouse and trackpad users.
 * - A small dot sits exactly on the pointer; a ring follows with a soft spring.
 * - Over anything you can click, the ring wraps the element, takes its corner
 *   radius, and leans a little toward the pointer. `data-cursor="Label"` adds
 *   a label pill.
 * - Over text fields it steps aside for the normal text cursor.
 * - Ultramarine on paper, white on the blue app sheet.
 * - Pressing squeezes it. It sleeps when the pointer is still.
 * Not shown on touch screens or when reduced motion is requested.
 */
export default function Cursor() {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || navigator.webdriver) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('has-cursor');

    const SIZE = 30;
    const p = { x: -100, y: -100 };
    // ring state + velocity (critically damped spring)
    const r = { x: -100, y: -100, w: SIZE, h: SIZE, rad: SIZE / 2 };
    const v = { x: 0, y: 0, w: 0, h: 0 };
    let target: HTMLElement | null = null;
    let visible = false, field = false, down = false, blue = false;
    let raf = 0, last = performance.now(), idle = 0;

    const goal = () => {
      if (target && target.isConnected) {
        const b = target.getBoundingClientRect();
        if (b.width * b.height < 200_000) {
          const pad = 6;
          const cs = getComputedStyle(target);
          const rad = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, b.height / 2) + pad;
          // lean toward the pointer, a little
          const lx = (p.x - (b.left + b.width / 2)) * 0.08, ly = (p.y - (b.top + b.height / 2)) * 0.12;
          return { x: b.left - pad + lx, y: b.top - pad + ly, w: b.width + pad * 2, h: b.height + pad * 2, rad };
        }
      }
      const s = down ? SIZE * 0.7 : SIZE;
      return { x: p.x - s / 2, y: p.y - s / 2, w: s, h: s, rad: s / 2 };
    };

    const paint = () => {
      const o = visible && !field ? '1' : '0';
      if (dot.current) {
        dot.current.style.transform = `translate3d(${p.x - 3}px, ${p.y - 3}px, 0) scale(${down ? 0.6 : target ? 0 : 1})`;
        dot.current.style.opacity = o;
      }
      if (ring.current) {
        ring.current.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
        ring.current.style.width = `${r.w}px`;
        ring.current.style.height = `${r.h}px`;
        ring.current.style.borderRadius = `${r.rad}px`;
        ring.current.style.opacity = o;
      }
      root.current?.setAttribute('data-blue', blue ? '1' : '0');
      root.current?.setAttribute('data-on', target ? '1' : '0');
    };

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const g = goal();
      const k = 420, c = 2 * Math.sqrt(k); // stiffness, critical damping
      let moving = false;
      (['x', 'y', 'w', 'h'] as const).forEach((key) => {
        const a = k * (g[key] - r[key]) - c * v[key];
        v[key] += a * dt; r[key] += v[key] * dt;
        if (Math.abs(g[key] - r[key]) > 0.1 || Math.abs(v[key]) > 0.1) moving = true;
      });
      r.rad += (g.rad - r.rad) * Math.min(1, dt * 18);
      paint();
      idle = moving ? 0 : idle + 1;
      raf = idle > 30 ? 0 : requestAnimationFrame(tick); // sleep when settled
    };
    const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      p.x = e.clientX; p.y = e.clientY;
      if (!visible) { visible = true; r.x = p.x - SIZE / 2; r.y = p.y - SIZE / 2; }
      const el = e.target as Element | null;
      field = !!el?.closest?.(FIELD);
      blue = !!el?.closest?.(BLUE_SURFACE);
      const hit = (el?.closest?.(INTERACTIVE) as HTMLElement | null) || null;
      if (hit !== target) {
        target = hit;
        const text = hit?.dataset.cursor || '';
        if (label.current) { label.current.textContent = text; label.current.dataset.show = text ? '1' : '0'; }
      }
      wake();
    };
    const onDown = () => { down = true; wake(); };
    const onUp = () => { down = false; wake(); };
    const onLeave = () => { visible = false; paint(); };
    const onScroll = () => wake();

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    wake();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" className="cursor pointer-events-none fixed inset-0 z-[500]">
      <div ref={ring} className="cursor-ring absolute left-0 top-0 opacity-0">
        <span ref={label} className="cursor-label" data-show="0" />
      </div>
      <div ref={dot} className="cursor-dot absolute left-0 top-0 w-1.5 h-1.5 rounded-full opacity-0" />
    </div>
  );
}
