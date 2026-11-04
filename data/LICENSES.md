# Data licenses and attribution

PantonAK ships colour data derived from public snapshots. The snapshot bytes are
committed under `data/raw/`, and `data/raw/manifest.json` records every source
URL, retrieval date, expected count and sha256. `scripts/build-data.ts` refuses
to build if a snapshot no longer matches its checksum.

This project is not affiliated with, endorsed by, or sponsored by Pantone LLC,
Madeira, or Durak. Colour values are approximate digital references; always
verify against a physical swatch or shade card before production use.

## Pantone Solid Coated / Uncoated (`C`, `U`)

- Source: [`bconglet/Pantoner`](https://github.com/bconglet/Pantoner),
  `json/pantone-coated.json` and `json/pantone-uncoated.json`.
- License: MIT (repository license).
- Provenance: community.
- Snapshot: `data/raw/pantone/pantone-coated.json`,
  `data/raw/pantone/pantone-uncoated.json`.
- Notes: pre-2019 set of 1,341 codes per finish. Hex values are community
  approximations, not official Pantone conversions.

## Pantone TCX (`TCX`)

- Source: [`pedroduke/pantone-tcx`](https://github.com/pedroduke/pantone-tcx),
  `src/pantoneColors.js`.
- License: ISC (repository license).
- Provenance: community.
- Snapshot: `data/raw/pantone/tcx.js`.
- Notes: 2,800 named TCX references with hex values.

## Pantone TPX, legacy (`TPX`)

- Source: [`jacobbubu/color-books`](https://github.com/jacobbubu/color-books),
  `color-books/PANTONE® FHI Color Guide.json`.
- License: **no license file in the source repository.** The upstream data is
  redistributed without an explicit grant. Treat it as a legacy reference, keep
  it swappable, and replace it if a licensed TPX source becomes available.
- Provenance: legacy.
- Snapshot: `data/raw/pantone/tpx.json`.
- Notes: 2,100 TPX references stored as Lab D50 triples, converted to sRGB at
  build time. TPX is not TCX: values are kept in a separate system and are not
  merged even when codes collide.

## Madeira Polyneon 40 (`MP`) and Rayon 40 (`MR`)

- Source: [`inkstitch/inkstitch` palettes](https://github.com/inkstitch/inkstitch/tree/main/palettes),
  `InkStitch Madeira Polyneon.gpl` and `InkStitch Madeira Rayon.gpl`.
- License: GPL-3.0 (Ink/Stitch repository and palette files). The palette
  snapshots remain GPL-3.0; they are not relicensed as MIT.
- Provenance: manufacturer (RGB values published by the palette maintainers
  from physical shade cards).
- Snapshots: `data/raw/madeira/polyneon-40.gpl`,
  `data/raw/madeira/rayon-40.gpl`.
- Notes: Polyneon 349 codes, Rayon 357 codes. Official Madeira shade cards list
  different totals (Polyneon ~432, Rayon ~180). This launch ships the Ink/Stitch
  community palettes as-is; the Rayon set is a community palette and may be
  incomplete. No official RGB table exists from Madeira.

## Durak Polysoft (`DPS`) and Visco (`DVS`)

- Source: Durak digital shade cards,
  `https://api.durakportal.com/api/DijitalKartela/Polysoft` and
  `.../Visco`.
- License: used with the manufacturer's permission; the API and colour data are
  not public-domain. Do not redistribute the snapshots outside this repository
  without Durak's consent.
- Provenance: manufacturer.
- Snapshots: `data/raw/durak/polysoft.json`, `data/raw/durak/visco.json`.
- Notes: Polysoft 420 codes, Visco 441 codes, captured from the undocumented
  API that powers Durak's own digital shade-card app. The product page claims
  480 Visco codes; the API is the launch truth. No names are supplied, so the
  dataset uses `Polysoft {code}` / `Visco {code}` fallbacks.

## Trademarks

PANTONE® is a trademark of Pantone LLC. Madeira and Durak names are trademarks
of their respective owners. They are used here only to identify the colour
systems being converted.
