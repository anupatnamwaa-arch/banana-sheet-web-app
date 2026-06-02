"use client";

import type { AnalyticsData } from "@/app/actions/analytics";
import { AnalyticsHeroPulse } from "./AnalyticsHeroPulse";
import { CategoryBars } from "./CategoryBars";
import { IncomeExpenseTrend } from "./IncomeExpenseTrend";
import { SavingsRate } from "./SavingsRate";
import { DailyPattern } from "./DailyPattern";
import { TopSpendingInsight } from "./TopSpendingInsight";
import { ComparisonInsight } from "./ComparisonInsight";
import { RecurringRatioCard } from "./RecurringRatioCard";
import { RecurringBreakdown } from "./RecurringBreakdown";
import { MonthlyAveragesCard } from "./MonthlyAveragesCard";

interface Props {
  analytics: AnalyticsData;
  savingsTarget: number;
}

export function AnalyticsView({ analytics, savingsTarget }: Props) {
  return (
    <div className="space-y-4">
      <AnalyticsHeroPulse metrics={analytics.metrics} />

      <CategoryBars categories={analytics.categories} />

      <IncomeExpenseTrend
        trend={analytics.trend}
        currentMonthRemaining={analytics.currentMonthRemaining}
      />

      <DailyPattern
        weeklyPattern={analytics.weeklyPattern}
        peakWeekday={analytics.peakWeekday}
        avgPerDay={analytics.metrics.avgPerDay}
        weeklyPatternNonRecurring={analytics.weeklyPatternNonRecurring}
        peakWeekdayNonRecurring={analytics.peakWeekdayNonRecurring}
        avgPerDayNonRecurring={analytics.metrics.avgPerDayNonRecurring}
      />

      <SavingsRate
        savingRate={analytics.metrics.savingRate}
        totalSavings={analytics.metrics.totalSavings}
        totalIncome={analytics.metrics.totalIncome}
        target={savingsTarget}
      />

      <ComparisonInsight
        movers={analytics.movers}
        elapsedDays={analytics.metrics.elapsedDays}
      />

      <TopSpendingInsight topCategory={analytics.categoriesNonRecurring[0] ?? null} />

      <RecurringRatioCard
        totalRecurringExpense={analytics.totalRecurringExpense}
        totalSubscriptionExpense={analytics.totalSubscriptionExpense}
        totalIncome={analytics.metrics.totalIncome}
      />

      <RecurringBreakdown categories={analytics.categoriesRecurring} />

      <MonthlyAveragesCard
        income={analytics.monthlyAverages.income}
        expense={analytics.monthlyAverages.expense}
        savings={analytics.monthlyAverages.savings}
        savingRate={analytics.monthlyAverages.savingRate}
        monthCount={analytics.monthlyAverages.monthCount}
        currentPeriodSavingRate={analytics.metrics.savingRate}
      />
    </div>
  );
}
