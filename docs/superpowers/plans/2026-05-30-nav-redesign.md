# Navigation & Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure bottom nav to 5 tabs with a protruding FAB that opens a universal add-drawer (transactions + wealth), add a cashflow hero card with profile avatar to the home page, and create a `/transactions` page.

**Architecture:** Five focused changes — (1) DB migration to add `savings` transaction type, (2) new `BottomNav` with notched FAB + `UniversalFabDrawer`, (3) new `HomeHeader` server component, (4) updated overview page, (5) new `/transactions` page reusing existing `TransactionList`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, lucide-react, framer-motion, Supabase (server client + migrations), existing glass design system.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260530000001_add_savings_type.sql` | Create | Add `savings` to transactions.type check constraint |
| `lib/types.ts` | Modify | Add `"savings"` to `TransactionType` |
| `app/(dashboard)/_components/UniversalFabDrawer.tsx` | Create | 2-tab drawer: transactions (expense/income/savings) + wealth (asset/debt) |
| `app/(dashboard)/_components/BottomNav.tsx` | Modify | 5-tab nav + notched FAB wired to UniversalFabDrawer |
| `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx` | Modify | Add `savings` to the type toggle (edit flow) |
| `app/(dashboard)/overview/_components/HomeHeader.tsx` | Create | Greeting + profile avatar + cashflow card |
| `app/(dashboard)/overview/page.tsx` | Modify | Replace header with HomeHeader, pass user + data |
| `app/(dashboard)/transactions/page.tsx` | Create | Transactions list page |

---

## Task 1: DB migration — add savings type

**Files:**
- Create: `supabase/migrations/20260530000001_add_savings_type.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260530000001_add_savings_type.sql
-- Drop the existing check constraint and recreate it with savings included.
alter table transactions
  drop constraint if exists transactions_type_check;

alter table transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'savings'));
```

- [ ] **Step 2: Apply migration to your Supabase project**

Run in Supabase SQL editor or via CLI:
```bash
# Via Supabase CLI (if linked):
npx supabase db push

# Or paste the SQL directly into the Supabase dashboard SQL editor and run it.
```

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/20260530000001_add_savings_type.sql
git commit -m "feat: add savings transaction type to DB constraint"
```

---

## Task 2: Update TransactionType in types.ts

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Update the type**

Find:
```typescript
export type TransactionType = "income" | "expense";
```

Replace with:
```typescript
export type TransactionType = "income" | "expense" | "savings";
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (the type is used as a string union — widening it is backward-compatible).

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add savings to TransactionType"
```

---

## Task 3: Update existing TransactionFormDrawer to show savings tab

**Files:**
- Modify: `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx`

The existing drawer is used in the analytics page for **editing** transactions. It currently shows a 2-button toggle (expense/income). Add savings as a third option.

- [ ] **Step 1: Find the type toggle section**

In `TransactionFormDrawer.tsx`, find this block (around line 122):
```typescript
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
```

Replace with:
```typescript
          <div className="flex gap-2">
            {(["expense", "income", "savings"] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  type === t ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {t === "expense" ? "รายจ่าย" : t === "income" ? "รายรับ" : "ออมเงิน"}
              </button>
            ))}
          </div>
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx"
git commit -m "feat: add savings type to TransactionFormDrawer"
```

---

## Task 4: Create UniversalFabDrawer

**Files:**
- Create: `app/(dashboard)/_components/UniversalFabDrawer.tsx`

This is the drawer that opens when the FAB is tapped. It has two tabs: **รายการ** (transactions) and **ทรัพย์สิน** (wealth).

- [ ] **Step 1: Create the component**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/_components/UniversalFabDrawer.tsx"
git commit -m "feat: add UniversalFabDrawer with transaction and wealth tabs"
```

---

## Task 5: Update BottomNav — 5 tabs + FAB wired to UniversalFabDrawer

**Files:**
- Modify: `app/(dashboard)/_components/BottomNav.tsx`

The BottomNav needs categories to pass into UniversalFabDrawer. Fetch them client-side when drawer opens (lazy fetch to avoid blocking nav render).

- [ ] **Step 1: Replace BottomNav with this implementation**

```typescript
// app/(dashboard)/_components/BottomNav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ChartLine, Plus, CreditCard, Wallet } from "lucide-react";
import { UniversalFabDrawer } from "./UniversalFabDrawer";

const LEFT_TABS = [
  { href: "/overview", label: "หน้าแรก", Icon: House },
  { href: "/analytics", label: "วิเคราะห์", Icon: ChartLine },
];

const RIGHT_TABS = [
  { href: "/transactions", label: "รายการ", Icon: CreditCard },
  { href: "/wealth", label: "ทรัพย์สิน", Icon: Wallet },
];

