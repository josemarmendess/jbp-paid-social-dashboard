import {
  ChartSkeleton,
  KpiSkeleton,
  TableSkeleton,
  TopHeaderSkeleton,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Overview" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-8 px-6 py-6 sm:px-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </section>
        <TableSkeleton rows={9} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    </main>
  );
}
