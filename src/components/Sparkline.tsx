// Dependency-free SVG sparkline for follower-growth trends. Pure function
// component (no hooks) so it renders inside both server and client pages.

export function Sparkline({
  values,
  width = 240,
  height = 56,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!values || values.length < 2) {
    return (
      <div className={`text-xs text-text-muted ${className}`}>
        Add at least two readings to see a trend.
      </div>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const areaPath = `${path} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${points[0][0].toFixed(1)},${height - pad} Z`;
  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? "#34d399" : "#f87171";
  const last = points[points.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label="Follower trend"
    >
      <path d={areaPath} fill={stroke} fillOpacity={0.12} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} />
    </svg>
  );
}