export function BottomNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  async function handleFabClick() {
    // Lazy-fetch categories on first open
    if (categories.length === 0) {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch {
        // proceed with empty categories — still usable
      }
    }
    setDrawerOpen(true);
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto flex max-w-md items-end">
          {/* Nav bar */}
          <div className="glass flex w-full items-center justify-around p-2">
            {LEFT_TABS.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
                    active ? "text-accent" : "text-fg-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              );
            })}

            {/* FAB spacer */}
            <div className="w-14 flex-shrink-0" aria-hidden />

            {RIGHT_TABS.map(({ href, label, Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
                    active ? "text-accent" : "text-fg-muted"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Notched FAB — protrudes 20px above nav */}
          <button
            onClick={handleFabClick}
            aria-label="เพิ่มรายการ"
            style={{ bottom: "calc(100% - 20px)" }}
            className="absolute left-1/2 -translate-x-1/2 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-black shadow-[0_6px_24px_rgba(250,204,21,0.45)] transition-transform active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <UniversalFabDrawer
          categories={categories}
          onClose={() => setDrawerOpen(false)}
          onSuccess={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/_components/BottomNav.tsx"
git commit -m "feat: 5-tab nav with notched FAB opening UniversalFabDrawer"
```

---

## Task 6: Create /api/categories route

The BottomNav fetches categories client-side. Create a simple API route for this.

**Files:**
- Create: `app/api/categories/route.ts`

- [ ] **Step 1: Create the route**

```typescript
// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 200 });

  const { data } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json(data ?? []);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat: add /api/categories route for FAB drawer"
```

---

## Task 7: Create HomeHeader component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeHeader.tsx`

- [ ] **Step 1: Create the file**

```typescript
// app/(dashboard)/overview/_components/HomeHeader.tsx
import Link from "next/link";

interface Props {
  displayName: string;
  totalIncome: number;
  totalExpense: number;
}

function fmt(n: number): string {
  return `฿${Math.abs(n).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function thaiDate(): string {
  return new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function HomeHeader({ displayName, totalIncome, totalExpense }: Props) {
  const netCashflow = totalIncome - totalExpense;
  const initial = displayName.charAt(0).toUpperCase();

  const cashflowColor =
    netCashflow > 0
      ? "text-positive"
      : netCashflow < 0
        ? "text-negative"
        : "text-fg";

  const cashflowSign = netCashflow >= 0 ? "+" : "-";

  return (
    <div className="space-y-4 pt-2">
      {/* Greeting row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">สวัสดี, {displayName} 👋</p>
          <p className="text-xs text-fg-muted">{thaiDate()}</p>
        </div>
        <Link
          href="/settings"
          aria-label="ตั้งค่า"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-black transition-opacity hover:opacity-80"
        >
          {initial}
        </Link>
      </div>

      {/* Cashflow hero card */}
      <div className="glass relative overflow-hidden rounded-[var(--radius-card)] p-4">
        {/* Yellow accent line at top */}
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: "linear-gradient(90deg, var(--accent), transparent)" }}
        />

        <p className="text-xs text-fg-muted">กระแสเงินสด เดือนนี้</p>
        <p className={`mt-1 text-3xl font-bold tracking-tight ${cashflowColor}`}>
          {cashflowSign}{fmt(netCashflow)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-positive/10 p-3">
            <p className="text-xs text-fg-muted">รายรับ</p>
            <p className="mt-0.5 text-sm font-semibold text-positive">+{fmt(totalIncome)}</p>
          </div>
          <div className="rounded-xl bg-negative/10 p-3">
            <p className="text-xs text-fg-muted">รายจ่าย</p>
            <p className="mt-0.5 text-sm font-semibold text-negative">-{fmt(totalExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeHeader.tsx"
git commit -m "feat: add HomeHeader with cashflow card and profile avatar"
```

---

## Task 8: Wire HomeHeader into overview/page.tsx

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Add HomeHeader import**

Add to the imports at the top of `app/(dashboard)/overview/page.tsx`:
```typescript
import { HomeHeader } from "./_components/HomeHeader";
```

- [ ] **Step 2: Derive displayName after the isPro line**

```typescript
  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "คุณ";
```

- [ ] **Step 3: Replace the header block**

Find:
```typescript
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ภาพรวม</h1>
      </header>
```

Replace with:
```typescript
      <HomeHeader
        displayName={displayName}
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
      />
```

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/overview/page.tsx"
git commit -m "feat: wire HomeHeader into overview page"
```

---

## Task 9: Create /transactions page

**Files:**
- Create: `app/(dashboard)/transactions/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionList } from "@/app/(dashboard)/analytics/_components/TransactionList";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">รายการ</h1>
      </header>
      <TransactionList userId={user.id} />
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/transactions/page.tsx"
git commit -m "feat: add /transactions page"
```

---

## Task 10: TypeScript check + smoke test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 2: Manual smoke test**

Start dev server (`npm run dev`) and verify:

- [ ] `/overview` — greeting with first name, Thai date, cashflow card, profile avatar links to `/settings`
- [ ] Bottom nav: 4 labels (หน้าแรก, วิเคราะห์, รายการ, ทรัพย์สิน), no Settings tab
- [ ] Yellow FAB protrudes above nav centre
- [ ] Tap FAB → UniversalFabDrawer opens with รายการ/ทรัพย์สิน tabs
- [ ] รายการ tab: 3 type pills (รายจ่าย selected by default, รายรับ, ออมเงิน), amount + category + note fields
- [ ] ทรัพย์สิน tab: ทรัพย์สิน/หนี้สิน pills, name + amount + liquid toggle (assets only)
- [ ] Add a transaction → drawer closes
- [ ] `/transactions` tab in nav → renders transaction list
- [ ] `/analytics` still has its own TransactionFormDrawer for editing (3 type tabs)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes"
```
