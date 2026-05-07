import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PaidSocialPayload } from "./types";

/**
 * Cached entry point for the Apps Script payload.
 *
 * Two cache layers, on purpose:
 *
 *   1. fetch's `next: { revalidate, tags }` puts the raw HTTP response in
 *      Vercel's Data Cache. This is the layer that PERSISTS ACROSS REQUESTS
 *      AND INSTANCES — without it, every cold serverless invocation would
 *      re-call Apps Script. (Round-trip Apps Script is the dominant cost.)
 *
 *   2. "use cache" wraps the whole function so within a single hot instance
 *      we also skip JSON parsing (the parsed object is cached, not just the
 *      raw bytes). This is in-memory only on serverless, so its benefit is
 *      limited to Fluid Compute concurrency reuse — but it's free and stacks
 *      cleanly on top of the Data Cache.
 *
 * Both layers are tagged "paid-social" so the Refresh button's
 * updateTag("paid-social") invalidates them together.
 *
 * Earlier I dropped the fetch's next:{} when adding "use cache". That broke
 * cross-request caching on Vercel — the freshness indicator updated on every
 * filter change because each render re-hit Apps Script. Restored now.
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
    next: { revalidate: 1800, tags: ["paid-social"] },
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

  // Logged whenever the function body actually executes. With both cache
  // layers warm this should be silent in `vercel logs` — every line means
  // a cache miss somewhere.
  console.log(
    `[paid-social] MISS · fetch ${fetchMs}ms · parse ${parseMs}ms · meta_rows=${json.meta_insights?.length ?? 0} st_rows=${json.servicetitan_social_leads?.length ?? 0}`,
  );

  return json;
}
