import assert from "node:assert/strict";
import test from "node:test";
import type { WorldState } from "../../domain/src/runtime.js";
import { createSupabaseWorldRepository } from "./supabase-world-repository.js";

class FakeSupabaseRestApi {
  failNextWorldSnapshotUpdateAsConflict = false;

  readonly requests: Array<{
    method: string;
    pathname: string;
    headers: Record<string, string>;
  }> = [];

  readonly tables = {
    world_snapshots: new Map<string, { world_key: string; version: number; tick: number; updated_at: string; payload: WorldState }>(),
    cultivator_records: new Map<string, { cultivator_id: string; tick: number; updated_at: string; snapshot: WorldState["cultivators"][string] }>(),
    world_actions: [] as Array<Record<string, unknown>>,
    world_events: [] as Array<Record<string, unknown>>,
    tick_runs: [] as Array<Record<string, unknown>>,
    world_locks: new Map<string, { lock_name: string; owner_id: string; acquired_at: string }>(),
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
      return this.handlePost(tableName as keyof FakeSupabaseRestApi["tables"], url, request);
    }

    if (request.method === "PATCH") {
      return this.handlePatch(tableName as keyof FakeSupabaseRestApi["tables"], url, request);
    }

    if (request.method === "DELETE") {
      return this.handleDelete(tableName as keyof FakeSupabaseRestApi["tables"], url);
    }

