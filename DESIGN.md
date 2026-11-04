---
name: PantonAK
description: Colour and embroidery thread conversion workbench across Pantone C/U/TCX/TPX, Madeira 40, and Durak.
colors:
  paper-d50: "oklch(97.6% 0.008 80)"
  paper-d50-panel: "oklch(94.8% 0.010 80)"
  paper-d50-recessed: "oklch(91.5% 0.012 80)"
  ink-carbon: "oklch(17% 0.012 260)"
  ink-secondary: "oklch(29% 0.012 260)"
  ink-muted: "oklch(43% 0.010 260)"
  rule-hairline: "oklch(86% 0.008 80)"
  rule-control: "oklch(60% 0.010 260)"
  deck-carbon: "oklch(19% 0.015 260)"
  deck-surface: "oklch(24% 0.015 260)"
  deck-elevated: "oklch(29% 0.015 260)"
  deck-ink: "oklch(96% 0.006 80)"
  deck-muted: "oklch(76% 0.008 80)"
  deck-rule: "oklch(52% 0.012 260)"
  rubric-vermilion: "oklch(48% 0.19 30)"
  rubric-vermilion-hover: "oklch(43% 0.19 30)"
  rubric-vermilion-ink: "oklch(98.5% 0.005 80)"
  tolerance-exact: "oklch(40% 0.11 160)"
  tolerance-close: "oklch(41% 0.10 235)"
  tolerance-warn: "oklch(43% 0.12 65)"
  tolerance-none: "oklch(47% 0.19 28)"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sm: "4px"
  control: "6px"
  panel: "8px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.25rem"
  space-6: "1.5rem"
  space-8: "2rem"
  space-10: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.rubric-vermilion}"
    textColor: "{colors.rubric-vermilion-ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 1rem"
  button-primary-hover:
    backgroundColor: "{colors.rubric-vermilion-hover}"
  button-quiet:
    backgroundColor: "{colors.paper-d50}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 0.75rem"
---

# Design System: PantonAK

## Overview

**Creative North Star: "The D50 Lab-Dip & Shade-Card Approval Workbench"**

PantonAK is an Operate-mode colour and embroidery thread cross-reference workbench built around the physical ritual of evaluating dyed fabric swatches, printed Pantone chips, and wound embroidery cones inside a D50 daylight viewing booth. Rather than opening with a marketing hero or sterile un-tinted white cards, the interface divides into a dark slate-carbon command deck at the top and a warm D50 viewing-paper Split Studio workspace below.

**Key Characteristics:**
- **Zero-Ceremony Operate Shell:** Opens directly into a live 8-library conversion workspace (`Split Studio` diptych).
- **Zero-Gap Split Swatch Loupe:** Places the input colour and the inspected target colour edge-to-edge with zero separator so the human eye can judge lightness and chroma shifts without surround bias.
- **Perceptual ΔE00 Tolerance Strip:** Plots all eight libraries along the CIEDE2000 perceptual bands (`0` through `>5`).
- **Distinguishable Code Register:** All codes, hex strings, RGB/CMYK recipes, and `ΔE00` distances use `JetBrains Mono` with `tabular-nums` and `"zero" 1`.

## Colors

The palette pairs a dark carbon instrument header (`--color-deck`) with warm D50 neutral viewing paper (`--color-paper`) so colour swatches sit on an optically neutral warm ground, punctuated by a single rubric vermilion signal accent (`--color-accent`).

### Primary
- **Rubric Vermilion** (`oklch(48% 0.19 30)`): Used strictly for the primary `Match` CTA, active focus rings, and caret.

### Neutral
- **D50 Viewing Paper** (`oklch(97.6% 0.008 80)`): Primary workspace canvas.
- **D50 Panel Paper** (`oklch(94.8% 0.010 80)`): Secondary surface for the sticky specimen loupe rail, filter bar, and reference disclosures.
- **Slate Carbon Deck** (`oklch(19% 0.015 260)`): Top command bar housing search, colour picker, and sample chips.
- **Carbon Ink** (`oklch(17% 0.012 260)`): Primary text (17.8:1 against paper).
- **Control Rule** (`oklch(60% 0.010 260)`): 1px interactive borders (3.7:1 against paper).

### Named Rules
**The 5% Signal Rule.** Rubric vermilion occupies under 5% of any viewport. Colorimetric tolerance pills (`exact`, `close`, `noticeable`, `no close match`) carry semantic status only.

## Typography

**Display & UI Font:** `Archivo` (`ui-sans-serif, system-ui, sans-serif`)
**Data & Code Font:** `JetBrains Mono` (`ui-monospace, SFMono-Regular, Menlo, monospace`)

### Hierarchy
- **Display** (`700`, `1.5rem`, `1.15`): Command deck workbench title (`h1`).
- **Headline** (`700`, `1.125rem`, `1.2`): Pane headings (`h2`).
- **Body** (`400`, `0.875rem`, `1.5`): Technical notes and descriptions (`max-width: 70ch`).
- **Label / Data** (`600`, `0.75rem–0.875rem`, `tabular-nums`, `"zero" 1`): Codes, hex values, RGB/CMYK triples, and `ΔE00` metrics.

## Layout

- **Command Deck:** Full-width dark bar containing brand mark, workbench title, visual colour well + `44px` query input + `Clear` + `Match` buttons, and sample chips.
- **Split Studio Workspace (`max-width: 84rem`):** Two-column asymmetric grid (`21rem minmax(0, 1fr)`) on desktop (`> 68rem`), collapsing to a single column below `68rem`, with stacked labeled table cells below `56rem`.

## Elevation & Depth

Surfaces rely on 1px structural rules (`--color-rule-2` at 3.7:1 contrast) and tonal paper steps (`--color-paper` vs `--color-paper-2`), supplemented by a single soft structural shadow (`0 2px 8px oklch(17% 0.012 260 / 0.08)`) on the two main workspace panes.

## Shapes

- **Small tokens & swatches (`--radius-sm`):** `4px`
- **Interactive controls (`--radius-control`):** `6px`
- **Workspace panes (`--radius-panel`):** `8px`

## Components

- **Search Row Controls:** `44px` uniform height across colour picker well, text input, `Clear`, and `Match` buttons; constant `1px` border width across all 8 states; `2px` focus outline with `1px` offset.
- **Split Swatch Loupe:** Dual `50% / 50%` colour fields meeting at a `0px` seam, with bottom specimen captions and a seam bar displaying `ΔE00` and perceptual band.
- **Comparison Matrix Rows:** Dual mini-swatch `[Input | Match]`, name, substrate note badge, `RGB` / `CMYK` recipe, and inline `Top 5 in this library` disclosure.

## Do's and Don'ts

- **Do** keep all colour and font declarations locked in `tokens.css`.
- **Do** render every code, hex, RGB, CMYK, Lab, and `ΔE00` value in `--font-mono`.
- **Don't** place kickers or eyebrows above headings.
- **Don't** claim cross-system equivalence or profiled CMYK accuracy.
