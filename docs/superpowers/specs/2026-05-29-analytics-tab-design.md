# Analytics Tab — Design Spec

## Summary

The Analytics tab has three sections: Monthly Velocity (Pro, glowing line chart), Category Breakdown (Pro, donut chart), and Transaction CRUD list (free). Charts are computed server-side and passed to client display components. The CRUD list is a fully client-side component that manages its own data fetching and mutation state, allowing instant UI updates after add/edit/delete without a full page reload.

---

## Architecture

```
app/(dashboard)/analytics/
  page.tsx                         ← Server Component: fetch analytics data + compose
  _components/
    MonthlyVelocityChart.tsx       ← Pro-gated, Recharts LineChart, glowing accent line
    CategoryBreakdownChart.tsx     ← Pro-gated, Recharts PieChart (donut) + legend
    TransactionList.tsx            ← Free, 'use client', manages own Supabase fetch + CRUD state
    TransactionFormDrawer.tsx      ← 'use client', add/edit bottom sheet drawer
app/actions/analytics.ts           ← getAnalyticsData() server action
app/actions/transactions.ts        ← addTransaction, updateTransaction, deleteTransaction
```

### `page.tsx` (Server Component)

- Fetches user + profile (for `isActive()`)
- Calls `getAnalyticsData(userId, isPro)` for chart data
- Renders: title, `<MonthlyVelocityChart>`, `<CategoryBreakdownChart>`, `<TransactionList>`
- `TransactionList` receives no server props — it fetches independently on the client

### `app/actions/analytics.ts`

**`getAnalyticsData(userId: string, isPro: boolean): Promise<AnalyticsData>`**

Runs in parallel:
1. **Trailing 12-month expense + income by Bangkok month** (Pro only) — for Velocity chart
2. **Current Bangkok month spend by category + budget limits** (Pro only) — for donut

Returns `null` for Pro-only fields when `isPro = false`.

```typescript
export interface MonthlyPoint {
  month: string;        // "YYYY-MM" in Asia/Bangkok
  expense: number;
  income: number;
}

export interface CategorySpend {
  categoryId: string;
  categoryName: string;
  spent: number;
  budget: number | null; // null = no budget set
}

export interface AnalyticsData {
  monthlyPoints: MonthlyPoint[] | null; // null for free users
  categorySpend: CategorySpend[] | null; // null for free users
}
```

### `app/actions/transactions.ts`

Three server actions, all auth-gated (`auth.getUser()` + throw if null):

**`addTransaction(payload: TransactionPayload): Promise<void>`**
- Inserts into `transactions`
- Auto-matches `brand_id` from note text against `brands` catalog (case-insensitive alias search)
- `category_id` looked up from category name if provided as string, or accepted as UUID

**`updateTransaction(id: string, payload: TransactionPayload): Promise<void>`**
- Updates own transaction (RLS enforces ownership)
- Same brand auto-match on note

**`deleteTransaction(id: string): Promise<void>`**
- Deletes own transaction (RLS enforces ownership)

```typescript
export interface TransactionPayload {
  amount: number;       // always positive
  type: "income" | "expense";
  category_id: string | null;
  date: string;         // YYYY-MM-DD Bangkok-local date
  note: string | null;
}
```

---

## Monthly Velocity Chart

**Component:** `MonthlyVelocityChart.tsx` — no `'use client'` directive needed (Recharts components are `'use client'`-compatible via a thin client wrapper)

