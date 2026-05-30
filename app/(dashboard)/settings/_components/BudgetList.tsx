// app/(dashboard)/settings/_components/BudgetList.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setBudget, deleteBudget } from "@/app/actions/budgets";

interface Props {
  userId: string;
  isPro: boolean;
}

interface Category {
  id: string;
  name: string;
}

export function BudgetList({ userId, isPro }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id, name").eq("user_id", userId).order("name"),
      supabase.from("budgets").select("category_id, limit_amount").eq("user_id", userId),
    ]).then(([catRes, budRes]) => {
      const cats = (catRes.data ?? []) as Category[];
      setCategories(cats);
      const map: Record<string, number> = {};
      for (const b of (budRes.data ?? []) as Array<{ category_id: string; limit_amount: number }>) {
        map[b.category_id] = b.limit_amount;
      }
      setBudgets(map);
      const initInputs: Record<string, string> = {};
      for (const c of cats) initInputs[c.id] = map[c.id] != null ? String(map[c.id]) : "";
      setInputs(initInputs);
      setLoading(false);
    });
  }, [userId, supabase]);

  async function handleBlur(categoryId: string) {
    const raw = inputs[categoryId]?.trim() ?? "";
    const num = parseFloat(raw);
    const current = budgets[categoryId];

    // No change
    if (raw === "" && current == null) return;
    if (!isNaN(num) && num === current) return;

    setErrored((p) => ({ ...p, [categoryId]: false }));
    try {
      if (raw === "" || num === 0 || isNaN(num)) {
        await deleteBudget(categoryId);
        setBudgets((p) => { const n = { ...p }; delete n[categoryId]; return n; });
      } else {
        await setBudget(categoryId, num);
        setBudgets((p) => ({ ...p, [categoryId]: num }));
      }
      setSaved((p) => ({ ...p, [categoryId]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [categoryId]: false })), 1500);
    } catch {
      setErrored((p) => ({ ...p, [categoryId]: true }));
    }
  }

  const helper = (
    <p className="mb-3 text-xs text-fg-muted">
      ตั้งงบรายเดือนต่อหมวดหมู่ — ใช้กับ Daily Pace และกราฟวงกลม
    </p>
  );

  if (loading) {
    return (
      <div className="glass p-5">
        <p className="text-sm font-medium text-fg-muted">งบประมาณรายหมวดหมู่</p>
        <p className="mt-2 text-sm text-fg-muted">กำลังโหลด…</p>
      </div>
    );
  }

  const list = (
    <div className="space-y-2">
      {categories.length === 0 && (
        <p className="text-sm text-fg-muted">ยังไม่มีหมวดหมู่</p>
      )}
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-3">
          <span className="flex-1 text-sm">{cat.name}</span>
          {saved[cat.id] && <Check size={14} className="text-[var(--positive)]" />}
          {errored[cat.id] && <span className="text-xs text-[var(--negative)]">ผิดพลาด</span>}
          <div className="flex items-center gap-1">
            <span className="text-xs text-fg-muted">฿</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="—"
              value={inputs[cat.id] ?? ""}
              onChange={(e) => setInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
              onBlur={() => handleBlur(cat.id)}
              className="w-24 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-right text-sm outline-none"
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="glass relative p-5">
      <p className="text-sm font-medium text-fg-muted">งบประมาณรายหมวดหมู่</p>
      <div className="mt-3">
        {helper}
        {!isPro ? (
          <div className="relative">
            <div className="pointer-events-none select-none blur-sm">{list}</div>
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Link href="/paywall" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black">
                🔒 ปลดล็อกด้วย Pro
              </Link>
            </div>
          </div>
        ) : (
          list
        )}
      </div>
    </div>
  );
}
