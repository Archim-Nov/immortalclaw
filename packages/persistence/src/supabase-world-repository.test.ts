import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/index.js";
import { createInMemoryWorldRepository } from "./in-memory-world-repository.js";

function createRepository() {
  return createInMemoryWorldRepository({
    world: createSeedWorld(),
    now: (() => {
      let tick = 0;
      return () => `2026-03-10T00:00:0${tick++}Z`;
    })(),
  });
}

function firstCultivatorId(repository: ReturnType<typeof createRepository>) {
  return repository.readWorld().then((world) => {
    const cultivatorId = Object.keys(world.cultivators)[0];
    if (!cultivatorId) {
      throw new Error("Expected a seeded cultivator.");
    }
    return cultivatorId;
  });
}

test("world reads return deterministic state", async () => {
  const repository = createRepository();

  const first = await repository.readWorld();
  const second = await repository.readWorld();

  assert.deepEqual(second, first);
  assert.notEqual(second, first);
});

test("performAction persists results for subsequent reads", async () => {
  const repository = createRepository();
  const cultivatorId = await firstCultivatorId(repository);

  const result = await repository.performAction(cultivatorId, "cultivate");
  const state = await repository.getCultivatorState(cultivatorId);

  assert.equal(result.accepted, true);
  assert.equal(state.currentJob?.actionId, "cultivate");
  assert.equal(state.cultivator.status, "busy");
});

test("advanceWorld records tick metadata that can be queried", async () => {
  const repository = createRepository();

  const summary = await repository.advanceWorld(2);
  const latestTickRun = await repository.getLatestTickRun();

  assert.ok(latestTickRun);
  assert.equal(latestTickRun.tick, summary.tick);
  assert.equal(latestTickRun.advancedTicks, summary.advancedTicks);
  assert.equal(latestTickRun.recordedAt, "2026-03-10T00:00:00Z");
});

test("acquireTickLock rejects overlapping execution", async () => {
  const repository = createRepository();

  const firstLock = await repository.acquireTickLock("scheduler");
  const secondLock = await repository.acquireTickLock("manual");

  assert.ok(firstLock);
  assert.equal(secondLock, null);

  await repository.releaseTickLock(firstLock.lockId);

  const thirdLock = await repository.acquireTickLock("manual");
  assert.ok(thirdLock);
  assert.equal(thirdLock.ownerId, "manual");
});
