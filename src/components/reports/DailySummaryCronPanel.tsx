"use client";

import { useEffect, useState, useTransition } from "react";
import { Play, Save } from "lucide-react";
import { Eyebrow } from "@/components/design";
import {
  loadDailySummaryCronAction,
  saveDailySummaryCronAction,
  sendDailySummaryNowAction,
  type CronStateView,
} from "@/app/reports/daily-summary/actions";
import {
  DEFAULT_CRON_CONFIG,
  type CronConfig,
} from "@/lib/cron/types";

/**
 * Schedule + send-now controls for the Daily Summary cron. Backed by
 * Upstash Redis on the server (lib/cron/storage.ts) so toggles persist
 * across redeploys and team members; the cron tick reads the same
 * record every hour and decides whether to fire.
 *
 * If Upstash isn't connected yet, this panel renders a setup banner
 * and stays read-only — the rest of the report editor still works.
 */
export function DailySummaryCronPanel() {
  const [state, setState] = useState<CronStateView | null>(null);
  const [draft, setDraft] = useState<CronConfig>(DEFAULT_CRON_CONFIG);
  const [dirty, setDirty] = useState(false);
  const [busy, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadDailySummaryCronAction().then((s) => {
      setState(s);
      setDraft(s.config);
    });
  }, []);

  function patch(next: Partial<CronConfig>) {
    setDraft((d) => ({ ...d, ...next }));
    setDirty(true);
  }

  function flash(msg: string, ms = 2400) {
    setToast(msg);
    window.setTimeout(() => setToast(null), ms);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveDailySummaryCronAction(draft);
      if (result.ok) {
        setState({ configured: true, config: result.config });
        setDraft(result.config);
        setDirty(false);
        flash("Schedule saved");
      } else {
        flash(result.error ?? "Save failed", 5000);
      }
    });
  }

  function handleSendNow() {
    startTransition(async () => {
      const result = await sendDailySummaryNowAction();
      if (result.ok) {
        flash(`Preview sent · ${result.sent ?? "now"}`, 3500);
        // Re-read so the "last sent" timestamp updates.
        const fresh = await loadDailySummaryCronAction();
        setState(fresh);
        if (!dirty) setDraft(fresh.config);
      } else {
        flash(`Send failed: ${result.error ?? "unknown"}`, 6000);
      }
    });
  }

  if (state === null) {
    return (
      <Section>
        <Eyebrow>Daily preview · schedule</Eyebrow>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-jbp-text-3)" }}>
          Loading…
        </div>
      </Section>
    );
  }

  if (!state.configured) {
    return (
      <Section>
        <Eyebrow>Daily preview · schedule</Eyebrow>
        <div style={setupBannerStyle}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Upstash Redis not connected
          </div>
          <div>
            Vercel project → Storage → Marketplace → <strong>Upstash · Redis</strong> →
            connect to project, then redeploy. Once it&apos;s wired the toggle, hour
            and channels below become editable.
          </div>
        </div>
      </Section>
    );
  }

  const last = state.config;

  return (
    <Section>
      <Eyebrow style={{ marginBottom: 10 }}>Daily preview · schedule</Eyebrow>

      {/* Master toggle */}
      <ToggleRow
        label={draft.enabled ? "On" : "Off"}
        sub={
          draft.enabled
            ? "Fires once a day on the schedule below."
            : "Cron is paused — no preview will be sent."
        }
        checked={draft.enabled}
        onChange={(checked) => patch({ enabled: checked })}
      />

      {/* Schedule (read-only on Hobby tier) */}
      <Field
        label="Schedule"
        hint="Vercel Hobby tier fires cron once a day. To change the time, edit vercel.json and redeploy. Pro plan unlocks runtime hour control."
      >
        <div style={readOnlyBoxStyle}>
          Daily · 5:00 PM CT (CDT) / 4:00 PM CT (CST)
        </div>
      </Field>

      {/* Channels */}
      <Field
        label="Reviewer (your DM)"
        hint="User ID (U…) or DM channel (D…). Empty = SLACK_REVIEW_CHANNEL env."
      >
        <input
          type="text"
          value={draft.reviewerChannel}
          onChange={(e) => patch({ reviewerChannel: e.target.value })}
          placeholder="U0AD83L7EDU"
          style={inputStyle}
        />
      </Field>
      <Field
        label="Target group channel"
        hint="Channel ID (C… / G…). Empty = SLACK_DAILY_CHANNEL env."
      >
        <input
          type="text"
          value={draft.targetChannel}
          onChange={(e) => patch({ targetChannel: e.target.value })}
          placeholder="C01ABCDE234"
          style={inputStyle}
        />
      </Field>

      {/* Save + Send-now */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <PanelButton
          icon={<Save className="h-3.5 w-3.5" />}
          label={dirty ? "Save schedule" : "Saved"}
          disabled={!dirty || busy}
          onClick={handleSave}
          primary
        />
        <PanelButton
          icon={<Play className="h-3.5 w-3.5" />}
          label={busy ? "Working…" : "Send preview now"}
          disabled={busy}
          onClick={handleSendNow}
        />
      </div>

      {/* Status line */}
      <div style={statusBoxStyle}>
        <StatusRow
          label="Last sent"
          value={last.lastSentAt ? formatTimestamp(last.lastSentAt) : "—"}
        />
        <StatusRow
          label="Last error"
          value={last.lastError ?? "—"}
          tone={last.lastError ? "bad" : undefined}
        />
      </div>

      {toast ? (
        <div role="status" style={toastStyle}>
          {toast}
        </div>
      ) : null}
    </Section>
  );
}

