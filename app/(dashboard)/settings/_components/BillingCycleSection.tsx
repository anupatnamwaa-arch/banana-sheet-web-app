"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { saveBillingCycle } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";
import { format } from "@/lib/i18n";

interface Props {
  initialDay: number;
}

export function BillingCycleSection({ initialDay }: Props) {
  const t = useT();
  const [day, setDay] = useState(initialDay);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(selected: number) {
    if (selected === day) { setDrawerOpen(false); return; }
    startTransition(async () => {
      setError(null);
      try {
        const result = await saveBillingCycle(selected);
        setDay(result);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        setDrawerOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.settings.billingCycleError);
      }
    });
  }

  const dayLabel = format(t.settings.billingCycleDayTemplate, { n: day });

  return (
    <>
      {/* Settings row — tappable */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          📅
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t.settings.billingCycleDrawerTitle}</p>
        </div>
        {saved && <Check size={14} className="shrink-0 text-[var(--positive)]" />}
        {!saved && <span className="shrink-0 text-xs text-fg-muted">{dayLabel}</span>}
        {error && <span className="shrink-0 text-xs text-negative">{t.settings.billingCycleError}</span>}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
              </div>
              <p className="mb-4 text-base font-semibold">{t.settings.billingCycleDrawerTitle}</p>

              {/* 4-column grid of days 1–28 */}
              <div
                className={`grid grid-cols-4 gap-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`rounded-2xl py-3 text-sm font-medium transition-all ${
                      d === day
                        ? "bg-accent/10 text-accent border border-accent"
                        : "border border-[var(--glass-border)] text-fg-muted hover:text-fg"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {isPending && (
                <p className="mt-3 text-center text-xs text-fg-muted">{t.settings.billingCycleSaving}</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
