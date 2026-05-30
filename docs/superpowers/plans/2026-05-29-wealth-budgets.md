# Wealth & Debt + Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Pro-gated Wealth & Debt tab (asset/liability CRUD + Net Worth) and an inline per-category Budget editor in Settings.

**Architecture:** Wealth `page.tsx` is a Server Component that computes Net Worth server-side and passes data to display components; `WealthList` fetches its own rows client-side and calls `router.refresh()` after mutations to update the server-rendered Net Worth. Budgets use auto-save-on-blur server actions. Both features are Pro-gated with the established blur overlay.

**Tech Stack:** Next.js 16 App Router, Supabase SSR + browser client, Framer Motion 12 (keyed `AnimatePresence` bottom sheet, swipe-to-delete), Tailwind v4, TypeScript, Thai-first UI. `npm run build` does NOT work — use `node node_modules/next/dist/bin/next build`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/actions/wealth.ts` | **Create** | `WealthPayload`, addWealth, updateWealth, deleteWealth |
| `app/actions/budgets.ts` | **Create** | setBudget (upsert), deleteBudget |
| `app/(dashboard)/wealth/_components/NetWorthCard.tsx` | **Create** | Net Worth summary display |
| `app/(dashboard)/wealth/_components/WealthFormDrawer.tsx` | **Create** | Add/edit/delete bottom sheet |
| `app/(dashboard)/wealth/_components/WealthList.tsx` | **Create** | Asset/liability CRUD, swipe-delete |
| `app/(dashboard)/wealth/page.tsx` | **Modify** | Wire wealth tab + Pro gate |
| `app/(dashboard)/settings/_components/BudgetList.tsx` | **Create** | Inline budget editor |
| `app/(dashboard)/settings/page.tsx` | **Modify** | Mount BudgetList |

---

## Task 1: Wealth server actions

**Files:**
- Create: `app/actions/wealth.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/actions/wealth.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { WealthType } from "@/lib/types";

export interface WealthPayload {
  name: string;
  type: WealthType;       // "asset" | "liability"
  value: number;          // > 0
  is_liquid: boolean;     // forced false for liabilities
}

export async function addWealth(payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase.from("wealth_debt").insert({
    user_id: user.id,
    name: payload.name,
    type: payload.type,
    value: payload.value,
    is_liquid: payload.type === "asset" ? payload.is_liquid : false,
  });
  if (error) throw new Error(error.message);
}

