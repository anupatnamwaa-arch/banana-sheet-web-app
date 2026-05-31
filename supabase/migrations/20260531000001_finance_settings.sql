-- supabase/migrations/20260531000001_finance_settings.sql
-- Adds three new profile settings columns.
-- All defaults match current hardcoded behaviour, so existing users are unaffected.

alter table public.profiles
  add column if not exists cycle_start_day  integer not null default 1
    check (cycle_start_day between 1 and 28),
  add column if not exists emergency_months integer not null default 6
    check (emergency_months between 1 and 24),
  add column if not exists balance_method   text    not null default 'net'
    check (balance_method in ('net', 'gross', 'budget'));
