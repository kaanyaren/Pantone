import type { ColorRow, Dataset, Lab, Match, Query, SystemId, SystemMeta } from "./types.ts";
import { cmykToRgb, deltaE2000, hexToRgb, rgbToHex, rgbToLab } from "./color.ts";
import { parseQuery } from "./query.ts";
import { searchColors } from "./search.ts";
import { DICTIONARY, getStoredLang, setStoredLang, type Lang } from "./i18n.ts";
import {
  formatCount,
  primaryOf,
  renderCandidates,
  renderDataError,
  renderEmptyState,
  renderInspector,
  matchesFilter,
  renderLibraries,
  renderResults,
  renderSuggestions,
  resultsToTsv,
  type ActiveComparison,
  type LibraryFilter,
  type ResultsView,
  type Suggestion,
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
const suggestionsRoot = byId<HTMLElement>("query-suggestions");
const queryHelp = byId<HTMLParagraphElement>("query-help");
const queryError = byId<HTMLParagraphElement>("query-error");
const resultsSection = byId<HTMLElement>("results");
const inspectorBody = byId<HTMLDivElement>("inspector-body");
const inspectorRail = byId<HTMLDetailsElement>("inspector-rail");
const loupeMode = byId<HTMLElement>("loupe-mode");
const resultBody = byId<HTMLDivElement>("result-body");
const resultStatus = byId<HTMLParagraphElement>("result-status");
const copyAllButton = byId<HTMLButtonElement>("copy-all");
const copyLinkButton = byId<HTMLButtonElement>("copy-link");
const copyStatus = byId<HTMLParagraphElement>("copy-status");
const librariesBody = byId<HTMLDivElement>("libraries-body");
const footData = byId<HTMLElement>("foot-data");
const footBuild = byId<HTMLElement>("foot-build");
const langToggle = byId<HTMLButtonElement>("lang-toggle");
const pageTitle = byId<HTMLElement>("page-title");
const inspectorTitle = byId<HTMLElement>("inspector-title");
const resultsTitle = byId<HTMLElement>("results-title");
const examplesLabel = document.getElementById("examples-label");
const substrateNote = document.getElementById("substrate-note");
const sampleChipsRoot = document.getElementById("sample-chips");

const SYSTEM_IDS = new Set<SystemId>(["C", "U", "TCX", "TPX", "MP", "MR", "DPS", "DVS"]);
const SAME_CODE_FAMILY: Partial<Record<SystemId, readonly SystemId[]>> = {
  C: ["C", "U"],
  U: ["C", "U"],
  TCX: ["TCX", "TPX"],
  TPX: ["TCX", "TPX"],
};

let currentLang: Lang = getStoredLang();
let dataset: Dataset | null = null;
let entries: Entry[] = [];
let colorRows: ColorRow[] = [];
let loadState: LoadState = "loading";
let currentView: ResultsView | null = null;
let activeComparison: ActiveComparison | null = null;
let activeFilter: LibraryFilter = "all";
let currentSuggestions: Suggestion[] = [];
let activeSuggestion = -1;
let suggestTimer = 0;
let blurTimer = 0;
let submitInFlight = false;
let lastSubmitKey = "";
let lastSubmitAt = 0;

/* ---------- URL state ---------- */

function queryFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("q")?.trim().slice(0, 200) ?? "";
  } catch {
    return "";
  }
}

