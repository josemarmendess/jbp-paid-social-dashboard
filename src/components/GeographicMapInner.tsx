"use client";

import "leaflet/dist/leaflet.css";

import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHICAGO_CENTER, CHICAGO_ZOOM, lookupCentroid } from "@/lib/geo";
import type { ZipMetrics } from "@/lib/aggregate";
import { formatCurrency } from "@/lib/format";

type Metric = "cpl" | "cpBooked" | "sales" | "spendOnRevenue";

interface MetricDef {
  key: Metric;
  label: string;
  /** Returns the metric's value for a zip, or null if undefined for that zip. */
  pick: (z: ZipMetrics) => number | null;
  /** Higher = more red? Or lower = more red? CPL/CP Booked: higher = worse (red). Sales: higher = better (green). SpendOnRevenue: higher = worse. */
  highIsBad: boolean;
  /** Tooltip caveat about CPL/SpendOnRevenue being approximations. */
  approximate: boolean;
  format: (v: number) => string;
}

const METRICS: ReadonlyArray<MetricDef> = [
  {
    key: "cpl",
    label: "CPL",
    pick: (z) => (z.leads > 0 ? z.allocatedSpend / z.leads : null),
    highIsBad: true,
    approximate: true,
    format: (v) => formatCurrency(v, true),
  },
  {
    key: "cpBooked",
    label: "Cost per Booked",
    pick: (z) => (z.bookedJobs > 0 ? z.allocatedSpend / z.bookedJobs : null),
    highIsBad: true,
    approximate: true,
    format: (v) => formatCurrency(v, true),
  },
  {
    key: "sales",
    label: "Sales",
    pick: (z) => z.sales,
    highIsBad: false,
    approximate: false,
    format: (v) => formatCurrency(v),
  },
  {
    key: "spendOnRevenue",
    label: "Spend on Revenue",
    pick: (z) => (z.sales > 0 ? (z.allocatedSpend / z.sales) * 100 : null),
    highIsBad: true,
    approximate: true,
    format: (v) => `${Math.round(v)}%`,
  },
];

interface GeographicMapInnerProps {
  rows: ZipMetrics[];
}

export function GeographicMapInner({ rows }: GeographicMapInnerProps) {
  const [metricKey, setMetricKey] = useState<Metric>("sales");
  const metric = METRICS.find((m) => m.key === metricKey)!;

  // Split rows into mappable (have centroid) and orphans (don't).
  const placed = useMemo(() => {
    return rows
      .map((r) => {
        const c = lookupCentroid(r.zip);
        return c ? { ...r, lat: c[0], lng: c[1] } : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [rows]);

  const orphans = useMemo(
    () => rows.filter((r) => !lookupCentroid(r.zip)),
    [rows],
  );

  const maxLeads = Math.max(1, ...placed.map((p) => p.leads));

  // Compute scaled metric range for coloring. Skip nulls.
  const metricValues = placed
    .map((p) => metric.pick(p))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const minM = metricValues.length ? Math.min(...metricValues) : 0;
  const maxM = metricValues.length ? Math.max(...metricValues) : 1;

  function colorFor(z: ZipMetrics): string {
    const v = metric.pick(z);
    if (v === null || !Number.isFinite(v)) return "#9ca3af"; // zinc-400 fallback
    const range = maxM - minM;
    const t = range > 0 ? (v - minM) / range : 0.5;
    // For "highIsBad" metrics: low = green, high = red.
    // For "highIsGood" metrics (sales): low = pale, high = emerald.
    if (metric.highIsBad) {
      // Green (#10b981) at t=0 → Red (#ef4444) at t=1.
      const r = Math.round(16 + (239 - 16) * t);
      const g = Math.round(185 + (68 - 185) * t);
      const b = Math.round(129 + (68 - 129) * t);
      return `rgb(${r},${g},${b})`;
    }
    // Pale gray → emerald
    const r = Math.round(228 + (16 - 228) * t);
    const g = Math.round(228 + (185 - 228) * t);
    const b = Math.round(231 + (129 - 231) * t);
    return `rgb(${r},${g},${b})`;
  }

  if (placed.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground">
        Not enough data to render this map.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetricKey(m.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                metricKey === m.key
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {metric.approximate && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
            title="Meta spend is not tagged with zip codes. Spend is distributed across zips proportionally to leads, so per-zip CPL/Cost per Booked/Spend on Revenue are approximations."
          >
            <Info className="size-3" aria-hidden="true" />
            <span>Spend allocated by lead share — approximation</span>
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60">
        <MapContainer
          center={CHICAGO_CENTER}
          zoom={CHICAGO_ZOOM}
          scrollWheelZoom={false}
          style={{ height: 480, width: "100%", background: "var(--card)" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {placed.map((p) => {
            const radius = 6 + (p.leads / maxLeads) * 24;
            const color = colorFor(p);
            const cpl = p.leads > 0 ? p.allocatedSpend / p.leads : null;
            const cpBooked = p.bookedJobs > 0 ? p.allocatedSpend / p.bookedJobs : null;
            return (
              <CircleMarker
                key={p.zip}
                center={[p.lat, p.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="text-sm font-semibold tracking-tight">
                      ZIP {p.zip}
                    </div>
                    <table className="mt-1 tabular-nums">
                      <tbody>
                        <tr><td className="pr-3 text-zinc-500">Leads</td><td className="text-right">{p.leads}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">Booked</td><td className="text-right">{p.bookedJobs}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">Sales</td><td className="text-right">{formatCurrency(p.sales)}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">Allocated spend</td><td className="text-right">{formatCurrency(p.allocatedSpend, true)}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">CPL (approx)</td><td className="text-right">{cpl !== null ? formatCurrency(cpl, true) : "—"}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">Cost/Booked (approx)</td><td className="text-right">{cpBooked !== null ? formatCurrency(cpBooked, true) : "—"}</td></tr>
                        <tr><td className="pr-3 text-zinc-500">Cancelled</td><td className="text-right">{p.cancelled}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      {orphans.length > 0 && (
        <div className="text-[11px] text-muted-foreground">
          {orphans.length} ZIP{orphans.length === 1 ? "" : "s"} not on map (outside service-area centroids):{" "}
          {orphans
            .slice(0, 8)
            .map((o) => `${o.zip} (${o.leads})`)
            .join(", ")}
          {orphans.length > 8 ? ` +${orphans.length - 8} more` : ""}
        </div>
      )}
    </div>
  );
}
