import Link from "next/link";

interface Props {
  displayName: string;
  totalIncome: number;
  totalExpense: number;
}

function fmt(n: number): string {
  return `฿${Math.abs(n).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function thaiDate(): string {
  return new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomeHeader({ displayName, totalIncome, totalExpense }: Props) {
  const netCashflow = totalIncome - totalExpense;
  const initial = displayName.charAt(0).toUpperCase();

  const cashflowColor =
    netCashflow > 0
      ? "text-positive"
      : netCashflow < 0
        ? "text-negative"
        : "text-fg";

  const cashflowSign = netCashflow >= 0 ? "+" : "-";

  return (
    <div className="space-y-4 pt-2">
      {/* Greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">สวัสดี, {displayName} 👋</p>
          <p className="text-xs text-fg-muted">{thaiDate()}</p>
        </div>
        <Link
          href="/settings"
          aria-label="ตั้งค่า"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-black transition-opacity hover:opacity-80"
        >
          {initial}
        </Link>
      </div>

      {/* Cashflow hero card */}
      <div className="glass relative overflow-hidden rounded-[var(--radius-card)] p-4">
        {/* Yellow accent line at top */}
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
        />

        <p className="text-xs text-fg-muted">กระแสเงินสด เดือนนี้</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight ${cashflowColor}`}>
          {cashflowSign}{fmt(netCashflow)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-positive/10 p-3">
            <p className="text-xs text-fg-muted">รายรับ</p>
            <p className="mt-0.5 text-sm font-semibold text-positive">+{fmt(totalIncome)}</p>
          </div>
          <div className="rounded-xl bg-negative/10 p-3">
            <p className="text-xs text-fg-muted">รายจ่าย</p>
            <p className="mt-0.5 text-sm font-semibold text-negative">-{fmt(totalExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
