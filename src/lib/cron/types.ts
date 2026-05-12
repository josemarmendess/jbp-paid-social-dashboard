import type { DailySummaryConfig } from "@/lib/reportTemplates";

/**
 * Plain types + defaults for the cron config. Lives in a separate module
 * (no "server-only") so client components can import the shape without
 * pulling Upstash into the browser bundle.
 */

export interface CronConfig {
  /** Master toggle. When false the hourly tick skips this template. */
  enabled: boolean;
  /**
   * Hour of day (0–23) in America/Chicago that the cron should fire.
   * The Vercel cron itself runs every hour; this gates which hour
   * actually does work for this template.
   */
  hourCT: number;
  /**
   * DM channel ID (`D…`) or user ID (`U…`/`W…`) to receive the
   * preview + Approve / Cancel buttons. Empty string = use env-var
   * fallback (SLACK_REVIEW_CHANNEL).
   */
  reviewerChannel: string;
  /**
   * Group channel ID (`C…`/`G…`) the approved version is forwarded
   * to. Empty string = use env-var fallback (SLACK_DAILY_CHANNEL).
   */
  targetChannel: string;
  /** Last successful send (ISO string in UTC). null if never. */
  lastSentAt: string | null;
  /** Last failure message (most recent run that errored). null if last run was clean or never ran. */
  lastError: string | null;
  /**
   * Snapshot of the customizer state at the most recent client-side
   * Save. Null = no save yet, fall back to DAILY_SUMMARY_DEFAULT_CONFIG.
   * Persisted to KV by saveDailySummaryReportConfigAction so the cron
   * (which runs server-side and can't see localStorage) renders with
   * the operator's most recent layout/services/metrics.
   */
  reportConfig: DailySummaryConfig | null;
}

export const DEFAULT_CRON_CONFIG: CronConfig = {
  enabled: false,
  hourCT: 19,
  reviewerChannel: "",
  targetChannel: "",
  lastSentAt: null,
  lastError: null,
  reportConfig: null,
};
