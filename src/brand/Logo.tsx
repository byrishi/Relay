/**
 * The Relay mark: an R drawn on a 5×7 pixel grid, plus one pale pixel
 * leaving its shoulder — the file on its way. It stays crisp down to
 * 16 px because every cell lands on whole pixels.
 */
export const R_CELLS: [number, number][] = [
  [0, 0], [1, 0], [2, 0], [3, 0],
  [0, 1], [4, 1],
  [0, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [3, 3],
  [0, 4], [2, 4],
  [0, 5], [3, 5],
  [0, 6], [4, 6],
];
/** The packet pixel. */
export const R_PACKET: [number, number] = [5, 0];

export function RelayMark({ className = '', title, ink = 'var(--color-signal)', signal = '#8FA0FF', gap = 0.14, animate = false }: {
  className?: string; title?: string; ink?: string; signal?: string; gap?: number; animate?: boolean;
}) {
  const s = 1 - gap;
  return (
    <svg viewBox="0 0 6 7" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title} shapeRendering="crispEdges">
      <g fill={ink}>{R_CELLS.map(([x, y]) => <rect key={`${x}${y}`} x={x + gap / 2} y={y + gap / 2} width={s} height={s} />)}</g>
      <rect x={R_PACKET[0] + gap / 2} y={R_PACKET[1] + gap / 2} width={s} height={s} fill={signal} className={animate ? 'mark-packet' : undefined} />
    </svg>
  );
}

/** Mark + wordmark. */
export function RelayLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className}`}>
      <RelayMark className="h-[22px] w-auto" animate />
      <span className="text-[22px] font-bold tracking-[-0.03em] leading-none text-ink">Relay</span>
    </span>
  );
}
