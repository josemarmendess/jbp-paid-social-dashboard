import {
  ChartSkeleton,
  Skeleton,
  TableSkeleton,
  TopHeaderSkeleton,
} from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="History" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <Skeleton className="h-10 w-full" />
        <ChartSkeleton height={280} />
        <TableSkeleton rows={12} />
      </div>
    </main>
  );
}
