"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { CreativeGallery } from "@/components/CreativeGallery";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { aggregateByAd, buildAdSevenDaySpend } from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import { rollingDaysList } from "@/lib/periods";
import type { DateRangePreset, MetaAdCreativeRow } from "@/lib/types";

interface CreativesClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function CreativesClient({
  businessUnits,
  initialState,
}: CreativesClientProps) {
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

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu, view]);

  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );
  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);
  const sevenDayDates = useMemo(() => rollingDaysList(7), []);

  const allAds = useMemo(() => {
    if (!data) return [];
    return aggregateByAd(
      data.meta_insights,
      data.servicetitan_social_leads,
      period.current,
    );
  }, [data, period]);

  const sevenDayByAd = useMemo(() => {
    if (!data) return {} as Record<string, number[]>;
    const map = buildAdSevenDaySpend(data.meta_insights, sevenDayDates);
    const out: Record<string, number[]> = {};
    for (const [k, v] of map) out[k] = v;
    return out;
  }, [data, sevenDayDates]);

  const creativeByAd = useMemo(() => {
    if (!data) return {} as Record<string, MetaAdCreativeRow>;
    const out: Record<string, MetaAdCreativeRow> = {};
    for (const c of data.meta_ad_creatives ?? []) {
      if (!c?.ad_name) continue;
      out[c.ad_name] = c;
    }
    return out;
  }, [data]);

  const sliceData = useMemo(() => {
    return slices.map((slice) => {
      const buSet = slice.bu.length === 0 ? null : new Set(slice.bu);
      const filtered = buSet
        ? allAds.filter((a) => buSet.has(a.businessUnit))
        : allAds;
      return { slice, ads: filtered };
    });
  }, [slices, allAds]);

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
        breadcrumb="Dashboard / Creatives"
        pageTitle="Creatives"
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
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            {period.label} · {period.current.startStr} →{" "}
            {period.current.endStr}
            {!Object.keys(creativeByAd).length
              ? " · creative thumbnails will appear once meta_ad_creatives is in the API"
              : ""}
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {sliceData.map(({ slice, ads }) => (
          <section
            key={`gallery-${slice.key}`}
            className="flex flex-col gap-3"
          >
            {slices.length > 1 ? (
              <div className="flex items-center gap-3">
                <span
                  className="font-display text-[color:var(--color-text-primary)]"
                  style={{ fontSize: 15, letterSpacing: "0.06em" }}
                >
                  {slice.label}
                </span>
                <span className="h-[1px] flex-1 bg-[color:var(--color-border-subtle)]" />
                <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                  {ads.length} creatives
                </span>
              </div>
            ) : null}
            <CreativeGallery
              ads={ads}
              creativeByAd={creativeByAd}
              sevenDayByAd={sevenDayByAd}
            />
          </section>
        ))}
      </div>
    </main>
  );
}
