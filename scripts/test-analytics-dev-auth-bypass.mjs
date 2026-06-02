import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("analytics uses the dev-aware data client for preview reads", async () => {
  const [helper, analyticsAction, analyticsPage] = await Promise.all([
    read("lib/dev-auth-bypass.ts"),
    read("app/actions/analytics.ts"),
    read("app/(dashboard)/analytics/page.tsx"),
  ]);

  assert.match(helper, /getDevAuthBypassDataClient/);
  assert.match(helper, /isDevAuthBypassEnabled\(\)\s*\?\s*createServiceClient\(\)/);
  assert.match(analyticsAction, /getDevAuthBypassDataClient/);
  assert.match(analyticsAction, /await getDevAuthBypassDataClient\(\)/);
  assert.match(analyticsPage, /getDevAuthBypassDataClient/);
  assert.match(analyticsPage, /const dataSupabase = await getDevAuthBypassDataClient\(\)/);
});
