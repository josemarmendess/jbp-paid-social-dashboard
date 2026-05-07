import { serializeBuList, type ServiceView } from "./buFilter";
import type { DateRangePreset } from "./types";

/**
 * Serializes the common filter set to a URLSearchParams instance. Pages
 * extend this with their own page-specific params before pushing.
 */
export function appendCommonFilters(
  sp: URLSearchParams,
  state: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view?: ServiceView;
  },
): void {
  if (state.preset !== "this_month") sp.set("range", state.preset);
  if (state.preset === "custom") {
    if (state.customStart) sp.set("start", state.customStart);
    if (state.customEnd) sp.set("end", state.customEnd);
  }
  if (state.bu.length > 0) sp.set("bu", serializeBuList(state.bu));
  if (state.view && state.view !== "combined") sp.set("view", state.view);
}

/**
 * Replaces the URL with `?<qs>` (or just the pathname if no params), via
 * history.replaceState — does NOT trigger Next router navigation, so no
 * RSC fetch happens. Safe to call on every state change.
 */
export function replaceQuery(qs: string): void {
  if (typeof window === "undefined") return;
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (next !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, "", next);
  }
}
