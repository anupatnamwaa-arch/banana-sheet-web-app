// app/(dashboard)/analytics/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/app/actions/analytics";
import { normalizePeriod } from "@/app/actions/analytics-utils";
import { RoastEntryCard } from "./_components/RoastEntryCard";
import { PeriodPills } from "./_components/PeriodPills";
import { KeyMetrics } from "./_components/KeyMetrics";
import { CategoryBars } from "./_components/CategoryBars";
import { IncomeExpenseTrend } from "./_components/IncomeExpenseTrend";
import { SavingsRate } from "./_components/SavingsRate";
import { DailyPattern } from "./_components/DailyPattern";
import { TopSpendingInsight } from "./_components/TopSpendingInsight";
import { ComparisonInsight } from "./_components/ComparisonInsight";
import { SmartInsights } from "./_components/SmartInsights";
import { AnalyticsEmptyState } from "./_components/AnalyticsEmptyState";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";

interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { period: rawPeriod, from: rawFrom, to: rawTo } = await searchParams;
  const ym = /^\d{4}-\d{2}$/;
  const range =
    ym.test(rawFrom ?? "") && ym.test(rawTo ?? "") && rawFrom! <= rawTo!
      ? { from: rawFrom!, to: rawTo! }
      : undefined;
  const period = normalizePeriod(rawPeriod);
  const locale = await getLocale();
  const t = getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: profileData } = await supabase
    .from("profiles")
    .select("savings_target_pct")
    .eq("id", userId)
    .single();
  const savingsTarget =
    (profileData as { savings_target_pct: number } | null)?.savings_target_pct ?? 20;

  const analytics = await getAnalyticsData(userId, period, savingsTarget, range, locale);

  return (
    <section className="space-y-4 pb-4">
      {/* AI roast entry stays pinned at the very top */}
      <RoastEntryCard />

      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.analytics.title}</h1>
        <p className="mt-0.5 text-sm text-fg-muted">
          {t.analytics.subtitle}
        </p>
      </header>

      <Suspense fallback={<div className="h-8" />}>
        <PeriodPills current={period} selectedRange={range ?? null} />
      </Suspense>

      {!analytics.hasData ? (
        <AnalyticsEmptyState />
      ) : (
        <>
          <KeyMetrics metrics={analytics.metrics} />

          <CategoryBars categories={analytics.categories} />

          <IncomeExpenseTrend
            trend={analytics.trend}
            currentMonthRemaining={analytics.currentMonthRemaining}
          />

          <SavingsRate
            savingRate={analytics.metrics.savingRate}
            totalSavings={analytics.metrics.totalSavings}
            totalIncome={analytics.metrics.totalIncome}
            target={savingsTarget}
          />

          <DailyPattern
            weeklyPattern={analytics.weeklyPattern}
            peakWeekday={analytics.peakWeekday}
            avgPerDay={analytics.metrics.avgPerDay}
          />

          <TopSpendingInsight topCategory={analytics.topCategory} />

          <ComparisonInsight movers={analytics.movers} />

          <SmartInsights insights={analytics.insights} />
        </>
      )}
    </section>
  );
}
