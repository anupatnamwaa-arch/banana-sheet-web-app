import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { isActive, type Profile } from "@/lib/types";

import { SettingsSection } from "./_components/SettingsSection";
import { SettingsRow } from "./_components/SettingsRow";
import { AppearanceSection } from "./_components/AppearanceSection";
import { NotificationSection } from "./_components/NotificationSection";
import { DangerZone } from "./_components/DangerZone";
import { SavingsTargetSection } from "./_components/SavingsTargetSection";
import { BudgetList } from "./_components/BudgetList";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { ApiKeySection } from "./_components/ApiKeySection";
import { ShortcutGuide } from "./_components/ShortcutGuide";
import { ProfileHeader } from "./_components/ProfileHeader";
import { LanguageSection } from "./_components/LanguageSection";
import { PlanSection } from "./_components/PlanSection";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";

export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_type, plan_expires_at, api_key, savings_target_pct, display_name, avatar_url")
    .eq("id", userId)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_type" | "plan_expires_at" | "api_key" | "savings_target_pct" | "display_name" | "avatar_url"
  > | null;

  const savingsTarget = profile?.savings_target_pct ?? 20;
  const apiKey = profile?.api_key ?? null;
  const isPro = profile ? isActive(profile) : false;
  const planLabel = isPro ? "Banana Sheet Pro" : t.settings.freePlan;

  // display_name (set by user) takes priority over auth metadata
  const displayName =
    profile?.display_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";
  const avatarUrl = profile?.avatar_url ?? null;
  const email = user?.email ?? "demo@example.com";

  return (
    <section className="space-y-5 pb-10">
      {/* Back button + title */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/overview"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)]"
          aria-label={t.common.back}
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t.settings.title}</h1>
          <p className="text-xs text-fg-muted">{t.settings.subtitle}</p>
        </div>
      </div>

      {/* ── Profile header (tap to edit) ────────────────────────────────── */}
      <ProfileHeader
        userId={userId}
        initialName={displayName}
        initialAvatarUrl={avatarUrl}
        email={email}
        planLabel={planLabel}
      />

      {/* ── 1. บัญชี ─────────────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionAccount}>
        <LanguageSection />
        <PlanSection
          locale={locale}
          isPro={isPro}
          planType={profile?.plan_type ?? null}
          expiresAt={profile?.plan_expires_at ?? null}
        />
      </SettingsSection>

      {/* ── 2. การเงิน ───────────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionFinance}>
        <SettingsRow icon="📅" label={t.settings.billingCycle} value={t.settings.billingCycleValue} comingSoon />
        <SettingsRow
          icon="💰"
          label={t.settings.monthlyBudget}
          sublabel={t.settings.monthlyBudgetSub}
          href="#category-budgets"
        />

        {/* Savings target — functional */}
        <div className="px-1">
          <SavingsTargetSection initialTarget={savingsTarget} />
        </div>

        <SettingsRow
          icon="🛡️"
          label={t.settings.emergencyGoal}
          sublabel={t.settings.emergencyGoalSub}
          value={t.settings.emergencyGoalValue}
        />
        <SettingsRow
          icon="⚖️"
          label={t.settings.balanceMethod}
          sublabel={t.settings.balanceMethodSub}
          value={t.settings.balanceMethodValue}
        />
      </SettingsSection>

      {/* ── 3. หมวดหมู่และงบ ──────────────────────────────────────────────── */}
      <div id="category-budgets" className="scroll-mt-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t.settings.sectionCategories}
        </p>
        <BudgetList userId={userId} isPro={isPro} />
        <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
          <SettingsRow icon="👛" label={t.settings.wallets} comingSoon />
        </div>
      </div>

      {/* ── 4. หน้าตาแอป ──────────────────────────────────────────────────── */}
      <AppearanceSection />

      {/* ── 5. การแจ้งเตือน ───────────────────────────────────────────────── */}
      <NotificationSection />

      {/* ── 6. ข้อมูล ────────────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionData}>
        <div className="px-4 py-2">
          <CsvExportButton />
        </div>
        <div className="px-4 py-2">
          <CsvImportDrawer />
        </div>
        <SettingsRow icon="☁️" label={t.settings.backup} comingSoon />
      </SettingsSection>

      {/* ── 7. ความปลอดภัย ───────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionSecurity}>
        <SettingsRow icon="🔒" label={t.settings.lockApp} comingSoon />
        <SettingsRow icon="🫆" label="Face ID / Touch ID" comingSoon />
        <SettingsRow icon="📄" label={t.settings.privacyPolicy} comingSoon />
      </SettingsSection>

      {/* ── 8. ช่วยเหลือ ──────────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionHelp}>
        {/* Manual guide download */}
        <a
          href="/guide.pdf"
          download
          className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--glass-bg)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
            📥
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.settings.downloadGuide}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{t.settings.downloadGuideDesc}</p>
          </div>
          <span className="text-xs text-fg-muted">PDF</span>
        </a>

        <SettingsRow icon="❓" label={t.settings.faq} comingSoon />
        <SettingsRow icon="💬" label={t.settings.feedback} comingSoon />
        <SettingsRow icon="📧" label={t.settings.contact} comingSoon />
        <SettingsRow icon="🍌" label={t.settings.about} comingSoon />
        <SettingsRow icon="🏷️" label={t.settings.version} value="1.0.0" />
      </SettingsSection>

      {/* iOS Shortcut guide — expandable */}
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
        <ShortcutGuide />
      </div>

      {/* ── API Key (for Shortcut / developer) ───────────────────────────── */}
      <SettingsSection title={t.settings.sectionDeveloper}>
        <div className="px-1">
          <ApiKeySection initialKey={apiKey} />
        </div>
      </SettingsSection>

      {/* ── 9. โซนอันตราย ────────────────────────────────────────────────── */}
      <DangerZone />
    </section>
  );
}
