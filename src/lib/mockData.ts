import type { PaidSocialPayload, MetaInsightRow, ServiceTitanRow } from "./types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const CAMPAIGNS = [
  { name: "BAT | Prospecting | Broad | Meta", bu: "Bathrooms" },
  { name: "BAT | Retargeting | IG Stories | Meta", bu: "Bathrooms" },
  { name: "SEW | Prospecting | Video | Meta", bu: "Sewers" },
  { name: "SEW | Retargeting | Lead Gen | Meta", bu: "Sewers" },
];

const ADSETS = [
  "Lookalike 2% — Customers 180d",
  "Interest — Home Improvement",
  "Retargeting — Video Views 75%",
  "LAL 5% — High Value",
];

const ADS = [
  "BAT_V3_Before-After_Static",
  "BAT_V2_Testimonial_Carousel",
  "SEW_V4_RootIntrusion_Video",
  "SEW_V1_Emergency_Static",
  "BAT_V5_Lifestyle_Reel",
  "SEW_V3_Blockage_Carousel",
];

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function buildMetaRows(): MetaInsightRow[] {
  const rows: MetaInsightRow[] = [];
  const today = new Date();

  for (let day = 89; day >= 0; day--) {
    const d = new Date(today);
    d.setDate(d.getDate() - day);
    const date = d.toISOString().slice(0, 10);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const spendMultiplier = isWeekend ? 0.75 : 1.1;

    for (const campaign of CAMPAIGNS) {
      const adIdx = campaign.bu === "Bathrooms" ? 0 : 2;
      const spend = rnd(180, 420) * spendMultiplier;
      const impressions = Math.round(spend * rnd(180, 260));
      const link_clicks = Math.round(impressions * rnd(0.012, 0.025));
      const results = Math.round(spend / rnd(38, 72));

      rows.push({
        date,
        account_id: 1234567890,
        account_name: "J. Blanton Plumbing",
        campaign_name: campaign.name,
        adset_name: ADSETS[adIdx % ADSETS.length],
        ad_name: ADS[adIdx % ADS.length],
        spend: Math.round(spend * 100) / 100,
        impressions,
        frequency: Math.round(rnd(14, 32)) / 10,
        link_clicks,
        inline_link_click_ctr: Math.round((link_clicks / impressions) * 10000) / 100,
        cost_per_inline_link_click: Math.round((spend / link_clicks) * 100) / 100,
        cpm: Math.round((spend / impressions) * 1000 * 100) / 100,
        results,
        cost_per_result: Math.round((spend / results) * 100) / 100,
        last_updated_at: new Date().toISOString(),
      });
    }
  }
  return rows;
}

const BOOKING_METHODS = ["Phone", "Online", "Phone", "Phone", "Chat"];
const STATUSES = ["Completed", "Completed", "Completed", "Cancelled", "Completed"];
const BOOKED_BY = ["Sarah K.", "Mike T.", "Linda R.", "Tom W."];

function buildSTRows(): ServiceTitanRow[] {
  const rows: ServiceTitanRow[] = [];
  const today = new Date();

  for (let day = 89; day >= 0; day--) {
    const d = new Date(today);
    d.setDate(d.getDate() - day);
    const date = d.toISOString().slice(0, 10);
    const leadsToday = Math.round(rnd(2, 8));

    for (let i = 0; i < leadsToday; i++) {
      const bu = Math.random() > 0.45 ? "Bathrooms" : "Sewers";
      const campaign = CAMPAIGNS.find((c) => c.bu === bu)!;
      const statusIdx = Math.floor(Math.random() * STATUSES.length);
      const status = STATUSES[statusIdx];
      const revenue = status === "Cancelled" ? 0 : Math.round(rnd(bu === "Bathrooms" ? 4200 : 1800, bu === "Bathrooms" ? 18000 : 6500));
      const sales = status === "Cancelled" ? 0 : Math.round(rnd(revenue * 0.6, revenue * 0.9));

      rows.push({
        "Job Number": 100000 + rows.length,
        "Creation Date": date,
        "Campaign Name": campaign.name,
        "Campaign Category": "Paid Social",
        "Campaign Definition": "Meta Ads",
        "Booking Method": BOOKING_METHODS[i % BOOKING_METHODS.length],
        "Job Status": status,
        "Booked By": BOOKED_BY[i % BOOKED_BY.length],
        "Zip Code": 30301 + Math.floor(Math.random() * 50),
        "Sales": sales,
        "Revenue": revenue,
        "Business Unit": bu,
        "UM Content": campaign.name,
        "Sold On": status !== "Cancelled" ? date : "",
        "Completed On": status === "Completed" ? date : "",
      });
    }
  }
  return rows;
}

export function getMockPayload(): PaidSocialPayload {
  return {
    generated_at: new Date().toISOString(),
    meta_account_id: 1234567890,
    meta_insights: buildMetaRows(),
    servicetitan_social_leads: buildSTRows(),
    meta_ad_creatives: ADS.map((ad_name, i) => ({
      ad_name,
      ad_id: String(9000000 + i),
      thumbnail_url: "",
      body: i % 2 === 0
        ? "Tired of your outdated bathroom? We transform bathrooms in days — guaranteed."
        : "Blocked sewer line? Our camera inspection finds the problem fast.",
      title: i % 2 === 0 ? "Bathroom Remodeling Experts" : "Sewer Line Specialists",
      status: "ACTIVE",
    })),
  };
}
