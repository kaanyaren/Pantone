import assert from "node:assert/strict";
import test from "node:test";

import { countryCodeToLang, getStoredLang, getStoredLangOrNull } from "../src/i18n.ts";

test("country code maps TR to Turkish, everything else to English", () => {
  assert.equal(countryCodeToLang("TR"), "tr");
  assert.equal(countryCodeToLang("tr"), "tr");
  assert.equal(countryCodeToLang(" tr "), "tr");
  assert.equal(countryCodeToLang("DE"), "en");
  assert.equal(countryCodeToLang("US"), "en");
  assert.equal(countryCodeToLang(""), "en");
});

test("stored language falls back to Turkish without DOM storage", () => {
  assert.equal(getStoredLangOrNull(), null);
  assert.equal(getStoredLang(), "tr");
});
