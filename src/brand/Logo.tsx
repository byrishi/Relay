import { MARK_ASPECT, MARK_BARS } from './mark';

/** The original Relay "R" scan-line mark. Inherits colour from `currentColor`. */
export function RelayMark({ className = '', title }: { className?: string; title?: string }) {
  const h = 100, w = h * MARK_ASPECT;
  return (
    <svg viewBox={`0 0 ${w.toFixed(2)} ${h}`} className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title} fill="currentColor">
      {MARK_BARS.map(([x, y, bw, bh], i) => (
        <rect key={i} x={(x * w).toFixed(2)} y={(y * h).toFixed(2)} width={(bw * w).toFixed(2)} height={(bh * h).toFixed(2)} />
      ))}
    </svg>
  );
}

/** Mark in its navy tile, exactly like the original favicon. */
export function RelayTile({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center bg-brand text-white rounded-[22%] ${className}`} aria-hidden="true">
      <RelayMark className="h-[62%] w-auto" />
    </span>
  );
}

/** Tile + "RELAY" wordmark set in Geist Pixel Line (the same scan-line language as the mark). */
export function RelayLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <RelayTile className="w-8 h-8 md:w-9 md:h-9" />
      <span className="font-pixel-line text-[26px] md:text-[30px] leading-none tracking-tight text-ink">RELAY</span>
    </span>
  );
}
