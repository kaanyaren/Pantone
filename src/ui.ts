import type { ColorRow, Match, SystemMeta } from "./types.ts";
import { hexToRgb, pickSwatchText, rgbToCmyk } from "./color.ts";

/* Hallmark · pre-emit critique: P5 H4 E5 S4 R5 V5 */

export interface SystemResult {
  meta: SystemMeta;
  matches: Match[];
  sameCode: Match | null;
  sameCodeIsInput: boolean;
  exact: boolean;
  noClose: boolean;
}

export interface ResultsView {
  inputHex: string;
  inputLabel: string;
  systems: SystemResult[];
  closest: { meta: SystemMeta; match: Match } | null;
}

type Tone = "neutral" | "warn" | "none";

/* ---------- small DOM helpers ---------- */

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

function label(text: string): HTMLParagraphElement {
  return el("p", "label", text);
}

function swatch(hex: string, className = "swatch"): HTMLSpanElement {
  const node = el("span", className);
  node.style.setProperty("--swatch", hex);
  node.setAttribute("aria-hidden", "true");
  return node;
}

function rgbText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "—";
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

function cmykText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "—";
  const cmyk = rgbToCmyk(rgb);
  return `${Math.round(cmyk.c)} ${Math.round(cmyk.m)} ${Math.round(cmyk.y)} ${Math.round(cmyk.k)}`;
}

export function deltaBand(deltaE: number): { text: string; tone: Tone } {
  if (deltaE === 0) return { text: "same value", tone: "neutral" };
  if (deltaE <= 1) return { text: "near identical", tone: "neutral" };
  if (deltaE <= 2) return { text: "close", tone: "neutral" };
  if (deltaE <= 3.5) return { text: "noticeable", tone: "warn" };
  if (deltaE <= 5) return { text: "loose", tone: "warn" };
  return { text: "no close match", tone: "none" };
}

function formatDelta(deltaE: number): string {
  return deltaE.toFixed(2);
}

function rowCopyLine(meta: SystemMeta, match: Match): string {
  const d = deltaBand(match.deltaE);
  return [
    meta.label,
    match.row.code,
    match.row.name,
    match.row.hex,
    `RGB ${rgbText(match.row.hex)}`,
    `CMYK ${cmykText(match.row.hex)}`,
    `ΔE00 ${formatDelta(match.deltaE)} (${d.text})`,
  ].join(" · ");
}

/* ---------- result hero ---------- */

function renderHero(view: ResultsView): HTMLElement {
  const hero = el("div", "result-hero");

  const figure = el("div", "input-figure");
  const bigSwatch = swatch(view.inputHex, "swatch swatch-large");
  bigSwatch.dataset.tone = pickSwatchText(view.inputHex);
  bigSwatch.textContent = view.inputHex.toUpperCase();
  figure.append(bigSwatch);

  const inputMeta = el("div", "input-meta");
  inputMeta.append(label("Input"));
  inputMeta.append(el("p", "input-hex mono", view.inputHex.toUpperCase()));
  inputMeta.append(el("p", "input-name", view.inputLabel));

  const closest = el("div", "closest");
  closest.append(label("Closest overall"));
  if (view.closest) {
    const { meta, match } = view.closest;
    const line = el("p", "closest-line");
    line.append(swatch(match.row.hex, "swatch swatch-inline"));
    line.append(el("span", "closest-code mono", match.row.code));
    line.append(el("span", "closest-system", meta.label));
    closest.append(line);
    closest.append(el("p", "closest-name", match.row.name));
    const band = deltaBand(match.deltaE);
    const de = el(
      "p",
      `closest-de mono${band.tone === "none" ? " is-warning" : ""}`,
      `ΔE00 ${formatDelta(match.deltaE)} · ${band.text}`,
    );
    closest.append(de);
    if (match.row.hex !== match.mappedHex) {
      closest.append(
        el("p", "closest-mapped", `sRGB mapped from ${match.row.hex} to ${match.mappedHex}`),
      );
    }
  } else {
    closest.append(el("p", "closest-name", "No colour data for this query."));
  }

  hero.append(figure, inputMeta, closest);
  return hero;
}

