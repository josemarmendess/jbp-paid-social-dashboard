"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FunnelMetrics } from "@/lib/aggregate";

const intFmt = new Intl.NumberFormat("en-US");

interface BigFunnelChartProps {
  current: FunnelMetrics;
  previous: FunnelMetrics;
  currentLabel: string;
  previousLabel: string;
}

interface Stage {
  name: string;
  curr: number;
  prev: number;
  /** Numerator stage above this one. */
  prevStageCurr?: number;
  prevStagePrev?: number;
}

/**
 * Vertical funnel — five stacked trapezoids that shrink with each stage's
 * count. Toggleable overlay vs side-by-side current vs previous period.
 * Pure SVG so it stays crisp at any container size.
 */
export function BigFunnelChart({
  current,
  previous,
  currentLabel,
  previousLabel,
}: BigFunnelChartProps) {
  const [mode, setMode] = useState<"overlay" | "split">("overlay");

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

  const allZero = stages.every((s) => !s.curr && !s.prev);
  if (allZero) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-[color:var(--color-border-subtle)] bg-white text-[13px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this funnel.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] text-[color:var(--color-text-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: "var(--color-jbp-blue)" }}
            />
            {currentLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-3 rounded-sm border border-dashed"
              style={{ borderColor: "var(--color-text-tertiary)" }}
            />
            {previousLabel}
          </span>
        </div>
        <div className="flex gap-0.5 rounded-md bg-[color:var(--color-surface-hover)] p-0.5">
          {(["overlay", "split"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                mode === m
                  ? "bg-white text-[color:var(--color-text-primary)] shadow-sm"
                  : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {m === "overlay" ? "Overlay" : "Side by side"}
            </button>
          ))}
        </div>
      </div>

      {mode === "overlay" ? (
        <FunnelSvg stages={stages} variant="overlay" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
              {currentLabel}
            </p>
            <FunnelSvg stages={stages} variant="current" />
          </div>
          <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
              {previousLabel}
            </p>
            <FunnelSvg stages={stages} variant="previous" />
          </div>
        </div>
      )}
    </div>
  );
}

interface FunnelSvgProps {
  stages: Stage[];
  variant: "overlay" | "current" | "previous";
}

function FunnelSvg({ stages, variant }: FunnelSvgProps) {
  const W = 720;
  const stageH = 64;
  const gap = 8;
  const padT = 8;
  const padB = 8;
  const H = padT + stages.length * stageH + (stages.length - 1) * gap + padB;
  const cx = W / 2;
  const maxFull = W - 80; // widest stage (Impressions)
  const minFull = maxFull * 0.32; // narrowest visible stage (Sold)

  // Rank-based widths give a clean funnel silhouette regardless of data
  // magnitudes — Impressions (millions) and Sold (single digits) would be
  // invisible on a strict linear scale. Actual counts + conversion rates
  // are inside the bar / on the right badge, so no info is lost.
  function rankWidth(i: number, total: number): number {
    if (total <= 1) return maxFull;
    const t = i / (total - 1);
    return maxFull - (maxFull - minFull) * t;
  }
  // Use rank widths if either rail of the funnel spans more than ~50x in
  // value (very common in paid social). Otherwise use proportional widths.
  const valuesCurr = stages.map((s) => s.curr);
  const valuesPrev = stages.map((s) => s.prev);
  const dynamicRange = (vs: number[]) => {
    const max = Math.max(...vs.filter((v) => v > 0));
    const min = Math.min(...vs.filter((v) => v > 0));
    return max > 0 && min > 0 ? max / min : 0;
  };
  const useRank =
    dynamicRange(valuesCurr) > 50 || dynamicRange(valuesPrev) > 50;
  const refMax = Math.max(...valuesCurr, ...valuesPrev) || 1;
  const widthFor = (v: number, i: number) =>
    useRank ? rankWidth(i, stages.length) : (v / refMax) * maxFull;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Conversion funnel"
    >
      {stages.map((s, i) => {
        const y = padT + i * (stageH + gap);
        const wCurr = widthFor(s.curr, i);
        const wPrev = widthFor(s.prev, i);
        const xCurr = cx - wCurr / 2;
        const xPrev = cx - wPrev / 2;
        const conv = (n: number, prev?: number) =>
          prev && prev > 0 ? ((n / prev) * 100).toFixed(1) : null;
        const convCurr = conv(s.curr, s.prevStageCurr);
        const convPrev = conv(s.prev, s.prevStagePrev);
        const showCurr = variant === "overlay" || variant === "current";
        const showPrev = variant === "overlay" || variant === "previous";
        return (
          <g key={s.name}>
            {showPrev ? (
              <rect
                x={xPrev}
                y={y}
                width={Math.max(2, wPrev)}
                height={stageH}
                rx={6}
                fill="none"
                stroke="var(--color-text-tertiary)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                opacity={0.7}
              />
            ) : null}
            {showCurr ? (
              <rect
                x={xCurr}
                y={y}
                width={Math.max(2, wCurr)}
                height={stageH}
                rx={6}
                fill={i === stages.length - 1 ? "var(--color-positive)" : "var(--color-jbp-blue)"}
                opacity={0.9}
              />
            ) : null}
            {/* Stage label, count, conversion */}
            <text
              x={cx}
              y={y + 22}
              textAnchor="middle"
              fontSize="11"
              fill={showCurr ? "#ffffff" : "var(--color-text-secondary)"}
              fontWeight={600}
              style={{ letterSpacing: "0.04em" }}
            >
              {s.name.toUpperCase()}
            </text>
            <text
              x={cx}
              y={y + 42}
              textAnchor="middle"
              fontSize="18"
              fill={showCurr ? "#ffffff" : "var(--color-text-primary)"}
              fontWeight={700}
              className="font-mono"
            >
              {intFmt.format(showCurr ? s.curr : s.prev)}
            </text>
            {/* Conversion rate badge on the right */}
            {(showCurr ? convCurr : convPrev) ? (
              <g>
                <rect
                  x={W - 80}
                  y={y + stageH / 2 - 12}
                  width={68}
                  height={24}
                  rx={4}
                  fill="var(--color-jbp-blue)"
                  opacity={0.1}
                />
                <text
                  x={W - 46}
                  y={y + stageH / 2 + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--color-jbp-blue)"
                  fontWeight={600}
                  className="font-mono"
                >
                  {showCurr ? convCurr : convPrev}%
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
