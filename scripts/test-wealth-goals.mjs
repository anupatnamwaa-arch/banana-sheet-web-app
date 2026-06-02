// scripts/test-wealth-goals.mjs
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

async function loadGoalsHelper() {
  const source = await readFile(
    new URL("../lib/wealth/goals.ts", import.meta.url),
    "utf8",
  );
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  // Mock standard bangkokToday so the test compiles independently
  const mockOverviewUtils = {
    bangkokToday: () => ({ year: 2026, month: 6, day: 2, daysInMonth: 30 })
  };
  vm.runInNewContext(output, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (moduleName) => {
      if (moduleName.endsWith("overview-utils")) {
        return mockOverviewUtils;
      }
      return {};
    }
  });
  return compiledModule.exports;
}

test("a future goal divides the remaining amount across inclusive calendar months", async () => {
  const { calculateGoalMonthlyTarget } = await loadGoalsHelper();
  
  // Today is June 2, 2026. Target is August 15, 2026 (June, July, August = 3 months)
  // Remaining = 30,000 - 9,000 = 21,000. 21,000 / 3 = 7,000
  const result = calculateGoalMonthlyTarget(30000, 9000, "2026-08-15", { year: 2026, month: 6, day: 2 });

  assert.deepEqual({ ...result }, {
    completed: false,
    overdue: false,
    monthlyTarget: 7000,
    remainingMonths: 3,
    remainingAmount: 21000,
  });
});

test("a goal due in the current month recommends the full remaining amount", async () => {
  const { calculateGoalMonthlyTarget } = await loadGoalsHelper();
  
  // Today is June 2, 2026. Target is June 25, 2026 (June only = 1 month)
  // Remaining = 10,000 - 2,000 = 8,000. 8,000 / 1 = 8,000
  const result = calculateGoalMonthlyTarget(10000, 2000, "2026-06-25", { year: 2026, month: 6, day: 2 });

  assert.deepEqual({ ...result }, {
    completed: false,
    overdue: false,
    monthlyTarget: 8000,
    remainingMonths: 1,
    remainingAmount: 8000,
  });
});

test("a completed goal reports completion", async () => {
  const { calculateGoalMonthlyTarget } = await loadGoalsHelper();
  
  // Target = 10,000, Current = 10,000. Completed!
  const result = calculateGoalMonthlyTarget(10000, 10000, "2026-09-30", { year: 2026, month: 6, day: 2 });

  assert.deepEqual({ ...result }, {
    completed: true,
    overdue: false,
    monthlyTarget: null,
    remainingMonths: null,
    remainingAmount: 0,
  });
});

test("an incomplete goal with a past date reports overdue", async () => {
  const { calculateGoalMonthlyTarget } = await loadGoalsHelper();
  
  // Today is June 2, 2026. Target is May 31, 2026. Overdue!
  const result = calculateGoalMonthlyTarget(10000, 4000, "2026-05-31", { year: 2026, month: 6, day: 2 });

  assert.deepEqual({ ...result }, {
    completed: false,
    overdue: true,
    monthlyTarget: null,
    remainingMonths: null,
    remainingAmount: 6000,
  });
});

test("a goal without a date reports no monthly recommendation", async () => {
  const { calculateGoalMonthlyTarget } = await loadGoalsHelper();
  
  const result = calculateGoalMonthlyTarget(10000, 3000, null, { year: 2026, month: 6, day: 2 });

  assert.deepEqual({ ...result }, {
    completed: false,
    overdue: false,
    monthlyTarget: null,
    remainingMonths: null,
    remainingAmount: 7000,
  });
});
