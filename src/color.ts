// Colour engine. Single source of truth for every conversion and distance.
// Lab is CIELAB D50 because Pantone publishes D50/2° values, and CIEDE2000
// must be computed on that same white point to stay comparable with the data.

import type { CMYK, Lab, RGB } from "./types.ts";

// culori entry points used here; keep the cast at the dependency boundary so
// the public API stays typed even if culori's declarations drift.
import { converter, inGamut, toGamut } from "culori";

interface CuloriRgb {
  mode: "rgb";
  r: number;
  g: number;
  b: number;
}

interface CuloriLab {
  mode: "lab";
  l: number;
  a: number;
  b: number;
}

const toLabD50 = converter("lab") as (colour: CuloriRgb) => CuloriLab;
const toSrgb = converter("rgb") as (colour: CuloriLab) => CuloriRgb;
const mapToSrgb = toGamut("rgb", "oklch") as (colour: CuloriRgb) => CuloriRgb;
const srgbInGamut = inGamut("rgb") as (colour: CuloriRgb) => boolean;

const INK = "#0a0a0a";
const PAPER = "#ffffff";

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function byte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseHex(input: string): RGB | null {
  if (typeof input !== "string") return null;
  const value = input.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  const full = value.length === 3 ? value.replace(/./g, "$&$&") : value;
  const int = Number.parseInt(full, 16);
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
}

export function rgbToHex(rgb: RGB): string {
  const hex = (channel: number) => byte(channel).toString(16).padStart(2, "0");
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  return parseHex(hex);
}

export function rgbToLab(rgb: RGB): Lab {
  const lab = toLabD50({
    mode: "rgb",
    r: clamp(rgb.r, 0, 255) / 255,
    g: clamp(rgb.g, 0, 255) / 255,
    b: clamp(rgb.b, 0, 255) / 255,
  });
  return { l: round2(lab.l), a: round2(lab.a), b: round2(lab.b) };
}

export function labToRgb(lab: Lab): RGB {
  if (![lab.l, lab.a, lab.b].every((value) => Number.isFinite(value))) {
    return { r: 0, g: 0, b: 0 };
  }
  const rgb = toSrgb({ mode: "lab", l: lab.l, a: lab.a, b: lab.b });
  return { r: byte(rgb.r * 255), g: byte(rgb.g * 255), b: byte(rgb.b * 255) };
}

/**
 * CIEDE2000 (kL = kC = kH = 1), implemented from Sharma, Wu & Dalal (2005).
 * Input is CIELAB D50, matching the published Pantone Lab values.
 */
export function deltaE2000(a: Lab, b: Lab): number {
  if (![a.l, a.a, a.b, b.l, b.a, b.b].every((value) => Number.isFinite(value))) {
    return Number.POSITIVE_INFINITY;
  }
  const rad = Math.PI / 180;
  const pow25to7 = 25 ** 7;

  const c1 = Math.hypot(a.a, a.b);
  const c2 = Math.hypot(b.a, b.b);
  const cBar = (c1 + c2) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + pow25to7)));

  const a1p = (1 + g) * a.a;
  const a2p = (1 + g) * b.a;
  const c1p = Math.hypot(a1p, a.b);
  const c2p = Math.hypot(a2p, b.b);
  const h1p = hueAngle(a.b, a1p);
  const h2p = hueAngle(b.b, a2p);

  const dLp = b.l - a.l;
  const dCp = c2p - c1p;
  const dhp = hueDelta(h1p, h2p, c1p, c2p);
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp * rad) / 2);

  const lBarP = (a.l + b.l) / 2;
  const cBarP = (c1p + c2p) / 2;
  const hBarP = hueMean(h1p, h2p, c1p, c2p);

  const t =
    1 -
    0.17 * Math.cos((hBarP - 30) * rad) +
    0.24 * Math.cos(2 * hBarP * rad) +
    0.32 * Math.cos((3 * hBarP + 6) * rad) -
    0.2 * Math.cos((4 * hBarP - 63) * rad);

  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + pow25to7));
  const sl = 1 + (0.015 * (lBarP - 50) ** 2) / Math.sqrt(20 + (lBarP - 50) ** 2);
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(2 * dTheta * rad) * rc;

  const lTerm = dLp / sl;
  const cTerm = dCp / sc;
  const hTerm = dHp / sh;

  return Math.sqrt(Math.max(0, lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rt * cTerm * hTerm));
}

