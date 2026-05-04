"use client";

import dynamic from "next/dynamic";
import type { ZipMetrics } from "@/lib/aggregate";

// Leaflet touches `window` on import — defer the inner component to client-only.
const Inner = dynamic(
  () => import("./GeographicMapInner").then((m) => m.GeographicMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-lg border border-[color:var(--color-border-subtle)] bg-white" />
    ),
  },
);

export function GeographicMap({ rows }: { rows: ZipMetrics[] }) {
  return <Inner rows={rows} />;
}
