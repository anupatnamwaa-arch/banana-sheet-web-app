# Ingestion Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add API key display/copy/regenerate and an iOS Shortcut setup guide to the Settings page so users can wire up their home-screen Shortcut.

**Architecture:** A single `regenerateApiKey()` server action rotates the key. `ApiKeySection` is a client component that receives the initial key from the server and handles copy/regenerate interactions. `ShortcutGuide` is a pure static server component using `<details>/<summary>`. Settings page fetches `api_key` alongside the existing profile query and mounts both.

**Tech Stack:** Next.js 16 App Router, Supabase SSR + browser client, Tailwind v4, TypeScript, lucide-react, Thai-first UI. `npm run build` does NOT work — use `node node_modules/next/dist/bin/next build`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/profile.ts` | **Create** | `regenerateApiKey()` server action |
| `app/(dashboard)/settings/_components/ApiKeySection.tsx` | **Create** | Display/copy/regenerate API key |
| `app/(dashboard)/settings/_components/ShortcutGuide.tsx` | **Create** | Static iOS Shortcut setup guide |
| `app/(dashboard)/settings/page.tsx` | **Modify** | Fetch api_key + mount both components |

---

## Task 1: `regenerateApiKey` server action

**Files:**
- Create: `app/actions/profile.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/actions/profile.ts
"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Rotate the current user's api_key to a fresh UUID.
 * Returns the new key. Throws "Unauthenticated" if no session.
 */
