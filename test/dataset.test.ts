import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

type SystemId = "C" | "U" | "TCX" | "TPX" | "MP" | "MR" | "DPS" | "DVS";

interface SystemMeta {
  id: SystemId;
  label: string;
  short: string;
  family: string;
  provenance: string;
  source: string;
  license: string;
  count: number;
}

interface Dataset {
  version: 1;
  generated: string;
  systems: SystemMeta[];
  rows: Array<[SystemId, string, string, string]>;
}

const dataset = JSON.parse(
  readFileSync(new URL("../public/data/colors.json", import.meta.url), "utf8"),
) as Dataset;
const manifest = JSON.parse(
  readFileSync(new URL("../data/raw/manifest.json", import.meta.url), "utf8"),
) as { generated: string };

const EXPECTED_COUNTS: Record<SystemId, number> = {
  C: 1341,
  U: 1341,
  TCX: 2800,
  TPX: 2100,
  MP: 349,
  MR: 357,
  DPS: 420,
  DVS: 441,
};

const SYSTEM_ORDER: SystemId[] = ["C", "U", "TCX", "TPX", "MP", "MR", "DPS", "DVS"];

// sha256 of JSON.stringify(rows). Guards against silent source or adapter drift.
const GOLDEN_ROWS_SHA256 = "97d2e38f0421da15624621ba97482c2c951f194330d6089aa7dcc585b55e3134";

const HEX_RE = /^#[0-9A-F]{6}$/;

test("dataset has the eight expected systems in order", () => {
  assert.deepEqual(
    dataset.systems.map((system) => system.id),
    SYSTEM_ORDER,
  );
  assert.equal(dataset.version, 1);
});

test("system metadata counts match the rows", () => {
  for (const system of dataset.systems) {
    const rows = dataset.rows.filter((row) => row[0] === system.id);
    assert.equal(rows.length, EXPECTED_COUNTS[system.id], `${system.id} row count`);
    assert.equal(system.count, rows.length, `${system.id} metadata count`);
    assert.ok(system.label.length > 0, `${system.id} label`);
    assert.ok(system.source.length > 0, `${system.id} source`);
    assert.ok(system.license.length > 0, `${system.id} license`);
  }
});

test("total is 9,149 rows", () => {
  assert.equal(dataset.rows.length, 9149);
  const sum = Object.values(EXPECTED_COUNTS).reduce((total, count) => total + count, 0);
  assert.equal(sum, 9149);
});

test("(system, code) is unique", () => {
  const seen = new Set<string>();
  for (const [system, code] of dataset.rows) {
    const key = `${system}\u0000${code}`;
    assert.ok(!seen.has(key), `duplicate ${system} ${code}`);
    seen.add(key);
  }
});

test("every row has a valid hex, code and name", () => {
  for (const [system, code, name, hex] of dataset.rows) {
    assert.ok(SYSTEM_ORDER.includes(system), `unknown system ${system}`);
    assert.ok(code.length > 0, `${system} empty code`);
    assert.match(hex, HEX_RE, `${system} ${code} hex ${hex}`);
    assert.equal(hex, hex.toUpperCase(), `${system} ${code} hex is not uppercase`);
    assert.ok(name.length >= 1, `${system} ${code} empty name`);
    assert.ok(name.length <= 80, `${system} ${code} name too long`);
    assert.equal(name, name.replace(/\s+/g, " ").trim(), `${system} ${code} name whitespace`);
  }
});

test("generated date matches the manifest", () => {
  assert.equal(dataset.generated, manifest.generated);
  assert.match(dataset.generated, /^\d{4}-\d{2}-\d{2}$/);
});

test("rows are sorted by system order then numeric-aware code", () => {
  const rank = new Map(SYSTEM_ORDER.map((id, index) => [id, index]));
  for (let index = 1; index < dataset.rows.length; index += 1) {
    const previous = dataset.rows[index - 1]!;
    const current = dataset.rows[index]!;
    const previousRank = rank.get(previous[0])!;
    const currentRank = rank.get(current[0])!;
    assert.ok(previousRank <= currentRank, `${previous[0]} sorts after ${current[0]}`);
    if (previousRank === currentRank) {
      const byCode = previous[1].localeCompare(current[1], "en", { numeric: true });
      assert.ok(byCode <= 0, `${previous[1]} sorts after ${current[1]} in ${previous[0]}`);
    }
  }
});

test("golden rows hash matches (source drift guard)", () => {
  const hash = createHash("sha256").update(JSON.stringify(dataset.rows)).digest("hex");
  assert.equal(hash, GOLDEN_ROWS_SHA256);
});

test("TPX and TCX stay separate when codes collide", () => {
  const tcx = dataset.rows.filter((row) => row[0] === "TCX");
  const tpx = dataset.rows.filter((row) => row[0] === "TPX");
  const tpxCodes = new Set(tpx.map((row) => row[1]));
  const collisions = tcx.filter((row) => tpxCodes.has(row[1]));
  assert.ok(collisions.length > 0, "expected shared textile codes between TCX and TPX");
  for (const row of collisions) {
    assert.ok(row[2].length > 0);
  }
});

test("Durak Polysoft and Visco stay separate when codes collide", () => {
  const polysoft = dataset.rows.filter((row) => row[0] === "DPS");
  const visco = dataset.rows.filter((row) => row[0] === "DVS");
  const viscoCodes = new Set(visco.map((row) => row[1]));
  const collisions = polysoft.filter((row) => viscoCodes.has(row[1]));
  assert.ok(collisions.length > 0, "expected shared numeric codes between Polysoft and Visco");
});

test("Durak names use the system fallback", () => {
  const durak = dataset.rows.filter((row) => row[0] === "DPS" || row[0] === "DVS");
  for (const [system, code, name] of durak) {
    const prefix = system === "DPS" ? "Polysoft" : "Visco";
    assert.equal(name, `${prefix} ${code}`);
  }
});
