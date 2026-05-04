import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDelta, pctChange } from "@/lib/format";

export interface KpiCardProps {
  label: string;
  value: string;
  current: number;
  previous: number;
  /** When true, larger values are worse (e.g. CPL, Spend, Spend on Sales). Default false. */
  invertDelta?: boolean;
  /** Optional muted line under the delta (e.g. "Target <20%"). */
  hint?: string;
}

export function KpiCard({
  label,
  value,
  current,
  previous,
  invertDelta = false,
  hint,
}: KpiCardProps) {
  const delta = pctChange(current, previous);
  const isFlat = !Number.isFinite(delta) || delta === 0;
  const isUp = Number.isFinite(delta) && delta > 0;
  const isInfinite = !Number.isFinite(delta);

  const positiveDirection = invertDelta ? !isUp : isUp;
  const tone = isFlat
    ? "text-muted-foreground"
    : positiveDirection
      ? "text-emerald-500"
      : "text-rose-500";

  const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="gap-2">
      <CardContent className="flex flex-col gap-3 py-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        <div className={cn("flex items-center gap-1 text-xs tabular-nums", tone)}>
          <Icon className="size-3.5" aria-hidden="true" />
          <span>
            {isInfinite && current > 0 && previous === 0
              ? "new"
              : formatDelta(delta)}
          </span>
          <span className="text-muted-foreground">vs. previous</span>
        </div>
        {hint && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {hint}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
