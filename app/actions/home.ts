"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "./overview-utils";

export interface RecentTransaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "savings";
  note: string | null;
  category: string | null;
  date: string;
}

export interface HomeData {
  // This month totals
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingRate: number | null;
  remaining: number; // income - expense - savings
  // Budget
  budgetTotal: number;
  budgetUsed: number; // = totalExpense this month
  // Today
  todayExpense: number;
  todayCount: number;
  avgDailyExpense: number; // totalExpense / daysElapsed
  // Days
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  // Recent
  recentTransactions: RecentTransaction[];
  // Insight
  insight: string | null;
  // Labels
  monthLabel: string;
}

const MONTH_NAMES_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const THB = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

export async function getHomeData(userId: string): Promise<HomeData> {
  const supabase = await createClient();
  const { year, month, day, daysInMonth } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();

  const todayStart = new Date(Date.UTC(year, month - 1, day) - bkkOffsetMs).toISOString();
  const todayEnd = new Date(Date.UTC(year, month - 1, day + 1) - bkkOffsetMs).toISOString();

  const [thisMonthResult, budgetsResult, todayResult, recentResult] = await Promise.all([
    // This month all transactions
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lt("date", monthEnd),

    // All budgets
    supabase.from("budgets").select("limit_amount").eq("user_id", userId),

    // Today's expenses
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", todayStart)
      .lt("date", todayEnd),

    // Recent 5 transactions
    supabase
      .from("transactions")
      .select("id, amount, type, note, date, categories(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),
  ]);

  // Aggregate this month
  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;
  for (const r of thisMonthResult.data ?? []) {
    if (r.type === "income") totalIncome += r.amount;
    else if (r.type === "expense") totalExpense += r.amount;
    else if (r.type === "savings") totalSavings += r.amount;
  }

  // Today
  const todayExpense = (todayResult.data ?? []).reduce((s, r) => s + r.amount, 0);
  const todayCount = todayResult.data?.length ?? 0;

  // Budget
  const budgetTotal = (budgetsResult.data ?? []).reduce((s, b) => s + b.limit_amount, 0);

  // Days
  const daysElapsed = Math.max(1, day);
  const daysRemaining = Math.max(0, daysInMonth - day);
  const avgDailyExpense = totalExpense / daysElapsed;

  // Remaining = income - expense - savings
  const remaining = totalIncome - totalExpense - totalSavings;

  // Saving rate = savings / income
  const savingRate =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : null;

  // Recent transactions
  const recentTransactions: RecentTransaction[] = (
    (recentResult.data ?? []) as Array<{
      id: string;
      amount: number;
      type: string;
      note: string | null;
      date: string;
      categories: { name: string }[] | { name: string } | null;
    }>
  ).map((r) => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    return {
      id: r.id,
      amount: r.amount,
      type: r.type as "income" | "expense" | "savings",
      note: r.note,
      category: cat?.name ?? null,
      date: r.date,
    };
  });

  // One smart insight, picked by priority.
  let insight: string | null = null;
  if (totalIncome > 0 && totalSavings > 0) {
    const rate = Math.round((totalSavings / totalIncome) * 100);
    insight = `เดือนนี้คุณออมได้ ${rate}% ของรายรับแล้ว 🎉`;
  } else if (budgetTotal > 0 && totalExpense > 0) {
    const pct = Math.round((totalExpense / budgetTotal) * 100);
    if (pct > 90) {
      insight = `ใช้งบไปแล้ว ${pct}% ระวังนิดนึงนะ ⚠️`;
    } else if (daysRemaining > 0) {
      const dailyBudget = Math.max(0, Math.round((budgetTotal - totalExpense) / daysRemaining));
      insight = `ใช้ได้อีกวันละประมาณ ${THB(dailyBudget)} จนถึงสิ้นเดือน`;
    }
  }

  return {
    totalIncome,
    totalExpense,
    totalSavings,
    savingRate,
    remaining,
    budgetTotal,
    budgetUsed: totalExpense,
    todayExpense,
    todayCount,
    avgDailyExpense,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    recentTransactions,
    insight,
    monthLabel: `${MONTH_NAMES_SHORT[month - 1]} ${year + 543}`,
  };
}
