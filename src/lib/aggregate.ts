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
 * "All" lets the caller skip ServiceTitan business-unit filtering. Any other
 * string is matched case-insensitively against ST's `Business Unit` column.
 * Meta rows are NEVER filtered by BU — Meta data has no BU tagging.
 */
export type BusinessUnit = "All" | string;

function buMatches(row: ServiceTitanRow, bu: BusinessUnit): boolean {
  if (!bu || bu === "All") return true;
  const v = String(row["Business Unit"] ?? "").toLowerCase();
  return v === bu.toLowerCase();
}

/** Distinct, sorted Business Unit values found in ST data (excluding empties). */
export function listBusinessUnits(st: ServiceTitanRow[]): string[] {
  const set = new Set<string>();
  for (const r of st) {
    const v = String(r["Business Unit"] ?? "").trim();
    if (v) set.add(v);
  }
  return Array.from(set).sort();
}

function isCancelled(status: unknown): boolean {
  return String(status ?? "")
    .toLowerCase()
    .includes("cancel");
}

const FINAL_STATUSES = new Set(["completed", "canceled", "cancelled", "sold"]);

function isPendingPipeline(status: unknown): boolean {
  const s = String(status ?? "")
    .toLowerCase()
    .trim();
  if (!s) return false;
  return !FINAL_STATUSES.has(s);
}

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

/* ---------- v2 additions: BU-filtered metrics, pivot rows, charts ---------- */

/**
 * KPI totals with a Business Unit filter applied to ServiceTitan-derived
 * fields only. Spend/leads come from Meta (untagged), so they are never
 * filtered. Used by the BU-aware top KPI cards.
 */
export function computeKpisFiltered(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): KpiTotals {
  let spend = 0;
  let leads = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    spend += Number(r.spend) || 0;
    leads += Number(r.results) || 0;
  }
  let bookedJobs = 0;
  let sales = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    bookedJobs += 1;
    sales += Number(r["Sales"]) || 0;
  }
  const roas = spend > 0 ? sales / spend : 0;
  const spendOnSales = sales > 0 ? spend / sales : 0;
  return { spend, leads, bookedJobs, sales, roas, spendOnSales };
}

export function computeKpiPairFiltered(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  current: DateRange,
  previous: DateRange,
  bu: BusinessUnit,
): KpiWithDelta {
  return {
    current: computeKpisFiltered(meta, st, current, bu),
    previous: computeKpisFiltered(meta, st, previous, bu),
  };
}

export interface PivotMetrics {
  spend: number;
  leads: number;
  costPerLead: number | null;
  bookedJobs: number;
  costPerBookedJob: number | null;
  revenue: number;
  spendOnRevenue: number | null; // percentage 0-100, null when revenue == 0
  averageSaleValue: number | null;
  cancellationRate: number | null; // percentage 0-100
}

/**
 * One row of pivot-table numbers for a given period and BU. All field nullity
 * follows the spec: any divisor of zero produces null so the UI can render
 * "n/a" in zinc-400.
 */
export function computePivotMetrics(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): PivotMetrics {
  let spend = 0;
  let leads = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    spend += Number(r.spend) || 0;
    leads += Number(r.results) || 0;
  }
  let bookedJobs = 0;
  // We use the ServiceTitan "Sales" column as the canonical revenue figure
  // because that's what the Overview KPIs surface as "Sales Revenue". Using
  // the "Revenue" column here would split the dashboard's source of truth.
  let salesTotal = 0;
  let soldCount = 0;
  let soldSalesOnly = 0;
  let cancelledCount = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    bookedJobs += 1;
    const sale = Number(r["Sales"]) || 0;
    salesTotal += sale;
    if (sale > 0) {
      soldCount += 1;
      soldSalesOnly += sale;
    }
    if (isCancelled(r["Job Status"])) cancelledCount += 1;
  }
  return {
    spend,
    leads,
    costPerLead: leads > 0 ? spend / leads : null,
    bookedJobs,
    costPerBookedJob: bookedJobs > 0 ? spend / bookedJobs : null,
    revenue: salesTotal,
    spendOnRevenue: salesTotal > 0 ? (spend / salesTotal) * 100 : null,
    averageSaleValue: soldCount > 0 ? soldSalesOnly / soldCount : null,
    cancellationRate:
      bookedJobs > 0 ? (cancelledCount / bookedJobs) * 100 : null,
  };
}

