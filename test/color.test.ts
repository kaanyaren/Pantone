import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cmykToRgb,
  contrastRatio,
  gamutMap,
  hexToRgb,
  labToRgb,
  parseHex,
  pickSwatchText,
  relativeLuminance,
  rgbToCmyk,
  rgbToHex,
  rgbToLab,
} from "../src/color.ts";

const closeTo = (actual: number, expected: number, delta: number, what: string) => {
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `${what}: expected ${expected} ± ${delta}, got ${actual}`,
  );
};

describe("parseHex", () => {
  it("accepts 3- and 6-digit hex with or without #", () => {
    assert.deepEqual(parseHex("#ffffff"), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseHex("FFFFFF"), { r: 255, g: 255, b: 255 });
    assert.deepEqual(parseHex("#f00"), { r: 255, g: 0, b: 0 });
    assert.deepEqual(parseHex("  #0a0e12  "), { r: 10, g: 14, b: 18 });
  });

  it("returns null for malformed input instead of throwing", () => {
    for (const bad of ["", "#", "#ff", "#ffff", "#gggggg", "rebeccapurple", "#ff00001"]) {
      assert.equal(parseHex(bad), null, `expected null for ${JSON.stringify(bad)}`);
    }
  });
});

describe("rgbToHex", () => {
  it("round trips through parseHex", () => {
    const hex = "#1A48BC";
    const rgb = hexToRgb(hex);
    assert.ok(rgb);
    assert.equal(rgbToHex(rgb), hex);
  });

  it("clamps out-of-range channels", () => {
    assert.equal(rgbToHex({ r: -20, g: 300, b: 127.6 }), "#00FF80");
  });
});

describe("rgbToLab (CIELAB D50)", () => {
  it("maps white to (100, 0, 0)", () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });
    closeTo(lab.l, 100, 0.01, "L white");
    closeTo(lab.a, 0, 0.01, "a white");
    closeTo(lab.b, 0, 0.01, "b white");
  });

  it("maps black to (0, 0, 0)", () => {
    assert.deepEqual(rgbToLab({ r: 0, g: 0, b: 0 }), { l: 0, a: 0, b: 0 });
  });

  it("maps red to the D50 Lab reference values", () => {
    // D50: (54.2905, 80.8049, 69.8910). The D65 values (53.24, 80.09, 67.20)
    // belong to a different white point and are deliberately not used here.
    const lab = rgbToLab({ r: 255, g: 0, b: 0 });
    closeTo(lab.l, 54.2905, 0.005, "L red");
    closeTo(lab.a, 80.8049, 0.005, "a red");
    closeTo(lab.b, 69.891, 0.005, "b red");
  });

  it("round trips RGB -> Lab -> RGB within 1/255", () => {
    const samples = [
      { r: 0, g: 0, b: 0 },
      { r: 255, g: 255, b: 255 },
      { r: 255, g: 0, b: 0 },
      { r: 10, g: 14, b: 18 },
      { r: 26, g: 72, b: 188 },
      { r: 250, g: 252, b: 254 },
      { r: 12, g: 200, b: 77 },
      { r: 199, g: 120, b: 255 },
    ];
    for (const rgb of samples) {
      const back = labToRgb(rgbToLab(rgb));
      closeTo(back.r, rgb.r, 1, `r ${rgbToHex(rgb)}`);
      closeTo(back.g, rgb.g, 1, `g ${rgbToHex(rgb)}`);
      closeTo(back.b, rgb.b, 1, `b ${rgbToHex(rgb)}`);
    }
  });
});

