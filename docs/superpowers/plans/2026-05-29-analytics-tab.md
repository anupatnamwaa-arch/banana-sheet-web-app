# Analytics Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Analytics tab with a Pro-gated glowing line chart (Monthly Velocity), a Pro-gated donut chart (Category Breakdown), and a free transaction CRUD list with a bottom-sheet add/edit drawer.

**Architecture:** `page.tsx` is a Server Component that calls `getAnalyticsData()` for chart data and passes pre-computed values to display components. `TransactionList` is a client component that fetches and mutates its own data via Supabase browser client. Three server actions handle add/update/delete.

**Tech Stack:** Next.js 16 App Router (async `searchParams`/`PageProps`), Supabase SSR + browser client, Recharts 3.8, Framer Motion 12, Tailwind v4, TypeScript, Thai-first UI. `npm run build` does NOT work — always use `node node_modules/next/dist/bin/next build`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/analytics.ts` | **Create** | `getAnalyticsData()` — chart queries |
| `app/actions/transactions.ts` | **Create** | `addTransaction`, `updateTransaction`, `deleteTransaction` |
| `app/(dashboard)/analytics/_components/MonthlyVelocityChart.tsx` | **Create** | Pro-gated glowing line chart |
| `app/(dashboard)/analytics/_components/CategoryBreakdownChart.tsx` | **Create** | Pro-gated donut + legend |
| `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx` | **Create** | Add/edit bottom sheet |
| `app/(dashboard)/analytics/_components/TransactionList.tsx` | **Create** | Free CRUD list, client-fetched |
| `app/(dashboard)/analytics/page.tsx` | **Modify** | Wire all components |

---

## Task 1: Analytics server action

**Files:**
- Create: `app/actions/analytics.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/actions/analytics.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/format";
import { bangkokToday } from "@/app/actions/overview-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthlyPoint {
  month: string;    // "YYYY-MM" Asia/Bangkok
  expense: number;
  income: number;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  spent: number;
  budget: number | null; // null = no budget set
}

export interface AnalyticsData {
  monthlyPoints: MonthlyPoint[] | null; // null for free users
  categorySpend: CategorySpend[] | null; // null for free users
}

// ─── Server action ─────────────────────────────────────────────────────────

export async function getAnalyticsData(
  userId: string,
  isPro: boolean
): Promise<AnalyticsData> {
  if (!isPro) return { monthlyPoints: null, categorySpend: null };

  const supabase = await createClient();
  const { year, month } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  // Trailing 12 months window
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const trailingStart = twelveMonthsAgo.toISOString();

  // Current Bangkok month window
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [velocityResult, currentTxResult, budgetResult] = await Promise.all([
    // 1. Trailing 12-month transactions for velocity chart
    supabase
      .from("transactions")
      .select("amount, type, date")
      .eq("user_id", userId)
      .gte("date", trailingStart),

    // 2. Current month transactions with category for donut
    supabase
      .from("transactions")
      .select("amount, type, category_id, categories(id, name)")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", monthStart)
      .lt("date", monthEnd),

    // 3. Budget limits per category
    supabase
      .from("budgets")
      .select("category_id, limit_amount")
      .eq("user_id", userId),
  ]);

  if (velocityResult.error) throw new Error(velocityResult.error.message);
  if (currentTxResult.error) throw new Error(currentTxResult.error.message);
  if (budgetResult.error) throw new Error(budgetResult.error.message);

  // ── Monthly Velocity ──────────────────────────────────────────────────────
  const buckets: Record<string, { expense: number; income: number }> = {};
  for (const r of (velocityResult.data ?? []) as Array<{
    amount: number;
    type: string;
    date: string;
  }>) {
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
    }).format(new Date(r.date)).slice(0, 7);
    if (!buckets[key]) buckets[key] = { expense: 0, income: 0 };
    if (r.type === "expense") buckets[key].expense += r.amount;
    else buckets[key].income += r.amount;
  }
  const monthlyPoints: MonthlyPoint[] = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }));

  // ── Category Breakdown ────────────────────────────────────────────────────
  const budgetMap: Record<string, number> = {};
  for (const b of (budgetResult.data ?? []) as Array<{
    category_id: string;
    limit_amount: number;
  }>) {
    budgetMap[b.category_id] = b.limit_amount;
  }

  const spendMap: Record<string, { name: string; spent: number }> = {};
  for (const r of (currentTxResult.data ?? []) as Array<{
    amount: number;
    category_id: string | null;
    categories: { id: string; name: string } | null;
  }>) {
    const catId = r.category_id ?? "__none__";
    const catName = r.categories?.name ?? "ไม่มีหมวดหมู่";
    if (!spendMap[catId]) spendMap[catId] = { name: catName, spent: 0 };
    spendMap[catId].spent += r.amount;
  }

  const categorySpend: CategorySpend[] = Object.entries(spendMap).map(
    ([catId, { name, spent }]) => ({
      categoryId: catId,
      categoryName: name,
      spent,
      budget: budgetMap[catId] ?? null,
    })
  );

  return { monthlyPoints, categorySpend };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/analytics.ts
