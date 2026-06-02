"use client";

import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from "recharts";
import { formatTHB } from "@/lib/format";
import type { WeekdayPoint } from "@/app/actions/analytics";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  weeklyPattern: WeekdayPoint[];
  peakWeekday: WeekdayPoint | null;
  avgPerDay: number;
  weeklyPatternNonRecurring?: WeekdayPoint[];
  peakWeekdayNonRecurring?: WeekdayPoint | null;
  avgPerDayNonRecurring?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, t }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as WeekdayPoint;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{p.fullLabel}</p>
      <p className="text-negative">{t.analytics.tooltipAvg} {formatTHB(Math.round(p.avg))}</p>
    </div>
  );
}

export function DailyPattern({
  weeklyPattern,
  peakWeekday,
  avgPerDay,
  weeklyPatternNonRecurring = [],
  peakWeekdayNonRecurring = null,
  avgPerDayNonRecurring = 0,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const [excludeRecurring, setExcludeRecurring] = useState(false);

  const activePattern = excludeRecurring ? weeklyPatternNonRecurring : weeklyPattern;
  const activePeak = excludeRecurring ? peakWeekdayNonRecurring : peakWeekday;
  const activeAvg = excludeRecurring ? avgPerDayNonRecurring : avgPerDay;

  const hasSpend = activePattern.some((w) => w.avg > 0);
  const hasBaseSpend = weeklyPattern.some((w) => w.avg > 0);

  // If there is no spending at all, hide the card
  if (!hasBaseSpend) return null;

  const peakLabel = activePeak?.label;
  const toggleLabel = excludeRecurring
    ? (locale === "en" ? "Excluded Recurring" : "ไม่รวมรายการประจำ")
    : (locale === "en" ? "Exclude Recurring" : "รวมรายการประจำ");

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      {/* Header and Toggle */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t.analytics.dailyPatternTitle}</p>
          <p className="text-xs text-fg-muted">{t.analytics.dailyPatternSub}</p>
        </div>
        <button
          type="button"
          onClick={() => setExcludeRecurring(!excludeRecurring)}
          className={`shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-extrabold border transition-all duration-200 ${
            excludeRecurring
              ? "bg-accent border-accent text-black"
              : "border-[var(--glass-border)] text-fg-muted hover:text-fg bg-[var(--glass-bg)]"
          }`}
        >
          🔄 {toggleLabel}
        </button>
      </div>

      {!hasSpend ? (
        <div className="h-[140px] flex items-center justify-center rounded-2xl border border-[var(--glass-border)]/50 bg-[var(--glass-bg)] text-xs text-fg-muted">
          {locale === "en" ? "No discretionary expenses logged" : "ไม่มีรายจ่ายผันแปรในรอบช่วงเวลานี้"}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={activePattern} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 11 }}
            />
            <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {activePattern.map((w) => (
                <Cell key={w.label} fill={w.label === peakLabel ? "#facc15" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-3 space-y-1">
        {activePeak && (
          <p className="text-xs text-fg-muted">
            {t.analytics.dailyPatternPeakLabel}{" "}
            <span className="font-semibold text-fg">{t.calendar.weekdayPrefix}{activePeak.fullLabel}</span>{" "}
            {formatTHB(Math.round(activePeak.avg))}
          </p>
        )}
        <p className="text-xs text-fg-muted">
          {t.analytics.dailyPatternAvgLabel} {formatTHB(Math.round(activeAvg))}
        </p>
      </div>
    </div>
  );
}
