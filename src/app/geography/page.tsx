import { GeographyClient } from "@/components/GeographyClient";
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

export default async function GeographyPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  return (
    <GeographyClient
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
