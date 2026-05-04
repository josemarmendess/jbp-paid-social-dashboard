interface PipelineKpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  /** Optional accent badge in the top-right (e.g., 'warning'). */
  badge?: { tone: "warning" | "neutral" | "positive" | "negative"; text: string };
}

/**
 * Larger KPI card variant used by the Pipeline page — no sparkline, more
 * prominent number, room for a contextual subtitle.
 */
export function PipelineKpiCard({
  label,
  value,
  subtitle,
  badge,
}: PipelineKpiCardProps) {
  const badgeStyles = badge
    ? badge.tone === "warning"
      ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
      : badge.tone === "negative"
        ? "bg-[color:var(--color-negative-soft)] text-[color:var(--color-negative)]"
        : badge.tone === "positive"
          ? "bg-[color:var(--color-positive-soft)] text-[color:var(--color-positive)]"
          : "bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-secondary)]"
    : "";
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(26,15,11,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-secondary)]">
          {label}
        </span>
        {badge ? (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${badgeStyles}`}
          >
            {badge.text}
          </span>
        ) : null}
      </div>
      <span
        className="font-mono font-semibold tabular-nums text-[color:var(--color-text-primary)]"
        style={{ fontSize: 32, lineHeight: 1.1, letterSpacing: "-0.01em" }}
      >
        {value}
      </span>
      {subtitle ? (
        <span className="text-[12px] text-[color:var(--color-text-secondary)]">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
