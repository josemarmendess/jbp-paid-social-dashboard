"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshDataAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await refreshDataAction();
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Refresh data"
      title="Refresh data"
      onClick={onClick}
      disabled={pending}
    >
      <RefreshCw
        className={cn("size-4", pending && "animate-spin")}
        aria-hidden="true"
      />
    </Button>
  );
}
