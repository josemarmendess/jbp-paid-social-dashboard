import { HistoryClient } from "@/components/HistoryClient";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";
import { parsePreset } from "@/lib/dateRange";
import { parseBuList, parseView } from "@/lib/buFilter";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    view?: string;
    months?: string;
  }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  const monthsBack = Math.max(3, Math.min(36, Number(sp.months) || 12));
  return (
    <HistoryClient
      businessUnits={businessUnits}
      initialState={{
        preset: parsePreset(sp.range),
        customStart: sp.start,
        customEnd: sp.end,
        bu: parseBuList(sp.bu, businessUnits),
        view: parseView(sp.view),
        monthsBack,
      }}
    />
  );
}
