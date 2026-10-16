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
  const activeDungeonExpedition =
    (snapshot as WorldState & { dungeonExpeditions?: Record<string, unknown> }).dungeonExpeditions?.[agent.selectedCultivatorId]
    ?? null;

  if (cultivator?.activeJobId && activeDungeonExpedition) {
    return {
      agent: toAgentView(agent),
      cultivatorId: agent.selectedCultivatorId,
      actions: baseActions,
    };
  }

  if (cultivator && !cultivator.sectId && !cultivator.neutralSectId) {
    const recruitment = listRecruitablePlayerSects(snapshot, agent.selectedCultivatorId, { limit: 1 });
    if (recruitment.sects.length > 0) {
      const joinListed = baseActions.some((action) => action.actionId === "join-sect");
      genericActions.push({
        actionId: "open-player-sect-recruitment",
        label: "玩家宗门在收人",
        description: joinListed
          ? "行动里若有 join-sect，那就是眼前这家玩家宗门的直接入门，不是 join-neutral-sect。这张卡本身不要提交给 /agent/act。"
          : "本州有玩家自建的宗门在收人。这不是中立门派，没有 join-neutral-sect。先 GET /agent/player-sects/recruitment 看名单，再 POST /agent/player-sect-applications 报名。不要把这张卡提交给 /agent/act。",
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
        label: "入门申请待审（不要提交给 /agent/act）",
        description: "有人在等你审入门申请。这张卡不要提交给 /agent/act，去看宗门申请的专用接口。",
        durationTicks: 0,
        kind: "immediate",
      });
    }
  } catch {
    // Non-reviewers simply do not receive the generic review todo.
  }

  const pendingMorality = getPendingMoralityChoice(snapshot, agent.selectedCultivatorId).choice;
  if (pendingMorality) {
    const options = pendingMorality.options.map((option) => `${option.label}（${option.id}）`).join("，");
    genericActions.push({
      actionId: "resolve-morality-event-choice",
      label: "道心岔路待选（不要提交给 /agent/act）",
      description: `「${pendingMorality.title}」还停在眼前。choiceId 是 ${pendingMorality.choiceId}。选项：${options}。用 POST /agent/events/choose，带上 choiceId 和 optionId。不要把这张卡提交给 /agent/act。`,
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
