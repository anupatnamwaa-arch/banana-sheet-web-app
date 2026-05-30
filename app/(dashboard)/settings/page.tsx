// app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { BudgetList } from "./_components/BudgetList";
import { ApiKeySection } from "./_components/ApiKeySection";
import { ShortcutGuide } from "./_components/ShortcutGuide";
import { SavingsTargetSection } from "./_components/SavingsTargetSection";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // if (!user) redirect("/login");
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at, api_key, savings_target_pct")
    .eq("id", userId)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_expires_at" | "api_key" | "savings_target_pct"
  > | null;
  const isPro = true; // DEMO: unlock Pro
  const apiKey = profile?.api_key ?? null;
  const savingsTarget = profile?.savings_target_pct ?? 20;

  return (
    <section className="space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>
      </header>

      {/* Data portability */}
      <div className="glass p-5 space-y-3">
        <p className="text-sm font-medium text-fg-muted">ข้อมูล</p>
        <CsvExportButton />
        <CsvImportDrawer />
      </div>

      {/* Budgets */}
      <BudgetList userId={userId} isPro={isPro} />

      {/* Savings target */}
      <SavingsTargetSection initialTarget={savingsTarget} />

      {/* API Key + Shortcut guide */}
      <ApiKeySection initialKey={apiKey} />
      <ShortcutGuide />

      {/* Placeholder */}
      <div className="glass p-5 text-sm text-fg-muted">
        แผนการใช้งาน — TODO (Task: Paywall)
      </div>
    </section>
  );
}
