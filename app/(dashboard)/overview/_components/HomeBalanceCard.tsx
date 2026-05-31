"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  remaining: number;
  daysRemaining: number;
}

function fmt(n: number) {
  return `฿${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function statusText(
  remaining: number,
  daysRemaining: number,
  t: ReturnType<typeof useT>,
): { text: string; color: string } {
  if (remaining < 0) return { text: t.overview.statusOverBudget, color: "text-negative" };
  if (remaining === 0) return { text: t.overview.statusExact, color: "text-amber-400" };
  if (daysRemaining === 0) return { text: t.overview.statusEndOfMonth, color: "text-positive" };
  return { text: t.overview.statusOnTrack, color: "text-positive" };
}

export function HomeBalanceCard({ remaining, daysRemaining }: Props) {
  const dailyAvg = daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;
  const t = useT();
  const { text, color } = statusText(remaining, daysRemaining, t);
  const isNegative = remaining < 0;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5">
      {/* Accent line */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,var(--accent),transparent)" }}
      />

      <p className="text-xs text-fg-muted">{t.overview.balanceTitle}</p>
      <p
        className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${
          isNegative ? "text-negative" : "text-fg"
        }`}
      >
        {isNegative ? "-" : ""}
        {fmt(remaining)}
      </p>

      {daysRemaining > 0 && dailyAvg > 0 && (
        <p className="mt-1 text-xs text-fg-muted">{t.overview.balanceDailyAvg} {fmt(dailyAvg)}</p>
      )}

      <p className={`mt-2 text-xs font-medium ${color}`}>{text}</p>
    </div>
  );
}
