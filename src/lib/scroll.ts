import Lenis from 'lenis';

/** Smooth scrolling (Lenis). Off for reduced motion and for automated browsers. */
let lenis: Lenis | null = null;

export function startSmoothScroll() {
  if (lenis || typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.webdriver) return;
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 });
  const raf = (t: number) => { lenis?.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}

export function scrollToEl(el: Element | null) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -160 });
  else el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

/** Freeze page scrolling while a dialog or the menu is open. */
export function setScrollLock(on: boolean) {
  document.body.style.overflow = on ? 'hidden' : '';
  if (on) lenis?.stop(); else lenis?.start();
}
