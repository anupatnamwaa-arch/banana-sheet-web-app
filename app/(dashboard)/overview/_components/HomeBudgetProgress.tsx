"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  budgetUsed: number;
  budgetTotal: number;
  categoryCommittedMap?: Record<string, number>;
  isPro?: boolean;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export function HomeBudgetProgress({ budgetUsed, budgetTotal, categoryCommittedMap = {}, isPro = false }: Props) {
  const t = useT();
  if (budgetTotal === 0) return null;

  const pct = Math.min(100, Math.round((budgetUsed / budgetTotal) * 100));
  const remaining = budgetTotal - budgetUsed;
  const isOver = budgetUsed > budgetTotal;
  const isWarn = pct >= 80 && !isOver;

  const barColor = isOver ? "bg-negative" : isWarn ? "bg-amber-400" : "bg-positive";

  let statusMsg: string;
  if (isOver) statusMsg = `${t.overview.budgetOverMsg} ${fmt(Math.abs(remaining))}`;
  else if (isWarn) statusMsg = t.overview.budgetWarnMsg;
  else statusMsg = `${t.overview.budgetLeftMsg} ${fmt(remaining)}`;

  const statusColor = isOver ? "text-amber-500" : isWarn ? "text-amber-500" : "text-positive";

  // Pro Calculations for Fixed committed budgets
  const committedTotal = Object.values(categoryCommittedMap).reduce((a, b) => a + b, 0);
  const committedPct = Math.min(100, Math.round((committedTotal / budgetTotal) * 100));
  const discretionaryBudget = Math.max(0, budgetTotal - committedTotal);

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
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
        {/* Committed / Fixed bar track (Pro only) */}
        {isPro && committedTotal > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-blue-500/25 rounded-full transition-all"
            style={{ width: `${committedPct}%` }}
          />
        )}
        {/* Actual spent bar track */}
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className={`text-xs font-medium ${statusColor}`}>{statusMsg}</p>
        {isPro && committedTotal > 0 && (
          <p className="text-[10px] text-fg-muted">
            {t.fixedCosts.title}: {fmt(committedTotal)} • {t.fixedCosts.survivalRunwayDesc.replace("คำนวณจาก", "").replace("Based on", "")}: {fmt(discretionaryBudget)}
          </p>
        )}
      </div>
    </div>
  );
}
