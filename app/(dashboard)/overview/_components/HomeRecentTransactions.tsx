import Link from "next/link";
import type { RecentTransaction } from "@/app/actions/home";

interface Props {
  transactions: RecentTransaction[];
}

const TYPE_ICONS: Record<string, string> = {
  income: "💰",
  expense: "🧾",
  savings: "🏦",
};

const TYPE_LABELS: Record<string, string> = {
  income: "รายรับ",
  expense: "รายจ่าย",
  savings: "เงินออม",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
  const txStr = d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
  if (todayStr === txStr) {
    return `วันนี้ ${d.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    })}`;
  }
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
}

export function HomeRecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">รายการล่าสุด</p>
        <Link href="/transactions" className="text-xs text-accent">
          ดูทั้งหมด
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((t) => {
          const isIncome = t.type === "income";
          const isSavings = t.type === "savings";
          const amtColor = isIncome
            ? "text-positive"
            : isSavings
              ? "text-blue-400"
              : "text-negative";
          const sign = isIncome || isSavings ? "+" : "-";
          const subLabel = t.category ?? TYPE_LABELS[t.type] ?? "";

          return (
            <div key={t.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-base">
                {TYPE_ICONS[t.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {t.note ?? t.category ?? TYPE_LABELS[t.type]}
                </p>
                <p className="text-xs text-fg-muted">
                  {subLabel ? `${subLabel} • ` : ""}
                  {fmtDate(t.date)}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold tabular-nums ${amtColor}`}>
                {sign}฿{t.amount.toLocaleString("th-TH")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
