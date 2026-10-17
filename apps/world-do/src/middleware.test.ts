import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createTestApp, TEST_ENV, TEST_PAGES_ORIGIN } from "./test-helpers.js";
import { LOCAL_VITE_DEV_ORIGIN, LOCAL_VITE_PREVIEW_ORIGIN, type WorldDOHonoEnv } from "./env.js";
import { registerMiddleware } from "./middleware.js";

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

test("a rejected act keeps the Chinese reason on summary", async () => {
  const app = new Hono<WorldDOHonoEnv>();
  registerMiddleware(app, TEST_ENV);
  app.post("/agent/act", () => {
    const error = new Error("灵石不够。蒲团要21600，身上只有0。");
    Object.assign(error, { status: 409 });
    throw error;
  });

  const response = await app.request("https://runtime.test/agent/act", { method: "POST" });
  const payload = await response.json() as { error?: string; summary?: string };

  assert.equal(response.status, 409);
  assert.match(payload.summary ?? "", /灵石不够/);
  assert.equal(payload.summary, payload.error);
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
