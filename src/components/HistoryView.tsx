"use client";

import { useMemo, useState } from "react";
import { MetricLabel } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { METRIC_DEFS } from "@/lib/metricDefinitions";
import type { MonthlyKpiRow } from "@/lib/aggregate";

type MetricKey =
  | "spend"
  | "leads"
  | "bookedJobs"
  | "soldJobs"
  | "sales"
  | "spendOnRevenue"
  | "ctr"
  | "leadRate"
  | "bookRate"
  | "showRate"
  | "closeRate"
  | "cancellationRate";

interface MetricSpec {
  key: MetricKey;
  label: string;
  tooltip: string;
  kind: "currency" | "int" | "percent";
  invert?: boolean;
  baseColor: string;
  /** Color used for the second slice (Sewers) when split. */
  altColor?: string;
}

const METRICS: MetricSpec[] = [
  { key: "spend", label: "Spend", tooltip: METRIC_DEFS.spend, kind: "currency", invert: true, baseColor: "#1561e6", altColor: "#0e4dba" },
  { key: "leads", label: "Leads", tooltip: METRIC_DEFS.leads, kind: "int", baseColor: "#0891b2", altColor: "#0e7490" },
  { key: "bookedJobs", label: "Booked Jobs", tooltip: METRIC_DEFS.bookedJobs, kind: "int", baseColor: "#7c3aed", altColor: "#5b21b6" },
  { key: "soldJobs", label: "Sold Jobs", tooltip: METRIC_DEFS.soldJobs, kind: "int", baseColor: "#10b981", altColor: "#047857" },
  { key: "sales", label: "Sales Revenue", tooltip: METRIC_DEFS.salesRevenue, kind: "currency", baseColor: "#059669", altColor: "#065f46" },
  { key: "spendOnRevenue", label: "Spend on Revenue", tooltip: METRIC_DEFS.spendOnRevenue, kind: "percent", invert: true, baseColor: "#d97706", altColor: "#b45309" },
  { key: "ctr", label: "CTR", tooltip: METRIC_DEFS.ctr, kind: "percent", baseColor: "#1d4ed8", altColor: "#1e3a8a" },
  { key: "leadRate", label: "Lead Rate", tooltip: METRIC_DEFS.leadRate, kind: "percent", baseColor: "#0e7490", altColor: "#155e75" },
  { key: "bookRate", label: "Book Rate", tooltip: METRIC_DEFS.bookRate, kind: "percent", baseColor: "#15803d", altColor: "#14532d" },
  { key: "showRate", label: "Show Rate", tooltip: METRIC_DEFS.showRate, kind: "percent", baseColor: "#65a30d", altColor: "#3f6212" },
  { key: "closeRate", label: "Close Rate", tooltip: METRIC_DEFS.closeRate, kind: "percent", baseColor: "#a16207", altColor: "#713f12" },
  { key: "cancellationRate", label: "Cancellation Rate", tooltip: METRIC_DEFS.cancellationRate, kind: "percent", invert: true, baseColor: "#bc0e0f", altColor: "#7f1d1d" },
];

const DEFAULT_VISIBLE: MetricKey[] = ["spend", "leads", "sales", "bookRate"];

