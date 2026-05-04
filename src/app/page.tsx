import { Header } from "@/components/Header";
import { KpiCard } from "@/components/KpiCard";
import { AdPerformanceTable } from "@/components/AdPerformanceTable";
import { fetchPaidSocialData } from "@/lib/fetchData";
import { getPeriod, parsePreset } from "@/lib/dateRange";
import { aggregateByAd, computeKpiPair } from "@/lib/aggregate";
import {
  formatCurrency,
  formatInt,
  formatPercent,
  formatRoas,
} from "@/lib/format";

export const revalidate = 1800;

interface PageProps {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { range, start, end } = await searchParams;
  const preset = parsePreset(range);
  const period = getPeriod(preset, start, end);

  const data = await fetchPaidSocialData();

  const kpis = computeKpiPair(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
    period.previous,
  );
  const ads = aggregateByAd(
    data.meta_insights,
    data.servicetitan_social_leads,
    period.current,
  );

  return (
    <main className="flex flex-1 flex-col">
      <Header
        generatedAt={data.generated_at}
        preset={preset}
        customStart={preset === "custom" ? period.current.startStr : undefined}
        customEnd={preset === "custom" ? period.current.endStr : undefined}
      />
      <div className="flex flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        >
          <KpiCard
            label="Spend"
            value={formatCurrency(kpis.current.spend, true)}
            current={kpis.current.spend}
            previous={kpis.previous.spend}
            invertDelta
          />
          <KpiCard
            label="Leads"
            value={formatInt(kpis.current.leads)}
            current={kpis.current.leads}
            previous={kpis.previous.leads}
          />
          <KpiCard
            label="Booked Jobs"
            value={formatInt(kpis.current.bookedJobs)}
            current={kpis.current.bookedJobs}
            previous={kpis.previous.bookedJobs}
          />
          <KpiCard
            label="Sales"
            value={formatCurrency(kpis.current.sales)}
            current={kpis.current.sales}
            previous={kpis.previous.sales}
          />
          <KpiCard
            label="ROAS"
            value={formatRoas(kpis.current.roas)}
            current={kpis.current.roas}
            previous={kpis.previous.roas}
          />
          <KpiCard
            label="Spend on Sales"
            value={
              kpis.current.spendOnSales > 0
                ? formatPercent(kpis.current.spendOnSales)
                : "—"
            }
            hint="Target <20%"
            current={kpis.current.spendOnSales}
            previous={kpis.previous.spendOnSales}
            invertDelta
          />
        </section>

        <section aria-label="Performance by ad" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Performance by Ad
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {period.current.startStr} → {period.current.endStr} · {ads.length}{" "}
              {ads.length === 1 ? "ad" : "ads"}
            </p>
          </div>
          <AdPerformanceTable rows={ads} />
        </section>
      </div>
    </main>
  );
}
