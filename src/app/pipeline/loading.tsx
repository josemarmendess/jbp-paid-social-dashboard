import {
  ChartSkeleton,
  Skeleton,
  TableSkeleton,
  TopHeaderSkeleton,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Pipeline" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </section>
        <TableSkeleton rows={8} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton height={220} />
          <ChartSkeleton height={220} />
        </div>
      </div>
    </main>
  );
}
