const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const intFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

const pctFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export function formatCurrency(n: number, precise = false): string {
  if (!Number.isFinite(n)) return "—";
  return precise ? usdPrecise.format(n) : usd.format(n);
}

export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return intFmt.format(Math.round(n));
}

export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return "—";
  return pctFmt.format(ratio);
}

export function formatRoas(roas: number): string {
  if (!Number.isFinite(roas) || roas === 0) return "—";
  return `${roas.toFixed(2)}x`;
}

export function formatDelta(deltaPct: number): string {
  if (!Number.isFinite(deltaPct)) return "—";
  const sign = deltaPct > 0 ? "+" : "";
  return `${sign}${(deltaPct * 100).toFixed(1)}%`;
}

export function pctChange(current: number, previous: number): number {
  if (!Number.isFinite(previous) || previous === 0) {
    if (!current) return 0;
    return Number.POSITIVE_INFINITY;
  }
  return (current - previous) / previous;
}

/** Compact dollar — e.g. $1.2M / $42.5k / $930. Used in hero KPIs and tables. */
export function formatCompactMoney(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

/** Compact integer — e.g. 1.2M / 42.5k / 930. */
export function formatCompactInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toString();
}
