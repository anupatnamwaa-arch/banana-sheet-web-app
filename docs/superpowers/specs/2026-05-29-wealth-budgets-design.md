# Wealth & Debt Tab + Budget Settings — Design Spec

## Summary

Two Pro-gated features built in one round:
1. **Wealth & Debt tab** — CRUD for Assets and Liabilities with an `is_liquid` flag, and a Net Worth summary (`Sum(assets) − Sum(liabilities)`). Entirely Pro; free users see the whole tab behind a blur + upgrade CTA.
2. **Budget settings** — an inline editable list (in the Settings tab) of one monthly limit per category, used by Daily Pace and the Category Breakdown donut. Pro-gated section within Settings.

Category management (add/rename/delete) is out of scope this round — budgets work against the seeded category list.

---

## Architecture

```
app/(dashboard)/wealth/
  page.tsx                          ← Server Component: fetch wealth, compute Net Worth, Pro gate
  _components/
    NetWorthCard.tsx                ← Net Worth summary (server-rendered display)
    WealthList.tsx                  ← 'use client': assets + liabilities CRUD, client-fetched
    WealthFormDrawer.tsx            ← 'use client': add/edit/delete asset or liability
app/(dashboard)/settings/_components/
    BudgetList.tsx                  ← 'use client': inline editable budget-per-category
app/actions/wealth.ts               ← addWealth, updateWealth, deleteWealth
app/actions/budgets.ts              ← setBudget (upsert), deleteBudget
```

### Wealth page (`page.tsx`, Server Component)
- `await createClient()`, `auth.getUser()`, redirect to `/login` if no user
- Fetch profile `is_active, plan_expires_at` → `isPro` via `isActive()`
- If Pro: fetch `wealth_debt` rows for the user; compute Net Worth + sub-totals server-side; pass to `NetWorthCard`
- If free: pass `null` → both `NetWorthCard` and `WealthList` render placeholder data behind a blur overlay
- `WealthList` receives `userId` + `isPro` (it fetches its own rows client-side when Pro)

### `app/actions/wealth.ts`
All auth-gated (throw "Unauthenticated" if no user), RLS-scoped via `.eq("user_id", user.id)`:

```typescript
export interface WealthPayload {
  name: string;
  type: "asset" | "liability";
  value: number;          // > 0
  is_liquid: boolean;     // only meaningful for assets; false for liabilities
}

addWealth(payload: WealthPayload): Promise<void>
updateWealth(id: string, payload: WealthPayload): Promise<void>
deleteWealth(id: string): Promise<void>
```
- `addWealth` inserts with `user_id`, `updated_at` handled by DB trigger
- For liabilities, `is_liquid` is forced to `false` server-side

### `app/actions/budgets.ts`
All auth-gated, RLS-scoped:

```typescript
setBudget(categoryId: string, amount: number): Promise<void>  // upsert on (user_id, category_id)
deleteBudget(categoryId: string): Promise<void>
```
- `setBudget` uses `upsert(..., { onConflict: "user_id,category_id" })`
- `deleteBudget` deletes the row for that category (called when amount cleared to 0/empty)

---

## Wealth & Debt Tab

### NetWorthCard (server-rendered display component)

Props: `{ netWorth: number, totalAssets: number, totalLiabilities: number } | null` (null = free placeholder).

- Hero number: `formatTHB(netWorth)`, green if ≥ 0, red if negative
- Label above: "มูลค่าสุทธิ (Net Worth)"
- Two sub-totals below in a row:
  - รวมสินทรัพย์: `formatTHB(totalAssets)` (green tint)
  - รวมหนี้สิน: `formatTHB(totalLiabilities)` (red tint)

### WealthList (`'use client'`)

Props: `{ userId: string; isPro: boolean }`.

- When Pro: on mount, fetch `wealth_debt` rows: `select("id, name, type, value, is_liquid").eq("user_id", userId).order("value", { ascending: false })`
- Two grouped sections:
  - **สินทรัพย์** — rows of assets. Each: name, `formatTHB(value)`, a 💧 badge if `is_liquid`. Tap row → edit drawer.
  - **หนี้สิน** — rows of liabilities. Each: name, `formatTHB(value)` in red. Tap row → edit drawer.
