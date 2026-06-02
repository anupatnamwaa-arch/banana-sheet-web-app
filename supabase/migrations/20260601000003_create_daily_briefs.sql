-- Store one evolving Nana Daily Brief per user per Bangkok calendar day.

create table if not exists public.daily_briefs (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references public.profiles(id) on delete cascade,
  brief_date                 date not null,
  state                      text not null check (state in ('normal','attention','recovery','payday','setup')),
  safe_to_spend_per_day      numeric(14,2),
  safe_to_spend_is_estimated boolean not null default false,
  money_score                integer not null check (money_score between 0 and 100),
  score_factors              jsonb not null default '[]'::jsonb,
  primary_message_key        text not null,
  suggested_action_key       text,
  reason_values              jsonb not null default '{}'::jsonb,
  ai_detail_th               text,
  suggestion_dismissed_at    timestamptz,
  refresh_reason             text not null,
  refreshed_at               timestamptz not null default now(),
  created_at                 timestamptz not null default now(),
  unique (user_id, brief_date)
);

create index if not exists daily_briefs_user_date_idx
  on public.daily_briefs (user_id, brief_date desc);

alter table public.daily_briefs enable row level security;

create policy "daily_briefs_select_own"
  on public.daily_briefs for select
  using (auth.uid() = user_id);

create policy "daily_briefs_insert_own"
  on public.daily_briefs for insert
  with check (auth.uid() = user_id);

create policy "daily_briefs_update_own"
  on public.daily_briefs for update
  using (auth.uid() = user_id);
