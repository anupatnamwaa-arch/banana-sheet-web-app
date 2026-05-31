interface Props {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: Props) {
  return (
    <div>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </p>
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
        <div className="divide-y divide-[var(--glass-border)]">{children}</div>
      </div>
    </div>
  );
}
