import type { GenderPresentation } from "../../domain/src/model.js";
import type { AuthClient } from "./auth-client.js";
import { hashCredential, issueCredential, normalizeAgentId } from "./credential-utils.js";
import type { SqliteDatabaseLike } from "./sqlite-schema.js";
import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
} from "./world-repository.js";

// Local (self-hosted) AuthClient backed by a node:sqlite database. Mirrors the
// semantics of SupabaseAuthClient exactly, so the gameplay/auth flow is identical
// off-cloud. Two tables, keyed the same way (credential_hash as the credential PK),
// with revocation tracked via revoked_at.

export const SQLITE_AUTH_SCHEMA = `
CREATE TABLE IF NOT EXISTS agent_profiles (
  agent_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  selected_cultivator_id TEXT NOT NULL,
  gender_presentation TEXT,
  pronouns TEXT,
  origin TEXT,
  temperament TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_credentials (
  credential_hash TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_agent_credentials_agent ON agent_credentials(agent_id);
`;

interface AgentProfileRow {
  agent_id: string;
  name: string;
  selected_cultivator_id: string;
  gender_presentation: string | null;
  pronouns: string | null;
  origin: string | null;
  temperament: string | null;
  webhook_url: string | null;
  webhook_secret: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
}

interface AgentCredentialRow {
  agent_id: string;
  credential_hash: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
}

const PROFILE_COLUMNS =
  "agent_id, name, selected_cultivator_id, gender_presentation, pronouns, origin, temperament, webhook_url, webhook_secret, created_at, updated_at, last_seen_at";

export interface SqliteAuthClientOptions {
  database: SqliteDatabaseLike;
  now?: () => string;
}

export function createAuthSchema(database: SqliteDatabaseLike): void {
  for (const statement of SQLITE_AUTH_SCHEMA.split(";").map((part) => part.trim()).filter(Boolean)) {
    database.exec(`${statement};`);
  }
}

export class SqliteAuthClient implements AuthClient {
  private readonly db: SqliteDatabaseLike;
  private readonly now: () => string;

  constructor(options: SqliteAuthClientOptions) {
    this.db = options.database;
    this.now = options.now ?? (() => new Date().toISOString());
    createAuthSchema(this.db);
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    const rows = this.db
      .prepare(`SELECT ${PROFILE_COLUMNS} FROM agent_profiles ORDER BY updated_at DESC`)
      .all() as AgentProfileRow[];
    return rows.map((row) => fromAgentProfileRow(row));
  }

