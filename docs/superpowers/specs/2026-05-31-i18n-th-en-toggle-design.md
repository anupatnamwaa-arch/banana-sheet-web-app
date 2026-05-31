# Design: Thai / English language toggle (i18n)

**Date:** 2026-05-31
**Status:** Approved (brainstorm)

## Goal

Let the user switch the app's UI language between Thai (`th`, default) and
English (`en`) from Settings. Currency stays THB only. The whole app is
translated **except the Roast feature**, which stays Thai (its AI-generated
roasts and personas are culturally-specific Thai slang — out of scope).

## Why this approach

The app already persists prefs (theme, hide-balance) in `localStorage`, applied
client-side. That trick does **not** work for i18n because roughly half the
app's text renders in **server components**, which cannot read `localStorage`.
Locale must therefore live in a **cookie** so the server can read it at render
time.

Rejected alternatives:
- `next-intl`: adds a dependency and typically expects locale in the URL path
  (`/en`, `/th`), forcing route restructuring. Overkill here.
- All-client + `localStorage`: would force converting server pages to client
  components, losing SSR. Too invasive.

## Architecture

### Locale storage & resolution
- Cookie `bs-locale` with value `th` | `en`. Default `th` when absent.
- `lib/i18n/locale.ts`:
  - `type Locale = "th" | "en"`
  - `getLocale(): Promise<Locale>` — server-only, reads cookie via
    `cookies()` from `next/headers`.
- The toggle sets the cookie (client-side `document.cookie`, 1-year max-age,
  path `/`).

### Dictionaries
- `lib/i18n/dictionaries/th.ts` and `lib/i18n/dictionaries/en.ts`.
- A single nested object, namespaced by area:
  `common`, `nav`, `overview`, `transactions`, `wealth`, `analytics`,
  `settings`. (No `roast` namespace — Roast stays Thai.)
- `th.ts` is the source-of-truth shape; `en.ts` is typed as
  `typeof thDictionary` so a missing/renamed key is a **compile error**.
- `lib/i18n/dictionaries/index.ts`: `getDictionary(locale): Dictionary`
  (synchronous object pick; both dictionaries are static imports).
- `type Dictionary = typeof thDictionary`.

### Server-component usage
- Server components call `const locale = await getLocale()` and
  `const t = getDictionary(locale)`, then read `t.settings.title` etc.
- The root `app/layout.tsx` becomes `async`, reads the locale, and sets
  `<html lang={locale}>`.

### Client-component usage
- `lib/i18n/LanguageProvider.tsx` (`"use client"`):
  - Context holds `{ locale, dict }`.
  - Provider is mounted in `app/(dashboard)/layout.tsx` with the
    server-resolved locale + dictionary passed as props (so first paint is
    correct, no flash).
  - `useT()` hook returns the dictionary; `useLocale()` returns the current
    locale.
- Client components replace hardcoded strings with `const t = useT()` lookups.

### Toggle behaviour
- New client component `LanguageSection` (or row) in Settings:
  - Segmented control: **ไทย / English**. Currency shown as fixed **THB**
    (non-interactive).
  - On select: write `bs-locale` cookie, then `router.refresh()`.
  - `router.refresh()` re-renders server components with the new cookie; the
    provider receives the new dictionary via re-rendered layout props, so
    client components update too. No hard reload, text swaps in place.
- The existing `ภาษาและสกุลเงิน` row loses its `comingSoon` badge and becomes
  this functional control.

### Dates & numbers
- `formatTHB` untouched — THB only, always `฿`.
- Where month/day names are rendered as text, use the active locale
  (`th-TH` vs `en-US`) for `Intl.DateTimeFormat`. Numeric date keys
  (`bangkokDateKey`, etc.) stay `en-CA` — they are internal, not display.

## Scope / string inventory

Translate static UI strings in (≈ all Thai-bearing files except roast):
- `nav`: `BottomNav`, `UniversalFabDrawer`
- `overview`: page + all `_components`
- `transactions`: `TransactionsView`, `AdvancedFilterSheet`
- `wealth`: `WealthView` + drawers/charts
- `analytics`: page + all `_components` (except roast-entry text that is AI)
- `settings`: page + all `_components` (including theme labels, danger zone,
  notification, savings target, csv, api key, shortcut guide, profile)
- `auth`: login / forgot / reset password forms
- `common`: shared words (save, cancel, delete, close, "เร็ว ๆ นี้" →
  "Coming soon", etc.)

**Out of scope:**
- `roast/` (page, `_components`, `_lib/personas.ts`) — stays Thai.
- AI-generated content from `app/api/roast` and roast actions.
- Branding: "Banana Sheet" stays; banana-themed proper nouns keep their flavor
  but get readable English labels where they are UI labels.
- Currency: THB only, no currency switching.
- DB persistence of locale (cookie-only for now; revisit if cross-device sync
  is wanted).

## Testing / verification
- Build passes (`next build`) — typed dictionaries catch missing keys.
- Manual: toggle TH→EN in Settings, confirm Settings + Overview + Transactions
  + Wealth + Analytics text swaps without reload; Roast stays Thai; `<html lang>`
  updates; refresh persists choice; THB formatting unchanged.

## Risks
- Large surface (~560 strings across ~60 files once Roast is excluded). Mitigate
  with typed dictionaries (compile-time safety) and per-area namespaces so the
  work is checkable area-by-area.
- `router.refresh()` + provider prop flow must be verified to avoid a stale
  dictionary in client components after toggle.
