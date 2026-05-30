"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/app/actions/analytics-utils";

interface Props {
  current: AnalyticsPeriod;
  selectedMonth: string | null; // "YYYY-MM" or null
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${THAI_MONTHS[m - 1]} ${y + 543}`; // Buddhist era
}

export function PeriodPills({ current, selectedMonth }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1; // 1-based

  // Year currently shown in the picker (Gregorian).
  const [viewYear, setViewYear] = useState(() =>
    selectedMonth ? Number(selectedMonth.slice(0, 4)) : curYear
  );

  function pushPeriod(id: AnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", id);
    params.delete("month");
    setPickerOpen(false);
    startTransition(() => router.push(`/analytics?${params.toString()}`, { scroll: false }));
  }

  function pushMonth(month1: number) {
    const ym = `${viewYear}-${String(month1).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", ym);
    params.delete("period");
    setPickerOpen(false);
    startTransition(() => router.push(`/analytics?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ANALYTICS_PERIODS.map((p) => {
          const active = !selectedMonth && p.id === current;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pushPeriod(p.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        {/* Free month picker */}
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            selectedMonth ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
          }`}
        >
          {selectedMonth ? monthLabel(selectedMonth) : "เลือกเดือน"}
          <span className="text-[10px]">▾</span>
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] p-3">
          {/* Year stepper (Buddhist era) */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
              aria-label="ปีก่อนหน้า"
            >
              ‹
            </button>
            <span className="text-sm font-semibold tabular-nums">{viewYear + 543}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.min(curYear, y + 1))}
              disabled={viewYear >= curYear}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--glass-bg)] text-fg-muted hover:text-fg disabled:opacity-30"
              aria-label="ปีถัดไป"
            >
              ›
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-2">
            {THAI_MONTHS.map((label, i) => {
              const month1 = i + 1;
              const isFuture = viewYear > curYear || (viewYear === curYear && month1 > curMonth);
              const isSelected = selectedMonth === `${viewYear}-${String(month1).padStart(2, "0")}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pushMonth(month1)}
                  disabled={isFuture}
                  className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-accent text-black"
                      : "bg-[var(--glass-bg)] text-fg hover:bg-[var(--glass-border)]"
                  } disabled:opacity-25`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
