// app/actions/overview.ts
"use server";

import { APP_TIMEZONE } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = "year" | "3m" | "all" | "custom";

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface RunwayData {
  liquidAssets: number;
  avgMonthlyExpense: number;
  months: number | null;
}

export interface DailyPaceData {
  currentMonthExpense: number;
  budgetTarget: number;
  paceLine: number;
  daysElapsed: number;
  daysInMonth: number;
  hasBudget: boolean;
}

export interface OverviewData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  netSaved: number;
  savingRate: number | null;
  runway: RunwayData | null;
  dailyPace: DailyPaceData | null;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
      const bkkOffset = 7 * 60;
      const fromUTC = new Date(fromMs + bkkOffset * 60_000).toISOString();
      const toUTC = new Date(toMs + (bkkOffset * 60_000) + 86_399_000).toISOString();
      return { from: fromUTC, to: toUTC };
    }
  }

  if (period === "year") {
    const janFirst = new Date(Date.UTC(year, 0, 1) - (7 * 3_600_000)).toISOString();
    return { from: janFirst, to: null };
  }

  // Default: "3m"
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  return { from: ninetyDaysAgo.toISOString(), to: null };
}