/* ---------- result table ---------- */

const COLUMNS = [
  "System",
  "Code",
  "Name",
  "Swatch",
  "Hex",
  "RGB",
  "CMYK",
  "ΔE00",
  "Copy",
] as const;

function renderNearest(meta: SystemMeta, matches: Match[]): HTMLDetailsElement {
  const details = el("details", "nearest");
  const summary = el("summary", "nearest-summary");
  summary.append(el("span", undefined, "Nearest in this system"));
  summary.append(el("span", "nearest-count mono", `${matches.length} nearest`));
  details.append(summary);

  const list = el("ol", "nearest-list");
  for (const match of matches) {
    const item = el("li", "nearest-item");
    item.append(swatch(match.row.hex, "swatch swatch-xs"));
    const code = el("span", "nearest-code mono", match.row.code);
    const name = el("span", "nearest-name", match.row.name);
    const hex = el("span", "nearest-hex mono", match.row.hex);
    const de = el("span", "nearest-de mono", `ΔE ${formatDelta(match.deltaE)}`);
    item.append(code, name, hex, de);
    list.append(item);
  }
  details.append(list);
  return details;
}

function renderRow(system: SystemResult): {
  row: HTMLTableRowElement;
  detail: HTMLTableRowElement | null;
} {
  const tr = el("tr", "result-row");
  if (system.noClose) tr.classList.add("is-none");

  const best = system.matches[0] ?? null;
  const primary = system.sameCode ?? (system.noClose ? null : best);
  const band = primary ? deltaBand(primary.deltaE) : { text: "no close match", tone: "none" as Tone };

  const tdSystem = el("td", "cell-system");
  tdSystem.dataset.label = "System";
  tdSystem.append(el("span", "system-label", system.meta.label));
  tdSystem.append(el("span", "system-short mono", system.meta.short));
  tr.append(tdSystem);

  const tdCode = el("td", "cell-code");
  tdCode.dataset.label = "Code";
  tdCode.append(el("span", "mono", primary ? primary.row.code : "—"));

  const tdName = el("td", "cell-name");
  tdName.dataset.label = "Name";
  tdName.append(
    el(
      "span",
      "row-title",
      primary ? primary.row.name : "No close match in this system",
    ),
  );
  if (system.sameCode && !system.sameCodeIsInput) {
    tdName.append(el("span", "row-note", "same code · different substrate"));
  }

  const tdSwatch = el("td", "cell-swatch");
  tdSwatch.dataset.label = "Swatch";
  if (primary) tdSwatch.append(swatch(primary.row.hex, "swatch swatch-cell"));
  else tdSwatch.append(el("span", "cell-empty", "—"));

  const tdHex = el("td", "cell-hex");
  tdHex.dataset.label = "Hex";
  if (primary) {
    tdHex.append(el("span", "mono", primary.row.hex));
    if (primary.row.hex !== primary.mappedHex) {
      tdHex.append(el("span", "mapped mono", `→ ${primary.mappedHex}`));
    }
  } else tdHex.append(el("span", "cell-empty", "—"));

  const tdRgb = el("td", "cell-rgb");
  tdRgb.dataset.label = "RGB";
  tdRgb.append(el("span", "mono", primary ? rgbText(primary.row.hex) : "—"));

  const tdCmyk = el("td", "cell-cmyk");
  tdCmyk.dataset.label = "CMYK";
  tdCmyk.append(el("span", "mono", primary ? cmykText(primary.row.hex) : "—"));

  const tdDe = el("td", "cell-de");
  tdDe.dataset.label = "ΔE00";
  const deValue = el("span", "de-value mono", primary ? formatDelta(primary.deltaE) : "—");
  tdDe.append(deValue);
  if (primary) tdDe.append(el("span", "de-band", band.text));

  const tdCopy = el("td", "cell-copy");
  tdCopy.dataset.label = "Copy";
  const copy = el("button", "copy-button", "Copy");
  copy.type = "button";
  copy.disabled = !primary;
  copy.setAttribute(
    "aria-label",
    primary ? `Copy ${primary.row.code} from ${system.meta.label}` : `No value to copy`,
  );
  if (primary) {
    copy.dataset.copy = rowCopyLine(system.meta, primary);
    copy.dataset.copyLabel = `${primary.row.code}, ${system.meta.label}`;
  }
  tdCopy.append(copy);

  tr.append(tdCode, tdName, tdSwatch, tdHex, tdRgb, tdCmyk, tdDe, tdCopy);

  const detail = el("tr", "detail-row");
  const td = el("td", "detail-cell");
  td.colSpan = COLUMNS.length;
  if (system.matches.length > 1) {
    td.append(renderNearest(system.meta, system.matches));
    detail.append(td);
    return { row: tr, detail };
  }
  return { row: tr, detail: null };
}

