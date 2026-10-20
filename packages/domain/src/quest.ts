import {
  BASE_QUEST_TEMPLATES,
  HIGH_RISK_QUEST_TEMPLATES,
  MAX_ACTIVE_BASE_QUESTS,
  MAX_ACTIVE_SECT_QUESTS,
  QUEST_BOARD_REFRESH_INTERVAL,
  QUEST_BOARD_SLOTS_BY_NODE_TYPE,
  SECT_QUEST_TEMPLATES,
  SECT_TITLE_UPDATE_INTERVAL,
} from "./constants.js";
import { polishEmbeddedNames } from "./facing-names.js";
import type {
  ActiveQuest,
  AcceptQuestActionId,
  Cultivator,
  ExecuteQuestActionId,
  QuestBoard,
  QuestActionId,
  QuestActionPhase,
  QuestInstance,
  QuestTemplate,
  SectTitle,
  WorldState,
} from "./model.js";

const hashString = (input: string) =>
  Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const currentStateIdOf = (cultivator: Cultivator) => cultivator.locationId.split(":")[0] as keyof Cultivator["stateReputation"];

function addCurrentStateReputation(cultivator: Cultivator, delta: number) {
  const stateId = currentStateIdOf(cultivator);
  cultivator.stateReputation[stateId] = Math.max(0, (cultivator.stateReputation[stateId] ?? 0) + delta);
}

function rewardValueFor(template: QuestTemplate, seed: string): number {
  const range = template.reward.spiritStones;
  if (range.max <= range.min) return range.min;
  const roll = hashString(seed) % (range.max - range.min + 1);
  return range.min + roll;
}

function questSlotsForLocation(location: WorldState["locations"][string]): number {
  return QUEST_BOARD_SLOTS_BY_NODE_TYPE[location.nodeType as keyof typeof QUEST_BOARD_SLOTS_BY_NODE_TYPE] ?? 0;
}

function pickTemplate(
  location: WorldState["locations"][string],
  tick: number,
  slotIndex: number,
): QuestTemplate {
  const slotSeed = `${location.id}:${tick}:${slotIndex}`;
  if (location.nodeType === "main-city") {
    const highRiskRoll = hashString(`${slotSeed}:high-risk`) % 100;
    if (highRiskRoll < 25) {
      return HIGH_RISK_QUEST_TEMPLATES[hashString(`${slotSeed}:high-risk-pick`) % HIGH_RISK_QUEST_TEMPLATES.length]!;
    }
    const baseCandidates = BASE_QUEST_TEMPLATES.filter((template) =>
      template.sourceNodeTypes.includes(location.nodeType as QuestTemplate["sourceNodeTypes"][number]),
    );
    return baseCandidates[hashString(`${slotSeed}:base`) % baseCandidates.length]!;
  }

  const baseCandidates = BASE_QUEST_TEMPLATES.filter((template) =>
    template.sourceNodeTypes.includes(location.nodeType as QuestTemplate["sourceNodeTypes"][number]),
  );
  return baseCandidates[hashString(`${slotSeed}:base`) % baseCandidates.length]!;
}

function instantiateQuest(template: QuestTemplate, locationId: string, tick: number, slotIndex: number): QuestInstance {
  const instanceId = `quest:${locationId}:${tick}:${slotIndex}:${template.id}`;
  const spiritStones = rewardValueFor(template, `${instanceId}:reward`);
  return {
    id: instanceId,
    templateId: template.id,
    type: template.type,
    category: template.category,
    locationId,
    boardIndex: slotIndex,
    name: template.name,
    nameCn: template.nameCn,
    description: template.description,
    durationTicks: template.durationTicks,
    reward: {
      spiritStones,
      reputation: template.reward.reputation,
      contribution: template.reward.contribution,
    },
    failurePenalty: template.failurePenalty,
    successRate: template.successRate,
    generatedAtTick: tick,
    expiresAtTick: tick + QUEST_BOARD_REFRESH_INTERVAL,
  };
}

export function buildQuestActionId(
  phase: QuestActionPhase,
  questType: string,
  index: number,
): QuestActionId {
  return `quest:${phase}:${questType}:${index}`;
}

export function parseQuestActionId(actionId: string): {
  phase: QuestActionPhase;
  questType: string;
  index: number;
} | null {
  if (!actionId.startsWith("quest:")) {
    return null;
  }
  const [prefix, phase, ...rest] = actionId.split(":");
  if (prefix !== "quest" || (phase !== "accept" && phase !== "execute") || rest.length < 2) {
    return null;
  }
  const indexRaw = rest.at(-1) ?? "";
  const index = Number.parseInt(indexRaw, 10);
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  const questType = rest.slice(0, -1).join(":");
  if (!questType) {
    return null;
  }
  return { phase, questType, index };
}