    return this.jsonResponse({ message: `Unsupported method: ${request.method}` }, 405);
  };

  private handleGet(tableName: keyof FakeSupabaseRestApi["tables"], url: URL) {
    if (tableName === "world_snapshots") {
      const worldKey = this.readEq(url, "world_key");
      const row = worldKey ? this.tables.world_snapshots.get(worldKey) : null;
      return this.jsonResponse(row ? [row] : []);
    }

    if (tableName === "tick_runs") {
      const rows = [...this.tables.tick_runs];
      rows.sort((left, right) => String(right.recorded_at).localeCompare(String(left.recorded_at)));
      return this.jsonResponse(rows.slice(0, Number(url.searchParams.get("limit") ?? "1")));
    }

    return this.jsonResponse({ message: `GET not supported for ${tableName}` }, 400);
  }

  private async handlePost(
    tableName: keyof FakeSupabaseRestApi["tables"],
    url: URL,
    request: Request,
  ) {
    const body = await request.json();
    if (tableName === "world_snapshots") {
      const row = Array.isArray(body) ? body[0] : body;
      this.tables.world_snapshots.set(row.world_key, row);
      return this.jsonResponse([], 201);
    }

    if (tableName === "cultivator_records") {
      const rows = Array.isArray(body) ? body : [body];
      for (const row of rows) {
        this.tables.cultivator_records.set(row.cultivator_id, row);
      }
      return this.jsonResponse([], 201);
    }

    if (tableName === "world_actions") {
      const rows = Array.isArray(body) ? body : [body];
      this.tables.world_actions.push(...rows);
      return this.jsonResponse([], 201);
    }

    if (tableName === "world_events") {
      const rows = Array.isArray(body) ? body : [body];
      this.tables.world_events.push(...rows);
      return this.jsonResponse([], 201);
    }

    if (tableName === "tick_runs") {
      const rows = Array.isArray(body) ? body : [body];
      this.tables.tick_runs.push(...rows);
      return this.jsonResponse([], 201);
    }

    if (tableName === "world_locks") {
      const row = Array.isArray(body) ? body[0] : body;
      if (this.tables.world_locks.has(row.lock_name)) {
        return this.jsonResponse(
          {
            code: "23505",
            message: "duplicate key value violates unique constraint",
          },
          409,
        );
      }
      this.tables.world_locks.set(row.lock_name, row);
      return this.jsonResponse([], 201);
    }

    return this.jsonResponse({ message: `POST not supported for ${tableName}` }, 400);
  }

  private async handlePatch(
    tableName: keyof FakeSupabaseRestApi["tables"],
    url: URL,
    request: Request,
  ) {
    if (tableName !== "world_snapshots") {
      return this.jsonResponse({ message: `PATCH not supported for ${tableName}` }, 400);
    }

    if (this.failNextWorldSnapshotUpdateAsConflict) {
      this.failNextWorldSnapshotUpdateAsConflict = false;
      return this.jsonResponse([], 200);
    }

    const worldKey = this.readEq(url, "world_key");
    const expectedVersion = Number(this.readEq(url, "version"));
    const existing = worldKey ? this.tables.world_snapshots.get(worldKey) : null;
    if (!existing || existing.version !== expectedVersion) {
      return this.jsonResponse([], 200);
    }

    const body = await request.json();
    const row = Array.isArray(body) ? body[0] : body;
    const nextRow = { ...existing, ...row, world_key: worldKey ?? existing.world_key };
    this.tables.world_snapshots.set(nextRow.world_key, nextRow);
    return this.jsonResponse([nextRow], 200);
  }

  private handleDelete(tableName: keyof FakeSupabaseRestApi["tables"], url: URL) {
    if (tableName !== "world_locks") {
      return this.jsonResponse({ message: `DELETE not supported for ${tableName}` }, 400);
    }

    const lockName = this.readEq(url, "lock_name");
    if (lockName) {
      this.tables.world_locks.delete(lockName);
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

function createRepository(api = new FakeSupabaseRestApi()) {
  const repository = createSupabaseWorldRepository({
    url: "https://example.supabase.co",
    secretKey: "sb_secret_example",
    fetch: api.fetch,
    now: (() => {
      let tick = 0;
      return () => `2026-03-10T00:00:0${tick++}Z`;
    })(),
  });

  return { api, repository };
}

async function firstCultivatorId(repository: ReturnType<typeof createRepository>["repository"]) {
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];
  if (!cultivatorId) {
    throw new Error("Expected a seeded cultivator.");
  }
  return cultivatorId;
}

test("readWorld bootstraps and persists a seed snapshot when storage is empty", async () => {
  const { api, repository } = createRepository();

  const first = await repository.readWorld();
  const second = await repository.readWorld();

  assert.deepEqual(second, first);
  assert.notEqual(second, first);
  assert.equal(api.tables.world_snapshots.size, 1);
  assert.equal(api.tables.cultivator_records.size, Object.keys(first.cultivators).length);
});

test("Supabase REST requests use the secret key as apikey without bearer auth", async () => {
  const { api, repository } = createRepository();

  await repository.readWorld();

  const firstRequest = api.requests[0];
  assert.ok(firstRequest);
  assert.equal(firstRequest.headers.apikey, "sb_secret_example");
  assert.equal(firstRequest.headers.authorization, undefined);
});

test("repository invokes provided fetch without rebinding its this reference", async () => {
  const api = new FakeSupabaseRestApi();
  const repository = createSupabaseWorldRepository({
    url: "https://example.supabase.co",
    secretKey: "sb_secret_example",
    fetch: function strictThisFetch(this: unknown, input: RequestInfo | URL, init?: RequestInit) {
      assert.equal(this, undefined);
      return api.fetch(input, init);
    },
  });

  const world = await repository.readWorld();

  assert.ok(world.cultivators["yun-zhong-he"]);
});

test("performAction persists world state and action metadata", async () => {
  const { api, repository } = createRepository();
  const cultivatorId = await firstCultivatorId(repository);

  const result = await repository.performAction(cultivatorId, "cultivate");
  const state = await repository.getCultivatorState(cultivatorId);

  assert.equal(result.accepted, true);
  assert.equal(state.currentJob?.actionId, "cultivate");
  assert.equal(state.cultivator.status, "busy");
  assert.equal(api.tables.world_actions.length, 1);
  assert.equal(api.tables.world_actions[0]?.cultivator_id, cultivatorId);
  assert.equal(api.tables.world_actions[0]?.action_id, "cultivate");
});

test("performAction rejects when the world snapshot changed before write", async () => {
  const { api, repository } = createRepository();
  const cultivatorId = await firstCultivatorId(repository);
  api.failNextWorldSnapshotUpdateAsConflict = true;

  await assert.rejects(
    repository.performAction(cultivatorId, "cultivate"),
    /changed before write/i,
  );
});

test("advanceWorld records tick metadata and emitted events", async () => {
  const { api, repository } = createRepository();

  const summary = await repository.advanceWorld(2);
  const latestTickRun = await repository.getLatestTickRun();

  assert.ok(latestTickRun);
  assert.equal(latestTickRun.tick, summary.tick);
  assert.equal(latestTickRun.advancedTicks, summary.advancedTicks);
  assert.equal(latestTickRun.recordedAt, "2026-03-10T00:00:01Z");
  assert.equal(api.tables.tick_runs.length, 1);
  assert.deepEqual(api.tables.tick_runs[0]?.payload, summary);
  assert.equal(api.tables.world_events.length, summary.triggeredEvents.length);
});

test("advanceWorld persists an explicit scheduled trigger", async () => {
  const { api, repository } = createRepository();
  const scheduledRepository = repository as typeof repository & {
    advanceWorld(steps: number, trigger: "manual" | "scheduled"): Promise<Awaited<ReturnType<typeof repository.advanceWorld>>>;
  };

  await scheduledRepository.advanceWorld(1, "scheduled");

  const latestTickRun = await repository.getLatestTickRun();
  assert.ok(latestTickRun);
  assert.equal(latestTickRun.trigger, "scheduled");
  assert.equal(api.tables.tick_runs[0]?.trigger, "scheduled");
});

test("acquireTickLock rejects overlap until the lock is released", async () => {
  const { repository } = createRepository();

  const firstLock = await repository.acquireTickLock("scheduler");
  const secondLock = await repository.acquireTickLock("manual");

  assert.ok(firstLock);
  assert.equal(secondLock, null);

  await repository.releaseTickLock(firstLock.lockId);

  const thirdLock = await repository.acquireTickLock("manual");
  assert.ok(thirdLock);
  assert.equal(thirdLock.ownerId, "manual");
});
