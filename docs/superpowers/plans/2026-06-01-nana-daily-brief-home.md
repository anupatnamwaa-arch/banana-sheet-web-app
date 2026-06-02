# Nana Daily Brief Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a rule-backed Nana Daily Brief and redesign Home into a calm, adaptive daily decision surface.

**Architecture:** Keep finance interpretation in pure `lib/nana/` modules so it is deterministic and easy to test. Add one private `daily_briefs` row per user per Bangkok date, orchestrated by a server action. Build new Nana overview components in an isolated folder, then let the active lead wire them into existing Home data and compose the page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Supabase with RLS, Node test runner scripts.

**Local-only override:** Do not commit, push, deploy, or create a PR. The normal Superpowers commit steps are replaced with coordination checkpoints in `docs/coordination/HANDOFF.md`.

---

## File Map

| Path | Responsibility |
|---|---|
| `lib/nana/types.ts` | Pure Daily Brief inputs, outputs, states, factors, refresh reasons |
| `lib/nana/safe-to-spend.ts` | Safe to Spend calculation and previous-cycle Income estimate selection |
| `lib/nana/money-score.ts` | 0-100 score and factor statuses |
| `lib/nana/daily-brief-rules.ts` | Meaningful-event detection, priority, curated message and suggestion keys |
| `supabase/migrations/20260601000003_create_daily_briefs.sql` | Private Daily Brief persistence with RLS |
| `app/actions/daily-brief.ts` | Load inputs, compute brief, upsert today's record, dismiss suggestion |
| `app/(dashboard)/overview/_components/nana/` | Adaptive hero, details, score factors, summary, Nana illustration |
| `app/actions/home.ts` | Existing Home data extended with Daily Brief and protected summary data |
| `app/(dashboard)/overview/page.tsx` | Home composition integration |
| `lib/i18n/dictionaries/{th,en}.ts` | Curated Nana copy |
| `app/globals.css` | Warm light signature theme and quiet dark Nana surfaces |

## Task 1: Pure Safe to Spend Rules (`NANA-01`)

**Owner:** Agent 1

**Files:**
- Create: `lib/nana/types.ts`
- Create: `lib/nana/safe-to-spend.ts`
- Create: `scripts/test-nana-safe-to-spend.mjs`

- [ ] **Step 1: Write failing tests for protected money, zero clamp, and labeled estimate**

The test must cover:

```ts
calculateSafeToSpend({
  cycleIncome: 30000,
  previousCycleIncome: null,
  expensesLogged: 9000,
  upcomingFixedExpenses: 6000,
  committedSaving: 3000,
  daysRemaining: 12,
})
// safeToSpendPerDay === 1000
// isEstimated === false

calculateSafeToSpend({
  cycleIncome: 10000,
  previousCycleIncome: null,
  expensesLogged: 9000,
  upcomingFixedExpenses: 3000,
  committedSaving: 1000,
  daysRemaining: 10,
})
// safeToSpendPerDay === 0
// shortfall === 3000

calculateSafeToSpend({
  cycleIncome: null,
  previousCycleIncome: 24000,
  expensesLogged: 4000,
  upcomingFixedExpenses: 2000,
  committedSaving: 2400,
  daysRemaining: 12,
})
// safeToSpendPerDay === 1300
// isEstimated === true
```

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-safe-to-spend.mjs`

Expected: FAIL because `lib/nana/safe-to-spend.ts` does not exist.

- [ ] **Step 3: Implement pure types and function**

Export:

```ts
export interface SafeToSpendInput {
  cycleIncome: number | null;
  previousCycleIncome: number | null;
  expensesLogged: number;
  upcomingFixedExpenses: number;
  committedSaving: number;
  daysRemaining: number;
}

export interface SafeToSpendResult {
  safeToSpendPerDay: number | null;
  flexibleAmount: number | null;
  shortfall: number;
  isEstimated: boolean;
  needsIncomeSetup: boolean;
}