function commitUrl(value: string | null): void {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set("q", value.slice(0, 200));
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

/* ---------- i18n & static UI update ---------- */

function applyLanguage(lang: Lang): void {
  currentLang = lang;
  setStoredLang(lang);
  document.documentElement.lang = lang;
  const t = DICTIONARY[lang];

  // Title & meta
  pageTitle.textContent = t.pageTitle;
  document.title = `PantonAK — ${t.pageTitle}`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", t.metaDescription);

  // Field & inputs
  const fieldLabel = document.querySelector<HTMLLabelElement>(".field-label");
  if (fieldLabel) fieldLabel.textContent = t.fieldLabel;
  input.placeholder = t.searchPlaceholder;
  clearButton.setAttribute("aria-label", t.clearAria);
  const colorWell = document.querySelector<HTMLLabelElement>(".color-well");
  if (colorWell) colorWell.title = t.colorPickerTitle;
  colorPicker.setAttribute("aria-label", t.colorPickerTitle);

  // Match button
  const matchLabelSpan = matchButton.querySelector<HTMLElement>(".button-label");
  if (matchLabelSpan) matchLabelSpan.textContent = t.matchButton;
  const matchBusySpan = matchButton.querySelector<HTMLElement>(".button-busy");
  if (matchBusySpan) matchBusySpan.textContent = t.matchBusy;

  // Suggestions & Help
  suggestionsRoot.setAttribute("aria-label", t.querySuggestionsAria);
  queryHelp.innerHTML = `${t.queryHelp} <kbd>/</kbd>`;

  // Starter chips & substrate explainer (deck, above fold)
  if (examplesLabel) examplesLabel.textContent = t.examplesLabel;
  if (substrateNote) {
    substrateNote.replaceChildren(
      document.createTextNode(`${t.substrateNote} `),
      Object.assign(document.createElement("a"), {
        href: "#tolerance-note",
        textContent: t.substrateLink,
      }),
    );
  }
  if (sampleChipsRoot) {
    for (const chip of sampleChipsRoot.querySelectorAll<HTMLButtonElement>(".chip")) {
      const q = chip.dataset.query ?? chip.textContent?.trim() ?? "";
      chip.setAttribute("aria-label", t.chipAria(q));
    }
  }

  // Titles
  inspectorTitle.textContent = t.loupeTitle;
  resultsTitle.textContent = t.matrixTitle;

  // Filter bar
  const filterGroup = document.querySelector<HTMLElement>(".filter-bar");
  if (filterGroup) filterGroup.setAttribute("aria-label", t.filterGroupAria);
  const filterPills = document.querySelectorAll<HTMLButtonElement>(".filter-pill");
  for (const pill of filterPills) {
    switch (pill.dataset.filter) {
      case "all":
        pill.textContent = t.filterAll;
        break;
      case "print":
        pill.textContent = t.filterPrint;
        break;
      case "textile":
        pill.textContent = t.filterTextile;
        break;
      case "madeira":
        pill.textContent = t.filterMadeira;
        break;
      case "durak":
        pill.textContent = t.filterDurak;
        break;
    }
  }

  // Footer / Foot buttons
  copyAllButton.textContent = t.tsvCopy;
  copyLinkButton.textContent = t.linkCopy;

  // Toggle button presentation
  langToggle.setAttribute("aria-label", t.langToggleAria);
  const trOpt = langToggle.querySelector<HTMLElement>('[data-lang="tr"]');
  const enOpt = langToggle.querySelector<HTMLElement>('[data-lang="en"]');
  trOpt?.classList.toggle("is-active", lang === "tr");
  enOpt?.classList.toggle("is-active", lang === "en");

  // Re-render current view or empty workbench
  if (currentView) {
    refreshWorkspaceView();
    updateStatus();
  } else if (loadState === "ready") {
    showEmptyWorkbench();
  }

  if (dataset) {
    renderLibraries(librariesBody, dataset.systems, currentLang);
    footData.textContent = `${dataset.systems.length} ${lang === "en" ? "systems" : "sistem"} · ${formatCount(colorRows.length, currentLang)} ${lang === "en" ? "rows" : "satır"} · ${dataset.generated}`;
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
  if (window.matchMedia("(max-width: 68rem)").matches) inspectorRail.open = false;
  const t = DICTIONARY[currentLang];
  resultStatus.textContent = t.readyStatus;
  renderEmptyState(resultBody, inspectorBody, loupeMode, (q) => {
    input.value = q;
    handleSubmit(q, null, true);
  }, currentLang);
}

function fail(message: string): void {
  const hadView = currentView !== null;
  if (!hadView) {
    showEmptyWorkbench();
    resultStatus.textContent = "";
  }
  queryHelp.hidden = true;
  queryError.textContent = message;
  queryError.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", "query-error");
  if (document.activeElement !== input) input.focus();
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
  resultStatus.textContent = DICTIONARY[currentLang].loadingStatus;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch("./data/colors.json", {
        cache: "no-cache",
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timer);
    }
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

    renderLibraries(librariesBody, data.systems, currentLang);
    footData.textContent = `${data.systems.length} ${DICTIONARY[currentLang].footSystems} · ${formatCount(rows.length, currentLang)} ${DICTIONARY[currentLang].footRows} · ${data.generated}`;
    footBuild.textContent = `PantonAK · ${__BUILD_HASH__}`;
    setBusy(false);
    clearError();

    if (pending) {
      input.value = pending;
      closeSuggestions();
      handleSubmit(pending, null, true);
    } else {
      input.value = DEFAULT_SAMPLE;
      closeSuggestions();
      handleSubmit(DEFAULT_SAMPLE, null, false);
    }
  } catch {
    dataset = null;
    entries = [];
    colorRows = [];
    loadState = "error";
    setBusy(false);
    resultStatus.textContent = DICTIONARY[currentLang].dataErrorTitle;
    copyAllButton.disabled = true;
    renderDataError(resultBody, () => void loadData(), currentLang);
    renderDataError(inspectorBody, () => void loadData(), currentLang);
    renderDataError(librariesBody, () => void loadData(), currentLang);
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
      return `Classic ${row.code}`;
    case "DPS":
      return `Polysoft ${row.code}`;
    case "DVS":
      return `Visco ${row.code}`;
    default:
      return row.code;
  }
}

function canonCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

/* ---------- suggestions ---------- */

function updateSuggestions(): void {
  const raw = input.value.trim();
  if (!raw || loadState !== "ready") {
    closeSuggestions();
    return;
  }

  const query = parseQuery(raw);
  if (!query) {
    closeSuggestions();
    return;
  }

  let candidates: ColorRow[] = [];
  if (query.kind === "code") {
    const needle = canonCode(query.code);
    candidates = colorRows
      .filter((row) => {
        if (query.system && row.system !== query.system) return false;
        return canonCode(row.code).startsWith(needle);
      })
      .slice(0, 8);
  } else if (query.kind === "text") {
    candidates = searchColors(colorRows, query.text, 8);
  }

  if (candidates.length === 0) {
    closeSuggestions();
    return;
  }

  currentSuggestions = candidates.map((row) => ({
    row,
    query: labelForRow(row),
    code: row.code,
    name: row.name,
    system: dataset?.systems.find((s) => s.id === row.system)?.short ?? row.system,
    hex: row.hex,
  }));

  activeSuggestion = -1;
  renderSuggestions(suggestionsRoot, currentSuggestions, activeSuggestion);
  input.setAttribute("aria-expanded", "true");
}

function closeSuggestions(): void {
  suggestionsRoot.hidden = true;
  suggestionsRoot.replaceChildren();
  currentSuggestions = [];
  activeSuggestion = -1;
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
}

function chooseSuggestion(index: number): void {
  const item = currentSuggestions[index];
  if (!item) return;
  input.value = item.query;
  closeSuggestions();
  clearError();
  handleSubmit(item.query, item.row, true);
}

/* ---------- results rendering ---------- */

function togglePin(): void {
  if (!activeComparison || !currentView) return;
  activeComparison = {
    meta: activeComparison.meta,
    match: activeComparison.match,
    pinned: !activeComparison.pinned,
  };
  renderInspector(
    inspectorBody,
    loupeMode,
    currentView,
    activeComparison,
    selectSystemInLoupe,
    currentLang,
    togglePin,
  );
  highlightSelectedRow(activeComparison.meta.id);
}

function handleInspect(meta: SystemMeta, match: Match, pinned: boolean): void {
  const sameTarget =
    activeComparison !== null &&
    activeComparison.meta.id === meta.id &&
    activeComparison.match.row.code === match.row.code;
  if (sameTarget && pinned && activeComparison?.pinned) {
    togglePin();
    return;
  }
  if (activeComparison?.pinned && !pinned) return;
  activeComparison = { meta, match, pinned };
  if (!currentView) return;
  renderInspector(
    inspectorBody,
    loupeMode,
    currentView,
    activeComparison,
    selectSystemInLoupe,
    currentLang,
    togglePin,
  );
  highlightSelectedRow(meta.id);
}

function highlightSelectedRow(systemId: SystemId): void {
  const rows = resultBody.querySelectorAll<HTMLTableRowElement>(".result-row");
  for (const row of rows) {
    row.classList.toggle("is-inspected", row.dataset.systemId === systemId);
  }
}

function selectSystemInLoupe(systemId: SystemId): void {
  if (!currentView) return;
  const sys = currentView.systems.find((s) => s.meta.id === systemId);
  if (!sys) return;
  const target = primaryOf(sys);
  if (!target) return;
  activeComparison = { meta: sys.meta, match: target, pinned: false };
  renderInspector(
    inspectorBody,
    loupeMode,
    currentView,
    activeComparison,
    selectSystemInLoupe,
    currentLang,
    togglePin,
  );
  highlightSelectedRow(systemId);
  const pinEl = inspectorBody.querySelector<HTMLButtonElement>(
    `.tolerance-chip[data-system-id="${CSS.escape(systemId)}"]`,
  );
  pinEl?.focus({ preventScroll: true });
  const rowEl = resultBody.querySelector<HTMLElement>(`tr[data-system-id="${CSS.escape(systemId)}"]`);
  rowEl?.scrollIntoView({ block: "nearest" });
}

function refreshWorkspaceView(): void {
  if (!currentView) return;
  renderInspector(
    inspectorBody,
    loupeMode,
    currentView,
    activeComparison,
    selectSystemInLoupe,
    currentLang,
    togglePin,
  );
  renderResults(
    resultBody,
    currentView,
    activeFilter,
    activeComparison?.meta.id ?? null,
    handleInspect,
    (row) => {
      clearError();
      handleSubmit(labelForRow(row), row, true);
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) return;
        const next = resultBody.querySelector<HTMLButtonElement>(
          `tr[data-system-id="${CSS.escape(row.system)}"] .card-inspect`,
        );
        (next ?? input).focus({ preventScroll: true });
      });
    },
    currentLang,
  );
}

