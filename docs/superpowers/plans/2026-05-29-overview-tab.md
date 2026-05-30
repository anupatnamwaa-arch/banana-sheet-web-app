# Overview Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Overview tab with 5 Thai-labelled hero metrics, a period selector (presets + custom date range), and Pro-gated Emergency Runway and Daily Pace cards — all computed server-side from Supabase data.

**Architecture:** The page is a Next.js 16 Server Component that reads `searchParams.period` (and optional `from`/`to`), calls a single `getOverviewData()` server action that runs Supabase queries in parallel, and passes pre-computed values to pure display components. Pro-gated cards receive `null` data for free users and render a blur/lock overlay instead of real values.

**Tech Stack:** Next.js 16 App Router (async `searchParams`, `PageProps`), Supabase SSR (`lib/supabase/server.ts`), Tailwind v4 CSS vars, TypeScript, lucide-react. All date bucketing in `Asia/Bangkok` (ADR-0003). `npm run build` does NOT work — always use `node node_modules/next/dist/bin/next build`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/overview.ts` | **Create** | Types + `resolveDateRange()` + `getOverviewData()` |
| `app/(dashboard)/overview/_components/PeriodSelector.tsx` | **Create** | `'use client'` pill tabs + custom date picker |
| `app/(dashboard)/overview/_components/HeroMetrics.tsx` | **Create** | 5-card grid (รายรับ, รายจ่าย, กระแสเงินสด, เงินออม, อัตราออม) |
| `app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx` | **Create** | Pro-gated runway months display |
| `app/(dashboard)/overview/_components/DailyPaceCard.tsx` | **Create** | Pro-gated progress bar |
| `app/(dashboard)/overview/page.tsx` | **Modify** | Wire everything together |

---

## Task 1: Types and `resolveDateRange`

**Files:**
- Create: `app/actions/overview.ts`

- [ ] **Step 1: Create the file with all types and `resolveDateRange`**

```typescript
// app/actions/overview.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { APP_TIMEZONE } from "@/lib/format";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Period = "year" | "3m" | "all" | "custom";

export interface DateRange {
  from: string | null; // ISO UTC string or null (no lower bound)
  to: string | null;   // ISO UTC string or null (no upper bound)
}

export interface RunwayData {
  liquidAssets: number;
  avgMonthlyExpense: number;
  months: number | null; // null → display "∞" (avgMonthlyExpense = 0)
}

export interface DailyPaceData {
  currentMonthExpense: number;
  budgetTarget: number;  // 0 = no budgets and no expense history
  paceLine: number;      // budgetTarget × (daysElapsed / daysInMonth)
  daysElapsed: number;
  daysInMonth: number;
  hasBudget: boolean;    // false = fell back to avgMonthlyExpense
}

export interface OverviewData {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;       // totalIncome - totalExpense
  netSaved: number;          // same value as netCashFlow
  savingRate: number | null; // null when totalIncome = 0
  runway: RunwayData | null; // null for free users
  dailyPace: DailyPaceData | null; // null for free users
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** Returns today's date fields in Asia/Bangkok. */
function bangkokToday(): { year: number; month: number; day: number; daysInMonth: number } {
  const now = new Date();
  const fmt = (part: Intl.DateTimeFormatPartTypes) =>
    parseInt(
      new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, [part]: "numeric" }).format(now),
      10
    );

  const year = fmt("year");
  const month = fmt("month");
  const day = fmt("day");
  // Last day of month = day 0 of next month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { year, month, day, daysInMonth };
}

/**
 * Convert period + optional custom dates into a DateRange.
 * All boundaries are in Asia/Bangkok; stored as UTC ISO strings.
 * Falls back to "3m" on any invalid input.
 */
