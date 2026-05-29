# Payment verification happens through a Telegram bot

Payments are verified manually by the owner, but the workflow runs through Telegram rather than the Supabase dashboard. When a Free user uploads a payment slip, the image is stored in Supabase Storage, a `payment_slips` row is created (`status = 'pending'`, carrying `user_id` and the requested `plan_type`), and a Telegram bot DMs the owner the slip image plus user details with inline buttons (`✅ Lifetime / ✅ Yearly / ✅ Monthly / ❌ Reject`).

Tapping a button calls a webhook (`POST /api/telegram/webhook`) that sets the user Active, computes `plan_expires_at` from the chosen plan, marks the slip `verified`, and notifies the user. The owner approves from their phone in one tap; no manual DB editing.

## Consequences

- Requires a Telegram bot token (server env) and a public webhook endpoint. The webhook must verify a shared secret (Telegram `X-Telegram-Bot-Api-Secret-Token`) so only Telegram can trigger activations.
- External dependency: if Telegram is unreachable, activations stall — acceptable for a manual, low-volume MVP. A fallback is direct Supabase table editing.
