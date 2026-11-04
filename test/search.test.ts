import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { searchColors } from "../src/search.ts";
import type { ColorRow, Dataset } from "../src/types.ts";

const fixturePath = fileURLToPath(
  new URL("../test/fixtures/colors.sample.json", import.meta.url),
);

function loadFixture(): ColorRow[] {
  const dataset = JSON.parse(readFileSync(fixturePath, "utf8")) as Dataset;
  return dataset.rows.map(([system, code, name, hex]) => ({ system, code, name, hex }));
}

// The checked-in fixture has one row per system but no Classic Blue row.
// Append it here so the name-search cases mirror the plan's example.
const classicBlue: ColorRow = {
  system: "TCX",
  code: "19-4052",
  name: "Classic Blue",
  hex: "#0F4C81",
};

test("search finds an exact Pantone code with suffix", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "186 C");
  assert.equal(results[0]?.system, "C");
  assert.equal(results[0]?.code, "186");
});

test("search finds an exact compact Pantone code", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "186c");
  assert.equal(results[0]?.system, "C");
  assert.equal(results[0]?.code, "186");
});

test("search prefers the requested Pantone substrate", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "186 U");
  assert.equal(results[0]?.system, "U");
  assert.equal(results[0]?.code, "186");
});

test("search finds a textile code with its system suffix", () => {
  const rows = [...loadFixture(), classicBlue];
  const results = searchColors(rows, "19-4052 TCX");
  assert.equal(results[0]?.system, "TCX");
  assert.equal(results[0]?.code, "19-4052");
});

test("search finds a Madeira code", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "madeira 1147");
  assert.equal(results[0]?.system, "MP");
  assert.equal(results[0]?.code, "1147");
});

test("search finds a Durak code with leading zero", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "polysoft 00118");
  assert.equal(results[0]?.system, "DPS");
  assert.equal(results[0]?.code, "00118");
});

test("search finds a bare Durak-style code with a precomputed haystack", () => {
  const rows: ColorRow[] = [
    { system: "DPS", code: "00118", name: "", hex: "#5B5951" },
    { system: "DVS", code: "00118", name: "Visco 00118", hex: "#A9ACA9" },
  ];
  const results = searchColors(rows, "00118");
  assert.equal(results.length, 2);
  assert.equal(results[0]?.system, "DPS");
});

test("search matches an exact colour name token", () => {
  const rows = [...loadFixture(), classicBlue];
  const results = searchColors(rows, "classic blue");
  assert.equal(results[0]?.name, "Classic Blue");
});

test("search matches a fixture name in both textile systems", () => {
  const rows = loadFixture();
  const results = searchColors(rows, "true red");
  assert.deepEqual(
    results.slice(0, 2).map((row) => row.system),
    ["TCX", "TPX"],
  );
});

test("search tolerates a typo through ordered subsequence", () => {
  const rows = [...loadFixture(), classicBlue];
  const results = searchColors(rows, "clasic blue");
  assert.equal(results[0]?.name, "Classic Blue");
});

test("search is case-insensitive", () => {
  const rows = [...loadFixture(), classicBlue];
  assert.equal(searchColors(rows, "CLASSIC BLUE")[0]?.name, "Classic Blue");
});

test("search caps results at the requested limit", () => {
  const rows: ColorRow[] = Array.from({ length: 120 }, (_, index) => ({
    system: "C",
    code: String(100 + index),
    name: `Test Red ${index}`,
    hex: "#C8102E",
  }));

  assert.equal(searchColors(rows, "red", 10).length, 10);
  assert.equal(searchColors(rows, "red").length, 50);
  assert.equal(searchColors(rows, "red", 0).length, 0);
  assert.equal(searchColors(rows, "red", 200).length, 120);
});

test("search returns nothing for an empty query", () => {
  const rows = loadFixture();
  assert.deepEqual(searchColors(rows, "   "), []);
});