git commit -m "feat: add getAnalyticsData server action (velocity + category breakdown)"
```

---

## Task 2: Transaction mutation server actions

**Files:**
- Create: `app/actions/transactions.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/actions/transactions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/types";

export interface TransactionPayload {
  amount: number;        // always positive
  type: TransactionType;
  category_id: string | null;
  date: string;          // YYYY-MM-DD Bangkok-local
  note: string | null;
}

/** Resolve brand_id from note text by matching against brands.aliases (case-insensitive). */
async function resolveBrandId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  note: string | null
): Promise<string | null> {
  if (!note?.trim()) return null;
  const lower = note.toLowerCase();
  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, aliases");
  if (!brands) return null;
  for (const brand of brands as Array<{ id: string; name: string; aliases: string[] }>) {
    const candidates = [brand.name.toLowerCase(), ...brand.aliases.map((a) => a.toLowerCase())];
    if (candidates.some((c) => lower.includes(c))) return brand.id;
  }
  return null;
}

export async function addTransaction(payload: TransactionPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount: payload.amount,
    type: payload.type,
    category_id: payload.category_id,
    date: payload.date,
    note: payload.note,
    brand_id,
  });
  if (error) throw new Error(error.message);
}

export async function updateTransaction(
  id: string,
  payload: TransactionPayload
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const brand_id = await resolveBrandId(supabase, payload.note);

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      date: payload.date,
      note: payload.note,
      brand_id,
    })
    .eq("id", id)
    .eq("user_id", user.id); // belt-and-suspenders on top of RLS
  if (error) throw new Error(error.message);
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/transactions.ts
git commit -m "feat: add transaction mutation server actions (add/update/delete + brand auto-match)"
```

---

## Task 3: MonthlyVelocityChart component

**Files:**
- Create: `app/(dashboard)/analytics/_components/MonthlyVelocityChart.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/analytics/_components/MonthlyVelocityChart.tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  Tooltip,
  Area,
  ComposedChart,
  defs,
} from "recharts";
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { MonthlyPoint } from "@/app/actions/analytics";

interface Props {
  data: MonthlyPoint[] | null; // null = free user
}

