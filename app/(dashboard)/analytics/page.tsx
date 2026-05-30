// app/(dashboard)/analytics/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getAnalyticsData } from "@/app/actions/analytics";
import { MonthlyVelocityChart } from "./_components/MonthlyVelocityChart";
import { CategoryBreakdownChart } from "./_components/CategoryBreakdownChart";
import { TransactionList } from "./_components/TransactionList";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

  const analytics = await getAnalyticsData(user.id, isPro);

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">วิเคราะห์</h1>
      </header>

      <MonthlyVelocityChart data={analytics.monthlyPoints} />

      <CategoryBreakdownChart data={analytics.categorySpend} />

      <TransactionList userId={user.id} />
    </section>
  );
}