export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult;
```

Use current-cycle Income when present, otherwise previous-cycle Income. Return `null` values and `needsIncomeSetup: true` when neither exists. Divide by `Math.max(1, daysRemaining)`. Clamp hero amount to zero and expose shortfall separately.

- [ ] **Step 4: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-safe-to-spend.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 2: Score and Daily Brief Priority (`NANA-02`)

**Owner:** Agent 1

**Files:**
- Create: `lib/nana/money-score.ts`
- Create: `lib/nana/daily-brief-rules.ts`
- Create: `scripts/test-nana-daily-brief-rules.mjs`

- [ ] **Step 1: Write failing tests**

Assert:

```ts
choosePrimaryMessage({
  hasUpcomingFixedExpensePressure: true,
  safeToSpendStatus: "recovery",
  hasUnusualExpense: true,
  hasMeaningfulIncome: true,
})
// "protect_fixed_expenses"
```

Assert score factors expose plain statuses:

```ts
calculateMoneyScore({
  spendingPaceRatio: 0.8,
  safeToSpendPerDay: 900,
  savingRate: 25,
  savingTargetPct: 20,
  fixedExpensePressureRatio: 0.2,
  loggingStreak: 9,
})
// score in 70..100
// factors include "spending_pace", "safe_to_spend", "saving_progress",
// "fixed_expense_pressure", "logging_consistency"
```

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-daily-brief-rules.mjs`

Expected: FAIL because rule modules do not exist.

- [ ] **Step 3: Implement deterministic rules**

Export:

```ts
export type DailyBriefState = "normal" | "attention" | "recovery" | "payday" | "setup";
export type FactorStatus = "good" | "attention" | "unknown";
export type PrimaryMessageKey =
  | "protect_fixed_expenses"
  | "recover_safe_to_spend"
  | "explain_unusual_expense"
  | "recognize_income"
  | "celebrate_progress"
  | "setup_income";
```

Use fixed numeric constants in the module for phase-one weighting and thresholds. Rules, not AI, choose state and priority.

- [ ] **Step 4: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-daily-brief-rules.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 3: Daily Brief Persistence (`NANA-03`)

**Owner:** Agent 2

**Files:**
- Create: `supabase/migrations/20260601000003_create_daily_briefs.sql`
- Modify: `lib/types.ts`
- Create: `scripts/test-nana-daily-brief-schema.mjs`

- [ ] **Step 1: Write failing schema contract test**

Assert the migration contains:

```sql
create table if not exists public.daily_briefs
unique (user_id, brief_date)
alter table public.daily_briefs enable row level security
```

Also assert own-row select, insert, and update RLS policies exist.

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-daily-brief-schema.mjs`

Expected: FAIL because the migration is missing.

- [ ] **Step 3: Create migration and `DailyBrief` type**

Create columns:

```sql
id uuid primary key default gen_random_uuid(),
user_id uuid not null references public.profiles(id) on delete cascade,
brief_date date not null,
state text not null check (state in ('normal','attention','recovery','payday','setup')),
safe_to_spend_per_day numeric(14,2),
safe_to_spend_is_estimated boolean not null default false,
money_score integer not null check (money_score between 0 and 100),
score_factors jsonb not null default '[]'::jsonb,
primary_message_key text not null,
suggested_action_key text,
reason_values jsonb not null default '{}'::jsonb,
ai_detail_th text,
suggestion_dismissed_at timestamptz,
refresh_reason text not null,
refreshed_at timestamptz not null default now(),
created_at timestamptz not null default now(),
unique (user_id, brief_date)
```

Add owner-scoped select, insert, and update policies.

- [ ] **Step 4: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-daily-brief-schema.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 4: Server Orchestration (`NANA-04`)

**Owner:** Agent 2

**Files:**
- Create: `app/actions/daily-brief.ts`
- Create: `scripts/test-nana-daily-brief-action.mjs`

- [ ] **Step 1: Write failing action contract test**

Assert `daily-brief.ts`:

- uses `"use server"`
- queries `profiles`, `transactions`, and `fixed_costs`
- calls `calculateSafeToSpend`, `calculateMoneyScore`, and `choosePrimaryMessage`
- upserts into `daily_briefs` with `onConflict: "user_id,brief_date"`
- exports `getOrRefreshDailyBrief(userId, reason)` and `dismissDailyBriefSuggestion()`

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-daily-brief-action.mjs`

Expected: FAIL because the action is missing.

- [ ] **Step 3: Implement orchestration**

Use existing `bangkokToday()` and `getBillingCycle()` from `app/actions/overview-utils.ts`. Query current cycle Transactions, previous cycle Income, profile `cycle_start_day` and `savings_target_pct`, and active Fixed Expenses. Upsert one record for the Bangkok date.

