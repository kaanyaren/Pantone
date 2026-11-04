# PantonAK — Implementation Plan

**Status:** implemented (v0.1.0)
**Repo:** `/Users/kaanyaren/GitHub/Pantone` (empty, not yet a git repo)  
**Host:** GitHub Pages  
**Stack:** Vite + vanilla TypeScript + one runtime colour library  
**Design system:** Hallmark — genre `editorial`, theme `Grid`, macrostructure `Workbench`, nav `N9`, footer `Ft4`

> Product name is **PantonAK**. Use the typographic wordmark and mark in §9.12 everywhere: nav, favicon, Apple touch icon, web manifest, social card, README, and footer. Pantone is referenced only nominatively in body copy and data labels.

---

## 1. Product

### 1.1 One-liner

Type a Pantone code, a Madeira or Durak thread number, a hex value, RGB, or CMYK. Get the nearest colour in every supported library, with a CIEDE2000 distance beside every match.

### 1.2 Audience

- Textile, apparel, and surface designers moving between Pantone TCX/TPX and print C/U.
- Embroidery shops matching Pantone or customer hex values to Madeira and Durak thread.
- Anyone who needs a fast, no-signup colour cross-reference that is honest about approximation.

### 1.3 Success criteria

1. A user can enter any supported code or colour value and get a result in under one second on a mid-range phone.
2. Every result shows the library, code, name, hex, and ΔE00.
3. The page works at 320 px without horizontal scrolling and at 1440 px without looking sparse.
4. All data is generated reproducibly from committed snapshots; the build fails on drift.
5. Deployed automatically to GitHub Pages on every push to `main`.
6. Passes the Hallmark 58-gate slop test and the accessibility checklist in §11.

### 1.4 Non-goals for v1

- Accounts, saved palettes, databases, serverless functions, or any backend.
- Image upload, camera eyedropper, or palette generation.
- ICC profile upload or "print-accurate" CMYK.
- Exact equivalence claims between Pantone, Madeira, and Durak.
- Per-colour SEO pages, blog, or programmatic landing pages.
- Dark mode. Grid is a light theme by design.
- Analytics or tracking.

---

## 2. Supported systems

| ID | UI label | Source family | Rows (expected) | Provenance |
|---|---|---:|---:|---|
| `C` | Pantone Solid Coated | Pantone | 1,341 | community mirror |
| `U` | Pantone Solid Uncoated | Pantone | 1,341 | community mirror |
| `TCX` | Pantone TCX | Pantone textile | ~2,800 | community mirror |
| `TPX` | Pantone TPX (legacy) | Pantone textile | ~2,100 | legacy community mirror |
| `MP` | Madeira Polyneon 40 | Madeira | 349 | manufacturer/community approximation |
| `MR` | Madeira Rayon 40 | Madeira | 357 | manufacturer/community approximation |
| `DPS` | Durak Polysoft | Durak | 420 | manufacturer digital swatch |
| `DVS` | Durak Visco | Durak | 441 | manufacturer digital swatch |

**Total:** ~9,149 rows. Exact counts are generated, never hardcoded in the UI.

### 2.1 Inputs

- Pantone: `186 C`, `186 U`, `19-4052 TCX`, `19-4052 TPX`, or a bare code.
- Madeira: `Rayon 1147`, `Polyneon 1610`, `Rayon 1001`.
- Durak: `Polysoft 00118`, `Visco 00144`, `Durak Polysoft 00118`.
- Hex: `#C8102E`, `C8102E`.
- RGB: `rgb(200, 16, 46)` or `200, 16, 46`.
- CMYK: `cmyk(0, 100, 100, 0)`.
- Names: `classic blue`, `fiery red`.

### 2.2 Outputs per result

- System label, code, name, swatch, hex, RGB, CMYK, ΔE00, provenance badge.
- Copy hex, copy row, copy all, copy share link.
- A "5 nearest" disclosure per system.
- A "same code, different substrate" note when a TCX/TPX or C/U code matches but the physical standard differs.

---

## 3. Truth rules

These are product rules, not decoration. They prevent the tool from making false claims.

1. **Nearest match, never equivalence.** Say "closest match", "ΔE00 2.1", "noticeable difference". Never "equivalent", "exact", or "official conversion".
2. **TCX ≠ TPX.** Same six-digit code, different substrate and measured values. Keep separate rows. TPX is labelled legacy.
3. **C ≠ U.** Same ink family, different paper. Show both, but never treat U as a tint or conversion of C.
4. **Pantone Solid C/U has no official CMYK build.** CMYK output is an unprofiled approximation and must be labelled as such.
5. **Thread RGB is approximate.** Madeira and Durak digital values are not spectrophotometer readings. Sheen, stitch direction, and lighting change the appearance.
6. **Durak codes are range-scoped.** `00118` is a different colour in Polysoft and Visco. Never merge them.
7. **Duplicates are allowed.** Visco has 62 duplicate-hex groups covering 144 codes. Keep every code; show ties explicitly.
8. **Every value carries provenance.** `community`, `manufacturer`, or `legacy` is stored per system and shown in the sources section.

---

## 4. Data sources

### 4.1 Pantone

