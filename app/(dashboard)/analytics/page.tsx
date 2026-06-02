// app/(dashboard)/analytics/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAnalyticsData } from "@/app/actions/analytics";
import { normalizePeriod } from "@/app/actions/analytics-utils";
import { RoastInsightSection } from "./_components/RoastInsightSection";
import { PeriodPills } from "./_components/PeriodPills";
import { AnalyticsView } from "./_components/AnalyticsView";
import { AnalyticsEmptyState } from "./_components/AnalyticsEmptyState";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import {
  getDevAuthBypassDataClient,
  getDevAuthBypassUserId,
} from "@/lib/dev-auth-bypass";

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
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? await getDevAuthBypassUserId();
  const dataSupabase = await getDevAuthBypassDataClient();

  const { data: profileData } = await dataSupabase
    .from("profiles")
    .select("savings_target_pct")
    .eq("id", userId)
    .single();
  const savingsTarget =
    (profileData as { savings_target_pct: number } | null)?.savings_target_pct ?? 20;

  const [analytics, { data: latestRoast }] = await Promise.all([
    getAnalyticsData(userId, period, savingsTarget, range, locale),
    dataSupabase
      .from("ai_roasts")
      .select("id, roast, summary, persona_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <section className="pb-4 space-y-4">
      <header className="pt-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.analytics.title}</h1>
        <p className="mt-0.5 text-sm text-fg-muted">{t.analytics.subtitle}</p>
      </header>

      <Suspense fallback={<div className="h-8" />}>
        <PeriodPills current={period} selectedRange={range ?? null} />
      </Suspense>

      {!analytics.hasData ? (
        <AnalyticsEmptyState />
      ) : (
        <>
          <AnalyticsView analytics={analytics} savingsTarget={savingsTarget} />
          <RoastInsightSection latestRoast={latestRoast} />
        </>
      )}
    </section>
  );
}
