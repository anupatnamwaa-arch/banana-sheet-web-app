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
    { label: t.overview.income, value: fmt(totalIncome), icon: "↑", bg: "bg-positive/10", text: "text-positive" },
    { label: t.overview.expense, value: fmt(totalExpense), icon: "↓", bg: "bg-negative/10", text: "text-negative" },
    { label: t.overview.savingsAmount, value: fmt(totalSavings), icon: "🏦", bg: "bg-blue-500/10", text: "text-blue-400" },
    {
      label: t.overview.savingRate,
      value: savingRate !== null ? `${savingRate}%` : "—",
      icon: "🎯",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl p-3 ${c.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted">{c.label}</span>
            <span className="text-base">{c.icon}</span>
          </div>
          <p className={`mt-1 text-xl font-bold tabular-nums ${c.text}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
