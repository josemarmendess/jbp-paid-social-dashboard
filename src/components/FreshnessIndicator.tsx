"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface FreshnessIndicatorProps {
  /** ISO 8601 timestamp emitted by Apps Script (data.generated_at). */
  generatedAt: string;
}

function relative(generated: number, now: number): { text: string; tone: "fresh" | "ok" | "stale" } {
  const ms = Math.max(0, now - generated);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return { text: "just now", tone: "fresh" };
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return {
      text: `${min} min ago`,
      tone: min < 10 ? "fresh" : min < 30 ? "ok" : "stale",
    };
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) return { text: `${hr}h ago`, tone: "stale" };
  const day = Math.floor(hr / 24);
  return { text: `${day}d ago`, tone: "stale" };
}

/**
 * Tiny "X min ago" ticker that updates every 30s on the client. Reads the
 * timestamp emitted by the Apps Script payload (generated_at), so it
 * reflects when the upstream JSON was actually built — not when the
 * dashboard's ISR cache last filled.
 *
 * Tone:
 *  - fresh (< 10 min): green
 *  - ok (10-30 min): amber
 *  - stale (> 30 min): red. Click Refresh to force.
 */
function useTickingNow(intervalMs: number): number | null {
  // useSyncExternalStore + a per-mount tick counter gives us a re-render
  // every `intervalMs` without the lint penalty of setState-in-effect.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  // Return null during SSR (matches the pre-mount render), then real time.
  return useSyncExternalStore(
    () => () => {},
    () => Date.now() + tick * 0, // tick is a re-render trigger only
    () => null,
  );
}

export function FreshnessIndicator({ generatedAt }: FreshnessIndicatorProps) {
  const generated = new Date(generatedAt).getTime();
  const now = useTickingNow(30_000);

  if (now === null) {
    // SSR placeholder — avoids hydration mismatch.
    return (
      <span className="hidden text-[11px] tabular-nums text-[color:var(--color-text-tertiary)] xl:inline">
        Data freshness loading…
      </span>
    );
  }

  const { text, tone } = relative(generated, now);
  const color =
    tone === "fresh"
      ? "text-[color:var(--color-positive)]"
      : tone === "ok"
        ? "text-[color:var(--color-warning)]"
        : "text-[color:var(--color-negative)]";

  return (
    <span
      title={`Apps Script payload generated at ${new Date(generated).toLocaleString()}`}
      className="hidden items-center gap-1.5 text-[11px] tabular-nums text-[color:var(--color-text-tertiary)] xl:inline-flex"
    >
      <span aria-hidden="true" className={`inline-block h-1.5 w-1.5 rounded-full ${tone === "fresh" ? "bg-[color:var(--color-positive)]" : tone === "ok" ? "bg-[color:var(--color-warning)]" : "bg-[color:var(--color-negative)]"}`} />
      Data <span className={`font-medium ${color}`}>{text}</span>
    </span>
  );
}
