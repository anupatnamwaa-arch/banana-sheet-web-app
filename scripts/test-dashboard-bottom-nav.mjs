import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("dashboard bottom nav keeps four routes and uses a quiet inline add button", async () => {
  const bottomNav = await read("app/(dashboard)/_components/BottomNav.tsx");

  assert.match(bottomNav, /href:\s*"\/overview"/);
  assert.match(bottomNav, /href:\s*"\/analytics"/);
  assert.match(bottomNav, /href:\s*"\/transactions"/);
  assert.match(bottomNav, /href:\s*"\/wealth"/);
  assert.match(bottomNav, /UniversalFabDrawer/);
  assert.match(bottomNav, /<Plus\b/);
  assert.match(bottomNav, /FAB spacer/);
  assert.doesNotMatch(bottomNav, /style=\{\{\s*bottom:/);
  assert.doesNotMatch(bottomNav, /shadow-\[0_6px_24px_rgba\(250,204,21,0\.45\)\]/);
  assert.match(bottomNav, /bg-accent\/90/);
});