export function buildAcceptQuestActionId(questType: string, boardIndex: number): AcceptQuestActionId {
  return buildQuestActionId("accept", questType, boardIndex) as AcceptQuestActionId;
}

export function buildExecuteQuestActionId(questType: string, activeIndex: number): ExecuteQuestActionId {
  return buildQuestActionId("execute", questType, activeIndex) as ExecuteQuestActionId;
}

export function refreshQuestBoard(world: WorldState, locationId: string): QuestBoard {
  const location = world.locations[locationId];
  if (!location) throw new Error(`Location not found: ${locationId}`);
  const slots = questSlotsForLocation(location);
  const quests: QuestInstance[] = [];
  for (let i = 0; i < slots; i += 1) {
    const template = pickTemplate(location, world.tick, i);
    quests.push(instantiateQuest(template, locationId, world.tick, i));
  }
  const board: QuestBoard = {
    locationId,
    slots,
    quests,
    lastRefreshedTick: world.tick,
  };
  world.questBoards[locationId] = board;
  return board;
}

export function seedQuestBoards(world: WorldState): Record<string, QuestBoard> {
  const boards: Record<string, QuestBoard> = {};
  for (const [locationId, location] of Object.entries(world.locations)) {
    const slots = questSlotsForLocation(location);
    if (slots <= 0) continue;
    boards[locationId] = {
      locationId,
      slots,
      quests: [],
      lastRefreshedTick: -QUEST_BOARD_REFRESH_INTERVAL,
    };
  }
  world.questBoards = boards;
  for (const locationId of Object.keys(boards)) {
    refreshQuestBoard(world, locationId);
  }
  return world.questBoards;
}

export function refreshQuestBoardsIfDue(world: WorldState): void {
  for (const [locationId, board] of Object.entries(world.questBoards)) {
    if (world.tick - board.lastRefreshedTick >= QUEST_BOARD_REFRESH_INTERVAL) {
      refreshQuestBoard(world, locationId);
    }
  }
}

export function getQuestBoard(world: WorldState, locationId: string): QuestBoard | null {
  return world.questBoards[locationId] ?? null;
}

const QUEST_FACING_TEMPLATES = [...BASE_QUEST_TEMPLATES, ...HIGH_RISK_QUEST_TEMPLATES, ...SECT_QUEST_TEMPLATES];

/** Names that used to be design labels. Old saves still store them. */
const RETIRED_QUEST_NAMES: Record<string, string> = {
  "强事件线索": "凶险传闻",
  "州内精英任务": "州府急务",
};

function publicQuestName(name: string): string {
  return RETIRED_QUEST_NAMES[name] ?? name;
}

export function questFacingName(quest: { name: string; nameCn?: string; templateId?: string; type?: string }): string {
  if (quest.nameCn && /[\u4e00-\u9fff]/u.test(quest.nameCn)) return publicQuestName(polishEmbeddedNames(quest.nameCn));
  const byId = quest.templateId
    ? QUEST_FACING_TEMPLATES.find((entry) => entry.id === quest.templateId)
    : undefined;
  const byType = !byId && quest.type
    ? QUEST_FACING_TEMPLATES.find((entry) => entry.type === quest.type)
    : undefined;
  const templateName = byId?.nameCn ?? byType?.nameCn;
  if (templateName) return publicQuestName(polishEmbeddedNames(templateName));
  if (/[\u4e00-\u9fff]/u.test(quest.name)) return publicQuestName(polishEmbeddedNames(quest.name));
  return "这一桩事务";
}

export function questFacingDescription(quest: { description?: string | null; templateId?: string; type?: string }): string {
  const stored = quest.description?.trim() ?? "";
  if (stored && /[\u4e00-\u9fff]/u.test(stored)) return polishEmbeddedNames(stored);
  const byId = quest.templateId
    ? QUEST_FACING_TEMPLATES.find((entry) => entry.id === quest.templateId)
    : undefined;
  const byType = quest.type
    ? QUEST_FACING_TEMPLATES.find((entry) => entry.type === quest.type)
    : undefined;
  return polishEmbeddedNames(byId?.description ?? byType?.description ?? "把这桩事务做完。");
}

