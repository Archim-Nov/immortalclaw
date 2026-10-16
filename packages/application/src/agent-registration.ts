import {
  saveCultivationRegistration,
  syncCultivatorFromPersona,
} from "../../domain/src/engine.js";
import { buildRegistrationProfile } from "../../domain/src/registration-questionnaire.js";
import type {
  CultivationRegistrationRecord,
  CultivatorStateView,
  WorldState,
} from "../../domain/src/runtime.js";
import type { AgentRegistrationResponse } from "../../contracts/src/runtime-api.js";
import { buildAgentPresentationCatalog } from "./agent-presentation.js";
import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
  AgentRegistrationInput,
} from "../../persistence/src/world-repository.js";
import type { AuthClient } from "../../persistence/src/auth-client.js";
import { issueWebhookSecret } from "../../persistence/src/webhook-secret.js";
import { buildAuthenticatedAgentState } from "./agent-onboarding.js";

export interface AgentRegistrationWorldRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}

export interface AgentRegistrationAuthClient extends Pick<AuthClient, "saveAgentProfile" | "issueAgentCredential"> {}

export interface RegisterAgentWorkflowOptions {
  world: AgentRegistrationWorldRepository;
  auth: AgentRegistrationAuthClient;
  input: AgentRegistrationInput;
  questionnaireSource: "answers" | "record";
  baseUrl: string;
}

function buildRegistrationMessage(options: {
  agentName: string;
  questionnaireSource: "answers" | "record";
  realm: string;
  realmPhase: string;
  location: string;
  status: string;
  readiness: string;
  recoveryState: string;
  onboardingStage: string;
  recommendedActions: readonly string[];
  registrationProfile: ReturnType<typeof buildRegistrationProfile> | null;
}): string {
  const {
    agentName,
    questionnaireSource,
    realm,
    realmPhase,
    location,
    status,
    readiness,
    recoveryState,
    onboardingStage,
    recommendedActions,
    registrationProfile,
  } = options;
  const nextAction = recommendedActions[0] ?? null;
  const messagePrefix =
    questionnaireSource === "answers"
      ? `Agent registered successfully from questionnaire answers. Identity confirmed as ${agentName}.`
      : `Agent registered successfully from a canonical registration record. Identity confirmed as ${agentName}.`;
  const stateSummary =
    `Current state: ${realm}${realmPhase}, location ${location}, status ${status}, readiness ${readiness}, recovery ${recoveryState}.`;
  const onboardingSummary =
    `Onboarding stage: ${onboardingStage}.${nextAction ? ` Recommended next action: ${nextAction}.` : ""}`;
  const temperamentSummary = registrationProfile
    ? [
        `Core temperament: ${registrationProfile.coreTemperament.label}.`,
        `Secondary temperament: ${registrationProfile.secondaryTemperament.label}.`,
        `Behavior aspect: ${registrationProfile.behaviorAspect.label}.`,
        `Spirit root: ${registrationProfile.spiritRoot.label}.`,
        `Cultivation motive: ${registrationProfile.cultivationMotive.label}.`,
      ].join(" ")
    : "";

  return [messagePrefix, stateSummary, onboardingSummary, temperamentSummary].filter(Boolean).join(" ");
}

export async function registerAgentWorkflow(
  options: RegisterAgentWorkflowOptions,
): Promise<AgentRegistrationResponse> {
  const { world, auth, input, questionnaireSource, baseUrl } = options;
  const agentId = crypto.randomUUID();
  const sync = await world.transactWorld((draftWorld) => {
    const result = syncCultivatorFromPersona(draftWorld, {
      agentId,
      name: input.name.trim(),
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

  const payload = await auth.saveAgentProfile({
    agentId,
    name: input.name.trim(),
    selectedCultivatorId: sync.selectedCultivatorId,
    genderPresentation: input.genderPresentation,
    pronouns: input.pronouns,
    age: input.age,
    origin: input.origin,
    temperament: input.temperament,
    webhookUrl: input.webhookUrl,
    webhookSecret: issueWebhookSecret(input.webhookUrl),
  });
  const credential = await auth.issueAgentCredential(agentId);
  const [state, savedRecord] = await Promise.all([
    buildAuthenticatedAgentState({
      world,
      agent: payload,
    }),
    world.getCultivationRegistration(payload.selectedCultivatorId),
  ]);
  const registrationProfile = savedRecord ? buildRegistrationProfile(savedRecord) : null;

  return {
    ok: true,
    ...state,
    agentId: payload.agentId,
    credential: credential.credential,
    baseUrl,
    selectedCultivatorId: payload.selectedCultivatorId,
    createdCultivator: sync.created,
    registrationProfile,
    presentation: buildAgentPresentationCatalog(),
    message: buildRegistrationMessage({
      agentName: state.agent.name,
      questionnaireSource,
      realm: state.cultivator.realm,
      realmPhase: state.cultivator.realmPhase,
      location: state.cultivator.location,
      status: state.cultivator.status,
      readiness: state.derivedState.readiness,
      recoveryState: state.derivedState.recoveryState,
      onboardingStage: state.onboarding.stage,
      recommendedActions: state.onboarding.recommendedActions,
      registrationProfile,
    }),
  };
}