/* ──────────────── presentational helpers ──────────────── */

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "20px 18px",
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        background: checked
          ? "rgba(34, 134, 58, 0.08)"
          : "var(--color-jbp-paper)",
        border: `1px solid ${checked ? "rgba(34, 134, 58, 0.45)" : "var(--color-jbp-hairline)"}`,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 16,
          background: checked
            ? "var(--color-jbp-good, #22863a)"
            : "var(--color-jbp-hairline)",
          borderRadius: 999,
          position: "relative",
          flexShrink: 0,
          transition: "background .12s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 14 : 2,
            width: 12,
            height: 12,
            background: "var(--color-jbp-white)",
            borderRadius: 999,
            transition: "left .12s",
          }}
        />
      </span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
        <span
          style={{
            fontSize: 11,
            color: "var(--color-jbp-text-3)",
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          {sub}
        </span>
      </span>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          color: "var(--color-jbp-text-2)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 4 }}>{children}</div>
      {hint ? (
        <div
          style={{
            marginTop: 4,
            fontSize: 10,
            color: "var(--color-jbp-text-3)",
            lineHeight: 1.4,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bad";
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--color-jbp-text-3)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          color:
            tone === "bad" ? "var(--color-jbp-bad)" : "var(--color-jbp-text)",
          textAlign: "right",
          maxWidth: "70%",
          wordBreak: "break-word",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function PanelButton({
  icon,
  label,
  onClick,
  primary,
  disabled,
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
        padding: "7px 10px",
        background: primary
          ? "var(--color-jbp-ink)"
          : "var(--color-jbp-paper)",
        color: primary ? "var(--color-jbp-cream)" : "var(--color-jbp-text)",
        border: `1px solid ${primary ? "var(--color-jbp-ink)" : "var(--color-jbp-hairline)"}`,
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ──────────────── formatting ──────────────── */

function formatHour(h: number): string {
  const hh = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hh}:00 ${ampm}`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(d) + " CT";
  } catch {
    return iso;
  }
}

/* ──────────────── styles ──────────────── */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  background: "var(--color-jbp-paper)",
  border: "1px solid var(--color-jbp-hairline)",
  color: "var(--color-jbp-text)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const readOnlyBoxStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  background: "var(--color-jbp-paper)",
  border: "1px solid var(--color-jbp-hairline)",
  color: "var(--color-jbp-text-2)",
};

const setupBannerStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 12px",
  background: "rgba(217, 119, 6, 0.08)",
  border: "1px solid rgba(217, 119, 6, 0.4)",
  fontSize: 11,
  color: "var(--color-jbp-text)",
  lineHeight: 1.5,
};

const statusBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 12px",
  background: "var(--color-jbp-paper)",
  border: "1px solid var(--color-jbp-hairline)",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const toastStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "8px 10px",
  background: "var(--color-jbp-ink)",
  color: "var(--color-jbp-cream)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  letterSpacing: 0.4,
  textAlign: "center",
};
