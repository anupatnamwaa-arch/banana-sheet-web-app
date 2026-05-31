// app/(dashboard)/_components/UniversalFabDrawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { addTransaction } from "@/app/actions/transactions";
import { getWallets } from "@/app/actions/wallets";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { TransactionType, Wallet } from "@/lib/types";
import type { TransactionPayload } from "@/app/actions/transactions";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";

interface Props {
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

function bangkokTodayStr(): string {
  const { year, month, day } = bangkokToday();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted";

export function UniversalFabDrawer({ categories, onClose, onSuccess }: Props) {
  const t = useT();
  const locale = useLocale();
  const [txType, setTxType] = useState<TransactionType>("expense"); // expense by default
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallets on mount
  useEffect(() => {
    getWallets().then((data) => {
      setWallets(data);
      // Pre-select first wallet if available
      if (data.length > 0) {
        setWalletId(data[0].id);
      }
    }).catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError(t.fab.errorAmount); return; }
    setLoading(true); setError(null);
    const payload: TransactionPayload = {
      amount: num,
      type: txType,
      category_id: categoryId || null,
      wallet_id: walletId || null,
      date: bangkokTodayStr(),
      note: note.trim() || null,
    };
    try {
      await addTransaction(payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="mb-3 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.fab.title}</h2>
          <button onClick={onClose} aria-label={t.common.close}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type pills — expense default */}
          <div className="flex gap-2">
            {(["expense", "income", "savings"] as TransactionType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setTxType(type);
                  if (type === "savings") setCategoryId("");
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  txType === type
                    ? "bg-accent text-black"
                    : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {type === "expense" ? t.fab.typeExpense : type === "income" ? t.fab.typeIncome : t.common.savings}
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
          {txType !== "savings" && (
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
          )}

          {/* Wallet / Account Selector */}
          {wallets.length > 0 && (
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className={inputClass}
            >
              <option value="">
                {locale === "en" ? "— Select Account (optional) —" : "— เลือกกระเป๋าเงิน / บัญชี (ไม่บังคับ) —"}
              </option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </select>
          )}

          {/* Note */}
          <input
            type="text"
            placeholder={t.fab.notePlaceholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-3 font-semibold text-black disabled:opacity-40"
          >
            {loading ? t.fab.submitting : t.fab.submit}
          </button>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
