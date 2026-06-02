# Fixed Cost (Recurring Expenses) — Design Spec

## 1. Summary
A major feature upgrade that introduces the concept of **Fixed Costs** (recurring monthly cash flows). Beyond simple auto-logging of transactions, this feature deeply integrates with:
1. **Budgeting**: Distinguishes between "Committed" (Fixed) budget vs. "Discretionary" budget.
2. **Visualization**: Computes "Free Spendable Balance" by subtracting upcoming fixed costs from the remaining balance.
3. **Runway (Survival Runway)**: Compares liquid assets specifically against fixed costs to compute a baseline emergency runway.

---

## 2. Architecture

```
app/(dashboard)/settings/_components/
    FixedCostSection.tsx            ← 'use client': entry point in settings
    FixedCostSettingsDrawer.tsx     ← 'use client': drawer listing/managing fixed costs
app/actions/fixed-costs.ts          ← server actions for fixed costs CRUD & background logger
docs/superpowers/specs/             ← specifications folder
docs/superpowers/plans/             ← implementation plans folder
```

---

## 3. Core Database Schema & Domain Model

### Table `public.fixed_costs`
```sql
create table if not exists public.fixed_costs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(14,2) not null check (amount >= 0),
  type            text not null check (type in ('income','expense','savings')) default 'expense',
  category_id     uuid references public.categories(id) on delete set null,
  wallet_id       uuid references public.wallets(id) on delete set null,
  note            text,
  day_of_month    integer not null check (day_of_month >= 1 and day_of_month <= 31),
  auto_log        boolean not null default true,
  start_date      date not null default current_date,
  end_date        date check (end_date is null or end_date >= start_date),
  last_logged_at  date,
  created_at      timestamptz not null default now()
);

-- RLS policies scoped to user_id
alter table public.fixed_costs enable row level security;
```

---

## 4. Deep System Integrations & Domain Impact

### A. Budgeting: Committed vs. Discretionary

When calculating category budgets on the home screen or settings, a fixed cost "pre-commits" a portion of that budget.
* **Committed Budget**: The sum of all active fixed costs assigned to a category in a billing cycle.
* **Actual Spent**: Non-fixed transactions in that category plus auto-logged fixed costs.
* **Discretionary Remaining**: `Category Budget - Max(Actual Spent, Committed Budget)`.
* **Visual Representation**: Inside category budget progress bars, render a sub-section or secondary track representing **Committed/Fixed** amount, giving the user immediate awareness of their pre-allocated income.

### B. Visualization: Free Spendable Balance

On the Overview tab, the primary balance card currently displays `Remaining` balance:
`Remaining = Income - Expense - Savings` (depending on the profile's balance method).
* **Upcoming Fixed Costs**: The sum of active fixed costs whose `day_of_month` falls *after* today's calendar day within the current billing cycle, and which have not yet been logged.
* **Free Spendable Balance**: `Remaining - Upcoming Fixed Costs`.
* **Visual Representation**: In `HomeBalanceCard.tsx`, render a secondary detail line:
  * *Thai*: `฿X พร้อมใช้ (หักรายจ่ายประจำที่จะถึงนี้ ฿Y)`
  * *English*: `฿X spendable (subtracts ฿Y upcoming fixed costs)`

### C. Analytics: Fixed vs. Discretionary Breakdown

* A simple ratio breakdown (e.g. 50/30/20 rule representation) showing the portion of this month's expenses that were **Fixed** vs. **Discretionary**.
* Gated behind Pro Plan or made standard to elevate dashboard value.

### D. Emergency Runway: Survival Runway

* **Standard Runway**: `Liquid Assets / Avg Monthly Expense` (total actual spending).
* **Survival Runway**: `Liquid Assets / Avg Monthly Fixed Costs` (fixed baseline only).
* In the Emergency Runway card, show the standard runway but add an optional pro-tier info toggle: "You have X months of baseline survival runway on fixed costs alone."

---

## 5. Background Auto-Logging Algorithm

Implemented in `app/actions/fixed-costs.ts` inside a single transaction logic block `processFixedCosts(userId)`:

1. Retrieve today's date in Bangkok local time (`todayBkk`).
2. Query all fixed costs for the user where `auto_log = true` and `start_date <= todayBkk` and (`end_date is null` or `end_date >= start_date`).
3. For each fixed cost:
   * Loop through each calendar month `M` from the month of `start_date` (or the month after `last_logged_at` if set) to the month of `todayBkk`.
   * For each month, compute the target day `d = Math.min(day_of_month, daysInMonth)`.
   * Form the target date `D = YYYY-MM-dd`.
   * If `D >= start_date` AND `D <= todayBkk` AND (`end_date is null` or `D <= end_date`) AND (`last_logged_at is null` or `D > last_logged_at`):
     * Insert a transaction row for `D`.
     * Update `last_logged_at` of the fixed cost to `D`.
4. Run this routine asynchronously inside `getHomeData(userId)` prior to calculations.
