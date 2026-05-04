"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface EntityDetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

/**
 * Slide-out detail panel from the right edge. Click backdrop or Escape to
 * close. 320ms ease-out matching the spec.
 */
export function EntityDetailPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
}: EntityDetailPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-[color:var(--color-text-primary)]/20 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-[color:var(--color-border-subtle)] bg-white shadow-2xl",
          "transition-transform duration-[320ms] ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/60 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-[color:var(--color-text-primary)]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[12px] text-[color:var(--color-text-secondary)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </aside>
    </>
  );
}
