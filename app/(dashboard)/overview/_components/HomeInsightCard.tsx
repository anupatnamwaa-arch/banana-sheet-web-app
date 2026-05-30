interface Props {
  insight: string | null;
}

export function HomeInsightCard({ insight }: Props) {
  if (!insight) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <span className="mt-0.5 shrink-0 text-xl">✨</span>
      <div>
        <p className="text-xs font-semibold text-accent">ข้อสังเกต</p>
        <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{insight}</p>
      </div>
    </div>
  );
}
