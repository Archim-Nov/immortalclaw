import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.js";
import { LOCAL_VITE_DEV_ORIGIN, LOCAL_VITE_PREVIEW_ORIGIN } from "./env.js";

const pagesOrigin = "https://immortal-claw.pages.dev";

function unusedRepository() {
  return {
    async readWorld() {
      throw new Error("not used");
    },
    async listAgentProfiles() {
      throw new Error("not used");
    },
    async getCultivatorState() {
      throw new Error("not used");
    },
    async listAvailableActions() {
      throw new Error("not used");
    },
    async performAction() {
      throw new Error("not used");
    },
    async advanceWorld() {
      throw new Error("not used");
    },
    async getLatestTickRun() {
      throw new Error("not used");
    },
    async acquireTickLock() {
      throw new Error("not used");
    },
    async releaseTickLock() {
      throw new Error("not used");
    },
    async registerAgent() {
      throw new Error("not used");
    },
    async authenticateAgent() {
      throw new Error("not used");
    },
    async resetAgentCredential() {
      throw new Error("not used");
    },
    async syncAgentPersona() {
      throw new Error("not used");
    },
    async touchAgent() {
      throw new Error("not used");
    },
    async syncPersona() {
      throw new Error("not used");
    },
    async getCultivationRegistration() {
      throw new Error("not used");
    },
    async saveCultivationRegistration() {
      throw new Error("not used");
    },
  };
}

test("unexpected backend errors return 500", async () => {
  const repository = unusedRepository();
  repository.getCultivatorState = async () => {
    throw new Error("database unavailable");
  };

  const app = createApp({ repository });
  const response = await app.request("https://runtime.test/cultivator/state?cultivatorId=yun-zhong-he");
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.error, "database unavailable");
});

test("conflict-style errors preserve their 409 status", async () => {
  const repository = unusedRepository();
  repository.performAction = async () => {
    throw Object.assign(new Error("World snapshot changed before write."), { status: 409 });
  };

  const app = createApp({ repository });
  const response = await app.request("https://runtime.test/cultivator/act", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ cultivatorId: "yun-zhong-he", actionId: "cultivate" }),
  });
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.equal(payload.error, "World snapshot changed before write.");
});

test("cors preflight allows the configured pages origin", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request(
    "https://runtime.test/health",
    {
      method: "OPTIONS",
      headers: {
        origin: pagesOrigin,
        "access-control-request-method": "GET",
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.ok(response.status === 200 || response.status === 204);
  assert.equal(response.headers.get("access-control-allow-origin"), pagesOrigin);
});

test("cors allows health requests from the configured pages origin", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: pagesOrigin,
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), pagesOrigin);
});

test("cors allows pages preview deployment origins tied to the configured pages project domain", async () => {
  const app = createApp({ repository: unusedRepository() as never });
  const previewOrigin = "https://main.immortal-claw.pages.dev";

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: previewOrigin,
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), previewOrigin);
});

test("cors does not allow disallowed origins", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: "https://forbidden.example",
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("cors does not allow unrelated pages.dev preview domains", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: "https://main.other-project.pages.dev",
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("cors allows the pinned local vite preview origin", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request(
    "https://runtime.test/health",
    {
      headers: {
        origin: LOCAL_VITE_PREVIEW_ORIGIN,
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), LOCAL_VITE_PREVIEW_ORIGIN);
});

test("cors preserves allow-origin on error responses for allowed origins", async () => {
  const repository = unusedRepository();
  repository.getCultivatorState = async () => {
    throw new Error("database unavailable");
  };

  const app = createApp({ repository });
  const response = await app.request(
    "https://runtime.test/cultivator/state?cultivatorId=yun-zhong-he",
    {
      headers: {
        origin: pagesOrigin,
      },
    },
    {
      FRONTEND_ORIGIN: pagesOrigin,
    },
  );
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("access-control-allow-origin"), pagesOrigin);
  assert.equal(payload.error, "database unavailable");
});

test("cors does not expose config errors to the local vite origin when FRONTEND_ORIGIN is missing", async () => {
  const app = createApp({ repository: unusedRepository() as never });

  const response = await app.request("https://runtime.test/health", {
    headers: {
      origin: LOCAL_VITE_DEV_ORIGIN,
    },
  });
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.match(payload.error, /FRONTEND_ORIGIN must be configured/);
});
