"use client";

import React, { useState } from "react";
import type { MoneyScoreFactor } from "@/lib/nana/types";

interface NanaBriefDetailsProps {
  factors: MoneyScoreFactor[];
  emergencyRunwayMonths: number | null;
  aiDetailTh?: string | null;
}

const FACTOR_LABELS: Record<string, string> = {
  spending_pace: "การคุมรายจ่าย",
  safe_to_spend: "ยอดใช้จ่ายปลอดภัยต่อวัน",
  saving_progress: "ความคืบหน้าการออม",
  fixed_expense_pressure: "แรงกดดันรายจ่ายประจำ",
  logging_consistency: "ความสม่ำเสมอในการบันทึก",
};

const STATUS_LABELS: Record<string, string> = {
  good: "ดี",
  attention: "ควรดูเพิ่ม",
  unknown: "ยังประเมินไม่ได้",
};

const STATUS_CLASSES: Record<string, string> = {
  good: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  attention: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  unknown: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

export function NanaBriefDetails({
  factors,
  emergencyRunwayMonths,
  aiDetailTh,
}: NanaBriefDetailsProps) {
  const [showAllFactors, setShowAllFactors] = useState(false);

  // Sort: put "attention" and "unknown" factors first to help users focus on what needs work
  const sortedFactors = [...factors].sort((a, b) => {
    const priority = { attention: 0, unknown: 1, good: 2 };
    return (priority[a.status] ?? 2) - (priority[b.status] ?? 2);
  });

  const displayedFactors = showAllFactors ? sortedFactors : sortedFactors.slice(0, 3);

  return (
    <div className="space-y-4 pt-4 border-t border-[var(--nana-ink,#463315)]/10 text-[var(--nana-ink,#463315)]">
      {/* Emergency Runway Section */}
      <div className="rounded-xl bg-[var(--nana-surface-soft,#fff7df)] border border-[var(--nana-ink,#463315)]/5 p-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--nana-muted,#877455)]">
          เงินสำรองฉุกเฉิน (Emergency Runway)
        </span>
        <span className="font-bold text-sm">
          {emergencyRunwayMonths !== null
            ? `${emergencyRunwayMonths.toFixed(1)} เดือน`
            : "ยังประเมินไม่ได้"}
        </span>
      </div>

      {/* Score Factors Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--nana-muted,#877455)]">
            ปัจจัยคะแนนพฤติกรรมการเงิน
          </span>
          {factors.length > 3 && (
            <button
              onClick={() => setShowAllFactors(!showAllFactors)}
              className="text-xs font-bold text-[var(--nana-banana,#e6b928)] hover:underline focus:outline-none"
            >
              {showAllFactors ? "แสดงน้อยลง" : "ดูทั้งหมด"}
            </button>
          )}
        </div>

        <div className="grid gap-2">
          {displayedFactors.map((factor) => {
            const label = FACTOR_LABELS[factor.key] || factor.key;
            const statusLabel = STATUS_LABELS[factor.status] || factor.status;
            const statusClass = STATUS_CLASSES[factor.status] || STATUS_CLASSES.unknown;

            return (
              <div
                key={factor.key}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--nana-surface-soft,#fff7df)]/50 border border-[var(--nana-ink,#463315)]/5 text-xs"
              >
                <span className="font-medium text-[var(--nana-ink,#463315)]">{label}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border ${statusClass} font-semibold`}>
                    {statusLabel}
                  </span>
                  <span className="text-stone-400 font-medium">
                    {factor.points}/{factor.maxPoints}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Enrichment Detail (if present) */}
      {aiDetailTh && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-3.5 space-y-1.5">
          <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
            ✨ คำแนะนำพิเศษจากนานา (AI Enriched)
          </h4>
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200/90 font-medium">
            {aiDetailTh}
          </p>
        </div>
      )}
    </div>
  );
}