export function renderResults(root: HTMLElement, view: ResultsView): void {
  const fragment = document.createDocumentFragment();
  fragment.append(renderHero(view));

  const tableWrap = el("div", "table-wrap");
  const table = el("table", "result-table");

  const caption = el("caption", "visually-hidden", "Nearest colour in each system with codes and values.");
  table.append(caption);

  const colgroup = el("colgroup");
  for (const width of ["15%", "9%", "18%", "8%", "11%", "11%", "11%", "8%", "9%"]) {
    const col = el("col");
    col.style.width = width;
    colgroup.append(col);
  }
  table.append(colgroup);

  const thead = el("thead");
  const headRow = el("tr");
  for (const column of COLUMNS) headRow.append(el("th", undefined, column));
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  for (const system of view.systems) {
    const { row, detail } = renderRow(system);
    tbody.append(row);
    if (detail) tbody.append(detail);
  }
  table.append(tbody);
  tableWrap.append(table);
  fragment.append(tableWrap);

  root.replaceChildren(fragment);
}

/* ---------- candidates for name search ---------- */

export function renderCandidates(
  root: HTMLElement,
  rows: ColorRow[],
  onPick: (row: ColorRow) => void,
): void {
  const wrap = el("div", "candidates");
  wrap.append(label("Name matches — choose one"));

  const list = el("ul", "candidate-list");
  for (const row of rows) {
    const item = el("li");
    const button = el("button", "candidate");
    button.type = "button";
    button.append(swatch(row.hex, "swatch swatch-xs"));
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

/* ---------- loading, error, libraries ---------- */

export function renderLoading(root: HTMLElement, rows = 6): void {
  const wrap = el("div", "skeleton-wrap");
  wrap.setAttribute("aria-hidden", "true");
  for (let index = 0; index < rows; index += 1) {
    const row = el("div", "skeleton-row");
    for (const width of ["14%", "10%", "26%", "6%", "12%", "12%", "10%"]) {
      const block = el("span", "skeleton");
      block.style.width = width;
      row.append(block);
    }
    wrap.append(row);
  }
  root.replaceChildren(wrap);
}

export function renderDataError(root: HTMLElement, onRetry: () => void): void {
  const panel = el("div", "data-error");
  panel.append(el("p", "error-title", "Colour data failed to load."));
  panel.append(el("p", "error-detail", "The dataset file did not arrive. Reload the page or retry."));
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
  const list = el("ol", "library-index");
  for (const system of systems) {
    const item = el("li", "library-row");

    const name = el("div", "library-name");
    name.append(el("span", "library-title", system.label));
    name.append(el("span", "library-id mono", system.id));

    const provenance = el("div", "library-provenance");
    provenance.append(el("span", "library-family", system.family));
    provenance.append(el("span", "library-origin", system.provenance));

    const source = el("div", "library-source");
    source.append(el("span", "library-source-name", system.source));
    source.append(el("span", "library-license mono", system.license));

    const count = el("div", "library-count");
    count.append(el("span", "mono", formatCount(system.count)));
    count.append(el("span", "library-count-label", "colours"));

    item.append(name, provenance, source, count);
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
    const band = deltaBand(primary.deltaE);
    lines.push(
      [
        system.meta.label,
        primary.row.code,
        primary.row.name,
        primary.row.hex,
        rgbText(primary.row.hex),
        cmykText(primary.row.hex),
        formatDelta(primary.deltaE),
        band.text,
      ].join("\t"),
    );
  }
  return lines.join("\n");
}
