import { Skeleton, TopHeaderSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Creatives" />
      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-6 py-6 sm:px-8">
        <Skeleton className="h-12 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-[color:var(--color-border-subtle)] bg-white"
            >
              <Skeleton className="h-[180px] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
