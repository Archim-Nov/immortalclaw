import {
  advanceWorld,
  createSeedWorld,
  getCultivationRegistration,
  getCultivatorState,
  listAvailableActions,
  performAction,
  saveCultivationRegistration,
  sendDirectMessage,
  syncCultivatorFromPersona,
} from "../../domain/src/runtime.js";
import type {
  ActionId,
  CultivationRegistrationRecord,
  Message,
  TickSummary,
  WorldState,
} from "../../domain/src/runtime.js";
import type {
  AgentCredentialResetResult,
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

function issueCredential(): string {
  return `immortal_sk_${crypto.randomUUID().replace(/-/g, "")}`;
}

function clearAgentCredentials(agentCredentials: Map<string, string>, agentId: string) {
  for (const [credential, storedAgentId] of agentCredentials.entries()) {
    if (storedAgentId === agentId) {
      agentCredentials.delete(credential);
    }
  }
}

export class InMemoryWorldRepository implements WorldRepository {
  private world: WorldState;
  private latestTickRun: TickRunRecord | null = null;
  private activeLock: TickLockRecord | null = null;
  private readonly now: () => string;
  private readonly agentProfiles = new Map<string, AgentProfileRecord>();
  private readonly agentCredentials = new Map<string, string>();

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
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error("Agent registration requires a name.");
    }

    const agentId = crypto.randomUUID();
    const timestamp = this.now();
    const existingProfile = this.agentProfiles.get(agentId) ?? null;
    const draftWorld = structuredClone(this.world);
    const sync = syncCultivatorFromPersona(draftWorld, {
      agentId,
      name: normalizedName,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    if (input.record) {
      saveCultivationRegistration(draftWorld, sync.selectedCultivatorId, input.record, agentId);
    }

    this.world = draftWorld;

    const profile: AgentProfileRecord = {
      agentId,
      name: normalizedName,
      selectedCultivatorId: sync.selectedCultivatorId,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns?.trim(),
      origin: input.origin?.trim(),
      temperament: input.temperament?.trim(),
      startingPath: input.startingPath,
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSeenAt: timestamp,
    };
    this.agentProfiles.set(agentId, profile);

    clearAgentCredentials(this.agentCredentials, agentId);
    const credential = issueCredential();
    this.agentCredentials.set(credential, agentId);

    return {
      ...structuredClone(profile),
      credential,
      createdCultivator: sync.created,
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

    const existingProfile = this.agentProfiles.get(normalizedAgentId);
    if (!existingProfile) {
      throw new Error(`Agent not found: ${normalizedAgentId}`);
    }
    if (this.agentCredentials.get(currentCredential.trim()) !== normalizedAgentId) {
      throw new Error("Current credential does not belong to the requested agent.");
    }

    clearAgentCredentials(this.agentCredentials, normalizedAgentId);
    const credential = issueCredential();
    this.agentCredentials.set(credential, normalizedAgentId);

    const timestamp = this.now();
    existingProfile.lastSeenAt = timestamp;
    existingProfile.updatedAt = timestamp;

    return {
      agentId: normalizedAgentId,
      credential,
    };
  }

  async authenticateAgent(credential: string): Promise<AgentProfileRecord | null> {
    const agentId = this.agentCredentials.get(credential.trim());
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

  async sendDirectMessage(
    fromCultivatorId: string,
    toCultivatorId: string,
    from: string,
    subject: string,
    content: string,
  ): Promise<Message> {
    return sendDirectMessage(this.world, fromCultivatorId, toCultivatorId, from, subject, content);
  }
}

export function createInMemoryWorldRepository(options: InMemoryWorldRepositoryOptions = {}) {
  return new InMemoryWorldRepository(options);
}
