"use client";

import {
  DAILY_SUMMARY_DEFAULT_CONFIG,
  type DailySummaryConfig,
  type ReportTemplateId,
} from "./reportTemplates";

/**
 * Per-template persistence to localStorage. No backend yet — once we add a
 * Vercel KV / Postgres layer for shared team settings this swaps in cleanly
 * (every caller just wraps loadConfig / saveConfig).
 *
 * Schema is versioned so a future config-shape change can be migrated rather
 * than blowing the user's saved customisations away.
 */
const SCHEMA_VERSION = 1;
const STORAGE_PREFIX = "jbp.report.";

interface StoredEnvelope<T> {
  v: number;
  data: T;
}

function key(id: ReportTemplateId): string {
  return `${STORAGE_PREFIX}${id}`;
}

export function loadDailySummaryConfig(): DailySummaryConfig {
  if (typeof window === "undefined") return DAILY_SUMMARY_DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(key("daily-summary"));
    if (!raw) return DAILY_SUMMARY_DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as StoredEnvelope<DailySummaryConfig>;
    if (parsed.v !== SCHEMA_VERSION) return DAILY_SUMMARY_DEFAULT_CONFIG;
    // Merge with defaults so a stored config from before we added a field
    // (e.g. heroPeriod) still renders.
    return {
      ...DAILY_SUMMARY_DEFAULT_CONFIG,
      ...parsed.data,
    };
  } catch {
    return DAILY_SUMMARY_DEFAULT_CONFIG;
  }
}

export function saveDailySummaryConfig(config: DailySummaryConfig): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: StoredEnvelope<DailySummaryConfig> = {
      v: SCHEMA_VERSION,
      data: config,
    };
    window.localStorage.setItem(
      key("daily-summary"),
      JSON.stringify(envelope),
    );
  } catch {
    // Quota exceeded or storage disabled — silently no-op. The user keeps
    // their session-level customisations either way.
  }
}

export function clearDailySummaryConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key("daily-summary"));
  } catch {
    // ignore
  }
}
