import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("app/globals.css includes Nana theme tokens", async () => {
  const css = await read("app/globals.css");

  // Verify warm light and quiet dark tokens
  assert.match(css, /--nana-surface/);
  assert.match(css, /--nana-surface-soft/);
  assert.match(css, /--nana-ink/);
  assert.match(css, /--nana-muted/);
  assert.match(css, /--nana-banana/);

  // Assert it doesn't have neon box shadows for Nana controls
  assert.equal(css.includes("neon") && css.includes("nana"), false);
});
