import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { converter, formatHex } from "culori";

/**
 * Builds public/data/colors.json from the committed raw snapshots.
 *
 * The output is deterministic: `generated` comes from data/raw/manifest.json,
 * never from the clock. Every source is verified against its recorded sha256
 * before it is parsed, so silent source drift cannot reach the dataset.
 */

type SystemId = "C" | "U" | "TCX" | "TPX" | "MP" | "MR" | "DPS" | "DVS";
type Family = "pantone" | "madeira" | "durak";
type Provenance = "community" | "manufacturer" | "legacy";

interface SystemMeta {
  id: SystemId;
  label: string;
  short: string;
  family: Family;
  provenance: Provenance;
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

interface ManifestSource {
  id: string;
  system: SystemId;
  url: string;
  homepage?: string;
  file: string;
  sha256: string;
  license: string;
  retrieved: string;
  provenance: Provenance;
  expectedCount: number;
}

interface Manifest {
  generated: string;
  sources: ManifestSource[];
}

interface ParsedRow {
  code: string;
  name: string;
  hex: string;
}

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

const SYSTEM_META: Omit<SystemMeta, "count">[] = [
  {
    id: "C",
    label: "Pantone Düz Kaplı",
    short: "C",
    family: "pantone",
    provenance: "community",
    source: "Pantoner",
    license: "MIT",
  },
  {
    id: "U",
    label: "Pantone Düz Kaplamasız",
    short: "U",
    family: "pantone",
    provenance: "community",
    source: "Pantoner",
    license: "MIT",
  },
  {
    id: "TCX",
    label: "Pantone TCX",
    short: "TCX",
    family: "pantone",
    provenance: "community",
    source: "pedroduke/pantone-tcx",
    license: "ISC",
  },
  {
    id: "TPX",
    label: "Pantone TPX (eski)",
    short: "TPX",
    family: "pantone",
    provenance: "legacy",
    source: "color-books",
    license: "No license file",
  },
  {
    id: "MP",
    label: "Madeira Polyneon 40",
    short: "Polyneon",
    family: "madeira",
    provenance: "manufacturer",
    source: "Ink/Stitch",
    license: "GPL-3.0",
  },
  {
    id: "MR",
    label: "Madeira Rayon 40",
    short: "Rayon",
    family: "madeira",
    provenance: "manufacturer",
    source: "Ink/Stitch",
    license: "GPL-3.0",
  },
  {
    id: "DPS",
    label: "Durak Polysoft",
    short: "Polysoft",
    family: "durak",
    provenance: "manufacturer",
    source: "Durak dijital renk kartı",
    license: "manufacturer permission (not public)",
  },
  {
    id: "DVS",
    label: "Durak Visco",
    short: "Visco",
    family: "durak",
    provenance: "manufacturer",
    source: "Durak dijital renk kartı",
    license: "manufacturer permission (not public)",
  },
];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "data", "raw");
const MANIFEST_PATH = join(RAW_DIR, "manifest.json");
const OUTPUT_PATH = join(ROOT, "public", "data", "colors.json");

const HEX_RE = /^#[0-9A-F]{6}$/;

function fail(message: string): never {
  console.error(`build-data: ${message}`);
  process.exit(1);
}

function normalizeHex(raw: string, context: string): string {
  const value = raw.trim().toUpperCase();
  const expanded = /^#[0-9A-F]{3}$/.test(value)
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    : value;
  if (!HEX_RE.test(expanded)) {
    fail(`${context}: invalid hex ${JSON.stringify(raw)}`);
  }
  return expanded;
}

function cleanName(raw: string, context: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 1 || name.length > 80) {
    fail(`${context}: name length out of range (${name.length})`);
  }
  return name;
}

function cleanCode(raw: string, context: string): string {
  const code = raw.replace(/\s+/g, " ").trim();
  if (code.length < 1) fail(`${context}: empty code`);
  return code;
}

