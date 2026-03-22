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
  AgentProfileRecord,
  AgentProfileWriteInput,
  AgentRegistrationInput,
  AgentRegistrationResult,
  TickLockRecord,
  TickRunRecord,
  WorldRepository,
} from "./world-repository.js";
import { issueWebhookSecret } from "./webhook-secret.js";

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

  async transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult> {
    const draftWorld = structuredClone(this.world);
    const result = mutator(draftWorld);
    this.world = draftWorld;
    return structuredClone(result);
  }

  async listAgentProfiles(): Promise<AgentProfileRecord[]> {
    return [...this.agentProfiles.values()].map((profile) => structuredClone(profile));
  }

  async getAgentProfile(agentId: string): Promise<AgentProfileRecord | null> {
    const profile = this.agentProfiles.get(agentId);
    return profile ? structuredClone(profile) : null;
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
      webhookSecret: input.webhookSecret ?? existingProfile?.webhookSecret ?? null,
      createdAt: existingProfile?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSeenAt: input.lastSeenAt ?? existingProfile?.lastSeenAt ?? timestamp,
    };
    this.agentProfiles.set(normalizedAgentId, profile);

    return structuredClone(profile);
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
    this.agentCredentials.set(credential, normalizedAgentId);

    return {
      agentId: normalizedAgentId,
      credential,
    };
  }

  async registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult> {
    const normalizedName = input.name.trim();
    if (!normalizedName) {
      throw new Error("Agent registration requires a name.");
    }

    const agentId = crypto.randomUUID();
    const sync = await this.transactWorld((draftWorld) => {
      const result = syncCultivatorFromPersona(draftWorld, {
        agentId,
        name: normalizedName,
        genderPresentation: input.genderPresentation,
        pronouns: input.pronouns,
        age: input.age,
        origin: input.origin,
        temperament: input.temperament,
      });

      if (input.record) {
        saveCultivationRegistration(draftWorld, result.selectedCultivatorId, input.record, agentId);
      }

      return result;
    });

    const profile = await this.saveAgentProfile({
      agentId,
      name: normalizedName,
      selectedCultivatorId: sync.selectedCultivatorId,
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      webhookUrl: input.webhookUrl,
      webhookSecret: issueWebhookSecret(input.webhookUrl),
    });

    const credential = await this.issueAgentCredential(agentId);

    return {
      ...profile,
      credential: credential.credential,
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
