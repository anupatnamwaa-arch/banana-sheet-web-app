// app/actions/overview.ts
"use server";

import { APP_TIMEZONE } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

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

// ─── Server action ────────────────────────────────────────────────────────────

export async function getOverviewData(
  range: DateRange,
  userId: string,
  isPro: boolean
): Promise<OverviewData> {
  const supabase = await createClient();
  const { year, month, day, daysInMonth } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  // Current Bangkok month window for Daily Pace
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();

  // 12-month trailing window for avgMonthlyExpense
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const trailingStart = twelveMonthsAgo.toISOString();

  // ── Query 1: period transactions (hero metrics) ──────────────────────────
  let periodQuery = supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId);
  if (range.from) periodQuery = periodQuery.gte("date", range.from);
  if (range.to) periodQuery = periodQuery.lte("date", range.to);

  // ── Query 2: trailing 12-month expenses (avgMonthlyExpense) ──────────────
  const trailingQuery = supabase
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", trailingStart);

  // ── Pro-only queries ──────────────────────────────────────────────────────
  const wealthQuery = isPro
    ? supabase
        .from("wealth_debt")
        .select("value")
        .eq("user_id", userId)
        .eq("type", "asset")
        .eq("is_liquid", true)
    : null;

  const budgetQuery = isPro
    ? supabase.from("budgets").select("limit_amount").eq("user_id", userId)
    : null;

  const currentMonthQuery = isPro
    ? supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", monthStart)
        .lt("date", monthEnd)
    : null;

  // ── Parallel fetch ────────────────────────────────────────────────────────
  const [periodResult, trailingResult, wealthResult, budgetResult, currentMonthResult] =
    await Promise.all([
      periodQuery,
      trailingQuery,
      wealthQuery ?? Promise.resolve({ data: null, error: null }),
      budgetQuery ?? Promise.resolve({ data: null, error: null }),
      currentMonthQuery ?? Promise.resolve({ data: null, error: null }),
    ]);

  // ── Hero metrics ──────────────────────────────────────────────────────────
  const periodRows = (periodResult.data ?? []) as Array<{ amount: number; type: string }>;
  let totalIncome = 0;
  let totalExpense = 0;
  for (const r of periodRows) {
    if (r.type === "income") totalIncome += r.amount;
    else totalExpense += r.amount;
  }
  const netCashFlow = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : null;

  // ── avgMonthlyExpense ─────────────────────────────────────────────────────
  const trailingRows = (trailingResult.data ?? []) as Array<{ amount: number; date: string }>;
  const monthBuckets: Record<string, number> = {};
  for (const r of trailingRows) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
    }).format(new Date(r.date)).slice(0, 7);
    monthBuckets[key] = (monthBuckets[key] ?? 0) + r.amount;
  }
  const monthCount = Object.keys(monthBuckets).length;
  const totalTrailingExpense = Object.values(monthBuckets).reduce((a, b) => a + b, 0);
  const avgMonthlyExpense = monthCount > 0 ? totalTrailingExpense / monthCount : 0;

  // ── Return free user data early ───────────────────────────────────────────
  if (!isPro) {
    return {
      totalIncome, totalExpense,
      netCashFlow, netSaved: netCashFlow, savingRate,
      runway: null, dailyPace: null,
    };
  }

  // ── Runway ────────────────────────────────────────────────────────────────
  const wealthRows = (wealthResult.data ?? []) as Array<{ value: number }>;
  const liquidAssets = wealthRows.reduce((sum, r) => sum + r.value, 0);
  const runwayMonths = avgMonthlyExpense > 0 ? liquidAssets / avgMonthlyExpense : null;
  const runway: RunwayData = { liquidAssets, avgMonthlyExpense, months: runwayMonths };

  // ── Daily Pace ────────────────────────────────────────────────────────────
  const budgetRows = (budgetResult.data ?? []) as Array<{ limit_amount: number }>;
  const budgetTotal = budgetRows.reduce((sum, r) => sum + r.limit_amount, 0);
  const hasBudget = budgetTotal > 0;
  const budgetTarget = hasBudget ? budgetTotal : avgMonthlyExpense;
  const paceLine = daysInMonth > 0 ? budgetTarget * (day / daysInMonth) : 0;

  const currentMonthRows = (currentMonthResult.data ?? []) as Array<{ amount: number }>;
  const currentMonthExpense = currentMonthRows.reduce((sum, r) => sum + r.amount, 0);

  const dailyPace: DailyPaceData = {
    currentMonthExpense,
    budgetTarget,
    paceLine,
    daysElapsed: day,
    daysInMonth,
    hasBudget,
  };

  return {
    totalIncome, totalExpense,
    netCashFlow, netSaved: netCashFlow, savingRate,
    runway, dailyPace,
  };
}
