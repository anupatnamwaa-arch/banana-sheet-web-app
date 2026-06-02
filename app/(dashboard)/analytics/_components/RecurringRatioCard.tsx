"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { formatTHB } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  totalRecurringExpense: number;
  totalSubscriptionExpense: number;
  totalIncome: number;
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        className="ml-1 text-fg-muted opacity-50 hover:opacity-100 transition-opacity"
      >
        <Info size={12} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-60 -translate-x-1/2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function RecurringRatioCard({ totalRecurringExpense, totalSubscriptionExpense, totalIncome }: Props) {
  const t = useT();

  if (totalRecurringExpense === 0) return null;

  const ratio = totalIncome > 0 ? Math.round((totalRecurringExpense / totalIncome) * 100) : null;
  const freeAmount = totalIncome > 0 ? totalIncome - totalRecurringExpense : null;

  const barColor =
    ratio === null ? "bg-fg-muted"
    : ratio >= 60 ? "bg-negative"
    : ratio >= 40 ? "bg-amber-500"
    : "bg-positive";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center gap-1 mb-4">
        <p className="text-sm font-semibold">{t.analytics.recurringRatioTitle}</p>
        <InfoTip text={t.analytics.recurringRatioTooltip ?? ""} />
      </div>

      {/* Main figure */}
      <div className="flex items-end gap-3">
        <div>
          <p className="text-3xl font-bold tabular-nums text-fg">
            {ratio !== null ? `${ratio}%` : "—"}
          </p>
          <p className="text-xs text-fg-muted mt-0.5">{t.analytics.recurringRatioOfIncome}</p>
        </div>
        <div className="mb-1 text-right">
          <p className="text-sm font-semibold tabular-nums text-fg">{formatTHB(totalRecurringExpense)}</p>
          <p className="text-[10px] text-fg-muted">{t.analytics.recurringBreakdownTitle ?? "รายจ่ายประจำ"}</p>
        </div>
      </div>

      {/* Progress bar */}
      {ratio !== null && (
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, ratio)}%` }}
            />
          </div>
          {freeAmount !== null && freeAmount > 0 && (
            <p className="mt-1.5 text-[11px] text-fg-muted">
              {t.analytics.recurringRatioFree}: <span className="font-semibold text-positive">{formatTHB(freeAmount)}</span>
            </p>
          )}
        </div>
      )}
      {totalSubscriptionExpense > 0 && (
        <p className="mt-2 text-[11px] text-fg-muted">
          {t.analytics.subscriptionLabel}: <span className="font-semibold text-fg">{formatTHB(totalSubscriptionExpense)}</span>
        </p>
      )}
    </div>
  );
}
