"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HistoryView } from "@/components/HistoryView";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { monthlyKpiSeries } from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import type { DateRangePreset } from "@/lib/types";

interface HistoryClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
    monthsBack: number;
  };
}

export function HistoryClient({
  businessUnits,
  initialState,
}: HistoryClientProps) {
  const { data, error } = usePaidSocialData();
  const [preset, setPreset] = useState<DateRangePreset>(initialState.preset);
  const [customStart, setCustomStart] = useState<string | undefined>(
    initialState.customStart,
  );
  const [customEnd, setCustomEnd] = useState<string | undefined>(
    initialState.customEnd,
  );
  const [bu, setBu] = useState<string[]>(initialState.bu);
  const [view, setView] = useState<ServiceView>(initialState.view);
  const monthsBack = initialState.monthsBack;

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    if (monthsBack !== 12) sp.set("months", String(monthsBack));
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu, view, monthsBack]);

  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => ({
      label: slice.label,
      key: slice.key,
      rows: monthlyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        slice.bu,
        monthsBack,
      ),
    }));
  }, [data, slices, monthsBack]);

  if (!data) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorBanner message={error ?? "Try refreshing."} />
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-[color:var(--color-text-tertiary)]">
          No data available.
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <ClientPageHeader
        breadcrumb="Dashboard / History"
        pageTitle="History"
        generatedAt={data.generated_at}
        preset={preset}
        customStart={customStart}
        customEnd={customEnd}
        onDateChange={({ preset: nextPreset, start, end }) => {
          setPreset(nextPreset);
          setCustomStart(start);
          setCustomEnd(end);
        }}
        businessUnits={businessUnits}
        bu={bu}
        onBuChange={setBu}
        view={view}
        onViewChange={setView}
      />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            Last {monthsBack} months · click chips below to toggle metrics
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>
        <HistoryView slices={sliceData} split={view === "split"} />
        <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
          Window length is configurable via URL:{" "}
          <code className="rounded bg-[color:var(--color-surface-hover)] px-1 py-0.5 font-mono">
            ?months=24
          </code>{" "}
          (3-36).
        </p>
      </div>
    </main>
  );
}
