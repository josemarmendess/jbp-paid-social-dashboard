import type { PaidSocialPayload, MetaInsightRow, ServiceTitanRow, MetaAdCreativeRow } from "./types";

// Fixed anchor — new Date() is banned during Next.js prerender.
const ANCHOR = new Date("2026-06-29T12:00:00Z");

// Deterministic seeded PRNG (xorshift32) — Math.random() is also banned.
let _seed = 0x9e3779b9;
function rand(): number {
  _seed ^= _seed << 13;
  _seed ^= _seed >> 17;
  _seed ^= _seed << 5;
  return (_seed >>> 0) / 0xffffffff;
}
function rnd(min: number, max: number) { return min + rand() * (max - min); }
function rndInt(min: number, max: number) { return Math.floor(rnd(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }

function offsetDate(base: Date, days: number): string {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function anchorMinus(days: number): string { return offsetDate(ANCHOR, -days); }

// ─── Campaign / Ad taxonomy ────────────────────────────────────────────────
// Each campaign has its own dedicated set of ad names so the Creatives page
// sees distinct ad_name entries with proper spend + attribution.

const CAMPAIGNS: { name: string; bu: "Bathrooms" | "Sewers"; adsetName: string; ads: string[] }[] = [
  {
    name: "BAT | Prospecting | Broad | Meta",
    bu: "Bathrooms",
    adsetName: "Lookalike 2% — Customers 180d",
    ads: [
      "BAT_V3_Before-After_Static",
      "BAT_V5_Lifestyle_Reel",
      "BAT_V7_UGC_Review",
    ],
  },
  {
    name: "BAT | Retargeting | IG Stories | Meta",
    bu: "Bathrooms",
    adsetName: "Retargeting — Video Views 75%",
    ads: [
      "BAT_V2_Testimonial_Carousel",
      "BAT_V6_Offer_15pct_Static",
    ],
  },
  {
    name: "SEW | Prospecting | Video | Meta",
    bu: "Sewers",
    adsetName: "LAL 5% — High Value",
    ads: [
      "SEW_V4_RootIntrusion_Video",
      "SEW_V6_CameraInspection_Reel",
      "SEW_V8_BeforeAfter_Static",
    ],
  },
  {
    name: "SEW | Retargeting | Lead Gen | Meta",
    bu: "Sewers",
    adsetName: "Interest — Home Improvement",
    ads: [
      "SEW_V1_Emergency_Static",
      "SEW_V3_Blockage_Carousel",
    ],
  },
];

// Flat list of all unique ad names (for creative rows)
const ALL_ADS = CAMPAIGNS.flatMap((c) => c.ads);

// ─── Atlanta-area zip codes ─────────────────────────────────────────────────
const ZIPS = [
  30301, 30305, 30306, 30307, 30308, 30309, 30310, 30311, 30312, 30313,
  30314, 30315, 30316, 30317, 30318, 30319, 30324, 30326, 30327, 30328,
  30329, 30331, 30336, 30338, 30339, 30340, 30341, 30342, 30345, 30346,
  30350, 30360, 30363, 30022, 30024, 30062, 30064, 30066, 30067, 30068,
  30075, 30076, 30092, 30093, 30096, 30097, 30101, 30102, 30106, 30114,
  30126, 30127, 30132, 30134, 30144, 30152, 30157, 30168, 30188, 30189,
];

// ─── Job statuses ───────────────────────────────────────────────────────────
// Weight: Completed 55%, Cancelled 12%, Scheduled 18%, In Progress 10%, Hold 5%
const STATUS_POOL = [
  ...Array(55).fill("Completed"),
  ...Array(12).fill("Cancelled"),
  ...Array(18).fill("Scheduled"),
  ...Array(10).fill("In Progress"),
  ...Array(5).fill("Hold"),
];

const BOOKING_METHODS = ["Phone", "Phone", "Phone", "Online", "Chat"];
const BOOKED_BY = ["Sarah K.", "Mike T.", "Linda R.", "Tom W.", "James P.", "Diana H."];

// ─── Meta Insights ──────────────────────────────────────────────────────────
function buildMetaRows(): MetaInsightRow[] {
  const rows: MetaInsightRow[] = [];

  for (let day = 89; day >= 0; day--) {
    const date = anchorMinus(day);
    const dow = new Date(date).getUTCDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const dayMult = isWeekend ? 0.72 : 1.12;

    for (const camp of CAMPAIGNS) {
      for (const adName of camp.ads) {
        // Vary spend per ad within the campaign
        const adWeight = camp.ads.indexOf(adName) === 0 ? 1.3 : 0.85;
        const spend = rnd(120, 310) * dayMult * adWeight;
        const impressions = Math.round(spend * rnd(160, 280));
        const link_clicks = Math.round(impressions * rnd(0.01, 0.028));
        const results = Math.max(1, Math.round(spend / rnd(35, 75)));
        const frequency = Math.round(rnd(12, 38)) / 10;

        rows.push({
          date,
          account_id: 1234567890,
          account_name: "J. Blanton Plumbing",
          campaign_name: camp.name,
          adset_name: camp.adsetName,
          ad_name: adName,
          spend: Math.round(spend * 100) / 100,
          impressions,
          frequency,
          link_clicks,
          inline_link_click_ctr: Math.round((link_clicks / impressions) * 10000) / 100,
          cost_per_inline_link_click: Math.round((spend / Math.max(1, link_clicks)) * 100) / 100,
          cpm: Math.round((spend / impressions) * 1000 * 100) / 100,
          results,
          cost_per_result: Math.round((spend / results) * 100) / 100,
          last_updated_at: ANCHOR.toISOString(),
        });
      }
    }
  }
  return rows;
}

// ─── ServiceTitan Leads ─────────────────────────────────────────────────────
function buildSTRows(): ServiceTitanRow[] {
  const rows: ServiceTitanRow[] = [];

  for (let day = 89; day >= 0; day--) {
    const creationDate = anchorMinus(day);
    const leadsToday = rndInt(3, 11);

    for (let i = 0; i < leadsToday; i++) {
      const camp = pick(CAMPAIGNS);
      const adName = pick(camp.ads);
      const status = pick(STATUS_POOL);
      const zip = pick(ZIPS);
      const bu = camp.bu;

      // Revenue only for non-cancelled jobs
      const baseRevenue = bu === "Bathrooms"
        ? rnd(3800, 19500)
        : rnd(1600, 7200);
      const revenue = (status === "Cancelled" || status === "Scheduled" || status === "Hold")
        ? 0
        : Math.round(baseRevenue);
      const sales = revenue > 0 ? Math.round(rnd(revenue * 0.55, revenue * 0.88)) : 0;

      // Staggered dates: Sold On = creation + 1-5 days, Completed On = sold + 2-14 days
      const soldOnDelta = rndInt(1, 5);
      const completedOnDelta = rndInt(2, 14);
      const soldOn = (status === "Completed" || status === "In Progress")
        ? offsetDate(new Date(creationDate), soldOnDelta)
        : "";
      const completedOn = status === "Completed"
        ? offsetDate(new Date(creationDate), soldOnDelta + completedOnDelta)
        : "";

      rows.push({
        "Job Number": 100000 + rows.length,
        "Creation Date": creationDate,
        "Campaign Name": camp.name,
        "Campaign Category": "Paid Social",
        "Campaign Definition": "Meta Ads",
        "Booking Method": pick(BOOKING_METHODS),
        "Job Status": status,
        "Booked By": pick(BOOKED_BY),
        "Zip Code": zip,
        "Sales": sales,
        "Revenue": revenue,
        "Business Unit": bu,
        // UM Content must match ad_name for Creatives attribution
        "UM Content": adName,
        "Sold On": soldOn,
        "Completed On": completedOn,
      });
    }
  }
  return rows;
}

// ─── Ad Creatives ───────────────────────────────────────────────────────────
const AD_COPY: Record<string, { title: string; body: string }> = {
  BAT_V3_Before_After_Static: {
    title: "Bathroom Transformation",
    body: "Before ➜ After in just 3 days. See what your bathroom could look like.",
  },
  BAT_V5_Lifestyle_Reel: {
    title: "Your Dream Bathroom Awaits",
    body: "Luxurious upgrades, fair prices, zero stress. Book a free estimate today.",
  },
  BAT_V7_UGC_Review: {
    title: "5 Stars — Every Time",
    body: '"J. Blanton transformed our master bath in 48 hours. Absolutely incredible." — Sarah M.',
  },
  BAT_V2_Testimonial_Carousel: {
    title: "Real Results, Real Customers",
    body: "Over 2,000 Atlanta homeowners trust J. Blanton for bathroom remodeling.",
  },
  BAT_V6_Offer_15pct_Static: {
    title: "Save 15% This Month Only",
    body: "Book your bathroom remodel in June and save 15%. Limited spots available.",
  },
  SEW_V4_RootIntrusion_Video: {
    title: "Tree Roots Destroying Your Pipes?",
    body: "Our hydro-jetting clears root intrusion fast — before it becomes a $10K problem.",
  },
  SEW_V6_CameraInspection_Reel: {
    title: "Free Camera Inspection",
    body: "See exactly what's in your sewer line. No guesswork — no surprises on the bill.",
  },
  SEW_V8_BeforeAfter_Static: {
    title: "Sewer Rescue in 24 Hours",
    body: "Blocked sewer line? We diagnose and clear it the same day.",
  },
  SEW_V1_Emergency_Static: {
    title: "Sewer Emergency? We Answer 24/7",
    body: "Don't wait. Our emergency sewer team is on call around the clock.",
  },
  SEW_V3_Blockage_Carousel: {
    title: "5 Signs You Have a Blocked Sewer",
    body: "Slow drains? Gurgling sounds? Don't ignore these warning signs.",
  },
};

function buildCreativeRows(): MetaAdCreativeRow[] {
  return ALL_ADS.map((adName, i) => {
    const key = adName.replace(/-/g, "_");
    const copy = AD_COPY[key] ?? {
      title: adName,
      body: "Professional plumbing services for Atlanta homeowners.",
    };
    return {
      ad_name: adName,
      ad_id: String(9000000 + i),
      thumbnail_url: "",
      image_url: "",
      body: copy.body,
      title: copy.title,
      status: "ACTIVE",
      permalink_url: "",
    };
  });
}

// ─── Public entry ────────────────────────────────────────────────────────────
export function getMockPayload(): PaidSocialPayload {
  _seed = 0x9e3779b9; // reset for deterministic output across prerender calls
  return {
    generated_at: ANCHOR.toISOString(),
    meta_account_id: 1234567890,
    meta_insights: buildMetaRows(),
    servicetitan_social_leads: buildSTRows(),
    meta_ad_creatives: buildCreativeRows(),
  };
}
