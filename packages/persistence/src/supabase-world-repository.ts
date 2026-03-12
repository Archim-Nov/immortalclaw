import {
  advanceWorld as advanceWorldState,
  createSeedWorld,
  getCultivationRegistration,
  getCultivatorState as readCultivatorState,
  listAvailableActions as readAvailableActions,
  performAction as performWorldAction,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
} from "../../domain/src/runtime.js";
import type {
  ActionExecutionResult,
  ActionId,
  AvailableAction,
  CultivationRegistrationRecord,
  CultivatorStateView,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type { WorldEvent } from "../../domain/src/model.js";
import type {
  AgentPersonaInput,
  AgentProfileRecord,
  AgentRegistrationInput,
  AgentRegistrationResult,
  TickLockRecord,
  TickRunRecord,
  WorldRepository,
} from "./world-repository.js";

const DEFAULT_WORLD_KEY = "primary";
const DEFAULT_TICK_LOCK_NAME = "world-tick";

interface StoredWorldSnapshotRow {
  version: number;
  payload: WorldState;
}

export interface SupabaseWorldRepositoryOptions {
  url: string;
  secretKey: string;
  fetch?: typeof fetch;
  now?: () => string;
  worldKey?: string;
  tickLockName?: string;
}

interface TickRunRow {
  tick: number;
  advanced_ticks: number;
  trigger: TickRunRecord["trigger"];
  recorded_at: string;
  payload: TickSummary;
}

interface AgentProfileRow {
  agent_id: string;
  name: string;
  selected_cultivator_id: string;
  gender_presentation?: AgentProfileRecord["genderPresentation"] | null;
  pronouns?: string | null;
  origin?: string | null;
  temperament?: string | null;
  starting_path?: AgentProfileRecord["startingPath"] | null;
  llm_provider?: string | null;
  llm_model_name?: string | null;
  llm_model_version?: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at?: string | null;
}

interface AgentCredentialRow {
  agent_id: string;
  api_key_hash: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at?: string | null;
}

function normalizeAgentId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function issueApiKey(): string {
  return `immortal_sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function hashApiKey(apiKey: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey.trim()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class SupabaseWorldRepository implements WorldRepository {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => string;
  private readonly worldKey: string;
  private readonly tickLockName: string;

  constructor(private readonly options: SupabaseWorldRepositoryOptions) {
    const rawFetch = options.fetch ?? fetch;
    this.fetchImpl = (input, init) => rawFetch(input, init);
    this.now = options.now ?? (() => new Date().toISOString());
    this.worldKey = options.worldKey ?? DEFAULT_WORLD_KEY;
    this.tickLockName = options.tickLockName ?? DEFAULT_TICK_LOCK_NAME;
  }

  async readWorld(): Promise<WorldState> {
    const snapshot = await this.readSnapshot();
    return snapshot.world;
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    const rows = await this.selectRows<AgentProfileRow>("agent_profiles", {
      select:
        "agent_id,name,selected_cultivator_id,gender_presentation,pronouns,origin,temperament,starting_path,llm_provider,llm_model_name,llm_model_version,created_at,updated_at,last_seen_at",
      order: "updated_at.desc",
    });
    return rows.map((row) => this.fromAgentProfileRow(row));
  }

  async getCultivatorState(cultivatorId: string): Promise<CultivatorStateView> {
    const world = await this.readWorld();
    return readCultivatorState(world, cultivatorId);
  }

  async listAvailableActions(cultivatorId: string): Promise<AvailableAction[]> {
    const world = await this.readWorld();
    return readAvailableActions(world, cultivatorId);
  }

  async performAction(cultivatorId: string, actionId: ActionId): Promise<ActionExecutionResult> {
    const snapshot = await this.readSnapshot();
    const result = performWorldAction(snapshot.world, cultivatorId, actionId);

    await this.persistWorld(snapshot.world, snapshot.revision);
    await this.insertRow("world_actions", {
      tick: result.tick,
      cultivator_id: result.cultivatorId,
      action_id: result.actionId,
      accepted: result.accepted,
      summary: result.summary,
      created_at: this.now(),
      payload: result,
    });

    return structuredClone(result);
  }

  async advanceWorld(steps: number, trigger: TickRunRecord["trigger"] = "manual"): Promise<TickSummary> {
    const snapshot = await this.readSnapshot();
    const summary = advanceWorldState(snapshot.world, steps);
    const recordedAt = this.now();

    await this.persistWorld(snapshot.world, snapshot.revision);
    await this.insertRow("tick_runs", {
      tick: summary.tick,
      advanced_ticks: summary.advancedTicks,
      trigger,
      recorded_at: recordedAt,
      payload: summary,
    });

    if (summary.triggeredEvents.length > 0) {
      await this.insertRows(
        "world_events",
        summary.triggeredEvents.map((event) => this.toWorldEventRow(event)),
      );
    }

    return structuredClone(summary);
  }

  async getLatestTickRun(): Promise<TickRunRecord | null> {
    const rows = await this.selectRows<TickRunRow>("tick_runs", {
      select: "tick,advanced_ticks,trigger,recorded_at",
      order: "recorded_at.desc",
      limit: "1",
    });

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      tick: row.tick,
      advancedTicks: row.advanced_ticks,
      trigger: row.trigger,
      recordedAt: row.recorded_at,
    };
  }

  async acquireTickLock(ownerId: string): Promise<TickLockRecord | null> {
    const acquiredAt = this.now();
    const response = await this.fetchImpl(this.tableUrl("world_locks"), {
      method: "POST",
      headers: this.headers({
        Prefer: "return=minimal",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        lock_name: this.tickLockName,
        owner_id: ownerId,
        acquired_at: acquiredAt,
      }),
    });

    if (response.ok) {
      return {
        lockId: this.tickLockName,
        ownerId,
        acquiredAt,
      };
    }

    if (response.status === 409) {
      return null;
    }

    const error = await this.readError(response);
    if (error.code === "23505") {
      return null;
    }

    throw new Error(`Failed to acquire tick lock: ${error.message}`);
  }

  async releaseTickLock(lockId: string): Promise<void> {
    const response = await this.fetchImpl(
      this.tableUrl("world_locks", {
        lock_name: `eq.${encodeURIComponent(lockId)}`,
      }),
      {
        method: "DELETE",
        headers: this.headers({
          Prefer: "return=minimal",
        }),
      },
    );

    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`Failed to release tick lock: ${error.message}`);
    }
  }

  async registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult> {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error("Agent registration requires a name.");
    }

    const agentId = normalizeAgentId(input.agentId) ?? `agent-${crypto.randomUUID()}`;
    const timestamp = this.now();
    const existingProfile = await this.readAgentProfile(agentId);
    const snapshot = await this.readSnapshot();
    const sync = syncCultivatorFromPersona(snapshot.world, {
      agentId,
      name: normalizedName,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    await this.persistWorld(snapshot.world, snapshot.revision);

    const profile = {
      agentId,
      name: normalizedName,
      selectedCultivatorId: sync.selectedCultivatorId,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns?.trim(),
      origin: input.origin?.trim(),
      temperament: input.temperament?.trim(),
      startingPath: input.startingPath,
      llmProvider: input.llmProvider?.trim(),
      llmModelName: input.llmModelName?.trim(),
      llmModelVersion: input.llmModelVersion?.trim(),
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    } satisfies AgentProfileRecord;

    await this.upsertRows("agent_profiles", [this.toAgentProfileRow(profile)], "agent_id");

    await this.fetchImpl(
      this.tableUrl("agent_credentials", {
        agent_id: `eq.${encodeURIComponent(agentId)}`,
      }),
      {
        method: "PATCH",
        headers: this.headers({
          Prefer: "return=minimal",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          revoked_at: timestamp,
        }),
      },
    );

    const apiKey = issueApiKey();
    await this.upsertRows(
      "agent_credentials",
      [
        {
          agent_id: agentId,
          api_key_hash: await hashApiKey(apiKey),
          created_at: timestamp,
          last_seen_at: timestamp,
          revoked_at: null,
        },
      ],
      "api_key_hash",
    );

    return {
      ...profile,
      apiKey,
      createdCultivator: sync.created,
    };
  }

  async authenticateAgent(apiKey: string): Promise<AgentProfileRecord | null> {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
      return null;
    }

    const credentialRows = await this.selectRows<AgentCredentialRow>("agent_credentials", {
      api_key_hash: `eq.${encodeURIComponent(await hashApiKey(normalizedApiKey))}`,
      select: "agent_id,created_at,last_seen_at,revoked_at",
      limit: "1",
    });
    const credential = credentialRows[0];
    if (!credential || credential.revoked_at) {
      return null;
    }

    const profile = await this.readAgentProfile(credential.agent_id);
    if (!profile) {
      return null;
    }

    return {
      ...profile,
      lastSeenAt: credential.last_seen_at,
    };
  }

  async syncAgentPersona(agentId: string, input: AgentPersonaInput): Promise<AgentProfileRecord> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const existingProfile = await this.readAgentProfile(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }

    const snapshot = await this.readSnapshot();
    const sync = syncCultivatorFromPersona(snapshot.world, {
      agentId: normalizedAgentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    await this.persistWorld(snapshot.world, snapshot.revision);

    const updatedProfile: AgentProfileRecord = {
      ...existingProfile,
      name: input.name.trim(),
      selectedCultivatorId: sync.selectedCultivatorId,
      genderPresentation: input.genderPresentation ?? existingProfile.genderPresentation,
      pronouns: input.pronouns?.trim() ?? existingProfile.pronouns,
      origin: input.origin?.trim() ?? existingProfile.origin,
      temperament: input.temperament?.trim() ?? existingProfile.temperament,
      startingPath: input.startingPath ?? existingProfile.startingPath,
      updatedAt: this.now(),
    };

    await this.upsertRows("agent_profiles", [this.toAgentProfileRow(updatedProfile)], "agent_id");
    return structuredClone(updatedProfile);
  }

  async touchAgent(agentId: string): Promise<void> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      return;
    }

    const response = await this.fetchImpl(
      this.tableUrl("agent_credentials", {
        agent_id: `eq.${encodeURIComponent(normalizedAgentId)}`,
      }),
      {
        method: "PATCH",
        headers: this.headers({
          Prefer: "return=minimal",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          last_seen_at: this.now(),
        }),
      },
    );

    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`Failed to update agent activity: ${error.message}`);
    }
  }

  async syncPersona(agentId: string, input: AgentPersonaInput) {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const snapshot = await this.readSnapshot();
    const result = syncCultivatorFromPersona(snapshot.world, {
      agentId: normalizedAgentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });
    await this.persistWorld(snapshot.world, snapshot.revision);
    return structuredClone(result);
  }

  async getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null> {
    const world = await this.readWorld();
    return getCultivationRegistration(world, cultivatorId);
  }

  async saveCultivationRegistration(
    cultivatorId: string,
    record: CultivationRegistrationRecord,
    savedByAgentId?: string | null,
  ): Promise<CultivationRegistrationRecord> {
    const snapshot = await this.readSnapshot();
    const stored = saveCultivationRegistration(
      snapshot.world,
      cultivatorId,
      record,
      savedByAgentId,
    );
    await this.persistWorld(snapshot.world, snapshot.revision);
    return structuredClone(stored);
  }

  private async readAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const rows = await this.selectRows<AgentProfileRow>("agent_profiles", {
      agent_id: `eq.${encodeURIComponent(agentId)}`,
      select:
        "agent_id,name,selected_cultivator_id,gender_presentation,pronouns,origin,temperament,starting_path,llm_provider,llm_model_name,llm_model_version,created_at,updated_at,last_seen_at",
      limit: "1",
    });

    const row = rows[0];
    return row ? this.fromAgentProfileRow(row) : null;
  }

  private toAgentProfileRow(profile: AgentProfileRecord): AgentProfileRow {
    return {
      agent_id: profile.agentId,
      name: profile.name,
      selected_cultivator_id: profile.selectedCultivatorId,
      gender_presentation: profile.genderPresentation ?? null,
      pronouns: profile.pronouns ?? null,
      origin: profile.origin ?? null,
      temperament: profile.temperament ?? null,
      starting_path: profile.startingPath ?? null,
      llm_provider: profile.llmProvider ?? null,
      llm_model_name: profile.llmModelName ?? null,
      llm_model_version: profile.llmModelVersion ?? null,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      last_seen_at: profile.lastSeenAt,
    };
  }

  private fromAgentProfileRow(row: AgentProfileRow): AgentProfileRecord {
    return {
      agentId: row.agent_id,
      name: row.name,
      selectedCultivatorId: row.selected_cultivator_id,
      genderPresentation: row.gender_presentation ?? undefined,
      pronouns: row.pronouns ?? undefined,
      origin: row.origin ?? undefined,
      temperament: row.temperament ?? undefined,
      startingPath: row.starting_path ?? undefined,
      llmProvider: row.llm_provider ?? undefined,
      llmModelName: row.llm_model_name ?? undefined,
      llmModelVersion: row.llm_model_version ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSeenAt: row.last_seen_at ?? null,
    };
  }

  private async readSnapshot(): Promise<{ world: WorldState; revision: number }> {
    const rows = await this.selectRows<StoredWorldSnapshotRow>("world_snapshots", {
      world_key: `eq.${encodeURIComponent(this.worldKey)}`,
      select: "version,payload",
      limit: "1",
    });

    const existing = rows[0];
    if (existing) {
      return {
        world: structuredClone(existing.payload),
        revision: existing.version,
      };
    }

    const seedWorld = createSeedWorld();
    const inserted = await this.insertInitialSnapshot(seedWorld);
    if (inserted) {
      return {
        world: structuredClone(inserted),
        revision: 1,
      };
    }

    return this.readSnapshot();
  }

  private async insertInitialSnapshot(world: WorldState): Promise<WorldState | null> {
    const persistedWorld = structuredClone(world);
    persistedWorld.updatedAt = this.now();
    const response = await this.fetchImpl(this.tableUrl("world_snapshots"), {
      method: "POST",
      headers: this.headers({
        Prefer: "return=minimal",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        world_key: this.worldKey,
        version: 1,
        tick: persistedWorld.tick,
        updated_at: persistedWorld.updatedAt,
        payload: persistedWorld,
      }),
    });

    if (response.ok) {
      await this.upsertCultivatorRecords(persistedWorld);
      return persistedWorld;
    }

    if (response.status === 409) {
      return null;
    }

    const error = await this.readError(response);
    if (error.code === "23505") {
      return null;
    }

    throw new Error(`Failed to seed world snapshot: ${error.message}`);
  }

  private async persistWorld(world: WorldState, expectedRevision: number) {
    const persistedWorld = structuredClone(world);
    persistedWorld.updatedAt = this.now();

    const response = await this.fetchImpl(
      this.tableUrl("world_snapshots", {
        world_key: `eq.${encodeURIComponent(this.worldKey)}`,
        version: `eq.${expectedRevision}`,
      }),
      {
        method: "PATCH",
        headers: this.headers({
          Prefer: "return=representation",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          version: expectedRevision + 1,
          tick: persistedWorld.tick,
          updated_at: persistedWorld.updatedAt,
          payload: persistedWorld,
        }),
      },
    );

    const rows = await this.readRowsOrEmpty<{ version: number }[]>(response, "Failed to update world snapshot");
    if (rows.length === 0) {
      throw this.createStatusError(409, "World snapshot changed before write. Retry the request.");
    }

    await this.upsertCultivatorRecords(persistedWorld);
  }

  private async upsertCultivatorRecords(world: WorldState) {
    await this.upsertRows(
      "cultivator_records",
      Object.values(world.cultivators).map((cultivator) => ({
        cultivator_id: cultivator.id,
        tick: world.tick,
        updated_at: world.updatedAt,
        snapshot: structuredClone(cultivator),
      })),
      "cultivator_id",
    );
  }

  private toWorldEventRow(event: WorldEvent) {
    return {
      tick: event.tick,
      event_type: event.tags[0] ?? "world-event",
      created_at: this.now(),
      payload: event,
    };
  }

  private async selectRows<T>(table: string, query: Record<string, string>) {
    const response = await this.fetchImpl(this.tableUrl(table, query), {
      method: "GET",
      headers: this.headers(),
    });
    return this.readJson<T[]>(response, `Failed to read rows from ${table}`);
  }

  private async insertRow<T extends object>(table: string, row: T) {
    await this.insertRows(table, [row]);
  }

  private async insertRows<T extends object>(table: string, rows: T[]) {
    const response = await this.fetchImpl(this.tableUrl(table), {
      method: "POST",
      headers: this.headers({
        Prefer: "return=minimal",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(rows),
    });

    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`Failed to insert rows into ${table}: ${error.message}`);
    }
  }

  private async upsertRows(
    table: string,
    rows: object[],
    conflictColumn: string,
  ) {
    const response = await this.fetchImpl(
      this.tableUrl(table, {
        on_conflict: conflictColumn,
      }),
      {
        method: "POST",
        headers: this.headers({
          Prefer: "resolution=merge-duplicates,return=minimal",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(rows),
      },
    );

    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`Failed to upsert rows into ${table}: ${error.message}`);
    }
  }

  private tableUrl(table: string, query: Record<string, string> = {}) {
    const url = new URL(`/rest/v1/${table}`, this.options.url);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    return url;
  }

  private headers(extra: Record<string, string> = {}) {
    return {
      apikey: this.options.secretKey,
      ...extra,
    };
  }

  private createStatusError(status: number, message: string) {
    return Object.assign(new Error(message), { status });
  }

  private async readJson<T>(response: Response, context: string): Promise<T> {
    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`${context}: ${error.message}`);
    }
    return (await response.json()) as T;
  }

  private async readRowsOrEmpty<T>(response: Response, context: string): Promise<T> {
    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`${context}: ${error.message}`);
    }

    if (response.status === 204) {
      return [] as T;
    }

    const text = await response.text();
    if (!text) {
      return [] as T;
    }

    return JSON.parse(text) as T;
  }

  private async readError(response: Response) {
    const fallback: { code?: string; message: string } = {
      message: `${response.status} ${response.statusText}`,
    };
    try {
      const payload = (await response.json()) as { code?: string; message?: string };
      return {
        code: payload.code,
        message: payload.message ?? fallback.message,
      };
    } catch {
      return fallback;
    }
  }
}

export function createSupabaseWorldRepository(options: SupabaseWorldRepositoryOptions) {
  return new SupabaseWorldRepository(options);
}
