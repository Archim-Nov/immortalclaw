import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createImmortalRealmPlugin } from "./index.js";

type RegisteredTool = {
  name: string;
  execute: (toolCallId: string, params: Record<string, unknown>) => Promise<unknown>;
};

type CapturedRequest = {
  url: string;
  method: string;
  body?: string;
  authorization?: string | null;
};

type CapturedWebhook = {
  path: string;
  handler: (req: { body: string; headers: Record<string, string> }) => Promise<{ status: number; body?: string }>;
};

function createRegistrationRecord() {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
    },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      spirit_root_result: "Water single root",
    },
    summary: "Prefers observation before commitment.",
  };
}

function writePersonaFiles(
  personaDir: string,
  identityContent = "# Su Mingyue\n\n- gender: female\n- pronouns: she/her\n- origin: Frost Harbor\n- path: sword\n",
  soulContent = "## Temperament\nCalm and exacting.\n",
) {
  mkdirSync(personaDir, { recursive: true });
  writeFileSync(path.join(personaDir, "IDENTITY.md"), identityContent, "utf8");
  writeFileSync(path.join(personaDir, "SOUL.md"), soulContent, "utf8");
}

function writeRegistrationRecordFile(personaDir: string, record = createRegistrationRecord()) {
  mkdirSync(personaDir, { recursive: true });
  writeFileSync(
    path.join(personaDir, "registration-record.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
}

function registerPlugin(
  pluginConfig: Record<string, unknown>,
  fetchImpl: typeof fetch,
): {
  tools: Map<string, RegisteredTool>;
  hooks: Array<{ event: string; handler: (...args: unknown[]) => unknown }>;
  webhooks: CapturedWebhook[];
  heartbeatCalls: Array<{ reason: string; agentId?: string }>;
} {
  const plugin = createImmortalRealmPlugin({ fetchImpl });
  const tools = new Map<string, RegisteredTool>();
  const hooks: Array<{ event: string; handler: (...args: unknown[]) => unknown }> = [];
  const webhooks: CapturedWebhook[] = [];
  const heartbeatCalls: Array<{ reason: string; agentId?: string }> = [];

  plugin.register({
    pluginConfig,
    registerTool(tool) {
      tools.set(tool.name, tool);
    },
    registerWebhookTargetWithPluginRoute(path, handler) {
      webhooks.push({ path, handler });
    },
    requestHeartbeatNow(payload) {
      heartbeatCalls.push(payload);
    },
    on(event, handler) {
      hooks.push({ event, handler });
    },
    logger: {},
  });

  return { tools, hooks, webhooks, heartbeatCalls };
}

async function signWebhookBody(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `sha256=${[...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

test("plugin registers expected tools and prompt hook", async () => {
  const { tools, hooks } = registerPlugin(
    {
      agentId: "openclaw-main",
      credentialsPath: path.join(tmpdir(), "immortal-plugin-test-credentials.json"),
    },
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );

  assert.deepEqual(
    [...tools.keys()],
    [
      "immortal_state",
      "immortal_registration",
      "immortal_registration_save",
      "immortal_strategy",
      "immortal_actions",
      "immortal_messages",
      "immortal_send_message",
      "immortal_tribulation",
      "immortal_sect",
      "immortal_dao_logs",
      "immortal_act",
      "immortal_tick",
    ],
  );
  assert.equal(hooks.length, 1);
  assert.equal(hooks[0]?.event, "before_prompt_build");
  const result = await hooks[0]?.handler({}, {});
  assert.match(
    String((result as { prependSystemContext?: string }).prependSystemContext),
    /Credential cache:/,
  );
});

test("webhook receipt triggers heartbeat wake with the signed payload reason", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-webhook-"));
  const credentialsPath = path.join(root, "credentials.json");
  const webhookSecret = "whsec_test_webhook_secret";
  const agentId = "550e8400-e29b-41d4-a716-446655440111";
  const body = JSON.stringify({
    event: "message",
    tick: 42,
    reason: "You received a message from Xu Ling.",
  });

  try {
    writeFileSync(
      credentialsPath,
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              worldBaseUrl: "https://runtime.example",
              agentId,
              requestedAgentId: "openclaw-main",
              credential: "immortal_sk_webhook",
              selectedCultivatorId: "cultivator-9",
              webhookSecret,
              updatedAt: "2026-03-22T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const { webhooks, heartbeatCalls } = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        credentialsPath,
        personaDir: path.join(root, "workspace"),
      },
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    assert.equal(webhooks.length, 1);
    assert.equal(webhooks[0]?.path, "/hooks/immortal-realm");

    const signature = await signWebhookBody(body, webhookSecret);
    const response = await webhooks[0]!.handler({
      body,
      headers: {
        "x-immortal-signature": signature,
      },
    });

    assert.equal(response.status, 200);
    assert.equal(heartbeatCalls.length, 1);
    assert.deepEqual(heartbeatCalls[0], {
      reason: "You received a message from Xu Ling.",
      agentId,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy defaultCultivatorId still works for state act and tick tools", async () => {
  const requests: CapturedRequest[] = [];
  const { tools } = registerPlugin(
    {
      worldBaseUrl: "http://127.0.0.1:8787/",
      defaultCultivatorId: "yun-zhong-he",
    },
    async (input, init) => {
      const url = String(input);
      requests.push({
        url,
        method: String(init?.method ?? "GET"),
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (url.includes("/cultivator/actions")) {
        return new Response(JSON.stringify({ actions: [{ actionId: "cultivate" }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true, url }), { status: 200 });
    },
  );

  await tools.get("immortal_state")?.execute("tool-1", {});
  await tools.get("immortal_actions")?.execute("tool-2", {});
  await tools.get("immortal_act")?.execute("tool-3", { actionId: "cultivate" });
  await tools.get("immortal_tick")?.execute("tool-4", { steps: 3 });

  assert.equal(
    requests[0]?.url,
    "http://127.0.0.1:8787/cultivator/state?cultivatorId=yun-zhong-he",
  );
  assert.equal(
    requests[1]?.url,
    "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he",
  );
  assert.equal(
    requests[2]?.url,
    "http://127.0.0.1:8787/cultivator/actions?cultivatorId=yun-zhong-he",
  );
  assert.equal(requests[3]?.method, "POST");
  assert.match(String(requests[3]?.body), /"cultivatorId":"yun-zhong-he"/);
  assert.equal(requests[4]?.url, "http://127.0.0.1:8787/world/tick");
});

test("registration tools persist and fetch canonical records over legacy routes", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-registration-"));
  const personaDir = path.join(root, "workspace");
  const requests: CapturedRequest[] = [];
  try {
    writePersonaFiles(personaDir);
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "http://127.0.0.1:8787",
        defaultCultivatorId: "yun-zhong-he",
        personaDir,
      },
      async (input, init) => {
        const url = String(input);
        const method = String(init?.method ?? "GET");
        const body = typeof init?.body === "string" ? init.body : undefined;
        requests.push({ url, method, body });

        if (url.includes("/cultivator/registration?")) {
          return new Response(
            JSON.stringify({
              ...createRegistrationRecord(),
              saved_at: "2026-03-09T00:00:00.000Z",
              cultivator_id: "yun-zhong-he",
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/cultivator/registration")) {
          return new Response(
            JSON.stringify({
              ...createRegistrationRecord(),
              saved_at: "2026-03-09T00:00:00.000Z",
              cultivator_id: "yun-zhong-he",
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await tools.get("immortal_registration_save")?.execute("tool-save", {
      record: createRegistrationRecord(),
    });
    const registrationResult = (await tools.get("immortal_registration")?.execute("tool-get", {})) as {
      details?: { result?: { core_temperament?: string } };
    };

    assert.equal(requests[0]?.url, "http://127.0.0.1:8787/cultivator/registration");
    assert.equal(requests[0]?.method, "POST");
    assert.match(String(requests[0]?.body), /"cultivatorId":"yun-zhong-he"/);
    assert.match(String(requests[0]?.body), /"record_type":"registration_record"/);
    assert.equal(
      requests[1]?.url,
      "http://127.0.0.1:8787/cultivator/registration?cultivatorId=yun-zhong-he",
    );
    assert.equal(registrationResult.details?.result?.core_temperament, "Calm strategist");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("registration save writes the canonical record into the local workspace file", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-record-write-"));
  const personaDir = path.join(root, "workspace");
  const registrationRecordPath = path.join(personaDir, "registration-record.json");
  try {
    writePersonaFiles(personaDir);
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "http://127.0.0.1:8787",
        defaultCultivatorId: "yun-zhong-he",
        personaDir,
      },
      async () =>
        new Response(
          JSON.stringify({
            ...createRegistrationRecord(),
            saved_at: "2026-03-09T00:00:00.000Z",
            cultivator_id: "yun-zhong-he",
          }),
          { status: 200 },
        ),
    );

    await tools.get("immortal_registration_save")?.execute("tool-save", {
      record: createRegistrationRecord(),
    });

    assert.equal(existsSync(registrationRecordPath), true);
    assert.match(readFileSync(registrationRecordPath, "utf8"), /"record_type": "registration_record"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("act tool rejects when state or actions were not checked first", async () => {
  const { tools } = registerPlugin(
    {
      worldBaseUrl: "http://127.0.0.1:8787",
      defaultCultivatorId: "yun-zhong-he",
    },
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );

  await assert.rejects(
    () => tools.get("immortal_act")!.execute("tool-1", { actionId: "cultivate" }),
    /immortal_state|immortal_strategy|immortal_actions/,
  );
});

test("plugin auto-registers, caches credentials, and uses authenticated agent routes", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-agent-"));
  const personaDir = path.join(root, "workspace");
  const credentialsPath = path.join(root, "credentials.json");
  const serverAgentId = "550e8400-e29b-41d4-a716-446655440000";
  try {
    writePersonaFiles(personaDir);

     const firstRequests: CapturedRequest[] = [];
     const { tools } = registerPlugin(
       {
         worldBaseUrl: "https://runtime.example",
         agentId: "openclaw-main",
         personaDir,
         credentialsPath,
       },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        const body = typeof init?.body === "string" ? init.body : undefined;
        firstRequests.push({
          url,
          method: String(init?.method ?? "GET"),
          body,
          authorization,
        });

        if (url.endsWith("/agent/register")) {
          return new Response(
            JSON.stringify({
              ok: true,
              agentId: serverAgentId,
              credential: "immortal_sk_cached",
              selectedCultivatorId: "cultivator-9",
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: serverAgentId,
              selectedCultivatorId: "cultivator-9",
              created: false,
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    const stateResult = (await tools.get("immortal_state")?.execute("tool-1", {})) as {
      details?: { cultivator?: { id?: string } };
    };

     assert.equal(firstRequests[0]?.url, "https://runtime.example/agent/register");
     assert.doesNotMatch(String(firstRequests[0]?.body), /"agentId":/);
     assert.match(String(firstRequests[0]?.body), /"name":"Su Mingyue"/);
     assert.doesNotMatch(String(firstRequests[0]?.body), /"record_type":"registration_record"/);
    assert.equal(firstRequests[1]?.url, "https://runtime.example/agent/sync-persona");
    assert.equal(firstRequests[1]?.authorization, "Bearer immortal_sk_cached");
    assert.doesNotMatch(String(firstRequests[1]?.body), /"agentId":/);
    assert.equal(firstRequests[2]?.url, "https://runtime.example/agent/state");
    assert.equal(firstRequests[2]?.authorization, "Bearer immortal_sk_cached");
    assert.equal(stateResult.details?.cultivator?.id, "cultivator-9");
    assert.equal(existsSync(credentialsPath), true);
    const storedCredentials = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
      entries?: Array<Record<string, unknown>>;
    };
    assert.equal(storedCredentials.entries?.length, 1);
    assert.deepEqual(storedCredentials.entries?.[0], {
      worldBaseUrl: "https://runtime.example",
      agentId: serverAgentId,
      requestedAgentId: "openclaw-main",
      credential: "immortal_sk_cached",
      selectedCultivatorId: "cultivator-9",
      updatedAt: storedCredentials.entries?.[0]?.updatedAt,
    });

    const secondRequests: CapturedRequest[] = [];
    const second = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath,
      },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        secondRequests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
          authorization,
        });

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: serverAgentId,
              selectedCultivatorId: "cultivator-9",
              created: false,
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/state")) {
          return new Response(
            JSON.stringify({
              tick: 1,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await second.tools.get("immortal_state")?.execute("tool-2", {});

    assert.equal(secondRequests.some((entry) => entry.url.endsWith("/agent/register")), false);
    assert.equal(secondRequests[0]?.url, "https://runtime.example/agent/sync-persona");
    assert.equal(secondRequests[0]?.authorization, "Bearer immortal_sk_cached");
    assert.doesNotMatch(String(secondRequests[0]?.body), /"agentId":/);
    assert.equal(secondRequests[1]?.url, "https://runtime.example/agent/state");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin auto-registers with a local canonical registration record when available", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-agent-record-"));
  const personaDir = path.join(root, "workspace");
  const credentialsPath = path.join(root, "credentials.json");
  try {
    writePersonaFiles(personaDir);
    writeRegistrationRecordFile(personaDir);

    const requests: CapturedRequest[] = [];
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath,
      },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        requests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
          authorization,
        });

        if (url.endsWith("/agent/register")) {
          return new Response(
            JSON.stringify({
              ok: true,
              agentId: "550e8400-e29b-41d4-a716-446655440004",
              credential: "immortal_sk_recorded",
              selectedCultivatorId: "cultivator-9",
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "550e8400-e29b-41d4-a716-446655440004",
              selectedCultivatorId: "cultivator-9",
              created: false,
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
              registration: {
                core_temperament: "Calm strategist",
              },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await tools.get("immortal_state")?.execute("tool-record-bootstrap", {});

    assert.equal(requests[0]?.url, "https://runtime.example/agent/register");
    assert.match(String(requests[0]?.body), /"record_type":"registration_record"/);
    assert.match(String(requests[0]?.body), /"questionnaire_version":"immortal-claw-oc-v1"/);
    assert.equal(requests[1]?.authorization, "Bearer immortal_sk_recorded");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("immortal_send_message posts targetAgentId through authenticated agent route", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-send-message-"));
  const personaDir = path.join(root, "workspace");
  const credentialsPath = path.join(root, "credentials.json");
  const requests: CapturedRequest[] = [];

  try {
    writePersonaFiles(personaDir);

    const { tools } = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath,
      },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        requests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
          authorization,
        });

        if (url.endsWith("/agent/register")) {
          return new Response(
            JSON.stringify({
              ok: true,
              agentId: "550e8400-e29b-41d4-a716-446655440100",
              credential: "immortal_sk_sender",
              selectedCultivatorId: "cultivator-9",
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "550e8400-e29b-41d4-a716-446655440100",
              selectedCultivatorId: "cultivator-9",
              created: false,
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/messages") && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              ok: true,
              message: {
                id: "msg-9",
                toCultivatorId: "cultivator-recipient",
              },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await tools.get("immortal_send_message")?.execute("tool-send", {
      targetAgentId: "550e8400-e29b-41d4-a716-446655440200",
      content: "Meet me at the sect gate.",
    });

    const sendRequest = requests.find((entry) => entry.url.endsWith("/agent/messages") && entry.method === "POST");
    assert.ok(sendRequest);
    assert.equal(sendRequest?.authorization, "Bearer immortal_sk_sender");
    assert.match(String(sendRequest?.body), /"toAgentId":"550e8400-e29b-41d4-a716-446655440200"/);
    assert.match(String(sendRequest?.body), /"content":"Meet me at the sect gate\."/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin ignores legacy apiKey-only cache entries and registers a fresh credential", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-legacy-cache-"));
  const personaDir = path.join(root, "workspace");
  const credentialsPath = path.join(root, "credentials.json");
  try {
    writePersonaFiles(personaDir);
    writeFileSync(
      credentialsPath,
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              worldBaseUrl: "https://runtime.example",
              agentId: "550e8400-e29b-41d4-a716-446655440002",
              requestedAgentId: "openclaw-main",
              apiKey: "immortal_sk_legacy_cache",
              selectedCultivatorId: "cultivator-9",
              updatedAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const requests: CapturedRequest[] = [];
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath,
      },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        requests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
          authorization,
        });

        if (url.endsWith("/agent/register")) {
          return new Response(
            JSON.stringify({
              agentId: "550e8400-e29b-41d4-a716-446655440003",
              credential: "immortal_sk_fresh",
              selectedCultivatorId: "cultivator-9",
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "550e8400-e29b-41d4-a716-446655440003",
              selectedCultivatorId: "cultivator-9",
              created: false,
            }),
            { status: 200 },
          );
        }

        if (url.endsWith("/agent/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await tools.get("immortal_state")?.execute("tool-legacy-cache", {});

    assert.equal(requests[0]?.url, "https://runtime.example/agent/register");
    assert.equal(requests[1]?.authorization, "Bearer immortal_sk_fresh");
    const storedCredentials = JSON.parse(readFileSync(credentialsPath, "utf8")) as {
      entries?: Array<Record<string, unknown>>;
    };
    assert.deepEqual(storedCredentials.entries?.[0], {
      worldBaseUrl: "https://runtime.example",
      agentId: "550e8400-e29b-41d4-a716-446655440003",
      requestedAgentId: "openclaw-main",
      credential: "immortal_sk_fresh",
      selectedCultivatorId: "cultivator-9",
      updatedAt: storedCredentials.entries?.[0]?.updatedAt,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin surfaces a clear error on unauthorized cached credentials without re-registering", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-unauthorized-"));
  const personaDir = path.join(root, "workspace");
  const credentialsPath = path.join(root, "credentials.json");
  try {
    writePersonaFiles(personaDir);
    writeFileSync(
      credentialsPath,
      JSON.stringify(
        {
          version: 1,
          entries: [
            {
              worldBaseUrl: "https://runtime.example",
              agentId: "550e8400-e29b-41d4-a716-446655440000",
              requestedAgentId: "openclaw-main",
              credential: "immortal_sk_stale",
              selectedCultivatorId: "cultivator-9",
              updatedAt: "2026-03-12T00:00:00.000Z",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    const requests: CapturedRequest[] = [];
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "https://runtime.example",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath,
      },
      async (input, init) => {
        const url = String(input);
        const authorization =
          init?.headers && typeof init.headers === "object" && "Authorization" in init.headers
            ? String((init.headers as Record<string, unknown>).Authorization)
            : null;
        requests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
          authorization,
        });

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(JSON.stringify({ error: "Invalid or expired credential." }), {
            status: 401,
          });
        }

        if (url.endsWith("/agent/register")) {
          return new Response(JSON.stringify({ error: "should not re-register" }), {
            status: 500,
          });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await assert.rejects(
      () => tools.get("immortal_state")!.execute("tool-1", {}),
      /Automatic re-registration is disabled|Lost-credential recovery is not implemented/i,
    );

    assert.equal(requests.some((entry) => entry.url.endsWith("/agent/register")), false);
    assert.equal(requests[0]?.url, "https://runtime.example/agent/sync-persona");
    assert.equal(requests[0]?.authorization, "Bearer immortal_sk_stale");
    assert.match(readFileSync(credentialsPath, "utf8"), /immortal_sk_stale/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("plugin falls back to legacy persona sync when /agent/register is unavailable", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "immortal-plugin-legacy-"));
  const personaDir = path.join(root, "workspace");
  try {
    writePersonaFiles(personaDir);

    const requests: CapturedRequest[] = [];
    const { tools } = registerPlugin(
      {
        worldBaseUrl: "http://127.0.0.1:8787",
        agentId: "openclaw-main",
        personaDir,
        credentialsPath: path.join(root, "credentials.json"),
      },
      async (input, init) => {
        const url = String(input);
        requests.push({
          url,
          method: String(init?.method ?? "GET"),
          body: typeof init?.body === "string" ? init.body : undefined,
        });

        if (url.endsWith("/agent/register")) {
          return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
        }

        if (url.endsWith("/agent/sync-persona")) {
          return new Response(
            JSON.stringify({
              agentId: "openclaw-main",
              selectedCultivatorId: "cultivator-9",
              created: true,
            }),
            { status: 200 },
          );
        }

        if (url.includes("/cultivator/state")) {
          return new Response(
            JSON.stringify({
              tick: 0,
              cultivator: { id: "cultivator-9", name: "Su Mingyue" },
            }),
            { status: 200 },
          );
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    );

    await tools.get("immortal_state")?.execute("tool-1", {});

    assert.equal(requests[0]?.url, "http://127.0.0.1:8787/agent/register");
    assert.equal(requests[1]?.url, "http://127.0.0.1:8787/agent/sync-persona");
    assert.equal(
      requests[2]?.url,
      "http://127.0.0.1:8787/cultivator/state?cultivatorId=cultivator-9",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
