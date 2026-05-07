import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { PaidSocialPayload } from "./types";

/**
 * Inner cached fetch — only the network/parse side. Env-var validation lives
 * one layer up so that a missing env var doesn't propagate as a thrown error
 * through the "use cache" boundary (which would crash prerender for static
 * routes like /_not-found that share the root layout).
 *
 * Two cache layers stack here:
 *   1. fetch's `next: { revalidate, tags }` puts the raw response in Vercel's
 *      Data Cache — persistent across requests AND instances.
 *   2. "use cache" wraps the function so we also skip JSON re-parsing within
 *      a hot instance.
 *
 * Both share the "paid-social" tag, so updateTag in the Refresh server action
 * invalidates them together.
 */
async function fetchCached(url: string): Promise<PaidSocialPayload> {
  "use cache";
  cacheLife({ revalidate: 1800, expire: 3600 });
  cacheTag("paid-social");

  const t0 = Date.now();
  const res = await fetch(url, {
    next: { revalidate: 1800, tags: ["paid-social"] },
    redirect: "follow",
  });
  const fetchMs = Date.now() - t0;

  if (!res.ok) {
    throw new Error(
      `Apps Script request failed: ${res.status} ${res.statusText}`,
    );
  }

  const t1 = Date.now();
  const json = (await res.json()) as PaidSocialPayload;
  const parseMs = Date.now() - t1;

  // Cache MISS only — warm hits skip the function body entirely.
  console.log(
    `[paid-social] MISS · fetch ${fetchMs}ms · parse ${parseMs}ms · meta_rows=${json.meta_insights?.length ?? 0} st_rows=${json.servicetitan_social_leads?.length ?? 0}`,
  );

  return json;
}

/**
 * Public entry. Always resolves — never throws — so the root layout can call
 * it without a try/catch crashing prerender. Returns null when env vars are
 * missing or the upstream fetch errors; the data provider surfaces a generic
 * banner in those cases.
 */
export async function fetchPaidSocialData(): Promise<PaidSocialPayload | null> {
  const baseUrl = process.env.APPS_SCRIPT_URL;
  const token = process.env.APPS_SCRIPT_TOKEN;
  if (!baseUrl || !token) {
    console.warn(
      "[paid-social] env vars missing (APPS_SCRIPT_URL / APPS_SCRIPT_TOKEN) — returning null.",
    );
    return null;
  }

  const url = new URL(baseUrl);
  url.searchParams.set("token", token);

  try {
    return await fetchCached(url.toString());
  } catch (err) {
    console.warn(
      `[paid-social] fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
