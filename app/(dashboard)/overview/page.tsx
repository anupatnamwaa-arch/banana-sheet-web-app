import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/app/actions/home";
import { getOverviewData } from "@/app/actions/overview";
import { resolveDateRange } from "@/app/actions/overview-utils";
import { isActive } from "@/lib/types";
import { HomeHeader } from "./_components/HomeHeader";
import { HomeBalanceCard } from "./_components/HomeBalanceCard";
import { HomeSummaryCards } from "./_components/HomeSummaryCards";
import { HomeBudgetProgress } from "./_components/HomeBudgetProgress";
import { HomeTodayCard } from "./_components/HomeTodayCard";
import { HomeRecentTransactions } from "./_components/HomeRecentTransactions";
import { HomeInsightCard } from "./_components/HomeInsightCard";
import { EmergencyRunwayCard } from "./_components/EmergencyRunwayCard";
import { getLocale } from "@/lib/i18n/locale";

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  // Load profile — display name + emergency goal target + pro status
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name, emergency_months, is_active, plan_type, plan_expires_at")
    .eq("id", userId)
    .single();

  const profile = profileData as {
    display_name: string | null;
    emergency_months: number | null;
    is_active: boolean;
    plan_type: string | null;
    plan_expires_at: string | null;
  } | null;

  const displayName =
    profile?.display_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";

  const targetMonths = profile?.emergency_months ?? 6;
  const isPro = profile ? isActive(profile as Parameters<typeof isActive>[0]) : false;

  const locale = await getLocale();

  // Parallel: home data (home metrics) + overview data (runway)
  const [home, overview] = await Promise.all([
    getHomeData(userId, locale),
    getOverviewData(resolveDateRange("3m"), userId, isPro),
  ]);

  return (
    <section className="space-y-3 pb-4">
      <HomeHeader displayName={displayName} monthLabel={home.monthLabel} />

      <HomeBalanceCard remaining={home.remaining} daysRemaining={home.daysRemaining} />

      <HomeSummaryCards
        totalIncome={home.totalIncome}
        totalExpense={home.totalExpense}
        totalSavings={home.totalSavings}
        savingRate={home.savingRate}
      />

      <HomeBudgetProgress budgetUsed={home.budgetUsed} budgetTotal={home.budgetTotal} />

      <HomeTodayCard
        todayExpense={home.todayExpense}
        todayCount={home.todayCount}
        avgDailyExpense={home.avgDailyExpense}
      />

      <HomeRecentTransactions transactions={home.recentTransactions} />

      <EmergencyRunwayCard data={overview.runway} targetMonths={targetMonths} />

      <HomeInsightCard insight={home.insight} />
    </section>
  );
}
