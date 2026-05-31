"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { addGoal, updateGoal, deleteGoal, type GoalPayload } from "@/app/actions/goals";
import type { Goal } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  mode: "add" | "edit";
  goal?: Goal;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoalFormDrawer({ mode, goal, onClose, onSuccess }: Props) {
  const dict = useT();
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : "");
  const [current, setCurrent] = useState(goal ? String(goal.current_amount) : "");
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = loading || deleting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(dict.wealth.errorGoalName); return; }
    const t = parseFloat(target);
    if (!t || t <= 0) { setError(dict.wealth.errorGoalTarget); return; }
    const c = parseFloat(current) || 0;
    if (c < 0) { setError(dict.wealth.errorGoalNegative); return; }

    setLoading(true); setError(null);
    const payload: GoalPayload = {
      name: name.trim(),
      target_amount: t,
      current_amount: c,
      target_date: targetDate || null,
    };
    try {
      if (mode === "add") await addGoal(payload);
      else await updateGoal(goal!.id, payload);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : dict.common.error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    setDeleting(true); setError(null);
    try {
      await deleteGoal(goal.id);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : dict.common.error);
      setDeleting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!busy) onClose(); }}
      />
      <motion.div
        key="drawer"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="mb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "add" ? dict.wealth.addGoal : dict.wealth.editGoal}
          </h2>
          <button onClick={() => { if (!busy) onClose(); }} disabled={busy}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder={dict.wealth.goalNamePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-fg-muted">{dict.wealth.savedSoFar}</label>
              <input
                type="number" inputMode="decimal" min="0" step="any"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-fg-muted">{dict.wealth.goalTarget}</label>
              <input
                type="number" inputMode="decimal" min="0" step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">{dict.wealth.goalTargetDate}</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-sm text-[var(--negative)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {loading ? dict.common.loading : mode === "add" ? dict.common.save : dict.wealth.update}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--negative)]/40 py-3 text-sm font-medium text-[var(--negative)] disabled:opacity-40"
            >
              <Trash2 size={16} />
              {deleting ? dict.common.loading : dict.common.delete}
            </button>
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