  async getAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    return this.readAgentProfile(agentId);
  }

  async saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord> {
    const normalizedAgentId = normalizeAgentId(input.agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error("Agent profile requires a name.");
    }

    const normalizedCultivatorId = input.selectedCultivatorId.trim();
    if (!normalizedCultivatorId) {
      throw new Error("selectedCultivatorId is required.");
    }

    const timestamp = this.now();
    const existingProfile = await this.readAgentProfile(normalizedAgentId);

    const profile: AgentProfileRecord = {
      agentId: normalizedAgentId,
      name: normalizedName,
      selectedCultivatorId: normalizedCultivatorId,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns?.trim(),
      origin: input.origin?.trim(),
      temperament: input.temperament?.trim(),
      webhookUrl: input.webhookUrl ?? existingProfile?.webhookUrl ?? null,
      webhookSecret: existingProfile?.webhookSecret ?? null,
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSeenAt: input.lastSeenAt ?? existingProfile?.lastSeenAt ?? timestamp,
    };

    this.upsertProfile(profile);
    return structuredClone(profile);
  }

  async issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const existingProfile = await this.readAgentProfile(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }

    const timestamp = this.now();
    this.revokeCredentials(normalizedAgentId, timestamp);

    const credential = issueCredential();
    this.upsertCredential({
      agent_id: normalizedAgentId,
      credential_hash: await hashCredential(credential),
      created_at: timestamp,
      last_seen_at: timestamp,
      revoked_at: null,
    });

    return { agentId: normalizedAgentId, credential };
  }

  async resetAgentCredential(
    agentId: string,
    currentCredential: string,
  ): Promise<AgentCredentialResetResult> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }
    const normalizedCurrentCredential = currentCredential.trim();
    if (!normalizedCurrentCredential) {
      throw new Error("currentCredential is required.");
    }

    const existingProfile = await this.readAgentProfile(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }

    const currentCredentialHash = await hashCredential(normalizedCurrentCredential);
    const currentCredentialRow = this.readCredentialByHash(currentCredentialHash);
    if (
      !currentCredentialRow ||
      currentCredentialRow.revoked_at ||
      currentCredentialRow.agent_id !== normalizedAgentId
    ) {
      throw new Error("Current credential does not belong to the requested agent.");
    }

    const timestamp = this.now();
    const updatedProfile: AgentProfileRecord = {
      ...existingProfile,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    };
    this.upsertProfile(updatedProfile);

    this.revokeCredentials(normalizedAgentId, timestamp);

    const credential = issueCredential();
    try {
      this.upsertCredential({
        agent_id: normalizedAgentId,
        credential_hash: await hashCredential(credential),
        created_at: timestamp,
        last_seen_at: timestamp,
        revoked_at: null,
      });
    } catch (error) {
      try {
        this.upsertCredential({
          agent_id: currentCredentialRow.agent_id,
          credential_hash: currentCredentialRow.credential_hash,
          created_at: currentCredentialRow.created_at,
          last_seen_at: timestamp,
          revoked_at: null,
        });
      } catch (restoreError) {
        throw new Error(
          `Failed to issue replacement agent credential and failed to restore the current credential: ${
            restoreError instanceof Error ? restoreError.message : String(restoreError)
          }`,
        );
      }
      throw new Error(
        `Failed to issue replacement agent credential: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { agentId: updatedProfile.agentId, credential };
  }

  async authenticateAgent(credential: string): Promise<AgentProfileRecord | null> {
    const normalizedCredential = credential.trim();
    if (!normalizedCredential) {
      return null;
    }

    const credentialRow = this.readCredentialByHash(await hashCredential(normalizedCredential));
    if (!credentialRow || credentialRow.revoked_at) {
      return null;
    }

    const profile = await this.readAgentProfile(credentialRow.agent_id);
    if (!profile) {
      return null;
    }

    return { ...profile, lastSeenAt: credentialRow.last_seen_at };
  }

  async touchAgent(agentId: string): Promise<void> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      return;
    }
    this.db
      .prepare(`UPDATE agent_credentials SET last_seen_at = ? WHERE agent_id = ?`)
      .run(this.now(), normalizedAgentId);
  }

  private async readAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const rows = this.db
      .prepare(`SELECT ${PROFILE_COLUMNS} FROM agent_profiles WHERE agent_id = ?`)
      .all(agentId) as AgentProfileRow[];
    const row = rows[0];
    return row ? fromAgentProfileRow(row) : null;
  }

  private readCredentialByHash(credentialHash: string): AgentCredentialRow | undefined {
    const rows = this.db
      .prepare(
        `SELECT agent_id, credential_hash, created_at, last_seen_at, revoked_at FROM agent_credentials WHERE credential_hash = ?`,
      )
      .all(credentialHash) as AgentCredentialRow[];
    return rows[0];
  }

  private revokeCredentials(agentId: string, timestamp: string): void {
    this.db
      .prepare(`UPDATE agent_credentials SET revoked_at = ? WHERE agent_id = ? AND revoked_at IS NULL`)
      .run(timestamp, agentId);
  }

  private upsertProfile(profile: AgentProfileRecord): void {
    const row = toAgentProfileRow(profile);
    this.db
      .prepare(
        `INSERT INTO agent_profiles (${PROFILE_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(agent_id) DO UPDATE SET
           name = excluded.name,
           selected_cultivator_id = excluded.selected_cultivator_id,
           gender_presentation = excluded.gender_presentation,
           pronouns = excluded.pronouns,
           origin = excluded.origin,
           temperament = excluded.temperament,
           webhook_url = excluded.webhook_url,
           webhook_secret = excluded.webhook_secret,
           created_at = excluded.created_at,
           updated_at = excluded.updated_at,
           last_seen_at = excluded.last_seen_at`,
      )
      .run(
        row.agent_id,
        row.name,
        row.selected_cultivator_id,
        row.gender_presentation,
        row.pronouns,
        row.origin,
        row.temperament,
        row.webhook_url,
        row.webhook_secret,
        row.created_at,
        row.updated_at,
        row.last_seen_at,
      );
  }

  private upsertCredential(row: AgentCredentialRow): void {
    this.db
      .prepare(
        `INSERT INTO agent_credentials (credential_hash, agent_id, created_at, last_seen_at, revoked_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(credential_hash) DO UPDATE SET
           agent_id = excluded.agent_id,
           created_at = excluded.created_at,
           last_seen_at = excluded.last_seen_at,
           revoked_at = excluded.revoked_at`,
      )
      .run(row.credential_hash, row.agent_id, row.created_at, row.last_seen_at, row.revoked_at);
  }
}

export function createSqliteAuthClient(options: SqliteAuthClientOptions): SqliteAuthClient {
  return new SqliteAuthClient(options);
}

function toAgentProfileRow(profile: AgentProfileRecord): AgentProfileRow {
  return {
    agent_id: profile.agentId,
    name: profile.name,
    selected_cultivator_id: profile.selectedCultivatorId,
    gender_presentation: profile.genderPresentation ?? null,
    pronouns: profile.pronouns ?? null,
    origin: profile.origin ?? null,
    temperament: profile.temperament ?? null,
    webhook_url: profile.webhookUrl ?? null,
    webhook_secret: profile.webhookSecret ?? null,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
    last_seen_at: profile.lastSeenAt,
  };
}

function fromAgentProfileRow(row: AgentProfileRow): AgentProfileRecord {
  return {
    agentId: row.agent_id,
    name: row.name,
    selectedCultivatorId: row.selected_cultivator_id,
    genderPresentation: (row.gender_presentation ?? undefined) as GenderPresentation | undefined,
    pronouns: row.pronouns ?? undefined,
    origin: row.origin ?? undefined,
    temperament: row.temperament ?? undefined,
    webhookUrl: row.webhook_url ?? null,
    webhookSecret: row.webhook_secret ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: row.last_seen_at ?? null,
  };
}
