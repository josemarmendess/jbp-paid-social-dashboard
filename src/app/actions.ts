"use server";

import { revalidatePath, updateTag } from "next/cache";

export async function refreshDataAction() {
  // updateTag expires the upstream Apps Script fetch immediately (Next 16 docs:
  // "The next request will wait to fetch fresh data rather than serving stale
  // content"). revalidatePath then invalidates the page's ISR cache so the
  // re-render actually re-runs the helper and picks up the fresh fetch.
  updateTag("paid-social");
  revalidatePath("/");
}
