# PantonAK

## Product Truth

PantonAK is a fast, static colour cross-reference and conversion workbench for textile designers, print production teams, and machine-embroidery shops. It converts any colour input—Pantone Solid Coated (`C`), Solid Uncoated (`U`), Fashion Home + Interiors cotton (`TCX`), legacy paper (`TPX`), Madeira embroidery thread (`Polyneon 40`, `Rayon 40`), Durak Tekstil embroidery thread (`Polysoft`, `Visco`), `HEX`, `RGB`, `CMYK`, or colour name—into the nearest match across all eight libraries ranked by CIEDE2000 (`ΔE00`) on CIELAB D50.

## Audience & Usage Scene

- **Who:** Apparel and textile product developers, print pre-press operators, and commercial embroidery digitizers.
- **Scene:** At a desk or shop-floor workstation under D50/D65 light with physical shade cards or garment tech packs open, needing an immediate, trustworthy cross-system code and perceptual distance (`ΔE00`) to specify or substitute inks and threads.
- **Task:** Enter a code, colour value, or name; inspect the closest matches across all 8 systems; compare perceptual distance (`ΔE00`); verify same-code substrate shifts (`C` vs `U`, `TCX` vs `TPX`); and copy codes, hex values, or a full TSV spec table.

## Non-Negotiable Constraints

1. **Nearest match, never false equivalence:** Every cross-system result shows `ΔE00` and its perceptual band (`same value`, `near identical`, `close`, `noticeable`, `loose`, `no close match`).
2. **Same-code substrate honesty:** `186 C` vs `186 U` and `19-4052 TCX` vs `19-4052 TPX` are paired as same-code counterparts with explicit `same code · different substrate` labelling, never cross-paired into unrelated thread codes.
3. **Unprofiled CMYK & approximate thread RGB:** CMYK is explicitly labelled unprofiled; thread RGBs are manufacturer/community approximations.
4. **Distinguishable codes:** All codes, hex values, RGB/CMYK triples, and `ΔE00` figures use a monospace face with slashed/dotted zero (`"zero" 1`, `tabular-nums`) so `0`/`O` and `1`/`l` never collide.
5. **Static, zero-signup, instant:** Client-side dataset of 9,149 rows across 8 systems, shareable `?q=` URLs, deployed on GitHub Pages.
