import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Nana Home component set fulfills design spec constraints", async () => {
  const [hero, guide, details, summary, support, indexFile] = await Promise.all([
    read("app/(dashboard)/overview/_components/nana/NanaHero.tsx"),
    read("app/(dashboard)/overview/_components/nana/NanaGuide.tsx"),
    read("app/(dashboard)/overview/_components/nana/NanaBriefDetails.tsx"),
    read("app/(dashboard)/overview/_components/nana/NanaCompactSummary.tsx"),
    read("app/(dashboard)/overview/_components/nana/NanaAdaptiveSupport.tsx"),
    read("app/(dashboard)/overview/_components/nana/index.ts"),
  ]);

  // Supports states: normal, attention, recovery, payday, setup
  assert.match(hero, /normal/);
  assert.match(hero, /attention/);
  assert.match(hero, /recovery/);
  assert.match(hero, /payday/);
  assert.match(hero, /setup/);

  // Contains "ดูรายละเอียด" toggle or similar label
  assert.match(hero, /ดูรายละเอียด/);

  // Contains "บันทึกรายจ่าย" link or similar label
  assert.match(hero, /บันทึกรายจ่าย/);

  // NanaHero imports NanaGuide, NanaBriefDetails, NanaCompactSummary, and NanaAdaptiveSupport
  assert.match(hero, /NanaGuide/);
  assert.match(hero, /NanaBriefDetails/);
  assert.match(hero, /NanaCompactSummary/);
  assert.match(hero, /NanaAdaptiveSupport/);

  // Shows small score and streak presentation
  assert.match(hero, /streak/i);
  assert.match(hero, /score/i);

  // Keep Nana pose SVG lightweight and state-driven (no charts in hero or supporting)
  assert.doesNotMatch(hero, /Chart/);
  assert.doesNotMatch(guide, /Chart/);
  assert.doesNotMatch(details, /Chart/);
  assert.doesNotMatch(summary, /Chart/);
  assert.doesNotMatch(support, /Chart/);

  // Exports from index
  assert.match(indexFile, /export \* from ["']\.\/NanaHero["']/);
  assert.match(indexFile, /export \* from ["']\.\/NanaGuide["']/);
  assert.match(indexFile, /export \* from ["']\.\/NanaBriefDetails["']/);
  assert.match(indexFile, /export \* from ["']\.\/NanaCompactSummary["']/);
  assert.match(indexFile, /export \* from ["']\.\/NanaAdaptiveSupport["']/);
});
