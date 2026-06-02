"use client";

import { formatTHB } from "@/lib/format";
import type { MetricSummary } from "@/app/actions/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  metrics: MetricSummary;
}

function momChange(current: number, prev: number): { pct: number; dir: "up" | "down" | "flat" } | null {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (Math.abs(pct) <= 2) return { pct: 0, dir: "flat" };
  return { pct: Math.abs(pct), dir: current > prev ? "up" : "down" };
}

export function AnalyticsHeroPulse({ metrics }: Props) {
  const t = useT();

  const expenseChange = momChange(metrics.totalExpense, metrics.prevExpense);
  const incomeChange  = momChange(metrics.totalIncome,  metrics.prevIncome);

  // Verdict sentence: lead with saving rate if available, else expense trend
  let verdict = "";
  if (metrics.savingRate !== null && metrics.totalIncome > 0) {
    if (metrics.savingRate >= 20) {
      verdict = `ออมได้ ${metrics.savingRate}% ดีมาก`;
    } else if (metrics.savingRate > 0) {
      verdict = `ออมได้ ${metrics.savingRate}% — ลองเพิ่มอีกนิดนะ`;
    } else {
      verdict = "ยังไม่ได้ออมเดือนนี้";
    }
  } else if (expenseChange) {
    if (expenseChange.dir === "down") {
      verdict = `ใช้จ่ายน้อยลง ${expenseChange.pct}% จากช่วงก่อน`;
    } else if (expenseChange.dir === "up") {
      verdict = `ใช้จ่ายเพิ่มขึ้น ${expenseChange.pct}% จากช่วงก่อน`;
    } else {
      verdict = "ใช้จ่ายใกล้เคียงช่วงก่อน";
    }
  } else {
    verdict = "เริ่มบันทึกเพื่อดูภาพรวม";
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-hero)] p-5">
      {/* Verdict */}
      <p className="text-base font-semibold leading-snug text-fg">{verdict}</p>

      {/* Income + Expense chips */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatChip
          label={t.analytics.totalIncome}
          value={formatTHB(metrics.totalIncome)}
          change={incomeChange}
          valueColor="text-positive"
          upGood
        />
        <StatChip
          label={t.analytics.totalExpense}
          value={formatTHB(metrics.totalExpense)}
          change={expenseChange}
          valueColor="text-negative"
          upGood={false}
        />
      </div>

      {/* Saving rate + avg/day inline row */}
      <div className="mt-3 flex items-center gap-4 border-t border-[var(--glass-border)] pt-3">
        {metrics.savingRate !== null && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{t.analytics.savingRateTitle}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-blue-500">{metrics.savingRate}%</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{t.analytics.avgPerDay}</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums text-fg">{formatTHB(Math.round(metrics.avgPerDay))}</p>
        </div>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  change,
  valueColor,
  upGood,
}: {
  label: string;
  value: string;
  change: { pct: number; dir: "up" | "down" | "flat" } | null;
  valueColor: string;
  upGood: boolean;
}) {
  const changeColor =
    !change || change.dir === "flat"
      ? "text-fg-muted"
      : change.dir === "up"
      ? upGood ? "text-positive" : "text-amber-500"
      : upGood ? "text-amber-500" : "text-positive";

  const changeLabel =
    !change
      ? null
      : change.dir === "flat"
      ? "ใกล้เคียงเดิม"
      : `${change.dir === "up" ? "▲" : "▼"} ${change.pct}%`;

  return (
    <div className="rounded-[var(--radius-inner)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${valueColor}`}>{value}</p>
      {changeLabel && (
        <p className={`mt-0.5 text-[10px] font-medium ${changeColor}`}>{changeLabel}</p>
      )}
    </div>
  );
}
