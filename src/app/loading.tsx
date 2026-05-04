import {
  ChartSkeleton,
  KpiSkeleton,
  Skeleton,
  TableSkeleton,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-6 py-8 sm:px-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </section>
        <TableSkeleton rows={9} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton rows={5} />
        <TableSkeleton rows={6} />
      </div>
    </main>
  );
}
