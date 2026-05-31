# Finance Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make three settings functional — billing cycle start day (1–28), emergency fund target (months), and balance calculation method — each backed by a new `profiles` column, a Supabase migration, a settings UI component, and wired into the calculation layer.

**Architecture:** One migration adds three columns with defaults that preserve current behaviour. `getBillingCycle()` is a pure helper in `overview-utils.ts`. `home.ts` loads `cycle_start_day` and `balance_method` from profiles and uses them. `EmergencyRunwayCard` gains a `targetMonths` prop and progress bar; the overview page wires it. Three new `"use client"` settings components follow the `SavingsTargetSection` pattern.

**Tech Stack:** Next.js 16 server actions, Supabase, React context (`useT`/`useLocale`), Tailwind CSS, TypeScript `as const` i18n dictionaries.

---

## File Map

**New files:**
```
supabase/migrations/20260531000001_finance_settings.sql
app/(dashboard)/settings/_components/BillingCycleSection.tsx
app/(dashboard)/settings/_components/EmergencyGoalSection.tsx
app/(dashboard)/settings/_components/BalanceMethodSection.tsx
```

**Modified files:**
```
lib/types.ts                                          ← add 3 fields to Profile
app/actions/overview-utils.ts                         ← add getBillingCycle()
app/actions/profile.ts                                ← 3 new server actions
app/actions/home.ts                                   ← cycle + balance method
app/(dashboard)/overview/page.tsx                     ← wire EmergencyRunwayCard
app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx  ← targetMonths + progress
app/(dashboard)/settings/page.tsx                     ← extend select, swap rows
lib/i18n/dictionaries/th.ts                           ← new keys
lib/i18n/dictionaries/en.ts                           ← new keys
```

---

## Task 1: Migration + Profile type

**Files:**
- Create: `supabase/migrations/20260531000001_finance_settings.sql`
- Modify: `lib/types.ts`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260531000001_finance_settings.sql
-- Adds three new profile settings columns.
-- All defaults match current hardcoded behaviour, so existing users are unaffected.

alter table public.profiles
  add column if not exists cycle_start_day  integer not null default 1
    check (cycle_start_day between 1 and 28),
  add column if not exists emergency_months integer not null default 6
    check (emergency_months between 1 and 24),
  add column if not exists balance_method   text    not null default 'net'
    check (balance_method in ('net', 'gross', 'budget'));
```

- [ ] **Step 2: Update `lib/types.ts` — add three fields to `Profile`**

Open `lib/types.ts`. After the `savings_target_pct: number;` line, add:

```ts
  cycle_start_day: number;    // 1–28, day the billing period starts (default 1)
  emergency_months: number;   // 1–24, target months of emergency runway (default 6)
  balance_method: "net" | "gross" | "budget"; // how 'remaining' is calculated (default 'net')
