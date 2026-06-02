-- Add monthly subscription classification and link logged transactions to a recurring source.

alter table public.fixed_costs
  add column if not exists recurring_kind text not null default 'fixed_cost'
  check (recurring_kind in ('fixed_cost', 'subscription'));

alter table public.transactions
  add column if not exists fixed_cost_id uuid references public.fixed_costs(id) on delete set null,
  add column if not exists recurring_kind text
  check (recurring_kind is null or recurring_kind in ('fixed_cost', 'subscription'));

create index if not exists transactions_fixed_cost_idx
  on public.transactions (fixed_cost_id);
