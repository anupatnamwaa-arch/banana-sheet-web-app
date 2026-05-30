// app/(dashboard)/_components/UniversalFabDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { addTransaction } from "@/app/actions/transactions";
import { addWealth } from "@/app/actions/wealth";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { TransactionType } from "@/lib/types";
import type { TransactionPayload } from "@/app/actions/transactions";
import type { WealthPayload } from "@/app/actions/wealth";

type Tab = "transaction" | "wealth";
type WealthKind = "asset" | "liability";

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
  const [tab, setTab] = useState<Tab>("transaction");

  // Transaction state
  const [txType, setTxType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Wealth state
  const [wealthKind, setWealthKind] = useState<WealthKind>("asset");
  const [wealthName, setWealthName] = useState("");
  const [wealthAmount, setWealthAmount] = useState("");
  const [isLiquid, setIsLiquid] = useState(false);
  const [wealthLoading, setWealthLoading] = useState(false);
  const [wealthError, setWealthError] = useState<string | null>(null);

  async function handleTxSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setTxError("กรุณากรอกจำนวนเงินที่ถูกต้อง"); return; }
    setTxLoading(true); setTxError(null);
    const payload: TransactionPayload = {
      amount: num,
      type: txType,
      category_id: categoryId || null,
      date: bangkokTodayStr(),
      note: note.trim() || null,
    };
    try {
      await addTransaction(payload);
      onSuccess();
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setTxLoading(false);
    }
  }

  async function handleWealthSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(wealthAmount);
    if (!num || num <= 0) { setWealthError("กรุณากรอกจำนวนเงินที่ถูกต้อง"); return; }
    if (!wealthName.trim()) { setWealthError("กรุณากรอกชื่อ"); return; }
    setWealthLoading(true); setWealthError(null);
    const payload: WealthPayload = {
      name: wealthName.trim(),
      type: wealthKind,
      value: num,
      is_liquid: wealthKind === "asset" ? isLiquid : false,
    };
    try {
      await addWealth(payload);
      onSuccess();
    } catch (err) {
      setWealthError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setWealthLoading(false);
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
          <h2 className="text-lg font-semibold">เพิ่มรายการ</h2>
          <button onClick={onClose} aria-label="ปิด">
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="mb-5 flex gap-2 rounded-xl border border-[var(--glass-border)] p-1">
          {(["transaction", "wealth"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t ? "bg-accent text-black" : "text-fg-muted"
              }`}
            >
              {t === "transaction" ? "รายการ" : "ทรัพย์สิน"}
            </button>
          ))}
        </div>

        {/* Transaction form */}
        {tab === "transaction" && (
          <form onSubmit={handleTxSubmit} className="space-y-3">
            {/* Type pills */}
            <div className="flex gap-2">
              {(["expense", "income", "savings"] as TransactionType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTxType(t)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                    txType === t
                      ? "bg-accent text-black"
                      : "border border-[var(--glass-border)] text-fg-muted"
                  }`}
                >
                  {t === "expense" ? "รายจ่าย" : t === "income" ? "รายรับ" : "ออมเงิน"}
                </button>
              ))}
            </div>

            {/* Amount */}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="จำนวนเงิน (฿)"
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
              <option value="">— หมวดหมู่ (ไม่บังคับ) —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Note */}
            <input
              type="text"
              placeholder="หมายเหตุ (ไม่บังคับ)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />

            {txError && <p className="text-xs text-negative">{txError}</p>}

            <button
              type="submit"
              disabled={txLoading}
              className="w-full rounded-2xl bg-accent py-3 font-semibold text-black disabled:opacity-40"
            >
              {txLoading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </form>
        )}

        {/* Wealth form */}
        {tab === "wealth" && (
          <form onSubmit={handleWealthSubmit} className="space-y-3">
            {/* Kind pills */}
            <div className="flex gap-2">
              {(["asset", "liability"] as WealthKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setWealthKind(k)}
                  className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                    wealthKind === k
                      ? "bg-accent text-black"
                      : "border border-[var(--glass-border)] text-fg-muted"
                  }`}
                >
                  {k === "asset" ? "ทรัพย์สิน" : "หนี้สิน"}
                </button>
              ))}
            </div>

            {/* Name */}
            <input
              type="text"
              placeholder="ชื่อ (เช่น บัญชีออมทรัพย์)"
              value={wealthName}
              onChange={(e) => setWealthName(e.target.value)}
              className={inputClass}
              required
            />

            {/* Amount */}
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="มูลค่า (฿)"
              value={wealthAmount}
              onChange={(e) => setWealthAmount(e.target.value)}
              className={inputClass}
              required
            />

            {/* Liquid toggle — assets only */}
            {wealthKind === "asset" && (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={isLiquid}
                  onChange={(e) => setIsLiquid(e.target.checked)}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                <span>สภาพคล่องสูง (เงินสด, ฝากออมทรัพย์)</span>
              </label>
            )}

            {wealthError && <p className="text-xs text-negative">{wealthError}</p>}

            <button
              type="submit"
              disabled={wealthLoading}
              className="w-full rounded-2xl bg-accent py-3 font-semibold text-black disabled:opacity-40"
            >
              {wealthLoading ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
