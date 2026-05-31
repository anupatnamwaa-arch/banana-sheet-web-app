"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  todayExpense: number;
  todayCount: number;
  avgDailyExpense: number;
}

function fmt(n: number) {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

export function HomeTodayCard({ todayExpense, todayCount, avgDailyExpense }: Props) {
  const t = useT();
  const diff = todayExpense - avgDailyExpense;
  const absDiff = Math.abs(Math.round(diff));
  const compText =
    avgDailyExpense > 0
      ? diff <= 0
        ? `${t.overview.todayBelowAvg} ${fmt(absDiff)}`
        : `${t.overview.todayAboveAvg} ${fmt(absDiff)}`
      : null;
  const compColor = diff <= 0 ? "text-positive" : "text-negative";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{t.overview.todaySpent}</p>
        <span className="text-lg">📅</span>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums text-negative">{fmt(todayExpense)}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{todayCount} {t.common.transactions}</p>
      {compText && <p className={`mt-1 text-xs font-medium ${compColor}`}>{compText}</p>}
    </div>
  );
}
