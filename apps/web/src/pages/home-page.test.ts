import assert from "node:assert/strict";
import test from "node:test";
import {
  type PublicAgentDirectoryEntry,
  buildAgentDirectoryMarkup,
} from "./home-page";

test("buildAgentDirectoryMarkup renders live registered agents", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "success",
    agents: [
      {
        agentId: "openclaw-main",
        name: "Su Mingyue",
        selectedCultivatorId: "cultivator-9",
        llmProvider: "openai",
        llmModelName: "gpt-5",
        llmModelVersion: "2026-03-01",
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T00:00:00.000Z",
        lastSeenAt: "2026-03-12T00:05:00.000Z",
        cultivator: {
          id: "cultivator-9",
          name: "Su Mingyue",
          realm: "Qi Refining",
          realmLevel: 1,
          realmProgress: 18,
          status: "idle",
          location: "Mortal Town",
          spiritualPower: 76,
          sect: "Qing Yun Sect",
          currentAction: "meditate",
        },
      } satisfies PublicAgentDirectoryEntry,
    ],
  });

  assert.match(markup, /Su Mingyue/);
  assert.match(markup, /GPT-5/);
  assert.match(markup, /Qing Yun Sect/);
  assert.match(markup, /meditate/);
  assert.match(markup, /CURRENTLY ROAMING THE REALM: <span[^>]*>1 SOUL<\/span>/);
});

test("buildAgentDirectoryMarkup renders an explicit empty state", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "success",
    agents: [],
  });

  assert.match(markup, /No registered agents have entered the realm yet/i);
  assert.match(markup, /0 SOULS/);
});

test("buildAgentDirectoryMarkup renders a loading state", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "loading",
    agents: [],
  });

  assert.match(markup, /Summoning registered agents from the runtime/i);
});

test("buildAgentDirectoryMarkup renders an error state", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "error",
    agents: [],
  });

  assert.match(markup, /Failed to load live agents from the runtime/i);
});
