"use client";

import { useTransition } from "react";
import { Layers, LayoutList, Square } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ServiceView } from "@/lib/buFilter";

interface ServiceViewToggleProps {
  view: ServiceView;
  /**
   * When provided, the toggle is controlled by the parent: changes are emitted
   * via this callback instead of pushed to the URL. Used by OverviewClient to
   * keep filter changes purely client-side. Omit for URL-driven pages.
   */
  onChange?: (next: ServiceView) => void;
}

const OPTIONS: ReadonlyArray<{
  key: ServiceView;
  label: string;
  Icon: typeof Square;
  hint: string;
}> = [
  {
    key: "combined",
    label: "Combined",
    Icon: Square,
    hint: "Combined view — totals only",
  },
  {
    key: "split",
    label: "Per service",
    Icon: Layers,
    hint: "Per service — Bathrooms vs Sewers side by side",
  },
  {
    key: "all",
    label: "All",
    Icon: LayoutList,
    hint: "Both — per service AND combined total",
  },
];

/**
 * View mode toggle in the global header. Three states drive every data
 * visualization: combined (single rollup), split (one per service), all
 * (per service + combined total — best for Slack-pasted reports).
 */
export function ServiceViewToggle({ view, onChange }: ServiceViewToggleProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();

  function setView(next: ServiceView) {
    if (next === view) return;
    if (onChange) {
      onChange(next);
      return;
    }
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next === "combined") sp.delete("view");
    else sp.set("view", next);
    const query = sp.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center border border-[color:var(--color-jbp-hairline)] bg-white",
        pending && "opacity-70",
      )}
      role="group"
      aria-label="Service view"
    >
      {OPTIONS.map((opt, i) => {
        const active = view === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setView(opt.key)}
            title={opt.hint}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 transition-colors",
              i > 0 && "border-l border-[color:var(--color-jbp-hairline)]",
              active
                ? "bg-[color:var(--color-jbp-ink)] text-[color:var(--color-jbp-cream)]"
                : "text-[color:var(--color-jbp-text-2)] hover:text-[color:var(--color-jbp-text)]",
            )}
            style={{
              height: "100%",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fontWeight: active ? 700 : 600,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            <opt.Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
