import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("app/actions/transactions.ts and app/actions/fixed-costs.ts contain Daily Brief refresh hooks", async () => {
  const transactionsContent = await read("app/actions/transactions.ts");
  const fixedCostsContent = await read("app/actions/fixed-costs.ts");

  // Transactions module imports getOrRefreshDailyBrief
  assert.match(transactionsContent, /getOrRefreshDailyBrief/);

  // addTransaction calls getOrRefreshDailyBrief after insert
  assert.match(
    transactionsContent,
    /async function addTransaction[\s\S]*?getOrRefreshDailyBrief\([\s\S]*?["']transaction_change["']\)/
  );

  // updateTransaction calls getOrRefreshDailyBrief after update
  assert.match(
    transactionsContent,
    /async function updateTransaction[\s\S]*?getOrRefreshDailyBrief\([\s\S]*?["']transaction_change["']\)/
  );

  // deleteTransaction calls getOrRefreshDailyBrief after delete
  assert.match(
    transactionsContent,
    /async function deleteTransaction[\s\S]*?getOrRefreshDailyBrief\([\s\S]*?["']transaction_change["']\)/
  );

  // duplicateTransaction calls getOrRefreshDailyBrief after insert
  assert.match(
    transactionsContent,
    /async function duplicateTransaction[\s\S]*?getOrRefreshDailyBrief\([\s\S]*?["']transaction_change["']\)/
  );

  // FixedCosts module imports getOrRefreshDailyBrief
  assert.match(fixedCostsContent, /getOrRefreshDailyBrief/);

  // processFixedCosts calls getOrRefreshDailyBrief with fixed_expense_change
  assert.match(
    fixedCostsContent,
    /getOrRefreshDailyBrief\([\s\S]*?["']fixed_expense_change["']\)/
  );
});
