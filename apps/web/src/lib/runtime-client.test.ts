import assert from "node:assert/strict";
import test from "node:test";
import { setRuntimeBaseUrlMetaOverride } from "./env";
import { createRuntimeClient } from "./runtime-client";

test("createRuntimeClient throws a clear error when the runtime base URL is missing", () => {
  setRuntimeBaseUrlMetaOverride({ env: {} });

  try {
    assert.throws(() => createRuntimeClient(), /runtime base url.*not configured/i);
  } finally {
    setRuntimeBaseUrlMetaOverride(null);
  }
});

test("createRuntimeClient requests the runtime worker URL for a relative path", async () => {
  let capturedUrl: string | null = null;

  const client = createRuntimeClient({
    baseUrl: "https://runtime.example/",
    fetchImpl: (async (input) => {
      capturedUrl =
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch,
  });

  const response = await client.request("/health?tick=1");

  assert.equal(response.status, 200);
  assert.equal(capturedUrl, "https://runtime.example/health?tick=1");
});

test("createRuntimeClient normalizes JSON error payloads from the runtime worker", async () => {
  const client = createRuntimeClient({
    baseUrl: "https://runtime.example",
    fetchImpl: (async () =>
      new Response(JSON.stringify({ error: "Realm gate unstable." }), {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      })) as typeof fetch,
  });

  await assert.rejects(
    () => client.request("/health"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "Realm gate unstable.");
      assert.equal((error as Error & { status?: number }).status, 503);
      return true;
    },
  );
});
