import type { ColorRow, Dataset, Lab, Match, Query, SystemId } from "./types.ts";
import { cmykToRgb, deltaE2000, hexToRgb, rgbToHex, rgbToLab } from "./color.ts";
import { parseQuery } from "./query.ts";
import { searchColors } from "./search.ts";
import {
  deltaBand,
  renderCandidates,
  renderDataError,
  renderLibraries,
  renderLoading,
  renderResults,
  resultsToTsv,
  type ResultsView,
  type SystemResult,
} from "./ui.ts";

interface Entry {
  row: ColorRow;
  lab: Lab;
}

type LoadState = "loading" | "ready" | "error";

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

const form = byId<HTMLFormElement>("convert-form");
const input = byId<HTMLInputElement>("query-input");
const matchButton = byId<HTMLButtonElement>("match-button");
const queryError = byId<HTMLParagraphElement>("query-error");
const resultsSection = byId<HTMLElement>("results");
const resultBody = byId<HTMLDivElement>("result-body");
const resultStatus = byId<HTMLParagraphElement>("result-status");
const copyAllButton = byId<HTMLButtonElement>("copy-all");
const copyLinkButton = byId<HTMLButtonElement>("copy-link");
const copyStatus = byId<HTMLParagraphElement>("copy-status");
const librariesBody = byId<HTMLDivElement>("libraries-body");
const footData = byId<HTMLParagraphElement>("foot-data");
const footBuild = byId<HTMLParagraphElement>("foot-build");

const SYSTEM_IDS = new Set<SystemId>(["C", "U", "TCX", "TPX", "MP", "MR", "DPS", "DVS"]);

let dataset: Dataset | null = null;
let entries: Entry[] = [];
let colorRows: ColorRow[] = [];
let loadState: LoadState = "loading";
let currentView: ResultsView | null = null;

/* ---------- URL state ---------- */

function queryFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
  } catch {
    return "";
  }
}

function commitUrl(value: string | null): void {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("q", value);
  else url.searchParams.delete("q");
  history.replaceState(null, "", url);
}

/* ---------- errors and state ---------- */

function clearError(): void {
  queryError.textContent = "";
  queryError.hidden = true;
  input.removeAttribute("aria-invalid");
  input.setAttribute("aria-describedby", "query-help");
}

function fail(message: string): void {
  clearResults();
  queryError.textContent = message;
  queryError.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", "query-help query-error");
  input.focus();
}

function clearResults(): void {
  currentView = null;
  resultBody.replaceChildren();
  resultStatus.textContent = "";
  resultsSection.hidden = true;
  copyAllButton.disabled = true;
}

function setBusy(busy: boolean): void {
  matchButton.disabled = busy || loadState === "error";
  matchButton.dataset.loading = busy ? "true" : "false";
  matchButton.setAttribute("aria-busy", busy ? "true" : "false");
  matchButton.setAttribute("aria-label", busy ? "Loading colour data" : "Match");
}

/* ---------- dataset ---------- */

function isSystemId(value: unknown): value is SystemId {
  return typeof value === "string" && SYSTEM_IDS.has(value as SystemId);
}

function acceptDataset(raw: unknown): Dataset {
  const data = raw as Dataset;
  if (!data || data.version !== 1 || !Array.isArray(data.systems) || !Array.isArray(data.rows)) {
    throw new Error("Unexpected dataset shape");
  }
  return data;
}