export function acceptQuest(world: WorldState, cultivator: Cultivator, questType: string, boardIndex: number): ActiveQuest {
  const board = world.questBoards[cultivator.locationId];
  if (!board) throw new Error("No quest board available at current location.");

  const instanceIndex = board.quests.findIndex((quest) => quest.type === questType && quest.boardIndex === boardIndex);
  if (instanceIndex < 0) throw new Error(`Quest instance not found on current board: ${questType}:${boardIndex}`);

  const instance = board.quests[instanceIndex]!;
  const baseCount = cultivator.activeQuests.filter((quest) => quest.category === "base").length;
  const sectCount = cultivator.activeQuests.filter((quest) => quest.category === "sect").length;
  if (instance.category === "base" && baseCount >= MAX_ACTIVE_BASE_QUESTS) {
    throw new Error(`Maximum active base quests reached (${MAX_ACTIVE_BASE_QUESTS}).`);
  }
  if (instance.category === "sect" && sectCount >= MAX_ACTIVE_SECT_QUESTS) {
    throw new Error(`Maximum active sect quests reached (${MAX_ACTIVE_SECT_QUESTS}).`);
  }
  if (instance.category === "sect" && !cultivator.sectId) {
    throw new Error("Sect quests require sect membership.");
  }

  const activeQuest: ActiveQuest = {
    id: `active:${cultivator.id}:${instance.id}:${world.tick}`,
    instanceId: instance.id,
    templateId: instance.templateId,
    type: instance.type,
    category: instance.category,
    boardIndex: instance.boardIndex,
    name: instance.name,
    nameCn: instance.nameCn,
    description: instance.description,
    durationTicks: instance.durationTicks,
    reward: instance.reward,
    failurePenalty: instance.failurePenalty,
    successRate: instance.successRate,
    acceptedAtTick: world.tick,
    status: "accepted",
    locationId: cultivator.locationId,
  };

  board.quests.splice(instanceIndex, 1);
  cultivator.activeQuests.push(activeQuest);
  return activeQuest;
}

export function markQuestInProgress(cultivator: Cultivator, activeQuestId: string): ActiveQuest {
  const quest = cultivator.activeQuests.find((candidate) => candidate.id === activeQuestId);
  if (!quest) throw new Error(`Active quest not found: ${activeQuestId}`);
  quest.status = "in-progress";
  return quest;
}

export function getActiveQuestByReadableIndex(cultivator: Cultivator, questType: string, activeIndex: number): ActiveQuest | null {
  const quest = cultivator.activeQuests[activeIndex] ?? null;
  if (!quest || quest.type !== questType) {
    return null;
  }
  return quest;
}

export function getActiveQuest(cultivator: Cultivator, activeQuestId: string): ActiveQuest | null {
  return cultivator.activeQuests.find((quest) => quest.id === activeQuestId) ?? null;
}

export interface QuestResolution {
  success: boolean;
  quest: ActiveQuest;
  spiritStoneDelta: number;
  injuryTicks: number;
  reputationDelta: number;
  contributionDelta: number;
}

export function questOutcomeSentence(input: {
  cultivatorName: string;
  quest: { name: string; nameCn?: string; templateId?: string; type?: string };
  success: boolean;
  spiritStoneDelta: number;
  injuryTicks: number;
  woundTicksRemaining: number;
  reputationDelta: number;
  contributionDelta: number;
}): string {
  const questName = questFacingName(input.quest);
  if (input.success) {
    const fame = input.reputationDelta > 0 ? `，本州声望涨了${input.reputationDelta}` : "";
    const merit = input.contributionDelta > 0 ? `，宗门贡献加了${input.contributionDelta}` : "";
    return `${input.cultivatorName}把「${questName}」做完了，得了${input.spiritStoneDelta}灵石${fame}${merit}。`;
  }
  const hurt = input.injuryTicks > 0
    ? `这一趟挂了伤，还要养${input.woundTicksRemaining}刻。`
    : "这一趟没有挂上新伤。";
  const stones = input.spiritStoneDelta < 0
    ? `灵石少了${-input.spiritStoneDelta}。`
    : "灵石没少。";
  return `${input.cultivatorName}没能做成「${questName}」。${hurt}${stones}`;
}