export async function updateWealth(id: string, payload: WealthPayload): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .update({
      name: payload.name,
      type: payload.type,
      value: payload.value,
      is_liquid: payload.type === "asset" ? payload.is_liquid : false,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteWealth(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("wealth_debt")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/wealth.ts
git commit -m "feat: add wealth_debt mutation server actions (add/update/delete)"
```

---

## Task 2: Budget server actions

**Files:**
- Create: `app/actions/budgets.ts`

- [ ] **Step 1: Create the file**

```typescript
// app/actions/budgets.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function setBudget(categoryId: string, amount: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, limit_amount: amount },
      { onConflict: "user_id,category_id" }
    );
  if (error) throw new Error(error.message);
}

export async function deleteBudget(categoryId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("category_id", categoryId);
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add app/actions/budgets.ts
git commit -m "feat: add budget server actions (setBudget upsert, deleteBudget)"
```

---

## Task 3: NetWorthCard component

**Files:**
- Create: `app/(dashboard)/wealth/_components/NetWorthCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/wealth/_components/NetWorthCard.tsx
import { formatTHB } from "@/lib/format";

interface Props {
  data: {
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  } | null; // null = free placeholder
}

const PLACEHOLDER = { netWorth: 605000, totalAssets: 650000, totalLiabilities: 45000 };

export function NetWorthCard({ data }: Props) {
  const d = data ?? PLACEHOLDER;
  const positive = d.netWorth >= 0;

  return (
    <div className="glass p-5">
      <p className="text-xs font-medium text-fg-muted">มูลค่าสุทธิ (Net Worth)</p>
      <p
        className="mt-1 text-3xl font-bold tabular-nums"
        style={{ color: positive ? "var(--positive)" : "var(--negative)" }}
      >
        {formatTHB(d.netWorth)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-fg-muted">รวมสินทรัพย์</p>
          <p className="mt-0.5 font-medium tabular-nums text-[var(--positive)]">
            {formatTHB(d.totalAssets)}
          </p>
        </div>
        <div>
          <p className="text-fg-muted">รวมหนี้สิน</p>
          <p className="mt-0.5 font-medium tabular-nums text-[var(--negative)]">
            {formatTHB(d.totalLiabilities)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/wealth/_components/NetWorthCard.tsx"
git commit -m "feat: add NetWorthCard summary component"
```

---

## Task 4: WealthFormDrawer component

**Files:**
- Create: `app/(dashboard)/wealth/_components/WealthFormDrawer.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/wealth/_components/WealthFormDrawer.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, AlertTriangle, Droplet } from "lucide-react";
import { addWealth, updateWealth, deleteWealth } from "@/app/actions/wealth";
import type { WealthPayload } from "@/app/actions/wealth";
import type { WealthType } from "@/lib/types";

export interface WealthRow {
  id: string;
  name: string;
  type: WealthType;
  value: number;
  is_liquid: boolean;
}

interface Props {
  mode: "add" | "edit";
  item?: WealthRow;
  onClose: () => void;
  onSuccess: () => void;
}

export function WealthFormDrawer({ mode, item, onClose, onSuccess }: Props) {
  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<WealthType>(item?.type ?? "asset");
  const [value, setValue] = useState(item ? String(item.value) : "");
  const [isLiquid, setIsLiquid] = useState(item?.is_liquid ?? true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("กรุณากรอกชื่อ"); return; }
    const num = parseFloat(value);
    if (!num || num <= 0) { setError("กรุณากรอกมูลค่าที่ถูกต้อง"); return; }

    setLoading(true); setError(null);
    const payload: WealthPayload = {
      name: name.trim(),
      type,
      value: num,
      is_liquid: type === "asset" ? isLiquid : false,
    };
    try {
      if (mode === "add") await addWealth(payload);
      else await updateWealth(item!.id, payload);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setDeleting(true); setError(null);
    try {
      await deleteWealth(item.id);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ กรุณาลองใหม่");
      setDeleting(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm outline-none";
  const busy = loading || deleting;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { if (!busy) onClose(); }}
      />
      <motion.div
        key="drawer"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[var(--bg-elevated)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="mb-1 flex justify-center">
          <div className="h-1 w-10 rounded-full bg-[var(--glass-border)]" />
        </div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "add" ? "เพิ่มรายการ" : "แก้ไขรายการ"}
          </h2>
          <button onClick={() => { if (!busy) onClose(); }} disabled={busy}>
            <X size={20} className="text-fg-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(["asset", "liability"] as WealthType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  type === t ? "bg-accent text-black" : "border border-[var(--glass-border)] text-fg-muted"
                }`}
              >
                {t === "asset" ? "สินทรัพย์" : "หนี้สิน"}
              </button>
            ))}
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder="ชื่อ (เช่น บัญชีออมทรัพย์)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />

          {/* Value */}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="มูลค่า (฿)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
            required
          />

          {/* Liquid toggle — assets only */}
          {type === "asset" && (
            <button
              type="button"
              onClick={() => setIsLiquid((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--glass-border)] px-3 py-2.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Droplet size={16} className={isLiquid ? "text-sky-400" : "text-fg-muted"} />
                สภาพคล่อง
              </span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${isLiquid ? "bg-accent" : "bg-[var(--glass-border)]"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isLiquid ? "translate-x-4" : ""}`} />
              </span>
            </button>
          )}
          {type === "asset" && (
            <p className="-mt-2 text-xs text-fg-muted">นับรวมใน Emergency Runway</p>
          )}

          {error && (
            <div className="flex gap-2 rounded-xl bg-[var(--negative)]/10 p-3 text-sm text-[var(--negative)]">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {loading ? "กำลังบันทึก…" : mode === "add" ? "บันทึก" : "อัปเดต"}
          </button>

          {mode === "edit" && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--negative)]/40 py-3 text-sm font-medium text-[var(--negative)] disabled:opacity-40"
            >
              <Trash2 size={16} />
              {deleting ? "กำลังลบ…" : "ลบรายการ"}
            </button>
          )}
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/wealth/_components/WealthFormDrawer.tsx"
git commit -m "feat: add WealthFormDrawer — add/edit/delete asset or liability"
```

---

## Task 5: WealthList component

**Files:**
- Create: `app/(dashboard)/wealth/_components/WealthList.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/wealth/_components/WealthList.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Droplet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteWealth } from "@/app/actions/wealth";
import { formatTHB } from "@/lib/format";
import { WealthFormDrawer, type WealthRow } from "./WealthFormDrawer";

interface Props {
  userId: string;
}

export function WealthList({ userId }: Props) {
  const [rows, setRows] = useState<WealthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit" | null>(null);
  const [selected, setSelected] = useState<WealthRow | undefined>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const fetchRows = useCallback(async () => {
    const { data } = await supabase
      .from("wealth_debt")
      .select("id, name, type, value, is_liquid")
      .eq("user_id", userId)
      .order("value", { ascending: false });
    setRows((data ?? []) as WealthRow[]);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  function refreshAll() {
    fetchRows();
    router.refresh(); // updates server-rendered NetWorthCard
  }

  function openAdd() { setSelected(undefined); setDrawerMode("add"); }
  function openEdit(row: WealthRow) { setSelected(row); setDrawerMode("edit"); }
  function closeDrawer() { setDrawerMode(null); setSelected(undefined); }

  async function handleSwipeDelete(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    try {
      await deleteWealth(id);
      router.refresh();
    } catch {
      fetchRows();
    }
  }

  const assets = rows.filter((r) => r.type === "asset");
  const liabilities = rows.filter((r) => r.type === "liability");

  if (loading) {
    return <div className="glass p-5 text-center text-sm text-fg-muted">กำลังโหลด…</div>;
  }

  function Section({ title, items, empty }: { title: string; items: WealthRow[]; empty: string }) {
    return (
      <div className="glass p-5">
        <p className="mb-3 text-xs font-medium text-fg-muted">{title}</p>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-fg-muted">{empty}</p>
        ) : (
          <div className="space-y-1">
            <AnimatePresence>
              {items.map((row) => {
                const isLiability = row.type === "liability";
                return (
                  <motion.div
                    key={row.id}
                    layout
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="relative overflow-hidden rounded-xl"
                  >
                    <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center rounded-r-xl bg-[var(--negative)]">
                      <span className="text-xs font-medium text-white">ลบ</span>
                    </div>
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -80, right: 0 }}
                      dragElastic={0.1}
                      onDragEnd={(_, info) => { if (info.offset.x < -60) handleSwipeDelete(row.id); }}
                      className="relative flex cursor-pointer items-center gap-3 rounded-xl bg-[var(--bg-elevated)] px-4 py-3"
                      onClick={() => openEdit(row)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {row.name}
                          {row.is_liquid && !isLiability && (
                            <Droplet size={12} className="text-sky-400" />
                          )}
                        </p>
                      </div>
                      <p
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: isLiability ? "var(--negative)" : "var(--fg, #fff)" }}
                      >
                        {formatTHB(row.value)}
                      </p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative space-y-4">
      <Section title="สินทรัพย์" items={assets} empty="ยังไม่มีสินทรัพย์" />
      <Section title="หนี้สิน" items={liabilities} empty="ยังไม่มีหนี้สิน" />

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fixed bottom-24 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-lg"
      >
        <Plus size={22} />
      </button>

      {drawerMode && (
        <WealthFormDrawer
          mode={drawerMode}
          item={selected}
          onClose={closeDrawer}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/wealth/_components/WealthList.tsx"
git commit -m "feat: add WealthList — grouped assets/liabilities, swipe-delete, FAB"
```

---

## Task 6: Wire Wealth page

**Files:**
- Modify: `app/(dashboard)/wealth/page.tsx`

- [ ] **Step 1: Replace the stub**

```typescript
// app/(dashboard)/wealth/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { NetWorthCard } from "./_components/NetWorthCard";
import { WealthList } from "./_components/WealthList";

export default async function WealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();
  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

  // Free user: blurred placeholder with one Pro CTA
  if (!isPro) {
    return (
      <section className="space-y-4">
        <header className="pt-2">
          <h1 className="text-2xl font-semibold tracking-tight">ความมั่งคั่ง</h1>
        </header>
        <div className="relative">
          <div className="pointer-events-none select-none blur-sm space-y-4">
            <NetWorthCard data={null} />
            <div className="glass p-5">
              <p className="mb-3 text-xs font-medium text-fg-muted">สินทรัพย์</p>
              <div className="space-y-2">
                <div className="flex justify-between rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                  <span>บัญชีออมทรัพย์</span><span>฿120,000</span>
                </div>
                <div className="flex justify-between rounded-xl bg-[var(--bg-elevated)] px-4 py-3 text-sm">
                  <span>กองทุนรวม</span><span>฿80,000</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm bg-black/30">
            <Lock size={24} className="text-fg-muted" />
            <Link href="/paywall" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black">
              🔒 ปลดล็อกด้วย Pro
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Pro: real data
  const { data: wealthData } = await supabase
    .from("wealth_debt")
    .select("type, value")
    .eq("user_id", user.id);

  const rows = (wealthData ?? []) as Array<{ type: string; value: number }>;
  let totalAssets = 0;
  let totalLiabilities = 0;
  for (const r of rows) {
    if (r.type === "asset") totalAssets += r.value;
    else totalLiabilities += r.value;
  }
  const netWorth = totalAssets - totalLiabilities;

  return (
    <section className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">ความมั่งคั่ง</h1>
      </header>
      <NetWorthCard data={{ netWorth, totalAssets, totalLiabilities }} />
      <WealthList userId={user.id} />
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -15
```
Expected: `├ ƒ /wealth` and `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/wealth/page.tsx"
git commit -m "feat: wire Wealth page — Net Worth, asset/liability CRUD, Pro gate"
```

---

## Task 7: BudgetList component

**Files:**
- Create: `app/(dashboard)/settings/_components/BudgetList.tsx`

- [ ] **Step 1: Create the component**

```typescript
// app/(dashboard)/settings/_components/BudgetList.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Lock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setBudget, deleteBudget } from "@/app/actions/budgets";

interface Props {
  userId: string;
  isPro: boolean;
}

interface Category {
  id: string;
  name: string;
}

export function BudgetList({ userId, isPro }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errored, setErrored] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    Promise.all([
      supabase.from("categories").select("id, name").eq("user_id", userId).order("name"),
      supabase.from("budgets").select("category_id, limit_amount").eq("user_id", userId),
    ]).then(([catRes, budRes]) => {
      const cats = (catRes.data ?? []) as Category[];
      setCategories(cats);
      const map: Record<string, number> = {};
      for (const b of (budRes.data ?? []) as Array<{ category_id: string; limit_amount: number }>) {
        map[b.category_id] = b.limit_amount;
      }
      setBudgets(map);
      const initInputs: Record<string, string> = {};
      for (const c of cats) initInputs[c.id] = map[c.id] != null ? String(map[c.id]) : "";
      setInputs(initInputs);
      setLoading(false);
    });
  }, [userId, supabase]);

  async function handleBlur(categoryId: string) {
    const raw = inputs[categoryId]?.trim() ?? "";
    const num = parseFloat(raw);
    const current = budgets[categoryId];

    // No change
    if (raw === "" && current == null) return;
    if (!isNaN(num) && num === current) return;

    setErrored((p) => ({ ...p, [categoryId]: false }));
    try {
      if (raw === "" || num === 0 || isNaN(num)) {
        await deleteBudget(categoryId);
        setBudgets((p) => { const n = { ...p }; delete n[categoryId]; return n; });
      } else {
        await setBudget(categoryId, num);
        setBudgets((p) => ({ ...p, [categoryId]: num }));
      }
      setSaved((p) => ({ ...p, [categoryId]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [categoryId]: false })), 1500);
    } catch {
      setErrored((p) => ({ ...p, [categoryId]: true }));
    }
  }

  const helper = (
    <p className="mb-3 text-xs text-fg-muted">
      ตั้งงบรายเดือนต่อหมวดหมู่ — ใช้กับ Daily Pace และกราฟวงกลม
    </p>
  );

  if (loading) {
    return (
      <div className="glass p-5">
        <p className="text-sm font-medium text-fg-muted">งบประมาณรายหมวดหมู่</p>
        <p className="mt-2 text-sm text-fg-muted">กำลังโหลด…</p>
      </div>
    );
  }

  const list = (
    <div className="space-y-2">
      {categories.length === 0 && (
        <p className="text-sm text-fg-muted">ยังไม่มีหมวดหมู่</p>
      )}
      {categories.map((cat) => (
        <div key={cat.id} className="flex items-center gap-3">
          <span className="flex-1 text-sm">{cat.name}</span>
          {saved[cat.id] && <Check size={14} className="text-[var(--positive)]" />}
          {errored[cat.id] && <span className="text-xs text-[var(--negative)]">ผิดพลาด</span>}
          <div className="flex items-center gap-1">
            <span className="text-xs text-fg-muted">฿</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="—"
              value={inputs[cat.id] ?? ""}
              onChange={(e) => setInputs((p) => ({ ...p, [cat.id]: e.target.value }))}
              onBlur={() => handleBlur(cat.id)}
              className="w-24 rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-right text-sm outline-none"
            />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="glass relative p-5">
      <p className="text-sm font-medium text-fg-muted">งบประมาณรายหมวดหมู่</p>
      <div className="mt-3">
        {helper}
        {!isPro ? (
          <div className="relative">
            <div className="pointer-events-none select-none blur-sm">{list}</div>
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Link href="/paywall" className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black">
                🔒 ปลดล็อกด้วย Pro
              </Link>
            </div>
          </div>
        ) : (
          list
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
node node_modules/next/dist/bin/next build 2>&1 | tail -8
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/_components/BudgetList.tsx"
git commit -m "feat: add BudgetList — inline per-category budget editor with auto-save"
```

---

## Task 8: Wire BudgetList into Settings

**Files:**
- Modify: `app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Replace the page**

```typescript
// app/(dashboard)/settings/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isActive } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { CsvExportButton } from "./_components/CsvExportButton";
import { CsvImportDrawer } from "./_components/CsvImportDrawer";
import { BudgetList } from "./_components/BudgetList";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("is_active, plan_expires_at")
    .eq("id", user.id)
    .single();
  const profile = profileData as Pick<Profile, "is_active" | "plan_expires_at"> | null;
  const isPro = profile ? isActive(profile) : false;

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

      {/* Placeholders for remaining settings sections (future tasks) */}
      <div className="glass p-5 text-sm text-fg-muted">
        API Key + Regenerate — TODO (Task: Settings)
      </div>
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
Expected: `├ ƒ /settings` and `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/settings/page.tsx"
git commit -m "feat: mount BudgetList in Settings with Pro gating"
```

---

## Self-Review

**Spec coverage:**
- ✅ Wealth server actions (add/update/delete, is_liquid forced false for liabilities) — Task 1
- ✅ Budget server actions (setBudget upsert, deleteBudget) — Task 2
- ✅ NetWorthCard (Net Worth + sub-totals, colour by sign) — Task 3
- ✅ WealthFormDrawer (type toggle, name, value, is_liquid asset-only, add/edit/delete) — Task 4
- ✅ WealthList (grouped sections, swipe-delete, FAB, router.refresh for Net Worth) — Task 5
- ✅ Wealth page (Pro gate full-tab blur, server Net Worth compute) — Task 6
- ✅ BudgetList (inline editable, auto-save on blur, ✓ flash, Pro gate section) — Task 7
- ✅ Settings wiring (mount BudgetList, pass isPro) — Task 8
- ✅ Free user Wealth = full blur + CTA; free Budget = section blur only
- ✅ Empty states (no assets/liabilities, no categories)

**Type consistency:**
- `WealthPayload` (Task 1) → used in Task 4 ✅
- `WealthRow` exported from Task 4 → used in Task 5 ✅
- `setBudget`/`deleteBudget` (Task 2) → used in Task 7 ✅
- `WealthType` from `lib/types.ts` used consistently ✅
- `isActive()` + `Profile` pattern matches Overview/Analytics ✅

**Placeholder scan:** No TBDs; all code blocks complete. (Remaining Settings placeholders — API Key, Paywall — are intentional, scoped to future rounds.)
