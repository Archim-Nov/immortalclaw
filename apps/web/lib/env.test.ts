import assert from "node:assert/strict";
import test from "node:test";
import { readRuntimeBaseUrl } from "./env";

test("readRuntimeBaseUrl normalizes the Vite runtime base URL", () => {
  const env = {
    VITE_RUNTIME_BASE_URL: " https://runtime.example/ ",
  } as Parameters<typeof readRuntimeBaseUrl>[0] & {
    VITE_RUNTIME_BASE_URL?: string;
  };

  assert.equal(readRuntimeBaseUrl(env), "https://runtime.example");
});

test("readRuntimeBaseUrl still supports the legacy public runtime base URL", () => {
  assert.equal(
    readRuntimeBaseUrl({ NEXT_PUBLIC_RUNTIME_BASE_URL: " https://legacy.example/ " }),
    "https://legacy.example",
  );
});
