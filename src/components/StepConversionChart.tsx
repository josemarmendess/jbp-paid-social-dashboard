"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FunnelRatesPoint } from "@/lib/aggregate";

const RATES = [
  { key: "ctr" as const, label: "CTR", color: "var(--color-jbp-blue)" },
  { key: "leadRate" as const, label: "Lead Rate", color: "#0891b2" },
  { key: "bookRate" as const, label: "Book Rate", color: "var(--color-positive)" },
  { key: "closeRate" as const, label: "Close Rate", color: "var(--color-warning)" },
];

interface StepConversionChartProps {
  series: FunnelRatesPoint[];
}

function formatDateShort(dateStr: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return dateStr;
  return `${Number(m[1])}/${Number(m[2])}`;
}

export function StepConversionChart({ series }: StepConversionChartProps) {
  const [active, setActive] = useState<Record<string, boolean>>({
    ctr: true,
    leadRate: true,
    bookRate: true,
    closeRate: true,
  });

  if (!series.length) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Not enough data.
      </div>
    );
  }

  const W = 760;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xStep = innerW / Math.max(1, series.length - 1 || 1);
  const maxY = Math.max(
    0.05,
    ...RATES.flatMap((r) =>
      active[r.key] ? series.map((s) => s[r.key]) : [],
    ),
  );
  const niceMax = Math.ceil(maxY * 100) / 100;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    v: niceMax * t,
    y: padT + innerH - innerH * t,
  }));

  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {RATES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() =>
              setActive((prev) => ({ ...prev, [r.key]: !prev[r.key] }))
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all",
              active[r.key]
                ? "border-[color:var(--color-border-strong)] bg-white"
                : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/60 opacity-50",
            )}
          >
            <span
              className="inline-block h-2 w-2.5 rounded-sm"
              style={{ background: r.color }}
            />
            {r.label}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[260px] w-full"
        role="img"
        aria-label="Conversion rates over time"
      >
        {yTicks.map((t, i) => (
          <line
            key={`g${i}`}
            x1={padL}
            y1={t.y}
            x2={W - padR}
            y2={t.y}
            stroke="var(--color-border-subtle)"
          />
        ))}
        {yTicks.map((t, i) => (
          <text
            key={`yl${i}`}
            x={padL - 6}
            y={t.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="var(--color-text-tertiary)"
            className="font-mono"
          >
            {(t.v * 100).toFixed(0)}%
          </text>
        ))}
        {RATES.map((r) => {
          if (!active[r.key]) return null;
          const points = series.map((s, i) => ({
            x: padL + i * xStep,
            y: padT + innerH - (s[r.key] / niceMax) * innerH,
          }));
          const path = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
            .join(" ");
          return (
            <g key={r.key}>
              <path
                d={path}
                fill="none"
                stroke={r.color}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
        {series.map((s, i) =>
          i % labelEvery === 0 || i === series.length - 1 ? (
            <text
              key={`x${i}`}
              x={padL + i * xStep}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--color-text-tertiary)"
              className="font-mono"
            >
              {formatDateShort(s.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
