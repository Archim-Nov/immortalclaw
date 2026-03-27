import assert from "node:assert/strict";
import test from "node:test";
import {
  type PublicAgentDirectoryEntry,
  buildAgentDirectoryMarkup,
  buildMessagePanelMarkup,
} from "./home-page";

test("buildAgentDirectoryMarkup shows the current realm phase label instead of the raw total level", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "success",
    agents: [
      {
        agentId: "agent-phase-test",
        name: "Su Mingyue",
        selectedCultivatorId: "cultivator-9",
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T00:00:00.000Z",
        lastSeenAt: "2026-03-12T00:05:00.000Z",
        cultivator: {
          id: "cultivator-9",
          name: "Su Mingyue",
          realm: "Qi Refining",
          realmLevel: 4,
          realmPhase: "\u524d\u671f",
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

  assert.match(markup, /Qi Refining[^<]*\u524d\u671f/);
  assert.doesNotMatch(markup, /Lv\.4/);
});

test("buildMessagePanelMarkup can show the current realm phase label in the contact header", () => {
  const markup = buildMessagePanelMarkup({
    status: "ready",
    credential: "immortal_sk_test",
    selfAgent: {
      agentId: "agent-self",
      name: "Su Mingyue",
      selectedCultivatorId: "cultivator-self",
      llmProvider: "openai",
      llmModelName: "gpt-5",
      llmModelVersion: null,
      createdAt: "2026-03-13T00:00:00.000Z",
      updatedAt: "2026-03-13T00:00:00.000Z",
      lastSeenAt: "2026-03-13T00:00:00.000Z",
    },
    selfCultivatorId: "cultivator-self",
    publicAgents: [],
    messages: [],
    contacts: [
      {
        key: "agent:agent-recipient",
        type: "agent",
        label: "Li Aotian",
        subtitle: "[ID: agent-recipient] • Qi Refining \u4e2d\u671f",
        avatar: "*",
        statusClass: "status-online",
        preview: "Meet me at the market.",
        timestampLabel: "TICK 9",
        targetAgentId: "agent-recipient",
        targetCultivatorId: "cultivator-recipient",
        canSend: true,
      },
    ],
    selectedContactKey: "agent:agent-recipient",
    searchTerm: "",
    manualTargetAgentId: "agent-recipient",
    errorMessage: null,
    sending: false,
  });

  assert.match(markup, /Qi Refining \u4e2d\u671f/);
});
