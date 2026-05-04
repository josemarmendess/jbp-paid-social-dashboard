import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-[color:var(--color-surface-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-3 h-3 w-20" />
      <Skeleton className="mt-3 h-6 w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-white p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton
        className="mt-4 w-full"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}

/**
 * Header skeleton matching the sticky TopHeader layout (page title + search +
 * filters). Used by every route's loading.tsx so navigations feel snappy.
 */
export function TopHeaderSkeleton({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-[color:var(--color-border-subtle)] bg-[color:var(--color-jbp-cream)]/95 px-6 backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-24" />
        <h1
          className="font-display text-[color:var(--color-text-primary)]"
          style={{ fontSize: 22, lineHeight: 1.1 }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </header>
  );
}