export function resolveActiveQuest(
  world: WorldState,
  cultivator: Cultivator,
  activeQuestId: string,
  seed: string,
): QuestResolution {
  const questIndex = cultivator.activeQuests.findIndex((candidate) => candidate.id === activeQuestId);
  if (questIndex < 0) throw new Error(`Active quest not found: ${activeQuestId}`);
  const quest = cultivator.activeQuests[questIndex]!;

  const roll = hashString(seed) % 100;
  const success = roll < clamp(quest.successRate, 0, 100);
  let spiritStoneDelta = 0;
  let injuryTicks = 0;
  let reputationDelta = 0;
  let contributionDelta = 0;

  if (success) {
    spiritStoneDelta = quest.reward.spiritStones;
    cultivator.spiritStones += spiritStoneDelta;
    reputationDelta = quest.reward.reputation;
    addCurrentStateReputation(cultivator, reputationDelta);
    if (quest.category === "base") {
      cultivator.completedBaseQuests += 1;
    }
    cultivator.realmProgress = Math.min(100, cultivator.realmProgress + (quest.category === "high-risk" ? 6 : 3));
    if (quest.category === "sect" && quest.reward.contribution > 0) {
      contributionDelta = quest.reward.contribution;
      const previousContribution = cultivator.totalContribution;
      cultivator.totalContribution += contributionDelta;
      if (cultivator.totalContribution > previousContribution) {
        cultivator.contributionReachedAt = world.tick;
      }
    }
  } else {
    injuryTicks = quest.failurePenalty.injuryTicks;
    const loss = Math.min(cultivator.spiritStones, quest.failurePenalty.spiritStoneLoss);
    cultivator.spiritStones -= loss;
    spiritStoneDelta = -loss;
  }

  cultivator.activeQuests.splice(questIndex, 1);
  return { success, quest, spiritStoneDelta, injuryTicks, reputationDelta, contributionDelta };
}

function titlePriority(contribution: number): SectTitle {
  if (contribution >= 1500) return "长老";
  if (contribution >= 600) return "精英";
  if (contribution >= 200) return "内门";
  return "外门";
}

function addTitleLog(world: WorldState, cultivatorId: string, title: string, content: string, tags: string[]) {
  world.daoLogs.unshift({ id: `log-${world.nextLogSequence++}`, cultivatorId, tick: world.tick, title, content, tags });
}

function recalculateSectTitles(world: WorldState, sectId: string): void {
  const sect = world.sects[sectId];
  if (!sect) return;

  const members = sect.memberIds
    .map((memberId) => world.cultivators[memberId])
    .filter((candidate): candidate is Cultivator => Boolean(candidate));

  const sorted = [...members].sort((left, right) => {
    if (right.totalContribution !== left.totalContribution) {
      return right.totalContribution - left.totalContribution;
    }
    if (left.contributionReachedAt !== right.contributionReachedAt) {
      return left.contributionReachedAt - right.contributionReachedAt;
    }
    return left.id.localeCompare(right.id);
  });
  const founder = sect.founderCultivatorId
    ? members.find((member) => member.id === sect.founderCultivatorId) ?? null
    : null;
  const rankedMembers = founder ? sorted.filter((member) => member.id !== founder.id) : sorted;

  let innerSlots = sect.titleSlots.find((slot) => slot.title === "内门")?.maxSlots ?? 32;
  let eliteSlots = sect.titleSlots.find((slot) => slot.title === "精英")?.maxSlots ?? 16;
  let elderSlots = sect.titleSlots.find((slot) => slot.title === "长老")?.maxSlots ?? 4;

  if (founder) {
    founder.sectTitle = "宗主";
  }

  for (const member of rankedMembers) {
    const desired = titlePriority(member.totalContribution);
    let assigned: SectTitle = "外门";
    if (desired === "长老" && elderSlots > 0) {
      assigned = "长老";
      elderSlots -= 1;
    } else if ((desired === "长老" || desired === "精英") && eliteSlots > 0) {
      assigned = "精英";
      eliteSlots -= 1;
    } else if ((desired === "长老" || desired === "精英" || desired === "内门") && innerSlots > 0) {
      assigned = "内门";
      innerSlots -= 1;
    }
    if (assigned !== member.sectTitle) {
      addTitleLog(world, member.id, "宗门头衔变更", `${member.name} 的宗门头衔从「${member.sectTitle}」变为「${assigned}」。`, ["sect", "title-update", `title-${assigned}`]);
    }
    member.sectTitle = assigned;
  }
}

export function updateSectTitles(world: WorldState): void {
  for (const sectId of Object.keys(world.sects)) {
    recalculateSectTitles(world, sectId);
    world.sects[sectId]!.lastTitleUpdateTick = world.tick;
  }
}

export function updateSectTitlesIfDue(world: WorldState): void {
  for (const [sectId, sect] of Object.entries(world.sects)) {
    if (world.tick - sect.lastTitleUpdateTick >= (sect.titleUpdateInterval || SECT_TITLE_UPDATE_INTERVAL)) {
      recalculateSectTitles(world, sectId);
      sect.lastTitleUpdateTick = world.tick;
    }
  }
}
