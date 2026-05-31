"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

export function AnalyticsEmptyState() {
  const t = useT();
  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-8 text-center">
      <p className="text-3xl">📊</p>
      <p className="mt-3 text-base font-semibold">{t.analytics.emptyTitle}</p>
      <p className="mt-1 text-sm text-fg-muted">
        {t.analytics.emptyDesc}
      </p>
      <p className="mt-4 text-xs text-fg-muted">{t.analytics.emptyHint}</p>
    </div>
  );
}
