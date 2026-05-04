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

export default async function FunnelPage({ searchParams }: PageProps) {
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

  const current = computeFunnel(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );
  const previous = computeFunnel(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.previous,
    bu,
  );
  const ratesDates = rollingDaysList(30);
  const rates = dailyFunnelRates(
    data.meta_insights,
    data.servicetitan_social_leads,
    ratesDates,
    bu,
  );

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Funnel"
        pageTitle="Funnel"
        lastUpdated={formatLastUpdated(data.generated_at)}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
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

        <section className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-5">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Conversion Funnel
          </h2>
          <p className="mt-1 text-[12px] text-[color:var(--color-text-secondary)]">
            Five-stage progression from impression to sold job. Compare against {period.previousLabel.replace("vs. ", "")}.
          </p>
          <div className="mt-4">
            <BigFunnelChart
              current={current}
              previous={previous}
              currentLabel={period.label}
              previousLabel={period.previousLabel.replace("vs. ", "Previous: ")}
            />
          </div>
        </section>

        <section className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-5">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Step Conversions · Last 30 Days
          </h2>
          <p className="mt-1 text-[12px] text-[color:var(--color-text-secondary)]">
            Toggle each rate to focus the chart. Daily values, not smoothed.
          </p>
          <div className="mt-4">
            <StepConversionChart series={rates} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2
            className="font-display text-[color:var(--color-text-primary)]"
            style={{ fontSize: 16, letterSpacing: "0.06em" }}
          >
            Insights
          </h2>
          <FunnelInsights current={current} previous={previous} rates={rates} />
        </section>
      </div>
    </main>
  );
}
