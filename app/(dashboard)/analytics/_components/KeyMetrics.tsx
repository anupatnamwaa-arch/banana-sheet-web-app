"use client";

import { formatTHB } from "@/lib/format";
import type { MetricSummary } from "@/app/actions/analytics";
import { format } from "@/lib/i18n";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  metrics: MetricSummary;
}

function changeText(current: number, prev: number, t: ReturnType<typeof useT>): string {
  if (prev === 0) return current > 0 ? t.analytics.newDataPeriod : t.analytics.noDataYet;
  const pct = Math.round(((current - prev) / prev) * 100);
  if (Math.abs(pct) <= 2) return t.analytics.nearlyFlat;
  return `${pct > 0 ? t.analytics.increased : t.analytics.decreased} ${Math.abs(pct)}% ${t.analytics.fromPrev}`;
}

export function KeyMetrics({ metrics }: Props) {
  const t = useT();
  const cards = [
    {
      label: t.analytics.totalExpense,
      value: formatTHB(metrics.totalExpense),
      sub: changeText(metrics.totalExpense, metrics.prevExpense, t),
      text: "text-negative",
    },
    {
      label: t.analytics.totalIncome,
      value: formatTHB(metrics.totalIncome),
      sub: changeText(metrics.totalIncome, metrics.prevIncome, t),
      text: "text-positive",
    },
    {
      label: t.analytics.totalSavings,
      value: formatTHB(metrics.totalSavings),
      sub:
        metrics.savingRate !== null
          ? format(t.analytics.savingPctTemplate, { pct: metrics.savingRate })
          : t.analytics.noIncome,
      text: "text-blue-400",
    },
    {
      label: t.analytics.avgPerDay,
      value: formatTHB(Math.round(metrics.avgPerDay)),
      sub: t.analytics.avgPerDaySub,
      text: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl bg-[var(--bg-elevated)] p-3">
          <p className="text-xs text-fg-muted">{c.label}</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${c.text}`}>{c.value}</p>
          <p className="mt-1 text-[11px] leading-tight text-fg-muted">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