const THAI_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function monthLabel(month: string): string {
  const m = parseInt(month.slice(5, 7), 10);
  return THAI_MONTHS[m - 1] ?? month;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="font-medium">{label}</p>
      <p className="text-[var(--accent)]">รายจ่าย {formatTHB(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

const PLACEHOLDER: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => ({
  month: `2025-${String(i + 1).padStart(2, "0")}`,
  expense: 8000 + Math.sin(i) * 3000,
  income: 45000,
}));

export function MonthlyVelocityChart({ data }: Props) {
  const display = data ?? PLACEHOLDER;
  const chartData = display.map((p) => ({ ...p, label: monthLabel(p.month) }));

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
          <Lock size={20} className="text-fg-muted" />
          <Link href="/paywall" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black">
            🔒 ปลดล็อกด้วย Pro
          </Link>
        </div>
      )}
      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="mb-3 text-xs font-medium text-fg-muted">📈 Monthly Velocity (รายจ่าย 12 เดือน)</p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <filter id="velocity-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="velocity-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#facc15" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-fg-muted, #aaa)", fontSize: 10 }}
              interval={1}
            />
            <Area
              type="monotone"
              dataKey="expense"
              fill="url(#velocity-fill)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#facc15"
              strokeWidth={2.5}
              dot={false}
              filter="url(#velocity-glow)"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/analytics/_components/MonthlyVelocityChart.tsx"
git commit -m "feat: add MonthlyVelocityChart with glowing line and Pro blur overlay"
```

---

## Task 4: CategoryBreakdownChart component

**Files:**
- Create: `app/(dashboard)/analytics/_components/CategoryBreakdownChart.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/analytics/_components/CategoryBreakdownChart.tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { CategorySpend } from "@/app/actions/analytics";

interface Props {
  data: CategorySpend[] | null; // null = free user
}

const PALETTE = ["#facc15", "#34d399", "#818cf8", "#f87171", "#fb923c", "#38bdf8"];

const PLACEHOLDER: CategorySpend[] = [
  { categoryId: "1", categoryName: "อาหาร",    spent: 8200,  budget: 10000 },
  { categoryId: "2", categoryName: "เดินทาง",   spent: 3100,  budget: 5000  },
  { categoryId: "3", categoryName: "ช้อปปิ้ง", spent: 4800,  budget: 5000  },
  { categoryId: "4", categoryName: "กาแฟ",      spent: 2400,  budget: null  },
];

export function CategoryBreakdownChart({ data }: Props) {
  const display = data ?? PLACEHOLDER;
  const total = display.reduce((sum, c) => sum + c.spent, 0);

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
          <Lock size={20} className="text-fg-muted" />
          <Link href="/paywall" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black">
            🔒 ปลดล็อกด้วย Pro
          </Link>
        </div>
      )}
      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="mb-3 text-xs font-medium text-fg-muted">🍩 Category Breakdown (เดือนนี้)</p>
        <div className="flex items-center gap-4">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={display}
                  dataKey="spent"
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  strokeWidth={0}
                >
                  {display.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold tabular-nums">{formatTHB(total)}</p>
              <p className="text-[9px] text-fg-muted">รายจ่าย</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {display.map((cat, i) => {
              const overBudget = cat.budget !== null && cat.spent > cat.budget;
              return (
                <div key={cat.categoryId} className="flex items-center gap-2 text-xs">
                  <span
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="flex-1 truncate text-fg-muted">{cat.categoryName}</span>
                  <span className={overBudget ? "text-[var(--negative)]" : "tabular-nums"}>
                    {formatTHB(cat.spent)}
                  </span>
                  <span className="text-fg-muted">
                    / {cat.budget !== null ? formatTHB(cat.budget) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/analytics/_components/CategoryBreakdownChart.tsx"
git commit -m "feat: add CategoryBreakdownChart donut with legend and Pro blur overlay"
```

---

## Task 5: TransactionFormDrawer component

**Files:**
- Create: `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle } from "lucide-react";
import { addTransaction, updateTransaction, deleteTransaction } from "@/app/actions/transactions";
import { bangkokToday } from "@/app/actions/overview-utils";
import type { TransactionPayload } from "@/app/actions/transactions";
import type { TransactionType } from "@/lib/types";

export interface TransactionRow {
  id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  date: string;
  note: string | null;
  categories: { name: string } | null;
}

interface Props {
  mode: "add" | "edit";
  transaction?: TransactionRow;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

function bangkokTodayStr(): string {
  const { year, month, day } = bangkokToday();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function TransactionFormDrawer({
  mode,
  transaction,
  categories,
  onClose,
  onSuccess,
}: Props) {
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? "");
  const [date, setDate] = useState(transaction?.date?.slice(0, 10) ?? bangkokTodayStr());
  const [note, setNote] = useState(transaction?.note ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) { setError("กรุณากรอกจำนวนเงินที่ถูกต้อง"); return; }
    if (!date) { setError("กรุณาเลือกวันที่"); return; }

    setLoading(true); setError(null);
    const payload: TransactionPayload = {
      amount: num,
      type,
      category_id: categoryId || null,
      date,
      note: note.trim() || null,
    };

    try {
      if (mode === "add") await addTransaction(payload);
      else await updateTransaction(transaction!.id, payload);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true); setError(null);
    try {
      await deleteTransaction(transaction.id);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!loading && !deleting) onClose(); }}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {/* Handle + header */}
        <div className="mb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "add" ? "เพิ่มรายการ" : "แก้ไขรายการ"}
          </h2>
          <button onClick={() => { if (!loading && !deleting) onClose(); }} disabled={loading || deleting}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["expense", "income"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  type === t ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {t === "expense" ? "รายจ่าย" : "รายรับ"}
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

          {/* Date */}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
            required
          />

          {/* Note */}
          <input
            type="text"
            placeholder="หมายเหตุ (ไม่บังคับ)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />

          {error && (
            <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-sm text-[var(--negative)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || deleting}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {loading ? "กำลังบันทึก…" : mode === "add" ? "บันทึก" : "อัปเดต"}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx"
git commit -m "feat: add TransactionFormDrawer — add/edit/delete bottom sheet"
```

---

## Task 6: TransactionList component

**Files:**
- Create: `app/(dashboard)/analytics/_components/TransactionList.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/analytics/_components/TransactionList.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});

  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase
      .from("transactions")
      .select("id, amount, type, date, note, category_id, categories(name), brands(name, logo_url)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(50);
    setTransactions((data ?? []) as TransactionRow[]);
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
    try { await deleteTransaction(id); }
    catch { fetchTransactions(); } // revert optimistic removal on error
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
            const catName = (tx as any).categories?.name ?? "ไม่มีหมวดหมู่";
            const brandLogo = (tx as any).brands?.logo_url;

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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/analytics/_components/TransactionList.tsx"
git commit -m "feat: add TransactionList with swipe-to-delete, add/edit drawer, client-side fetch"
```

---

## Task 7: Wire Analytics page

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
// app/(dashboard)/analytics/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getAnalyticsData } from "@/app/actions/analytics";
import { MonthlyVelocityChart } from "./_components/MonthlyVelocityChart";
import { CategoryBreakdownChart } from "./_components/CategoryBreakdownChart";
import { TransactionList } from "./_components/TransactionList";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

  const analytics = await getAnalyticsData(user.id, isPro);

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">วิเคราะห์</h1>
      </header>

      <MonthlyVelocityChart data={analytics.monthlyPoints} />

      <CategoryBreakdownChart data={analytics.categorySpend} />

      <TransactionList userId={user.id} />
    </section>
  );
}
```

- [ ] **Step 2: Run full build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected includes:
```
├ ƒ /analytics
✓ Compiled successfully
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/analytics/page.tsx"
git commit -m "feat: wire Analytics page — velocity chart, category donut, transaction CRUD list"
```

---

## Self-Review

**Spec coverage:**
- ✅ `getAnalyticsData()` — trailing 12-month velocity + current month category breakdown — Task 1
- ✅ `addTransaction`, `updateTransaction`, `deleteTransaction` with brand auto-match — Task 2
- ✅ Glowing line chart, no grid, Thai month labels, area fill, Pro blur overlay — Task 3
- ✅ Donut chart, center label, legend with actual/budget, over-budget red, Pro blur — Task 4
- ✅ TransactionFormDrawer: add/edit/delete, all 5 fields, Bangkok today default, error messages — Task 5
- ✅ TransactionList: client-fetch parallel (txns + categories), swipe-to-delete, FAB, empty state — Task 6
- ✅ Analytics page wired, Pro check, redirect on no user — Task 7
- ✅ Free users: CRUD list always shown; charts get null data → blur overlay — Tasks 3, 4, 6
- ✅ `TransactionRow` type exported from `TransactionFormDrawer` for use in `TransactionList` — Task 5/6
- ✅ Empty state "ยังไม่มีรายการ — แตะ + เพื่อเพิ่ม" — Task 6

**Type consistency:**
- `MonthlyPoint`, `CategorySpend`, `AnalyticsData` defined in Task 1, imported in Tasks 3 & 4 ✅
- `TransactionPayload` defined in Task 2, used in Task 5 ✅
- `TransactionRow` defined in Task 5, imported in Task 6 ✅
- `bangkokToday()` from `@/app/actions/overview-utils` used in Task 5 (for date default) ✅

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete ✅
