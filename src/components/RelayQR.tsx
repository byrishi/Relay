import { useMemo } from 'react';
import { encode } from 'uqr';
import { RelayMark } from '../brand/Logo';

// Module types reported by uqr
const POSITION = 2;

/**
 * A branded QR code in the Relay pixel language: square ink modules, finder
 * eyes with a signal-orange core, and the pixel R in the middle. Error
 * correction is H (30%), so the centre mark never stops it scanning.
 * Modules draw in once, sweeping from the centre outwards.
 */
export default function RelayQR({ value, size = 224, label }: { value: string; size?: number; label: string }) {
  const qr = useMemo(() => encode(value, { ecc: 'H', border: 0 }), [value]);
  const n = qr.size;
  const quiet = 3;                       // light margin around the code, in modules
  const total = n + quiet * 2;
  const hole = Math.max(7, Math.round(n * 0.22) | 1);   // centre knock-out for the mark (odd)
  const h0 = (n - hole) / 2, h1 = h0 + hole;
  const c = (n - 1) / 2;

  const cells: { x: number; y: number; d: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.types[y][x] === POSITION) continue;
      if (x >= h0 - 0.5 && x < h1 && y >= h0 - 0.5 && y < h1) continue;
      if (qr.data[y][x]) cells.push({ x, y, d: Math.max(Math.abs(x - c), Math.abs(y - c)) / c });
    }
  }
  const eyes = [[0, 0], [n - 7, 0], [0, n - 7]];

  return (
    <div className="relayqr relative inline-block bg-paper" role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg viewBox={`${-quiet} ${-quiet} ${total} ${total}`} width={size} height={size} aria-hidden="true" shapeRendering="crispEdges">
        <g fill="var(--color-ink)">
          {cells.map(({ x, y, d }) => (
            <rect key={`${x}-${y}`} x={x + 0.04} y={y + 0.04} width={0.92} height={0.92} className="qd" style={{ animationDelay: `${Math.round(d * 480)}ms` }} />
          ))}
          {eyes.map(([x, y]) => (
            <path key={`${x}-${y}`} fillRule="evenodd" d={`M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z`} />
          ))}
        </g>
        <g fill="var(--color-signal)">
          {eyes.map(([x, y]) => <rect key={`${x}-${y}`} x={x + 2} y={y + 2} width={3} height={3} />)}
        </g>
        {/* corner ticks, like a viewfinder */}
        <g fill="none" stroke="var(--color-ink)" strokeWidth={0.25}>
          <path d={`M${-quiet + 0.6} ${-quiet + 2}V${-quiet + 0.6}H${-quiet + 2}`} />
          <path d={`M${n + quiet - 2} ${-quiet + 0.6}H${n + quiet - 0.6}V${-quiet + 2}`} />
          <path d={`M${-quiet + 0.6} ${n + quiet - 2}V${n + quiet - 0.6}H${-quiet + 2}`} />
          <path d={`M${n + quiet - 2} ${n + quiet - 0.6}H${n + quiet - 0.6}V${n + quiet - 2}`} />
        </g>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="flex items-center justify-center bg-paper" style={{ width: (hole / total) * size, height: (hole / total) * size }}>
          <RelayMark className="h-[62%] w-auto" />
        </span>
      </span>
    </div>
  );
}
