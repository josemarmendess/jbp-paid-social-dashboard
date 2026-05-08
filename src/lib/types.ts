export interface MetaInsightRow {
  date: string;
  account_id: number | string;
  account_name: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  spend: number;
  impressions: number;
  frequency: number;
  link_clicks: number;
  inline_link_click_ctr: number;
  cost_per_inline_link_click: number;
  cpm: number;
  results: number;
  cost_per_result: number;
  last_updated_at: string;
}

export interface ServiceTitanRow {
  "Job Number": number | string;
  "Creation Date": string;
  "Campaign Name": string;
  "Campaign Category": string;
  "Campaign Definition": string;
  "Booking Method": string;
  "Job Status": string;
  "Booked By": string;
  "Zip Code": number | string;
  "Sales": number;
  "Revenue": number;
  "Business Unit": string;
  "UM Content": string;
  "Sold On": string;
  "Completed On": string;
  [key: string]: unknown;
}

/**
 * Phase B addition (optional, may not be in payload yet). Joined to ads
 * by ad_name for thumbnails / modal previews. When absent, the dashboard
 * falls back to a cream gradient + mascot tile.
 */
export interface MetaAdCreativeRow {
  ad_name?: string;
  ad_id?: string | number;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  body?: string;
  title?: string;
  status?: string;
  permalink_url?: string;
  [key: string]: unknown;
}

export interface PaidSocialPayload {
  generated_at: string;
  meta_account_id: number | string;
  meta_insights: MetaInsightRow[];
  servicetitan_social_leads: ServiceTitanRow[];
  meta_ad_creatives?: MetaAdCreativeRow[];
}

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_month"
  | "last_month"
  | "last_3"
  | "last_7"
  | "last_14"
  | "last_30"
  | "last_60"
  | "last_90"
  | "custom";

export interface DateRange {
  startStr: string;
  endStr: string;
}

export interface PeriodPair {
  current: DateRange;
  previous: DateRange;
  label: string;
  previousLabel: string;
}

export interface KpiTotals {
  spend: number;
  leads: number;
  bookedJobs: number;
  sales: number;
  roas: number;
  /** spend / sales — target <0.20 (i.e. ROAS >= 5x). 0 when sales == 0. */
  spendOnSales: number;
}

export interface KpiWithDelta {
  current: KpiTotals;
  previous: KpiTotals;
}

export type Audience = "Retargeting" | "Prospecting";

export interface AggregatedAd {
  adName: string;
  campaignName: string;
  adsetName: string;
  audience: Audience;
  /** Canonical service taxonomy: only "Bathrooms" or "Sewers". Anything not
   * explicitly Bathrooms (Plumbing, Mitigation, Sewer, empty, ...) collapses
   * to Sewers. Retargeting ads are always tagged Sewers per business rule.
   * See lib/serviceTaxonomy.ts. */
  businessUnit: "Bathrooms" | "Sewers";
  spend: number;
  impressions: number;
  linkClicks: number;
  leads: number;
  bookedJobs: number;
  sales: number;
}
