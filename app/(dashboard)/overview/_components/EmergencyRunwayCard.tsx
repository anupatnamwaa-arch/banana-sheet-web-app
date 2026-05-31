"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { RunwayData } from "@/app/actions/overview";
import { useT } from "@/lib/i18n/LanguageProvider";

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
        <p className="text-xs font-medium text-fg-muted">🛟 {t.overview.emergencyRunway}</p>
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
      </div>
    </div>
  );
}
