import assert from "node:assert/strict";
import test from "node:test";
import { readRuntimeBaseUrl } from "./env";

test("readRuntimeBaseUrl trims the Vite runtime base URL and strips a trailing slash", () => {
  assert.equal(
    readRuntimeBaseUrl({
      env: {
        VITE_RUNTIME_BASE_URL: " https://runtime.example/ ",
      },
    }),
    "https://runtime.example",
  );
});

test("readRuntimeBaseUrl ignores malformed runtime base URLs", () => {
  assert.equal(
    readRuntimeBaseUrl({
      env: {
        VITE_RUNTIME_BASE_URL: " runtime.example ",
      },
    }),
    null,
  );
});
