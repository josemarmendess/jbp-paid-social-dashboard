import { Skeleton, TableSkeleton, TopHeaderSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Performance" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 px-6 py-6 sm:px-8">
        <Skeleton className="h-10 w-72" />
        <TableSkeleton rows={12} />
      </div>
    </main>
  );
}
