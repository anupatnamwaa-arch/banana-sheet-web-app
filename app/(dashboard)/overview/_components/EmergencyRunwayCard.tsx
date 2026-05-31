"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { RunwayData } from "@/app/actions/overview";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  data: RunwayData | null; // null = free user
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

export function EmergencyRunwayCard({ data }: Props) {
  const t = useT();
  // Placeholder values shown behind lock for free users
  const display = data ?? { liquidAssets: 120000, avgMonthlyExpense: 15000, months: 8 };
  const monthsLabel =
    display.months === null ? "∞" : `${display.months.toFixed(1)}`;

  return (
    <div className="glass relative overflow-hidden p-5">
      {/* Lock overlay for free users */}
      {!data && <LockedOverlay label={t.common.unlockWithPro} />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted">🛟 Emergency Runway</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {monthsLabel}
          <span className="ml-1 text-lg font-normal text-fg-muted">{t.overview.months}</span>
        </p>
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
