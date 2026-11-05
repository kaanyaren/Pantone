import assert from "node:assert/strict";
import test from "node:test";

import { parseQuery } from "../src/query.ts";
import type { Query } from "../src/types.ts";

interface ParserCase {
  input: string;
  expected: Query | null;
  label: string;
}

const cases: ParserCase[] = [
  { label: "empty", input: "", expected: null },
  { label: "whitespace only", input: "   \t ", expected: null },

  { label: "hex with hash, six", input: "#C8102E", expected: { kind: "hex", hex: "#C8102E" } },
  { label: "hex lowercase", input: "#c8102e", expected: { kind: "hex", hex: "#C8102E" } },
  { label: "hex shorthand", input: "#fff", expected: { kind: "hex", hex: "#FFFFFF" } },
  { label: "bare six hex", input: "C8102E", expected: { kind: "hex", hex: "#C8102E" } },
  { label: "hex shorthand letters", input: "#abc", expected: { kind: "hex", hex: "#AABBCC" } },
  { label: "bare three hex with digit", input: "f00", expected: { kind: "hex", hex: "#FF0000" } },
  { label: "bare three letters stay text", input: "abc", expected: { kind: "text", text: "abc" } },
  { label: "bare word bee stays text", input: "bee", expected: { kind: "text", text: "bee" } },
  { label: "bare word cab stays text", input: "cab", expected: { kind: "text", text: "cab" } },
  { label: "bare six hex digits", input: "123456", expected: { kind: "hex", hex: "#123456" } },
  { label: "malformed hash", input: "#12", expected: null },
  { label: "malformed hash length", input: "#12345", expected: null },
  { label: "malformed hash chars", input: "#GGGGGG", expected: null },

  {
    label: "rgb function",
    input: "rgb(200, 16, 46)",
    expected: { kind: "rgb", rgb: { r: 200, g: 16, b: 46 } },
  },
  {
    label: "rgb tuple",
    input: "200, 16, 46",
    expected: { kind: "rgb", rgb: { r: 200, g: 16, b: 46 } },
  },
  { label: "rgb out of range", input: "rgb(256, 0, 0)", expected: null },
  { label: "rgb tuple out of range", input: "300, 0, 0", expected: null },
  { label: "rgb missing channel", input: "rgb(1, 2)", expected: null },

  {
    label: "cmyk function",
    input: "cmyk(0, 100, 100, 0)",
    expected: { kind: "cmyk", cmyk: { c: 0, m: 100, y: 100, k: 0 } },
  },
  {
    label: "cmyk tuple",
    input: "0, 100, 100, 0",
    expected: { kind: "cmyk", cmyk: { c: 0, m: 100, y: 100, k: 0 } },
  },
  { label: "cmyk out of range", input: "cmyk(101, 0, 0, 0)", expected: null },
  { label: "cmyk tuple out of range", input: "0, 100, 100, 101", expected: null },
  { label: "cmyk missing channel", input: "cmyk(0, 100, 100)", expected: null },

  { label: "pantone coated", input: "186 C", expected: { kind: "code", system: "C", code: "186" } },
  { label: "pantone prefix stripped", input: "Pantone 186 C", expected: { kind: "code", system: "C", code: "186" } },
  { label: "pantone prefix textile", input: "pantone 19-4052 tcx", expected: { kind: "code", system: "TCX", code: "19-4052" } },
  { label: "pantone coated compact", input: "186c", expected: { kind: "code", system: "C", code: "186" } },
  { label: "pantone uncoated", input: "186 U", expected: { kind: "code", system: "U", code: "186" } },
  {
    label: "pantone tcx",
    input: "19-4052 TCX",
    expected: { kind: "code", system: "TCX", code: "19-4052" },
  },
  {
    label: "pantone tpx compact",
    input: "19-4052tpx",
    expected: { kind: "code", system: "TPX", code: "19-4052" },
  },
  {
    label: "bare textile defaults to TCX",
    input: "19-4052",
    expected: { kind: "code", system: "TCX", code: "19-4052" },
  },
  { label: "bare three digit defaults to C", input: "186", expected: { kind: "code", system: "C", code: "186" } },
  { label: "bare four digit defaults to C", input: "1001", expected: { kind: "code", system: "C", code: "1001" } },
  { label: "bare five digit stays text", input: "00118", expected: { kind: "text", text: "00118" } },

  {
    label: "madeira code with brand is unresolved",
    input: "Madeira 1147",
    expected: { kind: "code", system: null, code: "1147" },
  },
  {
    label: "madeira code with brand, Polyneon range",
    input: "madeira 1610",
    expected: { kind: "code", system: null, code: "1610" },
  },
  {
    label: "madeira polyneon",
    input: "madeira polyneon 1878",
    expected: { kind: "code", system: "MP", code: "1878" },
  },
  {
    label: "madeira product only",
    input: "Polyneon 1878",
    expected: { kind: "code", system: "MP", code: "1878" },
  },
  {
    label: "madeira rayon",
    input: "rayon 1001",
    expected: { kind: "code", system: "MR", code: "1001" },
  },
  {
    label: "madeira rayon with brand",
    input: "MADEIRA RAYON 1001",
    expected: { kind: "code", system: "MR", code: "1001" },
  },
  {
    label: "madeira classic",
    input: "classic 1147",
    expected: { kind: "code", system: "MR", code: "1147" },
  },
  {
    label: "madeira classic with brand",
    input: "MADEIRA CLASSIC 1147",
    expected: { kind: "code", system: "MR", code: "1147" },
  },

  {
    label: "durak polysoft",
    input: "Durak Polysoft 00118",
    expected: { kind: "code", system: "DPS", code: "00118" },
  },
  {
    label: "durak polysoft product only",
    input: "polysoft 00118",
    expected: { kind: "code", system: "DPS", code: "00118" },
  },
  {
    label: "durak visco",
    input: "Visco 00144",
    expected: { kind: "code", system: "DVS", code: "00144" },
  },
  {
    label: "durak short code",
    input: "Polysoft 10",
    expected: { kind: "code", system: "DPS", code: "10" },
  },
  {
    label: "durak three digit code",
    input: "Visco 266",
    expected: { kind: "code", system: "DVS", code: "266" },
  },
  {
    label: "named pantone code with system",
    input: "Black 2 C",
    expected: { kind: "code", system: "C", code: "Black 2" },
  },
  {
    label: "named pantone code with uncoated system",
    input: "Cool Gray 11 U",
    expected: { kind: "code", system: "U", code: "Cool Gray 11" },
  },

  { label: "free text name", input: "classic blue", expected: { kind: "text", text: "classic blue" } },
  { label: "free text trims", input: "  fiery red  ", expected: { kind: "text", text: "fiery red" } },
  { label: "unknown suffix stays text", input: "19-4052 XYZ", expected: { kind: "text", text: "19-4052 XYZ" } },
];

test("parseQuery grammar table", () => {
  for (const { input, expected, label } of cases) {
    assert.deepEqual(parseQuery(input), expected, label);
  }
});

test("parseQuery ambiguity: bare 1001 is Pantone C", () => {
  assert.deepEqual(parseQuery("1001"), { kind: "code", system: "C", code: "1001" });
});

test("parseQuery ambiguity: madeira 1001 leaves system unresolved", () => {
  assert.deepEqual(parseQuery("madeira 1001"), { kind: "code", system: null, code: "1001" });
});

test("parseQuery ambiguity: rayon 1001 is Rayon", () => {
  assert.deepEqual(parseQuery("rayon 1001"), { kind: "code", system: "MR", code: "1001" });
});

test("parseQuery preserves Durak and Madeira leading zeros", () => {
  assert.deepEqual(parseQuery("polysoft 00118"), {
    kind: "code",
    system: "DPS",
    code: "00118",
  });
  assert.deepEqual(parseQuery("polyneon 0042"), {
    kind: "code",
    system: "MP",
    code: "0042",
  });
});
