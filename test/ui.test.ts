import assert from "node:assert/strict";
import test from "node:test";
import { deltaBand, formatRowCode, formatRowLabel, secondaryName } from "../src/ui.ts";
import { DICTIONARY } from "../src/i18n.ts";
import type { ColorRow } from "../src/types.ts";

function row(code: string, name: string, system: ColorRow["system"] = "C"): ColorRow {
  return { code, name, hex: "#000000", system };
}

test("secondaryName hides a Pantone name that repeats code and system", () => {
  assert.equal(secondaryName(row("186", "186 C"), "C"), "");
  assert.equal(secondaryName(row("186", "186 U", "U"), "U"), "");
});

test("secondaryName keeps a descriptive textile name", () => {
  assert.equal(secondaryName(row("18-1763", "High Risk Red", "TCX"), "TCX"), "High Risk Red");
});

test("secondaryName hides thread names that only repeat product and code", () => {
  assert.equal(secondaryName(row("3095", "Polysoft 3095", "DPS"), "Polysoft"), "");
  assert.equal(secondaryName(row("266", "Visco 266", "DVS"), "Visco"), "");
});

test("secondaryName keeps a real thread colour name", () => {
  assert.equal(secondaryName(row("1637", "Warm Red", "MP"), "Polyneon"), "Warm Red");
});

test("formatRowCode prefixes thread systems and appends pantone suffixes", () => {
  assert.equal(formatRowCode(row("186", "186 C", "C")), "186 C");
  assert.equal(formatRowCode(row("186", "186 U", "U")), "186 U");
  assert.equal(formatRowCode(row("19-4052", "Classic Blue", "TCX")), "19-4052 TCX");
  assert.equal(formatRowCode(row("1610", "Polyneon 1610", "MP")), "Polyneon 1610");
  assert.equal(formatRowCode(row("1147", "Classic 1147", "MR")), "Classic 1147");
  assert.equal(formatRowCode(row("00118", "Polysoft 00118", "DPS")), "Polysoft 00118");
  assert.equal(formatRowCode(row("00118", "Visco 00118", "DVS")), "Visco 00118");
});

test("formatRowLabel builds paste-ready spec labels", () => {
  assert.equal(formatRowLabel(row("186", "186 C", "C"), "Pantone C"), "Pantone 186 C");
  assert.equal(formatRowLabel(row("186", "186 U", "U"), "Pantone U"), "Pantone 186 U");
  assert.equal(
    formatRowLabel(row("19-4052", "Classic Blue", "TCX"), "Pantone TCX"),
    "Pantone 19-4052 TCX",
  );
  assert.equal(
    formatRowLabel(row("1610", "Celestial Blue", "MP"), "Madeira Polyneon 40"),
    "Madeira Polyneon 40 1610",
  );
  assert.equal(
    formatRowLabel(row("1147", "Foxy Red", "MR"), "Madeira Classic 40"),
    "Madeira Classic 40 1147",
  );
  assert.equal(
    formatRowLabel(row("00118", "Polysoft 00118", "DPS"), "Durak Polysoft"),
    "Durak Polysoft 00118",
  );
  assert.equal(
    formatRowLabel(row("00118", "Visco 00118", "DVS"), "Durak Visco"),
    "Durak Visco 00118",
  );
});

test("deltaBand supports TR and EN localized band labels", () => {
  assert.equal(deltaBand(0, "tr").text, "aynı değer");
  assert.equal(deltaBand(0, "en").text, "identical");
  assert.equal(deltaBand(0.8, "tr").text, "neredeyse aynı");
  assert.equal(deltaBand(0.8, "en").text, "near identical");
  assert.equal(deltaBand(1.5, "tr").text, "yakın");
  assert.equal(deltaBand(1.5, "en").text, "close");
  assert.equal(deltaBand(2.5, "tr").text, "fark edilir");
  assert.equal(deltaBand(2.5, "en").text, "noticeable");
  assert.equal(deltaBand(4.0, "tr").text, "zayıf");
  assert.equal(deltaBand(4.0, "en").text, "loose");
  assert.equal(deltaBand(6.0, "tr").text, "yakın eşleşme yok");
  assert.equal(deltaBand(6.0, "en").text, "no close match");
});

test("dictionary has matching keys across languages", () => {
  const trKeys = Object.keys(DICTIONARY.tr).sort();
  const enKeys = Object.keys(DICTIONARY.en).sort();
  assert.deepEqual(trKeys, enKeys);
});

