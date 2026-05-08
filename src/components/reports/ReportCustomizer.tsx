"use client";

import { Eyebrow } from "@/components/design";
import { PIVOT_ROWS } from "@/lib/pivotConfig";
import {
  DAILY_SUMMARY_PERIODS,
  DAILY_SUMMARY_SERVICES,
  type DailySummaryConfig,
  type DailySummaryMetric,
  type DailySummaryPeriod,
} from "@/lib/reportTemplates";

/**
 * Left-side panel that drives the Daily Summary report. Pure presentation —
 * the parent owns the config state. Each toggle group is a Checkbox list
 * keyed off the canonical catalogs, so adding a metric to PIVOT_ROWS or a
 * period to DAILY_SUMMARY_PERIODS makes it appear here automatically.
 */

export function ReportCustomizer({
  config,
  onChange,
  onTitleChange,
  onHeroPeriodChange,
}: {
  config: DailySummaryConfig;
  onChange: (next: DailySummaryConfig) => void;
  onTitleChange: (title: string) => void;
  onHeroPeriodChange: (next: DailySummaryPeriod | null) => void;
}) {
  const toggleService = (key: string) => {
    const has = config.services.includes(key);
    const next = has
      ? config.services.filter((s) => s !== key)
      : [...config.services, key];
    onChange({ ...config, services: next });
  };

  const togglePeriod = (key: DailySummaryPeriod) => {
    const has = config.periods.includes(key);
    let next: DailySummaryPeriod[];
    if (has) {
      next = config.periods.filter((p) => p !== key);
    } else {
      // Insert in canonical order (DAILY_SUMMARY_PERIODS) so toggling
      // back on doesn't shuffle the report layout.
      const order = DAILY_SUMMARY_PERIODS.map((p) => p.key);
      next = order.filter(
        (p) => config.periods.includes(p) || p === key,
      );
    }
    let heroPeriod = config.heroPeriod;
    if (heroPeriod && !next.includes(heroPeriod)) heroPeriod = null;
    onChange({ ...config, periods: next, heroPeriod });
  };

  const toggleMetric = (key: DailySummaryMetric) => {
    const has = config.metrics.includes(key);
    let next: DailySummaryMetric[];
    if (has) {
      next = config.metrics.filter((m) => m !== key);
    } else {
      const order = PIVOT_ROWS.map((r) => r.key) as DailySummaryMetric[];
      next = order.filter(
        (m) => config.metrics.includes(m) || m === key,
      );
    }
    onChange({ ...config, metrics: next });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: "20px 18px",
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Eyebrow>Title</Eyebrow>
        <input
          type="text"
          value={config.title}
          onChange={(e) => onTitleChange(e.currentTarget.value)}
          style={{
            height: 32,
            padding: "0 10px",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            background: "var(--color-jbp-paper)",
            border: "1px solid var(--color-jbp-hairline)",
            color: "var(--color-jbp-text)",
            outline: "none",
          }}
        />
      </div>

      <Section label="Services">
        {DAILY_SUMMARY_SERVICES.map((svc) => (
          <Checkbox
            key={svc.key}
            label={svc.label}
            checked={config.services.includes(svc.key)}
            onToggle={() => toggleService(svc.key)}
          />
        ))}
      </Section>

      <Section label="Periods">
        {DAILY_SUMMARY_PERIODS.map((p) => (
          <Checkbox
            key={p.key}
            label={p.label}
            checked={config.periods.includes(p.key)}
            onToggle={() => togglePeriod(p.key)}
          />
        ))}
      </Section>

      <Section
        label="Hero column"
        hint="Highlights one period as the focal point of the report."
      >
        <select
          value={config.heroPeriod ?? "__none__"}
          onChange={(e) => {
            const v = e.currentTarget.value;
            onHeroPeriodChange(
              v === "__none__" ? null : (v as DailySummaryPeriod),
            );
          }}
          style={{
            height: 30,
            padding: "0 8px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: 0.6,
            background: "var(--color-jbp-paper)",
            border: "1px solid var(--color-jbp-hairline)",
            color: "var(--color-jbp-text)",
            width: "100%",
            outline: "none",
          }}
        >
          <option value="__none__">None</option>
          {DAILY_SUMMARY_PERIODS.filter((p) =>
            config.periods.includes(p.key),
          ).map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </Section>

      <Section label={`Metrics · ${config.metrics.length}/${PIVOT_ROWS.length}`}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            maxHeight: 320,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {PIVOT_ROWS.map((r) => (
            <Checkbox
              key={r.key}
              label={r.label}
              checked={config.metrics.includes(r.key as DailySummaryMetric)}
              onToggle={() =>
                toggleMetric(r.key as DailySummaryMetric)
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      {hint ? (
        <span
          style={{
            fontSize: 10,
            color: "var(--color-jbp-text-3)",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.4,
          }}
        >
          {hint}
        </span>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 6px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontSize: 12,
        color: "var(--color-jbp-text)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          border: `1px solid ${
            checked ? "var(--color-jbp-red)" : "var(--color-jbp-hairline)"
          }`,
          background: checked ? "var(--color-jbp-red)" : "transparent",
          flexShrink: 0,
        }}
      >
        {checked ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 14 14"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7.2 5.8 10 11 4.2" />
          </svg>
        ) : null}
      </span>
      <span>{label}</span>
    </button>
  );
}
