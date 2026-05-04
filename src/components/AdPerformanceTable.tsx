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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatInt,
  formatRoas,
} from "@/lib/format";
import type { AggregatedAd } from "@/lib/types";

const PAGE_SIZE = 25;

type SortKey =
  | "adName"
  | "businessUnit"
  | "audience"
  | "campaignName"
  | "adsetName"
  | "spend"
  | "impressions"
  | "linkClicks"
  | "leads"
  | "cpl"
  | "bookedJobs"
  | "cpBooked"
  | "sales"
  | "roas";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

const COLUMNS: ReadonlyArray<{
  key: SortKey;
  label: string;
  align: "left" | "right";
}> = [
  { key: "adName", label: "Ad Name", align: "left" },
  { key: "businessUnit", label: "Service", align: "left" },
  { key: "audience", label: "Audience", align: "left" },
  { key: "campaignName", label: "Campaign", align: "left" },
  { key: "adsetName", label: "Adset", align: "left" },
  { key: "spend", label: "Spend", align: "right" },
  { key: "impressions", label: "Impressions", align: "right" },
  { key: "linkClicks", label: "Link Clicks", align: "right" },
  { key: "leads", label: "Leads", align: "right" },
  { key: "cpl", label: "CPL", align: "right" },
  { key: "bookedJobs", label: "Booked", align: "right" },
  { key: "cpBooked", label: "CP Booked", align: "right" },
  { key: "sales", label: "Sales", align: "right" },
  { key: "roas", label: "ROAS", align: "right" },
];

function getValue(row: AggregatedAd, key: SortKey): number | string {
  switch (key) {
    case "adName":
      return row.adName.toLowerCase();
    case "businessUnit":
      return (row.businessUnit ?? "").toLowerCase();
    case "audience":
      return row.audience.toLowerCase();
    case "campaignName":
      return (row.campaignName ?? "").toLowerCase();
    case "adsetName":
      return (row.adsetName ?? "").toLowerCase();
    case "spend":
      return row.spend;
    case "impressions":
      return row.impressions;
    case "linkClicks":
      return row.linkClicks;
    case "leads":
      return row.leads;
    case "cpl":
      return row.leads > 0 ? row.spend / row.leads : Number.POSITIVE_INFINITY;
    case "bookedJobs":
      return row.bookedJobs;
    case "cpBooked":
      return row.bookedJobs > 0
        ? row.spend / row.bookedJobs
        : Number.POSITIVE_INFINITY;
    case "sales":
      return row.sales;
    case "roas":
      return row.spend > 0 ? row.sales / row.spend : 0;
  }
}

function compareRows(a: AggregatedAd, b: AggregatedAd, sort: SortState): number {
  const av = getValue(a, sort.key);
  const bv = getValue(b, sort.key);
  let cmp: number;
  if (typeof av === "string" && typeof bv === "string") {
    cmp = av.localeCompare(bv);
  } else {
    cmp = (av as number) - (bv as number);
  }
  return sort.dir === "asc" ? cmp : -cmp;
}

function roasTone(roas: number): string {
  if (!Number.isFinite(roas) || roas === 0) return "";
  if (roas >= 3) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (roas < 1) return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return "";
}

export function AdPerformanceTable({ rows }: { rows: AggregatedAd[] }) {
  const [sort, setSort] = useState<SortState>({ key: "sales", dir: "desc" });
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => compareRows(a, b, sort));
    return copy;
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    setPage(0);
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir:
              key === "adName" ||
              key === "campaignName" ||
              key === "adsetName" ||
              key === "audience" ||
              key === "businessUnit"
                ? "asc"
                : "desc",
          },
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
      <div className="max-h-[640px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                const Icon = active
                  ? sort.dir === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ChevronsUpDown;
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
            {pageRows.map((row) => {
              const cpl = row.leads > 0 ? row.spend / row.leads : 0;
              const cpBooked =
                row.bookedJobs > 0 ? row.spend / row.bookedJobs : 0;
              const roas = row.spend > 0 ? row.sales / row.spend : 0;
              return (
                <TableRow key={row.adName}>
                  <TableCell
                    className="max-w-[280px] truncate font-medium"
                    title={row.adName}
                  >
                    {row.adName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.businessUnit ? (
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                        {row.businessUnit}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                        row.audience === "Retargeting"
                          ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100"
                          : "bg-muted text-foreground",
                      )}
                    >
                      {row.audience}
                    </span>
                  </TableCell>
                  <TableCell
                    className="max-w-[180px] truncate text-muted-foreground"
                    title={row.campaignName}
                  >
                    {row.campaignName || "—"}
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate text-muted-foreground"
                    title={row.adsetName}
                  >
                    {row.adsetName || "—"}
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
                    {row.bookedJobs > 0 ? formatCurrency(cpBooked, true) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(row.sales, true)}
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
      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-xs text-muted-foreground tabular-nums">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