/**
 * Carryover Pipeline = ST rows whose Creation Date sits in the supplied range
 * AND whose Job Status is non-final (not Completed/Canceled/Sold). Captures
 * leads generated last month that are still open in the current month.
 */
export function computeCarryoverPipeline(
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): number {
  let n = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    if (!isPendingPipeline(r["Job Status"])) continue;
    n += 1;
  }
  return n;
}

export interface DailySeriesPoint {
  date: string;
  spend: number;
  revenue: number;
}

/**
 * Per-day spend (Meta) and revenue (ST, by Creation Date) for the given list
 * of YYYY-MM-DD dates. Missing days return 0 so the chart x-axis stays dense.
 */
export function dailySpendVsRevenue(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  dates: string[],
  bu: BusinessUnit,
): DailySeriesPoint[] {
  const idx = new Map<string, DailySeriesPoint>();
  for (const d of dates) idx.set(d, { date: d, spend: 0, revenue: 0 });
  for (const r of meta) {
    const p = idx.get(r.date);
    if (!p) continue;
    p.spend += Number(r.spend) || 0;
  }
  for (const r of st) {
    const p = idx.get(String(r["Creation Date"] ?? ""));
    if (!p) continue;
    if (!buMatches(r, bu)) continue;
    p.revenue += Number(r["Revenue"]) || 0;
  }
  return dates.map((d) => idx.get(d)!);
}

export interface FunnelMetrics {
  impressions: number;
  linkClicks: number;
  leads: number;
  bookedJobs: number;
  soldJobs: number;
}

export function computeFunnel(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): FunnelMetrics {
  let impressions = 0;
  let linkClicks = 0;
  let leads = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    impressions += Number(r.impressions) || 0;
    linkClicks += Number(r.link_clicks) || 0;
    leads += Number(r.results) || 0;
  }
  let bookedJobs = 0;
  let soldJobs = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    bookedJobs += 1;
    if ((Number(r["Sales"]) || 0) > 0) soldJobs += 1;
  }
  return { impressions, linkClicks, leads, bookedJobs, soldJobs };
}

export interface CancellationPoint {
  bucket: string; // "2026-W18" or "2026-04"
  rate: number | null; // 0-100, null when no jobs in bucket
}

function isoWeekKey(d: Date): string {
  // ISO week (Mon-start) — keeps weekly buckets aligned with calendars.
  const target = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
  );
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Cancellation rate by week (last `weeks` ISO weeks ending this week) or by
 * month (last `weeks` calendar months — caller passes weeks=8 for default
 * 8-week view, but the same arg drives monthly granularity in the toggle).
 *
 * For each bucket: cancelled / total of jobs whose Creation Date falls in the
 * bucket. Ranges are derived from the actual ST rows, not a synthetic Chicago
 * "today" — so future-dated rows are simply ignored. Buckets without jobs
 * return rate=null.
 */
