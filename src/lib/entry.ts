import { useSyncExternalStore } from 'react';

/**
 * The entry screen shows once per visit, on the home page only. Visitors who
 * arrive on a guide from search, or open a room link to receive files, go
 * straight to what they came for.
 */
const KEY = 'relay-entered';
const bot = () => typeof navigator !== 'undefined' && (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent));

function shouldShow() {
  if (typeof window === 'undefined' || bot()) return false;
  if (location.pathname !== '/') return false;
  const q = new URLSearchParams(location.search);
  if (q.has('code') || q.has('share')) return false;
  try { return !sessionStorage.getItem(KEY); } catch { return false; }
}

let open = shouldShow();
const subs = new Set<() => void>();
export function closeEntry() {
  open = false;
  try { sessionStorage.setItem(KEY, '1'); localStorage.setItem('relay-sound-invite', '1'); } catch { /* private mode */ }
  subs.forEach((f) => f());
}
export const useEntryOpen = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => open, () => false);
