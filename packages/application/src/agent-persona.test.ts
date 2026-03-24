import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld } from "../../domain/src/runtime.js";
import type { AgentProfileWriteInput } from "../../persistence/src/world-repository.js";
import { syncAgentPersonaWorkflow } from "./agent-persona.js";

test("syncAgentPersonaWorkflow updates an existing agent profile after syncing the world", async () => {
  const world = createSeedWorld();
  const savedProfiles: AgentProfileWriteInput[] = [];

  const result = await syncAgentPersonaWorkflow({
    world: {
      async transactWorld(mutator) {
        return mutator(world);
      },
    },
    auth: {
      async getAgentProfile() {
        return {
          agentId: "agent-1",
          name: "Old Name",
          selectedCultivatorId: "old-cultivator",
          origin: "Old Harbor",
          temperament: "Careful",
          webhookUrl: null,
          webhookSecret: null,
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:00.000Z",
          lastSeenAt: "2026-03-17T00:00:00.000Z",
        };
      },
      async saveAgentProfile(input) {
        savedProfiles.push(input);
        return {
          ...input,
          lastSeenAt: input.lastSeenAt ?? null,
          webhookUrl: input.webhookUrl ?? null,
          webhookSecret: null,
          createdAt: "2026-03-17T00:00:00.000Z",
          updatedAt: "2026-03-17T00:00:01.000Z",
        };
      },
    },
    agentId: "agent-1",
    input: {
      name: "Su Mingyue",
      origin: "Frost Harbor",
      temperament: "Calm and exacting",
    },
  });

  assert.equal(result.selectedCultivatorId, savedProfiles[0]?.selectedCultivatorId);
  assert.equal(savedProfiles[0]?.name, "Su Mingyue");
  assert.equal(savedProfiles[0]?.origin, "Frost Harbor");
  assert.equal(savedProfiles[0]?.temperament, "Calm and exacting");
});

test("syncAgentPersonaWorkflow keeps legacy no-profile behavior when the agent profile is missing", async () => {
  const world = createSeedWorld();
  let saved = false;

  const result = await syncAgentPersonaWorkflow({
    world: {
      async transactWorld(mutator) {
        return mutator(world);
      },
    },
    auth: {
      async getAgentProfile() {
        return null;
      },
      async saveAgentProfile() {
        saved = true;
        throw new Error("saveAgentProfile should not be called");
      },
    },
    agentId: "agent-legacy",
    input: {
      name: "Legacy Persona",
    },
  });

  assert.equal(typeof result.selectedCultivatorId, "string");
  assert.equal(saved, false);
});
