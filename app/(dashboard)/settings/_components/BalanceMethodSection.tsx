"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveBalanceMethod } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

type Method = "net" | "gross" | "budget";

interface Props {
  initialMethod: Method;
}

export function BalanceMethodSection({ initialMethod }: Props) {
  const t = useT();
  const [method, setMethod] = useState<Method>(initialMethod);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Method) {
    if (next === method) return;
    startTransition(async () => {
      setError(null);
      try {
        await saveBalanceMethod(next);
        setMethod(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.settings.balanceMethodError);
      }
    });
  }

  const OPTIONS: { value: Method; label: string; desc: string }[] = [
    { value: "net",    label: t.settings.balanceMethodNet,    desc: t.settings.balanceMethodNetDesc },
    { value: "gross",  label: t.settings.balanceMethodGross,  desc: t.settings.balanceMethodGrossDesc },
    { value: "budget", label: t.settings.balanceMethodBudget, desc: t.settings.balanceMethodBudgetDesc },
  ];

  return (
    <div className={`px-4 py-3.5 space-y-3 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          ⚖️
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.balanceMethodTitle}</p>
        </div>
        {saved && <Check size={14} className="text-[var(--positive)]" />}
      </div>

      {error && <p className="text-xs text-[var(--negative)] px-1">{error}</p>}

      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={isPending}
            className={`w-full rounded-2xl border p-3 text-left transition-all ${
              method === opt.value
                ? "border-accent bg-accent/10"
                : "border-[var(--glass-border)]"
            }`}
          >
            <p className={`text-sm font-medium ${method === opt.value ? "text-accent" : "text-fg"}`}>
              {opt.label}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
