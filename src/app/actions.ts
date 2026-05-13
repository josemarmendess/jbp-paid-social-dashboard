"use server";

import { revalidatePath, updateTag } from "next/cache";
import { refreshAppsScriptCache } from "@/lib/fetchData";

/**
 * Refresh the Apps Script payload across every route.
 *
 * Three steps, in order:
 *   1. Ping Apps Script with `?refresh=1` so it bypasses its own
 *      CacheService and recomputes from Meta + ServiceTitan. Without
 *      this, invalidating Next's cache just makes us re-fetch the
 *      same stale payload Apps Script kept in its internal cache.
 *   2. updateTag — Next 16's server-action cache invalidator. Marks
 *      the "paid-social" tagged fetch as expired so the next request
 *      re-hits Apps Script (and now gets the fresh payload from step 1).
 *   3. revalidatePath("/", "layout") — invalidates every page that
 *      lives under the root layout. Without this, the user can stay
 *      on a cached page even after the data refetched.
 *
 * NOTE: step 1 only works if the Apps Script Web App reads
 * `e.parameter.refresh` and skips `CacheService.getScriptCache().get(...)`
 * when truthy. If your script doesn't honor that param yet, this still
 * degrades gracefully — the fetch hits Apps Script but the upstream
 * cache won't drop, so users see whatever the Apps Script returned.
 */
export async function refreshDataAction() {
  await refreshAppsScriptCache();
  updateTag("paid-social");
  revalidatePath("/", "layout");
}
