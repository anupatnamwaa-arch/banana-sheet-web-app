import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

async function loadSafeToSpend() {
  const source = await readFile(
    new URL("../lib/nana/safe-to-spend.ts", import.meta.url),
    "utf8",
  );
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

test("protects logged expenses, upcoming fixed expenses, and committed saving", async () => {
  const { calculateSafeToSpend } = await loadSafeToSpend();
  const result = calculateSafeToSpend({
    cycleIncome: 30000,
    previousCycleIncome: null,
    expensesLogged: 9000,
    upcomingFixedExpenses: 6000,
    committedSaving: 3000,
    daysRemaining: 12,
  });

  assert.deepEqual({ ...result }, {
    safeToSpendPerDay: 1000,
    flexibleAmount: 12000,
    shortfall: 0,
    isEstimated: false,
    needsIncomeSetup: false,
  });
});

test("clamps a negative daily allowance to zero and exposes the shortfall", async () => {
  const { calculateSafeToSpend } = await loadSafeToSpend();
  const result = calculateSafeToSpend({
    cycleIncome: 10000,
    previousCycleIncome: null,
    expensesLogged: 9000,
    upcomingFixedExpenses: 3000,
    committedSaving: 1000,
    daysRemaining: 10,
  });

  assert.equal(result.safeToSpendPerDay, 0);
  assert.equal(result.flexibleAmount, -3000);
  assert.equal(result.shortfall, 3000);
  assert.equal(result.isEstimated, false);
});

test("uses a labeled previous-cycle income estimate when current-cycle income is missing", async () => {
  const { calculateSafeToSpend } = await loadSafeToSpend();
  const result = calculateSafeToSpend({
    cycleIncome: null,
    previousCycleIncome: 24000,
    expensesLogged: 4000,
    upcomingFixedExpenses: 2000,
    committedSaving: 2400,
    daysRemaining: 12,
  });

  assert.equal(result.safeToSpendPerDay, 1300);
  assert.equal(result.flexibleAmount, 15600);
  assert.equal(result.isEstimated, true);
  assert.equal(result.needsIncomeSetup, false);
});

test("asks for setup when no income or estimate exists", async () => {
  const { calculateSafeToSpend } = await loadSafeToSpend();
  const result = calculateSafeToSpend({
    cycleIncome: null,
    previousCycleIncome: null,
    expensesLogged: 0,
    upcomingFixedExpenses: 0,
    committedSaving: 0,
    daysRemaining: 12,
  });

  assert.deepEqual({ ...result }, {
    safeToSpendPerDay: null,
    flexibleAmount: null,
    shortfall: 0,
    isEstimated: false,
    needsIncomeSetup: true,
  });
});
