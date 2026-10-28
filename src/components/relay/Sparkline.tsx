/** Tiny live speed graph for a transfer card. */
export default function Sparkline({ samples, className = '' }: { samples: number[]; className?: string }) {
  if (samples.length < 2) return null;
  const w = 120, h = 28;
  const max = Math.max(...samples, 1);
  const step = w / (samples.length - 1);
  const pts = samples.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgb(217,245,236)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(217,245,236)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} fill="url(#spark-fill)" />
      <polyline points={pts.join(' ')} fill="none" stroke="rgb(217,245,236)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
