"use server";

import {
  DEFAULT_CRON_CONFIG,
  getCronConfig,
  isCronStorageConfigured,
  normaliseCronConfig,
  setCronConfig,
  type CronConfig,
} from "@/lib/cron/storage";
import { runDailySummary, type RunResult } from "@/lib/cron/runner";
import type { DailySummaryConfig } from "@/lib/reportTemplates";

/**
 * Server actions backing the Daily Summary cron control panel. Each
 * action is a thin wrapper around the cron storage / runner helpers so
 * the UI doesn't need to know about Upstash or the Slack flow.
 *
 * Storage failures (Upstash not connected) propagate as `configured:
 * false` rather than throwing — the UI shows a setup banner.
 */

export interface CronStateView {
  configured: boolean;
  config: CronConfig;
}

export async function loadDailySummaryCronAction(): Promise<CronStateView> {
  const configured = isCronStorageConfigured();
  if (!configured) {
    return { configured: false, config: DEFAULT_CRON_CONFIG };
  }
  return { configured: true, config: await getCronConfig("daily-summary") };
}

export async function saveDailySummaryCronAction(
  input: Partial<CronConfig>,
): Promise<{ ok: boolean; error?: string; config: CronConfig }> {
  if (!isCronStorageConfigured()) {
    return {
      ok: false,
      error:
        "Upstash Redis not connected — Vercel project → Storage → Marketplace → Upstash · Redis → connect to project, then redeploy.",
      config: DEFAULT_CRON_CONFIG,
    };
  }
  // Preserve lastSentAt / lastError across edits — they belong to the
  // runner, not the user.
  const prior = await getCronConfig("daily-summary");
  const next = normaliseCronConfig({
    ...input,
    lastSentAt: prior.lastSentAt,
    lastError: prior.lastError,
  });
  const ok = await setCronConfig("daily-summary", next);
  return { ok, error: ok ? undefined : "save failed", config: next };
}

export async function sendDailySummaryNowAction(): Promise<RunResult> {
  return runDailySummary({ force: true });
}

/**
 * Mirror the customizer's saved DailySummaryConfig to KV so the cron
 * (and "Send preview now") renders with the operator's most recent
 * layout. Called by DailySummaryClient's Save button alongside the
 * existing localStorage save.
 *
 * Returns { ok: true } even when KV isn't configured (no-op) so the
 * client save flow doesn't break on a missing Upstash setup — the
 * localStorage save still works, and the cron will fall back to
 * DAILY_SUMMARY_DEFAULT_CONFIG.
 */
export async function saveDailySummaryReportConfigAction(
  reportConfig: DailySummaryConfig,
): Promise<{ ok: boolean; configured: boolean }> {
  if (!isCronStorageConfigured()) {
    return { ok: true, configured: false };
  }
  const prior = await getCronConfig("daily-summary");
  const next: CronConfig = { ...prior, reportConfig };
  const ok = await setCronConfig("daily-summary", next);
  return { ok, configured: true };
}
