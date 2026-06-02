-- supabase/migrations/20260531000007_create_ai_roasts.sql
-- Create ai_roasts table to store historical AI financial roasts, quotes, and summaries.

create table if not exists public.ai_roasts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  persona_id text not null,
  roast      text not null,                               -- 200-300 word main paragraph
  quotes     text[] not null,                             -- array of 2 quotes/1-sentence summaries
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.ai_roasts enable row level security;

-- Policies for RLS
create policy "roasts_select_own" on public.ai_roasts for select using (auth.uid() = user_id);
create policy "roasts_insert_own" on public.ai_roasts for insert with check (auth.uid() = user_id);
create policy "roasts_delete_own" on public.ai_roasts for delete using (auth.uid() = user_id);
