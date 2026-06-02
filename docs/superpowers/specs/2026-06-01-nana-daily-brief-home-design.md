# Nana Daily Brief Home Redesign - Phase One Design Spec

## Summary

Phase one turns Banana Sheet Home into a calm daily decision surface. Nana remains the in-app banana companion and coaching voice; Banana Sheet remains the product name.

The redesigned Home answers three questions within five seconds:

1. Am I okay today?
2. How much can I safely spend today?
3. What is the one thing worth doing next?

The experience is Thai-first, cute but financially serious, and shame-free. It avoids a wall of cards and charts by showing one interpretation first, then progressively disclosing supporting numbers.

## Product Boundary

Phase one implements:

- Rule-backed Nana Daily Brief
- Adaptive Home hero
- Safe to Spend guidance
- Supporting Banana Money Score
- Meaningful-event refresh logic
- One evolving Daily Brief per Bangkok calendar day
- Compact expandable Home summary
- Optional AI enrichment inside expanded detail

Phase one explicitly defers:

- Full Payday Ritual allocation flow
- Mission acceptance and tracking
- Monthly Reflection page
- Layered Analytics redesign
- Subscription detection
- Wish List and 24-hour pause
- Golden bananas and cosmetic rewards
- Daily Brief history screen

Analytics remains unchanged during this phase.

## Core UX Principle

Nana interprets money behavior before the interface presents metrics.

Home shows no chart wall above the fold. The first screen contains one expressive Nana hero and one adaptive supporting section. Existing metrics remain available through progressive disclosure.

## Home Experience

### Nana Hero

The full-width hero is the primary Home surface. Its normal skeleton remains stable so users build familiarity.

The hero contains:

- Thai-first status phrase
- Safe to Spend per day as the primary number
- Small Banana Money Score status
- Small logging streak badge
- Combined protected Fixed Expense amount when relevant
- At most one suggested action
- Subtle `บันทึกรายจ่าย` link
- `ดูรายละเอียด` toggle for inline expansion

The center bottom-navigation `+` remains the primary universal quick-add action.

### Hero States

| State | Purpose | Hero behavior |
|---|---|---|
| `normal` | Reinforce a healthy or stable day | Show Safe to Spend, calm status, and optional light suggestion |
| `attention` | Explain a material pressure without alarm | Highlight the main cause and one realistic adjustment |
| `recovery` | Help after flexible money is exhausted | Show `฿0/day`, explain the shortfall in detail, and offer one repair action |
| `payday` | Recognize meaningful Income | Temporarily prioritize `ตั้งเป้าเงินออม` and `ไว้ทีหลัง`; full allocation is deferred |
| `setup` | Help a new or sparse-data user | Ask for one useful missing input, then reveal the next step progressively |

Weather visuals are occasional emphasis, not permanent decoration. Show them when the financial condition meaningfully changes. Nana uses a small consistent pose set tied to state.

### Adaptive Supporting Section

Show one contextually useful section immediately below the hero:

| State | First supporting section |
|---|---|
| `normal` | Compact monthly progress |
| `attention` | Main spending pressure and repair action |
| `recovery` | Calm recovery plan |
| `payday` | Saving-target prompt |
| `setup` | One-step setup guidance |

### Expandable Summary

The expandable Home summary preserves access to metrics without presenting separate competing cards.

Use a compact horizontal snapshot:

```text
รายรับ ฿36,300 · รายจ่าย ฿13,140 · เก็บได้ ฿23,160 · อัตราออม 64%
```

The expanded summary also includes:

- Compact Emergency Runway status
- Upcoming Fixed Expense item list
- Score explanation with the three strongest factors first
- `ดูทั้งหมด` for the complete factor breakdown
- Optional AI-enriched detail when available

Recent Transactions remain accessible lower on Home.

## Safe to Spend

### Definition

Safe to Spend is daily guidance, not a wallet or bank balance. It must preserve the existing domain separation between flow and stock.

Use the configured billing cycle when available. Fall back to the calendar month.

```text
protected flexible amount
= cycle Income
- Expenses already logged
- upcoming Fixed Expenses
- committed saving

Safe to Spend per day
= max(0, protected flexible amount / days remaining)
```

