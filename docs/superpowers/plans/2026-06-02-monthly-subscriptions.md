# Monthly Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark an expense as a monthly subscription, auto-log future payments, and report subscription spending separately in Analytics.

**Architecture:** Extend `fixed_costs` with an explicit recurring kind and link logged transactions to their recurring source with a durable kind snapshot. Keep the existing monthly scheduler, but move initial recurring creation into authenticated server actions so the fixed-cost row and linked ledger entry are coordinated. Preserve the current matcher only as a legacy fallback for old rows.

**Tech Stack:** Next.js 16 Server Actions, React 19, TypeScript, Supabase/Postgres, Node test runner.

---

## File Structure

- Create `supabase/migrations/20260602000002_add_monthly_subscriptions.sql`: add recurring kind and transaction source fields.
- Create `scripts/test-monthly-subscriptions.mjs`: focused source-level regression checks.
- Modify `lib/types.ts`: expose recurring kinds and linked transaction fields.
- Modify `app/actions/transactions.ts`: coordinate initial recurring source creation with add/edit transaction actions.
- Modify `app/actions/fixed-costs.ts`: persist recurring kind and link auto-logged transactions.
- Modify `app/actions/analytics.ts`: classify snapshots first, retain legacy fallback, aggregate subscriptions.
- Modify `app/(dashboard)/_components/UniversalFabDrawer.tsx`: expose one-time, recurring-expense, and subscription choices.
- Modify `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx`: expose the same choice when adding or converting a one-time expense.
- Modify `app/(dashboard)/settings/_components/FixedCostSettingsDrawer.tsx`: select recurring kind and show subscription badges.
- Modify `app/(dashboard)/analytics/_components/RecurringRatioCard.tsx`: show subscription contribution.
- Modify `app/(dashboard)/analytics/_components/AnalyticsView.tsx`: pass subscription aggregate.
- Modify `lib/i18n/dictionaries/en.ts` and `lib/i18n/dictionaries/th.ts`: add labels.

### Task 1: Schema And Domain Types

- [ ] Write a failing source-level test requiring `fixed_costs.recurring_kind`, `transactions.fixed_cost_id`, and the durable transaction snapshot.
- [ ] Run `node --test scripts/test-monthly-subscriptions.mjs` and confirm it fails because the migration does not exist.
- [ ] Add migration `20260602000002_add_monthly_subscriptions.sql`:

```sql
alter table public.fixed_costs
  add column if not exists recurring_kind text not null default 'fixed_cost'
  check (recurring_kind in ('fixed_cost', 'subscription'));

alter table public.transactions
  add column if not exists fixed_cost_id uuid references public.fixed_costs(id) on delete set null,
  add column if not exists recurring_kind text
  check (recurring_kind is null or recurring_kind in ('fixed_cost', 'subscription'));
```

- [ ] Add `RecurringKind = "fixed_cost" | "subscription"` and the new fields to `lib/types.ts`.
- [ ] Run the focused test and confirm the schema checks pass.

### Task 2: Coordinated Server Actions And Monthly Logger

- [ ] Extend the failing test to require recurring payloads, authenticated coordinated add/edit actions, cleanup after linked-write failure, and auto-logged source snapshots.
- [ ] Run the focused test and confirm it fails on missing server-action behavior.
- [ ] Add `RecurringTransactionPayload`, create the recurring source before linked transaction insertion/update, delete that new source when the linked write fails, and persist snapshots.
- [ ] Extend `FixedCostPayload` and `processFixedCosts()` with `recurring_kind`, `fixed_cost_id`, and the transaction-level snapshot.
- [ ] Run the focused test and existing Nana refresh-hook test.

### Task 3: Transaction Drawer Choices And Settings

- [ ] Extend the failing test to require `one_time`, `fixed_cost`, and `subscription` choices, subscription expense-only handling, and settings badges.
- [ ] Run the focused test and confirm it fails on missing UI labels and choice handling.
- [ ] Replace the old fixed-cost toggles with recurrence selectors in both add drawers. Keep linked historical payments managed in Settings to prevent duplicate schedules.
- [ ] Add the recurring-kind selector and subscription badge to the Settings drawer.
- [ ] Add English and Thai dictionary labels.
- [ ] Run the focused test.

### Task 4: Analytics Classification And Subscription Aggregate

- [ ] Extend the failing test to require snapshot-first classification, legacy fallback, `totalSubscriptionExpense`, and Analytics rendering.
- [ ] Run the focused test and confirm it fails on the missing aggregate.
- [ ] Select transaction snapshot fields, classify snapshots before fallback matching, sum subscription expenses, and display the subscription share on the recurring card.
- [ ] Run focused analytics tests and the monthly-subscription test.

### Task 5: Verification

- [ ] Run:

```powershell
node --test scripts\test-monthly-subscriptions.mjs scripts\test-analytics-current-window.mjs scripts\test-analytics-dev-auth-bypass.mjs scripts\test-dashboard-bottom-nav.mjs scripts\test-nana-refresh-hooks.mjs
```

- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run build`.
- [ ] Report any unrelated pre-existing failures separately from subscription-feature verification.

