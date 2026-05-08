"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
  /** Current selection from URL `bu` param. Empty array = "All services". */
  value: string[];
  /**
   * When provided, the picker is controlled by the parent: changes are emitted
   * via this callback instead of pushed to the URL. Used by OverviewClient to
   * keep filter changes purely client-side. Omit for URL-driven pages.
   */
  onChange?: (next: string[]) => void;
}

/**
 * Multi-select Business Unit filter. Picking a checkbox doesn't navigate
 * immediately — changes accumulate in local state and are applied as a
 * single URL push when the popover closes (or when Apply is clicked). This
 * keeps multi-select interactions snappy even when the backend fetch is
 * slow.
 */
export function BusinessUnitFilter({
  options,
  value,
  onChange,
}: BusinessUnitFilterProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  function openPopover() {
    // Snap the draft back to the canonical URL value whenever the popover
    // re-opens (covers the case where the URL was changed by another control).
    setDraft(value);
    setOpen(true);
  }

  const apply = useCallback(
    (next: string[]) => {
      const cleaned = parseBuList(serializeBuList(next), options);
      // Only emit when the value actually differs.
      const sameAsValue =
        cleaned.length === value.length &&
        cleaned.every((s) => value.includes(s));
      if (sameAsValue) return;
      if (onChange) {
        onChange(cleaned);
        return;
      }
      const sp = new URLSearchParams(params?.toString() ?? "");
      if (cleaned.length === 0) sp.delete("bu");
      else sp.set("bu", serializeBuList(cleaned));
      const query = sp.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [params, options, value, pathname, router, onChange],
  );

  // Close on outside click — apply pending changes on the way out.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        apply(draft);
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Cancel — discard the draft.
        setOpen(false);
        setDraft(value);
      }
      if (e.key === "Enter") {
        apply(draft);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, draft, value, apply]);

  function toggle(opt: string) {
    setDraft((prev) =>
      prev.includes(opt) ? prev.filter((v) => v !== opt) : [...prev, opt],
    );
  }
  function selectAll() {
    setDraft([]);
  }
  const draftDirty =
    draft.length !== value.length || draft.some((s) => !value.includes(s));

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-pending={pending ? "true" : undefined}
        className={cn(
          "inline-flex h-8 min-w-[160px] items-center justify-between gap-2 border bg-white px-3 transition-colors",
          "border-[color:var(--color-jbp-hairline)]",
          "hover:bg-[color:var(--color-jbp-paper)]",
          open && "ring-1 ring-[color:var(--color-jbp-red)]/40",
          pending && "opacity-70",
        )}
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--color-jbp-text)",
        }}
      >
        <span className="truncate">{buListLabel(value)}</span>
        <ChevronDown
          className="h-3.5 w-3.5"
          style={{ color: "var(--color-jbp-text-3)" }}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute right-0 top-[calc(100%+4px)] z-40 w-[240px] border border-[color:var(--color-jbp-hairline)] bg-white"
        >
          <button
            type="button"
            onClick={selectAll}
            className={cn(
              "flex w-full items-center justify-between px-3 py-2 text-[13px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]",
              draft.length === 0 && "bg-[color:var(--color-jbp-cream)]",
            )}
          >
            <span>All services</span>
            {draft.length === 0 ? (
              <Check
                className="h-3.5 w-3.5 text-[color:var(--color-jbp-blue)]"
                aria-hidden="true"
              />
            ) : null}
          </button>
          <div className="border-t border-[color:var(--color-border-subtle)]">
            {options.map((opt) => {
              const checked = draft.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggle(opt)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-[13px] text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]"
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
                    {checked ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-3 py-2">
            <span className="text-[11px] text-[color:var(--color-text-secondary)]">
              {draft.length === 0 ? "All services" : `${draft.length} selected`}
              {draftDirty ? " · unsaved" : ""}
            </span>
            <div className="flex gap-2">
              {draft.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setDraft([])}
                  className="text-[11px] font-semibold text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  apply(draft);
                  setOpen(false);
                }}
                disabled={!draftDirty}
                className={cn(
                  "text-[11px] font-semibold",
                  draftDirty
                    ? "text-[color:var(--color-jbp-blue)] hover:underline"
                    : "text-[color:var(--color-text-tertiary)]",
                )}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
