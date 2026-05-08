"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DualLineChart,
  type DualLinePoint,
} from "@/components/charts";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import {
  Card,
  CardHeader,
  Eyebrow,
  SimpleKpi,
  StatusPill,
} from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import {
  cancellationRateSeries,
  getStaleBookings,
  showRateSeries,
  type StaleBooking,
} from "@/lib/aggregate";
import { normalizeService } from "@/lib/serviceTaxonomy";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { chicagoTodayStr } from "@/lib/dateRange";
import {
  formatCompactMoney,
  formatInt,
} from "@/lib/format";
import type { DateRangePreset, ServiceTitanRow } from "@/lib/types";

const STALE_DAYS = 14;

// Display order for the kanban strip — derived from the actual ServiceTitan
// statuses our export sees. The prototype's "On the way / On site / Diagnosed"
// don't exist in our data, so we group them under "In Progress" and add the
// "Hold" bucket the export actually surfaces.
const STAGE_ORDER: ReadonlyArray<{ key: string; label: string; tone: "neutral" | "warn" | "good" | "bad" }> = [
  { key: "scheduled", label: "Scheduled", tone: "neutral" },
  { key: "inprogress", label: "In Progress", tone: "warn" },
  { key: "hold", label: "On Hold", tone: "warn" },
  { key: "completed", label: "Completed", tone: "good" },
  { key: "sold", label: "Sold", tone: "good" },
  { key: "cancelled", label: "Cancelled", tone: "bad" },
];

interface PipelineClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function PipelineClient({
  businessUnits,
  initialState,
}: PipelineClientProps) {
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

  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);
  const todayStr = useMemo(() => chicagoTodayStr(), []);

  const stale = useMemo(() => {
    if (!data) return [];
    return getStaleBookings(
      data.servicetitan_social_leads,
      bu,
      STALE_DAYS,
      todayStr,
    );
  }, [data, bu, todayStr]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => {
      const buMatch = (row: ServiceTitanRow) => {
        if (slice.bu.length === 0) return true;
        const v = normalizeService(row["Business Unit"]);
        return slice.bu.some((b) => normalizeService(b) === v);
      };
      const rows = data.servicetitan_social_leads.filter(buMatch);
      const stages = bucketByStage(rows);
      const totalValue = rows.reduce(
        (acc, r) => acc + (Number(r["Sales"]) || 0),
        0,
      );
      const activeCount =
        (stages.scheduled?.count ?? 0) +
        (stages.inprogress?.count ?? 0) +
        (stages.hold?.count ?? 0);
      const cancelWeekly = cancellationRateSeries(
        data.servicetitan_social_leads,
        slice.bu,
        "week",
        8,
      );
      const showWeekly = showRateSeries(
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
      const showDual: DualLinePoint[] = showWeekly.map((p, i, arr) => ({
        bucket: p.bucket.replace(/^\d{4}-/, ""),
        current: p.rate,
        previous: i >= 4 ? arr[i - 4]?.rate ?? null : null,
      }));
      return {
        slice,
        stages,
        totalValue,
        activeCount,
        totalRows: rows.length,
        cancelDual,
        showDual,
      };
    });
  }, [data, slices]);

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
        pageTitle="Pipeline"
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
        caption="Operational view · all-time pending pipeline"
      />
      <div
        style={{
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {sliceData.map((s) => (
          <PipelineSlice
            key={s.slice.key}
            sliceLabel={slices.length > 1 ? s.slice.label : null}
            stages={s.stages}
            totalValue={s.totalValue}
            activeCount={s.activeCount}
            totalRows={s.totalRows}
            atRiskCount={
              slices.length > 1
                ? stale.filter((r) =>
                    s.slice.bu.length === 0
                      ? true
                      : s.slice.bu.some(
                          (b) =>
                            normalizeService(b) ===
                            normalizeService(r.businessUnit),
                        ),
                  ).length
                : stale.length
            }
            cancelDual={s.cancelDual}
            showDual={s.showDual}
          />
        ))}

        {/* Stale bookings table — shared across slices, shown once. */}
        <Card>
          <CardHeader
            eyebrow="Active jobs · at risk"
            title={`Pending more than ${STALE_DAYS} days`}
            right={
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-jbp-text-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {stale.length} total
              </span>
            }
          />
          <StaleTable rows={stale.slice(0, 20)} />
        </Card>
      </div>
    </>
  );
}

interface StageStat {
  count: number;
  value: number;
}

