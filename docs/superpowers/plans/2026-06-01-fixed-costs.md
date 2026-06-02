# Fixed Cost (Recurring Expenses) — Superpowers Implementation Plan

This document details the step-by-step implementation plan for the Fixed Costs feature, structured to support TDD-style execution, automated verification, and clean system integrations.

---

## Step 1: Database Migration
Create and run the SQL migration to initialize the `fixed_costs` table.
* **File**: `supabase/migrations/20260601000002_create_fixed_costs.sql`
* **Action**: Define table schema, unique constraints, and Row Level Security (RLS) policies.
* **Verification**: Verify using Supabase `list_tables` or executing checks.

---

## Step 2: Types & Domain Mapping
Update TypeScript types to represent the recurring entities.
* **File**: `lib/types.ts`
* **Action**: Add `FixedCost` interface:
  ```typescript
  export interface FixedCost {
    id: string;
    user_id: string;
    amount: number;
    type: TransactionType;
    category_id: string | null;
    wallet_id: string | null;
    note: string | null;
    day_of_month: number;
    auto_log: boolean;
    start_date: string; // YYYY-MM-DD
    end_date: string | null; // YYYY-MM-DD
    last_logged_at: string | null; // YYYY-MM-DD
    created_at: string;
  }
  ```

---

## Step 3: Server Actions & Background Logger
Implement fixed cost management actions and the automatic monthly transaction generator.
* **File**: `app/actions/fixed-costs.ts`
* **Functions**:
  * `getFixedCosts(userId: string): Promise<FixedCost[]>`
  * `addFixedCost(payload: Omit<FixedCost, 'id' | 'user_id' | 'created_at' | 'last_logged_at'>): Promise<void>`
  * `updateFixedCost(id: string, payload: Partial<FixedCost>): Promise<void>`
  * `deleteFixedCost(id: string): Promise<void>`
  * `processFixedCosts(userId: string): Promise<void>`
* **Verification (TDD-style)**:
  * Create a local scratch test runner in `scratch/test_fixed_costs.js`.
  * Validate that multiple cycles are backfilled correctly, that leap years are handled, and that upcoming dates are correctly ignored.

---

## Step 4: Integrate Auto-Logger into Home Page
Hook the background processor into the dashboard loading sequence.
* **File**: `app/actions/home.ts`
* **Action**: Import `processFixedCosts` and execute it at the top of `getHomeData(userId)` before querying the database.
* **Result**: Ensures the home dashboard is always fresh and transactions are recorded automatically on-login.

---

## Step 5: Advanced Budgeting Integration (Committed vs. Discretionary)
Calculate pre-committed fixed cost budgets for each category and visualize them.
* **File**: `app/actions/home.ts`
* **Action**:
  * Query active `fixed_costs` under the current cycle for the user.
  * Aggregate fixed costs by category (`category_id → total committed`).
  * In the budget object passed to `HomeBudgetProgress`, provide both `spent` and `committed` (pre-allocated) metrics.
* **File**: `app/(dashboard)/overview/_components/HomeBudgetProgress.tsx`
* **Action**: Visualize the category progress bar with two colors/indicators:
  * *Discretionary Spent*: standard progress indicator.
  * *Committed (Fixed)*: a distinct overlay or pattern, showing the user exactly what portion of the budget is locked by recurring costs.

---

## Step 6: Advanced Visualization: Spendable Balance
Calculate upcoming pre-committed expenses and present the "Free Spendable Balance".
* **File**: `app/actions/home.ts`
* **Action**:
  * Get today's calendar day in Bangkok.
  * Find all active fixed costs whose `day_of_month` is *greater* than today's calendar day, or which have not yet been logged for this billing period.
  * Sum their amounts → `upcomingFixedCostsTotal`.
  * Include this number in the return payload of `getHomeData`.
* **File**: `app/(dashboard)/overview/_components/HomeBalanceCard.tsx`
* **Action**: Render the spendable balance card with a secondary indicator showing the free discretionary amount left:
  * e.g., "฿12,400 remaining (฿10,000 committed to upcoming fixed costs before the cycle ends)"

---

## Step 7: Settings Interface & Drawer
Create a dedicated manager for Fixed Costs.
* **File**: `app/(dashboard)/settings/_components/FixedCostSection.tsx` [NEW]
* **File**: `app/(dashboard)/settings/_components/FixedCostSettingsDrawer.tsx` [NEW]
* **Action**: Create the section entry and slide-up drawer to list active fixed costs, toggle auto-log, set active ranges, and create new ones.

---

## Step 8: Transaction Drawer Repeat Toggles
Allow registering fixed costs on-the-fly when adding a normal transaction.
* **File**: `app/(dashboard)/_components/UniversalFabDrawer.tsx`
* **File**: `app/(dashboard)/analytics/_components/TransactionFormDrawer.tsx`
* **Action**: Add an expandable panel "Repeat monthly?" that maps to fixed cost columns and inserts the configuration during transaction submission.
