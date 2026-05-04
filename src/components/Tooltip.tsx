"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /** "top" | "bottom" — defaults to "top". */
  side?: "top" | "bottom";
}

/**
 * Lightweight CSS-driven tooltip. Hover or focus the trigger to reveal a
 * dark popover with the metric definition. No portal so layout stays simple;
 * tooltips are short single-paragraph definitions.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={[
            "pointer-events-none absolute left-1/2 z-50 w-[260px] -translate-x-1/2 rounded-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-text-primary)] px-3 py-2 text-[11px] leading-snug text-white shadow-lg",
            side === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
          ].join(" ")}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

interface MetricLabelProps {
  label: string;
  tooltip: React.ReactNode;
  /** Larger info icon for big headers. Default 12. */
  iconSize?: number;
  /** Forwarded class on the wrapper (label colour, weight, casing). */
  className?: string;
}

/**
 * Small Info icon next to a metric label that expands its definition on hover.
 * Used by KPI cards, the pivot table, and any other surface that shows a
 * short metric name.
 */
export function MetricLabel({
  label,
  tooltip,
  iconSize = 12,
  className,
}: MetricLabelProps) {
  return (
    <span className={["inline-flex items-center gap-1", className].filter(Boolean).join(" ")}>
      <span>{label}</span>
      <Tooltip content={tooltip}>
        <Info
          aria-label={`About ${label}`}
          tabIndex={0}
          className="text-zinc-400 outline-none transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:text-[color:var(--color-text-primary)]"
          style={{ width: iconSize, height: iconSize }}
          strokeWidth={2}
        />
      </Tooltip>
    </span>
  );
}
