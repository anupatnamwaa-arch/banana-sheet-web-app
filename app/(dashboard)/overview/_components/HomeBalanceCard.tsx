"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  remaining: number;
  daysRemaining: number;
  upcomingFixedCostsTotal?: number;
  isPro?: boolean;
}

function fmt(n: number) {
  return `฿${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function statusText(
  remaining: number,
  daysRemaining: number,
  t: ReturnType<typeof useT>,
): { text: string; color: string } {
  if (remaining < 0) return { text: t.overview.statusOverBudget, color: "text-amber-500" };
  if (remaining === 0) return { text: t.overview.statusExact, color: "text-amber-400" };
  if (daysRemaining === 0) return { text: t.overview.statusEndOfMonth, color: "text-positive" };
  return { text: t.overview.statusOnTrack, color: "text-positive" };
}

export function HomeBalanceCard({ remaining, daysRemaining, upcomingFixedCostsTotal = 0, isPro = false }: Props) {
  const dailyAvg = daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;
  const t = useT();
  const { text, color } = statusText(remaining, daysRemaining, t);
  const isNegative = remaining < 0;

  // Pro Spendable Calculations
  const freeSpendable = remaining - upcomingFixedCostsTotal;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-hero)] p-5">
      {/* Accent line */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,var(--accent),transparent)" }}
      />

      <p className="text-xs text-fg-muted">{t.overview.balanceTitle}</p>
      <p
        className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${
          isNegative ? "text-amber-500" : "text-fg"
        }`}
      >
        {isNegative ? "-" : ""}
        {fmt(remaining)}
      </p>

      {/* Pro Spendable alert block */}
      {isPro && upcomingFixedCostsTotal > 0 && (
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 px-3.5 py-2.5 text-xs text-blue-300">
          <span className="text-base mt-0.5">🔄</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-blue-200 truncate">
              {fmt(freeSpendable)} {localeLabel(t, freeSpendable)}
            </p>
            <p className="text-[10px] text-blue-400 mt-0.5 leading-relaxed">
              {t.fixedCosts.spendableTooltip}
            </p>
          </div>
        </div>
      )}

      <p className={`mt-3 text-xs font-medium ${color}`}>{text}</p>
    </div>
  );
}

function localeLabel(t: ReturnType<typeof useT>, amt: number): string {
  return amt >= 0 ? t.fixedCosts.activeLabel : t.fixedCosts.endedLabel;
}
