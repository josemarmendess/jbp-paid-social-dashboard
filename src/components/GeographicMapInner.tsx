"use client";

import "leaflet/dist/leaflet.css";

import { useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { ArrowDown, ArrowUp, ChevronsUpDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHICAGO_CENTER, CHICAGO_ZOOM, lookupCentroid } from "@/lib/geo";
import type { ZipMetrics } from "@/lib/aggregate";
import { formatCurrency, formatInt } from "@/lib/format";
import { Tooltip } from "@/components/Tooltip";

type MetricKey = "cpl" | "cpBooked" | "sales" | "spendOnRevenue" | "soldCount";

interface MetricDef {
  key: MetricKey;
  label: string;
  pick: (z: ZipMetrics) => number | null;
  highIsBad: boolean;
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
    label: "Cost / Booked",
    pick: (z) => (z.bookedJobs > 0 ? z.allocatedSpend / z.bookedJobs : null),
    highIsBad: true,
    approximate: true,
    format: (v) => formatCurrency(v, true),
  },
  {
    key: "sales",
    label: "Sales Revenue",
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
  {
    key: "soldCount",
    label: "Sold Count",
    pick: (z) => (z.bookedJobs > 0 ? z.bookedJobs : null), // bookedJobs == sold count for ST social leads dataset
    highIsBad: false,
    approximate: false,
    format: (v) => formatInt(v),
  },
];

interface PlacedZip extends ZipMetrics {
  lat: number;
  lng: number;
}

interface GeographicMapInnerProps {
  rows: ZipMetrics[];
}

/**
 * JBP-branded zip-code map. CartoDB Voyager tiles match the cream surfaces;
 * markers use a cream → JBP red gradient for "lower is better" metrics
 * (CPL, Cost per Booked, Spend on Revenue) and cream → positive green for
 * "higher is better" (Sales, Sold Count). The right-side panel ranks the
 * top 10 zips for the selected metric and lets you fly the map to any of
 * them; the bottom table is a full sortable list.
 */
export function GeographicMapInner({ rows }: GeographicMapInnerProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>("sales");
  const metric = METRICS.find((m) => m.key === metricKey)!;

  const placed: PlacedZip[] = useMemo(
    () =>
      rows
        .map((r) => {
          const c = lookupCentroid(r.zip);
          return c ? { ...r, lat: c[0], lng: c[1] } : null;
        })
        .filter((r): r is PlacedZip => r !== null),
    [rows],
  );

  const orphans = useMemo(
    () => rows.filter((r) => !lookupCentroid(r.zip)),
    [rows],
  );

  const maxLeads = Math.max(1, ...placed.map((p) => p.leads));

  const metricValues = placed
    .map((p) => metric.pick(p))
    .filter((v): v is number => v !== null && Number.isFinite(v));
  const minM = metricValues.length ? Math.min(...metricValues) : 0;
  const maxM = metricValues.length ? Math.max(...metricValues) : 1;

  function tFor(z: PlacedZip): number | null {
    const v = metric.pick(z);
    if (v === null || !Number.isFinite(v)) return null;
    const range = maxM - minM;
    return range > 0 ? (v - minM) / range : 0.5;
  }

  function colorFor(z: PlacedZip): string {
    const t = tFor(z);
    if (t === null) return "#9ca3af";
    // Cream (#F4ECDF) → JBP red (#BC0E0F) for highIsBad.
    // Cream (#F4ECDF) → positive green (#059669) for highIsGood.
    const from = { r: 244, g: 236, b: 223 };
    const to = metric.highIsBad
      ? { r: 188, g: 14, b: 15 }
      : { r: 5, g: 150, b: 105 };
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  // Top 10 ranked by the active metric (descending value when highIsGood, ascending when highIsBad).
  // Memoize on metricKey (a stable string) rather than the freshly-found metric object.
  const ranked = useMemo(() => {
    const m = METRICS.find((x) => x.key === metricKey)!;
    const withT = placed
      .map((p) => ({ p, v: m.pick(p) }))
      .filter((x): x is { p: PlacedZip; v: number } => x.v !== null);
    withT.sort((a, b) => (m.highIsBad ? a.v - b.v : b.v - a.v));
    return withT.slice(0, 10);
  }, [placed, metricKey]);

  // Map ref so the rank list can fly the camera to a zip.
  const mapRef = useRef<LeafletMap | null>(null);
  const [highlightZip, setHighlightZip] = useState<string | null>(null);

  function flyTo(zip: PlacedZip) {
    setHighlightZip(zip.zip);
    if (mapRef.current) {
      mapRef.current.flyTo([zip.lat, zip.lng], 12, { duration: 0.6 });
    }
  }

  if (placed.length === 0) {
    return (
      <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-12 text-center text-[13px] text-[color:var(--color-text-tertiary)]">
        Not enough data to render this map.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Metric toggle + caveat */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[color:var(--color-border-subtle)] bg-white p-1">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetricKey(m.key)}
              className={cn(
                "rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
                metricKey === m.key
                  ? "bg-[color:var(--color-jbp-blue)] text-white shadow-sm"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {metric.approximate ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--color-text-secondary)]">
            <Tooltip content="Meta spend isn't tagged with zip codes. Spend is distributed across zips proportionally to leads, so per-zip CPL / Cost per Booked / Spend on Revenue are approximations.">
              <Info
                className="h-3.5 w-3.5 text-zinc-400"
                aria-label="About this metric"
                tabIndex={0}
              />
            </Tooltip>
            Spend allocated by lead share — approximation
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Map */}
        <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
          <MapContainer
            center={CHICAGO_CENTER}
            zoom={CHICAGO_ZOOM}
            scrollWheelZoom={false}
            ref={(m) => {
              mapRef.current = m ?? null;
            }}
            style={{
              height: 520,
              width: "100%",
              background: "var(--color-jbp-cream)",
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              subdomains={["a", "b", "c", "d"]}
            />
            {placed.map((p) => {
              const radius = 6 + (p.leads / maxLeads) * 26;
              const color = colorFor(p);
              const isActive = highlightZip === p.zip;
              const cpl = p.leads > 0 ? p.allocatedSpend / p.leads : null;
              const cpb =
                p.bookedJobs > 0 ? p.allocatedSpend / p.bookedJobs : null;
              return (
                <CircleMarker
                  key={p.zip}
                  center={[p.lat, p.lng]}
                  radius={radius}
                  pathOptions={{
                    color: isActive ? "var(--color-jbp-blue)" : color,
                    fillColor: color,
                    fillOpacity: isActive ? 0.85 : 0.6,
                    weight: isActive ? 3 : 1.25,
                  }}
                  eventHandlers={{
                    click: () => setHighlightZip(p.zip),
                  }}
                >
                  <Popup>
                    <div className="text-[12px]">
                      <div
                        className="font-display text-[color:var(--color-text-primary)]"
                        style={{ fontSize: 14, letterSpacing: "0.05em" }}
                      >
                        ZIP {p.zip}
                      </div>
                      <table className="mt-1.5 tabular-nums">
                        <tbody>
                          <tr>
                            <td className="pr-3 text-zinc-500">Leads</td>
                            <td className="text-right">{p.leads}</td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">Booked</td>
                            <td className="text-right">{p.bookedJobs}</td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">Sales</td>
                            <td className="text-right">
                              {formatCurrency(p.sales)}
                            </td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">
                              Allocated spend
                            </td>
                            <td className="text-right">
                              {formatCurrency(p.allocatedSpend, true)}
                            </td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">CPL</td>
                            <td className="text-right">
                              {cpl !== null
                                ? formatCurrency(cpl, true)
                                : "—"}
                            </td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">
                              Cost / Booked
                            </td>
                            <td className="text-right">
                              {cpb !== null
                                ? formatCurrency(cpb, true)
                                : "—"}
                            </td>
                          </tr>
                          <tr>
                            <td className="pr-3 text-zinc-500">Cancelled</td>
                            <td className="text-right">{p.cancelled}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right sidebar: ranked top 10 */}
        <aside className="flex flex-col gap-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
              Top {ranked.length} ZIPs by {metric.label}
            </h3>
            <span className="text-[10px] uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
              {metric.highIsBad ? "Lower is better" : "Higher is better"}
            </span>
          </div>
          <ol className="flex flex-col">
            {ranked.length === 0 ? (
              <li className="py-2 text-[12px] text-[color:var(--color-text-tertiary)]">
                No zips have a value for this metric.
              </li>
            ) : (
              ranked.map(({ p, v }, i) => (
                <li key={p.zip}>
                  <button
                    type="button"
                    onClick={() => flyTo(p)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
                      highlightZip === p.zip
                        ? "bg-[color:var(--color-jbp-blue)]/10"
                        : "hover:bg-[color:var(--color-surface-hover)]",
                    )}
                  >
                    <span className="w-5 text-[10px] font-semibold tabular-nums text-[color:var(--color-text-tertiary)]">
                      #{i + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 rounded-full"
                      style={{ background: colorFor(p) }}
                    />
                    <span className="flex-1 font-mono text-[12px] tabular-nums text-[color:var(--color-text-primary)]">
                      {p.zip}
                    </span>
                    <span className="font-mono text-[12px] font-semibold tabular-nums text-[color:var(--color-text-primary)]">
                      {metric.format(v)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ol>
        </aside>
      </div>

      {/* Full data table */}
      <ZipTable rows={placed} metric={metric} onRowClick={flyTo} />

      {orphans.length > 0 ? (
        <div className="text-[11px] text-[color:var(--color-text-tertiary)]">
          {orphans.length} ZIP{orphans.length === 1 ? "" : "s"} without a
          known centroid (not on the map):{" "}
          {orphans
            .slice(0, 8)
            .map((o) => `${o.zip} (${o.leads})`)
            .join(", ")}
          {orphans.length > 8 ? ` +${orphans.length - 8} more` : ""}
        </div>
      ) : null}
    </div>
  );
}

interface ZipTableProps {
  rows: PlacedZip[];
  metric: MetricDef;
  onRowClick: (z: PlacedZip) => void;
}

type SortKey =
  | "zip"
  | "leads"
  | "bookedJobs"
  | "sales"
  | "allocatedSpend"
  | "cpl"
  | "cpBooked";

function ZipTable({ rows, metric, onRowClick }: ZipTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "leads",
    dir: "desc",
  });
  const [page, setPage] = useState(0);
  const PAGE = 25;

  const value = (r: PlacedZip, key: SortKey): number | string => {
    switch (key) {
      case "zip":
        return r.zip;
      case "leads":
        return r.leads;
      case "bookedJobs":
        return r.bookedJobs;
      case "sales":
        return r.sales;
      case "allocatedSpend":
        return r.allocatedSpend;
      case "cpl":
        return r.leads > 0 ? r.allocatedSpend / r.leads : Number.POSITIVE_INFINITY;
      case "cpBooked":
        return r.bookedJobs > 0
          ? r.allocatedSpend / r.bookedJobs
          : Number.POSITIVE_INFINITY;
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = value(a, sort.key);
      const bv = value(b, sort.key);
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (av as number) - (bv as number);
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const maxLeads = Math.max(1, ...rows.map((r) => r.leads));
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE;
  const pageRows = sorted.slice(start, start + PAGE);

  function toggle(key: SortKey) {
    setPage(0);
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : {
            key,
            dir: key === "zip" ? "asc" : "desc",
          },
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-[color:var(--color-border-subtle)]">
              <Th k="zip" sort={sort} onClick={toggle}>
                ZIP
              </Th>
              <Th k="leads" sort={sort} onClick={toggle} align="right">
                Leads
              </Th>
              <Th k="bookedJobs" sort={sort} onClick={toggle} align="right">
                Booked
              </Th>
              <Th k="sales" sort={sort} onClick={toggle} align="right">
                Sales
              </Th>
              <Th k="allocatedSpend" sort={sort} onClick={toggle} align="right">
                Spend (allocated)
              </Th>
              <Th k="cpl" sort={sort} onClick={toggle} align="right">
                CPL
              </Th>
              <Th k="cpBooked" sort={sort} onClick={toggle} align="right">
                Cost / Booked
              </Th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                Lead share
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((p) => {
              const cpl =
                p.leads > 0 ? p.allocatedSpend / p.leads : null;
              const cpb =
                p.bookedJobs > 0 ? p.allocatedSpend / p.bookedJobs : null;
              const share = (p.leads / maxLeads) * 100;
              return (
                <tr
                  key={p.zip}
                  onClick={() => onRowClick(p)}
                  className="cursor-pointer border-b border-[color:var(--color-border-subtle)] last:border-b-0 transition-colors hover:bg-[color:var(--color-surface-hover)]"
                >
                  <td className="px-3 py-2.5 font-mono tabular-nums text-[color:var(--color-text-primary)]">
                    {p.zip}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatInt(p.leads)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatInt(p.bookedJobs)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatCurrency(p.sales)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatCurrency(p.allocatedSpend, true)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {cpl !== null ? formatCurrency(cpl, true) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {cpb !== null ? formatCurrency(cpb, true) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="relative h-2 w-24 overflow-hidden rounded-full bg-[color:var(--color-surface-hover)]">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{
                            width: `${share.toFixed(1)}%`,
                            background: metric.highIsBad
                              ? "var(--color-jbp-red)"
                              : "var(--color-jbp-blue)",
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] tabular-nums text-[color:var(--color-text-tertiary)]">
                        {share.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > PAGE ? (
        <div className="flex items-center justify-between border-t border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 px-4 py-2 text-[11px] tabular-nums text-[color:var(--color-text-secondary)]">
          <span>
            {start + 1}–{Math.min(start + PAGE, sorted.length)} of{" "}
            {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2.5 py-1 font-medium transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded-md border border-[color:var(--color-border-subtle)] bg-white px-2.5 py-1 font-medium transition-colors hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Th({
  k,
  sort,
  onClick,
  align = "left",
  children,
}: {
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const active = sort.key === k;
  const Icon = active
    ? sort.dir === "asc"
      ? ArrowUp
      : ArrowDown
    : ChevronsUpDown;
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-[color:var(--color-text-primary)]",
          align === "right" && "ml-auto",
          active && "text-[color:var(--color-text-primary)]",
        )}
      >
        {children}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}

// useMap is imported but only used for type-check chiseling; export to avoid
// unused-import lint complaints when the file evolves.
export { useMap };
