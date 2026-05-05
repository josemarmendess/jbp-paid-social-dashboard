import { TopHeader } from "@/components/TopHeader";
import { HistoryView } from "@/components/HistoryView";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import { listBusinessUnits, monthlyKpiSeries } from "@/lib/aggregate";
import {
  getServiceSlices,
  parseBuList,
  parseView,
} from "@/lib/buFilter";
import type { PaidSocialPayload } from "@/lib/types";

export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    view?: string;
    months?: string;
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

export default async function HistoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const preset = parsePreset(sp.range);
  const period = getPeriod(preset, sp.start, sp.end);
  const view = parseView(sp.view);
  const monthsBack = Math.max(3, Math.min(36, Number(sp.months) || 12));

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
  const sliceData = slices.map((slice) => ({
    label: slice.label,
    key: slice.key,
    rows: monthlyKpiSeries(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      slice.bu,
      monthsBack,
    ),
  }));

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / History"
        pageTitle="History"
        lastUpdated={formatLastUpdated(data.generated_at)}
        generatedAt={data.generated_at}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
      />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            Last {monthsBack} months · click chips below to toggle metrics
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>
        <HistoryView slices={sliceData} split={view === "split"} />
        <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
          Window length is configurable via URL:{" "}
          <code className="rounded bg-[color:var(--color-surface-hover)] px-1 py-0.5 font-mono">
            ?months=24
          </code>{" "}
          (3-36).
        </p>
      </div>
    </main>
  );
}
