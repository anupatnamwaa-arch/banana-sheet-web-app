import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("app/actions/home.ts and app/(dashboard)/overview/page.tsx perform Nana Home integration", async () => {
  const [homeAction, overviewPage] = await Promise.all([
    read("app/actions/home.ts"),
    read("app/(dashboard)/overview/page.tsx"),
  ]);

  // home.ts imports and obtains the Daily Brief
  assert.match(homeAction, /getOrRefreshDailyBrief/);
  assert.match(homeAction, /getOrRefreshDailyBrief\([\s\S]*?["']page_load["']\)/);

  // overview/page.tsx renders NanaHero
  assert.match(overviewPage, /<NanaHero\b/);

  // The old prominent HomeStreakCard, HomeBalanceCard, and HomeSummaryCards are removed from page.tsx first-glance stack
  assert.doesNotMatch(overviewPage, /<HomeStreakCard\b/);
  assert.doesNotMatch(overviewPage, /<HomeBalanceCard\b/);

  // Recent transactions remain rendered
  assert.match(overviewPage, /<HomeRecentTransactions\b/);

  // Emergency Runway card is removed as a prominent standalone Home card
  assert.doesNotMatch(overviewPage, /<EmergencyRunwayCard\b/);
});