function stripPantoneSuffix(value: string, suffix: "C" | "U" | "TCX" | "TPX"): string {
  return value
    .replace(/^PANTONE\s+/i, "")
    .replace(new RegExp(`\\s*${suffix}$`, "i"), "")
    .trim();
}

/** "warm-gray-1-c" -> "Warm Gray 1"; "100-c" -> "100". */
function solidCode(code: string, suffix: "C" | "U"): string {
  const base = code.replace(new RegExp(`-${suffix}$`, "i"), "");
  return base
    .split("-")
    .map((part) => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function parseSolid(raw: unknown, suffix: "C" | "U", sourceId: string): ParsedRow[] {
  if (!Array.isArray(raw)) fail(`${sourceId}: expected a JSON array`);
  return raw.map((entry, index) => {
    const record = entry as { pantone?: unknown; hex?: unknown };
    if (typeof record.pantone !== "string" || typeof record.hex !== "string") {
      fail(`${sourceId}[${index}]: expected { pantone, hex } strings`);
    }
    const code = cleanCode(solidCode(record.pantone.trim(), suffix), `${sourceId}[${index}]`);
    return {
      code,
      name: cleanName(`${code} ${suffix}`, `${sourceId}[${index}]`),
      hex: normalizeHex(record.hex, `${sourceId}[${index}]`),
    };
  });
}

async function parseTcx(file: string, sourceId: string): Promise<ParsedRow[]> {
  const module = (await import(pathToFileURL(file).href)) as {
    pantoneColors?: Array<{ name?: unknown; hex?: unknown; tcx?: unknown }>;
  };
  if (!Array.isArray(module.pantoneColors)) fail(`${sourceId}: pantoneColors export missing`);
  return module.pantoneColors.map((entry, index) => {
    if (
      typeof entry.name !== "string" ||
      typeof entry.hex !== "string" ||
      typeof entry.tcx !== "string"
    ) {
      fail(`${sourceId}[${index}]: expected { name, hex, tcx } strings`);
    }
    return {
      code: cleanCode(entry.tcx, `${sourceId}[${index}]`),
      name: cleanName(entry.name, `${sourceId}[${index}]`),
      hex: normalizeHex(entry.hex, `${sourceId}[${index}]`),
    };
  });
}

function parseTpx(raw: unknown, sourceId: string): ParsedRow[] {
  const records = (raw as { records?: unknown }).records;
  if (!records || typeof records !== "object") fail(`${sourceId}: expected a records object`);
  const rgb = converter("rgb");
  return Object.entries(records as Record<string, { components?: unknown }>).map(
    ([key, record], index) => {
      const components = record?.components;
      if (
        !Array.isArray(components) ||
        components.length !== 3 ||
        !components.every((value) => typeof value === "number" && Number.isFinite(value))
      ) {
        fail(`${sourceId}[${index}]: expected Lab components [L, a, b]`);
      }
      const [l, a, b] = components as [number, number, number];
      const hex = formatHex(rgb({ mode: "lab", l, a, b }));
      const code = cleanCode(stripPantoneSuffix(key, "TPX"), `${sourceId}[${index}]`);
      return {
        code,
        name: cleanName(code, `${sourceId}[${index}]`),
        hex: normalizeHex(hex, `${sourceId}[${index}]`),
      };
    },
  );
}

function parseGpl(text: string, sourceId: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (
      index === 0 && trimmed === "GIMP Palette" ||
      /^Name:/i.test(trimmed) ||
      /^Columns:/i.test(trimmed) ||
      trimmed.startsWith("#")
    ) {
      continue;
    }
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 5) continue;
    const [r, g, b] = tokens;
    if (![r, g, b].every((value) => /^\d+$/.test(value ?? ""))) {
      fail(`${sourceId}:${index + 1}: expected R G B at line start`);
    }
    const channels = [r, g, b].map((value) => Number(value));
    if (channels.some((value) => value < 0 || value > 255)) {
      fail(`${sourceId}:${index + 1}: RGB channel out of range`);
    }
    // Ink/Stitch places the numeric thread code last and the name in between.
    const code = tokens.at(-1) ?? "";
    if (!/^\d+$/.test(code)) fail(`${sourceId}:${index + 1}: code is not numeric (${code})`);
    const name = tokens.slice(3, -1).join(" ");
    rows.push({
      code: cleanCode(code, `${sourceId}:${index + 1}`),
      name: cleanName(name, `${sourceId}:${index + 1}`),
      hex: normalizeHex(
        `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`,
        `${sourceId}:${index + 1}`,
      ),
    });
  }
  return rows;
}

