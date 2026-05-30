import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { NetWorthCard } from "./_components/NetWorthCard";
import { WealthList } from "./_components/WealthList";

export default async function WealthPage() {
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

  // Free user: blurred placeholder with one Pro CTA
  if (!isPro) {
    return (
      <section className="space-y-4">
        <header className="pt-2">
          <h1 className="text-2xl font-semibold tracking-tight">ความมั่งคั่ง</h1>
        </header>
        <div className="relative">
          <div className="pointer-events-none select-none blur-sm space-y-4">
            <NetWorthCard data={null} />
            <div className="glass p-5">
              <p className="mb-3 text-xs font-medium text-fg-muted">สินทรัพย์</p>
              <div className="space-y-2">
                <div className="flex justify-between rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                  <span>บัญชีออมทรัพย์</span><span>฿120,000</span>
                </div>
                <div className="flex justify-between rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                  <span>กองทุนรวม</span><span>฿80,000</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm bg-black/30">
            <Lock size={24} className="text-fg-muted" />
            <Link href="/paywall" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black">
              🔒 ปลดล็อกด้วย Pro
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Pro: real data
  const { data: wealthData } = await supabase
    .from("wealth_debt")
    .select("type, value")
    .eq("user_id", user.id);

  const rows = (wealthData ?? []) as Array<{ type: string; value: number }>;
  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const r of rows) {
    if (r.type === "asset") totalAssets += r.value;
    else totalLiabilities += r.value;
  }
  const netWorth = totalAssets - totalLiabilities;

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ความมั่งคั่ง</h1>
      </header>
      <NetWorthCard data={{ netWorth, totalAssets, totalLiabilities }} />
      <WealthList userId={user.id} />
    </section>
  );
}
