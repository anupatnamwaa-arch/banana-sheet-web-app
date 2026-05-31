import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/app/actions/home";
import { HomeHeader } from "./_components/HomeHeader";
import { HomeBalanceCard } from "./_components/HomeBalanceCard";
import { HomeSummaryCards } from "./_components/HomeSummaryCards";
import { HomeBudgetProgress } from "./_components/HomeBudgetProgress";
import { HomeTodayCard } from "./_components/HomeTodayCard";
import { HomeRecentTransactions } from "./_components/HomeRecentTransactions";
import { HomeInsightCard } from "./_components/HomeInsightCard";
import { getLocale } from "@/lib/i18n/locale";

export default async function OverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  // Prefer display_name set by user in Settings over auth metadata.
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  const displayName =
    (profileData as { display_name: string | null } | null)?.display_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";

  const locale = await getLocale();
  const home = await getHomeData(userId, locale);

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

      <HomeInsightCard insight={home.insight} />
    </section>
  );
}
