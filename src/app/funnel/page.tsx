import { TopHeader } from "@/components/TopHeader";
import { BigFunnelChart } from "@/components/BigFunnelChart";
import { StepConversionChart } from "@/components/StepConversionChart";
import { FunnelInsights } from "@/components/FunnelInsights";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import {
  computeFunnel,
  dailyFunnelRates,
  listBusinessUnits,
} from "@/lib/aggregate";
import { rollingDaysList } from "@/lib/periods";
import {
  getServiceSlices,
  parseBuList,
  parseView,
} from "@/lib/buFilter";
import type { PaidSocialPayload } from "@/lib/types";

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

export default async function FunnelPage({ searchParams }: PageProps) {
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
  const ratesDates = rollingDaysList(30);

  const sliceData = slices.map((slice) => ({
    slice,
    current: computeFunnel(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.current,
      slice.bu,
    ),
    previous: computeFunnel(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.previous,
      slice.bu,
    ),
    rates: dailyFunnelRates(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      ratesDates,
      slice.bu,
    ),
  }));

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Funnel"
        pageTitle="Funnel"
        lastUpdated={formatLastUpdated(data.generated_at)}
        generatedAt={data.generated_at}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
      />
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            {period.label} · {period.current.startStr} → {period.current.endStr}
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {/* Conversion funnel — side-by-side per service when split. */}
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
              slices.length > 1
                ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                : ""
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

        {/* Step conversions — same per-slice rule. */}
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
              slices.length > 1
                ? "grid grid-cols-1 gap-4 lg:grid-cols-2"
                : ""
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

        {/* Insights — one row per slice. */}
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
