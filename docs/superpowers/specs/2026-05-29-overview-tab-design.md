# Overview Tab — Design Spec

## Summary

The Overview tab is a Server Component page driven by URL searchParams for the period. A single server action fetches and computes all metrics server-side. Free users see 5 hero metrics; Pro users additionally see Emergency Runway and Daily Pace (with a locked/blurred placeholder shown to free users).

---

## Period Selector

**URL shape:**
- Preset: `?period=year` | `?period=3m` (default) | `?period=all`
- Custom: `?period=custom&from=YYYY-MM-DD&to=YYYY-MM-DD`

**Preset windows** (all date boundaries in Asia/Bangkok timezone, ADR-0003):

| Value | Thai label | Date range |
|---|---|---|
| `year` | ปีนี้ | Jan 1 of current Bangkok year → now |
| `3m` | 3 เดือนล่าสุด | Rolling 90 days back from today (default) |
| `all` | ทั้งหมด | No date filter |
| `custom` | กำหนดเอง | User-selected `from`/`to` date range |

When `period=custom`, the `PeriodSelector` client component reveals two date inputs. On confirm it pushes `?period=custom&from=...&to=...` to the URL. Invalid or missing custom dates fall back to `3m`.

---

## Data Architecture

### Server action: `app/actions/overview.ts`

```typescript
export type Period = "year" | "3m" | "all" | "custom";

export interface DateRange {
  from: string | null;  // ISO UTC start, null = no lower bound
  to: string | null;    // ISO UTC end, null = no upper bound
}

export interface OverviewData {
  // Hero metrics (period-filtered)
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;      // = totalIncome - totalExpense
  netSaved: number;         // = same value as netCashFlow
  savingRate: number | null; // null when totalIncome = 0

  // Pro-only (null for free users — not computed)
  runway: RunwayData | null;
  dailyPace: DailyPaceData | null;
}

export interface RunwayData {
  liquidAssets: number;
  avgMonthlyExpense: number;
  months: number | null;  // null when avgMonthlyExpense = 0 (display "∞")
}

export interface DailyPaceData {
  currentMonthExpense: number;
  budgetTarget: number;       // 0 when no budgets and no expense history
  paceLine: number;           // budgetTarget × (daysElapsed / daysInMonth)
  daysElapsed: number;
  daysInMonth: number;
  hasBudget: boolean;         // false = fell back to avgMonthlyExpense
}
```

**`getOverviewData(range: DateRange, userId: string, isPro: boolean): Promise<OverviewData>`**

Runs these Supabase queries in parallel:

1. **Period transactions** — fetch all transactions in `[range.from, range.to]` for `user_id`. Compute `totalIncome`, `totalExpense`, `netCashFlow`, `netSaved`, `savingRate`.

2. **Trailing 12-month expense totals** — always fetched (needed for Avg Monthly Expense used by both Runway and Daily Pace fallback). Fetch transactions from 12 months ago → now, group by Bangkok month, sum expenses. Use however many months exist (adaptive: up to 12, min 1).

3. **Wealth snapshot** (only if `isPro`) — `SELECT SUM(value) WHERE type='asset' AND is_liquid=true` from `wealth_debt`.

4. **Monthly budgets** (only if `isPro`) — `SELECT SUM(limit_amount)` from `budgets`.

5. **Current month expenses** (only if `isPro`) — SUM of expenses in current Bangkok month from `transactions`.

---

## Component Structure

```
app/(dashboard)/overview/
  page.tsx                          ← Server Component: fetch + compose
  _components/
    PeriodSelector.tsx              ← 'use client': pill tabs + custom date picker
    HeroMetrics.tsx                 ← receives computed values, renders 5 cards
    EmergencyRunwayCard.tsx         ← Pro-gated runway card
    DailyPaceCard.tsx               ← Pro-gated daily pace bar
app/actions/overview.ts             ← getOverviewData()
```

### `page.tsx`

```typescript
// Reads searchParams, resolves DateRange, fetches profile + overview data,
// renders all sections. No 'use client'.
export default async function OverviewPage({ searchParams }: PageProps) {
  const { period, from, to } = await searchParams;
  const range = resolveDateRange(period, from, to);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // fetch profile for isActive()
  // call getOverviewData(range, user.id, isPro)
  // render PeriodSelector + HeroMetrics + RunwayCard + DailyPaceCard
}
```

