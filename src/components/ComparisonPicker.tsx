"use client";

import { useEffect, useRef, useState } from "react";
import { COMPARISON_OPTIONS } from "@/lib/dateRange";
import type { ComparisonMode } from "@/lib/types";

/**
 * Tiny dropdown to switch the comparison anchor — Prior period (default),
 * Prior month, or Prior year. Sits next to the period picker.
 */
export function ComparisonPicker({
  value,
  onChange,
}: {
  value: ComparisonMode;
  onChange: (next: ComparisonMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const activeLabel =
    COMPARISON_OPTIONS.find((o) => o.value === value)?.label ?? "Prior period";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Comparison anchor"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 32,
          padding: "0 10px",
          background: "var(--color-jbp-white)",
          border: "1px solid var(--color-jbp-hairline)",
          color: "var(--color-jbp-text-2)",
          fontSize: 10,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          cursor: "pointer",
        }}
      >
        <span>vs {activeLabel.replace(/^Prior /i, "")}</span>
        <svg
          width="9"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 30,
            background: "var(--color-jbp-white)",
            border: "1px solid var(--color-jbp-hairline)",
            minWidth: 160,
          }}
        >
          {COMPARISON_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  background: active
                    ? "var(--color-jbp-ink)"
                    : "transparent",
                  color: active
                    ? "var(--color-jbp-cream)"
                    : "var(--color-jbp-text)",
                  border: "none",
                  borderBottom:
                    "1px solid var(--color-jbp-hairline-soft)",
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  cursor: "pointer",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
