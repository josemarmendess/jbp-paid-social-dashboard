"use client";

import { useMemo, forwardRef } from "react";
import {
  computePivotMetrics,
  type PivotMetrics,
} from "@/lib/aggregate";
import { normalizeService } from "@/lib/serviceTaxonomy";
import {
  formatCompactInt,
  formatCompactMoney,
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { getPivotPeriods } from "@/lib/periods";
import { PIVOT_ROWS } from "@/lib/pivotConfig";
import {
  DAILY_SUMMARY_SERVICES,
  type DailySummaryConfig,
  type DailySummaryMetric,
  type DailySummaryPeriod,
} from "@/lib/reportTemplates";
import { SLICE_TONES, toneForLabel } from "@/lib/sliceColors";
import type { PaidSocialPayload } from "@/lib/types";

/**
 * Self-contained, printable daily-summary report. Renders entirely from
 * `config` + the cached payload — no interactive UI, no toggles. The editor
 * page wraps this in a customise panel; html-to-image / jspdf rasterise this
 * exact DOM for download or Slack send.
 *
 * forwardRef lets the parent grab the root node so the export tools can
 * snapshot it directly.
 */

interface DailySummaryReportProps {
  data: PaidSocialPayload;
  config: DailySummaryConfig;
  /** Stamp shown in the header. Falls back to data.generated_at. */
  generatedAt?: string;
}

const formatTimestamp = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export const DailySummaryReport = forwardRef<
  HTMLDivElement,
  DailySummaryReportProps
>(function DailySummaryReport({ data, config, generatedAt }, ref) {
  const ts = generatedAt ?? data.generated_at;
  const stamp = useMemo(() => {
    try {
      return formatTimestamp.format(new Date(ts)) + " CT";
    } catch {
      return ts;
    }
  }, [ts]);

  // Map period keys → DateRange via the canonical pivot period builder.
  // Keyed off `ts` (the payload's generated_at) rather than `[]` so the
  // ranges recompute whenever data refreshes — an empty deps array froze
  // "Today"/"Yesterday" at component-mount time, so a refresh (which
  // re-fetches data but does NOT remount the client component) left the
  // columns pointing at a stale calendar date.
  const pivotPeriods = useMemo(() => getPivotPeriods(), [ts]);
  const periodByKey = useMemo(() => {
    const out: Record<string, (typeof pivotPeriods)[number]> = {};
    for (const p of pivotPeriods) out[p.key] = p;
    return out;
  }, [pivotPeriods]);

  // Materialise every (service × period) → PivotMetrics cell up front.
  // Cheap (computePivotMetrics is memoised per-request) but isolating it
  // here keeps the JSX clean.
  const cells = useMemo(() => {
    const out: Record<string, PivotMetrics> = {};
    for (const sliceKey of config.services) {
      const bu = sliceKey === "all" ? [] : [sliceKey];
      for (const periodKey of config.periods) {
        const range = periodByKey[periodKey]?.range;
        if (!range) continue;
        const k = `${sliceKey}|${periodKey}`;
        out[k] = computePivotMetrics(
          data.meta_insights,
          data.servicetitan_social_leads,
          range,
          bu,
        );
      }
    }
    return out;
  }, [data, config.services, config.periods, periodByKey]);

  // Filter PIVOT_ROWS down to the user's selected metric set, preserving the
  // user's chosen order (config.metrics drives the row order, not the
  // default catalog).
  const visibleRows = useMemo(() => {
    return config.metrics
      .map((m) => PIVOT_ROWS.find((r) => r.key === m))
      .filter((r): r is (typeof PIVOT_ROWS)[number] => r !== undefined);
  }, [config.metrics]);

  return (
    <div
      ref={ref}
      style={{
        background: "var(--color-jbp-cream)",
        padding: "32px 36px",
        fontFamily: "var(--font-sans)",
        color: "var(--color-jbp-text)",
        width: 1100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 16,
          borderBottom: "2px solid var(--color-jbp-ink)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: "var(--color-jbp-red)",
              fontFamily: "var(--font-mono)",
            }}
          >
            JBP Paid Social · Report
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {config.title}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-jbp-text-2)",
            fontFamily: "var(--font-mono)",
            textAlign: "right",
            letterSpacing: 0.4,
          }}
        >
          Generated
          <br />
          {stamp}
        </div>
      </div>

      {/* Service sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 20 }}>
        {config.services.map((sliceKey) => {
          const def = DAILY_SUMMARY_SERVICES.find((s) => s.key === sliceKey);
          if (!def) return null;
          return (
            <ServiceSection
              key={sliceKey}
              sliceKey={sliceKey}
              label={def.label}
              periods={config.periods}
              periodByKey={periodByKey}
              rows={visibleRows}
              cells={cells}
              heroPeriod={config.heroPeriod}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--color-jbp-hairline)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--color-jbp-text-3)",
          fontFamily: "var(--font-mono)",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        <span>America/Chicago · Meta Ads ↔ ServiceTitan</span>
        <span>Make a Good Call · J. Blanton Plumbing · Est. 1993</span>
      </div>
    </div>
  );
});

function ServiceSection({
  sliceKey,
  label,
  periods,
  periodByKey,
  rows,
  cells,
  heroPeriod,
}: {
  sliceKey: string;
  label: string;
  periods: ReadonlyArray<DailySummaryPeriod>;
  periodByKey: Record<string, ReturnType<typeof getPivotPeriods>[number]>;
  rows: ReadonlyArray<(typeof PIVOT_ROWS)[number]>;
  cells: Record<string, PivotMetrics>;
  heroPeriod: DailySummaryPeriod | null;
}) {
  const tone = toneForLabel(sliceKey === "all" ? "Total" : label);
  const t = SLICE_TONES[tone];

  return (
    <div
      style={{
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
      }}
    >
      {/* Slice header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
          borderLeft: `3px solid ${t.rail}`,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
            color: t.text,
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 7px",
            background: t.chipBg,
            color: t.chipText,
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {sliceKey === "all" ? "Total" : "Service line"}
        </span>
      </div>

      {/* Metric × Period table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr style={{ background: "var(--color-jbp-paper)" }}>
            <th
              style={{
                ...thStyle,
                textAlign: "left",
                width: 180,
              }}
            >
              Metric
            </th>
            {periods.map((p) => {
              const def = periodByKey[p];
              const isHero = heroPeriod === p;
              return (
                <th
                  key={p}
                  style={{
                    ...thStyle,
                    textAlign: "right",
                    background: isHero
                      ? "var(--color-jbp-ink)"
                      : "var(--color-jbp-paper)",
                    color: isHero
                      ? "var(--color-jbp-cream)"
                      : "var(--color-jbp-text-2)",
                  }}
                >
                  {def?.label?.toUpperCase() ?? p}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={row.key}
              style={{
                borderTop:
                  rowIdx > 0
                    ? "1px solid var(--color-jbp-hairline-soft)"
                    : "none",
              }}
            >
              <td
                style={{
                  ...tdStyle,
                  fontWeight: 700,
                  color: "var(--color-jbp-text)",
                  textAlign: "left",
                }}
              >
                {row.label}
              </td>
              {periods.map((p) => {
                const cell = cells[`${sliceKey}|${p}`];
                const value = cell ? row.pick(cell) : null;
                const isHero = heroPeriod === p;
                return (
                  <td
                    key={p}
                    style={{
                      ...tdStyle,
                      textAlign: "right",
                      background: isHero
                        ? "var(--color-jbp-paper)"
                        : "transparent",
                      fontWeight: isHero ? 700 : 600,
                      color: formatCellColor(row.kind, value),
                    }}
                  >
                    {formatCellValue(row.kind, value)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: "8px 12px",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: "uppercase" as const,
  color: "var(--color-jbp-text-2)",
  borderBottom: "1px solid var(--color-jbp-hairline)",
};

const tdStyle = {
  padding: "9px 12px",
};

function formatCellValue(
  kind: (typeof PIVOT_ROWS)[number]["kind"],
  value: number | null,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (kind) {
    case "currency":
      return formatCompactMoney(value);
    case "currency-precise":
      return formatCurrency(value, true);
    case "int":
      return value >= 1000
        ? formatCompactInt(value)
        : formatInt(value);
    case "percent":
      // PivotMetrics percents are 0-100, formatPercent expects ratios.
      return value.toFixed(1) + "%";
    case "roas":
      return value.toFixed(2) + "x";
    case "days":
      return value.toFixed(1) + "d";
  }
}

/** Light color hint for ratio metrics — green when good, red when bad,
 *  default text otherwise. Keeps the report scannable at a glance. */
function formatCellColor(
  kind: (typeof PIVOT_ROWS)[number]["kind"],
  _value: number | null,
): string {
  // Neutral by default — color-coded thresholds tend to feel arbitrary
  // without per-metric goals. Kept as a hook for a future settings page.
  return "var(--color-jbp-text)";
}

// We intentionally don't use the metric/period typedefs here at runtime —
// re-export so other modules can grab them through this file too.
export type { DailySummaryMetric, DailySummaryPeriod };
