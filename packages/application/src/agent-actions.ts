import type { AgentActionsResponse } from "../../contracts/src/runtime-api.js";
import {
  getPendingMoralityChoice,
  listRecruitablePlayerSects,
  listSectApplications,
  type AvailableAction,
  type WorldState,
} from "../../domain/src/runtime.js";
import type { AgentProfileRecord } from "../../persistence/src/world-repository.js";
import { toAgentView } from "./agent-onboarding.js";

export interface AgentActionsRepository {
  readWorld(): Promise<WorldState>;
  listAvailableActions(cultivatorId: string): Promise<AvailableAction[]>;
}

export async function buildAuthenticatedAgentActions(options: {
  world: AgentActionsRepository;
  agent: AgentProfileRecord;
}): Promise<AgentActionsResponse> {
  const { world, agent } = options;
  const baseActions = await world.listAvailableActions(agent.selectedCultivatorId);
  const snapshot = await world.readWorld();
  const genericActions: AvailableAction[] = [];
  const cultivator = snapshot.cultivators[agent.selectedCultivatorId];

  if (cultivator && !cultivator.sectId && !cultivator.neutralSectId) {
    const recruitment = listRecruitablePlayerSects(snapshot, agent.selectedCultivatorId, { limit: 1 });
    if (recruitment.sects.length > 0) {
      genericActions.push({
        actionId: "open-player-sect-recruitment",
        label: "Open player sect recruitment",
        description: "Inspect player sects in the current state and decide whether to apply.",
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }

  try {
    const applications = listSectApplications(snapshot, agent.selectedCultivatorId, { limit: 1 });
    if (applications.applications.length > 0) {
      genericActions.push({
        actionId: "review-player-sect-applications",
        label: "Review player sect applications",
        description: "Open the sect application queue and process pending applicants.",
        durationTicks: 0,
        kind: "immediate",
      });
    }
  } catch {
    // Non-reviewers simply do not receive the generic review todo.
  }

  if (getPendingMoralityChoice(snapshot, agent.selectedCultivatorId).choice) {
    genericActions.push({
      actionId: "resolve-morality-event-choice",
      label: "Resolve morality event choice",
      description: "Open the pending crossroads event and choose how to act.",
      durationTicks: 0,
      kind: "immediate",
    });
  }

  const dedupedActions = [...baseActions];
  for (const action of genericActions) {
    if (!dedupedActions.some((existing) => existing.actionId === action.actionId)) {
      dedupedActions.push(action);
    }
  }

  return {
    agent: toAgentView(agent),
    cultivatorId: agent.selectedCultivatorId,
    actions: dedupedActions,
  };
}
