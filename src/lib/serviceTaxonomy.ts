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
 * campaign name, ad name). Returns null when no signal is found.
 *
 * Bathrooms is tested first inside each text because BATHROOMS-tagged
 * adsets sometimes contain words like "PLUMBING" in supporting copy —
 * specificity wins.
 *
 * Caller is responsible for the priority order between fields. We DO NOT
 * fall through here; the order in the args matters.
 */
const BATHROOM_PATTERNS = /\b(bathroom|bathrooms|shower|tub|vanity)\b/i;
const SEWER_PATTERNS = /\b(sewer|sewers|plumb|plumbing|drain|pipe|mitigation)\b/i;

export function inferServiceFromText(
  ...texts: (string | undefined | null)[]
): CanonicalService | null {
  for (const t of texts) {
    if (!t) continue;
    const s = String(t);
    if (BATHROOM_PATTERNS.test(s)) return "Bathrooms";
    if (SEWER_PATTERNS.test(s)) return "Sewers";
  }
  return null;
}

/**
 * Single source of truth for "what service is this ad?" Used by every
 * aggregator that splits Meta rows by service. Resolution priority — most
 * → least confident:
 *
 *   1. Retargeting (audience rule) → always Sewers.
 *   2. ADSET NAME KEYWORD — the JBP media buyer encodes the service in
 *      the adset (e.g. "ADV | BATHROOMS - LP ..." vs "SEWER - MIX FORM
 *      START..."). This is the strongest signal because it reflects
 *      INTENT at campaign-build time, before any conversion data exists.
 *   3. ServiceTitan most-common BU — the real-world classification of
 *      jobs that resulted from this ad. Stable for old ads, but blank
 *      for newly-launched ones.
 *   4. CAMPAIGN NAME / AD NAME keyword — last-resort UTM-style cross-
 *      check before falling back to the default.
 *   5. Default Sewers (per the canonical taxonomy).
 *
 * Adset is elevated above ST so a Bathrooms-targeted ad whose customers
 * happened to need plumbing on the day still gets its SPEND attributed to
 * Bathrooms (where the budget was actually spent). Reflects José's
 * direction (May 5: "ADSET name geralmente é o melhor pra isso").
 */
export function resolveAdService(
  adName: string | undefined,
  adsetName: string | undefined,
  campaignName: string | undefined,
  audience: "Retargeting" | "Prospecting",
  stBuLookup: (adName: string) => CanonicalService | undefined,
): CanonicalService {
  if (audience === "Retargeting") return "Sewers";
  // 1. Adset is the strongest signal.
  const adsetSvc = inferServiceFromText(adsetName);
  if (adsetSvc) return adsetSvc;
  // 2. ServiceTitan attribution.
  if (adName) {
    const stSvc = stBuLookup(adName);
    if (stSvc) return stSvc;
  }
  // 3. Other UTM-style cross-checks.
  const cross = inferServiceFromText(campaignName, adName);
  if (cross) return cross;
  // 4. Default.
  return "Sewers";
}
