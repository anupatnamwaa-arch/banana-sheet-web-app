"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import type { TransactionType } from "@/lib/types";

export type TypeFilter = "all" | TransactionType;
export type DateFilter = "all" | "today" | "week" | "month" | "prevmonth" | "custom";
export type AmountBucket = "all" | "lt100" | "100-500" | "501-1000" | "gt1000";
export type SortOption = "newest" | "oldest" | "amount_desc" | "amount_asc";

export interface TxFilter {
  type: TypeFilter;
  date: DateFilter;
  customFrom: string; // YYYY-MM-DD
  customTo: string;
  categoryId: string; // "" = all
  amount: AmountBucket;
  sort: SortOption;
}

export const DEFAULT_FILTER: TxFilter = {
  type: "all",
  date: "all",
  customFrom: "",
  customTo: "",
  categoryId: "",
  amount: "all",
  sort: "newest",
};

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: "today", label: "วันนี้" },
  { id: "week", label: "7 วันที่ผ่านมา" },
  { id: "month", label: "เดือนนี้" },
  { id: "prevmonth", label: "เดือนก่อน" },
  { id: "all", label: "ทั้งหมด" },
  { id: "custom", label: "กำหนดเอง" },
];

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "income", label: "รายรับ" },
  { id: "expense", label: "รายจ่าย" },
  { id: "savings", label: "เงินออม" },
];

const AMOUNT_OPTIONS: { id: AmountBucket; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "lt100", label: "ต่ำกว่า ฿100" },
  { id: "100-500", label: "฿100–฿500" },
  { id: "501-1000", label: "฿501–฿1,000" },
  { id: "gt1000", label: "มากกว่า ฿1,000" },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "newest", label: "ล่าสุดก่อน" },
  { id: "oldest", label: "เก่าสุดก่อน" },
  { id: "amount_desc", label: "จำนวนเงินมากไปน้อย" },
  { id: "amount_asc", label: "จำนวนเงินน้อยไปมาก" },
];

interface Props {
  initial: TxFilter;
  categories: { id: string; name: string }[];
  onApply: (f: TxFilter) => void;
  onClear: () => void;
  onClose: () => void;
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-fg-muted">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function AdvancedFilterSheet({ initial, categories, onApply, onClear, onClose }: Props) {
  const [draft, setDraft] = useState<TxFilter>(initial);
  const set = (patch: Partial<TxFilter>) => setDraft((d) => ({ ...d, ...patch }));

  const inputClass =
    "rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-1.5 text-xs text-fg outline-none";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="sheet"
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] space-y-5 overflow-y-auto rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="mb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">ตัวกรอง</h2>
          <button onClick={onClose} aria-label="ปิด">
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <Section title="ช่วงวันที่">
          {DATE_OPTIONS.map((o) => (
            <Chip key={o.id} active={draft.date === o.id} onClick={() => set({ date: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        {draft.date === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={draft.customFrom}
              onChange={(e) => set({ customFrom: e.target.value })}
              className={inputClass}
            />
            <span className="text-xs text-fg-muted">ถึง</span>
            <input
              type="date"
              value={draft.customTo}
              onChange={(e) => set({ customTo: e.target.value })}
              className={inputClass}
            />
          </div>
        )}

        <Section title="ประเภท">
          {TYPE_OPTIONS.map((o) => (
            <Chip key={o.id} active={draft.type === o.id} onClick={() => set({ type: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        <Section title="หมวดหมู่">
          <Chip active={draft.categoryId === ""} onClick={() => set({ categoryId: "" })}>
            ทั้งหมด
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c.id}
              active={draft.categoryId === c.id}
              onClick={() => set({ categoryId: c.id })}
            >
              {c.name}
            </Chip>
          ))}
        </Section>

        <Section title="ช่วงจำนวนเงิน">
          {AMOUNT_OPTIONS.map((o) => (
            <Chip key={o.id} active={draft.amount === o.id} onClick={() => set({ amount: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        <Section title="เรียงลำดับ">
          {SORT_OPTIONS.map((o) => (
            <Chip key={o.id} active={draft.sort === o.id} onClick={() => set({ sort: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClear}
            className="flex-1 rounded-2xl border border-[var(--glass-border)] py-3 text-sm font-medium text-fg-muted"
          >
            ล้างตัวกรอง
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-black"
          >
            ใช้ตัวกรอง
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
