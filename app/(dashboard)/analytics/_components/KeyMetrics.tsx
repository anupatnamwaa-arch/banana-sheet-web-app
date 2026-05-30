import { formatTHB } from "@/lib/format";
import type { MetricSummary } from "@/app/actions/analytics";

interface Props {
  metrics: MetricSummary;
}

function changeText(current: number, prev: number): string {
  if (prev === 0) return current > 0 ? "เริ่มมีข้อมูลช่วงนี้" : "ยังไม่มีข้อมูล";
  const pct = Math.round(((current - prev) / prev) * 100);
  if (Math.abs(pct) <= 2) return "ใกล้เคียงช่วงก่อน";
  return pct > 0 ? `เพิ่มขึ้น ${pct}% จากช่วงก่อน` : `ลดลง ${Math.abs(pct)}% จากช่วงก่อน`;
}

export function KeyMetrics({ metrics }: Props) {
  const cards = [
    {
      label: "รายจ่ายรวม",
      value: formatTHB(metrics.totalExpense),
      sub: changeText(metrics.totalExpense, metrics.prevExpense),
      text: "text-negative",
    },
    {
      label: "รายรับรวม",
      value: formatTHB(metrics.totalIncome),
      sub: changeText(metrics.totalIncome, metrics.prevIncome),
      text: "text-positive",
    },
    {
      label: "เงินออมรวม",
      value: formatTHB(metrics.totalSavings),
      sub:
        metrics.savingRate !== null
          ? `ออมได้ ${metrics.savingRate}% ของรายรับ`
          : "ยังไม่มีรายรับ",
      text: "text-blue-400",
    },
    {
      label: "เฉลี่ยใช้ต่อวัน",
      value: formatTHB(Math.round(metrics.avgPerDay)),
      sub: "ค่าใช้จ่ายเฉลี่ยรายวัน",
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
