import centroids from "@/data/chicago_zip_centroids.json";

type CentroidMap = Record<string, [number, number]>;

const CENTROIDS: CentroidMap = Object.fromEntries(
  Object.entries(centroids).filter(([k, v]) => k !== "_meta" && Array.isArray(v)),
) as CentroidMap;

export function lookupCentroid(zip: string): [number, number] | null {
  const c = CENTROIDS[zip];
  return c ?? null;
}

/** Default Leaflet view: tight on Chicago + close suburbs. */
export const CHICAGO_CENTER: [number, number] = [41.88, -87.7];
export const CHICAGO_ZOOM = 9;
