"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CreativeThumb } from "@/components/CreativeThumb";
import { CreativeModal } from "@/components/CreativeModal";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatInt,
  formatRoas,
} from "@/lib/format";
import type {
  AggregatedAd,
  MetaAdCreativeRow,
} from "@/lib/types";

const PAGE_SIZE = 12;

type SortKey = "spend" | "sales" | "roas" | "leads";
type StatusFilter = "all" | "top" | "under" | "standard";

interface CreativeGalleryProps {
  ads: AggregatedAd[];
  /** ad_name → creative metadata (thumbnail, copy, etc). */
  creativeByAd: Record<string, MetaAdCreativeRow>;
  /** ad_name → last 7 days of daily spend. */
  sevenDayByAd: Record<string, number[]>;
}

interface Slider {
  min: number;
  max: number;
}

function classifyRoas(spend: number, sales: number): StatusFilter {
  if (spend <= 0) return "all";
  const roas = sales / spend;
  if (roas >= 3) return "top";
  if (roas < 1) return "under";
  return "standard";
}

/**
 * Creatives gallery — sortable, filterable grid with a status indicator
 * border on each card. Click a card to open the full-screen CreativeModal.
 * Falls back to gradient + JBP wrench glyph until meta_ad_creatives is
 * populated.
 */