function bucketByStage(rows: ServiceTitanRow[]): Record<string, StageStat> {
  const out: Record<string, StageStat> = {};
  for (const stage of STAGE_ORDER) out[stage.key] = { count: 0, value: 0 };
  for (const r of rows) {
    const status = String(r["Job Status"] ?? "").trim().toLowerCase();
    let key: string;
    if (status === "scheduled") key = "scheduled";
    else if (status.includes("progress")) key = "inprogress";
    else if (status === "hold") key = "hold";
    else if (status.includes("complet")) key = "completed";
    else if (status === "sold") key = "sold";
    else if (status.includes("cancel")) key = "cancelled";
    else continue;
    const sale = Number(r["Sales"]) || 0;
    out[key].count += 1;
    out[key].value += sale;
  }
  return out;
}

function PipelineSlice({
  sliceLabel,
  stages,
  totalValue,
  activeCount,
  totalRows,
  atRiskCount,
  cancelDual,
  showDual,
}: {
  sliceLabel: string | null;
  stages: Record<string, StageStat>;
  totalValue: number;
  activeCount: number;
  totalRows: number;
  atRiskCount: number;
  cancelDual: DualLinePoint[];
  showDual: DualLinePoint[];
}) {
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
      {/* 4-up KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <SimpleKpi
          label="In pipeline"
          value={formatInt(totalRows)}
          sub="all attributed leads"
        />
        <SimpleKpi
          label="Active jobs"
          value={formatInt(activeCount)}
          sub="not yet sold/cancelled"
        />
        <SimpleKpi
          label="Pipeline value"
          value={formatCompactMoney(totalValue)}
          sub="sales attributed"
        />
        <SimpleKpi
          label="At risk"
          value={formatInt(atRiskCount)}
          sub={`pending more than ${STALE_DAYS}d`}
          accent
        />
      </div>

      {/* Kanban stage strip */}
      <Card>
        <CardHeader eyebrow="Stage flow" title="Where jobs are right now" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${STAGE_ORDER.length}, 1fr)`,
            borderTop: "1px solid var(--color-jbp-hairline)",
          }}
        >
          {STAGE_ORDER.map((stage, i) => {
            const c = stages[stage.key] ?? { count: 0, value: 0 };
            const bg =
              stage.tone === "good"
                ? "var(--color-jbp-good-soft)"
                : stage.tone === "bad"
                  ? "var(--color-jbp-bad-soft)"
                  : stage.tone === "warn"
                    ? "var(--color-jbp-warn-soft)"
                    : "transparent";
            return (
              <div
                key={stage.key}
                style={{
                  padding: "16px 14px",
                  borderRight:
                    i < STAGE_ORDER.length - 1
                      ? "1px solid var(--color-jbp-hairline)"
                      : "none",
                  background: bg,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "var(--color-jbp-text-2)",
                  }}
                >
                  {stage.label}
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    letterSpacing: -0.8,
                    marginTop: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatInt(c.count)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: "var(--color-jbp-text-2)",
                    marginTop: 4,
                  }}
                >
                  {c.value > 0 ? formatCompactMoney(c.value) : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Cancellation + Show trend */}
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
          </div>
        </Card>
        <Card>
          <CardHeader
            eyebrow="Show rate"
            title="Weekly · 8w trail"
            sub="completed / booked · higher is better"
          />
          <div style={{ padding: "16px 20px 8px" }}>
            <DualLineChart
              data={showDual}
              currentColor="var(--color-jbp-good)"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StaleTable({ rows }: { rows: StaleBooking[] }) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "32px 20px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--color-jbp-text-3)",
          fontFamily: "var(--font-mono)",
        }}
      >
        No stale bookings — pipeline is clean.
      </div>
    );
  }
  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12,
      }}
    >
      <thead>
        <tr
          style={{
            background: "var(--color-jbp-paper)",
            borderBottom: "1px solid var(--color-jbp-hairline)",
          }}
        >
          {["Job", "Created", "Days open", "BU", "ZIP", "Status"].map((h) => (
            <th
              key={h}
              style={{
                padding: "10px 14px",
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
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={String(r.jobNumber)}
            style={{
              borderBottom: "1px solid var(--color-jbp-hairline-soft)",
            }}
          >
            <td
              style={{
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-jbp-text-2)",
              }}
            >
              #{r.jobNumber}
            </td>
            <td
              style={{
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-jbp-text-2)",
              }}
            >
              {r.creationDate}
            </td>
            <td
              style={{
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color:
                  r.daysOpen >= 30
                    ? "var(--color-jbp-bad)"
                    : "var(--color-jbp-warn)",
              }}
            >
              {r.daysOpen}d
            </td>
            <td style={{ padding: "12px 14px", fontWeight: 600 }}>
              {r.businessUnit || "—"}
            </td>
            <td
              style={{
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                color: "var(--color-jbp-text-2)",
              }}
            >
              {r.zip || "—"}
            </td>
            <td style={{ padding: "12px 14px" }}>
              <StatusPill status={r.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