- "+" FAB (bottom-right) → add drawer
- Swipe-left gesture (Framer Motion `drag="x"`, constraints left:-80 right:0, threshold -60) reveals red "ลบ" zone → `deleteWealth(id)`, optimistic removal + revert on error
- After any mutation: re-fetch rows AND call `router.refresh()` so the server-rendered NetWorthCard updates
- Empty state per section: "ยังไม่มีสินทรัพย์" / "ยังไม่มีหนี้สิน"

### WealthFormDrawer (`'use client'`)

Same Framer Motion spring bottom sheet (`damping: 30, stiffness: 300`), keyed `AnimatePresence` children (backdrop + drawer). Backdrop/X close unless submitting.

Props: `{ mode: "add" | "edit", item?: WealthRow, onClose, onSuccess }`.

Fields:
| Field | Input | Validation |
|---|---|---|
| ประเภท | Toggle: สินทรัพย์ / หนี้สิน | Required |
| ชื่อ | text | Required |
| มูลค่า | number, min 0, step any | Required, > 0 |
| สภาพคล่อง (💧) | toggle, **only shown when type = asset** | helper: "นับรวมใน Emergency Runway" |

Actions:
- Add: "บันทึก" → `addWealth()` → `onSuccess()` + `onClose()`
- Edit: "อัปเดต" → `updateWealth(id, payload)`; red "ลบ" → `deleteWealth(id)`
- Loading states on buttons; Thai error messages on failure
- When type = liability, `is_liquid` toggle hidden and submitted as `false`

```typescript
export interface WealthRow {
  id: string;
  name: string;
  type: "asset" | "liability";
  value: number;
  is_liquid: boolean;
}
```

### Pro Gating (whole tab)
Free users (`isPro = false`): `page.tsx` passes `null`/placeholder. `NetWorthCard` and `WealthList` both render sample placeholder data behind `blur-sm pointer-events-none`, with one centered overlay (lock icon + "🔒 ปลดล็อกด้วย Pro" → `/paywall`) covering the tab content area.

---

## Budget List (in Settings)

### BudgetList (`'use client'`)

Replaces the `งบประมาณรายหมวดหมู่ — TODO` placeholder in `settings/page.tsx`.

Props: `{ userId: string; isPro: boolean }`.

- On mount (parallel): fetch categories (`id, name`, ordered by name) + existing budgets (`category_id, limit_amount`) via browser Supabase client
- Build a map of `category_id → current limit`
- Render header helper: "ตั้งงบรายเดือนต่อหมวดหมู่ — ใช้กับ Daily Pace และกราฟวงกลม"
- One row per category:
  - Left: category name
  - Right: ฿ number input (`type="number"`, min 0), pre-filled with current limit or blank
- **Auto-save on blur** (only if value changed from initial):
  - parsed value > 0 → `setBudget(categoryId, value)`
  - empty or 0 → `deleteBudget(categoryId)`
  - On success: brief "✓ บันทึกแล้ว" flash on that row (clears after ~1.5s)
  - On error: brief red "บันทึกไม่สำเร็จ" on that row
- Empty categories: "ยังไม่มีหมวดหมู่"

### Pro Gating (section only)
Settings has free sections (CSV, API key). Only the **budget section** is gated: free users see the `BudgetList` rows behind a `blur-sm` + a smaller inline "🔒 ปลดล็อกด้วย Pro" CTA. Other Settings sections remain interactive.

---

## Data Flow & Consistency

- **Wealth mutations → Net Worth refresh:** `WealthList` calls `router.refresh()` after add/update/delete so the server-computed `NetWorthCard` re-renders with new totals. (The list itself updates optimistically/via re-fetch for instant feedback.)
- **Budget changes → Daily Pace / donut:** budgets are read fresh on each Overview/Analytics server render, so no cross-tab signalling needed — next navigation reflects new budgets.

---

## Empty States & Edge Cases

| Situation | Behaviour |
|---|---|
| No assets / liabilities | Per-section empty text; Net Worth shows ฿0 |
| Liability with `is_liquid` | Forced false server-side; toggle hidden in form |
| Free user (Wealth) | Whole tab blurred with single Pro CTA |
| Free user (Budget) | Only budget section blurred; rest of Settings usable |
| Budget input cleared | `deleteBudget` removes the row |
| No categories | "ยังไม่มีหมวดหมู่" message in BudgetList |
| Net Worth negative | Shown in red |
