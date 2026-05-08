import { OverviewClient } from "@/components/OverviewClient";
import { CANONICAL_SERVICES } from "@/lib/serviceTaxonomy";
import { parseComparison, parsePreset } from "@/lib/dateRange";
import { parseBuList, parseView } from "@/lib/buFilter";
import { parseGoalTargets } from "@/lib/goals";
import {
  parsePivotColKeys,
  parsePivotRowKeys,
} from "@/lib/pivotConfig";
import { getPivotPeriods } from "@/lib/periods";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    bu?: string;
    view?: string;
    pivotRows?: string;
    pivotCols?: string;
    cplTarget?: string;
    roasTarget?: string;
    cancelTarget?: string;
    cmp?: string;
  }>;
}

/**
 * Thin server shell — the layout already loaded the Apps Script payload
 * into the PaidSocialDataProvider context. Here we just parse the URL
 * params into the client component's seed state.
 */
export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;
  const businessUnits = [...CANONICAL_SERVICES];
  const pivotPeriods = getPivotPeriods();

  const initialState = {
    preset: parsePreset(sp.range),
    customStart: sp.start,
    customEnd: sp.end,
    bu: parseBuList(sp.bu, businessUnits),
    view: parseView(sp.view),
    comparison: parseComparison(sp.cmp),
    pivotRowKeys: parsePivotRowKeys(sp.pivotRows),
    pivotColKeys: parsePivotColKeys(
      sp.pivotCols,
      pivotPeriods.map((p) => p.key),
    ),
    targets: parseGoalTargets(sp),
  };

  return (
    <OverviewClient
      businessUnits={businessUnits}
      initialState={initialState}
    />
  );
}
