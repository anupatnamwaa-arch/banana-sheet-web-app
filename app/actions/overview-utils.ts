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
