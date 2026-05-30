// app/(dashboard)/wealth/_components/WealthList.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Droplet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteWealth } from "@/app/actions/wealth";
import { formatTHB } from "@/lib/format";
import { WealthFormDrawer, type WealthRow } from "./WealthFormDrawer";

interface Props {
  userId: string;
}

export function WealthList({ userId }: Props) {
  const [rows, setRows] = useState<WealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<WealthRow | undefined>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchRows = useCallback(async () => {
    const { data } = await supabase
      .from("wealth_debt")
      .select("id, name, type, value, is_liquid")
      .eq("user_id", userId)
      .order("value", { ascending: false });
    setRows((data ?? []) as WealthRow[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function refreshAll() {
    fetchRows();
    router.refresh(); // updates server-rendered NetWorthCard
  }

  function openAdd() { setSelected(undefined); setDrawerMode("add"); }
  function openEdit(row: WealthRow) { setSelected(row); setDrawerMode("edit"); }
  function closeDrawer() { setDrawerMode(null); setSelected(undefined); }

  async function handleSwipeDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteWealth(id);
      router.refresh();
    } catch {
      fetchRows();
    }
  }

  const assets = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");

  if (loading) {
    return <div className="glass p-5 text-center text-sm text-fg-muted">กำลังโหลด…</div>;
  }

  function Section({ title, items, empty }: { title: string; items: WealthRow[]; empty: string }) {
    return (
      <div className="glass p-5">
        <p className="mb-3 text-xs font-medium text-fg-muted">{title}</p>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">{empty}</p>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {items.map((row) => {
                const isLiability = row.type === "liability";
                return (
                  <motion.div
                    key={row.id}
                    layout
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-xl bg-[var(--negative)]">
                      <span className="text-xs font-medium text-white">ลบ</span>
                    </div>
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -80, right: 0 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => { if (info.offset.x < -60) handleSwipeDelete(row.id); }}
                      className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--bg-elevated)] px-4 py-3"
                      onClick={() => openEdit(row)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {row.name}
                          {row.is_liquid && !isLiability && (
                            <Droplet size={12} className="text-sky-400" />
                          )}
                        </p>
                      </div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: isLiability ? "var(--negative)" : "var(--fg, #fff)" }}
                      >
                        {formatTHB(row.value)}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <Section title="สินทรัพย์" items={assets} empty="ยังไม่มีสินทรัพย์" />
      <Section title="หนี้สิน" items={liabilities} empty="ยังไม่มีหนี้สิน" />

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-lg"
      >
        <Plus size={22} />
      </button>

      {drawerMode && (
        <WealthFormDrawer
          mode={drawerMode}
          item={selected}
          onClose={closeDrawer}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
}
