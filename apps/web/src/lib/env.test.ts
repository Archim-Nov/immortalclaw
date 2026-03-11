import assert from "node:assert/strict";
import test from "node:test";
import { readRuntimeBaseUrl, type RuntimeBaseUrlMeta } from "./env";

test("readRuntimeBaseUrl trims the Vite runtime base URL and strips one trailing slash", () => {
  const meta: RuntimeBaseUrlMeta = {
    env: {
      VITE_RUNTIME_BASE_URL: " https://runtime.example/ ",
    },
  };

  assert.equal(readRuntimeBaseUrl(meta), "https://runtime.example");
});
