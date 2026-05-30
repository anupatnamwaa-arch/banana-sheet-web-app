# Navigation & Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure bottom nav to 5 tabs with a protruding FAB, add a cashflow hero card with profile avatar to the home page, and create a `/transactions` page.

**Architecture:** Four focused changes — (1) new BottomNav with notched FAB, (2) new HomeHeader server component wired into overview/page.tsx, (3) minimal /transactions page reusing the existing TransactionList and TransactionFormDrawer from analytics, (4) FAB deep-link via `?add=1` query param.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, lucide-react, Supabase (server client), existing glass design system.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/(dashboard)/_components/BottomNav.tsx` | Modify | 5-tab nav + notched FAB |
| `app/(dashboard)/overview/_components/HomeHeader.tsx` | Create | Greeting + profile avatar + cashflow card |
| `app/(dashboard)/overview/page.tsx` | Modify | Add HomeHeader, pass user + data |
| `app/(dashboard)/transactions/page.tsx` | Create | Transactions list page with FAB auto-open |
| `app/(dashboard)/transactions/_components/TransactionListView.tsx` | Create | Client wrapper with TransactionFormDrawer + FAB auto-open |

---

## Task 1: Update BottomNav — 5 tabs + notched FAB

**Files:**
- Modify: `app/(dashboard)/_components/BottomNav.tsx`

- [ ] **Step 1: Replace BottomNav with this implementation**

```typescript
// app/(dashboard)/_components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, ChartLine, Plus, CreditCard, Wallet } from "lucide-react";

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
  const router = useRouter();

  function handleFab() {
    if (pathname.startsWith("/transactions")) {
      // Already on transactions page — signal via URL param
      router.push("/transactions?add=1");
    } else {
      router.push("/transactions?add=1");
    }
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="relative mx-auto flex max-w-md items-center">
        {/* Nav bar */}
        <div className="glass flex w-full items-center justify-around p-2">
          {/* Left tabs */}
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
          <div className="flex-1" aria-hidden />

          {/* Right tabs */}
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

        {/* Notched FAB — centred, protrudes above nav */}
        <button
          onClick={handleFab}
          aria-label="เพิ่มรายการ"
          className="absolute left-1/2 -translate-x-1/2 -translate-y-5 flex h-13 w-13 items-center justify-center rounded-full bg-accent text-black shadow-[0_6px_24px_rgba(250,204,21,0.45)] transition-transform active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}
```

Note: `h-13 w-13` = 52px (Tailwind v4 supports arbitrary values; use `h-[52px] w-[52px]` if it doesn't resolve).

- [ ] **Step 2: Verify the nav renders — start dev server and open any dashboard page**

```bash
npm run dev
```

Check: 4 tab labels visible (หน้าแรก, วิเคราะห์, รายการ, ทรัพย์สิน), yellow FAB in center protruding above nav bar. Settings tab gone.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/_components/BottomNav.tsx"
git commit -m "feat: 5-tab bottom nav with notched FAB"
```

---

## Task 2: Create HomeHeader component

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
  return `฿${Math.abs(n).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
    netCashflow > 0 ? "text-positive" : netCashflow < 0 ? "text-negative" : "text-fg";

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

## Task 3: Wire HomeHeader into overview/page.tsx

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Read the current file**

Read `app/(dashboard)/overview/page.tsx` to confirm the current structure before editing.

- [ ] **Step 2: Add HomeHeader import and derive displayName**

Add `HomeHeader` import at the top of the file with the other imports:

```typescript
import { HomeHeader } from "./_components/HomeHeader";
```

- [ ] **Step 3: Derive displayName from user object**

After the `isPro` line, add:

```typescript
  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "คุณ";
```

- [ ] **Step 4: Replace the `<header>` block in the return statement**

Find and replace this block:

```typescript
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ภาพรวม</h1>
      </header>
```

With:

```typescript
      <HomeHeader
        displayName={displayName}
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
      />
```

- [ ] **Step 5: Verify in browser**

Navigate to `/overview`. Check: greeting with first name, Thai date, cashflow card with net number + income/expense mini-cards, profile avatar top-right linking to `/settings`.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/overview/page.tsx"
git commit -m "feat: wire HomeHeader into overview page"
```

---

## Task 4: Create /transactions page

**Files:**
- Create: `app/(dashboard)/transactions/page.tsx`
- Create: `app/(dashboard)/transactions/_components/TransactionListView.tsx`

- [ ] **Step 1: Create the client wrapper TransactionListView**

This component reuses `TransactionList` and `TransactionFormDrawer` from analytics, and handles the `?add=1` auto-open behaviour.

```typescript
// app/(dashboard)/transactions/_components/TransactionListView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TransactionList } from "@/app/(dashboard)/analytics/_components/TransactionList";
import { TransactionFormDrawer } from "@/app/(dashboard)/analytics/_components/TransactionFormDrawer";

interface Props {
  userId: string;
  categories: Array<{ id: string; name: string }>;
}

export function TransactionListView({ userId, categories }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const handledRef = useRef(false);

  // Auto-open drawer when ?add=1 is present
  useEffect(() => {
    if (searchParams.get("add") === "1" && !handledRef.current) {
      handledRef.current = true;
      setDrawerOpen(true);
      // Clean up the URL without re-navigating
      router.replace("/transactions", { scroll: false });
    }
  }, [searchParams, router]);

  function handleClose() {
    setDrawerOpen(false);
  }

  function handleSuccess() {
    setDrawerOpen(false);
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <TransactionList key={refreshKey} userId={userId} />

      {drawerOpen && (
        <TransactionFormDrawer
          mode="add"
          categories={categories}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Create the transactions page**

```typescript
// app/(dashboard)/transactions/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TransactionListView } from "./_components/TransactionListView";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categoryRows } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const categories = (categoryRows ?? []) as Array<{ id: string; name: string }>;

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">รายการ</h1>
      </header>

      <TransactionListView userId={user.id} categories={categories} />
    </section>
  );
}
```

- [ ] **Step 3: Verify the page**

Navigate to `/transactions`. Check: transaction list renders. Click FAB in nav bar → drawer opens. Add a transaction → list refreshes.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/transactions/page.tsx" "app/(dashboard)/transactions/_components/TransactionListView.tsx"
git commit -m "feat: add /transactions page with FAB auto-open"
```

---

## Task 5: TypeScript check + smoke test

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (zero errors). If errors appear, fix them before continuing.

- [ ] **Step 2: Manual smoke test checklist**

Start dev server (`npm run dev`) and verify:

- [ ] `/overview` — greeting shows first name, Thai date, cashflow card present, profile avatar top-right links to `/settings`
- [ ] `/overview` → tap profile avatar → lands on `/settings`
- [ ] Bottom nav shows 4 labels: หน้าแรก, วิเคราะห์, รายการ, ทรัพย์สิน — no Settings tab
- [ ] Yellow FAB protrudes above nav centre
- [ ] Tap FAB from any page → `/transactions` opens with add-transaction drawer
- [ ] `/transactions` tab in nav → navigates to transactions list
- [ ] `/analytics` still works (TransactionList still renders there)

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: smoke test fixes"
```
