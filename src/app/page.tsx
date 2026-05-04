import { TopHeader } from "@/components/TopHeader";
import { KpiCard } from "@/components/KpiCard";
import { PivotTable } from "@/components/PivotTable";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { FunnelChart } from "@/components/FunnelChart";
import { CancellationRateChart } from "@/components/CancellationRateChart";
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
  listBusinessUnits,
} from "@/lib/aggregate";
import {
  getPivotPeriods,
  getRollingRange,
  rollingDaysList,
} from "@/lib/periods";
import {
  formatCurrency,
  formatInt,
  formatPercent,
} from "@/lib/format";
import type { PaidSocialPayload } from "@/lib/types";

export const revalidate = 1800;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
  }>;
}

function normalizeBu(raw: string | undefined, options: string[]): string {
  if (!raw || raw === "All") return "All";
  const match = options.find((o) => o.toLowerCase() === raw.toLowerCase());
  return match ?? "All";
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
  const { range, start, end, bu: rawBu } = await searchParams;
  const preset = parsePreset(range);
  const period = getPeriod(preset, start, end);

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
  const bu = normalizeBu(rawBu, businessUnits);
  const lastUpdated = formatLastUpdated(data.generated_at);

  const current = computeOverviewKpis(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );
  const previous = computeOverviewKpis(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.previous,
    bu,
  );

  // 30-day rolling daily series for sparklines.
  const sparkDates = rollingDaysList(30);
  const sparkRows = dailyKpiSeries(
    data.meta_insights,
    data.servicetitan_social_leads,
    sparkDates,
    bu,
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

  const pivotPeriods = getPivotPeriods();
  const pivotValues = pivotPeriods.map((p) =>
    computePivotMetrics(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      p.range,
      bu,
    ),
  );

  const trendDates = rollingDaysList(30);
  const trend = dailySpendVsRevenue(
    data.meta_insights,
    data.servicetitan_social_leads,
    trendDates,
    bu,
  );

  const funnel = computeFunnel(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );

  const weeklyAll = cancellationRateSeries(
    data.servicetitan_social_leads,
    bu,
    "week",
    16,
  );
  const monthlyAll = cancellationRateSeries(
    data.servicetitan_social_leads,
    bu,
    "month",
    12,
  );
  const splitWeekly = {
    previous: weeklyAll.slice(0, Math.max(0, weeklyAll.length - 8)),
    current: weeklyAll.slice(-8),
  };
  const splitMonthly = {
    previous: monthlyAll.slice(0, Math.max(0, monthlyAll.length - 6)),
    current: monthlyAll.slice(-6),
  };
  const last30Range = getRollingRange(30);

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
      />

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-8 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {period.label} · {period.current.startStr} → {period.current.endStr}
            </span>
            <span className="text-[12px] text-[color:var(--color-text-secondary)]">
              {period.previousLabel}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {/* KPI grid: 12 cards (volume row + rate row) */}
        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6"
        >
          <KpiCard
            label="Spend"
            value={formatCurrency(current.spend)}
            current={current.spend}
            previous={previous.spend}
            invertDelta
            sparkline={sparks.spend}
          />
          <KpiCard
            label="Leads"
            value={formatInt(current.leads)}
            current={current.leads}
            previous={previous.leads}
            sparkline={sparks.leads}
          />
          <KpiCard
            label="Booked Jobs"
            value={formatInt(current.bookedJobs)}
            current={current.bookedJobs}
            previous={previous.bookedJobs}
            sparkline={sparks.booked}
          />
          <KpiCard
            label="Sold Jobs"
            value={formatInt(current.soldJobs)}
            current={current.soldJobs}
            previous={previous.soldJobs}
            sparkline={sparks.sold}
          />
          <KpiCard
            label="Sales Revenue"
            value={formatCurrency(current.sales)}
            current={current.sales}
            previous={previous.sales}
            sparkline={sparks.sales}
          />
          <KpiCard
            label="Spend on Revenue"
            value={current.spendOnRevenue ? formatPercent(current.spendOnRevenue) : "—"}
            current={current.spendOnRevenue}
            previous={previous.spendOnRevenue}
            invertDelta
            sparkline={sparks.spendOnRevenue}
            hint="Lower is better"
          />

          <KpiCard
            label="CTR"
            value={current.ctr ? formatPercent(current.ctr) : "—"}
            current={current.ctr}
            previous={previous.ctr}
            sparkline={sparks.ctr}
          />
          <KpiCard
            label="Lead Rate"
            value={current.leadRate ? formatPercent(current.leadRate) : "—"}
            current={current.leadRate}
            previous={previous.leadRate}
            sparkline={sparks.leadRate}
            hint="leads / clicks"
          />
          <KpiCard
            label="Book Rate"
            value={current.bookRate ? formatPercent(current.bookRate) : "—"}
            current={current.bookRate}
            previous={previous.bookRate}
            sparkline={sparks.bookRate}
            hint="booked / leads"
          />
          <KpiCard
            label="Show Rate"
            value={current.showRate ? formatPercent(current.showRate) : "—"}
            current={current.showRate}
            previous={previous.showRate}
            sparkline={sparks.showRate}
            hint="completed / booked"
          />
          <KpiCard
            label="Close Rate"
            value={current.closeRate ? formatPercent(current.closeRate) : "—"}
            current={current.closeRate}
            previous={previous.closeRate}
            sparkline={sparks.closeRate}
            hint="sold / booked"
          />
          <KpiCard
            label="Cancellation Rate"
            value={current.cancellationRate ? formatPercent(current.cancellationRate) : "—"}
            current={current.cancellationRate}
            previous={previous.cancellationRate}
            invertDelta
            sparkline={sparks.cancellationRate}
            hint="of all bookings"
          />
        </section>

        {/* Pivot table */}
        <section
          aria-label="Performance over time"
          className="flex flex-col gap-3"
        >
          <SectionHeader title="Performance Over Time" subtitle="All times America/Chicago" />
          <PivotTable periods={pivotPeriods} values={pivotValues} />
        </section>

        {/* Trends row */}
        <section aria-label="Trends" className="flex flex-col gap-3">
          <SectionHeader title="Trends" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard
              title="Daily Spend vs Revenue"
              caption={`${last30Range.startStr} → ${last30Range.endStr}`}
            >
              <DailyTrendChart data={trend} />
            </ChartCard>
            <ChartCard
              title="Funnel"
              caption={`${period.current.startStr} → ${period.current.endStr}`}
            >
              <FunnelChart metrics={funnel} />
            </ChartCard>
            <ChartCard title="Cancellation Rate" caption="Current vs previous">
              <CancellationRateChart
                weekly={splitWeekly}
                monthly={splitMonthly}
              />
            </ChartCard>
          </div>
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
        style={{ fontSize: 16, letterSpacing: "0.06em" }}
      >
        {title}
      </h2>
      {subtitle ? (
        <span className="text-[11px] text-[color:var(--color-text-tertiary)] tabular-nums">
          {subtitle}
        </span>
      ) : null}
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
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
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
