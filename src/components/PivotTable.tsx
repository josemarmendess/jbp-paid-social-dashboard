"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ImageIcon, Settings2 } from "lucide-react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toPng } from "html-to-image";
import { MetricLabel } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, formatInt, formatRoas } from "@/lib/format";
import type { PeriodColumn } from "@/lib/periods";
import type { PivotMetrics } from "@/lib/aggregate";
import {
  PIVOT_ROWS,
  type PivotRowKind,
} from "@/lib/pivotConfig";
import { SLICE_TONES, type SliceTone } from "@/lib/sliceColors";

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
    case "roas":
      return formatRoas(value);
    case "days":
      return `${value.toFixed(1)}d`;
  }
}

/** Plain-text version used by the Copy → TSV fallback. */
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
    case "roas":
      return `${value.toFixed(2)}x`;
    case "days":
      return `${value.toFixed(1)}d`;
  }
}

/* --------------------------------- Pivot --------------------------------- */

interface PivotTableProps {
  periods: PeriodColumn[];
  values: PivotMetrics[];
  caption?: string;
  /** Slice color hint — drives the caption bar tint and the left rail. */
  tone?: SliceTone;
  visibleRowKeys: string[];
  visibleColKeys: string[];
}

type CopyState = "idle" | "copying" | "image-ok" | "tsv-fallback" | "error";

