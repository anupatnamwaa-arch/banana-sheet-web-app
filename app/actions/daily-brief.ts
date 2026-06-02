// app/actions/daily-brief.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { DailyBrief } from "@/lib/types";
import { bangkokToday, getBillingCycle } from "./overview-utils";
import { calculateSafeToSpend } from "@/lib/nana/safe-to-spend";
import { calculateMoneyScore } from "@/lib/nana/money-score";
import {
  choosePrimaryMessage,
  deriveDailyBriefState,
} from "@/lib/nana/daily-brief-rules";

/**
 * Recalculates and updates the daily brief for the authenticated user and today's Bangkok date.
 * Automatically handles estimation, streak calculation, average expense trailing windows,
 * message prioritization, and DB upsert.
 */
export async function getOrRefreshDailyBrief(
  userId: string,
  reason: string
): Promise<DailyBrief> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  if (user.id !== userId) throw new Error("Unauthorized");

  // 1. Query profile settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("cycle_start_day, savings_target_pct")
    .eq("id", userId)
    .single();

  const cycleStartDay = profile?.cycle_start_day ?? 1;
  const savingsTargetPct = profile?.savings_target_pct ?? 0;

  // 2. Resolve today's Bangkok date and billing cycle
  const { year, month, day } = bangkokToday();
  const cycle = getBillingCycle({ year, month, day }, cycleStartDay);

  // 3. Query current cycle transactions
  const { data: currentTransactions } = await supabase
    .from("transactions")
    .select("amount, type, date")
    .eq("user_id", userId)
    .gte("date", cycle.cycleStart)
    .lt("date", cycle.cycleEnd);

  // Calculate transaction aggregates for current cycle
  const hasIncomeTransactions = (currentTransactions ?? []).some(
    t => t.type === "income"
  );
  const cycleIncome = hasIncomeTransactions
    ? (currentTransactions ?? [])
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0)
    : null;

  const expensesLogged =
    (currentTransactions ?? [])
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  const savingsLogged =
    (currentTransactions ?? [])
      .filter(t => t.type === "savings")
      .reduce((sum, t) => sum + t.amount, 0) ?? 0;

  // 4. Query previous cycle's income as fallback estimate if current cycle has no income logged
  let prevCycleIncome: number | null = null;
  const bkkOffsetMs = 7 * 3_600_000;
  if (cycleIncome === null) {
    let prevStartMonth = cycle.cycleStartMonth - 1;
    let prevStartYear = cycle.cycleStartYear;
    if (prevStartMonth === 0) {
      prevStartMonth = 12;
      prevStartYear -= 1;
    }
    const prevCycleStart = new Date(
      Date.UTC(prevStartYear, prevStartMonth - 1, cycleStartDay) - bkkOffsetMs
    ).toISOString();
    const prevCycleEnd = cycle.cycleStart;

    const { data: prevTransactions } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "income")
      .gte("date", prevCycleStart)
      .lt("date", prevCycleEnd);

    if (prevTransactions && prevTransactions.length > 0) {
      prevCycleIncome = prevTransactions.reduce((sum, t) => sum + t.amount, 0);
    }
  }

  // 5. Query active fixed costs
  const { data: fixedCosts } = await supabase
    .from("fixed_costs")
    .select("*")
    .eq("user_id", userId);

  let upcomingFixedExpenses = 0;
  let totalFixedCosts = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayBkkStr = `${year}-${pad(month)}-${pad(day)}`;

  if (fixedCosts) {
    for (const fc of fixedCosts) {
      const isActiveInCycle =
        fc.start_date <= cycle.cycleEnd &&
        (!fc.end_date || fc.end_date >= cycle.cycleStart);

      if (isActiveInCycle) {
        if (fc.type === "expense") {
          totalFixedCosts += fc.amount;

          const daysInStartMonth = new Date(
            Date.UTC(cycle.cycleStartYear, cycle.cycleStartMonth, 0)
          ).getUTCDate();
          const bDay1 = Math.min(fc.day_of_month, daysInStartMonth);
          const bDate1ISO = new Date(
            Date.UTC(cycle.cycleStartYear, cycle.cycleStartMonth - 1, bDay1) -
              bkkOffsetMs
          ).toISOString();

          let billingDateStr = "";
          if (bDate1ISO >= cycle.cycleStart && bDate1ISO < cycle.cycleEnd) {
            billingDateStr = `${cycle.cycleStartYear}-${pad(
              cycle.cycleStartMonth
            )}-${pad(bDay1)}`;
          } else {
            const daysInEndMonth = new Date(
              Date.UTC(cycle.cycleEndYear, cycle.cycleEndMonth, 0)
            ).getUTCDate();
            const bDay2 = Math.min(fc.day_of_month, daysInEndMonth);
            billingDateStr = `${cycle.cycleEndYear}-${pad(
              cycle.cycleEndMonth
            )}-${pad(bDay2)}`;
          }

          const isUpcoming = billingDateStr > todayBkkStr;
          if (isUpcoming) {
            upcomingFixedExpenses += fc.amount;
          }
        }
      }
    }
  }

  // 6. Calculate committed saving
  const activeIncome = cycleIncome ?? prevCycleIncome ?? 0;
  const committedSaving = activeIncome * (savingsTargetPct / 100);

  // 7. Calculate Safe to Spend
  const safeToSpendResult = calculateSafeToSpend({
    cycleIncome,
    previousCycleIncome: prevCycleIncome,
    expensesLogged,
    upcomingFixedExpenses,
    committedSaving,
    daysRemaining: cycle.daysRemaining,
  });

  // 8. Calculate Money Score
  const { data: budgets } = await supabase
    .from("budgets")
    .select("limit_amount")
    .eq("user_id", userId);

  const budgetTotal =
    budgets?.reduce((sum, b) => sum + b.limit_amount, 0) ?? 0;
  const hasBudget = budgets && budgets.length > 0;

  // Trailing average monthly expense lookback
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const trailingStart = twelveMonthsAgo.toISOString();

  const { data: trailingRows } = await supabase
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", trailingStart);

  const monthBuckets: Record<string, number> = {};
  if (trailingRows) {
    for (const r of trailingRows) {
      const key = r.date.slice(0, 7); // YYYY-MM
      monthBuckets[key] = (monthBuckets[key] ?? 0) + r.amount;
    }
  }
  const monthCount = Object.keys(monthBuckets).length;
  const totalTrailingExpense = Object.values(monthBuckets).reduce(
    (a, b) => a + b,
    0
  );
  const avgMonthlyExpense =
    monthCount > 0 ? totalTrailingExpense / monthCount : 0;

  const budgetTarget = hasBudget ? budgetTotal : avgMonthlyExpense;
  const cycleDays = cycle.daysInCycle;
  const elapsedDays = cycle.daysElapsed;
  const paceLine =
    cycleDays > 0 ? budgetTarget * (elapsedDays / cycleDays) : 0;

  const spendingPaceRatio = paceLine > 0 ? expensesLogged / paceLine : null;
  const savingRate =
    activeIncome > 0 ? (savingsLogged / activeIncome) * 100 : null;
  const fixedExpensePressureRatio =
    activeIncome > 0 ? totalFixedCosts / activeIncome : null;

  // Calculate logging streak
  const streakLookback = new Date(
    Date.UTC(year, month - 1, day - 400) - bkkOffsetMs
  ).toISOString();

  const { data: streakResult } = await supabase
    .from("transactions")
    .select("date")
    .eq("user_id", userId)
    .gte("date", streakLookback)
    .order("date", { ascending: false });

  const loggedDays = new Set<string>();
  if (streakResult) {
    for (const r of streakResult) {
      const bkk = new Date(new Date(r.date).getTime() + bkkOffsetMs);
      loggedDays.add(
        `${bkk.getUTCFullYear()}-${pad(bkk.getUTCMonth() + 1)}-${pad(
          bkk.getUTCDate()
        )}`
      );
    }
  }
  const streakLoggedToday = loggedDays.has(todayBkkStr);
  let loggingStreak = 0;
  let cursor = Date.UTC(year, month - 1, day);
  if (!streakLoggedToday) cursor -= 86_400_000; // grace: count from yesterday
  while (true) {
    const c = new Date(cursor);
    const key = `${c.getUTCFullYear()}-${pad(c.getUTCMonth() + 1)}-${pad(
      c.getUTCDate()
    )}`;
    if (!loggedDays.has(key)) break;
    loggingStreak++;
    cursor -= 86_400_000;
  }

  const moneyScoreResult = calculateMoneyScore({
    spendingPaceRatio,
    safeToSpendPerDay: safeToSpendResult.safeToSpendPerDay,
    savingRate,
    savingTargetPct: savingsTargetPct,
    fixedExpensePressureRatio,
    loggingStreak,
  });

  // 9. Derive priority and state
  const hasUpcomingFixedExpensePressure =
    fixedExpensePressureRatio !== null && fixedExpensePressureRatio > 0.4;

  let safeToSpendStatus: "healthy" | "attention" | "recovery" | "unknown" =
    "unknown";
  if (safeToSpendResult.safeToSpendPerDay === null) {
    safeToSpendStatus = "unknown";
  } else if (safeToSpendResult.safeToSpendPerDay === 0) {
    safeToSpendStatus = "recovery";
  } else {
    safeToSpendStatus = "healthy";
  }

  const hasMeaningfulIncome = (currentTransactions ?? []).some(
    t => t.type === "income" && t.amount > 0
  );

  const avgDaily = avgMonthlyExpense / 30;
  const hasUnusualExpense = (currentTransactions ?? []).some(
    t => t.type === "expense" && t.amount > Math.max(1000, avgDaily * 3)
  );

  const ruleInput = {
    needsIncomeSetup: safeToSpendResult.needsIncomeSetup,
    hasUpcomingFixedExpensePressure,
    safeToSpendStatus,
    hasUnusualExpense,
    hasMeaningfulIncome,
  };

  const primaryMessageKey = choosePrimaryMessage(ruleInput);
  const state = deriveDailyBriefState(ruleInput);

  let suggestedActionKey: string | null = null;
  if (state === "payday") {
    suggestedActionKey = "set_savings_goal";
  } else if (state === "recovery") {
    suggestedActionKey = "view_recovery_plan";
  } else if (state === "setup") {
    suggestedActionKey = "setup_income_prompt";
  } else if (state === "attention") {
    suggestedActionKey = "adjust_budget";
  }

  const reason_values = {
    cycleIncome,
    prevCycleIncome,
    expensesLogged,
    upcomingFixedExpenses,
    committedSaving,
    daysRemaining: cycle.daysRemaining,
    loggingStreak,
    fixedExpensePressureRatio,
    spendingPaceRatio,
    savingRate,
    totalFixedCosts,
    avgMonthlyExpense,
  };

  // 10. Load today's existing brief to preserve `suggestion_dismissed_at` and `ai_detail_th`
  const { data: existingBrief } = await supabase
    .from("daily_briefs")
    .select("suggestion_dismissed_at, ai_detail_th")
    .eq("user_id", userId)
    .eq("brief_date", todayBkkStr)
    .maybeSingle();

  const suggestion_dismissed_at =
    existingBrief?.suggestion_dismissed_at ?? null;
  const ai_detail_th = existingBrief?.ai_detail_th ?? null;

  // 11. Upsert today's evolving record
  const { data: newBrief, error: upsertError } = await supabase
    .from("daily_briefs")
    .upsert(
      {
        user_id: userId,
        brief_date: todayBkkStr,
        state,
        safe_to_spend_per_day: safeToSpendResult.safeToSpendPerDay,
        safe_to_spend_is_estimated: safeToSpendResult.isEstimated,
        money_score: moneyScoreResult.score,
        score_factors: moneyScoreResult.factors,
        primary_message_key: primaryMessageKey,
        suggested_action_key: suggestedActionKey,
        reason_values,
        ai_detail_th,
        suggestion_dismissed_at,
        refresh_reason: reason,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,brief_date" }
    )
    .select("*")
    .single();

  if (upsertError) throw new Error(upsertError.message);
  return newBrief as DailyBrief;
}

/**
 * Dismisses today's daily brief suggestion by setting suggestion_dismissed_at.
 */
export async function dismissDailyBriefSuggestion(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { year, month, day } = bangkokToday();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayBkkStr = `${year}-${pad(month)}-${pad(day)}`;

  const { error } = await supabase
    .from("daily_briefs")
    .update({
      suggestion_dismissed_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("brief_date", todayBkkStr);

  if (error) throw new Error(error.message);
}
