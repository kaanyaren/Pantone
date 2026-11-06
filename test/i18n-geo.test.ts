import assert from "node:assert/strict";
import test from "node:test";

import { detectLanguageByGeo } from "../src/i18n.ts";

const GEO_URL = "https://ipapi.co/country_code/";

function stubFetch(handler: (url: unknown) => unknown): () => void {
  const previous = globalThis.fetch;
  // @ts-expect-error test double replaces fetch with a canned response
  globalThis.fetch = handler;
  return () => {
    globalThis.fetch = previous;
  };
}

const stubOkResponse = (body: string) => async () => ({ ok: true, text: async () => body });

async function assertGeo(body: string | Error | { ok: false }, expected: "tr" | "en" | null) {
  let seenUrl: unknown;
  const restore = stubFetch(async (url: unknown) => {
    seenUrl = url;
    if (body instanceof Error) throw body;
    if (typeof body === "object") return body;
    return stubOkResponse(body)();
  });
  try {
    assert.equal(await detectLanguageByGeo(), expected);
    assert.equal(seenUrl, GEO_URL);
  } finally {
    restore();
  }
}

test("detectLanguageByGeo maps TR to Turkish and everything else to English", async () => {
  await assertGeo("TR", "tr");
  await assertGeo("tr", "tr");
  await assertGeo(" tr\n", "tr");
  await assertGeo("DE", "en");
  await assertGeo("de", "en");
});

test("detectLanguageByGeo returns null on HTTP error, bad body, or throw", async () => {
  await assertGeo({ ok: false }, null);
  await assertGeo("", null);
  await assertGeo("USA", null);
  await assertGeo("1", null);
  await assertGeo("TR1", null);
  await assertGeo(new Error("offline"), null);
});

test("detectLanguageByGeo forwards the abort signal instead of hanging", async () => {
  let seenSignal: unknown;
  const restore = stubFetch(async (url: unknown, init?: { signal?: unknown }) => {
    seenSignal = init?.signal;
    return stubOkResponse("DE")();
  });
  try {
    const controller = new AbortController();
    const pending = detectLanguageByGeo(controller.signal);
    controller.abort();
    assert.equal(await pending, "en");
    assert.ok(seenSignal instanceof AbortSignal, "fetch must receive the signal");
  } finally {
    restore();
  }
});
