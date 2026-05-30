import { formatTHB } from "@/lib/format";
import type { CategoryMove } from "@/app/actions/analytics";

interface Props {
  movers: CategoryMove[];
}

export function ComparisonInsight({ movers }: Props) {
  if (movers.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <p className="mb-3 text-sm font-semibold">เทียบกับช่วงก่อน</p>
      <div className="space-y-2.5">
        {movers.map((m) => {
          const up = m.delta > 0;
          // For expenses: increase = bad (red), decrease = good (green).
          const color = up ? "text-negative" : "text-positive";
          const arrow = up ? "↑" : "↓";
          const detail =
            m.pct !== null
              ? `${up ? "เพิ่มขึ้น" : "ลดลง"} ${Math.abs(m.pct)}%`
              : `${up ? "เพิ่มขึ้น" : "ลดลง"} ${formatTHB(Math.abs(m.delta))}`;
          return (
            <div key={m.name} className="flex items-center justify-between text-xs">
              <span className="truncate text-fg">{m.name}</span>
              <span className={`flex shrink-0 items-center gap-1 font-medium ${color}`}>
                <span>{arrow}</span>
                {detail}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
