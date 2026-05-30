// app/(dashboard)/analytics/_components/TransactionList.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteTransaction } from "@/app/actions/transactions";
import { bangkokDateKey, formatTHB } from "@/lib/format";
import { TransactionFormDrawer, type TransactionRow } from "./TransactionFormDrawer";

interface Props {
  userId: string;
}

interface Category {
  id: string;
  name: string;
}

export function TransactionList({ userId }: Props) {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<TransactionRow | undefined>();
  const supabase = useMemo(() => createClient(), []);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, type, date, note, category_id, categories(name), brands(name, logo_url)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(50);
    setTransactions((data ?? []) as unknown as TransactionRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // Parallel: transactions + categories
    Promise.all([
      fetchTransactions(),
      supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", userId)
        .order("name")
        .then(({ data }) => setCategories((data ?? []) as Category[])),
    ]);
  }, [userId, fetchTransactions]);

  function openAdd() { setSelected(undefined); setDrawerMode("add"); }
  function openEdit(tx: TransactionRow) { setSelected(tx); setDrawerMode("edit"); }
  function closeDrawer() { setDrawerMode(null); setSelected(undefined); }

  async function handleSwipeDelete(id: string) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTransaction(id);
      fetchTransactions(); // reconcile server state after successful delete
    } catch {
      fetchTransactions(); // revert optimistic removal on error
    }
  }

  if (loading) {
    return (
      <div className="glass p-5 text-center text-sm text-fg-muted">
        กำลังโหลด…
      </div>
    );
  }

  return (
    <div className="glass relative p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium text-fg-muted">📋 รายการล่าสุด</p>
        <button
          onClick={openAdd}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-black shadow-lg"
        >
          <Plus size={18} />
        </button>
      </div>

      {transactions.length === 0 && (
        <p className="py-8 text-center text-sm text-fg-muted">
          ยังไม่มีรายการ — แตะ + เพื่อเพิ่ม
        </p>
      )}

      <div className="space-y-1">
        <AnimatePresence>
          {transactions.map((tx) => {
            const isExpense = tx.type === "expense";
            const catName = tx.categories?.name ?? "ไม่มีหมวดหมู่";
            const brandLogo = tx.brands?.logo_url;

            return (
              <motion.div
                key={tx.id}
                layout
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="relative overflow-hidden rounded-xl"
              >
                {/* Delete zone revealed on swipe */}
                <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-xl bg-[var(--negative)]">
                  <span className="text-xs font-medium text-white">ลบ</span>
                </div>

                {/* Row */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -80, right: 0 }}
                  dragElastic={0.1}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) handleSwipeDelete(tx.id);
                  }}
                  className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--bg-elevated)] px-4 py-3"
                  onClick={() => openEdit(tx)}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Logo or colour dot */}
                  {brandLogo ? (
                    <img src={brandLogo} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div
                      className="h-7 w-7 rounded-full"
                      style={{ background: isExpense ? "var(--negative)" : "var(--positive)", opacity: 0.3 }}
                    />
                  )}

                  {/* Category + date + note */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{catName}</p>
                    <p className="text-xs text-fg-muted">
                      {bangkokDateKey(tx.date)}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: isExpense ? "var(--negative)" : "var(--positive)" }}
                  >
                    {isExpense ? "-" : "+"}{formatTHB(tx.amount)}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {drawerMode && (
        <TransactionFormDrawer
          mode={drawerMode}
          transaction={selected}
          categories={categories}
          onClose={closeDrawer}
          onSuccess={fetchTransactions}
        />
      )}
    </div>
  );
}
