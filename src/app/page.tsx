import { ErrorBanner } from "@/components/ErrorBanner";
import { OverviewClient } from "@/components/OverviewClient";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { listBusinessUnits } from "@/lib/aggregate";
import { parsePreset } from "@/lib/dateRange";
import { parseBuList, parseView } from "@/lib/buFilter";
import { parseGoalTargets } from "@/lib/goals";
import {
  parsePivotColKeys,
  parsePivotRowKeys,
} from "@/lib/pivotConfig";
import { getPivotPeriods } from "@/lib/periods";
import type { PaidSocialPayload } from "@/lib/types";

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

/**
 * Overview is a thin server shell now: fetch the payload once (the fetch is
 * cached via "use cache" + Vercel Data Cache) and parse the URL into seed
 * state. From there OverviewClient takes over — every filter change is a
 * pure React re-render against in-memory data, no server round-trip.
 *
 * Other pages still use the URL-driven pattern; they didn't move to client
 * filtering yet because the bottleneck pain was concentrated here.
 */
export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;

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
  const pivotPeriods = getPivotPeriods();

  const initialState = {
    preset: parsePreset(sp.range),
    customStart: sp.start,
    customEnd: sp.end,
    bu: parseBuList(sp.bu, businessUnits),
    view: parseView(sp.view),
    pivotRowKeys: parsePivotRowKeys(sp.pivotRows),
    pivotColKeys: parsePivotColKeys(
      sp.pivotCols,
      pivotPeriods.map((p) => p.key),
    ),
    targets: parseGoalTargets(sp),
  };

  return (
    <OverviewClient
      data={data}
      businessUnits={businessUnits}
      initialState={initialState}
    />
  );
}
