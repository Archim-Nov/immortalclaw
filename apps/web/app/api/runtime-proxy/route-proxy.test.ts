import assert from "node:assert/strict";
import test from "node:test";
import * as routeModule from "./[...path]/route";

test("POST proxies action requests to the runtime worker", async () => {
  const originalFetch = globalThis.fetch;
  const originalBaseUrl = process.env.NEXT_PUBLIC_RUNTIME_BASE_URL;
  let capturedRequest: Request | null = null;

  process.env.NEXT_PUBLIC_RUNTIME_BASE_URL = "https://runtime.example";
  globalThis.fetch = (async (input, init) => {
    capturedRequest = new Request(input, init);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const request = new Request("https://web.test/api/runtime-proxy/cultivator/act", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cultivatorId: "yun-zhong-he", actionId: "cultivate" }),
    });

    const response = await routeModule.POST(request, {
      params: Promise.resolve({ path: ["cultivator", "act"] }),
    });

    if (!capturedRequest) {
      throw new Error("Expected the runtime request to be forwarded.");
    }

    const forwardedRequest = capturedRequest as Request;
    assert.equal(response.status, 200);
    assert.equal(forwardedRequest.method, "POST");
    assert.equal(forwardedRequest.url, "https://runtime.example/cultivator/act");
    assert.equal(
      await forwardedRequest.text(),
      JSON.stringify({ cultivatorId: "yun-zhong-he", actionId: "cultivate" }),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_RUNTIME_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_RUNTIME_BASE_URL = originalBaseUrl;
    }
  }
});
