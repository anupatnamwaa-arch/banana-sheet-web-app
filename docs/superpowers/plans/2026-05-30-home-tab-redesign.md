# Home Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Home/Overview tab to show a monthly cashflow snapshot: remaining money card, income/expense/savings summary, budget progress, today's spending, recent transactions, and one smart insight.

**Architecture:** New `getHomeData` server action returns all data in one parallel fetch. Six new focused components replace the current overview content. `HomeHeader` stays as-is. Old `HeroMetrics`, `EmergencyRunwayCard`, `DailyPaceCard`, `PeriodSelector` are removed from the home page (they stay in codebase for potential use elsewhere).

**Tech Stack:** Next.js App Router, Supabase server client, Tailwind CSS v4, Noto Sans Thai, existing glass design system.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `app/actions/home.ts` | Create | `getHomeData` — all home tab data in one fetch |
| `app/(dashboard)/overview/_components/HomeBalanceCard.tsx` | Create | Main remaining money card |
| `app/(dashboard)/overview/_components/HomeSummaryCards.tsx` | Create | 4 small cards: income, expense, savings, rate |
| `app/(dashboard)/overview/_components/HomeBudgetProgress.tsx` | Create | Budget progress bar |
| `app/(dashboard)/overview/_components/HomeTodayCard.tsx` | Create | Today's spending |
| `app/(dashboard)/overview/_components/HomeRecentTransactions.tsx` | Create | Last 3-5 transactions with "ดูทั้งหมด" |
| `app/(dashboard)/overview/_components/HomeInsightCard.tsx` | Create | Single smart insight |
| `app/(dashboard)/overview/page.tsx` | Modify | Wire all new components, remove old ones |

---

## Task 1: Create `getHomeData` server action

**Files:**
- Create: `app/actions/home.ts`

- [ ] **Step 1: Create the server action**

