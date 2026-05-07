import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PaidSocialPayload } from "./types";

/**
 * Cached entry point for the Apps Script payload.
 *
 * - "use cache" wraps the whole function so identical calls during the
 *   cacheLife window resolve instantly from Next's runtime cache without
 *   re-hitting Apps Script (or even re-parsing the JSON).
 * - cacheTag("paid-social") ties this to the same tag the Refresh button's
 *   server action invalidates via updateTag, keeping the manual-refresh UX.
 * - revalidate: 1800s matches the previous fetch-level revalidate.
 *   expire: 3600s is the hard ceiling — after an hour without traffic, the
 *   next request regenerates synchronously instead of returning very stale.
 *
 * Note: the function takes no arguments, so the cache key is just (build id,
 * function id). Per-(range, bu, view) caching happens one layer up, in
 * cachedAggregate.ts, which calls this and then computes view-scoped numbers.
 */
export async function fetchPaidSocialData(): Promise<PaidSocialPayload> {
  "use cache";
  cacheLife({ revalidate: 1800, expire: 3600 });
  cacheTag("paid-social");

  const baseUrl = process.env.APPS_SCRIPT_URL;
  const token = process.env.APPS_SCRIPT_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "APPS_SCRIPT_URL or APPS_SCRIPT_TOKEN env var is missing. Set them in .env.local for dev or in your hosting provider for production.",
    );
  }
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);

  const t0 = Date.now();
  const res = await fetch(url.toString(), {
    redirect: "follow",
  });
  const fetchMs = Date.now() - t0;

  if (!res.ok) {
    console.warn(
      `[paid-social] Apps Script ${res.status} after ${fetchMs}ms`,
    );
    throw new Error(
      `Apps Script request failed: ${res.status} ${res.statusText}`,
    );
  }

  const t1 = Date.now();
  const json = (await res.json()) as PaidSocialPayload;
  const parseMs = Date.now() - t1;

  // Only logged on cache MISS now (the "use cache" wrapper makes hits silent).
  // Use that signal in `vercel logs` to see how often Apps Script is hit.
  console.log(
    `[paid-social] MISS · fetch ${fetchMs}ms · parse ${parseMs}ms · meta_rows=${json.meta_insights?.length ?? 0} st_rows=${json.servicetitan_social_leads?.length ?? 0}`,
  );

  return json;
}
