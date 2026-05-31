"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatTHB } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { ItemSnapshot } from "@/app/actions/wealth-data";

interface Props {
  snapshots: ItemSnapshot[];
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

const ITEM_COLORS = [
  "#34d399", "#facc15", "#38bdf8", "#818cf8",
  "#fb923c", "#a78bfa", "#f472b6", "#4ade80",
];

type PeriodKey = "1mo" | "ytd" | "1y" | "all";
type TabKey = "asset" | "liability";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "1mo", label: "1 เดือน" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1 ปี" },
  { id: "all", label: "ทั้งหมด" },
];

function monthLabel(ym: string): string {
  const [, m] = ym.split("-").map(Number);
  return THAI_MONTHS[m - 1] ?? ym;
}

function periodStartMonth(period: PeriodKey): string {
  const { year, month } = bangkokToday();
  const pad = (n: number) => String(n).padStart(2, "0");
  switch (period) {
    case "1mo": {
      const d = new Date(Date.UTC(year, month - 2, 1));
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    }
    case "ytd":
      return `${year}-01`;
    case "1y": {
      const d = new Date(Date.UTC(year - 1, month - 1, 1));
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
    }
    default:
      return "0000-00";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass max-w-[200px] rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <p key={p.name} style={{ color: p.color }} className="truncate">
          {p.name}: {formatTHB(p.value)}
        </p>
      ))}
    </div>
  );
}

function growthText(start: number, end: number): { pct: string; color: string } {
  if (start === 0) return { pct: "—", color: "text-fg-muted" };
  const pct = ((end - start) / Math.abs(start)) * 100;
  const sign = pct > 0 ? "+" : "";
  return {
    pct: `${sign}${pct.toFixed(1)}%`,
    color: pct > 0 ? "text-positive" : pct < 0 ? "text-negative" : "text-fg-muted",
  };
}

export function AssetGrowthChart({ snapshots }: Props) {
  const [tab, setTab] = useState<TabKey>("asset");
  const [period, setPeriod] = useState<PeriodKey>("1y");

  const startMonth = period === "all" ? "0000-00" : periodStartMonth(period);

  // Filter by type + period.
  const filtered = useMemo(
    () => snapshots.filter((s) => s.type === tab && s.month >= startMonth),
    [snapshots, tab, startMonth]
  );

  // Unique items sorted by latest value desc (top 8 shown on chart).
  const itemOrder = useMemo(() => {
    const latest = new Map<string, { name: string; value: number }>();
    // Snapshots are sorted ascending — each iteration overwrites with newer value.
    for (const s of filtered) {
      latest.set(s.itemId, { name: s.name, value: s.value });
    }
    return [...latest.entries()]
      .sort(([, a], [, b]) => b.value - a.value)
      .map(([id, { name }]) => ({ id, name }));
  }, [filtered]);

  const chartItems = itemOrder.slice(0, 8);

  // All unique months in period.
  const months = useMemo(
    () => [...new Set(filtered.map((s) => s.month))].sort(),
    [filtered]
  );

  // Build chart data: one row per month, one key per item.
  const chartData = useMemo(() => {
    const byMonthItem = new Map<string, number>();
    for (const s of filtered) byMonthItem.set(`${s.month}|${s.itemId}`, s.value);
    return months.map((m) => {
      const row: Record<string, string | number> = { month: m, label: monthLabel(m) };
      for (const item of chartItems) {
        const v = byMonthItem.get(`${m}|${item.id}`);
        if (v !== undefined) row[item.id] = v;
      }
      return row;
    });
  }, [filtered, months, chartItems]);

  // Growth cards: earliest vs latest value in period per item.
  const growthCards = useMemo(() => {
    return itemOrder.map(({ id, name }) => {
      const snaps = filtered.filter((s) => s.itemId === id).sort((a, b) => a.month.localeCompare(b.month));
      const start = snaps[0]?.value ?? 0;
      const end = snaps[snaps.length - 1]?.value ?? 0;
      return { id, name, start, end, ...growthText(start, end) };
    });
  }, [filtered, itemOrder]);

  const hasData = chartItems.length > 0 && months.length >= 1;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">การเติบโตแต่ละรายการ</p>

      {/* Tab: asset / liability */}
      <div className="mb-3 flex gap-1 rounded-xl border border-[var(--glass-border)] p-1">
        {(["asset", "liability"] as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              tab === t ? "bg-accent text-black" : "text-fg-muted"
            }`}
          >
            {t === "asset" ? "สินทรัพย์" : "หนี้สิน"}
          </button>
        ))}
      </div>

      {/* Period pills */}
      <div className="mb-4 flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              period === p.id
                ? "bg-accent text-black"
                : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="py-8 text-center text-xs text-fg-muted">
          {tab === "asset" ? "ยังไม่มีข้อมูลสินทรัพย์" : "ยังไม่มีข้อมูลหนี้สิน"}
          <br />ยอดจะแสดงหลังจากบันทึกแต่ละเดือน
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
                minTickGap={20}
              />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)" }} />
              <Legend
                formatter={(value: string) =>
                  chartItems.find((i) => i.id === value)?.name ?? value
                }
                wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
              />
              {chartItems.map((item, i) => (
                <Line
                  key={item.id}
                  type="monotone"
                  dataKey={item.id}
                  name={item.id}
                  stroke={ITEM_COLORS[i % ITEM_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Growth summary cards */}
          {growthCards.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {growthCards.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl bg-[var(--glass-bg)] px-3 py-2"
                >
                  <p className="truncate text-xs text-fg">{g.name}</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums">{formatTHB(g.end)}</p>
                  <p className={`text-xs font-medium ${g.color}`}>{g.pct}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