| System | Source | Format | License | Notes |
|---|---|---|---|---|
| C, U | [`bconglet/Pantoner`](https://github.com/bconglet/Pantoner) | JSON | MIT | 1,341 each. Pre-2019 set; missing recent colours. |
| TCX | [`pedroduke/pantone-tcx`](https://github.com/pedroduke/pantone-tcx) | JSON/JS | ISC | ~2,800 names + hex. |
| TPX | [`jacobbubu/color-books`](https://github.com/jacobbubu/color-books) | JSON | No license file | ~2,100 Lab/hex. Only practical public TPX set. Treat as legacy. |

Do not mix the TPX Lab values with the TCX hex values in one record. Normalize every source to hex and compute Lab in one place.

### 4.2 Madeira

| System | Source | Format | License | Notes |
|---|---|---|---|---|
| Polyneon 40 | [`inkstitch/inkstitch` palettes](https://github.com/inkstitch/inkstitch/tree/main/palettes) | GIMP `.gpl` | GPL-3.0 | 349 codes. |
| Rayon 40 | same | `.gpl` | GPL-3.0 | 357 codes. Official chart counts differ; see §4.4. |

Store Madeira palettes in a separate `data/raw/madeira/` directory with a GPL notice. Do not relicense them as MIT. If Madeira supplies an official digital table as part of the permission agreement, replace the `.gpl` files and keep the same adapter interface.

### 4.3 Durak

| System | Source | Format | Notes |
|---|---|---|---|
| Polysoft | `https://api.durakportal.com/api/DijitalKartela/Polysoft` | JSON | 420 codes. No names, no Pantone values. |
| Visco | `https://api.durakportal.com/api/DijitalKartela/Visco` | JSON | 441 codes. Product page claims 480; the API is the launch truth. |

Snapshot both responses into `data/raw/durak/`. Never fetch at runtime; the API is undocumented and CORS-locked to Durak's own app.

JSON shape:

```json
{
  "kartelaColumns": [
    {
      "kartelaColors": [
        { "colorCode": "00118", "colorHexCode": "#5b5951", "rgb": "91,89,81" }
      ]
    }
  ]
}
```

Normalize `colorCode` to a string with leading zeros, and `colorHexCode` to `#RRGGBB` uppercase.

### 4.4 Madeira reconciliation gate

Official Madeira cards and the community palettes disagree on counts:

- Official Polyneon 40: ~432. Ink/Stitch: 349.
- Official Rayon 40: ~180. Ink/Stitch: 357.

Before launch, the data agent must:

1. Extract the code list from the official Polyneon and Rayon shade cards.
2. Compare against the Ink/Stitch codes.
3. Ship only codes present in both lists, unless the official card confirms the extra codes.
4. Display the shipped count in the sources section.
5. If reconciliation cannot finish, ship Polyneon only and mark Rayon as "community palette, incomplete". Do not silently ship a mismatched Rayon set.

### 4.5 Snapshot layout

```text
data/
  raw/
    pantone/
      pantoner.json
      tcx.json
      tpx.json
    madeira/
      polyneon-40.gpl
      rayon-40.gpl
      OFFICIAL-CODES.md
    durak/
      polysoft.json
      visco.json
    manifest.json
  LICENSES.md
  permissions/          # private permission letters, never deployed
```

`manifest.json`:

```json
{
  "generated": "2026-11-04",
  "sources": [
    {
      "id": "pantoner",
      "url": "https://github.com/bconglet/Pantoner",
      "file": "pantone/pantoner.json",
      "sha256": "…",
      "license": "MIT",
      "retrieved": "2026-11-04",
      "provenance": "community"
    }
  ]
}
```

`generated` is a human-set date, not `Date.now()`. The same inputs must produce a byte-identical `colors.json`.

---

## 5. Data model and pipeline

### 5.1 Runtime schema

`public/data/colors.json`:

```ts
export type SystemId = "C" | "U" | "TCX" | "TPX" | "MP" | "MR" | "DPS" | "DVS";

export interface SystemMeta {
  id: SystemId;
  label: string;
  short: string;
  family: "pantone" | "madeira" | "durak";
  provenance: "community" | "manufacturer" | "legacy";
  source: string;
  license: string;
  count: number;
}

export interface Dataset {
  version: 1;
  generated: string;
  systems: SystemMeta[];
  rows: Array<[SystemId, code: string, name: string, hex: string]>;
}
```

Rows are tuples to keep the payload small. Do not ship Lab or CMYK values; both are derived at runtime.

### 5.2 Build script

`scripts/build-data.ts`:

1. Read `manifest.json` and verify every raw file's sha256.
2. Parse each source with a small adapter:
   - `pantone`: nested objects/arrays → `{ code, name, hex }`.
   - `madeira`: GIMP palette lines → first numeric token is the code, remainder is the name.
   - `durak`: `kartelaColumns[].kartelaColors[]` → `{ code, name: "", hex }`.
3. Normalize:
   - Uppercase hex, expand shorthand, reject anything not `^#[0-9A-F]{6}$`.
   - Strip `PANTONE ` and system suffixes from names.
   - Preserve code leading zeros.
   - Collapse whitespace; never title-case names.
4. Deduplicate on `(system, code)`. A duplicate is a build failure, not "last wins".
5. Validate:
   - Every system has at least one row.
   - Counts are within ±5% of the manifest expectation.
   - Names are 1–80 chars; Durak names may be empty and fall back to `${short} ${code}`.
   - No row has an unknown system id.
   - Total rows ≥ 9,000.
6. Sort by system order, then numeric-aware code.
7. Write `public/data/colors.json` with two-space indentation and a trailing newline.
8. Print a summary table: system, count, source, sha256.

Commands:

```bash
npm run data
npm run data -- --check    # verify without writing
```

### 5.3 Dataset tests

`test/dataset.test.ts` must assert:

- Every system count matches `colors.json` metadata.
- `(system, code)` is unique.
- Every hex matches the regex.
- Every name is non-empty after the Durak fallback.
- `generated` matches the manifest.
- A golden sha256 of the sorted rows matches a committed value (catches silent source drift).
- TPX and TCX rows are separate even when codes collide.
- Durak Polysoft and Visco rows are separate even when codes collide.

---

## 6. Architecture

### 6.1 Tree

```text
PantonAK/
  index.html
  src/
    types.ts          # shared types + SystemId
    color.ts          # sRGB/hex/RGB/CMYK/Lab/ΔE00/contrast/gamut
    query.ts          # input parser
    search.ts         # name/code search + ranking
    main.ts           # bootstrap, data fetch, state, URL
    ui.ts             # DOM render functions
    styles.css        # layout + components
  tokens.css          # design tokens
  public/
    data/colors.json
    brand/logo.svg
    brand/mark.svg
    favicon.svg
    favicon.ico
    favicon-16.png
    favicon-32.png
    apple-touch-icon.png
    icon-192.png
    icon-512.png
    og-image.svg
    og-image.png
    site.webmanifest
    .nojekyll
    robots.txt
  data/
    raw/**
    manifest.json
    LICENSES.md
  scripts/
    build-data.ts
  test/
    dataset.test.ts
    color.test.ts
    deltaE.test.ts
    query.test.ts
    search.test.ts
  .github/workflows/deploy.yml
  vite.config.ts
  tsconfig.json
  package.json
  README.md
  IMPLEMENTATION_PLAN.md
```

### 6.2 Runtime flow

```text
load page
  → fetch ./data/colors.json after first paint
  → parse Dataset
  → parse ?q= from URL
  → parseQuery(q)
  → searchColors(rows, query) or matchColor(rows, query)
  → render result table
  → update URL on submit/selection only
```

### 6.3 Dependencies

- Runtime: `culori` (MIT) for sRGB/Lab/OKLCH conversions and gamut mapping.
- Dev: `vite`, `typescript`.
- Brand assets are static SVG/PNG files in `public/`; no runtime image library.
- No framework, router, state library, CSS framework, search library, test framework, or analytics.
- `culori` is the only runtime dependency. If integration cost exceeds one afternoon, replace it with the local formulas in §7 and keep the same API.

### 6.4 Performance budgets

- HTML + CSS + JS: ≤ 60 KB gzip (excluding data).
- Data: ≤ 180 KB brotli.
- First contentful paint: ≤ 1.2 s on a simulated 4G phone.
- Search scan: ≤ 2 ms for 9k rows.
- No layout shift from data loading; reserve result space with a skeleton.
- Lighthouse mobile: performance ≥ 90, accessibility 100, best practices 100, SEO 100.

### 6.5 Node and TypeScript

Local Node is v26.5.0. CI uses Node 24. Both support native TypeScript type stripping.

- `"type": "module"`.
- Use explicit `.ts` extensions in relative imports so `node --test` resolves them without a loader.
- No TS `enum`, no parameter properties, no decorators, no runtime-only TS features.
- `tsconfig.json`: `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`, `noEmit: true`, `strict: true`.

---

## 7. Colour engine

`src/color.ts` is the single source of truth. UI and tests import it. No duplicate formulas in components.

### 7.1 API

```ts
export interface RGB { r: number; g: number; b: number } // 0–255
export interface CMYK { c: number; m: number; y: number; k: number } // 0–100
export interface Lab { l: number; a: number; b: number } // D50

export function parseHex(input: string): RGB | null;
export function rgbToHex(rgb: RGB): string;
export function hexToRgb(hex: string): RGB | null;
export function rgbToLab(rgb: RGB): Lab;
export function labToRgb(lab: Lab): RGB;
export function deltaE2000(a: Lab, b: Lab): number;
export function rgbToCmyk(rgb: RGB): CMYK;
export function cmykToRgb(cmyk: CMYK): RGB;
export function gamutMap(hex: string): { hex: string; clipped: boolean };
export function relativeLuminance(hex: string): number;
export function contrastRatio(a: string, b: string): number;
export function pickSwatchText(hex: string): "ink" | "paper";
```

### 7.2 Pipeline

1. Every stored row is sRGB hex.
2. Input is normalized to sRGB hex and to Lab D50.
3. Matching ranks with CIEDE2000 (`kL = kC = kH = 1`) on Lab D50.
4. Display hex is gamut-mapped to sRGB with OKLCH chroma reduction; show the original and mapped values if they differ.
5. CMYK output uses the naive formula and a visible `unprofiled` badge. Never present it as a Pantone ink build.
6. Contrast uses WCAG relative luminance. Swatch text is chosen by measured contrast, not by eye.

### 7.3 CIEDE2000

Implement from the Sharma et al. reference implementation, not from memory. Test against the published 34-pair dataset:

- Identity returns 0.
- Symmetry holds within floating-point tolerance.
- Known pairs match the published values within ±0.0001.

Do not substitute RGB Euclidean distance or ΔE76 for final ranking.

### 7.4 ΔE bands

| ΔE00 | Label | UI treatment |
|---:|---|---|
| 0 | same value | `ΔE 0.0` |
| ≤ 1 | near identical | neutral |
| 1–2 | close | neutral |
| 2–3.5 | noticeable | muted warning |
| 3.5–5 | loose | warning |
| > 5 | no close match | explicit text, not a colour badge |

Bands are guidance, not pass/fail. No colour alone carries the band.

### 7.5 CMYK formulas

```text
RGB → CMYK
K = 1 - max(R, G, B)
if K == 1: C = M = Y = 0
else:
  C = (1 - R - K) / (1 - K)
  M = (1 - G - K) / (1 - K)
  Y = (1 - B - K) / (1 - K)

CMYK → RGB
R = (1 - C) * (1 - K)
G = (1 - M) * (1 - K)
B = (1 - Y) * (1 - K)
```

All channels normalized 0–1 internally, displayed 0–100 for CMYK.

### 7.6 Tests

- `#FFFFFF` → Lab(100, 0, 0).
- `#000000` → Lab(0, 0, 0).
- `#FF0000` → Lab D50 ≈ (54.2905, 80.8049, 69.8910).
- RGB → Lab → RGB round trip within 1/255.
- CMYK round trip within 1/255 for in-gamut colours.
- Black → `0/0/0/100`.
- Sharma CIEDE2000 pairs.
- `contrastRatio("#000000", "#FFFFFF") === 21`.
- `pickSwatchText` returns a text colour with ≥ 4.5:1 contrast for every test swatch.

---

## 8. Query parser and search

### 8.1 Parser grammar

`src/query.ts` returns one of:

```ts
type Query =
  | { kind: "hex"; hex: string }
  | { kind: "rgb"; rgb: RGB }
  | { kind: "cmyk"; cmyk: CMYK }
  | { kind: "code"; system: SystemId | null; code: string }
  | { kind: "text"; text: string };
```

Rules, in order:

1. Trim. Empty → `null`.
2. `#RGB`, `#RRGGBB`, or bare 6/3 hex → `hex`.
3. `rgb(...)` or three comma-separated numbers 0–255 → `rgb`.
4. `cmyk(...)` or four comma-separated numbers 0–100 → `cmyk`.
5. `(\d{2,4}(?:-\d{2,4})?)\s*(C|U|TCX|TPX)` → `code` with that system.
6. Bare `NN-NNNN` → `code`, system `TCX` (textile format default).
7. Bare 3–4 digit number → `code`, system `C` (print default).
8. `(?:MADEIRA\s*)?(?:POLYNEON|RAYON)\s*(\d{3,5})` → `code`, `MP` or `MR`.
9. `(?:DURAK\s*)?(?:POLYSOFT|VISCO)\s*(\d{4,6})` → `code`, `DPS` or `DVS`.
10. Anything else → `text`.

Ambiguity is resolved by requiring a range prefix for Madeira and Durak 4–6 digit codes. Never guess between `1001` (Pantone C) and `1001` (Madeira Rayon). Show a hint instead: `Add "Madeira" or "Rayon" to disambiguate.`

### 8.2 Search ranking

Precompute a lowercase haystack per row at load:

```text
1000  exact code, with or without system suffix
 800  code prefix
 600  exact name token
 400  name token prefix
 300  name substring
 100  ordered subsequence (typo tolerance)
```

- Debounce input by 120 ms.
- Cap rendered results at 100.
- Honour IME composition events.
- Escape all user text before insertion into the DOM.
- Never use `innerHTML` with query text.

### 8.3 URL state

- `?q=186+C` — the only state.
- `URLSearchParams` encodes spaces as `+`.
- Update with `replaceState` on submit and on result selection; do not push a history entry per keystroke.
- "Copy link" copies the current URL.
- On load, invalid `q` shows the error state, not a blank page.

---

## 9. Design contract — Hallmark

### 9.1 Pre-flight

The repo is empty. No existing font stack, palette, motion library, spacing scale, framework, or `design.md`.

```text
Pre-flight findings:
· Font stack: none
· Palette: none
· Motion: none
· Spacing: none
· Framework: none
Hallmark will introduce: full token system, Grid theme, Workbench page shape,
Nav N9, Footer Ft4, slop-test gates, responsive rules.
```

### 9.2 Genre, macrostructure, theme

- **Genre:** editorial. The tool is a reference document, not a SaaS marketing page.
- **Macrostructure:** **Workbench**. The live converter is the product demonstration. The page reads like an instrument manual: small functional heading, one tool, ruled results, one explanatory band.
- **Theme:** **Grid**. Cool near-white sheet, exposed 12-column hairline grid, Archivo 800 lowercase display, ultramarine signal ink, zero radius, zero shadows, hairlines do the structure.
- **Nav:** **N9 Edge-aligned minimal**. Wordmark hard-left, `GitHub` link hard-right, empty middle.
- **Footer:** **Ft4 Dense typographic colophon**. Sources, licences, dataset date, build hash, disclaimer, in one small block.
- **Enrichment:** none. The live tool and the results table are the visual. No illustrations, no stock photos, no fake browser chrome, no fake terminal.

**Diversification:** first Hallmark run for this project. No previous macrostructure or theme to differ from.

### 9.3 Theme tokens

`tokens.css` is the only file allowed to declare raw colour/font values. Components use `var(--…)`.

```css
:root {
  /* Paper and ink — cool near-white, never #fff or #000 */
  --color-paper: oklch(99% 0.003 255);
  --color-paper-2: oklch(97.2% 0.003 255);
  --color-paper-3: oklch(94.5% 0.003 255);
  --color-ink: oklch(16% 0.010 255);
  --color-ink-2: oklch(30% 0.010 255);
  --color-muted: oklch(46% 0.008 255);
  --color-rule: oklch(88% 0.005 255);
  --color-rule-2: oklch(65% 0.008 255);

  /* One signal ink: ultramarine, used sparingly */
  --color-accent: oklch(45% 0.19 264);
  --color-accent-ink: var(--color-paper);
  --color-focus: var(--color-accent);

  /* Functional state colours — always paired with text/icon */
  --color-error: oklch(55% 0.20 25);
  --color-error-ink: var(--color-paper);

  /* Type — Archivo display/body + JetBrains Mono for data only */
  --font-display: "Archivo", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Archivo", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --display-weight: 800;
  --tracking-display: -0.045em;

  /* 4 pt spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* Type scale — 1.25 ratio */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-display: clamp(3.25rem, 10.5vw, 8.5rem);

  /* Structure */
  --radius: 0;
  --rule: 1px;
  --shell: 80rem;
  --gutter: clamp(1rem, 4vw, 4rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 160ms;
  --dur-base: 200ms;
}
```

Rules:

- No `#fff`, `#000`, `rgb()`, `hsl()`, or un-tokenized OKLCH in `styles.css`.
- Dynamic swatch colours are data, not design tokens; they may be set with a CSS custom property on the swatch element.
- No gradients, no glassmorphism, no drop shadows, no rounded cards.
- The only "plate" is one flooded band per page, used for the ΔE explainer.

### 9.4 Type

- **Display and body:** Archivo 400/500/600/700/800.
- **Data only:** JetBrains Mono 400/500/600 for codes, hex values, RGB/CMYK strings, ΔE numbers, counts, and keyboard hints. This is a deliberate, user-requested deviation from Grid's "Archivo only" rule; the mono face is functional, not decorative.
- Display: Archivo 800, lowercase, `clamp(3.25rem, 10.5vw, 8.5rem)`, tracking `-0.045em`, line-height 0.9, left-aligned.
- Body: Archivo 400, 16 px, line-height 1.5, measure ≤ 65 ch.
- Labels: Archivo 600, 12 px, uppercase, tracking 0.09em, muted.
- Numeric data: JetBrains Mono 500/600, `font-variant-numeric: tabular-nums; font-feature-settings: "zero" 1;`.
- Codes are always rendered in mono, including Pantone numbers, Madeira numbers, Durak numbers, and hex. This makes `0`/`O` and `1`/`l` unambiguous where errors are expensive.
- No italic headings. No serif. No mono body copy. Mono appears only in data and code-like labels.
- Load both families with `display=swap`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

### 9.5 Layout

- Page shell max 80 rem, centred, with the 12-column hairline grid painted behind content.
- Content rides `repeat(12, minmax(0, 1fr))`; running prose spans ≤ 6 columns.
- Desktop sections breathe at 120–160 px vertical padding.
- Every section carries one constructed object: the tool frame, a ruled results table, a cropped numeral in the ΔE plate, or a stepped-bar figure for counts. No prose-only sections.
- No cards. Repeated units are cells divided by hairlines.
- Asymmetric occupancy: alternate the occupied side between sections; never centre the hero.

### 9.6 Page structure

```text
N9 nav: PantonAK wordmark left · GitHub link right
H1: one colour. eight systems.
Lede: Pantone, Madeira and Durak, matched with CIEDE2000.
Tool: label + input + Match button + example chips
Result hero: input swatch · hex · closest overall
Result table: one row per system, best match, ΔE, copy
"5 nearest" disclosure per system
ΔE plate: one flooded band with a giant ΔE numeral and a short explanation
Libraries: ruled index of systems, counts, provenance
Footer Ft4: sources, licences, date, build, disclaimer
```

Copy rules:

- Name the input, the system, and the number. No hype.
- No invented metrics, testimonials, logos, or "trusted by".
- Counts are generated from `colors.json`, not typed by hand.
- Error copy: what broke, why, what to do. One sentence.
- Empty state: explain what can be entered and give three real examples.

### 9.7 Components and states

- Search input: label above, helper below, 44 px height, 1 px border, transparent 2 px outline reserved for focus. No layout shift.
- Match button: 44 px, 1 px ink border, paper fill, ink text; hover fills ink and flips text; active translates 1 px; focus ring; disabled during in-flight data load; loading label stays readable.
- Copy buttons: 44×44 px hit target, visible label or accessible name, `aria-live` confirmation.
- Result rows: ruled cells; hover shifts background to `--color-paper-2` and moves the title 8 px, 180 ms; focus ring on the row's copy button; no row-level click without a real link/button.
- Disclosures: native `<details>`/`<summary>`; summary is a real button-like affordance with a 44 px target.
- Error: inline message under the input, `aria-invalid`, `aria-describedby`, error icon plus text.
- Loading: skeleton rows with the same height as results; no spinner-only blank page.
- Success: quiet `Copied` text in `role="status"`, no confetti.
- Empty: examples plus a one-line explanation.

All eight states (default, hover, focus, active, disabled, loading, error, success) must exist in CSS for every interactive component. No exceptions.

### 9.8 Motion

- Hover micro-states only: background shift, 1 px border shift, 8 px translate on result titles.
- No scroll reveals, parallax, autoplay, ticker, or type-in.
- `transform` and `opacity` only.
- `prefers-reduced-motion: reduce` removes all transitions and smooth scroll.
- Focus rings appear instantly; never animate them.

### 9.9 Responsive

Base styles target 320 px. Add `min-width` breakpoints at 40 rem, 60 rem, 90 rem.

- `html, body { overflow-x: clip; }`, never `hidden`.
- No `100vw`; no `vh` for full-height sections.
- All clickable labels `white-space: nowrap`.
- Grid tracks use `minmax(0, 1fr)`.
- H1 uses `overflow-wrap: anywhere; min-width: 0`.
- Results table: real `<table>` on desktop; stacked ruled rows on mobile with `data-label` labels via `::before`. No horizontal scroll.
- Input and button stack below 40 rem; button becomes full width.
- Nav N9 collapses to wordmark + GitHub link; no hamburger needed for one link.
- Footer Ft4 wraps naturally; no columns of links.

Verify at 320, 375, 414, 768, 1024, 1280, 1440 px. No horizontal scroll at any width.

### 9.10 Accessibility

- WCAG 2.2 AA.
- Body text ≥ 4.5:1; large text ≥ 3:1; UI borders ≥ 3:1.
- Every swatch has a 1 px border so pale colours are visible on paper.
- Never colour alone: code, name, hex, ΔE, and a text label always present.
- `aria-live="polite"` for result counts and copy confirmations.
- Swatches are `aria-hidden="true"`; the hex and name carry the meaning.
- One `<h1>`, `<main>`, `<header>`, `<footer>`, `lang="en"`.
- Keyboard: `/` focuses the input; Escape clears; Tab order follows DOM; no traps.
- Visible `:focus-visible` ring at 2 px + 2 px offset.
- 200% zoom and 320 px reflow without loss of content.
- Reduced motion respected.
- Forced-colors mode: borders remain visible; no information lost.

### 9.11 Hallmark anti-slop gates

The QA agent runs the full 58-gate test. Non-negotiables:

- No fake browser/phone/IDE chrome. The tool frame is a real ruled panel, not a fake window.
- No invented metrics, testimonials, logos, or case studies.
- No italic headings.
- No pure `#fff` / `#000`.
- No purple/cyan gradients, gradient text, or glassmorphism.
- No three equal feature cards.
- No centred hero.
- No section-number eyebrows.
- No cards, radii, or shadows (Grid theme).
- No two-line clickable labels.
- No horizontal scroll at 320 px.
- No colour-only status.
- No generic "No results" without context.

The UI agent stamps the CSS:

```css
/* Hallmark · genre: editorial · macrostructure: Workbench · theme: Grid
 * nav: N9 · footer: Ft4 · enrichment: none
 * tone: rational/technical · anchor hue: ultramarine 264
 */
```

It also writes `.hallmark/log.json` with the first entry and records the pre-emit critique scores:

```text
/* Hallmark · pre-emit critique: P5 H4 E5 S4 R5 V5 */
```

Any score below 3 triggers a revision before handoff.

### 9.12 Brand assets

The wordmark is typographic, not illustrative:

- `panton` — Archivo 800, lowercase, tight tracking.
- `AK` — JetBrains Mono 600, uppercase, data-register suffix.
- A single ultramarine square sits on the baseline as the terminal point.

The mark is the same system reduced to a lowercase `p` on an ink square, with the accent square at its shoulder. It survives 16 px.

Asset colours are the hex equivalents of the OKLCH tokens: ink `#0A0E12`, paper `#FAFCFE`, accent `#1A48BC`. Keep these three values in the generated SVGs; do not introduce a fourth brand colour.

Generated assets:

| File | Use |
|---|---|
| `public/brand/logo.svg` | Nav wordmark, README header, press/kit |
| `public/brand/mark.svg` | Square mark for social avatars, dark surfaces |
| `public/favicon.svg` | Modern browser favicon |
| `public/favicon.ico` | Legacy favicon, 16/32/48 |
| `public/favicon-16.png`, `public/favicon-32.png` | PNG fallbacks |
| `public/apple-touch-icon.png` | 180×180 iOS home screen |
| `public/icon-192.png`, `public/icon-512.png` | Web app manifest |
| `public/og-image.png` | 1200×630 social card |
| `public/og-image.svg` | Editable social-card source |
| `public/site.webmanifest` | Install metadata |

Usage rules:

- Nav: `logo.svg` at 28–32 px height on mobile, 36–40 px on desktop, linked to `./`.
- Footer: text wordmark or `logo.svg` at 24 px; do not repeat the full mark at large size.
- Favicon and manifest icons: use the generated files exactly; do not recolour.
- Clear space around the wordmark: at least the height of the accent square on all sides.
- Do not add shadows, gradients, outlines, or a second accent. Do not set the wordmark on a busy photograph.
- The SVG text is converted to paths. It does not depend on a local font or a network font request.

HTML head:

```html
<link rel="icon" href="./favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
<link rel="manifest" href="./site.webmanifest" />
<meta name="theme-color" content="#0A0E12" />
<meta name="description" content="Convert Pantone, Madeira and Durak colour codes, hex, RGB and CMYK with CIEDE2000 nearest matches." />
<meta property="og:title" content="PantonAK — one colour. eight systems." />
<meta property="og:description" content="Convert Pantone, Madeira and Durak colour codes, hex, RGB and CMYK." />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://YOUR-PAGES-URL/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
```

`og:image` must be an absolute URL in production. Replace `YOUR-PAGES-URL` with the GitHub Pages URL or the custom domain before launch.

The UI agent must use these assets. It must not hand-draw a second logo or set the product name in plain text where the wordmark is expected. The nav wordmark still needs a text fallback (`alt="PantonAK"`) for screen readers and failed image loads.

---

## 10. UX specification

### 10.1 Default state

- H1, lede, tool, three example chips.
- No results table until a query exists.
- Examples: `186 C`, `19-4052 TCX`, `#C8102E`, `Rayon 1147`, `Polyneon 1610`, `Polysoft 00118`.
- Clicking a chip fills the input and submits.

### 10.2 Results state

- Input swatch (large, 96–160 px square, ruled).
- Hex in tabular numerals.
- "Closest overall" line: system, code, name, ΔE.
- Table rows ordered by system family: Pantone C, U, TCX, TPX, Madeira, Durak.
- Each row: system label, code, name, swatch, hex, RGB, CMYK, ΔE, copy.
- A disclosure per row for the 5 nearest in that system.
- "Copy all" copies a TSV block with headers.
- "Copy link" copies the current URL.
- If the best ΔE > 5, show "No close match in this system" instead of pretending.

### 10.3 Empty and error states

- Empty query: no error; show examples.
- Unknown code: "No code `XYZ` in the loaded libraries. Try `186 C`, `19-4052 TCX`, or `Rayon 1147`."
- Ambiguous 4-digit code: "Add `Madeira` or `Rayon` to disambiguate `1001`."
- Invalid hex: "Hex must be 3 or 6 characters after `#`."
- Invalid CMYK: "CMYK channels must be 0–100."
- Data fetch failure: "Colour data failed to load. Reload the page." with a retry button.

### 10.4 Keyboard

- `/` focuses the input from anywhere.
- `Escape` clears the input and returns to the empty state.
- `Enter` submits.
- Tab reaches the input, Match, chips, copy buttons, disclosures, and footer links in DOM order.
- No keyboard trap. Disclosures use native `<details>`.

### 10.5 Share and deep links

- `?q=186+C` restores the full result.
- The URL is updated only on submit or selection.
- A shared URL never depends on local state or a data version not present in the deploy.

---

## 11. Multi-subagent work plan

### 11.1 Ownership matrix

| Agent | Owns | Must not touch |
|---|---|---|
| Orchestrator (main) | `src/types.ts`, `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, integration | data adapters, colour math, UI files |
| Data agent | `data/**`, `scripts/build-data.ts`, `public/data/colors.json`, `test/dataset.test.ts` | `src/**`, UI, workflow |
| Colour agent | `src/color.ts`, `test/color.test.ts`, `test/deltaE.test.ts` | data, query, UI |
| Search agent | `src/query.ts`, `src/search.ts`, `test/query.test.ts`, `test/search.test.ts` | colour math, UI |
| UI agent | `index.html`, `src/main.ts`, `src/ui.ts`, `src/styles.css`, `tokens.css`, `.hallmark/log.json` | data, colour math, search |
| Platform agent | `.github/workflows/deploy.yml`, `public/.nojekyll`, `public/robots.txt`, `README.md` | app source, data |
| QA agent | `QA_REPORT.md`, review only | all source files |

### 11.2 Wave 0 — Orchestrator (sequential, ~45 min)

Deliverables:

- `git init`, `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`.
- Install `vite`, `typescript`, `culori`.
- `src/types.ts` with `SystemId`, `SystemMeta`, `Dataset`, `Query`, `Match`, `RGB`, `CMYK`, `Lab`.
- `index.html` shell with `<main id="app">`, font preconnect, meta description, viewport.
- `test/fixtures/colors.sample.json` with 8 hand-written rows, one per system, for UI development.
- Commit: `chore: scaffold vite app and shared contracts`.

Interface contract to freeze:

```ts
matchColor(rows: ColorRow[], hex, options): Match[]
searchColors(rows: ColorRow[], query, limit): ColorRow[]
parseQuery(raw: string): Query | null
deltaE2000(a: Lab, b: Lab): number
```

No agent invents a second shape.

### 11.3 Wave 1 — parallel

#### Agent A — Data pipeline

Goal: produce `public/data/colors.json` and prove it.

Tasks:

1. Snapshot all sources into `data/raw/` with URLs, retrieval dates, and sha256 in `manifest.json`.
2. Write adapters for Pantoner, TCX, color-books TPX, Ink/Stitch GPL, and Durak JSON.
3. Implement the reconciliation gate for Madeira (§4.4).
4. Normalize, dedupe, validate, sort, and write.
5. Add `data/LICENSES.md` with attribution and licence text per source.
6. Write `test/dataset.test.ts`.
7. Report counts and any source discrepancies.

Acceptance:

```bash
npm run data
npm test -- test/dataset.test.ts
```

- All counts match expectations or the manifest is deliberately updated.
- No duplicate `(system, code)`.
- Durak and Madeira rows are present at launch.
- The generated file is deterministic: running twice produces the same sha256.

#### Agent B — Colour engine

Goal: correct, tested colour math with no UI dependency.

Tasks:

1. Implement §7 API.
2. Implement CIEDE2000 from the Sharma reference.
3. Implement sRGB → Lab D50, Lab → sRGB, gamut mapping, WCAG contrast.
4. Write `test/color.test.ts` and `test/deltaE.test.ts`.
5. Export a tiny benchmark or `demo()` that prints a known conversion table.

Acceptance:

```bash
npm test -- test/color.test.ts test/deltaE.test.ts
```

- Sharma pairs pass.
- Round trips pass.
- No `any` in exported signatures.
- No UI imports.

#### Agent C — Query and search

Goal: parse every supported input and rank results without external search libraries.

Tasks:

1. Implement `parseQuery` per §8.1.
2. Implement `searchColors` per §8.2.
3. Implement system/code normalization helpers.
4. Write table-driven tests for all input forms and ambiguity rules.
5. Add a small fixture-based search test for `classic blue`, `186c`, `19-4052`, `rayon 1147`, `polyneon 1610`, `polysoft 00118`.

Acceptance:

```bash
npm test -- test/query.test.ts test/search.test.ts
```

- All grammar rows have a test.
- Ambiguous codes produce a hint, not a guess.
- Search over 9k rows completes in ≤ 2 ms in the benchmark.

#### Agent D — Platform and deployment

Goal: GitHub Pages deploy that cannot ship a broken build.

Tasks:

1. `vite.config.ts`: `base: "./"`, no router, build target `es2022`.
2. GitHub Actions workflow per §12.
3. `public/.nojekyll`, `public/robots.txt`.
4. `README.md` with local commands, data refresh, deployment, and custom-domain notes.
5. Verify `npm run build` produces `dist/index.html` and `dist/data/colors.json`.

Acceptance:

- Workflow runs `npm ci`, `npm test`, `npm run build`, then deploys.
- A push to `main` publishes to Pages.
- `dist` works when served from a subpath (`/Pantone/`).

### 11.4 Wave 2 — UI agent

Starts after Wave 0; can use the fixture while data/search/colour land.

Goal: implement the Hallmark design contract and all states.

Tasks:

1. `tokens.css` exactly per §9.3.
2. `index.html` structure per §9.6, plus favicon/manifest/OG head tags per §9.12.
3. `src/ui.ts` render functions: tool, results table, disclosures, empty/loading/error, footer.
4. `src/main.ts`: load data, parse `?q=`, wire submit, chips, copy, share, keyboard.
5. `src/styles.css`: Grid rails, typography, ruled table, plate, responsive rules.
6. Use `brand/logo.svg` in the nav/footer and the generated favicon/manifest/OG assets. Do not redraw the logo.
7. Render every code, hex, RGB/CMYK string, ΔE number, and count in `--font-mono` with `"zero" 1`.
8. All eight states for input, button, copy, disclosure.
9. `.hallmark/log.json` + CSS stamp + pre-emit critique.
10. No fake chrome, no illustrations, no extra sections.

Acceptance:

- Works at 320/375/414/768/1024/1280/1440 px with no horizontal scroll.
- Keyboard-only path works.
- Screen reader announces result count and copy confirmation.
- Hallmark slop test passes 58/58.
- Lighthouse mobile targets met.
- Screenshots at 375, 768, 1440 reviewed by QA.

### 11.5 Wave 3 — QA agent

Goal: independent verification. Read-only; files findings in `QA_REPORT.md`.

Checklist:

1. Dataset integrity and counts.
2. Known conversions: `186 C → #C8102E`, `19-4052 TCX`, `#FF0000`, black, white.
3. All query forms, including ambiguous ones.
4. ΔE values and bands.
5. Responsive matrix; screenshot each width.
6. Keyboard, focus order, skip link, zoom 200%, reduced motion.
7. Colour contrast on every swatch and control.
8. Error, empty, loading, success states.
9. No horizontal scroll, no two-line clickable labels.
10. Hallmark 58-gate audit.
11. Lighthouse report.
12. GitHub Pages preview smoke test.

Acceptance: `QA_REPORT.md` has no open P0/P1 issues. P2 issues are listed with a fix or an explicit deferral.

### 11.6 Wave 4 — Integration and deploy

Orchestrator:

1. Merge in order: data → colour → search → UI → platform.
2. Run `npm run data && npm test && npm run build`.
3. Open `vite preview`, run QA smoke.
4. Push to `main`, watch the Pages workflow.
5. Verify the live URL at 375 px and 1440 px.
6. Tag `v1.0.0`.

---

## 12. GitHub Pages deployment

### 12.1 `vite.config.ts`

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { target: "es2022" },
});
```

Relative base works on both `https://<user>.github.io/Pantone/` and a custom domain at `/`. No router means no SPA fallback problem.

### 12.2 Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 12.3 Repository settings

- Pages → Source: **GitHub Actions**.
- Branch: `main`.
- Custom domain: optional. Add `public/CNAME` only when the domain is active.
- Do not enable Jekyll; `.nojekyll` is present.

### 12.4 Rollback

- Revert the failing commit on `main`.
- Workflow redeploys the previous build.
- The generated `colors.json` is committed, so a data rollback is a normal revert.

---

## 13. Testing and QA

### 13.1 Automated

```bash
npm run data
npm test
npm run build
npm run preview
```

`npm test` runs `node --test "test/**/*.test.ts"`.

### 13.2 Manual matrix

| Width | What to verify |
|---:|---|
| 320 | No horizontal scroll; input + button stack; table rows readable; footer wraps |
| 375 | Same; result hero fits; copy targets 44 px |
| 414 | Same; example chips wrap without overflow |
| 768 | Two-column tool/result begins; table readable |
| 1024 | 12-column grid visible; no over-wide prose |
| 1280 | Shell centred; plate aligns to grid |
| 1440 | No sparse gaps; max width holds |

### 13.3 Accessibility

- Keyboard-only run from load to copy.
- VoiceOver on macOS: headings, table, disclosures, live regions.
- 200% browser zoom.
- `prefers-reduced-motion: reduce`.
- Forced-colors mode.
- Colour-blind simulation: no result depends on hue alone.

### 13.4 Hallmark

- 58/58 gates.
- Pre-emit critique scores ≥ 3.
- No fake chrome, invented proof, italic headings, gradients, glass, pure white/black, centred hero, section-number eyebrows.
- One plate only.
- Nav N9 and footer Ft4 are the only chrome.

---

## 14. Definition of done

1. `public/data/colors.json` contains all eight systems with the agreed counts.
2. `186 C`, `19-4052 TCX`, `#C8102E`, `Rayon 1147`, `Polyneon 1610`, and `Polysoft 00118` all return correct results.
3. Every result shows system, code, name, hex, RGB, CMYK, ΔE00, and provenance.
4. C/U and TCX/TPX are never presented as conversions of each other.
5. CMYK is labelled unprofiled; thread values are labelled approximate.
6. All tests pass in CI.
7. Page works at 320–1440 px with no horizontal scroll.
8. Keyboard, screen reader, 200% zoom, reduced motion, and forced colors pass.
9. Hallmark 58/58 and pre-emit critique ≥ 3.
10. GitHub Pages deploy succeeds from `main`; live URL verified.
11. `README.md` explains local dev, data refresh, and deployment.
12. `data/LICENSES.md` lists every source and licence.
13. Nav uses `public/brand/logo.svg`; favicon, Apple touch icon, manifest icons, and OG image are wired in `index.html`.
14. Every code, hex, RGB/CMYK value, ΔE number, and count renders in JetBrains Mono with a distinguishable zero.

---

## 15. Open decisions

1. **Domain.** Product name is PantonAK. GitHub Pages project URL works without a custom domain. Add `CNAME` only when a domain is ready.
2. **Official Madeira digital data.** If the permission agreement includes a machine-readable table, replace the Ink/Stitch palettes before launch.
3. **Durak Visco count.** API has 441 codes; the product page claims 480. Ship 441 and show the source date. Ask Durak for the missing 39 only if they can supply them.
4. **Tone.** The plan locks a rational Swiss/technical look (Grid). If a warmer editorial tone is wanted, change the theme before UI work starts; do not mix themes mid-build.
