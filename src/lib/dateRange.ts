import {
  startOfMonth,
  subMonths,
  endOfMonth,
  setDate,
  subDays,
  differenceInCalendarDays,
  parseISO,
  format,
} from "date-fns";
import type {
  ComparisonMode,
  DateRangePreset,
  PeriodPair,
} from "./types";

const BUSINESS_TZ = "America/Chicago";
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Returns a Date whose local Y/M/D match the *current civil date in Chicago*.
 * The server may run in any timezone (Vercel = UTC, dev laptop = BRT, etc.) —
 * this normalizes "today" to Chicago so closed-period math doesn't drift by
 * a day for the JBP team.
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

const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_month: "This month",
  last_month: "Last month",
  last_3: "Last 3 days",
  last_7: "Last 7 days",
  last_14: "Last 14 days",
  last_30: "Last 30 days",
  last_60: "Last 60 days",
  last_90: "Last 90 days",
  custom: "Custom range",
};

export const PRESET_OPTIONS: ReadonlyArray<{
  value: DateRangePreset;
  label: string;
}> = [
  { value: "today", label: PRESET_LABELS.today },
  { value: "yesterday", label: PRESET_LABELS.yesterday },
  { value: "last_3", label: PRESET_LABELS.last_3 },
  { value: "last_7", label: PRESET_LABELS.last_7 },
  { value: "last_14", label: PRESET_LABELS.last_14 },
  { value: "this_month", label: PRESET_LABELS.this_month },
  { value: "last_30", label: PRESET_LABELS.last_30 },
  { value: "last_month", label: PRESET_LABELS.last_month },
  { value: "last_60", label: PRESET_LABELS.last_60 },
  { value: "last_90", label: PRESET_LABELS.last_90 },
  { value: "custom", label: PRESET_LABELS.custom },
];

export function parsePreset(raw: string | undefined): DateRangePreset {
  switch (raw) {
    case "today":
    case "yesterday":
    case "this_month":
    case "last_month":
    case "last_3":
    case "last_7":
    case "last_14":
    case "last_30":
    case "last_60":
    case "last_90":
    case "custom":
      return raw;
    default:
      return "this_month";
  }
}

/** Returns Chicago "today" as YYYY-MM-DD — used as a default for custom inputs. */
export function chicagoTodayStr(): string {
  return ymd(chicagoToday());
}

/**
 * "today" and "yesterday" are *open* single-day windows (today is partial by
 * definition, but the user explicitly opted in by picking it). All other
 * windows are CLOSED in Chicago time — they end at yesterday and never
 * include the current day, because Meta attribution + ServiceTitan booking
 * still shift on the current day.
 *
 * For custom ranges, the caller passes raw YYYY-MM-DD strings from the URL.
 * If they're missing or malformed we fall back to "today" so the page never
 * crashes on a bad URL.
 */
export function parseComparison(raw: string | undefined): ComparisonMode {
  if (raw === "prior_month") return "prior_month";
  return "prior_period";
}

const COMPARISON_LABELS: Record<ComparisonMode, string> = {
  prior_period: "Prior period",
  prior_month: "Same dates last month",
};

export const COMPARISON_OPTIONS: ReadonlyArray<{
  value: ComparisonMode;
  label: string;
}> = [
  { value: "prior_period", label: COMPARISON_LABELS.prior_period },
  { value: "prior_month", label: COMPARISON_LABELS.prior_month },
];

/**
 * Apply a ComparisonMode to a (current) range — returns the previous range.
 * Always overrides the preset's default previous range so the toggle has a
 * visible effect on every preset, including this_month (whose default used
 * to coincide with prior_month).
 */
