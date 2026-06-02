"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingRate: number | null;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export function HomeSummaryCards({
  totalIncome,
  totalExpense,
  totalSavings,
  savingRate,
}: Props) {
  const t = useT();
  const cards = [
    { label: t.overview.income, value: fmt(totalIncome), text: "text-positive" },
    { label: t.overview.expense, value: fmt(totalExpense), text: "text-negative" },
    { label: t.overview.savingsAmount, value: fmt(totalSavings), text: "text-blue-500" },
    {
      label: t.overview.savingRate,
      value: savingRate !== null ? `${savingRate}%` : "—",
      text: "text-purple-500",
    },
  ];

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] divide-y divide-[var(--glass-border)]">
      <div className="grid grid-cols-2 divide-x divide-[var(--glass-border)]">
        {cards.slice(0, 2).map((c) => (
          <div key={c.label} className="px-4 py-3">
            <p className="text-xs text-fg-muted">{c.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${c.text}`}>{c.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--glass-border)]">
        {cards.slice(2).map((c) => (
          <div key={c.label} className="px-4 py-3">
            <p className="text-xs text-fg-muted">{c.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${c.text}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
