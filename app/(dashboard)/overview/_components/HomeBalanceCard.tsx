interface Props {
  remaining: number;
  daysRemaining: number;
}

function fmt(n: number) {
  return `฿${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function statusText(
  remaining: number,
  daysRemaining: number
): { text: string; color: string } {
  if (remaining < 0) return { text: "เกินแผนแล้ว ควรระวัง ⚠️", color: "text-negative" };
  if (remaining === 0) return { text: "ใช้ครบแผนพอดี", color: "text-amber-400" };
  if (daysRemaining === 0) return { text: "สิ้นเดือนแล้ว ทำได้ดี 🎉", color: "text-positive" };
  return { text: "ยังอยู่ในแผน ใช้จ่ายได้สบาย ๆ", color: "text-positive" };
}

export function HomeBalanceCard({ remaining, daysRemaining }: Props) {
  const dailyAvg = daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;
  const { text, color } = statusText(remaining, daysRemaining);
  const isNegative = remaining < 0;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5">
      {/* Accent line */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "linear-gradient(90deg,var(--accent),transparent)" }}
      />

      <p className="text-xs text-fg-muted">เงินคงเหลือใช้เดือนนี้</p>
      <p
        className={`mt-1 text-4xl font-bold tracking-tight tabular-nums ${
          isNegative ? "text-negative" : "text-fg"
        }`}
      >
        {isNegative ? "-" : ""}
        {fmt(remaining)}
      </p>

      {daysRemaining > 0 && dailyAvg > 0 && (
        <p className="mt-1 text-xs text-fg-muted">เฉลี่ยใช้ได้วันละ {fmt(dailyAvg)}</p>
      )}

      <p className={`mt-2 text-xs font-medium ${color}`}>{text}</p>
    </div>
  );
}
