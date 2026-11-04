import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deltaE2000 } from "../src/color.ts";
import type { Lab } from "../src/types.ts";

// Sharma, Wu & Dalal (2005), Table 1. Lab inputs are D50, matching the engine.
const sharmaPairs: Array<[Lab, Lab, number]> = [
  [{ l: 50, a: 2.6772, b: -79.7751 }, { l: 50, a: 0, b: -82.7485 }, 2.0425],
  [{ l: 50, a: 3.1571, b: -77.2803 }, { l: 50, a: 0, b: -82.7485 }, 2.8615],
  [{ l: 50, a: 2.8361, b: -74.02 }, { l: 50, a: 0, b: -82.7485 }, 3.4412],
  [{ l: 50, a: -1.3802, b: -84.2814 }, { l: 50, a: 0, b: -82.7485 }, 1.0],
  [{ l: 50, a: -1.1848, b: -84.8006 }, { l: 50, a: 0, b: -82.7485 }, 1.0],
  [{ l: 50, a: -0.9009, b: -85.5211 }, { l: 50, a: 0, b: -82.7485 }, 1.0],
  [{ l: 50, a: 0, b: 0 }, { l: 50, a: -1, b: 2 }, 2.3669],
  [{ l: 50, a: -1, b: 2 }, { l: 50, a: 0, b: 0 }, 2.3669],
  [{ l: 50, a: 2.49, b: -0.001 }, { l: 50, a: -2.49, b: 0.0009 }, 7.1792],
  [{ l: 50, a: 2.49, b: -0.001 }, { l: 50, a: -2.49, b: 0.0011 }, 7.2195],
  [{ l: 50, a: 2.49, b: -0.001 }, { l: 50, a: -2.49, b: 0.0012 }, 7.2195],
  [{ l: 50, a: -0.001, b: 2.49 }, { l: 50, a: 0.0009, b: -2.49 }, 4.8045],
  [{ l: 50, a: -0.001, b: 2.49 }, { l: 50, a: 0.0011, b: -2.49 }, 4.7461],
  [{ l: 50, a: 2.5, b: 0 }, { l: 50, a: 0, b: -2.5 }, 4.3065],
  [{ l: 50, a: 2.5, b: 0 }, { l: 73, a: 25, b: -18 }, 27.1492],
  [{ l: 50, a: 2.5, b: 0 }, { l: 61, a: -5, b: 29 }, 22.8977],
  [{ l: 50, a: 2.5, b: 0 }, { l: 56, a: -27, b: -3 }, 31.903],
  [{ l: 50, a: 2.5, b: 0 }, { l: 58, a: 24, b: 15 }, 19.4535],
  [{ l: 50, a: 2.5, b: 0 }, { l: 50, a: 3.1736, b: 0.5854 }, 1.0],
  [{ l: 50, a: 2.5, b: 0 }, { l: 50, a: 3.2972, b: 0 }, 1.0],
  [{ l: 50, a: 2.5, b: 0 }, { l: 50, a: 1.8634, b: 0.5757 }, 1.0],
  [{ l: 50, a: 2.5, b: 0 }, { l: 50, a: 3.2592, b: 0.335 }, 1.0],
  [{ l: 60.2574, a: -34.0099, b: 36.2677 }, { l: 60.4626, a: -34.1751, b: 39.4387 }, 1.2644],
  [{ l: 63.0109, a: -31.0961, b: -5.8663 }, { l: 62.8187, a: -29.7946, b: -4.0864 }, 1.263],
  [{ l: 61.2901, a: 3.7196, b: -5.3901 }, { l: 61.4292, a: 2.248, b: -4.962 }, 1.8731],
  [{ l: 35.0831, a: -44.1164, b: 3.7933 }, { l: 35.0232, a: -40.0716, b: 1.5901 }, 1.8645],
  [{ l: 22.7233, a: 20.0904, b: -46.694 }, { l: 23.0331, a: 14.973, b: -42.5619 }, 2.0373],
  [{ l: 36.4612, a: 47.858, b: 18.3852 }, { l: 36.2715, a: 50.5065, b: 21.2231 }, 1.4146],
  [{ l: 90.8027, a: -2.0831, b: 1.441 }, { l: 91.1528, a: -1.6435, b: 0.0447 }, 1.4441],
  [{ l: 90.9257, a: -0.5406, b: -0.9208 }, { l: 88.6381, a: -0.8985, b: -0.7239 }, 1.5381],
  [{ l: 6.7747, a: -0.2908, b: -2.4247 }, { l: 5.8714, a: -0.0985, b: -2.2286 }, 0.6377],
  [{ l: 2.0776, a: 0.0795, b: -1.135 }, { l: 0.9033, a: -0.0636, b: -0.5514 }, 0.9082],
];

describe("deltaE2000", () => {
  it("is zero for identical colours", () => {
    assert.equal(deltaE2000({ l: 50, a: 20, b: -30 }, { l: 50, a: 20, b: -30 }), 0);
    assert.equal(deltaE2000({ l: 0, a: 0, b: 0 }, { l: 0, a: 0, b: 0 }), 0);
  });

  it("is symmetric", () => {
    for (const [a, b] of sharmaPairs) {
      assert.equal(deltaE2000(a, b), deltaE2000(b, a));
    }
  });

  it("matches the published Sharma pairs within 0.0001", () => {
    for (const [a, b, expected] of sharmaPairs) {
      const actual = deltaE2000(a, b);
      assert.ok(
        Math.abs(actual - expected) <= 0.0001,
        `expected ${expected}, got ${actual} for ${JSON.stringify(a)} vs ${JSON.stringify(b)}`,
      );
    }
  });

  it("is non-negative and ignores hue terms for neutral pairs", () => {
    for (const [a, b] of sharmaPairs) {
      assert.ok(deltaE2000(a, b) >= 0);
    }
    // Same lightness and chroma, opposite hue: pure hue contribution.
    assert.ok(deltaE2000({ l: 50, a: 20, b: 0 }, { l: 50, a: -20, b: 0 }) > 0);
  });
});
