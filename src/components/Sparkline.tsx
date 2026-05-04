interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  /** Stroke color, default is the neutral data tone. */
  stroke?: string;
  /** Render a baseline at the lowest value. */
  showBaseline?: boolean;
}

/**
 * Tiny SVG sparkline. Pure SSR — no charting library required.
 * Designed for the bottom of KPI cards (last-30-day trend).
 */
export function Sparkline({
  values,
  width = 120,
  height = 28,
  stroke,
  showBaseline = true,
}: SparklineProps) {
  if (!values.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const xs = values.map(
    (_, i) => (i / Math.max(values.length - 1, 1)) * width,
  );
  const ys = values.map((v) => height - ((v - min) / range) * height);
  const points = xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width.toFixed(1)},${height} L 0,${height} Z`;
  const color = stroke ?? "var(--color-neutral-data)";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="trend"
      className="block overflow-visible"
    >
      <path d={areaPath} fill={color} fillOpacity={0.08} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showBaseline && (
        <line
          x1={0}
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke="var(--color-border-subtle)"
          strokeWidth={0.75}
        />
      )}
    </svg>
  );
}