function parseDurak(raw: unknown, sourceId: string, short: string): ParsedRow[] {
  const columns = (raw as { kartelaColumns?: unknown }).kartelaColumns;
  if (!Array.isArray(columns)) fail(`${sourceId}: expected kartelaColumns array`);
  const rows: ParsedRow[] = [];
  for (const [columnIndex, column] of columns.entries()) {
    const colors = (column as { kartelaColors?: unknown }).kartelaColors;
    if (!Array.isArray(colors)) fail(`${sourceId}: column ${columnIndex} has no kartelaColors`);
    for (const [colorIndex, color] of colors.entries()) {
      const record = color as { colorCode?: unknown; colorHexCode?: unknown };
      if (typeof record.colorCode !== "string" && typeof record.colorCode !== "number") {
        fail(`${sourceId}[${columnIndex}][${colorIndex}]: missing colorCode`);
      }
      if (typeof record.colorHexCode !== "string") {
        fail(`${sourceId}[${columnIndex}][${colorIndex}]: missing colorHexCode`);
      }
      const code = cleanCode(String(record.colorCode), `${sourceId}[${columnIndex}][${colorIndex}]`);
      rows.push({
        code,
        name: cleanName(`${short} ${code}`, `${sourceId}[${columnIndex}][${colorIndex}]`),
        hex: normalizeHex(record.colorHexCode, `${sourceId}[${columnIndex}][${colorIndex}]`),
      });
    }
  }
  return rows;
}

