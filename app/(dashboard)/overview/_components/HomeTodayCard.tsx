interface Props {
  todayExpense: number;
  todayCount: number;
  avgDailyExpense: number;
}

function fmt(n: number) {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

export function HomeTodayCard({ todayExpense, todayCount, avgDailyExpense }: Props) {
  const diff = todayExpense - avgDailyExpense;
  const absDiff = Math.abs(Math.round(diff));
  const compText =
    avgDailyExpense > 0
      ? diff <= 0
        ? `น้อยกว่าค่าเฉลี่ยรายวัน ${fmt(absDiff)}`
        : `มากกว่าค่าเฉลี่ยรายวัน ${fmt(absDiff)}`
      : null;
  const compColor = diff <= 0 ? "text-positive" : "text-negative";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">วันนี้ใช้ไป</p>
        <span className="text-lg">📅</span>
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums text-negative">{fmt(todayExpense)}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{todayCount} รายการ</p>
      {compText && <p className={`mt-1 text-xs font-medium ${compColor}`}>{compText}</p>}
    </div>
  );
}
