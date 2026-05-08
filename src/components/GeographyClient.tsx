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
import { GeographicMap } from "@/components/GeographicMap";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { aggregateByZip, type ZipMetrics } from "@/lib/aggregate";
import { getServiceSlices, type ServiceView } from "@/lib/buFilter";
import { appendCommonFilters, replaceQuery } from "@/lib/clientUrlState";
import { getPeriod } from "@/lib/dateRange";
import {
  formatCompactMoney,
  formatCurrency,
  formatInt,
} from "@/lib/format";
import type { DateRangePreset } from "@/lib/types";

interface GeographyClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    view: ServiceView;
  };
}

export function GeographyClient({
  businessUnits,
  initialState,
}: GeographyClientProps) {
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
    return slices.map((slice) => ({
      slice,
      rows: aggregateByZip(
        data.meta_insights,
        data.servicetitan_social_leads,
        period.current,
        slice.bu,
      ),
    }));
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
        pageTitle="Geography"
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
        {sliceData.map(({ slice, rows }) => (
          <GeographySlice
            key={slice.key}
            sliceLabel={slices.length > 1 ? slice.label : null}
            rows={rows}
          />
        ))}
      </div>
    </>
  );
}

function GeographySlice({
  sliceLabel,
  rows,
}: {
  sliceLabel: string | null;
  rows: ZipMetrics[];
}) {
  const totalLeads = rows.reduce((s, z) => s + z.leads, 0);
  const totalRev = rows.reduce((s, z) => s + z.sales, 0);
  const top = rows[0];

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
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <SimpleKpi
          label="ZIP codes"
          value={formatInt(rows.length)}
          sub="active service areas"
        />
        <SimpleKpi
          label="Top ZIP"
          value={top?.zip ?? "—"}
          sub={top ? `${formatInt(top.leads)} leads` : "no data"}
        />
        <SimpleKpi
          label="Total leads"
          value={formatInt(totalLeads)}
          sub="this window"
        />
        <SimpleKpi
          label="Revenue"
          value={formatCompactMoney(totalRev)}
          sub="attributed by zip"
          accent
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 16,
        }}
      >
        <Card>
          <CardHeader
            eyebrow="Service map"
            title="Heat by lead volume"
            right={
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-jbp-text-3)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Click any marker to focus
              </span>
            }
          />
          <div
            style={{
              padding: 0,
              background: "var(--color-jbp-paper)",
              minHeight: 380,
            }}
          >
            <GeographicMap rows={rows} />
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Top ZIPs" title="By lead volume" />
          <div
            style={{
              maxHeight: 420,
              overflowY: "auto",
            }}
          >
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
                    position: "sticky",
                    top: 0,
                  }}
                >
                  {["ZIP", "Leads", "Booked", "Revenue", "CPL"].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((z) => (
                  <tr
                    key={z.zip}
                    style={{
                      borderBottom:
                        "1px solid var(--color-jbp-hairline-soft)",
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                      }}
                    >
                      {z.zip}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 700,
                      }}
                    >
                      {z.leads}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {z.bookedJobs}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCompactMoney(z.sales)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {z.allocatedSpend > 0 && z.leads > 0
                        ? formatCurrency(z.allocatedSpend / z.leads)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
