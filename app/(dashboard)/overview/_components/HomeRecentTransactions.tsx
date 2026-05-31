"use client";

import Link from "next/link";
import type { RecentTransaction } from "@/app/actions/home";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  transactions: RecentTransaction[];
}

const TYPE_ICONS: Record<string, string> = {
  income: "💰",
  expense: "🧾",
  savings: "🏦",
};

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
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
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

          return (
            <div key={t.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-base">
                {TYPE_ICONS[t.type]}
              </div>
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
