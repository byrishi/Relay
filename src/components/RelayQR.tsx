import { useId, useMemo } from 'react';
import { encode } from 'uqr';
import { RelayMark } from '../brand/Logo';

// Module types reported by uqr
const POSITION = 2;
const ALIGNMENT = 4;

/**
 * A branded QR code: round dots in the Relay gradient, rounded finder eyes and
 * the R in the middle. Error correction is set to H (30%) so the centre mark
 * and the dot shapes never stop it scanning. Dots draw in once, from the centre.
 */
export default function RelayQR({ value, size = 224, label }: { value: string; size?: number; label: string }) {
  const id = useId().replace(/:/g, '');
  const qr = useMemo(() => encode(value, { ecc: 'H', border: 0 }), [value]);
  const n = qr.size;
  const quiet = 3;                       // light margin around the code, in modules
  const total = n + quiet * 2;
  const hole = Math.max(7, Math.round(n * 0.22) | 1);   // centre knock-out for the mark (odd)
  const h0 = (n - hole) / 2, h1 = h0 + hole;
  const c = (n - 1) / 2;

  const dots: { x: number; y: number; d: number }[] = [];
  const aligns: { x: number; y: number }[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const t = qr.types[y][x];
      if (t === POSITION) continue;
      if (t === ALIGNMENT) {
        // remember each alignment pattern by its centre (dark module surrounded by light)
        if (qr.data[y][x] && qr.types[y - 1]?.[x] === ALIGNMENT && !qr.data[y - 1][x] && qr.types[y - 2]?.[x] === ALIGNMENT && qr.data[y - 2][x] && qr.types[y + 2]?.[x] === ALIGNMENT) aligns.push({ x, y });
        continue;
      }
      if (x >= h0 - 0.5 && x < h1 && y >= h0 - 0.5 && y < h1) continue;
      if (qr.data[y][x]) dots.push({ x, y, d: Math.hypot(x - c, y - c) / (c * 1.42) });
    }
  }
  const eyes = [[0, 0], [n - 7, 0], [0, n - 7]];

  return (
    <div className="relayqr relative inline-block rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgb(110_118_255/0.55)]" role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg viewBox={`${-quiet} ${-quiet} ${total} ${total}`} width={size} height={size} aria-hidden="true" shapeRendering="geometricPrecision">
        <defs>
          <linearGradient id={`q${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={n} y2={n}>
            <stop offset="0" stopColor="#3F46D6" />
            <stop offset="0.55" stopColor="#7444D4" />
            <stop offset="1" stopColor="#D9481C" />
          </linearGradient>
        </defs>
        <g fill={`url(#q${id})`}>
          {dots.map(({ x, y, d }) => (
            <circle key={`${x}-${y}`} cx={x + 0.5} cy={y + 0.5} r={0.43} className="qd" style={{ animationDelay: `${Math.round(d * 520)}ms` }} />
          ))}
          {eyes.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <path fillRule="evenodd" d={`${rr(x, y, 7, 7, 2.3)} ${rr(x + 1, y + 1, 5, 5, 1.5)}`} />
              <rect x={x + 2} y={y + 2} width={3} height={3} rx={1} />
            </g>
          ))}
          {aligns.map(({ x, y }) => (
            <g key={`a${x}-${y}`}>
              <path fillRule="evenodd" d={`${rr(x - 2, y - 2, 5, 5, 1.6)} ${rr(x - 1, y - 1, 3, 3, 0.9)}`} />
              <circle cx={x + 0.5} cy={y + 0.5} r={0.5} />
            </g>
          ))}
        </g>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="flex items-center justify-center rounded-xl bg-white" style={{ width: (hole / total) * size, height: (hole / total) * size }}>
          <RelayMark deep className="h-[66%] w-auto" />
        </span>
      </span>
    </div>
  );
}

/** Rounded-rectangle path. */
function rr(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
