"use client";

import { formatTHB } from "@/lib/format";
import { format } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  savingRate: number | null;
  totalSavings: number;
  totalIncome: number;
  target: number;
}

export function SavingsRate({ savingRate, totalSavings, totalIncome, target }: Props) {
  const t = useT();
  if (totalIncome === 0) return null;

  const rate = savingRate ?? 0;
  const pctOfTarget = target > 0 ? Math.min(100, Math.round((rate / target) * 100)) : 100;
  const reached = rate >= target;
  const gap = target - rate;

  let statusMsg: string;
  if (reached) statusMsg = t.analytics.savingRateReached;
  else if (gap <= 3) statusMsg = format(t.analytics.savingRateNearTemplate, { gap });
  else statusMsg = format(t.analytics.savingRateFarTemplate, { gap });

  const barColor = reached ? "bg-positive" : gap <= 3 ? "bg-amber-400" : "bg-blue-400";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-end justify-between">
        <p className="text-sm font-semibold">{t.analytics.savingRateTitle}</p>
        <p className="text-xs text-fg-muted">{t.analytics.savingRateTarget} {target}%</p>
      </div>

      <p className="mt-1 text-3xl font-bold tabular-nums text-blue-400">{rate}%</p>
      <p className="mt-0.5 text-xs text-fg-muted">
        {format(t.analytics.savingRateSavedTemplate, { amount: formatTHB(totalSavings), income: formatTHB(totalIncome) })}
      </p>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pctOfTarget}%` }}
        />
      </div>

      <p className={`mt-2 text-xs font-medium ${reached ? "text-positive" : "text-fg-muted"}`}>
        {statusMsg}
      </p>
    </div>
  );
}
