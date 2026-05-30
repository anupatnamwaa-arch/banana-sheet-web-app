-- supabase/migrations/20260530000002_add_savings_target.sql
-- Per-user savings-rate goal (percent of income), shown on the Analytics tab.
-- Defaults to 20% — a common rule-of-thumb target.

alter table public.profiles
  add column if not exists savings_target_pct integer not null default 20
  check (savings_target_pct between 0 and 100);
