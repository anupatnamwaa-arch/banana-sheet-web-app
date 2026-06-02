// app/(dashboard)/settings/_components/BudgetList.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setBudget, deleteBudget } from "@/app/actions/budgets";
import { CategoryIcon } from "@/app/(dashboard)/analytics/_components/category-icon";
import { useLocale, useT } from "@/lib/i18n/LanguageProvider";
import { CategorySettingsDrawer } from "./CategorySettingsDrawer";

interface Props {
  userId: string;
  isPro: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

const CATEGORY_COLORS = [
  "#34d399","#facc15","#38bdf8","#818cf8",
  "#fb923c","#a78bfa","#f472b6","#4ade80",
];

export function BudgetList({ userId }: Props) {
  const locale = useLocale();
  const t = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [debugText, setDebugText] = useState<string>("Initializing...");
  const [open, setOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(() => {
    console.log("BUDGET_LIST_LOAD_DATA_STARTED", { userId });
    setDebugText("Queries started...");
    Promise.all([
      // All categories with icon and color
      supabase.from("categories").select("id, name, icon, color").eq("user_id", userId).order("name"),
      // Existing budgets
      supabase.from("budgets").select("category_id, limit_amount").eq("user_id", userId),
      // Distinct category IDs used in expense transactions
      supabase
        .from("transactions")
        .select("category_id")
        .eq("user_id", userId)
        .eq("type", "expense")
        .not("category_id", "is", null),
    ]).then(([catRes, budRes, expRes]) => {
      console.log("BUDGET_LIST_PROMISES_RESOLVED", {
        catCount: catRes.data?.length,
        catError: catRes.error,
        budCount: budRes.data?.length,
        budError: budRes.error,
        expCount: expRes.data?.length,
        expError: expRes.error,
      });
      setDebugText("Promises resolved...");
      try {
        if (catRes.error) {
          console.error("catRes error:", catRes.error);
          setDebugText(`catRes error: ${catRes.error.message}`);
        }
        if (budRes.error) {
          console.error("budRes error:", budRes.error);
          setDebugText(`budRes error: ${budRes.error.message}`);
        }
        if (expRes.error) {
          console.error("expRes error:", expRes.error);
          setDebugText(`expRes error: ${expRes.error.message}`);
        }

        const allCats = (catRes.data ?? []) as Category[];

        const budgetMap: Record<string, number> = {};
        for (const b of (budRes.data ?? []) as Array<{ category_id: string; limit_amount: number }>) {
          budgetMap[b.category_id] = b.limit_amount;
        }

        // Build the set of category IDs used in expense transactions
        const expenseCatIds = new Set(
          (expRes.data ?? [])
            .map((r: { category_id: string | null }) => r.category_id)
            .filter(Boolean) as string[]
        );

        // Show only categories that appear in expense transactions OR already have a budget set
        const expenseCats = allCats.filter(
          (c) => expenseCatIds.has(c.id) || budgetMap[c.id] != null
        );

        setCategories(expenseCats);
        setBudgets(budgetMap);

        const initInputs: Record<string, string> = {};
        for (const c of expenseCats) {
          initInputs[c.id] = budgetMap[c.id] != null ? String(budgetMap[c.id]) : "";
        }
        setInputs(initInputs);
      } catch (err) {
        console.error("Error parsing budget data:", err);
        setDebugText(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }).catch((err) => {
      console.error("Promise.all failed in BudgetList:", err);
      setDebugText(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    });
  }, [userId, supabase]);

  useEffect(() => {
    console.log("BUDGET_LIST_EFFECT_MOUNT", { userId });
    const timer = setTimeout(() => {
      setDebugText((prev) => {
        if (prev === "Queries started...") {
          return "Queries taking longer than expected... check internet or session status.";
        }
        return prev;
      });
    }, 4000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    return () => clearTimeout(timer);
  }, [loadData, userId]);

  async function handleBlur(categoryId: string) {
    const raw = inputs[categoryId]?.trim() ?? "";
    const num = parseFloat(raw);
    const current = budgets[categoryId];
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

  // Live totals from current inputs
  const liveTotal = useMemo(() => {
    return categories.reduce((sum, c) => {
      const v = parseFloat(inputs[c.id] ?? "");
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [categories, inputs]);

  const budgetedCount = useMemo(
    () => categories.filter((c) => {
      const v = parseFloat(inputs[c.id] ?? "");
      return !isNaN(v) && v > 0;
    }).length,
    [categories, inputs]
  );

  const fmt = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
        <div className="px-4 py-3.5 text-sm text-fg-muted flex flex-col gap-1">
          <span>{t.common.loading}</span>
          {debugText && (
            <span className="text-[10px] text-accent opacity-80 animate-pulse">
              Debug: {debugText}
            </span>
          )}
          <span className="text-[9px] text-fg-muted/30">
            User ID: {userId.substring(0, 8)}...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)]">
      {/* Collapsed header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left animate-fade-in"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          💰
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t.settings.monthlyBudget}</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {budgetedCount > 0
              ? locale === "en" ? `Total ${fmt(liveTotal)} · ${budgetedCount} categories` : `งบรวม ${fmt(liveTotal)} · ${budgetedCount} หมวด`
              : locale === "en" ? "No budget yet — tap to set one" : "ยังไม่ได้ตั้งงบ — แตะเพื่อตั้งค่า"}
          </p>
        </div>
        {open ? (
          <ChevronUp size={16} className="shrink-0 text-fg-muted" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-fg-muted" />
        )}
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[var(--glass-border)] px-4 pb-4 pt-3">
          {categories.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-fg-muted">
                {locale === "en"
                  ? "No expense categories yet. Add an expense entry before setting a budget."
                  : "ยังไม่มีหมวดหมู่รายจ่าย — เพิ่มรายการค่าใช้จ่ายก่อนแล้วค่อยตั้งงบ"}
              </p>
              <button
                type="button"
                onClick={() => setIsManagerOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
              >
                <span>📁</span>
                {locale === "en" ? "Manage Categories" : "จัดการหมวดหมู่"}
              </button>
            </div>
          ) : (
            <>
              {/* Total budget banner */}
              <div className="mb-4 flex items-baseline justify-between rounded-2xl bg-[var(--glass-bg)] px-3 py-2.5">
                <p className="text-xs text-fg-muted">{locale === "en" ? "Total expense budget" : "งบรายจ่ายรวมทั้งหมด"}</p>
                <p className="text-xl font-bold tabular-nums text-accent">{fmt(liveTotal)}</p>
              </div>

              {/* Category rows */}
              <div className="space-y-4">
                {categories.map((cat, i) => {
                  const val = parseFloat(inputs[cat.id] ?? "");
                  const catVal = isNaN(val) ? 0 : val;
                  const pct = liveTotal > 0 ? Math.round((catVal / liveTotal) * 100) : 0;
                  const color = cat.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length];

                  return (
                    <div key={cat.id}>
                      {/* Label + input row */}
                      <div className="mb-1.5 flex items-center gap-2">
                        {/* Category icon */}
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base"
                          style={{ background: `${color}22`, color: color }}
                        >
                          <CategoryIcon name={cat.name} emoji={cat.icon} size={14} className="text-fg" style={{ color }} />
                        </span>

                        <span className="flex-1 truncate text-sm">{cat.name}</span>

                        {saved[cat.id] && <Check size={12} className="text-positive" />}
                        {errored[cat.id] && (
                          <span className="text-xs text-negative">{locale === "en" ? "Error" : "ผิดพลาด"}</span>
                        )}

                        {/* Budget input */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-fg-muted">฿</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            placeholder="—"
                            value={inputs[cat.id] ?? ""}
                            onChange={(e) =>
                              setInputs((p) => ({ ...p, [cat.id]: e.target.value }))
                            }
                            onBlur={() => handleBlur(cat.id)}
                            className="w-24 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
                          />
                        </div>

                        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-fg-muted">
                          {catVal > 0 ? `${pct}%` : "—"}
                        </span>
                      </div>

                      {/* % bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Manage Categories trigger */}
              <div className="mt-4 border-t border-[var(--glass-border)]/50 pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsManagerOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-accent transition-transform active:scale-95 hover:underline"
                >
                  <span>📁</span>
                  {locale === "en" ? "Manage Categories & Icons" : "จัดการหมวดหมู่และไอคอน"}
                </button>
              </div>

              {/* Footer hint */}
              <p className="mt-4 text-xs text-fg-muted">
                {locale === "en" ? "Category budgets apply to " : "งบแต่ละหมวดสำหรับ "}
                <span className="text-negative">{locale === "en" ? "expenses" : "รายจ่าย"}</span>
                {locale === "en" ? " only. Tap outside a field to save automatically." : " เท่านั้น · แตะออกจากช่องเพื่อบันทึกอัตโนมัติ"}
              </p>
            </>
          )}
        </div>
      )}

      {isManagerOpen && (
        <CategorySettingsDrawer
          userId={userId}
          onClose={() => setIsManagerOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

