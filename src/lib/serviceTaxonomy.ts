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

/**
 * Best-effort service inference from ad-level text fields (adset name,
 * campaign name, ad name). Used as a fallback when the ad has no
 * ServiceTitan rows yet — newly-launched bathroom ads with recent spend
 * but no jobs would otherwise default to Sewers and corrupt the per-service
 * Spend split (the bug José spotted on May 4 — AD28, AD35, AD36 were
 * pulling 7-day spend into Bathrooms but landing in Sewers).
 *
 * Returns null when neither bucket matches with confidence — caller falls
 * back to its own default.
 */
const BATHROOM_PATTERNS = /\b(bathroom|bathrooms|shower|tub|vanity)\b/i;
const SEWER_PATTERNS = /\b(sewer|sewers|plumb|plumbing|drain|pipe|mitigation)\b/i;

export function inferServiceFromText(...texts: (string | undefined | null)[]): CanonicalService | null {
  // Walk inputs in priority order: adset > campaign > ad name.
  for (const t of texts) {
    if (!t) continue;
    const s = String(t);
    // Bathrooms is checked first because BATHROOMS-tagged adsets sometimes
    // also contain words like "PLUMBING" in supporting copy. Specificity wins.
    if (BATHROOM_PATTERNS.test(s)) return "Bathrooms";
    if (SEWER_PATTERNS.test(s)) return "Sewers";
  }
  return null;
}
