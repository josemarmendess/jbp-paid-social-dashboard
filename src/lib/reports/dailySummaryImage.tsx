import {
  computePivotMetrics,
  type BusinessUnit,
  type PivotMetrics,
} from "@/lib/aggregate";
import {
  formatCompactInt,
  formatCompactMoney,
  formatCurrency,
  formatInt,
} from "@/lib/format";
import { getPivotPeriods } from "@/lib/periods";
import { PIVOT_ROWS } from "@/lib/pivotConfig";
import {
  DAILY_SUMMARY_DEFAULT_CONFIG,
  DAILY_SUMMARY_PERIODS,
  DAILY_SUMMARY_SERVICES,
  type DailySummaryConfig,
  type DailySummaryPeriod,
} from "@/lib/reportTemplates";
import type { PaidSocialPayload } from "@/lib/types";

/**
 * Satori-compatible JSX layout for the Daily Summary report. Same visual
 * language as DailySummaryReport.tsx (the browser version) but no <table>
 * elements — Satori only renders flex/inline-block divs. Color and font
 * tokens are hardcoded inline because Satori doesn't resolve CSS variables.
 *
 * Used by /api/reports/cron-daily-summary to generate the PNG attachment
 * server-side via next/og's ImageResponse.
 */

// Inlined color tokens — stay in lockstep with src/app/globals.css. Satori
// doesn't resolve CSS variables, so each value lives here verbatim.
const COLORS = {
  red: "#c41e1e",
  cream: "#f4ede0",
  paper: "#fbf7ec",
  white: "#ffffff",
  ink: "#1a1410",
  inkSoft: "#3a302a",
  text: "#1a1410",
  text2: "rgba(26, 20, 16, 0.62)",
  text3: "rgba(26, 20, 16, 0.38)",
  hairline: "rgba(26, 20, 16, 0.10)",
  hairlineSoft: "rgba(26, 20, 16, 0.06)",
};

// Slice tone tokens — match src/lib/sliceColors.ts.
const SLICE_TONES: Record<
  string,
  { bg: string; border: string; rail: string; text: string; chipBg: string; chipText: string }
> = {
  total: {
    bg: "rgba(196, 30, 30, 0.07)",
    border: "rgba(196, 30, 30, 0.4)",
    rail: "#c41e1e",
    text: "#7f1d1d",
    chipBg: "rgba(196, 30, 30, 0.16)",
    chipText: "#7f1d1d",
  },
  bathrooms: {
    bg: "rgba(217, 119, 6, 0.08)",
    border: "rgba(217, 119, 6, 0.35)",
    rail: "rgb(217, 119, 6)",
    text: "rgb(146, 64, 14)",
    chipBg: "rgba(217, 119, 6, 0.18)",
    chipText: "rgb(146, 64, 14)",
  },
  sewers: {
    bg: "rgba(14, 116, 144, 0.08)",
    border: "rgba(14, 116, 144, 0.35)",
    rail: "rgb(14, 116, 144)",
    text: "rgb(15, 76, 92)",
    chipBg: "rgba(14, 116, 144, 0.18)",
    chipText: "rgb(15, 76, 92)",
  },
  neutral: {
    bg: "rgba(249, 243, 236, 0.5)",
    border: "rgba(26, 20, 16, 0.10)",
    rail: "rgba(26, 20, 16, 0.10)",
    text: "#1a1410",
    chipBg: "rgba(149, 142, 131, 0.12)",
    chipText: "rgba(26, 20, 16, 0.62)",
  },
};

function toneFor(sliceKey: string): keyof typeof SLICE_TONES {
  if (sliceKey === "all") return "total";
  const k = sliceKey.toLowerCase();
  if (k.includes("bath")) return "bathrooms";
  if (k.includes("sewer")) return "sewers";
  return "neutral";
}

interface DailySummaryImageProps {
  data: PaidSocialPayload;
  config?: DailySummaryConfig;
  /** Stamp shown in the header — formatted ISO. */
  stamp?: string;
}

// Image dimensions — tuned for 3 services × 7 periods × 9 metrics.
export const IMAGE_WIDTH = 1200;
export const IMAGE_HEIGHT = 1700;

