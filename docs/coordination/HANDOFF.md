# Analytics Tab — Bug Handoff

**Date:** 2026-06-02
**Status:** Bug unresolved — handed off for next agent to fix
**Owner:** Next agent

---

## The Problem

The Analytics tab renders mostly empty / all-zeros even though the user has transaction data. Specifically:

- `AnalyticsHeroPulse` shows `฿0` for both income and expense, with verdict "เริ่มบันทึกเพื่อดูภาพรวม"
- `CategoryBars` and other sections disappear
- Only `IncomeExpenseTrend`, `DailyPattern`, `SavingsRate` may or may not appear

**User context:**
- Date: 2 June 2026 (day 2 of billing cycle)
- Has Home Rent ฿8,000 logged as a Fixed Cost (recurring)
- No income logged for June yet
- Period: "เดือนนี้" (current month)

---

## Root Cause Analysis

### Confirmed: compile error was fixed
`analytics.ts` previously had a duplicate `const { year, month, day } = bangkokToday()` declaration that crashed the module. That is now fixed — only one call exists at line 166.

### Suspected: "ไม่รวมรายจ่ายประจำ" toggle left ON

`AnalyticsView.tsx` has a client-side `excludeRecurring` state toggle. When ON:

```ts
const metrics = excludeRecurring
  ? {
      ...analytics.metrics,
      totalExpense: analytics.metrics.totalExpenseNonRecurring,  // = 0 (all expenses are recurring)
      prevExpense: analytics.metrics.prevExpenseNonRecurring,
      avgPerDay: analytics.metrics.avgPerDayNonRecurring,
    }
  : analytics.metrics;

const categories = excludeRecurring
  ? analytics.categoriesNonRecurring   // = [] (no discretionary expenses)
  : analytics.categories;
```

Because the user's ONLY expense is Home Rent (a fixed cost), when `excludeRecurring = true`:
- `totalExpenseNonRecurring = 0`
- `totalIncome = 0` (no June income yet)
- `categoriesNonRecurring = []`
- `CategoryBars` returns null (empty categories)
- `AnalyticsHeroPulse` shows all ฿0 with fallback verdict

**This is technically correct data** — but the UX is broken because it looks like no data exists.

---

## What Needs Fixing

### Fix 1 (required): Remove or redesign the `excludeRecurring` toggle

The toggle concept is good but the current implementation causes too many sections to disappear silently. Options:

**Option A (simplest):** Remove the global `excludeRecurring` toggle from `AnalyticsView`. The `DailyPattern` component already has its own built-in recurring toggle — that's sufficient. Remove the pill button and revert `metrics` and `categories` to always use the non-filtered version.

```ts
// In AnalyticsView.tsx — remove the toggle state and always use:
const metrics = analytics.metrics;
const categories = analytics.categories;
// Remove the toggle button JSX entirely
```

**Option B (better UX):** Keep the toggle but show a graceful empty state when `excludeRecurring = true` and there's no discretionary data:

```tsx
{excludeRecurring && analytics.categoriesNonRecurring.length === 0 && (
  <div className="rounded-[var(--radius-card)] bg-[var(--bg-elevated)] p-4 text-center text-sm text-fg-muted">
    ไม่มีรายจ่ายอื่นนอกจากรายจ่ายประจำในช่วงนี้
  </div>
)}
```

Also: when `excludeRecurring = true` AND `totalIncome = 0` AND `totalExpenseNonRecurring = 0`, the `AnalyticsHeroPulse` verdict should say something like "ยังไม่มีรายจ่ายที่ยืดหยุ่นในช่วงนี้" instead of the generic "เริ่มบันทึกเพื่อดูภาพรวม".

### Fix 2 (required): Verify `hasData` is correct with new trail12 fetch

When `trail12Keys` was added, `fetchStart` was extended to 12 months back. Verify `hasData = rows.length > 0` correctly detects data for the **current selected window**, not just any row in the 12-month fetch. Currently:

```ts
const hasData = rows.length > 0;
```

