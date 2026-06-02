"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveBalanceMethod, saveCarryoverEnabled } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

type Method = "net" | "gross" | "budget";

interface Props {
  initialMethod: Method;
  initialCarryover: boolean;
}

export function BalanceMethodSection({ initialMethod, initialCarryover }: Props) {
  const t = useT();
  const [method, setMethod] = useState<Method>(initialMethod);
  const [carryover, setCarryover] = useState(initialCarryover);
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

  function handleCarryoverToggle() {
    const next = !carryover;
    startTransition(async () => {
      setError(null);
      try {
        await saveCarryoverEnabled(next);
        setCarryover(next);
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

      {/* Carryover toggle — only relevant for net and gross methods */}
      {method !== "budget" && (
        <button
          type="button"
          onClick={handleCarryoverToggle}
          disabled={isPending}
          className={`w-full rounded-2xl border p-3 text-left transition-all ${
            carryover ? "border-accent bg-accent/10" : "border-[var(--glass-border)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-sm font-medium ${carryover ? "text-accent" : "text-fg"}`}>
              {t.settings.carryoverTitle}
            </p>
            <span
              className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                carryover ? "bg-accent" : "bg-[var(--glass-border)]"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  carryover ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">{t.settings.carryoverDesc}</p>
        </button>
      )}
    </div>
  );
}
