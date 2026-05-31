"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { formatTHB } from "@/lib/format";
import type { TrendPoint } from "@/app/actions/wealth-data";

interface Props {
  trend: TrendPoint[];
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const short = THAI_MONTHS[m - 1] ?? ym;
  // Show year suffix only on Jan or first point
  return m === 1 ? `${short} ${y + 543}` : short;
}

type Series = "assets" | "liabilities" | "netWorth";

const SERIES_CONFIG: Record<Series, { label: string; color: string; key: keyof TrendPoint }> = {
  assets:       { label: "สินทรัพย์",  color: "#34d399", key: "totalAssets" },
  liabilities:  { label: "หนี้สิน",    color: "#f87171", key: "totalLiabilities" },
  netWorth:     { label: "มูลค่าสุทธิ", color: "#818cf8", key: "netWorth" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatTHB(p.value)}
        </p>
      ))}
    </div>
  );
}

export function WealthTrendChart({ trend }: Props) {
  const [active, setActive] = useState<Set<Series>>(
    new Set(["assets", "liabilities", "netWorth"])
  );

  function toggle(s: Series) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size > 1) next.delete(s); // keep at least one
      } else {
        next.add(s);
      }
      return next;
    });
  }

  if (trend.length === 0) return null;

  const data = trend.map((t) => ({
    ...t,
    label: monthLabel(t.month),
  }));

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">แนวโน้มความมั่งคั่ง</p>

      {/* Toggle pills */}
      <div className="mb-4 flex gap-2">
        {(Object.entries(SERIES_CONFIG) as [Series, typeof SERIES_CONFIG[Series]][]).map(
          ([key, cfg]) => {
            const on = active.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity"
                style={{
                  background: on ? `${cfg.color}22` : "var(--glass-bg)",
                  color: on ? cfg.color : "var(--color-fg-muted)",
                  border: `1px solid ${on ? cfg.color : "transparent"}`,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: on ? cfg.color : "currentColor" }}
                />
                {cfg.label}
              </button>
            );
          }
        )}
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
            minTickGap={20}
          />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
          {(Object.entries(SERIES_CONFIG) as [Series, typeof SERIES_CONFIG[Series]][]).map(
            ([key, cfg]) =>
              active.has(key) ? (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={cfg.key as string}
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ) : null
          )}
        </LineChart>
      </ResponsiveContainer>

      {trend.length >= 2 && (
        <p className="mt-2 text-xs text-fg-muted">{trend.length} เดือนย้อนหลัง</p>
      )}
    </div>
  );
}
