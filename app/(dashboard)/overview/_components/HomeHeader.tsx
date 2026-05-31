"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  displayName: string;
  monthLabel: string;
}

export function HomeHeader({ displayName, monthLabel }: Props) {
  const initial = displayName.charAt(0).toUpperCase();
  const t = useT();

  return (
    <div className="flex items-start justify-between pt-2">
      <div>
        <p className="text-lg font-bold">{t.overview.greeting}, {displayName} 👋</p>
        <p className="mt-0.5 text-xs text-fg-muted">{t.overview.monthSummary}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--glass-bg)] px-3 py-1 text-xs font-medium text-fg">
          {monthLabel}
        </span>
      </div>
      <Link
        href="/settings"
        aria-label={t.settings.title}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-black transition-opacity hover:opacity-80"
      >
        {initial}
      </Link>
    </div>
  );
}
