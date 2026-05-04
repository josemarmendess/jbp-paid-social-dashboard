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
import { formatCurrency, formatInt } from "@/lib/format";
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
function formatLastUpdated(s: string) {
  try {
    return `Updated ${chicagoFormatter.format(new Date(s))} CT`;
  } catch {
    return s;
  }
}

const STALE_DAYS = 14;

export default async function PipelinePage({ searchParams }: PageProps) {
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

  const lastMonth = getLastMonthRange();
  const pipeline = computePipelineMetrics(
    data.servicetitan_social_leads,
    bu,
    lastMonth,
  );

  const stale = getStaleBookings(
    data.servicetitan_social_leads,
    bu,
    STALE_DAYS,
    chicagoTodayStr(),
  );

  // Trend series (16 weekly buckets / 12 monthly buckets, split current vs previous half)
  const cancelWeekly = cancellationRateSeries(data.servicetitan_social_leads, bu, "week", 16);
  const cancelMonthly = cancellationRateSeries(data.servicetitan_social_leads, bu, "month", 12);
  const splitCancelW = {
    previous: cancelWeekly.slice(0, Math.max(0, cancelWeekly.length - 8)),
    current: cancelWeekly.slice(-8),
  };
  const splitCancelM = {
    previous: cancelMonthly.slice(0, Math.max(0, cancelMonthly.length - 6)),
    current: cancelMonthly.slice(-6),
  };
  const showWeekly = showRateSeries(data.servicetitan_social_leads, bu, "week", 16);
  const showMonthly = showRateSeries(data.servicetitan_social_leads, bu, "month", 12);
  const splitShowW = {
    previous: showWeekly.slice(0, Math.max(0, showWeekly.length - 8)),
    current: showWeekly.slice(-8),
  };
  const splitShowM = {
    previous: showMonthly.slice(0, Math.max(0, showMonthly.length - 6)),
    current: showMonthly.slice(-6),
  };

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Pipeline"
        pageTitle="Pipeline"
        lastUpdated={formatLastUpdated(data.generated_at)}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
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

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineKpiCard
            label="Carryover Pipeline"
            value={formatInt(pipeline.carryover)}
            subtitle={`Last month leads still pending (${lastMonth.startStr} → ${lastMonth.endStr})`}
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
          <PipelineKpiCard
            label="Pipeline Value"
            value={formatCurrency(pipeline.pendingValue)}
            subtitle={`${formatInt(pipeline.totalPipelineCount)} pending × avg sale value`}
            badge={{ tone: "neutral", text: "Estimate" }}
          />
        </section>

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

        {/* Trend rows */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                Cancellation Rate Trend
              </h3>
              <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                Current vs previous
              </span>
            </div>
            <CancellationRateChart weekly={splitCancelW} monthly={splitCancelM} />
          </div>
          <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                Show Rate Trend
              </h3>
              <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                Current vs previous
              </span>
            </div>
            <CancellationRateChart weekly={splitShowW} monthly={splitShowM} />
          </div>
        </section>
      </div>
    </main>
  );
}
