"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { CreativeGallery } from "@/components/CreativeGallery";
import {
  Eyebrow,
  SimpleKpi,
} from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { aggregateByAd, buildAdSevenDaySpend } from "@/lib/aggregate";
import type { AggregatedAd } from "@/lib/types";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import { formatInt } from "@/lib/format";
import { rollingDaysList } from "@/lib/periods";
import type { ComparisonMode, DateRangePreset, MetaAdCreativeRow } from "@/lib/types";

const WIN_CTR = 0.015;
const WIN_CPL_QUANTILE = 0.5; // top half of CPL = "low CPL"
const UNDER_CTR = 0.005;

interface CreativesClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
    comparison: ComparisonMode;
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
  const [comparison, setComparison] = useState<ComparisonMode>(
    initialState.comparison,
  );

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, {
      preset,
      customStart,
      customEnd,
      bu,
      view,
      comparison,
    });
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu, view, comparison]);

  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd, comparison),
    [preset, customStart, customEnd, comparison],
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
      <main style={{ flex: 1 }}>
        <ErrorBanner message={error ?? "Try refreshing."} />
        <div
          style={{
            padding: "64px 24px",
            textAlign: "center",
            color: "var(--color-jbp-text-3)",
            fontSize: 13,
          }}
        >
          No data available.
        </div>
      </main>
    );
  }

  return (
    <>
      <ClientPageHeader
        pageTitle="Creatives"
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
        comparison={comparison}
        onComparisonChange={setComparison}
        caption={
          Object.keys(creativeByAd).length === 0
            ? "Thumbnails will appear once meta_ad_creatives is in the API"
            : undefined
        }
      />
      <div
        style={{
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {sliceData.map(({ slice, ads }) => (
          <CreativesSlice
            key={slice.key}
            sliceLabel={slices.length > 1 ? slice.label : null}
            ads={ads}
            creativeByAd={creativeByAd}
            sevenDayByAd={sevenDayByAd}
          />
        ))}
      </div>
    </>
  );
}

function CreativesSlice({
  sliceLabel,
  ads,
  creativeByAd,
  sevenDayByAd,
}: {
  sliceLabel: string | null;
  ads: AggregatedAd[];
  creativeByAd: Record<string, MetaAdCreativeRow>;
  sevenDayByAd: Record<string, number[]>;
}) {
  // Tag winners / underperformers using simple thresholds.
  const ctrFor = (a: AggregatedAd) =>
    a.impressions > 0 ? a.linkClicks / a.impressions : 0;
  const cpls = ads
    .filter((a) => a.leads > 0 && a.spend > 0)
    .map((a) => a.spend / a.leads)
    .sort((a, b) => a - b);
  const cplCutoff =
    cpls.length > 0
      ? cpls[Math.floor(cpls.length * WIN_CPL_QUANTILE)] ?? Infinity
      : Infinity;

  const winners = ads.filter(
    (a) =>
      ctrFor(a) >= WIN_CTR &&
      a.leads > 0 &&
      a.spend > 0 &&
      a.spend / a.leads <= cplCutoff,
  );
  const underperformers = ads.filter(
    (a) => ctrFor(a) < UNDER_CTR && a.spend > 50,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sliceLabel ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <Eyebrow size={11}>{sliceLabel}</Eyebrow>
          <span
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-jbp-hairline)",
            }}
          />
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <SimpleKpi
          label="Active creatives"
          value={formatInt(ads.length)}
          sub={`${Object.keys(creativeByAd).length} with thumbs`}
        />
        <SimpleKpi
          label="Winners"
          value={formatInt(winners.length)}
          sub={`CTR ≥ ${(WIN_CTR * 100).toFixed(1)}% · low CPL`}
        />
        <SimpleKpi
          label="Underperformers"
          value={formatInt(underperformers.length)}
          sub={`CTR < ${(UNDER_CTR * 100).toFixed(1)}% · spend > $50`}
        />
        <SimpleKpi
          label="Total spend"
          value={`$${Math.round(
            ads.reduce((s, a) => s + a.spend, 0),
          ).toLocaleString("en-US")}`}
          sub="across active creatives"
          accent
        />
      </div>

      <CreativeGallery
        ads={ads}
        creativeByAd={creativeByAd}
        sevenDayByAd={sevenDayByAd}
      />
    </div>
  );
}
