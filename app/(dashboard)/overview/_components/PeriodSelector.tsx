"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Period } from "@/app/actions/overview";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  current: Period;
  customFrom?: string;
  customTo?: string;
}

export function PeriodSelector({ current, customFrom, customTo }: Props) {
  const router = useRouter();
  const t = useT();

  const PRESETS: Array<{ value: Period; label: string }> = [
    { value: "3m", label: t.overview.period3m },
    { value: "year", label: t.overview.periodYear },
    { value: "all", label: t.overview.periodAll },
    { value: "custom", label: t.overview.periodCustom },
  ];
  const [showCustom, setShowCustom] = useState(current === "custom");
  const [from, setFrom] = useState(customFrom ?? "");
  const [to, setTo] = useState(customTo ?? "");

  function selectPreset(period: Period) {
    if (period === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    router.push(`/overview?period=${period}`);
  }

  function confirmCustom() {
    if (!from || !to || from > to) return;
    router.push(`/overview?period=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="space-y-3">
      {/* Pill row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map(({ value, label }) => {
          const active = current === value || (value === "custom" && showCustom);
          return (
            <button
              key={value}
              onClick={() => selectPreset(value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent text-black"
                  : "border border-[var(--glass-border)] text-fg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
          <span className="text-fg-muted text-xs">{t.overview.periodTo}</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
          <button
            onClick={confirmCustom}
            disabled={!from || !to || from > to}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            {t.overview.periodConfirm}
          </button>
        </div>
      )}
    </div>
  );
}