export function PivotTable({
  periods,
  values,
  caption,
  tone = "neutral",
  visibleRowKeys,
  visibleColKeys,
}: PivotTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copy, setCopy] = useState<CopyState>("idle");

  const visibleRows = PIVOT_ROWS.filter((r) => visibleRowKeys.includes(r.key));
  const visibleCols = periods
    .map((p, i) => ({ p, value: values[i] }))
    .filter(({ p }) => visibleColKeys.includes(p.key));

  function buildTsv(): string {
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

  async function copyAsImage() {
    if (!tableRef.current) return;
    setCopy("copying");
    try {
      // Render the table DOM to a PNG. cacheBust avoids a stale render
      // when the user clicks Copy multiple times in quick succession.
      const dataUrl = await toPng(tableRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        // html-to-image inherits CSS variables but skips Tailwind utility
        // classes that resolve to var(--color-...). Forcing a higher pixel
        // ratio + white background sidesteps the most common rendering
        // glitches (transparent rows, missing borders).
      });
      const blob = await (await fetch(dataUrl)).blob();
      // Modern browsers accept image/png in the clipboard. ClipboardItem is
      // gated to secure contexts (https/localhost) — fall back to TSV when
      // the call is blocked.
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopy("image-ok");
      } catch {
        await navigator.clipboard.writeText(buildTsv());
        setCopy("tsv-fallback");
      }
    } catch {
      // Image rendering failed — last-ditch fallback to plain TSV.
      try {
        await navigator.clipboard.writeText(buildTsv());
        setCopy("tsv-fallback");
      } catch {
        setCopy("error");
      }
    }
    window.setTimeout(() => setCopy("idle"), 2000);
  }

  async function copyAsText() {
    try {
      await navigator.clipboard.writeText(buildTsv());
      setCopy("tsv-fallback");
      window.setTimeout(() => setCopy("idle"), 1500);
    } catch {
      setCopy("error");
      window.setTimeout(() => setCopy("idle"), 1500);
    }
  }

  const t = SLICE_TONES[tone];
  const showRail = tone !== "neutral";

  return (
    <div
      ref={tableRef}
      className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white"
      style={{
        borderLeft: showRail ? `4px solid ${t.rail}` : undefined,
      }}
    >
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5"
        style={{
          background: t.bg,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          {caption ? (
            <span
              className="font-display"
              style={{
                fontSize: 14,
                letterSpacing: "0.06em",
                color: t.text,
              }}
            >
              {caption}
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
              {visibleRows.length} rows · {visibleCols.length} columns
            </span>
          )}
          {tone !== "neutral" ? (
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{ background: t.chipBg, color: t.chipText }}
            >
              {tone === "bathrooms" ? "B" : tone === "sewers" ? "S" : "T"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyAsText}
            title="Copy as tab-separated values"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2 text-[11px] font-medium text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
          >
            <Copy className="h-3 w-3" />
            TSV
          </button>
          <button
            type="button"
            onClick={copyAsImage}
            disabled={copy === "copying"}
            title="Copy table as PNG image (paste in Slack)"
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border bg-white px-2 text-[11px] font-medium transition-colors",
              copy === "image-ok"
                ? "border-[color:var(--color-positive)] text-[color:var(--color-positive)]"
                : copy === "tsv-fallback"
                  ? "border-[color:var(--color-warning)] text-[color:var(--color-warning)]"
                  : copy === "error"
                    ? "border-[color:var(--color-negative)] text-[color:var(--color-negative)]"
                    : "border-[color:var(--color-border-subtle)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-surface-hover)]",
            )}
          >
            {copy === "copying" ? (
              <>
                <ImageIcon className="h-3 w-3 animate-pulse" /> Rendering…
              </>
            ) : copy === "image-ok" ? (
              <>
                <Check className="h-3 w-3" /> Image copied
              </>
            ) : copy === "tsv-fallback" ? (
              <>
                <Check className="h-3 w-3" /> TSV copied
              </>
            ) : copy === "error" ? (
              "Copy failed"
            ) : (
              <>
                <ImageIcon className="h-3 w-3" /> Copy as image
              </>
            )}
          </button>
        </div>
      </div>
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

/* ----------------------------- Customize popover ----------------------------- */

interface PivotCustomizeProps {
  columns: { key: string; label: string }[];
  visibleRowKeys: string[];
  visibleColKeys: string[];
  /**
   * When provided, customize changes are emitted via callbacks instead of
   * pushed to the URL. Used by OverviewClient to keep changes purely
   * client-side. Both must be set together; omit both for URL-driven pages.
   */
  onChangeRows?: (next: string[]) => void;
  onChangeCols?: (next: string[]) => void;
}

export function PivotCustomize({
  columns,
  visibleRowKeys,
  visibleColKeys,
  onChangeRows,
  onChangeCols,
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

  const totalRows = PIVOT_ROWS.length;

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
        <span className="rounded bg-[color:var(--color-surface-hover)] px-1 py-0.5 text-[10px] font-mono tabular-nums text-[color:var(--color-text-secondary)]">
          {visibleRowKeys.length}/{totalRows} rows
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Customize pivot"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[520px] overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white shadow-xl"
        >
          <div className="grid grid-cols-2 divide-x divide-[color:var(--color-border-subtle)]">
            <CustomizeColumn
              title={`Rows · ${visibleRowKeys.length}/${PIVOT_ROWS.length}`}
              paramName="pivotRows"
              options={PIVOT_ROWS.map((r) => ({ key: r.key, label: r.label }))}
              value={visibleRowKeys}
              onChange={onChangeRows}
            />
            <CustomizeColumn
              title={`Columns · ${visibleColKeys.length}/${columns.length}`}
              paramName="pivotCols"
              options={columns}
              value={visibleColKeys}
              onChange={onChangeCols}
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
  /** When set, emit changes via callback instead of pushing to URL. */
  onChange?: (next: string[]) => void;
}

function CustomizeColumn({
  title,
  paramName,
  options,
  value,
  onChange,
}: CustomizeColumnProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const params = useSearchParams();
  const checked = (k: string) => value.includes(k);
  const allOn = options.every((o) => checked(o.key));

  function applyNext(next: string[]) {
    if (onChange) {
      onChange(next);
      return;
    }
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next.length === 0) {
      // Empty selection = special "show none" — we encode as "_" so the
      // page can disambiguate from "no param at all".
      sp.set(paramName, "_none_");
    } else if (next.length === options.length) {
      // All on means we can drop the param entirely (default).
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
    <div className="flex max-h-[420px] flex-col">
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
