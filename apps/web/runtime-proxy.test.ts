import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeProxyUrl,
  onRequest,
  readRuntimeProxyBaseUrl,
} from "./functions/_runtime-proxy.js";

test("readRuntimeProxyBaseUrl prefers explicit proxy env and normalizes trailing slashes", () => {
  assert.equal(
    readRuntimeProxyBaseUrl({
      RUNTIME_PROXY_BASE_URL: "https://runtime-proxy.example/",
      RUNTIME_BASE_URL: "https://runtime-base.example",
      VITE_RUNTIME_BASE_URL: "https://vite-runtime.example",
    }),
    "https://runtime-proxy.example",
  );
});

test("readRuntimeProxyBaseUrl falls back through runtime env names", () => {
  assert.equal(
    readRuntimeProxyBaseUrl({
      RUNTIME_BASE_URL: "https://runtime-base.example/",
    }),
    "https://runtime-base.example",
  );
  assert.equal(
    readRuntimeProxyBaseUrl({
      VITE_RUNTIME_BASE_URL: "https://vite-runtime.example/",
    }),
    "https://vite-runtime.example",
  );
  assert.equal(readRuntimeProxyBaseUrl({}), null);
});

test("buildRuntimeProxyUrl preserves path and query against the runtime base url", () => {
  assert.equal(
    buildRuntimeProxyUrl(
      "https://immortal-claw-web.pages.dev/agent/state?foo=bar",
      "https://runtime.example",
    ),
    "https://runtime.example/agent/state?foo=bar",
  );
  assert.equal(
    buildRuntimeProxyUrl(
      "https://immortal-claw-web.pages.dev/skill.md",
      "https://runtime.example/base",
    ),
    "https://runtime.example/skill.md",
  );
});

test("onRequest proxies registration requests to the runtime without changing method or body", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamRequest: Request | null = null;

  globalThis.fetch = (async (request: Request | URL | string) => {
    upstreamRequest = request instanceof Request ? request : new Request(request);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }) as typeof fetch;

  try {
    const response = await onRequest({
      env: {
        RUNTIME_PROXY_BASE_URL: "https://runtime.example/base/",
      },
      request: new Request("https://immortal-claw.pages.dev/agent/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "Su Mingyue",
        }),
      }),
    });

    assert.ok(upstreamRequest);
    assert.equal(upstreamRequest.url, "https://runtime.example/agent/register");
    assert.equal(upstreamRequest.method, "POST");
    assert.equal(await upstreamRequest.text(), JSON.stringify({ name: "Su Mingyue" }));
    assert.equal(response.headers.get("x-immortal-proxy"), "pages");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("onRequest returns a JSON 502 when the runtime proxy is not configured", async () => {
  const response = await onRequest({
    env: {},
    request: new Request("https://immortal-claw.pages.dev/agent/register"),
  });

  assert.equal(response.status, 502);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/i);
  assert.deepEqual(await response.json(), {
    error: "Runtime proxy is not configured.",
  });
});

test("onRequest returns a JSON 502 with the upstream fetch error message when the runtime is unreachable", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    throw new Error("fetch failed: runtime worker unreachable");
  }) as typeof fetch;

  try {
    const response = await onRequest({
      env: {
        RUNTIME_PROXY_BASE_URL: "https://runtime.example",
      },
      request: new Request("https://immortal-claw.pages.dev/agent/register"),
    });

    assert.equal(response.status, 502);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/i);
    assert.deepEqual(await response.json(), {
      error: "fetch failed: runtime worker unreachable",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
