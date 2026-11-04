export type SystemId =
  | "C"
  | "U"
  | "TCX"
  | "TPX"
  | "MP"
  | "MR"
  | "DPS"
  | "DVS";

export type Provenance = "community" | "manufacturer" | "legacy";

export interface SystemMeta {
  id: SystemId;
  label: string;
  short: string;
  family: "pantone" | "madeira" | "durak";
  provenance: Provenance;
  source: string;
  license: string;
  count: number;
}

export interface Dataset {
  version: 1;
  generated: string;
  systems: SystemMeta[];
  rows: Array<[SystemId, string, string, string]>;
}

export interface ColorRow {
  system: SystemId;
  code: string;
  name: string;
  hex: string;
}

export interface Match {
  row: ColorRow;
  deltaE: number;
  mappedHex: string;
  clipped: boolean;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface Lab {
  l: number;
  a: number;
  b: number;
}

export type Query =
  | { kind: "hex"; hex: string }
  | { kind: "rgb"; rgb: RGB }
  | { kind: "cmyk"; cmyk: CMYK }
  | { kind: "code"; system: SystemId | null; code: string }
  | { kind: "text"; text: string };
