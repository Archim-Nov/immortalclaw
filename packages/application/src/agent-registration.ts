import { buildRegistrationProfile } from "../../domain/src/runtime.js";
import type {
  CultivationRegistrationRecord,
  CultivatorStateView,
} from "../../domain/src/runtime.js";
import type { AgentRegistrationResponse } from "../../contracts/src/runtime-api.js";
import type {
  AgentRegistrationInput,
  AgentRegistrationResult,
} from "../../persistence/src/world-repository.js";

export interface AgentRegistrationWorkflowRepository {
  registerAgent(input: AgentRegistrationInput): Promise<AgentRegistrationResult>;
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
  const payload = await repository.registerAgent(input);
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
    credential: payload.credential,
    baseUrl,
    selectedCultivatorId: payload.selectedCultivatorId,
    createdCultivator: payload.createdCultivator,
    registration: state.registration,
    registrationEffects: state.registrationEffects,
    registrationProfile,
    message: `${messagePrefix}${messageDetails ? ` ${messageDetails}` : ""}`,
  };
}
