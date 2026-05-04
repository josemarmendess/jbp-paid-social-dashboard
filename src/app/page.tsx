import { TopHeader } from "@/components/TopHeader";
import { KpiCard } from "@/components/KpiCard";
import { PivotTable, PivotCustomize } from "@/components/PivotTable";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { FunnelChart } from "@/components/FunnelChart";
import { CancellationRateChart } from "@/components/CancellationRateChart";
import { AnomalyBanner } from "@/components/AnomalyBanner";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import {
  cancellationRateSeries,
  computeFunnel,
  computeOverviewKpis,
  computePivotMetrics,
  dailyKpiSeries,
  dailySpendVsRevenue,
  detectAnomalies,
  listBusinessUnits,
} from "@/lib/aggregate";
import {
  getPivotPeriods,
  getRollingRange,
  rollingDaysList,
} from "@/lib/periods";
import {
  getServiceSlices,
  parseBuList,
  parseView,
} from "@/lib/buFilter";
import {
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/format";
import { METRIC_DEFS } from "@/lib/metricDefinitions";
import {
  parsePivotColKeys,
  parsePivotRowKeys,
} from "@/lib/pivotConfig";
import { goalChip, parseGoalTargets } from "@/lib/goals";
import type { PaidSocialPayload } from "@/lib/types";

export const revalidate = 1800;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    view?: string;
    pivotRows?: string;
    pivotCols?: string;
    cplTarget?: string;
    roasTarget?: string;
    cancelTarget?: string;
  }>;
}

const chicagoFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatLastUpdated(generatedAt: string): string {
  try {
    return `Updated ${chicagoFormatter.format(new Date(generatedAt))} CT`;
  } catch {
    return generatedAt;
  }
}

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const preset = parsePreset(sp.range);
  const period = getPeriod(preset, sp.start, sp.end);
  const view = parseView(sp.view);
  const targets = parseGoalTargets(sp);

  let data: PaidSocialPayload | null = null;
  let fetchError: string | null = null;
  try {
    data = await fetchPaidSocialData();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  if (!data) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorBanner message={fetchError ?? "Try refreshing."} />
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-[color:var(--color-text-tertiary)]">
          No data available.
        </div>
      </main>
    );
  }

  const businessUnits = listBusinessUnits(data.servicetitan_social_leads);
  const bu = parseBuList(sp.bu, businessUnits);
  const lastUpdated = formatLastUpdated(data.generated_at);
  const slices = getServiceSlices(bu, view);

  // Anomaly detection runs on the unfiltered series — anomalies are most
  // useful at the account level. Computed once here.
  const sparkDates30 = rollingDaysList(30);
  const anomalyRows = dailyKpiSeries(
    data.meta_insights,
    data.servicetitan_social_leads,
    sparkDates30,
    [],
  );
  const anomalies = detectAnomalies(anomalyRows);

  const pivotPeriods = getPivotPeriods();
  const visibleRowKeys = parsePivotRowKeys(sp.pivotRows);
  const visibleColKeys = parsePivotColKeys(
    sp.pivotCols,
    pivotPeriods.map((p) => p.key),
  );
  const last30Range = getRollingRange(30);
  // Daily trend: pull 90 days so the chart's window selector (7/14/30/60/90)
  // can zoom without a server round-trip.
  const trendDates = rollingDaysList(90);
  const dowDates = rollingDaysList(30);

  // Build per-slice data once. Each slice holds its current/previous KPIs,
  // 30d sparkline series, pivot row values, and the trend chart inputs.
  const sliceData = slices.map((slice) => {
    const current = computeOverviewKpis(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.current,
      slice.bu,
    );
    const previous = computeOverviewKpis(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.previous,
      slice.bu,
    );
    const sparkRows = dailyKpiSeries(
      data!.meta_insights,
      data!.servicetitan_social_leads,
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
      ctr: sparkRows.map((r) => safeRatio(r.linkClicks, r.impressions)),
      leadRate: sparkRows.map((r) => safeRatio(r.leads, r.linkClicks)),
      bookRate: sparkRows.map((r) => safeRatio(r.bookedJobs, r.leads)),
      showRate: sparkRows.map((r) => safeRatio(r.completedJobs, r.bookedJobs)),
      closeRate: sparkRows.map((r) => safeRatio(r.soldJobs, r.bookedJobs)),
      cancellationRate: sparkRows.map((r) =>
        safeRatio(r.cancelledJobs, r.bookedJobs),
      ),
    };
    const pivotValues = pivotPeriods.map((p) =>
      computePivotMetrics(
        data!.meta_insights,
        data!.servicetitan_social_leads,
        p.range,
        slice.bu,
      ),
    );
    const trend = dailySpendVsRevenue(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      trendDates,
      slice.bu,
    );
    const dowSeries = dailyKpiSeries(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      dowDates,
      slice.bu,
    );
    const funnel = computeFunnel(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.current,
      slice.bu,
    );
    const weeklyAll = cancellationRateSeries(
      data!.servicetitan_social_leads,
      slice.bu,
      "week",
      52,
    );
    const monthlyAll = cancellationRateSeries(
      data!.servicetitan_social_leads,
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

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard"
        pageTitle="Overview"
        lastUpdated={lastUpdated}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
      />

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-8 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {period.label} · {period.current.startStr} → {period.current.endStr}
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

        {/* KPI grid — duplicated per slice when split. */}
        {sliceData.map(({ slice, current, previous, sparks }) => (
          <section
            key={`kpi-${slice.key}`}
            aria-label={`KPIs · ${slice.label}`}
            className="flex flex-col gap-3"
          >
            {slices.length > 1 ? <SliceHeader label={slice.label} /> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
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
                label="Booked Jobs"
                value={formatInt(current.bookedJobs)}
                current={current.bookedJobs}
                previous={previous.bookedJobs}
                sparkline={sparks.booked}
                tooltip={METRIC_DEFS.bookedJobs}
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
              <KpiCard
                label="Spend on Revenue"
                value={current.spendOnRevenue ? formatPercent(current.spendOnRevenue) : "—"}
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
                value={current.leadRate ? formatPercent(current.leadRate) : "—"}
                current={current.leadRate}
                previous={previous.leadRate}
                sparkline={sparks.leadRate}
                hint="leads / clicks"
                tooltip={METRIC_DEFS.leadRate}
              />
              <KpiCard
                label="Book Rate"
                value={current.bookRate ? formatPercent(current.bookRate) : "—"}
                current={current.bookRate}
                previous={previous.bookRate}
                sparkline={sparks.bookRate}
                hint="booked / leads"
                tooltip={METRIC_DEFS.bookRate}
              />
              <KpiCard
                label="Show Rate"
                value={current.showRate ? formatPercent(current.showRate) : "—"}
                current={current.showRate}
                previous={previous.showRate}
                sparkline={sparks.showRate}
                hint="completed / booked"
                tooltip={METRIC_DEFS.showRate}
              />
              <KpiCard
                label="Close Rate"
                value={current.closeRate ? formatPercent(current.closeRate) : "—"}
                current={current.closeRate}
                previous={previous.closeRate}
                sparkline={sparks.closeRate}
                hint="sold / booked"
                tooltip={METRIC_DEFS.closeRate}
              />
              <KpiCard
                label="Cancellation Rate"
                value={current.cancellationRate ? formatPercent(current.cancellationRate) : "—"}
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

        {/* Pivot tables — one per slice. */}
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
              visibleRowKeys={visibleRowKeys}
              visibleColKeys={visibleColKeys}
            />
          </div>
          <div className="flex flex-col gap-4">
            {sliceData.map(({ slice, pivotValues }) => (
              <PivotTable
                key={`pivot-${slice.key}`}
                periods={pivotPeriods}
                values={pivotValues}
                caption={slices.length > 1 ? slice.label : undefined}
                visibleRowKeys={visibleRowKeys}
                visibleColKeys={visibleColKeys}
              />
            ))}
          </div>
          {targets.cplTarget != null ||
          targets.roasTarget != null ||
          targets.cancelTarget != null ? (
            <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
              Goals · CPL{" "}
              {targets.cplTarget != null ? `$${targets.cplTarget}` : "—"} ·
              ROAS{" "}
              {targets.roasTarget != null ? `${targets.roasTarget}x` : "—"} ·
              Cancel{" "}
              {targets.cancelTarget != null
                ? `<${targets.cancelTarget}%`
                : "—"}{" "}
              · set via URL <code className="font-mono">?cplTarget=80</code>
            </p>
          ) : null}
        </section>

        {/* Trends — full-width daily chart, 2-up funnel/cancellation, day-of-week. */}
        <section aria-label="Trends" className="flex flex-col gap-4">
          <SectionHeader title="Trends" />
          {sliceData.map(
            ({
              slice,
              trend,
              dowSeries,
              funnel,
              weeklyAll,
              monthlyAll,
            }) => (
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
                <ChartCard
                  title="By Day of Week"
                  caption="Trailing 30 days"
                >
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

function SliceHeader({
  label,
  subtle,
}: {
  label: string;
  subtle?: boolean;
}) {
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
