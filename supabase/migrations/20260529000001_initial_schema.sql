-- Banana Sheet — Phase 1: schema, RLS, signup trigger, storage.
-- See CONTEXT.md for domain language and docs/adr/ for the decisions encoded here.
-- Money: numeric(14,2), THB only (ADR-0003). Timestamps: timestamptz (UTC); bucket in Asia/Bangkok at query time.

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles: one row per auth user. Holds the access gate, ingestion key,
-- plan state, and AI-roast usage counters.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  is_active       boolean     not null default false,            -- manual gate, flipped via Telegram approval (ADR-0002)
  api_key         uuid        not null default gen_random_uuid() unique, -- ingestion credential (ADR-0001)
  plan_type       text        check (plan_type in ('lifetime','monthly','yearly')), -- null until activated
  plan_expires_at timestamptz,                                   -- null = lifetime; date = monthly/yearly
  promo_code      text,                                          -- the code this user redeemed, if any
  free_roast_used boolean     not null default false,            -- free tier: 1 lifetime roast
  last_roast_at   timestamptz,                                   -- Pro: throttle to 1 / 7 days
  created_at      timestamptz not null default now()
);

-- categories: per-user controlled vocabulary. Seeded on signup (see trigger).
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  icon       text,                                               -- lucide icon name, optional
  created_at timestamptz not null default now(),
  unique (user_id, name)                                         -- makes auto-create-on-ingest idempotent
);

-- brands: SINGLE SHARED CATALOG (ADR-0004). No user_id. Read-all, owner-writes.
create table public.brands (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  aliases    text[] not null default '{}',                       -- note-matching keywords
  domain     text,                                               -- logo CDN looks this up
  logo_url   text,
  created_at timestamptz not null default now()
);

-- transactions: the atomic flow record. amount is always positive; direction is `type`.
create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(14,2) not null check (amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  brand_id    uuid references public.brands(id) on delete set null, -- auto-matched from note, optional
  type        text not null check (type in ('income','expense')),
  date        timestamptz not null default now(),
  note        text,
  created_at  timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, date);

-- budgets: recurring monthly limit per category.
create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  category_id  uuid not null references public.categories(id) on delete cascade,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  created_at   timestamptz not null default now(),
  unique (user_id, category_id)                                  -- one budget per category
);

-- wealth_debt: stock snapshot. is_liquid drives Emergency Runway.
create table public.wealth_debt (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('asset','liability')),
  value      numeric(14,2) not null,
  is_liquid  boolean not null default true,                      -- only liquid assets count toward Runway
  updated_at timestamptz not null default now()
);

-- payment_slips: a payment proof awaiting manual Telegram approval (ADR-0002).
create table public.payment_slips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  image_url  text not null,
  plan_type  text not null check (plan_type in ('lifetime','monthly','yearly')), -- what they paid for
  status     text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz not null default now()
);

-- promo_codes: owner-managed activation codes. No user_id; validated server-side only.
create table public.promo_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  is_active  boolean not null default true,
  max_uses   integer not null default 1,
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Helper: a single owner-only-readable policy pattern is applied per table below.

-- profiles: owner can read/update own row. Inserts happen via the signup
-- trigger (security definer), so no insert policy is exposed to clients.
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Per-user tables: full owner CRUD, scoped to user_id.
do $$
declare t text;
begin
  foreach t in array array['categories','transactions','budgets','wealth_debt','payment_slips']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$create policy "%1$s_select_own" on public.%1$I for select using (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_insert_own" on public.%1$I for insert with check (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_update_own" on public.%1$I for update using (auth.uid() = user_id);$p$, t);
    execute format($p$create policy "%1$s_delete_own" on public.%1$I for delete using (auth.uid() = user_id);$p$, t);
  end loop;
end $$;

-- brands: shared catalog. Any authenticated user may READ; writes only via
-- service role (which bypasses RLS), so no write policy is defined. (ADR-0004)
alter table public.brands enable row level security;
create policy "brands_select_all_authenticated" on public.brands for select to authenticated using (true);

-- promo_codes: locked to clients entirely. Validation/redemption runs in a
-- server action with the service role key (bypasses RLS). No policies = no client access.
alter table public.promo_codes enable row level security;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- On signup: create the profile and seed preset categories.
-- NOTE: this preset list MUST stay in sync with the home-screen Shortcut's
-- category menu, or ingested categories will all auto-create as "new".
create or replace function public.handle_new_user()
returns trigger as $$
declare
  preset text;
begin
  insert into public.profiles (id) values (new.id);

  foreach preset in array array[
    'Food','Groceries','Transport','Shopping','Bills',
    'Entertainment','Health','Coffee','Salary','Other'
  ]
  loop
    insert into public.categories (user_id, name) values (new.id, preset);
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep wealth_debt.updated_at fresh on every change.
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger wealth_debt_touch_updated_at
  before update on public.wealth_debt
  for each row execute procedure public.touch_updated_at();

-- ============================================================================
-- STORAGE: payment slips (path convention: payment-slips/{user_id}/{filename})
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do nothing;

-- Owner can manage only files under their own {user_id}/ prefix.
create policy "slips_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "slips_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'payment-slips' and (storage.foldername(name))[1] = auth.uid()::text);
