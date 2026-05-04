"use client";

import { useId } from "react";
import type { DailySeriesPoint } from "@/lib/aggregate";

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatDateShort(dateStr: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${Number(m[1])}/${Number(m[2])}`;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / exp;
  let mult = 1;
  if (n <= 1) mult = 1;
  else if (n <= 2) mult = 2;
  else if (n <= 5) mult = 5;
  else mult = 10;
  return mult * exp;
}

interface DailyTrendChartProps {
  data: DailySeriesPoint[];
}

/**
 * Daily Spend (bars, JBP blue) vs Revenue (line, positive green) over the
 * trailing 30 days. Pure SVG — no recharts. Two independent Y axes.
 */
export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const uid = useId();
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this chart.
      </div>
    );
  }

  const W = 540;
  const H = 240;
  const padL = 56;
  const padR = 56;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxSpend = niceMax(Math.max(0, ...data.map((d) => d.spend)));
  const maxRevenue = niceMax(Math.max(0, ...data.map((d) => d.revenue)));

  const xStep = innerW / Math.max(1, data.length);
  const barW = Math.max(2, xStep * 0.55);

  const yLeftSteps = 4;
  const yRightSteps = 4;
  const leftTicks = Array.from({ length: yLeftSteps + 1 }, (_, i) =>
    Math.round((maxSpend / yLeftSteps) * i),
  );
  const rightTicks = Array.from({ length: yRightSteps + 1 }, (_, i) =>
    Math.round((maxRevenue / yRightSteps) * i),
  );

  const bars = data.map((d, i) => {
    const x = padL + i * xStep + (xStep - barW) / 2;
    const h = (d.spend / maxSpend) * innerH;
    const y = padT + (innerH - h);
    return { x, y, h, date: d.date, value: d.spend };
  });

  const linePoints = data.map((d, i) => {
    const x = padL + i * xStep + xStep / 2;
    const y = padT + innerH - (d.revenue / maxRevenue) * innerH;
    return { x, y, date: d.date, value: d.revenue };
  });
  const linePath =
    linePoints.length > 0
      ? `M ${linePoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`
      : "";

  // X-axis labels: show every Nth date so they don't collide.
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ background: "var(--color-jbp-blue)" }}
          />
          Spend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-[2px] w-3"
            style={{ background: "var(--color-positive)" }}
          />
          Revenue
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[240px] w-full"
        role="img"
        aria-label="Daily spend vs revenue"
      >
        {/* Horizontal grid lines */}
        {leftTicks.map((_, i) => {
          const y = padT + (innerH / yLeftSteps) * i;
          return (
            <line
              key={`g${i}`}
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="var(--color-border-subtle)"
              strokeWidth={1}
            />
          );
        })}
        {/* Left axis (spend) */}
        {leftTicks.map((v, i) => {
          const y = padT + innerH - (innerH / yLeftSteps) * i;
          return (
            <text
              key={`l${i}`}
              x={padL - 6}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {usd0.format(v)}
            </text>
          );
        })}
        {/* Right axis (revenue) */}
        {rightTicks.map((v, i) => {
          const y = padT + innerH - (innerH / yRightSteps) * i;
          return (
            <text
              key={`r${i}`}
              x={W - padR + 6}
              y={y + 4}
              textAnchor="start"
              fontSize="10"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {usd0.format(v)}
            </text>
          );
        })}
        {/* Bars (spend) */}
        {bars.map((b, i) => (
          <rect
            key={`b${i}-${uid}`}
            x={b.x}
            y={b.y}
            width={barW}
            height={Math.max(0.5, b.h)}
            rx={1.5}
            fill="var(--color-jbp-blue)"
            opacity={0.85}
          >
            <title>{`${formatDateShort(b.date)} · Spend ${usd0.format(b.value)}`}</title>
          </rect>
        ))}
        {/* Revenue line */}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-positive)"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {/* Revenue dots */}
        {linePoints.map((p, i) => (
          <circle
            key={`d${i}-${uid}`}
            cx={p.x}
            cy={p.y}
            r={2}
            fill="var(--color-positive)"
          >
            <title>{`${formatDateShort(p.date)} · Revenue ${usd0.format(p.value)}`}</title>
          </circle>
        ))}
        {/* X-axis labels */}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <text
              key={`x${i}`}
              x={padL + i * xStep + xStep / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {formatDateShort(d.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
