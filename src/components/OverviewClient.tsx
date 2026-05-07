"use client";

import { useEffect, useMemo, useState } from "react";
import { AnomalyBanner } from "@/components/AnomalyBanner";
import { CancellationRateChart } from "@/components/CancellationRateChart";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { ErrorBanner } from "@/components/ErrorBanner";
import { FunnelChart } from "@/components/FunnelChart";
import { KpiCard } from "@/components/KpiCard";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { PivotCustomize, PivotTable } from "@/components/PivotTable";
import {
  cancellationRateSeries,
  computeFunnel,
  computeOverviewKpis,
  computePivotMetrics,
  dailyKpiSeries,
  dailySpendVsRevenue,
  detectAnomalies,
} from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import {
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { goalChip, type GoalTargets } from "@/lib/goals";
import { METRIC_DEFS } from "@/lib/metricDefinitions";
import {
  getPivotPeriods,
  getRollingRange,
  rollingDaysList,
} from "@/lib/periods";
import { ALL_PIVOT_ROW_KEYS, DEFAULT_PIVOT_ROW_KEYS } from "@/lib/pivotConfig";
import { toneForLabel } from "@/lib/sliceColors";
import type { DateRangePreset } from "@/lib/types";

interface OverviewClientProps {
  /** Canonical service taxonomy — passed in to avoid re-deriving on the client. */
  businessUnits: string[];
  /** State derived from the URL's searchParams on first render. */
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
    pivotRowKeys: string[];
    pivotColKeys: string[];
    targets: GoalTargets;
  };
}

/**
 * Overview content rendered entirely on the client. The server hands us the
 * Apps Script payload ONCE; from there, every filter (date / BU / view /
 * pivot config) lives in React state and re-derives via useMemo. Filter
 * changes do NOT trigger a server round-trip — they're a pure client
 * re-render against the data already in memory.
 *
 * URL is kept in sync via window.history.replaceState so shareable links
 * still work. The "Updated …" indicator is set once per page load and stays
 * stable until the user clicks Refresh.
 */
