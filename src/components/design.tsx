import type { CSSProperties, ReactNode } from "react";
import { Sparkline } from "@/components/Sparkline";

/**
 * Shared design primitives for the redesigned pages. Visual language ports
 * the prototype 1:1: hairline borders, sharp corners, no shadows, weight-
 * driven type hierarchy, eyebrow labels, tabular numerals on every number.
 */

/* ───────────── Card ───────────── */

export function Card({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--color-jbp-white)",
        border: "1px solid var(--color-jbp-hairline)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "16px 20px",
        borderBottom: "1px solid var(--color-jbp-hairline)",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 auto" }}>
        {eyebrow ? <Eyebrow style={{ marginBottom: 4 }}>{eyebrow}</Eyebrow> : null}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--color-jbp-text)",
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </div>
        {sub ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--color-jbp-text-2)",
              marginTop: 2,
              fontFamily: "var(--font-mono)",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
      {right ? <div style={{ flex: "0 0 auto" }}>{right}</div> : null}
    </div>
  );
}

/* ───────────── Eyebrow ───────────── */

export function Eyebrow({
  children,
  size = 10,
  color,
  style,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: 1.4,
        textTransform: "uppercase",
        color: color ?? "var(--color-jbp-text-2)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ───────────── Delta ───────────── */

export function Delta({
  value,
  invertGood = false,
  size = "sm",
  showSign = true,
}: {
  /** Value as a percent number, e.g. 12.5 means +12.5%. null → em-dash. */
  value: number | null | undefined;
  invertGood?: boolean;
  size?: "sm" | "md" | "lg";
  showSign?: boolean;
}) {
  if (value == null || !Number.isFinite(value)) {
    return (
      <span
        style={{
          color: "var(--color-jbp-text-3)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
        }}
      >
        —
      </span>
    );
  }
  const isPositive = value > 0;
  const isGood = value === 0 ? null : invertGood ? !isPositive : isPositive;
  const color =
    isGood == null
      ? "var(--color-jbp-text-2)"
      : isGood
        ? "var(--color-jbp-good)"
        : "var(--color-jbp-bad)";
  const arrow = value === 0 ? "→" : isPositive ? "↑" : "↓";
  const fontSize = size === "lg" ? 13 : size === "md" ? 12 : 11;
  return (
    <span
      style={{
        color,
        fontSize,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontVariantNumeric: "tabular-nums",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ fontSize: fontSize + 1, lineHeight: 1 }}>{arrow}</span>
      {showSign && isPositive ? "+" : ""}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ───────────── SimpleKpi (4-up tile) ───────────── */

export function SimpleKpi({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Inverted treatment — red fill, white text. Used for the "headline" tile. */
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--color-jbp-red)" : "var(--color-jbp-white)",
        color: accent ? "#fff" : "var(--color-jbp-text)",
        border: `1px solid ${
          accent ? "var(--color-jbp-red)" : "var(--color-jbp-hairline)"
        }`,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: accent ? "rgba(255,255,255,.8)" : "var(--color-jbp-text-2)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          letterSpacing: -0.8,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: accent ? "rgba(255,255,255,.7)" : "var(--color-jbp-text-2)",
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── HeroKpi (2-up large) ───────────── */

export function HeroKpi({
  label,
  value,
  delta,
  spark,
  sub,
  accent = false,
  invertDelta = false,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  spark?: number[];
  sub?: string;
  accent?: boolean;
  invertDelta?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--color-jbp-ink)" : "var(--color-jbp-white)",
        color: accent ? "var(--color-jbp-cream)" : "var(--color-jbp-text)",
        border: `1px solid ${
          accent ? "var(--color-jbp-ink)" : "var(--color-jbp-hairline)"
        }`,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        minHeight: 156,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: accent ? "rgba(244,237,224,.7)" : "var(--color-jbp-text-2)",
          }}
        >
          {label}
        </div>
        {delta != null ? <Delta value={delta} invertGood={invertDelta} /> : null}
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          letterSpacing: -2,
          lineHeight: 0.95,
          fontVariantNumeric: "tabular-nums",
          color: accent ? "var(--color-jbp-cream)" : "var(--color-jbp-text)",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontSize: 11,
            color: accent
              ? "rgba(244,237,224,.55)"
              : "var(--color-jbp-text-2)",
            fontFamily: "var(--font-mono)",
            letterSpacing: 0.2,
          }}
        >
          {sub}
        </div>
      ) : null}
      {spark && spark.length > 1 ? (
        <div
          style={{
            position: "absolute",
            right: 16,
            bottom: 14,
            opacity: accent ? 0.5 : 0.85,
          }}
        >
          <Sparkline
            values={spark}
            width={92}
            height={28}
            stroke={accent ? "var(--color-jbp-cream)" : "var(--color-jbp-red)"}
            showBaseline={false}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── Metric (divided 6-up cell) ───────────── */

export function Metric({
  label,
  value,
  delta,
  invertDelta = false,
  hero = false,
  compact = false,
  last = false,
  sub,
}: {
  label: string;
  value: ReactNode;
  delta?: number | null;
  invertDelta?: boolean;
  /** Highlight cell — paper background, larger value. */
  hero?: boolean;
  /** Smaller padding + value — used in conversion-rate row. */
  compact?: boolean;
  /** Drop the right border (last cell in a row). */
  last?: boolean;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: compact ? "14px 16px" : "18px 20px",
        borderRight: last ? "none" : "1px solid var(--color-jbp-hairline)",
        background: hero ? "var(--color-jbp-paper)" : "transparent",
        display: "flex",
        flexDirection: "column",
        gap: 6,
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
          fontSize: hero ? 28 : compact ? 20 : 22,
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          letterSpacing: -0.6,
          fontVariantNumeric: "tabular-nums",
          color: "var(--color-jbp-text)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {delta != null || sub ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {delta != null ? (
            <Delta value={delta} invertGood={invertDelta} />
          ) : null}
          {sub ? (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-jbp-text-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {sub}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── ServiceTag ─────────────
 * Color-coded chip for service-category cells in tables. Different colors
 * per service line so a long table is scannable at a glance. Falls back to
 * neutral paper for unknown labels. */

export function ServiceTag({
  label,
  size = "sm",
}: {
  label: string;
  size?: "sm" | "md";
}) {
  if (!label) {
    return (
      <span style={{ color: "var(--color-jbp-text-3)", fontSize: 11 }}>—</span>
    );
  }
  const c = serviceTagColor(label);
  const padY = size === "md" ? 3 : 2;
  const padX = size === "md" ? 8 : 7;
  const fs = size === "md" ? 11 : 10;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${padY}px ${padX}px`,
        background: c.bg,
        color: c.fg,
        fontSize: fs,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontFamily: "var(--font-mono)",
        border: `1px solid ${c.border}`,
      }}
    >
      {label}
    </span>
  );
}

function serviceTagColor(label: string): {
  bg: string;
  fg: string;
  border: string;
} {
  const n = label.toLowerCase();
  if (n.includes("bath"))
    return {
      bg: "rgba(26,58,92,0.08)",
      fg: "var(--color-jbp-svc-water)",
      border: "rgba(26,58,92,0.18)",
    };
  if (n.includes("sewer"))
    return {
      bg: "rgba(168,115,17,0.10)",
      fg: "var(--color-jbp-svc-sewer)",
      border: "rgba(168,115,17,0.22)",
    };
  if (n.includes("plumb"))
    return {
      bg: "rgba(74,72,66,0.08)",
      fg: "var(--color-jbp-svc-plumbing)",
      border: "rgba(74,72,66,0.20)",
    };
  if (n.includes("drain"))
    return {
      bg: "rgba(196,30,30,0.08)",
      fg: "var(--color-jbp-svc-drain)",
      border: "rgba(196,30,30,0.22)",
    };
  if (n.includes("emerg") || n.includes("urgent"))
    return {
      bg: "rgba(122,16,16,0.08)",
      fg: "var(--color-jbp-svc-emergency)",
      border: "rgba(122,16,16,0.22)",
    };
  if (n.includes("water"))
    return {
      bg: "rgba(26,58,92,0.08)",
      fg: "var(--color-jbp-svc-water)",
      border: "rgba(26,58,92,0.18)",
    };
  return {
    bg: "var(--color-jbp-paper)",
    fg: "var(--color-jbp-text-2)",
    border: "var(--color-jbp-hairline)",
  };
}

/* ───────────── StatusPill ───────────── */

export function StatusPill({
  status,
  tone,
}: {
  status: string;
  /** Override the implicit tone mapping. */
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const t =
    tone ??
    (/active|live|connected|sold|winning/i.test(status)
      ? "good"
      : /paused|warn|stale|on site|diagnosed/i.test(status)
        ? "warn"
        : /archive|cancel|error|under/i.test(status)
          ? "bad"
          : "neutral");
  const map = {
    good: {
      bg: "var(--color-jbp-good-soft)",
      fg: "var(--color-jbp-good)",
      dot: "var(--color-jbp-good)",
    },
    warn: {
      bg: "var(--color-jbp-warn-soft)",
      fg: "var(--color-jbp-warn)",
      dot: "var(--color-jbp-warn)",
    },
    bad: {
      bg: "var(--color-jbp-bad-soft)",
      fg: "var(--color-jbp-bad)",
      dot: "var(--color-jbp-bad)",
    },
    neutral: {
      bg: "var(--color-jbp-cream)",
      fg: "var(--color-jbp-text-3)",
      dot: "var(--color-jbp-text-3)",
    },
  } as const;
  const c = map[t];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        background: c.bg,
        color: c.fg,
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: c.dot,
        }}
      />
      {status}
    </span>
  );
}