async function loadData(): Promise<void> {
  loadState = "loading";
  setBusy(true);

  const pending = queryFromUrl();
  if (pending) {
    resultsSection.hidden = false;
    resultStatus.textContent = "Loading colour data…";
    renderLoading(resultBody);
  }
  renderLoading(librariesBody, 8);

  try {
    const response = await fetch("./data/colors.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = acceptDataset(await response.json());

    const rows: ColorRow[] = [];
    const indexed: Entry[] = [];
    for (const tuple of data.rows) {
      if (!Array.isArray(tuple) || tuple.length < 4) continue;
      const system = tuple[0];
      const code = tuple[1];
      const name = tuple[2];
      const hex = tuple[3];
      if (!isSystemId(system) || typeof code !== "string" || typeof name !== "string" || typeof hex !== "string") {
        continue;
      }
      if (!hexToRgb(hex)) continue;
      const rgb = hexToRgb(hex);
      if (!rgb) continue;
      const row: ColorRow = { system, code, name, hex };
      rows.push(row);
      indexed.push({ row, lab: rgbToLab(rgb) });
    }

    dataset = data;
    entries = indexed;
    colorRows = rows;
    loadState = "ready";

    renderLibraries(librariesBody, data.systems);
    footData.textContent = `${data.systems.length} systems · ${rows.length} rows · ${data.generated}`;
    footBuild.textContent = `PantonAK · ${__BUILD_HASH__}`;
    setBusy(false);

    if (pending) {
      input.value = pending;
      handleSubmit(pending);
    }
  } catch {
    dataset = null;
    entries = [];
    colorRows = [];
    loadState = "error";
    setBusy(false);
    resultsSection.hidden = false;
    resultStatus.textContent = "Colour data failed to load.";
    copyAllButton.disabled = true;
    renderDataError(resultBody, () => void loadData());
    renderDataError(librariesBody, () => void loadData());
  }
}

/* ---------- labels ---------- */

function labelForRow(row: ColorRow): string {
  switch (row.system) {
    case "C":
    case "U":
    case "TCX":
    case "TPX":
      return `${row.code} ${row.system}`;
    case "MP":
      return `Madeira Polyneon ${row.code}`;
    case "MR":
      return `Madeira Rayon ${row.code}`;
    case "DPS":
      return `Polysoft ${row.code}`;
    case "DVS":
      return `Visco ${row.code}`;
    default:
      return row.code;
  }
}

function canonCode(code: string): string {
  const value = code.trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d+$/.test(value)) return value.replace(/^0+(?=\d)/, "");
  return value;
}

/* ---------- matching ---------- */

function applyColour(hex: string, inputLabel: string, exactRow: ColorRow | null): void {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    fail("Hex must be 3 or 6 characters after #.");
    return;
  }
  if (!dataset) return;

  const normalised = rgbToHex(rgb);
  const inputLab = rgbToLab(rgb);
  const systems: SystemResult[] = [];

  for (const meta of dataset.systems) {
    const scored: Match[] = [];
    for (const entry of entries) {
      if (entry.row.system !== meta.id) continue;
      const isExact =
        exactRow !== null &&
        entry.row.system === exactRow.system &&
        canonCode(entry.row.code) === canonCode(exactRow.code);
      const deltaE = isExact ? 0 : deltaE2000(inputLab, entry.lab);
      scored.push({
        row: entry.row,
        deltaE,
        mappedHex: entry.row.hex,
        clipped: false,
      });
    }
    if (scored.length === 0) continue;
    scored.sort((a, b) => a.deltaE - b.deltaE || a.row.code.localeCompare(b.row.code));

    const matches = scored.slice(0, 5);
    const best = matches[0];
    if (!best) continue;

    let sameCode: Match | null = null;
    if (exactRow) {
      const sibling = entries.find(
        (entry) =>
          entry.row.system === meta.id &&
          canonCode(entry.row.code) === canonCode(exactRow.code),
      );
      if (sibling) {
        const isExact = sibling.row.system === exactRow.system;
        sameCode = {
          row: sibling.row,
          deltaE: isExact ? 0 : deltaE2000(inputLab, sibling.lab),
          mappedHex: sibling.row.hex,
          clipped: false,
        };
      }
    }

    systems.push({
      meta,
      matches,
      sameCode,
      sameCodeIsInput: sameCode !== null && sameCode.row.system === exactRow?.system,
      exact: best.deltaE === 0,
      noClose: best.deltaE > 5,
    });
  }

  let closest: ResultsView["closest"] = null;
  for (const system of systems) {
    const best = system.matches[0];
    if (!best) continue;
    if (!closest || best.deltaE < closest.match.deltaE) closest = { meta: system.meta, match: best };
  }

  const view: ResultsView = {
    inputHex: normalised,
    inputLabel,
    systems,
    closest,
  };

  currentView = view;
  renderResults(resultBody, view);
  resultsSection.hidden = false;
  copyAllButton.disabled = false;

  if (closest) {
    const band = deltaBand(closest.match.deltaE);
    resultStatus.textContent =
      closest.match.deltaE > 5
        ? `No close match overall. Nearest is ${closest.match.row.code} in ${closest.meta.label}, ΔE00 ${closest.match.deltaE.toFixed(2)}.`
        : `${systems.length} systems matched. Closest is ${closest.match.row.code} in ${closest.meta.label}, ΔE00 ${closest.match.deltaE.toFixed(2)} (${band.text}).`;
  } else {
    resultStatus.textContent = "No systems in the loaded dataset.";
  }
}

