"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import {
  Card,
  CardHeader,
  Eyebrow,
  SimpleKpi,
} from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { Sparkline } from "@/components/Sparkline";
import { monthlyKpiSeries, type MonthlyKpiRow } from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import {
  formatCompactMoney,
  formatCurrency,
  formatInt,
} from "@/lib/format";
import type { DateRangePreset } from "@/lib/types";

interface HistoryClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
    monthsBack: number;
  };
}

export function HistoryClient({
  businessUnits,
  initialState,
}: HistoryClientProps) {
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
  const monthsBack = initialState.monthsBack;

  useEffect(() => {
    const sp = new URLSearchParams();
    appendCommonFilters(sp, { preset, customStart, customEnd, bu, view });
    if (monthsBack !== 12) sp.set("months", String(monthsBack));
    replaceQuery(sp.toString());
  }, [preset, customStart, customEnd, bu, view, monthsBack]);

  const slices = useMemo(() => getServiceSlices(bu, view), [bu, view]);

  const sliceData = useMemo(() => {
    if (!data) return [];
    return slices.map((slice) => ({
      slice,
      rows: monthlyKpiSeries(
        data.meta_insights,
        data.servicetitan_social_leads,
        slice.bu,
        monthsBack,
      ),
    }));
  }, [data, slices, monthsBack]);

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
        pageTitle="History"
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
        caption={`Last ${monthsBack} months · ?months=24 to widen`}
      />
      <div
        style={{
          padding: "20px 28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {sliceData.map(({ slice, rows }) => (
          <HistorySlice
            key={slice.key}
            sliceLabel={slices.length > 1 ? slice.label : null}
            rows={rows}
          />
        ))}
      </div>
    </>
  );
}

function HistorySlice({
  sliceLabel,
  rows,
}: {
  sliceLabel: string | null;
  rows: MonthlyKpiRow[];
}) {
  const lifetimeRev = rows.reduce((acc, r) => acc + r.sales, 0);
  const best = rows.reduce<MonthlyKpiRow | null>(
    (acc, r) => (acc == null || r.sales > acc.sales ? r : acc),
    null,
  );
  const maxSpend = Math.max(...rows.map((r) => r.spend), 1);
  const maxRev = Math.max(...rows.map((r) => r.sales), 1);

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <SimpleKpi
          label="Months tracked"
          value={formatInt(rows.length)}
          sub="rolling window"
        />
        <SimpleKpi
          label="Best month"
          value={best ? best.month : "—"}
          sub={best ? `${formatCompactMoney(best.sales)} revenue` : "no data"}
        />
        <SimpleKpi
          label="Lifetime revenue"
          value={formatCompactMoney(lifetimeRev)}
          sub={`trailing ${rows.length}mo`}
          accent
        />
      </div>

      <Card>
        <CardHeader eyebrow="Month over month" title="The long view" />
        <div style={{ padding: "24px 20px 12px" }}>
          <HistoryBars rows={rows} maxSpend={maxSpend} maxRev={maxRev} />
        </div>
      </Card>

      <Card>
        <CardHeader eyebrow="Detail table" title="Monthly breakdown" />
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
              {["Month", "Spend", "Leads", "CPL", "Booked", "Revenue", "ROAS", "Trend"].map(
                (h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: i === 0 ? "left" : "right",
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
            {rows.map((m, i) => {
              const cpl = m.leads > 0 ? m.spend / m.leads : 0;
              const roas = m.spend > 0 ? m.sales / m.spend : 0;
              const sparkData = rows
                .slice(Math.max(0, i - 5), i + 1)
                .map((x) => x.sales);
              return (
                <tr
                  key={m.month}
                  style={{
                    borderBottom:
                      "1px solid var(--color-jbp-hairline-soft)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {m.month}
                  </td>
                  <td style={cellRight}>{formatCompactMoney(m.spend)}</td>
                  <td style={cellRight}>{formatInt(m.leads)}</td>
                  <td style={cellRight}>
                    {cpl > 0 ? formatCurrency(cpl) : "—"}
                  </td>
                  <td style={cellRight}>{formatInt(m.bookedJobs)}</td>
                  <td
                    style={{
                      ...cellRight,
                      fontWeight: 700,
                    }}
                  >
                    {formatCompactMoney(m.sales)}
                  </td>
                  <td
                    style={{
                      ...cellRight,
                      fontWeight: 700,
                      color:
                        roas >= 6
                          ? "var(--color-jbp-good)"
                          : roas >= 4 || roas === 0
                            ? "var(--color-jbp-text)"
                            : "var(--color-jbp-bad)",
                    }}
                  >
                    {roas > 0 ? `${roas.toFixed(1)}x` : "—"}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    {sparkData.length > 1 ? (
                      <span style={{ display: "inline-block" }}>
                        <Sparkline
                          values={sparkData}
                          stroke="var(--color-jbp-red)"
                          width={64}
                          height={20}
                          showBaseline={false}
                        />
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const cellRight = {
  padding: "12px 14px",
  textAlign: "right" as const,
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums" as const,
};

function HistoryBars({
  rows,
  maxSpend,
  maxRev,
}: {
  rows: MonthlyKpiRow[];
  maxSpend: number;
  maxRev: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        height: 220,
        padding: "0 4px",
      }}
    >
      {rows.map((d) => {
        const spendH = (d.spend / maxSpend) * 100;
        const revH = (d.sales / maxRev) * 100;
        return (
          <div
            key={d.month}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              style={{
                flex: 1,
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-end",
                gap: 3,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: spendH + "%",
                  background: "var(--color-jbp-red)",
                  opacity: 0.85,
                }}
                title={`Spend ${formatCompactMoney(d.spend)}`}
              />
              <div
                style={{
                  width: 12,
                  height: revH + "%",
                  background: "var(--color-jbp-navy)",
                }}
                title={`Revenue ${formatCompactMoney(d.sales)}`}
              />
            </div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: "var(--color-jbp-text-3)",
                transform: "rotate(-30deg)",
                transformOrigin: "center",
                whiteSpace: "nowrap",
              }}
            >
              {d.month}
            </div>
          </div>
        );
      })}
    </div>
  );
}
