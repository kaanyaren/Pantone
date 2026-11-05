export type Lang = "tr" | "en";

export interface Translations {
  pageTitle: string;
  metaDescription: string;
  brandAria: string;
  skipLink: string;
  fieldLabel: string;
  colorPickerTitle: string;
  searchPlaceholder: string;
  clearAria: string;
  matchButton: string;
  matchBusy: string;
  querySuggestionsAria: string;
  queryHelp: string;
  examplesLabel: string;
  substrateNote: string;
  substrateLink: string;
  chipAria: (q: string) => string;
  loupeTitle: string;
  loupeNearest: string;
  loupeInput: string;
  loupeCompare: string;
  loupePinned: string;
  pin: string;
  unpin: string;
  loupeCompareEmpty: string;
  loupeNoTarget: string;
  matrixTitle: string;
  filterAll: string;
  filterPrint: string;
  filterTextile: string;
  filterMadeira: string;
  filterDurak: string;
  filterGroupAria: string;
  tsvCopy: string;
  linkCopy: string;
  inspect: string;
  inspectAria: (label: string, code: string) => string;
  requery: string;
  requeryAria: (system: string, code: string, name: string) => string;
  copyCardButton: string;
  copyCardAria: (label: string) => string;
  copyCardTitle: string;
  copiedAnnouncement: (code: string) => string;
  coordCopyAria: (label: string, value: string) => string;
  deltaBands: {
    exact: string;
    near: string;
    close: string;
    noticeable: string;
    loose: string;
    noClose: string;
  };
  sameCodeDifferentSubstrate: string;
  noCloseMatchHeading: string;
  closestCandidate: (code: string, hex: string, delta: string) => string;
  nearestFirst5: string;
  inspectCandidateAria: (system: string, code: string, name: string, delta: string) => string;
  groupThreads: string;
  groupPantone: string;
  matrixCaption: string;
  columns: readonly [string, string];
  cmykUnprofiled: string;
  deltaDistribution: string;
  nameSearchTitle: string;
  nameSearchEmpty: (query: string) => string;
  nameSearchHeading: string;
  nameSearchResultsStatus: (total: number, shown: number) => string;
  idleBadge: string;
  idleInspectorText: string;
  starterHeading: string;
  starterSub: string;
  dataErrorTitle: string;
  dataErrorDetail: string;
  retry: string;
  colorsCount: (count: string) => string;
  statusNoLibraries: string;
  statusNoCloseMatch: (shown: number, total: number, nearest: string, delta: string) => string;
  statusClosest: (shown: number, total: number, nearest: string, delta: string) => string;
  invalidHexError: string;
  rgbRangeError: string;
  cmykRangeError: string;
  genericQueryError: string;
  ambiguousThreadError: (code: string) => string;
  disambiguateMadeiraError: (code: string) => string;
  codeNotFoundError: (query: string) => string;
  nameNoMatchError: (query: string) => string;
  readyStatus: string;
  loadingStatus: string;
  footSystems: string;
  footRows: string;
  copyFailed: string;
  copiedToast: string;
  copiedLabelToast: (label: string) => string;
  tsvCopiedLabel: string;
  linkCopiedLabel: string;
  valuesCopiedLabel: string;
  langToggleAria: string;
}

