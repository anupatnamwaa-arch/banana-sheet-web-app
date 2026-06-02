import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("i18n copy dictionaries contain all necessary Daily Brief strings", async () => {
  const [thContent, enContent] = await Promise.all([
    read("lib/i18n/dictionaries/th.ts"),
    read("lib/i18n/dictionaries/en.ts"),
  ]);

  const assertions = [
    /dailyBrief\s*:\s*\{/,
    /safeToSpendLabel/,
    /estimateLabel/,
    /protect_fixed_expenses/,
    /recover_safe_to_spend/,
    /explain_unusual_expense/,
    /recognize_income/,
    /celebrate_progress/,
    /setup_income/,
    /paydayAction/,
    /dismiss/,
    /detailsToggle/,
    /factorLabels/,
    /factorStatuses/,
    /summaryLabels/,
  ];

  for (const regex of assertions) {
    assert.match(thContent, regex);
    assert.match(enContent, regex);
  }
});
