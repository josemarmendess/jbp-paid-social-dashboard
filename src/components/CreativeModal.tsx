"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import type { AggregatedAd, MetaAdCreativeRow } from "@/lib/types";
import { Sparkline } from "@/components/Sparkline";
import { CreativeThumb } from "@/components/CreativeThumb";
import { Tooltip } from "@/components/Tooltip";
import {
  formatCurrency,
  formatInt,
  formatRoas,
} from "@/lib/format";

interface CreativeModalProps {
  ad: AggregatedAd | null;
  creative?: MetaAdCreativeRow;
  sevenDaySpend?: number[];
  onClose: () => void;
}

/**
 * Full-screen modal showing the ad creative + all metrics. Backdrop click
 * or Escape closes. Falls back to the cream + mascot tile when the
 * meta_ad_creatives feed isn't populated yet.
 */
export function CreativeModal({
  ad,
  creative,
  sevenDaySpend,
  onClose,
}: CreativeModalProps) {
  useEffect(() => {
    if (!ad) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [ad, onClose]);

  if (!ad) return null;

  const cpl = ad.leads > 0 ? ad.spend / ad.leads : 0;
  const cpb = ad.bookedJobs > 0 ? ad.spend / ad.bookedJobs : 0;
  const roas = ad.spend > 0 ? ad.sales / ad.spend : 0;

  const previewSrc = creative?.thumbnail_url || creative?.image_url;
  const adsManagerUrl = creative?.permalink_url;
  // Direct link to the underlying media (image/video). Falls back through
  // common field names; kept undefined when nothing is available so the
  // button shows a disabled tooltip explaining what unlocks it.
  const mediaUrl =
    (creative as { media_url?: string } | undefined)?.media_url ||
    (creative as { video_url?: string } | undefined)?.video_url ||
    creative?.image_url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ad.adName}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--color-text-primary)]/35"
      />
      {/* Card */}
      <div className="relative z-10 flex max-h-full w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-[color:var(--color-border-subtle)] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/60 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]">
              {ad.audience} · {ad.businessUnit || "Untagged"}
            </p>
            <h2 className="truncate text-[16px] font-semibold text-[color:var(--color-text-primary)]">
              {ad.adName}
            </h2>
            <p className="mt-0.5 truncate text-[12px] text-[color:var(--color-text-secondary)]">
              {ad.campaignName}
              {ad.adsetName ? ` · ${ad.adsetName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-[280px_1fr]">
          {/* Creative preview */}
          <div className="flex flex-col gap-3">
            <CreativeThumb src={previewSrc} alt={ad.adName} size={280} />
            {creative?.title ? (
              <p className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                {creative.title}
              </p>
            ) : null}
            {creative?.body ? (
              <p className="text-[12px] leading-relaxed text-[color:var(--color-text-secondary)]">
                {creative.body}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {mediaUrl ? (
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border-subtle)] bg-white px-3 text-[12px] font-semibold text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-surface-hover)]"
                >
                  Open media
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <Tooltip content="Disabled — enable by adding image_url, video_url, or media_url to the meta_ad_creatives feed.">
                  <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/60 px-3 text-[12px] font-medium text-[color:var(--color-text-tertiary)]">
                    Open media
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Tooltip>
              )}
              {adsManagerUrl ? (
                <a
                  href={adsManagerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[color:var(--color-jbp-blue)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[color:var(--color-jbp-blue-hover)]"
                >
                  View in Ads Manager
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <Tooltip content="Disabled — enable by adding permalink_url to the meta_ad_creatives feed.">
                  <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[color:var(--color-jbp-blue)]/30 px-3 text-[12px] font-semibold text-white">
                    View in Ads Manager
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Metric grid */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Spend" value={formatCurrency(ad.spend)} />
              <Stat label="Impressions" value={formatInt(ad.impressions)} />
              <Stat label="Link Clicks" value={formatInt(ad.linkClicks)} />
              <Stat label="Leads" value={formatInt(ad.leads)} />
              <Stat
                label="Cost / Lead"
                value={ad.leads > 0 ? formatCurrency(cpl, true) : "—"}
              />
              <Stat label="Booked" value={formatInt(ad.bookedJobs)} />
              <Stat
                label="Cost / Booked"
                value={ad.bookedJobs > 0 ? formatCurrency(cpb, true) : "—"}
              />
              <Stat label="Sales" value={formatCurrency(ad.sales)} />
              <Stat label="ROAS" value={formatRoas(roas)} />
            </div>
            {sevenDaySpend && sevenDaySpend.length > 0 ? (
              <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/40 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
                  Last 7 days · daily spend
                </p>
                <Sparkline values={sevenDaySpend} width={400} height={48} />
              </div>
            ) : null}
            {!previewSrc ? (
              <p className="rounded-md bg-[color:var(--color-warning-soft)]/50 p-3 text-[11px] text-[color:var(--color-text-secondary)]">
                Creative thumbnails are not in the API payload yet. Once the
                <code className="mx-1 rounded bg-white px-1 py-0.5 font-mono text-[10px]">
                  meta_ad_creatives
                </code>
                feed is wired in, previews will appear here automatically.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[color:var(--color-border-subtle)] bg-white p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-[16px] font-semibold tabular-nums text-[color:var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
