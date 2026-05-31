"use client";

import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  insight: string | null;
}

export function HomeInsightCard({ insight }: Props) {
  const t = useT();
  if (!insight) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <span className="mt-0.5 shrink-0 text-xl">✨</span>
      <div>
        <p className="text-xs font-semibold text-accent">{t.analytics.smartInsightsTitle}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{insight}</p>
      </div>
    </div>
  );
}
