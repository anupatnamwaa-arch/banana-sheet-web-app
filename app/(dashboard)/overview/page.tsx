import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getOverviewData } from "@/app/actions/overview";
import { resolveDateRange } from "@/app/actions/overview-utils";
import type { Period } from "@/app/actions/overview-utils";
import { HomeHeader } from "./_components/HomeHeader";
import { PeriodSelector } from "./_components/PeriodSelector";
import { HeroMetrics } from "./_components/HeroMetrics";
import { EmergencyRunwayCard } from "./_components/EmergencyRunwayCard";
import { DailyPaceCard } from "./_components/DailyPaceCard";

// Next.js 16: searchParams is a Promise
interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { period, from, to } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "คุณ";

  const range = resolveDateRange(period, from, to);
  const currentPeriod = (["year", "3m", "all", "custom"].includes(period ?? "")
    ? period
    : "3m") as Period;

  const data = await getOverviewData(range, user.id, isPro);

  return (
    <section className="space-y-4">
      <HomeHeader
        displayName={displayName}
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
      />

      <PeriodSelector
        current={currentPeriod}
        customFrom={currentPeriod === "custom" ? from : undefined}
        customTo={currentPeriod === "custom" ? to : undefined}
      />

      <HeroMetrics data={data} />

      <EmergencyRunwayCard data={data.runway} />

      <DailyPaceCard data={data.dailyPace} />
    </section>
  );
}
