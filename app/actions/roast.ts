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
  lastMonth: CategorySpend[];
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

async function aggregateByCategory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  start: string,
  end: string,
): Promise<CategorySpend[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", start)
    .lt("date", end);

  if (error) throw new Error(error.message);
  if (!data) return [];

  const map = new Map<string, { total: number; count: number }>();
  for (const row of data as Array<{ amount: number; categories: { name: string } | null }>) {
    const cat = row.categories?.name ?? "อื่นๆ";
    const existing = map.get(cat) ?? { total: 0, count: 0 };
    map.set(cat, { total: existing.total + row.amount, count: existing.count + 1 });
  }

  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);
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

  // Aggregate data
  const { year, month } = bangkokToday();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const thisWindow = monthWindow(year, month);
  const lastWindow = monthWindow(prevYear, prevMonth);

  const [thisMonth, lastMonth] = await Promise.all([
    aggregateByCategory(supabase, user.id, thisWindow.start, thisWindow.end),
    aggregateByCategory(supabase, user.id, lastWindow.start, lastWindow.end),
  ]);

  // Budgets
  const { data: budgetRows, error: budgetError } = await supabase
    .from("budgets")
    .select("limit_amount, categories(name)")
    .eq("user_id", user.id);

  if (budgetError) throw new Error(budgetError.message);

  const budgets: BudgetEntry[] = (budgetRows ?? []).map(
    (b: { limit_amount: number; categories: { name: string } | null }) => ({
      category: b.categories?.name ?? "อื่นๆ",
      limit_amount: b.limit_amount,
    }),
  );

  return {
    allowed: true,
    data: {
      thisMonth,
      lastMonth,
      budgets,
      monthLabel: `${MONTH_NAMES[month - 1]} ${year + 543}`,
      lastMonthLabel: `${MONTH_NAMES[prevMonth - 1]} ${prevYear + 543}`,
    },
  };
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
