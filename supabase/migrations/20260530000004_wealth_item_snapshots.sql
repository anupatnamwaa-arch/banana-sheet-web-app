-- supabase/migrations/20260530000004_wealth_item_snapshots.sql
-- Per-item monthly snapshots so we can chart individual asset/debt growth over time.
-- item_id cascades on delete so orphan rows don't accumulate.

create table if not exists public.wealth_item_snapshots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  item_id    uuid not null references public.wealth_debt(id) on delete cascade,
  month      text not null,                               -- "YYYY-MM" (Asia/Bangkok)
  name       text not null,                               -- denormalized for display
  type       text not null check (type in ('asset','liability')),
  value      numeric(14,2) not null,
  unique (user_id, item_id, month)
);

-- Also ensure the aggregate snapshots table stores per-bucket totals
-- (total_assets / total_liabilities were already added in migration 3; no change needed).

-- RLS
alter table public.wealth_item_snapshots enable row level security;
create policy "wealth_item_snapshots_select_own" on public.wealth_item_snapshots
  for select using (auth.uid() = user_id);
create policy "wealth_item_snapshots_insert_own" on public.wealth_item_snapshots
  for insert with check (auth.uid() = user_id);
create policy "wealth_item_snapshots_update_own" on public.wealth_item_snapshots
  for update using (auth.uid() = user_id);
create policy "wealth_item_snapshots_delete_own" on public.wealth_item_snapshots
  for delete using (auth.uid() = user_id);
