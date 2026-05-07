"use client";

import { useEffect, useMemo, useState } from "react";
import { BigFunnelChart } from "@/components/BigFunnelChart";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FunnelInsights } from "@/components/FunnelInsights";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { StepConversionChart } from "@/components/StepConversionChart";
import {
  computeFunnel,
  dailyFunnelRates,
} from "@/lib/aggregate";
import {
  getServiceSlices,
  type ServiceView,
} from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import { rollingDaysList } from "@/lib/periods";
import type { DateRangePreset } from "@/lib/types";

interface FunnelClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function FunnelClient({
  businessUnits,
  initialState,
}: FunnelClientProps) {
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
  const ratesDates = useMemo(() => rollingDaysList(30), []);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => ({
      slice,
      current: computeFunnel(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      ),
      previous: computeFunnel(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.previous,
        slice.bu,
      ),
      rates: dailyFunnelRates(
        data.meta_insights,
        data.servicetitan_social_leads,
        ratesDates,
        slice.bu,
      ),
    }));
  }, [data, slices, period, ratesDates]);

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
        breadcrumb="Dashboard / Funnel"
        pageTitle="Funnel"
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
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            {period.label} · {period.current.startStr} →{" "}
            {period.current.endStr}
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        <section className="flex flex-col gap-3">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Conversion Funnel
          </h2>
          <p className="text-[12px] text-[color:var(--color-text-secondary)]">
            Five-stage progression from impression to sold job. Comparison
            against {period.previousLabel.replace("vs. ", "")}.
          </p>
          <div
            className={
              slices.length > 1 ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : ""
            }
          >
            {sliceData.map(({ slice, current, previous }) => (
              <div
                key={`funnel-${slice.key}`}
                className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-5"
              >
                {slices.length > 1 ? (
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
                    {slice.label}
                  </p>
                ) : null}
                <BigFunnelChart current={current} previous={previous} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Step Conversions · Last 30 Days
          </h2>
          <p className="text-[12px] text-[color:var(--color-text-secondary)]">
            Toggle each rate to focus the chart. Daily values, not smoothed.
          </p>
          <div
            className={
              slices.length > 1 ? "grid grid-cols-1 gap-4 lg:grid-cols-2" : ""
            }
          >
            {sliceData.map(({ slice, rates }) => (
              <div
                key={`step-${slice.key}`}
                className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-5"
              >
                {slices.length > 1 ? (
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
                    {slice.label}
                  </p>
                ) : null}
                <StepConversionChart series={rates} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Insights
          </h2>
          {sliceData.map(({ slice, current, previous, rates }) => (
            <div key={`ins-${slice.key}`} className="flex flex-col gap-2">
              {slices.length > 1 ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
                  {slice.label}
                </p>
              ) : null}
              <FunnelInsights
                current={current}
                previous={previous}
                rates={rates}
              />
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
