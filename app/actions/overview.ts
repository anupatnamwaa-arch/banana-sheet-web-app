// app/actions/overview.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/format";
import { bangkokToday } from "./overview-utils";

// Type-only re-exports are fine in "use server" files (erased at runtime).
export type { Period, DateRange } from "./overview-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Server action ────────────────────────────────────────────────────────────

export async function getOverviewData(
  range: import("./overview-utils").DateRange,
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

  // ── Query 2: trailing 12-month expenses (avgMonthlyExpense, Pro only) ────
  const trailingQuery = isPro
    ? supabase
        .from("transactions")
        .select("amount, date")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", trailingStart)
    : null;

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
      trailingQuery ?? Promise.resolve({ data: null, error: null }),
      wealthQuery ?? Promise.resolve({ data: null, error: null }),
      budgetQuery ?? Promise.resolve({ data: null, error: null }),
      currentMonthQuery ?? Promise.resolve({ data: null, error: null }),
    ]);

  if (periodResult.error) throw new Error(`Period query failed: ${periodResult.error.message}`);
  if (trailingResult.error) throw new Error(`Trailing query failed: ${trailingResult.error.message}`);
  if (isPro && wealthResult.error) throw new Error(`Wealth query failed: ${wealthResult.error.message}`);
  if (isPro && budgetResult.error) throw new Error(`Budget query failed: ${budgetResult.error.message}`);
  if (isPro && currentMonthResult.error) throw new Error(`Current month query failed: ${currentMonthResult.error.message}`);

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

  // ── Return free user data early ───────────────────────────────────────────
  if (!isPro) {
    return {
      totalIncome, totalExpense,
      netCashFlow, netSaved: netCashFlow, savingRate,
      runway: null, dailyPace: null,
    };
  }

  // ── avgMonthlyExpense (Pro only) ──────────────────────────────────────────
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

  // ── Runway ────────────────────────────────────────────────────────────────
  const wealthRows = (wealthResult.data ?? []) as Array<{ value: number }>;
  const liquidAssets = wealthRows.reduce((sum, r) => sum + r.value, 0);
  const runwayMonths = avgMonthlyExpense > 0 ? liquidAssets / avgMonthlyExpense : null;
  const runway: RunwayData = { liquidAssets, avgMonthlyExpense, months: runwayMonths };

  // ── Daily Pace ────────────────────────────────────────────────────────────
  const budgetRows = (budgetResult.data ?? []) as Array<{ limit_amount: number }>;
  const budgetTotal = budgetRows.reduce((sum, r) => sum + r.limit_amount, 0);
  const hasBudget = budgetRows.length > 0;
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