function findExactRow(
  query: { system: string | null; code: string },
  allowed?: readonly SystemId[],
): ColorRow | null {
  const target = canonCode(query.code);
  const candidates = entries.filter(
    (entry) =>
      (!query.system || entry.row.system === query.system) &&
      (!allowed || allowed.includes(entry.row.system)) &&
      canonCode(entry.row.code) === target,
  );
  return candidates[0]?.row ?? null;
}

function handleSubmit(raw: string, exactRow: ColorRow | null = null): void {
  clearError();
  if (loadState === "loading") return;
  if (loadState === "error") {
    resultsSection.hidden = false;
    renderDataError(resultBody, () => void loadData());
    return;
  }
  if (exactRow) {
    const label = labelForRow(exactRow);
    input.value = label;
    applyColour(exactRow.hex, label, exactRow);
    commitUrl(label);
    return;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    clearResults();
    input.focus();
    return;
  }

  const query = parseQuery(trimmed);
  if (!query) {
    if (trimmed.startsWith("#")) {
      fail("Hex must be 3 or 6 characters after #.");
    } else if (/^rgb\s*\(/i.test(trimmed)) {
      fail("RGB channels must be 0–255.");
    } else if (/^cmyk\s*\(/i.test(trimmed)) {
      fail("CMYK channels must be 0–100.");
    } else {
      fail("Enter a hex value, rgb(), cmyk(), Pantone code, or thread code.");
    }
    return;
  }

  switch (query.kind) {
    case "hex": {
      const rgb = hexToRgb(query.hex);
      if (!rgb) {
        fail("Hex must be 3 or 6 characters after #.");
        return;
      }
      applyColour(rgbToHex(rgb), trimmed, null);
      commitUrl(trimmed);
      return;
    }
    case "rgb": {
      const { r, g, b } = query.rgb;
      const valid = [r, g, b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255);
      if (!valid) {
        fail("RGB channels must be 0–255.");
        return;
      }
      applyColour(rgbToHex(query.rgb), trimmed, null);
      commitUrl(trimmed);
      return;
    }
    case "cmyk": {
      const { c, m, y, k } = query.cmyk;
      const valid = [c, m, y, k].every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
      if (!valid) {
        fail("CMYK channels must be 0–100.");
        return;
      }
      applyColour(rgbToHex(cmykToRgb(query.cmyk)), trimmed, null);
      commitUrl(trimmed);
      return;
    }
    case "code": {
      const madeiraOnly = /^madeira\b/i.test(trimmed);
      const allowed: readonly SystemId[] | undefined = madeiraOnly ? ["MP", "MR"] : undefined;
      const exact = findExactRow(query, allowed);
      if (exact) {
        applyColour(exact.hex, trimmed, exact);
        commitUrl(trimmed);
        return;
      }
      const elsewhere = entries.filter(
        (entry) =>
          canonCode(entry.row.code) === canonCode(query.code) &&
          (!allowed || allowed.includes(entry.row.system)),
      );
      if (elsewhere.length > 0 && !query.system) {
        const first = elsewhere[0];
        if (first) {
          applyColour(first.row.hex, trimmed, first.row);
          commitUrl(trimmed);
          return;
        }
      }
      if (/^\d{4}$/.test(query.code)) {
        fail(`Add "Madeira" or "Rayon" to disambiguate "${query.code}".`);
        return;
      }
      fail(
        `No code "${trimmed}" in the loaded libraries. Try "186 C", "19-4052 TCX", or "Rayon 1147".`,
      );
      return;
    }
    case "text": {
      const results: ColorRow[] = searchColors(colorRows, query.text);
      if (results.length === 0) {
        fail(
          `No code or name matched "${query.text}". Try "186 C", "19-4052 TCX", or "Rayon 1147".`,
        );
        return;
      }
      const shown = results.slice(0, 10);
      clearResults();
      resultsSection.hidden = false;
      renderCandidates(resultBody, shown, (row) => {
        clearError();
        handleSubmit(labelForRow(row), row);
      });
      resultStatus.textContent = `${shown.length} name matches. Choose one to convert.`;
      input.focus();
      return;
    }
  }
}

/* ---------- clipboard ---------- */

const copyTimers = new WeakMap<HTMLButtonElement, number>();

function fallbackCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.className = "copy-fallback";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

function announce(message: string): void {
  copyStatus.textContent = "";
  window.setTimeout(() => {
    copyStatus.textContent = message;
  }, 10);
}

function flash(button: HTMLButtonElement): void {
  const original = button.dataset.originalLabel ?? button.textContent ?? "";
  button.dataset.originalLabel = original;
  button.textContent = "Copied";
  button.dataset.state = "success";
  const previous = copyTimers.get(button);
  if (previous) window.clearTimeout(previous);
  const timer = window.setTimeout(() => {
    button.textContent = button.dataset.originalLabel ?? original;
    delete button.dataset.state;
    copyTimers.delete(button);
  }, 1600);
  copyTimers.set(button, timer);
}

async function copyText(text: string, button: HTMLButtonElement | null, label: string): Promise<void> {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    ok = fallbackCopy(text);
  }
  if (ok) {
    announce(`Copied ${label} to the clipboard.`);
    if (button) flash(button);
  } else {
    announce("Copy failed. Select the value and copy it manually.");
  }
}

/* ---------- events ---------- */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(input.value);
});

