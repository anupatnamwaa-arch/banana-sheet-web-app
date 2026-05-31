"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import type { TransactionType } from "@/lib/types";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

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
  const locale = useLocale();
  const t = useT();
  const [draft, setDraft] = useState<TxFilter>(initial);
  const dateOptions: { id: DateFilter; label: string }[] = [
    { id: "today", label: t.transactions.today },
    { id: "week", label: locale === "en" ? "Last 7 days" : "7 วันที่ผ่านมา" },
    { id: "month", label: t.transactions.thisMonth },
    { id: "prevmonth", label: locale === "en" ? "Last month" : "เดือนก่อน" },
    { id: "all", label: t.transactions.all },
    { id: "custom", label: locale === "en" ? "Custom" : "กำหนดเอง" },
  ];
  const typeOptions: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t.transactions.all },
    { id: "income", label: t.transactions.income },
    { id: "expense", label: t.transactions.expense },
    { id: "savings", label: t.transactions.savings },
  ];
  const amountOptions: { id: AmountBucket; label: string }[] = [
    { id: "all", label: t.transactions.anyAmount },
    { id: "lt100", label: t.transactions.lt100 },
    { id: "100-500", label: t.transactions.from100to500 },
    { id: "501-1000", label: t.transactions.from501to1000 },
    { id: "gt1000", label: t.transactions.gt1000 },
  ];
  const sortOptions: { id: SortOption; label: string }[] = locale === "en"
    ? [
        { id: "newest", label: "Newest first" },
        { id: "oldest", label: "Oldest first" },
        { id: "amount_desc", label: "Highest amount first" },
        { id: "amount_asc", label: "Lowest amount first" },
      ]
    : [
        { id: "newest", label: "ล่าสุดก่อน" },
        { id: "oldest", label: "เก่าสุดก่อน" },
        { id: "amount_desc", label: "จำนวนเงินมากไปน้อย" },
        { id: "amount_asc", label: "จำนวนเงินน้อยไปมาก" },
      ];
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
          <h2 className="text-lg font-semibold">{t.transactions.advancedFilter}</h2>
          <button onClick={onClose} aria-label={t.common.close}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <Section title={t.transactions.filterDate}>
          {dateOptions.map((o) => (
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
            <span className="text-xs text-fg-muted">{locale === "en" ? "to" : "ถึง"}</span>
            <input
              type="date"
              value={draft.customTo}
              onChange={(e) => set({ customTo: e.target.value })}
              className={inputClass}
            />
          </div>
        )}

        <Section title={t.transactions.filterType}>
          {typeOptions.map((o) => (
            <Chip key={o.id} active={draft.type === o.id} onClick={() => set({ type: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        <Section title={t.transactions.filterCategory}>
          <Chip active={draft.categoryId === ""} onClick={() => set({ categoryId: "" })}>
            {t.transactions.anyCategory}
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

        <Section title={t.transactions.filterAmount}>
          {amountOptions.map((o) => (
            <Chip key={o.id} active={draft.amount === o.id} onClick={() => set({ amount: o.id })}>
              {o.label}
            </Chip>
          ))}
        </Section>

        <Section title={locale === "en" ? "Sort by" : "เรียงลำดับ"}>
          {sortOptions.map((o) => (
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
            {t.transactions.clearFilter}
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-black"
          >
            {t.transactions.applyFilter}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
