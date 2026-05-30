"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { formatTHB } from "@/lib/format";
import type { TrendPoint } from "@/app/actions/wealth-data";

interface Props {
  trend: TrendPoint[];
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function label(month: string): string {
  return THAI_MONTHS[parseInt(month.slice(5, 7), 10) - 1] ?? month;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label(payload[0].payload.month)}</p>
      <p className="text-blue-300">{formatTHB(payload[0].payload.netWorth)}</p>
    </div>
  );
}

export function NetWorthTrend({ trend }: Props) {
  if (trend.length < 2) return null;

  const data = trend.map((t) => ({ ...t, label: label(t.month) }));
  const first = trend[0].netWorth;
  const last = trend[trend.length - 1].netWorth;
  const pct = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 1000) / 10 : null;
  const up = last >= first;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">แนวโน้มมูลค่าสุทธิ</p>

      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
            minTickGap={12}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="#818cf8"
            strokeWidth={2.5}
            fill="url(#nw-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {pct !== null && (
        <p className="mt-3 text-xs text-fg-muted">
          มูลค่าสุทธิ{up ? "เพิ่มขึ้น" : "ลดลง"}{" "}
          <span className={`font-semibold ${up ? "text-positive" : "text-negative"}`}>
            {Math.abs(pct)}%
          </span>{" "}
          ใน {trend.length} เดือน
        </p>
      )}
    </div>
  );
}
