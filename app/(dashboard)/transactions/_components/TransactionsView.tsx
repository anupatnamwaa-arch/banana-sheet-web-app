"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { bangkokDateKey, formatTHB } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";
import { deleteTransaction, duplicateTransaction } from "@/app/actions/transactions";
import { CategoryIcon } from "@/app/(dashboard)/analytics/_components/category-icon";
import { matchBrand, getBrandLogoUrl, BrandLogoImage } from "@/app/(dashboard)/analytics/_components/brand-logo";
import { TransactionFormDrawer, type TransactionRow } from "@/app/(dashboard)/analytics/_components/TransactionFormDrawer";
import {
  AdvancedFilterSheet,
  DEFAULT_FILTER,
  type TxFilter,
} from "./AdvancedFilterSheet";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  userId: string;
}

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");

function amountInBucket(amount: number, bucket: TxFilter["amount"]): boolean {
  switch (bucket) {
    case "lt100": return amount < 100;
    case "100-500": return amount >= 100 && amount <= 500;
    case "501-1000": return amount >= 501 && amount <= 1000;
    case "gt1000": return amount > 1000;
    default: return true;
  }
}

export function TransactionsView({ userId }: Props) {
  const t = useT();
  const locale = useLocale();
  const monthNames = t.calendar.months;
  const typePills: { id: TxFilter["type"]; label: string }[] = [
    { id: "all", label: t.transactions.all },
    { id: "income", label: t.transactions.income },
    { id: "expense", label: t.transactions.expense },
    { id: "savings", label: t.transactions.savings },
  ];
  const datePills: { id: TxFilter["date"]; label: string }[] = [
    { id: "today", label: t.transactions.today },
    { id: "week", label: t.transactions.thisWeek },
    { id: "month", label: t.transactions.thisMonth },
  ];
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<TxFilter>(DEFAULT_FILTER);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [editing, setEditing] = useState<TransactionRow | undefined>();
  const [menuFor, setMenuFor] = useState<TransactionRow | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<TransactionRow | undefined>();

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, type, date, note, category_id, fixed_cost_id, recurring_kind, categories(name, icon, color), brands(name, logo_url)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(500);
    setTransactions((data ?? []) as unknown as TransactionRow[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    // Data-fetch effect: setState lands after the awaited query resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTransactions();
    supabase
      .from("categories")
      .select("id, name, icon, color")
      .eq("user_id", userId)
      .order("name")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, [userId, fetchTransactions, supabase]);

  // ── Date keys ──────────────────────────────────────────────────────────────
  const { year, month, day } = bangkokToday();
  const todayKey = `${year}-${pad(month)}-${pad(day)}`;
  const yKey = (() => {
    const d = new Date(Date.UTC(year, month - 1, day - 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  })();
  const weekStartKey = (() => {
    const d = new Date(Date.UTC(year, month - 1, day - 6));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  })();
  const monthPrefix = `${year}-${pad(month)}`;
  const prevMonthPrefix = (() => {
    const d = new Date(Date.UTC(year, month - 2, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  })();

  function passesDate(key: string): boolean {
    switch (filter.date) {
      case "today": return key === todayKey;
      case "week": return key >= weekStartKey && key <= todayKey;
      case "month": return key.startsWith(monthPrefix);
      case "prevmonth": return key.startsWith(prevMonthPrefix);
      case "custom":
        if (!filter.customFrom || !filter.customTo) return true;
        return key >= filter.customFrom && key <= filter.customTo;
      default: return true;
    }
  }

  // ── Filter + search + sort ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = transactions.filter((t) => {
      const key = bangkokDateKey(t.date);
      if (filter.type !== "all" && t.type !== filter.type) return false;
      if (filter.categoryId && t.category_id !== filter.categoryId) return false;
      if (!amountInBucket(t.amount, filter.amount)) return false;
      if (!passesDate(key)) return false;
      if (q) {
        const hay = [t.note ?? "", t.categories?.name ?? "", String(t.amount)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (filter.sort) {
        case "oldest": return a.date.localeCompare(b.date);
        case "amount_desc": return b.amount - a.amount;
        case "amount_asc": return a.amount - b.amount;
        default: return b.date.localeCompare(a.date); // newest
      }
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filter, search]);

  // ── Group by date (groups ordered by sort direction) ─────────────────────────
  const groups = useMemo(() => {
    const map = new Map<string, TransactionRow[]>();
    for (const t of filtered) {
      const key = bangkokDateKey(t.date);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    const keys = [...map.keys()].sort((a, b) =>
      filter.sort === "oldest" ? a.localeCompare(b) : b.localeCompare(a)
    );
    return keys.map((key) => ({ key, items: map.get(key)! }));
  }, [filtered, filter]);

  const monthCount = useMemo(
    () => transactions.filter((t) => bangkokDateKey(t.date).startsWith(monthPrefix)).length,
    [transactions, monthPrefix]
  );

  function clearAll() {
    setFilter(DEFAULT_FILTER);
    setSearch("");
    setSheetOpen(false);
  }

  async function handleDelete(id: string) {
    setConfirmDelete(undefined);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id);
    } finally {
      fetchTransactions();
    }
  }

  async function handleDuplicate(id: string) {
    setMenuFor(undefined);
    try {
      await duplicateTransaction(id);
    } finally {
      fetchTransactions();
    }
  }

  function groupLabel(key: string): string {
    const [y, m, d] = key.split("-").map(Number);
    const base = `${d} ${monthNames[m - 1]} ${y + t.calendar.yearOffset}`;
    if (key === todayKey) return `${t.transactions.today}, ${base}`;
    if (key === yKey) return `${locale === "en" ? "Yesterday" : "เมื่อวาน"}, ${base}`;
    return base;
  }

  function groupSubtotal(items: TransactionRow[]): string {
    const exp = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    if (exp > 0) return `${t.transactions.expense} ${formatTHB(exp)}`;
    const inc = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    if (inc > 0) return `${t.transactions.income} ${formatTHB(inc)}`;
    const sav = items.reduce((s, t) => s + t.amount, 0);
    return `${t.transactions.savings} ${formatTHB(sav)}`;
  }

  const filtersActive =
    search.trim() !== "" || JSON.stringify(filter) !== JSON.stringify(DEFAULT_FILTER);

  return (
    <section className="space-y-4 pb-4">
      {/* Header */}
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.transactions.title}</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {locale === "en"
              ? "View and manage your income, expenses, and savings history"
              : "ดูและจัดการประวัติรายรับ รายจ่าย และเงินออม"}
          </p>
          {!loading && (
            <p className="mt-1 text-xs text-fg-muted">
              {locale === "en" ? `${monthCount} entries this month` : `เดือนนี้มี ${monthCount} รายการ`}
            </p>
          )}
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          aria-label={t.transactions.advancedFilter}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            filtersActive ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted"
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </header>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.transactions.search}
          className="w-full rounded-full border border-[var(--glass-border)] bg-[var(--bg-elevated)] py-2.5 pl-9 pr-9 text-sm outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label={locale === "en" ? "Clear search" : "ล้างคำค้นหา"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Quick filter pills */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {typePills.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter((f) => ({ ...f, type: p.id }))}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter.type === p.id ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {datePills.map((p) => {
            const active = filter.date === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setFilter((f) => ({ ...f, date: active ? "all" : p.id }))}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-accent text-black" : "bg-[var(--glass-bg)] text-fg-muted hover:text-fg"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* List / states */}
      {loading ? (
        <div className="rounded-2xl bg-[var(--bg-elevated)] p-8 text-center text-sm text-fg-muted">
          {t.common.loading}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-3xl">🧾</p>
          <p className="mt-3 text-base font-semibold">{t.transactions.noTransactions}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {locale === "en"
              ? "Add income, expenses, or savings and your entries will appear here."
              : "เริ่มบันทึกรายรับ รายจ่าย หรือเงินออม แล้วรายการจะแสดงที่นี่"}
          </p>
          <p className="mt-4 text-xs text-fg-muted">
            {locale === "en" ? "Tap the + button below to add your first entry." : "แตะปุ่ม + ด้านล่างเพื่อเพิ่มรายการแรก"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 text-base font-semibold">{t.transactions.noResults}</p>
          <p className="mt-1 text-sm text-fg-muted">
            {locale === "en" ? "Try changing your search or filters." : "ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองอีกครั้ง"}
          </p>
          <button
            onClick={clearAll}
            className="mt-4 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
          >
            {t.transactions.clearFilter}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold text-fg">{groupLabel(g.key)}</p>
                <p className="text-[11px] text-fg-muted">{groupSubtotal(g.items)}</p>
              </div>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {g.items.map((tx) => (
                    <TxRowItem
                      key={tx.id}
                      tx={tx}
                      onTap={() => setEditing(tx)}
                      onLongPress={() => setMenuFor(tx)}
                      onSwipeDelete={() => setConfirmDelete(tx)}
                      onSwipeDuplicate={() => handleDuplicate(tx.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / detail drawer */}
      {editing && (
        <TransactionFormDrawer
          mode="edit"
          transaction={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSuccess={fetchTransactions}
        />
      )}

      {/* Advanced filter sheet */}
      {sheetOpen && (
        <AdvancedFilterSheet
          initial={filter}
          categories={categories}
          onApply={(f) => { setFilter(f); setSheetOpen(false); }}
          onClear={clearAll}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {/* Long-press quick action menu */}
      <AnimatePresence>
        {menuFor && (
          <ActionMenu
            tx={menuFor}
            onEdit={() => { setEditing(menuFor); setMenuFor(undefined); }}
            onDuplicate={() => handleDuplicate(menuFor.id)}
            onDelete={() => { setConfirmDelete(menuFor); setMenuFor(undefined); }}
            onClose={() => setMenuFor(undefined)}
          />
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDelete
            onCancel={() => setConfirmDelete(undefined)}
            onConfirm={() => handleDelete(confirmDelete.id)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Transaction row ───────────────────────────────────────────────────────────

function amountDisplay(tx: TransactionRow): { text: string; color: string } {
  if (tx.type === "income") return { text: `+${formatTHB(tx.amount)}`, color: "text-positive" };
  if (tx.type === "savings") return { text: formatTHB(tx.amount), color: "text-blue-400" };
  return { text: `-${formatTHB(tx.amount)}`, color: "text-negative" };
}

function TxRowItem({
  tx,
  onTap,
  onLongPress,
  onSwipeDelete,
  onSwipeDuplicate,
}: {
  tx: TransactionRow;
  onTap: () => void;
  onLongPress: () => void;
  onSwipeDelete: () => void;
  onSwipeDuplicate: () => void;
}) {
  const t = useT();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const typeLabel = tx.type === "income"
    ? t.transactions.income
    : tx.type === "savings"
      ? t.transactions.savings
      : t.transactions.expense;
  const catName = tx.categories?.name ?? typeLabel;
  const name = tx.note ?? catName;
  const { text, color } = amountDisplay(tx);
  const [, m, d] = bangkokDateKey(tx.date).split("-").map(Number);
  const dateLabel = `${d}/${m}`;
  const brand = matchBrand(tx.note);
  const tint =
    brand ? brand.color :
    (tx.categories?.color ||
    (tx.type === "income" ? "var(--positive)" : tx.type === "savings" ? "#38bdf8" : "var(--negative)"));

  function clearTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <motion.div layout exit={{ opacity: 0, height: 0 }} className="relative overflow-hidden rounded-2xl">
      {/* Duplicate zone (revealed on right swipe) */}
      <div className="absolute inset-y-0 left-0 flex w-20 items-center justify-center bg-blue-500/80">
        <span className="text-xs font-medium text-white">{t.transactions.duplicate}</span>
      </div>
      {/* Delete zone (revealed on left swipe) */}
      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-[var(--negative)]">
        <span className="text-xs font-medium text-white">{t.common.delete}</span>
      </div>

      <motion.div
        drag="x"
        dragSnapToOrigin
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onSwipeDelete();
          else if (info.offset.x > 60) onSwipeDuplicate();
        }}
        onTapStart={() => {
          longPressed.current = false;
          longPressTimer.current = setTimeout(() => {
            longPressed.current = true;
            onLongPress();
          }, 500);
        }}
        onTap={() => {
          clearTimer();
          if (!longPressed.current) onTap();
        }}
        onTapCancel={clearTimer}
        whileTap={{ scale: 0.99 }}
        className="relative flex cursor-pointer items-center gap-3 rounded-2xl bg-[var(--bg-elevated)] px-4 py-3"
      >
        {brand ? (
          <BrandLogoImage
            logoUrl={getBrandLogoUrl(brand.storagePath)}
            size={36}
            fallback={
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                style={{
                  background: `color-mix(in srgb, ${tint} 18%, transparent)`,
                  color: tint,
                }}
              >
                <brand.icon size={18} />
              </div>
            }
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
            style={{ background: `color-mix(in srgb, ${tint} 18%, transparent)` }}
          >
            <CategoryIcon name={catName} emoji={tx.categories?.icon} size={18} className="text-fg" style={{ color: tx.categories?.color || undefined }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-fg-muted">
            {catName} • {dateLabel}
          </p>
        </div>
        <p className={`shrink-0 text-sm font-semibold tabular-nums ${color}`}>{text}</p>
      </motion.div>
    </motion.div>
  );
}

// ─── Long-press action menu ──────────────────────────────────────────────────

function ActionMenu({
  tx,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}: {
  tx: TransactionRow;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const items = [
    { label: t.common.edit, action: onEdit },
    { label: t.transactions.duplicate, action: onDuplicate },
    { label: locale === "en" ? "View details" : "ดูรายละเอียด", action: onEdit },
    { label: t.common.delete, action: onDelete, danger: true },
  ];
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 space-y-1 rounded-t-3xl bg-[var(--bg-elevated)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <p className="truncate px-2 pb-2 text-xs text-fg-muted">
          {tx.note ?? tx.categories?.name ?? "รายการ"}
        </p>
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.action}
            className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium ${
              it.danger ? "text-[var(--negative)]" : "text-fg"
            } hover:bg-[var(--glass-bg)]`}
          >
            {it.label}
          </button>
        ))}
      </motion.div>
    </>
  );
}

// ─── Delete confirmation ─────────────────────────────────────────────────────

function ConfirmDelete({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  const locale = useLocale();
  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-[var(--bg-elevated)] p-5 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <p className="text-base font-semibold">{t.transactions.deleteConfirm}</p>
        <p className="mt-1 text-sm text-fg-muted">
          {locale === "en" ? "This action cannot be undone." : "เมื่อลบแล้วจะไม่สามารถกู้คืนได้"}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[var(--glass-border)] py-2.5 text-sm font-medium text-fg-muted"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-[var(--negative)] py-2.5 text-sm font-semibold text-white"
          >
            {t.common.delete}
          </button>
        </div>
      </motion.div>
    </>
  );
}
