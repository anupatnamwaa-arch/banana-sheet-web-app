import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shortcut transactions route supports savings entries and wallet/account resolution", async () => {
  const route = await read("app/api/transactions/route.ts");

  assert.match(route, /type !== "income" && type !== "expense" && type !== "savings"/);
  assert.match(route, /wallet\?: string/);
  assert.match(route, /account\?: string/);
  assert.match(route, /from\("wallets"\)/);
  assert.match(route, /wallet_id:\s*walletId/);
});
