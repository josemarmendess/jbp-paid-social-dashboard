import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/70 dark:bg-zinc-800/70",
        className,
      )}
      {...props}
    />
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <Skeleton className="h-4 w-32" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-48 w-full" />
    </div>
  );
}
