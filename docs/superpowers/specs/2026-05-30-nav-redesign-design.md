# Navigation & Home Redesign — Design Spec

**Date:** 2026-05-30

---

## Overview

Restructure the bottom navigation from 4 tabs to 5 tabs with a centre protruding FAB, remove Settings from the nav bar, surface it via a profile avatar on the home page, and replace the home page header with a cashflow hero card.

---

## Bottom Navigation

### Structure

5 positions:
```
Home | Analytics | [FAB] | Transactions | Wealth
```

| Position | Label | Route | Icon |
|----------|-------|-------|------|
| 1 | หน้าแรก | `/overview` | House |
| 2 | วิเคราะห์ | `/analytics` | ChartLine |
| 3 | — | FAB (no route) | + |
| 4 | รายการ | `/transactions` | CreditCard |
| 5 | ทรัพย์สิน | `/wealth` | Wallet |

Settings is **removed** from the nav bar.

### FAB Style (notched/protruding)

- Circular button, 52px diameter
- Background: `var(--accent)` (#facc15, banana yellow)
- Icon: `+` (Plus from lucide-react), black, 24px
- Protrudes **20px above** the nav bar top edge via `margin-top: -20px` or negative translate
- Box shadow: `0 6px 24px rgba(250,204,21,0.45)`
- Tapping FAB opens the add-transaction drawer (same as the existing FAB on the transactions page)

### Nav Bar Container

- Fixed bottom, full width, `max-w-md` centred
- Background: `var(--glass-bg)` with `backdrop-filter: blur(16px)`
- Border: `var(--glass-border)` top only (or full border-radius pill)
- Border radius: `1.5rem` (same as existing)
- Padding: accounts for safe-area-inset-bottom
- Active tab: `var(--accent)` colour, icon stroke 2.4
- Inactive tab: `var(--fg-muted)`, icon stroke 1.8
- No label for FAB slot — just the button

---

## Home Page Header

Replaces the current `<header>` section in `overview/page.tsx`.

### Layout

```
[Greeting + date]        [Avatar]
[─────── Cashflow card ──────────]
```

### Greeting row

- Left: "สวัสดี, [first name] 👋" (bold, `text-lg`) + date below (`text-xs text-fg-muted`, Bangkok locale, Thai format)
- Right: circular avatar, 36px, showing user's first initial on `var(--accent)` background
- Avatar is a `<Link href="/settings">` — taps navigate to `/settings`
- First name extracted from `user.email` (before `@`) or `user.user_metadata.full_name` if available

### Cashflow hero card

- Style: glass card (`var(--glass-bg)`, `var(--glass-border)`, `border-radius: var(--radius-card)`)
- Yellow accent line: 2px full-width gradient bar at top of card (`var(--accent)` → transparent)
- Primary number: **net cashflow this month** = total income − total expense, formatted as `฿X,XXX`
  - Positive: `var(--positive)` colour
  - Negative: `var(--negative)` colour
  - Zero: `var(--fg)`
- Label above number: "กระแสเงินสด เดือนนี้" (`text-xs text-fg-muted`)
- Below number: two mini-cards side by side
  - Left: รายรับ — green (`var(--positive)`), shows total income this month
  - Right: รายจ่าย — red (`var(--negative)`), shows total expense this month

### Data source

- Current month income/expense already computed by `getOverviewData()` → `data.totalIncome` and `data.totalExpense`
- No new server action needed — reuse existing data

---

## Profile Avatar & Settings Access

- Avatar lives in the `HomeHeader` component (server component — receives `user` prop)
- `<Link href="/settings">` wraps the avatar circle
- Settings page (`/settings`) remains unchanged in content
- Settings tab removed from `BottomNav`

---

## Transactions Route

The `/transactions` route already exists (`app/(dashboard)/transactions/`). It is added to the nav bar in position 4. No content changes to that page.

---

## FAB Behaviour

The FAB in the nav bar triggers the add-transaction flow. Options:

- If the user is already on `/transactions`: FAB opens the existing `TransactionFormDrawer` directly
- If on any other page: FAB navigates to `/transactions?add=1` and the transactions page detects the param to open the drawer on mount

This keeps FAB behaviour consistent without duplicating the drawer across pages.

---

## Components

| File | Action | Change |
|------|--------|--------|
| `app/(dashboard)/_components/BottomNav.tsx` | Modify | 5 tabs + notched FAB |
| `app/(dashboard)/overview/_components/HomeHeader.tsx` | Create | Greeting + avatar + cashflow card |
| `app/(dashboard)/overview/page.tsx` | Modify | Replace `<header>` with `<HomeHeader>`, pass `user` + `data` |
| `app/(dashboard)/transactions/page.tsx` | Modify | Read `?add=1` param to auto-open drawer on mount |

---

## Out of Scope

- Global CSS colour changes
- Redesigning analytics, wealth, or settings pages
- Animated FAB expand (e.g. speed-dial)
- Push notifications or badge counts on nav tabs
