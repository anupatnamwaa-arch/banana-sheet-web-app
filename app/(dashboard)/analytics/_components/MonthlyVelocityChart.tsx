// app/(dashboard)/analytics/_components/MonthlyVelocityChart.tsx
"use client";

import {
  ResponsiveContainer,
  Line,
  XAxis,
  Tooltip,
  Area,
  ComposedChart,
} from "recharts";
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { MonthlyPoint } from "@/app/actions/analytics";

interface Props {
  data: MonthlyPoint[] | null; // null = free user
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(month: string): string {
  const m = parseInt(month.slice(5, 7), 10);
  return THAI_MONTHS[m - 1] ?? month;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-[var(--accent)]">รายจ่าย {formatTHB(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

const PLACEHOLDER: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
  month: `2025-${String(i + 1).padStart(2, "0")}`,
  expense: 8000 + Math.sin(i) * 3000,
  income: 45000,
}));

export function MonthlyVelocityChart({ data }: Props) {
  const display = data ?? PLACEHOLDER;
  const chartData = display.map((p) => ({ ...p, label: monthLabel(p.month) }));

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
          <Lock size={20} className="text-fg-muted" />
          <Link href="/paywall" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black">
            🔒 ปลดล็อกด้วย Pro
          </Link>
        </div>
      )}
      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="mb-3 text-xs font-medium text-fg-muted">📈 Monthly Velocity (รายจ่าย 12 เดือน)</p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <filter id="velocity-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="velocity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
              interval={1}
            />
            <Area
              type="monotone"
              dataKey="expense"
              fill="url(#velocity-fill)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#facc15"
              strokeWidth={2.5}
              dot={false}
              filter="url(#velocity-glow)"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
