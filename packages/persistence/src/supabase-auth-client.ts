import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
} from "./world-repository.js";
import type { AuthClient } from "./auth-client.js";

export interface SupabaseAuthClientOptions {
  url: string;
  secretKey: string;
  fetch?: typeof fetch;
  now?: () => string;
}

interface AgentProfileRow {
  agent_id: string;
  name: string;
  selected_cultivator_id: string;
  gender_presentation?: AgentProfileRecord["genderPresentation"] | null;
  pronouns?: string | null;
  origin?: string | null;
  temperament?: string | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at?: string | null;
}

interface AgentCredentialRow {
  agent_id: string;
  credential_hash: string;
  created_at: string;
  last_seen_at: string | null;
  revoked_at?: string | null;
}

function normalizeAgentId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function issueCredential(): string {
  return `immortal_sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function hashCredential(credential: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(credential.trim()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export class SupabaseAuthClient implements AuthClient {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => string;

  constructor(private readonly options: SupabaseAuthClientOptions) {
    const rawFetch = options.fetch ?? fetch;
    this.fetchImpl = (input, init) => rawFetch(input, init);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    const rows = await this.selectRows<AgentProfileRow>("agent_profiles", {
      select:
        "agent_id,name,selected_cultivator_id,gender_presentation,pronouns,origin,temperament,created_at,updated_at,last_seen_at",
      order: "updated_at.desc",
    });
    return rows.map((row) => this.fromAgentProfileRow(row));
  }

  async getAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const rows = await this.selectRows<AgentProfileRow>("agent_profiles", {
      agent_id: `eq.${encodeURIComponent(agentId)}`,
      select:
        "agent_id,name,selected_cultivator_id,gender_presentation,pronouns,origin,temperament,created_at,updated_at,last_seen_at",
      limit: "1",
    });
    if (rows.length === 0) {
      return null;
    }
    return this.fromAgentProfileRow(rows[0]!);
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

    const profile = {
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
    } satisfies AgentProfileRecord;

    await this.upsertRows("agent_profiles", [this.toAgentProfileRow(profile)], "agent_id");
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
    await this.updateAgentCredentialRows(normalizedAgentId, { revoked_at: timestamp });

    const credential = issueCredential();
    await this.upsertRows(
      "agent_credentials",
      [
        {
          agent_id: normalizedAgentId,
          credential_hash: await hashCredential(credential),
          created_at: timestamp,
          last_seen_at: timestamp,
          revoked_at: null,
        },
      ],
      "credential_hash",
    );

    return {
      agentId: normalizedAgentId,
      credential,
    };
  }

  async resetAgentCredential(agentId: string, currentCredential: string): Promise<AgentCredentialResetResult> {
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
    const currentCredentialRows = await this.selectRows<AgentCredentialRow>("agent_credentials", {
      credential_hash: `eq.${encodeURIComponent(currentCredentialHash)}`,
      select: "agent_id,credential_hash,created_at,last_seen_at,revoked_at",
      limit: "1",
    });
    const currentCredentialRow = currentCredentialRows[0];
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
    await this.upsertRows("agent_profiles", [this.toAgentProfileRow(updatedProfile)], "agent_id");

    await this.updateAgentCredentialRows(normalizedAgentId, { revoked_at: timestamp });

    const credential = issueCredential();
    try {
      await this.upsertRows(
        "agent_credentials",
        [
          {
            agent_id: normalizedAgentId,
            credential_hash: await hashCredential(credential),
            created_at: timestamp,
            last_seen_at: timestamp,
            revoked_at: null,
          },
        ],
        "credential_hash",
      );
    } catch (error) {
      try {
        await this.upsertRows(
          "agent_credentials",
          [
            {
              agent_id: currentCredentialRow.agent_id,
              credential_hash: currentCredentialRow.credential_hash,
              created_at: currentCredentialRow.created_at,
              last_seen_at: timestamp,
              revoked_at: null,
            },
          ],
          "credential_hash",
        );
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

    return {
      agentId: updatedProfile.agentId,
      credential,
    };
  }

  async authenticateAgent(credential: string): Promise<AgentProfileRecord | null> {
    const normalizedCredential = credential.trim();
    if (!normalizedCredential) {
      return null;
    }

    const credentialRows = await this.selectRows<AgentCredentialRow>("agent_credentials", {
      credential_hash: `eq.${encodeURIComponent(await hashCredential(normalizedCredential))}`,
      select: "agent_id,created_at,last_seen_at,revoked_at",
      limit: "1",
    });
    const credentialRow = credentialRows[0];
    if (!credentialRow || credentialRow.revoked_at) {
      return null;
    }

    const profile = await this.readAgentProfile(credentialRow.agent_id);
    if (!profile) {
      return null;
    }

    return {
      ...profile,
      lastSeenAt: credentialRow.last_seen_at,
    };
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

  private async readAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const rows = await this.selectRows<AgentProfileRow>("agent_profiles", {
      agent_id: `eq.${encodeURIComponent(agentId)}`,
      select:
        "agent_id,name,selected_cultivator_id,gender_presentation,pronouns,origin,temperament,created_at,updated_at,last_seen_at",
      limit: "1",
    });

    const row = rows[0];
    return row ? this.fromAgentProfileRow(row) : null;
  }

  private async updateAgentCredentialRows(agentId: string, body: object) {
    const response = await this.fetchImpl(
      this.tableUrl("agent_credentials", {
        agent_id: `eq.${encodeURIComponent(agentId)}`,
      }),
      {
        method: "PATCH",
        headers: this.headers({
          Prefer: "return=minimal",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`Failed to update agent credentials: ${error.message}`);
    }
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
      webhook_url: profile.webhookUrl ?? null,
      webhook_secret: profile.webhookSecret ?? null,
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
      webhookUrl: row.webhook_url ?? null,
      webhookSecret: row.webhook_secret ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastSeenAt: row.last_seen_at ?? null,
    };
  }

  private async selectRows<T>(table: string, query: Record<string, string>) {
    const response = await this.fetchImpl(this.tableUrl(table, query), {
      method: "GET",
      headers: this.headers(),
    });
    return this.readJson<T[]>(response, `Failed to read rows from ${table}`);
  }

  private async upsertRows(table: string, rows: object[], conflictColumn: string) {
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

  private async readJson<T>(response: Response, context: string): Promise<T> {
    if (!response.ok) {
      const error = await this.readError(response);
      throw new Error(`${context}: ${error.message}`);
    }
    return (await response.json()) as T;
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

export function createSupabaseAuthClient(options: SupabaseAuthClientOptions) {
  return new SupabaseAuthClient(options);
}
