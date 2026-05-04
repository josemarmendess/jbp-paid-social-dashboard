import { TopHeader } from "@/components/TopHeader";
import { PerformanceTabs } from "@/components/PerformanceTabs";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import {
  aggregateByAd,
  aggregateByAdset,
  aggregateByBusinessUnit,
  aggregateByCampaign,
  buildAdSevenDaySpend,
  listBusinessUnits,
} from "@/lib/aggregate";
import { rollingDaysList } from "@/lib/periods";
import { parseBuList, parseView } from "@/lib/buFilter";
import type {
  MetaAdCreativeRow,
  PaidSocialPayload,
} from "@/lib/types";

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

function formatLastUpdated(generatedAt: string): string {
  try {
    return `Updated ${chicagoFormatter.format(new Date(generatedAt))} CT`;
  } catch {
    return generatedAt;
  }
}

export default async function PerformancePage({ searchParams }: PageProps) {
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
  const lastUpdated = formatLastUpdated(data.generated_at);

  const allAds = aggregateByAd(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
  );
  const ads =
    bu.length === 0
      ? allAds
      : allAds.filter((a) =>
          bu.some((b) => b.toLowerCase() === a.businessUnit.toLowerCase()),
        );

  const campaigns = aggregateByCampaign(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );
  const adsets = aggregateByAdset(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );
  const businessUnitRows = aggregateByBusinessUnit(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    bu,
  );

  // 7-day daily spend per ad → side panel sparkline + creative modal.
  const sevenDayDates = rollingDaysList(7);
  const sevenDayMap = buildAdSevenDaySpend(data.meta_insights, sevenDayDates);
  const sevenDayByAd: Record<string, number[]> = {};
  for (const [k, v] of sevenDayMap) sevenDayByAd[k] = v;

  // Build creative lookup. Falls back to {} if the API hasn't started
  // returning meta_ad_creatives — the UI handles that gracefully.
  const creativeByAd: Record<string, MetaAdCreativeRow> = {};
  for (const c of data.meta_ad_creatives ?? []) {
    if (!c?.ad_name) continue;
    creativeByAd[c.ad_name] = c;
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopHeader
        breadcrumb="Dashboard / Performance"
        pageTitle="Performance"
        lastUpdated={lastUpdated}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
        businessUnits={businessUnits}
        bu={bu}
        view={view}
        showViewToggle={false}
      />

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {period.label} · {period.current.startStr} → {period.current.endStr}
            </span>
            <span className="text-[12px] text-[color:var(--color-text-secondary)]">
              Click a row for details · click an ad thumbnail for the creative
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
            America/Chicago
          </span>
        </div>

        <PerformanceTabs
          ads={ads}
          campaigns={campaigns}
          adsets={adsets}
          businessUnits={businessUnitRows}
          sevenDayByAd={sevenDayByAd}
          creativeByAd={creativeByAd}
        />
      </div>
    </main>
  );
}
