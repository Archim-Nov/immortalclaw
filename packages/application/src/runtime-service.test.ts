import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "../../domain/src/index.js";
import { createRuntimeService } from "./runtime-service.js";

function createWorldContext() {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  return { world, cultivatorId };
}

test("getCultivatorState delegates through the repository", async () => {
  const { world, cultivatorId } = createWorldContext();
  const expected = getCultivatorState(world, cultivatorId);
  let calledWith = "";

  const service = createRuntimeService({
    repository: {
      async getCultivatorState(inputCultivatorId) {
        calledWith = inputCultivatorId;
        return expected;
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
    },
  });

  const result = await service.getCultivatorState(cultivatorId);

  assert.equal(calledWith, cultivatorId);
  assert.deepEqual(result, expected);
});

test("listActions delegates through the repository", async () => {
  const { world, cultivatorId } = createWorldContext();
  const expected = listAvailableActions(world, cultivatorId);
  let calledWith = "";

  const service = createRuntimeService({
    repository: {
      async getCultivatorState() {
        throw new Error("not used");
      },
      async listAvailableActions(inputCultivatorId) {
        calledWith = inputCultivatorId;
        return expected;
      },
      async performAction() {
        throw new Error("not used");
      },
      async advanceWorld() {
        throw new Error("not used");
      },
    },
  });

  const result = await service.listActions(cultivatorId);

  assert.equal(calledWith, cultivatorId);
  assert.deepEqual(result, expected);
});

test("performAction delegates through the repository", async () => {
  const { world, cultivatorId } = createWorldContext();
  const expected = performAction(world, cultivatorId, "cultivate");
  let calledWithCultivatorId = "";
  let calledWithActionId = "";

  const service = createRuntimeService({
    repository: {
      async getCultivatorState() {
        throw new Error("not used");
      },
      async listAvailableActions() {
        throw new Error("not used");
      },
      async performAction(inputCultivatorId, inputActionId) {
        calledWithCultivatorId = inputCultivatorId;
        calledWithActionId = inputActionId;
        return expected;
      },
      async advanceWorld() {
        throw new Error("not used");
      },
    },
  });

  const result = await service.performAction(cultivatorId, "cultivate");

  assert.equal(calledWithCultivatorId, cultivatorId);
  assert.equal(calledWithActionId, "cultivate");
  assert.deepEqual(result, expected);
});

test("advanceWorld delegates through the repository", async () => {
  const { world } = createWorldContext();
  const expected = advanceWorld(world, 1);
  let calledWithSteps = 0;

  const service = createRuntimeService({
    repository: {
      async getCultivatorState() {
        throw new Error("not used");
      },
      async listAvailableActions() {
        throw new Error("not used");
      },
      async performAction() {
        throw new Error("not used");
      },
      async advanceWorld(inputSteps) {
        calledWithSteps = inputSteps;
        return expected;
      },
    },
  });

  const result = await service.advanceWorld(1);

  assert.equal(calledWithSteps, 1);
  assert.deepEqual(result, expected);
});
