import {
  advanceWorld,
  createSeedWorld,
  getCultivationRegistration,
  getCultivatorState,
  listAvailableActions,
  performAction,
  saveCultivationRegistration,
  syncCultivatorFromPersona,
} from "../../domain/src/runtime.js";
import type {
  ActionId,
  CultivationRegistrationRecord,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  AgentPersonaInput,
  AgentProfileRecord,
  AgentRegistrationInput,
  AgentRegistrationResult,
  TickLockRecord,
  TickRunRecord,
  WorldRepository,
} from "./world-repository.js";

export interface InMemoryWorldRepositoryOptions {
  world?: WorldState;
  now?: () => string;
}

function normalizeAgentId(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function issueApiKey(): string {
  return `immortal_sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

function clearAgentApiKeys(agentApiKeys: Map<string, string>, agentId: string) {
  for (const [apiKey, storedAgentId] of agentApiKeys.entries()) {
    if (storedAgentId === agentId) {
      agentApiKeys.delete(apiKey);
    }
  }
}

export class InMemoryWorldRepository implements WorldRepository {
  private world: WorldState;
  private latestTickRun: TickRunRecord | null = null;
  private activeLock: TickLockRecord | null = null;
  private readonly now: () => string;
  private readonly agentProfiles = new Map<string, AgentProfileRecord>();
  private readonly agentApiKeys = new Map<string, string>();

  constructor(options: InMemoryWorldRepositoryOptions = {}) {
    this.world = structuredClone(options.world ?? createSeedWorld());
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async readWorld(): Promise<WorldState> {
    return structuredClone(this.world);
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    return [...this.agentProfiles.values()].map((profile) => structuredClone(profile));
  }

  async getCultivatorState(cultivatorId: string) {
    return getCultivatorState(this.world, cultivatorId);
  }

  async listAvailableActions(cultivatorId: string) {
    return listAvailableActions(this.world, cultivatorId);
  }

  async performAction(cultivatorId: string, actionId: ActionId) {
    return performAction(this.world, cultivatorId, actionId);
  }

  async advanceWorld(steps: number, trigger: TickRunRecord["trigger"] = "manual"): Promise<TickSummary> {
    const summary = advanceWorld(this.world, steps);
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

  async acquireTickLock(ownerId: string): Promise<TickLockRecord | null> {
    if (this.activeLock) {
      return null;
    }

    const timestamp = this.now();
    const lock = {
      lockId: `tick-lock:${ownerId}:${timestamp}`,
      ownerId,
      acquiredAt: timestamp,
    };
    this.activeLock = lock;
    return { ...lock };
  }

  async releaseTickLock(lockId: string): Promise<void> {
    if (this.activeLock?.lockId === lockId) {
      this.activeLock = null;
    }
  }

  async registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult> {
    const agentId = normalizeAgentId(input.agentId) ?? `agent-${crypto.randomUUID()}`;
    const timestamp = this.now();
    const existingProfile = this.agentProfiles.get(agentId) ?? null;
    const sync = syncCultivatorFromPersona(this.world, {
      agentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    const profile: AgentProfileRecord = {
      agentId,
      name: input.name.trim(),
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
    };
    this.agentProfiles.set(agentId, profile);

    clearAgentApiKeys(this.agentApiKeys, agentId);
    const apiKey = issueApiKey();
    this.agentApiKeys.set(apiKey, agentId);

    return {
      ...structuredClone(profile),
      apiKey,
      createdCultivator: sync.created,
    };
  }

  async authenticateAgent(apiKey: string): Promise<AgentProfileRecord | null> {
    const agentId = this.agentApiKeys.get(apiKey.trim());
    if (!agentId) {
      return null;
    }
    const profile = this.agentProfiles.get(agentId);
    return profile ? structuredClone(profile) : null;
  }

  async syncAgentPersona(agentId: string, input: AgentPersonaInput): Promise<AgentProfileRecord> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const existingProfile = this.agentProfiles.get(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }

    const sync = syncCultivatorFromPersona(this.world, {
      agentId: normalizedAgentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

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
    this.agentProfiles.set(normalizedAgentId, updatedProfile);
    return structuredClone(updatedProfile);
  }

  async touchAgent(agentId: string): Promise<void> {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      return;
    }
    const profile = this.agentProfiles.get(normalizedAgentId);
    if (!profile) {
      return;
    }
    profile.lastSeenAt = this.now();
    profile.updatedAt = profile.lastSeenAt;
  }

  async syncPersona(agentId: string, input: AgentPersonaInput) {
    const normalizedAgentId = normalizeAgentId(agentId);
    if (!normalizedAgentId) {
      throw new Error("agentId is required.");
    }

    const sync = syncCultivatorFromPersona(this.world, {
      agentId: normalizedAgentId,
      name: input.name,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    const existingProfile = this.agentProfiles.get(normalizedAgentId);
    if (existingProfile) {
      this.agentProfiles.set(normalizedAgentId, {
        ...existingProfile,
        name: input.name.trim(),
        selectedCultivatorId: sync.selectedCultivatorId,
        genderPresentation: input.genderPresentation ?? existingProfile.genderPresentation,
        pronouns: input.pronouns?.trim() ?? existingProfile.pronouns,
        origin: input.origin?.trim() ?? existingProfile.origin,
        temperament: input.temperament?.trim() ?? existingProfile.temperament,
        startingPath: input.startingPath ?? existingProfile.startingPath,
        updatedAt: this.now(),
      });
    }

    return structuredClone(sync);
  }

  async getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null> {
    return getCultivationRegistration(this.world, cultivatorId);
  }

  async saveCultivationRegistration(
    cultivatorId: string,
    record: CultivationRegistrationRecord,
    savedByAgentId?: string | null,
  ): Promise<CultivationRegistrationRecord> {
    return saveCultivationRegistration(this.world, cultivatorId, record, savedByAgentId);
  }
}

export function createInMemoryWorldRepository(options: InMemoryWorldRepositoryOptions = {}) {
  return new InMemoryWorldRepository(options);
}
