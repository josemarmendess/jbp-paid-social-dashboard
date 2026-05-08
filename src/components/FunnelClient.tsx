"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import {
  Card,
  CardHeader,
  Delta,
  Eyebrow,
} from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import {
  computeFunnel,
  computeOverviewKpis,
  type FunnelMetrics,
  type OverviewKpiTotals,
} from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import { formatCompactInt, pctChange } from "@/lib/format";
import type { DateRangePreset } from "@/lib/types";

interface FunnelClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function FunnelClient({
  businessUnits,
  initialState,
}: FunnelClientProps) {
  const { data, error } = usePaidSocialData();
  const [preset, setPreset] = useState<DateRangePreset>(initialState.preset);
  const [customStart, setCustomStart] = useState<string | undefined>(
    initialState.customStart,
  );
  const [customEnd, setCustomEnd] = useState<string | undefined>(
    initialState.customEnd,
  );
  const [bu, setBu] = useState<string[]>(initialState.bu);
  const [view, setView] = useState<ServiceView>(initialState.view);

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu, view]);

  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );
  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => {
      const funnel = computeFunnel(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      );
      const current = computeOverviewKpis(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      );
      const previous = computeOverviewKpis(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.previous,
        slice.bu,
      );
      return { slice, funnel, current, previous };
    });
  }, [data, slices, period]);

  if (!data) {
    return (
      <main style={{ flex: 1 }}>
        <ErrorBanner message={error ?? "Try refreshing."} />
        <div
          style={{
            padding: "64px 24px",
            textAlign: "center",
            color: "var(--color-jbp-text-3)",
            fontSize: 13,
          }}
        >
          No data available.
        </div>
      </main>
    );
  }

  return (
    <>
      <ClientPageHeader
        pageTitle="Funnel"
        preset={preset}
        customStart={customStart}
        customEnd={customEnd}
        onDateChange={({ preset: nextPreset, start, end }) => {
          setPreset(nextPreset);
          setCustomStart(start);
          setCustomEnd(end);
        }}
        businessUnits={businessUnits}
        bu={bu}
        onBuChange={setBu}
        view={view}
        onViewChange={setView}
      />
      <div
        style={{
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {sliceData.map(({ slice, funnel, current, previous }) => (
          <FunnelSlice
            key={slice.key}
            sliceLabel={slices.length > 1 ? slice.label : null}
            funnel={funnel}
            current={current}
            previous={previous}
          />
        ))}
      </div>
    </>
  );
}

function FunnelSlice({
  sliceLabel,
  funnel,
  current,
  previous,
}: {
  sliceLabel: string | null;
  funnel: FunnelMetrics;
  current: OverviewKpiTotals;
  previous: OverviewKpiTotals;
}) {
  const e2e =
    funnel.impressions > 0
      ? (funnel.soldJobs / funnel.impressions) * 100
      : 0;
  const stages = [
    {
      key: "impressions",
      label: "Impressions",
      value: funnel.impressions,
      prev: null as string | null,
      color: "var(--color-jbp-text-2)",
      rateLabel: "",
    },
    {
      key: "clicks",
      label: "Link Clicks",
      value: funnel.linkClicks,
      prev: "impressions",
      color: "var(--color-jbp-navy)",
      rateLabel: "CTR",
    },
    {
      key: "leads",
      label: "Leads",
      value: funnel.leads,
      prev: "clicks",
      color: "var(--color-jbp-red)",
      rateLabel: "Lead rate",
    },
    {
      key: "booked",
      label: "Booked",
      value: funnel.bookedJobs,
      prev: "leads",
      color: "var(--color-jbp-red)",
      rateLabel: "Book rate",
    },
    {
      key: "sold",
      label: "Sold",
      value: funnel.soldJobs,
      prev: "booked",
      color: "var(--color-jbp-ink)",
      rateLabel: "Close rate",
    },
  ];
  const valueByKey: Record<string, number> = {
    impressions: funnel.impressions,
    clicks: funnel.linkClicks,
    leads: funnel.leads,
    booked: funnel.bookedJobs,
    sold: funnel.soldJobs,
  };
  const max = funnel.impressions || 1;

  const d = (curr: number, prev: number) => pctChange(curr, prev) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {sliceLabel ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <Eyebrow size={11}>{sliceLabel}</Eyebrow>
          <span
            style={{
              flex: 1,
              height: 1,
              background: "var(--color-jbp-hairline)",
            }}
          />
        </div>
      ) : null}
      <Card>
        <CardHeader
          eyebrow="Full funnel · this period"
          title="From impression to sale"
          sub={`${formatCompactInt(funnel.impressions)} impressions yielded ${funnel.soldJobs} sale${funnel.soldJobs === 1 ? "" : "s"} — ${e2e.toFixed(4)}% end-to-end`}
        />
        <div style={{ padding: "32px 28px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              alignItems: "center",
            }}
          >
            {stages.map((s) => {
              const widthPct = Math.max(
                Math.pow(s.value / max, 0.55) * 100,
                6,
              );
              const dropRate =
                s.prev && valueByKey[s.prev] > 0
                  ? (s.value / valueByKey[s.prev]) * 100
                  : null;
              return (
                <div
                  key={s.key}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {dropRate != null ? (
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--color-jbp-text-3)",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      ↓ {dropRate.toFixed(2)}% pass through · {s.rateLabel}
                    </div>
                  ) : null}
                  <div
                    style={{
                      width: widthPct + "%",
                      maxWidth: "100%",
                      minHeight: 56,
                      background: s.color,
                      color: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0 24px",
                      transition: "all .2s",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 1.4,
                        textTransform: "uppercase",
                        opacity: 0.85,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: "var(--font-display)",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: -0.6,
                      }}
                    >
                      {formatCompactInt(s.value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 4-up stage rate cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <RateCard
          label="Click-through Rate"
          value={current.ctr}
          delta={d(current.ctr, previous.ctr)}
          sub={`${formatCompactInt(funnel.linkClicks)} of ${formatCompactInt(funnel.impressions)}`}
        />
        <RateCard
          label="Lead Rate"
          value={current.leadRate}
          delta={d(current.leadRate, previous.leadRate)}
          sub={`${funnel.leads} of ${formatCompactInt(funnel.linkClicks)}`}
        />
        <RateCard
          label="Book Rate"
          value={current.bookRate}
          delta={d(current.bookRate, previous.bookRate)}
          sub={`${funnel.bookedJobs} of ${funnel.leads}`}
        />
        <RateCard
          label="Close Rate"
          value={current.closeRate}
          delta={d(current.closeRate, previous.closeRate)}
          sub={`${funnel.soldJobs} of ${funnel.bookedJobs}`}
        />
      </div>

      {/* Drop-off table */}
      <Card>
        <CardHeader eyebrow="Drop-off analysis" title="Where the funnel leaks" />
        <div style={{ padding: 20 }}>
          <DropOffTable funnel={funnel} />
        </div>
      </Card>
    </div>
  );
}

function RateCard({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  /** Ratio 0-1; we render as percent. */
  value: number;
  delta: number;
  sub: string;
}) {
  const pct = value * 100;
  return (
    <div
      style={{
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: "var(--color-jbp-text-2)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginTop: 4,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            letterSpacing: -0.8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct > 0 ? pct.toFixed(1) : "—"}
          {pct > 0 ? (
            <span style={{ fontSize: 18, color: "var(--color-jbp-text-2)" }}>%</span>
          ) : null}
        </span>
        <Delta value={delta} />
      </div>
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          color: "var(--color-jbp-text-3)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function DropOffTable({ funnel }: { funnel: FunnelMetrics }) {
  const rows = [
    {
      from: "Impressions",
      to: "Clicks",
      lost: funnel.impressions - funnel.linkClicks,
      pct:
        funnel.impressions > 0
          ? ((funnel.impressions - funnel.linkClicks) / funnel.impressions) *
            100
          : 0,
      note: "Scrolled past or didn't tap",
    },
    {
      from: "Clicks",
      to: "Leads",
      lost: funnel.linkClicks - funnel.leads,
      pct:
        funnel.linkClicks > 0
          ? ((funnel.linkClicks - funnel.leads) / funnel.linkClicks) * 100
          : 0,
      note: "Bounced from landing or call form",
    },
    {
      from: "Leads",
      to: "Booked",
      lost: funnel.leads - funnel.bookedJobs,
      pct:
        funnel.leads > 0
          ? ((funnel.leads - funnel.bookedJobs) / funnel.leads) * 100
          : 0,
      note: "No appointment scheduled",
    },
    {
      from: "Booked",
      to: "Sold",
      lost: funnel.bookedJobs - funnel.soldJobs,
      pct:
        funnel.bookedJobs > 0
          ? ((funnel.bookedJobs - funnel.soldJobs) / funnel.bookedJobs) * 100
          : 0,
      note: "Cancelled, no-show, or didn't convert on site",
    },
  ];
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12,
      }}
    >
      <thead>
        <tr style={{ borderBottom: "1px solid var(--color-jbp-hairline)" }}>
          {["Stage transition", "Lost", "Drop-off rate", "Likely cause"].map(
            (h) => (
              <th
                key={h}
                style={{
                  padding: "10px 0",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: "var(--color-jbp-text-2)",
                }}
              >
                {h}
              </th>
            ),
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.from}
            style={{
              borderBottom: "1px solid var(--color-jbp-hairline-soft)",
            }}
          >
            <td style={{ padding: "12px 0", fontWeight: 600 }}>
              {r.from} → {r.to}
            </td>
            <td
              style={{
                padding: "12px 0",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {formatCompactInt(r.lost)}
            </td>
            <td
              style={{
                padding: "12px 0",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
                color: "var(--color-jbp-bad)",
              }}
            >
              {r.pct.toFixed(1)}%
            </td>
            <td
              style={{
                padding: "12px 0",
                color: "var(--color-jbp-text-2)",
                fontStyle: "italic",
              }}
            >
              {r.note}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
