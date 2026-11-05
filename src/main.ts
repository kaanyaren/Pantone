import type { ColorRow, Dataset, Lab, Match, Query, SystemId, SystemMeta } from "./types.ts";
import { cmykToRgb, deltaE2000, hexToRgb, rgbToHex, rgbToLab } from "./color.ts";
import { parseQuery } from "./query.ts";
import { searchColors } from "./search.ts";
import {
  deltaBand,
  formatCount,
  renderCandidates,
  renderDataError,
  renderEmptyState,
  renderInspector,
  renderLibraries,
  renderLoading,
  renderResults,
  resultsToTsv,
  type ActiveComparison,
  type LibraryFilter,
  type ResultsView,
  type SystemResult,
} from "./ui.ts";

interface Entry {
  row: ColorRow;
  lab: Lab;
}

type LoadState = "loading" | "ready" | "error";

const DEFAULT_SAMPLE = "186 C";

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

const form = byId<HTMLFormElement>("convert-form");
const input = byId<HTMLInputElement>("query-input");
const colorPicker = byId<HTMLInputElement>("color-picker");
const pickerSwatch = byId<HTMLElement>("picker-swatch");
const clearButton = byId<HTMLButtonElement>("clear-button");
const matchButton = byId<HTMLButtonElement>("match-button");
const queryHelp = byId<HTMLParagraphElement>("query-help");
const queryError = byId<HTMLParagraphElement>("query-error");
const resultsSection = byId<HTMLElement>("results");
const inspectorBody = byId<HTMLDivElement>("inspector-body");
const loupeMode = byId<HTMLElement>("loupe-mode");
const resultBody = byId<HTMLDivElement>("result-body");
const resultStatus = byId<HTMLParagraphElement>("result-status");
const copyAllButton = byId<HTMLButtonElement>("copy-all");
const copyLinkButton = byId<HTMLButtonElement>("copy-link");
const copyStatus = byId<HTMLParagraphElement>("copy-status");
const librariesBody = byId<HTMLDivElement>("libraries-body");
const footData = byId<HTMLElement>("foot-data");
const footBuild = byId<HTMLElement>("foot-build");

const SYSTEM_IDS = new Set<SystemId>(["C", "U", "TCX", "TPX", "MP", "MR", "DPS", "DVS"]);
const SAME_CODE_FAMILY: Partial<Record<SystemId, readonly SystemId[]>> = {
  C: ["C", "U"],
  U: ["C", "U"],
  TCX: ["TCX", "TPX"],
  TPX: ["TCX", "TPX"],
};

let dataset: Dataset | null = null;
let entries: Entry[] = [];
let colorRows: ColorRow[] = [];
let loadState: LoadState = "loading";
let currentView: ResultsView | null = null;
let activeComparison: ActiveComparison | null = null;
let activeFilter: LibraryFilter = "all";

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

function syncPickerHex(hex: string): void {
  const upper = hex.toUpperCase();
  pickerSwatch.style.setProperty("--swatch", upper);
  if (/^#[0-9A-F]{6}$/.test(upper)) {
    colorPicker.value = upper.toLowerCase();
  }
}

/* ---------- errors and state ---------- */

function clearError(): void {
  queryError.textContent = "";
  queryError.hidden = true;
  queryHelp.hidden = false;
  input.removeAttribute("aria-invalid");
  input.setAttribute("aria-describedby", "query-help");
}

function showEmptyWorkbench(): void {
  currentView = null;
  activeComparison = null;
  copyAllButton.disabled = true;
  resultStatus.textContent = "Hazır — bir başlangıç numunesi seçin veya yukarıya bir sorgu girin.";
  renderEmptyState(resultBody, inspectorBody, loupeMode, (q) => {
    input.value = q;
    handleSubmit(q, null, true);
  });
}

function fail(message: string): void {
  commitUrl(null);
  showEmptyWorkbench();
  queryHelp.hidden = true;
  queryError.textContent = message;
  queryError.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", "query-error");
  input.focus();
}

