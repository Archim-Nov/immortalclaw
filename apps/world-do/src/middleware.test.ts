import assert from "node:assert/strict";
import test from "node:test";
import { createTestApp, TEST_ENV, TEST_PAGES_ORIGIN } from "./test-helpers.js";
import { LOCAL_VITE_DEV_ORIGIN, LOCAL_VITE_PREVIEW_ORIGIN } from "./env.js";

test("unexpected backend errors return 500", async () => {
  const app = createTestApp({
    world: {
      async getCultivatorState() {
        throw new Error("database unavailable");
      },
    },
  });

  const response = await app.request("https://runtime.test/cultivator/state?cultivatorId=yun-zhong-he");
  const payload = await response.json() as { error: string };

  assert.equal(response.status, 500);
  assert.equal(payload.error, "database unavailable");
});

test("cors allows the configured pages origin", async () => {
  const app = createTestApp();

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: TEST_PAGES_ORIGIN,
      },
    },
    TEST_ENV,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), TEST_PAGES_ORIGIN);
});

test("cors allows the pinned local vite preview origin", async () => {
  const app = createTestApp();

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: LOCAL_VITE_PREVIEW_ORIGIN,
      },
    },
    TEST_ENV,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), LOCAL_VITE_PREVIEW_ORIGIN);
});

test("cors still works when request handling does not provide context env", async () => {
  const app = createTestApp();

  const response = await app.request("https://runtime.test/health", {
    headers: {
      origin: LOCAL_VITE_DEV_ORIGIN,
    },
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), LOCAL_VITE_DEV_ORIGIN);
});

test("cors does not allow unrelated origins", async () => {
  const app = createTestApp();

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: "https://forbidden.example",
      },
    },
    TEST_ENV,
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});
