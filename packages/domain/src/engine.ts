import type {
  AgentBinding, AgentPersonaSyncResult, ActionExecutionResult, ActionId, ActionJob, AvailableAction, CharacterSummary,
  BreakthroughCategory, BreakthroughRateModifier, BreakthroughRecord, BreakthroughStateView,
  CombatLogEntry, CultivationRegistrationRecord, CultivationRegistrationView, Cultivator, CultivatorStateView,
  CreateCultivatorInput, DecisionPolicyView, DungeonExpeditionProgress, DungeonExpeditionReport, DungeonExpeditionStateView, DungeonGrade, DungeonRank, DungeonRankYieldHint, DungeonStateView, EventEffect, FiveElementId, ItemId, Message, RealmPhase, RegistrationAnswer,
  MoralityAlignment, PendingMoralityChoiceResponse, PlayerSectFoundingBlockerCode, PlayerSectFoundingOptionsView,
  FoundPlayerSectResult, NeutralSect, OrganizationInfoView, PlayerSectApplicationResult,
  ResolveMoralityChoiceResult,
  PlayerSectRecruitmentListView, RegistrationGameplayEffectsView, RegistrationGameplayModifierView,
  ReviewSectApplicationResult, Sect, SectAdmissionPolicy, SectApplication, SectApplicationListView,
  SectApplicationView, SectMotiveBucketId, SectReapplyCooldown, SectTitle, StatusEffect, TimedActionId,
  StrategySnapshot, TickSummary, UpdateSectAdmissionPolicyResult, WorldEvent, WorldState, OnboardingProgress,
  OnboardingStage, RegistrationCultivationMotiveId, ResidenceActionId, RegistrationQuestionId,
} from "./model.js";
import {
  DEFAULT_ACTION_DURATIONS,
  PLAYER_SECT_APPLICATION_TTL,
  PLAYER_SECT_FOUNDING_REPUTATION_COST,
  PLAYER_SECT_FOUNDING_STONE_COST,
  PLAYER_SECT_MOTIVE_BUCKET_LABELS,
  PLAYER_SECT_PAGE_LIMIT,
  PLAYER_SECT_MOTIVE_BUCKETS,
  PLAYER_SECT_NAME_MAX_LENGTH,
  PLAYER_SECT_NAME_MIN_LENGTH,
  PLAYER_SECT_POLICY_UPDATE_COOLDOWN,
  RESIDENCE_PRODUCTION_RECIPES,
  SECT_TITLE_SLOTS,
  SECT_TITLE_UPDATE_INTERVAL,
  STARTER_STATES,
  type StateId,
} from "./constants.js";
import {
  applyEventEffectBundle,
  applyEventEffects,
  drawEvent,
  drawNodeSpecificEvent,
  eventSeverityOf,
  type EventSourceType,
} from "./events.js";
import { repairCultivatorRealm } from "./realms.js";
import {
  acceptQuest,
  getActiveQuest,
  getQuestBoard,
  markQuestInProgress,
  refreshQuestBoardsIfDue,
  resolveActiveQuest,
  updateSectTitles,
  updateSectTitlesIfDue,
} from "./quest.js";
import {
  canCraftResidenceRecipe,
  consumeResidenceRecipeInputs,
  getFirstCraftableResidenceRecipe,
  getResidenceRecipeById,
  isAtResidence,
  requireResidenceActionAllowed,
} from "./residence.js";
import {
  computeActivityContext,
  computeDaoPotential,
  computeReadiness,
  computeRecoveryState,
} from "./economy.js";
import { getActiveFactionWarForState, recordFactionWarContribution } from "./faction-war.js";
import {
  canUnlockGuixuNode,
  getCultivatorUnlockedGuixuNodeIds,
  getGuixuNodeById,
  isGuixuNodeUnlockedForCultivator,
  listGuixuNodesForLocation,
  pickGuixuEventId,
  resolveGuixuExploration,
  unlockGuixuNode,
} from "./guixu-service.js";
import {
  resolveBehaviorAspectId,
  normalizeCultivationRegistrationRecord,
  resolveCultivationMotiveId,
  resolveSpiritRootKindId,
  resolveTemperamentId,
} from "./registration-taxonomy.js";
import { getItemActionBinding, getItemOperationActionId } from "./items/catalog.js";
import { createDungeonProgress, createEmptyInventory, createFactionReputation, createStateReputation } from "./seed.js";
import { buildSectLevel, sectBonusValue } from "./sect-level.js";
import {
  buildFullTopology,
  getDistance,
  getNeighbors,
  toSectOutpostLocationId,
  type TopologyGraph as RuntimeTopologyGraph,
} from "./topology.js";
import {
  applyWildernessPressure,
  canEnterWilderness,
  enterWildernessExpedition,
  getActiveWildernessProgress,
  getWildernessLayerById,
  getWildernessLayerForLocation,
  pickWildernessSurveyEventId,
  resolveWildernessSurvey,
  withdrawFromWilderness,
} from "./wilderness-service.js";
import {
  buildDungeonExpeditionStateView,
  buildDungeonRankYieldHints,
  chooseDungeonExpeditionStepKind,
  createDungeonExpeditionProgress,
  createDungeonExpeditionReport,
  describeDungeonExpeditionAction,
  DUNGEON_EXPEDITION_DURATION_TICKS,
  DUNGEON_EXPEDITION_MAX_STEPS,
  DUNGEON_EXPEDITION_POLICIES,
  DUNGEON_EXPEDITION_STEP_TICKS,
  getActiveDungeonExpedition,
  isAbortDungeonExpeditionAction,
  isDungeonExpeditionCatastrophic,
  parseStartDungeonExpeditionActionId,
  recordDungeonExpeditionStep,
  shouldRetreatDungeonExpedition,
  startDungeonExpeditionActionIdOf,
} from "./dungeon-expedition-service.js";

const TICKS_PER_YEAR = 4380;
const TIMED_ACTION_IDS = new Set<string>(Object.keys(DEFAULT_ACTION_DURATIONS));
const DEFAULT_STARTER_STATE = STARTER_STATES[0];
const ELEMENT_LABELS: Record<FiveElementId, string> = {
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  fire: "Fire",
  earth: "Earth",
};
const BREAKTHROUGH_PROGRESS_REQUIRED = 100;
const BREAKTHROUGH_FAILURE_PROGRESS = 60;
const BREAKTHROUGH_MIN_RATE = 20;
const BREAKTHROUGH_MAX_RATE = 90;
const DUNGEON_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const satisfies readonly DungeonRank[];
type BreakthroughDefinition = {
  category: BreakthroughCategory;
  targetRealm: Cultivator["realm"];
  targetLevel: number;
  commonItemId: ItemId;
  commonCount: number;
  specialItemId: ItemId;
  specialCount: number;
  durationTicks: number;
  baseSuccessRate: number | null;
};
const REALM_QI = "炼气" as Cultivator["realm"];
const REALM_FOUNDATION = "筑基" as Cultivator["realm"];
const REALM_CORE = "金丹" as Cultivator["realm"];
type DungeonNodeType = "dungeon-c" | "dungeon-b" | "dungeon-a";
type DungeonTuning = {
  threatBase: number;
  threatVariance: number;
  spiritStoneBase: number;
  spiritStoneVariance: number;
  fragmentBase: number;
  fragmentVariance: number;
  realmProgressReward: number;
  wardReward: number;
  defeatQiBase: number;
  defeatQiVariance: number;
  defeatInjuryTicks: number;
  poisonTicks: number;
};
const DUNGEON_META_BY_NODE_TYPE: Record<DungeonNodeType, {
  grade: DungeonGrade;
  minRealm: Cultivator["realm"];
  materialBand: ItemId;
}> = {
  "dungeon-c": { grade: "丙", minRealm: REALM_QI, materialBand: "qi-common" },
  "dungeon-b": { grade: "乙", minRealm: REALM_FOUNDATION, materialBand: "foundation-common" },
  "dungeon-a": { grade: "甲", minRealm: REALM_CORE, materialBand: "core-common" },
};
const REALM_ORDER = {
  炼气: 0,
  筑基: 1,
  金丹: 2,
} satisfies Record<Cultivator["realm"], number>;
const LEGACY_DUNGEON_GUARDIAN_TUNING: Record<DungeonNodeType, DungeonTuning> = {
  "dungeon-c": {
    threatBase: 156,
    threatVariance: 12,
    spiritStoneBase: 90,
    spiritStoneVariance: 24,
    fragmentBase: 1,
    fragmentVariance: 1,
    realmProgressReward: 8,
    wardReward: 1,
    defeatQiBase: 24,
    defeatQiVariance: 6,
    defeatInjuryTicks: 4,
    poisonTicks: 0,
  },
  "dungeon-b": {
    threatBase: 176,
    threatVariance: 18,
    spiritStoneBase: 132,
    spiritStoneVariance: 30,
    fragmentBase: 1,
    fragmentVariance: 2,
    realmProgressReward: 12,
    wardReward: 1,
    defeatQiBase: 30,
    defeatQiVariance: 8,
    defeatInjuryTicks: 6,
    poisonTicks: 2,
  },
  "dungeon-a": {
    threatBase: 198,
    threatVariance: 24,
    spiritStoneBase: 180,
    spiritStoneVariance: 42,
    fragmentBase: 2,
    fragmentVariance: 2,
    realmProgressReward: 16,
    wardReward: 1,
    defeatQiBase: 38,
    defeatQiVariance: 10,
    defeatInjuryTicks: 8,
    poisonTicks: 4,
  },
};
const REALM_PHASES: readonly RealmPhase[] = ["\u524d\u671f", "\u4e2d\u671f", "\u540e\u671f"];
const ONBOARDING_STAGE_ORDER: readonly OnboardingStage[] = [
  "registered",
  "first-action",
  "first-travel",
  "first-quest",
  "first-residence-cultivation",
  "first-breakthrough",
  "completed",
];
const DECISION_POLICY_PRIORITY_ORDER: readonly DecisionPolicyView["priorityOrder"][number][] = [
  "owner-command",
  "safety",
  "runtime-guidance",
  "onboarding",
  "free-exploration",
];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hashString = (input: string) => Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
const realmPhaseOfLevel = (realmLevel: number): RealmPhase => {
  const normalizedLevel = Math.max(1, Math.floor(realmLevel));
  return REALM_PHASES[(normalizedLevel - 1) % REALM_PHASES.length]!;
};
const travelActionIdOf = (locationId: string) => `travel-to:${locationId}` as const;
const parseTravelDestination = (actionId: ActionId) => actionId.startsWith("travel-to:") ? actionId.slice("travel-to:".length) : null;
const parseEnterWildernessLayer = (actionId: ActionId) => actionId.startsWith("enter-wilderness:") ? actionId.slice("enter-wilderness:".length) : null;
const parseUnlockGuixuNode = (actionId: ActionId) => actionId.startsWith("unlock-guixu:") ? actionId.slice("unlock-guixu:".length) : null;
const parseAcceptQuestId = (actionId: ActionId) => actionId.startsWith("accept-quest:") ? actionId.slice("accept-quest:".length) : null;
const parseExecuteQuestId = (actionId: ActionId) => actionId.startsWith("execute-quest:") ? actionId.slice("execute-quest:".length) : null;
const parseExploreGuixuNode = (actionId: ActionId) => actionId.startsWith("explore-guixu:") ? actionId.slice("explore-guixu:".length) : null;
const parseResidenceOption = (actionId: ActionId, prefix: string) => actionId.startsWith(prefix) ? actionId.slice(prefix.length) : null;
const parseDungeonRank = (actionId: ActionId, prefix: "search-fortune:rank-" | "challenge-guardian:rank-"): DungeonRank | null => {
  if (!actionId.startsWith(prefix)) {
    return null;
  }
  const parsed = Number.parseInt(actionId.slice(prefix.length), 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 9) {
    return null;
  }
  return parsed as DungeonRank;
};
const parseSearchFortuneRank = (actionId: ActionId) => parseDungeonRank(actionId, "search-fortune:rank-");
const parseChallengeGuardianRank = (actionId: ActionId) => parseDungeonRank(actionId, "challenge-guardian:rank-");
const searchFortuneActionIdOf = (rank: DungeonRank) => `search-fortune:rank-${rank}` as const;
const challengeGuardianActionIdOf = (rank: DungeonRank) => `challenge-guardian:rank-${rank}` as const;
const isDungeonExpeditionActionId = (actionId: ActionId) => parseStartDungeonExpeditionActionId(actionId) !== null;
const parseJoinNeutralSectId = (actionId: ActionId) =>
  actionId.startsWith("join-neutral-sect:") ? actionId.slice("join-neutral-sect:".length) : null;
const topologyOf = (world: WorldState) => world.topology as unknown as RuntimeTopologyGraph;
const getDistanceBetween = (world: WorldState, fromLocationId: string, toLocationId: string) =>
  getDistance(topologyOf(world), fromLocationId as never, toLocationId as never);
const getNeighborLocations = (world: WorldState, locationId: string) =>
  getNeighbors(topologyOf(world), locationId as never).map((neighbor) => ({ locationId: neighbor.locationId as string, ticks: neighbor.ticks }));
const isMainCityNode = (nodeType: string) => nodeType === "main-city";
const isSectOutpostNode = (nodeType: string) => nodeType === "sect-outpost";
const isSubTownNode = (nodeType: string) => nodeType.startsWith("sub-town-");
const isDungeonNode = (nodeType: string) => nodeType.startsWith("dungeon-");
const dungeonMetadataOf = (location: WorldState["locations"][string] | undefined) =>
  location && isDungeonNode(location.nodeType)
    ? (location.dungeon ?? {
        grade: DUNGEON_META_BY_NODE_TYPE[location.nodeType as DungeonNodeType].grade,
        maxRank: 9,
        minRealm: DUNGEON_META_BY_NODE_TYPE[location.nodeType as DungeonNodeType].minRealm,
        dangerBase: location.nodeType === "dungeon-c" ? 1 : location.nodeType === "dungeon-b" ? 2 : 3,
        rewardBand: location.nodeType === "dungeon-c" ? "low" : location.nodeType === "dungeon-b" ? "mid" : "high",
        materialBand: DUNGEON_META_BY_NODE_TYPE[location.nodeType as DungeonNodeType].materialBand,
      })
    : null;
const meetsRealmRequirement = (cultivator: Cultivator, minRealm: Cultivator["realm"]) =>
  REALM_ORDER[cultivator.realm] >= REALM_ORDER[minRealm];
const ensureDungeonProgress = (cultivator: Cultivator) =>
  cultivator.dungeonProgress ?? (cultivator.dungeonProgress = createDungeonProgress());
const highestClearedRankOf = (cultivator: Cultivator, grade: DungeonGrade) =>
  clamp(Math.floor(ensureDungeonProgress(cultivator)[grade]?.highestClearedRank ?? 0), 0, 9);
const highestUnlockedRankOf = (cultivator: Cultivator, grade: DungeonGrade) =>
  clamp(highestClearedRankOf(cultivator, grade) + 1, 1, 9) as DungeonRank;
const unlockedDungeonRanksOf = (cultivator: Cultivator, grade: DungeonGrade): DungeonRank[] => {
  const highestUnlockedRank = highestUnlockedRankOf(cultivator, grade);
  return DUNGEON_RANKS.filter((rank) => rank <= highestUnlockedRank);
};
const rankBandForLevel = (realmLevel: number) => {
  const relativeLevel = ((realmLevel - 1) % 3) + 1;
  const minRank = ((relativeLevel - 1) * 3) + 1;
  const maxRank = minRank + 2;
  return { minRank: minRank as DungeonRank, maxRank: maxRank as DungeonRank };
};
const recommendedDungeonRankOf = (cultivator: Cultivator, grade: DungeonGrade): DungeonRank => {
  const { minRank, maxRank } = rankBandForLevel(cultivator.realmLevel);
  const highestUnlockedRank = highestUnlockedRankOf(cultivator, grade);
  if (highestUnlockedRank < minRank) {
    return highestUnlockedRank;
  }
  return clamp(highestUnlockedRank, minRank, maxRank) as DungeonRank;
};
const guardianTuningForDungeon = (grade: DungeonGrade, rank: DungeonRank): DungeonTuning => {
  const gradeOffset = grade === "丙" ? 0 : grade === "乙" ? 1 : 2;
  return {
    threatBase: 136 + (gradeOffset * 34) + ((rank - 1) * 6),
    threatVariance: 10 + (rank * 2),
    spiritStoneBase: 82 + (gradeOffset * 42) + ((rank - 1) * 12),
    spiritStoneVariance: 18 + (rank * 4),
    fragmentBase: grade === "甲" ? 2 : 1,
    fragmentVariance: 1 + Math.floor((rank - 1) / 4),
    realmProgressReward: 6 + (gradeOffset * 4) + Math.floor((rank - 1) / 2),
    wardReward: grade === "丙" ? (rank >= 7 ? 1 : 0) : 1,
    defeatQiBase: 20 + (gradeOffset * 8) + ((rank - 1) * 2),
    defeatQiVariance: 6 + Math.floor(rank / 2),
    defeatInjuryTicks: 4 + (gradeOffset * 2) + Math.floor((rank - 1) / 3),
    poisonTicks: grade === "甲" ? 2 + Math.floor((rank - 1) / 3) : grade === "乙" && rank >= 6 ? 1 : 0,
  };
};
const searchTuningForDungeon = (grade: DungeonGrade, rank: DungeonRank) => {
  const gradeOffset = grade === "丙" ? 0 : grade === "乙" ? 1 : 2;
  return {
    spiritStoneBase: 72 + (gradeOffset * 38) + ((rank - 1) * 10),
    spiritStoneVariance: 28 + (rank * 4),
    progressBase: 5 + (gradeOffset * 4) + Math.floor((rank - 1) / 2),
    fragmentBase: grade === "甲" ? 2 : 1,
    fragmentBonus: grade === "丙" ? 0 : 1,
    insightTicks: grade === "甲" ? 6 : rank >= 6 ? 5 : 4,
  };
};
const stateIdFromLocationId = (locationId: string) => locationId.split(":")[0] as StateId;
const mainCityLocationIdOf = (stateId: StateId) => `${stateId}:main-city`;
const ensureStateReputation = (cultivator: Cultivator) => cultivator.stateReputation ?? (cultivator.stateReputation = createStateReputation());
const reputationForState = (cultivator: Cultivator, stateId: StateId) => ensureStateReputation(cultivator)[stateId] ?? 0;
const currentStateReputation = (cultivator: Cultivator) => reputationForState(cultivator, stateIdFromLocationId(cultivator.locationId));
const addStateReputation = (cultivator: Cultivator, stateId: StateId, delta: number) => {
  const map = ensureStateReputation(cultivator);
  map[stateId] = Math.max(0, (map[stateId] ?? 0) + delta);
};
const addCurrentStateReputation = (cultivator: Cultivator, delta: number) =>
  addStateReputation(cultivator, stateIdFromLocationId(cultivator.locationId), delta);
const canTradeAtLocation = (location: { kind: string; nodeType: string }) => location.kind === "safe" && (isMainCityNode(location.nodeType) || isSubTownNode(location.nodeType));
const canHealAtLocation = (location: { kind: string }) => location.kind === "safe";
const isLowRiskAction = (actionId: ActionId) =>
  actionId === "meditate"
  || actionId === "heal"
  || actionId === "residence-recover-qi"
  || actionId === "residence-heal"
  || actionId === "withdraw-from-wilderness"
  || actionId === "take-neutral-duty"
  || actionId === "take-mortal-task"
  || actionId.startsWith("travel-to:");
const findNearestLocationId = (world: WorldState, fromLocationId: string, predicate: (location: WorldState["locations"][string]) => boolean) => {
  let bestLocationId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [locationId, location] of Object.entries(world.locations)) {
    if (!predicate(location)) continue;
    const distance = getDistanceBetween(world, fromLocationId, locationId);
    if (Number.isFinite(distance) && distance < bestDistance) {
      bestDistance = distance;
      bestLocationId = locationId;
    }
  }
  return bestLocationId;
};
const PLAYER_SECT_MOTIVE_BUCKET_IDS = Object.keys(PLAYER_SECT_MOTIVE_BUCKETS) as SectMotiveBucketId[];
const PLAYER_SECT_REVIEW_TITLES = new Set<SectTitle>(["宗主", "长老"]);

function defaultPlayerSectAdmissionPolicy(): SectAdmissionPolicy {
  return {
    minimumRealmLevel: 1,
    allowedMotiveBuckets: [...PLAYER_SECT_MOTIVE_BUCKET_IDS],
  };
}

function normalizePlayerSectName(name: string): string {
  return name.trim().replace(/\s+/g, "").toLocaleLowerCase("en-US");
}

function validatePlayerSectName(name: string): string {
  const trimmed = name.trim();
  const length = Array.from(trimmed).length;
  if (!trimmed || length < PLAYER_SECT_NAME_MIN_LENGTH || length > PLAYER_SECT_NAME_MAX_LENGTH) {
    throw new Error(`Sect name must be ${PLAYER_SECT_NAME_MIN_LENGTH}-${PLAYER_SECT_NAME_MAX_LENGTH} characters.`);
  }
  return trimmed;
}

function normalizePageLimit(limit?: number): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return PLAYER_SECT_PAGE_LIMIT;
  }
  return Math.max(1, Math.min(PLAYER_SECT_PAGE_LIMIT, Math.floor(limit)));
}

function normalizePageCursor(cursor?: string): number {
  if (!cursor?.trim()) {
    return 0;
  }
  const parsed = Number(cursor);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Cursor must be a non-negative number.");
  }
  return Math.floor(parsed);
}

function nextCursorForSlice(total: number, offset: number, limit: number): string | null {
  const nextOffset = offset + limit;
  return nextOffset < total ? String(nextOffset) : null;
}

function cultivatorHasOrganization(cultivator: Cultivator): boolean {
  return Boolean(cultivator.sectId || cultivator.neutralSectId);
}

function getPlayerSectFoundingBlockers(
  world: WorldState,
  cultivator: Cultivator,
): {
  currentStateId: StateId | null;
  currentMainCityLocationId: PlayerSectFoundingOptionsView["currentMainCityLocationId"];
  blockers: PlayerSectFoundingBlockerCode[];
} {
  const currentLocation = world.locations[cultivator.locationId];
  const currentStateId = currentLocation?.stateId ?? null;
  const currentMainCityLocationId = currentStateId
    ? mainCityLocationIdOf(currentStateId) as PlayerSectFoundingOptionsView["currentMainCityLocationId"]
    : null;
  const blockers: PlayerSectFoundingBlockerCode[] = [];

  if (
    !currentLocation
    || !currentStateId
    || !currentMainCityLocationId
    || !isMainCityNode(currentLocation.nodeType)
    || cultivator.locationId !== currentMainCityLocationId
  ) {
    blockers.push("not-in-main-city");
  }
  if (cultivatorHasOrganization(cultivator)) {
    blockers.push("already-in-organization");
  }
  if (cultivator.spiritStones < PLAYER_SECT_FOUNDING_STONE_COST) {
    blockers.push("insufficient-spirit-stones");
  }
  const currentStateReputation = currentStateId ? reputationForState(cultivator, currentStateId) : 0;
  if (currentStateReputation < PLAYER_SECT_FOUNDING_REPUTATION_COST) {
    blockers.push("insufficient-state-reputation");
  }

  return {
    currentStateId,
    currentMainCityLocationId,
    blockers,
  };
}

function normalizeSectAdmissionPolicy(input: SectAdmissionPolicy): SectAdmissionPolicy {
  const minimumRealmLevel = Number.isFinite(input.minimumRealmLevel)
    ? Math.max(1, Math.floor(input.minimumRealmLevel))
    : 1;
  const bucketSet = new Set<SectMotiveBucketId>();
  for (const bucketId of input.allowedMotiveBuckets ?? []) {
    if (PLAYER_SECT_MOTIVE_BUCKET_IDS.includes(bucketId)) {
      bucketSet.add(bucketId);
    }
  }
  const allowedMotiveBuckets = Array.from(bucketSet);
  if (allowedMotiveBuckets.length === 0) {
    throw new Error("Admission policy must allow at least one motive bucket.");
  }
  return {
    minimumRealmLevel,
    allowedMotiveBuckets,
  };
}

function isAllMotiveBucketsAllowed(policy: SectAdmissionPolicy): boolean {
  return PLAYER_SECT_MOTIVE_BUCKET_IDS.every((bucketId) => policy.allowedMotiveBuckets.includes(bucketId));
}

