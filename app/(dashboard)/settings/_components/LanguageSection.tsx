"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n";

export function LanguageSection() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  const options: { value: Locale; label: string }[] = [
    { value: "th", label: "ไทย" },
    { value: "en", label: "English" },
  ];

  return (
    <div className={`px-4 py-3.5 ${isPending ? "opacity-60" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🌏
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.languageCurrency}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{t.settings.currencyLabel}: THB</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={isPending}
            className={`rounded-2xl border py-3 text-sm font-medium transition-all ${
              locale === opt.value
                ? "border-accent bg-accent/10 text-accent"
                : "border-[var(--glass-border)] text-fg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
