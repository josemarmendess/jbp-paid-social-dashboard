"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { PerformanceTabs } from "@/components/PerformanceTabs";
import {
  aggregateByAd,
  aggregateByAdset,
  aggregateByBusinessUnit,
  aggregateByCampaign,
  buildAdSevenDaySpend,
} from "@/lib/aggregate";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import { rollingDaysList } from "@/lib/periods";
import type { DateRangePreset, MetaAdCreativeRow } from "@/lib/types";

interface PerformanceClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
  };
}

export function PerformanceClient({
  businessUnits,
  initialState,
}: PerformanceClientProps) {
  const { data, error } = usePaidSocialData();
  const [preset, setPreset] = useState<DateRangePreset>(initialState.preset);
  const [customStart, setCustomStart] = useState<string | undefined>(
    initialState.customStart,
  );
  const [customEnd, setCustomEnd] = useState<string | undefined>(
    initialState.customEnd,
  );
  const [bu, setBu] = useState<string[]>(initialState.bu);

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu });
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu]);

  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const sevenDayDates = useMemo(() => rollingDaysList(7), []);

  const ads = useMemo(() => {
    if (!data) return [];
    const all = aggregateByAd(
      data.meta_insights,
      data.servicetitan_social_leads,
      period.current,
    );
    return bu.length === 0
      ? all
      : all.filter((a) =>
          bu.some((b) => b.toLowerCase() === a.businessUnit.toLowerCase()),
        );
  }, [data, period, bu]);

  const campaigns = useMemo(() => {
    if (!data) return [];
    return aggregateByCampaign(
      data.meta_insights,
      data.servicetitan_social_leads,
      period.current,
      bu,
    );
  }, [data, period, bu]);

  const adsets = useMemo(() => {
    if (!data) return [];
    return aggregateByAdset(
      data.meta_insights,
      data.servicetitan_social_leads,
      period.current,
      bu,
    );
  }, [data, period, bu]);

  const businessUnitRows = useMemo(() => {
    if (!data) return [];
    return aggregateByBusinessUnit(
      data.meta_insights,
      data.servicetitan_social_leads,
      period.current,
      bu,
    );
  }, [data, period, bu]);

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
        breadcrumb="Dashboard / Performance"
        pageTitle="Performance"
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
        showViewToggle={false}
      />

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {period.label} · {period.current.startStr} →{" "}
              {period.current.endStr}
            </span>
            <span className="text-[12px] text-[color:var(--color-text-secondary)]">
              Click a row for details · click an ad thumbnail for the creative
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        <PerformanceTabs
          ads={ads}
          campaigns={campaigns}
          adsets={adsets}
          businessUnits={businessUnitRows}
          sevenDayByAd={sevenDayByAd}
          creativeByAd={creativeByAd}
        />
      </div>
    </main>
  );
}
