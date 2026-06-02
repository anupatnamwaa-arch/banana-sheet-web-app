// app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { addTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { TransactionPayload } from "@/app/actions/transactions";
import type { RecurringKind, TransactionType } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

export interface TransactionRow {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  date: string;
  note: string | null;
  categories: { name: string; icon?: string | null; color?: string | null } | null;
  brands: { name: string; logo_url: string | null } | null;
  fixed_cost_id?: string | null;
  recurring_kind?: RecurringKind | null;
}

interface Props {
  mode: "add" | "edit";
  transaction?: TransactionRow;
  categories: Array<{ id: string; name: string; icon?: string | null; color?: string | null }>;
  onClose: () => void;
  onSuccess: () => void;
}

function bangkokTodayStr(): string {
  const { year, month, day } = bangkokToday();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function TransactionFormDrawer({
  mode,
  transaction,
  categories,
  onClose,
  onSuccess,
}: Props) {
  const locale = useLocale();
  const t = useT();
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(transaction?.date?.slice(0, 10) ?? bangkokTodayStr());
  const [note, setNote] = useState(transaction?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Monthly recurrence states
  const [recurringKind, setRecurringKind] = useState<"one_time" | RecurringKind>(
    transaction?.recurring_kind ?? "one_time"
  );
  const [fcDayOfMonth, setFcDayOfMonth] = useState<number>(() => {
    if (transaction?.date) {
      const dayPart = transaction.date.slice(0, 10).split("-")[2];
      const dayNum = Number(dayPart);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        return dayNum;
      }
    }
    return bangkokToday().day;
  });
  const [fcEndDate, setFcEndDate] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError(t.fab.errorAmount); return; }
    if (!date) { setError(locale === "en" ? "Please select a date" : "กรุณาเลือกวันที่"); return; }

    setLoading(true); setError(null);
    const payload: TransactionPayload = {
      amount: num,
      type,
      category_id: categoryId || null,
      date,
      note: note.trim() || null,
    };

    try {
      const recurrence = recurringKind === "one_time"
        ? undefined
        : {
            recurring_kind: recurringKind,
            day_of_month: fcDayOfMonth,
            end_date: fcEndDate || null,
          };
      if (mode === "add") {
        await addTransaction(payload, recurrence);
      } else {
        await updateTransaction(transaction!.id, payload, recurrence);
      }
      setSuccess(
        recurringKind !== "one_time"
          ? (mode === "add"
              ? (locale === "en" ? "Added to history and recurring expenses successfully!" : "เพิ่มเข้าประวัติและรายจ่ายประจำเรียบร้อย")
              : (locale === "en" ? "Updated and added to recurring expenses successfully!" : "บันทึกการแก้ไขและเพิ่มเข้ารายจ่ายประจำเรียบร้อย"))
          : (mode === "add"
              ? (locale === "en" ? "Added to history successfully!" : "เพิ่มเข้าประวัติเรียบร้อย")
              : (locale === "en" ? "Updated successfully!" : "บันทึกการแก้ไขเรียบร้อย"))
      );
      await new Promise((resolve) => setTimeout(resolve, 1200));
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true); setError(null);
    try {
      await deleteTransaction(transaction.id);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!loading && !deleting) onClose(); }}
      />
      <motion.div
        key="drawer"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Handle + header */}
        <div className="mb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "add" ? t.fab.title : locale === "en" ? "Edit entry" : "แก้ไขรายการ"}
          </h2>
          <button onClick={() => { if (!loading && !deleting) onClose(); }} disabled={loading || deleting}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["expense", "income", "savings"] as TransactionType[]).map((entryType) => (
              <button
                key={entryType}
                type="button"
                onClick={() => {
                  setType(entryType);
                  if (entryType !== "expense" && recurringKind === "subscription") {
                    setRecurringKind("fixed_cost");
                  }
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  type === entryType ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {entryType === "expense" ? t.common.expense : entryType === "income" ? t.common.income : t.common.savings}
              </button>
            ))}
          </div>

          {/* Amount */}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder={t.fab.amountPlaceholder}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
            required
          />

          {/* Category */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t.fab.categoryOptional}</option>
            {categories.map((c) => {
              let prefix = "";
              if (c.icon) {
                if (c.icon.startsWith("ph:") || c.icon.startsWith("lucide:")) {
                  prefix = "🔹 ";
                } else {
                  prefix = `${c.icon} `;
                }
              }
              return (
                <option key={c.id} value={c.id}>
                  {prefix}{c.name}
                </option>
              );
            })}
          </select>

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />

          {/* Note */}
          <input
            type="text"
            placeholder={t.fab.notePlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />

          {/* Monthly recurrence choice */}
          <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)]/50 p-3 space-y-2">
            <label className="text-sm font-semibold select-none" htmlFor="analytics-recurring-kind">
              {t.fixedCosts.recurringType}
            </label>
            <select
              id="analytics-recurring-kind"
              value={recurringKind}
              onChange={(e) => setRecurringKind(e.target.value as "one_time" | RecurringKind)}
              disabled={Boolean(transaction?.fixed_cost_id)}
              className={inputClass}
            >
              <option value="one_time">{t.fixedCosts.oneTime}</option>
              <option value="fixed_cost">{t.fixedCosts.recurringExpense}</option>
              {type === "expense" && (
                <option value="subscription">{t.fixedCosts.subscription}</option>
              )}
            </select>

            <AnimatePresence>
              {recurringKind !== "one_time" && !transaction?.fixed_cost_id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-2 pt-2 border-t border-[var(--glass-border)]/50 overflow-hidden"
                >
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-fg-muted uppercase">
                      {t.fixedCosts.dayOfMonth}
                    </label>
                    <select
                      value={fcDayOfMonth}
                      onChange={(e) => setFcDayOfMonth(Number(e.target.value))}
                      className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold text-fg-muted uppercase">
                      {t.fixedCosts.endDate}
                    </label>
                    <input
                      type="date"
                      value={fcEndDate}
                      onChange={(e) => setFcEndDate(e.target.value)}
                      className="w-full rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {success && (
            <div className="flex gap-2 rounded-xl bg-[var(--positive)]/10 p-3 text-sm text-[var(--positive)] font-semibold">
              ✨ {success}
            </div>
          )}

          {error && (
            <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-sm text-[var(--negative)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || deleting}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {loading ? t.fab.submitting : mode === "add" ? t.common.save : locale === "en" ? "Update" : "อัปเดต"}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--negative)]/40 py-3 text-sm font-medium text-[var(--negative)] disabled:opacity-40"
            >
              <Trash2 size={16} />
              {deleting ? t.common.loading : t.common.delete}
            </button>
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
