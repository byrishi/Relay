import { useId } from 'react';
import { MARK_ASPECT, MARK_BARS } from './mark';

/** Brand gradient, top to bottom: indigo, violet, coral (the colours of the particle R). */
export const MARK_STOPS: [number, string][] = [[0, '#8B90FF'], [0.55, '#B08CFF'], [1, '#FF8A5C']];
/** Deeper version of the same gradient, for light backgrounds. */
export const MARK_STOPS_DEEP: [number, string][] = [[0, '#3F46D6'], [0.55, '#7444D4'], [1, '#D9481C']];

/**
 * The original Relay "R": 34 horizontal scan-lines.
 * `gradient` paints it in the brand gradient (colours follow the active design);
 * `deep` forces the darker stops, for light surfaces such as the QR card.
 */
export function RelayMark({ className = '', title, gradient = true, deep = false }: { className?: string; title?: string; gradient?: boolean; deep?: boolean }) {
  const id = useId().replace(/:/g, '');
  const h = 100, w = h * MARK_ASPECT;
  return (
    <svg viewBox={`0 0 ${w.toFixed(2)} ${h}`} className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {gradient && (
        <defs>
          <linearGradient id={`rg${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={h}>
            {deep
              ? MARK_STOPS_DEEP.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)
              : MARK_STOPS.map(([o], i) => <stop key={o} offset={o} style={{ stopColor: `var(--mark-${i + 1})` }} />)}
          </linearGradient>
        </defs>
      )}
      <g fill={gradient ? `url(#rg${id})` : 'currentColor'}>
        {MARK_BARS.map(([x, y, bw, bh], i) => (
          <rect key={i} x={(x * w).toFixed(2)} y={(y * h).toFixed(2)} width={(bw * w).toFixed(2)} height={(bh * h).toFixed(2)} rx={(bh * h / 2).toFixed(2)} />
        ))}
      </g>
    </svg>
  );
}

/** Mark + wordmark. */
export function RelayLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <RelayMark className="h-[30px] w-auto" />
      <span className="text-[18px] font-semibold tracking-[-0.025em] leading-none text-fg">Relay</span>
    </span>
  );
}
