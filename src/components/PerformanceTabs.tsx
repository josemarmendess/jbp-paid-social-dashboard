"use client";

import { useState } from "react";
import {
  PerformanceTable,
  type ColumnDef,
} from "@/components/PerformanceTable";
import { EntityDetailPanel } from "@/components/EntityDetailPanel";
import { CreativeModal } from "@/components/CreativeModal";
import { CreativeThumb } from "@/components/CreativeThumb";
import { ServiceTag, StatusPill } from "@/components/design";
import { Sparkline } from "@/components/Sparkline";
import {
  formatCurrency,
  formatInt,
  formatRoas,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AggregatedAd,
  MetaAdCreativeRow,
} from "@/lib/types";
import type {
  AggregatedCampaign,
  AggregatedAdset,
  AggregatedBusinessUnit,
} from "@/lib/aggregate";

type TabKey = "ad" | "campaign" | "adset" | "bu";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "ad", label: "By Ad" },
  { key: "campaign", label: "By Campaign" },
  { key: "adset", label: "By Adset" },
  { key: "bu", label: "By Business Unit" },
];

interface PerformanceTabsProps {
  ads: AggregatedAd[];
  campaigns: AggregatedCampaign[];
  adsets: AggregatedAdset[];
  businessUnits: AggregatedBusinessUnit[];
  /** ad_name -> last-7-day daily spend series. */
  sevenDayByAd: Record<string, number[]>;
  /** ad_name -> creative metadata, when available. */
  creativeByAd: Record<string, MetaAdCreativeRow>;
}

export function PerformanceTabs({
  ads,
  campaigns,
  adsets,
  businessUnits,
  sevenDayByAd,
  creativeByAd,
}: PerformanceTabsProps) {
  const [tab, setTab] = useState<TabKey>("ad");
  const [detailAd, setDetailAd] = useState<AggregatedAd | null>(null);
  const [detailCampaign, setDetailCampaign] = useState<AggregatedCampaign | null>(null);
  const [detailAdset, setDetailAdset] = useState<AggregatedAdset | null>(null);
  const [detailBu, setDetailBu] = useState<AggregatedBusinessUnit | null>(null);
  const [modalAd, setModalAd] = useState<AggregatedAd | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* Tab list */}
      <div className="inline-flex gap-1 self-start rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-all",
              tab === t.key
                ? "bg-[color:var(--color-jbp-blue)] text-white shadow-sm"
                : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-2 self-center text-[11px] tabular-nums text-[color:var(--color-text-tertiary)]">
          {tab === "ad" && `${ads.length} ads`}
          {tab === "campaign" && `${campaigns.length} campaigns`}
          {tab === "adset" && `${adsets.length} adsets`}
          {tab === "bu" && `${businessUnits.length} services`}
        </span>
      </div>

      {/* Active tab table */}
      {tab === "ad" && (
        <PerformanceTable
          rows={ads}
          rowKey={(r) => r.adName}
          columns={adColumns(setModalAd, creativeByAd)}
          initialSort={{ key: "sales", dir: "desc" }}
          onRowClick={(r) => setDetailAd(r)}
        />
      )}
      {tab === "campaign" && (
        <PerformanceTable
          rows={campaigns}
          rowKey={(r) => r.campaignName}
          columns={CAMPAIGN_COLUMNS}
          initialSort={{ key: "sales", dir: "desc" }}
          onRowClick={(r) => setDetailCampaign(r)}
        />
      )}
      {tab === "adset" && (
        <PerformanceTable
          rows={adsets}
          rowKey={(r) => r.adsetName}
          columns={ADSET_COLUMNS}
          initialSort={{ key: "sales", dir: "desc" }}
          onRowClick={(r) => setDetailAdset(r)}
        />
      )}
      {tab === "bu" && (
        <PerformanceTable
          rows={businessUnits}
          rowKey={(r) => r.businessUnit}
          columns={BU_COLUMNS}
          initialSort={{ key: "sales", dir: "desc" }}
          onRowClick={(r) => setDetailBu(r)}
        />
      )}

      {/* Side panels */}
      <EntityDetailPanel
        open={!!detailAd}
        onClose={() => setDetailAd(null)}
        title={detailAd?.adName ?? ""}
        subtitle={detailAd ? `${detailAd.campaignName} · ${detailAd.adsetName}` : undefined}
      >
        {detailAd ? (
          <AdPanelBody
            ad={detailAd}
            sevenDay={sevenDayByAd[detailAd.adName]}
            onOpenCreative={() => {
              setModalAd(detailAd);
              setDetailAd(null);
            }}
          />
        ) : null}
      </EntityDetailPanel>
      <EntityDetailPanel
        open={!!detailCampaign}
        onClose={() => setDetailCampaign(null)}
        title={detailCampaign?.campaignName ?? ""}
        subtitle="Campaign roll-up"
      >
        {detailCampaign ? <CampaignPanelBody c={detailCampaign} /> : null}
      </EntityDetailPanel>
      <EntityDetailPanel
        open={!!detailAdset}
        onClose={() => setDetailAdset(null)}
        title={detailAdset?.adsetName ?? ""}
        subtitle={detailAdset?.campaignName ?? "Adset roll-up"}
      >
        {detailAdset ? <AdsetPanelBody a={detailAdset} /> : null}
      </EntityDetailPanel>
      <EntityDetailPanel
        open={!!detailBu}
        onClose={() => setDetailBu(null)}
        title={detailBu?.businessUnit ?? ""}
        subtitle="Business unit roll-up"
      >
        {detailBu ? <BuPanelBody b={detailBu} /> : null}
      </EntityDetailPanel>

      {/* Creative modal (from thumbnail click in By Ad table) */}
      <CreativeModal
        ad={modalAd}
        creative={modalAd ? creativeByAd[modalAd.adName] : undefined}
        sevenDaySpend={modalAd ? sevenDayByAd[modalAd.adName] : undefined}
        onClose={() => setModalAd(null)}
      />
    </div>
  );
}