```

Full updated `Profile` interface:

```ts
export interface Profile {
  id: string;
  is_active: boolean;
  api_key: string;
  plan_type: PlanType | null;
  plan_expires_at: string | null;
  promo_code: string | null;
  free_roast_used: boolean;
  last_roast_at: string | null;
  savings_target_pct: number;
  cycle_start_day: number;
  emergency_months: number;
  balance_method: "net" | "gross" | "budget";
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260531000001_finance_settings.sql lib/types.ts
git commit -m "feat(finance-settings): migration + Profile type"
```

---

## Task 2: `getBillingCycle` helper

**Files:**
- Modify: `app/actions/overview-utils.ts`

- [ ] **Step 1: Add the `BillingCycle` interface and `getBillingCycle` function to `overview-utils.ts`**

Append to the end of `app/actions/overview-utils.ts`:

```ts
export interface BillingCycle {
  cycleStart: string;       // ISO UTC — Bangkok midnight of cycle start day
  cycleEnd: string;         // ISO UTC — Bangkok midnight of next cycle start (exclusive)
  cycleStartMonth: number;  // 1-indexed calendar month of cycle start
  cycleStartYear: number;
  cycleEndMonth: number;    // 1-indexed calendar month of cycle end
  cycleEndYear: number;
  daysInCycle: number;      // total days in this billing period
  daysElapsed: number;      // days elapsed including today (min 1)
  daysRemaining: number;    // days remaining (0 on last day)
}

/**
 * Compute the current billing cycle window given today's Bangkok date and the
 * configured start day (1–28).
 *
 * - If today.day >= startDay: cycle started this calendar month on startDay.
 * - If today.day <  startDay: cycle started last calendar month on startDay.
 * - Cycle end is the startDay of the following month (exclusive).
 */
export function getBillingCycle(
  today: { year: number; month: number; day: number },
  startDay: number
): BillingCycle {
  const bkkOffsetMs = 7 * 3_600_000; // UTC+7

  // Determine the calendar month/year the cycle started in
  let cycleStartYear = today.year;
  let cycleStartMonth = today.month; // 1-indexed

  if (today.day < startDay) {
    cycleStartMonth -= 1;
    if (cycleStartMonth === 0) {
      cycleStartMonth = 12;
      cycleStartYear -= 1;
    }
  }

  // Cycle ends on startDay of the month after the cycle started
  let cycleEndYear = cycleStartYear;
  let cycleEndMonth = cycleStartMonth + 1;
  if (cycleEndMonth === 13) {
    cycleEndMonth = 1;
    cycleEndYear += 1;
  }

  // ISO timestamps (Bangkok midnight → UTC)
  const cycleStart = new Date(
    Date.UTC(cycleStartYear, cycleStartMonth - 1, startDay) - bkkOffsetMs
  ).toISOString();
  const cycleEnd = new Date(
    Date.UTC(cycleEndYear, cycleEndMonth - 1, startDay) - bkkOffsetMs
  ).toISOString();

  // Day arithmetic (using UTC day boundaries — no DST in Bangkok)
  const cycleStartDayMs = Date.UTC(cycleStartYear, cycleStartMonth - 1, startDay);
  const cycleEndDayMs   = Date.UTC(cycleEndYear,   cycleEndMonth   - 1, startDay);
  const todayDayMs      = Date.UTC(today.year, today.month - 1, today.day);

  const daysInCycle   = Math.round((cycleEndDayMs - cycleStartDayMs) / 86_400_000);
  const daysElapsed   = Math.max(1, Math.round((todayDayMs - cycleStartDayMs) / 86_400_000) + 1);
  const daysRemaining = Math.max(0, Math.round((cycleEndDayMs - todayDayMs) / 86_400_000) - 1);

  return {
    cycleStart,
    cycleEnd,
    cycleStartMonth,
    cycleStartYear,
    cycleEndMonth,
    cycleEndYear,
    daysInCycle,
    daysElapsed,
    daysRemaining,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Quick manual sanity check**

Open Node REPL or add a temporary `console.log` — verify a few cases mentally:

- `startDay=1, today={year:2026, month:6, day:20}` → cycle June 1–July 1, elapsed=20, remaining=10 ✓
- `startDay=25, today={year:2026, month:6, day:20}` → cycle May 25–June 25, elapsed=27, remaining=4 ✓
- `startDay=25, today={year:2026, month:6, day:25}` → cycle June 25–July 25, elapsed=1, remaining=29 ✓

- [ ] **Step 4: Commit**

```bash
git add app/actions/overview-utils.ts
git commit -m "feat(finance-settings): getBillingCycle helper"
```

---

## Task 3: Three new server actions

**Files:**
- Modify: `app/actions/profile.ts`

- [ ] **Step 1: Add `saveBillingCycle`, `saveEmergencyGoal`, `saveBalanceMethod` to `profile.ts`**

Append to the end of `app/actions/profile.ts`:

```ts
/**
 * Set the billing cycle start day (1–28).
 * Returns the clamped value that was saved.
 */
export async function saveBillingCycle(day: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const clamped = Math.max(1, Math.min(28, Math.round(day)));

  const { error } = await supabase
    .from("profiles")
    .update({ cycle_start_day: clamped })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return clamped;
}

/**
 * Set the emergency fund target in months (1–24).
 * Returns the clamped value that was saved.
 */
export async function saveEmergencyGoal(months: number): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const clamped = Math.max(1, Math.min(24, Math.round(months)));

  const { error } = await supabase
    .from("profiles")
    .update({ emergency_months: clamped })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return clamped;
}

/**
 * Set the balance calculation method ('net' | 'gross' | 'budget').
 */
export async function saveBalanceMethod(
  method: "net" | "gross" | "budget"
): Promise<void> {
  if (!["net", "gross", "budget"].includes(method)) {
    throw new Error("Invalid balance method");
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ balance_method: method })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/profile.ts
git commit -m "feat(finance-settings): saveBillingCycle, saveEmergencyGoal, saveBalanceMethod"
```

---

## Task 4: Wire billing cycle + balance method into `home.ts`

**Files:**
- Modify: `app/actions/home.ts`

- [ ] **Step 1: Replace `home.ts` with the billing-cycle-aware version**

Read the current `app/actions/home.ts` first, then apply the following changes:

1. Add import for `getBillingCycle` and `BillingCycle`:
```ts
import { bangkokToday, getBillingCycle } from "./overview-utils";
```

2. After `const supabase = await createClient();` and before the `bangkokToday()` call, add a profile settings query:

```ts
  // Load cycle and balance settings (before computing date range)
  const { data: profileSettings } = await supabase
    .from("profiles")
    .select("cycle_start_day, balance_method")
    .eq("id", userId)
    .single();

  const cycleStartDay =
    (profileSettings as { cycle_start_day: number } | null)?.cycle_start_day ?? 1;
  const balanceMethod =
    (profileSettings as { balance_method: string } | null)?.balance_method ?? "net";
```

3. Replace the `bangkokToday()` + `monthStart`/`monthEnd` block:

**Before:**
```ts
  const { year, month, day, daysInMonth } = bangkokToday();
  const bkkOffsetMs = 7 * 3_600_000;

  const monthStart = new Date(Date.UTC(year, month - 1, 1) - bkkOffsetMs).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1) - bkkOffsetMs).toISOString();
```

**After:**
```ts
  const { year, month, day } = bangkokToday();
  const cycle = getBillingCycle({ year, month, day }, cycleStartDay);
```

4. Update `todayStart`/`todayEnd` (these stay as calendar-day boundaries, unaffected by billing cycle):

```ts
  const bkkOffsetMs = 7 * 3_600_000;
  const todayStart = new Date(Date.UTC(year, month - 1, day) - bkkOffsetMs).toISOString();
  const todayEnd   = new Date(Date.UTC(year, month - 1, day + 1) - bkkOffsetMs).toISOString();
```

5. Replace `.gte("date", monthStart).lt("date", monthEnd)` with `.gte("date", cycle.cycleStart).lt("date", cycle.cycleEnd)` in the `thisMonthResult` query.

6. Replace the days constants:
```ts
  const daysElapsed   = cycle.daysElapsed;
  const daysRemaining = cycle.daysRemaining;
  const daysInMonth   = cycle.daysInCycle; // field renamed in semantics; component usage unchanged
```
(Remove the old `const daysElapsed = Math.max(1, day);` and `const daysRemaining = Math.max(0, daysInMonth - day);` lines.)

7. Replace the `remaining` calculation:

**Before:**
```ts
  const remaining = totalIncome - totalExpense - totalSavings;
```

**After:**
```ts
  const remaining =
    balanceMethod === "gross"  ? totalIncome - totalExpense :
    balanceMethod === "budget" ? budgetTotal - totalExpense :
    /* net (default) */          totalIncome - totalExpense - totalSavings;
```

8. Replace the `monthLabel` at the end of the return:

**Before:**
```ts
    monthLabel: `${MONTH_NAMES_SHORT[month - 1]} ${year + yearOffset}`,
```

**After:**
```ts
    monthLabel: (() => {
      const { cycleStartMonth, cycleStartYear, cycleEndMonth, cycleEndYear } = cycle;
      if (cycleStartDay === 1) {
        return `${MONTH_NAMES_SHORT[cycleStartMonth - 1]} ${cycleStartYear + yearOffset}`;
      }
      const endDay = cycleStartDay - 1;
      const sameYear = cycleStartYear === cycleEndYear;
      if (sameYear) {
        return `${cycleStartDay} ${MONTH_NAMES_SHORT[cycleStartMonth - 1]} – ${endDay} ${MONTH_NAMES_SHORT[cycleEndMonth - 1]} ${cycleStartYear + yearOffset}`;
      }
      return `${cycleStartDay} ${MONTH_NAMES_SHORT[cycleStartMonth - 1]} ${cycleStartYear + yearOffset} – ${endDay} ${MONTH_NAMES_SHORT[cycleEndMonth - 1]} ${cycleEndYear + yearOffset}`;
    })(),
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/actions/home.ts
git commit -m "feat(finance-settings): home.ts uses billing cycle + balance method"
```

---

## Task 5: Add i18n keys

**Files:**
- Modify: `lib/i18n/dictionaries/th.ts`
- Modify: `lib/i18n/dictionaries/en.ts`

- [ ] **Step 1: Add new keys to `th.ts`**

In `lib/i18n/dictionaries/th.ts`, inside the `settings` object, add after the existing `balanceMethod` key area (find `balanceMethod:` or near the end of the `settings` block):

```ts
    // Billing cycle
    billingCycleDrawerTitle: "วันเริ่มรอบเดือน",
    billingCycleDayTemplate: "วันที่ {n}",
    billingCycleSaving: "กำลังบันทึก…",
    billingCycleSaved: "บันทึกแล้ว ✓",
    billingCycleError: "บันทึกไม่สำเร็จ",
    // Emergency goal
    emergencyGoalLabel: "เป้าหมายเงินสำรอง",
    emergencyGoalHint: "จำนวนเดือนของค่าใช้จ่ายที่อยากสำรองไว้",
    emergencyGoalSave: "บันทึกเป้าหมาย",
    emergencyGoalSaving: "กำลังบันทึก…",
    emergencyGoalSaved: "บันทึกแล้ว ✓",
    emergencyGoalError: "บันทึกไม่สำเร็จ",
    emergencyGoalMonthsSuffix: "เดือน",
    // Balance method
    balanceMethodTitle: "วิธีคำนวณเงินคงเหลือ",
    balanceMethodNet: "รายรับ − รายจ่าย − ออม",
    balanceMethodNetDesc: "เงินที่ใช้ได้จริงหลังออม",
    balanceMethodGross: "รายรับ − รายจ่าย",
    balanceMethodGrossDesc: "นับเงินออมเป็นส่วนหนึ่งของยอดคงเหลือ",
    balanceMethodBudget: "งบ − รายจ่าย",
    balanceMethodBudgetDesc: "ใช้งบตั้งต้นแทนรายรับ",
    balanceMethodSaving: "กำลังบันทึก…",
    balanceMethodSaved: "บันทึกแล้ว ✓",
    balanceMethodError: "บันทึกไม่สำเร็จ",
```

Also add in the `overview` object (after `emergencyRunway` key area):
```ts
    emergencyGoalReached: "ถึงเป้าหมายแล้ว 🎉",
    emergencyGoalClose: "ใกล้ถึงเป้าหมายแล้ว",
    emergencyGoalBuilding: "กำลังสะสม",
    emergencyGoalTarget: "เป้า",
```

- [ ] **Step 2: Add matching keys to `en.ts`**

In `lib/i18n/dictionaries/en.ts`, add the same keys with English values:

Under `settings`:
```ts
    billingCycleDrawerTitle: "Billing cycle start",
    billingCycleDayTemplate: "Day {n}",
    billingCycleSaving: "Saving…",
    billingCycleSaved: "Saved ✓",
    billingCycleError: "Failed to save",
    emergencyGoalLabel: "Emergency fund target",
    emergencyGoalHint: "How many months of expenses to keep in reserve",
    emergencyGoalSave: "Save target",
    emergencyGoalSaving: "Saving…",
    emergencyGoalSaved: "Saved ✓",
    emergencyGoalError: "Failed to save",
    emergencyGoalMonthsSuffix: "months",
    balanceMethodTitle: "Balance calculation method",
    balanceMethodNet: "Income − Expenses − Savings",
    balanceMethodNetDesc: "Free cash after setting savings aside",
    balanceMethodGross: "Income − Expenses",
    balanceMethodGrossDesc: "Savings counted as available balance",
    balanceMethodBudget: "Budget − Expenses",
    balanceMethodBudgetDesc: "Uses monthly budget as the ceiling",
    balanceMethodSaving: "Saving…",
    balanceMethodSaved: "Saved ✓",
    balanceMethodError: "Failed to save",
```

Under `overview`:
```ts
    emergencyGoalReached: "Goal reached 🎉",
    emergencyGoalClose: "Almost there",
    emergencyGoalBuilding: "Building up",
    emergencyGoalTarget: "Target",
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors (the `Widen<T>` type means `en.ts` must satisfy the widened `Dictionary` shape, which it will once both files have the same keys).

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/
git commit -m "feat(finance-settings): i18n keys for billing cycle, emergency goal, balance method"
```

---

## Task 6: EmergencyRunwayCard — add target + progress

**Files:**
- Modify: `app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx`

- [ ] **Step 1: Replace `EmergencyRunwayCard.tsx`**

Read the current file first. Then write:

```tsx
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { formatTHB } from "@/lib/format";
import type { RunwayData } from "@/app/actions/overview";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  data: RunwayData | null; // null = free user (shows locked overlay)
  targetMonths: number;    // from profiles.emergency_months
}

function LockedOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl backdrop-blur-sm bg-black/30">
      <Lock size={20} className="text-fg-muted" />
      <Link
        href="/paywall"
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black"
      >
        {label}
      </Link>
    </div>
  );
}

export function EmergencyRunwayCard({ data, targetMonths }: Props) {
  const t = useT();
  // Placeholder values shown behind lock for free users
  const display = data ?? { liquidAssets: 120000, avgMonthlyExpense: 15000, months: 8 };
  const currentMonths = display.months ?? 0;
  const monthsLabel = display.months === null ? "∞" : `${display.months.toFixed(1)}`;

  // Progress toward target (only shown when unlocked)
  const progressPct = targetMonths > 0
    ? Math.min(100, Math.round((currentMonths / targetMonths) * 100))
    : 0;
  const reached = currentMonths >= targetMonths;
  const close   = !reached && progressPct >= 80;
  const statusMsg = reached ? t.overview.emergencyGoalReached
                 : close   ? t.overview.emergencyGoalClose
                 :           t.overview.emergencyGoalBuilding;
  const barColor = reached ? "bg-[var(--positive)]"
                 : close   ? "bg-amber-400"
                 :           "bg-blue-400";

  return (
    <div className="glass relative overflow-hidden p-5">
      {!data && <LockedOverlay label={t.common.unlockWithPro} />}

      <div className={!data ? "blur-sm pointer-events-none select-none" : ""}>
        <p className="text-xs font-medium text-fg-muted">🛟 {t.overview.emergencyRunway}</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {monthsLabel}
          <span className="ml-1 text-lg font-normal text-fg-muted">{t.overview.months}</span>
        </p>

        {/* Progress bar toward target */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-fg-muted">
            <span>{statusMsg}</span>
            <span>{t.overview.emergencyGoalTarget} {targetMonths} {t.overview.months}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--glass-border)]">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-fg-muted">
          <div>
            <p>{t.overview.liquidAssets}</p>
            <p className="font-medium text-fg">{formatTHB(display.liquidAssets)}</p>
          </div>
          <div>
            <p>{t.overview.avgMonthlyExpense}</p>
            <p className="font-medium text-fg">{formatTHB(display.avgMonthlyExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx"
git commit -m "feat(finance-settings): EmergencyRunwayCard targetMonths + progress bar"
```

---

## Task 7: Wire EmergencyRunwayCard into the overview page

**Files:**
- Modify: `app/(dashboard)/overview/page.tsx`

- [ ] **Step 1: Replace `app/(dashboard)/overview/page.tsx`**

Read the current file first. The current page fetches only `display_name`. Replace it with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { getHomeData } from "@/app/actions/home";
import { getOverviewData } from "@/app/actions/overview";
import { resolveDateRange } from "@/app/actions/overview-utils";
import { isActive } from "@/lib/types";
import { HomeHeader } from "./_components/HomeHeader";
import { HomeBalanceCard } from "./_components/HomeBalanceCard";
import { HomeSummaryCards } from "./_components/HomeSummaryCards";
import { HomeBudgetProgress } from "./_components/HomeBudgetProgress";
import { HomeTodayCard } from "./_components/HomeTodayCard";
import { HomeRecentTransactions } from "./_components/HomeRecentTransactions";
import { HomeInsightCard } from "./_components/HomeInsightCard";
import { EmergencyRunwayCard } from "./_components/EmergencyRunwayCard";
import { getLocale } from "@/lib/i18n/locale";

export default async function OverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "00000000-0000-0000-0000-000000000000";

  // Load profile — display name + emergency goal target + pro status
  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name, emergency_months, is_active, plan_type, plan_expires_at")
    .eq("id", userId)
    .single();

  const profile = profileData as {
    display_name: string | null;
    emergency_months: number | null;
    is_active: boolean;
    plan_type: string | null;
    plan_expires_at: string | null;
  } | null;

  const displayName =
    profile?.display_name?.trim() ||
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]?.trim() ||
    user?.email?.split("@")[0] ||
    "Demo";

  const targetMonths = profile?.emergency_months ?? 6;
  const isPro = profile ? isActive(profile as Parameters<typeof isActive>[0]) : false;

  const locale = await getLocale();

  // Parallel: home data (home metrics) + overview data (runway)
  const [home, overview] = await Promise.all([
    getHomeData(userId, locale),
    getOverviewData(resolveDateRange("3m"), userId, isPro),
  ]);

  return (
    <section className="space-y-3 pb-4">
      <HomeHeader displayName={displayName} monthLabel={home.monthLabel} />

      <HomeBalanceCard remaining={home.remaining} daysRemaining={home.daysRemaining} />

      <HomeSummaryCards
        totalIncome={home.totalIncome}
        totalExpense={home.totalExpense}
        totalSavings={home.totalSavings}
        savingRate={home.savingRate}
      />

      <HomeBudgetProgress budgetUsed={home.budgetUsed} budgetTotal={home.budgetTotal} />

      <HomeTodayCard
        todayExpense={home.todayExpense}
        todayCount={home.todayCount}
        avgDailyExpense={home.avgDailyExpense}
      />

      <HomeRecentTransactions transactions={home.recentTransactions} />

      <EmergencyRunwayCard data={overview.runway} targetMonths={targetMonths} />

      <HomeInsightCard insight={home.insight} />
    </section>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/overview/page.tsx"
git commit -m "feat(finance-settings): wire EmergencyRunwayCard into overview page"
```

---

## Task 8: BillingCycleSection settings UI

**Files:**
- Create: `app/(dashboard)/settings/_components/BillingCycleSection.tsx`

- [ ] **Step 1: Create `BillingCycleSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { saveBillingCycle } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";
import { format } from "@/lib/i18n";

interface Props {
  initialDay: number;
}

export function BillingCycleSection({ initialDay }: Props) {
  const t = useT();
  const [day, setDay] = useState(initialDay);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(selected: number) {
    if (selected === day) { setDrawerOpen(false); return; }
    startTransition(async () => {
      setError(null);
      try {
        const result = await saveBillingCycle(selected);
        setDay(result);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        setDrawerOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.settings.billingCycleError);
      }
    });
  }

  const dayLabel = format(t.settings.billingCycleDayTemplate, { n: day });

  return (
    <>
      {/* Settings row — tappable */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--glass-bg)] active:bg-[var(--glass-bg)]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          📅
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t.settings.billingCycleDrawerTitle}</p>
        </div>
        {saved && <Check size={14} className="shrink-0 text-[var(--positive)]" />}
        {!saved && <span className="shrink-0 text-xs text-fg-muted">{dayLabel}</span>}
        {error && <span className="shrink-0 text-xs text-negative">{t.settings.billingCycleError}</span>}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="mb-4 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
              </div>
              <p className="mb-4 text-base font-semibold">{t.settings.billingCycleDrawerTitle}</p>

              {/* 4-column grid of days 1–28 */}
              <div
                className={`grid grid-cols-4 gap-2 ${isPending ? "opacity-60 pointer-events-none" : ""}`}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`rounded-2xl py-3 text-sm font-medium transition-all ${
                      d === day
                        ? "bg-accent/10 text-accent border border-accent"
                        : "border border-[var(--glass-border)] text-fg-muted hover:text-fg"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {isPending && (
                <p className="mt-3 text-center text-xs text-fg-muted">{t.settings.billingCycleSaving}</p>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/BillingCycleSection.tsx"
git commit -m "feat(finance-settings): BillingCycleSection day-picker drawer"
```

---

## Task 9: EmergencyGoalSection settings UI

**Files:**
- Create: `app/(dashboard)/settings/_components/EmergencyGoalSection.tsx`

- [ ] **Step 1: Create `EmergencyGoalSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveEmergencyGoal } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

interface Props {
  initialMonths: number;
}

export function EmergencyGoalSection({ initialMonths }: Props) {
  const t = useT();
  const [value, setValue] = useState(initialMonths);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== initialMonths;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveEmergencyGoal(value);
      setValue(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.settings.emergencyGoalError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          🛡️
        </span>
        <p className="text-sm font-medium text-fg-muted">{t.settings.emergencyGoalLabel}</p>
      </div>
      <p className="text-xs text-fg-muted">{t.settings.emergencyGoalHint}</p>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={24}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-20 shrink-0 text-right text-lg font-bold tabular-nums text-blue-400">
          {value} {t.settings.emergencyGoalMonthsSuffix}
        </span>
      </div>

      {error && <p className="text-xs text-[var(--negative)]">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving || !dirty}
        className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-fg-muted transition-opacity disabled:opacity-50"
      >
        {saved ? <Check size={14} className="text-[var(--positive)]" /> : null}
        {saving ? t.settings.emergencyGoalSaving
         : saved ? t.settings.emergencyGoalSaved
         : t.settings.emergencyGoalSave}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/EmergencyGoalSection.tsx"
git commit -m "feat(finance-settings): EmergencyGoalSection slider"
```

---

## Task 10: BalanceMethodSection settings UI

**Files:**
- Create: `app/(dashboard)/settings/_components/BalanceMethodSection.tsx`

- [ ] **Step 1: Create `BalanceMethodSection.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveBalanceMethod } from "@/app/actions/profile";
import { useT } from "@/lib/i18n/LanguageProvider";

type Method = "net" | "gross" | "budget";

interface Props {
  initialMethod: Method;
}

export function BalanceMethodSection({ initialMethod }: Props) {
  const t = useT();
  const [method, setMethod] = useState<Method>(initialMethod);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Method) {
    if (next === method) return;
    startTransition(async () => {
      setError(null);
      try {
        await saveBalanceMethod(next);
        setMethod(next);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.settings.balanceMethodError);
      }
    });
  }

  const OPTIONS: { value: Method; label: string; desc: string }[] = [
    { value: "net",    label: t.settings.balanceMethodNet,    desc: t.settings.balanceMethodNetDesc },
    { value: "gross",  label: t.settings.balanceMethodGross,  desc: t.settings.balanceMethodGrossDesc },
    { value: "budget", label: t.settings.balanceMethodBudget, desc: t.settings.balanceMethodBudgetDesc },
  ];

  return (
    <div className={`px-4 py-3.5 space-y-3 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-bg)] text-base">
          ⚖️
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">{t.settings.balanceMethodTitle}</p>
        </div>
        {saved && <Check size={14} className="text-[var(--positive)]" />}
      </div>

      {error && <p className="text-xs text-[var(--negative)] px-1">{error}</p>}

      <div className="space-y-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            disabled={isPending}
            className={`w-full rounded-2xl border p-3 text-left transition-all ${
              method === opt.value
                ? "border-accent bg-accent/10"
                : "border-[var(--glass-border)]"
            }`}
          >
            <p className={`text-sm font-medium ${method === opt.value ? "text-accent" : "text-fg"}`}>
              {opt.label}
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">{opt.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/BalanceMethodSection.tsx"
git commit -m "feat(finance-settings): BalanceMethodSection 3-option picker"
```

---

## Task 11: Wire settings page

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Read the current `settings/page.tsx`**

Read the file to see the current profile select query and the Finance section. The current profile select is:
```ts
.select("is_active, plan_type, plan_expires_at, api_key, savings_target_pct, display_name, avatar_url")
```

- [ ] **Step 2: Extend the profile select**

Change the `.select(...)` to:
```ts
.select("is_active, plan_type, plan_expires_at, api_key, savings_target_pct, display_name, avatar_url, cycle_start_day, emergency_months, balance_method")
```

- [ ] **Step 3: Update the `Profile` cast and extract new values**

After the existing `const savingsTarget = profile?.savings_target_pct ?? 20;` line, add:

```ts
  const cycleStartDay  = (profile as { cycle_start_day?: number  } | null)?.cycle_start_day  ?? 1;
  const emergencyMonths = (profile as { emergency_months?: number } | null)?.emergency_months ?? 6;
  const balanceMethod  = (profile as { balance_method?: string   } | null)?.balance_method   ?? "net" as "net" | "gross" | "budget";
