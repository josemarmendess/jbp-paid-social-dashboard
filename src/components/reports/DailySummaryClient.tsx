"use client";

import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileText,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";
import { ClientPageHeader } from "@/components/ClientPageHeader";
import { Eyebrow } from "@/components/design";
import { ErrorBanner } from "@/components/ErrorBanner";
import { usePaidSocialData } from "@/components/PaidSocialDataProvider";
import { DailySummaryReport } from "@/components/reports/DailySummaryReport";
import { ReportCustomizer } from "@/components/reports/ReportCustomizer";
import {
  loadDailySummaryConfig,
  saveDailySummaryConfig,
} from "@/lib/reportPersistence";
import {
  DAILY_SUMMARY_DEFAULT_CONFIG,
  type DailySummaryConfig,
  type DailySummaryPeriod,
} from "@/lib/reportTemplates";
import type { ComparisonMode, DateRangePreset } from "@/lib/types";

interface DailySummaryClientProps {
  businessUnits: string[];
  initialState: {
    preset: DateRangePreset;
    customStart?: string;
    customEnd?: string;
    bu: string[];
    comparison: ComparisonMode;
  };
}

/**
 * Editor for the Daily Summary report. Two-column layout: Customizer panel
 * on the left, live report preview on the right. Top action bar carries
 * Save, Reset, Download PDF/PNG, Copy, and Send-to-Slack.
 *
 * The page header reuses ClientPageHeader so the global filters still apply
 * (period / BU / comparison) — though the report itself uses its own period
 * catalog independent from the page filter, the header keeps the layout
 * consistent with the rest of the app.
 */