function updateStatus(): void {
  if (!currentView) return;
  const t = DICTIONARY[currentLang];
  const visible = currentView.systems.filter((system) =>
    matchesFilter(system.meta.id, activeFilter),
  );
  let closest: { meta: SystemMeta; match: Match } | null = null;
  for (const system of visible) {
    const best = primaryOf(system);
    if (!best) continue;
    if (!closest || best.deltaE < closest.match.deltaE) {
      closest = { meta: system.meta, match: best };
    }
  }
  if (!closest) {
    resultStatus.textContent = t.statusNoLibraries;
    return;
  }
  const nearest = `${closest.meta.label} ${closest.match.row.code}`;
  const deltaStr = closest.match.deltaE.toFixed(2);
  resultStatus.textContent =
    closest.match.deltaE > 5
      ? t.statusNoCloseMatch(visible.length, currentView.systems.length, nearest, deltaStr)
      : t.statusClosest(visible.length, currentView.systems.length, nearest, deltaStr);
}

function applyColour(hex: string, inputLabel: string, exactRow: ColorRow | null): void {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    fail(DICTIONARY[currentLang].invalidHexError);
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
    scored.sort((a, b) => a.deltaE - b.deltaE || a.row.code.localeCompare(b.row.code, "en"));

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

  // Rank every library by the distance of the row that will be shown on its card.
  const systemDelta = (system: SystemResult): number =>
    system.sameCode?.deltaE ?? system.matches[0]?.deltaE ?? Number.POSITIVE_INFINITY;
  systems.sort(
    (a, b) =>
      systemDelta(a) - systemDelta(b) ||
      a.meta.id.localeCompare(b.meta.id, "en"),
  );

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
  inspectorRail.open = true;
  resultsSection.hidden = false;
  copyAllButton.disabled = false;

  updateStatus();
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
  if (loadState === "loading" || loadState === "error") {
    if (loadState === "error") renderDataError(resultBody, () => void loadData(), currentLang);
    return;
  }
  const dupeKey = exactRow ? `row:${exactRow.system}:${canonCode(exactRow.code)}` : `q:${raw.trim()}`;
  const now = Date.now();
  if (dupeKey === lastSubmitKey && now - lastSubmitAt < 400) return;
  lastSubmitKey = dupeKey;
  lastSubmitAt = now;
  if (exactRow) {
    const label = labelForRow(exactRow);
    input.value = label;
    applyColour(exactRow.hex, label, exactRow);
    if (syncUrl) commitUrl(label);
    return;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    showEmptyWorkbench();
    if (syncUrl) commitUrl(null);
    return;
  }

  const query = parseQuery(trimmed);
  if (!query) {
    if (trimmed.startsWith("#")) {
      fail(DICTIONARY[currentLang].invalidHexError);
    } else if (/^rgb\s*\(/i.test(trimmed)) {
      fail(DICTIONARY[currentLang].rgbRangeError);
    } else if (/^cmyk\s*\(/i.test(trimmed)) {
      fail(DICTIONARY[currentLang].cmykRangeError);
    } else {
      fail(DICTIONARY[currentLang].genericQueryError);
    }
    return;
  }

  switch (query.kind) {
    case "hex": {
      const rgb = hexToRgb(query.hex);
      if (!rgb) {
        fail(DICTIONARY[currentLang].invalidHexError);
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
        fail(DICTIONARY[currentLang].rgbRangeError);
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
        fail(DICTIONARY[currentLang].cmykRangeError);
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
      if (exact && /^\d{3,4}$/.test(trimmed) && exact.system === "C") {
        const threadHit = entries.some(
          (entry) =>
            (entry.row.system === "MP" || entry.row.system === "MR") &&
            canonCode(entry.row.code) === canonCode(query.code),
        );
        if (threadHit) {
          fail(DICTIONARY[currentLang].ambiguousThreadError(query.code));
          return;
        }
      }
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
        fail(DICTIONARY[currentLang].disambiguateMadeiraError(query.code));
        return;
      }
      fail(DICTIONARY[currentLang].codeNotFoundError(trimmed));
      return;
    }
    case "text": {
      const results = searchColors(colorRows, query.text);
      if (results.length === 0) {
        fail(DICTIONARY[currentLang].nameNoMatchError(query.text));
        return;
      }
      const shown = results.slice(0, 10);
      currentView = null;
      activeComparison = null;
      copyAllButton.disabled = true;
      renderCandidates(
        resultBody,
        inspectorBody,
        loupeMode,
        query.text,
        shown,
        (row) => {
          clearError();
          handleSubmit(labelForRow(row), row, true);
        },
        currentLang,
      );
      resultStatus.textContent = DICTIONARY[currentLang].nameSearchResultsStatus(
        results.length,
        shown.length,
      );
      if (syncUrl) commitUrl(trimmed);
      input.focus();
      closeSuggestions();
      return;
    }
  }
}

/* ---------- clipboard ---------- */

const copyTimers = new WeakMap<HTMLElement, number>();

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

function flashElement(el: HTMLElement, duration = 1200): void {
  el.dataset.state = "success";
  const previous = copyTimers.get(el);
  if (previous) window.clearTimeout(previous);
  const timer = window.setTimeout(() => {
    delete el.dataset.state;
    copyTimers.delete(el);
  }, duration);
  copyTimers.set(el, timer);
}

function flashButton(button: HTMLButtonElement): void {
  const isStateOnly =
    button.classList.contains("coord-cell") || button.classList.contains("card-copy");
  if (isStateOnly) {
    flashElement(button, 1500);
  } else {
    const original = button.dataset.originalLabel ?? button.textContent ?? "";
    button.dataset.originalLabel = original;
    button.textContent = DICTIONARY[currentLang].copiedToast;
    flashElement(button, 1500);
    const previous = copyTimers.get(button);
    if (previous) window.clearTimeout(previous);
    const timer = window.setTimeout(() => {
      if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
      }
      delete button.dataset.state;
      copyTimers.delete(button);
    }, 1500);
    copyTimers.set(button, timer);
  }
}

async function copyText(
  text: string,
  element: HTMLElement | null,
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
    announce(DICTIONARY[currentLang].copiedLabelToast(label));
    if (element) {
      if (element instanceof HTMLButtonElement) flashButton(element);
      else flashElement(element);
    }
  } else {
    announce(DICTIONARY[currentLang].copyFailed);
  }
}

