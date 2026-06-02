"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Info } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { RunwayData } from "@/app/actions/overview";
import { useT } from "@/lib/i18n/LanguageProvider";

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        className="ml-1 text-fg-muted opacity-50 hover:opacity-100 transition-opacity"
      >
        <Info size={12} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

interface Props {
  data: RunwayData | null; // null = free user (shows locked overlay)
  targetMonths: number;    // from profiles.emergency_months
}

function LockedOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
      <Lock size={20} className="text-fg-muted" />
      <Link
        href="/paywall"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
      >
        {label}
      </Link>
    </div>
  );
}

export function EmergencyRunwayCard({ data, targetMonths }: Props) {
  const t = useT();
  // Placeholder values shown behind lock for free users
  const display = data ?? { liquidAssets: 120000, avgMonthlyExpense: 15000, months: 8 };
  const currentMonths = display.months ?? 0;
  const monthsLabel = display.months === null ? "∞" : `${display.months.toFixed(1)}`;

  // Progress toward target (only shown when unlocked)
  const progressPct = targetMonths > 0
    ? Math.min(100, Math.round((currentMonths / targetMonths) * 100))
    : 0;
  const reached = currentMonths >= targetMonths;
  const close   = !reached && progressPct >= 80;
  const statusMsg = reached ? t.overview.emergencyGoalReached
                 : close   ? t.overview.emergencyGoalClose
                 :           t.overview.emergencyGoalBuilding;
  const barColor = reached ? "bg-[var(--positive)]"
                 : close   ? "bg-amber-400"
                 :           "bg-blue-400";

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && <LockedOverlay label={t.common.unlockWithPro} />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted flex items-center">
          🛟 {t.overview.emergencyRunway}
          <InfoTip text={t.fixedCosts.emergencyRunwayTooltip} />
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {monthsLabel}
          <span className="ml-1 text-lg font-normal text-fg-muted">{t.overview.months}</span>
        </p>

        {/* Progress bar toward target */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-fg-muted">
            <span>{statusMsg}</span>
            <span>{t.overview.emergencyGoalTarget} {targetMonths} {t.overview.months}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-fg-muted">
          <div>
            <p>{t.overview.liquidAssets}</p>
            <p className="font-medium text-fg">{formatTHB(display.liquidAssets)}</p>
          </div>
          <div>
            <p>{t.overview.avgMonthlyExpense}</p>
            <p className="font-medium text-fg">{formatTHB(display.avgMonthlyExpense)}</p>
          </div>
        </div>

        {/* Survival Runway (Pro only) */}
        {data && data.totalFixedCosts && data.totalFixedCosts > 0 && (
          <div className="mt-3.5 border-t border-[var(--glass-border)]/50 pt-3 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <p className="text-[10px] text-fg-muted font-semibold uppercase tracking-wider flex items-center">
                {t.fixedCosts.survivalRunway}
                <InfoTip text={t.fixedCosts.survivalRunwayTooltip} />
              </p>
              <p className="font-mono text-sm font-bold text-blue-400 mt-0.5">
                {data.survivalMonths === undefined || data.survivalMonths === null ? "∞" : `${data.survivalMonths.toFixed(1)}`}
                <span className="text-[10px] font-normal text-fg-muted ml-0.5"> {t.overview.months}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-fg-muted font-semibold uppercase tracking-wider">{t.fixedCosts.title}</p>
              <p className="font-mono text-xs font-semibold text-fg mt-0.5">{formatTHB(data.totalFixedCosts)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
