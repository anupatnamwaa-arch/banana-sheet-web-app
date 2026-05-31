// Pure (non-server-action) helpers for the overview feature.
// Kept separate so they can be imported from both Server Components and
// "use server" modules without triggering Next.js 16's "all exports must be
// async" rule that applies inside "use server" files.

import { APP_TIMEZONE } from "@/lib/format";

export type Period = "year" | "3m" | "all" | "custom";

export interface DateRange {
  from: string | null;
  to: string | null;
}

/** Returns today's date fields in Asia/Bangkok. */
export function bangkokToday(): { year: number; month: number; day: number; daysInMonth: number } {
  const now = new Date();
  const fmt = (part: Intl.DateTimeFormatPartTypes) =>
    parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, [part]: "numeric" }).format(now),
      10
    );

  const year = fmt("year");
  const month = fmt("month");
  const day = fmt("day");
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, daysInMonth };
}

/**
 * Convert period + optional custom dates into a DateRange.
 * Falls back to "3m" on invalid input.
 */
export function resolveDateRange(
  period?: string,
  from?: string,
  to?: string
): DateRange {
  const { year } = bangkokToday();

  if (period === "all") return { from: null, to: null };

  if (period === "custom" && from && to) {
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    if (!isNaN(fromMs) && !isNaN(toMs) && fromMs <= toMs) {
      const bkkOffsetMs = 7 * 3_600_000; // UTC+7 = subtract 7h to get UTC
      const fromUTC = new Date(fromMs - bkkOffsetMs).toISOString();
      const toUTC = new Date(toMs - bkkOffsetMs + 86_399_000).toISOString();
      return { from: fromUTC, to: toUTC };
    }
  }

  if (period === "year") {
    const janFirst = new Date(Date.UTC(year, 0, 1) - (7 * 3_600_000)).toISOString();
    return { from: janFirst, to: null };
  }

  // Default: "3m" — 90 days back, anchored to Bangkok midnight
  const bkkOffsetMs = 7 * 3_600_000;
  const todayBkk = bangkokToday();
  const todayMidnightUTC = Date.UTC(todayBkk.year, todayBkk.month - 1, todayBkk.day) - bkkOffsetMs;
  const ninetyDaysAgoUTC = todayMidnightUTC - 90 * 86_400_000;
  return { from: new Date(ninetyDaysAgoUTC).toISOString(), to: null };
}

export interface BillingCycle {
  cycleStart: string;       // ISO UTC — Bangkok midnight of cycle start day
  cycleEnd: string;         // ISO UTC — Bangkok midnight of next cycle start (exclusive)
  cycleStartMonth: number;  // 1-indexed calendar month of cycle start
  cycleStartYear: number;
  cycleEndMonth: number;    // 1-indexed calendar month of cycle end
  cycleEndYear: number;
  daysInCycle: number;      // total days in this billing period
  daysElapsed: number;      // days elapsed including today (min 1)
  daysRemaining: number;    // days remaining (0 on last day)
}

/**
 * Compute the current billing cycle window given today's Bangkok date and the
 * configured start day (1–28).
 *
 * - If today.day >= startDay: cycle started this calendar month on startDay.
 * - If today.day <  startDay: cycle started last calendar month on startDay.
 * - Cycle end is the startDay of the following month (exclusive).
 */
export function getBillingCycle(
  today: { year: number; month: number; day: number },
  startDay: number
): BillingCycle {
  const bkkOffsetMs = 7 * 3_600_000; // UTC+7

  // Determine the calendar month/year the cycle started in
  let cycleStartYear = today.year;
  let cycleStartMonth = today.month; // 1-indexed

  if (today.day < startDay) {
    cycleStartMonth -= 1;
    if (cycleStartMonth === 0) {
      cycleStartMonth = 12;
      cycleStartYear -= 1;
    }
  }

  // Cycle ends on startDay of the month after the cycle started
  let cycleEndYear = cycleStartYear;
  let cycleEndMonth = cycleStartMonth + 1;
  if (cycleEndMonth === 13) {
    cycleEndMonth = 1;
    cycleEndYear += 1;
  }

  // ISO timestamps (Bangkok midnight → UTC)
  const cycleStart = new Date(
    Date.UTC(cycleStartYear, cycleStartMonth - 1, startDay) - bkkOffsetMs
  ).toISOString();
  const cycleEnd = new Date(
    Date.UTC(cycleEndYear, cycleEndMonth - 1, startDay) - bkkOffsetMs
  ).toISOString();

  // Day arithmetic (using UTC day boundaries — no DST in Bangkok)
  const cycleStartDayMs = Date.UTC(cycleStartYear, cycleStartMonth - 1, startDay);
  const cycleEndDayMs   = Date.UTC(cycleEndYear,   cycleEndMonth   - 1, startDay);
  const todayDayMs      = Date.UTC(today.year, today.month - 1, today.day);

  const daysInCycle   = Math.round((cycleEndDayMs - cycleStartDayMs) / 86_400_000);
  const daysElapsed   = Math.max(1, Math.round((todayDayMs - cycleStartDayMs) / 86_400_000) + 1);
  const daysRemaining = Math.max(0, Math.round((cycleEndDayMs - todayDayMs) / 86_400_000) - 1);

  return {
    cycleStart,
    cycleEnd,
    cycleStartMonth,
    cycleStartYear,
    cycleEndMonth,
    cycleEndYear,
    daysInCycle,
    daysElapsed,
    daysRemaining,
  };
}
