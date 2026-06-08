import "server-only";
import { computePivotMetrics } from "@/lib/aggregate";
import {
  formatCurrency,
  formatInt,
  formatPercent,
  formatRoas,
} from "@/lib/format";
import { getPivotPeriods, type PeriodColumn } from "@/lib/periods";
import { PIVOT_ROWS, type PivotRowDef } from "@/lib/pivotConfig";
import {
  type DailySummaryConfig,
  type DailySummaryMetric,
} from "@/lib/reportTemplates";
import type { PaidSocialPayload } from "@/lib/types";

/**
 * Build the mrkdwn text summary that accompanies the Slack preview/approval
 * card. Same metrics the user picked for the report image, "All services"
 * only (no per-service split). The text rollup is ALWAYS Month-to-Date —
 * regardless of which column the image highlights — because the operator
 * uses it to track the running month on Slack.
 */
export function buildDailySummaryText(
  data: PaidSocialPayload,
  config: DailySummaryConfig,
): string {
  const periods = getPivotPeriods();
  const period =
    periods.find((p) => p.key === "month_to_date") ?? periods[0];

  return formatPeriodSummary(data, period, config.metrics);
}

function formatPeriodSummary(
  data: PaidSocialPayload,
  period: PeriodColumn,
  metrics: ReadonlyArray<DailySummaryMetric>,
): string {
  const m = computePivotMetrics(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.range,
    "All",
  );
  const lines: string[] = [];
  // Slack mrkdwn doesn't honour fixed-width fonts outside ``` blocks, so we
  // wrap the per-metric table in a code fence to get neat label/value
  // alignment in the reviewer's chat.
  const labelWidth = metrics
    .map((k) => rowFor(k)?.label.length ?? 0)
    .reduce((a, b) => Math.max(a, b), 0);
  for (const key of metrics) {
    const row = rowFor(key);
    if (!row) continue;
    const value = formatValue(row, m);
    lines.push(`${row.label.padEnd(labelWidth)}  ${value}`);
  }
  if (lines.length === 0) return "";
  return [
    `*Total — All services · ${period.label}*`,
    "```",
    lines.join("\n"),
    "```",
  ].join("\n");
}

function rowFor(key: DailySummaryMetric): PivotRowDef | undefined {
  return PIVOT_ROWS.find((r) => r.key === key);
}

function formatValue(
  row: PivotRowDef,
  m: ReturnType<typeof computePivotMetrics>,
): string {
  const v = row.pick(m);
  if (v === null || !Number.isFinite(v)) return "n/a";
  switch (row.kind) {
    case "currency":
      return formatCurrency(v);
    case "currency-precise":
      return formatCurrency(v, true);
    case "int":
      return formatInt(v);
    case "percent":
      // PivotMetrics percentages are already 0-100 — convert back to ratio
      // for formatPercent (which expects a 0-1 fraction).
      return formatPercent(v / 100);
    case "roas":
      return formatRoas(v);
    case "days": {
      const rounded = Math.round(v * 10) / 10;
      return `${rounded.toFixed(1)} day${rounded === 1 ? "" : "s"}`;
    }
  }
}
