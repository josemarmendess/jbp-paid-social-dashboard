import { Skeleton, TableSkeleton, TopHeaderSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Geography" />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[520px] w-full rounded-lg" />
          <Skeleton className="h-[520px] w-full rounded-lg" />
        </div>
        <TableSkeleton rows={10} />
      </div>
    </main>
  );
}
