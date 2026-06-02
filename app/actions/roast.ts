// app/actions/roast.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "./overview-utils";

export interface CategorySpend {
  category: string;
  total: number;
  count: number;
}

export interface BudgetEntry {
  category: string;
  limit_amount: number;
}

export interface RoastData {
  thisMonth: CategorySpend[];
  thisMonthIncome: number;
  thisMonthExpense: number;
  thisMonthSavings: number;
  thisMonthSavingRate: number; // percentage (0-100)

  lastMonth: CategorySpend[];
  lastMonthIncome: number;
  lastMonthExpense: number;
  lastMonthSavings: number;
  lastMonthSavingRate: number; // percentage (0-100)

  budgets: BudgetEntry[];
  monthLabel: string;
  lastMonthLabel: string;
}

export type RoastRateLimitResult =
  | { allowed: true; data: RoastData }
  | { allowed: false; reason: "free_used" | "pro_cooldown"; nextAvailableAt: string | null };

const MONTH_NAMES = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function monthWindow(year: number, month: number): { start: string; end: string } {
  // month is 1-indexed Bangkok-local
  const bkkOffsetMs = 7 * 3_600_000;
  const start = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const end = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();
  return { start, end };
}

export async function getRoastData(): Promise<RoastRateLimitResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  // Fetch profile for rate limit + plan check
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at, free_roast_used, last_roast_at")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const isPro =
    profile.is_active &&
    (profile.plan_expires_at === null || new Date(profile.plan_expires_at).getTime() > Date.now());

  // Rate limit check
  if (!isPro) {
    if (profile.free_roast_used) {
      return { allowed: false, reason: "free_used", nextAvailableAt: null };
    }
  } else {
    if (profile.last_roast_at) {
      const lastRoast = new Date(profile.last_roast_at).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastRoast < sevenDaysMs) {
        const nextAvailableAt = new Date(lastRoast + sevenDaysMs).toISOString();
        return { allowed: false, reason: "pro_cooldown", nextAvailableAt };
      }
    }
  }

  // Calculate month windows
  const { year, month } = bangkokToday();

  // Review period = last month (complete)
  const reviewMonth = month === 1 ? 12 : month - 1;
  const reviewYear = month === 1 ? year - 1 : year;

  // Comparison period = two months ago
  const compMonth = reviewMonth === 1 ? 12 : reviewMonth - 1;
  const compYear = reviewMonth === 1 ? reviewYear - 1 : reviewYear;

  const thisWindow = monthWindow(reviewYear, reviewMonth);
  const lastWindow = monthWindow(compYear, compMonth);

  // Fetch all transactions across both months in a single query
  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("amount, type, date, categories(name)")
    .eq("user_id", user.id)
    .gte("date", lastWindow.start)
    .lt("date", thisWindow.end);

  if (txError) throw new Error(txError.message);

  // Aggregate this month and last month data in memory
  let thisMonthIncome = 0;
  let thisMonthExpense = 0;
  let thisMonthSavings = 0;
  const thisMonthCatMap = new Map<string, { total: number; count: number }>();

  let lastMonthIncome = 0;
  let lastMonthExpense = 0;
  let lastMonthSavings = 0;
  const lastMonthCatMap = new Map<string, { total: number; count: number }>();

  if (transactions) {
    for (const r of transactions as Array<{
      amount: number;
      type: "income" | "expense" | "savings";
      date: string;
      categories: { name: string }[] | { name: string } | null;
    }>) {
      const isThisMonth = r.date >= thisWindow.start && r.date < thisWindow.end;
      const isLastMonth = r.date >= lastWindow.start && r.date < lastWindow.end;
      
      const cat = Array.isArray(r.categories)
        ? r.categories[0]?.name
        : (r.categories as { name: string } | null)?.name ?? "อื่นๆ";

      if (isThisMonth) {
        if (r.type === "income") thisMonthIncome += r.amount;
        else if (r.type === "savings") thisMonthSavings += r.amount;
        else if (r.type === "expense") {
          thisMonthExpense += r.amount;
          const existing = thisMonthCatMap.get(cat) ?? { total: 0, count: 0 };
          thisMonthCatMap.set(cat, { total: existing.total + r.amount, count: existing.count + 1 });
        }
      } else if (isLastMonth) {
        if (r.type === "income") lastMonthIncome += r.amount;
        else if (r.type === "savings") lastMonthSavings += r.amount;
        else if (r.type === "expense") {
          lastMonthExpense += r.amount;
          const existing = lastMonthCatMap.get(cat) ?? { total: 0, count: 0 };
          lastMonthCatMap.set(cat, { total: existing.total + r.amount, count: existing.count + 1 });
        }
      }
    }
  }

  const thisMonth: CategorySpend[] = Array.from(thisMonthCatMap.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);

  const lastMonth: CategorySpend[] = Array.from(lastMonthCatMap.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);

  const thisMonthSavingRate = thisMonthIncome > 0 ? Math.round((thisMonthSavings / thisMonthIncome) * 100) : 0;
  const lastMonthSavingRate = lastMonthIncome > 0 ? Math.round((lastMonthSavings / lastMonthIncome) * 100) : 0;

  // Budgets
  const { data: budgetRows, error: budgetError } = await supabase
    .from("budgets")
    .select("limit_amount, categories(name)")
    .eq("user_id", user.id);

  if (budgetError) throw new Error(budgetError.message);

  const budgets: BudgetEntry[] = (budgetRows ?? []).map(
    (b: { limit_amount: number; categories: { name: string }[] | { name: string } | null }) => {
      const cat = Array.isArray(b.categories)
        ? b.categories[0]?.name
        : (b.categories as { name: string } | null)?.name ?? "อื่นๆ";
      return {
        category: cat,
        limit_amount: b.limit_amount,
      };
    },
  );

  return {
    allowed: true,
    data: {
      thisMonth,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthSavings,
      thisMonthSavingRate,
      lastMonth,
      lastMonthIncome,
      lastMonthExpense,
      lastMonthSavings,
      lastMonthSavingRate,
      budgets,
      monthLabel: `${MONTH_NAMES[reviewMonth - 1]} ${reviewYear + 543}`,
      lastMonthLabel: `${MONTH_NAMES[compMonth - 1]} ${compYear + 543}`,
    },
  };
}

export interface PastRoast {
  id: string;
  persona_id: string;
  roast: string;
  summary: string | null;
  created_at: string;
}

export async function getPastRoasts(): Promise<PastRoast[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("ai_roasts")
    .select("id, persona_id, roast, summary, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []) as PastRoast[];
}

export async function markRoastUsed(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) return;

  const isPro =
    profile.is_active &&
    (profile.plan_expires_at === null || new Date(profile.plan_expires_at).getTime() > Date.now());

  if (isPro) {
    await supabase
      .from("profiles")
      .update({ last_roast_at: new Date().toISOString() })
      .eq("id", user.id);
  } else {
    await supabase
      .from("profiles")
      .update({ free_roast_used: true, last_roast_at: new Date().toISOString() })
      .eq("id", user.id);
  }
}
