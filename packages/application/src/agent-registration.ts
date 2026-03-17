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
import type {
  AgentCredentialResetResult,
  AgentProfileRecord,
  AgentProfileWriteInput,
  AgentRegistrationInput,
} from "../../persistence/src/world-repository.js";

export interface AgentRegistrationWorkflowRepository {
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
  saveAgentProfile(input: AgentProfileWriteInput): Promise<AgentProfileRecord>;
  issueAgentCredential(agentId: string): Promise<AgentCredentialResetResult>;
  getCultivatorState(cultivatorId: string): Promise<CultivatorStateView>;
  getCultivationRegistration(cultivatorId: string): Promise<CultivationRegistrationRecord | null>;
}

export interface RegisterAgentWorkflowOptions {
  repository: AgentRegistrationWorkflowRepository;
  input: AgentRegistrationInput;
  questionnaireSource: "answers" | "record";
  baseUrl: string;
}

export async function registerAgentWorkflow(
  options: RegisterAgentWorkflowOptions,
): Promise<AgentRegistrationResponse> {
  const { repository, input, questionnaireSource, baseUrl } = options;
  const agentId = crypto.randomUUID();
  const sync = await repository.transactWorld((world) => {
    const result = syncCultivatorFromPersona(world, {
      agentId,
      name: input.name.trim(),
      genderPresentation: input.genderPresentation,
      pronouns: input.pronouns,
      age: input.age,
      origin: input.origin,
      temperament: input.temperament,
      startingPath: input.startingPath,
    });

    if (input.record) {
      saveCultivationRegistration(world, result.selectedCultivatorId, input.record, agentId);
    }

    return result;
  });

  const payload = await repository.saveAgentProfile({
    agentId,
    name: input.name.trim(),
    selectedCultivatorId: sync.selectedCultivatorId,
    genderPresentation: input.genderPresentation,
    pronouns: input.pronouns,
    age: input.age,
    origin: input.origin,
    temperament: input.temperament,
    startingPath: input.startingPath,
  });
  const credential = await repository.issueAgentCredential(agentId);
  const [state, savedRecord] = await Promise.all([
    repository.getCultivatorState(payload.selectedCultivatorId),
    repository.getCultivationRegistration(payload.selectedCultivatorId),
  ]);
  const registrationProfile = savedRecord ? buildRegistrationProfile(savedRecord) : null;
  const messageDetails = registrationProfile
    ? [
        `Core temperament: ${registrationProfile.coreTemperament.label}.`,
        `Secondary temperament: ${registrationProfile.secondaryTemperament.label}.`,
        `Behavior aspect: ${registrationProfile.behaviorAspect.label}.`,
        `Spirit root: ${registrationProfile.spiritRoot.label}.`,
        `Cultivation motive: ${registrationProfile.cultivationMotive.label}.`,
      ].join(" ")
    : "";
  const messagePrefix =
    questionnaireSource === "answers"
      ? "Agent registered, questionnaire answers were processed, and cultivation record saved successfully."
      : "Agent registered and cultivation record saved successfully.";

  return {
    ok: true,
    agentId: payload.agentId,
    credential: credential.credential,
    baseUrl,
    selectedCultivatorId: payload.selectedCultivatorId,
    createdCultivator: sync.created,
    registration: state.registration,
    registrationEffects: state.registrationEffects,
    registrationProfile,
    message: `${messagePrefix}${messageDetails ? ` ${messageDetails}` : ""}`,
  };
}
