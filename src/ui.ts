import type { ColorRow, Match, SystemId, SystemMeta } from "./types.ts";
import { hexToRgb, rgbToCmyk, rgbToLab } from "./color.ts";
import { DICTIONARY, type Lang } from "./i18n.ts";

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

export interface Suggestion {
  row: ColorRow; // exact row, so short Durak codes do not fall back to text search
  query: string; // text inserted into input, e.g. "186 C" or "Classic 1147"
  code: string; // row.code
  name: string; // row.name
  system: string; // meta.short, e.g. "C", "TCX", "Classic"
  hex: string;
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

const LICENSE_LABELS: Record<string, string> = {
  "No license file": "Lisans dosyası yok",
  "manufacturer permission (not public)": "üretici izni (kamuya açık değil)",
};

export function deltaBand(deltaE: number, lang: Lang = "tr"): { text: string; tone: Tone } {
  const t = DICTIONARY[lang].deltaBands;
  if (deltaE === 0) return { text: t.exact, tone: "exact" };
  if (deltaE <= 1) return { text: t.near, tone: "exact" };
  if (deltaE <= 2) return { text: t.close, tone: "close" };
  if (deltaE <= 3.5) return { text: t.noticeable, tone: "warn" };
  if (deltaE <= 5) return { text: t.loose, tone: "warn" };
  return { text: t.noClose, tone: "none" };
}

function formatDelta(deltaE: number): string {
  return deltaE.toFixed(2);
}

/** Hide names that only repeat the code and system (e.g. "186 C", "Polysoft 3095"). */
export function secondaryName(row: ColorRow, systemShort: string): string {
  const name = row.name.trim();
  if (!name) return "";
  const code = row.code.trim();
  const short = systemShort.trim();
  const lower = name.toLowerCase();
  if (lower === code.toLowerCase()) return "";
  if (lower === `${code} ${short}`.toLowerCase()) return "";
  if (lower === `${short} ${code}`.toLowerCase()) return "";
  return name;
}

export function formatRowCode(row: ColorRow): string {
  switch (row.system) {
    case "C":
    case "U":
    case "TCX":
    case "TPX":
      return `${row.code} ${row.system}`;
    case "MP":
      return `Polyneon ${row.code}`;
    case "MR":
      return `Classic ${row.code}`;
    case "DPS":
      return `Polysoft ${row.code}`;
    case "DVS":
      return `Visco ${row.code}`;
    default:
      return row.code;
  }
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
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  const fragment = document.createDocumentFragment();
  const target = active ?? (view.closest ? { ...view.closest, pinned: false } : null);

  badgeNode.textContent = target
    ? active?.pinned
      ? `${t.loupePinned} · ${target.meta.short}`
      : `${t.loupeCompare} · ${target.meta.short}`
    : t.loupeCompareEmpty;

  const loupe = el("div", "loupe-card");
  const split = el("div", "loupe-split");

  const leftHalf = el("div", "loupe-half loupe-left");
  leftHalf.style.setProperty("--swatch", view.inputHex);

  const rightHalf = el("div", "loupe-half loupe-right");
  if (target) {
    rightHalf.style.setProperty("--swatch", target.match.row.hex);
  } else {
    rightHalf.style.setProperty("--swatch", view.inputHex);
  }

  split.append(leftHalf, rightHalf);

  const captions = el("div", "loupe-captions");

  const leftCap = el("div", "loupe-caption loupe-caption-left");
  leftCap.append(el("span", "loupe-tag", t.loupeInput));
  leftCap.append(el("strong", "loupe-code mono", view.inputLabel));
  leftCap.append(el("span", "loupe-hex mono", view.inputHex.toUpperCase()));

  const rightCap = el("div", "loupe-caption loupe-caption-right");
  if (target) {
    rightCap.append(el("span", "loupe-tag", target.meta.short));
    rightCap.append(el("strong", "loupe-code mono", target.match.row.code));
    rightCap.append(el("span", "loupe-hex mono", target.match.row.hex));
  } else {
    rightCap.append(el("span", "loupe-tag", t.loupeCompare));
    rightCap.append(el("span", "loupe-hex mono", t.loupeNoTarget));
  }

  captions.append(leftCap, rightCap);
  loupe.append(split, captions);

  if (target) {
    const band = deltaBand(target.match.deltaE, lang);
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
    { label: t.cmykUnprofiled, value: cmykVal, copy: `cmyk(${cmykVal.replace(/\s+/g, ", ")})` },
    { label: "CIELAB D50", value: labVal, copy: `lab(${labVal})` },
  ];

  for (const item of items) {
    const btn = el("button", "coord-cell");
    btn.type = "button";
    btn.dataset.copy = item.copy;
    btn.dataset.copyLabel = item.label;
    btn.setAttribute("aria-label", t.coordCopyAria(item.label, item.value));
    btn.append(
      el("span", "coord-label", item.label),
      el("span", "coord-value mono", item.value),
    );
    coords.append(btn);
  }
  fragment.append(coords);

  /* Compact ΔE00 readout across the 8 systems */
  const ruler = el("div", "tolerance-card");
  const rulerHead = el("div", "tolerance-head");
  rulerHead.append(el("span", "tolerance-title", t.deltaDistribution));
  ruler.append(rulerHead);

  const pinList = el("div", "tolerance-list");
  for (const sys of view.systems) {
    const primary = sys.sameCode ?? sys.matches[0];
    if (!primary) continue;
    const band = deltaBand(primary.deltaE, lang);
    const pin = el(
      "button",
      `tolerance-chip tone-${band.tone}${target?.meta.id === sys.meta.id ? " is-selected" : ""}`,
    );
    pin.type = "button";
    pin.dataset.systemId = sys.meta.id;
    pin.setAttribute(
      "aria-label",
      `${sys.meta.label}: ${primary.row.code}, ΔE00 ${formatDelta(primary.deltaE)}`,
    );
    pin.append(
      el("span", "chip-lib mono", sys.meta.short),
      el("span", "chip-de mono", formatDelta(primary.deltaE)),
    );
    pin.addEventListener("click", () => onSelectSystem(sys.meta.id));
    pinList.append(pin);
  }
  ruler.append(pinList);
  fragment.append(ruler);

  root.replaceChildren(fragment);
}

/* ---------- right pane: 8-library matrix ---------- */

function renderThreadSummary(
  view: ResultsView,
  onPickRow: (row: ColorRow) => void,
  lang: Lang = "tr",
): HTMLElement | null {
  const t = DICTIONARY[lang];
  const picks = view.systems
    .filter((system) => system.meta.family !== "pantone")
    .map((system) => ({ meta: system.meta, match: system.matches[0] }))
    .filter((pick): pick is { meta: SystemMeta; match: Match } => Boolean(pick.match))
    .sort((a, b) => a.match.deltaE - b.match.deltaE);
  if (picks.length === 0) return null;

  const section = el("section", "thread-summary");
  section.setAttribute("aria-label", t.threadSummaryLabel);
  section.append(el("span", "thread-heading", t.threadHeading));

  const row = el("div", "thread-row");
  for (const pick of picks) {
    const chip = el("button", "thread-pick");
    chip.type = "button";
    chip.setAttribute(
      "aria-label",
      `${t.convert} ${pick.meta.label} ${pick.match.row.code} (${pick.match.row.name}), ΔE00 ${formatDelta(pick.match.deltaE)}`,
    );
    chip.append(
      swatch(pick.match.row.hex, "swatch thread-swatch"),
      el("span", "thread-name", pick.meta.short),
      el("span", "thread-code mono", pick.match.row.code),
      el("span", "thread-de mono", `ΔE ${formatDelta(pick.match.deltaE)}`),
    );
    chip.addEventListener("click", () => onPickRow(pick.match.row));
    row.append(chip);
  }
  section.append(row);
  return section;
}

function renderNearest(
  meta: SystemMeta,
  matches: Match[],
  onInspect: (meta: SystemMeta, match: Match, pinned: boolean) => void,
  onPickRow: (row: ColorRow) => void,
  lang: Lang = "tr",
): HTMLDetailsElement {
  const t = DICTIONARY[lang];
  const details = el("details", "nearest");
  const summary = el("summary", "nearest-summary");
  summary.append(el("span", undefined, t.nearestFirst5));
  details.append(summary);

  const list = el("ol", "nearest-list");
  for (const match of matches) {
    const item = el("li", "nearest-item");
    const pick = el("button", "nearest-pick");
    pick.type = "button";
    pick.setAttribute(
      "aria-label",
      t.inspectCandidateAria(
        meta.short,
        match.row.code,
        match.row.name,
        formatDelta(match.deltaE),
      ),
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
  lang: Lang = "tr",
): HTMLTableRowElement {
  const t = DICTIONARY[lang];
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

  const tdHead = el("td", "cell-head");
  tdHead.dataset.label = t.columns[0];
  const headTitle = el("div", "head-title");
  headTitle.append(dualSwatch(inputHex, primary ? primary.row.hex : (best ? best.row.hex : inputHex)));
  headTitle.append(el("span", "head-lib", `${system.meta.label}\u00A0`));

  const headCode = el("span", "head-code mono", primary ? primary.row.code : "—");
  if (primary) {
    const fullCode = formatRowCode(primary.row);
    headCode.dataset.copyable = "true";
    headCode.dataset.copyCode = fullCode;
    headCode.setAttribute("role", "button");
    headCode.setAttribute("tabindex", "0");
    headCode.setAttribute("aria-label", t.copyCodeAria(fullCode));
    headCode.title = t.copyCodeTitle;
  }
  headTitle.append(headCode);
  tdHead.append(headTitle);

  const secondary = primary ? secondaryName(primary.row, system.meta.short) : "";
  if (secondary) {
    tdHead.append(el("span", "head-name", secondary));
  }
  if (primary) {
    if (system.sameCode && !system.sameCodeIsInput) {
      tdHead.append(el("span", "row-note", t.sameCodeDifferentSubstrate));
    }
  } else {
    tdHead.append(el("span", "row-title", t.noCloseMatchHeading));
    if (best) {
      tdHead.append(
        el(
          "span",
          "row-values mono",
          t.closestCandidate(best.row.code, best.row.hex, formatDelta(best.deltaE)),
        ),
      );
    }
  }
  if (system.matches.length > 1) {
    tdHead.append(renderNearest(system.meta, system.matches, onInspect, onPickRow, lang));
  }

  const tdDe = el("td", "cell-de");
  tdDe.dataset.label = t.columns[1];
  const band = primary
    ? deltaBand(primary.deltaE, lang)
    : { text: t.deltaBands.noClose, tone: "none" as Tone };
  const deLine = el("span", "de-line");
  deLine.append(
    el("span", "de-label mono", "ΔE00"),
    el("span", "de-value mono", primary ? formatDelta(primary.deltaE) : "—"),
    el("span", `tone-pill tone-${band.tone}`, band.text),
  );
  tdDe.append(deLine);
  if (primary) {
    const convert = el("button", "card-convert", t.convert);
    convert.type = "button";
    convert.setAttribute("aria-label", t.convertAria(system.meta.label, primary.row.code));
    convert.addEventListener("click", (event) => {
      event.stopPropagation();
      onPickRow(primary.row);
    });
    tdDe.append(convert);
  }

  tr.append(tdHead, tdDe);
  return tr;
}

export function renderResults(
  root: HTMLElement,
  view: ResultsView,
  filter: LibraryFilter,
  selectedSystemId: SystemId | null,
  onInspect: (meta: SystemMeta, match: Match, pinned: boolean) => void,
  onPickRow: (row: ColorRow) => void,
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  const fragment = document.createDocumentFragment();
  const visibleSystems = view.systems.filter((sys) => matchesFilter(sys.meta.id, filter));

  const threadSummary = renderThreadSummary(view, onPickRow, lang);
  if (threadSummary) fragment.append(threadSummary);

  const table = el("table", "result-table");
  table.append(
    el("caption", "visually-hidden", t.matrixCaption),
  );

  const thead = el("thead");
  const headRow = el("tr");
  for (const column of t.columns) {
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
        lang,
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
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  badgeNode.textContent = t.nameSearchTitle;
  const inspectNote = el("div", "empty-inspector");
  inspectNote.append(
    el(
      "p",
      "empty-text",
      t.nameSearchEmpty(queryText),
    ),
  );
  inspectorRoot.replaceChildren(inspectNote);

  const wrap = el("div", "candidates");
  wrap.append(el("p", "candidates-heading", t.nameSearchHeading));

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
  { q: "186 C", label: "186 C", sub: "Pantone C", hex: "#C8102E" },
  { q: "19-4052 TCX", label: "19-4052 TCX", sub: "Classic Blue · Pamuk", hex: "#0F4C81" },
  { q: "Classic 1147", label: "Classic 1147", sub: "Madeira Classic 40", hex: "#B60F2F" },
  { q: "Polyneon 1610", label: "Polyneon 1610", sub: "Madeira Polyneon 40", hex: "#B7C3C5" },
  { q: "Polysoft 00118", label: "Polysoft 00118", sub: "Durak Polysoft", hex: "#5B5951" },
  { q: "Visco 00118", label: "Visco 00118", sub: "Durak Visco", hex: "#A9ACA9" },
];

export function renderEmptyState(
  resultRoot: HTMLElement,
  inspectorRoot: HTMLElement,
  badgeNode: HTMLElement,
  onPickQuery: (q: string) => void,
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  badgeNode.textContent = t.idleBadge;

  const inspectEmpty = el("div", "empty-inspector");
  inspectEmpty.append(
    el(
      "p",
      "empty-text",
      t.idleInspectorText,
    ),
  );
  inspectorRoot.replaceChildren(inspectEmpty);

  const wrap = el("div", "empty-workbench");
  wrap.append(
    el("p", "empty-heading", t.starterHeading),
    el(
      "p",
      "empty-sub",
      t.starterSub,
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

export function renderDataError(
  root: HTMLElement,
  onRetry: () => void,
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  const panel = el("div", "data-error");
  panel.append(el("p", "error-title", t.dataErrorTitle));
  panel.append(el("p", "error-detail", t.dataErrorDetail));
  const retry = el("button", "button button-quiet", t.retry);
  retry.type = "button";
  retry.addEventListener("click", onRetry);
  panel.append(retry);
  root.replaceChildren(panel);
}

const numberFormatTr = new Intl.NumberFormat("tr-TR");
const numberFormatEn = new Intl.NumberFormat("en-US");

export function formatCount(value: number, lang: Lang = "tr"): string {
  return (lang === "en" ? numberFormatEn : numberFormatTr).format(value);
}

export function renderLibraries(
  root: HTMLElement,
  systems: SystemMeta[],
  lang: Lang = "tr",
): void {
  const t = DICTIONARY[lang];
  const list = el("ul", "library-list");
  for (const system of systems) {
    const item = el("li", "library-row");
    const name = el("span", "library-name");
    name.append(el("span", "library-title", system.label));
    name.append(el("span", "library-id mono", system.id));
    const source = el(
      "span",
      "library-source",
      `${system.source} · ${LICENSE_LABELS[system.license] ?? system.license}`,
    );
    const count = el("span", "library-count mono", t.colorsCount(formatCount(system.count, lang)));
    item.append(name, source, count);
    list.append(item);
  }
  root.replaceChildren(list);
}

/* ---------- export ---------- */

export function resultsToTsv(view: ResultsView, lang: Lang = "tr"): string {
  const t = DICTIONARY[lang];
  const header =
    lang === "en"
      ? "System\tCode\tName\tHex\tRGB\tCMYK\tDeltaE00\tBand"
      : "Sistem\tKod\tAd\tHex\tRGB\tCMYK\tDeltaE00\tAralık";
  const lines = [header];
  for (const system of view.systems) {
    const primary = system.sameCode ?? (system.noClose ? null : system.matches[0]);
    if (!primary) {
      lines.push([system.meta.label, "", "", "", "", "", "", t.deltaBands.noClose].join("\t"));
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
        deltaBand(primary.deltaE, lang).text,
      ].join("\t"),
    );
  }
  return lines.join("\n");
}

/* ---------- query suggestions ---------- */

export function renderSuggestions(
  root: HTMLElement,
  items: Suggestion[],
  activeIndex: number,
): void {
  root.hidden = items.length === 0;

  const fragment = document.createDocumentFragment();
  let activeItem: HTMLButtonElement | null = null;

  for (const [index, item] of items.entries()) {
    const button = el("button", "suggestion");
    button.type = "button";
    button.id = `suggestion-${index}`;
    button.dataset.index = String(index);
    button.dataset.query = item.query;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
    if (index === activeIndex) {
      button.classList.add("is-active");
      activeItem = button;
    }
    button.append(
      swatch(item.hex, "swatch swatch-xs"),
      el("span", "suggestion-code mono", item.code),
      el("span", "suggestion-name", item.name),
      el("span", "suggestion-system mono", item.system),
    );
    fragment.append(button);
  }

  root.replaceChildren(fragment);
  activeItem?.scrollIntoView({ block: "nearest" });
}
