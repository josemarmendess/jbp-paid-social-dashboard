import type { PivotMetrics } from "./aggregate";
import { METRIC_DEFS } from "./metricDefinitions";

export type PivotRowKind =
  | "currency"
  | "currency-precise"
  | "int"
  | "percent"
  | "roas"
  | "days";

export interface PivotRowDef {
  key: string;
  label: string;
  tooltip: string;
  kind: PivotRowKind;
  pick: (m: PivotMetrics) => number | null;
  /** First row of a visual group — bumps the top border. */
  groupTop?: boolean;
}

export const PIVOT_ROWS: ReadonlyArray<PivotRowDef> = [
  {
    key: "spend",
    label: "Spend",
    tooltip: METRIC_DEFS.spend,
    kind: "currency",
    pick: (m) => m.spend,
    groupTop: true,
  },
  {
    key: "leads",
    label: "Leads",
    tooltip: METRIC_DEFS.leads,
    kind: "int",
    pick: (m) => m.leads,
  },
  {
    key: "costPerLead",
    label: "Cost per Lead",
    tooltip: METRIC_DEFS.costPerLead,
    kind: "currency-precise",
    pick: (m) => m.costPerLead,
  },
  {
    key: "bookedJobs",
    label: "Booked Jobs",
    tooltip: METRIC_DEFS.bookedJobs,
    kind: "int",
    pick: (m) => m.bookedJobs,
    groupTop: true,
  },
  {
    key: "costPerBookedJob",
    label: "Cost per Booked Job",
    tooltip: METRIC_DEFS.costPerBookedJob,
    kind: "currency-precise",
    pick: (m) => m.costPerBookedJob,
  },
  {
    key: "salesRevenue",
    label: "Sales Revenue",
    tooltip: METRIC_DEFS.salesRevenue,
    kind: "currency",
    pick: (m) => m.revenue,
    groupTop: true,
  },
  {
    key: "spendOnRevenue",
    label: "Spend on Revenue",
    tooltip: METRIC_DEFS.spendOnRevenue,
    kind: "percent",
    pick: (m) => m.spendOnRevenue,
  },
  {
    key: "averageSaleValue",
    label: "Average Sale Value",
    tooltip: METRIC_DEFS.averageSaleValue,
    kind: "currency",
    pick: (m) => m.averageSaleValue,
    groupTop: true,
  },
  {
    key: "cancellationRate",
    label: "Cancellation Rate",
    tooltip: METRIC_DEFS.cancellationRate,
    kind: "percent",
    pick: (m) => m.cancellationRate,
  },
  // Reach group
  {
    key: "impressions",
    label: "Impressions",
    tooltip: METRIC_DEFS.impressions,
    kind: "int",
    pick: (m) => m.impressions,
    groupTop: true,
  },
  {
    key: "linkClicks",
    label: "Link Clicks",
    tooltip: METRIC_DEFS.linkClicks,
    kind: "int",
    pick: (m) => m.linkClicks,
  },
  {
    key: "ctr",
    label: "CTR",
    tooltip: METRIC_DEFS.ctr,
    kind: "percent",
    pick: (m) => m.ctr,
  },
  // Funnel rates
  {
    key: "leadRate",
    label: "Lead Rate",
    tooltip: METRIC_DEFS.leadRate,
    kind: "percent",
    pick: (m) => m.leadRate,
    groupTop: true,
  },
  {
    key: "bookRate",
    label: "Book Rate",
    tooltip: METRIC_DEFS.bookRate,
    kind: "percent",
    pick: (m) => m.bookRate,
  },
  {
    key: "showRate",
    label: "Show Rate",
    tooltip: METRIC_DEFS.showRate,
    kind: "percent",
    pick: (m) => m.showRate,
  },
  {
    key: "closeRate",
    label: "Close Rate",
    tooltip: METRIC_DEFS.closeRate,
    kind: "percent",
    pick: (m) => m.closeRate,
  },
  // Outcome group
  {
    key: "soldJobs",
    label: "Sold Jobs",
    tooltip: METRIC_DEFS.soldJobs,
    kind: "int",
    pick: (m) => m.soldJobs,
    groupTop: true,
  },
  {
    key: "roas",
    label: "ROAS",
    tooltip: METRIC_DEFS.roas,
    kind: "roas",
    pick: (m) => m.roas,
  },
  {
    key: "avgDaysToClose",
    label: "Avg Days to Close",
    tooltip: METRIC_DEFS.avgDaysToClose,
    kind: "days",
    pick: (m) => m.avgDaysToClose,
  },
  {
    key: "avgDaysToComplete",
    label: "Avg Days to Complete",
    tooltip: METRIC_DEFS.avgDaysToComplete,
    kind: "days",
    pick: (m) => m.avgDaysToComplete,
  },
];

/** Row keys visible by default when the URL has no `?pivotRows=` param.
 *  Keeps the headline 9 metrics shown; new fields opt-in via Customize. */
export const DEFAULT_PIVOT_ROW_KEYS = [
  "spend",
  "leads",
  "costPerLead",
  "bookedJobs",
  "costPerBookedJob",
  "salesRevenue",
  "spendOnRevenue",
  "averageSaleValue",
  "cancellationRate",
];

export const ALL_PIVOT_ROW_KEYS = PIVOT_ROWS.map((r) => r.key);

/** Parse the comma-separated `?pivotRows=` URL param into a known-keys list.
 *  Empty / missing param → default 9 rows. Sentinel "_none_" → empty list
 *  (user explicitly hid every row). The Customize popover lets the user
 *  opt new metrics (Impressions, ROAS, etc.) in. */
export function parsePivotRowKeys(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_PIVOT_ROW_KEYS.slice();
  if (raw === "_none_") return [];
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!wanted.length) return DEFAULT_PIVOT_ROW_KEYS.slice();
  return ALL_PIVOT_ROW_KEYS.filter((k) => wanted.includes(k));
}

export function parsePivotColKeys(
  raw: string | undefined,
  available: string[],
): string[] {
  if (!raw) return available.slice();
  if (raw === "_none_") return [];
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!wanted.length) return available.slice();
  return available.filter((k) => wanted.includes(k));
}