/* ---------- events ---------- */

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submitInFlight) return;
  submitInFlight = true;
  setBusy(true);
  try {
    closeSuggestions();
    handleSubmit(input.value, null, true);
  } finally {
    requestAnimationFrame(() => {
      submitInFlight = false;
      if (loadState === "ready") setBusy(false);
    });
  }
});

input.addEventListener("input", () => {
  if (!queryError.hidden && input.value.trim()) clearError();
  closeSuggestions();
  suggestTimer = window.setTimeout(updateSuggestions, 60);
});

input.addEventListener("focus", () => {
  window.clearTimeout(blurTimer);
  if (input.value.trim()) updateSuggestions();
});

input.addEventListener("blur", () => {
  window.clearTimeout(blurTimer);
  blurTimer = window.setTimeout(closeSuggestions, 120);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (suggestionsRoot.hidden) {
      updateSuggestions();
      if (suggestionsRoot.hidden) return;
    }
    event.preventDefault();
    const count = currentSuggestions.length;
    if (count === 0) return;
    if (event.key === "ArrowDown") {
      activeSuggestion = activeSuggestion < 0 ? 0 : (activeSuggestion + 1) % count;
    } else {
      activeSuggestion =
        activeSuggestion < 0 ? count - 1 : (activeSuggestion - 1 + count) % count;
    }
    renderSuggestions(suggestionsRoot, currentSuggestions, activeSuggestion);
    input.setAttribute("aria-activedescendant", `suggestion-${activeSuggestion}`);
    return;
  }

  if (suggestionsRoot.hidden) return;

  if (event.key === "Enter" && activeSuggestion >= 0) {
    event.preventDefault();
    chooseSuggestion(activeSuggestion);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeSuggestions();
    return;
  }

  if (event.key === "Tab") {
    closeSuggestions();
  }
});

