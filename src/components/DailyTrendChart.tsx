"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
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

function formatDateLong(dateStr: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
  return `${dow} ${months[Number(m[2]) - 1]} ${Number(m[3])}`;
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

const WINDOW_OPTIONS = [7, 14, 30, 60, 90] as const;

interface DailyTrendChartProps {
  /** Pass the LONGEST series (typically 90d). The chart slices internally
   *  based on the active window. */
  data: DailySeriesPoint[];
}

/**
 * Daily Spend (bars, JBP blue) vs Revenue (line, positive green) plus a
 * derived ROAS line. Hover shows a vertical guide and a value bubble for
 * the focused date. Window selector lets the user zoom into 7/14/30/60/90
 * days.
 */
export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const uid = useId();
  const [windowDays, setWindowDays] = useState<number>(30);
  const [showRoas, setShowRoas] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const visible = useMemo(
    () => (data.length > windowDays ? data.slice(-windowDays) : data),
    [data, windowDays],
  );

  if (!visible.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this chart.
      </div>
    );
  }

  const W = 980;
  const H = 320;
  const padL = 60;
  const padR = 60;
  const padT = 16;
  const padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxSpend = niceMax(Math.max(0, ...visible.map((d) => d.spend)));
  const maxRevenue = niceMax(Math.max(0, ...visible.map((d) => d.revenue)));

  // ROAS line is overlaid on the right axis (revenue axis), normalized so
  // a ROAS of `roasMax` reaches the top of the chart.
  const roasValues = visible.map((d) =>
    d.spend > 0 ? d.revenue / d.spend : 0,
  );
  const maxRoas = Math.max(2, ...roasValues, 4);
  const roasMaxNice = niceMax(maxRoas);

  const xStep = innerW / Math.max(1, visible.length);
  const barW = Math.max(2, xStep * 0.55);

  const yLeftSteps = 4;
  const yRightSteps = 4;
  const leftTicks = Array.from({ length: yLeftSteps + 1 }, (_, i) =>
    Math.round((maxSpend / yLeftSteps) * i),
  );
  const rightTicks = Array.from({ length: yRightSteps + 1 }, (_, i) =>
    Math.round((maxRevenue / yRightSteps) * i),
  );

  const bars = visible.map((d, i) => {
    const x = padL + i * xStep + (xStep - barW) / 2;
    const h = (d.spend / maxSpend) * innerH;
    const y = padT + (innerH - h);
    return { x, y, h };
  });

  const linePoints = visible.map((d, i) => ({
    x: padL + i * xStep + xStep / 2,
    y: padT + innerH - (d.revenue / maxRevenue) * innerH,
  }));
  const linePath =
    linePoints.length > 0
      ? `M ${linePoints
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(" L ")}`
      : "";

  const roasPoints = roasValues.map((v, i) => ({
    x: padL + i * xStep + xStep / 2,
    y: padT + innerH - (v / roasMaxNice) * innerH,
  }));
  const roasPath = `M ${roasPoints
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" L ")}`;

  const labelEvery = Math.max(1, Math.ceil(visible.length / 8));

  // Pixel-x → index. Used for hover tracking.
  function indexFromClientX(clientX: number, rectLeft: number, rectWidth: number): number {
    const ratio = (clientX - rectLeft) / rectWidth;
    const local = ratio * W; // SVG viewBox coord
    if (local < padL) return 0;
    if (local > W - padR) return visible.length - 1;
    const i = Math.round((local - padL) / xStep - 0.5);
    return Math.max(0, Math.min(visible.length - 1, i));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[12px] text-[color:var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm"
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
          {showRoas ? (
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-[2px] w-3 border-t border-dashed"
                style={{ borderColor: "var(--color-warning)" }}
              />
              ROAS
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRoas((v) => !v)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors",
              showRoas
                ? "border-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
                : "border-[color:var(--color-border-subtle)] bg-white text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            ROAS line
          </button>
          <div className="flex gap-0.5 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
            {WINDOW_OPTIONS.map((n) => {
              const active = windowDays === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWindowDays(n)}
                  className={cn(
                    "rounded-[5px] px-2 py-1 text-[11px] font-medium tabular-nums transition-colors",
                    active
                      ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                      : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
                  )}
                >
                  {n}d
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[320px] w-full"
          role="img"
          aria-label="Daily spend vs revenue"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverIdx(indexFromClientX(e.clientX, rect.left, rect.width));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal grid */}
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
          {/* Left axis (spend, in $) */}
          {leftTicks.map((v, i) => {
            const y = padT + innerH - (innerH / yLeftSteps) * i;
            return (
              <text
                key={`l${i}`}
                x={padL - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-tertiary)"
                className="font-mono"
              >
                {usd0.format(v)}
              </text>
            );
          })}
          {/* Right axis (revenue, in $) — hidden when ROAS line takes the right axis */}
          {!showRoas
            ? rightTicks.map((v, i) => {
                const y = padT + innerH - (innerH / yRightSteps) * i;
                return (
                  <text
                    key={`r${i}`}
                    x={W - padR + 8}
                    y={y + 4}
                    textAnchor="start"
                    fontSize="11"
                    fill="var(--color-text-tertiary)"
                    className="font-mono"
                  >
                    {usd0.format(v)}
                  </text>
                );
              })
            : Array.from({ length: 5 }, (_, i) => {
                const t = i / 4;
                const y = padT + innerH - innerH * t;
                return (
                  <text
                    key={`rr${i}`}
                    x={W - padR + 8}
                    y={y + 4}
                    textAnchor="start"
                    fontSize="11"
                    fill="var(--color-warning)"
                    className="font-mono"
                  >
                    {(roasMaxNice * t).toFixed(1)}x
                  </text>
                );
              })}

          {/* Bars */}
          {bars.map((b, i) => (
            <rect
              key={`b${i}-${uid}`}
              x={b.x}
              y={b.y}
              width={barW}
              height={Math.max(0.5, b.h)}
              rx={1.5}
              fill="var(--color-jbp-blue)"
              opacity={hoverIdx === i ? 1 : 0.85}
            />
          ))}

          {/* Revenue line + dots */}
          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-positive)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {linePoints.map((p, i) => (
            <circle
              key={`d${i}-${uid}`}
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 4 : 2.25}
              fill="var(--color-positive)"
            />
          ))}

          {/* Optional ROAS line */}
          {showRoas ? (
            <path
              d={roasPath}
              fill="none"
              stroke="var(--color-warning)"
              strokeWidth={1.75}
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* Hover guide line */}
          {hoverIdx !== null ? (
            <line
              x1={padL + hoverIdx * xStep + xStep / 2}
              y1={padT}
              x2={padL + hoverIdx * xStep + xStep / 2}
              y2={padT + innerH}
              stroke="var(--color-text-primary)"
              strokeOpacity={0.18}
              strokeWidth={1}
            />
          ) : null}

          {/* X-axis labels */}
          {visible.map((d, i) =>
            i % labelEvery === 0 || i === visible.length - 1 ? (
              <text
                key={`x${i}`}
                x={padL + i * xStep + xStep / 2}
                y={H - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text-tertiary)"
                className="font-mono"
              >
                {formatDateShort(d.date)}
              </text>
            ) : null,
          )}
        </svg>
        {/* Hover tooltip */}
        {hoverIdx !== null ? (
          <HoverTooltip
            point={visible[hoverIdx]}
            roas={roasValues[hoverIdx]}
            xPct={
              (padL + hoverIdx * xStep + xStep / 2) / W
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function HoverTooltip({
  point,
  roas,
  xPct,
}: {
  point: DailySeriesPoint;
  roas: number;
  xPct: number;
}) {
  const flipLeft = xPct > 0.7;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 rounded-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-text-primary)] px-3 py-2 text-[11px] text-white shadow-xl"
      style={{
        left: flipLeft ? "auto" : `min(${xPct * 100}% + 16px, calc(100% - 220px))`,
        right: flipLeft ? "16px" : "auto",
        minWidth: 200,
      }}
    >
      <div className="font-semibold tabular-nums">
        {formatDateLong(point.date)}
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
        <span className="text-zinc-400">Spend</span>
        <span className="text-right font-mono">{usd0.format(point.spend)}</span>
        <span className="text-zinc-400">Revenue</span>
        <span className="text-right font-mono">
          {usd0.format(point.revenue)}
        </span>
        <span className="text-zinc-400">ROAS</span>
        <span className="text-right font-mono">
          {roas > 0 ? `${roas.toFixed(2)}x` : "—"}
        </span>
      </div>
    </div>
  );
}
