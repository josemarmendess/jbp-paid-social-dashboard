import { BusinessUnitFilter } from "@/components/BusinessUnitFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { FreshnessIndicator } from "@/components/FreshnessIndicator";
import { RefreshButton } from "@/components/RefreshButton";
import { ServiceViewToggle } from "@/components/ServiceViewToggle";
import { buListLabel, type ServiceView } from "@/lib/buFilter";
import type { DateRangePreset } from "@/lib/types";

interface TopHeaderProps {
  pageTitle: string;
  /** Pre-formatted "Updated …" string — used as a static fallback. */
  lastUpdated: string;
  /** Raw Apps Script generated_at — drives the live freshness ticker. */
  generatedAt?: string;
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  businessUnits: string[];
  bu: string[];
  view: ServiceView;
  /** Set to false on pages that don't support the per-service split view. */
  showViewToggle?: boolean;
  breadcrumb?: string;
}

/**
 * Sticky top header used by every page. Holds the page title, breadcrumb,
 * a global search placeholder, and the global filters (date range, BU,
 * refresh) plus a static user avatar. 64px tall, cream background.
 */
export function TopHeader({
  pageTitle,
  lastUpdated,
  generatedAt,
  preset,
  customStart,
  customEnd,
  businessUnits,
  bu,
  view,
  showViewToggle = true,
  breadcrumb,
}: TopHeaderProps) {
  const filterActive = bu.length > 0;

  return (
    <header
      className="sticky top-0 z-20 flex h-auto flex-col gap-3 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/95 px-6 py-3 backdrop-blur-sm sm:h-16 sm:flex-row sm:items-center sm:gap-6 sm:py-0"
    >
      <div className="flex min-w-0 flex-col">
        {breadcrumb ? (
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            {breadcrumb}
          </span>
        ) : null}
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

      <div className="hidden min-w-0 flex-1 md:block">
        <SearchPlaceholder />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {generatedAt ? (
          <FreshnessIndicator generatedAt={generatedAt} />
        ) : (
          <span className="hidden text-[11px] tabular-nums text-[color:var(--color-text-tertiary)] xl:inline">
            {lastUpdated}
          </span>
        )}
        <DateRangePicker
          initial={preset}
          customStart={preset === "custom" ? customStart : undefined}
          customEnd={preset === "custom" ? customEnd : undefined}
        />
        <BusinessUnitFilter options={businessUnits} value={bu} />
        {showViewToggle ? <ServiceViewToggle view={view} /> : null}
        <RefreshButton />
        <UserAvatar />
      </div>
    </header>
  );
}

function SearchPlaceholder() {
  return (
    <div className="relative max-w-[420px]">
      <input
        type="text"
        disabled
        placeholder="Search ads, campaigns, jobs…"
        className="h-9 w-full rounded-md border border-[color:var(--color-border-subtle)] bg-white/60 pl-9 pr-16 text-[13px] text-[color:var(--color-text-secondary)] placeholder:text-[color:var(--color-text-tertiary)] disabled:cursor-not-allowed"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-tertiary)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--color-text-tertiary)]">
        ⌘K
      </span>
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--color-jbp-red)]/10 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-jbp-red)] ring-1 ring-[color:var(--color-jbp-red)]/20"
      aria-label="JM"
      title="JM"
    >
      JM
    </div>
  );
}
