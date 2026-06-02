"use client";

import { formatTHB } from "@/lib/format";
import type { CategoryRow } from "@/app/actions/analytics";
import { CategoryIcon, CATEGORY_BAR_COLORS } from "./category-icon";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  categories: CategoryRow[];
}

export function RecurringBreakdown({ categories }: Props) {
  const t = useT();
  if (categories.length === 0) return null;

  const maxSpent = categories[0]?.spent ?? 1;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">{t.analytics.recurringBreakdownTitle}</p>
      <div className="space-y-3">
        {categories.map((c, i) => {
          const color = c.color || CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length];
          return (
            <div key={c.categoryId}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex min-w-0 items-center gap-1.5">
                  <CategoryIcon
                    name={c.name}
                    emoji={c.icon}
                    size={14}
                    className="shrink-0"
                    style={{ color: c.color || undefined }}
                  />
                  <span className="truncate text-fg">{c.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-fg-muted">
                  {formatTHB(c.spent)} <span className="text-fg-muted/70">{c.pct}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(4, Math.round((c.spent / maxSpent) * 100))}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
