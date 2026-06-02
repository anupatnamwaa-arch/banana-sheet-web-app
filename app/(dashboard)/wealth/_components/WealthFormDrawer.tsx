// app/(dashboard)/wealth/_components/WealthFormDrawer.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle, Droplet } from "lucide-react";
import { addWealthWithHistory, updateWealthWithHistory, deleteWealth } from "@/app/actions/wealth";
import type { WealthPayload, HistoricalSnapshotPayload } from "@/app/actions/wealth";
import type { WealthType } from "@/lib/types";
import { useT } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { bangkokToday } from "@/app/actions/overview-utils";

export interface WealthRow {
  id: string;
  name: string;
  type: WealthType;
  value: number;
  is_liquid: boolean;
  monthly_payment?: number | null;
  due_date?: string | null;
}

interface Props {
  mode: "add" | "edit";
  item?: WealthRow;
  initialType?: WealthType; // preselect asset/liability in add mode
  onClose: () => void;
  onSuccess: () => void;
}

// Generate Bangkok months from 2024-01 up to the current Bangkok month
function generateMonthsList(): string[] {
  const { year, month } = bangkokToday();
  const list: string[] = [];
  let cy = 2024;
  let cm = 1;
  while (cy < year || (cy === year && cm <= month)) {
    list.push(`${cy}-${String(cm).padStart(2, "0")}`);
    cm++;
    if (cm > 12) {
      cm = 1;
      cy++;
    }
  }
  return list.reverse(); // Show most recent month first
}

