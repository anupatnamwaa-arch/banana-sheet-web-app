// app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { BudgetList } from "./_components/BudgetList";
import { ApiKeySection } from "./_components/ApiKeySection";
import { ShortcutGuide } from "./_components/ShortcutGuide";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at, api_key")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_expires_at" | "api_key"
  > | null;
  const isPro = profile ? isActive(profile) : false;
  const apiKey = profile?.api_key ?? null;

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
      <BudgetList userId={user.id} isPro={isPro} />

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
