import { ChevronRight } from "lucide-react";

interface Props {
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  value?: string;
  badge?: string;
  danger?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
  /** Right-side slot — replaces chevron (e.g. a toggle switch). */
  right?: React.ReactNode;
}

export function SettingsRow({
  icon, label, sublabel, value, badge, danger, comingSoon, onClick, right,
}: Props) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
        onClick ? "hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg)]" : ""
      }`}
    >
      {icon && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? "text-negative" : "text-fg"}`}>{label}</p>
        {sublabel && <p className="mt-0.5 text-xs text-fg-muted">{sublabel}</p>}
      </div>

      {comingSoon && (
        <span className="shrink-0 rounded-full bg-[var(--glass-bg)] px-2 py-0.5 text-[10px] text-fg-muted">
          เร็ว ๆ นี้
        </span>
      )}
      {badge && !comingSoon && (
        <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium text-accent">
          {badge}
        </span>
      )}
      {value && (
        <span className="shrink-0 text-xs text-fg-muted">{value}</span>
      )}
      {right}
      {onClick && !right && (
        <ChevronRight size={16} className="shrink-0 text-fg-muted" />
      )}
    </Tag>
  );
}
