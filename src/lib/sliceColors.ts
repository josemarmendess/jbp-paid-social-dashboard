/**
 * Slice color tokens — used by the Performance Over Time pivot to give each
 * service its own visual identity. Lives in /lib so server components can
 * import it without crossing the client boundary.
 */

export type SliceTone = "neutral" | "bathrooms" | "sewers" | "total";

export interface SliceToneTokens {
  /** Caption bar background. */
  bg: string;
  /** Caption bar bottom-border. */
  border: string;
  /** Left rail accent strip. */
  rail: string;
  /** Caption text color. */
  text: string;
  /** Inline pill chip in the caption. */
  chipBg: string;
  chipText: string;
}

export const SLICE_TONES: Record<SliceTone, SliceToneTokens> = {
  neutral: {
    bg: "rgba(249, 243, 236, 0.5)",
    border: "var(--color-border-subtle)",
    rail: "transparent",
    text: "var(--color-text-primary)",
    chipBg: "rgba(149, 142, 131, 0.12)",
    chipText: "var(--color-text-secondary)",
  },
  bathrooms: {
    // Warm amber — distinct from JBP red, evokes bathroom warm tones.
    bg: "rgba(217, 119, 6, 0.08)",
    border: "rgba(217, 119, 6, 0.35)",
    rail: "rgb(217, 119, 6)",
    text: "rgb(146, 64, 14)",
    chipBg: "rgba(217, 119, 6, 0.18)",
    chipText: "rgb(146, 64, 14)",
  },
  sewers: {
    // Cool teal — distinct from JBP blue, reads as "underground / pipes".
    bg: "rgba(14, 116, 144, 0.08)",
    border: "rgba(14, 116, 144, 0.35)",
    rail: "rgb(14, 116, 144)",
    text: "rgb(15, 76, 92)",
    chipBg: "rgba(14, 116, 144, 0.18)",
    chipText: "rgb(15, 76, 92)",
  },
  total: {
    // JBP red for totals — matches the Cancellation Rate KPI accent.
    bg: "rgba(188, 14, 15, 0.07)",
    border: "rgba(188, 14, 15, 0.4)",
    rail: "rgb(188, 14, 15)",
    text: "rgb(127, 29, 29)",
    chipBg: "rgba(188, 14, 15, 0.16)",
    chipText: "rgb(127, 29, 29)",
  },
};

export function toneForLabel(label: string | undefined): SliceTone {
  if (!label) return "neutral";
  const l = label.toLowerCase();
  if (l.includes("bathroom")) return "bathrooms";
  if (l.includes("sewer")) return "sewers";
  if (l.includes("total")) return "total";
  return "neutral";
}
