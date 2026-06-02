-- supabase/migrations/20260601000002_create_fixed_costs.sql
-- Create fixed_costs table for recurring monthly expenses/flows.

create table if not exists public.fixed_costs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(14,2) not null check (amount >= 0),
  type            text not null check (type in ('income','expense','savings')) default 'expense',
  category_id     uuid references public.categories(id) on delete set null,
  wallet_id       uuid references public.wallets(id) on delete set null,
  note            text,
  day_of_month    integer not null check (day_of_month >= 1 and day_of_month <= 31),
  auto_log        boolean not null default true,
  start_date      date not null default current_date,
  end_date        date check (end_date is null or end_date >= start_date),
  last_logged_at  date,
  created_at      timestamptz not null default now()
);

-- Index for fast user-specific lookup
create index if not exists fixed_costs_user_idx on public.fixed_costs (user_id);

-- Enable Row Level Security (RLS)
alter table public.fixed_costs enable row level security;

-- CRUD policies scoped to owner
create policy "fixed_costs_select_own" on public.fixed_costs for select using (auth.uid() = user_id);
create policy "fixed_costs_insert_own" on public.fixed_costs for insert with check (auth.uid() = user_id);
create policy "fixed_costs_update_own" on public.fixed_costs for update using (auth.uid() = user_id);
create policy "fixed_costs_delete_own" on public.fixed_costs for delete using (auth.uid() = user_id);