function motiveBucketForRegistration(
  record: CultivationRegistrationRecord | null,
): SectMotiveBucketId | null {
  if (!record) {
    return null;
  }
  const motiveId = (
    record.result.cultivation_motive_id
    ?? resolveCultivationMotiveId(record.result.cultivation_motive)
  ) as RegistrationCultivationMotiveId | undefined;
  if (!motiveId) {
    return null;
  }
  for (const [bucketId, motiveIds] of Object.entries(PLAYER_SECT_MOTIVE_BUCKETS) as Array<
    [SectMotiveBucketId, readonly RegistrationCultivationMotiveId[]]
  >) {
    if (motiveIds.includes(motiveId)) {
      return bucketId;
    }
  }
  return null;
}

function clampMoralityScore(value: number): number {
  return clamp(Math.round(value), MORALITY_SCORE_MIN, MORALITY_SCORE_MAX);
}

function moralityAlignmentOfScore(score: number): MoralityAlignment {
  return score >= 0 ? "正道" : "魔道";
}

function moralityAlignmentOfCultivator(cultivator: Cultivator): MoralityAlignment {
  return moralityAlignmentOfScore(cultivator.moralityScore);
}

function applyMoralityDelta(
  world: WorldState,
  cultivator: Cultivator,
  delta: number,
  reason: string,
): { moralityScore: number; moralityAlignment: MoralityAlignment } {
  cultivator.moralityScore = clampMoralityScore(cultivator.moralityScore + delta);
  addDaoLog(
    world,
    cultivator.id,
    "Morality Shift",
    `${cultivator.name} ${delta >= 0 ? "gained" : "lost"} ${Math.abs(delta)} morality from ${reason}.`,
    ["morality", reason, delta >= 0 ? "positive" : "negative"],
  );
  return {
    moralityScore: cultivator.moralityScore,
    moralityAlignment: moralityAlignmentOfCultivator(cultivator),
  };
}

function isPendingMoralityChoiceExpired(
  world: WorldState,
  choice: WorldState["pendingMoralityChoices"][string],
): boolean {
  return world.tick >= choice.expiresAtTick;
}

function cleanupCultivatorPendingMoralityChoice(world: WorldState, cultivator: Cultivator): void {
  if (!cultivator.pendingMoralityChoiceId) {
    return;
  }
  const choice = world.pendingMoralityChoices[cultivator.pendingMoralityChoiceId];
  if (!choice || isPendingMoralityChoiceExpired(world, choice)) {
    if (cultivator.pendingMoralityChoiceId) {
      delete world.pendingMoralityChoices[cultivator.pendingMoralityChoiceId];
    }
    cultivator.pendingMoralityChoiceId = null;
  }
}

function buildPendingMoralityChoiceView(
  world: WorldState,
  cultivator: Cultivator,
): PendingMoralityChoiceResponse {
  const pendingId = cultivator.pendingMoralityChoiceId;
  if (!pendingId) {
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      choice: null,
    };
  }
  const choice = world.pendingMoralityChoices[pendingId];
  if (!choice || choice.cultivatorId !== cultivator.id || isPendingMoralityChoiceExpired(world, choice)) {
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      choice: null,
    };
  }
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    choice: {
      choiceId: choice.id,
      title: choice.title,
      prompt: choice.prompt,
      createdAtTick: choice.createdAtTick,
      expiresAtTick: choice.expiresAtTick,
      options: choice.options.map((option) => ({
        id: option.id,
        label: option.label,
        summary: option.summary,
      })),
    },
  };
}

function maybeQueueMoralityChoice(
  world: WorldState,
  cultivator: Cultivator,
  locationId: string,
  template: WorldState["eventPools"]["globalCommon"][number],
): WorldEvent[] | null {
  if (!template.moralityChoice) {
    return null;
  }
  cleanupCultivatorPendingMoralityChoice(world, cultivator);
  if (cultivator.pendingMoralityChoiceId) {
    return [];
  }
  const choiceId = `morality-choice-${world.nextMoralityChoiceSequence++}`;
  const choice = template.moralityChoice;
  world.pendingMoralityChoices[choiceId] = {
    id: choiceId,
    cultivatorId: cultivator.id,
    createdAtTick: world.tick,
    expiresAtTick: world.tick + Math.max(1, choice.expiresInTicks || MORALITY_EVENT_TTL),
    title: choice.title,
    prompt: choice.prompt,
    options: [
      { ...choice.options[0], effectBundle: { ...choice.options[0].effectBundle } },
      { ...choice.options[1], effectBundle: { ...choice.options[1].effectBundle } },
    ],
  };
  cultivator.pendingMoralityChoiceId = choiceId;
  return [
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId,
      title: `[choice] ${choice.title}`,
      content: choice.prompt,
      severity: "medium",
      tags: ["event-pool", "morality-choice", "pending"],
    }),
  ];
}

function policyMatchesCultivator(sect: Sect, cultivator: Cultivator): boolean {
  if (cultivator.realmLevel < sect.admissionPolicy.minimumRealmLevel) {
    return false;
  }
  if (isAllMotiveBucketsAllowed(sect.admissionPolicy)) {
    return true;
  }
  const bucketId = motiveBucketForRegistration(cultivator.registrationRecord);
  return bucketId ? sect.admissionPolicy.allowedMotiveBuckets.includes(bucketId) : false;
}

function cultivatorMatchesSectAlignment(sect: Sect, cultivator: Cultivator): boolean {
  return moralityAlignmentOfCultivator(cultivator) === sect.alignment;
}

function removePendingSectApplication(world: WorldState, applicationId: string): void {
  const application = world.pendingSectApplications[applicationId];
  if (!application) {
    return;
  }
  const cultivator = world.cultivators[application.cultivatorId];
  if (cultivator?.pendingSectApplicationId === applicationId) {
    cultivator.pendingSectApplicationId = null;
  }
  delete world.pendingSectApplications[applicationId];
}

function isSectApplicationExpired(world: WorldState, application: SectApplication): boolean {
  return world.tick >= application.expiresAtTick;
}

function cleanupCultivatorPendingSectApplication(world: WorldState, cultivator: Cultivator): void {
  if (!cultivator.pendingSectApplicationId) {
    return;
  }
  const application = world.pendingSectApplications[cultivator.pendingSectApplicationId];
  if (!application || isSectApplicationExpired(world, application)) {
    removePendingSectApplication(world, cultivator.pendingSectApplicationId);
  }
}

function activeReapplyCooldown(
  world: WorldState,
  sectId: string,
  cultivatorId: string,
): SectReapplyCooldown | null {
  for (const cooldown of Object.values(world.sectReapplyCooldowns)) {
    if (cooldown.sectId !== sectId || cooldown.cultivatorId !== cultivatorId) {
      continue;
    }
    if (world.tick >= cooldown.expiresAtTick) {
      delete world.sectReapplyCooldowns[cooldown.id];
      continue;
    }
    return cooldown;
  }
  return null;
}

function ensurePlayerSectOutpost(world: WorldState, sect: Sect): string {
  const headquartersLocationId = toSectOutpostLocationId(sect.stateId, sect.id);
  if (!world.locations[headquartersLocationId]) {
    world.locations[headquartersLocationId] = {
      id: headquartersLocationId,
      stateId: sect.stateId,
      nodeType: "sect-outpost",
      name: `${sect.name}据点`,
      kind: "safe",
      risk: (world.states[sect.stateId]?.risk ?? "safe") as WorldState["locations"][string]["risk"],
      description: `${sect.name}在${sect.stateId}的玩家宗门据点。`,
      organizationId: sect.id,
      organizationType: "player-sect",
    };
  }
  const state = world.states[sect.stateId];
  if (state && !state.locationIds.includes(headquartersLocationId)) {
    state.locationIds.push(headquartersLocationId);
  }
  world.topology = buildFullTopology(world.locations) as WorldState["topology"];
  if (!world.questBoards[headquartersLocationId]) {
    world.questBoards[headquartersLocationId] = {
      locationId: headquartersLocationId,
      slots: 0,
      quests: [],
      lastRefreshedTick: world.tick,
    };
  }
  return headquartersLocationId;
}

function ensureSectReviewer(world: WorldState, cultivator: Cultivator): Sect {
  const sect = getCultivatorSect(world, cultivator);
  if (!sect) {
    throw new Error("Cultivator is not in a player sect.");
  }
  if (!cultivator.sectTitle || !PLAYER_SECT_REVIEW_TITLES.has(cultivator.sectTitle)) {
    throw new Error("Only 宗主 or 长老 can review sect applications.");
  }
  return sect;
}

function notifySectReviewers(world: WorldState, sect: Sect, subject: string, content: string): void {
  for (const memberId of sect.memberIds) {
    const member = world.cultivators[memberId];
    if (!member?.sectTitle || !PLAYER_SECT_REVIEW_TITLES.has(member.sectTitle)) {
      continue;
    }
    addMessage(world, member.id, sect.name, subject, content);
  }
}

function buildSectApplicationView(world: WorldState, application: SectApplication): SectApplicationView | null {
  const applicant = world.cultivators[application.cultivatorId];
  const sect = world.sects[application.sectId];
  if (!applicant || !sect) {
    return null;
  }
  if (applicant.pendingSectApplicationId !== application.id) {
    return null;
  }
  if (cultivatorHasOrganization(applicant)) {
    return null;
  }
  if (isSectApplicationExpired(world, application)) {
    return null;
  }
  if (!cultivatorMatchesSectAlignment(sect, applicant)) {
    return null;
  }
  if (!policyMatchesCultivator(sect, applicant)) {
    return null;
  }
  return {
    applicationId: application.id,
    sectId: application.sectId,
    cultivatorId: applicant.id,
    applicantName: applicant.name,
    applicantRealmLevel: applicant.realmLevel,
    applicantMotiveBucket: motiveBucketForRegistration(applicant.registrationRecord),
    appliedAtTick: application.appliedAtTick,
    expiresAtTick: application.expiresAtTick,
  };
}

function buildEnterWildernessAction(
  cultivator: Cultivator,
  layer: NonNullable<ReturnType<typeof getWildernessLayerForLocation>>,
): AvailableAction {
  const gate = canEnterWilderness(cultivator, layer);
  const gateText = gate.allowed
    ? `Consumes ${layer.entryRequirement.entryTicket ?? "no ticket"} and grants ${layer.survivalPressure.maxSurvivalTicks} survival ticks.`
    : gate.reason ?? "Cannot enter yet.";

  return {
    actionId: `enter-wilderness:${layer.layerId}` as ActionId,
    label: `Enter ${layer.name}`,
    description: `${gateText} Pressure ${layer.survivalPressure.qiDamagePerTick}/${layer.survivalPressure.spiritualDamagePerTick} per tick.`,
    durationTicks: 0,
    kind: "immediate",
  };
}
const normalizeAgentId = (input: string | null | undefined) => input?.trim() ? input.trim() : null;
export function starterStateFromRoll(roll: number): StateId {
  const normalized = Number.isFinite(roll) ? roll : 0;
  const index = Math.min(STARTER_STATES.length - 1, Math.max(0, Math.floor(normalized * STARTER_STATES.length)));
  return STARTER_STATES[index] ?? DEFAULT_STARTER_STATE;
}
function starterLocationIdFromRoll(roll: number) {
  return `${starterStateFromRoll(roll)}:main-city`;
}
const getCultivatorOrThrow = (world: WorldState, id: string) => {
  const cultivator = world.cultivators[id];
  if (!cultivator) throw new Error(`Cultivator not found: ${id}`);
  return cultivator;
};
function getCultivatorNeutralSect(world: WorldState, cultivator: Cultivator): NeutralSect | null {
  if (!cultivator.neutralSectId) {
    return null;
  }
  return world.neutralSects[cultivator.neutralSectId] ?? null;
}

function getCultivatorSect(world: WorldState, cultivator: Cultivator): Sect | null {
  if (!cultivator.sectId) {
    return null;
  }

  return world.sects[cultivator.sectId] ?? null;
}

function locationOrganizationIdOf(
  location: WorldState["locations"][string] | undefined,
  organizationType: "player-sect" | "neutral-sect",
): string | null {
  if (!location || !isSectOutpostNode(location.nodeType)) {
    return null;
  }

  if (location.organizationType !== organizationType || !location.organizationId) {
    return null;
  }

  return location.organizationId;
}

function getLocalSect(world: WorldState, locationId: string): Sect | null {
  const location = world.locations[locationId];
  const sectId = locationOrganizationIdOf(location, "player-sect");
  if (!sectId) {
    return null;
  }

  return world.sects[sectId] ?? null;
}

function getLocalNeutralSect(world: WorldState, locationId: string): NeutralSect | null {
  const location = world.locations[locationId];
  const neutralSectId = locationOrganizationIdOf(location, "neutral-sect");
  if (!neutralSectId) {
    return null;
  }

  return world.neutralSects[neutralSectId] ?? null;
}
const getAgentBinding = (world: WorldState, agentId: string) => world.agentBindings[agentId] ?? null;
function ensureAgentBinding(world: WorldState, agentId: string): AgentBinding {
  const existing = getAgentBinding(world, agentId);
  if (existing) return existing;
  const binding: AgentBinding = { agentId, cultivatorIds: [], selectedCultivatorId: null };
  world.agentBindings[agentId] = binding;
  return binding;
}
const addDaoLog = (world: WorldState, cultivatorId: string, title: string, content: string, tags: string[]) =>
  world.daoLogs.unshift({ id: `log-${world.nextLogSequence++}`, cultivatorId, tick: world.tick, title, content, tags });
const addMessage = (
  world: WorldState,
  cultivatorId: string,
  from: string,
  subject: string,
  content: string,
  options: {
    fromCultivatorId?: string | null;
    toCultivatorId?: string | null;
  } = {},
) => {
  const message = {
    id: `msg-${world.nextMessageSequence++}`,
    cultivatorId,
    tick: world.tick,
    from,
    fromCultivatorId: options.fromCultivatorId ?? null,
    toCultivatorId: options.toCultivatorId ?? cultivatorId,
    subject,
    content,
  } satisfies Message;
  world.messages.unshift(message);
  return message;
};
const MORALITY_SCORE_MIN = -100;
const MORALITY_SCORE_MAX = 100;
const MORALITY_EVENT_TTL = 6;

const addWorldEvent = (world: WorldState, event: Omit<WorldEvent, "id" | "tick">): WorldEvent =>
  (world.worldEvents.unshift({ id: `event-${world.nextEventSequence++}`, tick: world.tick, ...event }), world.worldEvents[0]!);
const addCombatLog = (world: WorldState, entry: Omit<CombatLogEntry, "id" | "tick">): CombatLogEntry =>
  (world.combatLogs.unshift({ id: `combat-${world.nextCombatSequence++}`, tick: world.tick, ...entry }), world.combatLogs[0]!);

function triggerLocationEvent(
  world: WorldState,
  cultivator: Cultivator,
  source: EventSourceType,
  locationId: string,
  seed: string,
): WorldEvent[] {
  cleanupCultivatorPendingMoralityChoice(world, cultivator);
  const drawn = drawEvent(world, source, cultivator, locationId, seed);
  if (!drawn) {
    return [];
  }

  const queuedChoiceEvents = maybeQueueMoralityChoice(world, cultivator, locationId, drawn.template);
  if (queuedChoiceEvents) {
    return queuedChoiceEvents;
  }

  const emitted: WorldEvent[] = [];
  applyEventEffects(cultivator, drawn.template);
  emitted.push(
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId,
      title: `[${source}] ${drawn.template.name}`,
      content: drawn.template.description,
      severity: eventSeverityOf(drawn.template),
      tags: ["event-pool", source, drawn.template.semanticType, drawn.template.resultType],
    }),
  );

  if (drawn.subEvent) {
    applyEventEffects(cultivator, drawn.subEvent);
    emitted.push(
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId,
        title: `[${source}] ${drawn.subEvent.name}`,
        content: drawn.subEvent.description,
        severity: eventSeverityOf(drawn.subEvent),
        tags: ["event-pool", source, "sub-event", drawn.subEvent.semanticType, drawn.subEvent.resultType],
      }),
    );
  }

  return emitted;
}

function triggerNodeSpecificEvent(
  world: WorldState,
  cultivator: Cultivator,
  actionTag: string,
  locationId: string,
  seed: string,
  dungeonContext?: { grade: DungeonGrade; rank: DungeonRank },
): WorldEvent[] {
  const drawn = drawNodeSpecificEvent(world, cultivator, locationId, seed, dungeonContext);
  if (!drawn) {
    return [];
  }

  applyEventEffects(cultivator, drawn.template);
  return [
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId,
      title: `[${actionTag}] ${drawn.template.name}`,
      content: drawn.template.description,
      severity: eventSeverityOf(drawn.template),
      tags: ["event-pool", "node-specific", actionTag, drawn.template.semanticType, drawn.template.resultType],
    }),
  ];
}
const REGISTRATION_QUESTIONS: RegistrationQuestionId[] = [
  "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "Q11", "Q12", "Q13", "Q14", "Q15", "Q16", "Q17", "Q18",
];
const REGISTRATION_ANSWERS = new Set<RegistrationAnswer>(["A", "B", "C", "D"]);

interface RegistrationRuntimeModifiers {
  dominantElements: RegistrationGameplayEffectsView["dominantElements"];
  modifiers: RegistrationGameplayModifierView[];
  cultivateBonus: number;
  meditateBonus: number;
  healBonus: number;
  taskBonus: number;
  sectBonus: number;
  mineBonus: number;
  fortuneBonus: number;
  combatBonus: number;
  combatGuard: number;
  studyBonus: number;
}

type RegistrationBonusKey =
  | "cultivateBonus"
  | "meditateBonus"
  | "healBonus"
  | "taskBonus"
  | "sectBonus"
  | "mineBonus"
  | "fortuneBonus"
  | "combatBonus"
  | "combatGuard"
  | "studyBonus";

type RegistrationBonusValues = Pick<RegistrationRuntimeModifiers, RegistrationBonusKey>;

const REGISTRATION_BONUS_KEYS: RegistrationBonusKey[] = [
  "cultivateBonus",
  "meditateBonus",
  "healBonus",
  "taskBonus",
  "sectBonus",
  "mineBonus",
  "fortuneBonus",
  "combatBonus",
  "combatGuard",
  "studyBonus",
];

const ELEMENT_RUNTIME_BONUSES: Record<FiveElementId, Partial<RegistrationBonusValues>> = {
  metal: { combatBonus: 4, studyBonus: 3 },
  wood: { cultivateBonus: 4, healBonus: 4 },
  water: { fortuneBonus: 4, combatGuard: 2 },
  fire: { cultivateBonus: 3, combatBonus: 4 },
  earth: { mineBonus: 4, healBonus: 2 },
};

function createRegistrationRuntimeModifiers(): RegistrationRuntimeModifiers {
  return {
    dominantElements: [],
    modifiers: [],
    cultivateBonus: 0,
    meditateBonus: 0,
    healBonus: 0,
    taskBonus: 0,
    sectBonus: 0,
    mineBonus: 0,
    fortuneBonus: 0,
    combatBonus: 0,
    combatGuard: 0,
    studyBonus: 0,
  };
}

function addRegistrationBonuses(target: RegistrationRuntimeModifiers, bonuses: Partial<RegistrationBonusValues>) {
  for (const key of REGISTRATION_BONUS_KEYS) {
    const value = bonuses[key];
    if (typeof value === "number") {
      target[key] += value;
    }
  }
}

function scaleRegistrationBonuses(
  bonuses: Partial<RegistrationBonusValues>,
  divisor: number,
): Partial<RegistrationBonusValues> {
  const scaled: Partial<RegistrationBonusValues> = {};
  for (const key of REGISTRATION_BONUS_KEYS) {
    const value = bonuses[key];
    if (typeof value === "number" && value > 0) {
      scaled[key] = Math.max(1, Math.floor(value / divisor));
    }
  }
  return scaled;
}

function registrationBonusSnapshotOf(source: RegistrationRuntimeModifiers): Partial<RegistrationBonusValues> {
  const snapshot: Partial<RegistrationBonusValues> = {};
  for (const key of REGISTRATION_BONUS_KEYS) {
    if (source[key] > 0) {
      snapshot[key] = source[key];
    }
  }
  return snapshot;
}

function applyRegistrationModifier(
  target: RegistrationRuntimeModifiers,
  source: RegistrationGameplayModifierView["source"],
  title: string,
  summary: string,
  bonuses: Partial<RegistrationBonusValues>,
) {
  target.modifiers.push({ source, title, summary });
  addRegistrationBonuses(target, bonuses);
}

function dominantElementsOf(record: CultivationRegistrationRecord): RegistrationGameplayEffectsView["dominantElements"] {
  const sorted = (Object.entries(record.result.five_element_scores) as Array<[FiveElementId, number]>)
    .sort((left, right) => right[1] - left[1]);
  const [first, second] = sorted;
  if (!first) {
    return [];
  }
  if (!second || first[1] - second[1] >= 3) {
    return [{ id: first[0], label: ELEMENT_LABELS[first[0]], score: first[1] }];
  }
  return [
    { id: first[0], label: ELEMENT_LABELS[first[0]], score: first[1] },
    { id: second[0], label: ELEMENT_LABELS[second[0]], score: second[1] },
  ];
}
function registrationModifiersOf(cultivator: Cultivator): RegistrationRuntimeModifiers | null {
  const record = cultivator.registrationRecord;
  if (!record) {
    return null;
  }
  const modifiers = createRegistrationRuntimeModifiers();
  modifiers.dominantElements = dominantElementsOf(record);
  for (const element of modifiers.dominantElements) {
    addRegistrationBonuses(modifiers, ELEMENT_RUNTIME_BONUSES[element.id]);
  }

  const coreTemperament = record.result.core_temperament;
  const coreTemperamentId = record.result.core_temperament_id ?? resolveTemperamentId(coreTemperament);
  if (coreTemperamentId === "shou_jie") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A rule-bound core steadies defense and recovery discipline.", { combatGuard: 3 });
  } else if (coreTemperamentId === "duan_feng") {
      applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A cutting core sharpens decisive combat and focused dungeon pressure.", { combatBonus: 4, studyBonus: 2 });
  } else if (coreTemperamentId === "fu_sheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A nurturing core favors healing, low-risk errands, and team utility.", { healBonus: 4, taskBonus: 2 });
  } else if (coreTemperamentId === "xiang_rong") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A growth-oriented core turns stable sessions into stronger cultivation gains.", { cultivateBonus: 4, meditateBonus: 2 });
  } else if (coreTemperamentId === "qian_yuan") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A patient core improves scouting, judgment, and safer risk-taking.", { fortuneBonus: 4, combatGuard: 2 });
  } else if (coreTemperamentId === "guan_lan") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "An observant core improves study efficiency and opportunistic play.", { fortuneBonus: 3, studyBonus: 3 });
  } else if (coreTemperamentId === "chi_xin") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A driven core converts pressure into cultivation momentum and combat force.", { cultivateBonus: 3, combatBonus: 3 });
  } else if (coreTemperamentId === "zheng_sheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A competitive core leans into direct encounters and forceful progress.", { combatBonus: 4, studyBonus: 1 });
  } else if (coreTemperamentId === "zhen_yue") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A mountain-like core reinforces frontline stability and mining resilience.", { combatGuard: 4, mineBonus: 3 });
  } else if (coreTemperamentId === "shou_cheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A conservative core protects recovery and long-cycle stability.", { healBonus: 3 });
  }

  if (modifiers.dominantElements.length > 0) {
    const behaviorBonuses = createRegistrationRuntimeModifiers();
    const divisor = modifiers.dominantElements.length === 1 ? 2 : 3;
    for (const element of modifiers.dominantElements) {
      addRegistrationBonuses(behaviorBonuses, scaleRegistrationBonuses(ELEMENT_RUNTIME_BONUSES[element.id], divisor));
    }
    applyRegistrationModifier(
      modifiers,
      "behavior-aspect",
      `Behavior aspect: ${record.result.behavior_aspect}`,
      "The registration's action bias nudges routine jobs toward its preferred rhythm.",
      registrationBonusSnapshotOf(behaviorBonuses),
    );
  }

  const motive = record.result.cultivation_motive;
  const cultivationMotiveId = record.result.cultivation_motive_id ?? resolveCultivationMotiveId(motive);
  if (cultivationMotiveId === "seek-longevity") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Longevity-driven cultivation improves recovery and stable long-term progress.", { healBonus: 4 });
  } else if (cultivationMotiveId === "prove-the-great-dao") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "A path-seeking motive rewards sustained cultivation and hard breakthroughs.", { cultivateBonus: 4, combatBonus: 2 });
  } else if (cultivationMotiveId === "seek-truth") {
      applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Truth-seeking improves ruins scouting and measured growth.", { studyBonus: 4, fortuneBonus: 3, cultivateBonus: 1 });
  } else if (cultivationMotiveId === "protect-the-beloved") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Protective intent favors healing and reliable problem-solving work.", { taskBonus: 3, healBonus: 2 });
  } else if (cultivationMotiveId === "serve-the-world") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "A public-serving motive improves steady task income and support actions.", { taskBonus: 4, healBonus: 2 });
  } else if (cultivationMotiveId === "avenge-old-grudges") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Old grudges turn effort into sharper direct combat results.", { combatBonus: 4 });
  } else if (cultivationMotiveId === "compete-for-supremacy") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Competitive intent improves clashes and the study needed to win them.", { combatBonus: 3, studyBonus: 1 });
  } else if (cultivationMotiveId === "honor-the-clan") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Family or sect pride rewards contribution-focused play.", { sectBonus: 4, taskBonus: 2 });
  } else if (cultivationMotiveId === "defy-fate") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Defying fate improves dangerous exploration and hard fights.", { combatBonus: 3, fortuneBonus: 2 });
  } else if (cultivationMotiveId === "seek-freedom") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "A freedom-seeking motive favors meditation and open-ended exploration.", { meditateBonus: 3, fortuneBonus: 2 });
  }

  const spiritRoot = record.result.spirit_root_result;
  const spiritRootKindId = record.result.spirit_root_kind_id ?? resolveSpiritRootKindId(spiritRoot);
  if (spiritRootKindId === "single-root") {
    applyRegistrationModifier(modifiers, "spirit-root", `Spirit root: ${spiritRoot}`, "A focused root converts effort into cleaner cultivation and combat output.", { cultivateBonus: 4, combatBonus: 2 });
  } else if (spiritRootKindId === "dual-root") {
    applyRegistrationModifier(modifiers, "spirit-root", `Spirit root: ${spiritRoot}`, "A dual root supports flexible exploration and safer encounters.", { fortuneBonus: 3, combatGuard: 2 });
  }

  return modifiers;
}