```

- [ ] **Step 4: Add imports for the three new components**

At the top of the file, add:
```ts
import { BillingCycleSection }  from "./_components/BillingCycleSection";
import { EmergencyGoalSection } from "./_components/EmergencyGoalSection";
import { BalanceMethodSection } from "./_components/BalanceMethodSection";
```

- [ ] **Step 5: Replace the three `comingSoon` rows in the Finance section**

Find the Finance section. The current rows are:
```tsx
<SettingsRow icon="📅" label={t.settings.billingCycle} value={t.settings.billingCycleValue} comingSoon comingSoonLabel={cs} />
...
<SettingsRow icon="🛡️" label={t.settings.emergencyGoal} comingSoon comingSoonLabel={cs} />
<SettingsRow icon="⚖️" label={t.settings.balanceMethod} comingSoon comingSoonLabel={cs} />
```

Replace with:
```tsx
<BillingCycleSection initialDay={cycleStartDay} />

<div className="px-1">
  <EmergencyGoalSection initialMonths={emergencyMonths} />
</div>

<div className="px-1">
  <SavingsTargetSection initialTarget={savingsTarget} />
</div>

<BalanceMethodSection initialMethod={balanceMethod} />
```

(Remove the old `<div className="px-1"><SavingsTargetSection .../></div>` that was between them — it now appears in the list above.)

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/settings/page.tsx"
git commit -m "feat(finance-settings): wire BillingCycleSection, EmergencyGoalSection, BalanceMethodSection into settings page"
```

