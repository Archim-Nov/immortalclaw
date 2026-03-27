import {
  getPendingMoralityChoice,
  resolveMoralityChoice,
  type PendingMoralityChoiceResponse,
  type ResolveMoralityChoiceResult,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";

export interface MoralityEventsRepository {
  readWorld(): Promise<WorldState>;
  transactWorld<TResult>(mutator: (world: WorldState) => TResult): Promise<TResult>;
}

export async function readAuthenticatedPendingMoralityChoice(options: {
  world: Pick<MoralityEventsRepository, "readWorld">;
  agent: AgentProfileRecord;
}): Promise<PendingMoralityChoiceResponse> {
  const { world, agent } = options;
  return getPendingMoralityChoice(await world.readWorld(), agent.selectedCultivatorId);
}

export async function chooseAuthenticatedMoralityChoice(options: {
  world: Pick<MoralityEventsRepository, "transactWorld">;
  agent: AgentProfileRecord;
  choiceId: string;
  optionId: string;
}): Promise<ResolveMoralityChoiceResult> {
  const { world, agent, choiceId, optionId } = options;
  return world.transactWorld((draftWorld) =>
    resolveMoralityChoice(draftWorld, agent.selectedCultivatorId, { choiceId, optionId }));
}
