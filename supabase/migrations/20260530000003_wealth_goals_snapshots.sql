-- supabase/migrations/20260530000003_wealth_goals_snapshots.sql
-- Wealth tab additions: financial goals, monthly net-worth snapshots (for the
-- trend chart + month-over-month change), and debt detail fields.

-- ── Financial goals ─────────────────────────────────────────────────────────
create table if not exists public.goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  target_amount  numeric(14,2) not null check (target_amount > 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  target_date    date,                                          -- optional deadline
  created_at     timestamptz not null default now()
);

-- ── Monthly net-worth snapshots (one row per user per Bangkok month) ──────────
create table if not exists public.net_worth_snapshots (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  month             text not null,                              -- "YYYY-MM" (Asia/Bangkok)
  net_worth         numeric(14,2) not null,
  total_assets      numeric(14,2) not null,
  total_liabilities numeric(14,2) not null,
  updated_at        timestamptz not null default now(),
  unique (user_id, month)
);

-- ── Debt detail fields on the existing wealth_debt table ──────────────────────
alter table public.wealth_debt
  add column if not exists monthly_payment numeric(14,2) check (monthly_payment >= 0),
  add column if not exists due_date date;

-- ── RLS: full owner CRUD, scoped to user_id (mirrors initial schema) ──────────
do $$
declare t text;
begin
  foreach t in array array['goals','net_worth_snapshots']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id);$p$, t);
  end loop;
end $$;
