"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { DailyKpiPoint } from "@/lib/aggregate";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DowMetric = "leads" | "bookRate" | "closeRate" | "spend";

interface DowMetricSpec {
  key: DowMetric;
  label: string;
  /** Compute the metric for a single day. */
  perDay: (r: DailyKpiPoint) => number;
  /** Aggregate across days of the same DOW: average vs sum vs ratio. */
  aggregate: "sum" | "avg" | "ratio";
  /** When ratio: numerator + denominator getters. */
  ratio?: {
    num: (r: DailyKpiPoint) => number;
    den: (r: DailyKpiPoint) => number;
  };
  /** Format a final aggregated value for the bar label / hover. */
  format: (v: number) => string;
  color: string;
}

const METRICS: ReadonlyArray<DowMetricSpec> = [
  {
    key: "leads",
    label: "Leads / day",
    perDay: (r) => r.leads,
    aggregate: "avg",
    format: (v) => v.toFixed(1),
    color: "var(--color-jbp-blue)",
  },
  {
    key: "bookRate",
    label: "Book Rate",
    perDay: () => 0, // unused — ratio aggregate uses ratio.num/.den below
    aggregate: "ratio",
    ratio: { num: (r) => r.bookedJobs, den: (r) => r.leads },
    format: (v) => formatPercent(v),
    color: "var(--color-positive)",
  },
  {
    key: "closeRate",
    label: "Close Rate",
    perDay: () => 0,
    aggregate: "ratio",
    ratio: { num: (r) => r.soldJobs, den: (r) => r.bookedJobs },
    format: (v) => formatPercent(v),
    color: "var(--color-warning)",
  },
  {
    key: "spend",
    label: "Spend / day",
    perDay: (r) => r.spend,
    aggregate: "avg",
    format: (v) => formatCurrency(v, true),
    color: "#7c3aed",
  },
];

interface DayOfWeekChartProps {
  rows: DailyKpiPoint[];
}

/**
 * Average performance by day of week. Helps the JBP team see which DOWs are
 * the strongest by leads, book rate, close rate, or spend — and tune their
 * media buying / intake staffing accordingly. Uses the trailing daily
 * series passed by the page (typically last 30 days).
 */
export function DayOfWeekChart({ rows }: DayOfWeekChartProps) {
  const [metricKey, setMetricKey] = useState<DowMetric>("leads");
  const metric = METRICS.find((m) => m.key === metricKey)!;
  const [hoverDow, setHoverDow] = useState<number | null>(null);

  // Bucket by day of week.
  const buckets: { num: number; den: number; sum: number; count: number }[] =
    Array.from({ length: 7 }, () => ({ num: 0, den: 0, sum: 0, count: 0 }));

  for (const r of rows) {
    const d = new Date(`${r.date}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const dow = d.getUTCDay();
    const b = buckets[dow];
    if (metric.aggregate === "ratio") {
      b.num += metric.ratio!.num(r);
      b.den += metric.ratio!.den(r);
    } else {
      b.sum += metric.perDay(r);
      b.count += 1;
    }
  }

  const aggregated = buckets.map((b) => {
    if (metric.aggregate === "ratio") {
      return b.den > 0 ? b.num / b.den : 0;
    }
    if (metric.aggregate === "avg") {
      return b.count > 0 ? b.sum / b.count : 0;
    }
    return b.sum;
  });

  const max = Math.max(0.01, ...aggregated);
  const allZero = aggregated.every((v) => v === 0);

  const W = 980;
  const H = 220;
  const padL = 60;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const slot = innerW / 7;
  const barW = Math.min(72, slot * 0.55);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-[color:var(--color-text-secondary)]">
          Average performance by day of week · trailing 30 days
        </p>
        <div className="flex flex-wrap gap-1 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetricKey(m.key)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                metricKey === m.key
                  ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {allZero ? (
        <div className="flex h-[200px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
          Not enough data to render this chart.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full"
          role="img"
          aria-label="Performance by day of week"
        >
          {/* Y axis ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padT + innerH - innerH * t;
            const v = max * t;
            return (
              <g key={`y${i}`}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border-subtle)"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--color-text-tertiary)"
                  className="font-mono"
                >
                  {metric.format(v)}
                </text>
              </g>
            );
          })}
          {/* Bars */}
          {aggregated.map((v, i) => {
            const x = padL + i * slot + (slot - barW) / 2;
            const h = (v / max) * innerH;
            const y = padT + innerH - h;
            const active = hoverDow === i;
            return (
              <g
                key={`d${i}`}
                onMouseEnter={() => setHoverDow(i)}
                onMouseLeave={() => setHoverDow(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(0.5, h)}
                  rx={4}
                  fill={metric.color}
                  opacity={active ? 1 : 0.85}
                />
                <text
                  x={x + barW / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-text-primary)"
                  className="font-mono"
                  fontWeight={600}
                >
                  {metric.format(v)}
                </text>
                <text
                  x={x + barW / 2}
                  y={H - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill={active ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
                  fontWeight={active ? 600 : 400}
                >
                  {DAY_LABELS[i]}
                </text>
                {/* Hit area covers the slot, not just the bar */}
                <rect
                  x={padL + i * slot}
                  y={padT}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
