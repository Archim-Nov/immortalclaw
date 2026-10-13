import { stampActionRejection } from "../../domain/src/gameplay-error.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivationRegistration,
  getCultivatorState,
  hydrateWorldState,
  listAvailableActions,
  performAction,
  toPersistedWorldState,
} from "../../domain/src/runtime.js";
import type {
  ActionId,
  CultivationRegistrationRecord,
  PersistedWorldState,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
  TickRunRecord,
  WorldRepository,
} from "./world-repository.js";
import type { AuthClient } from "./auth-client.js";
import { hydrateMigratedP3WorldState } from "./world-shape.js";

export interface InMemoryWorldRepositoryOptions {
  world?: WorldState | PersistedWorldState;
  now?: () => string;
}

function normalizeAgentId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function issueCredential(): string {
  return `immortal_sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

function clearAgentCredentials(agentCredentials: Map<string, { agentId: string; lastSeenAt: string }>, agentId: string) {
  for (const [credential, entry] of agentCredentials.entries()) {
    if (entry.agentId === agentId) {
      agentCredentials.delete(credential);
    }
  }
}

export class InMemoryWorldRepository implements WorldRepository, AuthClient {
  private world: WorldState;
  private latestTickRun: TickRunRecord | null = null;
  private readonly now: () => string;
  private readonly agentProfiles = new Map<string, AgentProfileRecord>();
  private readonly agentCredentials = new Map<string, { agentId: string; lastSeenAt: string }>();

  constructor(options: InMemoryWorldRepositoryOptions = {}) {
    this.world = hydrateWorldState(hydrateMigratedP3WorldState(options.world ?? createSeedWorld()));
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async readWorld(): Promise<WorldState> {
    return structuredClone(this.world);
  }

  async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
    const draftWorld = structuredClone(this.world);
    const result = mutator(draftWorld);
    this.world = hydrateWorldState(toPersistedWorldState(draftWorld));
    return structuredClone(result);
  }

  async getWorldMetadata(): Promise<{ tick: number; updatedAt: string }> {
    return {
      tick: this.world.tick,
      updatedAt: this.world.updatedAt,
    };
  }

  async getCultivatorState(cultivatorId: string) {
    return getCultivatorState(this.world, cultivatorId);
  }

  async listAvailableActions(cultivatorId: string) {
    return listAvailableActions(this.world, cultivatorId);
  }

  async performAction(cultivatorId: string, actionId: ActionId, line?: string) {
    const draftWorld = structuredClone(this.world);
    try {
      const result = performAction(draftWorld, cultivatorId, actionId, line);
      this.world = hydrateWorldState(toPersistedWorldState(draftWorld));
      return structuredClone(result);
    } catch (error) {
      throw stampActionRejection(error);
    }
  }

  async advanceWorld(steps: number, trigger: TickRunRecord["trigger"] = "manual"): Promise<TickSummary> {
    const draftWorld = structuredClone(this.world);
    const summary = advanceWorld(draftWorld, steps);
    this.world = hydrateWorldState(toPersistedWorldState(draftWorld));
    this.latestTickRun = {
      tick: summary.tick,
      advancedTicks: summary.advancedTicks,
      recordedAt: this.now(),
      trigger,
    };
    return summary;
  }

  async getLatestTickRun(): Promise<TickRunRecord | null> {
    return this.latestTickRun ? { ...this.latestTickRun } : null;
  }

  async getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null> {
    return getCultivationRegistration(this.world, cultivatorId);
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    return [...this.agentProfiles.values()].map((profile) => structuredClone(profile));
  }

  async getAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const profile = this.agentProfiles.get(agentId);
    return profile ? structuredClone(profile) : null;
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
    const existingProfile = this.agentProfiles.get(normalizedAgentId) ?? null;

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
    this.agentProfiles.set(normalizedAgentId, profile);

    return structuredClone(profile);
  }

  async authenticateAgent(credential: string): Promise<AgentProfileRecord | null> {
    const normalizedCredential = credential.trim();
    if (!normalizedCredential) {
      return null;
    }

    const entry = this.agentCredentials.get(normalizedCredential);
    if (!entry) {
      return null;
    }

    const profile = this.agentProfiles.get(entry.agentId);
    if (!profile) {
      return null;
    }

    return structuredClone({
      ...profile,
      lastSeenAt: entry.lastSeenAt ?? profile.lastSeenAt,
    });
  }

  async issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const existingProfile = this.agentProfiles.get(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }

    clearAgentCredentials(this.agentCredentials, normalizedAgentId);
    const credential = issueCredential();
    this.agentCredentials.set(credential, {
      agentId: normalizedAgentId,
      lastSeenAt: this.now(),
    });

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
    if (!currentCredential.trim()) {
      throw new Error("currentCredential is required.");
    }

    const currentEntry = this.agentCredentials.get(currentCredential.trim());
    if (!currentEntry || currentEntry.agentId !== normalizedAgentId) {
      throw new Error("Current credential does not belong to the requested agent.");
    }

    clearAgentCredentials(this.agentCredentials, normalizedAgentId);
    const credential = issueCredential();
    const timestamp = this.now();
    this.agentCredentials.set(credential, {
      agentId: normalizedAgentId,
      lastSeenAt: timestamp,
    });

    const profile = this.agentProfiles.get(normalizedAgentId);
    if (!profile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }
    profile.updatedAt = timestamp;
    profile.lastSeenAt = timestamp;

    return {
      agentId: normalizedAgentId,
      credential,
    };
  }

  async touchAgent(agentId: string): Promise<void> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      return;
    }

    const timestamp = this.now();
    for (const entry of this.agentCredentials.values()) {
      if (entry.agentId === normalizedAgentId) {
        entry.lastSeenAt = timestamp;
      }
    }

    const profile = this.agentProfiles.get(normalizedAgentId);
    if (profile) {
      profile.updatedAt = timestamp;
      profile.lastSeenAt = timestamp;
    }
  }
}

export function createInMemoryWorldRepository(options: InMemoryWorldRepositoryOptions = {}) {
  return new InMemoryWorldRepository(options);
}
