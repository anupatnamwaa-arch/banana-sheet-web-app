# Auth and Paywall Banana Atelier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Login, Forgot Password, Reset Password, and Paywall with a minimal light/dark Banana Atelier theme while preserving the current Supabase, PromptPay, slip-upload, Promo Code, and Telegram behavior.

**Architecture:** Add a small shared Atelier presentation layer under `app/_components/atelier/`, then compose it into the existing Auth forms and Paywall client without moving business logic. Keep browser-only theme persistence in one narrow Client Component and keep the existing server pages as Server Components. Add a built-in `node:test` source-contract check before implementation because this repo has no component test runner.

**Tech Stack:** Next.js 16.2.6 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Supabase, lucide-react, react-dropzone, Node built-in test runner.

---

## Local-Only Constraint

Do not commit, push, deploy, open a pull request, or modify remote state during this implementation. The normal Superpowers commit checkpoints are intentionally replaced with local diff checkpoints until the user explicitly approves commits.

The worktree already contains unrelated in-progress dashboard work from another agent. Do not edit or revert those files. In particular, avoid `app/layout.tsx`, `lib/i18n/dictionaries/en.ts`, and `lib/i18n/dictionaries/th.ts`. Reuse existing copy where possible.

## Next.js Guidance Checked

Before implementation, read:

- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/11-css.md`
- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`

Apply these constraints:

- Keep pages as Server Components unless browser APIs or state require a Client Component.
- Keep `localStorage` and `document.documentElement` access inside the theme-toggle Client Component.
- Keep Supabase secrets and profile lookup on the server.
- Import global CSS only through the existing root layout.

## File Map

Create:

- `app/_components/atelier/ThemeToggle.tsx`: unauthenticated light/dark theme control using existing `bs-theme` storage.
- `app/_components/atelier/AtelierShell.tsx`: responsive scoped background, decorative peel curves, and theme control.
- `app/_components/atelier/AtelierCard.tsx`: shared paper-like surface.
- `app/_components/atelier/AtelierBrand.tsx`: shared logo and supporting copy.
- `app/_components/atelier/BananaGuide.tsx`: network-independent SVG banana guide with five poses.
- `app/_components/atelier/index.ts`: presentation-layer exports.
- `scripts/test-auth-paywall-atelier.mjs`: source-contract test for UI integration and preserved business boundaries.

Modify:

- `app/globals.css`: add scoped Atelier tokens, decorative curves, and reduced-motion behavior.
- `app/(auth)/login/page.tsx`: compose shared Atelier shell, card, brand, and welcome guide.
- `app/(auth)/login/_components/LoginForm.tsx`: polish presentation while preserving all auth handlers.
- `app/(auth)/forgot-password/_components/ForgotPasswordForm.tsx`: compose helpful and celebrate guide states.
- `app/(auth)/reset-password/_components/ResetPasswordForm.tsx`: compose helpful guide state.
- `app/paywall/page.tsx`: wrap the Paywall client with `LanguageProvider`.
- `app/paywall/_components/PaywallClient.tsx`: reorganize presentation into a guided mobile journey and two-column desktop checkout while preserving logic.

Do not modify:

- `app/actions/paywall.ts`
- `app/api/telegram/webhook/route.ts`
- `app/auth/callback/route.ts`
- Supabase migrations
- Existing PromptPay IDs, prices, bucket names, or action signatures

---

### Task 1: Add a Failing Auth and Paywall Contract Test

**Files:**
- Create: `scripts/test-auth-paywall-atelier.mjs`

- [ ] **Step 1: Create the source-contract test**

Create `scripts/test-auth-paywall-atelier.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared Atelier UI exposes theme persistence and all banana guide poses", async () => {
  const [themeToggle, shell, guide, css] = await Promise.all([
    read("app/_components/atelier/ThemeToggle.tsx"),
    read("app/_components/atelier/AtelierShell.tsx"),
    read("app/_components/atelier/BananaGuide.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(themeToggle, /localStorage\.getItem\("bs-theme"\)/);
  assert.match(themeToggle, /document\.documentElement\.setAttribute\("data-theme"/);
  assert.match(shell, /atelier-peel/);
  assert.match(guide, /"welcome"/);
  assert.match(guide, /"helpful"/);
  assert.match(guide, /"waiting"/);
  assert.match(guide, /"retry"/);
  assert.match(guide, /"celebrate"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test("Auth presentation uses Atelier components while keeping Supabase behavior", async () => {
  const [loginPage, loginForm, forgotForm, resetForm] = await Promise.all([
    read("app/(auth)/login/page.tsx"),
    read("app/(auth)/login/_components/LoginForm.tsx"),
    read("app/(auth)/forgot-password/_components/ForgotPasswordForm.tsx"),
    read("app/(auth)/reset-password/_components/ResetPasswordForm.tsx"),
  ]);

  assert.match(loginPage, /AtelierShell/);
  assert.match(loginPage, /BananaGuide pose="welcome"/);
  assert.match(loginForm, /signInWithPassword/);
  assert.match(loginForm, /signUp/);
  assert.match(loginForm, /signInWithOAuth/);
  assert.match(loginForm, /\/auth\/callback/);
  assert.match(forgotForm, /resetPasswordForEmail/);
  assert.match(forgotForm, /sent \? "celebrate" : "helpful"/);
  assert.match(resetForm, /updateUser\(\{ password \}\)/);
  assert.match(resetForm, /BananaGuide pose="helpful"/);
});

test("Paywall gets language context and preserves payment boundaries", async () => {
  const [page, client, actions] = await Promise.all([
    read("app/paywall/page.tsx"),
    read("app/paywall/_components/PaywallClient.tsx"),
    read("app/actions/paywall.ts"),
  ]);

  assert.match(page, /LanguageProvider/);
  assert.match(page, /getLocale/);
  assert.match(page, /getDictionary/);
  assert.match(client, /https:\/\/promptpay\.io\/\$\{promptPayId\}\/\$\{amount\}\.png/);
  assert.match(client, /selectedPlan === "yearly" \? 399 : 39/);
  assert.match(client, /\.from\("payment-slips"\)/);
  assert.match(client, /submitPaymentSlip\(selectedPlan, storagePath\)/);
  assert.match(client, /redeemPromoCode\(promoCode\)/);
  assert.match(client, /status === "pending"/);
  assert.match(client, /status === "rejected"/);
  assert.match(actions, /api\.telegram\.org\/bot\$\{botToken\}\/sendPhoto/);
});
```