export function resolveDateRange(
  period?: string,
  from?: string,
  to?: string
): DateRange {
  const { year, month, day } = bangkokToday();

  if (period === "all") return { from: null, to: null };

  if (period === "custom" && from && to) {
    const fromMs = Date.parse(from);
    const toMs = Date.parse(to);
    if (!isNaN(fromMs) && !isNaN(toMs) && fromMs <= toMs) {
      // Treat from as start-of-day Bangkok, to as end-of-day Bangkok.
      const bkkOffset = 7 * 60; // UTC+7 in minutes
      const fromUTC = new Date(fromMs + bkkOffset * 60_000).toISOString();
      const toUTC = new Date(toMs + (bkkOffset * 60_000) + 86_399_000).toISOString();
      return { from: fromUTC, to: toUTC };
    }
    // Invalid custom → fall through to default
  }

  if (period === "year") {
    const janFirst = new Date(Date.UTC(year, 0, 1) - (7 * 3_600_000)).toISOString();
    return { from: janFirst, to: null };
  }

  // Default: "3m" — rolling 90 days back
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
  return { from: ninetyDaysAgo.toISOString(), to: null };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/overview.ts
git commit -m "feat: add overview types and resolveDateRange helper"
```

---

## Task 2: `getOverviewData` server action

**Files:**
- Modify: `app/actions/overview.ts` (append)

- [ ] **Step 1: Append `getOverviewData` to `app/actions/overview.ts`**

```typescript
// Append to app/actions/overview.ts

// ─── Server action ────────────────────────────────────────────────────────────

export async function getOverviewData(
  range: DateRange,
  userId: string,
  isPro: boolean
): Promise<OverviewData> {
  const supabase = await createClient();
  const { year, month, day, daysInMonth } = bangkokToday();

  // Current Bangkok month window for Daily Pace
  const monthStart = new Date(Date.UTC(year, month - 1, 1) - 7 * 3_600_000).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - 7 * 3_600_000).toISOString();

  // 12-month trailing window for avgMonthlyExpense
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 12);
  const trailingStart = twelveMonthsAgo.toISOString();

  // ── Query 1: period transactions (hero metrics) ──────────────────────────
  let periodQuery = supabase
    .from("transactions")
    .select("amount, type")
    .eq("user_id", userId);
  if (range.from) periodQuery = periodQuery.gte("date", range.from);
  if (range.to) periodQuery = periodQuery.lte("date", range.to);

  // ── Query 2: trailing 12-month expenses (avgMonthlyExpense) ──────────────
  const trailingQuery = supabase
    .from("transactions")
    .select("amount, date")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", trailingStart);

  // ── Pro-only queries ──────────────────────────────────────────────────────
  const wealthQuery = isPro
    ? supabase
        .from("wealth_debt")
        .select("value")
        .eq("user_id", userId)
        .eq("type", "asset")
        .eq("is_liquid", true)
    : null;

  const budgetQuery = isPro
    ? supabase.from("budgets").select("limit_amount").eq("user_id", userId)
    : null;

  const currentMonthQuery = isPro
    ? supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("date", monthStart)
        .lt("date", monthEnd)
    : null;

  // ── Parallel fetch ────────────────────────────────────────────────────────
  const [periodResult, trailingResult, wealthResult, budgetResult, currentMonthResult] =
    await Promise.all([
      periodQuery,
      trailingQuery,
      wealthQuery ?? Promise.resolve({ data: null, error: null }),
      budgetQuery ?? Promise.resolve({ data: null, error: null }),
      currentMonthQuery ?? Promise.resolve({ data: null, error: null }),
    ]);

  // ── Hero metrics ──────────────────────────────────────────────────────────
  const periodRows = (periodResult.data ?? []) as Array<{ amount: number; type: string }>;
  let totalIncome = 0;
  let totalExpense = 0;
  for (const r of periodRows) {
    if (r.type === "income") totalIncome += r.amount;
    else totalExpense += r.amount;
  }
  const netCashFlow = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : null;

  // ── avgMonthlyExpense ─────────────────────────────────────────────────────
  const trailingRows = (trailingResult.data ?? []) as Array<{ amount: number; date: string }>;
  const monthBuckets: Record<string, number> = {};
  for (const r of trailingRows) {
    // Bucket by YYYY-MM in Bangkok
    const key = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
    }).format(new Date(r.date)).slice(0, 7);
    monthBuckets[key] = (monthBuckets[key] ?? 0) + r.amount;
  }
  const monthCount = Object.keys(monthBuckets).length;
  const totalTrailingExpense = Object.values(monthBuckets).reduce((a, b) => a + b, 0);
  const avgMonthlyExpense = monthCount > 0 ? totalTrailingExpense / monthCount : 0;

  // ── Pro metrics ───────────────────────────────────────────────────────────
  if (!isPro) {
    return {
      totalIncome, totalExpense,
      netCashFlow, netSaved: netCashFlow, savingRate,
      runway: null, dailyPace: null,
    };
  }

  // Runway
  const wealthRows = (wealthResult.data ?? []) as Array<{ value: number }>;
  const liquidAssets = wealthRows.reduce((sum, r) => sum + r.value, 0);
  const runwayMonths = avgMonthlyExpense > 0 ? liquidAssets / avgMonthlyExpense : null;
  const runway: RunwayData = { liquidAssets, avgMonthlyExpense, months: runwayMonths };

  // Daily Pace
  const budgetRows = (budgetResult.data ?? []) as Array<{ limit_amount: number }>;
  const budgetTotal = budgetRows.reduce((sum, r) => sum + r.limit_amount, 0);
  const hasBudget = budgetTotal > 0;
  const budgetTarget = hasBudget ? budgetTotal : avgMonthlyExpense;
  const paceLine = daysInMonth > 0 ? budgetTarget * (day / daysInMonth) : 0;

  const currentMonthRows = (currentMonthResult.data ?? []) as Array<{ amount: number }>;
  const currentMonthExpense = currentMonthRows.reduce((sum, r) => sum + r.amount, 0);

  const dailyPace: DailyPaceData = {
    currentMonthExpense,
    budgetTarget,
    paceLine,
    daysElapsed: day,
    daysInMonth,
    hasBudget,
  };

  return {
    totalIncome, totalExpense,
    netCashFlow, netSaved: netCashFlow, savingRate,
    runway, dailyPace,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/overview.ts
git commit -m "feat: add getOverviewData server action with parallel Supabase queries"
```

---

## Task 3: PeriodSelector component

**Files:**
- Create: `app/(dashboard)/overview/_components/PeriodSelector.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/PeriodSelector.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Period } from "@/app/actions/overview";