function registrationEffectsViewOf(cultivator: Cultivator): RegistrationGameplayEffectsView | null {
  const modifiers = registrationModifiersOf(cultivator);
  if (!modifiers) {
    return null;
  }
  return {
    dominantElements: modifiers.dominantElements,
    modifiers: modifiers.modifiers,
  };
}

function createJob(world: WorldState, cultivatorId: string, actionId: TimedActionId, label: string): ActionJob {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const travelDestination = parseTravelDestination(actionId);
  const executeQuestId = parseExecuteQuestId(actionId);
  const guixuNodeId = parseExploreGuixuNode(actionId);
  const normalizedActionId =
    parseSearchFortuneRank(actionId) !== null
      ? "search-fortune"
      : parseChallengeGuardianRank(actionId) !== null
        ? "challenge-guardian"
        : parseStartDungeonExpeditionActionId(actionId) !== null
          ? "start-dungeon-expedition"
        : actionId;
  const duration = travelDestination
    ? getDistanceBetween(world, cultivator.locationId, travelDestination)
    : executeQuestId
      ? (cultivator.activeQuests.find((quest) => quest.id === executeQuestId)?.durationTicks ?? NaN)
      : guixuNodeId
        ? (getGuixuNodeById(world, guixuNodeId)?.explorationDurationTicks ?? NaN)
      : DEFAULT_ACTION_DURATIONS[normalizedActionId];
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid action duration for ${actionId}.`);
  }
  return {
    id: `job-${world.nextJobSequence++}`,
    cultivatorId,
    actionId,
    label,
    remainingTicks: duration,
    totalTicks: duration,
  };
}

function defaultResidenceAt(locationId: string, cultivatorId: string) {
  return {
    id: `residence-${cultivatorId}`,
    locationId: locationId as Cultivator["residence"]["locationId"],
    level: 1 as const,
    name: "洞府",
  };
}

function starterProfile() {
  return {
    techniques: ["Loose Breathing", "Light Body"],
    spiritStones: 360,
    inventory: { ...createEmptyInventory(), "healing-pill": 1, "qi-pill": 1 },
    factionReputation: createFactionReputation(),
  };
}
function toSummary(cultivator: Cultivator, selectedCultivatorId: string | null): CharacterSummary {
  return { id: cultivator.id, name: cultivator.name, genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, realm: cultivator.realm, realmLevel: cultivator.realmLevel, locationId: cultivator.locationId, sectId: cultivator.sectId, neutralSectId: cultivator.neutralSectId, isSelected: cultivator.id === selectedCultivatorId };
}
function applyPersonaMetadata(cultivator: Cultivator, input: CreateCultivatorInput) {
  const name = input.name.trim();
  if (name) cultivator.name = name;
  if (input.genderPresentation) cultivator.genderPresentation = input.genderPresentation;
  if (input.pronouns?.trim()) cultivator.pronouns = input.pronouns.trim();
  if (input.origin?.trim()) cultivator.origin = input.origin.trim();
  if (input.temperament?.trim()) cultivator.temperament = input.temperament.trim();
  if (typeof input.age === "number" && Number.isFinite(input.age)) cultivator.age = clamp(input.age, 16, 80);
}
function validateRegistrationRecord(record: CultivationRegistrationRecord): CultivationRegistrationRecord {
  if (record.record_type !== "registration_record") {
    throw new Error("registration record must use record_type 'registration_record'.");
  }
  if (typeof record.questionnaire_version !== "string" || record.questionnaire_version.trim().length === 0) {
    throw new Error("registration record must include questionnaire_version.");
  }
  for (const questionId of REGISTRATION_QUESTIONS) {
    const answer = record.answers?.[questionId];
    if (!answer || !REGISTRATION_ANSWERS.has(answer)) {
      throw new Error(`registration record is missing a valid answer for ${questionId}.`);
    }
  }
  for (const elementId of ["metal", "wood", "water", "fire", "earth"] as const) {
    const value = record.result?.five_element_scores?.[elementId];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`registration record must include numeric result.five_element_scores.${elementId}.`);
    }
  }
  if (!record.result?.confidence) {
    throw new Error("registration record must include result.confidence.");
  }
  for (const key of ["core", "behavior", "motive", "overall"] as const) {
    const value = record.result.confidence[key];
    if (value !== "high" && value !== "medium" && value !== "low") {
      throw new Error(`registration record must include result.confidence.${key}.`);
    }
  }
  if (typeof record.summary !== "string" || !record.summary.trim()) {
    throw new Error("registration record must include summary.");
  }
  const normalized = normalizeCultivationRegistrationRecord(record);
  if (!normalized.result.core_temperament.trim()) {
    throw new Error("registration record must include result.core_temperament.");
  }
  if (!normalized.result.secondary_temperament.trim()) {
    throw new Error("registration record must include result.secondary_temperament.");
  }
  if (!normalized.result.behavior_aspect.trim()) {
    throw new Error("registration record must include result.behavior_aspect.");
  }
  if (!normalized.result.cultivation_motive.trim()) {
    throw new Error("registration record must include result.cultivation_motive.");
  }
  if (!normalized.result.spirit_root_result.trim()) {
    throw new Error("registration record must include result.spirit_root_result.");
  }
  return normalized;
}
function registrationViewOf(cultivator: Cultivator): CultivationRegistrationView | null {
  const record = cultivator.registrationRecord;
  if (!record) {
    return null;
  }
  // Stored records are normalized at write time by validateRegistrationRecord(),
  // so all *_id fields are guaranteed present. The ?? resolve chains are defensive
  // fallbacks that satisfy the optional type signature without masking errors.
  const coreTemperamentId = record.result.core_temperament_id ?? resolveTemperamentId(record.result.core_temperament);
  const secondaryTemperamentId = record.result.secondary_temperament_id ?? resolveTemperamentId(record.result.secondary_temperament);
  const behaviorAspectId = record.result.behavior_aspect_id ?? resolveBehaviorAspectId(record.result.behavior_aspect);
  const cultivationMotiveId = record.result.cultivation_motive_id ?? resolveCultivationMotiveId(record.result.cultivation_motive);
  const spiritRootKindId = record.result.spirit_root_kind_id ?? resolveSpiritRootKindId(record.result.spirit_root_result);
  if (!coreTemperamentId || !secondaryTemperamentId || !behaviorAspectId || !cultivationMotiveId || !spiritRootKindId) {
    throw new Error("stored registration record is missing required taxonomy IDs — record may not have been normalized at save time.");
  }
  return {
    saved_at: record.saved_at ?? null,
    label_locale: record.result.label_locale ?? "zh-CN",
    core_temperament_id: coreTemperamentId,
    core_temperament: record.result.core_temperament,
    secondary_temperament_id: secondaryTemperamentId,
    secondary_temperament: record.result.secondary_temperament,
    behavior_aspect_id: behaviorAspectId,
    behavior_aspect: record.result.behavior_aspect,
    cultivation_motive_id: cultivationMotiveId,
    cultivation_motive: record.result.cultivation_motive,
    spirit_root_kind_id: spiritRootKindId,
    spirit_root_result: record.result.spirit_root_result,
    overall_confidence: record.result.confidence.overall,
  };
}

export function createCultivator(world: WorldState, input: CreateCultivatorInput): CharacterSummary {
  const name = input.name.trim(); if (!name || name.length > 24) throw new Error("Character name must be 1-24 chars.");
  const agentId = normalizeAgentId(input.agentId); const starter = starterProfile();
  const cultivatorId = `cultivator-${world.nextCultivatorSequence++}`;
  const starterLocationId = starterLocationIdFromRoll(Math.random());
  const cultivator: Cultivator = { id: cultivatorId, name, genderPresentation: input.genderPresentation ?? "unspecified", pronouns: input.pronouns?.trim() || "TA/TA", origin: input.origin?.trim() || "Yun Province", temperament: input.temperament?.trim() || "Cautious", createdByAgentId: agentId, realm: REALM_QI, realmLevel: 1, realmProgress: 0, locationId: starterLocationId, residence: defaultResidenceAt(starterLocationId, cultivatorId), spiritStones: starter.spiritStones, qi: 100, maxQi: 100, spiritualPower: 100, maxSpiritualPower: 100, stateReputation: createStateReputation({ [stateIdFromLocationId(starterLocationId)]: 12 }), factionReputation: starter.factionReputation, lifespan: 160, age: clamp(input.age ?? 18, 16, 80), sectId: null, neutralSectId: null, sectTitle: null, moralityScore: 0, pendingSectApplicationId: null, pendingMoralityChoiceId: null, totalContribution: 0, neutralContribution: 0, contributionReachedAt: 0, activeQuests: [], completedBaseQuests: 0, techniques: starter.techniques, inventory: starter.inventory, statusEffects: [], breakthroughRecords: [], dungeonProgress: createDungeonProgress(), activeJobId: null, injuryTicksRemaining: 0, registrationRecord: null };
  world.cultivators[cultivator.id] = cultivator;
  let selectedCultivatorId: string | null = null;
  if (agentId) { const binding = ensureAgentBinding(world, agentId); binding.cultivatorIds.push(cultivator.id); binding.selectedCultivatorId = cultivator.id; selectedCultivatorId = cultivator.id; }
  addDaoLog(world, cultivator.id, "Character Created", `${cultivator.name} enters the realm.`, ["character"]); addMessage(world, cultivator.id, "Registry", "Created", `${cultivator.name} is now active.`);
  return toSummary(cultivator, selectedCultivatorId);
}
export function syncCultivatorFromPersona(world: WorldState, input: CreateCultivatorInput & { agentId: string }): AgentPersonaSyncResult {
  const agentId = normalizeAgentId(input.agentId);
  if (!agentId) throw new Error("agentId is required.");
  const binding = ensureAgentBinding(world, agentId);
  const selectedCultivator =
    (binding.selectedCultivatorId ? world.cultivators[binding.selectedCultivatorId] : null) ??
    binding.cultivatorIds.map((id) => world.cultivators[id]).find(Boolean) ??
    null;
  if (!selectedCultivator) {
    const created = createCultivator(world, { ...input, agentId });
    return { agentId, selectedCultivatorId: created.id, cultivator: created, created: true };
  }
  if (!binding.selectedCultivatorId) binding.selectedCultivatorId = selectedCultivator.id;
  applyPersonaMetadata(selectedCultivator, input);
  return {
    agentId,
    selectedCultivatorId: selectedCultivator.id,
    cultivator: toSummary(selectedCultivator, binding.selectedCultivatorId),
    created: false,
  };
}
export function listCultivators(world: WorldState, agentId?: string | null): CharacterSummary[] {
  const normalizedAgentId = normalizeAgentId(agentId); if (!normalizedAgentId) return Object.values(world.cultivators).map((c) => toSummary(c, null));
  const binding = getAgentBinding(world, normalizedAgentId); if (!binding) return [];
  return binding.cultivatorIds.map((id) => world.cultivators[id]).filter(Boolean).map((c) => toSummary(c!, binding.selectedCultivatorId));
}
export function getAgentBindingInfo(world: WorldState, agentId: string) {
  const normalizedAgentId = normalizeAgentId(agentId); if (!normalizedAgentId) throw new Error("agentId is required.");
  return getAgentBinding(world, normalizedAgentId) ?? { agentId: normalizedAgentId, cultivatorIds: [], selectedCultivatorId: null };
}
export function selectCultivatorForAgent(world: WorldState, agentId: string, cultivatorId: string) {
  const normalizedAgentId = normalizeAgentId(agentId); if (!normalizedAgentId) throw new Error("agentId is required.");
  const binding = ensureAgentBinding(world, normalizedAgentId); if (!binding.cultivatorIds.includes(cultivatorId)) throw new Error("The requested cultivator is not owned by this agent.");
  binding.selectedCultivatorId = cultivatorId; return { agentId: normalizedAgentId, selectedCultivatorId: cultivatorId, selectedCultivator: toSummary(getCultivatorOrThrow(world, cultivatorId), cultivatorId) };
}
export function resolveCultivatorIdForAgent(world: WorldState, agentId: string): string {
  const binding = getAgentBindingInfo(world, agentId); if (!binding.selectedCultivatorId) throw new Error("This agent has no selected cultivator."); return binding.selectedCultivatorId;
}

export function getMessages(world: WorldState, cultivatorId: string) {
  getCultivatorOrThrow(world, cultivatorId);
  return structuredClone(
    world.messages.filter(
      (message) =>
        message.cultivatorId === cultivatorId ||
        message.fromCultivatorId === cultivatorId ||
        message.toCultivatorId === cultivatorId,
    ),
  );
}
export function getDaoLogs(world: WorldState, cultivatorId: string) { getCultivatorOrThrow(world, cultivatorId); return world.daoLogs.filter((e) => e.cultivatorId === cultivatorId); }
export function getCombatLogs(world: WorldState, cultivatorId: string, limit = 10) { getCultivatorOrThrow(world, cultivatorId); return world.combatLogs.filter((e) => e.cultivatorId === cultivatorId).slice(0, clamp(limit, 1, 50)); }
export function getRecentWorldEvents(world: WorldState, cultivatorId?: string, limit = 10) { return (cultivatorId ? world.worldEvents.filter((e) => e.cultivatorId === null || e.cultivatorId === cultivatorId) : world.worldEvents).slice(0, clamp(limit, 1, 50)); }
export function sendDirectMessage(
  world: WorldState,
  fromCultivatorId: string,
  toCultivatorId: string,
  from: string,
  subject: string,
  content: string,
): Message {
  const sender = getCultivatorOrThrow(world, fromCultivatorId);
  const recipient = getCultivatorOrThrow(world, toCultivatorId);
  if (sender.id === recipient.id) {
    throw new Error("A cultivator cannot send a private message to themselves.");
  }
  if (!subject.trim()) {
    throw new Error("Direct message subject is required.");
  }
  if (!content.trim()) {
    throw new Error("Direct message content is required.");
  }
  return structuredClone(
    addMessage(world, recipient.id, from.trim(), subject.trim(), content.trim(), {
      fromCultivatorId: sender.id,
      toCultivatorId: recipient.id,
    }),
  );
}
export function getCultivationRegistration(world: WorldState, cultivatorId: string): CultivationRegistrationRecord | null {
  return structuredClone(getCultivatorOrThrow(world, cultivatorId).registrationRecord ?? null);
}
export function saveCultivationRegistration(
  world: WorldState,
  cultivatorId: string,
  record: CultivationRegistrationRecord,
  savedByAgentId?: string | null,
): CultivationRegistrationRecord {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const validated = validateRegistrationRecord(structuredClone(record));
  const savedAt = new Date().toISOString();
  const stored: CultivationRegistrationRecord = {
    ...validated,
    saved_at: savedAt,
    cultivator_id: cultivator.id,
    agent_id: normalizeAgentId(savedByAgentId) ?? cultivator.createdByAgentId,
  };
  cultivator.registrationRecord = stored;
  addDaoLog(world, cultivator.id, "问心定档", `${cultivator.name} completed registration: ${stored.result.core_temperament}, ${stored.result.behavior_aspect}, ${stored.result.cultivation_motive}.`, ["registration", "attunement"]);
  addMessage(world, cultivator.id, "Immortal Registry", "Registration Locked", `${cultivator.name}'s cultivation registration has been recorded.`);
  return structuredClone(stored);
}

function hasEffect(cultivator: Cultivator, effectId: StatusEffect["id"]) { return cultivator.statusEffects.some((effect) => effect.id === effectId); }
function upsertEffect(cultivator: Cultivator, effect: StatusEffect) {
  const existing = cultivator.statusEffects.find((entry) => entry.id === effect.id);
  if (existing) { existing.remainingTicks = Math.max(existing.remainingTicks, effect.remainingTicks); existing.intensity = Math.max(existing.intensity, effect.intensity); existing.source = effect.source; return; }
  cultivator.statusEffects.push(effect);
}
function syncWounded(cultivator: Cultivator) {
  cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "wounded");
  if (cultivator.injuryTicksRemaining > 0) cultivator.statusEffects.push({ id: "wounded", name: "Wounded", description: "Risky actions are restricted.", source: "injury", remainingTicks: cultivator.injuryTicksRemaining, intensity: 1 });
}
export function statusOf(cultivator: Cultivator): "idle" | "busy" | "injured" { return cultivator.activeJobId ? "busy" : cultivator.injuryTicksRemaining > 0 ? "injured" : "idle"; }
function standing(value: number) { return value < -15 ? "hostile" : value < 5 ? "cold" : value < 25 ? "neutral" : value < 50 ? "trusted" : "favored"; }
function marketStandingDiscount(cultivator: Cultivator) { return Math.max(0, Math.min(50, Math.floor(currentStateReputation(cultivator) / 20) * 10)); }
function buyPrice(cultivator: Cultivator, base: number) { return Math.max(Math.floor(base * 0.65), base - marketStandingDiscount(cultivator)); }
function marketStandingBonus(cultivator: Cultivator) { return Math.max(-20, Math.min(40, Math.floor(currentStateReputation(cultivator) / 20) * 10)); }
function sellPrice(cultivator: Cultivator, base: number) { return Math.max(15, base + marketStandingBonus(cultivator)); }
function itemDefinition(world: WorldState, itemId: ItemId) {
  const definition = world.itemDefinitions[itemId];
  if (!definition) {
    throw new Error(`Item definition not found: ${itemId}`);
  }
  return definition;
}
function itemActionLabel(itemId: ItemId, operation: "buy" | "sell" | "use" | "study") {
  const noun = itemId.replace(/-/g, " ");
  return `${operation[0].toUpperCase()}${operation.slice(1)} ${noun}`;
}
function resolveItemEffectBundle(
  definition: WorldState["itemDefinitions"][ItemId],
  registration?: ReturnType<typeof registrationModifiersOf>,
): EventEffect | null {
  if (!definition.use.effectBundle) {
    return null;
  }
  const bundle = structuredClone(definition.use.effectBundle);
  if (definition.use.kind === "study" && (registration?.studyBonus ?? 0) !== 0) {
    bundle.realmProgress = (bundle.realmProgress ?? 0) + (registration?.studyBonus ?? 0);
  }
  return bundle;
}
function summarizeItemEffects(
  effectBundle: EventEffect | null,
  technique: string | null,
): AvailableAction["effects"] | undefined {
  let hasContent = false;
  const effects: NonNullable<AvailableAction["effects"]> = {};
  if (typeof effectBundle?.spiritStones === "number") {
    effects.spiritStones = effectBundle.spiritStones;
    hasContent = true;
  }
  if (typeof effectBundle?.qi === "number") {
    effects.qi = effectBundle.qi;
    hasContent = true;
  }
  if (typeof effectBundle?.spiritualPower === "number") {
    effects.spiritualPower = effectBundle.spiritualPower;
    hasContent = true;
  }
  if (typeof effectBundle?.realmProgress === "number") {
    effects.realmProgress = effectBundle.realmProgress;
    hasContent = true;
  }
  if (typeof effectBundle?.injuryTicksDelta === "number") {
    effects.injuryTicksDelta = effectBundle.injuryTicksDelta;
    hasContent = true;
  }
  const statusEffectIds = effectBundle?.statusEffects?.map((status) => status.effectId) ?? [];
  if (statusEffectIds.length > 0) {
    effects.statusEffectIds = statusEffectIds;
    hasContent = true;
  }
  if (technique) {
    effects.techniques = [technique];
    hasContent = true;
  }
  return hasContent ? effects : undefined;
}

function realmOfLevel(level: number): Cultivator["realm"] {
  return level <= 3 ? REALM_QI : level <= 6 ? REALM_FOUNDATION : REALM_CORE;
}

function addRealmProgress(cultivator: Cultivator, amount: number): void {
  cultivator.realmProgress = clamp(cultivator.realmProgress + amount, 0, BREAKTHROUGH_PROGRESS_REQUIRED);
}

