"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday, getBillingCycle } from "./overview-utils";
import { processFixedCosts } from "./fixed-costs";
import { getDictionary, format, type Locale } from "@/lib/i18n";
import type { FixedCost } from "@/lib/types";

export interface RecentTransaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "savings";
  note: string | null;
  category: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
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
  // Logging streak (consecutive days with at least one transaction, Bangkok days)
  streak: number;
  streakLoggedToday: boolean;
  // Insight
  insight: string | null;
  // Labels
  monthLabel: string;
  // Fixed Costs
  upcomingFixedCostsTotal: number;
  categoryCommittedMap: Record<string, number>;
}

const THB = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

export async function getHomeData(userId: string, locale: Locale = "th"): Promise<HomeData> {
  // Catch up Fixed Costs auto-logging
  await processFixedCosts(userId).catch((err) => {
    console.error("Failed to auto-log fixed costs:", err);
  });

  const t = getDictionary(locale);
  const MONTH_NAMES_SHORT = t.calendar.months;
  const yearOffset = t.calendar.yearOffset;
  const supabase = await createClient();

  // Load cycle and balance settings (needed before computing date range)
  const { data: profileSettings } = await supabase
    .from("profiles")
    .select("cycle_start_day, balance_method, carryover_enabled")
    .eq("id", userId)
    .single();

  const cycleStartDay =
    (profileSettings as { cycle_start_day: number } | null)?.cycle_start_day ?? 1;
  const balanceMethod =
    (profileSettings as { balance_method: string } | null)?.balance_method ?? "net";
  const carryoverEnabled =
    (profileSettings as { carryover_enabled: boolean } | null)?.carryover_enabled ?? false;

  const { year, month, day } = bangkokToday();
  const cycle = getBillingCycle({ year, month, day }, cycleStartDay);
  const bkkOffsetMs = 7 * 3_600_000;

  const todayStart = new Date(Date.UTC(year, month - 1, day) - bkkOffsetMs).toISOString();
  const todayEnd = new Date(Date.UTC(year, month - 1, day + 1) - bkkOffsetMs).toISOString();
  // Lookback for the logging streak (cap at ~400 days back).
  const streakLookback = new Date(Date.UTC(year, month - 1, day - 400) - bkkOffsetMs).toISOString();

  // Previous cycle: one day before current cycle start → resolve that cycle's bounds
  const prevCycleEndMs = new Date(cycle.cycleStart).getTime() + bkkOffsetMs; // Bangkok midnight of cycleStart day
  const prevCycleDayMs = prevCycleEndMs - 86_400_000; // one Bangkok day earlier
  const prevCycleDate = new Date(prevCycleDayMs);
  const prevCycle = getBillingCycle(
    { year: prevCycleDate.getUTCFullYear(), month: prevCycleDate.getUTCMonth() + 1, day: prevCycleDate.getUTCDate() },
    cycleStartDay
  );

  const [thisMonthResult, budgetsResult, todayResult, recentResult, streakResult, fixedCostsResult, prevMonthResult] = await Promise.all([
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
      .select("id, amount, type, note, date, categories(name, icon, color)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),

    // Dates only, for the logging streak
    supabase
      .from("transactions")
      .select("date")
      .eq("user_id", userId)
      .gte("date", streakLookback)
      .order("date", { ascending: false }),

    // All fixed costs
    supabase
      .from("fixed_costs")
      .select("*")
      .eq("user_id", userId),

    // Previous cycle transactions (for carryover)
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .gte("date", prevCycle.cycleStart)
      .lt("date", prevCycle.cycleEnd),
  ]);

  // Logging streak: consecutive Bangkok days ending at today (today is optional —
  // the streak stays alive until midnight even before you've logged today).
  const pad = (n: number) => String(n).padStart(2, "0");
  const loggedDays = new Set<string>();
  for (const r of streakResult.data ?? []) {
    const bkk = new Date(new Date(r.date).getTime() + bkkOffsetMs);
    loggedDays.add(`${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(bkk.getUTCDate())}`);
  }
  const todayStr = `${year}-${pad(month)}-${pad(day)}`;
  const streakLoggedToday = loggedDays.has(todayStr);
  let streak = 0;
  let cursor = Date.UTC(year, month - 1, day);
  if (!streakLoggedToday) cursor -= 86_400_000; // grace: count from yesterday
  while (true) {
    const c = new Date(cursor);
    const key = `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(c.getUTCDate())}`;
    if (!loggedDays.has(key)) break;
    streak++;
    cursor -= 86_400_000;
  }

  // Load active fixed costs for this cycle
  const fixedCosts = (fixedCostsResult.data ?? []) as FixedCost[];

  // Calculate category committed budgets & upcoming fixed costs
  let upcomingFixedCostsTotal = 0;
  const categoryCommittedMap: Record<string, number> = {};

  const todayBkkStr = `${year}-${pad(month)}-${pad(day)}`;

  for (const fc of fixedCosts) {
    const isActiveInCycle =
      fc.start_date <= cycle.cycleEnd &&
      (!fc.end_date || fc.end_date >= cycle.cycleStart);

    if (isActiveInCycle) {
      if (fc.type === "expense" && fc.category_id) {
        categoryCommittedMap[fc.category_id] = (categoryCommittedMap[fc.category_id] || 0) + fc.amount;
      }

      const daysInStartMonth = new Date(Date.UTC(cycle.cycleStartYear, cycle.cycleStartMonth, 0)).getUTCDate();
      const bDay1 = Math.min(fc.day_of_month, daysInStartMonth);
      const bDate1ISO = new Date(Date.UTC(cycle.cycleStartYear, cycle.cycleStartMonth - 1, bDay1) - bkkOffsetMs).toISOString();

      let billingDateStr = "";
      if (bDate1ISO >= cycle.cycleStart && bDate1ISO < cycle.cycleEnd) {
        billingDateStr = `${cycle.cycleStartYear}-${pad(cycle.cycleStartMonth)}-${pad(bDay1)}`;
      } else {
        const daysInEndMonth = new Date(Date.UTC(cycle.cycleEndYear, cycle.cycleEndMonth, 0)).getUTCDate();
        const bDay2 = Math.min(fc.day_of_month, daysInEndMonth);
        billingDateStr = `${cycle.cycleEndYear}-${pad(cycle.cycleEndMonth)}-${pad(bDay2)}`;
      }

      const isUpcoming = billingDateStr > todayBkkStr;

      if (isUpcoming && fc.type === "expense") {
        upcomingFixedCostsTotal += fc.amount;
      }
    }
  }

  // Aggregate this month
  let totalIncome = 0;
  let totalExpense = 0;
  let totalSavings = 0;
  for (const r of thisMonthResult.data ?? []) {
    if (r.type === "income") totalIncome += r.amount;
    else if (r.type === "expense") totalExpense += r.amount;
    else if (r.type === "savings") totalSavings += r.amount;
  }

  // Carryover from previous cycle (same method as current remaining)
  let prevIncome = 0, prevExpense = 0, prevSavings = 0;
  for (const r of prevMonthResult.data ?? []) {
    if (r.type === "income") prevIncome += r.amount;
    else if (r.type === "expense") prevExpense += r.amount;
    else if (r.type === "savings") prevSavings += r.amount;
  }
  const prevRemaining =
    balanceMethod === "gross"  ? prevIncome - prevExpense :
    balanceMethod === "budget" ? Math.max(0, prevIncome - prevExpense) :
    /* net */                    prevIncome - prevExpense - prevSavings;

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

  // Remaining (method-aware) + optional carryover from previous cycle
  const carry = carryoverEnabled ? prevRemaining : 0;
  const remaining =
    balanceMethod === "gross"  ? carry + totalIncome - totalExpense :
    balanceMethod === "budget" ? budgetTotal - totalExpense :
    /* net (default) */          carry + totalIncome - totalExpense - totalSavings;

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
      categories: { name: string; icon?: string | null; color?: string | null }[] | { name: string; icon?: string | null; color?: string | null } | null;
    }>
  ).map((r) => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    return {
      id: r.id,
      amount: r.amount,
      type: r.type as "income" | "expense" | "savings",
      note: r.note,
      category: cat?.name ?? null,
      categoryIcon: cat?.icon ?? null,
      categoryColor: cat?.color ?? null,
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
    streak,
    streakLoggedToday,
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
    upcomingFixedCostsTotal,
    categoryCommittedMap,
  };
}
