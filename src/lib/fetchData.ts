import "server-only";
import type { PaidSocialPayload } from "./types";

const REVALIDATE_SECONDS = 1800;

export async function fetchPaidSocialData(): Promise<PaidSocialPayload> {
  const baseUrl = process.env.APPS_SCRIPT_URL;
  const token = process.env.APPS_SCRIPT_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "APPS_SCRIPT_URL or APPS_SCRIPT_TOKEN env var is missing. Set them in .env.local for dev or in your hosting provider for production.",
    );
  }
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);

  // Tag every request so we can compare "cold" (cache miss, hits Apps Script)
  // vs "warm" (cache hit) durations in production logs.
  const t0 = Date.now();
  const res = await fetch(url.toString(), {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["paid-social"] },
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

  // Console-level so the line shows up in `vercel logs` without adding deps.
  console.log(
    `[paid-social] fetch ${fetchMs}ms · parse ${parseMs}ms · meta_rows=${json.meta_insights?.length ?? 0} st_rows=${json.servicetitan_social_leads?.length ?? 0}`,
  );

  return json;
}