- [ ] **Step 2: Run the test to verify the red state**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: FAIL with `ENOENT` for `app/_components/atelier/ThemeToggle.tsx`.

- [ ] **Step 3: Record a local checkpoint**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" status --short -- scripts/test-auth-paywall-atelier.mjs
```

Expected: the new contract test appears locally. Do not commit it.

---

### Task 2: Build the Shared Banana Atelier Presentation Layer

**Files:**
- Create: `app/_components/atelier/ThemeToggle.tsx`
- Create: `app/_components/atelier/AtelierShell.tsx`
- Create: `app/_components/atelier/AtelierCard.tsx`
- Create: `app/_components/atelier/AtelierBrand.tsx`
- Create: `app/_components/atelier/BananaGuide.tsx`
- Create: `app/_components/atelier/index.ts`
- Modify: `app/globals.css`
- Test: `scripts/test-auth-paywall-atelier.mjs`

- [ ] **Step 1: Create the narrow theme-toggle Client Component**

Create `app/_components/atelier/ThemeToggle.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ResolvedTheme = "dark" | "light";
type StoredTheme = ResolvedTheme | "system";

function resolveTheme(theme: StoredTheme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("bs-theme");
    const preferred: StoredTheme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "dark";
    const resolved = resolveTheme(preferred);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  function handleToggle() {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("bs-theme", next);
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="atelier-theme-toggle"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
```

- [ ] **Step 2: Create the shared shell and surface components**

Create `app/_components/atelier/AtelierShell.tsx`:

```tsx
import { ThemeToggle } from "./ThemeToggle";

export function AtelierShell({
  children,
  contentClassName = "",
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <main className="atelier-shell min-h-dvh overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      <span className="atelier-peel atelier-peel-one" aria-hidden="true" />
      <span className="atelier-peel atelier-peel-two" aria-hidden="true" />
      <span className="atelier-peel atelier-peel-three" aria-hidden="true" />
      <ThemeToggle />
      <div className={`relative z-10 mx-auto w-full ${contentClassName}`}>
        {children}
      </div>
    </main>
  );
}
```

Create `app/_components/atelier/AtelierCard.tsx`:

```tsx
export function AtelierCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`atelier-card ${className}`}>{children}</section>;
}
```

Create `app/_components/atelier/AtelierBrand.tsx`:

```tsx
import Image from "next/image";

