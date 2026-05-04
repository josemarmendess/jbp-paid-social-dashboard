"use client";

import { useId, useMemo, useState } from "react";
import type { CancellationPoint } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

interface RateTrendChartProps {
  /** Full weekly series (oldest first). Should contain enough buckets to
   *  cover the largest preset on either side (≥ 52 recommended for the
   *  26-week comparison preset). */
  weekly: CancellationPoint[];
  /** Full monthly series (oldest first). ≥ 48 recommended for the 24-month preset. */
  monthly: CancellationPoint[];
  /** Color of the "current" line. Defaults to JBP red — used for
   *  cancellation. Pipeline's Show Rate passes positive green. */
  currentColor?: string;
  /** Whether higher values are good (true → green) or bad (false → red).
   *  Just changes the inline delta color, not the line color. */
  higherIsBetter?: boolean;
}

type Granularity = "week" | "month";

const WEEK_PRESETS = [4, 8, 12, 16, 26] as const;
const MONTH_PRESETS = [3, 6, 12, 24] as const;

function shortenWeekKey(k: string): string {
  return k.replace(/^\d{4}-/, "");
}
function shortenMonthKey(k: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(k);
  if (!m) return k;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[Number(m[2]) - 1];
}

interface MergedPoint {
  bucket: string;
  current: number | null;
  previous: number | null;
}

/**
 * Rate trend chart used by the Overview Cancellation card, the Pipeline
 * Cancellation chart, and the Pipeline Show Rate chart. The user picks the
 * granularity (Weekly / Monthly) AND the lookback (e.g., 8 vs 16 weeks);
 * the chart auto-splits the series into "current N" vs "previous N" halves.
 */
