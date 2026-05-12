import {
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import type { DateRange } from "./types";

const BUSINESS_TZ = "America/Chicago";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Returns a Date whose local Y/M/D match the *current civil date in Chicago*.
 * Mirrors lib/dateRange.ts so report periods always anchor to JBP's TZ
 * regardless of where the server renders.
 */
function chicagoToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export type PeriodKey =
  | "last_month"
  | "month_to_date"
  | "last_30"
  | "last_7"
  | "last_3"
  | "yesterday"
  | "today";

export interface PeriodColumn {
  key: PeriodKey;
  label: string;
  range: DateRange;
}

/**
 * The 7 columns that show on the pivot table, in display order.
 * Definitions per the spec — all rolling windows include today (e.g.
 * "Last 30" = today + past 29 days).
 */
/**
 * Pivot column ranges. Aligned 1:1 with the KPI date-filter presets in
 * `dateRange.ts` so each column equals what the user sees in the KPI cards
 * when that preset is selected:
 *  - Last Month / Last N Days are CLOSED windows that end yesterday — past
 *    days only, so the numbers don't shift as the current day fills in.
 *  - Month to Date INCLUDES today — operators expect to see partial-day
 *    progress for the current month.
 *  - Yesterday / Today are single-day open windows.
 */
export function getPivotPeriods(): PeriodColumn[] {
  const today = chicagoToday();
  const yesterday = subDays(today, 1);
  const lastMonthAnchor = subMonths(today, 1);
  const lastMonthStart = startOfMonth(lastMonthAnchor);
  const lastMonthEnd = endOfMonth(lastMonthAnchor);
  return [
    {
      key: "last_month",
      label: "Last Month",
      range: { startStr: ymd(lastMonthStart), endStr: ymd(lastMonthEnd) },
    },
    {
      key: "month_to_date",
      label: "Month to Date",
      // 1st of month → today, inclusive. Today's partial-day numbers
      // are intentional (operators want to see current MTD).
      range: { startStr: ymd(startOfMonth(today)), endStr: ymd(today) },
    },
    {
      key: "last_30",
      label: "Last 30 Days",
      // Matches KPI "last_30": yesterday-29 → yesterday.
      range: { startStr: ymd(subDays(yesterday, 29)), endStr: ymd(yesterday) },
    },
    {
      key: "last_7",
      label: "Last 7 Days",
      // Matches KPI "last_7": yesterday-6 → yesterday.
      range: { startStr: ymd(subDays(yesterday, 6)), endStr: ymd(yesterday) },
    },
    {
      key: "last_3",
      label: "Last 3 Days",
      // Closed 3-day window ending yesterday.
      range: { startStr: ymd(subDays(yesterday, 2)), endStr: ymd(yesterday) },
    },
    {
      key: "yesterday",
      label: "Yesterday",
      range: { startStr: ymd(yesterday), endStr: ymd(yesterday) },
    },
    {
      key: "today",
      label: "Today",
      range: { startStr: ymd(today), endStr: ymd(today) },
    },
  ];
}

/** Last-month range, used for the Carryover Pipeline KPI. */
export function getLastMonthRange(): DateRange {
  const today = chicagoToday();
  const lastMonthAnchor = subMonths(today, 1);
  return {
    startStr: ymd(startOfMonth(lastMonthAnchor)),
    endStr: ymd(endOfMonth(lastMonthAnchor)),
  };
}

/** [start, end] inclusive in Chicago TZ for the past N days (includes today). */
export function getRollingRange(days: number): DateRange {
  const today = chicagoToday();
  return {
    startStr: ymd(subDays(today, days - 1)),
    endStr: ymd(today),
  };
}

/** YYYY-MM-DD list, oldest first, covering past N days inclusive of today. */
export function rollingDaysList(days: number): string[] {
  const today = chicagoToday();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(ymd(subDays(today, i)));
  }
  return out;
}