/* ----------------------------- Column defs ---------------------------- */

function adColumns(
  onThumb: (ad: AggregatedAd) => void,
  creativeByAd: Record<string, MetaAdCreativeRow>,
): ColumnDef<AggregatedAd>[] {
  return [
    {
      key: "thumb",
      label: "",
      align: "left",
      unsortable: true,
      value: () => "",
      cellClass: "w-[56px]",
      render: (r) => (
        <CreativeThumb
          src={creativeByAd[r.adName]?.thumbnail_url || creativeByAd[r.adName]?.image_url}
          alt={r.adName}
          size={40}
          onClick={(event) => {
            event.stopPropagation();
            onThumb(r);
          }}
        />
      ),
    },
    {
      key: "adName",
      label: "Ad",
      align: "left",
      value: (r) => r.adName.toLowerCase(),
      render: (r) => (
        <span
          title={r.adName}
          className="block max-w-[260px] truncate font-medium"
        >
          {r.adName}
        </span>
      ),
    },
    {
      key: "businessUnit",
      label: "Service",
      align: "left",
      value: (r) => (r.businessUnit ?? "").toLowerCase(),
      render: (r) =>
        r.businessUnit ? (
          <ServiceTag label={r.businessUnit} />
        ) : (
          <span className="text-[color:var(--color-text-tertiary)]">—</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      align: "left",
      value: (r) =>
        (creativeByAd[r.adName]?.status ?? "").toLowerCase(),
      render: (r) => {
        const s = creativeByAd[r.adName]?.status;
        return s ? (
          <StatusPill status={s} />
        ) : (
          <span className="text-[color:var(--color-text-tertiary)]">—</span>
        );
      },
    },
    {
      key: "audience",
      label: "Audience",
      align: "left",
      value: (r) => r.audience.toLowerCase(),
      render: (r) => <Badge tone={r.audience === "Retargeting" ? "blue" : "neutral"}>{r.audience}</Badge>,
    },
    {
      key: "spend",
      label: "Spend",
      align: "right",
      value: (r) => r.spend,
      render: (r) => formatCurrency(r.spend),
    },
    {
      key: "leads",
      label: "Leads",
      align: "right",
      value: (r) => r.leads,
      render: (r) => formatInt(r.leads),
    },
    {
      key: "cpl",
      label: "CPL",
      align: "right",
      value: (r) => (r.leads > 0 ? r.spend / r.leads : Number.POSITIVE_INFINITY),
      render: (r) => (r.leads > 0 ? formatCurrency(r.spend / r.leads, true) : "—"),
    },
    {
      key: "bookedJobs",
      label: "Booked",
      align: "right",
      value: (r) => r.bookedJobs,
      render: (r) => formatInt(r.bookedJobs),
    },
    {
      key: "sales",
      label: "Sales",
      align: "right",
      value: (r) => r.sales,
      render: (r) => formatCurrency(r.sales),
    },
    {
      key: "roas",
      label: "ROAS",
      align: "right",
      value: (r) => (r.spend > 0 ? r.sales / r.spend : 0),
      render: (r) => (
        <RoasCell value={r.spend > 0 ? r.sales / r.spend : 0} />
      ),
    },
  ];
}

const CAMPAIGN_COLUMNS: ColumnDef<AggregatedCampaign>[] = [
  {
    key: "campaignName",
    label: "Campaign",
    align: "left",
    value: (r) => r.campaignName.toLowerCase(),
    render: (r) => (
      <span title={r.campaignName} className="block max-w-[320px] truncate font-medium">
        {r.campaignName}
      </span>
    ),
  },
  {
    key: "spend",
    label: "Spend",
    align: "right",
    value: (r) => r.spend,
    render: (r) => formatCurrency(r.spend),
  },
  {
    key: "linkClicks",
    label: "Clicks",
    align: "right",
    value: (r) => r.linkClicks,
    render: (r) => formatInt(r.linkClicks),
  },
  {
    key: "leads",
    label: "Leads",
    align: "right",
    value: (r) => r.leads,
    render: (r) => formatInt(r.leads),
  },
  {
    key: "cpl",
    label: "CPL",
    align: "right",
    value: (r) => (r.leads > 0 ? r.spend / r.leads : Number.POSITIVE_INFINITY),
    render: (r) => (r.leads > 0 ? formatCurrency(r.spend / r.leads, true) : "—"),
  },
  {
    key: "bookedJobs",
    label: "Booked",
    align: "right",
    value: (r) => r.bookedJobs,
    render: (r) => formatInt(r.bookedJobs),
  },
  {
    key: "sales",
    label: "Sales",
    align: "right",
    value: (r) => r.sales,
    render: (r) => formatCurrency(r.sales),
  },
  {
    key: "roas",
    label: "ROAS",
    align: "right",
    value: (r) => (r.spend > 0 ? r.sales / r.spend : 0),
    render: (r) => <RoasCell value={r.spend > 0 ? r.sales / r.spend : 0} />,
  },
];

const ADSET_COLUMNS: ColumnDef<AggregatedAdset>[] = [
  {
    key: "adsetName",
    label: "Adset",
    align: "left",
    value: (r) => r.adsetName.toLowerCase(),
    render: (r) => (
      <span title={r.adsetName} className="block max-w-[320px] truncate font-medium">
        {r.adsetName}
      </span>
    ),
  },
  {
    key: "campaignName",
    label: "Campaign",
    align: "left",
    value: (r) => r.campaignName.toLowerCase(),
    render: (r) => (
      <span title={r.campaignName} className="block max-w-[220px] truncate text-[color:var(--color-text-secondary)]">
        {r.campaignName}
      </span>
    ),
  },
  {
    key: "spend",
    label: "Spend",
    align: "right",
    value: (r) => r.spend,
    render: (r) => formatCurrency(r.spend),
  },
  {
    key: "leads",
    label: "Leads",
    align: "right",
    value: (r) => r.leads,
    render: (r) => formatInt(r.leads),
  },
  {
    key: "cpl",
    label: "CPL",
    align: "right",
    value: (r) => (r.leads > 0 ? r.spend / r.leads : Number.POSITIVE_INFINITY),
    render: (r) => (r.leads > 0 ? formatCurrency(r.spend / r.leads, true) : "—"),
  },
  {
    key: "bookedJobs",
    label: "Booked",
    align: "right",
    value: (r) => r.bookedJobs,
    render: (r) => formatInt(r.bookedJobs),
  },
  {
    key: "sales",
    label: "Sales",
    align: "right",
    value: (r) => r.sales,
    render: (r) => formatCurrency(r.sales),
  },
  {
    key: "roas",
    label: "ROAS",
    align: "right",
    value: (r) => (r.spend > 0 ? r.sales / r.spend : 0),
    render: (r) => <RoasCell value={r.spend > 0 ? r.sales / r.spend : 0} />,
  },
];

const BU_COLUMNS: ColumnDef<AggregatedBusinessUnit>[] = [
  {
    key: "businessUnit",
    label: "Service",
    align: "left",
    value: (r) => r.businessUnit.toLowerCase(),
    render: (r) => <ServiceTag label={r.businessUnit} />,
  },
  {
    key: "spend",
    label: "Spend (allocated)",
    align: "right",
    value: (r) => r.spend,
    render: (r) => formatCurrency(r.spend),
  },
  {
    key: "leads",
    label: "Leads",
    align: "right",
    value: (r) => r.leads,
    render: (r) => formatInt(r.leads),
  },
  {
    key: "cpl",
    label: "CPL",
    align: "right",
    value: (r) => (r.leads > 0 ? r.spend / r.leads : Number.POSITIVE_INFINITY),
    render: (r) => (r.leads > 0 ? formatCurrency(r.spend / r.leads, true) : "—"),
  },
  {
    key: "bookedJobs",
    label: "Booked",
    align: "right",
    value: (r) => r.bookedJobs,
    render: (r) => formatInt(r.bookedJobs),
  },
  {
    key: "sales",
    label: "Sales",
    align: "right",
    value: (r) => r.sales,
    render: (r) => formatCurrency(r.sales),
  },
  {
    key: "roas",
    label: "ROAS",
    align: "right",
    value: (r) => (r.spend > 0 ? r.sales / r.spend : 0),
    render: (r) => <RoasCell value={r.spend > 0 ? r.sales / r.spend : 0} />,
  },
];

/* ----------------------------- Helpers ---------------------------- */

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "red";
}) {
  const styles =
    tone === "blue"
      ? "bg-[color:var(--color-jbp-blue)]/10 text-[color:var(--color-jbp-blue)]"
      : tone === "red"
        ? "bg-[color:var(--color-jbp-red)]/10 text-[color:var(--color-jbp-red)]"
        : "bg-[color:var(--color-surface-hover)] text-[color:var(--color-text-primary)]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
        styles,
      )}
    >
      {children}
    </span>
  );
}

