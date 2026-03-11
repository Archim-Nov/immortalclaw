import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRuntimeProxyUrl,
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
