"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/app/actions/locale";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

export function LanguageSection() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeLocale(nextLocale: "th" | "en") {
    if (nextLocale === locale) return;
    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
        🌏
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t.settings.language}</p>
        <p className="text-xs text-fg-muted">{t.settings.currencyLabel}: THB</p>
      </div>
      <div className="flex rounded-xl bg-[var(--glass-bg)] p-1" aria-label={t.settings.language}>
        {(["th", "en"] as const).map((value) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            onClick={() => changeLocale(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              locale === value ? "bg-accent text-black" : "text-fg-muted"
            }`}
          >
            {value === "th" ? "ไทย" : "EN"}
          </button>
        ))}
      </div>
    </div>
  );
}
