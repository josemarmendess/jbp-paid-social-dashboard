import type {
  AggregatedAd,
  Audience,
  DateRange,
  KpiTotals,
  KpiWithDelta,
  MetaInsightRow,
  ServiceTitanRow,
} from "./types";

/**
 * Business rule: an ad is retargeting if its campaign name includes
 * "RETARGETING" or its ad name contains a "RET" token (e.g. "AD01 - IMG - RET - ...").
 * The user has confirmed every retargeting ad is for the Sewer service.
 */
export function detectAudience(
  campaignName: string,
  adName: string,
): Audience {
  const camp = (campaignName ?? "").toUpperCase();
  if (camp.includes("RETARGETING")) return "Retargeting";
  if (/\bRET\b/.test((adName ?? "").toUpperCase())) return "Retargeting";
  return "Prospecting";
}

function inRange(dateStr: string, range: DateRange): boolean {
  if (!dateStr) return false;
  return dateStr >= range.startStr && dateStr <= range.endStr;
}

export function computeKpis(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
): KpiTotals {
  let spend = 0;
  let leads = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    spend += Number(r.spend) || 0;
    leads += Number(r.results) || 0;
  }
  // Cohort attribution: jobs are attributed to the period when the lead was
  // CREATED (Creation Date), not when it eventually sold (Sold On). Matches
  // José's reference report and is the correct model for paid-media ROAS —
  // otherwise May spend would generate revenue attribution for leads booked
  // in February. Both Booked Jobs and Sales use Creation Date now.
  let bookedJobs = 0;
  let sales = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    bookedJobs += 1;
    sales += Number(r["Sales"]) || 0;
  }
  const roas = spend > 0 ? sales / spend : 0;
  const spendOnSales = sales > 0 ? spend / sales : 0;
  return { spend, leads, bookedJobs, sales, roas, spendOnSales };
}

export function computeKpiPair(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  current: DateRange,
  previous: DateRange,
): KpiWithDelta {
  return {
    current: computeKpis(meta, st, current),
    previous: computeKpis(meta, st, previous),
  };
}

/**
 * Build a map of ad_name → most-common Business Unit, scanning ALL ServiceTitan
 * rows (not just the selected period) so an ad's service category stays stable
 * even when the period has zero matched ST rows.
 */
function buildBusinessUnitMap(st: ServiceTitanRow[]): Map<string, string> {
  const counts = new Map<string, Map<string, number>>();
  for (const row of st) {
    const adName = row["UM Content"];
    const bu = row["Business Unit"];
    if (!adName || !bu) continue;
    let inner = counts.get(adName);
    if (!inner) {
      inner = new Map();
      counts.set(adName, inner);
    }
    inner.set(bu, (inner.get(bu) ?? 0) + 1);
  }
  const result = new Map<string, string>();
  for (const [adName, inner] of counts) {
    let bestBu = "";
    let bestCount = -1;
    for (const [bu, c] of inner) {
      if (c > bestCount) {
        bestCount = c;
        bestBu = bu;
      }
    }
    result.set(adName, bestBu);
  }
  return result;
}

export function aggregateByAd(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
): AggregatedAd[] {
  const buMap = buildBusinessUnitMap(st);
  const byAd = new Map<string, AggregatedAd>();
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    const key = r.ad_name || "(unnamed)";
    let agg = byAd.get(key);
    if (!agg) {
      const audience = detectAudience(r.campaign_name, r.ad_name);
      const businessUnit =
        audience === "Retargeting" ? "Sewer" : (buMap.get(key) ?? "");
      agg = {
        adName: key,
        campaignName: r.campaign_name,
        adsetName: r.adset_name,
        audience,
        businessUnit,
        spend: 0,
        impressions: 0,
        linkClicks: 0,
        leads: 0,
        bookedJobs: 0,
        sales: 0,
      };
      byAd.set(key, agg);
    } else {
      if (!agg.campaignName && r.campaign_name) {
        agg.campaignName = r.campaign_name;
      }
      if (!agg.adsetName && r.adset_name) {
        agg.adsetName = r.adset_name;
      }
    }
    agg.spend += Number(r.spend) || 0;
    agg.impressions += Number(r.impressions) || 0;
    agg.linkClicks += Number(r.link_clicks) || 0;
    agg.leads += Number(r.results) || 0;
  }

  // Cohort attribution per ad: both Booked Jobs and Sales are attributed to
  // the ad whose period contains the job's Creation Date. Matches José's
  // reference report.
  for (const row of st) {
    const key = row["UM Content"];
    if (!key) continue;
    if (!inRange(row["Creation Date"], range)) continue;
    const agg = byAd.get(key);
    if (!agg) continue;
    agg.bookedJobs += 1;
    agg.sales += Number(row["Sales"]) || 0;
  }

  return Array.from(byAd.values()).sort((a, b) => b.sales - a.sales);
}
