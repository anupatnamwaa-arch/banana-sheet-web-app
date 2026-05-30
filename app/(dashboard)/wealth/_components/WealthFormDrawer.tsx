// app/(dashboard)/wealth/_components/WealthFormDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle, Droplet } from "lucide-react";
import { addWealth, updateWealth, deleteWealth } from "@/app/actions/wealth";
import type { WealthPayload } from "@/app/actions/wealth";
import type { WealthType } from "@/lib/types";

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

export function WealthFormDrawer({ mode, item, initialType, onClose, onSuccess }: Props) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("กรุณากรอกชื่อ"); return; }
    const num = parseFloat(value);
    if (!num || num <= 0) { setError("กรุณากรอกมูลค่าที่ถูกต้อง"); return; }

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
    try {
      if (mode === "add") await addWealth(payload);
      else await updateWealth(item!.id, payload);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
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
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none";
  const busy = loading || deleting;

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
            {mode === "add" ? "เพิ่มรายการ" : "แก้ไขรายการ"}
          </h2>
          <button onClick={() => { if (!busy) onClose(); }} disabled={busy}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["asset", "liability"] as WealthType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  type === t ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {t === "asset" ? "สินทรัพย์" : "หนี้สิน"}
              </button>
            ))}
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder="ชื่อ (เช่น บัญชีออมทรัพย์)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />

          {/* Value */}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="มูลค่า (฿)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
            required
          />

          {/* Liquid toggle — assets only */}
          {type === "asset" && (
            <button
              type="button"
              onClick={() => setIsLiquid((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--glass-border)] px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Droplet size={16} className={isLiquid ? "text-sky-400" : "text-fg-muted"} />
                สภาพคล่อง
              </span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isLiquid ? "bg-accent" : "bg-[var(--glass-border)]"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isLiquid ? "translate-x-4" : ""}`} />
              </span>
            </button>
          )}
          {type === "asset" && (
            <p className="-mt-2 text-xs text-fg-muted">นับรวมในเงินสำรองฉุกเฉิน</p>
          )}

          {/* Debt details — liabilities only */}
          {type === "liability" && (
            <>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="ยอดผ่อน/ชำระต่อเดือน (฿) — ไม่บังคับ"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                className={inputClass}
              />
              <div>
                <label className="mb-1 block text-xs text-fg-muted">วันครบกำหนด (ไม่บังคับ)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

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
            {loading ? "กำลังบันทึก…" : mode === "add" ? "บันทึก" : "อัปเดต"}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--negative)]/40 py-3 text-sm font-medium text-[var(--negative)] disabled:opacity-40"
            >
              <Trash2 size={16} />
              {deleting ? "กำลังลบ…" : "ลบรายการ"}
            </button>
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
