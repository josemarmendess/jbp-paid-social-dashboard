import { TopHeader } from "@/components/TopHeader";
import { PipelineKpiCard } from "@/components/PipelineKpiCard";
import { StaleBookingsTable } from "@/components/StaleBookingsTable";
import { CancellationRateChart } from "@/components/CancellationRateChart";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import {
  cancellationRateSeries,
  computePipelineMetrics,
  getStaleBookings,
  listBusinessUnits,
  showRateSeries,
} from "@/lib/aggregate";
import { chicagoTodayStr } from "@/lib/dateRange";
import { getLastMonthRange } from "@/lib/periods";
import {
  getServiceSlices,
  parseBuList,
  parseView,
} from "@/lib/buFilter";
import { formatInt } from "@/lib/format";
import type { PaidSocialPayload } from "@/lib/types";

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    view?: string;
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
function formatLastUpdated(s: string) {
  try {
    return `Updated ${chicagoFormatter.format(new Date(s))} CT`;
  } catch {
    return s;
  }
}

const STALE_DAYS = 14;

export default async function PipelinePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const preset = parsePreset(sp.range);
  const period = getPeriod(preset, sp.start, sp.end);
  const view = parseView(sp.view);

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
  const slices = getServiceSlices(bu, view);

  const lastMonth = getLastMonthRange();

  // Stale bookings list ignores the view toggle — it's an actionable list,
  // and surfacing the same stale jobs twice (once per service) would only
  // add noise. We use the union BU filter so it still respects an active
  // multi-select.
  const stale = getStaleBookings(
    data.servicetitan_social_leads,
    bu,
    STALE_DAYS,
    chicagoTodayStr(),
  );

  const sliceData = slices.map((slice) => ({
    slice,
    pipeline: computePipelineMetrics(
      data!.servicetitan_social_leads,
      slice.bu,
      lastMonth,
    ),
    cancelWeekly: cancellationRateSeries(
      data!.servicetitan_social_leads,
      slice.bu,
      "week",
      52,
    ),
    cancelMonthly: cancellationRateSeries(
      data!.servicetitan_social_leads,
      slice.bu,
      "month",
      48,
    ),
    showWeekly: showRateSeries(
      data!.servicetitan_social_leads,
      slice.bu,
      "week",
      52,
    ),
    showMonthly: showRateSeries(
      data!.servicetitan_social_leads,
      slice.bu,
      "month",
      48,
    ),
  }));

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Pipeline"
        pageTitle="Pipeline"
        lastUpdated={formatLastUpdated(data.generated_at)}
        generatedAt={data.generated_at}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
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

        {/* KPI row — duplicated per slice when split. */}
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

        {/* Stale bookings */}
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

        {/* Trend rows — also per slice. */}
        {sliceData.map(
          ({ slice, cancelWeekly, cancelMonthly, showWeekly, showMonthly }) => (
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
