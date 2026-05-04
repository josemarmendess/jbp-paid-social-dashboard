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

  const res = await fetch(url.toString(), {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["paid-social"] },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(
      `Apps Script request failed: ${res.status} ${res.statusText}`,
    );
  }

  const json = (await res.json()) as PaidSocialPayload;
  return json;
}
