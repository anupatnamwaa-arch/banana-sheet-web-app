import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("app/actions/daily-brief.ts contract matches architecture expectations", async () => {
  const actionContent = await read("app/actions/daily-brief.ts");

  // Uses "use server"
  assert.match(actionContent, /"use server"/);

  // Queries profiles, transactions, and fixed_costs
  assert.match(actionContent, /\.from\(\s*['"]profiles['"]\s*\)/);
  assert.match(actionContent, /\.from\(\s*['"]transactions['"]\s*\)/);
  assert.match(actionContent, /\.from\(\s*['"]fixed_costs['"]\s*\)/);

  // Calls domain logic functions
  assert.match(actionContent, /calculateSafeToSpend\(/);
  assert.match(actionContent, /calculateMoneyScore\(/);
  assert.match(actionContent, /choosePrimaryMessage\(/);

  // Upserts into daily_briefs with onConflict
  assert.match(actionContent, /\.from\(\s*['"]daily_briefs['"]\s*\)/);
  assert.match(actionContent, /onConflict:\s*['"]user_id\s*,\s*brief_date['"]/);

  // Exports required functions
  assert.match(actionContent, /export async function getOrRefreshDailyBrief/);
  assert.match(actionContent, /export async function dismissDailyBriefSuggestion/);
});
