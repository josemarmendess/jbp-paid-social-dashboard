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
  /** Higher = better unless this is true (CPL-like / cancel-like). */
  invert?: boolean;
  color: string;
}

const METRICS: MetricSpec[] = [
  { key: "spend", label: "Spend", tooltip: METRIC_DEFS.spend, kind: "currency", invert: true, color: "var(--color-jbp-blue)" },
  { key: "leads", label: "Leads", tooltip: METRIC_DEFS.leads, kind: "int", color: "#0891b2" },
  { key: "bookedJobs", label: "Booked Jobs", tooltip: METRIC_DEFS.bookedJobs, kind: "int", color: "#7c3aed" },
  { key: "soldJobs", label: "Sold Jobs", tooltip: METRIC_DEFS.soldJobs, kind: "int", color: "var(--color-positive)" },
  { key: "sales", label: "Sales Revenue", tooltip: METRIC_DEFS.salesRevenue, kind: "currency", color: "#047857" },
  { key: "spendOnRevenue", label: "Spend on Revenue", tooltip: METRIC_DEFS.spendOnRevenue, kind: "percent", invert: true, color: "var(--color-warning)" },
  { key: "ctr", label: "CTR", tooltip: METRIC_DEFS.ctr, kind: "percent", color: "#1d4ed8" },
  { key: "leadRate", label: "Lead Rate", tooltip: METRIC_DEFS.leadRate, kind: "percent", color: "#0e7490" },
  { key: "bookRate", label: "Book Rate", tooltip: METRIC_DEFS.bookRate, kind: "percent", color: "#15803d" },
  { key: "showRate", label: "Show Rate", tooltip: METRIC_DEFS.showRate, kind: "percent", color: "#65a30d" },
  { key: "closeRate", label: "Close Rate", tooltip: METRIC_DEFS.closeRate, kind: "percent", color: "#a16207" },
  { key: "cancellationRate", label: "Cancellation Rate", tooltip: METRIC_DEFS.cancellationRate, kind: "percent", invert: true, color: "var(--color-jbp-red)" },
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

interface HistoryViewProps {
  rows: MonthlyKpiRow[];
}

/**
 * History page — month-by-month KPI evolution. Includes:
 *  - A multi-select chip bar to toggle which KPIs are visible
 *  - A multi-line chart of all selected metrics (auto-normalized)
 *  - A wide table with one row per month and MoM delta chips
 */
export function HistoryView({ rows }: HistoryViewProps) {
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>(() => {
    const v = {} as Record<MetricKey, boolean>;
    for (const m of METRICS) v[m.key] = DEFAULT_VISIBLE.includes(m.key);
    return v;
  });
  const visibleMetrics = useMemo(
    () => METRICS.filter((m) => visible[m.key]),
    [visible],
  );

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
              style={{ background: m.color }}
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
        </p>
        <HistoryChart rows={rows} metrics={visibleMetrics} />
      </div>

      <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
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
              {rows.map((row, i) => {
                const prev = i > 0 ? rows[i - 1] : null;
                return (
                  <tr
                    key={row.month}
                    className="border-b border-[color:var(--color-border-subtle)] last:border-b-0"
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
                            <DeltaChip
                              delta={delta}
                              invert={!!m.invert}
                            />
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
  rows: MonthlyKpiRow[];
  metrics: MetricSpec[];
}

function HistoryChart({ rows, metrics }: HistoryChartProps) {
  const W = 940;
  const H = 280;
  const padL = 50;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  if (rows.length === 0 || metrics.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12px] text-[color:var(--color-text-tertiary)]">
        Select at least one metric.
      </div>
    );
  }
  const xStep = innerW / Math.max(1, rows.length - 1 || 1);

  // Each line uses its own min/max so they fit one axis. We draw on a 0-1 scale.
  const lines = metrics.map((m) => {
    const values = rows.map((r) => r[m.key]);
    const vmin = Math.min(...values);
    const vmax = Math.max(...values);
    const range = vmax - vmin || 1;
    const points = rows.map((r, i) => ({
      x: padL + i * xStep,
      y: padT + innerH - ((r[m.key] - vmin) / range) * innerH,
      raw: r[m.key],
      month: r.month,
    }));
    return { metric: m, points, vmin, vmax };
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-[280px] w-full"
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
      {lines.map(({ metric, points }) => (
        <g key={metric.key}>
          <path
            d={points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ")}
            fill="none"
            stroke={metric.color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill={metric.color}
            >
              <title>
                {metric.label} · {shortenMonth(p.month)} ·{" "}
                {formatVal(p.raw, metric.kind)}
              </title>
            </circle>
          ))}
        </g>
      ))}
      {rows.map((r, i) =>
        i % Math.max(1, Math.ceil(rows.length / 8)) === 0 ||
        i === rows.length - 1 ? (
          <text
            key={r.month}
            x={padL + i * xStep}
            y={H - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-text-tertiary)"
            className="font-mono"
          >
            {shortenMonth(r.month)}
          </text>
        ) : null,
      )}
    </svg>
  );
}
