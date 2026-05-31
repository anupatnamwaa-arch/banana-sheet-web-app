-- Migration: Add Wallets table and link to transactions
-- See CONTEXT.md for terminology.

-- 1. Create public.wallets table
create table if not exists public.wallets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  balance    numeric(14,2) not null default 0.00,
  color      text not null default '#fb923c',
  icon       text not null default '👛',
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security (RLS) on public.wallets
alter table public.wallets enable row level security;

create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallets_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
create policy "wallets_update_own" on public.wallets for update using (auth.uid() = user_id);
create policy "wallets_delete_own" on public.wallets for delete using (auth.uid() = user_id);

-- 3. Link wallets to transactions
alter table public.transactions add column if not exists wallet_id uuid references public.wallets(id) on delete set null;

-- 4. Update public.handle_new_user() to seed default wallets on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  preset text;
begin
  insert into public.profiles (id) values (new.id);

  -- Seed default categories
  foreach preset in array array[
    'Food','Groceries','Transport','Shopping','Bills',
    'Entertainment','Health','Coffee','Salary','Other'
  ]
  loop
    insert into public.categories (user_id, name) values (new.id, preset);
  end loop;

  -- Seed default wallets
  insert into public.wallets (user_id, name, balance, color, icon) values (new.id, 'Cash', 0.00, '#4ade80', '💵');
  insert into public.wallets (user_id, name, balance, color, icon) values (new.id, 'Bank Account', 0.00, '#38bdf8', '🏦');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Seed default wallets for any existing users
insert into public.wallets (user_id, name, balance, color, icon)
select id, 'Cash', 0.00, '#4ade80', '💵'
from public.profiles
where id not in (select distinct user_id from public.wallets);

insert into public.wallets (user_id, name, balance, color, icon)
select id, 'Bank Account', 0.00, '#38bdf8', '🏦'
from public.profiles
where id not in (select distinct user_id from public.wallets where name = 'Bank Account');