input.addEventListener("input", () => {
  if (!queryError.hidden && input.value.trim()) clearError();
});

document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  if (!target) return;

  const chip = target.closest<HTMLButtonElement>(".chip");
  if (chip) {
    const value = chip.dataset.q;
    if (value) {
      input.value = value;
      handleSubmit(value);
    }
    return;
  }

  const copyButton = target.closest<HTMLButtonElement>("[data-copy]");
  if (copyButton) {
    const value = copyButton.dataset.copy;
    if (value) {
      void copyText(value, copyButton, copyButton.dataset.copyLabel ?? "values");
    }
  }
});

copyAllButton.addEventListener("click", () => {
  if (!currentView) return;
  void copyText(resultsToTsv(currentView), copyAllButton, "all systems");
});

copyLinkButton.addEventListener("click", () => {
  void copyText(window.location.href, copyLinkButton, "link");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const target = event.target as Element | null;
    const details = target?.closest("details") as HTMLDetailsElement | null;
    if (details?.open) {
      details.open = false;
      return;
    }
    if (input.value || !resultsSection.hidden || !queryError.hidden) {
      input.value = "";
      clearError();
      clearResults();
      commitUrl(null);
      input.focus();
    }
    return;
  }

  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as Element | null;
  if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
  event.preventDefault();
  input.focus();
});

/* ---------- boot ---------- */

setBusy(true);
requestAnimationFrame(() => {
  void loadData();
});
