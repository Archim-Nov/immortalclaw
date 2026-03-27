import assert from "node:assert/strict";
import test from "node:test";
import {
  type AgentMessage,
  type PublicAgentDirectoryEntry,
  buildMessagePanelMarkup,
  buildAgentDirectoryMarkup,
  requestAgentMessages,
  sendAgentMessage,
  requestPublicAgentDirectory,
  syncAgentMarkup,
  syncMessageMarkup,
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

test("syncMessageMarkup preserves runtime-backed message markup across rerenders", () => {
  const messagesSection = {
    innerHTML: "<div>placeholder</div>",
  };

  const root = {
    querySelector(selector: string) {
      if (selector === "#messages") {
        return messagesSection;
      }
      return null;
    },
  } as unknown as HTMLElement;

  const liveMarkup = "<div class=\"messages-container\">Live messages</div>";
  syncMessageMarkup(root, liveMarkup);

  assert.equal(messagesSection.innerHTML, liveMarkup);
});

test("buildAgentDirectoryMarkup renders live registered agents", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "success",
    agents: [
      {
        agentId: "openclaw-main",
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
          realmPhase: "鍓嶆湡",
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
  assert.match(markup, /MEDITATE/);
  assert.match(markup, /Qing Yun Sect/);
  assert.match(markup, /meditate/);
  assert.match(markup, /Qi Refining[^<]*鍓嶆湡/);
  assert.doesNotMatch(markup, /Lv\.4/);
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

test("buildAgentDirectoryMarkup wraps each agent card with a stat page link", () => {
  const markup = buildAgentDirectoryMarkup({
    status: "success",
    agents: [
      {
        agentId: "agent-abc-123",
        name: "Luo Binghe",
        selectedCultivatorId: "c-1",
        createdAt: "2026-03-13T00:00:00.000Z",
        updatedAt: "2026-03-13T00:00:00.000Z",
        lastSeenAt: null,
        cultivator: {
          id: "c-1",
          name: "Luo Binghe",
          realm: "Foundation Building",
          realmLevel: 5,
          realmPhase: "涓湡",
          realmProgress: 45,
          status: "idle",
          location: "Misty Peak",
          spiritualPower: 320,
          sect: null,
          currentAction: null,
        },
      } satisfies PublicAgentDirectoryEntry,
    ],
  });

  assert.match(markup, /href="\/stat\/agent-abc-123"/);
  assert.match(markup, /<a\s[^>]*href="\/stat\/agent-abc-123"/);
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

test("requestAgentMessages uses the authenticated agent messages path", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    let authHeader: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      authHeader =
        init?.headers && !Array.isArray(init.headers)
          ? String((init.headers as Record<string, string>).authorization)
          : null;
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestAgentMessages("immortal_sk_test");

    assert.equal(requestedUrl, "/agent/messages");
    assert.equal(authHeader, "Bearer immortal_sk_test");
    assert.deepEqual(payload, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAgentMessage posts the target agent and content", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    let method: string | null = null;
    let body: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      method = init?.method ?? null;
      body = typeof init?.body === "string" ? init.body : null;
      return new Response(
        JSON.stringify({
          message: {
            id: "msg-9",
            cultivatorId: "cultivator-recipient",
            tick: 9,
            from: "Su Mingyue",
            fromCultivatorId: "cultivator-self",
            toCultivatorId: "cultivator-recipient",
            subject: "Private Telepathy",
            content: "Meet me at the market.",
          } satisfies AgentMessage,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    }) as typeof fetch;

    const payload = await sendAgentMessage("immortal_sk_test", {
      toAgentId: "agent-recipient",
      content: "Meet me at the market.",
    });

    assert.equal(requestedUrl, "/agent/messages");
    assert.equal(method, "POST");
    assert.match(String(body), /agent-recipient/);
    assert.equal(payload.id, "msg-9");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("sendAgentMessage surfaces server-side recipient errors", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "Agent not found: missing-agent" }), {
        status: 404,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    await assert.rejects(
      () =>
        sendAgentMessage("immortal_sk_test", {
          toAgentId: "missing-agent",
          content: "test",
        }),
      /Agent not found: missing-agent/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("buildMessagePanelMarkup renders an auth prompt when no credential is bound", () => {
  const markup = buildMessagePanelMarkup({
    status: "needs-auth",
    credential: null,
    selfAgent: null,
    selfCultivatorId: null,
    publicAgents: [],
    messages: [],
    contacts: [],
    selectedContactKey: null,
    searchTerm: "",
    manualTargetAgentId: "",
    errorMessage: null,
    sending: false,
  });

  assert.match(markup, /Bind this page to a live agent credential/i);
  assert.match(markup, /Connect Agent/i);
});

test("buildMessagePanelMarkup renders direct message contacts and history", () => {
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
    publicAgents: [
      {
        agentId: "agent-recipient",
        name: "Li Aotian",
        selectedCultivatorId: "cultivator-recipient",
        createdAt: "2026-03-13T00:00:00.000Z",
        updatedAt: "2026-03-13T00:00:00.000Z",
        lastSeenAt: "2026-03-13T00:00:00.000Z",
        cultivator: {
          id: "cultivator-recipient",
          name: "Li Aotian",
          realm: "Qi Refining",
          realmLevel: 2,
          realmPhase: "涓湡",
          realmProgress: 25,
          status: "idle",
          location: "Sect Gate",
          spiritualPower: 88,
          sect: "Qing Yun Sect",
          currentAction: null,
        },
      } satisfies PublicAgentDirectoryEntry,
    ],
    messages: [
      {
        id: "msg-9",
        cultivatorId: "cultivator-recipient",
        tick: 9,
        from: "Su Mingyue",
        fromCultivatorId: "cultivator-self",
        toCultivatorId: "cultivator-recipient",
        subject: "Private Telepathy",
        content: "Meet me at the market.",
      },
    ],
    contacts: [
      {
        key: "agent:agent-recipient",
        type: "agent",
        label: "Li Aotian",
        subtitle: "[ID: agent-recipient] 鈥?Qi Refining Lv.2",
        avatar: "鉀╋笍",
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

  assert.match(markup, /Li Aotian/);
  assert.match(markup, /Meet me at the market/);
  assert.match(markup, /Target Agent ID/);
  assert.match(markup, /agent-recipient/);
  assert.match(markup, /SEND/);
});



