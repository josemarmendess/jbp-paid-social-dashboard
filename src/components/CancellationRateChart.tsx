"use client";

import { useId, useState } from "react";
import type { CancellationPoint } from "@/lib/aggregate";
import { cn } from "@/lib/utils";

interface CancellationRateChartProps {
  weekly: { current: CancellationPoint[]; previous: CancellationPoint[] };
  monthly: { current: CancellationPoint[]; previous: CancellationPoint[] };
}

type Granularity = "week" | "month";

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

export function CancellationRateChart({
  weekly,
  monthly,
}: CancellationRateChartProps) {
  const uid = useId();
  const [gran, setGran] = useState<Granularity>("week");
  const data = gran === "week" ? weekly : monthly;
  const shorten = gran === "week" ? shortenWeekKey : shortenMonthKey;

  const length = Math.max(data.current.length, data.previous.length);
  const merged: MergedPoint[] = Array.from({ length }, (_, i) => {
    const cur = data.current[i];
    const prev = data.previous[i];
    return {
      bucket: cur ? shorten(cur.bucket) : prev ? shorten(prev.bucket) : "",
      current: cur?.rate ?? null,
      previous: prev?.rate ?? null,
    };
  });

  const empty = merged.every((d) => d.current === null && d.previous === null);

  const W = 540;
  const H = 220;
  const padL = 36;
  const padR = 12;
  const padT = 12;
  const padB = 28;
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-[2px] w-3"
              style={{ background: "var(--color-jbp-red)" }}
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
        </div>
        <div className="flex gap-0.5 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
          {(["week", "month"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGran(g)}
              className={cn(
                "rounded-[5px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                gran === g
                  ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {g === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
      {empty ? (
        <div className="flex h-[180px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
          Not enough data to render this chart.
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[180px] w-full"
          role="img"
          aria-label="Cancellation rate trend"
        >
          {/* grid */}
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
              fontSize="10"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {Math.round(t.v)}%
            </text>
          ))}
          {/* previous (dashed) */}
          {toPath("previous") ? (
            <path
              d={toPath("previous")}
              fill="none"
              stroke="var(--color-text-tertiary)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : null}
          {/* current */}
          {toPath("current") ? (
            <path
              d={toPath("current")}
              fill="none"
              stroke="var(--color-jbp-red)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* current dots */}
          {merged.map((d, i) =>
            d.current === null ? null : (
              <circle
                key={`c${i}-${uid}`}
                cx={padL + i * xStep}
                cy={padT + innerH - (d.current / niceMax) * innerH}
                r={2.5}
                fill="var(--color-jbp-red)"
              >
                <title>{`${d.bucket}: ${d.current.toFixed(1)}%`}</title>
              </circle>
            ),
          )}
          {/* x labels */}
          {merged.map((d, i) =>
            i % Math.max(1, Math.ceil(merged.length / 6)) === 0 ||
            i === merged.length - 1 ? (
              <text
                key={`xl${i}-${uid}`}
                x={padL + i * xStep}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
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
