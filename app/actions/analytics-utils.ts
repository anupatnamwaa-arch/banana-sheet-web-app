// Pure (non-server-action) helpers for the analytics feature.
// Kept separate from the "use server" module so they can be imported from
// Server Components without tripping Next.js 16's async-export rule.

import { bangkokToday } from "@/app/actions/overview-utils";

export type AnalyticsPeriod = "month" | "prevmonth" | "3m" | "6m" | "year";

export const ANALYTICS_PERIODS: { id: AnalyticsPeriod; label: string }[] = [
  { id: "month", label: "เดือนนี้" },
  { id: "prevmonth", label: "เดือนก่อน" },
  { id: "3m", label: "3 เดือน" },
  { id: "6m", label: "6 เดือน" },
  { id: "year", label: "ปีนี้" },
];

const BKK_OFFSET_MS = 7 * 3_600_000;

/** Bangkok-local Y/M/D (1-based month, day) → UTC ISO instant of that midnight. */
function bkkIso(year: number, month1: number, day: number): string {
  return new Date(Date.UTC(year, month1 - 1, day) - BKK_OFFSET_MS).toISOString();
}

export interface PeriodWindow {
  start: string; // inclusive (UTC ISO)
  end: string; // exclusive (UTC ISO)
  prevStart: string; // comparison window, equal length, immediately preceding
  prevEnd: string;
  lengthDays: number;
}

export function normalizePeriod(raw?: string): AnalyticsPeriod {
  return (ANALYTICS_PERIODS.find((p) => p.id === raw)?.id ?? "month") as AnalyticsPeriod;
}

/** Resolve a period selector into current + comparison windows (Bangkok-anchored). */
export function resolvePeriodWindow(period: AnalyticsPeriod): PeriodWindow {
  const { year, month } = bangkokToday();

  // [startMonthOffset, endMonthOffset) expressed as months relative to current month-1 (0-based start of month)
  let startM: number; // first month index (1-based absolute via year/month math)
  let endM: number; // exclusive

  switch (period) {
    case "month":
      startM = 0;
      endM = 1;
      break;
    case "prevmonth":
      startM = -1;
      endM = 0;
      break;
    case "3m":
      startM = -2;
      endM = 1;
      break;
    case "6m":
      startM = -5;
      endM = 1;
      break;
    case "year": {
      // Whole calendar year
      const start = bkkIso(year, 1, 1);
      const end = bkkIso(year + 1, 1, 1);
      const prevStart = bkkIso(year - 1, 1, 1);
      const prevEnd = start;
      return { start, end, prevStart, prevEnd, lengthDays: daysBetween(start, end) };
    }
  }

  const start = bkkIso(year, month + startM, 1);
  const end = bkkIso(year, month + endM, 1);
  const spanMonths = endM - startM;
  const prevStart = bkkIso(year, month + startM - spanMonths, 1);
  const prevEnd = start;

  return { start, end, prevStart, prevEnd, lengthDays: daysBetween(start, end) };
}

function daysBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 86_400_000);
}

/** Trailing N month keys (YYYY-MM, Bangkok) ending at the current month, oldest first. */
export function trailingMonthKeys(n: number): string[] {
  const { year, month } = bangkokToday();
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}