function breakthroughDefinitionOf(cultivator: Cultivator): BreakthroughDefinition | null {
  switch (cultivator.realmLevel) {
    case 1:
      return {
        category: "minor",
        targetRealm: REALM_QI,
        targetLevel: 2,
        commonItemId: "qi-common",
        commonCount: 1,
        specialItemId: "qi-stage-1-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    case 2:
      return {
        category: "minor",
        targetRealm: REALM_QI,
        targetLevel: 3,
        commonItemId: "qi-common",
        commonCount: 2,
        specialItemId: "qi-stage-2-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    case 3:
      return {
        category: "major",
        targetRealm: REALM_FOUNDATION,
        targetLevel: 4,
        commonItemId: "qi-common",
        commonCount: 3,
        specialItemId: "qi-major-special",
        specialCount: 1,
        durationTicks: 6,
        baseSuccessRate: 70,
      };
    case 4:
      return {
        category: "minor",
        targetRealm: REALM_FOUNDATION,
        targetLevel: 5,
        commonItemId: "foundation-common",
        commonCount: 1,
        specialItemId: "foundation-stage-1-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    case 5:
      return {
        category: "minor",
        targetRealm: REALM_FOUNDATION,
        targetLevel: 6,
        commonItemId: "foundation-common",
        commonCount: 2,
        specialItemId: "foundation-stage-2-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    case 6:
      return {
        category: "major",
        targetRealm: REALM_CORE,
        targetLevel: 7,
        commonItemId: "foundation-common",
        commonCount: 3,
        specialItemId: "foundation-major-special",
        specialCount: 1,
        durationTicks: 6,
        baseSuccessRate: 55,
      };
    case 7:
      return {
        category: "minor",
        targetRealm: REALM_CORE,
        targetLevel: 8,
        commonItemId: "core-common",
        commonCount: 1,
        specialItemId: "core-stage-1-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    case 8:
      return {
        category: "minor",
        targetRealm: REALM_CORE,
        targetLevel: 9,
        commonItemId: "core-common",
        commonCount: 2,
        specialItemId: "core-stage-2-special",
        specialCount: 1,
        durationTicks: 4,
        baseSuccessRate: null,
      };
    default:
      return null;
  }
}

function breakthroughConsumedItemsOf(
  definition: BreakthroughDefinition,
): Array<{ itemId: ItemId; count: number }> {
  return [
    { itemId: definition.commonItemId, count: definition.commonCount },
    { itemId: definition.specialItemId, count: definition.specialCount },
  ];
}

function breakthroughRecipeIdOf(definition: BreakthroughDefinition): string {
  return `recipe-${definition.specialItemId}`;
}

function breakthroughRateBreakdownOf(
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
): { successRate: number | null; rateBreakdown: BreakthroughRateModifier[] } {
  if (definition.baseSuccessRate === null) {
    return { successRate: null, rateBreakdown: [] };
  }

  const rateBreakdown: BreakthroughRateModifier[] = [];
  if (hasEffect(cultivator, "insight")) {
    rateBreakdown.push({ source: "insight", delta: 10 });
  }
  if (hasEffect(cultivator, "clear-mind")) {
    rateBreakdown.push({ source: "clear-mind", delta: 8 });
  }
  if (hasEffect(cultivator, "spirit-saturated")) {
    rateBreakdown.push({ source: "spirit-saturated", delta: 5 });
  }
  if (hasEffect(cultivator, "deviation")) {
    rateBreakdown.push({ source: "deviation", delta: -20 });
  }
  if (hasEffect(cultivator, "poisoned")) {
    rateBreakdown.push({ source: "poisoned", delta: -10 });
  }
  if (cultivator.injuryTicksRemaining > 0) {
    rateBreakdown.push({ source: "injury", delta: -15 });
  }

  const totalDelta = rateBreakdown.reduce((sum, modifier) => sum + modifier.delta, 0);
  return {
    successRate: clamp(
      definition.baseSuccessRate + totalDelta,
      BREAKTHROUGH_MIN_RATE,
      BREAKTHROUGH_MAX_RATE,
    ),
    rateBreakdown,
  };
}

function hasBreakthroughMaterials(cultivator: Cultivator, definition: BreakthroughDefinition): boolean {
  return breakthroughConsumedItemsOf(definition).every(
    (item) => cultivator.inventory[item.itemId] >= item.count,
  );
}

function dungeonLockReasonOf(cultivator: Cultivator, location: WorldState["locations"][string]): string | null {
  const metadata = dungeonMetadataOf(location);
  if (!metadata) {
    return null;
  }
  return meetsRealmRequirement(cultivator, metadata.minRealm)
    ? null
    : `Requires ${metadata.minRealm} realm access.`;
}

function dungeonViewForLocation(
  world: WorldState,
  cultivator: Cultivator,
  location: WorldState["locations"][string] | undefined,
): DungeonStateView | null {
  const metadata = dungeonMetadataOf(location);
  if (!metadata) {
    return null;
  }
  const highestClearedRank = highestClearedRankOf(cultivator, metadata.grade);
  const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
  const availableRanks = meetsRealmRequirement(cultivator, metadata.minRealm)
    ? unlockedDungeonRanksOf(cultivator, metadata.grade)
    : [];
  return {
    grade: metadata.grade,
    minRealm: metadata.minRealm,
    highestClearedRank,
    highestUnlockedRank,
    availableRanks,
    frontierRank: highestUnlockedRank,
    recommendedRank: recommendedDungeonRankOf(cultivator, metadata.grade),
    materialBand: metadata.materialBand,
    rankYieldHints: buildDungeonRankYieldHints(availableRanks, metadata.materialBand),
    lockReason: dungeonLockReasonOf(cultivator, location!),
  };
}

function preferredDungeonGuardianAction(
  world: WorldState,
  cultivator: Cultivator,
  nodeType: DungeonNodeType,
): ActionId | null {
  const currentLocation = world.locations[cultivator.locationId];
  if (currentLocation?.nodeType === nodeType) {
    const dungeonView = dungeonViewForLocation(world, cultivator, currentLocation);
    if (dungeonView?.lockReason) {
      return null;
    }
    const targetRank = dungeonView ? dungeonView.frontierRank : 1;
    return challengeGuardianActionIdOf(targetRank);
  }
  const nearestDungeonId = findNearestLocationId(
    world,
    cultivator.locationId,
    (candidate) => candidate.nodeType === nodeType,
  );
  return nearestDungeonId ? travelActionIdOf(nearestDungeonId) : null;
}

function trimPrependedEntries<T>(entries: T[], previousLength: number): void {
  const added = entries.length - previousLength;
  if (added > 0) {
    entries.splice(0, added);
  }
}

function positiveInventoryDelta(
  before: Record<ItemId, number>,
  after: Record<ItemId, number>,
): Partial<Record<ItemId, number>> {
  const delta: Partial<Record<ItemId, number>> = {};
  for (const itemId of Object.keys(after) as ItemId[]) {
    const change = (after[itemId] ?? 0) - (before[itemId] ?? 0);
    if (change > 0) {
      delta[itemId] = change;
    }
  }
  return delta;
}

function safeExpeditionReturnLocationId(world: WorldState, fromLocationId: string): string {
  return findNearestLocationId(world, fromLocationId, (candidate) => canHealAtLocation(candidate)) ?? fromLocationId;
}

function writeDungeonExpeditionSummaryEvent(
  world: WorldState,
  cultivatorId: string,
  locationId: string,
  report: DungeonExpeditionReport,
): void {
  addWorldEvent(world, {
    cultivatorId,
    locationId,
    title: "Dungeon Expedition",
    content: report.summary,
    severity: report.outcome === "catastrophic" ? "high" : "medium",
    tags: ["dungeon-expedition", report.outcome, `rank-${report.targetRank}`, report.policy],
  });
}

function extractDungeonFlavorEventTitles(
  worldEvents: readonly WorldEvent[],
  beforeEventCount: number,
  actionId: ActionId,
): string[] {
  const addedCount = Math.max(0, worldEvents.length - beforeEventCount);
  if (addedCount === 0) {
    return [];
  }

  return worldEvents
    .slice(0, addedCount)
    .filter((event) => event.tags.includes("node-specific") && event.tags.includes(actionId))
    .map((event) => event.title.replace(/^\[[^\]]+\]\s*/, "").trim())
    .filter((title) => title.length > 0);
}

function finalizeDungeonExpedition(
  world: WorldState,
  cultivator: Cultivator,
  progress: DungeonExpeditionProgress,
  outcome: DungeonExpeditionReport["outcome"],
): DungeonExpeditionReport {
  const metadata = dungeonMetadataOf(world.locations[progress.locationId]);
  if (!metadata) {
    throw new Error("Dungeon expedition progress requires dungeon metadata.");
  }

  const returnLocationId = safeExpeditionReturnLocationId(world, cultivator.locationId);
  cultivator.locationId = returnLocationId;

  const report = createDungeonExpeditionReport({
    progress,
    outcome,
    endedAtTick: world.tick,
    returnLocationId,
    primaryMaterial: metadata.materialBand,
  });

  world.dungeonExpeditionReports[cultivator.id] = report;
  delete world.dungeonExpeditions[cultivator.id];
  writeDungeonExpeditionSummaryEvent(world, cultivator.id, returnLocationId, report);
  return report;
}

function resolveDungeonExpeditionStepIfDue(
  world: WorldState,
  job: ActionJob,
  progress: DungeonExpeditionProgress,
): void {
  if (world.tick < progress.nextResolutionTick) {
    return;
  }

  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  const location = world.locations[cultivator.locationId];
  const metadata = dungeonMetadataOf(location);
  if (!metadata) {
    throw new Error("Dungeon expedition requires the cultivator to remain in a dungeon.");
  }

  const beforeInventory = structuredClone(cultivator.inventory);
  const beforeSpiritStones = cultivator.spiritStones;
  const beforeRealmProgress = cultivator.realmProgress;
  const beforeHighestClearedRank = highestClearedRankOf(cultivator, progress.grade);
  const beforeEventCount = world.worldEvents.length;
  const beforeCombatCount = world.combatLogs.length;
  const beforePendingMoralityChoiceId = cultivator.pendingMoralityChoiceId;
  const beforePendingChoiceIds = new Set(Object.keys(world.pendingMoralityChoices));

  const actionKind = chooseDungeonExpeditionStepKind({
    targetRank: progress.targetRank,
    frontierRank: highestUnlockedRankOf(cultivator, progress.grade),
    highestClearedRank: beforeHighestClearedRank,
    policy: progress.policy,
    jobId: job.id,
    stepIndex: progress.stepIndex,
    worldTick: world.tick,
    cultivatorId: cultivator.id,
  });
  const actionId = actionKind === "guardian"
    ? challengeGuardianActionIdOf(progress.targetRank)
    : searchFortuneActionIdOf(progress.targetRank);

  const outerJobId = cultivator.activeJobId;
  const syntheticJob: ActionJob = {
    id: `job-${world.nextJobSequence++}`,
    cultivatorId: cultivator.id,
    actionId,
    label: `Dungeon expedition ${actionKind}`,
    remainingTicks: DUNGEON_EXPEDITION_STEP_TICKS,
    totalTicks: DUNGEON_EXPEDITION_STEP_TICKS,
    meta: {
      dungeonGrade: progress.grade,
      dungeonRank: progress.targetRank,
    },
  };

  resolveEnhancedJob(world, syntheticJob);
  cultivator.activeJobId = outerJobId;

  const flavorEventTitles = actionKind === "search"
    ? extractDungeonFlavorEventTitles(world.worldEvents, beforeEventCount, actionId)
    : [];

  trimPrependedEntries(world.worldEvents, beforeEventCount);
  trimPrependedEntries(world.combatLogs, beforeCombatCount);

  for (const choiceId of Object.keys(world.pendingMoralityChoices)) {
    if (!beforePendingChoiceIds.has(choiceId)) {
      delete world.pendingMoralityChoices[choiceId];
    }
  }
  cultivator.pendingMoralityChoiceId = beforePendingMoralityChoiceId;

  const inventoryDelta = positiveInventoryDelta(beforeInventory, cultivator.inventory);
  const primaryMaterialCount = inventoryDelta[metadata.materialBand] ?? 0;
  delete inventoryDelta[metadata.materialBand];

  const updatedProgress = recordDungeonExpeditionStep({
    progress,
    action: actionKind,
    primaryMaterialCount,
    secondaryDrops: inventoryDelta,
    spiritStoneGain: cultivator.spiritStones - beforeSpiritStones,
    realmProgressGain: cultivator.realmProgress - beforeRealmProgress,
    unlockedNextRank: highestClearedRankOf(cultivator, progress.grade) > beforeHighestClearedRank,
    resolvedAtTick: world.tick,
    flavorEventTitles,
  });

  world.dungeonExpeditions[cultivator.id] = updatedProgress;
  job.meta = {
    ...job.meta,
    dungeonExpeditionPolicy: updatedProgress.policy,
    dungeonExpeditionTargetRank: updatedProgress.targetRank,
    dungeonExpeditionStepIndex: updatedProgress.stepIndex,
    dungeonExpeditionNextResolutionTick: updatedProgress.nextResolutionTick,
  };

  if (isDungeonExpeditionCatastrophic(cultivator)) {
    finalizeDungeonExpedition(world, cultivator, updatedProgress, "catastrophic");
    job.remainingTicks = 0;
    return;
  }

  if (shouldRetreatDungeonExpedition(cultivator, updatedProgress.policy)) {
    finalizeDungeonExpedition(world, cultivator, updatedProgress, "withdrew");
    job.remainingTicks = 0;
    return;
  }

  if (updatedProgress.stepIndex >= DUNGEON_EXPEDITION_MAX_STEPS) {
    finalizeDungeonExpedition(world, cultivator, updatedProgress, "completed");
    job.remainingTicks = 0;
  }
}

function preferredCommonMaterialAction(
  world: WorldState,
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
): ActionId | null {
  if (definition.commonItemId === "qi-common") {
    if (world.locations[cultivator.locationId]?.kind === "safe") {
      return "take-mortal-task";
    }
    const nearestSafeLocationId = findNearestLocationId(
      world,
      cultivator.locationId,
      (candidate) => candidate.kind === "safe",
    );
    return nearestSafeLocationId ? travelActionIdOf(nearestSafeLocationId) : null;
  }

  if (definition.commonItemId === "foundation-common") {
    if (world.locations[cultivator.locationId]?.nodeType === "wilderness") {
      return "mine-spirit-stones";
    }
    const nearestWildernessId = findNearestLocationId(
      world,
      cultivator.locationId,
      (candidate) => candidate.nodeType === "wilderness",
    );
    return nearestWildernessId ? travelActionIdOf(nearestWildernessId) : null;
  }

  return preferredDungeonGuardianAction(world, cultivator, "dungeon-a");
}

function breakthroughRecommendedActionOf(
  world: WorldState,
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
): ActionId | null {
  const readyByProgress = cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED;
  const readyByMaterials = hasBreakthroughMaterials(cultivator, definition);

  if (readyByProgress && readyByMaterials) {
    return isAtResidence(cultivator)
      ? "residence-breakthrough"
      : (travelActionIdOf(cultivator.residence.locationId) as ActionId);
  }

  const recipe = getResidenceRecipeById(breakthroughRecipeIdOf(definition));
  const canCraftSpecial = recipe ? canCraftResidenceRecipe(cultivator, recipe) : false;
  const hasSpecial = cultivator.inventory[definition.specialItemId] >= definition.specialCount;

  if (readyByProgress) {
    if (!hasSpecial && canCraftSpecial) {
      return isAtResidence(cultivator)
        ? (`residence-produce:${recipe!.id}` as ActionId)
        : (travelActionIdOf(cultivator.residence.locationId) as ActionId);
    }
    return preferredCommonMaterialAction(world, cultivator, definition);
  }

  if (cultivator.locationId === cultivator.residence.locationId) {
    return "residence-meditate";
  }
  if (cultivator.spiritStones >= 80 && cultivator.spiritualPower >= 20) {
    return "cultivate";
  }
  return preferredCommonMaterialAction(world, cultivator, definition);
}

function breakthroughViewOf(
  world: WorldState,
  cultivator: Cultivator,
): BreakthroughStateView | null {
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) {
    return null;
  }

  const commonRequirement = {
    itemId: definition.commonItemId,
    count: definition.commonCount,
    owned: cultivator.inventory[definition.commonItemId],
  };
  const specialRequirement = {
    itemId: definition.specialItemId,
    count: definition.specialCount,
    owned: cultivator.inventory[definition.specialItemId],
  };
  const missingItems = breakthroughConsumedItemsOf(definition)
    .map((item) => {
      const owned = cultivator.inventory[item.itemId];
      const missing = Math.max(0, item.count - owned);
      return {
        itemId: item.itemId,
        required: item.count,
        owned,
        missing,
      };
    })
    .filter((item) => item.missing > 0);
  const rateInfo = breakthroughRateBreakdownOf(cultivator, definition);

  return {
    targetRealm: definition.targetRealm,
    targetLevel: definition.targetLevel,
    category: definition.category,
    readyByProgress: cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED,
    readyByMaterials: missingItems.length === 0,
    requiresResidence: true,
    commonRequirement,
    specialRequirement,
    missingItems,
    majorSuccessRate: rateInfo.successRate,
    rateBreakdown: rateInfo.rateBreakdown,
    recommendedAction: breakthroughRecommendedActionOf(world, cultivator, definition),
  };
}

function buildBreakthroughAction(cultivator: Cultivator): AvailableAction | null {
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) {
    return null;
  }
  return {
    actionId: "residence-breakthrough",
    label: definition.category === "major" ? "Residence breakthrough (major)" : "Residence breakthrough",
    description:
      definition.category === "major"
        ? `Attempt a major breakthrough to level ${definition.targetLevel} at residence.`
        : `Break through to level ${definition.targetLevel} at residence.`,
    durationTicks: definition.durationTicks,
    kind: "timed",
    costs: {
      itemConsumes: breakthroughConsumedItemsOf(definition),
    },
  };
}

function recordBreakthrough(
  cultivator: Cultivator,
  record: BreakthroughRecord,
): void {
  cultivator.breakthroughRecords.push(record);
}

function resolveResidenceBreakthrough(world: WorldState, cultivator: Cultivator, job: ActionJob): string {
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) {
    throw new Error("No breakthrough is available at the current realm level.");
  }
  if (cultivator.realmProgress < BREAKTHROUGH_PROGRESS_REQUIRED) {
    throw new Error("Breakthrough requires full realm progress.");
  }
  if (!hasBreakthroughMaterials(cultivator, definition)) {
    throw new Error("Breakthrough materials are missing.");
  }

  const fromRealm = cultivator.realm;
  const fromLevel = cultivator.realmLevel;
  const consumedItems = breakthroughConsumedItemsOf(definition);
  for (const item of consumedItems) {
    cultivator.inventory[item.itemId] -= item.count;
  }

  const rateInfo = breakthroughRateBreakdownOf(cultivator, definition);
  const successRate = job.meta?.breakthroughSuccessRate ?? rateInfo.successRate;
  const rateBreakdown = job.meta?.breakthroughRateBreakdown ?? rateInfo.rateBreakdown;
  const success =
    definition.category === "minor"
      ? true
      : (hashString(`${world.tick}:${job.id}:breakthrough`) % 100) < (successRate ?? definition.baseSuccessRate ?? 0);

  if (!success) {
    cultivator.realmProgress = BREAKTHROUGH_FAILURE_PROGRESS;
    recordBreakthrough(cultivator, {
      tick: world.tick,
      fromRealm,
      fromLevel,
      toRealm: definition.targetRealm,
      toLevel: definition.targetLevel,
      category: definition.category,
      outcome: "failure",
      consumedItems,
      successRate: successRate ?? undefined,
      rateBreakdown,
    });
    addDaoLog(
      world,
      cultivator.id,
      "Breakthrough Failed",
      `${cultivator.name} failed the breakthrough to level ${definition.targetLevel} and fell back to 60 progress.`,
      ["breakthrough", "failure", "residence-breakthrough", definition.category],
    );
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId: cultivator.locationId,
      title: "Breakthrough Failed",
      content: `${cultivator.name} failed a ${definition.category} breakthrough attempt.`,
      severity: "medium",
      tags: ["breakthrough", "failure", definition.category],
    });
    return `${cultivator.name} failed the breakthrough to level ${definition.targetLevel}.`;
  }

  cultivator.realmLevel = definition.targetLevel;
  cultivator.realm = realmOfLevel(definition.targetLevel);
  cultivator.realmProgress = 0;
  cultivator.maxQi += 12;
  cultivator.maxSpiritualPower += 12;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.lifespan += 12;
  recordBreakthrough(cultivator, {
    tick: world.tick,
    fromRealm,
    fromLevel,
    toRealm: cultivator.realm,
    toLevel: cultivator.realmLevel,
    category: definition.category,
    outcome: "success",
    consumedItems,
    successRate: successRate ?? undefined,
    rateBreakdown,
  });
  addDaoLog(
    world,
    cultivator.id,
    "Breakthrough Success",
    `${cultivator.name} advanced to level ${cultivator.realmLevel}.`,
    ["breakthrough", "success", "residence-breakthrough", definition.category, "action-complete"],
  );
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "Breakthrough Success",
    content: `${cultivator.name} completed a ${definition.category} breakthrough and reached level ${cultivator.realmLevel}.`,
    severity: definition.category === "major" ? "high" : "medium",
    tags: ["breakthrough", "success", definition.category],
  });
  return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`;
}
function buildItemAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ActionId,
  registration = registrationModifiersOf(cultivator),
): AvailableAction {
  const binding = getItemActionBinding(actionId);
  if (!binding) {
    throw new Error(`Action is not item-backed: ${actionId}`);
  }
  const definition = itemDefinition(world, binding.itemId);
  if (binding.operation === "buy") {
    const base = definition.trade.buyBasePrice;
    if (base === null) {
      throw new Error(`Item cannot be bought: ${binding.itemId}`);
    }
    const price = buyPrice(cultivator, base);
    return {
      actionId,
      label: itemActionLabel(binding.itemId, binding.operation),
      description: `${price} spirit stones.`,
      durationTicks: 0,
      kind: "immediate",
      itemBinding: binding,
      costs: { spiritStones: price },
    };
  }
  if (binding.operation === "sell") {
    const base = definition.trade.sellBasePrice;
    if (base === null) {
      throw new Error(`Item cannot be sold: ${binding.itemId}`);
    }
    const income = sellPrice(cultivator, base);
    return {
      actionId,
      label: itemActionLabel(binding.itemId, binding.operation),
      description: `${income} spirit stones.`,
      durationTicks: 0,
      kind: "immediate",
      itemBinding: binding,
      costs: { itemConsumes: [{ itemId: binding.itemId, count: 1 }] },
      effects: { spiritStones: income },
    };
  }
  const effectBundle = resolveItemEffectBundle(definition, registration);
  return {
    actionId,
    label: itemActionLabel(binding.itemId, binding.operation),
    description: definition.use.effectSummary ?? definition.description,
    durationTicks: 0,
    kind: "immediate",
    itemBinding: binding,
    costs: { itemConsumes: [{ itemId: binding.itemId, count: 1 }] },
    effects: summarizeItemEffects(effectBundle, binding.operation === "study" ? definition.use.grantsTechnique : null),
  };
}
function guidance(world: WorldState, cultivator: Cultivator) {
  const registration = registrationModifiersOf(cultivator);
  const breakthrough = breakthroughViewOf(world, cultivator);
  const location = world.locations[cultivator.locationId];
  const readiness = computeReadiness(cultivator);
  const recoveryState = computeRecoveryState(cultivator);
  const canHealHere = location ? canHealAtLocation(location) : false;
  const nearestSafeLocationId = findNearestLocationId(world, cultivator.locationId, (candidate) => canHealAtLocation(candidate));
  const safeTravelAction = nearestSafeLocationId ? travelActionIdOf(nearestSafeLocationId) : "meditate";
  const nearestMainCityId = findNearestLocationId(world, cultivator.locationId, (candidate) => isMainCityNode(candidate.nodeType));
  const mainCityTravelAction = nearestMainCityId ? travelActionIdOf(nearestMainCityId) : "meditate";
  const nearestDungeonId = findNearestLocationId(
    world,
    cultivator.locationId,
    (candidate) => {
      const metadata = dungeonMetadataOf(candidate);
      return !!metadata && meetsRealmRequirement(cultivator, metadata.minRealm);
    },
  );
  const dungeonTravelAction = nearestDungeonId ? travelActionIdOf(nearestDungeonId) : "meditate";
  const nearestWildernessId = findNearestLocationId(world, cultivator.locationId, (candidate) => candidate.nodeType === "wilderness");
  const wildernessTravelAction = nearestWildernessId ? travelActionIdOf(nearestWildernessId) : "meditate";
  const warnings: string[] = []; const priorities: string[] = []; const suggestedActions: ActionId[] = [];
  if (readiness === "poor") {
    warnings.push("Readiness is poor.");
    priorities.push("Stabilize with low-risk recovery and safe income first.");
  }
  if (recoveryState === "injured" || recoveryState === "wounded") {
    warnings.push("Recovery state requires healing attention.");
  }
  if (recoveryState === "depleted") {
    warnings.push("Qi is depleted.");
  }
  if (cultivator.injuryTicksRemaining > 0) { warnings.push("Character is injured."); priorities.push("Recover before risky actions."); suggestedActions.push(canHealHere ? "heal" : safeTravelAction); }
  if (hasEffect(cultivator, "poisoned")) warnings.push("Poison drains HP each tick.");
  if (hasEffect(cultivator, "deviation")) { warnings.push("Qi deviation is active."); priorities.push("Stabilize before cultivation."); suggestedActions.push(canHealHere ? "heal" : safeTravelAction); }
  if (cultivator.spiritStones < 120) { priorities.push("Earn more spirit stones."); suggestedActions.push(location?.kind === "safe" ? "take-mortal-task" : safeTravelAction); }
  if (cultivator.inventory["spirit-ore"] + cultivator.inventory["ruin-fragment"] + cultivator.inventory["beast-core"] > 0) priorities.push("You can sell materials in the market.");
  if (hasEffect(cultivator, "insight")) priorities.push("Insight is active. Use it on cultivation or a major encounter.");
  if (hasEffect(cultivator, "spirit-saturated")) priorities.push("Spirit saturation is active. Good time for cultivation.");
  if (breakthrough?.readyByProgress) {
    priorities.push("Realm progress is capped. Advance the breakthrough chain instead of grinding more progress.");
    if (!breakthrough.readyByMaterials) {
      priorities.push("Collect the missing breakthrough materials, then craft the special item at residence.");
    }
    if (breakthrough.recommendedAction) {
      suggestedActions.unshift(breakthrough.recommendedAction);
    }
  }
  if (registration && cultivator.injuryTicksRemaining <= 0) {
    if (registration.cultivateBonus >= 8) priorities.push("Registration favors longer cultivation sessions.");
    if (registration.fortuneBonus >= 8) priorities.push("Registration favors scouting and flexible opportunity play.");
    if (registration.sectBonus >= 4) {
      if (cultivator.neutralSectId) {
        const neutralSect = getCultivatorNeutralSect(world, cultivator);
        suggestedActions.push(
          neutralSect && cultivator.locationId === neutralSect.headquarters
            ? "take-neutral-duty"
            : neutralSect
              ? travelActionIdOf(neutralSect.headquarters)
              : mainCityTravelAction,
        );
      } else if (cultivator.sectId) {
        const sect = getCultivatorSect(world, cultivator);
        suggestedActions.push(
          sect && cultivator.locationId === sect.headquarters
            ? "take-sect-errand"
            : sect
              ? travelActionIdOf(sect.headquarters)
              : mainCityTravelAction,
        );
      }
    }
    if (registration.fortuneBonus >= 8) {
      const dungeonView = dungeonViewForLocation(world, cultivator, location);
      suggestedActions.push(
        dungeonView && !dungeonView.lockReason
          ? searchFortuneActionIdOf(dungeonView.recommendedRank)
          : dungeonTravelAction,
      );
    }
    if (registration.mineBonus >= 6) suggestedActions.push(location?.nodeType === "wilderness" ? "mine-spirit-stones" : wildernessTravelAction);
    if (registration.cultivateBonus >= 8) suggestedActions.push("cultivate");
  }
  const hasLowRiskSuggestion = suggestedActions.some((actionId) => isLowRiskAction(actionId));
  if ((readiness === "poor" || recoveryState !== "healthy") && !hasLowRiskSuggestion) {
    if (isAtResidence(cultivator)) {
      suggestedActions.push("residence-recover-qi");
    } else if (location?.kind === "safe") {
      suggestedActions.push("take-mortal-task");
    } else {
      suggestedActions.push(safeTravelAction);
    }
  }
  if (!suggestedActions.length) suggestedActions.push("cultivate");
  return { warnings, priorities, suggestedActions: Array.from(new Set(suggestedActions)).slice(0, 4) as ActionId[] };
}

function hasDaoLogTag(world: WorldState, cultivatorId: string, tag: string): boolean {
  return world.daoLogs.some((entry) => entry.cultivatorId === cultivatorId && entry.tags.includes(tag));
}

function hasAnyPlayerActionLog(world: WorldState, cultivatorId: string): boolean {
  return world.daoLogs.some((entry) =>
    entry.cultivatorId === cultivatorId
    && (entry.tags.includes("action-complete") || entry.tags.includes("join-sect") || entry.tags.includes("join-neutral-sect")));
}

function hasResidenceCultivationLog(world: WorldState, cultivatorId: string): boolean {
  return world.daoLogs.some((entry) =>
    entry.cultivatorId === cultivatorId
    && (
      (entry.tags.includes("action-complete") && entry.tags.includes("residence-meditate"))
      || (entry.tags.includes("cultivation") && entry.tags.includes("residence"))
    ));
}

function hasLegacySectProgress(world: WorldState, cultivator: Cultivator): boolean {
  return hasDaoLogTag(world, cultivator.id, "sect-quest-complete") || cultivator.totalContribution > 0;
}

function firstUncompletedStage(completed: Set<OnboardingStage>): OnboardingStage | null {
  for (const stage of ONBOARDING_STAGE_ORDER) {
    if (!completed.has(stage)) {
      return stage;
    }
  }
  return null;
}

function decisionPolicy(): DecisionPolicyView {
  return {
    tutorialMode: "optional",
    tutorialRequired: false,
    freeExplorationAllowed: true,
    priorityOrder: [...DECISION_POLICY_PRIORITY_ORDER],
    summary:
      "Owner commands can override onboarding. Safety warnings come before risky ambition. Runtime guidance is advisory, and free exploration is allowed from current valid actions.",
  };
}

function onboardingHint(stage: OnboardingStage): string {
  if (stage === "registered") {
    return "Welcome. Start with a low-risk town action to begin your first loop.";
  }
  if (stage === "first-action") {
    return "Great start. Travel once to your local wilderness to complete the first travel step.";
  }
  if (stage === "first-travel") {
    return "Accept and complete one base quest from the local board.";
  }
  if (stage === "first-quest") {
    return "Return to residence and complete residence meditation once.";
  }
  if (stage === "first-residence-cultivation") {
    return "Reach full progress, gather breakthrough materials, craft the special item at residence, then break through.";
  }
  if (stage === "first-breakthrough" || stage === "completed") {
    return "Golden path completed. Continue with stable growth through quests, residence cultivation, and faction choices.";
  }
  return "Golden path completed. Continue long-term progression.";
}

function onboardingNextAction(world: WorldState, stage: OnboardingStage, cultivator: Cultivator): ActionId | null {
  if (stage === "registered") {
    return "take-mortal-task";
  }
  if (stage === "first-action") {
    const wildernessLocationId = `${stateIdFromLocationId(cultivator.locationId)}:wilderness`;
    return cultivator.locationId === wildernessLocationId
      ? travelActionIdOf(mainCityLocationIdOf(stateIdFromLocationId(cultivator.locationId)))
      : travelActionIdOf(wildernessLocationId);
  }
  if (stage === "first-travel") {
    const activeBaseQuest = cultivator.activeQuests.find((quest) => quest.category === "base");
    if (activeBaseQuest) {
      return `execute-quest:${activeBaseQuest.id}`;
    }
    const board = getQuestBoard(world, cultivator.locationId);
    const baseQuest = board?.quests.find((quest) => quest.category === "base");
    return baseQuest ? (`accept-quest:${baseQuest.id}` as ActionId) : "take-mortal-task";
  }
  if (stage === "first-quest") {
    return cultivator.locationId === cultivator.residence.locationId
      ? "residence-meditate"
      : (`travel-to:${cultivator.residence.locationId}` as ActionId);
  }
  if (stage === "first-residence-cultivation") {
    return breakthroughViewOf(world, cultivator)?.recommendedAction
      ?? (cultivator.locationId === cultivator.residence.locationId
        ? "residence-meditate"
        : (`travel-to:${cultivator.residence.locationId}` as ActionId));
  }
  return null;
}

function computeOnboardingProgress(world: WorldState, cultivator: Cultivator): OnboardingProgress {
  const completed = new Set<OnboardingStage>(["registered"]);

  if (cultivator.realmLevel >= 2 || hasLegacySectProgress(world, cultivator)) {
    completed.add("first-action");
    completed.add("first-travel");
    completed.add("first-quest");
    completed.add("first-residence-cultivation");
    completed.add("first-breakthrough");
    completed.add("completed");
  }

  if (hasAnyPlayerActionLog(world, cultivator.id)) {
    completed.add("first-action");
  }
  if (hasDaoLogTag(world, cultivator.id, "travel")) {
    completed.add("first-travel");
  }
  if (hasDaoLogTag(world, cultivator.id, "quest-complete")) {
    completed.add("first-quest");
  }
  if (hasResidenceCultivationLog(world, cultivator.id)) {
    completed.add("first-residence-cultivation");
  }
  if (cultivator.realmLevel >= 2) {
    completed.add("first-breakthrough");
    completed.add("completed");
  }

  const orderedCompleted = ONBOARDING_STAGE_ORDER.filter((stage) => completed.has(stage));
  const latestCompleted = orderedCompleted[orderedCompleted.length - 1] ?? "registered";
  const stage = completed.has("completed") ? "completed" : latestCompleted;

  return {
    stage,
    completedStages: orderedCompleted,
    nextAction: onboardingNextAction(world, stage, cultivator),
    hint: onboardingHint(stage),
    recommendedOnly: true,
    allowsFreeExploration: true,
  };
}

export function getStrategySnapshot(world: WorldState, cultivatorId: string): StrategySnapshot {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const plan = guidance(world, cultivator);
  const policy = decisionPolicy();
  const riskLevel =
    plan.warnings.length >= 2 || cultivator.injuryTicksRemaining > 0 || hasEffect(cultivator, "deviation")
      ? "high"
      : plan.warnings.length === 1 || hasEffect(cultivator, "poisoned")
        ? "medium"
        : "low";
  const shortTermGoal =
    plan.priorities[0] ??
    (cultivator.spiritStones < 120 ? "Restore basic resources." : "Push the current loop safely.");
  const longTermGoal =
    cultivator.sectId
      ? `Build toward the next realm while growing ${world.sects[cultivator.sectId]?.name ?? "sect"} standing.`
      : cultivator.neutralSectId
        ? `Build toward the next realm while steadily contributing to ${world.neutralSects[cultivator.neutralSectId]?.name ?? "your organization"}.`
        : "Grow resources and stability until stronger quests, travel, and organization choices feel safe.";
  const recommendedSequence: ActionId[] =
    plan.suggestedActions.length > 0 ? plan.suggestedActions : ["cultivate"];
  const reason =
    plan.warnings.length > 0
      ? plan.warnings.join(" ")
      : plan.priorities.join(" ") || "State is stable enough to continue the main progression loop.";
  return {
    tick: world.tick,
    cultivatorId,
    riskLevel,
    shortTermGoal,
    longTermGoal,
    recommendedSequence,
    reason,
    decisionPolicy: policy,
  };
}

function buildWildernessView(world: WorldState, cultivator: Cultivator): CultivatorStateView["wilderness"] {
  const progress = getActiveWildernessProgress(world, cultivator.id);
  if (!progress) {
    return null;
  }

  const layer = getWildernessLayerById(world, progress.layerId);
  if (!layer) {
    return null;
  }

  return {
    layerId: layer.layerId,
    layerName: layer.name,
    ticksSurvived: progress.ticksSurvived,
    remainingSurvivalTicks: progress.remainingSurvivalTicks,
    status: progress.status,
  };
}

function buildGuixuView(world: WorldState, cultivator: Cultivator): CultivatorStateView["guixu"] {
  const unlockedNodeIds = getCultivatorUnlockedGuixuNodeIds(world, cultivator.id);
  const availableNodeIds = listGuixuNodesForLocation(world, cultivator.locationId)
    .filter((node) => canUnlockGuixuNode(world, cultivator, node).allowed || unlockedNodeIds.includes(node.nodeId))
    .map((node) => node.nodeId);

  return {
    wildernessAttunement: world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0,
    unlockedNodeIds,
    sharedUnlockedNodeIds: [...world.guixuProgress.sharedUnlockedNodeIds],
    availableNodeIds,
  };
}

function buildSectStateView(world: WorldState, cultivator: Cultivator): CultivatorStateView["sect"] {
  if (!cultivator.sectId) {
    return null;
  }

  const sect = world.sects[cultivator.sectId];
  if (!sect) {
    return null;
  }

  const sectLevel = buildSectLevel(world, sect.id);
  const headquartersStateId = sect.headquarters.split(":")[0] ?? sect.headquarters;
  const activeWar = getActiveFactionWarForState(world, headquartersStateId);

  return {
    id: sect.id,
    name: sect.name,
    alignment: sect.alignment,
    role: cultivator.sectTitle ?? "澶栭棬",
    treasury: sect.treasury,
    memberCount: sect.memberIds.length,
    level: sectLevel?.level,
    bonuses: sectLevel?.bonuses ?? [],
    activeWarId: activeWar?.warId ?? null,
    warObjectives: activeWar ? structuredClone(activeWar.objectives) : [],
  };
}

export function getCultivatorState(world: WorldState, cultivatorId: string): CultivatorStateView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  repairCultivatorRealm(cultivator);
  const location = world.locations[cultivator.locationId]; const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null; const neutralSect = getCultivatorNeutralSect(world, cultivator);
  const sectView = buildSectStateView(world, cultivator);
  const policy = decisionPolicy();
  const availableItemActionIds = new Map<ItemId, ActionId[]>();
  for (const action of listAvailableActions(world, cultivatorId)) {
    const binding = action.itemBinding ?? getItemActionBinding(action.actionId);
    if (!binding) {
      continue;
    }
    const existing = availableItemActionIds.get(binding.itemId) ?? [];
    existing.push(action.actionId);
    availableItemActionIds.set(binding.itemId, existing);
  }
  const derivedState = {
    readiness: computeReadiness(cultivator),
    recoveryState: computeRecoveryState(cultivator),
    activityContext: computeActivityContext(cultivator, world),
    daoPotential: computeDaoPotential(cultivator),
  };
  return {
    tick: world.tick,
    cultivator: { id: cultivator.id, name: cultivator.name, realm: cultivator.realm, realmLevel: cultivator.realmLevel, realmPhase: realmPhaseOfLevel(cultivator.realmLevel), realmProgress: cultivator.realmProgress, status: statusOf(cultivator), location: location?.name ?? cultivator.locationId, spiritStones: cultivator.spiritStones, qi: cultivator.qi, maxQi: cultivator.maxQi, spiritualPower: cultivator.spiritualPower, maxSpiritualPower: cultivator.maxSpiritualPower, reputation: currentStateReputation(cultivator), lifespan: cultivator.lifespan, age: Number(cultivator.age.toFixed(2)), genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, moralityScore: cultivator.moralityScore, moralityAlignment: moralityAlignmentOfCultivator(cultivator) },
    cultivation: { mainTechnique: cultivator.techniques[0] ?? "Basic Breathing", techniques: cultivator.techniques },
    neutralSect: neutralSect ? { id: neutralSect.id, name: neutralSect.name, alignment: neutralSect.alignment, stateId: neutralSect.stateId, headquarters: neutralSect.headquarters, role: "member", memberCount: neutralSect.memberIds.length, neutralContribution: cultivator.neutralContribution, rewardMultiplier: neutralSect.rewardMultiplier, competitive: false } : null,
    sect: sectView,
    inventory: cultivator.inventory,
    inventoryDetails: Object.entries(cultivator.inventory)
      .filter(([, count]) => count > 0)
      .map(([itemId, count]) => {
        const id = itemId as ItemId;
        const definition = itemDefinition(world, id);
        return {
          id,
          name: definition.name,
          category: definition.category,
          description: definition.description,
          count,
          baseValue: definition.baseValue,
          tags: definition.tags,
          trade: definition.trade,
          use: definition.use,
          availableActionIds: availableItemActionIds.get(id) ?? [],
        };
      }),
    currentJob: cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
    nearbyOpportunities: [location && canTradeAtLocation(location) ? "Sell or buy supplies." : "Move for a better opportunity.", location?.nodeType === "wilderness" ? "Mine or hunt a beast." : "Stay aware of local events."],
    statusEffects: cultivator.statusEffects.map((effect) => ({ id: effect.id, name: effect.name, description: effect.description, remainingTicks: effect.remainingTicks, source: effect.source })),
    factionReputation: Object.entries(cultivator.factionReputation).map(([factionId, value]) => ({
      factionId,
      name: factionNameOf(world, factionId),
      value,
      standing: standing(value),
    })),
    recentEvents: getRecentWorldEvents(world, cultivatorId, 5),
    recentCombats: getCombatLogs(world, cultivatorId, 4),
    registration: registrationViewOf(cultivator),
    registrationEffects: registrationEffectsViewOf(cultivator),
    breakthrough: breakthroughViewOf(world, cultivator),
    dungeon: dungeonViewForLocation(world, cultivator, location),
    dungeonExpedition: buildDungeonExpeditionStateView(
      world,
      cultivator,
      cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
    ),
    wilderness: buildWildernessView(world, cultivator),
    guixu: buildGuixuView(world, cultivator),
    derivedState,
    onboarding: computeOnboardingProgress(world, cultivator),
    decisionPolicy: policy,
    agentGuidance: guidance(world, cultivator),
  };
}

function ensureSafetyNetActions(
  world: WorldState,
  cultivator: Cultivator,
  location: WorldState["locations"][string],
  actions: AvailableAction[],
): AvailableAction[] {
  if (actions.some((action) => isLowRiskAction(action.actionId))) {
    return actions;
  }
  if (isAtResidence(cultivator)) {
    return [
      ...actions,
      {
        actionId: "residence-recover-qi",
        label: "Residence recover qi",
        description: "Fallback recovery action that costs no spirit stones.",
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-recover-qi"],
        kind: "timed",
      },
    ];
  }
  const nearestSafeLocationId = findNearestLocationId(world, cultivator.locationId, (candidate) => canHealAtLocation(candidate));
  if (nearestSafeLocationId && nearestSafeLocationId !== cultivator.locationId) {
    const ticks = getDistanceBetween(world, cultivator.locationId, nearestSafeLocationId);
    if (Number.isFinite(ticks) && ticks > 0) {
      return [
        ...actions,
        {
          actionId: travelActionIdOf(nearestSafeLocationId),
          label: `Travel to ${world.locations[nearestSafeLocationId]?.name ?? nearestSafeLocationId}`,
          description: "Fallback action to return to a safe location.",
          durationTicks: ticks,
          kind: "timed",
        },
      ];
    }
  }
  if (location.kind === "safe") {
    return [
      ...actions,
      {
        actionId: "take-mortal-task",
        label: "Take town task",
        description: "Fallback stable income task.",
        durationTicks: DEFAULT_ACTION_DURATIONS["take-mortal-task"],
        kind: "timed",
      },
    ];
  }
  return actions;
}

export function listAvailableActions(world: WorldState, cultivatorId: string): AvailableAction[] {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const activeDungeonExpedition = getActiveDungeonExpedition(world, cultivator.id);
  if (cultivator.activeJobId) {
    return activeDungeonExpedition
      ? [{
          actionId: "abort-dungeon-expedition",
          label: "Abort dungeon expedition",
          description: "Stop the managed run, return to the nearest safe location, and settle the report now.",
          durationTicks: 0,
          kind: "immediate",
        }]
      : [];
  }
  const location = world.locations[cultivator.locationId];
  if (!location) throw new Error(`Location not found: ${cultivator.locationId}`);
  const registration = registrationModifiersOf(cultivator);
  const breakthrough = breakthroughViewOf(world, cultivator);
  const breakthroughAction =
    breakthrough?.readyByProgress && breakthrough.readyByMaterials
      ? buildBreakthroughAction(cultivator)
      : null;
  const localSect = getLocalSect(world, cultivator.locationId);
  const localNeutralSect = getLocalNeutralSect(world, cultivator.locationId);
  const joinedNeutralSect = getCultivatorNeutralSect(world, cultivator);
  const joinedSect = getCultivatorSect(world, cultivator);
  const activeWilderness = getActiveWildernessProgress(world, cultivator.id);
  const wildernessLayer = getWildernessLayerForLocation(world, cultivator.locationId);
  const recipeActions = RESIDENCE_PRODUCTION_RECIPES.map((recipe) => ({
    actionId: `residence-produce:${recipe.id}` as ActionId,
    label: `Residence produce (${recipe.outputItemId})`,
    description: `Craft ${recipe.outputItemId} at residence.`,
    durationTicks: recipe.durationTicks,
    kind: "timed" as const,
    costs: {
      spiritStones: recipe.spiritStoneCost,
      itemConsumes: recipe.inputMaterials.map((material) => ({ itemId: material.itemId, count: material.count })),
    },
  }));
  const actions: AvailableAction[] = activeWilderness
    ? []
    : getNeighborLocations(world, cultivator.locationId)
      .map(({ locationId: neighborId, ticks }) => ({
        actionId: travelActionIdOf(neighborId) as ActionId,
        label: `Travel to ${world.locations[neighborId]?.name ?? neighborId}`,
        description: `Travel to ${world.locations[neighborId]?.name ?? neighborId}.`,
        durationTicks: ticks,
        kind: "timed" as const,
      }));
  actions.push({ actionId: "meditate", label: "Meditate", description: "Recover spiritual power.", durationTicks: DEFAULT_ACTION_DURATIONS.meditate, kind: "timed" });
  for (const [itemId, count] of Object.entries(cultivator.inventory) as Array<[ItemId, number]>) {
    if (count <= 0) {
      continue;
    }
    const definition = itemDefinition(world, itemId);
    const operation = definition.use.kind === "study" ? "study" : "use";
    if (!definition.use.actionId || (operation !== "use" && operation !== "study")) {
      continue;
    }
    actions.push(buildItemAction(world, cultivator, definition.use.actionId, registration));
  }
  if (cultivator.injuryTicksRemaining > 0) {
    if (activeWilderness) {
      actions.push({
        actionId: "withdraw-from-wilderness",
        label: "Withdraw from wilderness",
        description: "Retreat before the expedition becomes fatal.",
        durationTicks: 0,
        kind: "immediate",
      });
      return actions;
    }
    if (isAtResidence(cultivator)) {
      actions.push(
        {
          actionId: "residence-heal",
          label: "Residence heal",
          description: "Recover injuries at residence.",
          durationTicks: DEFAULT_ACTION_DURATIONS["residence-heal"],
          kind: "timed",
        },
        {
          actionId: "residence-recover-qi",
          label: "Residence recover qi",
          description: "Quickly recover qi at residence.",
          durationTicks: DEFAULT_ACTION_DURATIONS["residence-recover-qi"],
          kind: "timed",
        },
        ...recipeActions,
      );
      if (breakthroughAction) {
        actions.push(breakthroughAction);
      }
      return ensureSafetyNetActions(world, cultivator, location, actions);
    }
    if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "Heal", description: "Recover injuries.", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
    return ensureSafetyNetActions(world, cultivator, location, actions);
  }
  if (isAtResidence(cultivator)) {
    actions.push(
      ...(!breakthrough?.readyByProgress
        ? [{
            actionId: "residence-meditate" as const,
            label: "Residence meditate",
            description: "Closed-door cultivation at residence.",
            durationTicks: DEFAULT_ACTION_DURATIONS["residence-meditate"],
            kind: "timed" as const,
          }]
        : []),
      ...(breakthroughAction ? [breakthroughAction] : []),
      {
        actionId: "residence-heal",
        label: "Residence heal",
        description: "Recover injuries at residence.",
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-heal"],
        kind: "timed",
      },
      {
        actionId: "residence-recover-qi",
        label: "Residence recover qi",
        description: "Quickly recover qi at residence.",
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-recover-qi"],
        kind: "timed",
      },
      ...recipeActions,
      {
        actionId: "residence-socialize",
        label: "Residence socialize",
        description: "Light social exchange at residence.",
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-socialize"],
        kind: "timed",
      },
    );
  }
  if (!breakthrough?.readyByProgress) {
    actions.push({ actionId: "cultivate", label: "Cultivate", description: "Spend spirit stones to gain progress.", durationTicks: DEFAULT_ACTION_DURATIONS.cultivate, kind: "timed" });
  }
  if (location.kind === "safe") actions.push({ actionId: "take-mortal-task", label: "Take town task", description: "Stable income.", durationTicks: DEFAULT_ACTION_DURATIONS["take-mortal-task"], kind: "timed" });
  if (canTradeAtLocation(location)) {
    for (const itemId of ["healing-pill", "qi-pill", "ward-talisman"] as const) {
      const actionId = getItemOperationActionId(itemId, "buy");
      if (actionId) {
        actions.push(buildItemAction(world, cultivator, actionId, registration));
      }
    }
    for (const [itemId, count] of Object.entries(cultivator.inventory) as Array<[ItemId, number]>) {
      if (count <= 0) {
        continue;
      }
      const actionId = getItemOperationActionId(itemId, "sell");
      if (actionId) {
        actions.push(buildItemAction(world, cultivator, actionId, registration));
      }
    }
  }
  if (!cultivator.sectId && !cultivator.neutralSectId && localNeutralSect?.joinable) {
    actions.push({ actionId: `join-neutral-sect:${localNeutralSect.id}`, label: `Join ${localNeutralSect.name}`, description: "Join the local neutral organization for a safer progression loop.", durationTicks: 0, kind: "immediate" });
  }
  if (!cultivator.sectId && !cultivator.neutralSectId && localSect && cultivator.completedBaseQuests >= 1) {
    actions.push({ actionId: "join-sect", label: `Join ${localSect.name}`, description: "Join the local sect at its outpost.", durationTicks: 0, kind: "immediate" });
  }
  if (joinedNeutralSect?.headquarters === cultivator.locationId) {
    actions.push({ actionId: "take-neutral-duty", label: "Take neutral duty", description: "A safe but slower organization duty.", durationTicks: DEFAULT_ACTION_DURATIONS["take-neutral-duty"], kind: "timed" });
    actions.push({ actionId: "leave-neutral-sect", label: "Leave neutral sect", description: "End neutral sect membership and reset neutral contribution.", durationTicks: 0, kind: "immediate" });
  }
  if (joinedSect?.headquarters === cultivator.locationId) {
    actions.push({ actionId: "take-sect-errand", label: "Take sect errand", description: "Take a sect assignment from the outpost.", durationTicks: DEFAULT_ACTION_DURATIONS["take-sect-errand"], kind: "timed" });
  }
  const board = getQuestBoard(world, cultivator.locationId);
  if (board) {
    for (const quest of board.quests) {
      actions.push({
        actionId: `accept-quest:${quest.id}` as ActionId,
        label: `Accept quest: ${quest.nameCn}`,
        description: `${quest.description} (奖励灵石 ${quest.reward.spiritStones})`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  for (const activeQuest of cultivator.activeQuests) {
    actions.push({
      actionId: `execute-quest:${activeQuest.id}` as ActionId,
      label: `Execute quest: ${activeQuest.name}`,
      description: activeQuest.description,
      durationTicks: activeQuest.durationTicks,
      kind: "timed",
    });
  }
  if (activeWilderness) {
    actions.push(
      {
        actionId: "survey-wilderness",
        label: "Survey wilderness",
        description: "Push deeper into the Eight Wastes for dedicated events and rare drops.",
        durationTicks: DEFAULT_ACTION_DURATIONS["survey-wilderness"],
        kind: "timed",
      },
      {
        actionId: "withdraw-from-wilderness",
        label: "Withdraw from wilderness",
        description: "Retreat before survival pressure forces a worse exit.",
        durationTicks: 0,
        kind: "immediate",
      },
    );
  } else if (wildernessLayer) {
    actions.push(buildEnterWildernessAction(cultivator, wildernessLayer));
  }
  if (!activeWilderness) {
    for (const node of listGuixuNodesForLocation(world, cultivator.locationId)) {
      if (isGuixuNodeUnlockedForCultivator(world, cultivator.id, node.nodeId)) {
        actions.push({
          actionId: `explore-guixu:${node.nodeId}` as ActionId,
          label: `Explore ${node.name}`,
          description: `Push into ${node.name} and resolve a Guixu event.`,
          durationTicks: node.explorationDurationTicks,
          kind: "timed",
        });
        continue;
      }

      const unlockCheck = canUnlockGuixuNode(world, cultivator, node);
      if (unlockCheck.allowed) {
        actions.push({
          actionId: `unlock-guixu:${node.nodeId}` as ActionId,
          label: `Unlock ${node.name}`,
          description: `Use wilderness attunement to unlock ${node.name}.`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
  }
  if (location.nodeType === "wilderness") actions.push({ actionId: "mine-spirit-stones", label: "Mine spirit stones", description: "Gather stones and ore.", durationTicks: DEFAULT_ACTION_DURATIONS["mine-spirit-stones"], kind: "timed" }, { actionId: "hunt-mine-beast", label: "Hunt mine beast", description: "PVE combat for better loot.", durationTicks: DEFAULT_ACTION_DURATIONS["hunt-mine-beast"], kind: "timed" });
  if (isDungeonNode(location.nodeType)) {
    const dungeonView = dungeonViewForLocation(world, cultivator, location);
    if (dungeonView && !dungeonView.lockReason) {
      for (const rank of dungeonView.availableRanks) {
        for (const policy of DUNGEON_EXPEDITION_POLICIES) {
          actions.push({
            actionId: startDungeonExpeditionActionIdOf(rank, policy),
            label: `Dungeon expedition (${policy}, rank ${rank})`,
            description: describeDungeonExpeditionAction({ dungeon: dungeonView, rank, policy }),
            durationTicks: DUNGEON_EXPEDITION_DURATION_TICKS,
            kind: "timed",
          });
        }
      }
    }
  }
  if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "Heal", description: "Recover qi and injuries.", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
  return ensureSafetyNetActions(world, cultivator, location, actions);
}

function requireIdle(cultivator: Cultivator) { if (cultivator.activeJobId) throw new Error("Cultivator is already executing another action."); }
function isResidenceAction(actionId: ActionId): actionId is ResidenceActionId {
  return actionId.startsWith("residence-") && !actionId.startsWith("residence-produce:") && !actionId.startsWith("residence-heal:") && !actionId.startsWith("residence-recover-qi:");
}
function factionNameOf(world: WorldState, factionId: string): string {
  return world.sects[factionId]?.name
    ?? world.neutralSects[factionId]?.name
    ?? factionId;
}

function addFactionReputation(cultivator: Cultivator, factionId: string, amount: number): void {
  cultivator.factionReputation[factionId] = (cultivator.factionReputation[factionId] ?? 0) + amount;
}

function requireSafeIfInjured(cultivator: Cultivator, actionId: ActionId) {
  if (cultivator.injuryTicksRemaining <= 0) return;
  const allowed = new Set<ActionId>(["meditate", "heal", "residence-breakthrough", "residence-heal", "residence-recover-qi", "residence-heal:use-pill", "residence-heal:no-pill", "residence-recover-qi:use-pill", "residence-recover-qi:no-pill", "use-healing-pill", "use-qi-pill", "use-ward-talisman", "buy-healing-pill", "buy-qi-pill", "buy-ward-talisman", "sell-spirit-ore", "sell-ruin-fragment", "sell-beast-core", "take-neutral-duty", "leave-neutral-sect", "withdraw-from-wilderness"]);
  if (actionId.startsWith("travel-to:")) return;
  if (actionId.startsWith("join-neutral-sect:")) return;
  if (actionId.startsWith("residence-produce:")) return;
  if (!allowed.has(actionId)) throw new Error("Cultivator is injured and can only do safe actions.");
}
function startJob(
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
  label: string,
  meta?: ActionJob["meta"],
  durationTicks?: number,
): ActionExecutionResult {
  const job = createJob(world, cultivator.id, actionId, label);
  if (typeof durationTicks === "number" && Number.isFinite(durationTicks) && durationTicks > 0) {
    job.remainingTicks = durationTicks;
    job.totalTicks = durationTicks;
  }
  if (meta) {
    job.meta = meta;
  }
  cultivator.activeJobId = job.id;
  world.jobs[job.id] = job;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} started ${label}.`, job };
}
function marketSell(world: WorldState, cultivator: Cultivator, itemId: ItemId, base: number, actionId: ActionId): ActionExecutionResult {
  const location = world.locations[cultivator.locationId];
  if (!location || !canTradeAtLocation(location)) throw new Error("You must be in a trading safe settlement."); if (cultivator.inventory[itemId] <= 0) throw new Error(`Item not available: ${itemId}`);
  const income = sellPrice(cultivator, base); cultivator.inventory[itemId] -= 1; cultivator.spiritStones += income;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} sold 1 ${itemId} for ${income}.` };
}
function executeItemImmediateAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ActionId,
  registration: ReturnType<typeof registrationModifiersOf>,
): ActionExecutionResult | null {
  const binding = getItemActionBinding(actionId);
  if (!binding) {
    return null;
  }
  const definition = itemDefinition(world, binding.itemId);
  if (binding.operation === "buy") {
    const location = world.locations[cultivator.locationId];
    if (!location || !canTradeAtLocation(location)) {
      throw new Error("You must be in a trading safe settlement.");
    }
    const base = definition.trade.buyBasePrice;
    if (base === null) {
      throw new Error(`Item cannot be bought: ${binding.itemId}`);
    }
    const price = buyPrice(cultivator, base);
    if (cultivator.spiritStones < price) {
      throw new Error("Not enough spirit stones.");
    }
    cultivator.spiritStones -= price;
    cultivator.inventory[binding.itemId] += 1;
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} bought ${binding.itemId} for ${price}.`,
    };
  }
  if (binding.operation === "sell") {
    const base = definition.trade.sellBasePrice;
    if (base === null) {
      throw new Error(`Item cannot be sold: ${binding.itemId}`);
    }
    return marketSell(world, cultivator, binding.itemId, base, actionId);
  }
  if (cultivator.inventory[binding.itemId] <= 0) {
    throw new Error(`Item not available: ${binding.itemId}`);
  }
  if (definition.use.consumesOnUse) {
    cultivator.inventory[binding.itemId] -= 1;
  }
  const effectBundle = resolveItemEffectBundle(definition, registration);
  if (effectBundle) {
    applyEventEffectBundle(cultivator, effectBundle, `item:${binding.itemId}`);
  }
  if (binding.operation === "study" && definition.use.grantsTechnique && !cultivator.techniques.includes(definition.use.grantsTechnique)) {
    cultivator.techniques.push(definition.use.grantsTechnique);
  }
  syncWounded(cultivator);
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary: binding.operation === "study"
      ? `${cultivator.name} studied ${binding.itemId} and gained new insight.`
      : `${cultivator.name} used ${binding.itemId}.`,
  };
}
function immediateAction(world: WorldState, cultivator: Cultivator, actionId: ActionId): ActionExecutionResult {
  const registration = registrationModifiersOf(cultivator);
  const wildernessLayerId = parseEnterWildernessLayer(actionId);
  if (wildernessLayerId) {
    enterWildernessExpedition(world, cultivator, wildernessLayerId);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} entered ${getWildernessLayerById(world, wildernessLayerId)?.name ?? wildernessLayerId}.`,
    };
  }
  const guixuNodeId = parseUnlockGuixuNode(actionId);
  if (guixuNodeId) {
    const node = unlockGuixuNode(world, cultivator, guixuNodeId);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} unlocked ${node.name}.`,
    };
  }
  const joinNeutralSectId = parseJoinNeutralSectId(actionId);
  if (
    actionId === "open-player-sect-founding"
    || actionId === "open-player-sect-recruitment"
    || actionId === "review-player-sect-applications"
    || actionId === "resolve-morality-event-choice"
  ) {
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: "This is a generic inbox action. Use the dedicated route instead.",
    };
  }
  const itemResult = executeItemImmediateAction(world, cultivator, actionId, registration);
  if (itemResult) {
    return itemResult;
  }
  if (joinNeutralSectId) {
    const location = world.locations[cultivator.locationId];
    if (!location || !isSectOutpostNode(location.nodeType)) throw new Error("You must be at a neutral sect outpost to join.");
    if (cultivator.sectId || cultivator.neutralSectId) throw new Error("Cultivator already belongs to an organization.");
    const neutralSect = world.neutralSects[joinNeutralSectId];
    if (!neutralSect) throw new Error(`Neutral sect not found: ${joinNeutralSectId}`);
    if (neutralSect.headquarters !== cultivator.locationId) throw new Error("You can only join the neutral sect at its outpost.");
    cultivator.neutralSectId = neutralSect.id;
    cultivator.neutralContribution = 0;
    addCurrentStateReputation(cultivator, 4);
    neutralSect.memberIds.push(cultivator.id);
    addMessage(world, cultivator.id, neutralSect.name, "Accepted", `${cultivator.name} joined ${neutralSect.name}.`);
    addDaoLog(world, cultivator.id, "Joined Neutral Sect", `${cultivator.name} joined ${neutralSect.name}.`, ["neutral-sect", "join-neutral-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${neutralSect.name}.` };
  }
  if (actionId === "leave-neutral-sect") {
    const neutralSect = getCultivatorNeutralSect(world, cultivator);
    if (!neutralSect) throw new Error("Cultivator is not in a neutral sect.");
    if (cultivator.locationId !== neutralSect.headquarters) throw new Error("Leaving a neutral sect requires returning to its headquarters.");
    neutralSect.memberIds = neutralSect.memberIds.filter((memberId) => memberId !== cultivator.id);
    cultivator.neutralSectId = null;
    cultivator.neutralContribution = 0;
    addDaoLog(world, cultivator.id, "Left Neutral Sect", `${cultivator.name} left ${neutralSect.name}.`, ["neutral-sect", "leave-neutral-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} left ${neutralSect.name}.` };
  }
  if (actionId === "join-sect") {
    const location = world.locations[cultivator.locationId];
    if (!location || !isSectOutpostNode(location.nodeType)) {
      throw new Error("You must be at a sect outpost to join a sect.");
    }
    if (cultivator.sectId || cultivator.neutralSectId) throw new Error("Cultivator has already joined an organization.");
    if (cultivator.completedBaseQuests < 1) throw new Error("Join sect requires completing at least 1 base quest.");
    const sect = getLocalSect(world, cultivator.locationId);
    if (!sect) throw new Error("No player sect is available at this outpost.");
    if (!cultivatorMatchesSectAlignment(sect, cultivator)) {
      throw new Error("Cultivator morality alignment does not match this sect.");
    }
    cultivator.sectId = sect.id;
    cultivator.sectTitle = "外门";
    addCurrentStateReputation(cultivator, 10);
    addFactionReputation(cultivator, sect.id, 15);
    applyMoralityDelta(world, cultivator, sect.alignment === "正道" ? 8 : -8, "join-sect");
    sect.memberIds.push(cultivator.id);
    addMessage(world, cultivator.id, sect.name, "Accepted", `${cultivator.name} joined ${sect.name}.`);
    addDaoLog(world, cultivator.id, "Joined Sect", `${cultivator.name} joined ${sect.name}.`, ["sect", "join-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${sect.name}.` };
  }
  if (actionId === "withdraw-from-wilderness") {
    const summary = withdrawFromWilderness(world, cultivator, "manual-withdraw");
    if (!summary) {
      throw new Error("No active wilderness expedition to withdraw from.");
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }
  throw new Error(`Unsupported action: ${actionId}`);
}
function resolveJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId); cultivator.activeJobId = null;
  const registration = registrationModifiersOf(cultivator);
  const executeQuestId = parseExecuteQuestId(job.actionId);
  const guixuNodeId = parseExploreGuixuNode(job.actionId);
  const travelDestination = parseTravelDestination(job.actionId);
  if (travelDestination) {
    const destination = world.locations[travelDestination];
    if (!destination) {
      throw new Error(`Invalid travel destination: ${travelDestination}`);
    }
    cultivator.locationId = travelDestination;
    triggerLocationEvent(
      world,
      cultivator,
      "exploration",
      travelDestination,
      `${world.tick}:${cultivator.id}:${job.id}:arrival`,
    );
    addDaoLog(world, cultivator.id, "Travel", `${cultivator.name} traveled to ${destination.name}.`, ["travel"]);
    return `${cultivator.name} arrived at ${destination.name}.`;
  }
  if (executeQuestId) {
    const resolved = resolveActiveQuest(world, cultivator, executeQuestId, `${world.tick}:${job.id}:${executeQuestId}`);
      if (resolved.success) {
        if (resolved.quest.category === "sect") {
          if (cultivator.sectId) {
            addFactionReputation(cultivator, cultivator.sectId, 8);
          }
        }
      addDaoLog(
        world,
        cultivator.id,
        "任务完成",
        `${cultivator.name} 完成任务：${resolved.quest.name}。`,
        ["quest-complete", resolved.quest.category],
      );
    } else {
      addDaoLog(
        world,
        cultivator.id,
        "任务失败",
        `${cultivator.name} 未能完成任务：${resolved.quest.name}。`,
        ["quest-failed", resolved.quest.category],
      );
    }
    return resolved.summary;
  }
  if (job.actionId === "survey-wilderness") {
    return resolveWildernessSurvey(world, cultivator, job);
  }
  if (guixuNodeId) {
    return resolveGuixuExploration(world, cultivator, job);
  }
  if (job.actionId === "meditate") {
    cultivator.spiritualPower = clamp(
      cultivator.spiritualPower + 28 + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (registration?.meditateBonus ?? 0),
      0,
      cultivator.maxSpiritualPower,
    );
    return `${cultivator.name} recovered spiritual power.`;
  }
  if (job.actionId === "heal") {
    cultivator.qi = clamp(cultivator.qi + 45 + (registration?.healBonus ?? 0), 0, cultivator.maxQi);
    cultivator.injuryTicksRemaining = Math.max(
      0,
      cultivator.injuryTicksRemaining - 4 - Math.floor((registration?.healBonus ?? 0) / 4),
    );
    cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned");
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sanctuary", remainingTicks: 4, intensity: 1 });
    syncWounded(cultivator);
    return `${cultivator.name} recovered from injuries.`;
  }
  if (job.actionId === "cultivate") {
    addRealmProgress(
      cultivator,
      18 +
        Math.floor(cultivator.realmLevel / 2) +
        (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
        (hasEffect(cultivator, "qi-surge") ? 6 : 0) +
        (registration?.cultivateBonus ?? 0) -
        (hasEffect(cultivator, "poisoned") ? 8 : 0),
    );
    return `${cultivator.name} gained cultivation progress.`;
  }
  if (job.actionId === "residence-meditate") {
    const fallback = job.meta?.residenceMeditateFallback === true;
    if (!fallback) {
      cultivator.spiritStones -= 80;
    }
    const gain =
      (fallback ? 4 : 10) +
      (hashString(`${world.tick}:${job.id}:residence-meditate`) % (fallback ? 3 : 5)) +
      (hasEffect(cultivator, "clear-mind") ? 4 : 0) +
      (registration?.cultivateBonus ?? 0);
    addRealmProgress(cultivator, gain);
    const roll = hashString(`${world.tick}:${job.id}:residence-meditate:roll`) % 100;
    if (roll < (fallback ? 5 : 15)) {
      upsertEffect(cultivator, {
        id: "insight",
        name: "Insight",
        description: "Short-term bonus to cultivation and combat.",
        source: "residence-meditate",
        remainingTicks: 3,
        intensity: 1,
      });
    } else if (roll >= 100 - (fallback ? 10 : 5)) {
      upsertEffect(cultivator, {
        id: "deviation",
        name: "Qi Deviation",
        description: "Cultivation becomes unstable and risky.",
        source: "residence-meditate",
        remainingTicks: 3,
        intensity: 1,
      });
    }
    addDaoLog(
      world,
      cultivator.id,
      "闭关修炼",
      `${cultivator.name} 在洞府闭关，消耗 ${fallback ? 0 : 80} 灵石，修为增加 ${gain}。`,
      ["cultivation", "residence"],
    );
    return `${cultivator.name} completed residence meditation.`;
  }
  if (job.actionId === "residence-heal") {
    const usePill = job.meta?.residenceHealUsePill === true;
    if (usePill && cultivator.inventory["healing-pill"] > 0) {
      cultivator.inventory["healing-pill"] -= 1;
    }
    const healed = (usePill ? 6 : 4) + Math.floor((registration?.healBonus ?? 0) / 4);
    cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - healed);
    cultivator.qi = clamp(cultivator.qi + (usePill ? 55 : 35) + (registration?.healBonus ?? 0), 0, cultivator.maxQi);
    syncWounded(cultivator);
    addDaoLog(
      world,
      cultivator.id,
      "洞府疗伤",
      `${cultivator.name} 在洞府疗伤${usePill ? "并服用疗伤丹" : ""}，伤势恢复 ${healed}。`,
      ["recovery", "residence"],
    );
    return `${cultivator.name} recovered at residence.`;
  }
  if (job.actionId === "residence-recover-qi") {
    const usePill = job.meta?.residenceRecoverQiUsePill === true;
    if (usePill && cultivator.inventory["qi-pill"] > 0) {
      cultivator.inventory["qi-pill"] -= 1;
      upsertEffect(cultivator, {
        id: "spirit-saturated",
        name: "Spirit Saturated",
        description: "Short-term cultivation boost.",
        source: "residence-recover-qi",
        remainingTicks: 4,
        intensity: 1,
      });
    }
    const qiGain = Math.max(1, Math.floor(cultivator.maxQi * (usePill ? 0.6 : 0.35)));
    cultivator.qi = clamp(cultivator.qi + qiGain, 0, cultivator.maxQi);
    addDaoLog(
      world,
      cultivator.id,
      "洞府调息",
      `${cultivator.name} 在洞府调息${usePill ? "并服用回气丹" : ""}，恢复气血 ${qiGain}。`,
      ["recovery", "residence"],
    );
    return `${cultivator.name} recovered qi at residence.`;
  }
  if (job.actionId === "residence-breakthrough") {
    return resolveResidenceBreakthrough(world, cultivator, job);
  }
  if (job.actionId === "residence-produce") {
    const recipe = job.meta?.residenceRecipeId ? getResidenceRecipeById(job.meta.residenceRecipeId) : null;
    if (!recipe) {
      throw new Error("Residence production recipe missing.");
    }
    if (!canCraftResidenceRecipe(cultivator, recipe)) {
      throw new Error("No craftable residence recipe with current materials.");
    }
    consumeResidenceRecipeInputs(cultivator, recipe);
    cultivator.inventory[recipe.outputItemId] += recipe.outputCount;
    addDaoLog(
      world,
      cultivator.id,
      "洞府生产",
      `${cultivator.name} 在洞府生产了 ${recipe.outputCount} 个 ${recipe.outputItemId}。`,
      ["production", "residence"],
    );
    return `${cultivator.name} produced ${recipe.outputItemId} at residence.`;
  }
  if (job.actionId === "residence-socialize") {
    addDaoLog(
      world,
      cultivator.id,
      "洞府会友",
      `${cultivator.name} 在洞府与道友交流心法。`,
      ["social", "residence"],
    );
    return `${cultivator.name} socialized at residence.`;
  }
  if (job.actionId === "take-mortal-task") {
    cultivator.spiritStones += 140 + ((registration?.taskBonus ?? 0) * 10);
    cultivator.inventory["qi-common"] += 1;
    addCurrentStateReputation(cultivator, 8 + Math.floor((registration?.taskBonus ?? 0) / 2));
    return `${cultivator.name} finished a town task.`;
  }
  if (job.actionId === "take-neutral-duty") {
    const neutralSect = getCultivatorNeutralSect(world, cultivator);
    if (!neutralSect) {
      throw new Error("Neutral duty requires neutral sect membership.");
    }
    cultivator.spiritStones += 120;
    addCurrentStateReputation(cultivator, 4);
    cultivator.neutralContribution += 40;
    addFactionReputation(cultivator, neutralSect.id, 8);
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "neutral-sect", remainingTicks: 2, intensity: 1 });
    addDaoLog(world, cultivator.id, "Neutral Duty", `${cultivator.name} completed a duty for ${neutralSect.name}.`, ["neutral-sect", "neutral-duty"]);
    return `${cultivator.name} finished neutral sect duty.`;
  }
  if (job.actionId === "take-sect-errand") {
    const sect = getCultivatorSect(world, cultivator);
    const sectLevel = cultivator.sectId ? buildSectLevel(world, cultivator.sectId) : null;
    const resourceBonus = sectBonusValue(sectLevel, "resource");
    const contributionDelta =
      60 +
      Math.floor((registration?.sectBonus ?? 0) / 2) +
      resourceBonus;
    const previousContribution = cultivator.totalContribution;
    cultivator.spiritStones += 180 + ((registration?.sectBonus ?? 0) * 12) + (resourceBonus * 10);
    addCurrentStateReputation(cultivator, 6 + Math.floor((registration?.sectBonus ?? 0) / 2));
    if (sect) {
      addFactionReputation(
        cultivator,
        sect.id,
        12 +
          (registration?.sectBonus ?? 0) +
          Math.floor(resourceBonus / 2),
      );
    }
    if (sect) {
      applyMoralityDelta(world, cultivator, sect.alignment === "正道" ? 2 : -2, "take-sect-errand");
    }
    cultivator.totalContribution += contributionDelta;
    if (cultivator.totalContribution > previousContribution) {
      cultivator.contributionReachedAt = world.tick;
    }
    const warProgress = recordFactionWarContribution(world, cultivator, Math.max(20, contributionDelta));
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 });
    addDaoLog(world, cultivator.id, "Sect Duty", `${cultivator.name} completed a sect errand.`, ["sect", "sect-quest-complete"]);
    if (warProgress) {
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        title: "Faction War Progress",
        content: `${cultivator.name} advanced ${warProgress.objectiveId} for ${warProgress.faction}.`,
        severity: "medium",
        tags: ["sect", "faction-war", warProgress.faction],
      });
    }
    return `${cultivator.name} finished a sect errand.`;
  }
  if (job.actionId === "mine-spirit-stones") {
    const roll = hashString(`${world.tick}:${job.id}`);
    cultivator.spiritStones += 110 + (roll % 80) + ((registration?.mineBonus ?? 0) * 8);
    cultivator.inventory["spirit-ore"] += 1 + (roll % 2) + ((registration?.mineBonus ?? 0) >= 8 ? 1 : 0);
    cultivator.inventory["foundation-common"] += 1;
    cultivator.qi = clamp(cultivator.qi - Math.max(6, 14 - (registration?.combatGuard ?? 0)), 1, cultivator.maxQi);
    if (roll % 5 === 0) {
      cultivator.injuryTicksRemaining = Math.max(
        cultivator.injuryTicksRemaining,
        Math.max(2, 5 - (registration?.combatGuard ?? 0)),
      );
      syncWounded(cultivator);
    }
    return `${cultivator.name} mined stones and ore.`;
  }
  const fallbackSearchFortuneRank = parseSearchFortuneRank(job.actionId);
  if (fallbackSearchFortuneRank !== null) {
    const location = world.locations[cultivator.locationId];
    const metadata = dungeonMetadataOf(location);
    if (!metadata) {
      throw new Error("Search fortune requires a dungeon node.");
    }
    const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}`);
    if (roll % 3 === 0) {
      cultivator.inventory["ruin-fragment"] += (hasEffect(cultivator, "fortune-marked") ? 2 : 1) + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
    } else if (roll % 3 === 1) {
      addRealmProgress(cultivator, 10 + (registration?.fortuneBonus ?? 0));
      upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 });
    } else {
      cultivator.spiritStones += 220 + ((registration?.fortuneBonus ?? 0) * 10);
      cultivator.inventory["ruin-fragment"] += 1 + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
    }
    cultivator.inventory[metadata.materialBand] += 1;
    return `${cultivator.name} searched the ruins.`;
  }
  if (job.actionId === "hunt-mine-beast") {
    const encounterId = "mine-beast";
    const roll = hashString(`${world.tick}:${job.id}:${encounterId}`);
    const power =
      cultivator.qi +
      Math.floor(cultivator.spiritualPower * 0.6) +
      cultivator.realmLevel * 10 +
      (hasEffect(cultivator, "qi-surge") ? 18 : 0) +
      (hasEffect(cultivator, "warded") ? 14 : 0) +
      (registration?.combatBonus ?? 0) -
      (hasEffect(cultivator, "poisoned") ? 12 : 0) +
      (roll % 22);
    const threat = 145 + (roll % 20);
    cultivator.spiritualPower = clamp(cultivator.spiritualPower - 16, 0, cultivator.maxSpiritualPower);
    if (power >= threat) {
      cultivator.inventory["spirit-ore"] += 2 + (roll % 2);
      cultivator.inventory["foundation-common"] += 1;
      cultivator.spiritStones += 120 + (roll % 60);
      if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1;
      upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 });
      addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: "Mine Beast", outcome: "victory", damageTaken: 0, spiritualPowerSpent: 16, loot: {}, summary: `${cultivator.name} won the encounter.` });
      return `${cultivator.name} won a combat encounter.`;
    }
    cultivator.qi = clamp(
      cultivator.qi - Math.max(8, 24 + (roll % 10) - ((registration?.combatGuard ?? 0) * 2)),
      1,
      cultivator.maxQi,
    );
    cultivator.injuryTicksRemaining = Math.max(
      cultivator.injuryTicksRemaining,
      Math.max(2, 5 - (registration?.combatGuard ?? 0)),
    );
    syncWounded(cultivator);
    addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: "Mine Beast", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: 16, loot: {}, summary: `${cultivator.name} lost the encounter.` });
    return `${cultivator.name} lost a combat encounter.`;
  }
  const challengeGuardianRank = parseChallengeGuardianRank(job.actionId);
  if (challengeGuardianRank !== null) {
    const location = world.locations[cultivator.locationId];
    if (!location || !isDungeonNode(location.nodeType)) {
      throw new Error("Challenge guardian requires a dungeon node.");
    }
    const metadata = dungeonMetadataOf(location);
    if (!metadata) {
      throw new Error("Challenge guardian requires dungeon metadata.");
    }
    if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
      throw new Error(`Dungeon tier requires ${metadata.minRealm} realm access.`);
    }
    const tuning = guardianTuningForDungeon(metadata.grade, challengeGuardianRank);
    const encounterId = "ruins-guardian" as const;
    const roll = hashString(`${world.tick}:${job.id}:${encounterId}`);
    const power =
      cultivator.qi +
      Math.floor(cultivator.spiritualPower * 0.6) +
      cultivator.realmLevel * 10 +
      (hasEffect(cultivator, "qi-surge") ? 18 : 0) +
      (hasEffect(cultivator, "warded") ? 14 : 0) +
      (hasEffect(cultivator, "fortune-marked") ? 12 : 0) +
      (registration?.combatBonus ?? 0) -
      (hasEffect(cultivator, "poisoned") ? 12 : 0) +
      (roll % 22);
    const threat = tuning.threatBase + (roll % tuning.threatVariance);

    cultivator.spiritualPower = clamp(cultivator.spiritualPower - 24, 0, cultivator.maxSpiritualPower);
    if (power >= threat) {
      cultivator.inventory["ruin-fragment"] += tuning.fragmentBase + (roll % tuning.fragmentVariance);
      if (tuning.wardReward > 0) {
        cultivator.inventory["ward-talisman"] += tuning.wardReward;
      }
      cultivator.inventory[metadata.materialBand] += 1;
      cultivator.spiritStones += tuning.spiritStoneBase + (roll % tuning.spiritStoneVariance);
      addRealmProgress(cultivator, tuning.realmProgressReward);
      const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
      if (challengeGuardianRank === highestUnlockedRank) {
        ensureDungeonProgress(cultivator)[metadata.grade].highestClearedRank = Math.max(
          highestClearedRankOf(cultivator, metadata.grade),
          challengeGuardianRank,
        );
      }
      upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 });
      addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: `${location.name} Guardian`, outcome: "victory", damageTaken: 0, spiritualPowerSpent: 24, loot: {}, summary: `${cultivator.name} broke the guardian seal at ${location.name} rank ${challengeGuardianRank}.` });
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        title: `${location.name} Guardian Broken`,
        content: `${cultivator.name} defeated the ${metadata.grade}${challengeGuardianRank} guardian of ${location.name} and claimed the sealed reward cache.`,
        severity: "medium",
        tags: ["guardian", location.nodeType, metadata.grade, `rank-${challengeGuardianRank}`, "victory"],
      });
      return `${cultivator.name} defeated the rank ${challengeGuardianRank} guardian of ${location.name}.`;
    }

    cultivator.qi = clamp(
      cultivator.qi - Math.max(8, tuning.defeatQiBase + (roll % tuning.defeatQiVariance) - ((registration?.combatGuard ?? 0) * 2)),
      1,
      cultivator.maxQi,
    );
    cultivator.injuryTicksRemaining = Math.max(
      cultivator.injuryTicksRemaining,
      Math.max(2, tuning.defeatInjuryTicks - (registration?.combatGuard ?? 0)),
    );
    if (tuning.poisonTicks > 0) {
      upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: tuning.poisonTicks, intensity: 1 });
    }
    syncWounded(cultivator);
    addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: `${location.name} Guardian`, outcome: "defeat", damageTaken: 0, spiritualPowerSpent: 24, loot: {}, summary: `${cultivator.name} was repelled by the guardian of ${location.name}.` });
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId: cultivator.locationId,
      title: `${location.name} Guardian Counterattack`,
      content: `${cultivator.name} was forced back by the ${metadata.grade}${challengeGuardianRank} guardian of ${location.name}.`,
      severity: "high",
      tags: ["guardian", location.nodeType, metadata.grade, `rank-${challengeGuardianRank}`, "defeat"],
    });
    return `${cultivator.name} was repelled by the rank ${challengeGuardianRank} guardian of ${location.name}.`;
  }
  /* Legacy fallback block kept temporarily during the registration modifier patch.
  if (job.actionId === "meditate") { cultivator.spiritualPower = clamp(cultivator.spiritualPower + 28 + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (registration?.meditateBonus ?? 0), 0, cultivator.maxSpiritualPower); return `${cultivator.name} recovered spiritual power.`; }
  if (job.actionId === "heal") { cultivator.qi = clamp(cultivator.qi + 45 + (registration?.healBonus ?? 0), 0, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 4 - Math.floor((registration?.healBonus ?? 0) / 4)); cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned"); upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sanctuary", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); return `${cultivator.name} recovered from injuries.`; }
  if (job.actionId === "cultivate") { cultivator.realmProgress = clamp(cultivator.realmProgress + 18 + Math.floor(cultivator.realmLevel / 2) + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (hasEffect(cultivator, "qi-surge") ? 6 : 0) - (hasEffect(cultivator, "poisoned") ? 8 : 0), 0, 200); if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) { cultivator.realmProgress -= 100; cultivator.realmLevel += 1; cultivator.realm = cultivator.realmLevel <= 3 ? "炼气" : cultivator.realmLevel <= 6 ? "筑基" : "金丹"; cultivator.maxQi += 12; cultivator.maxSpiritualPower += 12; cultivator.qi = cultivator.maxQi; cultivator.spiritualPower = cultivator.maxSpiritualPower; cultivator.lifespan += 12; return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`; } return `${cultivator.name} gained cultivation progress.`; }
  if (job.actionId === "take-mortal-task") { cultivator.spiritStones += 140; cultivator.reputation += 8; cultivator.karma = Math.max(0, cultivator.karma - 2); return `${cultivator.name} finished a town task.`; }
  if (job.actionId === "take-sect-errand") { cultivator.spiritStones += 180; cultivator.reputation += 6; upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 }); return `${cultivator.name} finished a sect errand.`; }
  if (job.actionId === "mine-spirit-stones") { const roll = hashString(`${world.tick}:${job.id}`); cultivator.spiritStones += 110 + (roll % 80); cultivator.inventory["spirit-ore"] += 1 + (roll % 2); cultivator.qi = clamp(cultivator.qi - 14, 1, cultivator.maxQi); if (roll % 5 === 0) { cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 5); syncWounded(cultivator); } return `${cultivator.name} mined stones and ore.`; }
  if (job.actionId === "search-fortune") { const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}`); if (roll % 3 === 0) cultivator.inventory["ruin-fragment"] += hasEffect(cultivator, "fortune-marked") ? 2 : 1; else if (roll % 3 === 1) { cultivator.realmProgress = clamp(cultivator.realmProgress + 10, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 }); } else { cultivator.spiritStones += 220; cultivator.inventory["ruin-fragment"] += 1; } return `${cultivator.name} searched the ruins.`; }
  const encounterId = job.actionId === "hunt-mine-beast" ? "mine-beast" : "ruins-guardian"; const roll = hashString(`${world.tick}:${job.id}:${encounterId}`); const power = cultivator.qi + Math.floor(cultivator.spiritualPower * 0.6) + cultivator.realmLevel * 10 + Math.floor(cultivator.reputation / 3) + (hasEffect(cultivator, "qi-surge") ? 18 : 0) + (hasEffect(cultivator, "warded") ? 14 : 0) + (job.actionId === "challenge-guardian" && hasEffect(cultivator, "fortune-marked") ? 12 : 0) - (hasEffect(cultivator, "poisoned") ? 12 : 0) + (roll % 22); const threat = job.actionId === "hunt-mine-beast" ? 145 + (roll % 20) : 172 + (roll % 24); cultivator.spiritualPower = clamp(cultivator.spiritualPower - (job.actionId === "hunt-mine-beast" ? 16 : 24), 0, cultivator.maxSpiritualPower);
  if (power >= threat) { if (job.actionId === "hunt-mine-beast") { cultivator.inventory["spirit-ore"] += 2 + (roll % 2); cultivator.spiritStones += 120 + (roll % 60); if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1; upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 }); } else { cultivator.inventory["ruin-fragment"] += 1 + (roll % 2); cultivator.inventory["ward-talisman"] += 1; cultivator.realmProgress = clamp(cultivator.realmProgress + 12, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 }); } addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` }); return `${cultivator.name} won a combat encounter.`; }
  cultivator.qi = clamp(cultivator.qi - (job.actionId === "hunt-mine-beast" ? 24 + (roll % 10) : 32 + (roll % 12)), 1, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, job.actionId === "hunt-mine-beast" ? 5 : 7); if (job.actionId === "challenge-guardian") upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` }); return `${cultivator.name} lost a combat encounter.`; }
  */
  throw new Error(`Unsupported timed action: ${job.actionId}`);
}

function resolveEnhancedJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  const registration = registrationModifiersOf(cultivator);
  if (parseStartDungeonExpeditionActionId(job.actionId)) {
    cultivator.activeJobId = null;
    const report = world.dungeonExpeditionReports[cultivator.id];
    if (!report) {
      throw new Error("Dungeon expedition completed without a report.");
    }
    return report.summary;
  }
  if (job.actionId === "heal") {
    const summary = resolveJob(world, job);
    cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "deviation");
    return summary;
  }
  if (job.actionId === "cultivate") {
    cultivator.activeJobId = null;
    const cultivateRoll = hashString(`${world.tick}:${job.id}:cultivate-enhanced`);
    const gain =
      18 +
      Math.floor(cultivator.realmLevel / 2) +
      (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
      (hasEffect(cultivator, "qi-surge") ? 6 : 0) +
      (hasEffect(cultivator, "insight") ? 10 : 0) +
      (hasEffect(cultivator, "spirit-saturated") ? 8 : 0) +
      (registration?.cultivateBonus ?? 0) -
      (hasEffect(cultivator, "poisoned") ? 8 : 0) -
      (hasEffect(cultivator, "deviation") ? 12 : 0);
    addRealmProgress(cultivator, gain);
    if (cultivateRoll % 7 === 0) {
      upsertEffect(cultivator, { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Closed-Door Insight", content: "The retreat produced a sudden insight into the path ahead.", severity: "medium", tags: ["event", "retreat", "insight"] });
    }
    if (cultivateRoll % 19 === 0 && !hasEffect(cultivator, "clear-mind")) {
      upsertEffect(cultivator, { id: "deviation", name: "Qi Deviation", description: "Cultivation becomes unstable and risky.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Qi Deviation", content: "A forced cycle disturbed the qi flow and left a deviation behind.", severity: "high", tags: ["event", "cultivation", "deviation"] });
    }
    return `${cultivator.name} gained cultivation progress.`;
  }
  if (job.actionId === "take-sect-errand") {
    const summary = resolveJob(world, job);
    if (hashString(`${world.tick}:${job.id}:sect`) % 3 === 0) {
      cultivator.inventory["ward-talisman"] += 1;
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Sect Bounty", content: "The sect added a protective talisman to your reward for finishing the errand cleanly.", severity: "medium", tags: ["event", "sect", "bounty"] });
    }
    return summary;
  }
  const searchFortuneRank = parseSearchFortuneRank(job.actionId);
  if (searchFortuneRank !== null) {
    cultivator.activeJobId = null;
    const location = world.locations[cultivator.locationId];
    if (!location || !isDungeonNode(location.nodeType)) {
      throw new Error("Search fortune requires a dungeon node.");
    }
    const metadata = dungeonMetadataOf(location);
    if (!metadata) {
      throw new Error("Search fortune requires dungeon metadata.");
    }
    if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
      throw new Error(`Dungeon tier requires ${metadata.minRealm} realm access.`);
    }
    const tuning = searchTuningForDungeon(metadata.grade, searchFortuneRank);
    const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}:fortune-enhanced`);
    const fragmentBonus = (hasEffect(cultivator, "fortune-marked") ? 2 : 1) + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
    if (roll % 4 === 0) {
      cultivator.inventory["ruin-fragment"] += tuning.fragmentBase + fragmentBonus + tuning.fragmentBonus;
      if (metadata.grade === "甲" && roll % 8 === 0) cultivator.inventory["ward-talisman"] += 1;
    } else if (roll % 4 === 1) {
      addRealmProgress(cultivator, tuning.progressBase + (registration?.fortuneBonus ?? 0));
      upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 });
    } else if (roll % 4 === 2) {
      cultivator.spiritStones += tuning.spiritStoneBase + (roll % tuning.spiritStoneVariance) + ((registration?.fortuneBonus ?? 0) * 10);
      cultivator.inventory["ruin-fragment"] += tuning.fragmentBase + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0) + tuning.fragmentBonus;
      if (metadata.grade === "乙" && roll % 6 === 0) cultivator.inventory["healing-pill"] += 1;
      if (metadata.grade === "甲" && roll % 6 === 0) cultivator.inventory["ward-talisman"] += 1;
    } else {
      upsertEffect(cultivator, { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "ruins", remainingTicks: tuning.insightTicks, intensity: 1 });
      if (metadata.grade === "乙" && roll % 5 === 0) cultivator.inventory["qi-pill"] += 1;
      if (metadata.grade === "甲") cultivator.inventory["ward-talisman"] += 1;
    }
    cultivator.inventory[metadata.materialBand] += 1;
    triggerNodeSpecificEvent(
      world,
      cultivator,
      searchFortuneActionIdOf(searchFortuneRank),
      cultivator.locationId,
      `${world.tick}:${job.id}:${cultivator.locationId}:node-search`,
      { grade: metadata.grade, rank: searchFortuneRank },
    );
    return `${cultivator.name} searched the rank ${searchFortuneRank} ruins at ${location.name}.`;
  }
  return resolveJob(world, job);
}

