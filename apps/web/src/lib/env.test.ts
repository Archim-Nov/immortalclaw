import assert from "node:assert/strict";
import test from "node:test";
import { readRuntimeBaseUrl, setRuntimeBaseUrlImportMetaEnvForTest } from "./env";

test("readRuntimeBaseUrl uses the default import.meta.env path, trims whitespace, and strips a trailing slash", () => {
  setRuntimeBaseUrlImportMetaEnvForTest({
    VITE_RUNTIME_BASE_URL: " https://runtime.example/ ",
  });

  try {
    assert.equal(readRuntimeBaseUrl(), "https://runtime.example");
  } finally {
    setRuntimeBaseUrlImportMetaEnvForTest(undefined);
  }
});
