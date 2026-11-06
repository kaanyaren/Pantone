import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCount,
  matchesFilter,
  resultsToTsv,
  type ResultsView,
} from "../src/ui.ts";
import { DICTIONARY } from "../src/i18n.ts";
import type { SystemResult } from "../src/ui.ts";

const META_BY_ID = {
  C: { label: "Pantone C", short: "C", family: "pantone" },
  MP: { label: "Madeira Polyneon 40", short: "MP", family: "madeira" },
} as const;

function system(
  id: "C" | "MP",
  matches: SystemResult["matches"],
  extra: Partial<SystemResult> = {},
): SystemResult {
  const meta = META_BY_ID[id];
  return {
    meta: {
      id,
      label: meta.label,
      short: meta.short,
      family: meta.family,
      provenance: "legacy",
      source: "test",
      license: "test",
      count: matches.length,
    },
    matches,
    sameCode: null,
    sameCodeIsInput: false,
    exact: false,
    noClose: false,
    ...extra,
  };
}

const row = { system: "C" as const, code: "186", name: "High Risk Red", hex: "#C8102E" };

function view(systems: SystemResult[]): ResultsView {
  return { inputHex: "#C8102E", inputLabel: "186 C", systems, closest: null };
}

test("matchesFilter routes every system to exactly one family filter", () => {
  const cases = [
    ["C", "print"],
    ["U", "print"],
    ["TCX", "textile"],
    ["TPX", "textile"],
    ["MP", "madeira"],
    ["MR", "madeira"],
    ["DPS", "durak"],
    ["DVS", "durak"],
  ] as const;
  const families = ["print", "textile", "madeira", "durak"] as const;
  for (const [id, filter] of cases) {
    assert.equal(matchesFilter(id, "all"), true);
    for (const family of families) {
      assert.equal(matchesFilter(id, family), family === filter, `${id} in ${family}`);
    }
  }
});

test("formatCount groups per locale", () => {
  assert.equal(formatCount(9149, "tr"), "9.149");
  assert.equal(formatCount(9149, "en"), "9,149");
});

test("colorsCount handles the English singular", () => {
  assert.equal(DICTIONARY.en.colorsCount("1"), "1 color");
  assert.equal(DICTIONARY.en.colorsCount("2"), "2 colors");
  assert.equal(DICTIONARY.tr.colorsCount("1"), "1 renk");
  assert.equal(DICTIONARY.tr.colorsCount("2"), "2 renk");
});

function line(lines: string[], i: number): string {
  const value = lines[i];
  assert.ok(value !== undefined, `expected line ${i}`);
  return value;
}

test("resultsToTsv emits a localized header and one line per system", () => {
  const v = view([
    system("C", [{ row, deltaE: 0, mappedHex: "#C8102E", clipped: false }], { exact: true }),
  ]);
  const tr = resultsToTsv(v, "tr").split("\n");
  assert.equal(line(tr, 0), "Sistem\tKod\tAd\tHex\tRGB\tCMYK\tDeltaE00\tAralık");
  assert.match(line(tr, 1), /^Pantone C\t186\tHigh Risk Red\t#C8102E\t/);
  assert.match(line(tr, 1), /\t0\.00\tAynı$/);
  const en = resultsToTsv(v, "en").split("\n");
  assert.equal(line(en, 0), "System\tCode\tName\tHex\tRGB\tCMYK\tDeltaE00\tBand");
  assert.match(line(en, 1), /\t0\.00\tidentical$/);
});

test("resultsToTsv formats non-zero deltas with converted coordinates", () => {
  const v = view([
    system("C", [{ row, deltaE: 1.5, mappedHex: "#C8102E", clipped: false }]),
  ]);
  const tr = resultsToTsv(v, "tr").split("\n");
  assert.match(line(tr, 1), /#C8102E\t200 16 46\t\d+ \d+ \d+ \d+\t1\.50\thafif fark$/);
  const en = resultsToTsv(v, "en").split("\n");
  assert.match(line(en, 1), /\t1\.50\tclose$/);
});

test("resultsToTsv marks libraries without a close match instead of dropping them", () => {
  const v = view([
    system("MP", [{ row: { ...row, system: "MP", code: "1637" }, deltaE: 9.99, mappedHex: "#000000", clipped: false }], {
      noClose: true,
    }),
  ]);
  const lines = resultsToTsv(v, "en").split("\n");
  assert.equal(lines.length, 2);
  assert.match(line(lines, 1), /^Madeira Polyneon 40\t\t\t\t\t\t\tno close match$/);
});

test("resultsToTsv keeps systems with zero matches as blank lines", () => {
  const v = view([system("MP", [])]);
  const lines = resultsToTsv(v, "en").split("\n");
  assert.equal(lines.length, 2);
  assert.match(line(lines, 1), /^Madeira Polyneon 40\t\t\t\t\t\t\tno close match$/);
});
