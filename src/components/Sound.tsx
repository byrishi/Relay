import { useEffect, useRef, useState } from 'react';

/**
 * Background music, off until someone asks for it. Two parts of the same track
 * play in turn, on a loop: "Relay — Straight", then "Relay — Across".
 * Nothing downloads until the first press.
 */
// Streamed from jsDelivr's free CDN (straight from the GitHub repo), so music
// never counts against the host's bandwidth. Falls back to this server.
const CDN = 'https://cdn.jsdelivr.net/gh/byrishi/Relay@main/public';
const TRACKS = [
  { file: '/audio/relay-straight.mp3', title: 'Relay — Straight' },
  { file: '/audio/relay-across.mp3', title: 'Relay — Across' },
];
const srcFor = (i: number, local = false) => (local || location.hostname === 'localhost' ? '' : CDN) + TRACKS[i].file;
const ARTIST = 'Thepla Theorist, Rishi Shah';
const VOLUME = 0.7;

export default function Sound({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [track, setTrack] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef(0);
  const playing = useRef(false);
  useEffect(() => { playing.current = on; }, [on]);

  const ramp = (el: HTMLAudioElement, to: number, done?: () => void) => {
    cancelAnimationFrame(fade.current);
    const from = el.volume, t0 = performance.now(), ms = 700;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      el.volume = from + (to - from) * p;
      if (p < 1) fade.current = requestAnimationFrame(step); else done?.();
    };
    fade.current = requestAnimationFrame(step);
  };

  const get = () => {
    if (!audio.current) {
      const el = new Audio();
      el.preload = 'none';
      el.addEventListener('ended', () => setTrack((i) => (i + 1) % TRACKS.length));
      // CDN unreachable (or the file isn't published yet): use this server's copy.
      el.addEventListener('error', () => {
        if (!el.src.startsWith(CDN)) return;
        const i = TRACKS.findIndex((t) => el.src.endsWith(t.file));
        el.src = srcFor(i < 0 ? 0 : i, true);
        if (playing.current) el.play().catch(() => setOn(false));
      });
      audio.current = el;
    }
    return audio.current;
  };

  // Load the current part whenever it changes; keep playing if sound is on.
  useEffect(() => {
    if (!audio.current) return;
    const el = audio.current;
    el.src = srcFor(track);
    if (on) el.play().catch(() => setOn(false));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: TRACKS[track].title, artist: ARTIST, album: 'Relay', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    }
  }, [track]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const el = get();
    if (on) { setOn(false); ramp(el, 0, () => el.pause()); return; }
    if (!el.src) el.src = srcFor(track);
    playing.current = true;
    el.volume = 0;
    el.play().then(() => { setOn(true); ramp(el, VOLUME); }).catch(() => { playing.current = false; setOn(false); });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: TRACKS[track].title, artist: ARTIST, album: 'Relay', artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    }
  };

  useEffect(() => () => { cancelAnimationFrame(fade.current); audio.current?.pause(); }, []);

  return (
    <button onClick={toggle} aria-pressed={on} title={on ? `Playing ${TRACKS[track].title} by ${ARTIST}` : 'Play the Relay soundtrack'}
      className={`h-10 px-3 sm:pl-3 sm:pr-3.5 inline-flex items-center gap-2 rounded-full text-[15.5px] transition-colors ${on ? 'bg-pale text-signal' : 'text-ink-2 hover:text-ink hover:bg-bg-2'} ${className}`}>
      <span className="flex items-end gap-[2px] h-3.5 w-4" aria-hidden="true">
        {[0.55, 1, 0.7, 0.85].map((h, i) => (
          <span key={i} className={`w-[3px] rounded-full bg-current ${on ? 'eq' : ''}`} style={{ height: on ? undefined : `${h * 40}%`, animationDelay: `${i * -0.23}s` }} />
        ))}
      </span>
      <span className="hidden sm:inline">Sound {on ? 'on' : 'off'}</span><span className="sr-only sm:hidden">Sound</span>
    </button>
  );
}
