/**
 * Shared state for the background particle scene. Pages write to it; the renderer
 * reads it every frame, so updates never trigger React re-renders.
 */
export type AtmosphereMode = 'landing' | 'lobby' | 'connected';

export const atmosphere = {
  mode: 'landing' as AtmosphereMode,
  /** 0..1 — how hard the light stream flows (driven by live transfer speed). */
  energy: 0,
  /** Set to 1 to fire a bloom flash (e.g. a file arrived); decays on its own. */
  pulse: 0,
  /** Number of peers shown as luminous nodes in connected mode. */
  peers: 1,
  /** Reading pages (articles, guides): fade the mark so it sits behind the text. */
  quiet: false,
  /** User turned the background animation off: draw one still frame. */
  still: (() => { try { return localStorage.getItem('relay-motion') === 'off'; } catch { return false; } })(),
};

export function setAtmosphere(patch: Partial<typeof atmosphere>) {
  Object.assign(atmosphere, patch);
}

export function pulseAtmosphere() {
  atmosphere.pulse = 1;
}

/** Map bytes/sec to a 0..1 energy curve that still reacts at both 1 MB/s and 100 MB/s. */
export function speedToEnergy(bytesPerSec: number) {
  if (!bytesPerSec || bytesPerSec <= 0) return 0;
  return Math.min(1, Math.log10(1 + bytesPerSec / 262144) / Math.log10(1 + 400));
}