suggestionsRoot.addEventListener("mousedown", (event) => event.preventDefault());
suggestionsRoot.addEventListener("click", (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>(".suggestion");
  if (!button) return;
  chooseSuggestion(Number(button.dataset.index));
});

let pickerTimer = 0;
colorPicker.addEventListener("input", () => {
  window.clearTimeout(pickerTimer);
  pickerTimer = window.setTimeout(() => {
    const hex = colorPicker.value.toUpperCase();
    input.value = hex;
    closeSuggestions();
    handleSubmit(hex, null, true);
  }, 120);
});

clearButton.addEventListener("click", () => {
  closeSuggestions();
  input.value = "";
  clearError();
  commitUrl(null);
  showEmptyWorkbench();
  input.focus();
});

sampleChipsRoot?.addEventListener("click", (event) => {
  const chip = (event.target as Element | null)?.closest<HTMLButtonElement>(".chip");
  const q = chip?.dataset.query?.trim();
  if (!q) return;
  closeSuggestions();
  clearError();
  input.value = q;
  handleSubmit(q, null, true);
});

langToggle.addEventListener("click", () => {
  const nextLang: Lang = currentLang === "tr" ? "en" : "tr";
  applyLanguage(nextLang);
});

document.addEventListener("click", (event) => {
  const target = event.target as Element | null;
  if (!target) return;

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
    updateStatus();
    return;
  }

  const copyButton = target.closest<HTMLButtonElement>("[data-copy]");
  if (copyButton) {
    const value = copyButton.dataset.copy;
    if (value) {
      void copyText(
        value,
        copyButton,
        copyButton.dataset.copyLabel ?? DICTIONARY[currentLang].valuesCopiedLabel,
      );
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const target = event.target as Element | null;
    const details = target?.closest("details") as HTMLDetailsElement | null;
    if (details?.open) {
      details.open = false;
      return;
    }
    if (!suggestionsRoot.hidden) {
      closeSuggestions();
      return;
    }
    return;
  }

  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target as Element | null;
  if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
  event.preventDefault();
  input.focus();
});

copyAllButton.addEventListener("click", () => {
  if (!currentView) return;
  void copyText(
    resultsToTsv(currentView, currentLang),
    copyAllButton,
    DICTIONARY[currentLang].tsvCopiedLabel,
  );
});

copyLinkButton.addEventListener("click", () => {
  void copyText(
    window.location.href,
    copyLinkButton,
    DICTIONARY[currentLang].linkCopiedLabel,
  );
});

/* ---------- boot ---------- */

function openToleranceNote(): void {
  const note = document.getElementById("tolerance-note") as HTMLDetailsElement | null;
  if (note) note.open = true;
}

document.addEventListener("click", (event) => {
  const anchor = (event.target as Element | null)?.closest?.('a[href="#tolerance-note"]');
  if (anchor) openToleranceNote();
});

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#tolerance-note") openToleranceNote();
});
if (window.location.hash === "#tolerance-note") openToleranceNote();

applyLanguage(currentLang);
syncPickerHex("#C8102E");
setBusy(true);
if (!currentView && window.matchMedia("(max-width: 68rem)").matches) {
  inspectorRail.open = false;
}
requestAnimationFrame(() => {
  void loadData();
});
