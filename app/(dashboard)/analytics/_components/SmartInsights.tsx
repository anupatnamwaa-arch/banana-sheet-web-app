interface Props {
  insights: string[];
}

export function SmartInsights({ insights }: Props) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-1 text-sm font-semibold">ข้อสังเกต</p>
      {insights.map((text, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4"
        >
          <span className="mt-0.5 shrink-0 text-lg">✨</span>
          <p className="text-sm leading-relaxed text-fg-muted">{text}</p>
        </div>
      ))}
    </div>
  );
}
