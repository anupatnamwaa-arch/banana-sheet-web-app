# Auth and Paywall Banana Atelier Redesign

## Goal

Refresh the live Auth and Paywall surfaces with a minimal, beautiful, playful Banana Sheet identity without changing their working business logic.

The visual direction is **Banana Atelier**: warm editorial surfaces, restrained banana-yellow accents, and a lightweight illustrated banana guide. The design supports the existing light and dark themes.

## Scope

Redesign these surfaces:

- Login
- Forgot Password
- Reset Password
- Paywall

Keep the dashboard visual system compatible. Do not redesign unrelated dashboard pages.

## Non-Goals

- Do not change Supabase authentication behavior.
- Do not change Google OAuth behavior or callback routing.
- Do not change password-recovery behavior.
- Do not change Paywall prices, Plan selection behavior, PromptPay QR generation, Storage upload, Promo Code redemption, or Telegram approval.
- Do not push, deploy, or create a pull request during local implementation.

## Visual System

### Light Theme

- Warm cream paper background.
- Cocoa text.
- Banana-yellow primary accent.
- Soft olive secondary details.
- Quiet shadows and restrained borders.

### Dark Theme

- Deep espresso background.
- Warm charcoal elevated cards.
- Softened banana-gold accent.
- Muted cream text.
- Quiet shadows and restrained borders.

### Character

Add a lightweight SVG banana guide. It is playful but not dominant. The illustration remains crisp, theme-aware, and network-independent.

Supported poses:

- `welcome`: Login greeting.
- `helpful`: Forgot Password and Reset Password guidance.
- `waiting`: Payment slip pending verification.
- `retry`: Payment slip rejected.
- `celebrate`: Active Pro, successful Promo Code activation, and recovery success.

### Motion

- Use a subtle floating motion for the banana guide.
- Use gentle entrance transitions for major cards.
- Do not animate the QR scanning region.
- Do not add distracting motion during form submission.

## Components

### `AtelierShell`

A shared responsive outer shell for Auth and Paywall screens.

Responsibilities:

- Apply the scoped Banana Atelier background.
- Render decorative peel curves.
- Apply light or dark appearance using the existing theme mechanism.
- Provide a small theme control for unauthenticated users.

### `BananaGuide`

A lightweight SVG mascot component.

Responsibilities:

- Render a pose selected by screen state.
- Remain decorative and accessible.
- Avoid network-loaded assets.

### `AtelierCard`

A shared paper-like container for focused Auth tasks.

Responsibilities:

- Provide consistent spacing, radius, border, and surface treatment.
- Preserve form semantics and existing handlers.

### `AtelierBrand`

A shared brand lockup.

Responsibilities:

- Render the Banana Sheet identity.
- Pair the logo and product name with concise localized supporting copy.

## Auth Screens

### Login

Use a centered `AtelierCard` containing:

- `AtelierBrand`
- `BananaGuide` with `welcome`
- Google sign-in
- Divider
- Email and password fields
- Sign-in button
- Sign-up button
- Forgot Password link

Preserve the current sign-in, sign-up, OAuth, session healing, and redirect logic.

### Forgot Password

Use the shared shell and card with:

- `BananaGuide` with `helpful`
- Focused email form
- Back-to-login link

After success, switch to `celebrate` and show a soft banana-tinted confirmation panel.

### Reset Password

Use the shared shell and card with:

- `BananaGuide` with `helpful`
- New password field
- Confirm password field
- Submit button

Preserve the current validation and redirect logic.

## Paywall

### Mobile

Use a guided vertical journey:

1. Intro with Banana Sheet Pro positioning and `BananaGuide`.
2. Plan selection cards.
3. Pro benefits list.
4. PromptPay QR payment card.
5. Slip upload and verification status.
6. Promo Code card as an optional alternative.

### Desktop

Use a two-column layout:

- Left: intro, Plan selection, and benefits.
- Right: PromptPay QR and slip upload status.
- Below: Promo Code card.

### State-Aware Guide

- Default: point toward Plan cards.
- Pending slip: `waiting`.
- Rejected slip: `retry`.
- Active Pro: `celebrate`.
- Successful Promo Code redemption: `celebrate`.

### Reliability Fix

Wrap `/paywall` with `LanguageProvider` so `PaywallClient` can safely use `useT()`.

## Data And Logic Boundaries

The redesign must preserve these existing boundaries:

- Auth remains Supabase-backed.
- Google OAuth continues through `/auth/callback`.
- PromptPay QR remains derived from the current PromptPay ID and selected amount.
- Slip files remain uploaded to the existing `payment-slips` Storage bucket.
- `submitPaymentSlip` remains the server action that records the pending slip and notifies Telegram.
- Promo Code redemption remains server-side and activates lifetime Pro.
- Telegram webhook approval remains unchanged.

## Verification

Run:

- `node .\node_modules\typescript\bin\tsc --noEmit`
- `node .\node_modules\eslint\bin\eslint.js .`
- `git diff --check`

Smoke-test locally:

- `/login`
- `/forgot-password`
- `/reset-password`
- `/paywall`

Check both themes:

- Light
- Dark

Check Paywall states where locally feasible:

- Default Free user
- Pending slip
- Rejected slip
- Active Pro
- Promo Code success

Check Auth states where locally feasible:

- Login default
- Login validation error
- Forgot Password default
- Forgot Password success
- Reset Password default
- Reset Password validation error

## Delivery Constraint

Keep the redesign local until the user reviews it. Do not push, deploy, open a pull request, or create git commits without explicit user approval.