function RoasCell({ value }: { value: number }) {
  const tone =
    !Number.isFinite(value) || value === 0
      ? "text-[color:var(--color-text-tertiary)]"
      : value >= 3
        ? "text-[color:var(--color-positive)]"
        : value < 1
          ? "text-[color:var(--color-negative)]"
          : "";
  return (
    <span className={cn("font-medium", tone)}>{formatRoas(value)}</span>
  );
}

/* ----------------------------- Side-panel bodies ---------------------------- */

function AdPanelBody({
  ad,
  sevenDay,
  onOpenCreative,
}: {
  ad: AggregatedAd;
  sevenDay?: number[];
  onOpenCreative: () => void;
}) {
  const cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;
  const cpb = ad.bookedJobs > 0 ? ad.spend / ad.bookedJobs : 0;
  const roas = ad.spend > 0 ? ad.sales / ad.spend : 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge tone={ad.audience === "Retargeting" ? "blue" : "neutral"}>
            {ad.audience}
          </Badge>
          {ad.businessUnit ? <ServiceTag label={ad.businessUnit} /> : null}
        </div>
        <button
          type="button"
          onClick={onOpenCreative}
          className="text-[12px] font-semibold text-[color:var(--color-jbp-blue)] underline-offset-2 hover:underline"
        >
          Open creative →
        </button>
      </div>
      <PanelGrid>
        <PanelStat label="Spend" value={formatCurrency(ad.spend)} />
        <PanelStat label="Impressions" value={formatInt(ad.impressions)} />
        <PanelStat label="Clicks" value={formatInt(ad.linkClicks)} />
        <PanelStat label="Leads" value={formatInt(ad.leads)} />
        <PanelStat label="CPL" value={ad.leads > 0 ? formatCurrency(cpl, true) : "—"} />
        <PanelStat label="Booked" value={formatInt(ad.bookedJobs)} />
        <PanelStat label="CP Booked" value={ad.bookedJobs > 0 ? formatCurrency(cpb, true) : "—"} />
        <PanelStat label="Sales" value={formatCurrency(ad.sales)} />
        <PanelStat label="ROAS" value={formatRoas(roas)} />
      </PanelGrid>
      {sevenDay && sevenDay.length > 0 ? (
        <div className="rounded-md border border-[color:var(--color-border-subtle)] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
            Last 7 days · daily spend
          </p>
          <Sparkline values={sevenDay} width={420} height={42} />
        </div>
      ) : null}
      <ActionRow />
    </div>
  );
}