export function cancellationRateSeries(
  st: ServiceTitanRow[],
  bu: BusinessUnit,
  granularity: "week" | "month",
  buckets: number,
): CancellationPoint[] {
  const counts = new Map<string, { total: number; cancelled: number }>();
  for (const r of st) {
    if (!buMatches(r, bu)) continue;
    const dStr = String(r["Creation Date"] ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) continue;
    const d = new Date(`${dStr}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const key =
      granularity === "week"
        ? isoWeekKey(d)
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    let c = counts.get(key);
    if (!c) {
      c = { total: 0, cancelled: 0 };
      counts.set(key, c);
    }
    c.total += 1;
    if (isCancelled(r["Job Status"])) c.cancelled += 1;
  }
  const sortedKeys = Array.from(counts.keys()).sort();
  const recent = sortedKeys.slice(-buckets);
  return recent.map((k) => {
    const c = counts.get(k)!;
    return {
      bucket: k,
      rate: c.total > 0 ? (c.cancelled / c.total) * 100 : null,
    };
  });
}

export interface AggregatedCampaign {
  campaignName: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  leads: number;
  bookedJobs: number;
  sales: number;
}

/**
 * Same shape as aggregateByAd but grouped by campaign_name. ServiceTitan
 * attribution joins on r["Campaign Name"] when it matches a Meta campaign;
 * since ST rows track UM Content (ad-level) we can't do a hard join, so
 * bookedJobs and sales here are derived by climbing ad → campaign through
 * the Meta data.
 */
export function aggregateByCampaign(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): AggregatedCampaign[] {
  const ads = aggregateByAd(meta, st, range);
  const adToBu = new Map<string, string>();
  for (const a of ads) adToBu.set(a.adName, a.businessUnit);

  const byCamp = new Map<string, AggregatedCampaign>();
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    const key = r.campaign_name || "(unnamed)";
    let agg = byCamp.get(key);
    if (!agg) {
      agg = {
        campaignName: key,
        spend: 0,
        impressions: 0,
        linkClicks: 0,
        leads: 0,
        bookedJobs: 0,
        sales: 0,
      };
      byCamp.set(key, agg);
    }
    agg.spend += Number(r.spend) || 0;
    agg.impressions += Number(r.impressions) || 0;
    agg.linkClicks += Number(r.link_clicks) || 0;
    agg.leads += Number(r.results) || 0;
  }

  // Build adName -> campaignName from Meta in this period so we can
  // attribute ST rows to a campaign via UM Content.
  const adNameToCampaign = new Map<string, string>();
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    if (!r.ad_name) continue;
    if (!adNameToCampaign.has(r.ad_name)) {
      adNameToCampaign.set(r.ad_name, r.campaign_name || "(unnamed)");
    }
  }
  for (const row of st) {
    if (!inRange(row["Creation Date"], range)) continue;
    if (!buMatches(row, bu)) continue;
    const adName = String(row["UM Content"] ?? "");
    const campaign = adNameToCampaign.get(adName);
    if (!campaign) continue;
    const agg = byCamp.get(campaign);
    if (!agg) continue;
    agg.bookedJobs += 1;
    agg.sales += Number(row["Sales"]) || 0;
  }
  // Filter campaigns that have zero meta spend AND zero booked jobs to keep
  // the table clean (some campaigns are paused but still appear in raw rows).
  return Array.from(byCamp.values())
    .filter((c) => c.spend > 0 || c.bookedJobs > 0 || c.leads > 0)
    .sort((a, b) => b.sales - a.sales);
}

export interface ZipMetrics {
  zip: string;
  leads: number;
  bookedJobs: number;
  sales: number;
  cancelled: number;
  /** Spend allocated to this zip ∝ leads share of period total. */
  allocatedSpend: number;
}

/**
 * ST rows aggregated by Zip Code with Meta spend distributed proportionally
 * to lead share inside the period. Used by the geographic map.
 */
export function aggregateByZip(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): ZipMetrics[] {
  let totalSpend = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    totalSpend += Number(r.spend) || 0;
  }
  const byZip = new Map<string, ZipMetrics>();
  let totalLeadsByZip = 0;
  for (const r of st) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    const zip = String(r["Zip Code"] ?? "").trim();
    if (!zip) continue;
    let z = byZip.get(zip);
    if (!z) {
      z = {
        zip,
        leads: 0,
        bookedJobs: 0,
        sales: 0,
        cancelled: 0,
        allocatedSpend: 0,
      };
      byZip.set(zip, z);
    }
    z.leads += 1;
    z.bookedJobs += 1; // every ST social-leads row is a booked job in this dataset
    z.sales += Number(r["Sales"]) || 0;
    if (isCancelled(r["Job Status"])) z.cancelled += 1;
    totalLeadsByZip += 1;
  }
  if (totalLeadsByZip > 0 && totalSpend > 0) {
    for (const z of byZip.values()) {
      z.allocatedSpend = (z.leads / totalLeadsByZip) * totalSpend;
    }
  }
  return Array.from(byZip.values()).sort((a, b) => b.leads - a.leads);
}

/**
 * Per-day KPI series for the past N days. One row per date, with the raw
 * counts needed to derive every Overview KPI. The page derives ratios on
 * the client to keep this function generic.
 */
export interface DailyKpiPoint {
  date: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  leads: number;
  bookedJobs: number;
  soldJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  revenue: number;
  sales: number;
}

export function dailyKpiSeries(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  dates: string[],
  bu: BusinessUnit,
): DailyKpiPoint[] {
  const idx = new Map<string, DailyKpiPoint>();
  for (const d of dates) {
    idx.set(d, {
      date: d,
      spend: 0,
      impressions: 0,
      linkClicks: 0,
      leads: 0,
      bookedJobs: 0,
      soldJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      revenue: 0,
      sales: 0,
    });
  }
  for (const r of meta) {
    const p = idx.get(r.date);
    if (!p) continue;
    p.spend += Number(r.spend) || 0;
    p.impressions += Number(r.impressions) || 0;
    p.linkClicks += Number(r.link_clicks) || 0;
    p.leads += Number(r.results) || 0;
  }
  for (const r of st) {
    const p = idx.get(String(r["Creation Date"] ?? ""));
    if (!p) continue;
    if (!buMatches(r, bu)) continue;
    p.bookedJobs += 1;
    const sale = Number(r["Sales"]) || 0;
    p.revenue += Number(r["Revenue"]) || 0;
    p.sales += sale;
    if (sale > 0) p.soldJobs += 1;
    const status = String(r["Job Status"] ?? "").toLowerCase();
    if (status.includes("complet")) p.completedJobs += 1;
    if (isCancelled(r["Job Status"])) p.cancelledJobs += 1;
  }
  return dates.map((d) => idx.get(d)!);
}

/**
 * The 12 Overview KPIs in the order the spec lays out: 6 volume metrics
 * then 6 rate metrics. Each metric returns current + previous totals plus a
 * 30-day sparkline series (numeric, undefined slots are 0). Ratio metrics
 * compute totals on summed components, not averages of daily ratios.
 */
export interface OverviewKpiTotals {
  spend: number;
  leads: number;
  bookedJobs: number;
  soldJobs: number;
  sales: number;
  spendOnRevenue: number; // 0-1 (spend/revenue), 0 when no revenue
  ctr: number; // link_clicks / impressions
  leadRate: number; // leads / link_clicks
  bookRate: number; // booked / leads
  showRate: number; // completed / booked
  closeRate: number; // sold / booked
  cancellationRate: number; // cancelled / booked
}

function totalize(rows: ServiceTitanRow[], range: DateRange, bu: BusinessUnit) {
  let booked = 0;
  let sold = 0;
  let completed = 0;
  let cancelled = 0;
  let revenue = 0;
  let sales = 0;
  for (const r of rows) {
    if (!inRange(r["Creation Date"], range)) continue;
    if (!buMatches(r, bu)) continue;
    booked += 1;
    const sale = Number(r["Sales"]) || 0;
    sales += sale;
    revenue += Number(r["Revenue"]) || 0;
    if (sale > 0) sold += 1;
    const status = String(r["Job Status"] ?? "").toLowerCase();
    if (status.includes("complet")) completed += 1;
    if (isCancelled(r["Job Status"])) cancelled += 1;
  }
  return { booked, sold, completed, cancelled, revenue, sales };
}

function metaTotals(rows: MetaInsightRow[], range: DateRange) {
  let spend = 0;
  let leads = 0;
  let impressions = 0;
  let linkClicks = 0;
  for (const r of rows) {
    if (!inRange(r.date, range)) continue;
    spend += Number(r.spend) || 0;
    leads += Number(r.results) || 0;
    impressions += Number(r.impressions) || 0;
    linkClicks += Number(r.link_clicks) || 0;
  }
  return { spend, leads, impressions, linkClicks };
}

export function computeOverviewKpis(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): OverviewKpiTotals {
  const m = metaTotals(meta, range);
  const s = totalize(st, range, bu);
  return {
    spend: m.spend,
    leads: m.leads,
    bookedJobs: s.booked,
    soldJobs: s.sold,
    sales: s.sales,
    // Use Sales (the canonical "Sales Revenue") so this KPI matches the
    // pivot table's Spend on Revenue row.
    spendOnRevenue: s.sales > 0 ? m.spend / s.sales : 0,
    ctr: m.impressions > 0 ? m.linkClicks / m.impressions : 0,
    leadRate: m.linkClicks > 0 ? m.leads / m.linkClicks : 0,
    bookRate: m.leads > 0 ? s.booked / m.leads : 0,
    showRate: s.booked > 0 ? s.completed / s.booked : 0,
    closeRate: s.booked > 0 ? s.sold / s.booked : 0,
    cancellationRate: s.booked > 0 ? s.cancelled / s.booked : 0,
  };
}

/* --------- Phase B: per-adset, per-business-unit, pipeline metrics ---------- */

export interface AggregatedAdset {
  adsetName: string;
  campaignName: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  leads: number;
  bookedJobs: number;
  sales: number;
}

export function aggregateByAdset(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): AggregatedAdset[] {
  const ads = aggregateByAd(meta, st, range);
  // Build adName -> adsetName / campaignName map from this period's Meta rows.
  const adNameToAdset = new Map<string, string>();
  const adNameToCampaign = new Map<string, string>();
  const byAdset = new Map<string, AggregatedAdset>();
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    const key = r.adset_name || "(unnamed)";
    if (r.ad_name) {
      adNameToAdset.set(r.ad_name, key);
      if (!adNameToCampaign.has(r.ad_name)) {
        adNameToCampaign.set(r.ad_name, r.campaign_name || "(unnamed)");
      }
    }
    let agg = byAdset.get(key);
    if (!agg) {
      agg = {
        adsetName: key,
        campaignName: r.campaign_name || "(unnamed)",
        spend: 0,
        impressions: 0,
        linkClicks: 0,
        leads: 0,
        bookedJobs: 0,
        sales: 0,
      };
      byAdset.set(key, agg);
    }
    agg.spend += Number(r.spend) || 0;
    agg.impressions += Number(r.impressions) || 0;
    agg.linkClicks += Number(r.link_clicks) || 0;
    agg.leads += Number(r.results) || 0;
  }
  // Attribute booked / sales via the ad-level aggregate (which already
  // matches via ad_name → UM Content) and roll up to its adset.
  for (const a of ads) {
    if (bu !== "All" && a.businessUnit.toLowerCase() !== bu.toLowerCase()) continue;
    const adset = adNameToAdset.get(a.adName);
    if (!adset) continue;
    const agg = byAdset.get(adset);
    if (!agg) continue;
    agg.bookedJobs += a.bookedJobs;
    agg.sales += a.sales;
  }
  return Array.from(byAdset.values())
    .filter((a) => a.spend > 0 || a.bookedJobs > 0 || a.leads > 0)
    .sort((a, b) => b.sales - a.sales);
}

export interface AggregatedBusinessUnit {
  businessUnit: string;
  spend: number; // pro-rated by ad-level lead share
  leads: number;
  bookedJobs: number;
  sales: number;
}

/**
 * Roll up performance by ServiceTitan Business Unit. Spend (Meta-only) is
 * distributed proportionally across each ad's BU based on ad-level leads —
 * matches how the per-zip aggregation pro-rates spend.
 */
export function aggregateByBusinessUnit(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  range: DateRange,
  bu: BusinessUnit,
): AggregatedBusinessUnit[] {
  const ads = aggregateByAd(meta, st, range);
  const byBu = new Map<string, AggregatedBusinessUnit>();
  let totalSpend = 0;
  for (const r of meta) {
    if (!inRange(r.date, range)) continue;
    totalSpend += Number(r.spend) || 0;
  }
  // Sum leads per ad's BU (use ad-level BU which forces "Sewer" for retargeting).
  let totalLeads = 0;
  for (const a of ads) {
    if (!a.businessUnit) continue;
    if (bu !== "All" && a.businessUnit.toLowerCase() !== bu.toLowerCase()) continue;
    let agg = byBu.get(a.businessUnit);
    if (!agg) {
      agg = { businessUnit: a.businessUnit, spend: 0, leads: 0, bookedJobs: 0, sales: 0 };
      byBu.set(a.businessUnit, agg);
    }
    agg.leads += a.leads;
    agg.bookedJobs += a.bookedJobs;
    agg.sales += a.sales;
    totalLeads += a.leads;
  }
  if (totalLeads > 0 && totalSpend > 0) {
    for (const v of byBu.values()) {
      v.spend = (v.leads / totalLeads) * totalSpend;
    }
  }
  return Array.from(byBu.values()).sort((a, b) => b.sales - a.sales);
}

export interface PipelineMetrics {
  carryover: number;
  pendingValue: number; // average sale value × pending bookings
  avgDaysToClose: number | null; // Creation Date → Sold On
  avgDaysToComplete: number | null; // Sold On → Completed On
  totalPipelineCount: number; // total pending across whole dataset (not just last month)
}

function daysBetween(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b) return null;
  const ma = /^\d{4}-\d{2}-\d{2}$/.exec(String(a));
  const mb = /^\d{4}-\d{2}-\d{2}$/.exec(String(b));
  if (!ma || !mb) return null;
  const da = Date.parse(`${a}T12:00:00Z`);
  const db = Date.parse(`${b}T12:00:00Z`);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.round((db - da) / 86400000);
}

export function computePipelineMetrics(
  st: ServiceTitanRow[],
  bu: BusinessUnit,
  carryoverRange: DateRange,
): PipelineMetrics {
  let carryover = 0;
  let totalPending = 0;
  let soldCount = 0;
  let soldRevenue = 0;
  let daysToCloseSum = 0;
  let daysToCloseN = 0;
  let daysToCompleteSum = 0;
  let daysToCompleteN = 0;

  for (const r of st) {
    if (!buMatches(r, bu)) continue;
    if (isPendingPipeline(r["Job Status"])) {
      totalPending += 1;
      if (inRange(r["Creation Date"], carryoverRange)) carryover += 1;
    }
    const sale = Number(r["Sales"]) || 0;
    if (sale > 0) {
      soldCount += 1;
      soldRevenue += sale;
    }
    const created = String(r["Creation Date"] ?? "");
    const sold = String(r["Sold On"] ?? "");
    const completed = String(r["Completed On"] ?? "");
    const dClose = daysBetween(created, sold);
    if (dClose !== null && dClose >= 0) {
      daysToCloseSum += dClose;
      daysToCloseN += 1;
    }
    const dComp = daysBetween(sold, completed);
    if (dComp !== null && dComp >= 0) {
      daysToCompleteSum += dComp;
      daysToCompleteN += 1;
    }
  }
  const avgSaleValue = soldCount > 0 ? soldRevenue / soldCount : 0;
  return {
    carryover,
    pendingValue: avgSaleValue * totalPending,
    avgDaysToClose: daysToCloseN > 0 ? daysToCloseSum / daysToCloseN : null,
    avgDaysToComplete: daysToCompleteN > 0 ? daysToCompleteSum / daysToCompleteN : null,
    totalPipelineCount: totalPending,
  };
}

export interface StaleBooking {
  jobNumber: string | number;
  creationDate: string;
  campaignName: string;
  businessUnit: string;
  zip: string;
  daysOpen: number;
  status: string;
}

/**
 * Pending jobs (Scheduled / In Progress / open statuses) created more than
 * `thresholdDays` ago. Used by the Pipeline page's stale bookings list.
 */
export function getStaleBookings(
  st: ServiceTitanRow[],
  bu: BusinessUnit,
  thresholdDays: number,
  todayStr: string,
): StaleBooking[] {
  const out: StaleBooking[] = [];
  const today = Date.parse(`${todayStr}T12:00:00Z`);
  for (const r of st) {
    if (!buMatches(r, bu)) continue;
    if (!isPendingPipeline(r["Job Status"])) continue;
    const created = String(r["Creation Date"] ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(created)) continue;
    const c = Date.parse(`${created}T12:00:00Z`);
    if (!Number.isFinite(c)) continue;
    const days = Math.round((today - c) / 86400000);
    if (days < thresholdDays) continue;
    out.push({
      jobNumber: r["Job Number"],
      creationDate: created,
      campaignName: String(r["Campaign Name"] ?? ""),
      businessUnit: String(r["Business Unit"] ?? ""),
      zip: String(r["Zip Code"] ?? ""),
      daysOpen: days,
      status: String(r["Job Status"] ?? ""),
    });
  }
  return out.sort((a, b) => b.daysOpen - a.daysOpen);
}

/**
 * Show-rate buckets (completed / booked) — same shape as cancellationRateSeries.
 * "Show Rate" here is the operations definition: completed jobs / total bookings.
 */
export function showRateSeries(
  st: ServiceTitanRow[],
  bu: BusinessUnit,
  granularity: "week" | "month",
  buckets: number,
): CancellationPoint[] {
  const counts = new Map<string, { total: number; completed: number }>();
  for (const r of st) {
    if (!buMatches(r, bu)) continue;
    const dStr = String(r["Creation Date"] ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) continue;
    const d = new Date(`${dStr}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const key =
      granularity === "week"
        ? isoWeekKey(d)
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    let c = counts.get(key);
    if (!c) {
      c = { total: 0, completed: 0 };
      counts.set(key, c);
    }
    c.total += 1;
    if (String(r["Job Status"] ?? "").toLowerCase().includes("complet")) {
      c.completed += 1;
    }
  }
  const sortedKeys = Array.from(counts.keys()).sort();
  const recent = sortedKeys.slice(-buckets);
  return recent.map((k) => {
    const c = counts.get(k)!;
    return {
      bucket: k,
      rate: c.total > 0 ? (c.completed / c.total) * 100 : null,
    };
  });
}

/* ------------------------- Funnel page: rate series ------------------------- */

export interface FunnelRatesPoint {
  date: string;
  /** All values in 0-1 (ratio). */
  ctr: number;
  leadRate: number;
  bookRate: number;
  closeRate: number;
}

export function dailyFunnelRates(
  meta: MetaInsightRow[],
  st: ServiceTitanRow[],
  dates: string[],
  bu: BusinessUnit,
): FunnelRatesPoint[] {
  const rows = dailyKpiSeries(meta, st, dates, bu);
  const safe = (n: number, d: number) => (d > 0 ? n / d : 0);
  return rows.map((r) => ({
    date: r.date,
    ctr: safe(r.linkClicks, r.impressions),
    leadRate: safe(r.leads, r.linkClicks),
    bookRate: safe(r.bookedJobs, r.leads),
    closeRate: safe(r.soldJobs, r.bookedJobs),
  }));
}

export interface AdSeven {
  adName: string;
  series: number[]; // last 7 days of spend (oldest first)
}

/**
 * Per-ad daily spend for the past 7 days (oldest first). Used by the creative
 * grid mini-charts. Ads not present in the window get a zero series.
 */
export function buildAdSevenDaySpend(
  meta: MetaInsightRow[],
  dates: string[],
): Map<string, number[]> {
  const idx = new Map<string, Map<string, number>>();
  for (const r of meta) {
    if (!dates.includes(r.date)) continue;
    const ad = r.ad_name || "(unnamed)";
    let inner = idx.get(ad);
    if (!inner) {
      inner = new Map();
      idx.set(ad, inner);
    }
    inner.set(r.date, (inner.get(r.date) ?? 0) + (Number(r.spend) || 0));
  }
  const result = new Map<string, number[]>();
  for (const [ad, inner] of idx) {
    result.set(
      ad,
      dates.map((d) => inner.get(d) ?? 0),
    );
  }
  return result;
}
