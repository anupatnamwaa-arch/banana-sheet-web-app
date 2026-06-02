import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("overview onboarding multi-keyframe rotation uses a tween transition", async () => {
  const source = await readFile(
    new URL("../app/(dashboard)/overview/_components/UserOnboarding.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /rotate:\s*\[0,\s*5,\s*-5,\s*0\]/);
  assert.match(
    source,
    /rotate:\s*\[0,\s*5,\s*-5,\s*0\][\s\S]*?transition=\{\{\s*type:\s*"tween"/,
  );
});