function CampaignPanelBody({ c }: { c: AggregatedCampaign }) {
  const cpl = c.leads > 0 ? c.spend / c.leads : 0;
  const roas = c.spend > 0 ? c.sales / c.spend : 0;
  return (
    <div className="flex flex-col gap-5">
      <PanelGrid>
        <PanelStat label="Spend" value={formatCurrency(c.spend)} />
        <PanelStat label="Impressions" value={formatInt(c.impressions)} />
        <PanelStat label="Clicks" value={formatInt(c.linkClicks)} />
        <PanelStat label="Leads" value={formatInt(c.leads)} />
        <PanelStat label="CPL" value={c.leads > 0 ? formatCurrency(cpl, true) : "—"} />
        <PanelStat label="Booked" value={formatInt(c.bookedJobs)} />
        <PanelStat label="Sales" value={formatCurrency(c.sales)} />
        <PanelStat label="ROAS" value={formatRoas(roas)} />
      </PanelGrid>
      <ActionRow />
    </div>
  );
}

function AdsetPanelBody({ a }: { a: AggregatedAdset }) {
  const cpl = a.leads > 0 ? a.spend / a.leads : 0;
  const roas = a.spend > 0 ? a.sales / a.spend : 0;
  return (
    <div className="flex flex-col gap-5">
      <PanelGrid>
        <PanelStat label="Spend" value={formatCurrency(a.spend)} />
        <PanelStat label="Clicks" value={formatInt(a.linkClicks)} />
        <PanelStat label="Leads" value={formatInt(a.leads)} />
        <PanelStat label="CPL" value={a.leads > 0 ? formatCurrency(cpl, true) : "—"} />
        <PanelStat label="Booked" value={formatInt(a.bookedJobs)} />
        <PanelStat label="Sales" value={formatCurrency(a.sales)} />
        <PanelStat label="ROAS" value={formatRoas(roas)} />
      </PanelGrid>
      <ActionRow />
    </div>
  );
}