Keep AI out of this task. `ai_detail_th` remains nullable.

- [ ] **Step 4: Add dismissal update**

`dismissDailyBriefSuggestion()` authenticates the user and updates today's own row with `suggestion_dismissed_at`.

- [ ] **Step 5: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-daily-brief-action.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 5: Meaningful-Event Refresh Hooks (`NANA-04B`)

**Owner:** Active lead

**Files:**
- Modify: `app/actions/transactions.ts`
- Modify: `app/actions/fixed-costs.ts`
- Create: `scripts/test-nana-refresh-hooks.mjs`

- [ ] **Step 1: Write failing hook contract test**

Assert:

- `addTransaction()` refreshes the Daily Brief after inserting Income, Expense, or Savings
- `updateTransaction()` refreshes after a successful update
- `deleteTransaction()` refreshes after a successful delete
- `processFixedCosts()` refreshes once after inserting one or more generated Transactions
- hooks call `getOrRefreshDailyBrief(user.id, "transaction_change")` or `getOrRefreshDailyBrief(userId, "fixed_expense_change")`

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-refresh-hooks.mjs`

Expected: FAIL because mutation hooks are absent.

- [ ] **Step 3: Add refresh hooks**

Import `getOrRefreshDailyBrief` into the mutation modules. Call it only after successful mutation. In `processFixedCosts()`, track whether any generated Transactions were inserted and refresh once after processing the batch.

The orchestration layer decides whether the changed data is meaningful enough to alter the current brief. Mutation modules only notify it that financial inputs changed.

- [ ] **Step 4: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-refresh-hooks.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 6: Nana Home Components (`NANA-05`)

**Owner:** Agent 3

**Files:**
- Create: `app/(dashboard)/overview/_components/nana/NanaHero.tsx`
- Create: `app/(dashboard)/overview/_components/nana/NanaGuide.tsx`
- Create: `app/(dashboard)/overview/_components/nana/NanaBriefDetails.tsx`
- Create: `app/(dashboard)/overview/_components/nana/NanaCompactSummary.tsx`
- Create: `app/(dashboard)/overview/_components/nana/NanaAdaptiveSupport.tsx`
- Create: `app/(dashboard)/overview/_components/nana/index.ts`
- Create: `scripts/test-nana-home-components.mjs`

- [ ] **Step 1: Write failing composition test**

Assert the component set supports:

- `normal`, `attention`, `recovery`, `payday`, and `setup`
- `ดูรายละเอียด`
- `บันทึกรายจ่าย`
- small score and streak presentation
- inline detail expansion
- no chart import

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-home-components.mjs`

Expected: FAIL because Nana components do not exist.

- [ ] **Step 3: Implement isolated client components**

`NanaHero` receives a serialized view model:

```ts
export interface NanaHeroViewModel {
  state: DailyBriefState;
  message: string;
  actionLabel: string | null;
  safeToSpendPerDay: number | null;
  isEstimated: boolean;
  moneyScore: number;
  streak: number;
  upcomingFixedExpensesTotal: number;
  factors: MoneyScoreFactor[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    totalSavings: number;
    savingRate: number | null;
    emergencyRunwayMonths: number | null;
  };
}
```

Use local state only for inline expansion. Keep Nana pose SVG lightweight and state-driven. No AI fetch in client components.

- [ ] **Step 4: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-home-components.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 7: Curated Nana Copy (`NANA-06`)

**Owner:** Active lead

**Files:**
- Modify: `lib/i18n/dictionaries/th.ts`
- Modify: `lib/i18n/dictionaries/en.ts`
- Create: `scripts/test-nana-copy.mjs`

- [ ] **Step 1: Add failing copy contract test**

Require copy keys for:

- safe-to-spend label and estimate label
- five primary message keys
- payday actions
- suggestion dismissal
- details toggle
- factor labels and statuses
- compact summary labels

- [ ] **Step 2: Add Thai-first curated copy and English equivalents**

Keep recovery copy calm and specific. Do not use shame, failure framing, or alarm-heavy language.

- [ ] **Step 3: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-copy.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 8: Home Integration (`NANA-07`)

**Owner:** Active lead

**Files:**
- Modify: `app/actions/home.ts`
- Modify: `app/(dashboard)/overview/page.tsx`
- Create: `scripts/test-nana-home-integration.mjs`

