"use client";

import { BusinessUnitFilter } from "@/components/BusinessUnitFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ServiceViewToggle } from "@/components/ServiceViewToggle";
import { buListLabel, type ServiceView } from "@/lib/buFilter";
import { getPeriod } from "@/lib/dateRange";
import type { DateRangePreset } from "@/lib/types";

interface ClientPageHeaderProps {
  pageTitle: string;
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
  showViewToggle?: boolean;
  /** Optional override for the secondary line under the title. */
  caption?: string;
}

/**
 * Per-page filter bar. Sits below the global TabsStrip — paper background,
 * sharp corners, hairline divider. Page title on the left, period + service
 * filters on the right.
 */
export function ClientPageHeader({
  pageTitle,
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
  caption,
}: ClientPageHeaderProps) {
  const filterActive = bu.length > 0;
  const period = getPeriod(preset, customStart, customEnd);
  const captionLine =
    caption ??
    `${period.label.toUpperCase()} · ${period.current.startStr} → ${period.current.endStr}`;

  return (
    <div
      style={{
        padding: "14px 28px",
        background: "var(--color-jbp-paper)",
        borderBottom: "1px solid var(--color-jbp-hairline)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            margin: 0,
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.025em",
            color: "var(--color-jbp-text)",
          }}
        >
          {pageTitle}
        </h1>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-jbp-text-3)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {captionLine}
        </div>
        {filterActive ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
              border: "1px solid var(--color-jbp-red)",
              color: "var(--color-jbp-red)",
              background: "rgba(196, 30, 30, 0.06)",
            }}
          >
            {buListLabel(bu)}
          </span>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
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
      </div>
    </div>
  );
}