function BuPanelBody({ b }: { b: AggregatedBusinessUnit }) {
  const cpl = b.leads > 0 ? b.spend / b.leads : 0;
  const roas = b.spend > 0 ? b.sales / b.spend : 0;
  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-md border border-[color:var(--color-warning-soft)] bg-[color:var(--color-warning-soft)]/30 p-3 text-[11px] text-[color:var(--color-text-secondary)]">
        Spend on this view is allocated proportionally to lead share — Meta
        data is not tagged with a Business Unit, so the figures are estimates.
      </p>
      <PanelGrid>
        <PanelStat label="Allocated Spend" value={formatCurrency(b.spend)} />
        <PanelStat label="Leads" value={formatInt(b.leads)} />
        <PanelStat label="CPL" value={b.leads > 0 ? formatCurrency(cpl, true) : "—"} />
        <PanelStat label="Booked" value={formatInt(b.bookedJobs)} />
        <PanelStat label="Sales" value={formatCurrency(b.sales)} />
        <PanelStat label="ROAS" value={formatRoas(roas)} />
      </PanelGrid>
      <ActionRow />
    </div>
  );
}

function PanelGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>;
}

function PanelStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border-subtle)] bg-white p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-[color:var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function ActionRow() {
  return (
    <div className="flex flex-wrap gap-2 border-t border-[color:var(--color-border-subtle)] pt-4">
      <button
        type="button"
        disabled
        className="inline-flex h-8 items-center rounded-md border border-[color:var(--color-border-subtle)] bg-white px-3 text-[12px] font-medium text-[color:var(--color-text-secondary)] disabled:cursor-not-allowed"
      >
        ☆ Add to favorites
      </button>
      <button
        type="button"
        disabled
        className="inline-flex h-8 items-center rounded-md border border-[color:var(--color-border-subtle)] bg-white px-3 text-[12px] font-medium text-[color:var(--color-text-secondary)] disabled:cursor-not-allowed"
      >
        ✎ Add note
      </button>
    </div>
  );
}

