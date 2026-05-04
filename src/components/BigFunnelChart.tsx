"use client";

import type { FunnelMetrics } from "@/lib/aggregate";

const intFmt = new Intl.NumberFormat("en-US");

interface BigFunnelChartProps {
  current: FunnelMetrics;
  previous: FunnelMetrics;
}

interface Stage {
  name: string;
  curr: number;
  prev: number;
  prevStageCurr?: number;
  prevStagePrev?: number;
}

/**
 * Vertical funnel — five rank-scaled trapezoids that always shrink so even
 * tiny stages stay visible. Conversion rate vs the previous step is shown
 * inline as a chip with the period-over-period delta in muted text.
 *
 * The earlier "overlay" / "side by side" toggle was removed: visualizing two
 * full funnels at once was confusing and the comparison is more useful as
 * text in the rate chips and on the Step Conversions chart below.
 */
export function BigFunnelChart({ current, previous }: BigFunnelChartProps) {
  const stages: Stage[] = [
    {
      name: "Impressions",
      curr: current.impressions,
      prev: previous.impressions,
    },
    {
      name: "Link Clicks",
      curr: current.linkClicks,
      prev: previous.linkClicks,
      prevStageCurr: current.impressions,
      prevStagePrev: previous.impressions,
    },
    {
      name: "Leads",
      curr: current.leads,
      prev: previous.leads,
      prevStageCurr: current.linkClicks,
      prevStagePrev: previous.linkClicks,
    },
    {
      name: "Booked Jobs",
      curr: current.bookedJobs,
      prev: previous.bookedJobs,
      prevStageCurr: current.leads,
      prevStagePrev: previous.leads,
    },
    {
      name: "Sold Jobs",
      curr: current.soldJobs,
      prev: previous.soldJobs,
      prevStageCurr: current.bookedJobs,
      prevStagePrev: previous.bookedJobs,
    },
  ];

  const allZero = stages.every((s) => !s.curr);
  if (allZero) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-[color:var(--color-border-subtle)] bg-white text-[13px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this funnel.
      </div>
    );
  }

  const W = 760;
  const stageH = 72;
  const gap = 10;
  const padT = 8;
  const padB = 8;
  const H = padT + stages.length * stageH + (stages.length - 1) * gap + padB;
  const cx = W / 2;
  const maxFull = W - 220; // leave room for previous-period count + delta on the right
  const minFull = maxFull * 0.32;

  function rankWidth(i: number, total: number): number {
    if (total <= 1) return maxFull;
    const t = i / (total - 1);
    return maxFull - (maxFull - minFull) * t;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Conversion funnel"
    >
      {stages.map((s, i) => {
        const y = padT + i * (stageH + gap);
        const w = rankWidth(i, stages.length);
        const x = cx - w / 2;
        const convCurr =
          s.prevStageCurr && s.prevStageCurr > 0
            ? (s.curr / s.prevStageCurr) * 100
            : null;
        const convPrev =
          s.prevStagePrev && s.prevStagePrev > 0
            ? (s.prev / s.prevStagePrev) * 100
            : null;
        const convDelta =
          convCurr != null && convPrev != null && convPrev !== 0
            ? convCurr - convPrev
            : null;
        const isLast = i === stages.length - 1;
        return (
          <g key={s.name}>
            <rect
              x={x}
              y={y}
              width={w}
              height={stageH}
              rx={6}
              fill={isLast ? "var(--color-positive)" : "var(--color-jbp-blue)"}
              opacity={0.92}
            />
            <text
              x={cx}
              y={y + 26}
              textAnchor="middle"
              fontSize="11"
              fill="#ffffff"
              fontWeight={600}
              style={{ letterSpacing: "0.05em" }}
            >
              {s.name.toUpperCase()}
            </text>
            <text
              x={cx}
              y={y + 50}
              textAnchor="middle"
              fontSize="22"
              fill="#ffffff"
              fontWeight={700}
              className="font-mono"
            >
              {intFmt.format(s.curr)}
            </text>

            {/* Conversion rate + delta on the right */}
            {convCurr != null ? (
              <g>
                <rect
                  x={W - 110}
                  y={y + stageH / 2 - 18}
                  width={96}
                  height={36}
                  rx={6}
                  fill="var(--color-jbp-blue)"
                  opacity={0.08}
                />
                <text
                  x={W - 62}
                  y={y + stageH / 2 - 1}
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--color-jbp-blue)"
                  fontWeight={600}
                  className="font-mono"
                >
                  {convCurr.toFixed(1)}%
                </text>
                {convDelta != null ? (
                  <text
                    x={W - 62}
                    y={y + stageH / 2 + 14}
                    textAnchor="middle"
                    fontSize="10"
                    fill={
                      convDelta >= 0
                        ? "var(--color-positive)"
                        : "var(--color-negative)"
                    }
                    fontWeight={600}
                    className="font-mono"
                  >
                    {convDelta >= 0 ? "+" : ""}
                    {convDelta.toFixed(1)} pp vs prev
                  </text>
                ) : null}
              </g>
            ) : null}
            {/* Previous period count on the left, muted */}
            {s.prev > 0 ? (
              <text
                x={x - 10}
                y={y + stageH / 2 + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-tertiary)"
                className="font-mono"
              >
                prev {intFmt.format(s.prev)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
