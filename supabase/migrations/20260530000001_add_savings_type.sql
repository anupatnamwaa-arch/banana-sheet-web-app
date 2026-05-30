-- supabase/migrations/20260530000001_add_savings_type.sql
-- Drop the existing check constraint and recreate it with savings included.
alter table transactions
  drop constraint if exists transactions_type_check;

alter table transactions
  add constraint transactions_type_check
  check (type in ('income', 'expense', 'savings'));