### Missing Inputs

When setup is incomplete:

- Show an explicitly labeled `ประมาณการ` value when a reasonable estimate exists.
- Ask for one accuracy-improving setup step at a time.
- Do not assume a saving commitment on the user's behalf.

When current-cycle Income is missing:

- Estimate from the previous cycle when enough history exists.
- Label the result `ประมาณการ`.
- Show a setup prompt when history is insufficient.
- Never silently use wallet balances, Liquid Assets, or Net Worth.

When Expenses exceed protected flexible money:

- Clamp the hero value to `฿0/day`.
- Explain the shortfall inside expanded detail.
- Offer one realistic recovery action.
- Never present a negative daily allowance as the hero number.

## Banana Money Score

### Role

Banana Money Score is a secondary 0-100 status inside Nana's hero. Safe to Spend remains the primary decision.

The score refreshes with the Daily Brief so the number, status phrase, and explanation stay synchronized.

### Phase-One Factors

- Spending pace
- Safe-to-Spend status
- Saving Rate compared with configured saving target
- Upcoming Fixed Expense pressure
- Logging consistency

The complete factor weighting remains internal in phase one. Users see:

- Score number
- Short reason
- Three strongest contributors first
- Complete factor list behind `ดูทั้งหมด`
- Plain-language statuses such as `ดี`, `ควรดูเพิ่ม`, or `ยังประเมินไม่ได้`

Use upcoming Fixed Expenses as the recurring-pressure signal. Subscription detection is deferred until its domain model is designed.

## Daily Brief Rules

### Daily Model

Store one private evolving Daily Brief per user per Bangkok calendar day. Meaningful events update the current day's brief rather than creating an event feed.

Keep a short history, initially 30 days, for future Monthly Reflection. Do not expose a Daily Brief history screen in phase one.

### Refresh Timing

Refresh:

- Each morning
- After meaningful Income
- After unusual Expense
- After a Category threshold crossing
- After a budget-pace state transition
- When a Fixed Expense becomes due soon

Do not refresh after every ordinary Transaction.

### Message Priority

When multiple conditions exist, choose one primary message deterministically:

1. Protect upcoming Fixed Expenses
2. Repair critical Safe-to-Spend or pace status
3. Explain unusual Expense or Category pressure
4. Recognize meaningful Income and show payday prompt
5. Celebrate healthy progress

AI does not choose which financial issue matters most.

### Unusual Expense Detection

Detect unusual Expense using:

- Recent same-Category history when enough data exists
- Material impact on Safe-to-Spend status
- Conservative fallback threshold when history is sparse

Exact thresholds should be constants with focused tests and can be tuned after observing real usage.

### Suggestion Dismissal

Ordinary suggestions may be hidden for the current day. A materially changed condition may generate a different message during a later meaningful-event refresh.

## Nana Voice

Nana has one recognizable Thai-first voice with severity-aware tone:

| State | Tone |
|---|---|
| Healthy | Warm and lightly playful |
| Attention needed | Concise and practical |
| Recovery | Calm, specific, and shame-free |
| Payday | Encouraging with a clear next step |
| Setup | Friendly and focused on one action |

Use recovery-first language. Loss-aversion framing is allowed only when paired with an immediate useful repair action. Do not use guilt, failure framing, or alarm-heavy red surfaces.

## AI Boundary

The deterministic layer computes:

- Financial state
- Safe to Spend
- Banana Money Score
- Factor statuses
- Primary message key
- Supporting reason values
- Suggested action key when relevant

Curated Thai Nana copy renders the Home hero immediately.

AI may enrich expanded Daily Brief detail with a personalized Thai explanation or suggestion. AI output is optional and non-blocking. If generation fails or times out, omit the enriched text quietly and keep the deterministic explanation complete.

## Data Model

Add a private per-user Daily Brief record with one row per Bangkok calendar day.

Suggested fields:

