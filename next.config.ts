import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the `"use cache"` directive + cacheLife/cacheTag from next/cache.
  // Pages stay dynamic by default (we read searchParams everywhere); we opt
  // in to caching for the Apps Script fetch and the heavy aggregations so
  // identical (range, bu, view) combos collapse to instant cache hits.
  cacheComponents: true,
};

export default nextConfig;
