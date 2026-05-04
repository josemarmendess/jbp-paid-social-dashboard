"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRESET_OPTIONS,
  chicagoTodayStr,
  parsePreset,
} from "@/lib/dateRange";
import type { DateRangePreset } from "@/lib/types";

interface DateRangePickerProps {
  initial: DateRangePreset;
  customStart?: string;
  customEnd?: string;
}

export function DateRangePicker({
  initial,
  customStart,
  customEnd,
}: DateRangePickerProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [pending, startTransition] = useTransition();

  function pushQuery(next: URLSearchParams) {
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function onPresetChange(next: string | null) {
    const preset = parsePreset(next ?? undefined);
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (preset === "this_month") sp.delete("range");
    else sp.set("range", preset);
    if (preset !== "custom") {
      sp.delete("start");
      sp.delete("end");
    } else {
      // Seed inputs with today/today so the form is usable immediately.
      const today = chicagoTodayStr();
      if (!sp.get("start")) sp.set("start", customStart ?? today);
      if (!sp.get("end")) sp.set("end", customEnd ?? today);
    }
    pushQuery(sp);
  }

  function onStartChange(v: string) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.set("range", "custom");
    sp.set("start", v);
    if (!sp.get("end")) sp.set("end", customEnd ?? v);
    pushQuery(sp);
  }

  function onEndChange(v: string) {
    const sp = new URLSearchParams(params?.toString() ?? "");
    sp.set("range", "custom");
    sp.set("end", v);
    if (!sp.get("start")) sp.set("start", customStart ?? v);
    pushQuery(sp);
  }

  const today = chicagoTodayStr();
  const startVal = customStart ?? today;
  const endVal = customEnd ?? today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={initial} onValueChange={onPresetChange}>
        <SelectTrigger
          className="min-w-[160px]"
          aria-label="Date range"
          data-pending={pending ? "true" : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {initial === "custom" && (
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            aria-label="Start date"
            value={startVal}
            max={today}
            onChange={(e) => onStartChange(e.currentTarget.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            aria-label="End date"
            value={endVal}
            max={today}
            onChange={(e) => onEndChange(e.currentTarget.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
      )}
    </div>
  );
}
