import { Skeleton, TopHeaderSkeleton } from "@/components/Skeleton";

/**
 * Loading state for the Settings page. Keeps the sticky header in
 * place and skeletons out the body sections.
 */
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col">
      <TopHeaderSkeleton title="Settings" />
      <div className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-6 px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </main>
  );
}