export function WealthFormDrawer({ mode, item, initialType, onClose, onSuccess }: Props) {
  const t = useT();
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<WealthType>(item?.type ?? initialType ?? "asset");
  const [value, setValue] = useState(item ? String(item.value) : "");
  const [isLiquid, setIsLiquid] = useState(item?.is_liquid ?? true);
  const [monthlyPayment, setMonthlyPayment] = useState(
    item?.monthly_payment != null ? String(item.monthly_payment) : ""
  );
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Historical values state: [{ month: "YYYY-MM", value: "123.45" }]
  const [history, setHistory] = useState<Array<{ month: string; value: string }>>(() => {
    if (mode === "edit") return [];
    const { year, month } = bangkokToday();
    return [{ month: `${year}-${String(month).padStart(2, "0")}`, value: "" }];
  });
  const [fetchingHistory, setFetchingHistory] = useState(mode === "edit" && !!item);

  // Fetch historical values on edit mode mount
  useEffect(() => {
    if (mode !== "edit" || !item) return;
    const supabase = createClient();
    supabase
      .from("wealth_item_snapshots")
      .select("month, value")
      .eq("item_id", item.id)
      .order("month", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setHistory(
            data.map((h) => ({
              month: h.month,
              value: String(h.value),
            }))
          );
        }
        setFetchingHistory(false);
      });
  }, [mode, item]);

  function syncValueToCurrentMonth(val: string) {
    const { year, month } = bangkokToday();
    const currentMonthKey = `${year}-${String(month).padStart(2, "0")}`;
    setHistory((prev) => {
      const idx = prev.findIndex((h) => h.month === currentMonthKey);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: val };
      return next;
    });
  }

  function formatMonthKey(ym: string): string {
    const [y, m] = ym.split("-").map(Number);
    const shortMonths = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    const isTh = t.calendar.yearOffset === 543;
    return isTh
      ? `${shortMonths[m - 1]} ${y + 543}`
      : `${new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "short" })} ${y}`;
  }

  function handleHistoryValueChange(index: number, val: string) {
    setHistory((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], value: val };
      
      // If updating the current month, sync back to main value
      const { year, month } = bangkokToday();
      const currentMonthKey = `${year}-${String(month).padStart(2, "0")}`;
      if (next[index].month === currentMonthKey) {
        setValue(val);
      }
      
      return next;
    });
  }

  function handleAddMonth() {
    const list = generateMonthsList();
    const usedMonths = new Set(history.map((h) => h.month));
    const firstAvailable = list.find((m) => !usedMonths.has(m));
    if (!firstAvailable) return; // All months are filled

    setHistory((prev) => [...prev, { month: firstAvailable, value: "" }].sort((a, b) => b.month.localeCompare(a.month)));
  }

  function handleMonthSelect(index: number, newMonth: string) {
    setHistory((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], month: newMonth };
      return next.sort((a, b) => b.month.localeCompare(a.month));
    });
  }

  function handleRemoveMonth(index: number) {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError(t.wealth.errorName); return; }
    const num = parseFloat(value);
    if (!num || num <= 0) { setError(t.wealth.errorValue); return; }

    setLoading(true); setError(null);
    const mp = parseFloat(monthlyPayment);
    const payload: WealthPayload = {
      name: name.trim(),
      type,
      value: num,
      is_liquid: type === "asset" ? isLiquid : false,
      monthly_payment: type === "liability" && mp > 0 ? mp : null,
      due_date: type === "liability" && dueDate ? dueDate : null,
    };

    // Filter and build history list
    const historyPayload: HistoricalSnapshotPayload[] = history
      .map((h) => ({
        month: h.month,
        value: parseFloat(h.value),
      }))
      .filter((h) => !isNaN(h.value) && h.value >= 0);

    try {
      if (mode === "add") {
        await addWealthWithHistory(payload, historyPayload);
      } else {
        await updateWealthWithHistory(item!.id, payload, historyPayload);
      }
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setDeleting(true); setError(null);
    try {
      await deleteWealth(item.id);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.error);
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted";
  const busy = loading || deleting;

  const allAvailableMonths = generateMonthsList();

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
            {mode === "add" ? t.wealth.addEntry : t.wealth.editEntry}
          </h2>
          <button onClick={() => { if (!busy) onClose(); }} disabled={busy}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pb-4 pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["asset", "liability"] as WealthType[]).map((entryType) => (
              <button
                key={entryType}
                type="button"
                onClick={() => setType(entryType)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  type === entryType ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {entryType === "asset" ? t.wealth.assets : t.wealth.liabilities}
              </button>
            ))}
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder={t.wealth.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />

          {/* Current Value */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-fg-muted">ยอดปัจจุบัน (Current Value)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={t.wealth.valuePlaceholder}
              value={value}
              onChange={(e) => { setValue(e.target.value); syncValueToCurrentMonth(e.target.value); }}
              className={inputClass}
              required
            />
          </div>

          {/* Liquid toggle — assets only */}
          {type === "asset" && (
            <button
              type="button"
              onClick={() => setIsLiquid((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--glass-border)] px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Droplet size={16} className={isLiquid ? "text-sky-400" : "text-fg-muted"} />
                {t.wealth.liquidAssetLabel}
              </span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isLiquid ? "bg-accent" : "bg-[var(--glass-border)]"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isLiquid ? "translate-x-4" : ""}`} />
              </span>
            </button>
          )}
          {type === "asset" && (
            <p className="-mt-2 text-xs text-fg-muted">{t.wealth.liquidAssetHint}</p>
          )}

          {/* Debt details — liabilities only */}
          {type === "liability" && (
            <>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder={t.wealth.monthlyPaymentPlaceholder}
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className={inputClass}
              />
              <div>
                <label className="mb-1 block text-xs text-fg-muted">{t.wealth.dueDateLabel}</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Monthly History Section */}
          <div className="border-t border-[var(--glass-border)] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">ประวัติยอดเงินรายเดือน (Monthly History)</h3>
              <button
                type="button"
                onClick={handleAddMonth}
                className="text-xs text-accent font-semibold"
              >
                + เพิ่มเดือนย้อนหลัง
              </button>
            </div>
            
            {fetchingHistory ? (
              <p className="text-xs text-fg-muted text-center py-2">{t.common.loading}</p>
            ) : (
              <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                {history.map((h, index) => {
                  const usedMonths = new Set(history.map((x) => x.month));
                  const unUsedMonths = allAvailableMonths.filter((m) => !usedMonths.has(m) || m === h.month);
                  
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={h.month}
                        onChange={(e) => handleMonthSelect(index, e.target.value)}
                        className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs outline-none w-32 shrink-0 font-medium text-fg-muted"
                      >
                        {unUsedMonths.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthKey(m)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={h.value}
                        onChange={(e) => handleHistoryValueChange(index, e.target.value)}
                        className={`${inputClass} !py-1.5 !text-xs`}
                        placeholder="0.00"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMonth(index)}
                        className="text-negative hover:opacity-80 shrink-0 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <p className="text-xs text-fg-muted text-center py-2">ไม่มีประวัติย้อนหลัง (ระบบจะบันทึกเมื่อบันทึกตัวสินทรัพย์)</p>
                )}
              </div>
            )}
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
            {loading ? t.common.loading : mode === "add" ? t.common.save : t.wealth.update}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
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
