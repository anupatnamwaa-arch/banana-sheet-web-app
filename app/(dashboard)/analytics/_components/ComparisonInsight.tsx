"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { CategoryMove } from "@/app/actions/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  movers: CategoryMove[];
  elapsedDays: number;
}

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
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-60 -translate-x-3/4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function ComparisonInsight({ movers, elapsedDays }: Props) {
  const t = useT();

  if (movers.length === 0) return null;

  const tooltip = (t.analytics.comparisonDaysNote ?? "").replace("{days}", String(elapsedDays));

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center gap-1">
        <p className="text-sm font-semibold">{t.analytics.comparisonTitle}</p>
        <InfoTip text={tooltip} />
      </div>
      <div className="space-y-2.5">
        {movers.map((m) => {
          const up = m.delta > 0;
          const color = up ? "text-negative" : "text-positive";
          const arrow = up ? "↑" : "↓";
          const detail =
            m.pct !== null
              ? `${up ? t.analytics.comparisonUp : t.analytics.comparisonDown} ${Math.abs(m.pct)}%`
              : `${up ? t.analytics.comparisonUp : t.analytics.comparisonDown} ${formatTHB(Math.abs(m.delta))}`;
          return (
            <div key={m.name} className="flex items-center justify-between text-xs">
              <span className="truncate text-fg">{m.name}</span>
              <span className={`flex shrink-0 items-center gap-1 font-medium ${color}`}>
                <span>{arrow}</span>
                {detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
