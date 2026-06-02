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
import { WalletSection } from "./_components/WalletSection";
import { FixedCostSection } from "./_components/FixedCostSection";
import { BillingCycleSection }  from "./_components/BillingCycleSection";
import { EmergencyGoalSection } from "./_components/EmergencyGoalSection";
import { BalanceMethodSection } from "./_components/BalanceMethodSection";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import { getDevAuthBypassUserId } from "@/lib/dev-auth-bypass";

export default async function SettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const cs = t.common.comingSoon;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? await getDevAuthBypassUserId();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_type, plan_expires_at, api_key, savings_target_pct, display_name, avatar_url, cycle_start_day, emergency_months, balance_method, carryover_enabled")
    .eq("id", userId)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_type" | "plan_expires_at" | "api_key" | "savings_target_pct" | "display_name" | "avatar_url"
  > | null;

  const savingsTarget = profile?.savings_target_pct ?? 20;
  const cycleStartDay   = (profile as { cycle_start_day?: number   } | null)?.cycle_start_day   ?? 1;
  const emergencyMonths = (profile as { emergency_months?: number   } | null)?.emergency_months  ?? 6;
  const balanceMethod      = ((profile as { balance_method?: string    } | null)?.balance_method    ?? "net") as "net" | "gross" | "budget";
  const carryoverEnabled   = ((profile as { carryover_enabled?: boolean } | null)?.carryover_enabled ?? false);
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
        <BillingCycleSection initialDay={cycleStartDay} />

        <SettingsRow
          icon="💰"
          label={t.settings.monthlyBudget}
          sublabel={t.settings.monthlyBudgetSub}
          href="#category-budgets"
        />

        <FixedCostSection userId={userId} />

        <div className="px-1">
          <EmergencyGoalSection initialMonths={emergencyMonths} />
        </div>

        {/* Savings target — functional */}
        <div className="px-1">
          <SavingsTargetSection initialTarget={savingsTarget} />
        </div>

        <BalanceMethodSection initialMethod={balanceMethod} initialCarryover={carryoverEnabled} />
      </SettingsSection>

      {/* ── 3. หมวดหมู่และงบ ──────────────────────────────────────────────── */}
      <div id="category-budgets" className="scroll-mt-4">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          {t.settings.sectionCategories}
        </p>
        <BudgetList userId={userId} isPro={isPro} />
        <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
          <WalletSection userId={userId} />
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
        <SettingsRow icon="☁️" label={t.settings.backup} comingSoon comingSoonLabel={cs} />
      </SettingsSection>

      {/* ── 7. ความปลอดภัย ───────────────────────────────────────────────── */}
      <SettingsSection title={t.settings.sectionSecurity}>
        <SettingsRow icon="🔒" label={t.settings.lockApp} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="🫆" label="Face ID / Touch ID" comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="📄" label={t.settings.privacyPolicy} comingSoon comingSoonLabel={cs} />
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

        <SettingsRow icon="❓" label={t.settings.faq} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="💬" label={t.settings.feedback} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="📧" label={t.settings.contact} comingSoon comingSoonLabel={cs} />
        <SettingsRow icon="🍌" label={t.settings.about} comingSoon comingSoonLabel={cs} />
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
