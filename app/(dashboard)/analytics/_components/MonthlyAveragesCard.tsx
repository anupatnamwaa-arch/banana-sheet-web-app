"use client";

import { formatTHB } from "@/lib/format";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  income: number;
  expense: number;
  savings: number;
  savingRate: number | null;
  monthCount: number;
  currentPeriodSavingRate: number | null;
}

export function MonthlyAveragesCard({
  income,
  expense,
  savings,
  savingRate,
  monthCount,
  currentPeriodSavingRate,
}: Props) {
  const t = useT();

  if (income === 0 && expense === 0) return null;

  const basis = (t.analytics.monthlyAvgBasis ?? "คำนวณจาก {n} เดือน").replace("{n}", String(monthCount));

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="text-sm font-semibold">{t.analytics.monthlyAvgTitle}</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Chip label={t.analytics.monthlyAvgIncome}  value={formatTHB(income)}  color="text-positive" />
        <Chip label={t.analytics.monthlyAvgExpense} value={formatTHB(expense)} color="text-negative" />
        <Chip label={t.analytics.monthlyAvgSavings} value={formatTHB(savings)} color="text-blue-500" />
      </div>

      {/* Saving rates row */}
      <div className="mt-3 flex items-center gap-4 border-t border-[var(--glass-border)] pt-3">
        {savingRate !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              {t.analytics.monthlyAvgSavingRate}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-blue-500">{savingRate}%</p>
          </div>
        )}
        {currentPeriodSavingRate !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              {t.analytics.savingRateTitle ?? "อัตราออมช่วงนี้"}
            </p>
            <p className={`mt-0.5 text-sm font-bold tabular-nums ${
              currentPeriodSavingRate >= (savingRate ?? 0) ? "text-positive" : "text-amber-500"
            }`}>
              {currentPeriodSavingRate}%
            </p>
          </div>
        )}
      </div>

      <p className="mt-2 text-[10px] text-fg-muted">{basis}</p>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[var(--radius-inner)] bg-[var(--glass-bg)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted truncate">{label}</p>
      <p className={`mt-1 text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
