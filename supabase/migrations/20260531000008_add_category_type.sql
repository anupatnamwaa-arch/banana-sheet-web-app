-- supabase/migrations/20260531000008_add_category_type.sql
-- Add type column to categories to enable separate categories for expense, income, and savings.

alter table public.categories 
  add column if not exists type text check (type in ('expense', 'income', 'savings', 'shared')) not null default 'expense';

-- Update standard categories for existing users
update public.categories set type = 'income' where name = 'Salary' or name = 'เงินเดือน';
update public.categories set type = 'shared' where name = 'Other' or name = 'อื่นๆ';
update public.categories set type = 'savings' where name in ('Cash', 'SSF', 'ETF', 'Gold', 'Dime Save', 'ETF VOO-QQQ', 'USD cash', 'TTB+KEPT', 'สหกรณ์', 'Moon shot');

-- Update the signup trigger handle_new_user to seed correct category types
create or replace function public.handle_new_user()
returns trigger as $$
declare
  preset text;
begin
  insert into public.profiles (id) values (new.id);

  -- Seed default expense categories
  foreach preset in array array[
    'Food','Groceries','Transport','Shopping','Bills',
    'Entertainment','Health','Coffee'
  ]
  loop
    insert into public.categories (user_id, name, type) values (new.id, preset, 'expense');
  end loop;

  -- Seed default income categories
  insert into public.categories (user_id, name, type) values (new.id, 'Salary', 'income');

  -- Seed default shared categories
  insert into public.categories (user_id, name, type) values (new.id, 'Other', 'shared');

  -- Seed default savings categories
  foreach preset in array array['Cash', 'SSF', 'ETF']
  loop
    insert into public.categories (user_id, name, type) values (new.id, preset, 'savings');
  end loop;

  -- Seed default wallets
  insert into public.wallets (user_id, name, balance, color, icon) values (new.id, 'Cash', 0.00, '#4ade80', '💵');
  insert into public.wallets (user_id, name, balance, color, icon) values (new.id, 'Bank Account', 0.00, '#38bdf8', '🏦');

  return new;
end;
$$ language plpgsql security definer set search_path = public;
