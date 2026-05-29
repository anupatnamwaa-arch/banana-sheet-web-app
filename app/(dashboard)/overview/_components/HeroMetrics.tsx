import { formatTHB } from "@/lib/format";
import type { OverviewData } from "@/app/actions/overview";

interface Props {
  data: Pick<OverviewData, "totalIncome" | "totalExpense" | "netCashFlow" | "netSaved" | "savingRate">;
}

function MetricCard({
  label,
  value,
  colour = "neutral",
}: {
  label: string;
  value: string;
  colour?: "neutral" | "positive" | "negative" | "warning";
}) {
  const valueColour = {
    neutral: "text-fg",
    positive: "text-[var(--positive)]",
    negative: "text-[var(--negative)]",
    warning: "text-amber-400",
  }[colour];

  return (
    <div className="glass p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueColour}`}>{value}</p>
    </div>
  );
}

function savingRateColour(rate: number | null): "positive" | "negative" | "warning" | "neutral" {
  if (rate === null) return "neutral";
  if (rate > 20) return "positive";
  if (rate >= 0) return "warning";
  return "negative";
}

function cashFlowColour(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function HeroMetrics({ data }: Props) {
  const { totalIncome, totalExpense, netCashFlow, savingRate } = data;

  return (
    <div className="space-y-3">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="รายรับ" value={formatTHB(totalIncome)} colour="positive" />
        <MetricCard label="รายจ่าย" value={formatTHB(totalExpense)} />
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="กระแสเงินสด"
          value={formatTHB(netCashFlow)}
          colour={cashFlowColour(netCashFlow)}
        />
        <MetricCard
          label="เงินออม"
          value={formatTHB(netCashFlow)}
          colour={cashFlowColour(netCashFlow)}
        />
      </div>
      {/* Row 3 — full width */}
      <MetricCard
        label="อัตราออม"
        value={savingRate !== null ? `${savingRate.toFixed(1)}%` : "—"}
        colour={savingRateColour(savingRate)}
      />
    </div>
  );
}
