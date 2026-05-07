"use client";

import { BusinessUnitFilter } from "@/components/BusinessUnitFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FreshnessIndicator } from "@/components/FreshnessIndicator";
import { RefreshButton } from "@/components/RefreshButton";
import { ServiceViewToggle } from "@/components/ServiceViewToggle";
import { buListLabel, type ServiceView } from "@/lib/buFilter";
import type { DateRangePreset } from "@/lib/types";

interface ClientPageHeaderProps {
  breadcrumb: string;
  pageTitle: string;
  generatedAt?: string;
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  onDateChange: (next: {
    preset: DateRangePreset;
    start?: string;
    end?: string;
  }) => void;
  businessUnits: string[];
  bu: string[];
  onBuChange: (next: string[]) => void;
  view?: ServiceView;
  onViewChange?: (next: ServiceView) => void;
  /** Set to false on pages that don't support per-service split (e.g., Performance). */
  showViewToggle?: boolean;
}

/**
 * Shared header used by every page's *Client component. All controls are
 * controlled by the parent — no router.replace, no RSC roundtrip on filter
 * change. Mirrors the look of TopHeader so the visual diff vs the previous
 * URL-driven version is zero.
 */
export function ClientPageHeader({
  breadcrumb,
  pageTitle,
  generatedAt,
  preset,
  customStart,
  customEnd,
  onDateChange,
  businessUnits,
  bu,
  onBuChange,
  view,
  onViewChange,
  showViewToggle = true,
}: ClientPageHeaderProps) {
  const filterActive = bu.length > 0;

  return (
    <header className="sticky top-0 z-20 flex h-auto flex-col gap-3 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/95 px-6 py-3 backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:gap-6 sm:py-0">
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
          {breadcrumb}
        </span>
        <div className="flex items-baseline gap-2">
          <h1
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 22, lineHeight: 1.1 }}
          >
            {pageTitle}
          </h1>
          {filterActive ? (
            <span className="inline-flex items-center rounded-full border border-[color:var(--color-jbp-blue)]/30 bg-[color:var(--color-jbp-blue)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-jbp-blue)]">
              {buListLabel(bu)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1" />

      <div className="flex flex-wrap items-center gap-2">
        {generatedAt ? <FreshnessIndicator generatedAt={generatedAt} /> : null}
        <DateRangePicker
          initial={preset}
          customStart={preset === "custom" ? customStart : undefined}
          customEnd={preset === "custom" ? customEnd : undefined}
          onChange={onDateChange}
        />
        <BusinessUnitFilter
          options={businessUnits}
          value={bu}
          onChange={onBuChange}
        />
        {showViewToggle && view && onViewChange ? (
          <ServiceViewToggle view={view} onChange={onViewChange} />
        ) : null}
        <RefreshButton />
      </div>
    </header>
  );
}
