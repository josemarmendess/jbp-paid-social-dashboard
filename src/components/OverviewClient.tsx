"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DualLineChart,
  DayOfWeekBars,
  HorizontalFunnel,
  RoasMeter,
  SpendRevenueChart,
  type DualLinePoint,
  type SpendRevenuePoint,
} from "@/components/charts";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import {
  Card,
  CardHeader,
  Delta,
  Eyebrow,
  HeroKpi,
  Metric,
} from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import {
  cancellationRateSeries,
  computeFunnel,
  computeOverviewKpis,
  dailyKpiSeries,
  dailySpendVsRevenue,
  detectAnomalies,
  type Anomaly,
  type OverviewKpiTotals,
} from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import {
  formatCompactInt,
  formatCompactMoney,
  formatCurrency,
  formatInt,
  formatPercent,
  pctChange,
} from "@/lib/format";
import type { GoalTargets } from "@/lib/goals";
import { rollingDaysList } from "@/lib/periods";
import type { DateRangePreset } from "@/lib/types";

interface OverviewClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
    pivotRowKeys: string[];
    pivotColKeys: string[];
    targets: GoalTargets;
  };
}

export function OverviewClient({
  businessUnits,
  initialState,
}: OverviewClientProps) {
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
  const targets = initialState.targets;

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    if (targets.cplTarget != null)
      sp.set("cplTarget", String(targets.cplTarget));
    if (targets.roasTarget != null)
      sp.set("roasTarget", String(targets.roasTarget));
    if (targets.cancelTarget != null)
      sp.set("cancelTarget", String(targets.cancelTarget));
    replaceQuery(sp.toString());
  }, [
    preset,
    customStart,
    customEnd,
    bu,
    view,
    targets.cplTarget,
    targets.roasTarget,
    targets.cancelTarget,
  ]);

  const period = useMemo(
    () => getPeriod(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );
  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);
  const sparkDates14 = useMemo(() => rollingDaysList(14), []);
  const trendDates30 = useMemo(() => rollingDaysList(30), []);
  const dowDates = useMemo(() => rollingDaysList(30), []);
  const anomalyDates30 = useMemo(() => rollingDaysList(30), []);

  const anomalies: Anomaly[] = useMemo(() => {
    if (!data) return [];
    const rows = dailyKpiSeries(
      data.meta_insights,
      data.servicetitan_social_leads,
      anomalyDates30,
      [],
    );
    return detectAnomalies(rows);
  }, [data, anomalyDates30]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => {
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
      const sparkRows14 = dailyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        sparkDates14,
        slice.bu,
      );
      const trend30 = dailySpendVsRevenue(
        data.meta_insights,
        data.servicetitan_social_leads,
        trendDates30,
        slice.bu,
      );
      const trendData: SpendRevenuePoint[] = trend30.map((p) => ({
        d: p.date.slice(5),
        spend: p.spend,
        revenue: p.revenue,
      }));
      const funnel = computeFunnel(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      );
      const cancelWeekly = cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "week",
        8,
      );
      const cancelDual: DualLinePoint[] = cancelWeekly.map((p, i, arr) => ({
        bucket: p.bucket.replace(/^\d{4}-/, ""),
        current: p.rate,
        previous: i >= 4 ? arr[i - 4]?.rate ?? null : null,
      }));
      const dowSeries = dailyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        dowDates,
        slice.bu,
      );
      const dowAvg = aggregateDayOfWeek(dowSeries);
      return {
        slice,
        current,
        previous,
        revenueSpark: sparkRows14.map((r) => r.sales),
        spendSpark: sparkRows14.map((r) => r.spend),
        trend: trendData,
        funnel,
        cancelDual,
        dowAvg,
      };
    });
  }, [
    data,
    slices,
    period,
    sparkDates14,
    trendDates30,
    dowDates,
  ]);

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
        pageTitle="Overview"
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
        {anomalies.length > 0 ? <AlertsStrip anomalies={anomalies} /> : null}
        {sliceData.map((s, i) => (
          <SliceContent
            key={s.slice.key}
            sliceLabel={slices.length > 1 ? s.slice.label : null}
            current={s.current}
            previous={s.previous}
            revenueSpark={s.revenueSpark}
            spendSpark={s.spendSpark}
            trend={s.trend}
            funnel={s.funnel}
            cancelDual={s.cancelDual}
            dowAvg={s.dowAvg}
            roasTarget={targets.roasTarget ?? 5}
            isFirst={i === 0}
          />
        ))}
      </div>
    </>
  );
}

/* ───────────────────────────── Slice block ───────────────────────────── */

