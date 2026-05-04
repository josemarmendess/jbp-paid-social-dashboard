"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

export type ColumnAlign = "left" | "right";
export type ColumnKind = "text" | "number" | "currency" | "percent" | "roas" | "thumb";

export interface ColumnDef<R> {
  key: string;
  label: string;
  align: ColumnAlign;
  /** Pull a sortable value from the row. Strings → alpha sort, numbers → numeric. */
  value: (row: R) => number | string;
  /** Render the cell content. */
  render: (row: R) => React.ReactNode;
  /** When true, this column won't have a sort affordance. */
  unsortable?: boolean;
  /** Optional CSS for the cell wrapper. */
  cellClass?: string;
  /** Optional CSS for the header. */
  headerClass?: string;
}

interface PerformanceTableProps<R> {
  rows: R[];
  columns: ColumnDef<R>[];
  rowKey: (row: R) => string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  onRowClick?: (row: R) => void;
  emptyMessage?: string;
}

/**
 * Generic, sortable, paginated table used by all four Performance tabs.
 * Hover row gets a subtle cream tint and a click handler if onRowClick is set.
 */
export function PerformanceTable<R>({
  rows,
  columns,
  rowKey,
  initialSort,
  onRowClick,
  emptyMessage = "No data for this period.",
}: PerformanceTableProps<R>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>(
    initialSort ?? { key: columns[0]?.key ?? "", dir: "desc" },
  );
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.value(a);
      const bv = col.value(b);
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = sorted.slice(start, start + PAGE_SIZE);

  function toggleSort(key: string) {
    setPage(0);
    const col = columns.find((c) => c.key === key);
    if (!col || col.unsortable) return;
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      // Strings default ascending, numbers default descending.
      const sample = rows.length > 0 ? col.value(rows[0]) : 0;
      return { key, dir: typeof sample === "string" ? "asc" : "desc" };
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-12 text-center text-[13px] text-[color:var(--color-text-tertiary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
      <div className="max-h-[640px] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-[color:var(--color-border-subtle)]">
              {columns.map((col) => {
                const active = sort.key === col.key;
                const Icon = active
                  ? sort.dir === "asc"
                    ? ArrowUp
                    : ArrowDown
                  : ChevronsUpDown;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]",
                      col.align === "right" && "text-right",
                      col.headerClass,
                    )}
                  >
                    {col.unsortable ? (
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-[color:var(--color-text-primary)]",
                          col.align === "right" && "ml-auto",
                          active && "text-[color:var(--color-text-primary)]",
                        )}
                      >
                        {col.label}
                        <Icon className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-[color:var(--color-border-subtle)] last:border-b-0 transition-colors",
                  onRowClick && "cursor-pointer hover:bg-[color:var(--color-surface-hover)]",
                  i % 5 === 4 && "border-b-[color:var(--color-border-subtle)]",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2.5 text-[color:var(--color-text-primary)]",
                      col.align === "right" && "text-right tabular-nums",
                      col.cellClass,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2.5 text-[11px] tabular-nums text-[color:var(--color-text-secondary)]">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2.5 py-1 font-medium transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2.5 py-1 font-medium transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
