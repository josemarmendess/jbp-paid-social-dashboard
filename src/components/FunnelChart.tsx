"use client";

import { useId } from "react";
import type { FunnelMetrics } from "@/lib/aggregate";

const intFmt = new Intl.NumberFormat("en-US");

interface FunnelChartProps {
  metrics: FunnelMetrics;
}

/**
 * Vertical-stacked funnel rendered as full-bleed SVG bars. Each row shows
 * stage label, count, and conversion rate from the previous step. Pure SVG.
 */
export function FunnelChart({ metrics }: FunnelChartProps) {
  const uid = useId();
  const stages = [
    { name: "Impressions", value: metrics.impressions, prev: null as number | null },
    { name: "Link Clicks", value: metrics.linkClicks, prev: metrics.impressions },
    { name: "Leads", value: metrics.leads, prev: metrics.linkClicks },
    { name: "Booked", value: metrics.bookedJobs, prev: metrics.leads },
    { name: "Sold", value: metrics.soldJobs, prev: metrics.bookedJobs },
  ];
  const allZero = stages.every((s) => !s.value);
  if (allZero) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this chart.
      </div>
    );
  }
  const max = Math.max(...stages.map((s) => s.value || 0)) || 1;

  const W = 540;
  const rowH = 36;
  const rowGap = 8;
  const padL = 90;
  const padR = 16;
  const padT = 12;
  const innerW = W - padL - padR;
  const H = padT + (rowH + rowGap) * stages.length + 8;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[240px] w-full"
      role="img"
      aria-label="Conversion funnel"
    >
      {stages.map((s, i) => {
        const y = padT + i * (rowH + rowGap);
        const w = (s.value / max) * innerW;
        const conversion =
          s.prev && s.prev > 0
            ? ((s.value / s.prev) * 100).toFixed(1)
            : null;
        return (
          <g key={`${s.name}-${uid}`}>
            <text
              x={padL - 8}
              y={y + rowH / 2 + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--color-text-secondary)"
              className="font-medium"
            >
              {s.name}
            </text>
            <rect
              x={padL}
              y={y}
              width={innerW}
              height={rowH}
              fill="var(--color-surface-hover)"
              rx={4}
            />
            <rect
              x={padL}
              y={y}
              width={Math.max(2, w)}
              height={rowH}
              fill={i === stages.length - 1 ? "var(--color-positive)" : "var(--color-jbp-blue)"}
              opacity={0.9}
              rx={4}
            />
            <text
              x={padL + 8}
              y={y + rowH / 2 + 4}
              fontSize="11"
              fill="#ffffff"
              className="font-mono font-semibold"
            >
              {intFmt.format(s.value)}
            </text>
            {conversion ? (
              <text
                x={W - padR}
                y={y + rowH / 2 + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--color-text-tertiary)"
                className="font-mono"
              >
                {conversion}%
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
