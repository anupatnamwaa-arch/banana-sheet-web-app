"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ANALYTICS_PERIODS, type AnalyticsPeriod } from "@/app/actions/analytics-utils";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  current: AnalyticsPeriod;
  selectedRange: { from: string; to: string } | null;
}

function ymLabel(ym: string, months: readonly string[], yearOffset: number): string {
  const [y, m] = ym.split("-").map(Number);
  return `${months[m - 1]} ${y + yearOffset}`;
}

/** Compact label for a range pill. */
function rangeLabel(from: string, to: string, months: readonly string[], yearOffset: number): string {
  if (from === to) return ymLabel(from, months, yearOffset);
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  if (fy === ty) return `${months[fm - 1]}–${months[tm - 1]} ${ty + yearOffset}`;
  return `${ymLabel(from, months, yearOffset)} – ${ymLabel(to, months, yearOffset)}`;
}

export function PeriodPills({ current, selectedRange }: Props) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const years = Array.from({ length: 6 }, (_, i) => curYear - 5 + i); // oldest → newest

  const initFrom = selectedRange?.from ?? `${curYear}-${String(curMonth).padStart(2, "0")}`;
  const initTo = selectedRange?.to ?? `${curYear}-${String(curMonth).padStart(2, "0")}`;
  const [fromY, setFromY] = useState(Number(initFrom.slice(0, 4)));
  const [fromM, setFromM] = useState(Number(initFrom.slice(5, 7)));
  const [toY, setToY] = useState(Number(initTo.slice(0, 4)));
  const [toM, setToM] = useState(Number(initTo.slice(5, 7)));

  const fromYm = `${fromY}-${String(fromM).padStart(2, "0")}`;
  const toYm = `${toY}-${String(toM).padStart(2, "0")}`;
  const invalid = fromYm > toYm;

  function pushPeriod(id: AnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", id);
    params.delete("from");
    params.delete("to");
    setPickerOpen(false);
    startTransition(() => router.push(`/analytics?${params.toString()}`, { scroll: false }));
  }

  function applyRange() {
    if (invalid) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", fromYm);
    params.set("to", toYm);
    params.delete("period");
    setPickerOpen(false);
    startTransition(() => router.push(`/analytics?${params.toString()}`, { scroll: false }));
  }

  const selectClass =
    "rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1.5 text-xs text-fg outline-none";

  return (
    <div className={isPending ? "opacity-60" : ""}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ANALYTICS_PERIODS.map((p) => {
          const active = !selectedRange && p.id === current;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => pushPeriod(p.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
              }`}
            >
              {p.id === "month" ? t.analytics.periodThisMonth : p.id === "prevmonth" ? t.analytics.periodPrevMonth : t.analytics.periodThisYear}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`flex shrink-0 items-center gap-1 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            selectedRange ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
          }`}
        >
          {selectedRange
            ? rangeLabel(selectedRange.from, selectedRange.to, t.calendar.months, t.calendar.yearOffset)
            : t.analytics.customRange}
          <span className="text-[10px]">▾</span>
        </button>
      </div>

      {pickerOpen && (
        <div className="mt-2 space-y-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] p-3">
          {/* Start */}
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-fg-muted">{t.analytics.rangeStart}</span>
            <select className={selectClass} value={fromM} onChange={(e) => setFromM(Number(e.target.value))}>
              {t.calendar.months.map((label, i) => (
                <option key={i} value={i + 1}>{label}</option>
              ))}
            </select>
            <select className={selectClass} value={fromY} onChange={(e) => setFromY(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y + t.calendar.yearOffset}</option>
              ))}
            </select>
          </div>

          {/* End */}
          <div className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-fg-muted">{t.analytics.rangeEnd}</span>
            <select className={selectClass} value={toM} onChange={(e) => setToM(Number(e.target.value))}>
              {t.calendar.months.map((label, i) => (
                <option key={i} value={i + 1}>{label}</option>
              ))}
            </select>
            <select className={selectClass} value={toY} onChange={(e) => setToY(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y + t.calendar.yearOffset}</option>
              ))}
            </select>
          </div>

          {invalid && (
            <p className="text-xs text-[var(--negative)]">{t.analytics.rangeInvalid}</p>
          )}

          <button
            type="button"
            onClick={applyRange}
            disabled={invalid}
            className="w-full rounded-xl bg-accent py-2 text-xs font-semibold text-black transition-opacity disabled:opacity-40"
          >
            {t.analytics.viewRange}
          </button>
        </div>
      )}
    </div>
  );
}
