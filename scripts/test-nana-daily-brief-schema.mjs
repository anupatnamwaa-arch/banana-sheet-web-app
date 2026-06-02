import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("daily briefs migration stores one private evolving brief per Bangkok date", async () => {
  const migration = await read(
    "supabase/migrations/20260601000003_create_daily_briefs.sql",
  );

  assert.match(migration, /create table if not exists public\.daily_briefs/i);
  assert.match(migration, /brief_date\s+date\s+not null/i);
  assert.match(migration, /unique\s*\(\s*user_id\s*,\s*brief_date\s*\)/i);
  assert.match(migration, /score_factors\s+jsonb\s+not null/i);
  assert.match(migration, /reason_values\s+jsonb\s+not null/i);
  assert.match(migration, /suggestion_dismissed_at\s+timestamptz/i);
  assert.match(migration, /alter table public\.daily_briefs enable row level security/i);
  assert.match(migration, /for select\s+using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  assert.match(migration, /for insert\s+with check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
  assert.match(migration, /for update\s+using\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i);
});

test("shared types expose the persisted DailyBrief shape", async () => {
  const types = await read("lib/types.ts");

  assert.match(types, /export interface DailyBrief\s*\{/);
  assert.match(types, /state:\s*DailyBriefState/);
  assert.match(types, /safe_to_spend_per_day:\s*number \| null/);
  assert.match(types, /money_score:\s*number/);
  assert.match(types, /score_factors:\s*MoneyScoreFactor\[\]/);
});
