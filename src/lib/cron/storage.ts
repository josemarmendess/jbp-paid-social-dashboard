import "server-only";
import { Redis } from "@upstash/redis";
import type { ReportTemplateId } from "@/lib/reportTemplates";
import { DEFAULT_CRON_CONFIG, type CronConfig } from "./types";

export { DEFAULT_CRON_CONFIG, type CronConfig };

/**
 * Per-template cron config stored in Upstash Redis (Vercel Marketplace).
 * One JSON blob per template under key `cron:{templateId}`.
 *
 * Setup (once per project):
 *   1. Vercel project → Storage → Marketplace → Upstash · Redis →
 *      Create. Connect it to the project. Vercel injects
 *      UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 *   2. Redeploy.
 *
 * If the env vars are missing the helpers below resolve to `null` /
 * defaults so the dashboard still renders (with a setup banner) and
 * the cron tick simply doesn't fire any template.
 */

let clientCache: Redis | null | undefined;

/**
 * Lazily build the Upstash client from env vars. Vercel's Marketplace
 * Upstash integration injects the legacy Vercel KV names
 * (KV_REST_API_URL / KV_REST_API_TOKEN); a manual install of @upstash/redis
 * uses the upstream names (UPSTASH_REDIS_REST_URL / TOKEN). Accept either.
 *
 * Returns null when neither pair is set so callers can fall through to
 * defaults and the dashboard shows a setup banner.
 */
function client(): Redis | null {
  if (clientCache !== undefined) return clientCache;
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    clientCache = null;
    return null;
  }
  clientCache = new Redis({ url, token });
  return clientCache;
}

export function isCronStorageConfigured(): boolean {
  return client() !== null;
}

function key(id: ReportTemplateId): string {
  return `cron:${id}`;
}

/**
 * Read the config for a template. Falls back to DEFAULT_CRON_CONFIG
 * when storage isn't configured or the key doesn't exist yet.
 */
export async function getCronConfig(
  id: ReportTemplateId,
): Promise<CronConfig> {
  const c = client();
  if (!c) return DEFAULT_CRON_CONFIG;
  try {
    const value = await c.get<CronConfig>(key(id));
    if (!value) return DEFAULT_CRON_CONFIG;
    // Defensive merge so an older stored shape still hydrates with the
    // current default fields.
    return { ...DEFAULT_CRON_CONFIG, ...value };
  } catch (err) {
    console.warn(
      `[cron-storage] read failed for ${id}: ${err instanceof Error ? err.message : err}`,
    );
    return DEFAULT_CRON_CONFIG;
  }
}

/**
 * Persist the config for a template. No-ops (returns false) when
 * storage isn't configured — the UI surfaces this as a "set up
 * Upstash" banner.
 */
export async function setCronConfig(
  id: ReportTemplateId,
  config: CronConfig,
): Promise<boolean> {
  const c = client();
  if (!c) return false;
  try {
    await c.set(key(id), JSON.stringify(config));
    return true;
  } catch (err) {
    console.warn(
      `[cron-storage] write failed for ${id}: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
}

/** Clamp + sanitise user input before persisting. Used by the server action. */
export function normaliseCronConfig(input: Partial<CronConfig>): CronConfig {
  const merged = { ...DEFAULT_CRON_CONFIG, ...input };
  let hour = Math.trunc(Number(merged.hourCT));
  if (!Number.isFinite(hour)) hour = DEFAULT_CRON_CONFIG.hourCT;
  if (hour < 0) hour = 0;
  if (hour > 23) hour = 23;
  return {
    enabled: Boolean(merged.enabled),
    hourCT: hour,
    reviewerChannel: (merged.reviewerChannel ?? "").trim(),
    targetChannel: (merged.targetChannel ?? "").trim(),
    lastSentAt: merged.lastSentAt ?? null,
    lastError: merged.lastError ?? null,
    reportConfig: merged.reportConfig ?? null,
  };
}
