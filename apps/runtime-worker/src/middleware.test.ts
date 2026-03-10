import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.js";

function unusedRepository() {
  return {
    async readWorld() {
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
