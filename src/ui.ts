import type { ColorRow, Match, SystemMeta } from "./types.ts";
import { hexToRgb, rgbToCmyk } from "./color.ts";

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

/* ---------- summary ---------- */

function renderSummary(view: ResultsView): HTMLElement {
  const summary = el("div", "result-summary");

  const input = el("div", "summary-input");
  input.append(swatch(view.inputHex, "swatch summary-swatch"));
  const inputText = el("div", "summary-text");
  inputText.append(el("span", "field-label", "Input"));
  inputText.append(el("span", "summary-hex mono", view.inputHex.toUpperCase()));
  inputText.append(el("span", "summary-name", view.inputLabel));
  input.append(inputText);

  const closest = el("div", "summary-closest");
  closest.append(el("span", "field-label", "Closest overall"));
  if (view.closest) {
    const { meta, match } = view.closest;
    const line = el("span", "summary-match");
    line.append(swatch(match.row.hex, "swatch swatch-xs"));
    line.append(el("span", "mono", match.row.code));
    line.append(el("span", "summary-system", meta.label));
    closest.append(line);
    closest.append(
      el(
        "span",
        `summary-de mono${match.deltaE > 5 ? " is-warning" : ""}`,
        `ΔE00 ${formatDelta(match.deltaE)} · ${deltaBand(match.deltaE).text}`,
      ),
    );
  } else {
    closest.append(el("span", "summary-name", "No colour data."));
  }

  summary.append(input, closest);
  return summary;
}

/* ---------- result table ---------- */

const COLUMNS = ["System", "Code", "Match", "Hex", "ΔE00", "Copy"] as const;

function renderNearest(matches: Match[]): HTMLDetailsElement {
  const details = el("details", "nearest");
  const summary = el("summary", "nearest-summary");
  summary.append(el("span", undefined, "5 nearest"));
  details.append(summary);

  const list = el("ol", "nearest-list");
  for (const match of matches) {
    const item = el("li", "nearest-item");
    item.append(swatch(match.row.hex, "swatch swatch-xs"));
    const text = el("span", "nearest-text");
    const top = el("span", "nearest-top");
    top.append(el("span", "nearest-code mono", match.row.code));
    top.append(el("span", "nearest-name", match.row.name));
    text.append(top);
    const bottom = el("span", "nearest-bottom mono");
    bottom.append(el("span", undefined, match.row.hex));
    bottom.append(el("span", undefined, `ΔE ${formatDelta(match.deltaE)}`));
    text.append(bottom);
    item.append(text);
    list.append(item);
  }
  details.append(list);
  return details;
}

function renderRow(system: SystemResult): HTMLTableRowElement {
  const tr = el("tr", "result-row");
  const best = system.matches[0] ?? null;
  const primary = system.sameCode ?? (system.noClose ? null : best);
  if (!primary) tr.classList.add("is-none");

  const tdSystem = el("td", "cell-system");
  tdSystem.dataset.label = "System";
  tdSystem.append(el("span", "system-label", system.meta.label));
  tdSystem.append(el("span", "system-short mono", system.meta.short));
  tr.append(tdSystem);

  const tdCode = el("td", "cell-code");
  tdCode.dataset.label = "Code";
  tdCode.append(el("span", "mono", primary ? primary.row.code : "—"));

  const tdMatch = el("td", "cell-match");
  tdMatch.dataset.label = "Match";
  if (primary) {
    const title = el("span", "row-title");
    title.append(swatch(primary.row.hex, "swatch swatch-row"));
    title.append(el("span", undefined, primary.row.name));
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
    tdMatch.append(el("span", "row-title", "No close match in this system"));
    if (best) {
      tdMatch.append(
        el(
          "span",
          "row-values mono",
          `Nearest ${best.row.code} · ΔE ${formatDelta(best.deltaE)}`,
        ),
      );
    }
  }
  if (system.matches.length > 1) tdMatch.append(renderNearest(system.matches));

  const tdHex = el("td", "cell-hex");
  tdHex.dataset.label = "Hex";
  tdHex.append(el("span", "mono", primary ? primary.row.hex : "—"));

  const tdDe = el("td", "cell-de");
  tdDe.dataset.label = "ΔE00";
  const band = primary ? deltaBand(primary.deltaE) : { text: "no close match", tone: "none" as Tone };
  tdDe.append(el("span", "de-value mono", primary ? formatDelta(primary.deltaE) : "—"));
  tdDe.append(el("span", `de-band${band.tone === "none" ? " is-warning" : ""}`, band.text));

  const tdCopy = el("td", "cell-copy");
  tdCopy.dataset.label = "Copy";
  const copy = el("button", "copy-button", "Copy");
  copy.type = "button";
  copy.disabled = !primary;
  copy.setAttribute(
    "aria-label",
    primary ? `Copy ${primary.row.code} from ${system.meta.label}` : "No value to copy",
  );
  if (primary) {
    copy.dataset.copy = rowCopyLine(system.meta, primary);
    copy.dataset.copyLabel = `${primary.row.code}, ${system.meta.label}`;
  }
  tdCopy.append(copy);

  tr.append(tdCode, tdMatch, tdHex, tdDe, tdCopy);
  return tr;
}

export function renderResults(root: HTMLElement, view: ResultsView): void {
  const fragment = document.createDocumentFragment();
  fragment.append(renderSummary(view));

  const table = el("table", "result-table");
  table.append(
    el("caption", "visually-hidden", "Nearest colour in each system with codes and values."),
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
  for (const system of view.systems) tbody.append(renderRow(system));
  table.append(tbody);
  fragment.append(table);
  root.replaceChildren(fragment);
}

/* ---------- name search ---------- */

export function renderCandidates(
  root: HTMLElement,
  rows: ColorRow[],
  onPick: (row: ColorRow) => void,
): void {
  const wrap = el("div", "candidates");
  wrap.append(el("p", "field-label", "Name matches — choose one"));

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
  panel.append(el("p", "error-title", "Colour data failed to load."));
  panel.append(el("p", "error-detail", "The dataset did not arrive. Reload the page or retry."));
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
    const source = el("span", "library-source", system.source);
    const count = el("span", "library-count mono", formatCount(system.count));
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