- [ ] **Step 1: Write failing integration contract test**

Assert:

- `home.ts` obtains the Daily Brief
- `overview/page.tsx` renders `NanaHero`
- the old prominent `HomeStreakCard`, `HomeBalanceCard`, and four-card `HomeSummaryCards` are removed from the first-glance stack
- recent Transactions remain rendered
- Emergency Runway is passed into the compact expanded summary, not rendered as a prominent standalone Home card

- [ ] **Step 2: Run red test**

Run: `node --test .\scripts\test-nana-home-integration.mjs`

Expected: FAIL before integration.

- [ ] **Step 3: Extend `HomeData` and compose the new Home**

Call `getOrRefreshDailyBrief(userId, "page_load")` from `getHomeData()` and return the serialized Daily Brief with the existing Home data. Keep the first integration version explicit even if this duplicates a small query; optimize only after behavior is verified.

Pass a serialized hero view model into `NanaHero`. Preserve existing recent Transactions and adaptive support data.

- [ ] **Step 4: Run green test and checkpoint**

Run:

```powershell
node --test .\scripts\test-nana-home-integration.mjs
node --test .\scripts\test-nana-safe-to-spend.mjs
node --test .\scripts\test-nana-daily-brief-rules.mjs
```

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 9: Theme Refinement (`NANA-08`)

**Owner:** Active lead

**Files:**
- Modify: `app/globals.css`
- Create: `scripts/test-nana-theme.mjs`

- [ ] **Step 1: Write failing theme contract test**

Assert the CSS includes dashboard Nana tokens for warm light surfaces and quiet dark surfaces, and does not add neon box shadows to Nana hero controls.

- [ ] **Step 2: Add scoped Nana theme tokens**

Use scoped tokens such as:

```css
:root {
  --nana-surface: #1b1915;
  --nana-surface-soft: #242017;
  --nana-ink: #f8f0dc;
  --nana-muted: #b8aa8c;
  --nana-banana: #e5b82d;
}

[data-theme="light"] {
  --nana-surface: #fffdf7;
  --nana-surface-soft: #fff7df;
  --nana-ink: #463315;
  --nana-muted: #877455;
  --nana-banana: #e6b928;
}
```

Keep changes scoped to Nana components. Do not redesign Analytics in this task.

- [ ] **Step 3: Run green test and checkpoint**

Run: `node --test .\scripts\test-nana-theme.mjs`

Expected: PASS.

Update `TASKS.md` and `HANDOFF.md`.

## Task 10: Verification and Visual QA (`NANA-09`)

**Owner:** Active lead

- [ ] **Step 1: Run focused tests**

```powershell
node --test .\scripts\test-nana-safe-to-spend.mjs
node --test .\scripts\test-nana-daily-brief-rules.mjs
node --test .\scripts\test-nana-daily-brief-schema.mjs
node --test .\scripts\test-nana-daily-brief-action.mjs
node --test .\scripts\test-nana-refresh-hooks.mjs
node --test .\scripts\test-nana-home-components.mjs
node --test .\scripts\test-nana-copy.mjs
node --test .\scripts\test-nana-home-integration.mjs
node --test .\scripts\test-nana-theme.mjs
```

- [ ] **Step 2: Run static checks**

```powershell
node .\node_modules\eslint\bin\eslint.js lib/nana app/actions/daily-brief.ts 'app/(dashboard)/overview' lib/i18n/dictionaries
node .\node_modules\typescript\bin\tsc --noEmit
git -c core.safecrlf=false diff --check -- lib/nana app/actions/daily-brief.ts 'app/(dashboard)/overview' lib/i18n/dictionaries app/globals.css supabase/migrations scripts
```

If TypeScript still reports the pre-existing `EmergencyRunwayCard.tsx` optional-value issue, record it separately.

- [ ] **Step 3: Run local visual QA**

Verify light and dark themes on a mobile viewport:

- normal hero
- estimated value label
- recovery `฿0/day`
- payday takeover
- setup takeover
- inline details open and closed
- bottom-nav `+` still opens its drawer
- no Home chart wall above the fold

- [ ] **Step 4: Update handoff**

Record test results, visual findings, and any explicitly deferred fixes in `docs/coordination/HANDOFF.md`.
