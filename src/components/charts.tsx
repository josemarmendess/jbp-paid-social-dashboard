"use client";

import { useState } from "react";
import { formatCompactInt, formatCompactMoney } from "@/lib/format";

/**
 * Charts that ship the redesigned look — hairline grid, sharp tooltips,
 * tabular numerals everywhere. These components are pure SVG, no charting
 * library, mirroring the prototype's `shared.jsx` 1:1.
 */

/* ─────────────────── Spend bars + Revenue line ─────────────────── */

export interface SpendRevenuePoint {
  /** Display label for the x-axis tick. */
  d: string;
  spend: number;
  revenue: number;
  /** Optional extras shown in the hover tooltip. */
  leads?: number;
  booked?: number;
}

export function SpendRevenueChart({
  data,
  height = 260,
}: {
  data: SpendRevenuePoint[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 880;
  const h = height;
  const padL = 56;
  const padR = 56;
  const padT = 20;
  const padB = 32;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  if (data.length === 0) return null;
  const maxSpend = Math.max(...data.map((d) => d.spend), 1) * 1.18;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1) * 1.1;
  const stepX = innerW / data.length;
  const barW = stepX * 0.5;
  const revPath = data
    .map((d, i) => {
      const x = padL + i * stepX + stepX / 2;
      const y = padT + innerH - (d.revenue / maxRev) * innerH;
      return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    })
    .join(" ");
  const spendTicks = [0, maxSpend * 0.25, maxSpend * 0.5, maxSpend * 0.75, maxSpend];

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {spendTicks.map((t, i) => {
          const y = padT + innerH - (t / maxSpend) * innerH;
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={padL + innerW}
                y2={y}
                stroke="var(--color-jbp-hairline)"
              />
              <text
                x={padL - 8}
                y={y + 3}
                fontSize="10"
                fill="var(--color-jbp-text-3)"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {formatCompactMoney(t)}
              </text>
            </g>
          );
        })}
        {[0, maxRev * 0.5, maxRev].map((t, i) => {
          const y = padT + innerH - (t / maxRev) * innerH;
          return (
            <text
              key={i}
              x={padL + innerW + 8}
              y={y + 3}
              fontSize="10"
              fill="var(--color-jbp-navy)"
              fillOpacity="0.7"
              textAnchor="start"
              fontFamily="var(--font-mono)"
            >
              {formatCompactMoney(t)}
            </text>
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * stepX + (stepX - barW) / 2;
          const barH = (d.spend / maxSpend) * innerH;
          const y = padT + innerH - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="var(--color-jbp-red)"
              fillOpacity={hover === i ? 1 : 0.85}
            />
          );
        })}
        <path
          d={revPath}
          stroke="var(--color-jbp-navy)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          if (d.revenue === 0) return null;
          const x = padL + i * stepX + stepX / 2;
          const y = padT + innerH - (d.revenue / maxRev) * innerH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={hover === i ? 4 : 3}
              fill="var(--color-jbp-navy)"
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        })}
        {data.map((d, i) => {
          if (i % 3 !== 0 && i !== data.length - 1) return null;
          const x = padL + i * stepX + stepX / 2;
          return (
            <text
              key={i}
              x={x}
              y={h - 10}
              fontSize="10"
              fill="var(--color-jbp-text-3)"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {d.d}
            </text>
          );
        })}
        {data.map((_, i) => {
          const x = padL + i * stepX;
          return (
            <rect
              key={i}
              x={x}
              y={padT}
              width={stepX}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {hover != null ? (
          <line
            x1={padL + hover * stepX + stepX / 2}
            y1={padT}
            x2={padL + hover * stepX + stepX / 2}
            y2={padT + innerH}
            stroke="var(--color-jbp-text)"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />
        ) : null}
      </svg>
      {hover != null ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: `calc(${((padL + hover * stepX + stepX / 2) / w) * 100}% + 10px)`,
            background: "var(--color-jbp-ink)",
            color: "var(--color-jbp-cream)",
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>
            {data[hover].d}
          </div>
          <div>Spend &nbsp; {formatCompactMoney(data[hover].spend)}</div>
          <div>Revenue {formatCompactMoney(data[hover].revenue)}</div>
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────── Daily spend + cumulative spend/revenue ratio ───────────────────
 *
 * Two series sharing an x-axis:
 *  - Bars: daily spend ($).
 *  - Line: cumulative spend / cumulative revenue (%, monthly running total
 *    that RESETS at the 1st of each month). The dashed verticals mark month
 *    boundaries so you can read "what was the running spend/rev ratio on
 *    March 12?" at a glance.
 */

export interface CumulativePoint {
  /** YYYY-MM-DD — used to detect month boundaries. */
  date: string;
  spend: number;
  /** Cumulative spend ÷ cumulative revenue for the day's MTD window.
   *  Null when revenue is 0 in the running window. */
  ratioPct: number | null;
}

export function CumulativeSpendRatioChart({
  data,
  height = 260,
}: {
  data: CumulativePoint[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 880;
  const h = height;
  const padL = 56;
  const padR = 64;
  const padT = 20;
  const padB = 32;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  if (data.length === 0) return null;
  const maxSpend = Math.max(...data.map((d) => d.spend), 1) * 1.18;
  const validRatios = data
    .map((d) => d.ratioPct)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const maxRatio = Math.max(100, ...validRatios) * 1.1;
  const stepX = innerW / data.length;
  const barW = stepX * 0.5;

  const ratioPath = data
    .map((d, i) => {
      if (d.ratioPct == null) return null;
      const x = padL + i * stepX + stepX / 2;
      const y = padT + innerH - (d.ratioPct / maxRatio) * innerH;
      return { x, y, i };
    })
    .filter((p): p is { x: number; y: number; i: number } => p !== null);

  // Break the line at month boundaries so the running ratio doesn't visually
  // continue across the reset.
  const ratioSegments: { x: number; y: number; i: number }[][] = [];
  for (const p of ratioPath) {
    const isMonthStart = data[p.i].date.endsWith("-01");
    if (isMonthStart || ratioSegments.length === 0) {
      ratioSegments.push([p]);
    } else {
      ratioSegments[ratioSegments.length - 1].push(p);
    }
  }

  const spendTicks = [0, maxSpend * 0.25, maxSpend * 0.5, maxSpend * 0.75, maxSpend];
  const ratioTicks = [0, maxRatio * 0.25, maxRatio * 0.5, maxRatio * 0.75, maxRatio];

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {spendTicks.map((t, i) => {
          const y = padT + innerH - (t / maxSpend) * innerH;
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={padL + innerW}
                y2={y}
                stroke="var(--color-jbp-hairline)"
              />
              <text
                x={padL - 8}
                y={y + 3}
                fontSize="10"
                fill="var(--color-jbp-text-3)"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {formatCompactMoney(t)}
              </text>
            </g>
          );
        })}
        {ratioTicks.map((t, i) => {
          const y = padT + innerH - (t / maxRatio) * innerH;
          return (
            <text
              key={i}
              x={padL + innerW + 8}
              y={y + 3}
              fontSize="10"
              fill="var(--color-jbp-navy)"
              fillOpacity="0.7"
              textAnchor="start"
              fontFamily="var(--font-mono)"
            >
              {Math.round(t)}%
            </text>
          );
        })}
        {/* Month boundary markers — dashed verticals at the 1st of each month */}
        {data.map((d, i) => {
          if (i === 0 || !d.date.endsWith("-01")) return null;
          const x = padL + i * stepX;
          return (
            <line
              key={`mb-${i}`}
              x1={x}
              y1={padT}
              x2={x}
              y2={padT + innerH}
              stroke="var(--color-jbp-text-3)"
              strokeOpacity="0.4"
              strokeDasharray="2 4"
            />
          );
        })}
        {/* Daily spend bars */}
        {data.map((d, i) => {
          const x = padL + i * stepX + (stepX - barW) / 2;
          const barH = (d.spend / maxSpend) * innerH;
          const y = padT + innerH - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill="var(--color-jbp-red)"
              fillOpacity={hover === i ? 1 : 0.85}
            />
          );
        })}
        {/* Cumulative ratio line, broken on month boundaries */}
        {ratioSegments.map((seg, k) => (
          <path
            key={k}
            d={seg
              .map((p, j) => (j === 0 ? "M" : "L") + p.x.toFixed(1) + "," + p.y.toFixed(1))
              .join(" ")}
            stroke="var(--color-jbp-navy)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {ratioPath.map((p) => (
          <circle
            key={`pt-${p.i}`}
            cx={p.x}
            cy={p.y}
            r={hover === p.i ? 4 : 2.5}
            fill="var(--color-jbp-navy)"
            stroke="#fff"
            strokeWidth="1.5"
          />
        ))}
        {data.map((d, i) => {
          if (i % 3 !== 0 && i !== data.length - 1) return null;
          const x = padL + i * stepX + stepX / 2;
          return (
            <text
              key={`xl-${i}`}
              x={x}
              y={h - 10}
              fontSize="10"
              fill="var(--color-jbp-text-3)"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {d.date.slice(5)}
            </text>
          );
        })}
        {data.map((_, i) => {
          const x = padL + i * stepX;
          return (
            <rect
              key={`hit-${i}`}
              x={x}
              y={padT}
              width={stepX}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
        {hover != null ? (
          <line
            x1={padL + hover * stepX + stepX / 2}
            y1={padT}
            x2={padL + hover * stepX + stepX / 2}
            y2={padT + innerH}
            stroke="var(--color-jbp-text)"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />
        ) : null}
      </svg>
      {hover != null ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: `calc(${((padL + hover * stepX + stepX / 2) / w) * 100}% + 10px)`,
            background: "var(--color-jbp-ink)",
            color: "var(--color-jbp-cream)",
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4, letterSpacing: 0.5 }}>
            {data[hover].date}
          </div>
          <div>Daily spend &nbsp; {formatCompactMoney(data[hover].spend)}</div>
          <div>
            MTD spend / revenue &nbsp;{" "}
            {data[hover].ratioPct != null
              ? data[hover].ratioPct!.toFixed(1) + "%"
              : "n/a"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────── Cancellation / Show rate dual line ─────────────────── */

export interface DualLinePoint {
  bucket: string;
  current: number | null;
  previous: number | null;
}

export function DualLineChart({
  data,
  height = 200,
  currentColor = "var(--color-jbp-red)",
}: {
  data: DualLinePoint[];
  height?: number;
  currentColor?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const h = height;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  if (data.length < 2) return null;
  const max = 100;
  const stepX = innerW / (data.length - 1);

  const path = (key: "current" | "previous") =>
    data
      .map((d, i) => {
        const v = d[key];
        if (v == null) return null;
        const x = padL + i * stepX;
        const y = padT + innerH - (v / max) * innerH;
        return { i, x, y };
      })
      .filter((p): p is { i: number; x: number; y: number } => p !== null)
      .map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y.toFixed(1))
      .join(" ");

  return (
    <div style={{ position: "relative" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 25, 50, 75, 100].map((t) => {
          const y = padT + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line
                x1={padL}
                y1={y}
                x2={padL + innerW}
                y2={y}
                stroke="var(--color-jbp-hairline)"
              />
              <text
                x={padL - 6}
                y={y + 3}
                fontSize="10"
                fill="var(--color-jbp-text-3)"
                textAnchor="end"
                fontFamily="var(--font-mono)"
              >
                {t}%
              </text>
            </g>
          );
        })}
        <path
          d={path("previous")}
          stroke="var(--color-jbp-text-2)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          fill="none"
        />
        <path
          d={path("current")}
          stroke={currentColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          if (d.current == null) return null;
          const x = padL + i * stepX;
          const y = padT + innerH - (d.current / max) * innerH;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={hover === i ? 4 : 2.5}
              fill={currentColor}
              stroke="#fff"
              strokeWidth="1.5"
            />
          );
        })}
        {data.map((d, i) => {
          const x = padL + i * stepX;
          return (
            <text
              key={i}
              x={x}
              y={h - 8}
              fontSize="10"
              fill="var(--color-jbp-text-3)"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {d.bucket}
            </text>
          );
        })}
        {data.map((_, i) => {
          const x = padL + i * stepX;
          return (
            <rect
              key={i}
              x={x - stepX / 2}
              y={padT}
              width={stepX}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          );
        })}
      </svg>
      {hover != null ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: `calc(${((padL + hover * stepX) / w) * 100}% + 8px)`,
            background: "var(--color-jbp-ink)",
            color: "var(--color-jbp-cream)",
            padding: "8px 12px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            {data[hover].bucket}
          </div>
          {data[hover].current != null ? (
            <div>Current &nbsp; {data[hover].current!.toFixed(1)}%</div>
          ) : null}
          {data[hover].previous != null ? (
            <div>Previous {data[hover].previous!.toFixed(1)}%</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ─────────────────── Day of week bar chart ─────────────────── */

export function DayOfWeekBars({
  data,
}: {
  data: { day: string; value: number }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 14,
        height: 180,
        padding: "0 4px",
      }}
    >
      {data.map((d, i) => {
        const isHover = hover === i;
        const heightPct = (d.value / max) * 100;
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "78%",
                  height: heightPct + "%",
                  background: "var(--color-jbp-red)",
                  opacity: isHover ? 1 : 0.85,
                  position: "relative",
                  transition: "opacity .15s",
                }}
              >
                {isHover ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "calc(100% + 8px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--color-jbp-ink)",
                      color: "var(--color-jbp-cream)",
                      padding: "4px 8px",
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.value.toFixed(1)}
                  </div>
                ) : null}
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-jbp-text-3)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {d.day}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--color-jbp-text)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {d.value.toFixed(1)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── Horizontal funnel (Overview) ─────────────────── */

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** Key of the previous stage in the funnel — drives the rate label. */
  rateOf?: string;
}

export function HorizontalFunnel({
  stages,
  values,
}: {
  stages: FunnelStage[];
  values: Record<string, number>;
}) {
  // Sizing: Impressions is shown as a "header" stage at full width — its
  // raw count would dwarf every other bar otherwise. Stages 2-5 are sized
  // relative to LINK CLICKS (the second stage), with a 12% floor so the
  // smallest bar still has room for its number/label.
  const sizingMax = stages[1] ? values[stages[1].key] : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {stages.map((s, idx) => {
        const v = values[s.key] ?? 0;
        const isHeader = idx === 0;
        const widthPct = isHeader
          ? 100
          : sizingMax > 0
            ? Math.max((v / sizingMax) * 100, 12)
            : 12;
        const rate =
          s.rateOf && values[s.rateOf]
            ? (v / values[s.rateOf]) * 100
            : null;
        // If the bar is wide enough (>=22%) the number sits inside on red;
        // otherwise it lands to the right on the cream track in dark ink.
        const numberInside = widthPct >= 22;
        return (
          <div
            key={s.key}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr 70px",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--color-jbp-text-2)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                position: "relative",
                height: 32,
                background: "var(--color-jbp-cream)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  width: widthPct + "%",
                  background: isHeader
                    ? "var(--color-jbp-ink-soft)"
                    : "var(--color-jbp-red)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: numberInside ? "flex-start" : "flex-end",
                  paddingLeft: numberInside ? 12 : 0,
                  paddingRight: numberInside ? 0 : 0,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -0.3,
                  fontFamily: "var(--font-display)",
                }}
              >
                {numberInside ? formatCompactInt(v) : null}
              </div>
              {!numberInside ? (
                <span
                  style={{
                    position: "absolute",
                    left: `calc(${widthPct}% + 8px)`,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: "var(--color-jbp-text)",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCompactInt(v)}
                </span>
              ) : null}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--color-jbp-text-2)",
                fontFamily: "var(--font-mono)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {rate != null ? rate.toFixed(2) + "%" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────── ROAS meter ─────────────────── */

export function RoasMeter({
  value,
  target,
}: {
  value: number;
  target: number;
}) {
  const isOver = value >= target;
  const pct = Math.min((value / (target * 2)) * 100, 100);
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            letterSpacing: -1,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toFixed(1)}
          <span
            style={{ fontSize: 22, color: "var(--color-jbp-text-2)" }}
          >
            x
          </span>
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--color-jbp-text-2)",
            fontFamily: "var(--font-mono)",
          }}
        >
          target {target.toFixed(1)}x
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: "var(--color-jbp-cream)",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: pct + "%",
            background: isOver ? "var(--color-jbp-good)" : "var(--color-jbp-red)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${(target / (target * 2)) * 100}%`,
            top: -3,
            bottom: -3,
            width: 1,
            background: "var(--color-jbp-ink)",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: "var(--color-jbp-text-3)",
          fontFamily: "var(--font-mono)",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {isOver
          ? `+${(value - target).toFixed(1)}x above target`
          : `${(target - value).toFixed(1)}x below target`}
      </div>
    </div>
  );
}
