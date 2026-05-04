import { normalizeService } from "./serviceTaxonomy";

/**
 * Helpers for the multi-select Business Unit filter. The URL param `bu`
 * is comma-separated (e.g., `?bu=Sewers,Bathrooms`). Empty / missing / "All"
 * means "no filter — include every service". Values are normalized to the
 * canonical taxonomy (Bathrooms / Sewers) on parse so legacy URLs still work.
 */

export function parseBuList(
  raw: string | undefined,
  options: string[],
): string[] {
  if (!raw || raw === "All") return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return [];
  const matched: string[] = [];
  for (const p of parts) {
    const canonical = normalizeService(p);
    // Only include if it's a known option (defensive, in case the option
    // list ever shrinks); always store the canonical name.
    if (options.includes(canonical) && !matched.includes(canonical)) {
      matched.push(canonical);
    }
  }
  return matched;
}

/** Stringify a list back into the URL `bu` param value. */
export function serializeBuList(list: string[]): string {
  if (!list.length) return "";
  return list.join(",");
}

/** Pretty label for the filter trigger. */
export function buListLabel(list: string[]): string {
  if (list.length === 0) return "All services";
  if (list.length === 1) return list[0];
  return `${list.length} services`;
}

/* ----------------------------- View mode ----------------------------- */

import { CANONICAL_SERVICES } from "./serviceTaxonomy";

export type ServiceView = "combined" | "split";

export function parseView(raw: string | undefined): ServiceView {
  return raw === "split" ? "split" : "combined";
}

export interface ServiceSlice {
  /** Display label — service name or "Combined" / "All services". */
  label: string;
  /** Stable key for React. */
  key: string;
  /** BU filter to apply for this slice (single-element array or [] for all). */
  bu: string[];
}

/**
 * Translate (selected services × view mode) into a list of slices that the
 * page should render. Each slice produces one group of KPIs / one chart line /
 * one pivot table, depending on the consumer.
 *
 *  - combined view: one slice that aggregates whatever is in `selected`
 *    (or all services when selected is empty).
 *  - split view: one slice per service in `selected` (or per canonical
 *    service when selected is empty).
 */
export function getServiceSlices(
  selected: string[],
  view: ServiceView,
): ServiceSlice[] {
  if (view === "split") {
    const services = selected.length > 0 ? selected : [...CANONICAL_SERVICES];
    return services.map((s) => ({ label: s, key: s, bu: [s] }));
  }
  // Combined.
  if (selected.length === 0) {
    return [{ label: "All services", key: "all", bu: [] }];
  }
  if (selected.length === 1) {
    return [{ label: selected[0], key: selected[0], bu: [selected[0]] }];
  }
  return [
    {
      label: `Combined · ${selected.join(" + ")}`,
      key: "combined",
      bu: selected,
    },
  ];
}