export function CancellationRateChart({
  weekly,
  monthly,
  currentColor = "var(--color-jbp-red)",
  higherIsBetter = false,
}: RateTrendChartProps) {
  const uid = useId();
  const [gran, setGran] = useState<Granularity>("week");
  const [weeks, setWeeks] = useState<number>(8);
  const [months, setMonths] = useState<number>(6);

  const halfSize = gran === "week" ? weeks : months;
  const fullSeries = gran === "week" ? weekly : monthly;
  const shorten = gran === "week" ? shortenWeekKey : shortenMonthKey;

  // Take the most recent halfSize buckets as "current" and the prior halfSize
  // as "previous". Falls back gracefully when the series is shorter.
  const { current, previous } = useMemo(() => {
    const cur = fullSeries.slice(-halfSize);
    const prevStart = Math.max(0, fullSeries.length - halfSize * 2);
    const prevEnd = Math.max(0, fullSeries.length - halfSize);
    const prev = fullSeries.slice(prevStart, prevEnd);
    return { current: cur, previous: prev };
  }, [fullSeries, halfSize]);

  const length = Math.max(current.length, previous.length);
  const merged: MergedPoint[] = Array.from({ length }, (_, i) => {
    const c = current[i];
    const p = previous[i];
    return {
      bucket: c ? shorten(c.bucket) : p ? shorten(p.bucket) : "",
      current: c?.rate ?? null,
      previous: p?.rate ?? null,
    };
  });

  const empty = merged.every((d) => d.current === null && d.previous === null);

  // Period-over-period averages for the inline delta.
  const avg = (arr: CancellationPoint[]) => {
    const xs = arr.map((p) => p.rate).filter((r): r is number => r != null);
    if (xs.length === 0) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  const curAvg = avg(current);
  const prevAvg = avg(previous);
  const deltaPp = curAvg != null && prevAvg != null ? curAvg - prevAvg : null;

  const W = 560;
  const H = 240;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxRate = Math.max(
    10,
    ...merged.flatMap((d) =>
      [d.current, d.previous].filter((v): v is number => typeof v === "number"),
    ),
  );
  const niceMax = Math.ceil(maxRate / 10) * 10;
  const xStep = innerW / Math.max(1, merged.length - 1 || 1);

  const toPath = (key: "current" | "previous"): string => {
    const pts = merged
      .map((d, i) =>
        d[key] === null
          ? null
          : ({
              x: padL + i * xStep,
              y: padT + innerH - (d[key]! / niceMax) * innerH,
            } as const),
      )
      .filter((p): p is { x: number; y: number } => p !== null);
    if (!pts.length) return "";
    return `M ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")}`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    v: niceMax * t,
    y: padT + innerH - innerH * t,
  }));

  const presets = gran === "week" ? WEEK_PRESETS : MONTH_PRESETS;
  const granLabel = gran === "week" ? "weeks" : "months";

  // Delta color: positive (good) is green; negative (bad) is red — orientation
  // depends on whether higher is good for this metric.
  let deltaColor: string | undefined;
  let deltaText: string | null = null;
  if (deltaPp != null) {
    const goodDirection = higherIsBetter ? deltaPp >= 0 : deltaPp <= 0;
    deltaColor = goodDirection
      ? "var(--color-positive)"
      : "var(--color-negative)";
    deltaText = `${deltaPp >= 0 ? "+" : ""}${deltaPp.toFixed(1)} pp · ${halfSize}${granLabel.slice(0, 1)} avg`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[12px] text-[color:var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-3"
              style={{ background: currentColor }}
            />
            Current
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-3 border-t border-dashed"
              style={{ borderColor: "var(--color-text-tertiary)" }}
            />
            Previous
          </span>
          {deltaText ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{
                background: `color-mix(in srgb, ${deltaColor} 10%, transparent)`,
                color: deltaColor,
              }}
            >
              {deltaText}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {/* Granularity toggle */}
          <div className="flex gap-0.5 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
            {(["week", "month"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGran(g)}
                className={cn(
                  "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                  gran === g
                    ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                    : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                )}
              >
                {g === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
          {/* Bucket-count preset */}
          <div className="flex gap-0.5 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
            {presets.map((n) => {
              const active = (gran === "week" ? weeks : months) === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    gran === "week" ? setWeeks(n) : setMonths(n)
                  }
                  className={cn(
                    "rounded-[5px] px-2 py-1 text-[11px] font-medium tabular-nums transition-colors",
                    active
                      ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                      : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {empty ? (
        <div className="flex h-[200px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
          Not enough data to render this chart.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[200px] w-full"
          role="img"
          aria-label="Rate trend"
        >
          {yTicks.map((t, i) => (
            <line
              key={`g${i}-${uid}`}
              x1={padL}
              y1={t.y}
              x2={W - padR}
              y2={t.y}
              stroke="var(--color-border-subtle)"
            />
          ))}
          {yTicks.map((t, i) => (
            <text
              key={`yl${i}-${uid}`}
              x={padL - 6}
              y={t.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {Math.round(t.v)}%
            </text>
          ))}
          {toPath("previous") ? (
            <path
              d={toPath("previous")}
              fill="none"
              stroke="var(--color-text-tertiary)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : null}
          {toPath("current") ? (
            <path
              d={toPath("current")}
              fill="none"
              stroke={currentColor}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {merged.map((d, i) =>
            d.current === null ? null : (
              <circle
                key={`c${i}-${uid}`}
                cx={padL + i * xStep}
                cy={padT + innerH - (d.current / niceMax) * innerH}
                r={2.75}
                fill={currentColor}
              >
                <title>{`${d.bucket}: ${d.current.toFixed(1)}%`}</title>
              </circle>
            ),
          )}
          {merged.map((d, i) =>
            i % Math.max(1, Math.ceil(merged.length / 6)) === 0 ||
            i === merged.length - 1 ? (
              <text
                key={`xl${i}-${uid}`}
                x={padL + i * xStep}
                y={H - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text-tertiary)"
                className="font-mono"
              >
                {d.bucket}
              </text>
            ) : null,
          )}
        </svg>
      )}
    </div>
  );
}
