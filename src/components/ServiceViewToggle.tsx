"use client";

import { useTransition } from "react";
import { Layers, Square } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ServiceView } from "@/lib/buFilter";

interface ServiceViewToggleProps {
  view: ServiceView;
}

/**
 * "Combined" vs "Per service" toggle in the global header. Drives every
 * data visualization on every page — when "split" is on, each visual element
 * gets duplicated per service (Bathrooms / Sewers).
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
      <button
        type="button"
        onClick={() => setView("combined")}
        title="Combined view — totals only"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
          view === "combined"
            ? "bg-[color:var(--color-jbp-cream)] text-[color:var(--color-text-primary)] shadow-sm"
            : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
        )}
      >
        <Square className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
        Combined
      </button>
      <button
        type="button"
        onClick={() => setView("split")}
        title="Per service — Bathrooms vs Sewers side by side"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
          view === "split"
            ? "bg-[color:var(--color-jbp-cream)] text-[color:var(--color-text-primary)] shadow-sm"
            : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
        )}
      >
        <Layers className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
        Per service
      </button>
    </div>
  );
}
