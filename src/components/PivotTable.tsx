import { MetricLabel } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatInt } from "@/lib/format";
import type { PeriodColumn } from "@/lib/periods";
import type { PivotMetrics } from "@/lib/aggregate";
import { METRIC_DEFS } from "@/lib/metricDefinitions";

type RowKind =
  | "currency"
  | "currency-precise"
  | "int"
  | "percent";

interface RowDef {
  label: string;
  kind: RowKind;
  /** Tooltip definition string from METRIC_DEFS. */
  tooltip: React.ReactNode;
  pick: (m: PivotMetrics) => number | null;
  groupTop?: boolean;
}

const ROWS: ReadonlyArray<RowDef> = [
  {
    label: "Spend",
    kind: "currency",
    tooltip: METRIC_DEFS.spend,
    pick: (m) => m.spend,
    groupTop: true,
  },
  {
    label: "Leads",
    kind: "int",
    tooltip: METRIC_DEFS.leads,
    pick: (m) => m.leads,
  },
  {
    label: "Cost per Lead",
    kind: "currency-precise",
    tooltip: METRIC_DEFS.costPerLead,
    pick: (m) => m.costPerLead,
  },
  {
    label: "Booked Jobs",
    kind: "int",
    tooltip: METRIC_DEFS.bookedJobs,
    pick: (m) => m.bookedJobs,
    groupTop: true,
  },
  {
    label: "Cost per Booked Job",
    kind: "currency-precise",
    tooltip: METRIC_DEFS.costPerBookedJob,
    pick: (m) => m.costPerBookedJob,
  },
  {
    label: "Sales Revenue",
    kind: "currency",
    tooltip: METRIC_DEFS.salesRevenue,
    pick: (m) => m.revenue,
    groupTop: true,
  },
  {
    label: "Spend on Revenue",
    kind: "percent",
    tooltip: METRIC_DEFS.spendOnRevenue,
    pick: (m) => m.spendOnRevenue,
  },
  {
    label: "Average Sale Value",
    kind: "currency",
    tooltip: METRIC_DEFS.averageSaleValue,
    pick: (m) => m.averageSaleValue,
    groupTop: true,
  },
  {
    label: "Cancellation Rate",
    kind: "percent",
    tooltip: METRIC_DEFS.cancellationRate,
    pick: (m) => m.cancellationRate,
  },
];

function formatCell(value: number | null, kind: RowKind): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  switch (kind) {
    case "currency":
      return formatCurrency(value);
    case "currency-precise":
      return formatCurrency(value, true);
    case "int":
      return formatInt(value);
    case "percent":
      return `${Math.round(value)}%`;
  }
}

interface PivotTableProps {
  periods: PeriodColumn[];
  values: PivotMetrics[];
  /** Optional title shown above the table (e.g., service name in stacked view). */
  caption?: string;
}

export function PivotTable({ periods, values, caption }: PivotTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
      {caption ? (
        <div className="flex items-baseline justify-between border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2.5">
          <span
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 14, letterSpacing: "0.06em" }}
          >
            {caption}
          </span>
        </div>
      ) : null}
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead className="bg-white">
            <tr className="border-b border-[color:var(--color-border-subtle)]">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                Metric
              </th>
              {periods.map((p) => (
                <th
                  key={p.key}
                  className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.label}
                className={cn(
                  "border-b border-[color:var(--color-border-subtle)] last:border-b-0",
                  row.groupTop &&
                    "border-t-[1.5px] border-t-[color:var(--color-border-strong)]",
                )}
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5">
                  <MetricLabel
                    label={row.label}
                    tooltip={row.tooltip}
                    className="font-medium text-[color:var(--color-text-primary)]"
                  />
                </td>
                {values.map((m, i) => {
                  const v = row.pick(m);
                  const isNa = v === null || !Number.isFinite(v);
                  return (
                    <td
                      key={periods[i].key}
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        isNa && "text-[color:var(--color-text-tertiary)]",
                      )}
                    >
                      {formatCell(v, row.kind)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
