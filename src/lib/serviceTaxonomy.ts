/**
 * JBP only operates two ad-attributed service lines: **Bathrooms** and
 * **Sewers**. ServiceTitan business unit values are messy (Plumbing,
 * Mitigation, Sewer/Sewers variants, sometimes empty), so we normalize
 * everything that isn't explicitly "Bathrooms" into "Sewers".
 *
 * This single source of truth is used by:
 *  - aggregate.buMatches  (so filters compare normalized values)
 *  - listBusinessUnits     (returns the canonical pair)
 *  - aggregateByBusinessUnit / Adset (rolls up using normalized BU)
 *  - the Sidebar/Filter UI (Combobox options)
 *  - the view-toggle slicing logic
 */

export type CanonicalService = "Bathrooms" | "Sewers";

export const CANONICAL_SERVICES: readonly CanonicalService[] = [
  "Bathrooms",
  "Sewers",
];

export function normalizeService(raw: unknown): CanonicalService {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "bathrooms" || s === "bathroom") return "Bathrooms";
  // Plumbing, Mitigation, Sewer, Sewers, empty, etc → Sewers.
  return "Sewers";
}
