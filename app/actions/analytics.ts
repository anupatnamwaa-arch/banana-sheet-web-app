// app/actions/analytics.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;    // "YYYY-MM" Asia/Bangkok
  expense: number;
  income: number;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  spent: number;
  budget: number | null; // null = no budget set
}

export interface AnalyticsData {
  monthlyPoints: MonthlyPoint[] | null; // null for free users
  categorySpend: CategorySpend[] | null; // null for free users
}

// ─── Server action ─────────────────────────────────────────────────────────

export async function getAnalyticsData(
  userId: string,
  isPro: boolean
): Promise<AnalyticsData> {
  if (!isPro) return { monthlyPoints: null, categorySpend: null };

  const supabase = await createClient();
  const { year, month } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  // Trailing 12 months window
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const trailingStart = twelveMonthsAgo.toISOString();

  // Current Bangkok month window
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [velocityResult, currentTxResult, budgetResult] = await Promise.all([
    // 1. Trailing 12-month transactions for velocity chart
    supabase
      .from("transactions")
      .select("amount, type, date")
      .eq("user_id", userId)
      .gte("date", trailingStart),

    // 2. Current month transactions with category for donut
    supabase
      .from("transactions")
      .select("amount, type, category_id, categories(id, name)")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", monthStart)
      .lt("date", monthEnd),

    // 3. Budget limits per category
    supabase
      .from("budgets")
      .select("category_id, limit_amount")
      .eq("user_id", userId),
  ]);

  if (velocityResult.error) throw new Error(velocityResult.error.message);
  if (currentTxResult.error) throw new Error(currentTxResult.error.message);
  if (budgetResult.error) throw new Error(budgetResult.error.message);

  // ── Monthly Velocity ──────────────────────────────────────────────────────
  const buckets: Record<string, { expense: number; income: number }> = {};
  for (const r of (velocityResult.data ?? []) as Array<{
    amount: number;
    type: string;
    date: string;
  }>) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
    }).format(new Date(r.date)).slice(0, 7);
    if (!buckets[key]) buckets[key] = { expense: 0, income: 0 };
    if (r.type === "expense") buckets[key].expense += r.amount;
    else buckets[key].income += r.amount;
  }
  const monthlyPoints: MonthlyPoint[] = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // ── Category Breakdown ────────────────────────────────────────────────────
  const budgetMap: Record<string, number> = {};
  for (const b of (budgetResult.data ?? []) as Array<{
    category_id: string;
    limit_amount: number;
  }>) {
    budgetMap[b.category_id] = b.limit_amount;
  }

  const spendMap: Record<string, { name: string; spent: number }> = {};
  for (const r of (currentTxResult.data ?? []) as unknown as Array<{
    amount: number;
    category_id: string | null;
    categories: { id: string; name: string } | null;
  }>) {
    const catId = r.category_id ?? "__none__";
    const catName = r.categories?.name ?? "ไม่มีหมวดหมู่";
    if (!spendMap[catId]) spendMap[catId] = { name: catName, spent: 0 };
    spendMap[catId].spent += r.amount;
  }

  const categorySpend: CategorySpend[] = Object.entries(spendMap)
    .map(([catId, { name, spent }]) => ({
      categoryId: catId,
      categoryName: name,
      spent,
      budget: budgetMap[catId] ?? null,
    }))
    .sort((a, b) => b.spent - a.spent);

  return { monthlyPoints, categorySpend };
}
