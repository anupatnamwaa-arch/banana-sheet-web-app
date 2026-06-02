"use client";

import React, { useState } from "react";
import type { DailyBriefState, MoneyScoreFactor } from "@/lib/nana/types";
import { NanaGuide, type NanaGuidePose } from "./NanaGuide";
import { NanaCompactSummary } from "./NanaCompactSummary";
import { NanaBriefDetails } from "./NanaBriefDetails";
import { NanaAdaptiveSupport } from "./NanaAdaptiveSupport";

export interface NanaHeroViewModel {
  state: DailyBriefState;
  message: string;
  actionLabel: string | null;
  safeToSpendPerDay: number | null;
  isEstimated: boolean;
  moneyScore: number;
  streak: number;
  upcomingFixedExpensesTotal: number;
  factors: MoneyScoreFactor[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    savingRate: number | null;
    emergencyRunwayMonths: number | null;
  };
}

interface NanaHeroProps {
  viewModel: NanaHeroViewModel;
}

const STATE_TO_POSE: Record<DailyBriefState, NanaGuidePose> = {
  normal: "helpful",
  attention: "waiting",
  recovery: "retry",
  payday: "celebrate",
  setup: "welcome",
};

const THEME_SURFACE_CLASSES: Record<DailyBriefState, string> = {
  normal: "bg-[var(--nana-surface,#fffdf7)] border-[var(--nana-ink,#463315)]/10 text-[var(--nana-ink,#463315)]",
  attention: "bg-[var(--nana-surface,#fffdf7)] border-[var(--nana-ink,#463315)]/10 text-[var(--nana-ink,#463315)]",
  recovery: "bg-red-50/20 dark:bg-red-950/5 border-red-500/10 text-stone-900 dark:text-stone-100",
  payday: "bg-[var(--nana-surface,#fffdf7)] border-[var(--nana-ink,#463315)]/10 text-[var(--nana-ink,#463315)]",
  setup: "bg-[var(--nana-surface,#fffdf7)] border-[var(--nana-ink,#463315)]/10 text-[var(--nana-ink,#463315)]",
};

export function NanaHero({ viewModel }: NanaHeroProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    state,
    message,
    safeToSpendPerDay,
    isEstimated,
    moneyScore,
    streak,
    upcomingFixedExpensesTotal,
    factors,
    summary,
  } = viewModel;

  const pose = STATE_TO_POSE[state] || "helpful";
  const surfaceClass = THEME_SURFACE_CLASSES[state] || THEME_SURFACE_CLASSES.normal;

  return (
    <div className="space-y-4">
      {/* ─── NANA HERO PRIMARY CARD ─── */}
      <div
        className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${surfaceClass}`}
      >
        <div className="flex gap-4 items-start justify-between">
          <div className="space-y-2 flex-1">
            {/* Badges / Header Stack */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-bold">
              {streak > 0 && (
                <span className="flex items-center gap-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  🔥 {streak} วัน
                </span>
              )}
              <span className="flex items-center gap-0.5 bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
                ⭐ {moneyScore} คะแนน
              </span>
            </div>

            {/* Status Phrase / Title */}
            <h2 className="text-base sm:text-lg font-extrabold leading-tight text-[var(--nana-ink,#463315)]">
              {message || "กล้วยช่วยคุมวินัย วันนี้ใช้จ่ายได้สบายใจเลย"}
            </h2>

            {/* Primary Guidance Amount */}
            <div className="pt-1.5">
              <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-[var(--nana-muted,#877455)] block">
                งบแนะนำให้ใช้จ่ายวันนี้ (Safe to Spend)
              </span>
              <div className="flex items-baseline gap-1.5 pt-0.5">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--nana-ink,#463315)]">
                  ฿{safeToSpendPerDay !== null ? safeToSpendPerDay.toLocaleString("th-TH") : "—"}
                </span>
                <span className="text-xs font-extrabold text-[var(--nana-muted,#877455)]">
                  / วัน
                </span>
                {isEstimated && (
                  <span className="text-[10px] font-extrabold bg-[var(--nana-surface-soft,#fff7df)] border border-[var(--nana-ink,#463315)]/10 text-[var(--nana-muted,#877455)] px-1.5 py-0.5 rounded ml-1">
                    ประมาณการ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Expressive Nana Mascot */}
          <div className="flex-shrink-0">
            <NanaGuide pose={pose} className="w-20 h-20 sm:w-24 sm:h-24 animate-pulse-subtle" />
          </div>
        </div>

        {/* Combined Protected Obligations */}
        {upcomingFixedExpensesTotal > 0 && (
          <div className="mt-3 text-[11px] font-medium text-[var(--nana-muted,#877455)] bg-[var(--nana-surface-soft,#fff7df)]/50 p-2 rounded-lg border border-[var(--nana-ink,#463315)]/5">
            🔒 หักสำรองไว้แล้ว ฿{upcomingFixedExpensesTotal.toLocaleString("th-TH")} สำหรับรายจ่ายประจำที่รอชำระในรอบบิลนี้
          </div>
        )}

        {/* Footer Actions Row */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--nana-ink,#463315)]/5 pt-3">
          <div className="flex gap-3">
            {/* Quick Log Link */}
            <button
              onClick={() => {
                const addBtn = document.getElementById("fab-add-button");
                if (addBtn) addBtn.click();
              }}
              className="text-xs font-extrabold text-[var(--nana-ink,#463315)] hover:underline focus:outline-none flex items-center gap-1"
            >
              📝 บันทึกรายจ่าย
            </button>
          </div>

          {/* Toggle Details Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-extrabold text-[var(--nana-muted,#877455)] hover:text-[var(--nana-ink,#463315)] transition-colors focus:outline-none flex items-center gap-0.5"
          >
            {expanded ? "ปิดรายละเอียด ▴" : "ดูรายละเอียด ▾"}
          </button>
        </div>

        {/* Expanded Progress / Factors */}
        {expanded && (
          <div className="mt-4 space-y-4">
            <NanaCompactSummary summary={summary} />
            <NanaBriefDetails
              factors={factors}
              emergencyRunwayMonths={summary.emergencyRunwayMonths}
              aiDetailTh={viewModel.state === "setup" ? null : "วินัยการคุมรายจ่ายของคุณเยี่ยมยอดมากในเดือนนี้ รักษาความคงเส้นคงวาแบบนี้ไว้เพื่อสร้างเงินเก็บสำรองสะสมที่แข็งแกร่งต่อไปนะ!"}
            />
          </div>
        )}
      </div>

      {/* ─── ADAPTIVE SUPPORTING CARD ─── */}
      {!expanded && (
        <NanaAdaptiveSupport
          state={state}
          moneyScore={moneyScore}
          streak={streak}
          upcomingFixedExpensesTotal={upcomingFixedExpensesTotal}
        />
      )}
    </div>
  );
}
