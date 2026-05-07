import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  cancellationRateSeries,
  computeFunnel,
  computeOverviewKpis,
  computePivotMetrics,
  dailyKpiSeries,
  dailySpendVsRevenue,
  type BusinessUnit,
  type CancellationPoint,
  type DailyKpiPoint,
  type DailySeriesPoint,
  type FunnelMetrics,
  type OverviewKpiTotals,
  type PivotMetrics,
} from "./aggregate";
import { fetchPaidSocialData } from "./fetchData";
import type { DateRange } from "./types";

/**
 * Cached wrappers around the heavy aggregation functions.
 *
 * Why this file exists: the raw aggregations in aggregate.ts walk the full
 * meta_insights + servicetitan_social_leads arrays on every call. Wrapping
 * them with "use cache" makes identical (range/dates × bu) calls collapse to
 * an instant cache hit across requests, not just within a single render.
 *
 * Cache key strategy: the wrappers take only primitive/serializable inputs
 * (DateRange, string[], BusinessUnit). The 5+ MB payload is NOT in the key —
 * we re-fetch it inside (which is itself a cached call, so usually free) and
 * pass the inner arrays to the raw aggregator.
 *
 * Tag: every entry is tagged "paid-social", the same tag fetchPaidSocialData
 * uses, so the Refresh button (updateTag in actions.ts) invalidates the data
 * fetch and all derived aggregations in one shot.
 *
 * cacheLife: 30-minute revalidate / 1-hour expire matches the upstream fetch
 * window. The minutes profile would be too aggressive (1-min revalidate);
 * inline config keeps both layers in sync.
 */

const CACHE_LIFE = { revalidate: 1800, expire: 3600 } as const;
const TAG = "paid-social";

export async function cachedOverviewKpis(
  range: DateRange,
  bu: BusinessUnit,
): Promise<OverviewKpiTotals> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return computeOverviewKpis(
    data.meta_insights,
    data.servicetitan_social_leads,
    range,
    bu,
  );
}

export async function cachedDailyKpiSeries(
  dates: string[],
  bu: BusinessUnit,
): Promise<DailyKpiPoint[]> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return dailyKpiSeries(
    data.meta_insights,
    data.servicetitan_social_leads,
    dates,
    bu,
  );
}

export async function cachedPivotMetrics(
  range: DateRange,
  bu: BusinessUnit,
): Promise<PivotMetrics> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return computePivotMetrics(
    data.meta_insights,
    data.servicetitan_social_leads,
    range,
    bu,
  );
}

export async function cachedDailySpendVsRevenue(
  dates: string[],
  bu: BusinessUnit,
): Promise<DailySeriesPoint[]> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return dailySpendVsRevenue(
    data.meta_insights,
    data.servicetitan_social_leads,
    dates,
    bu,
  );
}

export async function cachedFunnel(
  range: DateRange,
  bu: BusinessUnit,
): Promise<FunnelMetrics> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return computeFunnel(
    data.meta_insights,
    data.servicetitan_social_leads,
    range,
    bu,
  );
}

export async function cachedCancellationSeries(
  bu: BusinessUnit,
  granularity: "week" | "month",
  buckets: number,
): Promise<CancellationPoint[]> {
  "use cache";
  cacheLife(CACHE_LIFE);
  cacheTag(TAG);
  const data = await fetchPaidSocialData();
  return cancellationRateSeries(
    data.servicetitan_social_leads,
    bu,
    granularity,
    buckets,
  );
}
