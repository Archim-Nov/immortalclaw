import assert from "node:assert/strict";
import test from "node:test";
import { createSupabaseAuthClient } from "./supabase-auth-client.js";

class FakeSupabaseRestApi {
  readonly requests: Array<{
    method: string;
    pathname: string;
    headers: Record<string, string>;
  }> = [];

  readonly tables = {
    agent_profiles: new Map<string, Record<string, unknown>>(),
    agent_credentials: new Map<string, Record<string, unknown>>(),
  };

  fetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    this.requests.push({
      method: request.method,
      pathname: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
    });
    const tableName = url.pathname.split("/").pop();
    if (!tableName || !(tableName in this.tables)) {
      return this.jsonResponse({ message: `Unknown table: ${url.pathname}` }, 404);
    }

    if (request.method === "GET") {
      return this.handleGet(tableName as keyof FakeSupabaseRestApi["tables"], url);
    }

    if (request.method === "POST") {
      return this.handlePost(tableName as keyof FakeSupabaseRestApi["tables"], request);
    }

    if (request.method === "PATCH") {
      return this.handlePatch(tableName as keyof FakeSupabaseRestApi["tables"], url, request);
    }

    return this.jsonResponse({ message: `Unsupported method: ${request.method}` }, 405);
  };

  private handleGet(tableName: keyof FakeSupabaseRestApi["tables"], url: URL) {
    if (tableName === "agent_profiles") {
      const agentId = this.readEq(url, "agent_id");
      if (agentId) {
        const row = this.tables.agent_profiles.get(agentId);
        return this.jsonResponse(row ? [row] : []);
      }
      return this.jsonResponse([...this.tables.agent_profiles.values()]);
    }

    const hash = this.readEq(url, "credential_hash");
    if (hash) {
      const row = this.tables.agent_credentials.get(hash);
      return this.jsonResponse(row ? [row] : []);
    }

    const agentId = this.readEq(url, "agent_id");
    if (!agentId) {
      return this.jsonResponse([]);
    }

    return this.jsonResponse(
      [...this.tables.agent_credentials.values()].filter((row) => row.agent_id === agentId),
    );
  }

  private async handlePost(tableName: keyof FakeSupabaseRestApi["tables"], request: Request) {
    const body = await request.json();
    const rows = Array.isArray(body) ? body : [body];

    if (tableName === "agent_profiles") {
      for (const row of rows) {
        this.tables.agent_profiles.set(String(row.agent_id), row);
      }
      return this.jsonResponse([], 201);
    }

    for (const row of rows) {
      this.tables.agent_credentials.set(String(row.credential_hash), row);
    }
    return this.jsonResponse([], 201);
  }

  private async handlePatch(
    tableName: keyof FakeSupabaseRestApi["tables"],
    url: URL,
    request: Request,
  ) {
    if (tableName === "agent_profiles") {
      const agentId = this.readEq(url, "agent_id");
      if (!agentId) {
        return this.jsonResponse([], 200);
      }

      const body = await request.json() as Record<string, unknown>;
      const row = this.tables.agent_profiles.get(agentId);
      if (row) {
        this.tables.agent_profiles.set(agentId, { ...row, ...body });
      }
      return this.jsonResponse([], 200);
    }

    const agentId = this.readEq(url, "agent_id");
    if (!agentId) {
      return this.jsonResponse([], 200);
    }

    const body = await request.json() as Record<string, unknown>;
    for (const [hash, row] of this.tables.agent_credentials.entries()) {
      if (row.agent_id === agentId) {
        this.tables.agent_credentials.set(hash, { ...row, ...body });
      }
    }
    return this.jsonResponse([], 200);
  }

  private readEq(url: URL, key: string) {
    const raw = url.searchParams.get(key);
    if (!raw?.startsWith("eq.")) {
      return null;
    }
    return decodeURIComponent(raw.slice(3));
  }

  private jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}

function createClient(api = new FakeSupabaseRestApi()) {
  const auth = createSupabaseAuthClient({
    url: "https://example.supabase.co",
    secretKey: "sb_secret_example",
    fetch: api.fetch,
    now: (() => {
      let tick = 0;
      return () => `2026-03-10T00:00:0${tick++}Z`;
    })(),
  });

  return { api, auth };
}

function requireTableRow<T>(row: T | undefined, label: string): T {
  if (!row) {
    throw new Error(`${label} is missing.`);
  }
  return row;
}

test("saveAgentProfile persists profiles and listAgentProfiles returns them", async () => {
  const { auth, api } = createClient();

  const profile = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
    origin: "Frost Harbor",
  });
  const listed = await auth.listAgentProfiles();
  const fetched = await auth.getAgentProfile("agent-1");

  assert.equal(profile.agentId, "agent-1");
  assert.equal(listed.length, 1);
  assert.equal(fetched?.selectedCultivatorId, "cultivator-1");
  assert.equal(api.tables.agent_profiles.size, 1);
});

test("issueAgentCredential authenticates and resetAgentCredential rotates the credential", async () => {
  const { auth } = createClient();

  const profile = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
  });
  const issued = await auth.issueAgentCredential(profile.agentId);
  const authenticated = await auth.authenticateAgent(issued.credential);
  const reset = await auth.resetAgentCredential(profile.agentId, issued.credential);
  const stale = await auth.authenticateAgent(issued.credential);
  const refreshed = await auth.authenticateAgent(reset.credential);

  assert.equal(authenticated?.agentId, profile.agentId);
  assert.equal(stale, null);
  assert.equal(refreshed?.agentId, profile.agentId);
});

test("touchAgent updates the current credential timestamp", async () => {
  const { auth, api } = createClient();

  const profile = await auth.saveAgentProfile({
    agentId: "agent-1",
    name: "Su Mingyue",
    selectedCultivatorId: "cultivator-1",
  });
  const issued = await auth.issueAgentCredential(profile.agentId);
  const before = structuredClone(requireTableRow(api.tables.agent_credentials.values().next().value, "before credential row"));
  await auth.touchAgent(profile.agentId);
  const after = structuredClone(requireTableRow(api.tables.agent_credentials.values().next().value, "after credential row"));

  assert.equal(before.last_seen_at, "2026-03-10T00:00:01Z");
  assert.equal(after.last_seen_at, "2026-03-10T00:00:02Z");
  assert.equal((await auth.authenticateAgent(issued.credential))?.agentId, profile.agentId);
});