export function DailySummaryClient({
  businessUnits,
  initialState,
}: DailySummaryClientProps) {
  const { data, error } = usePaidSocialData();
  const [preset, setPreset] = useState<DateRangePreset>(initialState.preset);
  const [customStart, setCustomStart] = useState<string | undefined>(
    initialState.customStart,
  );
  const [customEnd, setCustomEnd] = useState<string | undefined>(
    initialState.customEnd,
  );
  const [bu, setBu] = useState<string[]>(initialState.bu);
  const [comparison, setComparison] = useState<ComparisonMode>(
    initialState.comparison,
  );

  // Hydrate the saved config on mount (localStorage is client-only). Until
  // it lands we render with defaults so the page paints immediately.
  const [config, setConfig] = useState<DailySummaryConfig>(
    DAILY_SUMMARY_DEFAULT_CONFIG,
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setConfig(loadDailySummaryConfig());
    setHydrated(true);
  }, []);

  // Whether the in-memory config differs from what's in storage. Drives the
  // Save button's enabled/disabled state.
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function update(next: DailySummaryConfig) {
    setConfig(next);
    setDirty(true);
  }

  function handleSave() {
    saveDailySummaryConfig(config);
    setDirty(false);
    flashToast("Saved");
  }

  function handleReset() {
    setConfig(DAILY_SUMMARY_DEFAULT_CONFIG);
    setDirty(true);
    flashToast("Reset to defaults");
  }

  function flashToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }

  const reportRef = useRef<HTMLDivElement>(null);

  async function handleDownloadPng() {
    const node = reportRef.current;
    if (!node) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getCssVar("--color-jbp-cream") || "#f4ede0",
      });
      triggerDownload(dataUrl, slugify(config.title) + ".png");
      flashToast("PNG downloaded");
    } catch (err) {
      console.error(err);
      flashToast("PNG export failed");
    }
  }

  async function handleDownloadPdf() {
    const node = reportRef.current;
    if (!node) return;
    try {
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getCssVar("--color-jbp-cream") || "#f4ede0",
      });
      // Get image natural dimensions to choose a fitting PDF page size.
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const wPt = 612; // US Letter width in points
      const ratio = img.naturalHeight / img.naturalWidth;
      const hPt = wPt * ratio;
      const pdf = new jsPDF({
        orientation: hPt > wPt ? "portrait" : "landscape",
        unit: "pt",
        format: [wPt, hPt],
      });
      pdf.addImage(dataUrl, "PNG", 0, 0, wPt, hPt);
      pdf.save(slugify(config.title) + ".pdf");
      flashToast("PDF downloaded");
    } catch (err) {
      console.error(err);
      flashToast("PDF export failed");
    }
  }

  async function handleCopy() {
    const node = reportRef.current;
    if (!node) return;
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: getCssVar("--color-jbp-cream") || "#f4ede0",
      });
      if (!blob) throw new Error("toBlob returned null");
      // navigator.clipboard.write is gated behind window focus + a secure
      // context. The page is HTTPS on Vercel; this works for users on
      // Chromium-family browsers. Safari < 16 blocks it — fall back to
      // an error toast so the user knows to use Download instead.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flashToast("Copied to clipboard");
    } catch (err) {
      console.error(err);
      flashToast("Copy failed — try Download PNG");
    }
  }

  async function handleSendSlack() {
    const node = reportRef.current;
    if (!node) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: getCssVar("--color-jbp-cream") || "#f4ede0",
      });
      const res = await fetch("/api/reports/slack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "daily-summary",
          title: config.title,
          imageDataUrl: dataUrl,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        message?: string;
        setupHint?: string;
      };
      if (res.status === 412) {
        // 412 = Slack not configured; flash a longer-lived toast with the
        // setup hint so the user knows what to wire up.
        setToast(json.setupHint ?? "Slack not configured.");
        window.setTimeout(() => setToast(null), 6000);
        return;
      }
      if (!res.ok || !json.ok) {
        flashToast(json.message ?? "Slack send failed");
        return;
      }
      flashToast(json.message ?? "Sent to Slack — review in your DM");
    } catch (err) {
      console.error(err);
      flashToast("Slack send failed");
    }
  }

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
        pageTitle="Daily Summary"
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
        comparison={comparison}
        onComparisonChange={setComparison}
        showViewToggle={false}
        caption="Reports · Daily Summary template"
      />

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 28px",
          background: "var(--color-jbp-white)",
          borderBottom: "1px solid var(--color-jbp-hairline)",
        }}
      >
        <ActionButton
          icon={<Save className="h-3.5 w-3.5" />}
          label={dirty ? "Save changes" : "Saved"}
          onClick={handleSave}
          primary
          disabled={!dirty || !hydrated}
        />
        <ActionButton
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          label="Reset"
          onClick={handleReset}
        />
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-jbp-hairline)",
            margin: "0 4px",
          }}
        />
        <ActionButton
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Download PDF"
          onClick={handleDownloadPdf}
        />
        <ActionButton
          icon={<Download className="h-3.5 w-3.5" />}
          label="Download PNG"
          onClick={handleDownloadPng}
        />
        <ActionButton
          icon={<Copy className="h-3.5 w-3.5" />}
          label="Copy"
          onClick={handleCopy}
        />
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-jbp-hairline)",
            margin: "0 4px",
          }}
        />
        <ActionButton
          icon={<Send className="h-3.5 w-3.5" />}
          label="Send via Slack"
          onClick={handleSendSlack}
        />
        {!dirty && hydrated ? (
          <span
            style={{
              marginLeft: "auto",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--color-jbp-good)",
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            Saved · localStorage
          </span>
        ) : null}
      </div>

      {/* Body: customizer + preview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
          padding: "20px 28px 32px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ position: "sticky", top: 12 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Customize</Eyebrow>
          <ReportCustomizer
            config={config}
            onChange={update}
            onTitleChange={(title) => update({ ...config, title })}
            onHeroPeriodChange={(heroPeriod) =>
              update({ ...config, heroPeriod })
            }
          />
        </div>
        <div>
          <Eyebrow style={{ marginBottom: 8 }}>Preview</Eyebrow>
          <div
            style={{
              border: "1px solid var(--color-jbp-hairline)",
              background: "var(--color-jbp-cream)",
              padding: 12,
              overflowX: "auto",
            }}
          >
            <DailySummaryReport
              ref={reportRef}
              data={data}
              config={config}
            />
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            padding: "10px 16px",
            background: "var(--color-jbp-ink)",
            color: "var(--color-jbp-cream)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            letterSpacing: 0.4,
            border: "1px solid var(--color-jbp-ink)",
            maxWidth: 480,
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        padding: "0 12px",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        border: "1px solid var(--color-jbp-hairline)",
        background: primary
          ? "var(--color-jbp-ink)"
          : "var(--color-jbp-white)",
        color: primary
          ? "var(--color-jbp-cream)"
          : "var(--color-jbp-text)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function getCssVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Re-export for the page wrapper.
export type { DailySummaryPeriod };
