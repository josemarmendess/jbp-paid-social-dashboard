"use client";

import { useTransition } from "react";
import { Layers, LayoutList, Square } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ServiceView } from "@/lib/buFilter";

interface ServiceViewToggleProps {
  view: ServiceView;
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
export function ServiceViewToggle({ view }: ServiceViewToggleProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();

  function setView(next: ServiceView) {
    if (next === view) return;
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
        "flex h-9 items-center gap-0.5 rounded-md border border-[color:var(--color-border-subtle)] bg-white p-0.5",
        pending && "opacity-70",
      )}
      role="group"
      aria-label="Service view"
    >
      {OPTIONS.map((opt) => {
        const active = view === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setView(opt.key)}
            title={opt.hint}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
              active
                ? "bg-[color:var(--color-jbp-cream)] text-[color:var(--color-text-primary)] shadow-sm"
                : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            <opt.Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