describe("CMYK (unprofiled)", () => {
  it("maps black to 0/0/0/100", () => {
    assert.deepEqual(rgbToCmyk({ r: 0, g: 0, b: 0 }), { c: 0, m: 0, y: 0, k: 100 });
  });

  it("maps white to 0/0/0/0", () => {
    assert.deepEqual(rgbToCmyk({ r: 255, g: 255, b: 255 }), { c: 0, m: 0, y: 0, k: 0 });
  });

  it("round trips within 1/255", () => {
    const samples = [
      { r: 255, g: 0, b: 0 },
      { r: 10, g: 14, b: 18 },
      { r: 26, g: 72, b: 188 },
      { r: 250, g: 252, b: 254 },
      { r: 90, g: 140, b: 60 },
    ];
    for (const rgb of samples) {
      const back = cmykToRgb(rgbToCmyk(rgb));
      closeTo(back.r, rgb.r, 1, `r ${rgbToHex(rgb)}`);
      closeTo(back.g, rgb.g, 1, `g ${rgbToHex(rgb)}`);
      closeTo(back.b, rgb.b, 1, `b ${rgbToHex(rgb)}`);
    }
  });
});

describe("gamutMap", () => {
  it("keeps an in-gamut hex and reports no clipping", () => {
    assert.deepEqual(gamutMap("#1A48BC"), { hex: "#1A48BC", clipped: false });
    assert.deepEqual(gamutMap("#0A0E12"), { hex: "#0A0E12", clipped: false });
  });

  it("does not throw on malformed input", () => {
    assert.deepEqual(gamutMap("nope"), { hex: "#000000", clipped: true });
  });
});

describe("contrast", () => {
  it("black on white is 21:1", () => {
    closeTo(contrastRatio("#000000", "#FFFFFF"), 21, 1e-9, "black/white");
    closeTo(contrastRatio("#FFFFFF", "#000000"), 21, 1e-9, "white/black");
  });

  it("identical colours are 1:1", () => {
    closeTo(contrastRatio("#1A48BC", "#1A48BC"), 1, 1e-12, "identity");
  });

  it("white luminance is 1 and black is 0", () => {
    closeTo(relativeLuminance("#FFFFFF"), 1, 1e-12, "white luminance");
    closeTo(relativeLuminance("#000000"), 0, 1e-12, "black luminance");
  });
});

describe("pickSwatchText", () => {
  // Mid-grey (#767676-#777777) sits in the band where neither #0A0E12 nor
  // #FAFCFE reaches 4.5:1; it is covered by the "better option" test below.
  const swatches = [
    "#FFFFFF",
    "#FAFCFE",
    "#000000",
    "#0A0E12",
    "#FF0000",
    "#1A48BC",
    "#C778FF",
    "#00FF00",
    "#123456",
    "#F5E6C8",
    "#9A9A9A",
    "#5A5A5A",
  ];

  it("meets 4.5:1 against the chosen text colour for light and dark swatches", () => {
    for (const hex of swatches) {
      const choice = pickSwatchText(hex);
      const text = choice === "ink" ? "#0A0E12" : "#FAFCFE";
      const ratio = contrastRatio(hex, text);
      assert.ok(ratio >= 4.5, `${hex} on ${choice} is ${ratio.toFixed(2)}:1`);
    }
  });

  it("falls back to the better option when both miss the floor", () => {
    for (const hex of ["#767676", "#777777"]) {
      const choice = pickSwatchText(hex);
      const onInk = contrastRatio(hex, "#0A0E12");
      const onPaper = contrastRatio(hex, "#FAFCFE");
      const chosen = choice === "ink" ? onInk : onPaper;
      assert.equal(chosen, Math.max(onInk, onPaper));
      assert.ok(chosen >= 4.3, `${hex} best contrast is ${chosen.toFixed(2)}:1`);
    }
  });

  it("picks ink on light swatches and paper on dark ones", () => {
    assert.equal(pickSwatchText("#FFFFFF"), "ink");
    assert.equal(pickSwatchText("#000000"), "paper");
    assert.equal(pickSwatchText("#FAFCFE"), "ink");
    assert.equal(pickSwatchText("#0A0E12"), "paper");
  });
});
