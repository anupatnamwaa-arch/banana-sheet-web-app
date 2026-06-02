"use client";

import Link from "next/link";
import { CategoryIcon } from "@/app/(dashboard)/analytics/_components/category-icon";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";
import type { RecentTransaction } from "@/app/actions/home";
import { matchBrand, getBrandLogoUrl, BrandLogoImage } from "@/app/(dashboard)/analytics/_components/brand-logo";

interface Props {
  transactions: RecentTransaction[];
}

function fmtDate(iso: string, locale: "th" | "en", today: string): string {
  const d = new Date(iso);
  const now = new Date();
  const intlLocale = locale === "en" ? "en-US" : "th-TH";
  const todayStr = now.toLocaleDateString(intlLocale, { timeZone: "Asia/Bangkok" });
  const txStr = d.toLocaleDateString(intlLocale, { timeZone: "Asia/Bangkok" });
  if (todayStr === txStr) {
    return `${today} ${d.toLocaleTimeString(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    })}`;
  }
  return d.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

export function HomeRecentTransactions({ transactions }: Props) {
  const dict = useT();
  const locale = useLocale();
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 animate-fade-in">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{dict.overview.recentTransactions}</p>
        <Link href="/transactions" className="text-xs text-accent">
          {dict.overview.viewAll}
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((t) => {
          const isIncome = t.type === "income";
          const isSavings = t.type === "savings";
          const amtColor = isIncome
            ? "text-positive"
            : isSavings
              ? "text-blue-400"
              : "text-negative";
          const sign = isIncome || isSavings ? "+" : "-";
          const typeLabel = t.type === "income" ? dict.overview.typeIncome : t.type === "expense" ? dict.overview.typeExpense : dict.overview.typeSavings;
          const subLabel = t.category ?? typeLabel;

          const brand = matchBrand(t.note);
          const defaultTint = isIncome ? "var(--positive)" : isSavings ? "#38bdf8" : "var(--negative)";
          const tint = brand ? brand.color : (t.categoryColor || defaultTint);

          return (
            <div key={t.id} className="flex items-center gap-3">
              {brand ? (
                <BrandLogoImage
                  logoUrl={getBrandLogoUrl(brand.storagePath)}
                  size={36}
                  fallback={
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                      style={{
                        background: `color-mix(in srgb, ${tint} 18%, transparent)`,
                        color: tint,
                      }}
                    >
                      <brand.icon size={18} />
                    </div>
                  }
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                  style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)` }}
                >
                  <CategoryIcon
                    name={t.category ?? typeLabel}
                    emoji={t.categoryIcon}
                    size={18}
                    className="text-fg"
                    style={{ color: t.categoryColor || undefined }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t.note ?? t.category ?? typeLabel}
                </p>
                <p className="text-xs text-fg-muted">
                  {subLabel ? `${subLabel} • ` : ""}
                  {fmtDate(t.date, locale, dict.overview.dateToday)}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${amtColor}`}>
                {sign}฿{t.amount.toLocaleString("th-TH")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
