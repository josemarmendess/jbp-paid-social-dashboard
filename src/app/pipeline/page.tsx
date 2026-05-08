import { PipelineClient } from "@/components/PipelineClient";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";
import { parseComparison, parsePreset } from "@/lib/dateRange";
import { parseBuList, parseView } from "@/lib/buFilter";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    cmp?: string;
    view?: string;
  }>;
}

export default async function PipelinePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  return (
    <PipelineClient
      businessUnits={businessUnits}
      initialState={{
        preset: parsePreset(sp.range),
        customStart: sp.start,
        customEnd: sp.end,
        bu: parseBuList(sp.bu, businessUnits),
        view: parseView(sp.view),
        comparison: parseComparison(sp.cmp),
      }}
    />
  );
}
