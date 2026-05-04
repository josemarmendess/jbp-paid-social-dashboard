/**
 * Helpers for the multi-select Business Unit filter. The URL param `bu`
 * is comma-separated (e.g., `?bu=Sewer,Bathrooms`). Empty / missing / "All"
 * means "no filter — include every service".
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
  // Case-insensitive match against the canonical option list.
  const matched: string[] = [];
  for (const p of parts) {
    const m = options.find((o) => o.toLowerCase() === p.toLowerCase());
    if (m && !matched.includes(m)) matched.push(m);
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
