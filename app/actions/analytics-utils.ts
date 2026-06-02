// Pure (non-server-action) helpers for the analytics feature.
// Kept separate from the "use server" module so they can be imported from
// Server Components without tripping Next.js 16's async-export rule.

import { bangkokToday } from "@/app/actions/overview-utils";

export type AnalyticsPeriod = "month" | "prevmonth" | "year";

export const DEFAULT_SAVINGS_TARGET_PCT = 20;

export const ANALYTICS_PERIODS: { id: AnalyticsPeriod }[] = [
  { id: "month" },
  { id: "prevmonth" },
  { id: "year" },
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

export function hasTransactionsInWindow(
  rows: Array<{ date: string }>,
  window: Pick<PeriodWindow, "start" | "end">
): boolean {
  return rows.some((row) => row.date >= window.start && row.date < window.end);
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

/**
 * Resolve a custom month range ("YYYY-MM" → "YYYY-MM", inclusive) to a window.
 * Comparison window = an equal number of months immediately preceding the range.
 * Returns null if either bound is malformed or `from` is after `to`.
 */
export function resolveRangeWindow(fromYm: string, toYm: string): PeriodWindow | null {
  const f = /^(\d{4})-(\d{2})$/.exec(fromYm);
  const t = /^(\d{4})-(\d{2})$/.exec(toYm);
  if (!f || !t) return null;
  const fy = Number(f[1]);
  const fm = Number(f[2]);
  const ty = Number(t[1]);
  const tm = Number(t[2]);
  if (fm < 1 || fm > 12 || tm < 1 || tm > 12) return null;

  const startMonths = fy * 12 + (fm - 1);
  const endMonths = ty * 12 + (tm - 1);
  if (startMonths > endMonths) return null;
  const spanMonths = endMonths - startMonths + 1;

  const start = bkkIso(fy, fm, 1);
  const end = bkkIso(ty, tm + 1, 1);
  const prevEnd = start;
  const prevStart = bkkIso(fy, fm - spanMonths, 1);
  return { start, end, prevStart, prevEnd, lengthDays: daysBetween(start, end) };
}

/** N month keys (YYYY-MM) ending at the given "YYYY-MM", oldest first. */
export function monthKeysEndingAt(ym: string, n: number): string[] {
  const [y, m] = ym.split("-").map(Number);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
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
