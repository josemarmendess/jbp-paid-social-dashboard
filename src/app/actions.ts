"use server";

import { revalidatePath, updateTag } from "next/cache";

/**
 * Refresh the Apps Script payload across every route.
 *
 * - updateTag is the Next 16 server-action cache invalidator. Marks the
 *   "paid-social" tagged fetch as expired so the next request refetches
 *   from Apps Script.
 * - revalidatePath("/", "layout") invalidates every page that lives under
 *   the root layout (Overview, Performance, Funnel, Pipeline, History,
 *   Geography, Creatives, Reports). Without this, the user can stay on a
 *   cached page even after the data refetched.
 */
export async function refreshDataAction() {
  updateTag("paid-social");
  revalidatePath("/", "layout");
}
