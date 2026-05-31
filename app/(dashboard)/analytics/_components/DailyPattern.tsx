"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from "recharts";
import { formatTHB } from "@/lib/format";
import type { WeekdayPoint } from "@/app/actions/analytics";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  weeklyPattern: WeekdayPoint[];
  peakWeekday: WeekdayPoint | null;
  avgPerDay: number;
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

export function DailyPattern({ weeklyPattern, peakWeekday, avgPerDay }: Props) {
  const t = useT();
  const hasSpend = weeklyPattern.some((w) => w.avg > 0);
  if (!hasSpend) return null;

  const peakLabel = peakWeekday?.label;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-1 text-sm font-semibold">{t.analytics.dailyPatternTitle}</p>
      <p className="mb-3 text-xs text-fg-muted">{t.analytics.dailyPatternSub}</p>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={weeklyPattern} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {weeklyPattern.map((w) => (
              <Cell key={w.label} fill={w.label === peakLabel ? "#facc15" : "#f87171"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {peakWeekday && (
        <p className="mt-3 text-xs text-fg-muted">
          {t.analytics.dailyPatternPeakLabel}{" "}
          <span className="font-semibold text-fg">{t.calendar.weekdayPrefix}{peakWeekday.fullLabel}</span>{" "}
          {formatTHB(Math.round(peakWeekday.avg))}
        </p>
      )}
      <p className="mt-0.5 text-xs text-fg-muted">
        {t.analytics.dailyPatternAvgLabel} {formatTHB(Math.round(avgPerDay))}
      </p>
    </div>
  );
}