| Field | Purpose |
|---|---|
| `id` | Stable row identifier |
| `user_id` | Owner |
| `brief_date` | Bangkok calendar date; unique with `user_id` |
| `state` | `normal`, `attention`, `recovery`, `payday`, or `setup` |
| `safe_to_spend_per_day` | Non-negative guidance amount |
| `safe_to_spend_is_estimated` | Whether Income or other inputs were estimated |
| `money_score` | 0-100 Banana Money Score |
| `score_factors` | Structured factor statuses and reason values |
| `primary_message_key` | Curated Nana copy key |
| `suggested_action_key` | Optional curated action key |
| `reason_values` | Structured values used to explain the brief |
| `ai_detail_th` | Optional AI-enriched Thai detail |
| `suggestion_dismissed_at` | Optional current-day dismissal timestamp |
| `refresh_reason` | Morning or meaningful-event reason |
| `refreshed_at` | Last refresh timestamp |
| `created_at` | Record creation timestamp |

Use a unique constraint on `(user_id, brief_date)`.

## Existing Data Reuse

Reuse:

- Transactions for Income, Expenses, Saving Rate, unusual-Expense detection, and recent activity
- Billing-cycle settings for active period boundaries
- Fixed expenses for protected obligations
- Saving target percentage for committed saving
- Existing streak calculation for the hero badge
- Existing Emergency Runway calculation for expanded summary

Keep flow and stock separate:

- Safe to Spend uses flow commitments and period behavior.
- Emergency Runway remains a compact stock-based status.
- Wallet balances, Liquid Assets, and Net Worth never silently feed Safe to Spend.

## Visual Direction

### Signature Light Theme

- Warm cream background
- Soft off-white surfaces
- Warm brown text rather than pure black
- Restrained banana-yellow accent
- Muted green, orange, and purple only when semantically useful
- Gentle tinted shadows
- Subtle texture

### Quiet Dark Theme

- Warm charcoal background
- Soft elevated surfaces
- Desaturated yellow accent
- No neon glow
- Same hierarchy as light mode

### Layout Discipline

- One expressive Nana hero
- Generous whitespace
- Restrained supporting surfaces
- Progressive disclosure instead of card accumulation
- Nana appears where interpretation matters, not as decoration on every card
- Weather visuals appear only for meaningful state changes

## Financial Literacy

Use contextual micro-explanations, not a separate lesson tab.

Examples:

- Income arrives: explain why saving first protects future plans.
- Fixed Expense pressure rises: explain why flexibility shrinks.
- Safe to Spend reaches zero: explain recovery without shame.
- Saving Rate improves: explain how consistency compounds.

Occasional Nana lesson moments may appear only when they support the current decision.

## Error and Empty States

| Situation | Behavior |
|---|---|
| No Transaction history | Show `setup` hero with one useful next step |
| No configured billing cycle | Use calendar month |
| Missing current-cycle Income with history | Use labeled previous-cycle estimate |
| Missing current-cycle Income without history | Ask for setup; do not fabricate value |
| Missing saving target | Show estimate label and ask for one setup step |
| No upcoming Fixed Expenses | Protected Fixed Expense amount is omitted |
| Expenses exceed flexible amount | Show `฿0/day` and recovery explanation |
| AI unavailable | Render deterministic detail and omit AI text quietly |

## Testing Strategy

Add focused tests for:

- Billing-cycle and calendar-month boundaries in Asia/Bangkok
- Safe-to-Spend formula and clamp-to-zero behavior
- Previous-cycle Income estimation and estimate labeling
- No stock metric leakage into Safe to Spend
- Meaningful-event refresh detection
- Deterministic message priority
- Unusual-Expense detection with history and sparse-data fallback
- Score calculation and factor statuses
- One Daily Brief row per user per Bangkok date
- Suggestion dismissal behavior
- AI failure fallback
- Home state composition for `normal`, `attention`, `recovery`, `payday`, and `setup`

## Follow-Up Design Cycles

After phase one stabilizes:

1. Layered Analytics redesign
2. Monthly Reflection and next-period focus
3. Full Payday Ritual allocation flow
4. Mini Missions with acceptance and completion rules
5. Subscription detection
6. Wish List and 24-hour pause
7. Golden bananas, streak protection, and cosmetic rewards

