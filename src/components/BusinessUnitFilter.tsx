"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  buListLabel,
  parseBuList,
  serializeBuList,
} from "@/lib/buFilter";

interface BusinessUnitFilterProps {
  options: string[];
  /** Current selection from URL `bu` param. Empty array means "All services". */
  value: string[];
}

/**
 * Multi-select Business Unit filter. Empty selection is "All services".
 * Picking ≥1 services makes the Overview pivot stack one block per service
 * plus a Total block. Other pages filter rows to the union.
 */
export function BusinessUnitFilter({ options, value }: BusinessUnitFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pushSelection(next: string[]) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    const cleaned = parseBuList(serializeBuList(next), options);
    if (cleaned.length === 0) sp.delete("bu");
    else sp.set("bu", serializeBuList(cleaned));
    const query = sp.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function toggle(opt: string) {
    if (value.includes(opt)) {
      pushSelection(value.filter((v) => v !== opt));
    } else {
      pushSelection([...value, opt]);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-pending={pending ? "true" : undefined}
        className={cn(
          "inline-flex h-9 min-w-[150px] items-center justify-between gap-2 rounded-md border border-[color:var(--color-border-subtle)] bg-white px-3 text-[13px] font-medium text-[color:var(--color-text-primary)] transition-colors",
          "hover:bg-[color:var(--color-surface-hover)]",
          open && "ring-2 ring-[color:var(--color-jbp-blue)]/30",
        )}
      >
        <span className="truncate">{buListLabel(value)}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[color:var(--color-text-tertiary)]" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute right-0 top-[calc(100%+6px)] z-40 w-[220px] overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white shadow-xl"
        >
          <button
            type="button"
            onClick={() => pushSelection([])}
            className={cn(
              "flex w-full items-center justify-between px-3 py-2 text-[13px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]",
              value.length === 0 && "bg-[color:var(--color-jbp-cream)]",
            )}
          >
            <span>All services</span>
            {value.length === 0 ? (
              <Check className="h-3.5 w-3.5 text-[color:var(--color-jbp-blue)]" aria-hidden="true" />
            ) : null}
          </button>
          <div className="border-t border-[color:var(--color-border-subtle)]">
            {options.map((opt) => {
              const checked = value.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-[13px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]",
                  )}
                >
                  <span>{opt}</span>
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      checked
                        ? "border-[color:var(--color-jbp-blue)] bg-[color:var(--color-jbp-blue)]"
                        : "border-[color:var(--color-border-strong)] bg-white",
                    )}
                  >
                    {checked ? <Check className="h-3 w-3 text-white" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {value.length > 0 ? (
            <div className="flex items-center justify-between border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-3 py-2">
              <span className="text-[11px] text-[color:var(--color-text-secondary)]">
                {value.length} selected
              </span>
              <button
                type="button"
                onClick={() => pushSelection([])}
                className="text-[11px] font-semibold text-[color:var(--color-jbp-blue)] hover:underline"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
