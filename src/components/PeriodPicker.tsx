"use client";

import { useEffect, useRef, useState } from "react";
import {
  PRESET_OPTIONS,
  chicagoTodayStr,
  parsePreset,
} from "@/lib/dateRange";
import type { DateRangePreset } from "@/lib/types";

/**
 * Trade-paper styled period picker. Replaces the shadcn Select wrapper that
 * lived inside the old DateRangePicker — sharp corners, hairline border,
 * mono uppercase, ink/cream selected state. Custom dropdown so we can show
 * 11 presets without overflowing a segmented control.
 *
 * Same onChange contract as the old DateRangePicker so callers don't change.
 */
interface PeriodPickerProps {
  initial: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  onChange: (next: {
    preset: DateRangePreset;
    start?: string;
    end?: string;
  }) => void;
}

export function PeriodPicker({
  initial,
  customStart,
  customEnd,
  onChange,
}: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const today = chicagoTodayStr();
  const startVal = customStart ?? today;
  const endVal = customEnd ?? today;
  const activeLabel =
    PRESET_OPTIONS.find((o) => o.value === initial)?.label ?? "Custom";

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

  function pick(next: DateRangePreset) {
    setOpen(false);
    if (next === "custom") {
      onChange({ preset: "custom", start: startVal, end: endVal });
    } else {
      onChange({ preset: next, start: undefined, end: undefined });
    }
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 32,
          padding: "0 12px",
          background: "var(--color-jbp-white)",
          border: "1px solid var(--color-jbp-hairline)",
          color: "var(--color-jbp-text)",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          cursor: "pointer",
          minWidth: 160,
          justifyContent: "space-between",
        }}
      >
        <span>{activeLabel}</span>
        <svg
          width="10"
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
            minWidth: 200,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {PRESET_OPTIONS.map((opt) => {
            const active = opt.value === initial;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(opt.value)}
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
                  borderBottom: "1px solid var(--color-jbp-hairline-soft)",
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
      {initial === "custom" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
          }}
        >
          <input
            type="date"
            aria-label="Start date"
            value={startVal}
            max={today}
            onChange={(e) =>
              onChange({
                preset: "custom",
                start: e.currentTarget.value,
                end: customEnd ?? e.currentTarget.value,
              })
            }
            style={inputStyle}
          />
          <span style={{ color: "var(--color-jbp-text-3)" }}>→</span>
          <input
            type="date"
            aria-label="End date"
            value={endVal}
            max={today}
            onChange={(e) =>
              onChange({
                preset: "custom",
                start: customStart ?? e.currentTarget.value,
                end: e.currentTarget.value,
              })
            }
            style={inputStyle}
          />
        </div>
      ) : null}
    </div>
  );
}

const inputStyle = {
  height: 32,
  padding: "0 8px",
  background: "var(--color-jbp-white)",
  border: "1px solid var(--color-jbp-hairline)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--color-jbp-text)",
  fontVariantNumeric: "tabular-nums" as const,
  outline: "none",
};

/** Compatibility re-export — `parsePreset` is just for callers that used to
 *  import it from DateRangePicker. */
export { parsePreset };
