import {
  ChartSkeleton,
  Skeleton,
  TableSkeleton,
  TopHeaderSkeleton,
} from "@/components/Skeleton";

/**
 * Loading state for the Daily Summary editor. Mirrors the actual page
 * layout (action bar + 320px customizer column + report preview) so the
 * jump from skeleton → rendered content is minimal. Without this the
 * route hangs on the previous page while the data fetch resolves.
 */
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Daily Summary" />

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 28px",
          background: "var(--color-jbp-white)",
          borderBottom: "1px solid var(--color-jbp-hairline)",
        }}
      >
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-16" />
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-jbp-hairline)",
            margin: "0 4px",
          }}
        />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-16" />
        <span
          style={{
            width: 1,
            height: 20,
            background: "var(--color-jbp-hairline)",
            margin: "0 4px",
          }}
        />
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Body: customizer + preview, matching the live layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
          padding: "20px 28px 32px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Skeleton className="h-3 w-20" />
          <TableSkeleton rows={8} />
          <TableSkeleton rows={5} />
        </div>
        <div>
          <Skeleton className="h-3 w-16" />
          <div
            style={{
              marginTop: 8,
              border: "1px solid var(--color-jbp-hairline)",
              background: "var(--color-jbp-cream)",
              padding: 12,
            }}
          >
            <Skeleton className="h-10 w-full" />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <ChartSkeleton height={180} />
              <ChartSkeleton height={180} />
              <ChartSkeleton height={180} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
