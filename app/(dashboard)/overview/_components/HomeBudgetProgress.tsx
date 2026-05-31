"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  budgetUsed: number;
  budgetTotal: number;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export function HomeBudgetProgress({ budgetUsed, budgetTotal }: Props) {
  const t = useT();
  if (budgetTotal === 0) return null;

  const pct = Math.min(100, Math.round((budgetUsed / budgetTotal) * 100));
  const remaining = budgetTotal - budgetUsed;
  const isOver = budgetUsed > budgetTotal;
  const isWarn = pct >= 80 && !isOver;

  const barColor = isOver ? "bg-negative" : isWarn ? "bg-amber-400" : "bg-positive";

  let statusMsg: string;
  if (isOver) statusMsg = `${t.overview.budgetOverMsg} ${fmt(Math.abs(remaining))} ⚠️`;
  else if (isWarn) statusMsg = t.overview.budgetWarnMsg;
  else statusMsg = `${t.overview.budgetLeftMsg} ${fmt(remaining)}`;

  const statusColor = isOver ? "text-negative" : isWarn ? "text-amber-400" : "text-positive";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">{t.overview.budgetTitle}</p>
        <p className="text-xs text-fg-muted tabular-nums">{pct}%</p>
      </div>

      <p className="mb-2 text-xs text-fg-muted tabular-nums">
        {t.overview.budgetSpent} {fmt(budgetUsed)} {t.overview.budgetOf} {fmt(budgetTotal)}
      </p>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`mt-2 text-xs font-medium ${statusColor}`}>{statusMsg}</p>
    </div>
  );
}
