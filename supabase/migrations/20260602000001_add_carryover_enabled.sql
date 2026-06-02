-- Add carryover_enabled flag to profiles.
-- When true, the previous billing cycle's remaining balance rolls over into
-- the current month's "เงินคงเหลือใช้เดือนนี้" figure.
alter table public.profiles
  add column if not exists carryover_enabled boolean not null default false;