This returns `true` if ANY row exists in the 12-month fetch window, even if the current selected period (e.g., current month) has no transactions. The analytics page then shows `AnalyticsView` (not `AnalyticsEmptyState`) but with all zeros for the current period.

**Fix:** Check data exists in the current window specifically:

```ts
const hasData = (thisMonthResult?.length ?? 0) > 0;
// OR: check totalIncome + totalExpense + totalSavings > 0
const hasData = rows.some(r => inWindow(r.date, win.start, win.end));
```

Wait — `rows` is not filtered by window at this point. Better:

```ts
const hasData = totalIncome > 0 || totalExpense > 0 || totalSavings > 0;
```

This correctly checks whether the **selected period** has any data, not just whether any historical row was fetched.

---

## Files Changed in This Session (Analytics Redesign)

| File | Status | Notes |
|---|---|---|
| `app/actions/analytics.ts` | Modified | Added trail12, categoriesRecurring, categoriesNonRecurring, totalRecurringExpense, monthlyAverages, elapsedDays, prevElapsedEnd. Moved bangkokToday() before loop. |
| `app/(dashboard)/analytics/page.tsx` | Rewritten | Uses AnalyticsView client wrapper, RoastInsightSection moved to bottom, KeyMetrics removed |
| `app/(dashboard)/analytics/_components/AnalyticsView.tsx` | New | Client wrapper, excludeRecurring toggle, renders all sections |
| `app/(dashboard)/analytics/_components/AnalyticsHeroPulse.tsx` | New | Verdict sentence + income/expense chips + saving rate row |
| `app/(dashboard)/analytics/_components/AnalyticsAccordion.tsx` | New (unused) | Was used for collapsible sections, user asked to remove collapse |
| `app/(dashboard)/analytics/_components/ComparisonInsight.tsx` | Modified | Added elapsedDays prop + InfoTip tooltip. Comparison now capped to same elapsed days as current period |
| `app/(dashboard)/analytics/_components/TopSpendingInsight.tsx` | Modified | Added InfoTip explaining it excludes recurring. Always uses categoriesNonRecurring |
| `app/(dashboard)/analytics/_components/RecurringRatioCard.tsx` | New | Shows recurring ÷ income ratio with progress bar |
| `app/(dashboard)/analytics/_components/RecurringBreakdown.tsx` | New | Category bar chart for recurring-only categories |
| `app/(dashboard)/analytics/_components/MonthlyAveragesCard.tsx` | New | 12-month trailing averages: avg income, expense, savings, saving rate vs current period |
| `lib/i18n/dictionaries/th.ts` | Modified | Added keys for all new components |
| `lib/i18n/dictionaries/en.ts` | Modified | Added keys for all new components |

---

## How to Verify the Fix

After applying the fix:

1. Log in as the user (email: anupatwritnun@gmail.com)
2. Navigate to `/analytics`
3. With period "เดือนนี้" (June 2026):
   - Should show **real** income/expense data (even if ฿0 income is genuine)
   - `CategoryBars` should show Home Rent even though it's recurring
   - `RecurringRatioCard` and `RecurringBreakdown` should show Home Rent ฿8,000
   - `MonthlyAveragesCard` should show historical 12-month averages
4. Sections should NOT disappear silently

---

## What Is Complete and Working

- Analytics tab redesign (HeroPulse, flat layout, Roast at bottom)
- Comparison capped to same elapsed days with ⓘ tooltip
- `ไม่รวมรายจ่ายประจำ` toggle (concept correct, UX broken when all expenses are recurring)
- `หมวดที่ใช้เยอะที่สุด` always excludes recurring with ⓘ
- `ภาระรายจ่ายประจำ` ratio card
- `รายจ่ายประจำแยกหมวด` breakdown chart
- `เฉลี่ยต่อเดือน 12 เดือน` card with current vs avg saving rate comparison
- Home tab redesign: cream default, amber not red, summary cards restructured, warm hero surface
- Settings: carryover_enabled toggle, balance method selection

## What Is NOT Complete

- Fix 1: excludeRecurring toggle UX when all expenses are recurring
- Fix 2: hasData check should be based on current window, not entire 12-month fetch
