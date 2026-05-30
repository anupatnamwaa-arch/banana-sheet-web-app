"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";
import { formatTHB } from "@/lib/format";
import type { TrendPoint } from "@/app/actions/analytics";

interface Props {
  trend: TrendPoint[];
  currentMonthRemaining: number;
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function label(month: string): string {
  return THAI_MONTHS[parseInt(month.slice(5, 7), 10) - 1] ?? month;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label: l }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{l}</p>
      <p className="text-positive">รายรับ {formatTHB(payload[0]?.payload.income ?? 0)}</p>
      <p className="text-negative">รายจ่าย {formatTHB(payload[0]?.payload.expense ?? 0)}</p>
      <p className="text-blue-400">เงินออม {formatTHB(payload[0]?.payload.savings ?? 0)}</p>
    </div>
  );
}

export function IncomeExpenseTrend({ trend, currentMonthRemaining }: Props) {
  const data = trend.map((t) => ({ ...t, label: label(t.month) }));
  const remNeg = currentMonthRemaining < 0;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-1 text-sm font-semibold">รายรับเทียบรายจ่าย</p>
      <div className="mb-3 flex gap-3 text-[11px] text-fg-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-positive" />รายรับ
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-negative" />รายจ่าย
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-blue-400" />เงินออม
        </span>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="income" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={14} />
          <Bar dataKey="savings" fill="#38bdf8" radius={[3, 3, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-3 text-xs text-fg-muted">
        เดือนนี้เหลือเงินหลังหักรายจ่ายและเงินออม{" "}
        <span className={`font-semibold ${remNeg ? "text-negative" : "text-positive"}`}>
          {remNeg ? "-" : ""}
          {formatTHB(Math.abs(currentMonthRemaining))}
        </span>
      </p>
    </div>
  );
}
