"use client";

import { useMemo, useState } from "react";
import type { AggregatedAd } from "@/lib/types";
import { formatCurrency, formatInt, formatRoas } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SortKey = "spend" | "sales" | "roas" | "leads";

interface CreativePerformanceGridProps {
  ads: AggregatedAd[];
  /** ad_name -> last 7 days of spend (oldest first). */
  sevenDay: Record<string, number[]>;
}

const PAGE_SIZE = 12;
const MIN_SPEND = 50;

function sparklinePath(values: number[], width: number, height: number): string {
  if (!values.length) return "";
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - (v / max) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M ${points.join(" L ")}`;
}

function roasBorderClass(roas: number): string {
  if (!Number.isFinite(roas) || roas === 0) return "border-border/60";
  if (roas >= 3) return "border-emerald-500/60";
  if (roas >= 1) return "border-amber-500/60";
  return "border-rose-500/60";
}

export function CreativePerformanceGrid({
  ads,
  sevenDay,
}: CreativePerformanceGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>("sales");
  const [onlyAboveMin, setOnlyAboveMin] = useState(true);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const base = onlyAboveMin ? ads.filter((a) => a.spend >= MIN_SPEND) : ads;
    const copy = [...base];
    copy.sort((a, b) => {
      switch (sortKey) {
        case "spend":
          return b.spend - a.spend;
        case "sales":
          return b.sales - a.sales;
        case "leads":
          return b.leads - a.leads;
        case "roas": {
          const ar = a.spend > 0 ? a.sales / a.spend : 0;
          const br = b.spend > 0 ? b.sales / b.spend : 0;
          return br - ar;
        }
      }
    });
    return copy;
  }, [ads, onlyAboveMin, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (ads.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
        No data for this period yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { k: "sales", l: "Top Sales" },
              { k: "spend", l: "Top Spend" },
              { k: "roas", l: "Top ROAS" },
              { k: "leads", l: "Top Leads" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.k}
              type="button"
              onClick={() => {
                setSortKey(opt.k);
                setPage(0);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                sortKey === opt.k
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.l}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOnlyAboveMin((v) => !v);
              setPage(0);
            }}
            className={cn(
              "ml-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              onlyAboveMin
                ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            Spend &gt; $50 only
          </button>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} {filtered.length === 1 ? "ad" : "ads"}
        </span>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
          No ads match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((ad) => {
            const roas = ad.spend > 0 ? ad.sales / ad.spend : 0;
            const series = sevenDay[ad.adName] ?? [];
            const path = sparklinePath(series, 100, 30);
            const headlineMetricLabel =
              sortKey === "leads"
                ? "Leads"
                : sortKey === "spend"
                ? "Spend"
                : sortKey === "roas"
                ? "ROAS"
                : "Sales";
            const headlineMetricValue =
              sortKey === "leads"
                ? formatInt(ad.leads)
                : sortKey === "spend"
                ? formatCurrency(ad.spend, true)
                : sortKey === "roas"
                ? formatRoas(roas)
                : formatCurrency(ad.sales);

            return (
              <article
                key={ad.adName}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border-2 bg-card p-4 transition-colors",
                  roasBorderClass(roas),
                )}
              >
                <div className="flex flex-col gap-1">
                  <h3
                    className="truncate text-sm font-semibold tracking-tight"
                    title={ad.adName}
                  >
                    {ad.adName}
                  </h3>
                  <p
                    className="truncate text-[11px] text-muted-foreground"
                    title={ad.campaignName}
                  >
                    {ad.campaignName || "—"}
                    {ad.businessUnit ? ` · ${ad.businessUnit}` : ""}
                  </p>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {headlineMetricLabel}
                    </div>
                    <div className="text-2xl font-semibold tabular-nums tracking-tight">
                      {headlineMetricValue}
                    </div>
                  </div>
                  {series.length > 0 && (
                    <svg
                      width="100"
                      height="30"
                      viewBox="0 0 100 30"
                      className="overflow-visible"
                      aria-label="7-day spend trend"
                    >
                      <path
                        d={path}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-border/60 pt-2 text-[11px] tabular-nums">
                  <Stat label="Spend" value={formatCurrency(ad.spend, true)} />
                  <Stat label="Leads" value={formatInt(ad.leads)} />
                  <Stat label="Booked" value={formatInt(ad.bookedJobs)} />
                  <Stat label="ROAS" value={formatRoas(roas)} />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of {filtered.length}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