export function CreativeGallery({
  ads,
  creativeByAd,
  sevenDayByAd,
}: CreativeGalleryProps) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [showInactive, setShowInactive] = useState(true);
  const [slider, setSlider] = useState<Slider>({ min: 0, max: 1000 });
  const [page, setPage] = useState(0);
  const [openAd, setOpenAd] = useState<AggregatedAd | null>(null);

  const filtered = useMemo(() => {
    let out = ads;
    if (!showInactive) {
      out = out.filter((a) => a.spend > 0);
    }
    if (slider.min > 0) {
      out = out.filter((a) => a.spend >= slider.min);
    }
    if (status !== "all") {
      out = out.filter((a) => classifyRoas(a.spend, a.sales) === status);
    }
    out = [...out].sort((a, b) => {
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
    return out;
  }, [ads, showInactive, slider.min, status, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--color-border-subtle)] bg-white px-4 py-3">
        <FilterGroup label="Sort">
          {(
            [
              { k: "spend", l: "Top Spend" },
              { k: "sales", l: "Top Sales" },
              { k: "roas", l: "Top ROAS" },
              { k: "leads", l: "Top Leads" },
            ] as const
          ).map((opt) => (
            <Chip
              key={opt.k}
              active={sortKey === opt.k}
              onClick={() => {
                setSortKey(opt.k);
                setPage(0);
              }}
            >
              {opt.l}
            </Chip>
          ))}
        </FilterGroup>
        <span className="h-5 w-px bg-[color:var(--color-border-subtle)]" />
        <FilterGroup label="Status">
          {(
            [
              { k: "all", l: "All" },
              { k: "top", l: "Top performers" },
              { k: "under", l: "Underperformers" },
              { k: "standard", l: "Standard" },
            ] as const
          ).map((opt) => (
            <Chip
              key={opt.k}
              active={status === opt.k}
              onClick={() => {
                setStatus(opt.k);
                setPage(0);
              }}
            >
              {opt.l}
            </Chip>
          ))}
        </FilterGroup>
        <span className="h-5 w-px bg-[color:var(--color-border-subtle)]" />
        <FilterGroup label="Min spend">
          <input
            type="range"
            min={0}
            max={1000}
            step={50}
            value={slider.min}
            onChange={(e) => {
              setSlider((s) => ({ ...s, min: Number(e.target.value) }));
              setPage(0);
            }}
            className="h-1 w-32 cursor-pointer accent-[color:var(--color-jbp-blue)]"
          />
          <span className="font-mono text-[11px] tabular-nums text-[color:var(--color-text-secondary)]">
            ${slider.min}
          </span>
        </FilterGroup>
        <span className="h-5 w-px bg-[color:var(--color-border-subtle)]" />
        <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-[color:var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={!showInactive}
            onChange={() => {
              setShowInactive((v) => !v);
              setPage(0);
            }}
            className="h-3.5 w-3.5 accent-[color:var(--color-jbp-blue)]"
          />
          Active only
        </label>
        <span className="ml-auto text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
          {filtered.length} {filtered.length === 1 ? "creative" : "creatives"}
        </span>
      </div>

      {pageRows.length === 0 ? (
        <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-12 text-center text-[13px] text-[color:var(--color-text-tertiary)]">
          No creatives match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pageRows.map((ad) => {
            const roas = ad.spend > 0 ? ad.sales / ad.spend : 0;
            const status = classifyRoas(ad.spend, ad.sales);
            const accent =
              status === "top"
                ? "var(--color-positive)"
                : status === "under"
                  ? "var(--color-negative)"
                  : status === "standard"
                    ? "var(--color-warning)"
                    : "var(--color-border-strong)";
            const series = sevenDayByAd[ad.adName] ?? [];
            const creative = creativeByAd[ad.adName];
            const previewSrc =
              creative?.thumbnail_url || creative?.image_url;
            return (
              <article
                key={ad.adName}
                onClick={() => setOpenAd(ad)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white transition-all hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(26,15,11,0.08)]"
                style={{ borderLeft: `4px solid ${accent}` }}
              >
                {/* Top half: creative image (180px) */}
                <div className="relative h-[180px] w-full overflow-hidden bg-[color:var(--color-jbp-cream)]">
                  <CreativeThumb
                    src={previewSrc}
                    alt={ad.adName}
                    size={320}
                  />
                  {/* Meta status (top-left) — driven by meta_ad_creatives.status */}
                  {creative?.status ? (
                    <span
                      className="absolute left-2 top-2 inline-flex items-center gap-1 bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm"
                      style={{
                        color: /active|live/i.test(creative.status)
                          ? "var(--color-jbp-good)"
                          : /paus/i.test(creative.status)
                            ? "var(--color-jbp-warn)"
                            : "var(--color-jbp-text-2)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: 0.5,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: /active|live/i.test(creative.status)
                            ? "var(--color-jbp-good)"
                            : /paus/i.test(creative.status)
                              ? "var(--color-jbp-warn)"
                              : "var(--color-jbp-text-2)",
                        }}
                      />
                      {creative.status}
                    </span>
                  ) : null}
                  {/* Audience + BU (top-right) */}
                  <span
                    className="absolute right-2 top-2 inline-flex items-center rounded-md bg-[color:var(--color-text-primary)]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm"
                  >
                    {ad.audience}
                    {ad.businessUnit ? ` · ${ad.businessUnit}` : ""}
                  </span>
                  {/* External link to the ad on Meta — only when permalink_url
                      is populated by Apps Script. Stops propagation so card click
                      still opens the local modal. */}
                  {creative?.permalink_url ? (
                    <a
                      href={creative.permalink_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open on Meta"
                      className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center bg-white/95 text-[color:var(--color-jbp-text)] backdrop-blur-sm transition-colors hover:bg-white"
                      aria-label="Open on Meta"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 8L11 2" />
                        <path d="M7 2H11V6" />
                        <path d="M11 7.5V10.5C11 11 10.5 11.5 10 11.5H2.5C2 11.5 1.5 11 1.5 10.5V3C1.5 2.5 2 2 2.5 2H5.5" />
                      </svg>
                    </a>
                  ) : null}
                </div>
                {/* Bottom: copy + stats */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-col gap-0.5">
                    <h3
                      className="truncate text-[14px] font-semibold text-[color:var(--color-text-primary)]"
                      title={ad.adName}
                    >
                      {ad.adName}
                    </h3>
                    <p
                      className="truncate text-[11px] text-[color:var(--color-text-secondary)]"
                      title={ad.campaignName}
                    >
                      {ad.campaignName || "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Chip2 label="Spend" value={formatCurrency(ad.spend)} />
                    <Chip2 label="Leads" value={formatInt(ad.leads)} />
                    <Chip2 label="Sales" value={formatCurrency(ad.sales)} />
                    <Chip2
                      label="ROAS"
                      value={formatRoas(roas)}
                      tone={status}
                    />
                  </div>
                  {series.length > 0 ? (
                    <div className="border-t border-[color:var(--color-border-subtle)] pt-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                        7-day spend
                      </p>
                      <Sparkline values={series} height={26} width={280} />
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-[12px] tabular-nums text-[color:var(--color-text-secondary)]">
          <span>
            {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--color-border-subtle)] bg-white transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px]">
              Page {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--color-border-subtle)] bg-white transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <CreativeModal
        ad={openAd}
        creative={openAd ? creativeByAd[openAd.adName] : undefined}
        sevenDaySpend={openAd ? sevenDayByAd[openAd.adName] : undefined}
        onClose={() => setOpenAd(null)}
      />
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-[color:var(--color-jbp-blue)] text-white shadow-sm"
          : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]",
      )}
    >
      {children}
    </button>
  );
}

function Chip2({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: StatusFilter;
}) {
  const styles =
    tone === "top"
      ? "bg-[color:var(--color-positive-soft)] text-[color:var(--color-positive)]"
      : tone === "under"
        ? "bg-[color:var(--color-negative-soft)] text-[color:var(--color-negative)]"
        : tone === "standard"
          ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
          : "bg-[color:var(--color-jbp-cream)]/60 text-[color:var(--color-text-primary)]";
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-2 py-1.5",
        styles,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">
        {label}
      </span>
      <span className="font-mono text-[12px] font-semibold tabular-nums">
        {value}
      </span>
    </div>
  );
}