export const DICTIONARY: Record<Lang, Translations> = {
  tr: {
    pageTitle: "Pantone Karşılığı Bulucu",
    metaDescription:
      "Pantone C, U, TCX ve TPX, Madeira Polyneon ve Classic, Durak Polysoft ve Visco, hex, RGB ve CMYK değerlerini CIEDE2000 en yakın eşleşmelerle dönüştürün.",
    brandAria: "PantonAK ana sayfa",
    skipLink: "Dönüştürücüye geç",
    fieldLabel: "Pantone kodu, iplik no veya renk değeri",
    colorPickerTitle: "Görsel olarak renk seç",
    searchPlaceholder:
      "186 C, 19-4052 TCX, #C8102E, Classic 1147, Polyneon 1610…",
    clearAria: "Sorguyu temizle",
    matchButton: "Eşleştir",
    matchBusy: "Eşleştiriliyor…",
    querySuggestionsAria: "Kod veya renk önerileri",
    queryHelp: "8 kütüphane · CIEDE2000 (D50) · Odak için",
    examplesLabel: "Örnek:",
    substrateNote:
      "C/U baskı mürekkebi, TCX/TPX pamuklu tekstildir — aynı kod farklı zeminde farklı görünür.",
    substrateLink: "Tolerans ölçeği",
    chipAria: (q) => `Örnek sorgu: ${q}`,
    loupeTitle: "Numune büyüteci",
    loupeNearest: "En yakın eşleşme",
    loupeInput: "Girdi numunesi",
    loupeCompare: "Karşılaştırma",
    loupePinned: "Sabit",
    pin: "Sabitle",
    unpin: "Sabiti kaldır",
    loupeCompareEmpty: "Yalnızca giriş",
    loupeNoTarget: "hedef yok",
    matrixTitle: "Çapraz referans matrisi",
    filterAll: "Tümü (8)",
    filterPrint: "Baskı C/U",
    filterTextile: "Tekstil TCX/TPX",
    filterMadeira: "Madeira",
    filterDurak: "Durak",
    filterGroupAria: "Kütüphaneleri aileye göre filtrele",
    tsvCopy: "TSV kopyala",
    linkCopy: "Bağlantıyı kopyala",
    inspect: "İncele",
    inspectAria: (label, code) => `Loupe'ta karşılaştır: ${label} ${code}`,
    requery: "Sorgula",
    requeryAria: (system, code, name) => `Bunu sorgula: ${system} ${code} (${name})`,
    copyCardButton: "Kopyala: kod + HEX",
    copyCardAria: (label) => `Kopyala: ${label}`,
    copyCardTitle: "Kodu ve HEX değerini kopyala",
    copiedAnnouncement: (code) => `${code} kopyalandı`,
    coordCopyAria: (label, value) => `${label} ${value} değerini kopyala`,
    deltaBands: {
      exact: "aynı değer",
      near: "neredeyse aynı",
      close: "yakın",
      noticeable: "fark edilir",
      loose: "zayıf",
      noClose: "yakın eşleşme yok",
    },
    sameCodeDifferentSubstrate: "aynı kod · farklı zemin",
    noCloseMatchHeading: "Bu kütüphanede yakın eşleşme yok (ΔE00 > 5)",
    closestCandidate: (code, hex, delta) => `En yakın aday: ${code} (${hex}) · ΔE00 ${delta}`,
    nearestFirst5: "Bu kütüphanede ilk 5",
    inspectCandidateAria: (system, code, name, delta) =>
      `Bunu sorgula: ${system} ${code} (${name}), ΔE00 ${delta}`,
    groupThreads: "İplikler",
    groupPantone: "Pantone",
    matrixCaption: "Her kütüphanedeki en yakın renk; kodlar ve değerlerle.",
    columns: ["Renk", "ΔE00"] as const,
    cmykUnprofiled: "CMYK (profilsiz)",
    deltaDistribution: "ΔE00 dağılımı",
    nameSearchTitle: "Ad araması",
    nameSearchEmpty: (query) =>
      `"${query}" için ad eşleşmeleri gösteriliyor. 8 kütüphaneli karşılaştırmayı ve bölünmüş büyüteci açmak için sağdaki renk örneklerinden birini seçin.`,
    nameSearchHeading: "Eşleşen renk adları — dönüştürmek için birini seçin",
    nameSearchResultsStatus: (total, shown) =>
      shown < total
        ? `${total} ad eşleşmesinden ${shown} tanesi gösteriliyor. Dönüştürmek için birini seçin.`
        : `${total} ad eşleşmesi. Dönüştürmek için birini seçin.`,
    idleBadge: "Beklemede",
    idleInspectorText:
      "Bölünmüş karşılaştırıcıyı açmak için bir başlangıç rengi seçin veya yukarıya herhangi bir Pantone, Madeira, Durak, hex, RGB ya da CMYK değeri girin.",
    starterHeading: "Hızlı başlangıç numuneleri",
    starterSub:
      "Sekiz baskı, tekstil ve nakış ipliği kütüphanesinin tamamında karşılaştırmak için aşağıdan bir numune seçin. Örn: 186 C yazıp Eşleştir'e basın — loupe + 8 ΔE00 sırası + TSV kopyala.",
    dataErrorTitle: "Renk veri kümesi yüklenemedi.",
    dataErrorDetail: "JSON paketi gelmedi. Sayfayı yenileyin veya tekrar deneyin.",
    retry: "Yeniden dene",
    colorsCount: (count) => `${count} renk`,
    statusNoLibraries: "Bu filtrede kütüphane yok.",
    statusNoCloseMatch: (shown, total, nearest, delta) =>
      `${shown}/${total} kütüphane · Yakın eşleşme yok · En yakın aday: ${nearest} · ΔE00 ${delta}`,
    statusClosest: (shown, total, nearest, delta) =>
      `${shown}/${total} kütüphane · En yakın: ${nearest} · ΔE00 ${delta}`,
    invalidHexError: "# sonrasında hex 3 veya 6 karakter olmalı.",
    rgbRangeError: "RGB kanalları 0–255 arasında olmalı.",
    cmykRangeError: "CMYK kanalları 0–100 arasında olmalı.",
    genericQueryError:
      "Bir hex değeri, rgb(), cmyk(), Pantone kodu veya iplik kodu girin.",
    ambiguousThreadError: (code) =>
      `"${code}" hem baskı hem iplikte var. Pantone için "1225 C", iplik için "Madeira 1225" veya "Classic 1225" yazın.`,
    disambiguateMadeiraError: (code) =>
      `"${code}" kodunu ayırt etmek için "Madeira" veya "Classic" ekleyin.`,
    codeNotFoundError: (query) =>
      `Yüklenen kütüphanelerde "${query}" kodu yok. "186 C", "19-4052 TCX" veya "Classic 1147" deneyin.`,
    nameNoMatchError: (query) =>
      `"${query}" ile eşleşen kod veya ad yok. "186 C", "19-4052 TCX" veya "Classic 1147" deneyin.`,
    readyStatus: "Hazır — bir başlangıç numunesi seçin veya yukarıya bir sorgu girin.",
    loadingStatus: "Renk kütüphaneleri yükleniyor…",
    footSystems: "sistem",
    footRows: "satır",
    copyFailed: "Kopyalama başarısız. Değeri seçip elle kopyalayın.",
    copiedToast: "Kopyalandı",
    copiedLabelToast: (label) => `${label} panoya kopyalandı.`,
    tsvCopiedLabel: "TSV (tüm sistemler)",
    linkCopiedLabel: "bağlantı",
    valuesCopiedLabel: "değerler",
    langToggleAria: "Dili değiştir (Türkçe / English)",
  },
  en: {
    pageTitle: "Pantone Match Finder",
    metaDescription:
      "Convert Pantone C, U, TCX and TPX, Madeira Polyneon and Classic, Durak Polysoft and Visco, hex, RGB, and CMYK with CIEDE2000 nearest matches.",
    brandAria: "PantonAK home",
    skipLink: "Skip to converter",
    fieldLabel: "Pantone code, thread no or color value",
    colorPickerTitle: "Choose color visually",
    searchPlaceholder:
      "186 C, 19-4052 TCX, #C8102E, Classic 1147, Polyneon 1610…",
    clearAria: "Clear query",
    matchButton: "Match",
    matchBusy: "Matching…",
    querySuggestionsAria: "Code or color suggestions",
    queryHelp: "8 libraries · CIEDE2000 (D50) · Focus with",
    examplesLabel: "Try:",
    substrateNote:
      "C/U is print ink, TCX/TPX is cotton textile — same code looks different on each substrate.",
    substrateLink: "Tolerance scale",
    chipAria: (q) => `Sample query: ${q}`,
    loupeTitle: "Specimen loupe",
    loupeNearest: "Nearest match",
    loupeInput: "Input specimen",
    loupeCompare: "Comparison",
    loupePinned: "Pinned",
    pin: "Pin",
    unpin: "Unpin",
    loupeCompareEmpty: "Input only",
    loupeNoTarget: "no target",
    matrixTitle: "Cross-reference matrix",
    filterAll: "All (8)",
    filterPrint: "Print C/U",
    filterTextile: "Textile TCX/TPX",
    filterMadeira: "Madeira",
    filterDurak: "Durak",
    filterGroupAria: "Filter libraries by family",
    tsvCopy: "Copy TSV",
    linkCopy: "Copy link",
    inspect: "Inspect",
    inspectAria: (label, code) => `Compare in loupe: ${label} ${code}`,
    requery: "Re-query",
    requeryAria: (system, code, name) => `Re-query with ${system} ${code} (${name})`,
    copyCardButton: "Copy: code + HEX",
    copyCardAria: (label) => `Copy: ${label}`,
    copyCardTitle: "Copy code and HEX",
    copiedAnnouncement: (code) => `${code} copied`,
    coordCopyAria: (label, value) => `Copy ${label} ${value}`,
    deltaBands: {
      exact: "identical",
      near: "near identical",
      close: "close",
      noticeable: "noticeable",
      loose: "loose",
      noClose: "no close match",
    },
    sameCodeDifferentSubstrate: "same code · different substrate",
    noCloseMatchHeading: "No close match in this library (ΔE00 > 5)",
    closestCandidate: (code, hex, delta) => `Nearest candidate: ${code} (${hex}) · ΔE00 ${delta}`,
    nearestFirst5: "Top 5 in this library",
    inspectCandidateAria: (system, code, name, delta) =>
      `Re-query with ${system} ${code} (${name}), ΔE00 ${delta}`,
    groupThreads: "Threads",
    groupPantone: "Pantone",
    matrixCaption: "Nearest color in each library with codes and values.",
    columns: ["Color", "ΔE00"] as const,
    cmykUnprofiled: "CMYK (unprofiled)",
    deltaDistribution: "ΔE00 distribution",
    nameSearchTitle: "Name search",
    nameSearchEmpty: (query) =>
      `Showing name matches for "${query}". Select one of the color swatches to open 8-library matrix and split loupe.`,
    nameSearchHeading: "Matching color names — select one to convert",
    nameSearchResultsStatus: (total, shown) =>
      shown < total
        ? `Showing ${shown} of ${total} name matches. Select one to convert.`
        : `${total} name matches. Select one to convert.`,
    idleBadge: "Standby",
    idleInspectorText:
      "Choose a starter specimen or enter any Pantone, Madeira, Durak, hex, RGB, or CMYK value above to open the split comparator.",
    starterHeading: "Quick starter swatches",
    starterSub:
      "Select a specimen below to compare across all eight print, textile, and embroidery thread libraries. E.g. type 186 C and hit Match — loupe + 8 ΔE00 ranks + copy TSV.",
    dataErrorTitle: "Could not load color dataset.",
    dataErrorDetail: "JSON bundle failed to load. Refresh the page or try again.",
    retry: "Retry",
    colorsCount: (count) => `${count} colors`,
    statusNoLibraries: "No libraries in this filter.",
    statusNoCloseMatch: (shown, total, nearest, delta) =>
      `${shown}/${total} libraries · No close match · Nearest candidate: ${nearest} · ΔE00 ${delta}`,
    statusClosest: (shown, total, nearest, delta) =>
      `${shown}/${total} libraries · Nearest: ${nearest} · ΔE00 ${delta}`,
    invalidHexError: "Hex value after # must be 3 or 6 characters.",
    rgbRangeError: "RGB channels must be between 0 and 255.",
    cmykRangeError: "CMYK channels must be between 0 and 100.",
    genericQueryError: "Enter a hex value, rgb(), cmyk(), Pantone code or thread code.",
    ambiguousThreadError: (code) =>
      `"${code}" exists in both print and thread. Use "1225 C" for Pantone, or "Madeira 1225" / "Classic 1225" for thread.`,
    disambiguateMadeiraError: (code) =>
      `Add "Madeira" or "Classic" to disambiguate code "${code}".`,
    codeNotFoundError: (query) =>
      `Code "${query}" not found in loaded libraries. Try "186 C", "19-4052 TCX", or "Classic 1147".`,
    nameNoMatchError: (query) =>
      `No matching code or name for "${query}". Try "186 C", "19-4052 TCX", or "Classic 1147".`,
    readyStatus: "Ready — select a starter specimen or enter a query above.",
    loadingStatus: "Loading color libraries…",
    footSystems: "systems",
    footRows: "rows",
    copyFailed: "Copy failed. Please select and copy manually.",
    copiedToast: "Copied",
    copiedLabelToast: (label) => `${label} copied to clipboard.`,
    tsvCopiedLabel: "TSV (all systems)",
    linkCopiedLabel: "link",
    valuesCopiedLabel: "values",
    langToggleAria: "Switch language (Türkçe / English)",
  },
};

const STORAGE_KEY = "pantonak_lang";

export function getStoredLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "tr") return saved;
  } catch {
    // localStorage not accessible
  }
  return "tr";
}

export function setStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage not accessible
  }
}
