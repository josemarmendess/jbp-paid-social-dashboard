import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import type { Anomaly } from "@/lib/aggregate";

interface AnomalyBannerProps {
  anomalies: Anomaly[];
}

/**
 * Compact strip above the KPI grid surfacing the top 3 anomalies (large
 * deviations vs the trailing 28-day baseline). Tone of each chip reflects
 * whether the change is good or bad for the business.
 */
export function AnomalyBanner({ anomalies }: AnomalyBannerProps) {
  if (!anomalies.length) return null;
  const top = anomalies.slice(0, 3);
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-3">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-jbp-blue)]/10"
      >
        <Sparkles
          className="h-3.5 w-3.5 text-[color:var(--color-jbp-blue)]"
          strokeWidth={2}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[12px] font-semibold text-[color:var(--color-text-primary)]">
          Heads up · yesterday&apos;s data vs trailing 28-day baseline
        </p>
        <ul className="flex flex-wrap gap-2">
          {top.map((a) => {
            const bg = a.bad
              ? "bg-[color:var(--color-negative-soft)] text-[color:var(--color-negative)]"
              : "bg-[color:var(--color-positive-soft)] text-[color:var(--color-positive)]";
            const Icon = a.direction === "up" ? ArrowUpRight : ArrowDownRight;
            return (
              <li
                key={a.metric}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${bg}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" strokeWidth={2.25} />
                {a.detail}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
