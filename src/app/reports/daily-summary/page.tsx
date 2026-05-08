import { DailySummaryClient } from "@/components/reports/DailySummaryClient";
import { parseBuList } from "@/lib/buFilter";
import { parseComparison, parsePreset } from "@/lib/dateRange";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    cmp?: string;
  }>;
}

export default async function DailySummaryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  return (
    <DailySummaryClient
      businessUnits={businessUnits}
      initialState={{
        preset: parsePreset(sp.range),
        customStart: sp.start,
        customEnd: sp.end,
        bu: parseBuList(sp.bu, businessUnits),
        comparison: parseComparison(sp.cmp),
      }}
    />
  );
}
