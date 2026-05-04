import { BusinessUnitFilter } from "@/components/BusinessUnitFilter";
import { DateRangePicker } from "@/components/DateRangePicker";
import { RefreshButton } from "@/components/RefreshButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { DateRangePreset } from "@/lib/types";

interface HeaderProps {
  generatedAt: string;
  preset: DateRangePreset;
  customStart?: string;
  customEnd?: string;
  businessUnits: string[];
  bu: string;
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
  businessUnits,
  bu,
}: HeaderProps) {
  let lastUpdated = "—";
  try {
    const parts = chicagoFormatter.formatToParts(new Date(generatedAt));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    lastUpdated = `${get("month")} ${get("day")}, ${get("year")} at ${get("hour")}:${get("minute")} CT`;
  } catch {
    lastUpdated = generatedAt;
  }

  const filterActive = bu && bu !== "All";

  return (
    <header className="flex flex-col gap-3 border-b border-border/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Paid Social Dashboard
          </h1>
          {filterActive && (
            <span className="inline-flex items-center rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900">
              Filtered: {bu}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          Last updated: {lastUpdated}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <BusinessUnitFilter options={businessUnits} value={bu} />
        <DateRangePicker
          initial={preset}
          customStart={preset === "custom" ? customStart : undefined}
          customEnd={preset === "custom" ? customEnd : undefined}
        />
        <RefreshButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
