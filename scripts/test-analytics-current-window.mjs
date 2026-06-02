import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

async function loadAnalyticsUtils() {
  const source = await readFile(
    new URL("../app/actions/analytics-utils.ts", import.meta.url),
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
    require: (specifier) => {
      if (specifier === "@/app/actions/overview-utils") {
        return { bangkokToday: () => ({ year: 2026, month: 6, day: 2 }) };
      }
      throw new Error(`Unexpected import: ${specifier}`);
    },
  });

  return compiledModule.exports;
}

test("selected period ignores historical rows fetched for analytics averages", async () => {
  const { hasTransactionsInWindow } = await loadAnalyticsUtils();
  const juneWindow = {
    start: "2026-05-31T17:00:00.000Z",
    end: "2026-06-30T17:00:00.000Z",
  };

  assert.equal(typeof hasTransactionsInWindow, "function");
  assert.equal(
    hasTransactionsInWindow(
      [{ date: "2026-05-15T05:00:00.000Z" }],
      juneWindow,
    ),
    false,
  );
  assert.equal(
    hasTransactionsInWindow(
      [{ date: "2026-06-02T05:00:00.000Z" }],
      juneWindow,
    ),
    true,
  );
});

test("analytics transaction fetch paginates beyond Supabase's default row limit", async () => {
  const source = await readFile(
    new URL("../app/actions/analytics.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /ANALYTICS_PAGE_SIZE\s*=\s*1000/);
  assert.match(source, /\.order\("date",\s*\{\s*ascending:\s*true\s*\}\)/);
  assert.match(source, /\.range\(from,\s*from \+ ANALYTICS_PAGE_SIZE - 1\)/);
  assert.match(source, /if \(page\.length < ANALYTICS_PAGE_SIZE\) break/);
});
