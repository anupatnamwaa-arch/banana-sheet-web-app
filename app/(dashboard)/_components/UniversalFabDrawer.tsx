// app/(dashboard)/_components/UniversalFabDrawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { addTransaction, addCategory } from "@/app/actions/transactions";
import { getWallets } from "@/app/actions/wallets";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { RecurringKind, TransactionType, Wallet } from "@/lib/types";
import type { TransactionPayload } from "@/app/actions/transactions";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";

interface Props {
  categories: Array<{ id: string; name: string; type: string; icon: string | null }>;
  onClose: () => void;
  onSuccess: () => void;
}

function bangkokTodayStr(): string {
  const { year, month, day } = bangkokToday();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted focus:border-accent transition-colors";

const getFallbackIcon = (type: string, name: string) => {
  if (type === "income") return "💰";
  if (type === "savings") return "🐖";
  const lower = name.toLowerCase();
  if (lower.includes("food") || lower.includes("กิน") || lower.includes("อาหาร")) return "🍔";
  if (lower.includes("travel") || lower.includes("เที่ยว") || lower.includes("รถ") || lower.includes("เดินทาง")) return "🚗";
  if (lower.includes("shopping") || lower.includes("ช้อป") || lower.includes("ซื้อ")) return "🛍️";
  if (lower.includes("home") || lower.includes("บ้าน") || lower.includes("หอ")) return "🏠";
  if (lower.includes("health") || lower.includes("ยา") || lower.includes("หมอ")) return "🏥";
  if (lower.includes("game") || lower.includes("เกม")) return "🎮";
  return "💸";
};

export function UniversalFabDrawer({ categories, onClose, onSuccess }: Props) {
  const t = useT();
  const locale = useLocale();
  const [txType, setTxType] = useState<TransactionType>("expense"); // expense by default
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [walletId, setWalletId] = useState("");
  const [note, setNote] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [localCategories, setLocalCategories] = useState<Array<{ id: string; name: string; type: string; icon: string | null }>>(categories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Monthly recurrence states
  const [recurringKind, setRecurringKind] = useState<"one_time" | RecurringKind>("one_time");
  const [fcDayOfMonth, setFcDayOfMonth] = useState<number>(() => bangkokToday().day);
  const [fcEndDate, setFcEndDate] = useState("");

  // Keep localCategories in sync with categories prop updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalCategories(categories);
  }, [categories]);

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

    setLoading(true);
    setError(null);

    try {
      let finalCategoryId = categoryId;

      // Handle on-the-fly category creation if selected
      if (categoryId === "__new__") {
        if (!newCategoryName.trim()) {
          throw new Error(locale === "en" ? "Please enter a category name" : "กรุณาใส่ชื่อหมวดหมู่");
        }
        // Save new category to Supabase
        const newId = await addCategory(newCategoryName.trim(), txType);
        finalCategoryId = newId;

        // Optimistically update local categories so it persists in client state
        setLocalCategories((prev) => [
          ...prev,
          { id: newId, name: newCategoryName.trim(), type: txType, icon: null }
        ]);
      }

      const payload: TransactionPayload = {
        amount: num,
        type: txType,
        category_id: finalCategoryId || null,
        wallet_id: walletId || null,
        date: bangkokTodayStr(),
        note: note.trim() || null,
      };

      await addTransaction(
        payload,
        recurringKind === "one_time"
          ? undefined
          : {
          recurring_kind: recurringKind,
          day_of_month: fcDayOfMonth,
          end_date: fcEndDate || null,
        }
      );

      setSuccess(
        recurringKind !== "one_time"
          ? (locale === "en" ? "Added to history and recurring expenses successfully!" : "เพิ่มเข้าประวัติและรายจ่ายประจำเรียบร้อย")
          : (locale === "en" ? "Added to history successfully!" : "เพิ่มเข้าประวัติเรียบร้อย")
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setLoading(false);
    }
  }

  // Filter categories based on transaction type (or type = "shared")
  const filteredCategories = localCategories.filter(
    (c) => c.type === txType || c.type === "shared"
  );

  const getQuickAmounts = () => {
    if (txType === "expense") return [50, 100, 200, 500];
    if (txType === "income") return [500, 1000, 5000, 10000];
    return [500, 1000, 2000, 5000]; // savings
  };

  const handleQuickAmountClick = (val: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return String(current + val);
    });
  };

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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 max-w-md mx-auto border-t border-[var(--glass-border)]"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Handle */}
        <div className="mb-3 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-1.5 text-fg">
              <span>🍌</span>
              <span>{t.fab.title}</span>
            </h2>
            <p className="text-[11px] text-[var(--nana-muted)] mt-0.5 font-medium">
              {locale === "en" ? "Nana guidance: Log entries to update safe spend!" : "น้องกล้วยนำทาง: จดเลย เพื่อวิเคราะห์งบใช้วันนี้!"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            aria-label={t.common.close}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg)]/80 transition-colors"
          >
            <X size={16} className="text-fg-muted" />
          </button>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-4"
          >
            {/* Visual delight - floating bananas and sparkles */}
            <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-[var(--positive)]/15 border-2 border-[var(--positive)]/40 shadow-[0_0_24px_rgba(52,211,153,0.25)]">
              <motion.span 
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="text-4xl select-none"
              >
                🎉
              </motion.span>
              
              {/* Floating elements */}
              <motion.span
                animate={{ y: [-10, -25, -10], x: [-15, -30, -15], rotate: [0, -15, 0], opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute text-2xl select-none"
              >
                🍌
              </motion.span>
              <motion.span
                animate={{ y: [-15, -35, -15], x: [15, 30, 15], rotate: [0, 15, 0], opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut", delay: 0.3 }}
                className="absolute text-2xl select-none"
              >
                ✨
              </motion.span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-[var(--positive)]">
                {locale === "en" ? "Logged Successfully!" : "บันทึกรายการสำเร็จ!"}
              </h3>
              <p className="text-sm text-fg-muted max-w-[260px] mx-auto leading-relaxed">
                {success}
              </p>
            </div>

            <p className="text-[11px] text-[var(--nana-muted)] italic font-semibold pt-1">
              {locale === "en" ? "🍌 Nana is cheering for you!" : "🍌 กล้วยปริ่มใจที่คุณมีวินัยการเงิน!"}
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Type pills — expense default */}
            <div className="flex gap-2 bg-[var(--glass-bg)] border border-[var(--glass-border)] p-1 rounded-2xl">
              {(["expense", "income", "savings"] as TransactionType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                  setTxType(type);
                  if (type !== "expense" && recurringKind === "subscription") {
                    setRecurringKind("fixed_cost");
                  }
                    setCategoryId("");
                    setIsCreatingCategory(false);
                    setNewCategoryName("");
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all duration-200 ${
                    txType === type
                      ? "bg-accent text-black shadow-sm scale-[1.02]"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {type === "expense" ? t.fab.typeExpense : type === "income" ? t.fab.typeIncome : t.common.savings}
                </button>
              ))}
            </div>

            {/* Amount input with clear button */}
            <div className="space-y-1">
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder={t.fab.amountPlaceholder}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputClass} pr-10`}
                  required
                />
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full bg-fg-muted/20 hover:bg-fg-muted/40 transition-colors"
                    aria-label="Clear amount"
                  >
                    <X size={12} className="text-fg" />
                  </button>
                )}
              </div>

              {/* Quick Amount Pills */}
              <div className="flex gap-2 justify-between pt-0.5">
                {getQuickAmounts().map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmountClick(val)}
                    className="flex-1 text-center py-1.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)]/80 text-[11px] font-semibold text-fg/80 active:scale-95 transition-all duration-150"
                  >
                    +{locale === "en" ? `฿${val.toLocaleString()}` : `${val.toLocaleString()}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Picker (Visual Grid) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-fg-muted uppercase tracking-wider pl-1 flex justify-between items-center select-none">
                <span>{locale === "en" ? "Category" : "หมวดหมู่"}</span>
                {categoryId && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId("");
                      setIsCreatingCategory(false);
                    }}
                    className="text-[10px] text-accent font-semibold hover:underline"
                  >
                    {locale === "en" ? "Clear selection" : "ล้างหมวดหมู่"}
                  </button>
                )}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                {filteredCategories.map((c) => {
                  const isSelected = categoryId === c.id;
                  const emoji = c.icon || getFallbackIcon(txType, c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(c.id);
                        setIsCreatingCategory(false);
                      }}
                      className={`flex flex-col items-center shrink-0 w-[68px] py-2.5 rounded-2xl border transition-all duration-200 snap-start active:scale-95 ${
                        isSelected
                          ? "bg-accent/15 border-accent text-accent scale-[1.03] shadow-[0_4px_12px_rgba(250,204,21,0.15)]"
                          : "bg-[var(--bg-elevated)] border-[var(--glass-border)] text-fg-muted hover:text-fg"
                      }`}
                    >
                      <span className="text-xl mb-1 filter drop-shadow-sm select-none">{emoji}</span>
                      <span className="text-[10px] font-semibold text-center w-full px-1 truncate">{c.name}</span>
                    </button>
                  );
                })}

                {/* Custom category pill */}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId("__new__");
                    setIsCreatingCategory(true);
                  }}
                  className={`flex flex-col items-center shrink-0 w-[68px] py-2.5 rounded-2xl border transition-all duration-200 snap-start active:scale-95 ${
                    categoryId === "__new__"
                      ? "bg-accent/15 border-accent text-accent scale-[1.03] shadow-[0_4px_12px_rgba(250,204,21,0.15)]"
                      : "bg-[var(--bg-elevated)] border-[var(--glass-border)] text-fg-muted hover:text-fg"
                  }`}
                >
                  <span className="text-xl mb-1 font-bold select-none text-accent">+</span>
                  <span className="text-[10px] font-semibold text-center w-full px-1 truncate">
                    {locale === "en" ? "New" : "เพิ่มใหม่"}
                  </span>
                </button>
              </div>

              {/* Custom Category Input on-the-fly */}
              <AnimatePresence>
                {isCreatingCategory && (
                  <motion.input
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 4 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    type="text"
                    placeholder={locale === "en" ? "Enter new category name..." : "ใส่ชื่อหมวดหมู่ใหม่..."}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className={inputClass}
                    required
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Account / Wallet Selector */}
            {wallets.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-fg-muted uppercase tracking-wider pl-1 flex justify-between items-center select-none">
                  <span>{locale === "en" ? "Select Account" : "บัญชี / กระเป๋าเงิน"}</span>
                  {walletId && (
                    <button
                      type="button"
                      onClick={() => setWalletId("")}
                      className="text-[10px] text-accent font-semibold hover:underline"
                    >
                      {locale === "en" ? "Clear" : "ล้างบัญชี"}
                    </button>
                  )}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x snap-mandatory">
                  {wallets.map((w) => {
                    const isSelected = walletId === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWalletId(w.id)}
                        className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition-all duration-200 snap-start active:scale-95 ${
                          isSelected
                            ? "bg-accent/15 border-accent text-accent scale-[1.02] shadow-[0_4px_12px_rgba(250,204,21,0.1)]"
                            : "bg-[var(--bg-elevated)] border-[var(--glass-border)] text-fg-muted hover:text-fg"
                        }`}
                      >
                        <span className="text-sm select-none">{w.icon}</span>
                        <span className="truncate max-w-[100px]">{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  <label className="text-sm font-semibold select-none" htmlFor="fab-recurring-kind">
                    {t.fixedCosts.recurringType}
                  </label>
                  <select
                    id="fab-recurring-kind"
                    value={recurringKind}
                    onChange={(e) => setRecurringKind(e.target.value as "one_time" | RecurringKind)}
                    className={inputClass}
                  >
                    <option value="one_time">{t.fixedCosts.oneTime}</option>
                    <option value="fixed_cost">{t.fixedCosts.recurringExpense}</option>
                    {txType === "expense" && (
                      <option value="subscription">{t.fixedCosts.subscription}</option>
                    )}
                  </select>

                  <AnimatePresence>
                    {recurringKind !== "one_time" && (
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

            {error && <p className="text-xs text-negative font-semibold bg-negative/10 p-2.5 rounded-xl">⚠️ {error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent py-3 font-semibold text-black disabled:opacity-40 hover:opacity-90 active:scale-[0.99] transition-all duration-150 text-sm shadow-[0_4px_12px_var(--color-accent-shadow)]"
            >
              {loading ? t.fab.submitting : t.fab.submit}
            </button>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
