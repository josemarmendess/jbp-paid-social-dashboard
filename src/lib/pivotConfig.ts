import type { PivotMetrics } from "./aggregate";
import { METRIC_DEFS } from "./metricDefinitions";

export type PivotRowKind =
  | "currency"
  | "currency-precise"
  | "int"
  | "percent";

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
];

export const ALL_PIVOT_ROW_KEYS = PIVOT_ROWS.map((r) => r.key);

/** Parse the comma-separated `?pivotRows=` URL param into a known-keys list.
 *  Empty / missing param means "show all". */
export function parsePivotRowKeys(raw: string | undefined): string[] {
  if (!raw) return ALL_PIVOT_ROW_KEYS.slice();
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!wanted.length) return ALL_PIVOT_ROW_KEYS.slice();
  return ALL_PIVOT_ROW_KEYS.filter((k) => wanted.includes(k));
}

export function parsePivotColKeys(
  raw: string | undefined,
  available: string[],
): string[] {
  if (!raw) return available.slice();
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (!wanted.length) return available.slice();
  return available.filter((k) => wanted.includes(k));
}