`resolveDateRange` is a pure function in `app/actions/overview.ts` that converts period + optional from/to into a `DateRange`. Falls back to `3m` if inputs are invalid.

### `PeriodSelector.tsx` (`'use client'`)

- Renders 4 pill buttons: ปีนี้ | 3 เดือนล่าสุด | ทั้งหมด | กำหนดเอง
- Active pill highlighted in accent colour
- Tapping กำหนดเอง reveals two `<input type="date">` fields + confirm button
- On selection/confirm: `router.push` with new URL params
- Reads current period from props (passed from server) to highlight active pill

### `HeroMetrics.tsx`

5 cards in this layout:
- Row 1: รายรับ | รายจ่าย (2-col grid)
- Row 2: กระแสเงินสด | เงินออม (2-col grid)
- Row 3: อัตราออม (full-width)

Colour rules:
- รายจ่าย: always neutral (expense is expected)
- กระแสเงินสด / เงินออม: green if ≥ 0, red if negative
- อัตราออม: green if > 20%, amber if 0–20%, red if negative; "—" if income = 0

### `EmergencyRunwayCard.tsx`

**Active users:** Shows liquidAssets amount, avgMonthlyExpense, and `X.X เดือน` prominently. "∞" when avgMonthlyExpense = 0.

**Free users:** Card rendered with `filter: blur(4px)` + pointer-events-none overlay containing lock icon + "🔒 ปลดล็อกด้วย Pro" button linking to `/paywall`. Placeholder values shown behind blur (not real data — use static placeholder numbers).

### `DailyPaceCard.tsx`

**Active users:**
- Progress bar: fill = `currentMonthExpense / budgetTarget` (capped at 100%)
- Bar colour: green if `currentMonthExpense ≤ paceLine`, amber if within 20% over, red if >20% over
- Shows: current spend | pace target | days elapsed label
- No budget + no expense history (`budgetTarget = 0`): replaces bar with prompt "ตั้งงบประมาณเพื่อดู Daily Pace" linking to `/settings`

**Free users:** Same blur/lock overlay as Runway card.

---

## Metric Formulas

### Hero (period-filtered)

```
totalExpense  = SUM(amount WHERE type='expense' AND date IN range)
totalIncome   = SUM(amount WHERE type='income'  AND date IN range)
netCashFlow   = totalIncome - totalExpense
netSaved      = netCashFlow   // same value; shown as separate card per UX spec
savingRate    = totalIncome > 0 ? (netSaved / totalIncome * 100) : null
```

### Avg Monthly Expense (for Runway + Daily Pace fallback)

```
months = trailing expense data grouped by Bangkok month
         use up to 12; fall back to 6, 3, all-available
avgMonthlyExpense = SUM(all expense in window) / COUNT(distinct months in window)
```

### Emergency Runway (stock-based, ignores period)

```
liquidAssets     = SUM(value WHERE type='asset' AND is_liquid=true)
months           = liquidAssets / avgMonthlyExpense
                   → null (display "∞") when avgMonthlyExpense = 0
```

### Daily Pace (current Bangkok month, ignores period)

```
daysElapsed          = day-of-month today in Asia/Bangkok
daysInMonth          = total days in current Bangkok month
budgetTotal          = SUM(limit_amount FROM budgets) OR avgMonthlyExpense if no budgets
paceLine             = budgetTotal × (daysElapsed / daysInMonth)
currentMonthExpense  = SUM(amount WHERE type='expense' AND bangkokMonth = currentMonth)
paceRatio            = currentMonthExpense / paceLine
colour               = paceRatio ≤ 1.0 → green | ≤ 1.2 → amber | > 1.2 → red
```

---

## Empty States & Edge Cases

| Situation | Behaviour |
|---|---|
| No transactions in period | All hero metrics show ฿0 / "—" |
| Income = 0 in period | อัตราออม shows "—" |
| Custom period with missing/invalid dates | Falls back to 3m |
| No liquid assets | Runway shows `0.0 เดือน` |
| No expense history | avgMonthlyExpense = 0 → Runway shows "∞"; Daily Pace shows setup prompt |
| No budgets set | Daily Pace falls back to avgMonthlyExpense as target; shows `hasBudget: false` note |
| Free user | Runway + Daily Pace show blur/lock overlay; no real data computed or sent |
