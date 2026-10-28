import { useSyncExternalStore } from 'react';

/**
 * The Relay soundtrack: "Relay — Straight", then "Relay — Across", on a loop.
 * One shared player, so every sound control on the page shows the same state.
 * Nothing downloads until someone presses play.
 *
 * Files stream from jsDelivr's free CDN (straight from the GitHub repo), so
 * music never counts against the host's bandwidth; this server is the fallback.
 */
const CDN = 'https://cdn.jsdelivr.net/gh/byrishi/Relay@main/public';
export const TRACKS = [
  { file: '/audio/relay-straight.mp3', title: 'Relay — Straight' },
  { file: '/audio/relay-across.mp3', title: 'Relay — Across' },
];
export const ARTIST = 'Thepla Theorist and Rishi Shah';
const VOLUME = 0.7;

type State = { on: boolean; track: number; loading: boolean };
let state: State = { on: false, track: 0, loading: false };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };

let el: HTMLAudioElement | null = null;
let fade = 0;
const local = () => location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const srcFor = (i: number, fallback = false) => (fallback || local() ? '' : CDN) + TRACKS[i].file;

function meta() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: TRACKS[state.track].title, artist: ARTIST, album: 'Relay',
    artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
}

function ramp(to: number, done?: () => void) {
  if (!el) return;
  cancelAnimationFrame(fade);
  const a = el, from = a.volume, t0 = performance.now(), ms = 900;
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / ms);
    a.volume = Math.min(1, Math.max(0, from + (to - from) * (1 - Math.pow(1 - p, 2))));
    if (p < 1) fade = requestAnimationFrame(step); else done?.();
  };
  fade = requestAnimationFrame(step);
}

function player() {
  if (el) return el;
  el = new Audio();
  el.preload = 'none';
  el.addEventListener('ended', () => {
    set({ track: (state.track + 1) % TRACKS.length });
    el!.src = srcFor(state.track);
    meta();
    el!.play().catch(() => set({ on: false }));
  });
  el.addEventListener('waiting', () => set({ loading: true }));
  el.addEventListener('playing', () => set({ loading: false }));
  // CDN unreachable or the file isn't published yet: use this server's copy.
  el.addEventListener('error', () => {
    if (!el || !el.src.startsWith(CDN)) { set({ on: false, loading: false }); return; }
    el.src = srcFor(state.track, true);
    if (state.on) el.play().catch(() => set({ on: false }));
  });
  return el;
}

export function toggleSound() {
  const a = player();
  if (state.on) { set({ on: false, loading: false }); ramp(0, () => a.pause()); return; }
  if (!a.src) a.src = srcFor(state.track);
  a.volume = 0;
  set({ on: true, loading: a.readyState < 3 });
  meta();
  a.play().then(() => ramp(VOLUME)).catch(() => set({ on: false, loading: false }));
}

export function useSound() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => state);
}
