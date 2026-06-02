// app/(dashboard)/settings/_components/FixedCostSettingsDrawer.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Edit2, AlertTriangle, Loader2, Check } from "lucide-react";
import { useT, useLocale } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { getFixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } from "@/app/actions/fixed-costs";
import { getWallets } from "@/app/actions/wallets";
import type { FixedCost, RecurringKind, Wallet } from "@/lib/types";
import { formatTHB } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";
import { CategoryIcon } from "@/app/(dashboard)/analytics/_components/category-icon";

interface Props {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  type: string;
}

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none focus:border-accent";

export function FixedCostSettingsDrawer({ userId, isOpen, onClose }: Props) {
  const t = useT();
  const locale = useLocale();
  const supabase = useMemo(() => createClient(), []);

  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingFc, setEditingFc] = useState<FixedCost | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense" | "savings">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [walletId, setWalletId] = useState("");
  const [recurringKind, setRecurringKind] = useState<RecurringKind>("fixed_cost");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [autoLog, setAutoLog] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all necessary data
  const loadData = async () => {
    setLoading(true);
    try {
      const [fcData, walletData, catData] = await Promise.all([
        getFixedCosts(userId),
        getWallets(),
        supabase
          .from("categories")
          .select("id, name, icon, color, type")
          .eq("user_id", userId)
          .order("name"),
      ]);
      setFixedCosts(fcData);
      setWallets(walletData);
      setCategories((catData.data || []) as Category[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
      resetForm();
    }
  }, [isOpen]);

  function resetForm() {
    const { year, month, day } = bangkokToday();
    const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setNote("");
    setAmount("");
    setType("expense");
    setCategoryId("");
    setWalletId("");
    setRecurringKind("fixed_cost");
    setDayOfMonth(day);
    setAutoLog(true);
    setStartDate(todayStr);
    setEndDate("");
    setEditingFc(null);
    setShowForm(false);
    setError(null);
  }

  function handleEditFc(fc: FixedCost) {
    setEditingFc(fc);
    setNote(fc.note || "");
    setAmount(String(fc.amount));
    setType(fc.type);
    setCategoryId(fc.category_id || "");
    setWalletId(fc.wallet_id || "");
    setRecurringKind(fc.recurring_kind ?? "fixed_cost");
    setDayOfMonth(fc.day_of_month);
    setAutoLog(fc.auto_log);
    setStartDate(fc.start_date);
    setEndDate(fc.end_date || "");
    setShowForm(true);
    setError(null);
  }

  async function handleSave() {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t.fab.errorAmount);
      return;
    }
    if (!startDate) {
      setError(locale === "en" ? "Start date is required" : "กรุณาใส่วันที่เริ่มต้น");
      return;
    }
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      setError(locale === "en" ? "Day of month must be between 1 and 31" : "วันที่ต้องอยู่ระหว่าง 1 ถึง 31");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      amount: parsedAmount,
      type,
      category_id: categoryId || null,
      wallet_id: walletId || null,
      recurring_kind: recurringKind,
      note: note.trim() || null,
      day_of_month: dayOfMonth,
      auto_log: autoLog,
      start_date: startDate,
      end_date: endDate || null,
    };

    try {
      if (editingFc) {
        await updateFixedCost(editingFc.id, payload);
      } else {
        await addFixedCost(payload);
      }
      await loadData();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error saving fixed cost");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingFc) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteFixedCost(editingFc.id);
      await loadData();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error deleting fixed cost");
    } finally {
      setDeleting(false);
    }
  }

  // Filter categories based on selected flow type
  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === "shared"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!saving && !deleting) onClose();
            }}
          />

          {/* Slide up Drawer */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Slide handle */}
            <div className="mb-3 flex justify-center">
              <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
            </div>

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {showForm
                  ? editingFc
                    ? t.fixedCosts.editButton
                    : t.fixedCosts.addButton
                  : t.fixedCosts.title}
              </h2>
              <button
                onClick={() => {
                  if (showForm) {
                    resetForm();
                  } else {
                    onClose();
                  }
                }}
                disabled={saving || deleting}
                className="text-fg-muted hover:text-fg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-4 flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative animate-shake">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* STAGE 1: Recurring List */}
            {!showForm && (
              <div className="space-y-4">
                <p className="text-xs text-fg-muted">
                  {t.fixedCosts.subtitle}
                </p>

                {loading ? (
                  <div className="py-12 text-center text-sm text-fg-muted flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>{t.common.loading}</span>
                  </div>
                ) : fixedCosts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-fg-muted bg-[var(--bg)] border border-dashed border-[var(--glass-border)] rounded-2xl p-6">
                    <p className="text-2xl">📅</p>
                    <p className="mt-2 font-medium">{t.fixedCosts.noFixedCosts}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fixedCosts.map((fc) => {
                      const cat = categories.find((c) => c.id === fc.category_id);
                      const w = wallets.find((wal) => wal.id === fc.wallet_id);
                      const isExpense = fc.type === "expense";
                      const isIncome = fc.type === "income";

                      return (
                        <div
                          key={fc.id}
                          className="flex items-center gap-3 rounded-2xl bg-[var(--bg)] border border-[var(--glass-border)]/50 p-4 shadow-sm"
                        >
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                            style={{
                              background: cat?.color
                                ? `color-mix(in srgb, ${cat.color} 18%, transparent)`
                                : isExpense
                                ? "var(--negative-alpha)"
                                : isIncome
                                ? "var(--positive-alpha)"
                                : "rgba(56, 189, 248, 0.18)",
                            }}
                          >
                            <CategoryIcon
                              name={cat?.name || fc.type}
                              emoji={cat?.icon}
                              size={18}
                              style={{ color: cat?.color || undefined }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-fg">
                              {fc.note || cat?.name || (isExpense ? t.fab.typeExpense : isIncome ? t.fab.typeIncome : t.common.savings)}
                            </p>
                            <p className="text-xs text-fg-muted mt-0.5">
                              {t.fixedCosts.everyMonthOn.replace("{day}", String(fc.day_of_month))}
                              {w && ` • ${w.icon} ${w.name}`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`font-mono text-sm font-bold ${
                                isExpense
                                  ? "text-negative"
                                  : isIncome
                                  ? "text-positive"
                                  : "text-blue-400"
                              }`}
                            >
                              {isExpense ? "-" : isIncome ? "+" : ""}
                              {formatTHB(fc.amount)}
                            </p>
                            {fc.auto_log && (
                              <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold mt-1">
                                {locale === "en" ? "Auto" : "ออโต้"}
                              </span>
                            )}
                            {fc.recurring_kind === "subscription" && (
                              <span className="ml-1 inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold mt-1">
                                {t.fixedCosts.subscription}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEditFc(fc)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all text-accent border border-[var(--glass-border)]/20 shrink-0"
                          >
                            <Edit2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-md"
                >
                  <Plus size={16} />
                  {t.fixedCosts.addButton}
                </button>
              </div>
            )}

            {/* STAGE 2: Add/Edit Form */}
            {showForm && (
              <div className="space-y-4">
                {/* Type Pill Toggle */}
                <div className="flex gap-2">
                  {(["expense", "income", "savings"] as const).map((entryType) => (
                    <button
                      key={entryType}
                      type="button"
                      onClick={() => {
                        setType(entryType);
                        if (entryType !== "expense" && recurringKind === "subscription") {
                          setRecurringKind("fixed_cost");
                        }
                        setCategoryId("");
                      }}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
                        type === entryType
                          ? "bg-accent text-black font-bold"
                          : "border border-[var(--glass-border)] text-fg-muted"
                      }`}
                    >
                      {entryType === "expense"
                        ? t.common.expense
                        : entryType === "income"
                        ? t.common.income
                        : t.common.savings}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Amount (฿)" : "จำนวนเงิน (฿)"}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Recurring kind */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {t.fixedCosts.recurringType}
                  </label>
                  <select
                    value={recurringKind}
                    onChange={(e) => setRecurringKind(e.target.value as RecurringKind)}
                    className={inputClass}
                  >
                    <option value="fixed_cost">{t.fixedCosts.recurringExpense}</option>
                    {type === "expense" && (
                      <option value="subscription">{t.fixedCosts.subscription}</option>
                    )}
                  </select>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {locale === "en" ? "Category (Optional)" : "หมวดหมู่ (ไม่บังคับ)"}
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{t.fab.categoryOptional}</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon ? `${c.icon} ` : ""}
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Wallet / Account Dropdown */}
                {wallets.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                      {locale === "en" ? "Account / Wallet (Optional)" : "กระเป๋าเงิน / บัญชี (ไม่บังคับ)"}
                    </label>
                    <select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">
                        {locale === "en" ? "— Select Account —" : "— เลือกบัญชี —"}
                      </option>
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.icon} {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Day of Month Selector */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {t.fixedCosts.dayOfMonth}
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className={inputClass}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto Log Toggle */}
                <div className="flex items-center justify-between rounded-xl bg-[var(--bg)] border border-[var(--glass-border)]/50 p-3.5">
                  <div className="pr-4">
                    <p className="text-sm font-semibold">{t.fixedCosts.autoLog}</p>
                    <p className="text-[11px] text-fg-muted mt-0.5">{t.fixedCosts.autoLogDesc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoLog(!autoLog)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      autoLog ? "bg-accent" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                        autoLog ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Start Date */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {t.fixedCosts.startDate}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {t.fixedCosts.endDate}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-fg-muted uppercase">
                    {t.fab.notePlaceholder}
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    placeholder={t.fab.notePlaceholder}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Save Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || deleting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-semibold text-black hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer shadow-md"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    {saving ? t.common.loading : locale === "en" ? "Save Fixed Cost" : "บันทึกรายจ่ายประจำ"}
                  </button>

                  {/* Delete button (Edit mode only) */}
                  {editingFc && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={saving || deleting}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-negative bg-negative/5 py-3 text-sm font-semibold text-negative hover:bg-negative/10 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {deleting && <Loader2 size={16} className="animate-spin" />}
                        {deleting ? locale === "en" ? "Deleting..." : "กำลังลบ..." : t.fixedCosts.deleteButton}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
