import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { PlanType } from "@/lib/types";

interface Props {
  locale: Locale;
  isPro: boolean;
  planType: PlanType | null;
  expiresAt: string | null;
}

function formatExpiry(expiresAt: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(expiresAt));
}

export function PlanSection({ locale, isPro, planType, expiresAt }: Props) {
  const isEnglish = locale === "en";
  const badge = isPro ? "PRO" : isEnglish ? "FREE" : "ฟรี";
  const title = isPro
    ? isEnglish ? "Banana Sheet Pro" : "Banana Sheet Pro"
    : isEnglish ? "Free plan" : "แผนฟรี";
  const detail = isPro
    ? planType === "lifetime" || !expiresAt
      ? isEnglish ? "Lifetime access" : "ใช้งานได้ตลอดชีพ"
      : `${isEnglish ? "Active until" : "ใช้งานถึง"} ${formatExpiry(expiresAt, locale)}`
    : isEnglish
      ? "Upgrade to unlock every feature"
      : "อัปเกรดเพื่อปลดล็อกทุกฟีเจอร์";

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{isEnglish ? "Plan" : "แผนการใช้งาน"}</p>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent">
              {badge}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{detail}</p>
        </div>
        {!isPro && (
          <Link
            href="/paywall"
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black"
          >
            {isEnglish ? "Upgrade" : "อัปเกรด"}
          </Link>
        )}
      </div>
    </div>
  );
}
