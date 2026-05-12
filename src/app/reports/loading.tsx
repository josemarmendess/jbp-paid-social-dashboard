import { Skeleton } from "@/components/Skeleton";

/**
 * Loading state for the Reports hub. Matches the live grid of template
 * cards so the navigation feels instant rather than a frozen previous
 * page.
 */
export default function Loading() {
  return (
    <main style={{ flex: 1 }}>
      <div
        style={{
          padding: "20px 28px",
          background: "var(--color-jbp-paper)",
          borderBottom: "1px solid var(--color-jbp-hairline)",
        }}
      >
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-2 h-3 w-48" />
      </div>
      <div
        style={{
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div>
          <Skeleton className="h-3 w-32" />
          <div
            style={{
              marginTop: 8,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 16,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid var(--color-jbp-hairline)",
                  background: "var(--color-jbp-white)",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
