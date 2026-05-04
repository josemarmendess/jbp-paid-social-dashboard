"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshDataAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorBanner({ message }: { message: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function retry() {
    startTransition(async () => {
      await refreshDataAction();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 bg-rose-500/10 px-6 py-3 text-sm text-rose-700 dark:text-rose-300 sm:px-8">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        <span>Failed to load data. {message}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={retry}
        disabled={pending}
        className="border-rose-500/30 bg-transparent text-rose-700 hover:bg-rose-500/10 dark:text-rose-200"
      >
        <RefreshCw
          className={cn("size-3.5", pending && "animate-spin")}
          aria-hidden="true"
        />
        <span className="ml-1.5">Retry</span>
      </Button>
    </div>
  );
}
