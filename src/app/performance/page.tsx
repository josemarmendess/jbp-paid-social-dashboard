import { PerformanceClient } from "@/components/PerformanceClient";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";
import { parseComparison, parsePreset } from "@/lib/dateRange";
import { parseBuList } from "@/lib/buFilter";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    cmp?: string;
  }>;
}

export default async function PerformancePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  return (
    <PerformanceClient
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
