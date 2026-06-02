"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { CategoryRow } from "@/app/actions/analytics";
import { CategoryIcon } from "./category-icon";
import { format } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  topCategory: CategoryRow | null;
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
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--glass-border)] px-3 py-2 text-[11px] leading-relaxed text-fg-muted shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

function suggestBudget(spent: number): number {
  return Math.max(500, Math.floor((spent * 0.85) / 500) * 500);
}

export function TopSpendingInsight({ topCategory }: Props) {
  const t = useT();
  if (!topCategory || topCategory.spent === 0) return null;

  const suggested = suggestBudget(topCategory.spent);

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center gap-1">
        <p className="text-sm font-semibold">{t.analytics.topCategoryTitle}</p>
        <InfoTip text={t.analytics.topCategoryExcludesRecurring ?? "ไม่รวมรายจ่ายประจำ"} />
      </div>
      <div className="flex items-center gap-3">
        <CategoryIcon
          name={topCategory.name}
          emoji={topCategory.icon}
          size={28}
          className="text-fg"
          style={{ color: topCategory.color || undefined }}
        />
        <div>
          <p className="text-base font-semibold">{topCategory.name}</p>
          <p className="text-xl font-bold tabular-nums text-negative">
            {formatTHB(topCategory.spent)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        {format(t.analytics.topCategoryPctTemplate, { pct: topCategory.pct })}
      </p>
      <p className="mt-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-xs text-fg">
        {format(t.analytics.topCategorySuggestTemplate, { name: topCategory.name, amount: formatTHB(suggested) })}
      </p>
    </div>
  );
}
