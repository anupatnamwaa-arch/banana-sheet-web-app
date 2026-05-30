# Ingestion Engine Settings — Design Spec

## Summary

The `POST /api/transactions` ingestion route is already fully implemented (service-role auth by `api_key`, category auto-create, brand match, 200 OK). This round adds the Settings UI that makes the feature usable: display + copy the user's `api_key`, a Regenerate button, and a static iOS Shortcut setup guide.

---

## What's Already Done

- `app/api/transactions/route.ts` — complete (Bearer token / x-api-key auth, payload validation, category auto-create, brand match, insert)
- `lib/supabase/service.ts` — service-role client

---

## Architecture

```
app/actions/profile.ts                         ← regenerateApiKey() server action
app/(dashboard)/settings/_components/
  ApiKeySection.tsx                            ← 'use client': display/copy/regenerate
  ShortcutGuide.tsx                            ← server component: static setup guide
app/(dashboard)/settings/page.tsx             ← Modify: fetch api_key, mount both
```

---

## Server Action: `app/actions/profile.ts`

```typescript
"use server";
// regenerateApiKey(): auth-gated, rotates api_key to a new UUID, returns new key
export async function regenerateApiKey(): Promise<string>
```

- `createClient()` (server), `auth.getUser()` → throw "Unauthenticated" if no user
- `supabase.from("profiles").update({ api_key: crypto.randomUUID() }).eq("id", user.id).select("api_key").single()`
- Returns the new key string; throws on error

---

## `ApiKeySection.tsx` (`'use client'`)

Props: `{ initialKey: string }` — key fetched server-side and passed in to avoid client-side flash.

State: `key` (string), `copied` (boolean), `regenerating` (boolean), `justRegenerated` (boolean).

**Display:**
- Label: "API Key (สำหรับ Shortcut)"
- Key shown as monospace text, truncated (show first 8 + "..." + last 4 characters), full key in a `title` tooltip
- **Copy button** (Copy icon from lucide): writes full key to `navigator.clipboard.writeText(key)`, sets `copied=true` for 1.5s → button label flashes "✓ คัดลอกแล้ว"
- **"สร้างใหม่"** button: calls `regenerateApiKey()`, updates `key` state, flashes "✓ สร้างใหม่แล้ว" for 1.5s; disabled + loading text "กำลังสร้าง…" during request
- Warning below: "⚠ ห้ามแชร์ Key นี้ — ใครมี Key สามารถเพิ่มรายการได้"
- **Always visible** (free and Pro alike — ingestion works for all users)

---

## `ShortcutGuide.tsx` (Server Component)

Static collapsible section. Uses a `<details>/<summary>` HTML element (no JS needed).

Title: "📱 วิธีตั้งค่า iOS Shortcut"

**4 numbered steps:**

1. เปิดแอป **Shortcuts** บน iPhone → กด **+** สร้าง Shortcut ใหม่
2. เพิ่ม action **"Ask for Input"** → ตั้งชื่อว่า "จำนวนเงิน" (Type: Number)
3. เพิ่ม action **"Get Contents of URL"** → ตั้งค่าดังนี้:
   - **URL:** `https://YOUR_DOMAIN/api/transactions`
   - **Method:** POST
   - **Headers:** `Authorization: Bearer YOUR_API_KEY`
   - **Body (JSON):**
     ```json
     {
       "amount": [Provided Input],
       "category": "Food",
       "type": "expense",
       "date": "[Current Date]"
     }
     ```
4. กด **Add to Home Screen** เพื่อเพิ่มไอคอนลงหน้าจอหลัก

Note below steps: "แทนที่ `YOUR_DOMAIN` ด้วยโดเมนของคุณ และ `YOUR_API_KEY` ด้วย Key ด้านบน"

---

## Settings Page Update

`app/(dashboard)/settings/page.tsx`:
- Add `api_key` to the profile `select`: `.select("is_active, plan_expires_at, api_key")`
- Pass `api_key` to `<ApiKeySection initialKey={profile.api_key} />`
- Mount `<ShortcutGuide />` below `ApiKeySection`

The section sits between the Budget section and the Paywall placeholder.

---

## Edge Cases

| Situation | Behaviour |
|---|---|
| `navigator.clipboard` unavailable (non-HTTPS, old browser) | Copy button not shown; key still displayed in full |
| Regenerate fails | Error message "สร้างใหม่ไม่สำเร็จ" shown inline; key unchanged |
| `api_key` null in DB (shouldn't happen — set on signup) | Show "—" with a "Generate" button that calls `regenerateApiKey()` |
