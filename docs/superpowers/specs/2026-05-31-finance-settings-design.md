# Finance Settings — Billing Cycle, Emergency Fund Goal, Balance Method

## Overview

Three new functional settings under "ตั้งค่าการเงิน", each backed by a new column on `profiles`, a Supabase migration, a settings UI component, and wired into the calculation layer.

---

## Database

### Migration

One migration file adds three columns to `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cycle_start_day  integer NOT NULL DEFAULT 1
    CHECK (cycle_start_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS emergency_months integer NOT NULL DEFAULT 6
    CHECK (emergency_months BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS balance_method   text    NOT NULL DEFAULT 'net'
    CHECK (balance_method IN ('net', 'gross', 'budget'));
```

Defaults: cycle starts on day 1 (calendar month, current behaviour), emergency target is 6 months, balance method is `net` (income − expenses − savings, current behaviour). All three defaults preserve exact current behaviour for existing users.

---

## 1. วันเริ่มรอบเดือน (Billing cycle start day)

### Setting UI

- **Component:** `app/(dashboard)/settings/_components/BillingCycleSection.tsx` (`"use client"`)
- The existing `comingSoon` `SettingsRow` for "วันเริ่มรอบเดือน" is replaced with an `onClick` row that opens a bottom-sheet drawer.
- Drawer shows a 4-column grid of buttons 1–28. Selected day highlighted with `border-accent bg-accent/10 text-accent`.
- Tap a day → call server action `saveBillingCycle(day)` → close drawer. No separate save button (immediate save on tap).
- Row value shows `"วันที่ {n}"` / `"Day {n}"` (i18n).

### Server Action

`app/actions/profile.ts` — add:
```ts
export async function saveBillingCycle(day: number): Promise<void>
// validates 1 ≤ day ≤ 28, updates profiles.cycle_start_day
```

### Calculation changes — `app/actions/home.ts`

Load `cycle_start_day` from `profiles` (alongside the budget query already there). Pass it to a new pure helper `getBillingCycle(today, startDay)` in `app/actions/overview-utils.ts`:

```ts
export function getBillingCycle(
  today: { year: number; month: number; day: number },
  startDay: number   // 1–28
): {
  cycleStart: string;    // ISO UTC timestamp (Bangkok midnight)
  cycleEnd: string;      // ISO UTC timestamp (Bangkok midnight, exclusive)
  daysInCycle: number;
  daysElapsed: number;
  daysRemaining: number;
}
```

**Logic:**
- If `today.day >= startDay`: current cycle started this calendar month on `startDay`, ends on next month's `startDay` (exclusive).
- If `today.day < startDay`: current cycle started last calendar month on `startDay`, ends this month's `startDay` (exclusive).
- Use existing `bkkOffsetMs = 7 * 3_600_000` pattern for UTC conversion.

Replace `monthStart` / `monthEnd` / `daysInMonth` / `daysElapsed` / `daysRemaining` in `getHomeData` with the output of `getBillingCycle`.

**`monthLabel`:** When `startDay === 1`, keep current format (`"มิ.ย. 2568"`). When `startDay !== 1`, use a range: `"25 พ.ค. – 24 มิ.ย."` (no year needed if both months are in the same year-context; add year only when the cycle spans a year boundary).

**Analytics:** "เดือนนี้" in `analytics-utils.ts` continues to use calendar month for v1. Out of scope for this change.

### i18n

Add to both `th.ts` and `en.ts` under `settings`:
- `billingCycleDrawerTitle: "วันเริ่มรอบเดือน"` / `"Billing cycle start"`
- `billingCycleSaved: "บันทึกแล้ว"` / `"Saved"`
- `billingCycleDay: "วันที่ {n}"` / `"Day {n}"` (template string, use `format()`)

---

## 2. เป้าหมายเงินสำรองฉุกเฉิน (Emergency fund goal)

### Setting UI

- **Component:** `app/(dashboard)/settings/_components/EmergencyGoalSection.tsx` (`"use client"`)
- Slider `min=1 max=24 step=1`, same style as `SavingsTargetSection`.
- Shows below slider: current runway vs target, e.g. `"ตอนนี้: 4.2 เดือน / เป้า: 6 เดือน"` with a thin progress bar.
- "บันทึก" button (disabled when value unchanged), same pattern as `SavingsTargetSection`.
- Reads `initialTarget` from `profiles.emergency_months` (passed as a prop from the settings page server component).
- Shows current runway from the `EmergencyRunwayCard` data — but the settings page doesn't have access to wealth data. Simpler: just show `"เป้า: {n} เดือน"` without the current runway figure (the runway is visible on Overview anyway).

### Server Action

`app/actions/profile.ts` — add:
```ts
export async function saveEmergencyGoal(months: number): Promise<number>
// validates 1 ≤ months ≤ 24, updates profiles.emergency_months, returns new value
```

### Calculation changes — `EmergencyRunwayCard`

`app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx` currently receives `data: RunwayData | null`. Add `targetMonths: number` prop (passed from overview page which reads it from profiles).

Add below the existing months display:
- Progress bar: `Math.min(1, currentMonths / targetMonths) * 100%`
- Status: reached (`currentMonths >= targetMonths`), close (`>= 80%`), building otherwise.

