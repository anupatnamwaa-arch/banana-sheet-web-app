# AI Financial Roast — Design Spec

**Date:** 2026-05-30  
**Feature:** Item 7 — AI Financial Roast  
**Route:** `/roast`

---

## Overview

Users pick a Thai persona, tap "Roast Me", and receive a long-form Thai-language AI roast of their spending habits for the current month. After reading, they select a quotable line and export a tweet-style 9:16 share card.

---

## Rate Limiting

| Tier | Limit |
|------|-------|
| Free | 1 lifetime roast |
| Pro  | 1 per 7 days |

Stored in `profiles.last_roasted_at` (timestamp). Checked server-side before any AI call. On success, updated after stream completes. If blocked, the button shows "Next roast available in X days" and `/api/roast` is never called.

---

## Personas

7 presets. Each has: name (Thai), Twitter handle (for share card), emoji avatar, tagline, and a system prompt personality definition.

| # | Name | Handle | Emoji | Tagline | Vibe |
|---|------|--------|-------|---------|------|
| 1 *(default)* | คุณป้าแผนกการเงิน | @finance_auntie | 👩‍💼 | "ป้าเห็นสลิปหมดแล้วนะ" | Passive-aggressive office auntie |
| 2 | คุณแม่ที่ผิดหวัง | @disappointed_mom | 👩 | "แม่ไม่โกรธ แค่เสียใจ" | Disappointed Thai mom |
| 3 | เพื่อนซี้ปากตรง | @bestie_no_filter | 🫂 | "กูรักมึง แต่มึงบ้า" | Brutally honest best friend |
| 4 | หมอดูการเงิน | @money_fortune | 🔮 | "ดวงการเงินปีนี้... อ้าว" | Fortune teller who saw this coming |
| 5 | CK | @ck_tycoon | 💼 | "ทำไมไม่ลงทุนล่ะ?" | Thai tycoon who judges your peasant spending |
| 6 | โค้ชที่แทบหมดหวัง | @coach_losing_faith | 📣 | "เราทำได้! ...ใช่มั้ย?" | Motivational coach losing faith |
| 7 | Gen Z ไม่แคร์ | @genz_ngl | 💀 | "อะไรวะ 💀" | Chronically online, zero filter |

---

## Data Input (per roast)

Fetched via `getRoastData` server action:

1. **This month's transactions** — aggregated by category: `{ category, total, count }`
2. **Last month's transactions** — same aggregation (for MoM comparison)
3. **Active budgets** — `{ category, budget_amount }` for current month

All amounts in THB.

---

## AI Integration

- **Model:** `gpt-4o-mini` via OpenAI SDK (already in `package.json`)
- **Route:** `GET /api/roast?persona=<id>` — Next.js Route Handler with streaming
- **Response format:** The prompt instructs the model to return valid JSON:

```json
{
  "roast": "<long-form Thai roast, 300-500 words>",
  "quotes": ["<quote 1>", "<quote 2>", "<quote 3>"]
}
```

- The route streams the raw response. The client accumulates chunks, detects when valid JSON is complete, then splits `roast` (displayed progressively) and `quotes` (shown as chips after stream ends).
- System prompt sets: persona tone, vocabulary, signature phrases, and instructs output in Thai only.
- Temperature: 0.9 (personality variation).

---

## Page Flow

```
/roast
  └── PersonaPicker        (horizontal pill scroll, 7 personas)
  └── RoastButton          (disabled + countdown if rate-limited)
  └── RoastDisplay         (streaming roast text, appears after tap)
  └── QuotePicker          (3 selectable quote chips, appears post-stream)
  └── ShareButton          (appears after a quote is selected)
  └── ShareCard            (hidden off-screen, captured by html-to-image)
```

---

## UI Details

### PersonaPicker
- Horizontal scrollable row of pill buttons
- Each pill: emoji + name
- Selected pill: accent background
- Default selection: persona 1 (คุณป้าแผนกการเงิน)

### RoastButton
- States: idle → loading (streaming) → done
- If rate-limited: disabled, shows "Roast อีกครั้งได้ใน X วัน"
- Free tier used: shows "อัปเกรดเป็น Pro เพื่อ Roast อีกครั้ง"

### RoastDisplay
- Text streams in character by character (accumulated from SSE chunks)
- Contained in a glassy card, scrollable
- Persona name + emoji shown as header above the roast text

### QuotePicker
- Appears below RoastDisplay after stream completes
- 3 tappable quote cards
- Single-select; selected card gets accent border
- Label: "เลือก quote เพื่อแชร์"

### ShareCard (for export only)
- 9:16 aspect ratio (1080×1920px target)
- Dark X/Twitter style:
  - Deep navy/dark background (`#0f1117`)
  - White tweet card with dark theme (`#16202a`)
  - Persona emoji avatar (36px circle, accent bg)
  - Persona name (bold white) + @handle (muted)
  - Selected quote as tweet body text
  - Timestamp: current month + year + "Banana Sheet"
  - Fake engagement: randomised retweets (10–50) + likes (100–500)
  - Bottom watermark: "Roasted by Banana Sheet 🍌"
- Rendered off-screen via `html-to-image`, triggered by ShareButton
- Exported as PNG → Web Share API (`navigator.share`) with fallback to download

---

## Components

| File | Purpose |
|------|---------|
| `app/(dashboard)/roast/page.tsx` | Page shell, orchestrates state |
| `app/(dashboard)/roast/_components/PersonaPicker.tsx` | Persona pill scroll |
| `app/(dashboard)/roast/_components/RoastButton.tsx` | CTA with rate-limit state |
| `app/(dashboard)/roast/_components/RoastDisplay.tsx` | Streaming text display |
| `app/(dashboard)/roast/_components/QuotePicker.tsx` | 3-quote selector |
| `app/(dashboard)/roast/_components/ShareCard.tsx` | Tweet-style card (export target) |
| `app/(dashboard)/roast/_components/ShareButton.tsx` | Triggers html-to-image + share |
| `app/(dashboard)/roast/_lib/personas.ts` | Persona definitions + system prompts |
| `app/api/roast/route.ts` | Streaming route handler |
| `app/actions/roast.ts` | `getRoastData` + rate limit check |

---

## Error Handling

- **No transactions this month:** Prompt includes a note; AI roasts the emptiness ("ป้าหาข้อมูลไม่เจอเลย... หนูไม่ได้บันทึกอะไรเลยเหรอ")
- **Stream error:** Show inline error message with retry button; do not consume rate limit if stream fails before completion
- **Share API unavailable:** Fall back to PNG download

---

## Out of Scope

- Custom user-defined personas
- Roast history / past roasts
- Sharing directly to Twitter/X API
- Animated share card
