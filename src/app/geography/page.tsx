import { TopHeader } from "@/components/TopHeader";
import { GeographicMap } from "@/components/GeographicMap";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import { aggregateByZip, listBusinessUnits } from "@/lib/aggregate";
import {
  getServiceSlices,
  parseBuList,
  parseView,
} from "@/lib/buFilter";
import type { PaidSocialPayload } from "@/lib/types";

export const revalidate = 1800;

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

export default async function GeographyPage({ searchParams }: PageProps) {
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

  const sliceData = slices.map((slice) => ({
    slice,
    rows: aggregateByZip(
      data!.meta_insights,
      data!.servicetitan_social_leads,
      period.current,
      slice.bu,
    ),
  }));

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Geography"
        pageTitle="Geography"
        lastUpdated={formatLastUpdated(data.generated_at)}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
      />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            {period.label} · {period.current.startStr} → {period.current.endStr}{" "}
            · click any marker / row to focus
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        {sliceData.map(({ slice, rows }) => (
          <section key={`geo-${slice.key}`} className="flex flex-col gap-3">
            {slices.length > 1 ? (
              <div className="flex items-center gap-3">
                <span
                  className="font-display text-[color:var(--color-text-primary)]"
                  style={{ fontSize: 15, letterSpacing: "0.06em" }}
                >
                  {slice.label}
                </span>
                <span className="h-[1px] flex-1 bg-[color:var(--color-border-subtle)]" />
                <span className="text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
                  {rows.length} ZIP{rows.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}
            <GeographicMap rows={rows} />
          </section>
        ))}
      </div>
    </main>
  );
}
