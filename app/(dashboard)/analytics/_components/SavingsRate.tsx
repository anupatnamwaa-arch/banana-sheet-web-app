import { formatTHB } from "@/lib/format";

interface Props {
  savingRate: number | null;
  totalSavings: number;
  totalIncome: number;
  target: number;
}

export function SavingsRate({ savingRate, totalSavings, totalIncome, target }: Props) {
  if (totalIncome === 0) return null;

  const rate = savingRate ?? 0;
  const pctOfTarget = target > 0 ? Math.min(100, Math.round((rate / target) * 100)) : 100;
  const reached = rate >= target;
  const gap = target - rate;

  let statusMsg: string;
  if (reached) statusMsg = "ถึงเป้าหมายแล้ว เยี่ยมมาก 🎉";
  else if (gap <= 3) statusMsg = `ใกล้ถึงเป้าหมายแล้ว อีกเพียง ${gap}%`;
  else statusMsg = `ยังห่างเป้าหมายอีก ${gap}%`;

  const barColor = reached ? "bg-positive" : gap <= 3 ? "bg-amber-400" : "bg-blue-400";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-end justify-between">
        <p className="text-sm font-semibold">อัตราการออม</p>
        <p className="text-xs text-fg-muted">เป้าหมาย {target}%</p>
      </div>

      <p className="mt-1 text-3xl font-bold tabular-nums text-blue-400">{rate}%</p>
      <p className="mt-0.5 text-xs text-fg-muted">
        คุณออมได้ {formatTHB(totalSavings)} จากรายรับ {formatTHB(totalIncome)}
      </p>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pctOfTarget}%` }}
        />
      </div>

      <p className={`mt-2 text-xs font-medium ${reached ? "text-positive" : "text-fg-muted"}`}>
        {statusMsg}
      </p>
    </div>
  );
}
