"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { Card, CardHeader, SimpleKpi } from "@/components/design";
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
import {
  formatCompactMoney,
  formatCurrency,
  formatInt,
} from "@/lib/format";
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

  const totals = useMemo(() => {
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
    const totalRev = campaigns.reduce((s, c) => s + c.sales, 0);
    const totalBooked = campaigns.reduce((s, c) => s + c.bookedJobs, 0);
    const blendedCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const blendedRoas = totalSpend > 0 ? totalRev / totalSpend : 0;
    return {
      totalSpend,
      totalLeads,
      totalRev,
      totalBooked,
      blendedCpl,
      blendedRoas,
      activeCampaigns: campaigns.length,
    };
  }, [campaigns]);

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
        pageTitle="Performance"
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
      <div
        style={{
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Top totals */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
        >
          <SimpleKpi
            label="Active campaigns"
            value={formatInt(totals.activeCampaigns)}
            sub={`${period.label.toLowerCase()} window`}
          />
          <SimpleKpi
            label="Total spend"
            value={formatCurrency(totals.totalSpend)}
            sub={`${period.current.startStr} → ${period.current.endStr}`}
          />
          <SimpleKpi
            label="Total leads"
            value={formatInt(totals.totalLeads)}
            sub={
              totals.blendedCpl > 0
                ? `avg ${formatCurrency(totals.blendedCpl)} CPL`
                : "no leads in window"
            }
          />
          <SimpleKpi
            label="Attributed revenue"
            value={formatCompactMoney(totals.totalRev)}
            sub={
              totals.blendedRoas > 0
                ? `${totals.blendedRoas.toFixed(1)}x blended ROAS`
                : "no revenue yet"
            }
            accent
          />
        </div>

        {/* Campaign / Adset / Ad / BU breakdown — unchanged inner tables. */}
        <PerformanceTabs
          ads={ads}
          campaigns={campaigns}
          adsets={adsets}
          businessUnits={businessUnitRows}
          sevenDayByAd={sevenDayByAd}
          creativeByAd={creativeByAd}
        />

        {/* Service breakdown bars */}
        <Card>
          <CardHeader eyebrow="By service" title="Where the spend is going" />
          <div style={{ padding: 20 }}>
            <ServiceBars
              rows={businessUnitRows.map((r) => ({
                label: r.businessUnit,
                spend: r.spend,
                leads: r.leads,
                revenue: r.sales,
              }))}
              totalSpend={totals.totalSpend}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function ServiceBars({
  rows,
  totalSpend,
}: {
  rows: { label: string; spend: number; leads: number; revenue: number }[];
  totalSpend: number;
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--color-jbp-text-3)",
          fontFamily: "var(--font-mono)",
        }}
      >
        no service rows in window
      </div>
    );
  }
  const colorMap: Record<string, string> = {
    Bathrooms: "var(--color-jbp-svc-water)",
    Sewers: "var(--color-jbp-svc-sewer)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 80px 80px 100px",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-jbp-text)",
            }}
          >
            {r.label}
          </div>
          <div
            style={{
              position: "relative",
              height: 22,
              background: "var(--color-jbp-cream)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width:
                  totalSpend > 0
                    ? `${(r.spend / totalSpend) * 100}%`
                    : "0%",
                background: colorMap[r.label] ?? "var(--color-jbp-red)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}
          >
            {formatCurrency(r.spend)}
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--color-jbp-text-2)",
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}
          >
            {r.leads} leads
          </div>
          <div
            style={{
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              color: "var(--color-jbp-red)",
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}
          >
            {formatCompactMoney(r.revenue)}
          </div>
        </div>
      ))}
    </div>
  );
}
