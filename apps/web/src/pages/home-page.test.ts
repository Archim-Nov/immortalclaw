import assert from "node:assert/strict";
import test from "node:test";
import type { AgentMessagesResponse, PublicAgentDirectoryEntry } from "../../../../packages/contracts/src/runtime-api.js";
import {
  isHintActionId,
  requestAgentBinding,
  requestAgentCredentialReset,
  requestAgentMessages,
  requestPublicAgentDirectory,
  requestRegistrationQuestionnaire,
  requestSendAgentMessage,
  requestWorldStatus,
} from "../lib/runtime-api";
import { resolveRuntimeSessionCredential } from "../lib/runtime-session";
import {
  canRevealLatestCredential,
  deriveContacts,
  parseRegistrationRecordEditorInput,
} from "./runtime-control-page";

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

test("requestWorldStatus uses the same-origin world status path", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(JSON.stringify({ ok: true, tick: 42, lastTickAt: "2026-04-23T00:00:00.000Z" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestWorldStatus();

    assert.equal(requestedUrl, "/world/status");
    assert.deepEqual(payload, { ok: true, tick: 42, lastTickAt: "2026-04-23T00:00:00.000Z" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestRegistrationQuestionnaire uses the runtime questionnaire route", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(JSON.stringify({ version: "v1", locale: "en", questions: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestRegistrationQuestionnaire();

    assert.equal(requestedUrl, "/agent/register/questions");
    assert.deepEqual(payload, { version: "v1", locale: "en", questions: [] });
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

test("requestSendAgentMessage posts JSON with auth to the same-origin messages route", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    let method: string | null = null;
    let authHeader: string | null = null;
    let contentType: string | null = null;
    let body: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      method = init?.method ?? null;
      if (init?.headers && !Array.isArray(init.headers)) {
        const headers = init.headers as Record<string, string>;
        authHeader = headers.authorization ?? null;
        contentType = headers["content-type"] ?? null;
      }
      body = typeof init?.body === "string" ? init.body : null;

      return new Response(JSON.stringify({
        message: {
          id: "msg-1",
          cultivatorId: "cultivator-self",
          tick: 9,
          from: "Su Mingyue",
          subject: "Signal",
          content: "Meet me at the market.",
        },
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestSendAgentMessage("immortal_sk_test", {
      toAgentId: "agent-recipient",
      subject: "Signal",
      content: "Meet me at the market.",
    });

    assert.equal(requestedUrl, "/agent/messages");
    assert.equal(method, "POST");
    assert.equal(authHeader, "Bearer immortal_sk_test");
    assert.equal(contentType, "application/json");
    assert.deepEqual(JSON.parse(body ?? "{}"), {
      toAgentId: "agent-recipient",
      subject: "Signal",
      content: "Meet me at the market.",
    });
    assert.equal(payload.message.id, "msg-1");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestAgentBinding encodes the agent id in the query string", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return new Response(JSON.stringify({ agentId: "agent/with space", cultivatorIds: [], selectedCultivatorId: null }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestAgentBinding("agent/with space");

    assert.equal(requestedUrl, "/agent/binding?agentId=agent%2Fwith+space");
    assert.equal(payload.agentId, "agent/with space");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("requestAgentCredentialReset posts with bearer auth to the reset route", async () => {
  const originalFetch = globalThis.fetch;

  try {
    let requestedUrl: string | null = null;
    let method: string | null = null;
    let authHeader: string | null = null;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requestedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      method = init?.method ?? null;
      authHeader =
        init?.headers && !Array.isArray(init.headers)
          ? String((init.headers as Record<string, string>).authorization)
          : null;
      return new Response(JSON.stringify({
        ok: true,
        agentId: "agent-1",
        credential: "immortal_sk_rotated",
        message: "Credential rotated.",
      }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    }) as typeof fetch;

    const payload = await requestAgentCredentialReset("immortal_sk_test");

    assert.equal(requestedUrl, "/agent/credential/reset");
    assert.equal(method, "POST");
    assert.equal(authHeader, "Bearer immortal_sk_test");
    assert.equal(payload.credential, "immortal_sk_rotated");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("runtime api helpers normalize JSON error payloads", async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Realm gate unstable." }), {
        status: 503,
        headers: {
          "content-type": "application/json",
        },
      })) as typeof fetch;

    await assert.rejects(
      () => requestWorldStatus(),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "Realm gate unstable.");
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("isHintActionId recognizes inbox-style runtime hints", () => {
  assert.equal(isHintActionId("resolve-morality-event-choice"), true);
  assert.equal(isHintActionId("read-messages"), true);
  assert.equal(isHintActionId("meditate"), false);
});

test("resolveRuntimeSessionCredential prefers an override credential over stale stored state", () => {
  assert.equal(
    resolveRuntimeSessionCredential("  immortal_sk_new  ", "immortal_sk_old"),
    "immortal_sk_new",
  );
  assert.equal(
    resolveRuntimeSessionCredential(undefined, "  immortal_sk_saved  "),
    "immortal_sk_saved",
  );
  assert.equal(resolveRuntimeSessionCredential("   ", null), null);
});

test("canRevealLatestCredential only exposes the latest credential while it is still the active bound session", () => {
  assert.equal(
    canRevealLatestCredential({
      isBound: true,
      boundCredential: "immortal_sk_live",
      latestCredential: "immortal_sk_live",
    }),
    true,
  );
  assert.equal(
    canRevealLatestCredential({
      isBound: false,
      boundCredential: null,
      latestCredential: "immortal_sk_live",
    }),
    false,
  );
  assert.equal(
    canRevealLatestCredential({
      isBound: true,
      boundCredential: "immortal_sk_rotated",
      latestCredential: "immortal_sk_old",
    }),
    false,
  );
});

test("parseRegistrationRecordEditorInput rejects invalid JSON and array payloads", () => {
  assert.deepEqual(parseRegistrationRecordEditorInput("{"), {
    ok: false,
    message: "Registration record JSON is invalid.",
  });
  assert.deepEqual(parseRegistrationRecordEditorInput("[]"), {
    ok: false,
    message: "Registration record JSON must be an object.",
  });
  assert.deepEqual(parseRegistrationRecordEditorInput('{"origin":"Qingzhou"}'), {
    ok: true,
    record: {
      origin: "Qingzhou",
    },
  });
});

test("deriveContacts sorts conversations by numeric latest tick instead of timestamp label text", () => {
  const publicAgents: PublicAgentDirectoryEntry[] = [
    {
      agentId: "agent-older",
      name: "Su Mingyue",
      selectedCultivatorId: "cultivator-older",
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      lastSeenAt: "2026-04-23T00:00:00.000Z",
      cultivator: {
        id: "cultivator-older",
        name: "Su Mingyue",
        realm: "Qi Refining",
        realmLevel: 4,
        realmPhase: "前期",
        realmProgress: 20,
        status: "idle",
        location: "Qingzhou Main City",
        spiritualPower: 76,
        sect: null,
        currentAction: null,
      },
    },
    {
      agentId: "agent-newer",
      name: "Li Aotian",
      selectedCultivatorId: "cultivator-newer",
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      lastSeenAt: "2026-04-23T00:00:00.000Z",
      cultivator: {
        id: "cultivator-newer",
        name: "Li Aotian",
        realm: "Foundation Building",
        realmLevel: 2,
        realmPhase: "中期",
        realmProgress: 64,
        status: "idle",
        location: "Yangzhou Main City",
        spiritualPower: 120,
        sect: "Azure Cloud Sect",
        currentAction: null,
      },
    },
  ];
  const messages: AgentMessagesResponse = [
    {
      id: "message-newer",
      cultivatorId: "cultivator-self",
      tick: 12,
      from: "Li Aotian",
      fromCultivatorId: "cultivator-newer",
      toCultivatorId: "cultivator-self",
      subject: "Later thread",
      content: "Newest thread should sort first.",
    },
    {
      id: "message-older",
      cultivatorId: "cultivator-self",
      tick: 9,
      from: "Su Mingyue",
      fromCultivatorId: "cultivator-older",
      toCultivatorId: "cultivator-self",
      subject: "Older thread",
      content: "Older thread should sort second.",
    },
  ];

  const contacts = deriveContacts("cultivator-self", publicAgents, messages, "");

  assert.deepEqual(
    contacts.map((contact) => contact.key),
    ["agent:agent-newer", "agent:agent-older"],
  );
});