function SliceContent({
  sliceLabel,
  current,
  previous,
  revenueSpark,
  spendSpark,
  trend,
  funnel,
  cancelDual,
  dowAvg,
  roasTarget,
}: {
  sliceLabel: string | null;
  current: OverviewKpiTotals;
  previous: OverviewKpiTotals;
  revenueSpark: number[];
  spendSpark: number[];
  trend: SpendRevenuePoint[];
  funnel: { impressions: number; linkClicks: number; leads: number; bookedJobs: number; soldJobs: number };
  cancelDual: DualLinePoint[];
  dowAvg: { day: string; value: number }[];
  roasTarget: number;
  isFirst: boolean;
}) {
  const roas = current.spend > 0 ? current.sales / current.spend : 0;
  const avgSale = current.soldJobs > 0 ? current.sales / current.soldJobs : 0;
  const spendOnRev = current.sales > 0 ? (current.spend / current.sales) * 100 : null;

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
      {/* Hero KPIs — 3-up: Spend / Revenue (accent) / Spend on Revenue. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
        }}
      >
        <HeroKpi
          label="Spend"
          value={formatCurrency(current.spend)}
          delta={d(current.spend, previous.spend)}
          invertDelta
          spark={spendSpark}
          sub={`${formatCurrency(current.costPerLead)} per lead`}
        />
        <HeroKpi
          label="Sales Revenue"
          value={formatCompactMoney(current.sales)}
          delta={d(current.sales, previous.sales)}
          spark={revenueSpark}
          sub={`${roas.toFixed(1)}x ROAS · ${formatCurrency(avgSale)} avg sale`}
          accent
        />
        <HeroKpi
          label="Spend / Revenue"
          value={spendOnRev != null ? `${spendOnRev.toFixed(1)}%` : "—"}
          delta={d(current.spendOnRevenue, previous.spendOnRevenue)}
          invertDelta
          sub={
            spendOnRev != null
              ? `${(100 - spendOnRev).toFixed(1)}% margin · lower is better`
              : "no revenue yet"
          }
        />
      </div>

      {/* Performance over time — 6-up volume + cost */}
      <Card>
        <CardHeader eyebrow="Performance over time" title="The full picture" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            borderTop: "1px solid var(--color-jbp-hairline)",
          }}
        >
          <Metric
            label="Leads"
            value={formatInt(current.leads)}
            delta={d(current.leads, previous.leads)}
          />
          <Metric
            label="Cost / Lead"
            value={
              current.costPerLead > 0
                ? formatCurrency(current.costPerLead, true)
                : "—"
            }
            delta={d(current.costPerLead, previous.costPerLead)}
            invertDelta
          />
          <Metric
            label="Booked Jobs"
            value={formatInt(current.bookedJobs)}
            delta={d(current.bookedJobs, previous.bookedJobs)}
            hero
          />
          <Metric
            label="Cost / Booked"
            value={
              current.costPerBookedJob > 0
                ? formatCurrency(current.costPerBookedJob, true)
                : "—"
            }
            delta={d(current.costPerBookedJob, previous.costPerBookedJob)}
            invertDelta
          />
          <Metric
            label="Spend / Revenue"
            value={spendOnRev != null ? `${spendOnRev.toFixed(1)}%` : "—"}
            delta={d(current.spendOnRevenue, previous.spendOnRevenue)}
            invertDelta
          />
          <Metric
            label="Avg Sale"
            value={avgSale > 0 ? formatCompactMoney(avgSale) : "—"}
            last
          />
        </div>
      </Card>

      {/* Trends */}
      <Card>
        <CardHeader
          eyebrow="Trends"
          title="Daily Spend vs Revenue"
          sub="last 30 days · revenue attributed by close date"
          right={
            <ChartLegend
              items={[
                { color: "var(--color-jbp-red)", label: "Spend", style: "block" },
                { color: "var(--color-jbp-navy)", label: "Revenue", style: "line" },
              ]}
            />
          }
        />
        <div style={{ padding: "20px 16px 8px" }}>
          <SpendRevenueChart data={trend} />
        </div>
      </Card>

      {/* Conversion rates — 6-up */}
      <Card>
        <CardHeader
          eyebrow="Conversion rates"
          title="The funnel in percentages"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
          }}
        >
          <Metric
            label="CTR"
            value={current.ctr ? formatPercent(current.ctr) : "—"}
            delta={d(current.ctr, previous.ctr)}
            compact
          />
          <Metric
            label="Lead Rate"
            value={current.leadRate ? formatPercent(current.leadRate) : "—"}
            delta={d(current.leadRate, previous.leadRate)}
            compact
          />
          <Metric
            label="Book Rate"
            value={current.bookRate ? formatPercent(current.bookRate) : "—"}
            delta={d(current.bookRate, previous.bookRate)}
            compact
          />
          <Metric
            label="Show Rate"
            value={current.showRate ? formatPercent(current.showRate) : "—"}
            delta={d(current.showRate, previous.showRate)}
            compact
          />
          <Metric
            label="Close Rate"
            value={current.closeRate ? formatPercent(current.closeRate) : "—"}
            delta={d(current.closeRate, previous.closeRate)}
            compact
          />
          <Metric
            label="Cancel Rate"
            value={
              current.cancellationRate
                ? formatPercent(current.cancellationRate)
                : "—"
            }
            delta={d(current.cancellationRate, previous.cancellationRate)}
            invertDelta
            compact
            last
          />
        </div>
      </Card>

      {/* Funnel + ROAS sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <CardHeader
            eyebrow="Funnel"
            title={`${formatCompactInt(funnel.impressions)} impressions → ${funnel.soldJobs} sold`}
          />
          <div style={{ padding: 20 }}>
            <HorizontalFunnel
              stages={[
                { key: "impressions", label: "Impressions", value: funnel.impressions },
                { key: "clicks", label: "Link Clicks", value: funnel.linkClicks, rateOf: "impressions" },
                { key: "leads", label: "Leads", value: funnel.leads, rateOf: "clicks" },
                { key: "booked", label: "Booked", value: funnel.bookedJobs, rateOf: "leads" },
                { key: "sold", label: "Sold", value: funnel.soldJobs, rateOf: "booked" },
              ]}
              values={{
                impressions: funnel.impressions,
                clicks: funnel.linkClicks,
                leads: funnel.leads,
                booked: funnel.bookedJobs,
                sold: funnel.soldJobs,
              }}
            />
          </div>
        </Card>
        <Card>
          <CardHeader
            eyebrow="Return on ad spend"
            title={`${roas.toFixed(1)}x ROAS`}
          />
          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <RoasMeter value={roas} target={roasTarget} />
            <div
              style={{
                borderTop: "1px solid var(--color-jbp-hairline)",
                paddingTop: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <RoasRow label="Spend" value={formatCurrency(current.spend)} />
              <RoasRow
                label="Revenue"
                value={formatCurrency(current.sales)}
                accent
              />
              <RoasRow
                label="Avg sale"
                value={avgSale > 0 ? formatCurrency(avgSale) : "—"}
              />
              <RoasRow
                label="Booked jobs"
                value={formatInt(current.bookedJobs)}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Cancellation + Day of week */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <CardHeader
            eyebrow="Cancellation rate"
            title="Weekly · 8w trail"
          />
          <div style={{ padding: "16px 20px 8px" }}>
            <DualLineChart data={cancelDual} />
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 4,
                fontSize: 11,
                color: "var(--color-jbp-text-2)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 2,
                    background: "var(--color-jbp-red)",
                  }}
                />
                Current
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    display: "inline-block",
                    width: 14,
                    height: 0,
                    borderTop:
                      "1.5px dashed var(--color-jbp-text-2)",
                  }}
                />
                Previous 8w
              </span>
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader
            eyebrow="Day of week"
            title="Avg leads · trailing 30d"
            sub={dowBestDay(dowAvg)}
          />
          <div style={{ padding: 20 }}>
            <DayOfWeekBars data={dowAvg} />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ───────────────────────────── Alerts strip ───────────────────────────── */

