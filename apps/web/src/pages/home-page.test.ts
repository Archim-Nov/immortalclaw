import assert from "node:assert/strict";
import test from "node:test";
import {
  type PublicAgentDirectoryEntry,
  buildAgentDirectoryMarkup,
  requestPublicAgentDirectory,
  syncAgentMarkup,
} from "./home-page";

test("syncAgentMarkup preserves agent data across simulated tab render resets (regression)", () => {
  const agentsSection = {
    // Simulate React reverting the DOM to the initial premiumLandingMarkup string after a tab switch re-render
    innerHTML: '<div class="agent-directory-status-panel">Summoning registered agents from the runtime...</div>',
  };

  const root = {
    querySelector(selector: string) {
      if (selector === "#agents") {
        return agentsSection;
      }
      return null;
    },
  } as unknown as HTMLElement;

  const liveDataMarkup = '<div class="premium-grid">Live Agent Data</div>';

  // The hook calls this on every render, including tab switches
  syncAgentMarkup(root, liveDataMarkup);

  // The live data should overwrite the reverted loading panel
  assert.equal(agentsSection.innerHTML, liveDataMarkup);
});

test("syncAgentMarkup does not mutate if the markup already matches", () => {
  let setterCount = 0;
  const agentsSection = {
    _innerHTML: "matching-markup",
    get innerHTML() {
      return this._innerHTML;
    },
    set innerHTML(value: string) {
      setterCount++;
      this._innerHTML = value;
    },
  };

  const root = {
    querySelector(selector: string) {
      if (selector === "#agents") {
        return agentsSection;
      }
      return null;
    },
  } as unknown as HTMLElement;

  syncAgentMarkup(root, "matching-markup");

  assert.equal(agentsSection.innerHTML, "matching-markup");
  assert.equal(setterCount, 0); // Should not have triggered the setter
});

test("syncAgentMarkup safely ignores null root or missing agents section", () => {
  assert.doesNotThrow(() => {
    syncAgentMarkup(null, "markup");
  });

  const rootWithoutAgents = {
    querySelector() {
      return null;
    },
  } as unknown as HTMLElement;

  assert.doesNotThrow(() => {
    syncAgentMarkup(rootWithoutAgents, "markup");
  });
});

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

test("requestPublicAgentDirectory uses the same-origin world agents path", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(JSON.stringify({ agents: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestPublicAgentDirectory();

    assert.equal(requestedUrl, "/world/agents");
    assert.deepEqual(payload, { agents: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
