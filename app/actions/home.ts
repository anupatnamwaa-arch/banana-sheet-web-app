"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday, getBillingCycle } from "./overview-utils";
import { getDictionary, format, type Locale } from "@/lib/i18n";

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

const THB = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

export async function getHomeData(userId: string, locale: Locale = "th"): Promise<HomeData> {
  const t = getDictionary(locale);
  const MONTH_NAMES_SHORT = t.calendar.months;
  const yearOffset = t.calendar.yearOffset;
  const supabase = await createClient();

  // Load cycle and balance settings (needed before computing date range)
  const { data: profileSettings } = await supabase
    .from("profiles")
    .select("cycle_start_day, balance_method")
    .eq("id", userId)
    .single();

  const cycleStartDay =
    (profileSettings as { cycle_start_day: number } | null)?.cycle_start_day ?? 1;
  const balanceMethod =
    (profileSettings as { balance_method: string } | null)?.balance_method ?? "net";

  const { year, month, day } = bangkokToday();
  const cycle = getBillingCycle({ year, month, day }, cycleStartDay);
  const bkkOffsetMs = 7 * 3_600_000;

  const todayStart = new Date(Date.UTC(year, month - 1, day) - bkkOffsetMs).toISOString();
  const todayEnd = new Date(Date.UTC(year, month - 1, day + 1) - bkkOffsetMs).toISOString();

  const [thisMonthResult, budgetsResult, todayResult, recentResult] = await Promise.all([
    // This month all transactions
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .gte("date", cycle.cycleStart)
      .lt("date", cycle.cycleEnd),

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
  const daysElapsed   = cycle.daysElapsed;
  const daysRemaining = cycle.daysRemaining;
  const daysInMonth   = cycle.daysInCycle;
  const avgDailyExpense = totalExpense / daysElapsed;

  // Remaining (method-aware)
  const remaining =
    balanceMethod === "gross"  ? totalIncome - totalExpense :
    balanceMethod === "budget" ? budgetTotal - totalExpense :
    /* net (default) */          totalIncome - totalExpense - totalSavings;

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
    insight = format(
      locale === "en"
        ? "Saved {rate}% of income this month 🎉"
        : "เดือนนี้คุณออมได้ {rate}% ของรายรับแล้ว 🎉",
      { rate }
    );
  } else if (budgetTotal > 0 && totalExpense > 0) {
    const pct = Math.round((totalExpense / budgetTotal) * 100);
    if (pct > 90) {
      insight = format(
        locale === "en"
          ? "Used {pct}% of budget — watch out ⚠️"
          : "ใช้งบไปแล้ว {pct}% ระวังนิดนึงนะ ⚠️",
        { pct }
      );
    } else if (daysRemaining > 0) {
      const dailyBudget = Math.max(0, Math.round((budgetTotal - totalExpense) / daysRemaining));
      insight = format(
        locale === "en"
          ? "Daily budget remaining: {amount}"
          : "ใช้ได้อีกวันละประมาณ {amount} จนถึงสิ้นเดือน",
        { amount: THB(dailyBudget) }
      );
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
    monthLabel: (() => {
      const { cycleStartMonth, cycleStartYear, cycleEndMonth, cycleEndYear } = cycle;
      if (cycleStartDay === 1) {
        return `${MONTH_NAMES_SHORT[cycleStartMonth - 1]} ${cycleStartYear + yearOffset}`;
      }
      const endDay = cycleStartDay - 1;
      const sameYear = cycleStartYear === cycleEndYear;
      if (sameYear) {
        return `${cycleStartDay} ${MONTH_NAMES_SHORT[cycleStartMonth - 1]} – ${endDay} ${MONTH_NAMES_SHORT[cycleEndMonth - 1]} ${cycleStartYear + yearOffset}`;
      }
      return `${cycleStartDay} ${MONTH_NAMES_SHORT[cycleStartMonth - 1]} ${cycleStartYear + yearOffset} – ${endDay} ${MONTH_NAMES_SHORT[cycleEndMonth - 1]} ${cycleEndYear + yearOffset}`;
    })(),
  };
}