function naturalCompare(left: string, right: string): number {
  const leftParts = left.match(/\d+|\D+/g) ?? [];
  const rightParts = right.match(/\d+|\D+/g) ?? [];
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const a = leftParts[index];
    const b = rightParts[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    const aNumeric = /^\d+$/.test(a);
    const bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) {
      const difference = Number(a) - Number(b);
      if (difference !== 0) return difference;
    } else if (a !== b) {
      return a.localeCompare(b, "en", { sensitivity: "base" });
    }
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function parseSource(source: ManifestSource, text: string): ParsedRow[] {
  switch (source.system) {
    case "C":
      return parseSolid(JSON.parse(text), "C", source.id);
    case "U":
      return parseSolid(JSON.parse(text), "U", source.id);
    case "TCX":
      return []; // replaced below by the async TCX adapter
    case "TPX":
      return parseTpx(JSON.parse(text), source.id);
    case "MP":
      return parseGpl(text, source.id);
    case "MR":
      return parseGpl(text, source.id);
    case "DPS":
      return parseDurak(JSON.parse(text), source.id, "Polysoft");
    case "DVS":
      return parseDurak(JSON.parse(text), source.id, "Visco");
    default:
      fail(`${source.id}: unknown system ${JSON.stringify(source.system)}`);
  }
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes("--check");
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as Manifest;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.generated)) {
    fail(`manifest generated is not an ISO date: ${manifest.generated}`);
  }
  if (manifest.sources.length !== SYSTEM_ORDER.length) {
    fail(`manifest has ${manifest.sources.length} sources, expected ${SYSTEM_ORDER.length}`);
  }

  const rows: Dataset["rows"] = [];
  const seen = new Set<string>();
  const counts = new Map<SystemId, number>();
  const summary: Array<{ source: ManifestSource; count: number; sha: string }> = [];

  for (const source of manifest.sources) {
    if (!SYSTEM_ORDER.includes(source.system)) {
      fail(`${source.id}: system ${source.system} is not in the dataset schema`);
    }
    const expected = EXPECTED_COUNTS[source.system];
    if (source.expectedCount !== expected) {
      fail(
        `${source.id}: manifest expects ${source.expectedCount}, contract expects ${expected}` +
          " — update the manifest deliberately, do not drift",
      );
    }
    const file = join(RAW_DIR, source.file);
    const buffer = await readFile(file);
    const actualSha = createHash("sha256").update(buffer).digest("hex");
    if (actualSha !== source.sha256) {
      fail(`${source.id}: sha256 mismatch for ${source.file} (${actualSha} != ${source.sha256})`);
    }

    const text = buffer.toString("utf8");
    const parsed =
      source.system === "TCX"
        ? await parseTcx(file, source.id)
        : parseSource(source, text);

    if (parsed.length !== expected) {
      fail(
        `${source.id}: parsed ${parsed.length} rows, expected ${expected}` +
          " — source changed; investigate before regenerating",
      );
    }

    for (const row of parsed) {
      const key = `${source.system}\u0000${row.code}`;
      if (seen.has(key)) fail(`${source.id}: duplicate (system, code) ${source.system}/${row.code}`);
      seen.add(key);
      rows.push([source.system, row.code, row.name, row.hex]);
    }
    counts.set(source.system, parsed.length);
    summary.push({ source, count: parsed.length, sha: actualSha });
  }

  const total = rows.reduce((sum, row) => sum + 1, 0);
  const expectedTotal = SYSTEM_ORDER.reduce((sum, id) => sum + EXPECTED_COUNTS[id], 0);
  if (total !== expectedTotal) fail(`total rows ${total}, expected ${expectedTotal}`);

  const systemRank = new Map(SYSTEM_ORDER.map((id, index) => [id, index]));
  rows.sort((left, right) => {
    const rank = (systemRank.get(left[0]) ?? 99) - (systemRank.get(right[0]) ?? 99);
    if (rank !== 0) return rank;
    const byCode = naturalCompare(left[1], right[1]);
    if (byCode !== 0) return byCode;
    return naturalCompare(left[3], right[3]);
  });

  const systems: SystemMeta[] = SYSTEM_META.map((meta) => {
    const count = counts.get(meta.id);
    if (count === undefined) fail(`no rows parsed for system ${meta.id}`);
    if (count !== EXPECTED_COUNTS[meta.id]) {
      fail(`system ${meta.id}: count ${count}, expected ${EXPECTED_COUNTS[meta.id]}`);
    }
    return { ...meta, count };
  });

  const dataset: Dataset = {
    version: 1,
    generated: manifest.generated,
    systems,
    rows,
  };

  const output = `${JSON.stringify(dataset, null, 2)}\n`;
  const rowsHash = sha256(JSON.stringify(rows));

  console.log("system  count  source             sha256");
  for (const { source, count, sha } of summary) {
    console.log(
      `${source.system.padEnd(6)}  ${String(count).padStart(5)}  ${source.id.padEnd(18)} ${sha}`,
    );
  }
  console.log(`total   ${String(total).padStart(5)}  rows sha256 ${rowsHash}`);

  if (checkOnly) {
    let existing = "";
    try {
      existing = await readFile(OUTPUT_PATH, "utf8");
    } catch {
      fail("public/data/colors.json is missing; run npm run data");
    }
    if (existing !== output) fail("public/data/colors.json is stale; run npm run data");
    console.log("check ok: public/data/colors.json is up to date");
    return;
  }

  await writeFile(OUTPUT_PATH, output);
  console.log(`wrote public/data/colors.json (${Buffer.byteLength(output)} bytes)`);
}

await main();