function setBusy(busy: boolean): void {
  matchButton.disabled = busy || loadState === "error";
  matchButton.dataset.loading = busy ? "true" : "false";
  matchButton.setAttribute("aria-busy", busy ? "true" : "false");
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
  resultStatus.textContent = "Renk kütüphaneleri yükleniyor…";
  renderLoading(resultBody, 6);
  renderLoading(inspectorBody, 3);
  renderLoading(librariesBody, 6);

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
      if (
        !isSystemId(system) ||
        typeof code !== "string" ||
        typeof name !== "string" ||
        typeof hex !== "string"
      ) {
        continue;
      }
      const parsed = hexToRgb(hex);
      if (!parsed) continue;
      const row: ColorRow = { system, code, name, hex };
      rows.push(row);
      indexed.push({ row, lab: rgbToLab(parsed) });
    }

    dataset = data;
    entries = indexed;
    colorRows = rows;
    loadState = "ready";

    renderLibraries(librariesBody, data.systems);
    footData.textContent = `${data.systems.length} sistem · ${formatCount(rows.length)} satır · ${data.generated}`;
    footBuild.textContent = `PantonAK · ${__BUILD_HASH__}`;
    setBusy(false);
    clearError();

    if (pending) {
      input.value = pending;
      handleSubmit(pending, null, true);
    } else {
      input.value = DEFAULT_SAMPLE;
      handleSubmit(DEFAULT_SAMPLE, null, false);
    }
  } catch {
    dataset = null;
    entries = [];
    colorRows = [];
    loadState = "error";
    setBusy(false);
    resultStatus.textContent = "Renk veri kümesi yüklenemedi.";
    copyAllButton.disabled = true;
    renderDataError(resultBody, () => void loadData());
    renderDataError(inspectorBody, () => void loadData());
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
      return `Polyneon ${row.code}`;
    case "MR":
      return `Rayon ${row.code}`;
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

/* ---------- matching & rendering ---------- */

function handleInspect(meta: SystemMeta, match: Match, pinned: boolean): void {
  if (!currentView) return;
  if (activeComparison?.pinned && !pinned) return;
  activeComparison = { meta, match, pinned };
  renderInspector(inspectorBody, loupeMode, currentView, activeComparison, selectSystemInLoupe);
}

function selectSystemInLoupe(systemId: SystemId): void {
  if (!currentView) return;
  const sys = currentView.systems.find((item) => item.meta.id === systemId);
  if (!sys) return;
  const target = sys.sameCode ?? sys.matches[0];
  if (!target) return;
  const toggleOff =
    activeComparison?.pinned && activeComparison.meta.id === systemId;
  activeComparison = toggleOff
    ? currentView.closest
      ? { ...currentView.closest, pinned: false }
      : null
    : { meta: sys.meta, match: target, pinned: true };
  refreshWorkspaceView();
  const pinEl = inspectorBody.querySelector<HTMLButtonElement>(
    `.tolerance-pin[data-system-id="${systemId}"]`,
  );
  pinEl?.focus({ preventScroll: true });
  const rowEl = resultBody.querySelector<HTMLElement>(`tr[data-system-id="${systemId}"]`);
  rowEl?.scrollIntoView({ block: "nearest" });
}

function refreshWorkspaceView(): void {
  if (!currentView) return;
  renderInspector(inspectorBody, loupeMode, currentView, activeComparison, selectSystemInLoupe);
  renderResults(
    resultBody,
    currentView,
    activeFilter,
    activeComparison?.meta.id ?? null,
    handleInspect,
    (row) => {
      clearError();
      handleSubmit(labelForRow(row), row, true);
    },
  );
}

function applyColour(hex: string, inputLabel: string, exactRow: ColorRow | null): void {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    fail("# sonrasında hex 3 veya 6 karakter olmalı.");
    return;
  }
  if (!dataset) return;

  const normalised = rgbToHex(rgb);
  syncPickerHex(normalised);
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
    const exactGroup = exactRow ? SAME_CODE_FAMILY[exactRow.system] : undefined;
    if (exactRow && exactGroup?.includes(meta.id)) {
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
  let closestCross: ResultsView["closest"] = null;
  for (const system of systems) {
    const best = system.matches[0];
    if (!best) continue;
    if (!closest || best.deltaE < closest.match.deltaE) {
      closest = { meta: system.meta, match: best };
    }
    if (
      exactRow &&
      system.meta.id !== exactRow.system &&
      (!closestCross || best.deltaE < closestCross.match.deltaE)
    ) {
      closestCross = { meta: system.meta, match: best };
    }
  }

  currentView = {
    inputHex: normalised,
    inputLabel,
    systems,
    closest,
  };
  const initialLoupe = closestCross ?? closest;
  activeComparison = initialLoupe ? { ...initialLoupe, pinned: false } : null;

  refreshWorkspaceView();
  resultsSection.hidden = false;
  copyAllButton.disabled = false;

  if (closest) {
    const band = deltaBand(closest.match.deltaE);
    resultStatus.textContent =
      closest.match.deltaE > 5
        ? `Genel olarak yakın eşleşme yok. En yakın aday: ${closest.meta.label} kütüphanesinde ${closest.match.row.code}, ΔE00 ${closest.match.deltaE.toFixed(2)}.`
        : `${systems.length} sistem eşleşti. En yakın eşleşme: ${closest.meta.label} kütüphanesinde ${closest.match.row.code}, ΔE00 ${closest.match.deltaE.toFixed(2)} (${band.text}).`;
  } else {
    resultStatus.textContent = "Yüklenen veri kümesinde sistem yok.";
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

function handleSubmit(
  raw: string,
  exactRow: ColorRow | null = null,
  syncUrl = true,
): void {
  clearError();
  if (loadState === "loading") return;
  if (loadState === "error") {
    renderDataError(resultBody, () => void loadData());
    return;
  }
  if (exactRow) {
    const label = labelForRow(exactRow);
    input.value = label;
    applyColour(exactRow.hex, label, exactRow);
    if (syncUrl) commitUrl(label);
    return;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    commitUrl(null);
    showEmptyWorkbench();
    input.focus();
    return;
  }

  const query = parseQuery(trimmed);
  if (!query) {
    if (trimmed.startsWith("#")) {
      fail("# sonrasında hex 3 veya 6 karakter olmalı.");
    } else if (/^rgb\s*\(/i.test(trimmed)) {
      fail("RGB kanalları 0–255 arasında olmalı.");
    } else if (/^cmyk\s*\(/i.test(trimmed)) {
      fail("CMYK kanalları 0–100 arasında olmalı.");
    } else {
      fail("Bir hex değeri, rgb(), cmyk(), Pantone kodu veya iplik kodu girin.");
    }
    return;
  }

  switch (query.kind) {
    case "hex": {
      const rgb = hexToRgb(query.hex);
      if (!rgb) {
        fail("# sonrasında hex 3 veya 6 karakter olmalı.");
        return;
      }
      applyColour(rgbToHex(rgb), trimmed, null);
      if (syncUrl) commitUrl(trimmed);
      return;
    }
    case "rgb": {
      const { r, g, b } = query.rgb;
      const valid = [r, g, b].every((v) => Number.isFinite(v) && v >= 0 && v <= 255);
      if (!valid) {
        fail("RGB kanalları 0–255 arasında olmalı.");
        return;
      }
      applyColour(rgbToHex(query.rgb), trimmed, null);
      if (syncUrl) commitUrl(trimmed);
      return;
    }
    case "cmyk": {
      const { c, m, y, k } = query.cmyk;
      const valid = [c, m, y, k].every((v) => Number.isFinite(v) && v >= 0 && v <= 100);
      if (!valid) {
        fail("CMYK kanalları 0–100 arasında olmalı.");
        return;
      }
      applyColour(rgbToHex(cmykToRgb(query.cmyk)), trimmed, null);
      if (syncUrl) commitUrl(trimmed);
      return;
    }
    case "code": {
      const madeiraOnly = /^madeira\b/i.test(trimmed);
      const allowed: readonly SystemId[] | undefined = madeiraOnly ? ["MP", "MR"] : undefined;
      const exact = findExactRow(query, allowed);
      if (exact) {
        applyColour(exact.hex, trimmed, exact);
        if (syncUrl) commitUrl(trimmed);
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
          if (syncUrl) commitUrl(trimmed);
          return;
        }
      }
      if (!madeiraOnly && query.system === null && /^\d{4}$/.test(query.code)) {
        fail(`"${query.code}" kodunu ayırt etmek için "Madeira" veya "Rayon" ekleyin.`);
        return;
      }
      fail(
        `Yüklenen kütüphanelerde "${trimmed}" kodu yok. "186 C", "19-4052 TCX" veya "Rayon 1147" deneyin.`,
      );
      return;
    }
    case "text": {
      const results: ColorRow[] = searchColors(colorRows, query.text, 10_000);
      if (results.length === 0) {
        fail(
          `"${query.text}" ile eşleşen kod veya ad yok. "186 C", "19-4052 TCX" veya "Rayon 1147" deneyin.`,
        );
        return;
      }
      const shown = results.slice(0, 10);
      currentView = null;
      activeComparison = null;
      copyAllButton.disabled = true;
      renderCandidates(resultBody, inspectorBody, loupeMode, query.text, shown, (row) => {
        clearError();
        handleSubmit(labelForRow(row), row, true);
      });
      resultStatus.textContent =
        shown.length < results.length
          ? `${results.length} ad eşleşmesinden ${shown.length} tanesi gösteriliyor. Dönüştürmek için birini seçin.`
          : `${results.length} ad eşleşmesi. Dönüştürmek için birini seçin.`;
      if (syncUrl) commitUrl(trimmed);
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
  area.className = "visually-hidden";
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
  const isCoord = button.classList.contains("coord-cell");
  if (isCoord) {
    button.dataset.state = "success";
  } else {
    const original = button.dataset.originalLabel ?? button.textContent ?? "";
    button.dataset.originalLabel = original;
    button.textContent = "Kopyalandı";
    button.dataset.state = "success";
  }
  const previous = copyTimers.get(button);
  if (previous) window.clearTimeout(previous);
  const timer = window.setTimeout(() => {
    if (!isCoord && button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
    }
    delete button.dataset.state;
    copyTimers.delete(button);
  }, 1500);
  copyTimers.set(button, timer);
}

async function copyText(
  text: string,
  button: HTMLButtonElement | null,
  label: string,
): Promise<void> {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    ok = fallbackCopy(text);
  }
  if (ok) {
    announce(`${label} panoya kopyalandı.`);
    if (button) flash(button);
  } else {
    announce("Kopyalama başarısız. Değeri seçip elle kopyalayın.");
  }
}

/* ---------- events ---------- */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSubmit(input.value, null, true);
});

input.addEventListener("input", () => {
  if (!queryError.hidden && input.value.trim()) clearError();
});

colorPicker.addEventListener("input", () => {
  const hex = colorPicker.value.toUpperCase();
  input.value = hex;
  handleSubmit(hex, null, true);
});

clearButton.addEventListener("click", () => {
  input.value = "";
  clearError();
  commitUrl(null);
  showEmptyWorkbench();
  input.focus();
});

document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  if (!target) return;

  const chip = target.closest<HTMLButtonElement>(".chip");
  if (chip) {
    const value = chip.dataset.q;
    if (value) {
      input.value = value;
      handleSubmit(value, null, true);
    }
    return;
  }

  const filterPill = target.closest<HTMLButtonElement>(".filter-pill");
  if (filterPill) {
    const nextFilter = (filterPill.dataset.filter ?? "all") as LibraryFilter;
    activeFilter = nextFilter;
    for (const pill of document.querySelectorAll<HTMLButtonElement>(".filter-pill")) {
      const active = pill.dataset.filter === nextFilter;
      pill.classList.toggle("is-active", active);
      pill.setAttribute("aria-pressed", active ? "true" : "false");
    }
    refreshWorkspaceView();
    return;
  }

  const copyButton = target.closest<HTMLButtonElement>("[data-copy]");
  if (copyButton) {
    const value = copyButton.dataset.copy;
    if (value) {
      void copyText(value, copyButton, copyButton.dataset.copyLabel ?? "değerler");
    }
  }
});

copyAllButton.addEventListener("click", () => {
  if (!currentView) return;
  void copyText(resultsToTsv(currentView), copyAllButton, "tüm sistemler");
});

copyLinkButton.addEventListener("click", () => {
  void copyText(window.location.href, copyLinkButton, "bağlantı");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const target = event.target as Element | null;
    const details = target?.closest("details") as HTMLDetailsElement | null;
    if (details?.open) {
      details.open = false;
      return;
    }
    if (input.value || currentView || !queryError.hidden) {
      input.value = "";
      clearError();
      commitUrl(null);
      showEmptyWorkbench();
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

syncPickerHex("#C8102E");
setBusy(true);
requestAnimationFrame(() => {
  void loadData();
});