export function OverviewClient({
  businessUnits,
  initialState,
}: OverviewClientProps) {
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
  const [pivotRowKeys, setPivotRowKeys] = useState<string[]>(
    initialState.pivotRowKeys,
  );
  const [pivotColKeys, setPivotColKeys] = useState<string[]>(
    initialState.pivotColKeys,
  );
  const targets = initialState.targets;

  // Mirror state to the URL via replaceState — no router.replace, so no
  // RSC fetch and no server-side re-render. Shareable links still work.
  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    if (
      pivotRowKeys.length === 0 ||
      (pivotRowKeys.length !== ALL_PIVOT_ROW_KEYS.length &&
        !sameSet(pivotRowKeys, DEFAULT_PIVOT_ROW_KEYS))
    ) {
      sp.set(
        "pivotRows",
        pivotRowKeys.length === 0 ? "_none_" : pivotRowKeys.join(","),
      );
    }
    const allColKeys = getPivotPeriods().map((p) => p.key);
    if (
      pivotColKeys.length === 0 ||
      pivotColKeys.length !== allColKeys.length
    ) {
      sp.set(
        "pivotCols",
        pivotColKeys.length === 0 ? "_none_" : pivotColKeys.join(","),
      );
    }
    if (targets.cplTarget != null)
      sp.set("cplTarget", String(targets.cplTarget));
    if (targets.roasTarget != null)
      sp.set("roasTarget", String(targets.roasTarget));
    if (targets.cancelTarget != null)
      sp.set("cancelTarget", String(targets.cancelTarget));
    replaceQuery(sp.toString());
  }, [
    preset,
    customStart,
    customEnd,
    bu,
    view,
    pivotRowKeys,
    pivotColKeys,
    targets.cplTarget,
    targets.roasTarget,
    targets.cancelTarget,
  ]);

  // Derived values — every filter change re-runs these synchronously in the
  // browser. With 2.4k Meta rows and a few thousand ServiceTitan rows the
  // total compute is single-digit ms, way below human perception.
  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );
  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);
  const sparkDates30 = useMemo(() => rollingDaysList(30), []);
  const trendDates = useMemo(() => rollingDaysList(90), []);
  const dowDates = useMemo(() => rollingDaysList(30), []);
  const last30Range = useMemo(() => getRollingRange(30), []);
  const pivotPeriods = useMemo(() => getPivotPeriods(), []);

  const anomalies = useMemo(() => {
    if (!data) return [];
    const rows = dailyKpiSeries(
      data.meta_insights,
      data.servicetitan_social_leads,
      sparkDates30,
      [],
    );
    return detectAnomalies(rows);
  }, [data, sparkDates30]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => {
      const current = computeOverviewKpis(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      );
      const previous = computeOverviewKpis(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.previous,
        slice.bu,
      );
      const sparkRows = dailyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        sparkDates30,
        slice.bu,
      );
      const safeRatio = (n: number, d: number) => (d > 0 ? n / d : 0);
      const sparks = {
        spend: sparkRows.map((r) => r.spend),
        leads: sparkRows.map((r) => r.leads),
        booked: sparkRows.map((r) => r.bookedJobs),
        sold: sparkRows.map((r) => r.soldJobs),
        sales: sparkRows.map((r) => r.sales),
        spendOnRevenue: sparkRows.map((r) => safeRatio(r.spend, r.revenue)),
        costPerLead: sparkRows.map((r) => safeRatio(r.spend, r.leads)),
        costPerBookedJob: sparkRows.map((r) =>
          safeRatio(r.spend, r.bookedJobs),
        ),
        ctr: sparkRows.map((r) => safeRatio(r.linkClicks, r.impressions)),
        leadRate: sparkRows.map((r) => safeRatio(r.leads, r.linkClicks)),
        bookRate: sparkRows.map((r) => safeRatio(r.bookedJobs, r.leads)),
        showRate: sparkRows.map((r) =>
          safeRatio(r.completedJobs, r.bookedJobs),
        ),
        closeRate: sparkRows.map((r) => safeRatio(r.soldJobs, r.bookedJobs)),
        cancellationRate: sparkRows.map((r) =>
          safeRatio(r.cancelledJobs, r.bookedJobs),
        ),
      };
      const pivotValues = pivotPeriods.map((p) =>
        computePivotMetrics(
          data.meta_insights,
          data.servicetitan_social_leads,
          p.range,
          slice.bu,
        ),
      );
      const trend = dailySpendVsRevenue(
        data.meta_insights,
        data.servicetitan_social_leads,
        trendDates,
        slice.bu,
      );
      const dowSeries = dailyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        dowDates,
        slice.bu,
      );
      const funnel = computeFunnel(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      );
      const weeklyAll = cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "week",
        52,
      );
      const monthlyAll = cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "month",
        48,
      );
      return {
        slice,
        current,
        previous,
        sparks,
        pivotValues,
        trend,
        dowSeries,
        funnel,
        weeklyAll,
        monthlyAll,
      };
    });
  }, [
    slices,
    period,
    data,
    sparkDates30,
    trendDates,
    dowDates,
    pivotPeriods,
  ]);

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
        breadcrumb="Dashboard"
        pageTitle="Overview"
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

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-8 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {period.label} · {period.current.startStr} →{" "}
              {period.current.endStr}
            </span>
            <span className="text-[13px] text-[color:var(--color-text-secondary)]">
              {period.previousLabel}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {anomalies.length > 0 ? <AnomalyBanner anomalies={anomalies} /> : null}

        {sliceData.map(({ slice, current, previous, sparks }) => (
          <section
            key={`kpi-${slice.key}`}
            aria-label={`KPIs · ${slice.label}`}
            className="flex flex-col gap-3"
          >
            {slices.length > 1 ? <SliceHeader label={slice.label} /> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              <KpiCard
                label="Spend"
                value={formatCurrency(current.spend)}
                current={current.spend}
                previous={previous.spend}
                invertDelta
                sparkline={sparks.spend}
                tooltip={METRIC_DEFS.spend}
              />
              <KpiCard
                label="Leads"
                value={formatInt(current.leads)}
                current={current.leads}
                previous={previous.leads}
                sparkline={sparks.leads}
                tooltip={METRIC_DEFS.leads}
              />
              <KpiCard
                label="Cost per Lead"
                value={
                  current.costPerLead
                    ? formatCurrency(current.costPerLead, true)
                    : "—"
                }
                current={current.costPerLead}
                previous={previous.costPerLead}
                invertDelta
                sparkline={sparks.costPerLead}
                hint="spend / leads"
                tooltip={METRIC_DEFS.costPerLead}
                goalChip={goalChip(
                  "cpl",
                  current.costPerLead,
                  targets.cplTarget,
                )}
              />
              <KpiCard
                label="Booked Jobs"
                value={formatInt(current.bookedJobs)}
                current={current.bookedJobs}
                previous={previous.bookedJobs}
                sparkline={sparks.booked}
                tooltip={METRIC_DEFS.bookedJobs}
              />
              <KpiCard
                label="Cost per Booked"
                value={
                  current.costPerBookedJob
                    ? formatCurrency(current.costPerBookedJob, true)
                    : "—"
                }
                current={current.costPerBookedJob}
                previous={previous.costPerBookedJob}
                invertDelta
                sparkline={sparks.costPerBookedJob}
                hint="spend / booked"
                tooltip={METRIC_DEFS.costPerBookedJob}
              />
              <KpiCard
                label="Sold Jobs"
                value={formatInt(current.soldJobs)}
                current={current.soldJobs}
                previous={previous.soldJobs}
                sparkline={sparks.sold}
                tooltip={METRIC_DEFS.soldJobs}
              />
              <KpiCard
                label="Sales Revenue"
                value={formatCurrency(current.sales)}
                current={current.sales}
                previous={previous.sales}
                sparkline={sparks.sales}
                tooltip={METRIC_DEFS.salesRevenue}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              <KpiCard
                label="Spend on Revenue"
                value={
                  current.spendOnRevenue
                    ? formatPercent(current.spendOnRevenue)
                    : "—"
                }
                current={current.spendOnRevenue}
                previous={previous.spendOnRevenue}
                invertDelta
                sparkline={sparks.spendOnRevenue}
                hint="Lower is better"
                tooltip={METRIC_DEFS.spendOnRevenue}
              />
              <KpiCard
                label="CTR"
                value={current.ctr ? formatPercent(current.ctr) : "—"}
                current={current.ctr}
                previous={previous.ctr}
                sparkline={sparks.ctr}
                tooltip={METRIC_DEFS.ctr}
              />
              <KpiCard
                label="Lead Rate"
                value={
                  current.leadRate ? formatPercent(current.leadRate) : "—"
                }
                current={current.leadRate}
                previous={previous.leadRate}
                sparkline={sparks.leadRate}
                hint="leads / clicks"
                tooltip={METRIC_DEFS.leadRate}
              />
              <KpiCard
                label="Book Rate"
                value={
                  current.bookRate ? formatPercent(current.bookRate) : "—"
                }
                current={current.bookRate}
                previous={previous.bookRate}
                sparkline={sparks.bookRate}
                hint="booked / leads"
                tooltip={METRIC_DEFS.bookRate}
              />
              <KpiCard
                label="Show Rate"
                value={
                  current.showRate ? formatPercent(current.showRate) : "—"
                }
                current={current.showRate}
                previous={previous.showRate}
                sparkline={sparks.showRate}
                hint="completed / booked"
                tooltip={METRIC_DEFS.showRate}
              />
              <KpiCard
                label="Close Rate"
                value={
                  current.closeRate ? formatPercent(current.closeRate) : "—"
                }
                current={current.closeRate}
                previous={previous.closeRate}
                sparkline={sparks.closeRate}
                hint="sold / booked"
                tooltip={METRIC_DEFS.closeRate}
              />
              <KpiCard
                label="Cancellation Rate"
                value={
                  current.cancellationRate
                    ? formatPercent(current.cancellationRate)
                    : "—"
                }
                current={current.cancellationRate}
                previous={previous.cancellationRate}
                invertDelta
                sparkline={sparks.cancellationRate}
                hint="of all bookings"
                tooltip={METRIC_DEFS.cancellationRate}
                goalChip={goalChip(
                  "cancelRate",
                  current.cancellationRate * 100,
                  targets.cancelTarget,
                )}
              />
            </div>
          </section>
        ))}

        <section
          aria-label="Performance over time"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <SectionHeader
              title="Performance Over Time"
              subtitle={
                slices.length > 1
                  ? `${slices.length} ${slices.length === 1 ? "view" : "views"} · stacked`
                  : "All times America/Chicago"
              }
            />
            <PivotCustomize
              columns={pivotPeriods.map((p) => ({ key: p.key, label: p.label }))}
              visibleRowKeys={pivotRowKeys}
              visibleColKeys={pivotColKeys}
              onChangeRows={setPivotRowKeys}
              onChangeCols={setPivotColKeys}
            />
          </div>
          <div className="flex flex-col gap-4">
            {sliceData.map(({ slice, pivotValues }) => (
              <PivotTable
                key={`pivot-${slice.key}`}
                periods={pivotPeriods}
                values={pivotValues}
                caption={slices.length > 1 ? slice.label : undefined}
                tone={slices.length > 1 ? toneForLabel(slice.label) : "neutral"}
                visibleRowKeys={pivotRowKeys}
                visibleColKeys={pivotColKeys}
              />
            ))}
          </div>
          {targets.cplTarget != null ||
          targets.roasTarget != null ||
          targets.cancelTarget != null ? (
            <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
              Goals · CPL{" "}
              {targets.cplTarget != null ? `$${targets.cplTarget}` : "—"} ·
              ROAS {targets.roasTarget != null ? `${targets.roasTarget}x` : "—"}{" "}
              · Cancel{" "}
              {targets.cancelTarget != null
                ? `<${targets.cancelTarget}%`
                : "—"}{" "}
              · set via URL <code className="font-mono">?cplTarget=80</code>
            </p>
          ) : null}
        </section>

        <section aria-label="Trends" className="flex flex-col gap-4">
          <SectionHeader title="Trends" />
          {sliceData.map(
            ({ slice, trend, dowSeries, funnel, weeklyAll, monthlyAll }) => (
              <div key={`trends-${slice.key}`} className="flex flex-col gap-4">
                {slices.length > 1 ? (
                  <SliceHeader label={slice.label} subtle />
                ) : null}
                <ChartCard
                  title="Daily Spend vs Revenue"
                  caption={`${trendDates[0]} → ${last30Range.endStr} · adjustable window`}
                >
                  <DailyTrendChart data={trend} />
                </ChartCard>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard
                    title="Conversion Funnel"
                    caption={`${period.current.startStr} → ${period.current.endStr}`}
                  >
                    <FunnelChart metrics={funnel} />
                  </ChartCard>
                  <ChartCard
                    title="Cancellation Rate"
                    caption="Current vs previous"
                  >
                    <CancellationRateChart
                      weekly={weeklyAll}
                      monthly={monthlyAll}
                    />
                  </ChartCard>
                </div>
                <ChartCard title="By Day of Week" caption="Trailing 30 days">
                  <DayOfWeekChart rows={dowSeries} />
                </ChartCard>
              </div>
            ),
          )}
        </section>
      </div>
    </main>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (const x of a) if (!b.includes(x)) return false;
  return true;
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2
        className="font-display text-[color:var(--color-text-primary)]"
        style={{ fontSize: 18, letterSpacing: "0.06em" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <span className="text-[12px] text-[color:var(--color-text-tertiary)] tabular-nums">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}

function SliceHeader({ label, subtle }: { label: string; subtle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          subtle
            ? "text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]"
            : "font-display text-[color:var(--color-text-primary)]"
        }
        style={subtle ? undefined : { fontSize: 15, letterSpacing: "0.06em" }}
      >
        {label}
      </span>
      <span className="h-[1px] flex-1 bg-[color:var(--color-border-subtle)]" />
    </div>
  );
}

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4 transition-shadow hover:shadow-[0_4px_16px_rgba(26,15,11,0.06)]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold text-[color:var(--color-text-primary)]">
          {title}
        </h3>
        {caption ? (
          <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
            {caption}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
