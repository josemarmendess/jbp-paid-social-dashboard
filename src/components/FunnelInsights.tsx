import type { FunnelMetrics, FunnelRatesPoint } from "@/lib/aggregate";

interface FunnelInsightsProps {
  current: FunnelMetrics;
  previous: FunnelMetrics;
  rates: FunnelRatesPoint[];
}

interface Insight {
  tone: "positive" | "negative" | "neutral";
  title: string;
  detail: string;
}

/**
 * Three rule-based insight cards comparing current vs previous funnel
 * conversion rates plus a day-of-week pattern from the last 30 days. Pure
 * heuristics — fine for now; can swap in a learned model later.
 */
function buildInsights(
  current: FunnelMetrics,
  previous: FunnelMetrics,
  rates: FunnelRatesPoint[],
): Insight[] {
  const out: Insight[] = [];

  function rate(num: number, den: number): number | null {
    return den > 0 ? num / den : null;
  }

  const cur = {
    ctr: rate(current.linkClicks, current.impressions),
    leadRate: rate(current.leads, current.linkClicks),
    bookRate: rate(current.bookedJobs, current.leads),
    closeRate: rate(current.soldJobs, current.bookedJobs),
  };
  const prev = {
    ctr: rate(previous.linkClicks, previous.impressions),
    leadRate: rate(previous.leads, previous.linkClicks),
    bookRate: rate(previous.bookedJobs, previous.leads),
    closeRate: rate(previous.soldJobs, previous.bookedJobs),
  };

  // Biggest mover (relative change) among the four rates.
  const movers = (["ctr", "leadRate", "bookRate", "closeRate"] as const)
    .map((k) => {
      const c = cur[k];
      const p = prev[k];
      if (c == null || p == null || p === 0) return null;
      return { k, change: (c - p) / p, c, p };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  if (movers.length > 0) {
    const m = movers[0];
    const labels: Record<typeof m.k, string> = {
      ctr: "CTR",
      leadRate: "Lead Rate",
      bookRate: "Book Rate",
      closeRate: "Close Rate",
    };
    out.push({
      tone: m.change >= 0 ? "positive" : "negative",
      title: `${labels[m.k]} ${m.change >= 0 ? "improved" : "dropped"} ${Math.abs(m.change * 100).toFixed(1)}%`,
      detail: `Now ${(m.c * 100).toFixed(1)}% vs ${(m.p * 100).toFixed(1)}% in the previous period.`,
    });
  }

  // Best day of week for Book Rate over last 30 days.
  if (rates.length > 0) {
    const buckets: number[][] = [[], [], [], [], [], [], []];
    for (const r of rates) {
      const d = new Date(`${r.date}T12:00:00Z`);
      const dow = d.getUTCDay();
      if (r.bookRate > 0) buckets[dow].push(r.bookRate);
    }
    const avg = buckets.map((arr) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null,
    );
    let bestIdx = -1;
    let bestVal = 0;
    avg.forEach((v, i) => {
      if (v !== null && v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    });
    if (bestIdx >= 0) {
      const days = [
        "Sundays",
        "Mondays",
        "Tuesdays",
        "Wednesdays",
        "Thursdays",
        "Fridays",
        "Saturdays",
      ];
      out.push({
        tone: "neutral",
        title: `Book Rate is highest on ${days[bestIdx]}`,
        detail: `Averages ${(bestVal * 100).toFixed(1)}% over the last 30 days.`,
      });
    }
  }

  // Funnel bottleneck — lowest current rate.
  if (cur.ctr != null && cur.leadRate != null && cur.bookRate != null && cur.closeRate != null) {
    const ranked = [
      { k: "CTR", v: cur.ctr },
      { k: "Lead Rate", v: cur.leadRate },
      { k: "Book Rate", v: cur.bookRate },
      { k: "Close Rate", v: cur.closeRate },
    ].sort((a, b) => a.v - b.v);
    const worst = ranked[0];
    out.push({
      tone: "neutral",
      title: `${worst.k} is the funnel's tightest gate`,
      detail: `${(worst.v * 100).toFixed(1)}% — focus optimization here for biggest gains downstream.`,
    });
  }

  return out.slice(0, 3);
}

export function FunnelInsights({
  current,
  previous,
  rates,
}: FunnelInsightsProps) {
  const insights = buildInsights(current, previous, rates);
  if (insights.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {insights.map((ins, i) => (
        <div
          key={i}
          className="flex flex-col gap-1.5 rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                background:
                  ins.tone === "positive"
                    ? "var(--color-positive-soft)"
                    : ins.tone === "negative"
                      ? "var(--color-negative-soft)"
                      : "var(--color-jbp-cream)",
                color:
                  ins.tone === "positive"
                    ? "var(--color-positive)"
                    : ins.tone === "negative"
                      ? "var(--color-negative)"
                      : "var(--color-text-secondary)",
              }}
            >
              {ins.tone === "positive" ? "↑" : ins.tone === "negative" ? "↓" : "•"}
            </span>
            <p className="text-[12px] font-semibold text-[color:var(--color-text-primary)]">
              {ins.title}
            </p>
          </div>
          <p className="text-[12px] leading-relaxed text-[color:var(--color-text-secondary)]">
            {ins.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
