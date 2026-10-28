/** Tiny live speed graph for a transfer, drawn as pixel bars. */
export default function Sparkline({ samples, className = '' }: { samples: number[]; className?: string }) {
  if (samples.length < 2) return null;
  const bars = samples.slice(-24);
  const w = bars.length * 5, h = 28;
  const max = Math.max(...bars, 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} preserveAspectRatio="none" shapeRendering="crispEdges" aria-hidden="true">
      {bars.map((v, i) => {
        const bh = Math.max(2, Math.round((v / max) * (h - 2)));
        return <rect key={i} x={i * 5} y={h - bh} width={4} height={bh} fill="#fff" opacity={0.35 + (0.65 * (i + 1)) / bars.length} />;
      })}
    </svg>
  );
}