function shortenMonth(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[Number(m[2]) - 1]} ${m[1].slice(-2)}`;
}

function formatVal(v: number, kind: "currency" | "int" | "percent"): string {
  if (!Number.isFinite(v)) return "—";
  switch (kind) {
    case "currency":
      return formatCurrency(v);
    case "int":
      return formatInt(v);
    case "percent":
      return v === 0 ? "—" : formatPercent(v);
  }
}

function pctChange(curr: number, prev: number): number | null {
  if (!Number.isFinite(prev) || prev === 0) {
    if (curr > 0) return Number.POSITIVE_INFINITY;
    return null;
  }
  return (curr - prev) / prev;
}

export interface HistorySlice {
  label: string;
  key: string;
  rows: MonthlyKpiRow[];
}

interface HistoryViewProps {
  slices: HistorySlice[];
  /** Whether the layout is split — drives table layout decisions. */
  split: boolean;
}

/**
 * History page renderer. Accepts one or more slices (one per service, or a
 * single combined slice). The chart draws one line per (metric × slice).
 * The table renders one row per (month × slice). Both share the metric
 * visibility chip-bar.
 */
export function HistoryView({ slices, split }: HistoryViewProps) {
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>(() => {
    const v = {} as Record<MetricKey, boolean>;
    for (const m of METRICS) v[m.key] = DEFAULT_VISIBLE.includes(m.key);
    return v;
  });
  const visibleMetrics = useMemo(
    () => METRICS.filter((m) => visible[m.key]),
    [visible],
  );

  const months = slices[0]?.rows.map((r) => r.month) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setVisible((v) => ({ ...v, [m.key]: !v[m.key] }))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition-all",
              visible[m.key]
                ? "border-[color:var(--color-border-strong)] bg-white"
                : "border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/60 opacity-50 hover:opacity-90",
            )}
          >
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={{ background: m.baseColor }}
            />
            {m.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
        <h3 className="text-[14px] font-semibold text-[color:var(--color-text-primary)]">
          Monthly Evolution
        </h3>
        <p className="text-[12px] text-[color:var(--color-text-secondary)]">
          Each line is normalized to its own min/max so they&apos;re comparable
          on one axis. Hover dots for the underlying value.
          {split ? " · solid = first slice · dashed = second slice." : ""}
        </p>
        <HistoryChart
          slices={slices}
          metrics={visibleMetrics}
          split={split}
        />
      </div>

      {/* Table — one section per slice. */}
      {slices.map((sl) => (
        <div
          key={sl.key}
          className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white"
        >
          {slices.length > 1 ? (
            <div className="border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2.5">
              <span
                className="font-display text-[color:var(--color-text-primary)]"
                style={{ fontSize: 14, letterSpacing: "0.06em" }}
              >
                {sl.label}
              </span>
            </div>
          ) : null}
          <div className="overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-[color:var(--color-border-subtle)]">
                  <th className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                    Month
                  </th>
                  {visibleMetrics.map((m) => (
                    <th
                      key={m.key}
                      className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]"
                    >
                      <MetricLabel
                        label={m.label}
                        tooltip={m.tooltip}
                        className="ml-auto inline-flex justify-end"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sl.rows.map((row, i) => {
                  const prev = i > 0 ? sl.rows[i - 1] : null;
                  return (
                    <tr
                      key={row.month}
                      className="border-b border-[color:var(--color-border-subtle)] last:border-b-0 transition-colors hover:bg-[color:var(--color-surface-hover)]"
                    >
                      <td className="sticky left-0 z-10 bg-white px-3 py-2.5 font-medium text-[color:var(--color-text-primary)]">
                        {shortenMonth(row.month)}
                      </td>
                      {visibleMetrics.map((m) => {
                        const v = row[m.key];
                        const p = prev ? prev[m.key] : null;
                        const delta = p != null ? pctChange(v, p) : null;
                        return (
                          <td
                            key={m.key}
                            className="px-3 py-2.5 text-right tabular-nums"
                          >
                            <span className="block">{formatVal(v, m.kind)}</span>
                            {delta != null ? (
                              <DeltaChip delta={delta} invert={!!m.invert} />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {months.length === 0 ? (
        <p className="text-center text-[12px] text-[color:var(--color-text-tertiary)]">
          No history yet.
        </p>
      ) : null}
    </div>
  );
}

function DeltaChip({ delta, invert }: { delta: number; invert: boolean }) {
  if (!Number.isFinite(delta)) return null;
  const positive = invert ? delta < 0 : delta > 0;
  const tone = delta === 0
    ? "text-[color:var(--color-text-tertiary)]"
    : positive
      ? "text-[color:var(--color-positive)]"
      : "text-[color:var(--color-negative)]";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={cn("text-[10px] font-medium tabular-nums", tone)}>
      {sign}
      {(delta * 100).toFixed(1)}%
    </span>
  );
}

interface HistoryChartProps {
  slices: HistorySlice[];
  metrics: MetricSpec[];
  split: boolean;
}

function HistoryChart({ slices, metrics, split }: HistoryChartProps) {
  const W = 980;
  const H = 300;
  const padL = 50;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const months = slices[0]?.rows.map((r) => r.month) ?? [];
  if (months.length === 0 || metrics.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Select at least one metric.
      </div>
    );
  }
  const xStep = innerW / Math.max(1, months.length - 1 || 1);

  // Each (slice × metric) line uses its own min/max across all data so all
  // lines fit on one normalized 0..1 axis. The legend says "Spend · Bathrooms"
  // when split.
  const lines = metrics.flatMap((m) =>
    slices.map((sl, sliceIdx) => {
      const values = sl.rows.map((r) => r[m.key]);
      const vmin = Math.min(...values);
      const vmax = Math.max(...values);
      const range = vmax - vmin || 1;
      const points = sl.rows.map((r, i) => ({
        x: padL + i * xStep,
        y: padT + innerH - ((r[m.key] - vmin) / range) * innerH,
        raw: r[m.key],
        month: r.month,
      }));
      const color = sliceIdx === 0 ? m.baseColor : (m.altColor ?? m.baseColor);
      const dashed = split && sliceIdx > 0;
      return {
        key: `${m.key}-${sl.key}`,
        sliceLabel: sl.label,
        metric: m,
        color,
        dashed,
        points,
      };
    }),
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-[300px] w-full"
      role="img"
      aria-label="Monthly KPI evolution"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={i}
          x1={padL}
          x2={W - padR}
          y1={padT + innerH * t}
          y2={padT + innerH * t}
          stroke="var(--color-border-subtle)"
        />
      ))}
      {lines.map((line) => (
        <g key={line.key}>
          <path
            d={line.points
              .map(
                (p, i) =>
                  `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
              )
              .join(" ")}
            fill="none"
            stroke={line.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={line.dashed ? "5 4" : undefined}
          />
          {line.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill={line.color}
            >
              <title>
                {line.metric.label}
                {split ? ` · ${line.sliceLabel}` : ""} ·{" "}
                {shortenMonth(p.month)} · {formatVal(p.raw, line.metric.kind)}
              </title>
            </circle>
          ))}
        </g>
      ))}
      {months.map((mo, i) =>
        i % Math.max(1, Math.ceil(months.length / 8)) === 0 ||
        i === months.length - 1 ? (
          <text
            key={mo}
            x={padL + i * xStep}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-text-tertiary)"
            className="font-mono"
          >
            {shortenMonth(mo)}
          </text>
        ) : null,
      )}
    </svg>
  );
}