export function AtelierBrand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] shadow-sm">
        <Image
          src="/logo.png"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-2xl object-contain"
          priority
        />
      </div>
      <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--atelier-olive)]">
        Banana Atelier
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-fg">
        Banana Sheet
      </h1>
      {subtitle && (
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-fg-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create the five-pose SVG banana guide**

Create `app/_components/atelier/BananaGuide.tsx`:

```tsx
export type BananaGuidePose =
  | "welcome"
  | "helpful"
  | "waiting"
  | "retry"
  | "celebrate";

const poses: Record<
  BananaGuidePose,
  { rotate: number; leftArm: string; rightArm: string; mouth: string }
> = {
  welcome: {
    rotate: -5,
    leftArm: "M30 51 C18 42 14 35 11 28",
    rightArm: "M74 48 C86 43 90 36 93 30",
    mouth: "M47 54 C51 58 56 58 60 54",
  },
  helpful: {
    rotate: 3,
    leftArm: "M30 51 C19 51 14 57 10 64",
    rightArm: "M74 48 C86 42 89 34 90 25",
    mouth: "M48 55 C52 57 55 57 59 55",
  },
  waiting: {
    rotate: -2,
    leftArm: "M30 51 C23 59 21 68 25 75",
    rightArm: "M74 48 C80 57 81 66 77 74",
    mouth: "M49 56 C52 55 55 55 58 56",
  },
  retry: {
    rotate: 5,
    leftArm: "M30 51 C21 45 17 43 12 45",
    rightArm: "M74 48 C83 44 88 45 93 50",
    mouth: "M49 58 C52 55 55 55 58 58",
  },
  celebrate: {
    rotate: -7,
    leftArm: "M30 51 C19 41 15 32 13 22",
    rightArm: "M74 48 C87 39 91 29 93 18",
    mouth: "M47 53 C51 60 56 60 61 53",
  },
};

export function BananaGuide({
  pose,
  className = "",
}: {
  pose: BananaGuidePose;
  className?: string;
}) {
  const config = poses[pose];

  return (
    <div className={`atelier-banana-float ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 104 104"
        className="h-full w-full overflow-visible"
        role="presentation"
      >
        {pose === "celebrate" && (
          <>
            <path className="atelier-banana-star" d="M19 11l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            <path className="atelier-banana-star" d="M86 7l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
          </>
        )}
        <g transform={`rotate(${config.rotate} 52 52)`}>
          <path className="atelier-banana-limb" d={config.leftArm} />
          <path className="atelier-banana-limb" d={config.rightArm} />
          <path
            className="atelier-banana-body"
            d="M28 24c7 5 15 7 23 5 8-1 14-5 19-11 6 7 9 17 7 27-3 17-17 30-35 31-12 1-22-5-27-14 11 1 20-3 26-10 7-9 8-20 3-30-5 4-10 5-16 2z"
          />
          <path className="atelier-banana-line" d="M42 68c15-2 26-13 29-28" />
          <circle className="atelier-banana-eye" cx="48" cy="47" r="2.1" />
          <circle className="atelier-banana-eye" cx="62" cy="44" r="2.1" />
          <path className="atelier-banana-face" d={config.mouth} />
          <path className="atelier-banana-limb" d="M40 74 C37 83 32 87 26 90" />
          <path className="atelier-banana-limb" d="M61 70 C65 80 72 84 78 86" />
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 4: Export the shared presentation layer**

Create `app/_components/atelier/index.ts`:

```ts
export { AtelierBrand } from "./AtelierBrand";
export { AtelierCard } from "./AtelierCard";
export { AtelierShell } from "./AtelierShell";
export { BananaGuide, type BananaGuidePose } from "./BananaGuide";
```

- [ ] **Step 5: Add scoped Atelier styles**

Append to `app/globals.css`:

```css

/* Banana Atelier: scoped presentation layer for Auth and Paywall. */
:root {
  --atelier-paper: #15130f;
  --atelier-surface: rgba(30, 27, 20, 0.9);
  --atelier-surface-strong: #211e17;
  --atelier-line: rgba(250, 204, 21, 0.2);
  --atelier-olive: #c0b96a;
  --atelier-olive-soft: rgba(192, 185, 106, 0.11);
  --atelier-banana: #facc15;
  --atelier-ink: #2a2109;
}

[data-theme="light"] {
  --atelier-paper: #fff8dc;
  --atelier-surface: rgba(255, 252, 237, 0.92);
  --atelier-surface-strong: #fffdf4;
  --atelier-line: rgba(120, 92, 20, 0.18);
  --atelier-olive: #79752e;
  --atelier-olive-soft: rgba(121, 117, 46, 0.1);
  --atelier-banana: #f7c948;
  --atelier-ink: #382b05;
}

.atelier-shell {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(circle at 12% 8%, rgba(250, 204, 21, 0.09), transparent 28rem),
    radial-gradient(circle at 94% 90%, rgba(192, 185, 106, 0.08), transparent 24rem),
    var(--bg);
}

.atelier-shell::before {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-image: radial-gradient(var(--atelier-line) 0.7px, transparent 0.7px);
  background-size: 18px 18px;
  content: "";
  opacity: 0.38;
}

.atelier-peel {
  position: absolute;
  z-index: -1;
  display: block;
  border: 1px solid var(--atelier-line);
  border-radius: 999px;
  opacity: 0.58;
  transform: rotate(-18deg);
}

.atelier-peel-one {
  top: -7rem;
  right: -8rem;
  height: 20rem;
  width: 36rem;
}

.atelier-peel-two {
  bottom: -12rem;
  left: -9rem;
  height: 24rem;
  width: 42rem;
  transform: rotate(16deg);
}

.atelier-peel-three {
  top: 42%;
  right: -15rem;
  height: 16rem;
  width: 31rem;
  transform: rotate(8deg);
}

.atelier-card {
  border: 1px solid var(--atelier-line);
  border-radius: 1.75rem;
  background: var(--atelier-surface);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.atelier-card-arrive {
  animation: atelier-card-arrive 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.atelier-theme-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 20;
  display: flex;
  height: 2.5rem;
  width: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--atelier-line);
  border-radius: 999px;
  background: var(--atelier-surface);
  color: var(--fg);
  transition: transform 160ms ease, background-color 160ms ease;
}

.atelier-theme-toggle:hover {
  transform: translateY(-2px);
}

.atelier-banana-float {
  animation: atelier-banana-float 4.8s ease-in-out infinite;
  filter: drop-shadow(0 14px 18px rgba(0, 0, 0, 0.12));
}

.atelier-banana-body {
  fill: var(--atelier-banana);
  stroke: var(--atelier-ink);
  stroke-linejoin: round;
  stroke-width: 2.4;
}

.atelier-banana-line,
.atelier-banana-limb,
.atelier-banana-face {
  fill: none;
  stroke: var(--atelier-ink);
  stroke-linecap: round;
  stroke-width: 2.4;
}

.atelier-banana-eye {
  fill: var(--atelier-ink);
}

.atelier-banana-star {
  fill: var(--atelier-banana);
  stroke: var(--atelier-ink);
  stroke-linejoin: round;
  stroke-width: 1.4;
}

@keyframes atelier-banana-float {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -7px, 0);
  }
}

@keyframes atelier-card-arrive {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .atelier-banana-float,
  .atelier-card-arrive {
    animation: none;
  }

  .atelier-theme-toggle {
    transition: none;
  }
}
```

- [ ] **Step 6: Run the contract test**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: shared Atelier test PASS; Auth and Paywall integration tests still FAIL because the screens are not wired yet.

- [ ] **Step 7: Record a local checkpoint**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" status --short -- app/_components/atelier app/globals.css
```

Expected: only the new shared Atelier files and `app/globals.css` appear. Do not commit.

---

### Task 3: Compose Banana Atelier into Auth Screens

**Files:**
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/login/_components/LoginForm.tsx`
- Modify: `app/(auth)/forgot-password/_components/ForgotPasswordForm.tsx`
- Modify: `app/(auth)/reset-password/_components/ResetPasswordForm.tsx`
- Test: `scripts/test-auth-paywall-atelier.mjs`

- [ ] **Step 1: Compose the Login page**

Replace `app/(auth)/login/page.tsx` with:

```tsx
import {
  AtelierBrand,
  AtelierCard,
  AtelierShell,
  BananaGuide,
} from "@/app/_components/atelier";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import { LoginForm } from "./_components/LoginForm";

export default async function LoginPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand
          subtitle={
            locale === "en"
              ? "Log expenses in a tap. See them beautifully."
              : "บันทึกรายจ่ายง่าย เห็นภาพการเงินชัดขึ้น"
          }
        />
        <BananaGuide pose="welcome" className="mx-auto mt-4 h-24 w-24" />
        <LoginForm dict={t.auth} locale={locale} />
      </AtelierCard>
    </AtelierShell>
  );
}
```

- [ ] **Step 2: Polish Login form presentation without changing handlers**

In `app/(auth)/login/_components/LoginForm.tsx`, change the function signature to:

```tsx
export function LoginForm({
  dict,
  locale,
}: {
  dict: Dictionary["auth"];
  locale: string;
}) {
```

Keep `useEffect`, `handleLogin`, `handleSignUp`, and `handleGoogleLogin` unchanged. Replace only the returned JSX with:

```tsx
  return (
    <div className="mt-5 space-y-3">
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.37C21.68,11.83 21.56,11.45 21.35,11.1z" fill="#4285F4" />
          <path d="M12,20.9c2.5,0 4.6,-0.83 6.13,-2.26l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.3,0.98c-2.42,0 -4.47,-1.64 -5.2,-3.84H3v2.66C4.52,18.91 8.01,20.9 12,20.9z" fill="#34A853" />
          <path d="M6.8,13.22c-0.18,-0.55 -0.29,-1.13 -0.29,-1.72s0.1,-1.17 0.29,-1.72V7.12H3C2.36,8.4 2,9.88 2,11.5s0.36,3.1 1,4.38L6.8,13.22z" fill="#FBBC05" />
          <path d="M12,5.38c1.36,0 2.58,0.47 3.54,1.38l2.65,-2.65C16.6,2.6 14.5,1.7 12,1.7C8.01,1.7 4.52,3.69 3,6.72l3.8,2.96C7.53,7.48 9.58,5.38 12,5.38z" fill="#EA4335" />
        </svg>
        {loading ? dict.googleSigningIn : dict.googleSignIn}
      </button>

      <div className="relative flex items-center justify-center py-2">
        <div className="absolute inset-x-0 border-t border-[var(--atelier-line)]" />
        <span className="relative bg-[var(--atelier-surface)] px-3 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-fg-muted">
          {locale === "en" ? "or" : "หรือ"}
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-3 text-left">
        <label className="sr-only" htmlFor="login-email">
          {dict.emailPlaceholder}
        </label>
        <input
          id="login-email"
          type="email"
          placeholder={dict.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <label className="sr-only" htmlFor="login-password">
          {dict.passwordPlaceholder}
        </label>
        <input
          id="login-password"
          type="password"
          placeholder={dict.passwordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none transition-colors focus:border-accent"
        />
        {error && <p className="text-xs text-negative">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-2xl bg-accent py-3 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? dict.loginLoading : dict.loginButton}
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          disabled={loading}
          className="w-full cursor-pointer rounded-2xl border border-[var(--atelier-line)] py-3 text-sm font-semibold transition-colors hover:bg-[var(--atelier-olive-soft)] disabled:opacity-50"
        >
          {dict.signUp}
        </button>
        <div className="pt-1 text-center">
          <a
            href="/forgot-password"
            className="text-xs text-fg-muted transition-colors hover:text-fg"
          >
            {dict.forgotPassword}
          </a>
        </div>
      </form>
    </div>
  );
```

- [ ] **Step 3: Compose Forgot Password states**

Add this import to `app/(auth)/forgot-password/_components/ForgotPasswordForm.tsx`:

```tsx
import {
  AtelierBrand,
  AtelierCard,
  AtelierShell,
  BananaGuide,
} from "@/app/_components/atelier";
```

Keep `handleSubmit` unchanged. Replace only the returned JSX with:

```tsx
  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand subtitle={dict.forgotDesc} />
        <BananaGuide
          pose={sent ? "celebrate" : "helpful"}
          className="mx-auto mt-4 h-24 w-24"
        />
        <h2 className="mt-2 text-xl font-bold tracking-tight">{dict.forgotTitle}</h2>
        {sent ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center text-sm">
              <p className="font-semibold">{dict.forgotSuccess}</p>
              <p className="mt-1 text-fg-muted">
                {locale === "en"
                  ? `Check ${email} for the link.`
                  : `กรุณาตรวจสอบอีเมล ${email}`}
              </p>
            </div>
            <Link
              href="/login"
              className="block w-full rounded-2xl border border-[var(--atelier-line)] py-3 text-center text-sm font-semibold"
            >
              {dict.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
            <label className="sr-only" htmlFor="forgot-email">
              {dict.emailPlaceholder}
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none focus:border-accent"
            />
            {error && <p className="text-xs text-negative">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-50"
            >
              {loading ? common.loading : dict.forgotSubmit}
            </button>
            <Link
              href="/login"
              className="block w-full rounded-2xl border border-[var(--atelier-line)] py-3 text-center text-sm font-semibold"
            >
              {common.back}
            </Link>
          </form>
        )}
      </AtelierCard>
    </AtelierShell>
  );
```

- [ ] **Step 4: Compose Reset Password**

Add this import to `app/(auth)/reset-password/_components/ResetPasswordForm.tsx`:

```tsx
import {
  AtelierBrand,
  AtelierCard,
  AtelierShell,
  BananaGuide,
} from "@/app/_components/atelier";
```

Change the function signature so the accepted compatibility prop is not unnecessarily destructured:

```tsx
export function ResetPasswordForm({ dict, common }: Props) {
```

Keep `handleSubmit` unchanged. Replace only the returned JSX with:

```tsx
  return (
    <AtelierShell contentClassName="flex min-h-[calc(100dvh-3rem)] max-w-md items-center justify-center">
      <AtelierCard className="atelier-card-arrive w-full px-6 py-7 text-center sm:px-8 sm:py-8">
        <AtelierBrand subtitle={dict.resetSubtitle} />
        <BananaGuide pose="helpful" className="mx-auto mt-4 h-24 w-24" />
        <h2 className="mt-2 text-xl font-bold tracking-tight">{dict.resetTitle}</h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-3 text-left">
          <label className="sr-only" htmlFor="new-password">
            {dict.newPasswordPlaceholder}
          </label>
          <input
            id="new-password"
            type="password"
            placeholder={dict.newPasswordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none focus:border-accent"
          />
          <label className="sr-only" htmlFor="confirm-password">
            {dict.confirmPasswordPlaceholder}
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder={dict.confirmPasswordPlaceholder}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
            className="w-full rounded-2xl border border-[var(--atelier-line)] bg-[var(--atelier-surface-strong)] px-4 py-3 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-negative">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {loading ? common.loading : dict.resetSubmit}
          </button>
        </form>
      </AtelierCard>
    </AtelierShell>
  );
```

The `locale` prop remains accepted by `ResetPasswordForm` for compatibility with its page. Do not remove the prop in this task.

- [ ] **Step 5: Run the contract test**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: shared Atelier and Auth tests PASS; Paywall test still FAIL because `LanguageProvider` is not wired yet.

- [ ] **Step 6: Record a local checkpoint**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" diff --stat -- "app/(auth)"
```

Expected: only the four Auth files appear. Do not commit.

---

### Task 4: Repair Paywall Language Context

**Files:**
- Modify: `app/paywall/page.tsx`
- Test: `scripts/test-auth-paywall-atelier.mjs`

- [ ] **Step 1: Wrap the Paywall client with language context**

Replace `app/paywall/page.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { PaywallClient } from "./_components/PaywallClient";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { isActive } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PaywallPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, plan_type, plan_expires_at")
    .eq("id", user.id)
    .single();

  const isPro = profile ? isActive(profile) : false;

  const { data: latestSlip } = await supabase
    .from("payment_slips")
    .select("id, plan_type, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const serializedSlip = latestSlip
    ? {
        id: latestSlip.id,
        plan_type: latestSlip.plan_type,
        status: latestSlip.status,
        created_at: new Date(latestSlip.created_at).toISOString(),
      }
    : null;

  return (
    <LanguageProvider locale={locale} dict={dict}>
      <PaywallClient
        userId={user.id}
        userEmail={user.email || ""}
        initialIsPro={isPro}
        initialPlanType={profile?.plan_type ?? null}
        initialExpiresAt={
          profile?.plan_expires_at
            ? new Date(profile.plan_expires_at).toISOString()
            : null
        }
        initialPendingSlip={serializedSlip}
      />
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Run the contract test**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: all three contract tests PASS.

- [ ] **Step 3: Record a local checkpoint**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" diff --stat -- app/paywall/page.tsx
```

Expected: only `app/paywall/page.tsx` appears. Do not commit.

---

### Task 5: Recompose Paywall as a Guided Checkout

**Files:**
- Modify: `app/paywall/_components/PaywallClient.tsx`
- Test: `scripts/test-auth-paywall-atelier.mjs`

- [ ] **Step 1: Replace the Paywall imports**

At the top of `app/paywall/_components/PaywallClient.tsx`, keep `"use client";` and replace the imports with:

```tsx
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  Copy,
  Loader2,
  Sparkles,
  Ticket,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtelierCard,
  AtelierShell,
  BananaGuide,
  type BananaGuidePose,
} from "@/app/_components/atelier";
import { redeemPromoCode, submitPaymentSlip } from "@/app/actions/paywall";
import { useT } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
```

- [ ] **Step 2: Add a state-aware guide pose**

Change the `PaywallClient` destructuring so the accepted `userEmail` prop is not unnecessarily destructured:

```tsx
export function PaywallClient({
  userId,
  initialIsPro,
  initialPlanType,
  initialExpiresAt,
  initialPendingSlip,
}: Props) {
```

Immediately after:

```tsx
  const qrCodeUrl = `https://promptpay.io/${promptPayId}/${amount}.png`;
```

add:

```tsx
  const guidePose: BananaGuidePose =
    initialIsPro || promoSuccess
      ? "celebrate"
      : pendingSlip?.status === "pending"
        ? "waiting"
        : pendingSlip?.status === "rejected"
          ? "retry"
          : "helpful";
```

- [ ] **Step 3: Replace only the returned Paywall JSX**

Keep all existing state declarations and handlers unchanged. Replace the `return (...)` block with:

```tsx
  return (
    <AtelierShell contentClassName="max-w-6xl">
      <div className="space-y-6">
        <header className="flex items-center gap-4 pr-12">
          <Link
            href="/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--atelier-line)] bg-[var(--atelier-surface)] text-fg transition-transform active:scale-95"
            aria-label={t.paywall.backBtn}
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--atelier-olive)]">
              Banana Atelier
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em]">
              {t.paywall.title}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{t.paywall.subtitle}</p>
          </div>
        </header>

        {initialIsPro ? (
          <AtelierCard className="atelier-card-arrive mx-auto max-w-2xl p-6 text-center sm:p-8">
            <BananaGuide pose={guidePose} className="mx-auto h-28 w-28" />
            <div className="mx-auto mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Sparkles size={22} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-accent">
              Banana Sheet Pro Active
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-fg-muted">
              You are currently upgraded to Pro. Active plan:{" "}
              <strong>
                {initialPlanType === "lifetime"
                  ? "Lifetime"
                  : initialPlanType === "yearly"
                    ? "Yearly"
                    : "Monthly"}
              </strong>
              {initialExpiresAt &&
                ` (Expires on ${new Date(initialExpiresAt).toLocaleDateString()})`}
            </p>
          </AtelierCard>
        ) : (
          <>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(22rem,1.06fr)]">
              <div className="space-y-6">
                <AtelierCard className="atelier-card-arrive overflow-hidden p-6 sm:p-7">
                  <div className="grid items-center gap-4 sm:grid-cols-[1fr_8rem]">
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--atelier-olive)]">
                        Banana Sheet Pro
                      </p>
                      <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">
                        {t.paywall.title}
                      </h2>
                      <p className="mt-3 text-sm leading-6 text-fg-muted">
                        {t.paywall.subtitle}
                      </p>
                    </div>
                    <BananaGuide pose={guidePose} className="mx-auto h-28 w-28" />
                  </div>
                </AtelierCard>

                <section className="space-y-3">
                  <p className="px-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--atelier-olive)]">
                    01
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("yearly")}
                    className={`relative w-full cursor-pointer rounded-[1.6rem] border p-5 text-left transition-transform active:scale-[0.99] ${
                      selectedPlan === "yearly"
                        ? "border-accent bg-accent/10"
                        : "border-[var(--atelier-line)] bg-[var(--atelier-surface)]"
                    }`}
                  >
                    <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-black">
                      {t.paywall.bestValue}
                    </span>
                    <span className="text-sm font-bold">{t.paywall.yearlyPlan}</span>
                    <span className="mt-1 block text-xs text-fg-muted">
                      {t.paywall.yearlyUnit}
                    </span>
                    <span className="mt-4 block font-mono text-2xl font-bold text-accent">
                      {t.paywall.yearlyPrice}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan("monthly")}
                    className={`w-full cursor-pointer rounded-[1.6rem] border p-5 text-left transition-transform active:scale-[0.99] ${
                      selectedPlan === "monthly"
                        ? "border-accent bg-accent/10"
                        : "border-[var(--atelier-line)] bg-[var(--atelier-surface)]"
                    }`}
                  >
                    <span className="text-sm font-bold">{t.paywall.monthlyPlan}</span>
                    <span className="mt-1 block text-xs text-fg-muted">
                      {t.paywall.monthlyUnit}
                    </span>
                    <span className="mt-4 block font-mono text-2xl font-bold text-accent">
                      {t.paywall.monthlyPrice}
                    </span>
                  </button>
                </section>

                <AtelierCard className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--atelier-olive)]">
                    {t.paywall.featuresTitle}
                  </h3>
                  <ul className="mt-4 space-y-3 text-sm text-fg-muted">
                    {t.paywall.featuresList.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </AtelierCard>
              </div>

              <div className="space-y-6">
                <AtelierCard className="p-6 text-center">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--atelier-olive)]">
                    02
                  </p>
                  <h3 className="mt-3 text-base font-bold text-accent">
                    {t.paywall.promptpayTitle}
                  </h3>
                  <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-fg-muted">
                    {t.paywall.promptpayInstruction}
                  </p>
                  <div className="mx-auto mt-5 w-fit rounded-2xl border border-[var(--atelier-line)] bg-white p-4 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="PromptPay QR Code"
                      className="h-44 w-44 object-contain"
                    />
                  </div>
                  <div className="mt-5 space-y-2 text-left">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-3 py-2.5">
                      <div>
                        <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
                          PromptPay ID
                        </p>
                        <p className="mt-1 font-mono text-sm font-semibold">
                          {promptPayId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPromptPayId}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--atelier-line)]"
                        aria-label="Copy PromptPay ID"
                      >
                        {copiedPromptPayId ? (
                          <Check size={14} className="text-accent" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-3 py-2.5">
                      <div>
                        <p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-fg-muted">
                          Amount (THB)
                        </p>
                        <p className="mt-1 font-mono text-base font-bold text-accent">
                          THB {amount}.00
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAmount}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--atelier-line)]"
                        aria-label="Copy amount"
                      >
                        {copiedAmount ? (
                          <Check size={14} className="text-accent" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                </AtelierCard>

                <AtelierCard className="p-6">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--atelier-olive)]">
                    03
                  </p>
                  <h3 className="mt-3 text-base font-bold">{t.paywall.uploadTitle}</h3>

                  {pendingSlip?.status === "pending" && (
                    <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 p-4 text-center">
                      <p className="text-sm font-semibold text-accent">
                        {t.paywall.pendingSlipTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-fg-muted">
                        {t.paywall.pendingSlipDesc}
                      </p>
                    </div>
                  )}

                  {pendingSlip?.status === "rejected" && (
                    <div className="mt-4 rounded-xl border border-negative/25 bg-negative/10 p-4 text-center">
                      <p className="text-sm font-semibold text-negative">
                        {t.paywall.rejectedSlipTitle}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-fg-muted">
                        {t.paywall.rejectedSlipDesc}
                      </p>
                    </div>
                  )}

                  {slipSuccess && (
                    <div className="mt-4 rounded-xl border border-accent/25 bg-accent/10 p-4 text-center text-xs text-accent">
                      {slipSuccess}
                    </div>
                  )}

                  {(!pendingSlip || pendingSlip.status === "rejected") &&
                    !slipSuccess && (
                      <div className="mt-4 space-y-3">
                        <div
                          {...getRootProps()}
                          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                            isDragActive
                              ? "border-accent bg-accent/5"
                              : "border-[var(--atelier-line)]"
                          }`}
                        >
                          <input {...getInputProps()} />
                          {previewUrl ? (
                            <div className="mx-auto h-32 w-24 overflow-hidden rounded-xl border border-[var(--atelier-line)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={previewUrl}
                                alt="Transfer slip preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <>
                              <Upload size={24} className="mx-auto text-fg-muted" />
                              <p className="mt-2 text-xs font-semibold">
                                {t.paywall.uploadInstruction}
                              </p>
                            </>
                          )}
                        </div>

                        {slipError && (
                          <div className="flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span>{slipError}</span>
                          </div>
                        )}

                        {file && (
                          <button
                            type="button"
                            onClick={handleUploadSlip}
                            disabled={slipLoading}
                            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-bold text-black disabled:opacity-50"
                          >
                            {slipLoading && <Loader2 size={16} className="animate-spin" />}
                            {slipLoading
                              ? t.paywall.submitLoading.split(" & ")[0]
                              : t.paywall.submitBtn}
                          </button>
                        )}
                      </div>
                    )}
                </AtelierCard>
              </div>
            </div>

            <AtelierCard className="mx-auto max-w-2xl p-6">
              <div className="flex items-center gap-2">
                <Ticket size={17} className="text-accent" />
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--atelier-olive)]">
                    Promo
                  </p>
                  <h3 className="mt-1 text-sm font-bold">{t.paywall.promoTitle}</h3>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <input
                  type="text"
                  placeholder={t.paywall.promoPlaceholder}
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  disabled={promoLoading || !!promoSuccess}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--atelier-line)] bg-[var(--atelier-paper)] px-4 py-2.5 font-mono text-sm outline-none focus:border-accent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleRedeemPromo}
                  disabled={promoLoading || !promoCode.trim() || !!promoSuccess}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50"
                >
                  {promoLoading && <Loader2 size={14} className="animate-spin" />}
                  {promoLoading ? t.paywall.promoLoading : t.paywall.promoBtn}
                </button>
              </div>
              {promoError && (
                <div className="mt-3 flex gap-2 rounded-xl bg-negative/10 p-3 text-xs text-negative">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}
              {promoSuccess && (
                <div className="mt-3 rounded-xl border border-accent/25 bg-accent/10 p-3 text-center text-xs font-semibold text-accent">
                  {promoSuccess}
                </div>
              )}
            </AtelierCard>
          </>
        )}
      </div>
    </AtelierShell>
  );
```

- [ ] **Step 4: Run the contract test**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: all three tests PASS.

- [ ] **Step 5: Record a local checkpoint**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" diff --stat -- app/paywall
```

Expected: only `app/paywall/page.tsx` and `app/paywall/_components/PaywallClient.tsx` appear. Do not commit.

---

### Task 6: Verify Static Quality and Preserved Boundaries

**Files:**
- Verify: all files touched in Tasks 1-5

- [ ] **Step 1: Run the focused contract test**

Run:

```powershell
node --test .\scripts\test-auth-paywall-atelier.mjs
```

Expected: 3 tests PASS.

- [ ] **Step 2: Run TypeScript**

Run:

```powershell
node .\node_modules\typescript\bin\tsc --noEmit
```

Expected: exit code `0`.

- [ ] **Step 3: Run ESLint**

Run:

```powershell
node .\node_modules\eslint\bin\eslint.js .
```

Expected: exit code `0`. If unrelated dirty files from the other agent fail lint, report those failures separately and still run ESLint against the touched files:

```powershell
node .\node_modules\eslint\bin\eslint.js "app/_components/atelier" "app/(auth)" "app/paywall" scripts/test-auth-paywall-atelier.mjs
```

- [ ] **Step 4: Check whitespace**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" diff --check
```

Expected: no whitespace errors in touched files.

- [ ] **Step 5: Confirm protected business files were not edited**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" diff --name-only -- app/actions/paywall.ts app/api/telegram/webhook/route.ts app/auth/callback/route.ts
```

Expected: no output.

- [ ] **Step 6: Inspect the local-only file list**

Run:

```powershell
git -c safe.directory="C:/Users/DELL/Downloads/Side Project/banana-sheet-web-app" status --short
```

Expected: Atelier/Auth/Paywall files appear alongside the unrelated existing dirty dashboard files. Do not stage or commit.

---

### Task 7: Smoke-Test the Local UI in Both Themes

**Files:**
- Verify: runtime behavior only

- [ ] **Step 1: Start the local development server**

Run:

```powershell
npm run dev
```

Expected: Next.js starts locally and prints a localhost URL, usually `http://localhost:3000`.

- [ ] **Step 2: Inspect Login in the in-app Browser**

Open:

```text
http://localhost:3000/login
```

Verify:

- Banana Atelier card is centered.
- Welcome banana guide is visible and subtly floating.
- Theme toggle changes between warm cream light mode and espresso dark mode.
- Reload preserves the selected theme.
- Google, email/password, sign-up, and forgot-password controls remain present.
- Submitting blank fields still triggers required-field validation.
- A failed credential attempt still shows the Supabase error where locally feasible.
- Mobile width does not clip controls.

- [ ] **Step 3: Inspect Forgot Password**

Open:

```text
http://localhost:3000/forgot-password
```

Verify:

- Helpful guide appears before submission.
- Form remains usable in light and dark themes.
- A valid reset submission switches to the celebrate guide and confirmation panel where locally feasible.
- Back-to-login control works.

- [ ] **Step 4: Inspect Reset Password**

Open:

```text
http://localhost:3000/reset-password
```

Verify:

- Helpful guide appears.
- Password mismatch still produces the existing validation error.
- Short password still produces the existing validation error.
- Inputs and submit control remain usable in light and dark themes.

- [ ] **Step 5: Inspect Paywall authentication redirect**

Open in a signed-out browser context:

```text
http://localhost:3000/paywall
```

Expected: redirect to `/login`.

- [ ] **Step 6: Inspect Paywall checkout in an authenticated browser context**

Open:

```text
http://localhost:3000/paywall
```

Verify:

- No `useT must be used inside LanguageProvider` runtime error appears.
- Mobile layout reads vertically as intro, plans, benefits, QR, slip upload, optional Promo Code.
- Desktop layout reads as plans/benefits on the left and QR/slip upload on the right, with Promo Code below.
- Switching Monthly and Yearly updates the visible amount and QR URL.
- Copy buttons remain usable.
- QR region remains stable and does not animate.
- Theme toggle works in both themes.

- [ ] **Step 7: Inspect locally available Paywall states**

Where the local account data allows, verify:

- Default Free: helpful guide points toward Plan selection.
- Pending slip: waiting guide and pending panel.
- Rejected slip: retry guide, rejection panel, and upload target.
- Active Pro: celebrate guide and active-plan panel.
- Promo Code success: celebrate guide before redirect.

Do not modify Telegram webhook logic or remote records merely to fabricate states. Report any states that could not be exercised locally.

- [ ] **Step 8: Leave the implementation local**

Stop the development server if it is no longer needed. Do not stage, commit, push, deploy, or open a pull request.
