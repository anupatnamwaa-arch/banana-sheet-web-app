// app/(dashboard)/wealth/_components/NetWorthCard.tsx
import { formatTHB } from "@/lib/format";

interface Props {
  data: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  } | null; // null = free placeholder
}

const PLACEHOLDER = { netWorth: 605000, totalAssets: 650000, totalLiabilities: 45000 };

export function NetWorthCard({ data }: Props) {
  const d = data ?? PLACEHOLDER;
  const positive = d.netWorth >= 0;

  return (
    <div className="glass p-5">
      <p className="text-xs font-medium text-fg-muted">มูลค่าสุทธิ (Net Worth)</p>
      <p
        className="mt-1 text-3xl font-bold tabular-nums"
        style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
      >
        {formatTHB(d.netWorth)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-fg-muted">รวมสินทรัพย์</p>
          <p className="mt-0.5 font-medium tabular-nums text-[var(--positive)]">
            {formatTHB(d.totalAssets)}
          </p>
        </div>
        <div>
          <p className="text-fg-muted">รวมหนี้สิน</p>
          <p className="mt-0.5 font-medium tabular-nums text-[var(--negative)]">
            {formatTHB(d.totalLiabilities)}
          </p>
        </div>
      </div>
    </div>
  );
}
