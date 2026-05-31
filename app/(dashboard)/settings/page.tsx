import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Profile } from "@/lib/types";

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

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const savingsTarget = profile?.savings_target_pct ?? 20;
  const apiKey = profile?.api_key ?? null;
  const isPro = true; // DEMO

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";
  const email = user?.email ?? "demo@example.com";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <section className="space-y-5 pb-10">
      {/* Back button + title */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/overview"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)]"
          aria-label="กลับ"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">ตั้งค่า</h1>
          <p className="text-xs text-fg-muted">จัดการข้อมูลส่วนตัวและการตั้งค่าแอป</p>
        </div>
      </div>

      {/* ── Profile header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-bold text-black">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{displayName}</p>
          <p className="truncate text-sm text-fg-muted">{email}</p>
          <span className="mt-1 inline-block rounded-full bg-[var(--glass-bg)] px-2.5 py-0.5 text-xs font-medium text-fg-muted">
            แผนฟรี
          </span>
        </div>
      </div>

      {/* ── 1. บัญชี ─────────────────────────────────────────────────────── */}
      <SettingsSection title="บัญชี">
        <SettingsRow icon="👤" label="แก้ไขโปรไฟล์" comingSoon />
        <SettingsRow icon="🌏" label="ภาษาและสกุลเงิน" value="ไทย / THB" comingSoon />
        <SettingsRow icon="⭐" label="แผนการใช้งาน" badge="ฟรี" comingSoon />
      </SettingsSection>

      {/* ── 2. การเงิน ───────────────────────────────────────────────────── */}
      <SettingsSection title="ตั้งค่าการเงิน">
        <SettingsRow icon="📅" label="วันเริ่มรอบเดือน" value="วันที่ 1" comingSoon />
        <SettingsRow icon="💰" label="งบใช้จ่ายรายเดือน" sublabel="ตั้งงบแยกตามหมวด" comingSoon />

        {/* Savings target — functional */}
        <div className="px-1">
          <SavingsTargetSection initialTarget={savingsTarget} />
        </div>

        <SettingsRow icon="🛡️" label="เป้าหมายเงินสำรองฉุกเฉิน" comingSoon />
        <SettingsRow icon="⚖️" label="วิธีคำนวณเงินคงเหลือ" comingSoon />
      </SettingsSection>

      {/* ── 3. หมวดหมู่และงบ ──────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          หมวดหมู่และงบ
        </p>
        <BudgetList userId={userId} isPro={isPro} />
        <div className="mt-2 overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
          <SettingsRow icon="👛" label="บัญชีและกระเป๋าเงิน" comingSoon />
        </div>
      </div>

      {/* ── 4. หน้าตาแอป ──────────────────────────────────────────────────── */}
      <AppearanceSection />

      {/* ── 5. การแจ้งเตือน ───────────────────────────────────────────────── */}
      <NotificationSection />

      {/* ── 6. ข้อมูล ────────────────────────────────────────────────────── */}
      <SettingsSection title="ข้อมูล">
        <div className="px-4 py-2">
          <CsvExportButton />
        </div>
        <div className="px-4 py-2">
          <CsvImportDrawer />
        </div>
        <SettingsRow icon="☁️" label="สำรองข้อมูล" comingSoon />
      </SettingsSection>

      {/* ── 7. ความปลอดภัย ───────────────────────────────────────────────── */}
      <SettingsSection title="ความปลอดภัยและความเป็นส่วนตัว">
        <SettingsRow icon="🔒" label="ล็อกแอป" comingSoon />
        <SettingsRow icon="🫆" label="Face ID / Touch ID" comingSoon />
        <SettingsRow icon="📄" label="นโยบายความเป็นส่วนตัว" comingSoon />
      </SettingsSection>

      {/* ── 8. ช่วยเหลือ ──────────────────────────────────────────────────── */}
      <SettingsSection title="ช่วยเหลือ">
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
            <p className="text-sm font-medium">ดาวน์โหลดคู่มือใช้งาน</p>
            <p className="mt-0.5 text-xs text-fg-muted">PDF — วิธีตั้งค่าและใช้งานครบทุกฟีเจอร์</p>
          </div>
          <span className="text-xs text-fg-muted">PDF</span>
        </a>

        <SettingsRow icon="❓" label="คำถามที่พบบ่อย" comingSoon />
        <SettingsRow icon="💬" label="ส่งความคิดเห็น" comingSoon />
        <SettingsRow icon="📧" label="ติดต่อเรา" comingSoon />
        <SettingsRow icon="🍌" label="เกี่ยวกับแอป" comingSoon />
        <SettingsRow icon="🏷️" label="เวอร์ชัน" value="1.0.0" />
      </SettingsSection>

      {/* iOS Shortcut guide — expandable */}
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
        <ShortcutGuide />
      </div>

      {/* ── API Key (for Shortcut / developer) ───────────────────────────── */}
      <SettingsSection title="นักพัฒนา">
        <div className="px-1">
          <ApiKeySection initialKey={apiKey} />
        </div>
      </SettingsSection>

      {/* ── 9. โซนอันตราย ────────────────────────────────────────────────── */}
      <DangerZone />
    </section>
  );
}
