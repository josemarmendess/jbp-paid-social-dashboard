"use client";

import { useEffect, useMemo, useState } from "react";
import { CancellationRateChart } from "@/components/CancellationRateChart";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { PipelineKpiCard } from "@/components/PipelineKpiCard";
import { StaleBookingsTable } from "@/components/StaleBookingsTable";
import {
  cancellationRateSeries,
  computePipelineMetrics,
  getStaleBookings,
  showRateSeries,
} from "@/lib/aggregate";
import {
  getServiceSlices,
  type ServiceView,
} from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { chicagoTodayStr } from "@/lib/dateRange";
import { formatInt } from "@/lib/format";
import { getLastMonthRange } from "@/lib/periods";
import type { DateRangePreset } from "@/lib/types";

const STALE_DAYS = 14;

interface PipelineClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function PipelineClient({
  businessUnits,
  initialState,
}: PipelineClientProps) {
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

  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);
  const lastMonth = useMemo(() => getLastMonthRange(), []);
  const todayStr = useMemo(() => chicagoTodayStr(), []);

  const stale = useMemo(() => {
    if (!data) return [];
    return getStaleBookings(
      data.servicetitan_social_leads,
      bu,
      STALE_DAYS,
      todayStr,
    );
  }, [data, bu, todayStr]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => ({
      slice,
      pipeline: computePipelineMetrics(
        data.servicetitan_social_leads,
        slice.bu,
        lastMonth,
      ),
      cancelWeekly: cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "week",
        52,
      ),
      cancelMonthly: cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "month",
        48,
      ),
      showWeekly: showRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "week",
        52,
      ),
      showMonthly: showRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "month",
        48,
      ),
    }));
  }, [data, slices, lastMonth]);

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
        breadcrumb="Dashboard / Pipeline"
        pageTitle="Pipeline"
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
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            Operational view · all-time pending pipeline
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {sliceData.map(({ slice, pipeline }) => (
          <section key={`pipe-${slice.key}`} className="flex flex-col gap-3">
            {slices.length > 1 ? (
              <div className="flex items-center gap-3">
                <span
                  className="font-display text-[color:var(--color-text-primary)]"
                  style={{ fontSize: 15, letterSpacing: "0.06em" }}
                >
                  {slice.label}
                </span>
                <span className="h-[1px] flex-1 bg-[color:var(--color-border-subtle)]" />
              </div>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <PipelineKpiCard
                label="Carryover Pipeline"
                value={formatInt(pipeline.carryover)}
                subtitle={`Last month leads with status "Scheduled" (${lastMonth.startStr} → ${lastMonth.endStr})`}
                badge={
                  pipeline.carryover > 0
                    ? { tone: "warning", text: "Action" }
                    : { tone: "positive", text: "Clear" }
                }
              />
              <PipelineKpiCard
                label="Avg Days to Close"
                value={
                  pipeline.avgDaysToClose != null
                    ? `${pipeline.avgDaysToClose.toFixed(1)}d`
                    : "—"
                }
                subtitle="Creation Date → Sold On"
              />
              <PipelineKpiCard
                label="Avg Days to Complete"
                value={
                  pipeline.avgDaysToComplete != null
                    ? `${pipeline.avgDaysToComplete.toFixed(1)}d`
                    : "—"
                }
                subtitle="Sold On → Completed On"
              />
            </div>
          </section>
        ))}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2
              className="font-display text-[color:var(--color-text-primary)]"
              style={{ fontSize: 16, letterSpacing: "0.06em" }}
            >
              Stale Bookings
            </h2>
            <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
              Pending more than {STALE_DAYS} days · {stale.length} total
            </span>
          </div>
          <StaleBookingsTable rows={stale} />
        </section>

        {sliceData.map(
          ({
            slice,
            cancelWeekly,
            cancelMonthly,
            showWeekly,
            showMonthly,
          }) => (
            <section
              key={`pipe-trends-${slice.key}`}
              className="flex flex-col gap-3"
            >
              {slices.length > 1 ? (
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
                    {slice.label} · Trends
                  </span>
                  <span className="h-[1px] flex-1 bg-[color:var(--color-border-subtle)]" />
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                      Cancellation Rate Trend
                    </h3>
                    <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                      Current vs previous
                    </span>
                  </div>
                  <CancellationRateChart
                    weekly={cancelWeekly}
                    monthly={cancelMonthly}
                  />
                </div>
                <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                      Show Rate Trend
                    </h3>
                    <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                      Current vs previous · higher is better
                    </span>
                  </div>
                  <CancellationRateChart
                    weekly={showWeekly}
                    monthly={showMonthly}
                    currentColor="var(--color-positive)"
                    higherIsBetter
                  />
                </div>
              </div>
            </section>
          ),
        )}
      </div>
    </main>
  );
}
