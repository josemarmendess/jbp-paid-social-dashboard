import { DateRangePicker } from "@/components/DateRangePicker";
import { RefreshButton } from "@/components/RefreshButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { DateRangePreset } from "@/lib/types";

interface HeaderProps {
  generatedAt: string;
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
}

const chicagoFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function Header({
  generatedAt,
  preset,
  customStart,
  customEnd,
}: HeaderProps) {
  let lastUpdated = "—";
  try {
    const parts = chicagoFormatter.formatToParts(new Date(generatedAt));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    lastUpdated = `${get("month")} ${get("day")}, ${get("year")} at ${get("hour")}:${get("minute")} CT`;
  } catch {
    lastUpdated = generatedAt;
  }

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Paid Social Dashboard
        </h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          Last updated: {lastUpdated}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <DateRangePicker
          initial={preset}
          customStart={customStart}
          customEnd={customEnd}
        />
        <RefreshButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
