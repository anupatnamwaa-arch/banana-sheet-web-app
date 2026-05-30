"use client";

import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, Tooltip } from "recharts";
import { formatTHB } from "@/lib/format";
import type { DailyPoint } from "@/app/actions/analytics";

interface Props {
  daily: DailyPoint[];
  peakDay: DailyPoint | null;
  avgPerDay: number;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function thaiDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${parseInt(d, 10)} ${THAI_MONTHS[parseInt(m, 10) - 1]}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{thaiDay(p.date)}</p>
      <p className="text-negative">{formatTHB(p.amount)}</p>
    </div>
  );
}

export function DailyPattern({ daily, peakDay, avgPerDay }: Props) {
  if (daily.length === 0) return null;

  const peakDate = peakDay?.date;
  const data = daily.map((d) => ({ ...d, label: parseInt(d.date.slice(8, 10), 10) }));

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">พฤติกรรมการใช้เงินรายวัน</p>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 9 }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.date === peakDate ? "#facc15" : "#f87171"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {peakDay && (
        <p className="mt-3 text-xs text-fg-muted">
          วันที่ใช้จ่ายสูงสุด:{" "}
          <span className="font-semibold text-fg">{thaiDay(peakDay.date)}</span>{" "}
          {formatTHB(peakDay.amount)}
        </p>
      )}
      <p className="mt-0.5 text-xs text-fg-muted">
        ค่าเฉลี่ยต่อวัน: {formatTHB(Math.round(avgPerDay))}
      </p>
    </div>
  );
}