interface Props {
  current: Period;
  customFrom?: string;
  customTo?: string;
}

const PRESETS: Array<{ value: Period; label: string }> = [
  { value: "3m", label: "3 เดือนล่าสุด" },
  { value: "year", label: "ปีนี้" },
  { value: "all", label: "ทั้งหมด" },
  { value: "custom", label: "กำหนดเอง" },
];

export function PeriodSelector({ current, customFrom, customTo }: Props) {
  const router = useRouter();
  const [showCustom, setShowCustom] = useState(current === "custom");
  const [from, setFrom] = useState(customFrom ?? "");
  const [to, setTo] = useState(customTo ?? "");

  function selectPreset(period: Period) {
    if (period === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    router.push(`/overview?period=${period}`);
  }

  function confirmCustom() {
    if (!from || !to || from > to) return;
    router.push(`/overview?period=custom&from=${from}&to=${to}`);
  }

  return (
    <div className="space-y-3">
      {/* Pill row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map(({ value, label }) => {
          const active = current === value || (value === "custom" && showCustom);
          return (
            <button
              key={value}
              onClick={() => selectPreset(value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-accent text-black"
                  : "border border-[var(--glass-border)] text-fg-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Custom date picker */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
          <span className="text-fg-muted text-xs">ถึง</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
          />
          <button
            onClick={confirmCustom}
            disabled={!from || !to || from > to}
            className="rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            ตกลง
          </button>
        </div>
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
git add "app/(dashboard)/overview/_components/PeriodSelector.tsx"
git commit -m "feat: add PeriodSelector with preset pills and custom date range"
```

---

## Task 4: HeroMetrics component

**Files:**
- Create: `app/(dashboard)/overview/_components/HeroMetrics.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/HeroMetrics.tsx
import { formatTHB } from "@/lib/format";
import type { OverviewData } from "@/app/actions/overview";

interface Props {
  data: Pick<OverviewData, "totalIncome" | "totalExpense" | "netCashFlow" | "netSaved" | "savingRate">;
}

function MetricCard({
  label,
  value,
  colour = "neutral",
}: {
  label: string;
  value: string;
  colour?: "neutral" | "positive" | "negative" | "warning";
}) {
  const valueColour = {
    neutral: "text-fg",
    positive: "text-[var(--positive)]",
    negative: "text-[var(--negative)]",
    warning: "text-amber-400",
  }[colour];

  return (
    <div className="glass p-4">
      <p className="text-xs text-fg-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueColour}`}>{value}</p>
    </div>
  );
}

function savingRateColour(rate: number | null): "positive" | "negative" | "warning" | "neutral" {
  if (rate === null) return "neutral";
  if (rate > 20) return "positive";
  if (rate >= 0) return "warning";
  return "negative";
}

function cashFlowColour(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function HeroMetrics({ data }: Props) {
  const { totalIncome, totalExpense, netCashFlow, savingRate } = data;

  return (
    <div className="space-y-3">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="รายรับ" value={formatTHB(totalIncome)} colour="positive" />
        <MetricCard label="รายจ่าย" value={formatTHB(totalExpense)} />
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="กระแสเงินสด"
          value={formatTHB(netCashFlow)}
          colour={cashFlowColour(netCashFlow)}
        />
        <MetricCard
          label="เงินออม"
          value={formatTHB(netCashFlow)}
          colour={cashFlowColour(netCashFlow)}
        />
      </div>
      {/* Row 3 — full width */}
      <MetricCard
        label="อัตราออม"
        value={savingRate !== null ? `${savingRate.toFixed(1)}%` : "—"}
        colour={savingRateColour(savingRate)}
      />
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
git add "app/(dashboard)/overview/_components/HeroMetrics.tsx"
git commit -m "feat: add HeroMetrics component with 5 Thai-labelled metric cards"
```

---

## Task 5: EmergencyRunwayCard component

**Files:**
- Create: `app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { RunwayData } from "@/app/actions/overview";

interface Props {
  data: RunwayData | null; // null = free user
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
      <Lock size={20} className="text-fg-muted" />
      <Link
        href="/paywall"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
      >
        🔒 ปลดล็อกด้วย Pro
      </Link>
    </div>
  );
}

export function EmergencyRunwayCard({ data }: Props) {
  // Placeholder values shown behind lock for free users
  const display = data ?? { liquidAssets: 120000, avgMonthlyExpense: 15000, months: 8 };
  const monthsLabel =
    display.months === null ? "∞" : `${display.months.toFixed(1)}`;

  return (
    <div className="glass relative overflow-hidden p-5">
      {/* Lock overlay for free users */}
      {!data && <LockedOverlay />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted">🛟 Emergency Runway</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {monthsLabel}
          <span className="ml-1 text-lg font-normal text-fg-muted">เดือน</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-fg-muted">
          <div>
            <p>สินทรัพย์สภาพคล่อง</p>
            <p className="font-medium text-fg">{formatTHB(display.liquidAssets)}</p>
          </div>
          <div>
            <p>ค่าใช้จ่ายเฉลี่ย/เดือน</p>
            <p className="font-medium text-fg">{formatTHB(display.avgMonthlyExpense)}</p>
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
git add "app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx"
git commit -m "feat: add EmergencyRunwayCard with Pro blur/lock overlay"
```

---

## Task 6: DailyPaceCard component

**Files:**
- Create: `app/(dashboard)/overview/_components/DailyPaceCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/overview/_components/DailyPaceCard.tsx
import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { DailyPaceData } from "@/app/actions/overview";

interface Props {
  data: DailyPaceData | null; // null = free user
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
      <Lock size={20} className="text-fg-muted" />
      <Link
        href="/paywall"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
      >
        🔒 ปลดล็อกด้วย Pro
      </Link>
    </div>
  );
}

function barColour(expense: number, paceLine: number): string {
  if (paceLine === 0) return "bg-[var(--positive)]";
  const ratio = expense / paceLine;
  if (ratio <= 1.0) return "bg-[var(--positive)]";
  if (ratio <= 1.2) return "bg-amber-400";
  return "bg-[var(--negative)]";
}

export function DailyPaceCard({ data }: Props) {
  // Placeholder values for free-user blur state
  const display = data ?? {
    currentMonthExpense: 8500,
    budgetTarget: 15000,
    paceLine: 9000,
    daysElapsed: 18,
    daysInMonth: 30,
    hasBudget: true,
  };

  const fillPct = display.budgetTarget > 0
    ? Math.min((display.currentMonthExpense / display.budgetTarget) * 100, 100)
    : 0;

  const colour = barColour(display.currentMonthExpense, display.paceLine);

  // Setup prompt when no budget and no expense history
  const showSetupPrompt = data !== null && display.budgetTarget === 0;

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && <LockedOverlay />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted">📊 Daily Pace</p>

        {showSetupPrompt ? (
          <div className="mt-3 text-sm text-fg-muted">
            ตั้งงบประมาณเพื่อดู Daily Pace{" "}
            <Link href="/settings" className="text-accent underline">
              ตั้งค่าเลย
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-3 flex justify-between text-xs text-fg-muted">
              <span>{formatTHB(display.currentMonthExpense)}</span>
              <span>เป้า {formatTHB(display.budgetTarget)}</span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
              <div
                className={`h-full rounded-full transition-all ${colour}`}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            {/* Pace marker + days label */}
            <div className="mt-2 flex justify-between text-xs text-fg-muted">
              <span>
                วันที่ {display.daysElapsed}/{display.daysInMonth}
              </span>
              <span>
                Pace {formatTHB(display.paceLine)}
              </span>
            </div>
            {!display.hasBudget && (
              <p className="mt-1 text-xs text-fg-muted">
                * ใช้ค่าใช้จ่ายเฉลี่ยเนื่องจากยังไม่ได้ตั้งงบ{" "}
                <Link href="/settings" className="text-accent">
                  ตั้งงบ
                </Link>
              </p>
            )}
          </>
        )}
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
git add "app/(dashboard)/overview/_components/DailyPaceCard.tsx"
git commit -m "feat: add DailyPaceCard with progress bar and Pro blur/lock overlay"
```

---

## Task 7: Wire `page.tsx`

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Replace the overview page stub**

```typescript
// app/(dashboard)/overview/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { getOverviewData, resolveDateRange } from "@/app/actions/overview";
import type { Period } from "@/app/actions/overview";
import { PeriodSelector } from "./_components/PeriodSelector";
import { HeroMetrics } from "./_components/HeroMetrics";
import { EmergencyRunwayCard } from "./_components/EmergencyRunwayCard";
import { DailyPaceCard } from "./_components/DailyPaceCard";

// Next.js 16: searchParams is a Promise
interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { period, from, to } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

  const range = resolveDateRange(period, from, to);
  const currentPeriod = (["year", "3m", "all", "custom"].includes(period ?? "")
    ? period
    : "3m") as Period;

  const data = await getOverviewData(range, user.id, isPro);

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ภาพรวม</h1>
      </header>

      <PeriodSelector
        current={currentPeriod}
        customFrom={currentPeriod === "custom" ? from : undefined}
        customTo={currentPeriod === "custom" ? to : undefined}
      />

      <HeroMetrics data={data} />

      <EmergencyRunwayCard data={data.runway} />

      <DailyPaceCard data={data.dailyPace} />
    </section>
  );
}
```

- [ ] **Step 2: Run full build and verify all routes clean**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -20
```

Expected output includes:
```
├ ƒ /overview
✓ Compiled successfully
```

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/overview/page.tsx"
git commit -m "feat: wire Overview page — period selector, hero metrics, runway, daily pace"
```

---

## Self-Review

**Spec coverage check:**

- ✅ Period selector: presets (year/3m/all) + custom (from/to) — Task 3
- ✅ URL-driven (searchParams) — Task 7
- ✅ Default period: `3m` — Task 1 `resolveDateRange`
- ✅ 5 hero metrics: รายรับ, รายจ่าย, กระแสเงินสด, เงินออม, อัตราออม — Task 4
- ✅ Hero layout: 2×2 + full-width อัตราออม — Task 4
- ✅ Colour rules for all metrics — Task 4
- ✅ Emergency Runway formula (liquid assets / avgMonthlyExpense) — Task 2
- ✅ Daily Pace formula (currentExpense vs paceLine) — Task 2
- ✅ Avg monthly expense adaptive window (up to 12 months, group by Bangkok month) — Task 2
- ✅ Pro gating: `null` fields for free users, no data computed — Tasks 2, 5, 6
- ✅ Blur/lock overlay with "🔒 ปลดล็อกด้วย Pro" CTA — Tasks 5, 6
- ✅ Setup prompt when `budgetTarget = 0` — Task 6
- ✅ `hasBudget: false` note shown — Task 6
- ✅ "∞" when `avgMonthlyExpense = 0` — Task 5
- ✅ Bangkok timezone for all date math — Tasks 1, 2
- ✅ Custom date validation (from ≤ to, fallback to 3m) — Task 3
- ✅ `isActive()` from `lib/types.ts` used for Pro check — Task 7

**Type consistency check:**

- `Period`, `DateRange`, `OverviewData`, `RunwayData`, `DailyPaceData` defined in Task 1, imported consistently in Tasks 3, 4, 5, 6, 7. ✅
- `getOverviewData(range, userId, isPro)` defined in Task 2, called in Task 7. ✅
- `resolveDateRange(period?, from?, to?)` defined in Task 1, called in Task 7. ✅
- `bangkokToday()` is a private helper (not exported), used internally by Tasks 1 & 2. ✅