export function performAction(world: WorldState, cultivatorId: string, actionId: ActionId): ActionExecutionResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  if (isAbortDungeonExpeditionAction(actionId)) {
    const progress = getActiveDungeonExpedition(world, cultivator.id);
    if (!progress) {
      throw new Error("No active dungeon expedition to abort.");
    }
    const activeJobId = cultivator.activeJobId;
    if (activeJobId) {
      delete world.jobs[activeJobId];
      cultivator.activeJobId = null;
    }
    const report = finalizeDungeonExpedition(world, cultivator, progress, "aborted");
    addDaoLog(world, cultivator.id, "Dungeon Expedition", report.summary, ["dungeon-expedition", "aborted"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: report.summary,
    };
  }
  requireIdle(cultivator);
  requireSafeIfInjured(cultivator, actionId);
  const location = world.locations[cultivator.locationId];
  if (!location) throw new Error(`Location not found: ${cultivator.locationId}`);
  const acceptQuestId = parseAcceptQuestId(actionId);
  if (acceptQuestId) {
    const acceptedQuest = acceptQuest(world, cultivator, acceptQuestId);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} accepted quest ${acceptedQuest.name}.`,
    };
  }
  const residenceProduceRecipeId = parseResidenceOption(actionId, "residence-produce:");
  const residenceHealOption = parseResidenceOption(actionId, "residence-heal:");
  const residenceRecoverQiOption = parseResidenceOption(actionId, "residence-recover-qi:");
  if (residenceProduceRecipeId !== null || residenceHealOption !== null || residenceRecoverQiOption !== null) {
    const normalizedActionId: ResidenceActionId =
      residenceProduceRecipeId !== null
        ? "residence-produce"
        : residenceHealOption !== null
          ? "residence-heal"
          : "residence-recover-qi";
    requireResidenceActionAllowed(cultivator, normalizedActionId);
    if (normalizedActionId === "residence-produce") {
      if (residenceProduceRecipeId === null) {
        throw new Error("Unknown residence recipe: null");
      }
      const recipe = getResidenceRecipeById(residenceProduceRecipeId);
      if (!recipe) throw new Error(`Unknown residence recipe: ${residenceProduceRecipeId}`);
      if (!canCraftResidenceRecipe(cultivator, recipe)) {
        throw new Error("No craftable residence recipe with current materials.");
      }
      return startJob(
        world,
        cultivator,
        normalizedActionId,
        normalizedActionId,
        { residenceRecipeId: recipe.id },
        recipe.durationTicks,
      );
    }
    if (normalizedActionId === "residence-heal") {
      const usePill = residenceHealOption === "use-pill";
      if (residenceHealOption !== "no-pill" && !usePill) {
        throw new Error(`Unknown residence-heal option: ${residenceHealOption}`);
      }
      if (usePill && cultivator.inventory["healing-pill"] <= 0) {
        throw new Error("Item not available: healing-pill");
      }
      return startJob(world, cultivator, normalizedActionId, normalizedActionId, { residenceHealUsePill: usePill });
    }
    const usePill = residenceRecoverQiOption === "use-pill";
    if (residenceRecoverQiOption !== "no-pill" && !usePill) {
      throw new Error(`Unknown residence-recover-qi option: ${residenceRecoverQiOption}`);
    }
    if (usePill && cultivator.inventory["qi-pill"] <= 0) {
      throw new Error("Item not available: qi-pill");
    }
    return startJob(world, cultivator, normalizedActionId, normalizedActionId, { residenceRecoverQiUsePill: usePill });
  }
  if (isResidenceAction(actionId)) {
    requireResidenceActionAllowed(cultivator, actionId);
    if (actionId === "residence-produce") {
      const recipe = getFirstCraftableResidenceRecipe(cultivator);
      if (!recipe) {
        throw new Error("No craftable residence recipe with current materials.");
      }
      return startJob(world, cultivator, actionId, actionId, { residenceRecipeId: recipe.id }, recipe.durationTicks);
    }
    if (actionId === "residence-meditate") {
      if (cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED) {
        throw new Error("Realm progress is capped. Complete a breakthrough before more residence meditation.");
      }
      return startJob(world, cultivator, actionId, actionId, {
        residenceMeditateFallback: cultivator.spiritStones < 80,
      });
    }
    if (actionId === "residence-breakthrough") {
      const definition = breakthroughDefinitionOf(cultivator);
      if (!definition) {
        throw new Error("No breakthrough is available at the current realm level.");
      }
      if (cultivator.realmProgress < BREAKTHROUGH_PROGRESS_REQUIRED) {
        throw new Error("Breakthrough requires full realm progress.");
      }
      if (!hasBreakthroughMaterials(cultivator, definition)) {
        throw new Error("Breakthrough materials are missing.");
      }
      const rateInfo = breakthroughRateBreakdownOf(cultivator, definition);
      return startJob(
        world,
        cultivator,
        actionId,
        actionId,
        {
          breakthroughCategory: definition.category,
          breakthroughTargetRealm: definition.targetRealm,
          breakthroughTargetLevel: definition.targetLevel,
          breakthroughCommonItemId: definition.commonItemId,
          breakthroughCommonCount: definition.commonCount,
          breakthroughSpecialItemId: definition.specialItemId,
          breakthroughSpecialCount: definition.specialCount,
          breakthroughSuccessRate: rateInfo.successRate ?? undefined,
          breakthroughRateBreakdown: rateInfo.rateBreakdown,
        },
        definition.durationTicks,
      );
    }
    return startJob(world, cultivator, actionId, actionId);
  }
  const travelDestination = parseTravelDestination(actionId);
  const executeQuestId = parseExecuteQuestId(actionId);
  const exploreGuixuNodeId = parseExploreGuixuNode(actionId);
  const startDungeonExpedition = parseStartDungeonExpeditionActionId(actionId);
  const searchFortuneRank = parseSearchFortuneRank(actionId);
  const challengeGuardianRank = parseChallengeGuardianRank(actionId);
  if (travelDestination || executeQuestId || exploreGuixuNodeId || startDungeonExpedition || searchFortuneRank || challengeGuardianRank || TIMED_ACTION_IDS.has(actionId)) {
    if (travelDestination) {
      const destination = world.locations[travelDestination];
      if (!destination) throw new Error(`Travel destination not found: ${travelDestination}`);
      const directNeighbor = getNeighborLocations(world, cultivator.locationId).some((neighbor) => neighbor.locationId === travelDestination);
      if (!directNeighbor) throw new Error("Travel destination is not directly reachable from current location.");
      return startJob(world, cultivator, actionId as TimedActionId, `Travel to ${destination.name}`);
    }
    if (executeQuestId) {
      const quest = getActiveQuest(cultivator, executeQuestId);
      if (!quest) throw new Error(`Active quest not found: ${executeQuestId}`);
      markQuestInProgress(cultivator, executeQuestId);
      return startJob(world, cultivator, actionId as TimedActionId, `Execute quest ${quest.name}`, {
        activeQuestId: executeQuestId,
      });
    }
    if (actionId === "survey-wilderness") {
      const progress = getActiveWildernessProgress(world, cultivator.id);
      if (!progress) {
        throw new Error("Survey wilderness requires an active wilderness expedition.");
      }
      const layer = getWildernessLayerById(world, progress.layerId);
      if (!layer) {
        throw new Error(`Wilderness layer not found: ${progress.layerId}`);
      }
      const eventId = pickWildernessSurveyEventId(
        layer,
        `${world.tick}:${cultivator.id}:${world.nextJobSequence}:survey-wilderness`,
      );
      return startJob(world, cultivator, actionId as TimedActionId, `Survey ${layer.name}`, {
        wildernessLayerId: layer.layerId,
        wildernessEventId: eventId,
      });
    }
    if (exploreGuixuNodeId) {
      const node = getGuixuNodeById(world, exploreGuixuNodeId);
      if (!node) {
        throw new Error(`Guixu node not found: ${exploreGuixuNodeId}`);
      }
      if (node.anchorLocationId !== cultivator.locationId) {
        throw new Error("Current location does not connect to this Guixu node.");
      }
      if (!isGuixuNodeUnlockedForCultivator(world, cultivator.id, exploreGuixuNodeId)) {
        throw new Error(`Guixu node not unlocked: ${exploreGuixuNodeId}`);
      }
      const eventId = pickGuixuEventId(
        node,
        `${world.tick}:${cultivator.id}:${world.nextJobSequence}:${exploreGuixuNodeId}:guixu`,
      );
      return startJob(world, cultivator, actionId as TimedActionId, `Explore ${node.name}`, {
        guixuNodeId: node.nodeId,
        guixuEventId: eventId,
      });
    }
    if (startDungeonExpedition) {
      const metadata = dungeonMetadataOf(location);
      if (!metadata) {
        throw new Error("Action only available in dungeons.");
      }
      if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
        throw new Error(`Dungeon tier requires ${metadata.minRealm} realm access.`);
      }
      const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
      if (startDungeonExpedition.rank > highestUnlockedRank) {
        throw new Error(`Dungeon rank ${startDungeonExpedition.rank} is not unlocked.`);
      }
      const started = startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        `Dungeon expedition rank ${startDungeonExpedition.rank}`,
        {
          dungeonGrade: metadata.grade,
          dungeonRank: startDungeonExpedition.rank,
          dungeonExpeditionPolicy: startDungeonExpedition.policy,
          dungeonExpeditionTargetRank: startDungeonExpedition.rank,
          dungeonExpeditionStepIndex: 0,
          dungeonExpeditionNextResolutionTick: world.tick + DUNGEON_EXPEDITION_STEP_TICKS,
        },
        DUNGEON_EXPEDITION_DURATION_TICKS,
      );
      if (!started.job) {
        throw new Error("Dungeon expedition job was not created.");
      }
      world.dungeonExpeditions[cultivator.id] = createDungeonExpeditionProgress({
        cultivatorId: cultivator.id,
        jobId: started.job.id,
        locationId: cultivator.locationId,
        grade: metadata.grade,
        targetRank: startDungeonExpedition.rank,
        policy: startDungeonExpedition.policy,
        startedAtTick: world.tick,
      });
      return started;
    }
    if (searchFortuneRank || challengeGuardianRank) {
      const metadata = dungeonMetadataOf(location);
      if (!metadata) {
        throw new Error("Action only available in dungeons.");
      }
      if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
        throw new Error(`Dungeon tier requires ${metadata.minRealm} realm access.`);
      }
      const selectedRank = (searchFortuneRank ?? challengeGuardianRank)!;
      const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
      if (selectedRank > highestUnlockedRank) {
        throw new Error(`Dungeon rank ${selectedRank} is not unlocked.`);
      }
      return startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        `${searchFortuneRank ? "Search ruins" : "Challenge guardian"} rank ${selectedRank}`,
        {
          dungeonGrade: metadata.grade,
          dungeonRank: selectedRank,
        },
      );
    }
    if (actionId === "cultivate") { if (cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED) throw new Error("Realm progress is capped. Complete a breakthrough before more cultivation."); if (cultivator.spiritStones < 80) throw new Error("Not enough spirit stones."); if (cultivator.spiritualPower < 20) throw new Error("Not enough spiritual power."); cultivator.spiritStones -= 80; cultivator.spiritualPower -= 20; }
    if ((actionId === "mine-spirit-stones" || actionId === "hunt-mine-beast") && location.nodeType !== "wilderness") throw new Error("Action only available in wilderness.");
    if (actionId === "take-mortal-task" && location.kind !== "safe") throw new Error("Action only available in safe settlements.");
    if (actionId === "take-sect-errand") {
      const sect = getCultivatorSect(world, cultivator);
      if (!sect || cultivator.locationId !== sect.headquarters) {
        throw new Error("Sect errand requires sect membership at the sect outpost.");
      }
    }
    if (actionId === "take-neutral-duty") {
      const neutralSect = getCultivatorNeutralSect(world, cultivator);
      if (!neutralSect || cultivator.locationId !== neutralSect.headquarters) {
        throw new Error("Neutral duty requires neutral sect membership at its headquarters.");
      }
    }
    if (actionId === "heal" && !canHealAtLocation(location)) throw new Error("Heal requires a safe location.");
    return startJob(world, cultivator, actionId as TimedActionId, actionId);
  }
  return immediateAction(world, cultivator, actionId);
}

export function advanceWorld(world: WorldState, steps: number): TickSummary {
  const safeSteps = clamp(Math.floor(steps), 1, 200); const completedJobs: TickSummary["completedJobs"] = []; const triggeredEvents: WorldEvent[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    world.tick += 1;
    for (const cultivator of Object.values(world.cultivators)) {
      const location = world.locations[cultivator.locationId];
      cultivator.age += 1 / TICKS_PER_YEAR; if (!cultivator.activeJobId && cultivator.injuryTicksRemaining > 0) cultivator.injuryTicksRemaining -= 1; if (location?.kind === "safe" && !cultivator.activeJobId) { cultivator.qi = clamp(cultivator.qi + 3, 1, cultivator.maxQi); cultivator.spiritualPower = clamp(cultivator.spiritualPower + 3, 0, cultivator.maxSpiritualPower); }
      cultivator.statusEffects = cultivator.statusEffects.filter((effect) => {
        if (effect.id === "wounded") {
          return true;
        }
        if (effect.id === "poisoned") {
          cultivator.qi = clamp(cultivator.qi - 4 * effect.intensity, 1, cultivator.maxQi);
        }
        if (effect.id === "clear-mind") {
          cultivator.spiritualPower = clamp(cultivator.spiritualPower + 3 * effect.intensity, 0, cultivator.maxSpiritualPower);
        }
        if (effect.id === "spirit-saturated") {
          cultivator.spiritualPower = clamp(cultivator.spiritualPower + 2 * effect.intensity, 0, cultivator.maxSpiritualPower);
        }
        effect.remainingTicks -= 1;
        return effect.remainingTicks > 0;
      });
      syncWounded(cultivator);
      applyWildernessPressure(world, cultivator);
    }
    for (const job of Object.values(world.jobs)) {
      job.remainingTicks -= 1;
      const travelDestination = parseTravelDestination(job.actionId);
      if (travelDestination && job.remainingTicks > 0) {
        const cultivator = world.cultivators[job.cultivatorId];
        if (cultivator) {
          const roll = hashString(`${world.tick}:${job.id}:${cultivator.id}:travel-event`) % 100;
          if (roll < 30) {
            const events = triggerLocationEvent(
              world,
              cultivator,
              "travel",
              cultivator.locationId,
              `${world.tick}:${cultivator.id}:${job.id}:travel`,
            );
            triggeredEvents.push(...events);
          }
        }
      }

      const activeDungeonExpedition = getActiveDungeonExpedition(world, job.cultivatorId);
      if (activeDungeonExpedition && activeDungeonExpedition.jobId === job.id && isDungeonExpeditionActionId(job.actionId)) {
        resolveDungeonExpeditionStepIfDue(world, job, activeDungeonExpedition);
      }

      if (job.remainingTicks > 0) {
        continue;
      }

      const summary = resolveEnhancedJob(world, job);
      completedJobs.push({ cultivatorId: job.cultivatorId, actionId: job.actionId, summary });
      addDaoLog(world, job.cultivatorId, "Action Complete", summary, ["action-complete", job.actionId]);
      delete world.jobs[job.id];
    }
    refreshQuestBoardsIfDue(world);
    updateSectTitlesIfDue(world);
  }
  world.updatedAt = new Date().toISOString(); return { tick: world.tick, advancedTicks: safeSteps, completedJobs, triggeredEvents };
}

export function getSectInfo(world: WorldState, cultivatorId: string): OrganizationInfoView | null {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  const neutralSect = getCultivatorNeutralSect(world, cultivator);
  const role = (cultivator.sectTitle ?? "外门") as SectTitle;
  if (sect) {
    const sectLevel = buildSectLevel(world, sect.id);
    const headquartersStateId = sect.headquarters.split(":")[0] ?? sect.headquarters;
    const activeWar = getActiveFactionWarForState(world, headquartersStateId);
    return {
      organizationType: "player",
      id: sect.id,
      name: sect.name,
      alignment: sect.alignment,
      stateId: sect.stateId,
      founderCultivatorId: sect.founderCultivatorId,
      treasury: sect.treasury,
      memberCount: sect.memberIds.length,
      spiritVeins: sect.spiritVeins,
      headquarters: sect.headquarters,
      role,
      totalContribution: cultivator.totalContribution,
      lastTitleUpdateTick: sect.lastTitleUpdateTick,
      admissionPolicy: structuredClone(sect.admissionPolicy),
      admissionPolicyUpdatedAtTick: sect.admissionPolicyUpdatedAtTick,
      level: sectLevel?.level,
      bonuses: sectLevel?.bonuses ?? [],
      activeWarId: activeWar?.warId ?? null,
      warObjectives: activeWar ? structuredClone(activeWar.objectives) : [],
      competitive: true,
    };
  }
  if (!neutralSect) {
    return null;
  }
  return {
    organizationType: "neutral",
    id: neutralSect.id,
    name: neutralSect.name,
    alignment: neutralSect.alignment,
    stateId: neutralSect.stateId,
    headquarters: neutralSect.headquarters,
    description: neutralSect.description,
    role: "member",
    memberCount: neutralSect.memberIds.length,
    neutralContribution: cultivator.neutralContribution,
    rewardMultiplier: neutralSect.rewardMultiplier,
    competitive: false,
  };
}

export function getPendingMoralityChoice(
  world: WorldState,
  cultivatorId: string,
): PendingMoralityChoiceResponse {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  return buildPendingMoralityChoiceView(world, cultivator);
}

export function resolveMoralityChoice(
  world: WorldState,
  cultivatorId: string,
  input: {
    choiceId: string;
    optionId: string;
  },
): ResolveMoralityChoiceResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  cleanupCultivatorPendingMoralityChoice(world, cultivator);
  if (!cultivator.pendingMoralityChoiceId || cultivator.pendingMoralityChoiceId !== input.choiceId) {
    throw new Error("Morality choice is no longer available.");
  }
  const choice = world.pendingMoralityChoices[input.choiceId];
  if (!choice || isPendingMoralityChoiceExpired(world, choice) || choice.cultivatorId !== cultivator.id) {
    if (cultivator.pendingMoralityChoiceId === input.choiceId) {
      cultivator.pendingMoralityChoiceId = null;
    }
    delete world.pendingMoralityChoices[input.choiceId];
    throw new Error("Morality choice is no longer available.");
  }
  const option = choice.options.find((entry) => entry.id === input.optionId);
  if (!option) {
    throw new Error("Morality choice option not found.");
  }
  applyEventEffectBundle(cultivator, option.effectBundle, `morality-choice:${choice.id}`);
  const morality = applyMoralityDelta(world, cultivator, option.moralityDelta, `morality-choice:${option.id}`);
  cultivator.pendingMoralityChoiceId = null;
  delete world.pendingMoralityChoices[choice.id];
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: `[choice] ${choice.title}`,
    content: `${cultivator.name} chose ${option.label}. ${option.summary}`,
    severity: "medium",
    tags: ["event-pool", "morality-choice", option.moralityDelta >= 0 ? "positive" : "negative"],
  });
  return {
    tick: world.tick,
    cultivatorId,
    choiceId: choice.id,
    optionId: option.id,
    moralityScore: morality.moralityScore,
    moralityAlignment: morality.moralityAlignment,
    summary: `${cultivator.name} resolved ${choice.title} by choosing ${option.label}.`,
  };
}

export function getPlayerSectFoundingOptions(
  world: WorldState,
  cultivatorId: string,
): PlayerSectFoundingOptionsView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const { currentStateId, currentMainCityLocationId, blockers } = getPlayerSectFoundingBlockers(world, cultivator);
  const currentStateReputation = currentStateId ? reputationForState(cultivator, currentStateId) : 0;
  const defaultAdmissionPolicy = defaultPlayerSectAdmissionPolicy();

  return {
    tick: world.tick,
    cultivatorId,
    currentStateId,
    currentMainCityLocationId,
    currentLocationId: cultivator.locationId,
    canFound: blockers.length === 0,
    blockers,
    requirements: {
      spiritStones: {
        current: cultivator.spiritStones,
        required: PLAYER_SECT_FOUNDING_STONE_COST,
      },
      stateReputation: {
        current: currentStateReputation,
        required: PLAYER_SECT_FOUNDING_REPUTATION_COST,
      },
      mustBeInMainCity: true,
      mustHaveNoOrganization: true,
    },
    derivedFounding: {
      alignment: moralityAlignmentOfCultivator(cultivator),
      admissionPolicy: defaultAdmissionPolicy,
    },
    admissionPolicyInput: {
      minimumRealmLevel: {
        min: 1,
        suggested: defaultAdmissionPolicy.minimumRealmLevel,
      },
      allowedMotiveBucketOptions: PLAYER_SECT_MOTIVE_BUCKET_IDS.map((id) => ({
        id,
        label: PLAYER_SECT_MOTIVE_BUCKET_LABELS[id],
      })),
    },
    nameRules: {
      minLength: PLAYER_SECT_NAME_MIN_LENGTH,
      maxLength: PLAYER_SECT_NAME_MAX_LENGTH,
      globallyUnique: true,
    },
  };
}

export function foundPlayerSect(
  world: WorldState,
  cultivatorId: string,
  input: {
    name: string;
    admissionPolicy: SectAdmissionPolicy;
  },
): FoundPlayerSectResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const name = validatePlayerSectName(input.name);
  const normalizedName = normalizePlayerSectName(name);
  const founding = getPlayerSectFoundingOptions(world, cultivatorId);
  if (founding.blockers.includes("not-in-main-city")) {
    throw new Error("Founding a player sect requires standing in the current state's main city.");
  }
  if (founding.blockers.includes("already-in-organization")) {
    throw new Error("Cultivator already belongs to an organization.");
  }
  if (founding.blockers.includes("insufficient-spirit-stones")) {
    throw new Error(`Founding requires ${PLAYER_SECT_FOUNDING_STONE_COST} spirit stones.`);
  }
  if (founding.blockers.includes("insufficient-state-reputation")) {
    throw new Error(`Founding requires ${PLAYER_SECT_FOUNDING_REPUTATION_COST} reputation in the current state.`);
  }
  for (const existingSect of Object.values(world.sects)) {
    if (normalizePlayerSectName(existingSect.name) === normalizedName) {
      throw new Error("Sect name must be globally unique.");
    }
  }
  if (!founding.currentStateId) {
    throw new Error("Could not resolve the current state for player-sect founding.");
  }

  const stateId = founding.currentStateId;
  const alignment = founding.derivedFounding.alignment;
  const admissionPolicy = normalizeSectAdmissionPolicy(input.admissionPolicy);

  const sectId = normalizedName;
  const sect: Sect = {
    id: sectId,
    name,
    alignment,
    stateId,
    founderCultivatorId: cultivator.id,
    treasury: PLAYER_SECT_FOUNDING_STONE_COST,
    memberIds: [cultivator.id],
    spiritVeins: [`${name}灵脉`],
    headquarters: toSectOutpostLocationId(stateId, sectId),
    titleSlots: SECT_TITLE_SLOTS.map((slot) => ({ ...slot })),
    titleUpdateInterval: SECT_TITLE_UPDATE_INTERVAL,
    lastTitleUpdateTick: world.tick,
    admissionPolicy,
    // Founding uses the default policy; the first manual edit should not spend the cooldown.
    admissionPolicyUpdatedAtTick: world.tick - PLAYER_SECT_POLICY_UPDATE_COOLDOWN,
  };
  world.sects[sectId] = sect;
  cultivator.spiritStones -= PLAYER_SECT_FOUNDING_STONE_COST;
  cultivator.sectId = sectId;
  cultivator.sectTitle = "宗主";
  applyMoralityDelta(world, cultivator, alignment === "正道" ? 12 : -12, "found-sect");
  cultivator.pendingSectApplicationId = null;
  const headquartersLocationId = ensurePlayerSectOutpost(world, sect);
  sect.headquarters = headquartersLocationId;
  addMessage(world, cultivator.id, sect.name, "立派成功", `${cultivator.name}创立了${sect.name}。`);
  addDaoLog(world, cultivator.id, "Founded Sect", `${cultivator.name} founded ${sect.name}.`, ["sect", "found-sect"]);

  return {
    tick: world.tick,
    cultivatorId,
    sectId,
    headquartersLocationId,
    stateId,
    alignment,
    admissionPolicy: structuredClone(admissionPolicy),
    summary: `${cultivator.name} founded ${sect.name}.`,
  };
}

export function listRecruitablePlayerSects(
  world: WorldState,
  cultivatorId: string,
  options: { limit?: number; cursor?: string } = {},
): PlayerSectRecruitmentListView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const stateId = world.locations[cultivator.locationId]?.stateId;
  const sorted = Object.values(world.sects)
    .filter((sect) => !stateId || sect.stateId === stateId)
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  const offset = normalizePageCursor(options.cursor);
  const limit = normalizePageLimit(options.limit);
  return {
    cultivatorId,
    sects: sorted.slice(offset, offset + limit).map((sect) => ({
      sectId: sect.id,
      name: sect.name,
      stateId: sect.stateId,
      alignment: sect.alignment,
      headquartersLocationId: sect.headquarters,
      memberCount: sect.memberIds.length,
      minimumRealmLevel: sect.admissionPolicy.minimumRealmLevel,
      allowedMotiveBuckets: [...sect.admissionPolicy.allowedMotiveBuckets],
    })),
    nextCursor: nextCursorForSlice(sorted.length, offset, limit),
  };
}

export function applyToPlayerSect(
  world: WorldState,
  cultivatorId: string,
  input: { sectId: string },
): PlayerSectApplicationResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const sect = world.sects[input.sectId];
  if (!sect) {
    throw new Error(`Player sect not found: ${input.sectId}`);
  }
  cleanupCultivatorPendingSectApplication(world, cultivator);
  if (cultivator.pendingSectApplicationId) {
    throw new Error("Cultivator already has a pending sect application.");
  }
  if (cultivatorHasOrganization(cultivator)) {
    throw new Error("Cultivator already belongs to an organization.");
  }
  if (cultivator.locationId !== sect.headquarters && cultivator.locationId !== mainCityLocationIdOf(sect.stateId)) {
    throw new Error("Player-sect applications must be submitted at the sect's state main city or sect outpost.");
  }
  if (activeReapplyCooldown(world, sect.id, cultivator.id)) {
    throw new Error(`Reapplying to this sect is blocked for ${PLAYER_SECT_APPLICATION_TTL} ticks after rejection.`);
  }
  if (!cultivator.registrationRecord && !isAllMotiveBucketsAllowed(sect.admissionPolicy)) {
    throw new Error("Application requires a saved registration record for motive screening.");
  }
  if (!cultivatorMatchesSectAlignment(sect, cultivator)) {
    throw new Error("Cultivator morality alignment does not match this sect.");
  }
  if (!policyMatchesCultivator(sect, cultivator)) {
    throw new Error("Cultivator does not satisfy the current sect admission policy.");
  }

  const applicationId = `sect-application-${world.nextSectApplicationSequence++}`;
  world.pendingSectApplications[applicationId] = {
    id: applicationId,
    sectId: sect.id,
    cultivatorId,
    appliedAtTick: world.tick,
    expiresAtTick: world.tick + PLAYER_SECT_APPLICATION_TTL,
  };
  cultivator.pendingSectApplicationId = applicationId;
  notifySectReviewers(world, sect, "新入派申请", `${cultivator.name}提交了加入${sect.name}的申请。`);
  addMessage(world, cultivator.id, sect.name, "申请已提交", `${cultivator.name}提交了加入${sect.name}的申请。`);
  addDaoLog(world, cultivator.id, "Sect Application", `${cultivator.name} applied to ${sect.name}.`, ["sect", "sect-application"]);

  return {
    tick: world.tick,
    cultivatorId,
    applicationId,
    sectId: sect.id,
    summary: `${cultivator.name} applied to ${sect.name}.`,
  };
}

export function listSectApplications(
  world: WorldState,
  cultivatorId: string,
  options: { limit?: number; cursor?: string } = {},
): SectApplicationListView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const sect = ensureSectReviewer(world, cultivator);
  const filtered = Object.values(world.pendingSectApplications)
    .filter((application) => application.sectId === sect.id)
    .map((application) => buildSectApplicationView(world, application))
    .filter((application): application is SectApplicationView => Boolean(application))
    .sort((left, right) =>
      left.appliedAtTick === right.appliedAtTick
        ? left.applicationId.localeCompare(right.applicationId)
        : left.appliedAtTick - right.appliedAtTick);
  const offset = normalizePageCursor(options.cursor);
  const limit = normalizePageLimit(options.limit);
  return {
    cultivatorId,
    sectId: sect.id,
    applications: filtered.slice(offset, offset + limit),
    nextCursor: nextCursorForSlice(filtered.length, offset, limit),
  };
}

export function reviewSectApplication(
  world: WorldState,
  cultivatorId: string,
  input: {
    applicationId: string;
    decision: "approve" | "reject";
  },
): ReviewSectApplicationResult {
  const reviewer = getCultivatorOrThrow(world, cultivatorId);
  const sect = ensureSectReviewer(world, reviewer);
  const application = world.pendingSectApplications[input.applicationId];
  if (!application || application.sectId !== sect.id) {
    throw new Error("Sect application not found.");
  }
  const applicant = world.cultivators[application.cultivatorId];
  if (
    !applicant
    || applicant.pendingSectApplicationId !== application.id
    || cultivatorHasOrganization(applicant)
    || isSectApplicationExpired(world, application)
    || !cultivatorMatchesSectAlignment(sect, applicant)
    || !policyMatchesCultivator(sect, applicant)
  ) {
    removePendingSectApplication(world, input.applicationId);
    throw new Error("Sect application is no longer valid.");
  }

  removePendingSectApplication(world, input.applicationId);
  if (input.decision === "approve") {
    applicant.sectId = sect.id;
    applicant.sectTitle = "外门";
    applyMoralityDelta(world, applicant, sect.alignment === "正道" ? 8 : -8, "sect-approved");
    if (!sect.memberIds.includes(applicant.id)) {
      sect.memberIds.push(applicant.id);
    }
    addMessage(world, applicant.id, sect.name, "入派通过", `${applicant.name}加入了${sect.name}，头衔为外门。`);
    addDaoLog(world, applicant.id, "Sect Admission Approved", `${applicant.name} joined ${sect.name}.`, ["sect", "sect-approved"]);
  } else {
    const cooldownId = `sect-cooldown-${world.nextSectCooldownSequence++}`;
    world.sectReapplyCooldowns[cooldownId] = {
      id: cooldownId,
      sectId: sect.id,
      cultivatorId: applicant.id,
      rejectedAtTick: world.tick,
      expiresAtTick: world.tick + PLAYER_SECT_APPLICATION_TTL,
    };
    addMessage(world, applicant.id, sect.name, "入派驳回", `${PLAYER_SECT_APPLICATION_TTL} ticks 内不可向${sect.name}重申。`);
    addDaoLog(world, applicant.id, "Sect Admission Rejected", `${applicant.name} was rejected by ${sect.name}.`, ["sect", "sect-rejected"]);
  }

  return {
    tick: world.tick,
    cultivatorId,
    applicationId: input.applicationId,
    sectId: sect.id,
    decision: input.decision,
    summary:
      input.decision === "approve"
        ? `${reviewer.name} approved ${applicant.name}.`
        : `${reviewer.name} rejected ${applicant.name}.`,
  };
}

export function updateSectAdmissionPolicy(
  world: WorldState,
  cultivatorId: string,
  input: SectAdmissionPolicy,
): UpdateSectAdmissionPolicyResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const sect = getCultivatorSect(world, cultivator);
  if (!sect || sect.founderCultivatorId !== cultivator.id || cultivator.sectTitle !== "宗主") {
    throw new Error("Only the sect 宗主 can update admission policy.");
  }
  if (world.tick - sect.admissionPolicyUpdatedAtTick < PLAYER_SECT_POLICY_UPDATE_COOLDOWN) {
    throw new Error(`Admission policy can only change every ${PLAYER_SECT_POLICY_UPDATE_COOLDOWN} ticks.`);
  }
  sect.admissionPolicy = normalizeSectAdmissionPolicy(input);
  sect.admissionPolicyUpdatedAtTick = world.tick;
  addMessage(world, cultivator.id, sect.name, "招人规则已更新", `${sect.name}更新了招人规则。`);
  addDaoLog(world, cultivator.id, "Sect Admission Policy Updated", `${cultivator.name} updated ${sect.name} admission policy.`, ["sect", "sect-policy-update"]);
  return {
    tick: world.tick,
    cultivatorId,
    sectId: sect.id,
    summary: `${cultivator.name} updated ${sect.name} admission policy.`,
  };
}
