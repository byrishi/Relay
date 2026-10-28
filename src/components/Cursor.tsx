import { useEffect, useRef } from 'react';

const INTERACTIVE = 'a, button, summary, label, [data-cursor], [role="button"]';

/**
 * A viewfinder cursor for mouse and trackpad users: a signal square on the
 * pointer, and a bracket frame that trails behind and snaps around whatever
 * you can click. `data-cursor="Label"` on an element shows a label.
 * Not shown on touch screens; the native cursor returns over text fields.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || navigator.webdriver) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('has-cursor');

    const pos = { x: -100, y: -100 };
    const f = { x: -100, y: -100, w: 34, h: 34 };
    let target: { x: number; y: number; w: number; h: number } | null = null;
    let text = '';
    let visible = false;
    let overField = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      pos.x = e.clientX; pos.y = e.clientY;
      if (!visible) { visible = true; f.x = pos.x - 17; f.y = pos.y - 17; }
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE) as HTMLElement | null;
      overField = !!(e.target as Element | null)?.closest?.('input[type="text"], input[type="password"], textarea');
      if (el && !overField) {
        const r = el.getBoundingClientRect();
        target = r.width * r.height < 260_000 ? { x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 } : null;
        text = el.dataset.cursor || '';
      } else { target = null; text = ''; }
    };
    const onLeave = () => { visible = false; };
    const onDown = () => frame.current?.animate([{ scale: 1 }, { scale: 0.92 }, { scale: 1 }], { duration: 220 });

    const tick = () => {
      const k = still ? 1 : 0.22;
      const t = target ?? { x: pos.x - 17, y: pos.y - 17, w: 34, h: 34 };
      f.x += (t.x - f.x) * k; f.y += (t.y - f.y) * k; f.w += (t.w - f.w) * k; f.h += (t.h - f.h) * k;
      const o = visible && !overField ? '1' : '0';
      if (dot.current) { dot.current.style.transform = `translate3d(${pos.x - 4}px, ${pos.y - 4}px, 0)`; dot.current.style.opacity = o; }
      if (frame.current) {
        frame.current.style.transform = `translate3d(${f.x}px, ${f.y}px, 0)`;
        frame.current.style.width = `${f.w}px`; frame.current.style.height = `${f.h}px`;
        frame.current.style.opacity = o;
      }
      if (label.current) {
        label.current.textContent = text;
        label.current.dataset.on = text ? '1' : '0';
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerleave', onLeave);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  const corner = 'absolute w-2.5 h-2.5 border-current';
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[300] text-white mix-blend-difference">
      <div ref={frame} className="absolute left-0 top-0 opacity-0 transition-opacity duration-150">
        <span className={`${corner} left-0 top-0 border-l-[1.5px] border-t-[1.5px]`} />
        <span className={`${corner} right-0 top-0 border-r-[1.5px] border-t-[1.5px]`} />
        <span className={`${corner} left-0 bottom-0 border-l-[1.5px] border-b-[1.5px]`} />
        <span className={`${corner} right-0 bottom-0 border-r-[1.5px] border-b-[1.5px]`} />
        <span ref={label} className="absolute left-full top-full ml-1.5 mt-1 text-[13px] font-medium leading-none whitespace-nowrap" />
      </div>
      <div ref={dot} className="absolute left-0 top-0 w-2 h-2 bg-white opacity-0" />
    </div>
  );
}