function AlertsStrip({ anomalies }: { anomalies: Anomaly[] }) {
  // Top 3 alerts by absolute change. Eligible metrics in the prototype's
  // headline: spend / lead rate / cancellation rate. We pick the loudest.
  const top = anomalies.slice(0, 3);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
        borderLeft: "3px solid var(--color-jbp-red)",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRight: "1px solid var(--color-jbp-hairline)",
          minWidth: 200,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            background: "var(--color-jbp-red)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            fontFamily: "var(--font-display)",
          }}
        >
          !
        </span>
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "var(--color-jbp-red)",
            }}
          >
            Heads up
          </div>
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--color-jbp-text-3)",
              letterSpacing: 0.4,
            }}
          >
            last 7d vs prior 7d
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
        {top.map((a, i) => (
          <div
            key={a.metric}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRight:
                i < top.length - 1
                  ? "1px solid var(--color-jbp-hairline)"
                  : "none",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--color-jbp-text-2)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              {a.label}
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 800,
                fontFamily: "var(--font-display)",
                color: a.bad ? "var(--color-jbp-bad)" : "var(--color-jbp-good)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: -0.3,
              }}
            >
              {a.direction === "up" ? "↑" : "↓"} {Math.abs(a.change * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── Helpers ───────────────────────────── */

function ChartLegend({
  items,
}: {
  items: { color: string; label: string; style: "line" | "block" }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        fontSize: 11,
        color: "var(--color-jbp-text-2)",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {items.map((it) => (
        <span
          key={it.label}
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: it.style === "line" ? 2 : 10,
              background: it.color,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function RoasRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: "var(--color-jbp-text-2)",
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontSize: 10,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: 700,
          color: accent ? "var(--color-jbp-red)" : "var(--color-jbp-text)",
          fontVariantNumeric: "tabular-nums",
          fontFamily: "var(--font-display)",
          letterSpacing: -0.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/** Average a daily KPI series by weekday — returns 7 buckets in Mon–Sun order. */
function aggregateDayOfWeek(
  rows: { date: string; leads: number }[],
): { day: string; value: number }[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    const d = new Date(`${r.date}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    sums[dow] += r.leads;
    counts[dow] += 1;
  }
  return labels.map((day, i) => ({
    day,
    value: counts[i] > 0 ? sums[i] / counts[i] : 0,
  }));
}

function dowBestDay(rows: { day: string; value: number }[]): string {
  const best = rows.reduce(
    (acc, r) => (r.value > acc.value ? r : acc),
    rows[0] ?? { day: "—", value: 0 },
  );
  if (!best || best.value === 0) return "no leads in window";
  return `best day: ${best.day} · ${best.value.toFixed(1)} leads/day`;
}
