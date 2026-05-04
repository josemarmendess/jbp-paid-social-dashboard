"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatInt, formatRoas } from "@/lib/format";
import type { AggregatedCampaign } from "@/lib/aggregate";

type SortKey =
  | "campaignName"
  | "spend"
  | "impressions"
  | "linkClicks"
  | "leads"
  | "cpl"
  | "bookedJobs"
  | "sales"
  | "cac"
  | "roas";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const COLUMNS: ReadonlyArray<{ key: SortKey; label: string; align: "left" | "right" }> = [
  { key: "campaignName", label: "Campaign", align: "left" },
  { key: "spend", label: "Spend", align: "right" },
  { key: "impressions", label: "Impressions", align: "right" },
  { key: "linkClicks", label: "Link Clicks", align: "right" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "cpl", label: "CPL", align: "right" },
  { key: "bookedJobs", label: "Booked", align: "right" },
  { key: "sales", label: "Revenue", align: "right" },
  { key: "cac", label: "CAC", align: "right" },
  { key: "roas", label: "ROAS", align: "right" },
];

function getValue(r: AggregatedCampaign, key: SortKey): number | string {
  switch (key) {
    case "campaignName":
      return r.campaignName.toLowerCase();
    case "spend":
      return r.spend;
    case "impressions":
      return r.impressions;
    case "linkClicks":
      return r.linkClicks;
    case "leads":
      return r.leads;
    case "cpl":
      return r.leads > 0 ? r.spend / r.leads : Number.POSITIVE_INFINITY;
    case "bookedJobs":
      return r.bookedJobs;
    case "sales":
      return r.sales;
    case "cac":
      return r.bookedJobs > 0 ? r.spend / r.bookedJobs : Number.POSITIVE_INFINITY;
    case "roas":
      return r.spend > 0 ? r.sales / r.spend : 0;
  }
}

function compareRows(a: AggregatedCampaign, b: AggregatedCampaign, s: SortState): number {
  const av = getValue(a, s.key);
  const bv = getValue(b, s.key);
  let cmp: number;
  if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
  else cmp = (av as number) - (bv as number);
  return s.dir === "asc" ? cmp : -cmp;
}

function roasTone(roas: number): string {
  if (!Number.isFinite(roas) || roas === 0) return "";
  if (roas >= 3) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (roas < 1) return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "";
}

export function CampaignPerformanceTable({ rows }: { rows: AggregatedCampaign[] }) {
  const [sort, setSort] = useState<SortState>({ key: "sales", dir: "desc" });
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareRows(a, b, sort));
    return copy;
  }, [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "campaignName" ? "asc" : "desc" },
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
        No data for this period yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs uppercase tracking-wide text-muted-foreground",
                      col.align === "right" && "text-right",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground",
                        col.align === "right" && "ml-auto",
                        active && "text-foreground",
                      )}
                    >
                      {col.label}
                      <Icon className="size-3" aria-hidden="true" />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => {
              const cpl = row.leads > 0 ? row.spend / row.leads : 0;
              const cac = row.bookedJobs > 0 ? row.spend / row.bookedJobs : 0;
              const roas = row.spend > 0 ? row.sales / row.spend : 0;
              return (
                <TableRow key={row.campaignName}>
                  <TableCell
                    className="max-w-[360px] truncate font-medium"
                    title={row.campaignName}
                  >
                    {row.campaignName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.spend, true)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(row.impressions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(row.linkClicks)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(row.leads)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.leads > 0 ? formatCurrency(cpl, true) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatInt(row.bookedJobs)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.sales, true)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.bookedJobs > 0 ? formatCurrency(cac, true) : "—"}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      roasTone(roas),
                    )}
                  >
                    {formatRoas(roas)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
      </Table>
    </div>
  );
}
