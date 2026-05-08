import { CANONICAL_SERVICES } from "./serviceTaxonomy";

/**
 * Report template config. Drives both the customizer panel and the rendered
 * report. Persisted to localStorage by id so the user keeps their toggles
 * across sessions.
 *
 * Today: only the "daily-summary" template exists. The shape is intentionally
 * generic so adding more templates (weekly, monthly, executive, etc.) later
 * doesn't require new types.
 */

export type ReportTemplateId = "daily-summary";

export interface ReportTemplate {
  id: ReportTemplateId;
  name: string;
  description: string;
}

export const REPORT_TEMPLATES: ReadonlyArray<ReportTemplate> = [
  {
    id: "daily-summary",
    name: "Daily Summary | KPIs per service",
    description:
      "The morning-coffee snapshot the team used to copy as PNG. Per-service rollup of the headline KPIs across multiple windows (Today, Yesterday, Last 3/7/30 days, MTD, Last month). Customisable; saves as a PDF, copies to clipboard, or queues for Slack.",
  },
];

/* ──────────────── Daily summary spec ──────────────── */

/**
 * Period column the report can show. Keys match `getPivotPeriods()` in
 * lib/periods.ts so the labels and ranges stay in lockstep with the rest of
 * the dashboard.
 */
export type DailySummaryPeriod =
  | "today"
  | "yesterday"
  | "last_3"
  | "last_7"
  | "last_30"
  | "month_to_date"
  | "last_month";

export const DAILY_SUMMARY_PERIODS: ReadonlyArray<{
  key: DailySummaryPeriod;
  label: string;
  shortLabel: string;
}> = [
  { key: "today", label: "Today", shortLabel: "TODAY" },
  { key: "yesterday", label: "Yesterday", shortLabel: "YEST" },
  { key: "last_3", label: "Last 3 Days", shortLabel: "L3D" },
  { key: "last_7", label: "Last 7 Days", shortLabel: "L7D" },
  { key: "last_30", label: "Last 30 Days", shortLabel: "L30D" },
  { key: "month_to_date", label: "Month to Date", shortLabel: "MTD" },
  { key: "last_month", label: "Last Month", shortLabel: "LAST MO" },
];

/** Metric keys the daily-summary template knows about. Maps 1:1 to PIVOT_ROWS
 *  in lib/pivotConfig.ts so we share the same render logic. */
export type DailySummaryMetric =
  | "spend"
  | "leads"
  | "costPerLead"
  | "bookedJobs"
  | "costPerBookedJob"
  | "salesRevenue"
  | "spendOnRevenue"
  | "averageSaleValue"
  | "cancellationRate"
  | "soldJobs"
  | "impressions"
  | "linkClicks"
  | "ctr"
  | "leadRate"
  | "bookRate"
  | "showRate"
  | "closeRate"
  | "roas"
  | "avgDaysToClose"
  | "avgDaysToComplete";

/** What the report shows by default — the 9 metrics from the original
 *  PNG-copyable pivot table. The customizer lets the user opt into the
 *  remaining ones. */
export const DAILY_SUMMARY_DEFAULT_METRICS: ReadonlyArray<DailySummaryMetric> =
  [
    "spend",
    "leads",
    "costPerLead",
    "bookedJobs",
    "costPerBookedJob",
    "salesRevenue",
    "spendOnRevenue",
    "averageSaleValue",
    "cancellationRate",
  ];

export interface DailySummaryConfig {
  /** Free-text title shown in the report header. */
  title: string;
  /** Slice keys to render — each gets its own service section. Ordered. */
  services: ReadonlyArray<string>;
  /** Period columns to render, in display order. */
  periods: ReadonlyArray<DailySummaryPeriod>;
  /** Metric rows to render, in display order. */
  metrics: ReadonlyArray<DailySummaryMetric>;
  /**
   * Period key to highlight as the "hero" column (paper background, slightly
   * larger numbers). null = no highlight.
   */
  heroPeriod: DailySummaryPeriod | null;
  /**
   * Slack destination for the Send button. Channel ID (`C…` for public,
   * `G…` for private), DM channel (`D…`), or user ID (`U…`, the bot opens
   * a DM). Empty string = fall back to the SLACK_REVIEW_CHANNEL env var.
   */
  slackDestination?: string;
}

export const DAILY_SUMMARY_DEFAULT_CONFIG: DailySummaryConfig = {
  title: "Daily Summary | KPIs per service",
  services: ["all", ...CANONICAL_SERVICES],
  periods: [
    "today",
    "yesterday",
    "last_3",
    "last_7",
    "last_30",
    "month_to_date",
    "last_month",
  ],
  metrics: [...DAILY_SUMMARY_DEFAULT_METRICS],
  heroPeriod: "yesterday",
};

/** Service key + display label. "all" is a special slice that aggregates
 *  every service — the canonical taxonomy is just Bathrooms / Sewers today,
 *  but new services land here automatically via CANONICAL_SERVICES. */
export const DAILY_SUMMARY_SERVICES: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: "all", label: "All services" },
  ...CANONICAL_SERVICES.map((s) => ({ key: s, label: s })),
];