function hueAngle(y: number, x: number): number {
  if (x === 0 && y === 0) return 0;
  const degrees = Math.atan2(y, x) / (Math.PI / 180);
  return degrees < 0 ? degrees + 360 : degrees;
}

function hueDelta(h1p: number, h2p: number, c1p: number, c2p: number): number {
  if (c1p * c2p === 0) return 0;
  const diff = h2p - h1p;
  if (Math.abs(diff) <= 180) return diff;
  return diff > 180 ? diff - 360 : diff + 360;
}

function hueMean(h1p: number, h2p: number, c1p: number, c2p: number): number {
  if (c1p * c2p === 0) return h1p + h2p;
  const sum = h1p + h2p;
  if (Math.abs(h1p - h2p) <= 180) return sum / 2;
  if (sum < 360) return (sum + 360) / 2;
  return (sum - 360) / 2;
}

/**
 * Naive, unprofiled CMYK. No ICC profile, ink limit, or dot gain, so treat the
 * result as a rough print recipe and label it as such in the UI.
 */
export function rgbToCmyk(rgb: RGB): CMYK {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: round2(((1 - r - k) / (1 - k)) * 100),
    m: round2(((1 - g - k) / (1 - k)) * 100),
    y: round2(((1 - b - k) / (1 - k)) * 100),
    k: round2(k * 100),
  };
}

export function cmykToRgb(cmyk: CMYK): RGB {
  const c = clamp(cmyk.c, 0, 100) / 100;
  const m = clamp(cmyk.m, 0, 100) / 100;
  const y = clamp(cmyk.y, 0, 100) / 100;
  const k = clamp(cmyk.k, 0, 100) / 100;
  return {
    r: byte((1 - c) * (1 - k) * 255),
    g: byte((1 - m) * (1 - k) * 255),
    b: byte((1 - y) * (1 - k) * 255),
  };
}

/**
 * Clamp to the sRGB gamut and report whether anything changed. Parsed hex is
 * usually in gamut already; out-of-gamut Lab round-trips report clipped=true.
 */
export function gamutMap(hex: string): { hex: string; clipped: boolean } {
  const rgb = parseHex(hex);
  if (!rgb) return { hex: "#000000", clipped: true };

  const colour: CuloriRgb = {
    mode: "rgb",
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
  };
  const mapped = mapToSrgb(colour);
  const clipped = !srgbInGamut(mapped);

  return {
    hex: rgbToHex({ r: mapped.r * 255, g: mapped.g * 255, b: mapped.b * 255 }),
    clipped,
  };
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(rgb.r) + 0.7152 * linear(rgb.g) + 0.0722 * linear(rgb.b);
}

/** WCAG contrast ratio. Malformed input has no contrast, so it reports 1:1. */
export function contrastRatio(a: string, b: string): number {
  if (!parseHex(a) || !parseHex(b)) return 1;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Text colour for a swatch: whichever of ink/paper wins on measured contrast.
 * The pair is near-black/near-white, so the winner clears 4.5:1 for light and
 * dark swatches. A narrow mid-grey band cannot reach 4.5:1 with either brand
 * colour (the floor is 4.4:1 there); best contrast still wins.
 */
export function pickSwatchText(hex: string): "ink" | "paper" {
  const onInk = contrastRatio(hex, INK);
  const onPaper = contrastRatio(hex, PAPER);
  return onInk >= onPaper ? "ink" : "paper";
}
