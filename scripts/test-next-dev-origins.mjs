import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Next dev server allows the 127.0.0.1 preview origin", async () => {
  const config = await readFile(
    new URL("../next.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(config, /allowedDevOrigins:\s*\[\s*"127\.0\.0\.1"\s*\]/);
});

