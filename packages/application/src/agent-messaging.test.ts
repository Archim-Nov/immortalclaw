import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, type Message, type WorldState } from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import {
  listAuthenticatedAgentMessages,
  sendAuthenticatedAgentMessage,
} from "./agent-messaging.js";

function createAgentProfile(overrides: Partial<AgentProfileRecord> = {}): AgentProfileRecord {
  return {
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
    webhookUrl: null,
    webhookSecret: null,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T01:00:00.000Z",
    lastSeenAt: "2026-03-17T01:00:00.000Z",
    ...overrides,
  };
}

function createWorldWithTwoCultivators() {
  const world = createSeedWorld();
  const [selfCultivatorId] = Object.keys(world.cultivators);

  if (!selfCultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const otherCultivatorId = "cultivator-2";
  world.cultivators[otherCultivatorId] = {
    ...world.cultivators[selfCultivatorId],
    id: otherCultivatorId,
    name: "Li Aotian",
  };

  return {
    world,
    selfCultivatorId,
    otherCultivatorId,
  };
}

test("listAuthenticatedAgentMessages returns the authenticated cultivator mailbox in application", async () => {
  const { world, selfCultivatorId, otherCultivatorId } = createWorldWithTwoCultivators();
  const expectedMessage: Message = {
    id: "message-1",
    cultivatorId: selfCultivatorId,
    tick: 5,
    from: "Li Aotian",
    fromCultivatorId: otherCultivatorId,
    toCultivatorId: selfCultivatorId,
    subject: "Sect Gate",
    content: "Meet me before sunrise.",
  };
  world.messages.push(expectedMessage);
  world.messages.push({
    id: "message-2",
    cultivatorId: "someone-else",
    tick: 6,
    from: "Nobody",
    fromCultivatorId: null,
    toCultivatorId: null,
    subject: "Ignore",
    content: "This should not appear.",
  });

  const payload = await listAuthenticatedAgentMessages({
    repository: {
      async readWorld() {
        return world;
      },
    },
    agent: createAgentProfile({
      selectedCultivatorId: selfCultivatorId,
    }),
  });

  assert.ok(payload.some((message) => message.id === "message-1"));
  assert.ok(payload.every((message) => message.id !== "message-2"));
});

test("sendAuthenticatedAgentMessage resolves a target agent and uses the default subject in application", async () => {
  const { world, selfCultivatorId, otherCultivatorId } = createWorldWithTwoCultivators();
  const calls: {
    fromCultivatorId?: string;
    toCultivatorId?: string;
    from?: string;
    subject?: string;
    content?: string;
  } = {};

  const payload = await sendAuthenticatedAgentMessage({
    repository: {
      async listAgentProfiles() {
        return [
          createAgentProfile({
            agentId: "target-agent",
            name: "Li Aotian",
            selectedCultivatorId: otherCultivatorId,
          }),
        ];
      },
      async readWorld() {
        return world;
      },
      async transactWorld<TResult>(mutator: (draftWorld: WorldState) => TResult): Promise<TResult> {
        const result = mutator(world);
        const message = result as Message;
        calls.fromCultivatorId = message.fromCultivatorId ?? undefined;
        calls.toCultivatorId = message.toCultivatorId ?? undefined;
        calls.from = message.from;
        calls.subject = message.subject;
        calls.content = message.content;
        return result;
      },
    },
    agent: createAgentProfile({
      selectedCultivatorId: selfCultivatorId,
    }),
    request: {
      toAgentId: "target-agent",
      content: "Meet me at the sect gate before the next tick.",
    },
  });

  assert.equal(calls.fromCultivatorId, selfCultivatorId);
  assert.equal(calls.toCultivatorId, otherCultivatorId);
  assert.equal(calls.from, "Su Mingyue");
  assert.equal(calls.subject, "Private Telepathy");
  assert.equal(calls.content, "Meet me at the sect gate before the next tick.");
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.message.id, "string");
  assert.equal(payload.message.toCultivatorId, otherCultivatorId);
});

test("sendAuthenticatedAgentMessage rejects missing recipient identifiers", async () => {
  await assert.rejects(
    () =>
      sendAuthenticatedAgentMessage({
        repository: {
          async listAgentProfiles() {
            return [];
          },
          async readWorld() {
            return createSeedWorld();
          },
          async transactWorld<TResult>() {
            throw new Error("not used");
          },
        },
        agent: createAgentProfile(),
        request: {
          content: "This should fail.",
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error & { status?: number }).status, 400);
      assert.match(error.message, /toAgentId or toCultivatorId/i);
      return true;
    },
  );
});

test("sendAuthenticatedAgentMessage rejects stale target agents whose cultivator is missing from world state", async () => {
  const { world } = createWorldWithTwoCultivators();

  await assert.rejects(
    () =>
      sendAuthenticatedAgentMessage({
        repository: {
          async listAgentProfiles() {
            return [
              createAgentProfile({
                agentId: "stale-target",
                selectedCultivatorId: "missing-cultivator",
              }),
            ];
          },
          async readWorld() {
            return world;
          },
          async transactWorld<TResult>() {
            throw new Error("not used");
          },
        },
        agent: createAgentProfile(),
        request: {
          toAgentId: "stale-target",
          content: "test",
        },
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal((error as Error & { status?: number }).status, 409);
      assert.match(error.message, /stale or missing from the world/i);
      return true;
    },
  );
});
