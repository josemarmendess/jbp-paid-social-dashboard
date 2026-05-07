import { FunnelClient } from "@/components/FunnelClient";
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
  }>;
}

export default async function FunnelPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  return (
    <FunnelClient
      businessUnits={businessUnits}
      initialState={{
        preset: parsePreset(sp.range),
        customStart: sp.start,
        customEnd: sp.end,
        bu: parseBuList(sp.bu, businessUnits),
        view: parseView(sp.view),
      }}
    />
  );
}
