import type { ColorRow, SystemId } from "./types.ts";
import { parseQuery } from "./query.ts";

const DEFAULT_LIMIT = 50;
const SYSTEM_BOOST = 30;

interface IndexedRow {
  row: ColorRow;
  code: string;
  codeCompact: string;
  name: string;
  nameTokens: string[];
  nameCompact: string;
  order: number;
}

interface SearchContext {
  query: string;
  tokens: string[];
  queryCompact: string;
  code: string | null;
  codeCompact: string;
  system: SystemId | null;
}

const indexCache = new WeakMap<ColorRow[], IndexedRow[]>();

function compact(value: string): string {
  return value.replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenize(value: string): string[] {
  return value.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function buildIndex(rows: ColorRow[]): IndexedRow[] {
  return rows.map((row, order) => {
    const name = (row.name ?? "").toLowerCase().trim();
    const code = (row.code ?? "").toLowerCase().trim();
    return {
      row,
      code,
      codeCompact: compact(code),
      name,
      nameTokens: tokenize(name),
      nameCompact: compact(name),
      order,
    };
  });
}

function getIndex(rows: ColorRow[]): IndexedRow[] {
  const cached = indexCache.get(rows);
  if (cached) return cached;
  const built = buildIndex(rows);
  indexCache.set(rows, built);
  return built;
}

/**
 * Pull a code-looking token out of free text, e.g.
 * "Madeira Polyneon 1147" -> "1147", "19-4052 TCX" -> "19-4052".
 */
function extractCode(input: string): string | null {
  let value = input.trim().toLowerCase().replace(/\s+/g, " ");
  value = value.replace(/^pantone\s+/, "");

  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const prefix of ["madeira", "durak", "polyneon", "rayon", "polysoft", "visco"]) {
      if (value.startsWith(`${prefix} `)) {
        value = value.slice(prefix.length + 1).trim();
        stripped = true;
      }
    }
  }

  value = value.replace(/\s+/g, "");
  const suffixed = value.match(/^(.*?)(tcx|tpx|c|u)$/);
  if (suffixed) {
    const core = suffixed[1] ?? "";
    if (/^\d{2,6}(?:-\d{2,6})?$/.test(core)) value = core;
  }

  return /^\d{2,6}(?:-\d{2,6})?$/.test(value) ? value : null;
}

function buildContext(text: string): SearchContext {
  const parsed = parseQuery(text);
  const query = text.trim().toLowerCase().replace(/\s+/g, " ");

  let code: string | null = null;
  let system: SystemId | null = null;

  if (parsed?.kind === "code") {
    code = parsed.code.toLowerCase();
    system = parsed.system;
  } else if (parsed?.kind === "text") {
    // Bare 5-6 digit thread codes are free text under the parser grammar but
    // should still match their code in search.
    code = extractCode(text);
  }

  return {
    query,
    tokens: tokenize(query),
    queryCompact: compact(query),
    code,
    codeCompact: code ? compact(code) : "",
    system,
  };
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return false;
  let position = 0;
  for (const char of haystack) {
    if (char === needle[position]) position += 1;
    if (position === needle.length) return true;
  }
  return false;
}

function scoreRow(item: IndexedRow, context: SearchContext): number {
  let score = 0;

  // Exact code, with or without system suffix.
  if (context.code) {
    const exact =
      item.code === context.code ||
      (context.codeCompact.length > 0 && item.codeCompact === context.codeCompact);

    if (exact) {
      score = 1000;
    } else if (
      (context.code.length > 1 && item.code.startsWith(context.code)) ||
      (context.codeCompact.length > 1 && item.codeCompact.startsWith(context.codeCompact))
    ) {
      score = 800;
    }

    if (score > 0 && context.system && item.row.system === context.system) {
      score += SYSTEM_BOOST;
    }
  }

  if (score >= 600) return score;

  // Exact name token.
  if (
    context.tokens.length > 0 &&
    context.tokens.every((token) => item.nameTokens.includes(token))
  ) {
    return Math.max(score, 600);
  }

  // Name token prefix.
  if (
    context.tokens.length > 0 &&
    context.tokens.every((token) => item.nameTokens.some((nameToken) => nameToken.startsWith(token)))
  ) {
    return Math.max(score, 400);
  }

  // Name substring.
  if (context.query && item.name.includes(context.query)) {
    return Math.max(score, 300);
  }

  // Ordered subsequence, for typos and dropped letters.
  if (context.queryCompact && isSubsequence(context.queryCompact, item.nameCompact)) {
    return Math.max(score, 100);
  }

  return score;
}

/**
 * Rank rows against a text or code query. Results are capped at `limit`
 * (default 50). No external search library, no DOM, no fetching.
 */
export function searchColors(rows: ColorRow[], text: string, limit = DEFAULT_LIMIT): ColorRow[] {
  if (typeof text !== "string") return [];
  const capped = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : DEFAULT_LIMIT;
  if (capped === 0) return [];

  // ponytail: 200-char cap, names run <=80 chars; bounds subsequence cost + URL length.
  const raw = text.trim().slice(0, 200);
  if (!raw) return [];

  const context = buildContext(raw);
  const index = getIndex(rows);

  const ranked: Array<{ item: IndexedRow; score: number }> = [];
  for (const item of index) {
    const score = scoreRow(item, context);
    if (score > 0) ranked.push({ item, score });
  }

  ranked.sort((a, b) => b.score - a.score || a.item.order - b.item.order);
  return ranked.slice(0, capped).map((entry) => entry.item.row);
}
