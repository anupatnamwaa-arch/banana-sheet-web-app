import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("monthly subscription migration adds recurring source and transaction snapshot fields", async () => {
  const migration = await read("supabase/migrations/20260602000002_add_monthly_subscriptions.sql");

  assert.match(migration, /alter table public\.fixed_costs[\s\S]*recurring_kind/);
  assert.match(migration, /check \(recurring_kind in \('fixed_cost', 'subscription'\)\)/);
  assert.match(migration, /alter table public\.transactions[\s\S]*fixed_cost_id uuid references public\.fixed_costs\(id\) on delete set null/);
  assert.match(migration, /recurring_kind text[\s\S]*recurring_kind is null or recurring_kind in \('fixed_cost', 'subscription'\)/);
});

test("server actions persist recurring kinds and source links", async () => {
  const transactions = await read("app/actions/transactions.ts");
  const fixedCosts = await read("app/actions/fixed-costs.ts");

  assert.match(transactions, /RecurringTransactionPayload/);
  assert.match(transactions, /recurring_kind:\s*recurrence\.recurring_kind/);
  assert.match(transactions, /fixed_cost_id:\s*fixedCostId/);
  assert.match(transactions, /\.delete\(\)[\s\S]*\.from\("fixed_costs"\)|\.from\("fixed_costs"\)[\s\S]*\.delete\(\)/);
  assert.match(fixedCosts, /recurring_kind:\s*payload\.recurring_kind/);
  assert.match(fixedCosts, /fixed_cost_id:\s*fc\.id/);
  assert.match(fixedCosts, /recurring_kind:\s*fc\.recurring_kind/);
});

test("drawers and settings expose subscription choices", async () => {
  const fab = await read("app/(dashboard)/_components/UniversalFabDrawer.tsx");
  const analyticsDrawer = await read("app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx");
  const settings = await read("app/(dashboard)/settings/_components/FixedCostSettingsDrawer.tsx");
  const transactionsView = await read("app/(dashboard)/transactions/_components/TransactionsView.tsx");
  const en = await read("lib/i18n/dictionaries/en.ts");

  for (const source of [fab, analyticsDrawer]) {
    assert.match(source, /one_time/);
    assert.match(source, /subscription/);
    assert.match(source, /recurring_kind/);
  }
  assert.match(settings, /subscription/);
  assert.match(settings, /recurringKind/);
  assert.match(transactionsView, /fixed_cost_id,\s*recurring_kind/);
  assert.match(en, /subscription:\s*"Subscription"/);
});

test("analytics classifies snapshots first and exposes subscription total", async () => {
  const analytics = await read("app/actions/analytics.ts");
  const view = await read("app/(dashboard)/analytics/_components/AnalyticsView.tsx");
  const card = await read("app/(dashboard)/analytics/_components/RecurringRatioCard.tsx");

  assert.match(analytics, /totalSubscriptionExpense/);
  assert.match(analytics, /if \(r\.recurring_kind\) return true/);
  assert.match(analytics, /r\.recurring_kind === "subscription"/);
  assert.match(view, /totalSubscriptionExpense=\{analytics\.totalSubscriptionExpense\}/);
  assert.match(card, /totalSubscriptionExpense/);
});