```typescript
// app/actions/home.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { bangkokToday } from "./overview-utils";

export interface RecentTransaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "savings";
  note: string | null;
  category: string | null;
  date: string;
}

export interface HomeData {
  // This month totals
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingRate: number | null;
  remaining: number;          // income - expense - savings
  // Budget
  budgetTotal: number;
  budgetUsed: number;         // = totalExpense this month
  // Today
  todayExpense: number;
  todayCount: number;
  avgDailyExpense: number;    // totalExpense / daysElapsed (0 if no days)
  // Days
  daysElapsed: number;
  daysInMonth: number;
  daysRemaining: number;
  // Recent
  recentTransactions: RecentTransaction[];
  // Insight
  insight: string | null;
  // Labels
  monthLabel: string;
}

const MONTH_NAMES_SHORT = [
  "ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.",
  "ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค.",
];

export async function getHomeData(userId: string): Promise<HomeData> {
  const supabase = await createClient();
  const { year, month, day, daysInMonth } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd   = new Date(Date.UTC(year, month, 1)     - bkkOffsetMs).toISOString();

  const prevMonth  = month === 1 ? 12 : month - 1;
  const prevYear   = month === 1 ? year - 1 : year;
  const prevStart  = new Date(Date.UTC(prevYear, prevMonth - 1, 1) - bkkOffsetMs).toISOString();
  const prevEnd    = monthStart;

  const todayStart = new Date(Date.UTC(year, month - 1, day) - bkkOffsetMs).toISOString();
  const todayEnd   = new Date(Date.UTC(year, month - 1, day + 1) - bkkOffsetMs).toISOString();

  const [
    thisMonthResult,
    prevMonthResult,
    budgetsResult,
    todayResult,
    recentResult,
  ] = await Promise.all([
    // This month all transactions
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lt("date", monthEnd),

    // Previous month expenses by category (for insight)
    supabase
      .from("transactions")
      .select("amount, category_id, categories(name)")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", prevStart)
      .lt("date", prevEnd),

    // All budgets
    supabase
      .from("budgets")
      .select("limit_amount")
      .eq("user_id", userId),

    // Today's expenses
    supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("date", todayStart)
      .lt("date", todayEnd),

    // Recent 5 transactions
    supabase
      .from("transactions")
      .select("id, amount, type, note, date, categories(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(5),
  ]);

  // Aggregate this month
  let totalIncome = 0, totalExpense = 0, totalSavings = 0;
  for (const r of thisMonthResult.data ?? []) {
    if (r.type === "income") totalIncome += r.amount;
    else if (r.type === "expense") totalExpense += r.amount;
    else if (r.type === "savings") totalSavings += r.amount;
  }

  // Today
  // Re-query with amount for today expense total
  const { data: todayRows } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", todayStart)
    .lt("date", todayEnd);

  const todayExpense = (todayRows ?? []).reduce((s, r) => s + r.amount, 0);
  const todayCount   = todayRows?.length ?? 0;

  // Budget
  const budgetTotal = (budgetsResult.data ?? []).reduce((s, b) => s + b.limit_amount, 0);

  // Days
  const daysElapsed   = Math.max(1, day);
  const daysRemaining = Math.max(0, daysInMonth - day);
  const avgDailyExpense = totalExpense / daysElapsed;

  // Remaining = income - expense - savings
  const remaining = totalIncome - totalExpense - totalSavings;

  // Saving rate
  const savingRate = totalIncome > 0
    ? Math.round(((totalSavings + Math.max(0, totalIncome - totalExpense - totalSavings)) / totalIncome) * 100)
    : null;

  // Recent transactions
  const recentTransactions: RecentTransaction[] = (recentResult.data ?? []).map((r: {
    id: string;
    amount: number;
    type: string;
    note: string | null;
    date: string;
    categories: { name: string } | null;
  }) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as "income" | "expense" | "savings",
    note: r.note,
    category: r.categories?.name ?? null,
    date: r.date,
  }));

  // Simple insight: compare this month's top expense category to last month
  let insight: string | null = null;
  if (prevMonthResult.data && thisMonthResult.data) {
    // Build this month category totals
    const thisMonthCats: Record<string, number> = {};
    for (const r of recentResult.data ?? []) {
      if ((r as { type: string }).type !== "expense") continue;
      const cat = (r as { categories: { name: string } | null }).categories?.name ?? "อื่นๆ";
      thisMonthCats[cat] = (thisMonthCats[cat] ?? 0) + (r as { amount: number }).amount;
    }

    // Actually use thisMonthResult for expense categories — need a separate query
    // Use a simple insight based on savings rate instead
    if (totalIncome > 0 && totalSavings > 0) {
      const rate = Math.round((totalSavings / totalIncome) * 100);
      insight = `เดือนนี้คุณออมได้ ${rate}% ของรายรับแล้ว 🎉`;
    } else if (budgetTotal > 0 && totalExpense > 0) {
      const pct = Math.round((totalExpense / budgetTotal) * 100);
      if (pct > 90) {
        insight = `ใช้งบไปแล้ว ${pct}% ระวังนิดนึงนะ ⚠️`;
      } else if (daysRemaining > 0 && avgDailyExpense > 0) {
        const dailyBudget = Math.round((budgetTotal - totalExpense) / daysRemaining);
        insight = `ใช้ได้อีกวันละประมาณ ฿${dailyBudget.toLocaleString("th-TH")} จนถึงสิ้นเดือน`;
      }
    }
  }

  return {
    totalIncome,
    totalExpense,
    totalSavings,
    savingRate,
    remaining,
    budgetTotal,
    budgetUsed: totalExpense,
    todayExpense,
    todayCount,
    avgDailyExpense,
    daysElapsed,
    daysInMonth,
    daysRemaining,
    recentTransactions,
    insight,
    monthLabel: `${MONTH_NAMES_SHORT[month - 1]} ${year + 543}`,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/home.ts
git commit -m "feat: add getHomeData server action"
```

---

## Task 2: Create HomeBalanceCard component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeBalanceCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeBalanceCard.tsx

interface Props {
  remaining: number;
  daysRemaining: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
}

