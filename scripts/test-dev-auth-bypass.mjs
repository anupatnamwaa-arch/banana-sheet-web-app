import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("development bypass is server-only and cannot activate in production", async () => {
  const helper = await read("lib/dev-auth-bypass.ts");

  assert.match(helper, /import "server-only"/);
  assert.match(helper, /process\.env\.NODE_ENV === "development"/);
  assert.match(helper, /process\.env\.DEV_AUTH_BYPASS === "true"/);
  assert.match(helper, /process\.env\.DEV_AUTH_BYPASS_EMAIL/);
  assert.match(helper, /createServiceClient/);
  assert.match(helper, /auth\.admin\.listUsers/);
  assert.match(helper, /00000000-0000-0000-0000-000000000000/);
});

test("dashboard pages and paywall use the configured local preview user", async () => {
  const [dashboard, overview, settings, transactions, wealth, analytics, paywall] = await Promise.all([
    read("app/(dashboard)/layout.tsx"),
    read("app/(dashboard)/overview/page.tsx"),
    read("app/(dashboard)/settings/page.tsx"),
    read("app/(dashboard)/transactions/page.tsx"),
    read("app/(dashboard)/wealth/page.tsx"),
    read("app/(dashboard)/analytics/page.tsx"),
    read("app/paywall/page.tsx"),
  ]);

  assert.match(dashboard, /isDevAuthBypassEnabled/);
  assert.match(dashboard, /if \(!user && !devAuthBypass\) redirect\("\/login"\)/);
  assert.match(overview, /getDevAuthBypassUserId/);
  assert.match(settings, /getDevAuthBypassUserId/);
  assert.match(transactions, /getDevAuthBypassUserId/);
  assert.match(wealth, /getDevAuthBypassUserId/);
  assert.match(analytics, /getDevAuthBypassUserId/);
  assert.match(paywall, /isDevAuthBypassEnabled/);
  assert.match(paywall, /getDevAuthBypassUserId/);
  assert.match(paywall, /if \(!user && !devAuthBypass\)/);
});
