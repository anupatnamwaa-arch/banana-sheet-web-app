import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

async function loadModule(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(output, {
    module: compiledModule,
    exports: compiledModule.exports,
  });
  return compiledModule.exports;
}

test("protects upcoming fixed expenses before recovery, patterns, or payday", async () => {
  const { choosePrimaryMessage } = await loadModule("lib/nana/daily-brief-rules.ts");

  assert.equal(
    choosePrimaryMessage({
      needsIncomeSetup: false,
      hasUpcomingFixedExpensePressure: true,
      safeToSpendStatus: "recovery",
      hasUnusualExpense: true,
      hasMeaningfulIncome: true,
    }),
    "protect_fixed_expenses",
  );
});

test("prioritizes setup when Nana cannot calculate safe-to-spend guidance", async () => {
  const { choosePrimaryMessage, deriveDailyBriefState } = await loadModule(
    "lib/nana/daily-brief-rules.ts",
  );
  const input = {
    needsIncomeSetup: true,
    hasUpcomingFixedExpensePressure: false,
    safeToSpendStatus: "unknown",
    hasUnusualExpense: false,
    hasMeaningfulIncome: false,
  };

  assert.equal(choosePrimaryMessage(input), "setup_income");
  assert.equal(deriveDailyBriefState(input), "setup");
});

test("uses recovery state when safe-to-spend is exhausted", async () => {
  const { choosePrimaryMessage, deriveDailyBriefState } = await loadModule(
    "lib/nana/daily-brief-rules.ts",
  );
  const input = {
    needsIncomeSetup: false,
    hasUpcomingFixedExpensePressure: false,
    safeToSpendStatus: "recovery",
    hasUnusualExpense: false,
    hasMeaningfulIncome: false,
  };

  assert.equal(choosePrimaryMessage(input), "recover_safe_to_spend");
  assert.equal(deriveDailyBriefState(input), "recovery");
});

test("detects meaningful refresh events without refreshing ordinary transactions", async () => {
  const { detectMeaningfulEvent } = await loadModule("lib/nana/daily-brief-rules.ts");

  assert.equal(detectMeaningfulEvent({ hasMeaningfulIncome: true }), "meaningful_income");
  assert.equal(detectMeaningfulEvent({ hasUnusualExpense: true }), "unusual_expense");
  assert.equal(detectMeaningfulEvent({ categoryThresholdCrossed: true }), "category_threshold");
  assert.equal(detectMeaningfulEvent({ paceStateChanged: true }), "pace_state_change");
  assert.equal(detectMeaningfulEvent({ fixedExpenseDueSoon: true }), "fixed_expense_due");
  assert.equal(detectMeaningfulEvent({}), null);
});

test("calculates a healthy score with all five explainable factors", async () => {
  const { calculateMoneyScore } = await loadModule("lib/nana/money-score.ts");
  const result = calculateMoneyScore({
    spendingPaceRatio: 0.8,
    safeToSpendPerDay: 900,
    savingRate: 25,
    savingTargetPct: 20,
    fixedExpensePressureRatio: 0.2,
    loggingStreak: 9,
  });

  assert.ok(result.score >= 70 && result.score <= 100);
  assert.deepEqual(
    Array.from(result.factors, (factor) => factor.key),
    [
      "spending_pace",
      "safe_to_spend",
      "saving_progress",
      "fixed_expense_pressure",
      "logging_consistency",
    ],
  );
  assert.ok(result.factors.every((factor) => factor.status === "good"));
});

test("marks unavailable factor inputs as unknown", async () => {
  const { calculateMoneyScore } = await loadModule("lib/nana/money-score.ts");
  const result = calculateMoneyScore({
    spendingPaceRatio: null,
    safeToSpendPerDay: null,
    savingRate: null,
    savingTargetPct: 20,
    fixedExpensePressureRatio: null,
    loggingStreak: 0,
  });

  assert.equal(
    result.factors.find((factor) => factor.key === "safe_to_spend").status,
    "unknown",
  );
  assert.equal(
    result.factors.find((factor) => factor.key === "saving_progress").status,
    "unknown",
  );
});
