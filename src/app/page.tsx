import { Header } from "@/components/Header";
import { KpiCard } from "@/components/KpiCard";
import { CarryoverPipelineCard } from "@/components/CarryoverPipelineCard";
import { AdPerformanceTable } from "@/components/AdPerformanceTable";
import { CampaignPerformanceTable } from "@/components/CampaignPerformanceTable";
import { CreativePerformanceGrid } from "@/components/CreativePerformanceGrid";
import { GeographicMap } from "@/components/GeographicMap";
import { PivotTable } from "@/components/PivotTable";
import { DailyTrendChart } from "@/components/DailyTrendChart";
import { FunnelChart } from "@/components/FunnelChart";
import { CancellationRateChart } from "@/components/CancellationRateChart";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import {
  aggregateByAd,
  aggregateByCampaign,
  aggregateByZip,
  buildAdSevenDaySpend,
  cancellationRateSeries,
  computeCarryoverPipeline,
  computeFunnel,
  computeKpiPairFiltered,
  computePivotMetrics,
  dailySpendVsRevenue,
  listBusinessUnits,
} from "@/lib/aggregate";
import {
  getLastMonthRange,
  getPivotPeriods,
  rollingDaysList,
  getRollingRange,
} from "@/lib/periods";
import {
  formatCurrency,
  formatInt,
  formatRoas,
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
        <div className="flex flex-1 items-center justify-center px-6 py-16 text-sm text-muted-foreground">
          No data available.
        </div>
      </main>
    );
  }

  const businessUnits = listBusinessUnits(data.servicetitan_social_leads);
  const bu = normalizeBu(rawBu, businessUnits);

  const kpis = computeKpiPairFiltered(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    period.previous,
    bu,
  );

  const carryover = computeCarryoverPipeline(
    data.servicetitan_social_leads,
    getLastMonthRange(),
    bu,
  );

  // BU-filter the per-ad rows: when filter is active, hide ads whose
  // ad-level Business Unit doesn't match. Spend/leads are Meta-only and
  // won't be re-attributed, but matching the filter on the ad-level BU
  // keeps the table consistent with the rest of the page.
  const allAds = aggregateByAd(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
  );
  const ads =
    bu === "All"
      ? allAds
      : allAds.filter(
          (a) => a.businessUnit.toLowerCase() === bu.toLowerCase(),
        );

  const campaigns = aggregateByCampaign(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );

  const pivotPeriods = getPivotPeriods();
  const pivotValues = pivotPeriods.map((p) =>
    computePivotMetrics(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      p.range,
      bu,
    ),
  );

  // Trend chart: last 30 days inclusive of today, daily granularity.
  const trendDates = rollingDaysList(30);
  const trend = dailySpendVsRevenue(
    data.meta_insights,
    data.servicetitan_social_leads,
    trendDates,
    bu,
  );

  // Funnel uses the user-selected period (top date range).
  const funnel = computeFunnel(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );

  // Cancellation series: 16 buckets so we can split into current vs previous
  // 8-week windows. Same idea for monthly (12 -> 6/6).
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

  // Static-period subtitle for trend chart label.
  const last30Range = getRollingRange(30);

  // Phase B: Geographic map + creative grid
  const zipRows = aggregateByZip(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );
  const sevenDayDates = rollingDaysList(7);
  const sevenDayMap = buildAdSevenDaySpend(data.meta_insights, sevenDayDates);
  const sevenDayRecord: Record<string, number[]> = {};
  for (const [k, v] of sevenDayMap) sevenDayRecord[k] = v;

  return (
    <main className="flex flex-1 flex-col">
      <Header
        generatedAt={data.generated_at}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
      />
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-6 py-8 sm:px-8">
        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <KpiCard
            label="Spend"
            value={formatCurrency(kpis.current.spend, true)}
            current={kpis.current.spend}
            previous={kpis.previous.spend}
            invertDelta
          />
          <KpiCard
            label="Leads"
            value={formatInt(kpis.current.leads)}
            current={kpis.current.leads}
            previous={kpis.previous.leads}
          />
          <KpiCard
            label="Booked Jobs"
            value={formatInt(kpis.current.bookedJobs)}
            current={kpis.current.bookedJobs}
            previous={kpis.previous.bookedJobs}
          />
          <KpiCard
            label="Sales"
            value={formatCurrency(kpis.current.sales)}
            current={kpis.current.sales}
            previous={kpis.previous.sales}
          />
          <KpiCard
            label="ROAS"
            value={formatRoas(kpis.current.roas)}
            current={kpis.current.roas}
            previous={kpis.previous.roas}
          />
          <CarryoverPipelineCard count={carryover} />
        </section>

        <section
          aria-label="Performance over time"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">
              Performance Over Time
            </h2>
            <p className="text-xs text-muted-foreground">
              All times America/Chicago
            </p>
          </div>
          <PivotTable periods={pivotPeriods} values={pivotValues} />
        </section>

        <section aria-label="Trends" className="flex flex-col gap-3">
          <h2 className="text-lg font-medium tracking-tight">Trends</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">
                  Daily Spend vs Revenue
                </h3>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {last30Range.startStr} → {last30Range.endStr}
                </span>
              </div>
              <DailyTrendChart data={trend} />
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">Funnel: Current Period</h3>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {period.current.startStr} → {period.current.endStr}
                </span>
              </div>
              <FunnelChart metrics={funnel} />
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-medium">Cancellation Rate Trend</h3>
                <span className="text-[11px] text-muted-foreground">
                  Current vs previous
                </span>
              </div>
              <CancellationRateChart
                weekly={splitWeekly}
                monthly={splitMonthly}
              />
            </div>
          </div>
        </section>

        <section
          aria-label="Performance by campaign"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">
              Performance by Campaign
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {period.current.startStr} → {period.current.endStr} ·{" "}
              {campaigns.length}{" "}
              {campaigns.length === 1 ? "campaign" : "campaigns"}
            </p>
          </div>
          <CampaignPerformanceTable rows={campaigns} />
        </section>

        <section aria-label="Performance by ad" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">
              Performance by Ad
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {period.current.startStr} → {period.current.endStr} · {ads.length}{" "}
              {ads.length === 1 ? "ad" : "ads"}
            </p>
          </div>
          <AdPerformanceTable rows={ads} />
        </section>

        <section
          aria-label="Geographic performance"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">
              Geographic Performance
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {period.current.startStr} → {period.current.endStr} · {zipRows.length}{" "}
              {zipRows.length === 1 ? "ZIP" : "ZIPs"}
            </p>
          </div>
          <GeographicMap rows={zipRows} />
        </section>

        <section
          aria-label="Creative performance"
          className="flex flex-col gap-3"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium tracking-tight">
              Creative Performance
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {period.current.startStr} → {period.current.endStr}
            </p>
          </div>
          <CreativePerformanceGrid ads={ads} sevenDay={sevenDayRecord} />
        </section>
      </div>
    </main>
  );
}