Overview page already fetches profile data — extend the select to include `emergency_months`.

### i18n

Add under `settings`:
- `emergencyGoalLabel: "เป้าหมายเงินสำรอง"` / `"Emergency fund target"`
- `emergencyGoalHint: "ตั้งเป้ากี่เดือนของค่าใช้จ่าย"` / `"Target months of expenses"`
- `emergencyGoalSave: "บันทึกเป้าหมาย"` / `"Save target"`
- `emergencyGoalSaving: "กำลังบันทึก…"` / `"Saving…"`
- `emergencyGoalSaved: "บันทึกแล้ว"` / `"Saved"`
- `emergencyGoalError: "บันทึกไม่สำเร็จ"` / `"Failed to save"`

Add under `overview`:
- `emergencyGoalReached: "ถึงเป้าหมายแล้ว 🎉"` / `"Goal reached 🎉"`
- `emergencyGoalClose: "ใกล้ถึงเป้าหมายแล้ว"` / `"Almost there"`
- `emergencyGoalBuilding: "กำลังสะสม"` / `"Building up"`
- `emergencyTarget: "เป้า"` / `"Target"`

---

## 3. วิธีคำนวณเงินคงเหลือ (Balance calculation method)

### Setting UI

- **Component:** `app/(dashboard)/settings/_components/BalanceMethodSection.tsx` (`"use client"`)
- 3-option vertical or grid layout. Each option shows a label + short description:
  - `net` → `"รายรับ − รายจ่าย − ออม"` / `"Income − Expenses − Savings"` (default)
  - `gross` → `"รายรับ − รายจ่าย"` / `"Income − Expenses"`
  - `budget` → `"งบ − รายจ่าย"` / `"Budget − Expenses"`
- Tap to select → immediate save via server action.
- Reads `initialMethod` from settings page (server).

### Server Action

`app/actions/profile.ts` — add:
```ts
export async function saveBalanceMethod(method: "net" | "gross" | "budget"): Promise<void>
```

### Calculation changes — `app/actions/home.ts`

Load `balance_method` from `profiles`. Apply:
```ts
const remaining =
  balanceMethod === 'gross'  ? totalIncome - totalExpense :
  balanceMethod === 'budget' ? budgetTotal - totalExpense :
  /* net (default) */          totalIncome - totalExpense - totalSavings;
```

The `HomeBalanceCard` status messages (`statusOverBudget`, `statusOnTrack`, etc.) remain the same — they all key off the sign of `remaining`, which is already correct for all three methods.

### i18n

Add under `settings`:
- `balanceMethodTitle: "วิธีคำนวณเงินคงเหลือ"` / `"Balance calculation method"`
- `balanceMethodNet: "รายรับ − รายจ่าย − ออม"` / `"Income − Expenses − Savings"`
- `balanceMethodGross: "รายรับ − รายจ่าย"` / `"Income − Expenses"`
- `balanceMethodBudget: "งบ − รายจ่าย"` / `"Budget − Expenses"`
- `balanceMethodNetDesc: "เงินที่ใช้ได้จริงหลังออม"` / `"Free cash after saving"`
- `balanceMethodGrossDesc: "นับเงินออมเป็นส่วนหนึ่งของยอดคงเหลือ"` / `"Savings counted as available"`
- `balanceMethodBudgetDesc: "ใช้งบตั้งต้นแทนรายรับ"` / `"Uses budget as the ceiling"`

---

## Settings Page Wiring

`app/(dashboard)/settings/page.tsx` — extend the profiles query:
```ts
.select("..., cycle_start_day, emergency_months, balance_method")
```

Replace the three `comingSoon` rows with the new functional components:
```tsx
<BillingCycleSection initialDay={profile.cycle_start_day ?? 1} />
<EmergencyGoalSection initialMonths={profile.emergency_months ?? 6} />
<BalanceMethodSection initialMethod={profile.balance_method ?? "net"} />
```

`SavingsTargetSection` stays as-is (already functional).

---

## File Map

**New files:**
- `supabase/migrations/YYYYMMDD_finance_settings.sql`
- `app/(dashboard)/settings/_components/BillingCycleSection.tsx`
- `app/(dashboard)/settings/_components/EmergencyGoalSection.tsx`
- `app/(dashboard)/settings/_components/BalanceMethodSection.tsx`

**Modified files:**
- `app/actions/profile.ts` — 3 new server actions
- `app/actions/overview-utils.ts` — `getBillingCycle()` helper
- `app/actions/home.ts` — load cycle + balance_method from profiles, apply both
- `app/(dashboard)/overview/page.tsx` — pass `emergency_months` to `EmergencyRunwayCard`
- `app/(dashboard)/overview/_components/EmergencyRunwayCard.tsx` — add `targetMonths` prop + progress
- `app/(dashboard)/settings/page.tsx` — extend profile select, swap comingSoon rows
- `lib/i18n/dictionaries/th.ts` + `en.ts` — new keys

---

## Out of Scope (v1)

- Analytics "เดือนนี้" period alignment with billing cycle — analytics stays on calendar month
- Multiple balance methods per account type
- Retroactive recalculation of past analytics when settings change