function applyComparison(
  current: { startStr: string; endStr: string },
  mode: ComparisonMode,
): { startStr: string; endStr: string } {
  const startD = parseISO(current.startStr);
  const endD = parseISO(current.endStr);
  if (mode === "prior_month") {
    return {
      startStr: ymd(subMonths(startD, 1)),
      endStr: ymd(subMonths(endD, 1)),
    };
  }
  // prior_period — sequential window of equal length immediately before.
  const days = differenceInCalendarDays(endD, startD) + 1;
  const prevEnd = subDays(startD, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return { startStr: ymd(prevStart), endStr: ymd(prevEnd) };
}

export function getPeriod(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  comparison: ComparisonMode = "prior_period",
): PeriodPair {
  const base = getPeriodBase(preset, customStart, customEnd);
  // Always recompute the previous range from the chosen comparison so the
  // toggle visibly switches between sequential vs same-dates-last-month.
  const previous = applyComparison(base.current, comparison);
  return {
    ...base,
    previous,
    previousLabel:
      comparison === "prior_month"
        ? "vs. same days last month"
        : "vs. previous period",
  };
}

function getPeriodBase(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
): PeriodPair {
  const today = chicagoToday();
  const yesterday = subDays(today, 1);
  switch (preset) {
    case "today": {
      const prev = yesterday;
      return {
        current: { startStr: ymd(today), endStr: ymd(today) },
        previous: { startStr: ymd(prev), endStr: ymd(prev) },
        label: PRESET_LABELS.today,
        previousLabel: "vs. yesterday",
      };
    }
    case "yesterday": {
      const dayBefore = subDays(today, 2);
      return {
        current: { startStr: ymd(yesterday), endStr: ymd(yesterday) },
        previous: { startStr: ymd(dayBefore), endStr: ymd(dayBefore) },
        label: PRESET_LABELS.yesterday,
        previousLabel: "vs. day before",
      };
    }
    case "this_month": {
      const curStart = startOfMonth(today);
      // Include today's partial-day numbers — operators want live MTD,
      // not a stale "month minus 1 day" view. Closed past-only windows
      // live under last_3 / last_7 / last_30 / last_month.
      const curEnd = today;
      const prevStart = subMonths(curStart, 1);
      const prevEndOfMonth = endOfMonth(prevStart);
      const prevEnd = setDate(
        prevStart,
        Math.min(curEnd.getDate(), prevEndOfMonth.getDate()),
      );
      return {
        current: { startStr: ymd(curStart), endStr: ymd(curEnd) },
        previous: { startStr: ymd(prevStart), endStr: ymd(prevEnd) },
        label: PRESET_LABELS.this_month,
        previousLabel: "vs. same days last month",
      };
    }
    case "last_month": {
      const curStart = startOfMonth(subMonths(today, 1));
      const curEnd = endOfMonth(curStart);
      const prevStart = startOfMonth(subMonths(curStart, 1));
      const prevEnd = endOfMonth(prevStart);
      return {
        current: { startStr: ymd(curStart), endStr: ymd(curEnd) },
        previous: { startStr: ymd(prevStart), endStr: ymd(prevEnd) },
        label: PRESET_LABELS.last_month,
        previousLabel: "vs. previous month",
      };
    }
    case "last_3":
      return rollingWindow(yesterday, 3, PRESET_LABELS.last_3);
    case "last_7":
      return rollingWindow(yesterday, 7, PRESET_LABELS.last_7);
    case "last_14":
      return rollingWindow(yesterday, 14, PRESET_LABELS.last_14);
    case "last_30":
      return rollingWindow(yesterday, 30, PRESET_LABELS.last_30);
    case "last_60":
      return rollingWindow(yesterday, 60, PRESET_LABELS.last_60);
    case "last_90":
      return rollingWindow(yesterday, 90, PRESET_LABELS.last_90);
    case "custom":
      return customRange(customStart, customEnd, today);
  }
}

function rollingWindow(end: Date, days: number, label: string): PeriodPair {
  const curEnd = end;
  const curStart = subDays(end, days - 1);
  const prevEnd = subDays(curStart, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return {
    current: { startStr: ymd(curStart), endStr: ymd(curEnd) },
    previous: { startStr: ymd(prevStart), endStr: ymd(prevEnd) },
    label,
    previousLabel: `vs. previous ${days} days`,
  };
}

function customRange(
  rawStart: string | undefined,
  rawEnd: string | undefined,
  today: Date,
): PeriodPair {
  const fallback = ymd(today);
  const startStr = rawStart && ISO_RE.test(rawStart) ? rawStart : fallback;
  const endRaw = rawEnd && ISO_RE.test(rawEnd) ? rawEnd : fallback;
  // Swap if user picked end < start so we never compute negative-length windows.
  const [a, b] = startStr <= endRaw ? [startStr, endRaw] : [endRaw, startStr];
  const startD = parseISO(a);
  const endD = parseISO(b);
  const days = differenceInCalendarDays(endD, startD) + 1;
  const prevEnd = subDays(startD, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return {
    current: { startStr: a, endStr: b },
    previous: { startStr: ymd(prevStart), endStr: ymd(prevEnd) },
    label: PRESET_LABELS.custom,
    previousLabel: `vs. previous ${days} ${days === 1 ? "day" : "days"}`,
  };
}
