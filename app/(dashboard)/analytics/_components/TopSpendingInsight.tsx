import { formatTHB } from "@/lib/format";
import type { CategoryRow } from "@/app/actions/analytics";
import { categoryIcon } from "./category-icon";

interface Props {
  topCategory: CategoryRow | null;
}

function suggestBudget(spent: number): number {
  // Suggest ~15% lower, rounded down to nearest 500.
  return Math.max(500, Math.floor((spent * 0.85) / 500) * 500);
}

export function TopSpendingInsight({ topCategory }: Props) {
  if (!topCategory || topCategory.spent === 0) return null;

  const suggested = suggestBudget(topCategory.spent);

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-2 text-sm font-semibold">หมวดที่ใช้เยอะที่สุด</p>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{categoryIcon(topCategory.name)}</span>
        <div>
          <p className="text-base font-semibold">{topCategory.name}</p>
          <p className="text-xl font-bold tabular-nums text-negative">
            {formatTHB(topCategory.spent)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        คิดเป็น {topCategory.pct}% ของรายจ่ายทั้งหมด
      </p>
      <p className="mt-2 rounded-xl bg-[var(--glass-bg)] px-3 py-2 text-xs text-fg">
        💡 ลองตั้งงบ{topCategory.name}ไว้ที่ {formatTHB(suggested)} ในเดือนหน้า
      </p>
    </div>
  );
}
