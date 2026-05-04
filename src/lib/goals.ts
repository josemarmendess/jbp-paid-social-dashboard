/**
 * Lightweight goal-tracking helpers. Targets are read from URL search params
 * so a stakeholder can share a deeplink with their own goals baked in:
 *   ?cplTarget=80&roasTarget=4&cancelTarget=15
 *
 * When persistent storage lands later, swap parseGoalTargets to read from the
 * user's saved preferences instead.
 */

export interface GoalTargets {
  cplTarget: number | null; // dollars
  roasTarget: number | null; // multiple
  cancelTarget: number | null; // percent (0-100)
}

function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseGoalTargets(sp: {
  cplTarget?: string;
  roasTarget?: string;
  cancelTarget?: string;
}): GoalTargets {
  return {
    cplTarget: num(sp.cplTarget),
    roasTarget: num(sp.roasTarget),
    cancelTarget: num(sp.cancelTarget),
  };
}

export type GoalKind = "cpl" | "roas" | "cancelRate";

export interface GoalChip {
  tone: "positive" | "negative" | "neutral";
  text: string;
}

/**
 * Return a status chip comparing a current value to a goal target.
 *  - cpl: lower is better (current < target → positive)
 *  - roas: higher is better (current > target → positive)
 *  - cancelRate: lower is better (current < target → positive)
 * Returns undefined when no target is set so the card hides the chip.
 */
export function goalChip(
  kind: GoalKind,
  current: number,
  target: number | null,
): GoalChip | undefined {
  if (target == null || !Number.isFinite(current)) return undefined;
  const lowerIsBetter = kind === "cpl" || kind === "cancelRate";
  const ratio = current / target - 1; // positive = above target
  const beats = lowerIsBetter ? current <= target : current >= target;
  const pctText = `${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(0)}%`;
  if (beats) {
    return {
      tone: "positive",
      text: `${pctText} vs goal`,
    };
  }
  return {
    tone: "negative",
    text: `${pctText} vs goal`,
  };
}
