-- Add summary column for single-sentence roast summary (replaces quotes array)
alter table public.ai_roasts
  add column if not exists summary text,
  alter column quotes drop not null;
