import type { ColorRow, Match, SystemId, SystemMeta } from "./types.ts";
import { hexToRgb, rgbToCmyk, rgbToLab } from "./color.ts";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */

export type LibraryFilter = "all" | "print" | "textile" | "madeira" | "durak";

export interface SystemResult {
  meta: SystemMeta;
  matches: Match[];
  sameCode: Match | null;
  sameCodeIsInput: boolean;
  exact: boolean;
  noClose: boolean;
}

export interface ActiveComparison {
  meta: SystemMeta;
  match: Match;
  pinned: boolean;
}

export interface ResultsView {
  inputHex: string;
  inputLabel: string;
  systems: SystemResult[];
  closest: { meta: SystemMeta; match: Match } | null;
}

export type Tone = "exact" | "close" | "warn" | "none";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function swatch(hex: string, className = "swatch"): HTMLSpanElement {
  const node = el("span", className);
  node.style.setProperty("--swatch", hex);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function dualSwatch(inputHex: string, matchHex: string): HTMLSpanElement {
  const wrap = el("span", "dual-swatch");
  wrap.setAttribute("aria-hidden", "true");
  const left = el("span", "dual-half");
  left.style.setProperty("--swatch", inputHex);
  const right = el("span", "dual-half");
  right.style.setProperty("--swatch", matchHex);
  wrap.append(left, right);
  return wrap;
}

function rgbText(hex: string): string {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r} ${rgb.g} ${rgb.b}` : "—";
}

function cmykText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "—";
  const cmyk = rgbToCmyk(rgb);
  return `${Math.round(cmyk.c)} ${Math.round(cmyk.m)} ${Math.round(cmyk.y)} ${Math.round(cmyk.k)}`;
}

function labText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "—";
  const lab = rgbToLab(rgb);
  return `${lab.l.toFixed(1)} ${lab.a.toFixed(1)} ${lab.b.toFixed(1)}`;
}

export function deltaBand(deltaE: number): { text: string; tone: Tone } {
  if (deltaE === 0) return { text: "same value", tone: "exact" };
  if (deltaE <= 1) return { text: "near identical", tone: "exact" };
  if (deltaE <= 2) return { text: "close", tone: "close" };
  if (deltaE <= 3.5) return { text: "noticeable", tone: "warn" };
  if (deltaE <= 5) return { text: "loose", tone: "warn" };
  return { text: "no close match", tone: "none" };
}

function formatDelta(deltaE: number): string {
  return deltaE.toFixed(2);
}

function rowCopyLine(meta: SystemMeta, match: Match): string {
  return [
    meta.label,
    match.row.code,
    match.row.name,
    match.row.hex,
    `RGB ${rgbText(match.row.hex)}`,
    `CMYK ${cmykText(match.row.hex)}`,
    `ΔE00 ${formatDelta(match.deltaE)} (${deltaBand(match.deltaE).text})`,
  ].join(" · ");
}

export function matchesFilter(id: SystemId, filter: LibraryFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "print":
      return id === "C" || id === "U";
    case "textile":
      return id === "TCX" || id === "TPX";
    case "madeira":
      return id === "MP" || id === "MR";
    case "durak":
      return id === "DPS" || id === "DVS";
  }
}

/* ---------- left pane: split swatch loupe & perceptual strip ---------- */

export function renderInspector(
  root: HTMLElement,
  badgeNode: HTMLElement,
  view: ResultsView,
  active: ActiveComparison | null,
  onSelectSystem: (systemId: SystemId) => void,
): void {
  const fragment = document.createDocumentFragment();
  const target = active ?? (view.closest ? { ...view.closest, pinned: false } : null);

  badgeNode.textContent = target
    ? active?.pinned
      ? `Pinned · ${target.meta.short}`
      : `Comparing · ${target.meta.short}`
    : "Input only";

  const loupe = el("div", "loupe-card");
  const split = el("div", "loupe-split");

  const leftHalf = el("div", "loupe-half loupe-left");
  leftHalf.style.setProperty("--swatch", view.inputHex);
  const leftCap = el("div", "loupe-caption");
  leftCap.append(el("span", "loupe-tag", "Input"));
  leftCap.append(el("strong", "loupe-code mono", view.inputLabel));
  leftCap.append(el("span", "loupe-hex mono", view.inputHex.toUpperCase()));
  leftHalf.append(leftCap);

  const rightHalf = el("div", "loupe-half loupe-right");
  if (target) {
    rightHalf.style.setProperty("--swatch", target.match.row.hex);
    const rightCap = el("div", "loupe-caption");
    rightCap.append(el("span", "loupe-tag", target.meta.short));
    rightCap.append(el("strong", "loupe-code mono", target.match.row.code));
    rightCap.append(el("span", "loupe-hex mono", target.match.row.hex));
    rightHalf.append(rightCap);
  } else {
    rightHalf.style.setProperty("--swatch", view.inputHex);
  }

  split.append(leftHalf, rightHalf);
  loupe.append(split);

  if (target) {
    const band = deltaBand(target.match.deltaE);
    const seamBar = el("div", "loupe-seam-bar");
    seamBar.append(
      el("span", "seam-name", `${target.meta.label} · ${target.match.row.name}`),
      el(
        "span",
        `tone-pill tone-${band.tone} mono`,
        `ΔE00 ${formatDelta(target.match.deltaE)} · ${band.text}`,
      ),
    );
    loupe.append(seamBar);
  }

  fragment.append(loupe);

  /* Input coordinate copy grid */
  const coords = el("div", "coord-grid");
  const hexVal = view.inputHex.toUpperCase();
  const rgbVal = rgbText(view.inputHex);
  const cmykVal = cmykText(view.inputHex);
  const labVal = labText(view.inputHex);

  const items: Array<{ label: string; value: string; copy: string }> = [
    { label: "HEX", value: hexVal, copy: hexVal },
    { label: "sRGB", value: rgbVal, copy: `rgb(${rgbVal.replace(/\s+/g, ", ")})` },
    { label: "CMYK (unprofiled)", value: cmykVal, copy: `cmyk(${cmykVal.replace(/\s+/g, ", ")})` },
    { label: "CIELAB D50", value: labVal, copy: `lab(${labVal})` },
  ];

  for (const item of items) {
    const btn = el("button", "coord-cell");
    btn.type = "button";
    btn.dataset.copy = item.copy;
    btn.dataset.copyLabel = item.label;
    btn.setAttribute("aria-label", `Copy ${item.label} ${item.value}`);
    btn.append(
      el("span", "coord-label", item.label),
      el("span", "coord-value mono", item.value),
    );
    coords.append(btn);
  }
  fragment.append(coords);

  /* Perceptual ΔE00 strip across the 8 systems */
  const ruler = el("div", "tolerance-card");
  const rulerHead = el("div", "tolerance-head");
  rulerHead.append(
    el("span", "tolerance-title", "ΔE00 spread across libraries"),
    el("span", "tolerance-hint mono", "0 → 5+"),
  );
  ruler.append(rulerHead);

  const track = el("div", "tolerance-track");
  track.setAttribute("aria-hidden", "true");
  for (const zone of ["≤1", "1–2", "2–3.5", "3.5–5", ">5"]) {
    track.append(el("span", "tolerance-zone mono", zone));
  }
  ruler.append(track);

  const pinList = el("div", "tolerance-pins");
  for (const sys of view.systems) {
    const primary = sys.sameCode ?? sys.matches[0];
    if (!primary) continue;
    const band = deltaBand(primary.deltaE);
    const pin = el(
      "button",
      `tolerance-pin tone-${band.tone}${target?.meta.id === sys.meta.id ? " is-selected" : ""}`,
    );
    pin.type = "button";
    pin.dataset.systemId = sys.meta.id;
    const pct = Math.min(100, Math.max(2, (primary.deltaE / 5) * 100));
    pin.style.setProperty("--de-pct", `${pct.toFixed(1)}%`);
    pin.setAttribute(
      "aria-label",
      `Inspect ${sys.meta.label}: ${primary.row.code}, ΔE00 ${formatDelta(primary.deltaE)}`,
    );
    const pinTop = el("span", "pin-top");
    pinTop.append(
      swatch(primary.row.hex, "swatch swatch-xs"),
      el("span", "pin-short mono", sys.meta.short),
      el("span", "pin-de mono", formatDelta(primary.deltaE)),
    );
    const pinBar = el("span", "pin-bar");
    pinBar.setAttribute("aria-hidden", "true");
    pinBar.append(el("span", "pin-fill"));
    pin.append(pinTop, pinBar);
    pin.addEventListener("click", () => onSelectSystem(sys.meta.id));
    pinList.append(pin);
  }
  ruler.append(pinList);
  fragment.append(ruler);

  root.replaceChildren(fragment);
}

/* ---------- right pane: 8-library matrix ---------- */

const COLUMNS = ["Library", "Code", "Specimen & recipe", "Hex", "ΔE00", "Copy"] as const;

function renderNearest(
  meta: SystemMeta,
  matches: Match[],
  onInspect: (meta: SystemMeta, match: Match, pinned: boolean) => void,
  onPickRow: (row: ColorRow) => void,
): HTMLDetailsElement {
  const details = el("details", "nearest");
  const summary = el("summary", "nearest-summary");
  summary.append(el("span", undefined, "Top 5 in this library"));
  details.append(summary);

  const list = el("ol", "nearest-list");
  for (const match of matches) {
    const item = el("li", "nearest-item");
    const pick = el("button", "nearest-pick");
    pick.type = "button";
    pick.setAttribute(
      "aria-label",
      `Convert ${meta.short} ${match.row.code} (${match.row.name}), ΔE00 ${formatDelta(match.deltaE)}`,
    );
    pick.append(
      swatch(match.row.hex, "swatch swatch-xs"),
      el("span", "nearest-code mono", match.row.code),
      el("span", "nearest-name", match.row.name),
      el("span", "nearest-hex mono", match.row.hex),
      el("span", "nearest-de mono", `ΔE ${formatDelta(match.deltaE)}`),
    );
    pick.addEventListener("mouseenter", () => onInspect(meta, match, false));
    pick.addEventListener("focus", () => onInspect(meta, match, false));
    pick.addEventListener("click", () => onPickRow(match.row));
    item.append(pick);
    list.append(item);
  }
  details.append(list);
  return details;
}

function renderRow(
  inputHex: string,
  system: SystemResult,
  isSelected: boolean,
  onInspect: (meta: SystemMeta, match: Match, pinned: boolean) => void,
  onPickRow: (row: ColorRow) => void,
): HTMLTableRowElement {
  const tr = el("tr", `result-row${isSelected ? " is-inspected" : ""}`);
  tr.dataset.systemId = system.meta.id;
  const best = system.matches[0] ?? null;
  const primary = system.sameCode ?? (system.noClose ? null : best);
  const inspectTarget = primary ?? best;
  if (!primary) tr.classList.add("is-none");

  if (inspectTarget) {
    tr.addEventListener("mouseenter", () => onInspect(system.meta, inspectTarget, false));
    tr.addEventListener("focusin", () => onInspect(system.meta, inspectTarget, false));
  }

  const tdSystem = el("td", "cell-system");
  tdSystem.dataset.label = "Library";
  tdSystem.append(el("span", "system-label", system.meta.label));
  const sysMetaLine = el("span", "system-subline");
  sysMetaLine.append(
    el("span", "system-short mono", system.meta.short),
    el("span", "system-prov", system.meta.provenance),
  );
  tdSystem.append(sysMetaLine);
  tr.append(tdSystem);

  const tdCode = el("td", "cell-code");
  tdCode.dataset.label = "Code";
  tdCode.append(el("span", "code-badge mono", primary ? primary.row.code : "—"));

  const tdMatch = el("td", "cell-match");
  tdMatch.dataset.label = "Specimen";
  if (primary) {
    const title = el("div", "row-title");
    title.append(dualSwatch(inputHex, primary.row.hex));
    title.append(el("span", "row-name-text", primary.row.name));
    tdMatch.append(title);
    if (system.sameCode && !system.sameCodeIsInput) {
      tdMatch.append(el("span", "row-note", "same code · different substrate"));
    }
    tdMatch.append(
      el(
        "span",
        "row-values mono",
        `RGB ${rgbText(primary.row.hex)} · CMYK ${cmykText(primary.row.hex)}`,
      ),
    );
  } else {
    tdMatch.append(el("span", "row-title", "No close match in this library (ΔE00 > 5)"));
    if (best) {
      tdMatch.append(
        el(
          "span",
          "row-values mono",
          `Nearest candidate: ${best.row.code} (${best.row.hex}) · ΔE00 ${formatDelta(best.deltaE)}`,
        ),
      );
    }
  }
  if (system.matches.length > 1) {
    tdMatch.append(renderNearest(system.meta, system.matches, onInspect, onPickRow));
  }

  const tdHex = el("td", "cell-hex");
  tdHex.dataset.label = "Hex";
  tdHex.append(el("span", "mono", primary ? primary.row.hex : "—"));

  const tdDe = el("td", "cell-de");
  tdDe.dataset.label = "ΔE00";
  const band = primary
    ? deltaBand(primary.deltaE)
    : { text: "no close match", tone: "none" as Tone };
  tdDe.append(el("span", "de-value mono", primary ? formatDelta(primary.deltaE) : "—"));
  tdDe.append(el("span", `tone-pill tone-${band.tone}`, band.text));

  const tdCopy = el("td", "cell-copy");
  tdCopy.dataset.label = "Copy";
  const copy = el("button", "copy-button", "Copy row");
  copy.type = "button";
  copy.disabled = !primary;
  copy.setAttribute(
    "aria-label",
    primary
      ? `Copy full specification row for ${primary.row.code} in ${system.meta.label}`
      : "No value to copy",
  );
  if (primary) {
    copy.dataset.copy = rowCopyLine(system.meta, primary);
    copy.dataset.copyLabel = `${primary.row.code} row (${system.meta.label})`;
  }
  tdCopy.append(copy);

  tr.append(tdCode, tdMatch, tdHex, tdDe, tdCopy);
  return tr;
}

export function renderResults(
  root: HTMLElement,
  view: ResultsView,
  filter: LibraryFilter,
  selectedSystemId: SystemId | null,
  onInspect: (meta: SystemMeta, match: Match, pinned: boolean) => void,
  onPickRow: (row: ColorRow) => void,
): void {
  const fragment = document.createDocumentFragment();
  const visibleSystems = view.systems.filter((sys) => matchesFilter(sys.meta.id, filter));

  const table = el("table", "result-table");
  table.append(
    el("caption", "visually-hidden", "Nearest colour in each library with codes and values."),
  );

  const thead = el("thead");
  const headRow = el("tr");
  for (const column of COLUMNS) {
    const th = el("th", undefined, column);
    th.scope = "col";
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  for (const system of visibleSystems) {
    tbody.append(
      renderRow(
        view.inputHex,
        system,
        selectedSystemId === system.meta.id,
        onInspect,
        onPickRow,
      ),
    );
  }
  table.append(tbody);
  fragment.append(table);
  root.replaceChildren(fragment);
}

/* ---------- name search candidates ---------- */

export function renderCandidates(
  root: HTMLElement,
  inspectorRoot: HTMLElement,
  badgeNode: HTMLElement,
  queryText: string,
  rows: ColorRow[],
  onPick: (row: ColorRow) => void,
): void {
  badgeNode.textContent = "Name search";
  const inspectNote = el("div", "empty-inspector");
  inspectNote.append(
    el(
      "p",
      "empty-text",
      `Showing name matches for "${queryText}". Select any swatch on the right to open its 8-library comparison and split loupe.`,
    ),
  );
  inspectorRoot.replaceChildren(inspectNote);

  const wrap = el("div", "candidates");
  wrap.append(el("p", "candidates-heading", "Matching colour names — select one to convert"));

  const list = el("ul", "candidate-list");
  for (const row of rows) {
    const item = el("li");
    const button = el("button", "candidate");
    button.type = "button";
    button.append(swatch(row.hex, "swatch swatch-row"));
    button.append(el("span", "candidate-system mono", row.system));
    button.append(el("span", "candidate-code mono", row.code));
    button.append(el("span", "candidate-name", row.name));
    button.append(el("span", "candidate-hex mono", row.hex));
    button.addEventListener("click", () => onPick(row));
    item.append(button);
    list.append(item);
  }
  wrap.append(list);
  root.replaceChildren(wrap);
}

/* ---------- interactive empty state ---------- */

const STARTER_SWATCHES: Array<{ q: string; label: string; sub: string; hex: string }> = [
  { q: "186 C", label: "186 C", sub: "Pantone Solid Coated", hex: "#C8102E" },
  { q: "19-4052 TCX", label: "19-4052 TCX", sub: "Classic Blue · Cotton", hex: "#0F4C81" },
  { q: "Rayon 1147", label: "Rayon 1147", sub: "Madeira Rayon 40", hex: "#B60F2F" },
  { q: "Polyneon 1610", label: "Polyneon 1610", sub: "Madeira Polyneon 40", hex: "#B7C3C5" },
  { q: "Polysoft 00118", label: "Polysoft 00118", sub: "Durak Polysoft", hex: "#5B5951" },
  { q: "Visco 00118", label: "Visco 00118", sub: "Durak Visco", hex: "#A9ACA9" },
];

export function renderEmptyState(
  resultRoot: HTMLElement,
  inspectorRoot: HTMLElement,
  badgeNode: HTMLElement,
  onPickQuery: (q: string) => void,
): void {
  badgeNode.textContent = "Standby";

  const inspectEmpty = el("div", "empty-inspector");
  inspectEmpty.append(
    el(
      "p",
      "empty-text",
      "Select a starter swatch or enter any Pantone, Madeira, Durak, hex, RGB, or CMYK value above to open the split comparator.",
    ),
  );
  inspectorRoot.replaceChildren(inspectEmpty);

  const wrap = el("div", "empty-workbench");
  wrap.append(
    el("p", "empty-heading", "Quick-start reference specimens"),
    el(
      "p",
      "empty-sub",
      "Pick a specimen below to compare across all eight print, textile, and embroidery thread libraries.",
    ),
  );

  const grid = el("div", "starter-grid");
  for (const item of STARTER_SWATCHES) {
    const btn = el("button", "starter-card");
    btn.type = "button";
    btn.append(
      swatch(item.hex, "swatch starter-swatch"),
      el("span", "starter-code mono", item.label),
      el("span", "starter-sub", item.sub),
      el("span", "starter-hex mono", item.hex),
    );
    btn.addEventListener("click", () => onPickQuery(item.q));
    grid.append(btn);
  }
  wrap.append(grid);
  resultRoot.replaceChildren(wrap);
}

/* ---------- loading, error, libraries ---------- */

export function renderLoading(root: HTMLElement, rows = 5): void {
  const wrap = el("div", "skeleton-wrap");
  wrap.setAttribute("aria-hidden", "true");
  for (let index = 0; index < rows; index += 1) {
    const row = el("div", "skeleton-row");
    row.append(el("span", "skeleton skeleton-wide"));
    row.append(el("span", "skeleton"));
    row.append(el("span", "skeleton skeleton-short"));
    wrap.append(row);
  }
  root.replaceChildren(wrap);
}

export function renderDataError(root: HTMLElement, onRetry: () => void): void {
  const panel = el("div", "data-error");
  panel.append(el("p", "error-title", "Colour dataset failed to load."));
  panel.append(el("p", "error-detail", "The JSON bundle did not arrive. Reload or retry."));
  const retry = el("button", "button button-quiet", "Retry");
  retry.type = "button";
  retry.addEventListener("click", onRetry);
  panel.append(retry);
  root.replaceChildren(panel);
}

const numberFormat = new Intl.NumberFormat("en-US");

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function renderLibraries(root: HTMLElement, systems: SystemMeta[]): void {
  const list = el("ul", "library-list");
  for (const system of systems) {
    const item = el("li", "library-row");
    const name = el("span", "library-name");
    name.append(el("span", "library-title", system.label));
    name.append(el("span", "library-id mono", system.id));
    const source = el("span", "library-source", `${system.source} · ${system.license}`);
    const count = el("span", "library-count mono", `${formatCount(system.count)} colours`);
    item.append(name, source, count);
    list.append(item);
  }
  root.replaceChildren(list);
}

/* ---------- export ---------- */

export function resultsToTsv(view: ResultsView): string {
  const lines = ["System\tCode\tName\tHex\tRGB\tCMYK\tDeltaE00\tBand"];
  for (const system of view.systems) {
    const primary = system.sameCode ?? (system.noClose ? null : system.matches[0]);
    if (!primary) {
      lines.push([system.meta.label, "", "", "", "", "", "", "no close match"].join("\t"));
      continue;
    }
    lines.push(
      [
        system.meta.label,
        primary.row.code,
        primary.row.name,
        primary.row.hex,
        rgbText(primary.row.hex),
        cmykText(primary.row.hex),
        formatDelta(primary.deltaE),
        deltaBand(primary.deltaE).text,
      ].join("\t"),
    );
  }
  return lines.join("\n");
}