---

## Task 12: Final verification

**Files:** none (read-only checks)

- [ ] **Step 1: Full type check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: successful build, no type errors. Supabase env-var warnings are acceptable.

- [ ] **Step 3: Manual smoke tests**

Start dev server: `npm run dev`

1. **Billing cycle** — go to Settings → Finance → tap "วันเริ่มรอบเดือน" → picker opens → select day 15 → drawer closes, row now shows "วันที่ 15" → go to Overview → monthLabel should now show range like "15 พ.ค. – 14 มิ.ย." if today < 15, or "15 มิ.ย. – 14 ก.ค." if today ≥ 15.

2. **Emergency goal** — Settings → Finance → move slider to 12 → tap Save → Check appears. Go to Overview → EmergencyRunwayCard shows progress bar toward 12 months.

3. **Balance method** — Settings → Finance → select "รายรับ − รายจ่าย" (gross) → saved → Overview balance card should now show income − expenses (higher than net).

4. **Default behaviour** — Reset all to defaults (day=1, method=net) → Overview looks identical to before this feature.

5. **English locale** — Switch to English → all three setting labels and drawer/picker text should be in English.

- [ ] **Step 4: Commit final cleanup if needed**

```bash
git add -A
git commit -m "feat(finance-settings): complete billing cycle, emergency goal, balance method"
```