export function DailySummaryImage({
  data,
  config = DAILY_SUMMARY_DEFAULT_CONFIG,
  stamp,
}: DailySummaryImageProps) {
  const periods = getPivotPeriods();
  const periodByKey: Record<string, (typeof periods)[number]> = {};
  for (const p of periods) periodByKey[p.key] = p;

  // Materialise every (service, period) cell up-front.
  const cells: Record<string, PivotMetrics> = {};
  for (const sliceKey of config.services) {
    const bu: BusinessUnit = sliceKey === "all" ? [] : [sliceKey];
    for (const periodKey of config.periods) {
      const range = periodByKey[periodKey]?.range;
      if (!range) continue;
      cells[`${sliceKey}|${periodKey}`] = computePivotMetrics(
        data.meta_insights,
        data.servicetitan_social_leads,
        range,
        bu,
      );
    }
  }

  const visibleRows = config.metrics
    .map((m) => PIVOT_ROWS.find((r) => r.key === m))
    .filter((r): r is (typeof PIVOT_ROWS)[number] => r !== undefined);

  return (
    <div
      style={{
        background: COLORS.cream,
        padding: "32px 36px",
        fontFamily: "Inter, sans-serif",
        color: COLORS.text,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          paddingBottom: 16,
          borderBottom: `2px solid ${COLORS.ink}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: COLORS.red,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            JBP Paid Social · Report
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              fontFamily: "Archivo, sans-serif",
              letterSpacing: -0.8,
              lineHeight: 1.1,
              marginTop: 4,
            }}
          >
            {config.title}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            fontSize: 11,
            color: COLORS.text2,
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: 0.4,
          }}
        >
          <div>Generated</div>
          <div>{stamp ?? data.generated_at}</div>
        </div>
      </div>

      {/* Service sections */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          paddingTop: 20,
        }}
      >
        {config.services.map((sliceKey, idx) => {
          const def = DAILY_SUMMARY_SERVICES.find((s) => s.key === sliceKey);
          if (!def) return null;
          return (
            <div
              key={sliceKey}
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: idx === 0 ? 0 : 20,
              }}
            >
              <ServiceSection
                sliceKey={sliceKey}
                label={def.label}
                periods={config.periods}
                periodByKey={periodByKey}
                rows={visibleRows}
                cells={cells}
                heroPeriod={config.heroPeriod}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: 16,
          borderTop: `1px solid ${COLORS.hairline}`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: COLORS.text3,
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        <div>America/Chicago · Meta Ads ↔ ServiceTitan</div>
        <div>Make a Good Call · J. Blanton Plumbing · Est. 1993</div>
      </div>
    </div>
  );
}

function ServiceSection({
  sliceKey,
  label,
  periods,
  periodByKey,
  rows,
  cells,
  heroPeriod,
}: {
  sliceKey: string;
  label: string;
  periods: ReadonlyArray<DailySummaryPeriod>;
  periodByKey: Record<string, ReturnType<typeof getPivotPeriods>[number]>;
  rows: ReadonlyArray<(typeof PIVOT_ROWS)[number]>;
  cells: Record<string, PivotMetrics>;
  heroPeriod: DailySummaryPeriod | null;
}) {
  const tone = SLICE_TONES[toneFor(sliceKey)];
  // Each metric row gets the same column structure: 220px fixed for the
  // metric label, then equal flex distribution across the period columns.
  const labelW = 220;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: COLORS.white,
        border: `1px solid ${COLORS.hairline}`,
      }}
    >
      {/* Slice header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          background: tone.bg,
          borderBottom: `1px solid ${tone.border}`,
          borderLeft: `3px solid ${tone.rail}`,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "Archivo, sans-serif",
            letterSpacing: 0,
            color: tone.text,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "1px 7px",
            marginLeft: 12,
            background: tone.chipBg,
            color: tone.chipText,
            fontSize: 9,
            fontWeight: 700,
            fontFamily: "JetBrains Mono, monospace",
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {sliceKey === "all" ? "Total" : "Service line"}
        </div>
      </div>

      {/* Header row */}
      <div
        style={{
          display: "flex",
          background: COLORS.paper,
          borderBottom: `1px solid ${COLORS.hairline}`,
        }}
      >
        <div
          style={{
            display: "flex",
            width: labelW,
            padding: "8px 12px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: COLORS.text2,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          Metric
        </div>
        {periods.map((p) => {
          const def = periodByKey[p];
          const isHero = heroPeriod === p;
          return (
            <div
              key={p}
              style={{
                display: "flex",
                flex: 1,
                padding: "8px 12px",
                justifyContent: "flex-end",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                background: isHero ? COLORS.ink : "transparent",
                color: isHero ? COLORS.cream : COLORS.text2,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {def?.label?.toUpperCase() ?? p}
            </div>
          );
        })}
      </div>

      {/* Metric rows */}
      {rows.map((row, rowIdx) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            borderTop:
              rowIdx > 0 ? `1px solid ${COLORS.hairlineSoft}` : "none",
          }}
        >
          <div
            style={{
              display: "flex",
              width: labelW,
              padding: "9px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.text,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {row.label}
          </div>
          {periods.map((p) => {
            const cell = cells[`${sliceKey}|${p}`];
            const value = cell ? row.pick(cell) : null;
            const isHero = heroPeriod === p;
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  flex: 1,
                  padding: "9px 12px",
                  justifyContent: "flex-end",
                  background: isHero ? COLORS.paper : "transparent",
                  fontSize: 12,
                  fontWeight: isHero ? 700 : 600,
                  fontFamily: "JetBrains Mono, monospace",
                  color: COLORS.text,
                }}
              >
                {formatCellValue(row.kind, value)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function formatCellValue(
  kind: (typeof PIVOT_ROWS)[number]["kind"],
  value: number | null,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (kind) {
    case "currency":
      return formatCompactMoney(value);
    case "currency-precise":
      return formatCurrency(value, true);
    case "int":
      return value >= 1000 ? formatCompactInt(value) : formatInt(value);
    case "percent":
      return value.toFixed(1) + "%";
    case "roas":
      return value.toFixed(2) + "x";
    case "days":
      return value.toFixed(1) + "d";
  }
}

// Re-export so the renderer can access at runtime without a roundtrip.
export { DAILY_SUMMARY_PERIODS };
