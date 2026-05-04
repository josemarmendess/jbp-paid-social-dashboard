"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Settings2 } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { MetricLabel } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatInt } from "@/lib/format";
import type { PeriodColumn } from "@/lib/periods";
import type { PivotMetrics } from "@/lib/aggregate";
import {
  PIVOT_ROWS,
  type PivotRowKind,
} from "@/lib/pivotConfig";

function formatCell(value: number | null, kind: PivotRowKind): string {
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

/** Plain-text version used by the Copy button — no "$" / "," for currency
 *  so the recipient can paste as raw numbers if they want. */
function rawCell(value: number | null, kind: PivotRowKind): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  switch (kind) {
    case "currency":
      return value.toFixed(0);
    case "currency-precise":
      return value.toFixed(2);
    case "int":
      return Math.round(value).toString();
    case "percent":
      return `${Math.round(value)}%`;
  }
}

interface PivotTableProps {
  periods: PeriodColumn[];
  values: PivotMetrics[];
  /** Optional title shown above the table (e.g., service name in stacked view). */
  caption?: string;
  /** Visible row keys — defaults to all. */
  visibleRowKeys: string[];
  /** Visible column keys — defaults to every period. */
  visibleColKeys: string[];
}

/**
 * Performance Over Time pivot. Rows + columns are individually toggleable,
 * and a Copy button serializes the current view as TSV (great for pasting
 * into Slack, Google Sheets, or Numbers).
 */
export function PivotTable({
  periods,
  values,
  caption,
  visibleRowKeys,
  visibleColKeys,
}: PivotTableProps) {
  const [copied, setCopied] = useState(false);

  const visibleRows = PIVOT_ROWS.filter((r) => visibleRowKeys.includes(r.key));
  const visibleCols = periods
    .map((p, i) => ({ p, value: values[i] }))
    .filter(({ p }) => visibleColKeys.includes(p.key));

  function tsv(): string {
    const lines: string[] = [];
    if (caption) lines.push(caption);
    lines.push(["Metric", ...visibleCols.map(({ p }) => p.label)].join("\t"));
    for (const r of visibleRows) {
      const row = [
        r.label,
        ...visibleCols.map(({ value }) => rawCell(r.pick(value), r.kind)),
      ];
      lines.push(row.join("\t"));
    }
    return lines.join("\n");
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(tsv());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — fail silently */
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
      {(caption || true) ? (
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2.5">
          {caption ? (
            <span
              className="font-display text-[color:var(--color-text-primary)]"
              style={{ fontSize: 14, letterSpacing: "0.06em" }}
            >
              {caption}
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
              {visibleRows.length} rows · {visibleCols.length} columns
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            title="Copy as tab-separated values (paste into Slack / Sheets)"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2 py-1 text-[11px] font-medium transition-colors",
              copied
                ? "border-[color:var(--color-positive)] text-[color:var(--color-positive)]"
                : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
      ) : null}
      <div className="overflow-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead className="bg-white">
            <tr className="border-b border-[color:var(--color-border-subtle)]">
              <th className="sticky left-0 z-10 bg-white px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                Metric
              </th>
              {visibleCols.map(({ p }) => (
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
            {visibleRows.map((row) => (
              <tr
                key={row.key}
                className={cn(
                  "border-b border-[color:var(--color-border-subtle)] last:border-b-0 transition-colors hover:bg-[color:var(--color-surface-hover)]",
                  row.groupTop &&
                    "border-t-[1.5px] border-t-[color:var(--color-border-strong)]",
                )}
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2.5 transition-colors hover:bg-[color:var(--color-surface-hover)]">
                  <MetricLabel
                    label={row.label}
                    tooltip={row.tooltip}
                    className="font-medium text-[color:var(--color-text-primary)]"
                  />
                </td>
                {visibleCols.map(({ p, value }) => {
                  const v = row.pick(value);
                  const isNa = v === null || !Number.isFinite(v);
                  return (
                    <td
                      key={p.key}
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

interface PivotCustomizeProps {
  /** Available column definitions (keys + labels). */
  columns: { key: string; label: string }[];
  visibleRowKeys: string[];
  visibleColKeys: string[];
}

/**
 * Customize popover for the Performance Over Time pivot. Toggling a row or
 * column writes a comma-separated list to the URL (?pivotRows=, ?pivotCols=)
 * — empty value means "show all". Persistent + shareable + scoped to the
 * page.
 */
export function PivotCustomize({
  columns,
  visibleRowKeys,
  visibleColKeys,
}: PivotCustomizeProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border border-[color:var(--color-border-subtle)] bg-white px-3 text-[12px] font-medium text-[color:var(--color-text-primary)] transition-colors",
          "hover:bg-[color:var(--color-surface-hover)]",
          open && "ring-2 ring-[color:var(--color-jbp-blue)]/30",
        )}
      >
        <Settings2 className="h-3.5 w-3.5" />
        Customize
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Customize pivot"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[480px] overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white shadow-xl"
        >
          <div className="grid grid-cols-2 divide-x divide-[color:var(--color-border-subtle)]">
            <CustomizeColumn
              title="Rows"
              paramName="pivotRows"
              options={PIVOT_ROWS.map((r) => ({ key: r.key, label: r.label }))}
              value={visibleRowKeys}
            />
            <CustomizeColumn
              title="Columns"
              paramName="pivotCols"
              options={columns}
              value={visibleColKeys}
            />
          </div>
          <div className="border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-3 py-2 text-[11px] text-[color:var(--color-text-secondary)]">
            Selection persists in the URL — share the link to share the view.
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface CustomizeColumnProps {
  title: string;
  paramName: "pivotRows" | "pivotCols";
  options: { key: string; label: string }[];
  value: string[];
}

function CustomizeColumn({
  title,
  paramName,
  options,
  value,
}: CustomizeColumnProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const params = useSearchParams();
  const checked = (k: string) => value.includes(k);
  const allOn = options.every((o) => checked(o.key));

  function applyNext(next: string[]) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next.length === 0 || next.length === options.length) {
      sp.delete(paramName);
    } else {
      sp.set(paramName, next.join(","));
    }
    const q = sp.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  function toggle(k: string) {
    applyNext(checked(k) ? value.filter((v) => v !== k) : [...value, k]);
  }

  return (
    <div className="flex max-h-[360px] flex-col">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border-subtle)] px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
          {title}
        </span>
        <button
          type="button"
          onClick={() =>
            applyNext(allOn ? [] : options.map((o) => o.key))
          }
          className="text-[11px] font-semibold text-[color:var(--color-jbp-blue)] hover:underline"
        >
          {allOn ? "Hide all" : "Show all"}
        </button>
      </div>
      <div className="overflow-y-auto">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => toggle(opt.key)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[12px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]"
          >
            <span className="truncate">{opt.label}</span>
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                checked(opt.key)
                  ? "border-[color:var(--color-jbp-blue)] bg-[color:var(--color-jbp-blue)]"
                  : "border-[color:var(--color-border-strong)] bg-white",
              )}
            >
              {checked(opt.key) ? (
                <Check className="h-3 w-3 text-white" />
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