export async function regenerateApiKey(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const newKey = crypto.randomUUID();

  const { error } = await supabase
    .from("profiles")
    .update({ api_key: newKey })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  return newKey;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/profile.ts
git commit -m "feat: add regenerateApiKey server action"
```

---

## Task 2: `ApiKeySection` component

**Files:**
- Create: `app/(dashboard)/settings/_components/ApiKeySection.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/settings/_components/ApiKeySection.tsx
"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, AlertTriangle } from "lucide-react";
import { regenerateApiKey } from "@/app/actions/profile";

interface Props {
  initialKey: string | null;
}

/** Show first 8 + "···" + last 4 chars of a UUID */
function maskKey(key: string): string {
  if (key.length < 12) return key;
  return `${key.slice(0, 8)}···${key.slice(-4)}`;
}

export function ApiKeySection({ initialKey }: Props) {
  const [key, setKey] = useState<string | null>(initialKey);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [justRegenerated, setJustRegenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  async function handleCopy() {
    if (!key || !canCopy) return;
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently ignore — clipboard permission denied
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const newKey = await regenerateApiKey();
      setKey(newKey);
      setJustRegenerated(true);
      setTimeout(() => setJustRegenerated(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "สร้างใหม่ไม่สำเร็จ");
    } finally {
      setRegenerating(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 font-mono text-sm outline-none";

  return (
    <div className="glass p-5 space-y-3">
      <p className="text-sm font-medium text-fg-muted">API Key (สำหรับ Shortcut)</p>

      {/* Key display */}
      <div className="flex items-center gap-2">
        <div className={`${inputClass} flex-1 truncate select-all`} title={key ?? ""}>
          {key ? maskKey(key) : "—"}
        </div>

        {key && canCopy && (
          <button
            onClick={handleCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] transition-colors"
            title="คัดลอก Key"
          >
            {copied ? (
              <Check size={16} className="text-[var(--positive)]" />
            ) : (
              <Copy size={16} className="text-fg-muted" />
            )}
          </button>
        )}
      </div>

      {copied && (
        <p className="text-xs text-[var(--positive)]">✓ คัดลอกแล้ว</p>
      )}

      {justRegenerated && (
        <p className="text-xs text-[var(--positive)]">✓ สร้างใหม่แล้ว</p>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-xs text-[var(--negative)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Regenerate */}
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-medium text-fg-muted transition-opacity disabled:opacity-50"
      >
        <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
        {regenerating ? "กำลังสร้าง…" : "สร้าง Key ใหม่"}
      </button>

      {/* Warning */}
      <p className="text-xs text-fg-muted">
        ⚠ ห้ามแชร์ Key นี้ — ใครมี Key สามารถเพิ่มรายการได้
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/ApiKeySection.tsx"
git commit -m "feat: add ApiKeySection — display, copy, and regenerate API key"
```

---

## Task 3: `ShortcutGuide` component

**Files:**
- Create: `app/(dashboard)/settings/_components/ShortcutGuide.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/settings/_components/ShortcutGuide.tsx

export function ShortcutGuide() {
  return (
    <details className="glass group">
      <summary className="cursor-pointer list-none p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">📱 วิธีตั้งค่า iOS Shortcut</p>
          <span className="text-xs text-fg-muted group-open:hidden">แสดง ▾</span>
          <span className="hidden text-xs text-fg-muted group-open:inline">ซ่อน ▴</span>
        </div>
      </summary>

      <div className="border-t border-[var(--glass-border)] px-5 pb-5 pt-4 space-y-4 text-sm">
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">1</span>
            <span>เปิดแอป <strong>Shortcuts</strong> บน iPhone → กด <strong>+</strong> สร้าง Shortcut ใหม่</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">2</span>
            <span>เพิ่ม action <strong>"Ask for Input"</strong> → ตั้งชื่อว่า <em>"จำนวนเงิน"</em> (Type: Number)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">3</span>
            <div className="space-y-2">
              <p>เพิ่ม action <strong>"Get Contents of URL"</strong> → ตั้งค่าดังนี้:</p>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-3 font-mono text-xs space-y-1">
                <p><span className="text-fg-muted">URL:</span> https://YOUR_DOMAIN/api/transactions</p>
                <p><span className="text-fg-muted">Method:</span> POST</p>
                <p><span className="text-fg-muted">Headers:</span> Authorization: Bearer YOUR_API_KEY</p>
                <p><span className="text-fg-muted">Body (JSON):</span></p>
                <pre className="text-xs leading-relaxed">{`{
  "amount": [Provided Input],
  "category": "Food",
  "type": "expense",
  "date": "[Current Date]"
}`}</pre>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-black">4</span>
            <span>กด <strong>Add to Home Screen</strong> เพื่อเพิ่มไอคอนลงหน้าจอหลัก</span>
          </li>
        </ol>

        <p className="text-xs text-fg-muted">
          แทนที่ <code className="rounded bg-[var(--bg-elevated)] px-1">YOUR_DOMAIN</code> ด้วยโดเมนของคุณ
          และ <code className="rounded bg-[var(--bg-elevated)] px-1">YOUR_API_KEY</code> ด้วย Key ด้านบน
        </p>
      </div>
    </details>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/ShortcutGuide.tsx"
git commit -m "feat: add ShortcutGuide — static iOS Shortcut setup instructions"
```

---

## Task 4: Wire Settings page

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Replace the settings page**

```typescript
// app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { BudgetList } from "./_components/BudgetList";
import { ApiKeySection } from "./_components/ApiKeySection";
import { ShortcutGuide } from "./_components/ShortcutGuide";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at, api_key")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<
    Profile,
    "is_active" | "plan_expires_at" | "api_key"
  > | null;
  const isPro = profile ? isActive(profile) : false;
  const apiKey = profile?.api_key ?? null;

  return (
    <section className="space-y-6">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่า</h1>
      </header>

      {/* Data portability */}
      <div className="glass p-5 space-y-3">
        <p className="text-sm font-medium text-fg-muted">ข้อมูล</p>
        <CsvExportButton />
        <CsvImportDrawer />
      </div>

      {/* Budgets */}
      <BudgetList userId={user.id} isPro={isPro} />

      {/* API Key + Shortcut guide */}
      <ApiKeySection initialKey={apiKey} />
      <ShortcutGuide />

      {/* Placeholder */}
      <div className="glass p-5 text-sm text-fg-muted">
        แผนการใช้งาน — TODO (Task: Paywall)
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Run full build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -15
```

Expected: `├ ƒ /settings` in route list + `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/page.tsx"
git commit -m "feat: wire API key section and Shortcut guide into Settings"
```

---

## Self-Review

**Spec coverage:**
- ✅ `regenerateApiKey()` server action — Task 1
- ✅ `ApiKeySection`: `initialKey` prop, masked display, copy button + clipboard check, copy flash, regenerate + loading + flash, error state, warning text — Task 2
- ✅ `ShortcutGuide`: collapsible `<details>`, 4 numbered steps, JSON payload snippet, domain/key note — Task 3
- ✅ Settings page: `api_key` added to profile select, `ApiKeySection` + `ShortcutGuide` mounted between Budgets and Paywall placeholder — Task 4
- ✅ `api_key` null case: `ApiKeySection` receives `null` and shows "—" — Task 2

**Type consistency:**
- `regenerateApiKey(): Promise<string>` (Task 1) → called in Task 2, return type used to `setKey` ✅
- `Props { initialKey: string | null }` (Task 2) → passed as `apiKey` (string | null) from Task 4 ✅
- `Profile` type in Settings needs `api_key` — `Profile` in `lib/types.ts` already has `api_key: string` ✅

**Placeholder scan:** No TBDs; all code blocks complete. Paywall placeholder intentionally kept. ✅
