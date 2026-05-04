import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatInt,
} from "@/lib/format";
import type { PeriodColumn } from "@/lib/periods";
import type { PivotMetrics } from "@/lib/aggregate";

type RowKind =
  | "currency"
  | "currency-precise"
  | "int"
  | "percent";

interface RowDef {
  label: string;
  kind: RowKind;
  /** Pull a single value from a PivotMetrics. Returns null when n/a. */
  pick: (m: PivotMetrics) => number | null;
  /** First row of a visual group — bumps the top border. */
  groupTop?: boolean;
}

const ROWS: ReadonlyArray<RowDef> = [
  { label: "Spend", kind: "currency", pick: (m) => m.spend, groupTop: true },
  { label: "Leads", kind: "int", pick: (m) => m.leads },
  { label: "Cost per Lead", kind: "currency-precise", pick: (m) => m.costPerLead },
  { label: "Booked Jobs", kind: "int", pick: (m) => m.bookedJobs, groupTop: true },
  { label: "Cost per Booked Job", kind: "currency-precise", pick: (m) => m.costPerBookedJob },
  { label: "Revenue", kind: "currency", pick: (m) => m.revenue, groupTop: true },
  { label: "Spend on Revenue", kind: "percent", pick: (m) => m.spendOnRevenue },
  { label: "Average Sale Value", kind: "currency", pick: (m) => m.averageSaleValue, groupTop: true },
  { label: "Cancellation Rate", kind: "percent", pick: (m) => m.cancellationRate },
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
  /** Same length & order as periods. */
  values: PivotMetrics[];
}

export function PivotTable({ periods, values }: PivotTableProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <Table>
        <TableHeader className="bg-card">
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card text-xs uppercase tracking-wide text-muted-foreground">
                Metric
              </TableHead>
              {periods.map((p) => (
                <TableHead
                  key={p.key}
                  className="text-right text-xs uppercase tracking-wide text-muted-foreground"
                >
                  {p.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow
                key={row.label}
                className={cn(
                  row.groupTop && "border-t-2 border-border/60",
                )}
              >
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  {row.label}
                </TableCell>
                {values.map((m, i) => {
                  const v = row.pick(m);
                  const isNa = v === null || !Number.isFinite(v);
                  return (
                    <TableCell
                      key={periods[i].key}
                      className={cn(
                        "text-right tabular-nums",
                        isNa && "text-zinc-400 dark:text-zinc-500",
                      )}
                    >
                      {formatCell(v, row.kind)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
      </Table>
    </div>
  );
}
