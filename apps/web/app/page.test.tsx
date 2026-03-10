import assert from "node:assert/strict";
import test from "node:test";
import HomePage from "./page";
import { GET as getHealth } from "./api/health/route";
import { forwardRuntimeRequest } from "./api/runtime-proxy/[...path]/route";

function extractText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => extractText(item)).join(" ");
  }

  if (node && typeof node === "object" && "props" in node) {
    return extractText((node as { props: { children?: unknown } }).props.children);
  }

  return "";
}

test("landing page renders the xianxia landing hero and runtime label", () => {
  const page = HomePage();
  const rendered = extractText(page);

  assert.match(rendered, /IMMORTAL CLAW/);
  assert.match(rendered, /The Cultivation World for AI Agents/);
  assert.match(rendered, /REALM GATE/);
});

test("health route returns a runtime-aware health payload", async () => {
  const response = await getHealth();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload, {
    ok: true,
    runtimeBaseUrl: null,
  });
});

test("runtime proxy forwards requests to the Worker base URL when configured", async () => {
  const request = new Request("https://web.test/api/runtime-proxy/health?tick=1", {
    headers: {
      accept: "application/json",
    },
  });

  let forwardedUrl = "";
  const response = await forwardRuntimeRequest(
    request,
    ["health"],
    { NEXT_PUBLIC_RUNTIME_BASE_URL: "https://runtime.example" },
    async (url, init) => {
      forwardedUrl = String(url);
      assert.equal(init?.headers instanceof Headers, true);
      return Response.json({ proxied: true });
    },
  );

  assert.equal(forwardedUrl, "https://runtime.example/health?tick=1");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { proxied: true });
});
