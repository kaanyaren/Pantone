import type { CMYK, Query, RGB, SystemId } from "./types.ts";

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const PANTONE_SUFFIX_RE = /^(\d{2,4}(?:-\d{2,4})?)\s*(C|U|TCX|TPX)$/i;
const BARE_TEXTILE_RE = /^(\d{2,4})-(\d{2,4})$/;
const BARE_PRINT_RE = /^(\d{3,4})$/;
const MADEIRA_RE = /^(?:MADEIRA\s*)?(POLYNEON|RAYON|CLASSIC)\s*(\d{3,5})$/i;
const MADEIRA_DEFAULT_RE = /^MADEIRA\s*(\d{3,5})$/i;
const DURAK_RE = /^(?:DURAK\s*)?(POLYSOFT|VISCO)\s*(\d{4,6})$/i;

function expandHex(value: string): string {
  const upper = value.toUpperCase();
  if (upper.length === 3) {
    return `#${upper[0]}${upper[0]}${upper[1]}${upper[1]}${upper[2]}${upper[2]}`;
  }
  return `#${upper}`;
}

function isIntegerInRange(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

/** Parse exactly three or four comma-separated non-negative integers. */
function parseNumberList(input: string): number[] | null {
  const parts = input.split(",");
  if (parts.length !== 3 && parts.length !== 4) return null;

  const values: number[] = [];
  for (const part of parts) {
    if (!/^\s*\d+\s*$/.test(part)) return null;
    values.push(Number(part.trim()));
  }
  return values;
}

function toRgb(values: number[]): RGB | null {
  const [r, g, b] = values;
  if (r === undefined || g === undefined || b === undefined) return null;
  if (!isIntegerInRange(r, 255) || !isIntegerInRange(g, 255) || !isIntegerInRange(b, 255)) {
    return null;
  }
  return { r, g, b };
}

function toCmyk(values: number[]): CMYK | null {
  const [c, m, y, k] = values;
  if (c === undefined || m === undefined || y === undefined || k === undefined) return null;
  if (
    !isIntegerInRange(c, 100) ||
    !isIntegerInRange(m, 100) ||
    !isIntegerInRange(y, 100) ||
    !isIntegerInRange(k, 100)
  ) {
    return null;
  }
  return { c, m, y, k };
}

/**
 * Parse one raw input string into a Query, or null when the input is empty or
 * clearly malformed. Rule order follows IMPLEMENTATION_PLAN.md §8.1.
 */
export function parseQuery(raw: string): Query | null {
  const input = raw.trim().replace(/^pantone\s+/i, "");
  if (!input) return null;

  // 2. #RGB, #RRGGBB, or bare 3/6 character hex.
  // A bare 3-character value made only of digits stays a Pantone code so that
  // "186" is read as Solid Coated, per rule 7. A bare 3-letter value stays
  // free text ("bee", "cab") so real words win over hex; "#abc" or "f00"
  // still parse as hex.
  const hexMatch = input.match(HEX_RE);
  if (hexMatch) {
    const value = hexMatch[1] ?? "";
    const isBare = !input.startsWith("#");
    const hasHexLetter = /[a-f]/i.test(value);
    const bare3HasDigit = value.length === 3 && /\d/.test(value);
    if (!isBare || value.length === 6 || (hasHexLetter && bare3HasDigit)) {
      return { kind: "hex", hex: expandHex(value) };
    }
  }
  if (input.startsWith("#")) return null;

  // 3. rgb(r, g, b) or three comma-separated numbers 0-255.
  if (/^rgb\s*\(/i.test(input)) {
    const match = input.match(/^rgb\s*\((.*)\)$/i);
    if (!match) return null;
    const values = parseNumberList(match[1] ?? "");
    const rgb = values && values.length === 3 ? toRgb(values) : null;
    return rgb ? { kind: "rgb", rgb } : null;
  }

  // 4. cmyk(c, m, y, k) or four comma-separated numbers 0-100.
  if (/^cmyk\s*\(/i.test(input)) {
    const match = input.match(/^cmyk\s*\((.*)\)$/i);
    if (!match) return null;
    const values = parseNumberList(match[1] ?? "");
    const cmyk = values && values.length === 4 ? toCmyk(values) : null;
    return cmyk ? { kind: "cmyk", cmyk } : null;
  }

  const plainValues = parseNumberList(input);
  if (plainValues) {
    if (plainValues.length === 3) {
      const rgb = toRgb(plainValues);
      return rgb ? { kind: "rgb", rgb } : null;
    }
    const cmyk = toCmyk(plainValues);
    return cmyk ? { kind: "cmyk", cmyk } : null;
  }

  // 5. Pantone code with an explicit system suffix.
  const pantone = input.match(PANTONE_SUFFIX_RE);
  if (pantone) {
    const code = pantone[1] ?? "";
    const system = (pantone[2] ?? "").toUpperCase() as SystemId;
    return { kind: "code", system, code };
  }

  // 6. Bare textile code NN-NNNN defaults to TCX.
  const textile = input.match(BARE_TEXTILE_RE);
  if (textile) {
    return { kind: "code", system: "TCX", code: `${textile[1]}-${textile[2]}` };
  }

  // 7. Bare 3-4 digit print code defaults to Solid Coated.
  const print = input.match(BARE_PRINT_RE);
  if (print) {
    return { kind: "code", system: "C", code: print[1] ?? "" };
  }

  // 8. Madeira. A bare "Madeira NNNN" defaults to Polyneon.
  const madeira = input.match(MADEIRA_RE);
  if (madeira) {
    const product = (madeira[1] ?? "").toUpperCase();
    return {
      kind: "code",
      system: product === "POLYNEON" ? "MP" : "MR",
      code: madeira[2] ?? "",
    };
  }
  const madeiraDefault = input.match(MADEIRA_DEFAULT_RE);
  if (madeiraDefault) {
    // No product given: resolve across Polyneon and Classic in main.ts.
    return { kind: "code", system: null, code: madeiraDefault[1] ?? "" };
  }

  // 9. Durak.
  const durak = input.match(DURAK_RE);
  if (durak) {
    const product = (durak[1] ?? "").toUpperCase();
    return {
      kind: "code",
      system: product === "VISCO" ? "DVS" : "DPS",
      code: durak[2] ?? "",
    };
  }

  // 10. Free text, usually a colour name.
  return { kind: "text", text: input };
}
