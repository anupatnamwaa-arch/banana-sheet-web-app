// app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { addTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { TransactionPayload } from "@/app/actions/transactions";
import type { TransactionType } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

export interface TransactionRow {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  date: string;
  note: string | null;
  categories: { name: string } | null;
  brands: { name: string; logo_url: string | null } | null;
}

interface Props {
  mode: "add" | "edit";
  transaction?: TransactionRow;
  categories: Array<{ id: string; name: string }>;
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
  const [deleting, setDeleting] = useState(false);

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
      if (mode === "add") await addTransaction(payload);
      else await updateTransaction(transaction!.id, payload);
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
                onClick={() => setType(entryType)}
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
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
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
