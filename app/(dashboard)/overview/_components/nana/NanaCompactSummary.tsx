"use client";

import React from "react";

export interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingRate: number | null;
}

export function NanaCompactSummary({ summary }: { summary: SummaryData }) {
  const formatVal = (n: number) => Math.round(n).toLocaleString("th-TH");

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-[var(--nana-muted,#877455)] font-medium">
      <span>รายรับ ฿{formatVal(summary.totalIncome)}</span>
      <span aria-hidden="true" className="opacity-40">·</span>
      <span>รายจ่าย ฿{formatVal(summary.totalExpense)}</span>
      <span aria-hidden="true" className="opacity-40">·</span>
      <span>เก็บได้ ฿{formatVal(summary.totalSavings)}</span>
      <span aria-hidden="true" className="opacity-40">·</span>
      <span>อัตราออม {summary.savingRate !== null ? `${summary.savingRate}%` : "—"}</span>
    </div>
  );
}
