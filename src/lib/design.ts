import { useSyncExternalStore } from 'react';

/** The two designs people can switch between while we decide on one. */
export type Design = 'dark' | 'light';

const KEY = 'relay-design';
const THEME_COLOR: Record<Design, string> = { dark: '#05070C', light: '#FFFFFF' };

export function getDesign(): Design {
  return document.documentElement.dataset.design === 'light' ? 'light' : 'dark';
}

export function setDesign(d: Design) {
  document.documentElement.dataset.design = d;
  try { localStorage.setItem(KEY, d); } catch { /* private mode */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[d]);
  window.dispatchEvent(new Event('designchange'));
}

const subscribe = (cb: () => void) => {
  window.addEventListener('designchange', cb);
  return () => window.removeEventListener('designchange', cb);
};

export function useDesign(): Design {
  return useSyncExternalStore(subscribe, getDesign, () => 'dark');
}