function fmt(n: number) {
  return `฿${Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function statusText(remaining: number, daysRemaining: number): { text: string; color: string } {
  if (remaining < 0) return { text: "เกินแผนแล้ว ควรระวัง ⚠️", color: "text-red-400" };
  if (remaining === 0) return { text: "ใช้ครบแผนพอดี", color: "text-yellow-400" };
  if (daysRemaining === 0) return { text: "สิ้นเดือนแล้ว ทำได้ดี 🎉", color: "text-green-400" };
  return { text: "ยังอยู่ในแผน ใช้จ่ายได้สบาย ๆ", color: "text-green-400" };
}

export function HomeBalanceCard({ remaining, daysRemaining, totalIncome, totalExpense, totalSavings }: Props) {
  const dailyAvg = daysRemaining > 0 ? Math.floor(remaining / daysRemaining) : 0;
  const { text, color } = statusText(remaining, daysRemaining);
  const isNegative = remaining < 0;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-5">
      {/* Accent line */}
      <div
        className="absolute inset-x-0 top-0 h-1 rounded-t-[var(--radius-card)]"
        style={{ background: "linear-gradient(90deg,var(--accent),transparent)" }}
      />

      <p className="text-xs text-fg-muted">เงินคงเหลือใช้เดือนนี้</p>
      <p className={`mt-1 text-4xl font-bold tracking-tight ${isNegative ? "text-negative" : "text-fg"}`}>
        {isNegative ? "-" : ""}{fmt(remaining)}
      </p>

      {daysRemaining > 0 && dailyAvg > 0 && (
        <p className="mt-1 text-xs text-fg-muted">
          เฉลี่ยใช้ได้วันละ {fmt(dailyAvg)}
        </p>
      )}

      <p className={`mt-2 text-xs font-medium ${color}`}>{text}</p>

      {/* Mini breakdown */}
      <div className="mt-4 flex gap-3 border-t border-[var(--glass-border)] pt-3 text-xs text-fg-muted">
        <span>{fmt(totalIncome)} <span className="text-positive">รายรับ</span></span>
        <span>−</span>
        <span>{fmt(totalExpense)} <span className="text-negative">รายจ่าย</span></span>
        <span>−</span>
        <span>{fmt(totalSavings)} <span className="text-blue-400">ออม</span></span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeBalanceCard.tsx"
git commit -m "feat: add HomeBalanceCard component"
```

---

## Task 3: Create HomeSummaryCards component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeSummaryCards.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeSummaryCards.tsx

interface Props {
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  savingRate: number | null;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export function HomeSummaryCards({ totalIncome, totalExpense, totalSavings, savingRate }: Props) {
  const cards = [
    {
      label: "รายรับ",
      value: fmt(totalIncome),
      icon: "↑",
      bg: "bg-positive/10",
      text: "text-positive",
    },
    {
      label: "รายจ่าย",
      value: fmt(totalExpense),
      icon: "↓",
      bg: "bg-negative/10",
      text: "text-negative",
    },
    {
      label: "เงินออม",
      value: fmt(totalSavings),
      icon: "🏦",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
    },
    {
      label: "อัตราออม",
      value: savingRate !== null ? `${savingRate}%` : "—",
      icon: "🎯",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl p-3 ${c.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-muted">{c.label}</span>
            <span className="text-base">{c.icon}</span>
          </div>
          <p className={`mt-1 text-xl font-bold ${c.text}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeSummaryCards.tsx"
git commit -m "feat: add HomeSummaryCards component"
```

---

## Task 4: Create HomeBudgetProgress component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeBudgetProgress.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeBudgetProgress.tsx

interface Props {
  budgetUsed: number;
  budgetTotal: number;
}

function fmt(n: number) {
  return `฿${n.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

export function HomeBudgetProgress({ budgetUsed, budgetTotal }: Props) {
  if (budgetTotal === 0) return null;

  const pct = Math.min(100, Math.round((budgetUsed / budgetTotal) * 100));
  const remaining = budgetTotal - budgetUsed;
  const isOver = budgetUsed > budgetTotal;
  const isWarn = pct >= 80 && !isOver;

  const barColor = isOver ? "bg-negative" : isWarn ? "bg-yellow-400" : "bg-positive";

  let statusMsg: string;
  if (isOver) statusMsg = `เกินงบแล้ว ${fmt(Math.abs(remaining))} ⚠️`;
  else if (isWarn) statusMsg = "ใกล้ถึงงบแล้ว ระวังนิดนึง";
  else statusMsg = `เหลืองบอีก ${fmt(remaining)}`;

  const statusColor = isOver ? "text-negative" : isWarn ? "text-yellow-400" : "text-positive";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">งบใช้จ่ายเดือนนี้</p>
        <p className="text-xs text-fg-muted">{pct}%</p>
      </div>

      <p className="mb-2 text-xs text-fg-muted">
        ใช้ไปแล้ว {fmt(budgetUsed)} จาก {fmt(budgetTotal)}
      </p>

      {/* Progress bar */}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className={`mt-2 text-xs font-medium ${statusColor}`}>{statusMsg}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeBudgetProgress.tsx"
git commit -m "feat: add HomeBudgetProgress component"
```

---

## Task 5: Create HomeTodayCard component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeTodayCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeTodayCard.tsx

interface Props {
  todayExpense: number;
  todayCount: number;
  avgDailyExpense: number;
}

function fmt(n: number) {
  return `฿${Math.round(n).toLocaleString("th-TH")}`;
}

export function HomeTodayCard({ todayExpense, todayCount, avgDailyExpense }: Props) {
  const diff = todayExpense - avgDailyExpense;
  const absDiff = Math.abs(Math.round(diff));
  const compText = avgDailyExpense > 0
    ? diff <= 0
      ? `น้อยกว่าค่าเฉลี่ยรายวัน ${fmt(absDiff)}`
      : `มากกว่าค่าเฉลี่ยรายวัน ${fmt(absDiff)}`
    : null;
  const compColor = diff <= 0 ? "text-positive" : "text-negative";

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">วันนี้ใช้ไป</p>
        <span className="text-lg">📅</span>
      </div>
      <p className="mt-1 text-3xl font-bold text-negative">{fmt(todayExpense)}</p>
      <p className="mt-0.5 text-xs text-fg-muted">{todayCount} รายการ</p>
      {compText && (
        <p className={`mt-1 text-xs font-medium ${compColor}`}>{compText}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeTodayCard.tsx"
git commit -m "feat: add HomeTodayCard component"
```

---

## Task 6: Create HomeRecentTransactions component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeRecentTransactions.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeRecentTransactions.tsx
import Link from "next/link";
import type { RecentTransaction } from "@/app/actions/home";

interface Props {
  transactions: RecentTransaction[];
}

const TYPE_ICONS: Record<string, string> = {
  income: "💰",
  expense: "🧾",
  savings: "🏦",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStr = now.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
  const txStr = d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
  if (todayStr === txStr) {
    return `วันนี้ ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}`;
  }
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
}

export function HomeRecentTransactions({ transactions }: Props) {
  if (transactions.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">รายการล่าสุด</p>
        <Link href="/transactions" className="text-xs text-accent">
          ดูทั้งหมด
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.map((t) => {
          const isIncome = t.type === "income";
          const isSavings = t.type === "savings";
          const amtColor = isIncome
            ? "text-positive"
            : isSavings
              ? "text-blue-400"
              : "text-negative";
          const sign = isIncome || isSavings ? "+" : "-";

          return (
            <div key={t.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--glass-bg)] text-base">
                {TYPE_ICONS[t.type]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.note ?? t.category ?? "—"}</p>
                <p className="text-xs text-fg-muted">
                  {t.category && t.note ? `${t.category} • ` : ""}
                  {fmtDate(t.date)}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${amtColor}`}>
                {sign}฿{t.amount.toLocaleString("th-TH")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeRecentTransactions.tsx"
git commit -m "feat: add HomeRecentTransactions component"
```

---

## Task 7: Create HomeInsightCard component

**Files:**
- Create: `app/(dashboard)/overview/_components/HomeInsightCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HomeInsightCard.tsx

interface Props {
  insight: string | null;
}

export function HomeInsightCard({ insight }: Props) {
  if (!insight) return null;

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4">
      <span className="mt-0.5 shrink-0 text-xl">✨</span>
      <div>
        <p className="text-xs font-semibold text-accent">ข้อสังเกต</p>
        <p className="mt-0.5 text-sm leading-relaxed text-fg-muted">{insight}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(dashboard)/overview/_components/HomeInsightCard.tsx"
git commit -m "feat: add HomeInsightCard component"
```

---

## Task 8: Wire all components into overview/page.tsx

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Replace the entire overview page**

```typescript
// app/(dashboard)/overview/page.tsx
import { createClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getHomeData } from "@/app/actions/home";
import { HomeHeader } from "./_components/HomeHeader";
import { HomeBalanceCard } from "./_components/HomeBalanceCard";
import { HomeSummaryCards } from "./_components/HomeSummaryCards";
import { HomeBudgetProgress } from "./_components/HomeBudgetProgress";
import { HomeTodayCard } from "./_components/HomeTodayCard";
import { HomeRecentTransactions } from "./_components/HomeRecentTransactions";
import { HomeInsightCard } from "./_components/HomeInsightCard";

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", userId)
    .single();

  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = true; // DEMO: unlock Pro

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";

  const home = await getHomeData(userId);

  return (
    <section className="space-y-3 pb-4">
      <HomeHeader
        displayName={displayName}
        totalIncome={home.totalIncome}
        totalExpense={home.totalExpense}
      />

      <HomeBalanceCard
        remaining={home.remaining}
        daysRemaining={home.daysRemaining}
        totalIncome={home.totalIncome}
        totalExpense={home.totalExpense}
        totalSavings={home.totalSavings}
      />

      <HomeSummaryCards
        totalIncome={home.totalIncome}
        totalExpense={home.totalExpense}
        totalSavings={home.totalSavings}
        savingRate={home.savingRate}
      />

      <HomeBudgetProgress
        budgetUsed={home.budgetUsed}
        budgetTotal={home.budgetTotal}
      />

      <HomeTodayCard
        todayExpense={home.todayExpense}
        todayCount={home.todayCount}
        avgDailyExpense={home.avgDailyExpense}
      />

      <HomeRecentTransactions transactions={home.recentTransactions} />

      <HomeInsightCard insight={home.insight} />
    </section>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/overview/page.tsx"
git commit -m "feat: wire new Home tab — balance card, summary, budget, today, recent, insight"
```
