# Ingestion API bypasses RLS via the service-role key

The home-screen Shortcut has no Supabase user session — it only carries the user's `api_key` (a UUID in `profiles`). So `POST /api/transactions` runs server-side with the Supabase **service-role key**, looks up `user_id` from the `api_key`, and inserts the Transaction on that user's behalf. This one route is the trusted server boundary; every other data path (all dashboard reads/writes) still goes through Row Level Security under `auth.uid()`.

The `api_key` is a long-lived, insert-only write credential displayed in Settings. Settings exposes a "Regenerate key" action so a leaked key can be revoked by rotating to a new UUID. A packaged `.shortcut` artifact is out of scope for the MVP — we ship the API plus an in-app setup guide.

## Consequences

- The service-role key must never reach the client; it lives only in server-side env (`SUPABASE_SERVICE_ROLE_KEY`) and is used solely in this route.
- A leaked `api_key` allows writing junk Transactions to one account (no reads, no money movement). Mitigated by regeneration.
