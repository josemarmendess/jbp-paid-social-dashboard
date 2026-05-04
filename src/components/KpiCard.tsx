import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";
import { formatDelta, pctChange } from "@/lib/format";

export interface KpiCardProps {
  label: string;
  value: string;
  current: number;
  previous: number;
  /** When true, larger values are worse (e.g. CPL, Spend, Spend on Revenue, Cancellation Rate). */
  invertDelta?: boolean;
  /** Optional 30-day series for the inline sparkline. */
  sparkline?: number[];
  /** Optional muted line under the delta. */
  hint?: string;
}

export function KpiCard({
  label,
  value,
  current,
  previous,
  invertDelta = false,
  sparkline,
  hint,
}: KpiCardProps) {
  const delta = pctChange(current, previous);
  const isFlat = !Number.isFinite(delta) || delta === 0;
  const isUp = Number.isFinite(delta) && delta > 0;
  const isInfinite = !Number.isFinite(delta);

  const positiveDirection = invertDelta ? !isUp : isUp;
  const tone = isFlat
    ? "text-[color:var(--color-text-tertiary)]"
    : positiveDirection
      ? "text-[color:var(--color-positive)]"
      : "text-[color:var(--color-negative)]";

  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4 transition-all duration-200",
        "hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(26,15,11,0.06)]",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
        {label}
      </span>
      <span
        className="font-mono font-semibold tabular-nums text-[color:var(--color-text-primary)]"
        style={{ fontSize: "28px", lineHeight: 1.1, letterSpacing: "-0.01em" }}
      >
        {value}
      </span>
      <div className={cn("flex items-center gap-1 text-[11px] tabular-nums", tone)}>
        <Icon className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
        <span className="font-medium">
          {isInfinite && current > 0 && previous === 0
            ? "new"
            : formatDelta(delta)}
        </span>
        <span className="text-[color:var(--color-text-tertiary)]">
          vs. previous
        </span>
      </div>
      {sparkline && sparkline.length > 0 ? (
        <div className="-mb-1 mt-auto">
          <Sparkline values={sparkline} height={24} width={140} />
        </div>
      ) : null}
      {hint ? (
        <span className="text-[10px] text-[color:var(--color-text-tertiary)] tabular-nums">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