**Chart config (Recharts `LineChart`):**
- No `CartesianGrid`
- X-axis: abbreviated Thai month names (ม.ค., ก.พ., …), no axis line, no tick line
- Y-axis: hidden (`hide={true}`)
- `Line`: expense data, stroke = `var(--accent)` (#facc15), `strokeWidth={2.5}`, `dot={false}`, `filter="url(#glow)"`
- SVG `<defs>` with `<filter id="glow">`: `feGaussianBlur stdDeviation="3"` + `feMerge` — gives the yellow glow
- `Area` fill: same accent colour at 10% opacity underneath the line
- `Tooltip`: custom styled glass card showing month + ฿amount
- Data: `monthlyPoints` array sorted oldest → newest

**Pro gating:** `data === null` → blur overlay + "🔒 ปลดล็อกด้วย Pro" CTA (same pattern as Overview cards). Placeholder static data shown behind blur.

---

## Category Breakdown Chart

**Component:** `CategoryBreakdownChart.tsx`

**Chart config (Recharts `PieChart` as donut):**
- `innerRadius="60%"`, `outerRadius="80%"` — creates the donut hole
- Center label: total month expense (฿XX,XXX) + "รายจ่ายเดือนนี้"
- Colours: cycle through a fixed palette (`["#facc15","#34d399","#818cf8","#f87171","#fb923c","#38bdf8"]`)
- No `CartesianGrid`, no axes
- `Tooltip`: disabled (info is in the legend)

**Legend (beside the donut):**
- Rendered as a custom list, not Recharts' built-in legend
- Each row: colour swatch | category name | `฿actual / ฿budget`
- Categories with no budget: show `฿actual / —`
- Categories over budget: amount shown in `var(--negative)` red

**Pro gating:** same blur/lock overlay.

---

## Transaction CRUD List

**Component:** `TransactionList.tsx` (`'use client'`)

**Data fetching:**
- On mount (parallel): 
  1. `supabase.from("transactions").select("id, amount, type, date, note, categories(name), brands(name, logo_url)").eq("user_id", userId).order("date", { ascending: false }).limit(50)`
  2. `supabase.from("categories").select("id, name").eq("user_id", userId).order("name")` — for the form drawer's category select
- `userId` passed as a prop from `page.tsx`
- After any mutation: re-runs query 1 to refresh (categories list is stable, no re-fetch needed)

**List rendering:**
- Each row: left = category colour dot + category name + date; right = amount (green for income, red for expense)
- Note shown below category name if present (truncated to 1 line)
- Brand logo shown instead of colour dot if `brands.logo_url` is set
- Tap row → opens `TransactionFormDrawer` in edit mode

**Delete gesture:**
- Framer Motion `drag="x"` on each row, `dragConstraints={{ left: -80, right: 0 }}`
- At drag offset < -60px: red delete zone revealed beneath row
- On release past threshold: calls `deleteTransaction(id)` → optimistic removal from list

**Add button:**
- Yellow "+" circular FAB, fixed bottom-right within the list section
- Tap → opens `TransactionFormDrawer` in add mode

---

## TransactionFormDrawer

**Component:** `TransactionFormDrawer.tsx` (`'use client'`)

Same Framer Motion spring bottom sheet as `CsvImportDrawer` (`damping: 30, stiffness: 300`). Backdrop click closes (unless submitting).

**Props:**
```typescript
interface Props {
  mode: "add" | "edit";
  transaction?: TransactionRow; // pre-fills form in edit mode
  categories: Array<{ id: string; name: string }>; // passed from TransactionList
  onClose: () => void;
  onSuccess: () => void; // triggers list re-fetch
}
```

**Fields:**
| Field | Input | Validation |
|---|---|---|
| จำนวนเงิน | `<input type="number" min="0">` | Required, > 0 |
| ประเภท | Toggle: รายรับ / รายจ่าย | Required |
| หมวดหมู่ | `<select>` from categories | Optional |
| วันที่ | `<input type="date">` default Bangkok today | Required |
| หมายเหตุ | `<input type="text">` | Optional |

**Actions:**
- Add mode: "บันทึก" → `addTransaction()` → `onSuccess()` → close
- Edit mode: "อัปเดต" → `updateTransaction()` → `onSuccess()` → close
- Edit mode: red "ลบรายการ" button → `deleteTransaction()` → `onSuccess()` → close
- All: loading state on buttons, Thai error message on failure

---

## Pro Gating

Charts (`MonthlyVelocityChart`, `CategoryBreakdownChart`): `data === null` → render placeholder values behind `blur-sm pointer-events-none` + absolute overlay with lock icon + "🔒 ปลดล็อกด้วย Pro" → `/paywall`.

Transaction CRUD list: always rendered, no gating.

---

## Empty States

| Situation | Behaviour |
|---|---|
| No transactions (new user) | List shows "ยังไม่มีรายการ — แตะ + เพื่อเพิ่ม" |
| No categories loaded | Drawer shows no category options; category field is optional so submit still works |
| Monthly chart: < 2 months data | Chart renders with available points; Recharts handles gracefully |
| All categories have no budget | Donut renders all segments; legend shows "—" for all budget column |
