// app/(dashboard)/analytics/_components/CategoryBreakdownChart.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { CategorySpend } from "@/app/actions/analytics";

interface Props {
  data: CategorySpend[] | null; // null = free user
}

const PALETTE = ["#facc15", "#34d399", "#818cf8", "#f87171", "#fb923c", "#38bdf8"];

const PLACEHOLDER: CategorySpend[] = [
  { categoryId: "1", categoryName: "อาหาร",    spent: 8200,  budget: 10000 },
  { categoryId: "2", categoryName: "เดินทาง",   spent: 3100,  budget: 5000  },
  { categoryId: "3", categoryName: "ช้อปปิ้ง", spent: 4800,  budget: 5000  },
  { categoryId: "4", categoryName: "กาแฟ",      spent: 2400,  budget: null  },
];

export function CategoryBreakdownChart({ data }: Props) {
  const display = data ?? PLACEHOLDER;
  const total = display.reduce((sum, c) => sum + c.spent, 0);

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
        <p className="mb-3 text-xs font-medium text-fg-muted">🍩 Category Breakdown (เดือนนี้)</p>
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={display}
                  dataKey="spent"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  strokeWidth={0}
                >
                  {display.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold tabular-nums">{formatTHB(total)}</p>
              <p className="text-[9px] text-fg-muted">รายจ่าย</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {display.map((cat, i) => {
              const overBudget = cat.budget !== null && cat.spent > cat.budget;
              return (
                <div key={cat.categoryId} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="flex-1 truncate text-fg-muted">{cat.categoryName}</span>
                  <span className={overBudget ? "text-[var(--negative)]" : "tabular-nums"}>
                    {formatTHB(cat.spent)}
                  </span>
                  <span className="text-fg-muted">
                    / {cat.budget !== null ? formatTHB(cat.budget) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
