import type {
  AgentBinding, AgentPersonaSyncResult, ActionExecutionResult, ActionId, ActionJob, AvailableAction, CharacterSummary,
  BreakthroughCategory, BreakthroughMaterialSourceView, BreakthroughRateModifier, BreakthroughRecord, BreakthroughStateView,
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
  CombatStyle, CombatJobState, CombatSnapshot, CombatRoundLog, CombatDamageBreakdown, EncounterTemplate, AttackResult, CombatActionType, EscapeResolution, AttackChannel,
  WeaponLoadoutId, SpellLoadoutId, WeaponLoadoutDefinition, SpellLoadoutDefinition,
  CombatStatusId, CombatStatusInstance, StatusHookId, SpellTier, StatusEffectKind, StatusTargetSide,
  PendingPvpChallenge, PvpBattleKind,
} from "./model.js";
import {
  deriveMainAttributes,
  deriveDetailedAttributes,
  weaponAttack,
  physicalDefense,
  spellAttack,
  spellDefense,
} from "./attributes.js";
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
  getWeaponLoadoutsByFamily,
  getSpellLoadoutsByElement,
  getAllWeaponLoadouts,
  getAllSpellLoadouts,
  getWeaponLoadoutDefinition,
  getSpellLoadoutDefinition,
  SPELL_BRANCH_ELEMENT_MAP,
  WEAPON_FAMILY_DEFINITIONS,
  WEAPON_TYPE_DEFINITIONS,
} from "./combat-loadouts.js";
import {
  applyOrRefreshStatus,
  gatherPassiveModifiers,
  gatherConsumableModifiers,
  markConsumed,
  processRoundEndTicks,
  decayAndCleanStatuses,
  getCombatStatusDefinition,
  getStatusHookDefinition,
  type StatusModifiers,
  type TickEvent,
} from "./combat-statuses.js";
import {
  getEnemyConfig,
  enemyConfigToEncounterTemplate,
  getEncounterBuild,
  pickDungeonGuardianBuildId,
  pickWildernessCombatBuildId,
  type EncounterBuildId,
  type EnemyConfigId,
} from "./encounters/index.js";
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
import { getItemActionBinding, getItemOperationActionId, ITEM_CATALOG } from "./items/catalog.js";
import {
  createDungeonProgress,
  createEmptyInventory,
  createFactionReputation,
  createStateReputation,
  EIGHT_WASTES_CONTENT,
} from "./seed.js";
import { buildSectLevel, sectBonusValue } from "./sect-level.js";
import {
  type SectTaskCategory,
  type SectTaskTemplate,
  getAvailableTasksForTitle,
  getSectTaskById,
  pickRandomSectTask,
  calculateTaskReward,
  meetsTaskTitleRequirement,
} from "./sect-tasks.js";
import {
  type AffinityLevel,
  type SocialLink,
  AFFINITY_GAINS,
  AFFINITY_THRESHOLDS,
  CO_LOCATION_AFFINITY_INTERVAL,
  DAO_COMPANION_MIN_LEVEL,
  DAO_COMPANION_PROPOSAL_EXPIRY,
  DUAL_CULTIVATE_BONUS,
  MAX_DAO_COMPANIONS,
  PARTY_INVITE_EXPIRY,
  PARTY_INVITE_MIN_LEVEL,
  VOICE_TRANSMIT_MIN_LEVEL,
  addMutualAffinity,
  disbandParty,
  getAffinityLevel,
  getCultivatorsAtLocation,
  getDaoCompanionId,
  getDualWildernessTaskById,
  getFriendsAtLevel,
  getOrCreateSocialLink,
  getPartyOf,
  getPartyPartner,
  getSocialLink,
  getSocialLinksView,
  hasDaoCompanion,
  isInParty,
  meetsAffinityLevel,
  pickChatUpTarget,
  pickDualWildernessTask,
  setBond,
  writeSocialLink,
} from "./social.js";
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
import { getWildernessEventDefinition } from "./wilderness-events.js";
import {
  buildDungeonExpeditionStateView,
  buildDungeonRankYieldHints,
  chooseDungeonExpeditionStepKind,
  createDungeonExpeditionProgress,
  createDungeonExpeditionReport,
  describeDungeonExpeditionAction,
  enterDungeonActionIdOf,
  DUNGEON_EXPEDITION_DURATION_TICKS,
  DUNGEON_EXPEDITION_MAX_STEPS,
  DUNGEON_EXPEDITION_POLICIES,
  DUNGEON_EXPEDITION_STEP_TICKS,
  getActiveDungeonExpedition,
  isAbortDungeonExpeditionAction,
  isDungeonExpeditionCatastrophic,
  maybeCreateDungeonWakeNode,
  parseEnterDungeonActionId,
  parseStartDungeonExpeditionActionId,
  recordDungeonExpeditionStep,
  resolveDungeonWakeNodeByDefault,
  shouldRetreatDungeonExpedition,
  strategyFromPolicy,
  startDungeonExpeditionActionIdOf,
} from "./dungeon-expedition-service.js";
import {
  advanceBahuangExpedition,
  buildBahuangStateView,
  canEnterBahuang,
  enterBahuangExpedition,
  retreatFromBahuang,
} from "./bahuang-service.js";
import { pickLoadoutSourceDrop } from "./loadout-sourcing.js";
import { LOADOUT_SOURCE_ITEMS } from "./items/loadout-source-items.js";
import { getLiveCraftableRecipes } from "./residence.js";

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
  genericMaterials: ReadonlyArray<{ itemId: ItemId; count: number }>;
  specialMaterial: { itemId: ItemId; count: number };
  marketBuyable: boolean;
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
  "dungeon-c": { grade: "丙", minRealm: REALM_QI, materialBand: "cloud-heart-grass" },
  "dungeon-b": { grade: "乙", minRealm: REALM_FOUNDATION, materialBand: "mystic-jade-stone" },
  "dungeon-a": { grade: "甲", minRealm: REALM_CORE, materialBand: "golden-spirit-flower" },
};

const BREAKTHROUGH_TIER_POOL: Record<ItemId, ReadonlyArray<ItemId>> = {
  "cloud-heart-grass": [
    "cloud-heart-grass", "moon-dew-flower", "clear-zhi-leaf",
    "spirit-brook-bamboo", "pure-heart-orchid", "mist-vine",
    "condensed-qi-dew", "azure-stone-marrow", "meridian-lotus-essence",
  ],
  "mystic-jade-stone": [
    "mystic-jade-stone", "jade-marrow-sand", "purple-palace-earth",
    "cold-moon-crystal", "still-cloud-wood", "tranquil-bamboo",
    "foundation-spirit-amber", "wind-control-crystal", "nine-turn-core-sand",
  ],
  "golden-spirit-flower": [
    "golden-spirit-flower", "purple-celestial-leaf", "star-fall-sand",
    "moon-glory-jade", "clear-mystic-wood", "chaos-moss",
    "flowing-aurora-core", "dragon-radiance-crystal", "nine-turn-golden-marrow",
  ],
};

function pickBreakthroughDrop(bandKey: ItemId, seed: string): ItemId {
  const pool = BREAKTHROUGH_TIER_POOL[bandKey];
  if (!pool) return bandKey;
  return pool[hashString(seed) % pool.length]!;
}
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
const MINE_BEAST_ENCOUNTER_TEMPLATE: EncounterTemplate = {
  id: "mine-beast",
  enemyName: "Vein Beast",
  maxRounds: 5,
  stylePreference: ["brute", "finesse", "tactic"],
  baseHp: 120,
  attack: 35,
  defense: 18,
  speed: 22,
  hit: 30,
  dodge: 15,
  crit: 8,
  critDamage: 40,
  guardHeart: 5,
  equippedWeaponLoadoutId: "starter-gauntlets",
};
const GUARDIAN_ENCOUNTER_TEMPLATE: EncounterTemplate = {
  id: "ruins-guardian",
  enemyName: "Ruins Guardian",
  maxRounds: 7,
  stylePreference: ["tactic", "brute", "finesse"],
  baseHp: 200,
  attack: 50,
  defense: 30,
  speed: 18,
  hit: 35,
  dodge: 10,
  crit: 12,
  critDamage: 50,
  guardHeart: 10,
  equippedWeaponLoadoutId: "starter-halberd",
  equippedSpellLoadoutId: "starter-earth-suppress",
  spirit: 60,
  maxSpirit: 60,
};

/** Resolve an EncounterTemplate from the authored encounter registry.
 *  Falls back to legacy hardcoded templates for backward compatibility. */
function resolveEncounterTemplateFromBuild(buildId: EncounterBuildId): { template: EncounterTemplate; buildId: EncounterBuildId; enemyConfigId: EnemyConfigId } | null {
  const build = getEncounterBuild(buildId);
  if (!build || build.enemyConfigIds.length === 0) return null;
  const enemyConfigId = build.enemyConfigIds[0];
  const config = getEnemyConfig(enemyConfigId);
  if (!config) return null;
  return { template: enemyConfigToEncounterTemplate(config), buildId, enemyConfigId };
}

/** Pick a wilderness encounter from the authored registry, falling back to legacy mine-beast. */
function resolveWildernessEncounterTemplate(seed: number): { template: EncounterTemplate; buildId: EncounterBuildId | null; enemyConfigId: EnemyConfigId | null } {
  const buildId = pickWildernessCombatBuildId(seed);
  const resolved = resolveEncounterTemplateFromBuild(buildId);
  if (resolved) return resolved;
  return { template: MINE_BEAST_ENCOUNTER_TEMPLATE, buildId: null, enemyConfigId: null };
}

/** Pick a guardian encounter from the authored registry, falling back to legacy ruins-guardian. */
function resolveGuardianEncounterTemplate(seed: number): { template: EncounterTemplate; buildId: EncounterBuildId | null; enemyConfigId: EnemyConfigId | null } {
  const buildId = pickDungeonGuardianBuildId(seed);
  const resolved = resolveEncounterTemplateFromBuild(buildId);
  if (resolved) return resolved;
  return { template: GUARDIAN_ENCOUNTER_TEMPLATE, buildId: null, enemyConfigId: null };
}
const REALM_PHASES: readonly RealmPhase[] = ["前期", "中期", "后期"];
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
type JobMetaWithCombat = NonNullable<ActionJob["meta"]> & {
  combatState?: CombatJobState;
};
const getCombatJobState = (job: ActionJob): CombatJobState | null =>
  ((job.meta as JobMetaWithCombat | undefined)?.combatState ?? null);
const setCombatJobState = (job: ActionJob, combatState: CombatJobState): void => {
  const meta = (job.meta ??= {});
  (meta as JobMetaWithCombat).combatState = combatState;
};
const readinessModifier = (readiness: ReturnType<typeof computeReadiness>): number => {
  if (readiness === "poor") return -20;
  if (readiness === "ready") return 10;
  if (readiness === "advantaged") return 20;
  return 0;
};
const routeInitiativeBonus = (route: CombatStyle): number => (route === "finesse" ? 8 : 0);
const routeDodgeBonus = (route: CombatStyle): number => (route === "finesse" ? 5 : 0);
const routeHitBonus = (route: CombatStyle): number => (route === "tactic" ? 5 : 0);
const routeCritBonus = (route: CombatStyle): number => (route === "tactic" ? 4 : 0);
const routeDamageMultiplier = (route: CombatStyle): number => (route === "brute" ? 1.08 : 1);
const triangleMultiplier = (attacker: CombatStyle, defender: CombatStyle): number => {
  if (attacker === defender) {
    return 1;
  }
  if (
    (attacker === "tactic" && defender === "brute")
    || (attacker === "brute" && defender === "finesse")
    || (attacker === "finesse" && defender === "tactic")
  ) {
    return 1.15;
  }
  return 0.9;
};
const computeHitChance = (attackerHit: number, defenderDodge: number): number =>
  clamp(75 + ((attackerHit - defenderDodge) * 0.2), 35, 97);
const computeCritChance = (attackerCrit: number, defenderGuardHeart: number): number =>
  clamp(attackerCrit - (defenderGuardHeart * 0.7), 0, 55);
const CORE_TEMPERAMENT_STYLE_WEIGHTS: Record<string, { brute: number; finesse: number; tactic: number }> = {
  shou_jie:    { brute: -1, finesse: -1, tactic:  2 },
  duan_feng:   { brute:  2, finesse:  0, tactic: -1 },
  fu_sheng:    { brute: -2, finesse:  0, tactic:  2 },
  xiang_rong:  { brute:  0, finesse:  1, tactic:  1 },
  qian_yuan:   { brute: -1, finesse:  0, tactic:  2 },
  guan_lan:    { brute: -1, finesse:  0, tactic:  2 },
  chi_xin:     { brute:  1, finesse:  1, tactic:  0 },
  zheng_sheng: { brute:  2, finesse:  1, tactic: -2 },
  zhen_yue:    { brute:  1, finesse: -2, tactic:  2 },
  shou_cheng:  { brute: -1, finesse:  0, tactic:  2 },
};
const BEHAVIOR_ASPECT_STYLE_WEIGHTS: Record<string, { brute: number; finesse: number; tactic: number }> = {
  metal:         { brute:  1, finesse:  0, tactic:  0 },
  wood:          { brute:  0, finesse:  1, tactic:  0 },
  water:         { brute: -1, finesse:  0, tactic:  1 },
  fire:          { brute:  1, finesse:  1, tactic: -1 },
  earth:         { brute:  0, finesse: -1, tactic:  1 },
  "metal-wood":  { brute:  0, finesse:  1, tactic:  0 },
  "metal-water": { brute: -1, finesse:  0, tactic:  1 },
  "metal-fire":  { brute:  1, finesse:  1, tactic: -1 },
  "metal-earth": { brute:  0, finesse: -1, tactic:  1 },
  "wood-water":  { brute: -1, finesse:  1, tactic:  1 },
  "wood-fire":   { brute:  1, finesse:  1, tactic:  0 },
  "wood-earth":  { brute: -1, finesse:  0, tactic:  1 },
  "water-fire":  { brute:  1, finesse:  0, tactic:  0 },
  "water-earth": { brute: -1, finesse: -1, tactic:  2 },
  "fire-earth":  { brute:  1, finesse:  0, tactic:  1 },
};
const CORE_TEMPERAMENT_ACTION_WEIGHTS: Record<string, { basic_attack: number; core_skill: number; escape: number }> = {
  shou_jie:    { basic_attack: 0, core_skill: -1, escape: +1 },
  duan_feng:   { basic_attack: 0, core_skill: +2, escape: -2 },
  fu_sheng:    { basic_attack: 0, core_skill: -1, escape: +1 },
  xiang_rong:  { basic_attack: 0, core_skill:  0, escape:  0 },
  qian_yuan:   { basic_attack: 0, core_skill: +1, escape:  0 },
  guan_lan:    { basic_attack: 0, core_skill: -1, escape: +1 },
  chi_xin:     { basic_attack: 0, core_skill: +1, escape: -1 },
  zheng_sheng: { basic_attack: 0, core_skill: +2, escape: -2 },
  zhen_yue:    { basic_attack: 0, core_skill:  0, escape:  0 },
  shou_cheng:  { basic_attack: 0, core_skill: -1, escape: +1 },
};
const BEHAVIOR_ASPECT_ACTION_WEIGHTS: Record<string, { basic_attack: number; core_skill: number; escape: number }> = {
  metal:         { basic_attack: 0, core_skill: +1, escape:  0 },
  wood:          { basic_attack: 0, core_skill:  0, escape:  0 },
  water:         { basic_attack: 0, core_skill: -1, escape: +1 },
  fire:          { basic_attack: 0, core_skill: +1, escape: -1 },
  earth:         { basic_attack: 0, core_skill: -1, escape: +1 },
  "metal-wood":  { basic_attack: 0, core_skill:  0, escape:  0 },
  "metal-water": { basic_attack: 0, core_skill: -1, escape: +1 },
  "metal-fire":  { basic_attack: 0, core_skill: +1, escape: -1 },
  "metal-earth": { basic_attack: 0, core_skill:  0, escape:  0 },
  "wood-water":  { basic_attack: 0, core_skill: -1, escape: +1 },
  "wood-fire":   { basic_attack: 0, core_skill: +1, escape: -1 },
  "wood-earth":  { basic_attack: 0, core_skill:  0, escape:  0 },
  "water-fire":  { basic_attack: 0, core_skill: +1, escape:  0 },
  "water-earth": { basic_attack: 0, core_skill: -1, escape: +1 },
  "fire-earth":  { basic_attack: 0, core_skill: +1, escape:  0 },
};

// ---- Combat Loadout Derivation ----
function deriveInitialWeaponLoadouts(
  registrationRecord: CultivationRegistrationRecord | null,
): {
  unlockedLoadoutIds: readonly WeaponLoadoutId[];
  equippedLoadoutId: WeaponLoadoutId;
} {
  if (!registrationRecord) {
    return {
      unlockedLoadoutIds: ["starter-sword" as WeaponLoadoutId],
      equippedLoadoutId: "starter-sword" as WeaponLoadoutId,
    };
  }

  // Use the route evaluator's staticBias = registrationBias + attributeStyleBias
  // to rank the top two routes, then map to starter loadouts.
  const regResult = registrationRecord.result;
  const temperamentId = regResult.core_temperament_id
    ?? (regResult.core_temperament ? resolveTemperamentId(regResult.core_temperament) : null);
  const aspectId = regResult.behavior_aspect_id
    ?? (regResult.behavior_aspect ? resolveBehaviorAspectId(regResult.behavior_aspect) : null);
  const tempWeights = temperamentId ? CORE_TEMPERAMENT_STYLE_WEIGHTS[temperamentId] : undefined;
  const aspectWeights = aspectId ? BEHAVIOR_ASPECT_STYLE_WEIGHTS[aspectId] : undefined;
  const registrationBias = {
    brute:   (tempWeights?.brute ?? 0) + (aspectWeights?.brute ?? 0),
    finesse: (tempWeights?.finesse ?? 0) + (aspectWeights?.finesse ?? 0),
    tactic:  (tempWeights?.tactic ?? 0) + (aspectWeights?.tactic ?? 0),
  };
  const mainAttrs = deriveMainAttributes(registrationRecord);
  const axisAvg = (mainAttrs.bingpo + mainAttrs.shenfa + mainAttrs.daoxin) / 3;
  const attributeStyleBias = {
    brute:   clamp((mainAttrs.bingpo - axisAvg) * 0.01, -0.15, 0.15),
    finesse: clamp((mainAttrs.shenfa - axisAvg) * 0.01, -0.15, 0.15),
    tactic:  clamp((mainAttrs.daoxin - axisAvg) * 0.01, -0.15, 0.15),
  };
  const styles: { style: CombatStyle; score: number }[] = [
    { style: "brute",   score: registrationBias.brute   + attributeStyleBias.brute },
    { style: "finesse", score: registrationBias.finesse + attributeStyleBias.finesse },
    { style: "tactic",  score: registrationBias.tactic  + attributeStyleBias.tactic },
  ];
  styles.sort((a, b) => b.score - a.score);

  const styleToLoadoutMap: Record<CombatStyle, WeaponLoadoutId> = {
    brute: "starter-saber" as WeaponLoadoutId,
    finesse: "starter-sword" as WeaponLoadoutId,
    tactic: "starter-spear" as WeaponLoadoutId,
  };

  const firstLoadoutId = styleToLoadoutMap[styles[0]!.style];
  const secondLoadoutId = styleToLoadoutMap[styles[1]!.style];

  return {
    unlockedLoadoutIds: [firstLoadoutId, secondLoadoutId],
    equippedLoadoutId: firstLoadoutId,
  };
}

function deriveInitialSpellLoadouts(
  registrationRecord: CultivationRegistrationRecord | null,
): {
  unlockedLoadoutIds: readonly SpellLoadoutId[];
  equippedLoadoutId: SpellLoadoutId;
} {
  if (!registrationRecord) {
    // Fallback: default to starter-metal-edge
    return {
      unlockedLoadoutIds: ["starter-metal-edge" as SpellLoadoutId],
      equippedLoadoutId: "starter-metal-edge" as SpellLoadoutId,
    };
  }

  // Derive spell loadouts from the dominant elements
  const fiveElementScores = registrationRecord.result.five_element_scores;
  const elements: Array<[string, number]> = Object.entries(fiveElementScores);
  elements.sort((a, b) => b[1] - a[1]);

  // Map element to starter spell loadout
  const elementToMainLoadoutMap: Record<string, SpellLoadoutId> = {
    metal: "starter-metal-edge" as SpellLoadoutId,
    wood: "starter-wood-bind" as SpellLoadoutId,
    water: "starter-water-frost" as SpellLoadoutId,
    fire: "starter-fire-blaze" as SpellLoadoutId,
    earth: "starter-earth-wall" as SpellLoadoutId,
  };

  const elementToBackupLoadoutMap: Record<string, SpellLoadoutId> = {
    metal: "starter-metal-guard" as SpellLoadoutId,
    wood: "starter-wood-growth" as SpellLoadoutId,
    water: "starter-water-flow" as SpellLoadoutId,
    fire: "starter-fire-burst" as SpellLoadoutId,
    earth: "starter-earth-vein" as SpellLoadoutId,
  };

  const mainElement = elements[0]?.[0] || "metal";
  const backupElement = elements[1]?.[0] || mainElement;

  const mainLoadoutId = elementToMainLoadoutMap[mainElement] || ("starter-metal-edge" as SpellLoadoutId);
  const backupLoadoutId = backupElement !== mainElement
    ? elementToBackupLoadoutMap[backupElement] || elementToMainLoadoutMap[backupElement]
    : elementToBackupLoadoutMap[mainElement];

  const unlockedLoadoutIds = [mainLoadoutId, backupLoadoutId] as const;
  const equippedLoadoutId = mainLoadoutId;

  return { unlockedLoadoutIds, equippedLoadoutId };
}

export function selectCombatRoute(
  cultivator: Cultivator,
  seed: string,
  affinityRoute: CombatStyle | null = null,
): CombatStyle {
  const regResult = cultivator.registrationRecord?.result;
  const temperamentId = regResult?.core_temperament_id
    ?? (regResult?.core_temperament ? resolveTemperamentId(regResult.core_temperament) : null);
  const aspectId = regResult?.behavior_aspect_id
    ?? (regResult?.behavior_aspect ? resolveBehaviorAspectId(regResult.behavior_aspect) : null);
  const tempWeights = temperamentId ? CORE_TEMPERAMENT_STYLE_WEIGHTS[temperamentId] : undefined;
  const aspectWeights = aspectId ? BEHAVIOR_ASPECT_STYLE_WEIGHTS[aspectId] : undefined;
  const registrationBias = {
    brute:   (tempWeights?.brute ?? 0) + (aspectWeights?.brute ?? 0),
    finesse: (tempWeights?.finesse ?? 0) + (aspectWeights?.finesse ?? 0),
    tactic:  (tempWeights?.tactic ?? 0) + (aspectWeights?.tactic ?? 0),
  };
  const mainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const axisAvg = (mainAttrs.bingpo + mainAttrs.shenfa + mainAttrs.daoxin) / 3;
  const attributeStyleBias = {
    brute:   clamp((mainAttrs.bingpo - axisAvg) * 0.01, -0.15, 0.15),
    finesse: clamp((mainAttrs.shenfa - axisAvg) * 0.01, -0.15, 0.15),
    tactic:  clamp((mainAttrs.daoxin - axisAvg) * 0.01, -0.15, 0.15),
  };
  const smallRandom = {
    brute:   (hashString(`${seed}:route-rand:brute`) % 100) / 100,
    finesse: (hashString(`${seed}:route-rand:finesse`) % 100) / 100,
    tactic:  (hashString(`${seed}:route-rand:tactic`) % 100) / 100,
  };
  const styles: { style: CombatStyle; score: number }[] = [
    {
      style: "brute",
      score: registrationBias.brute + attributeStyleBias.brute + smallRandom.brute + (affinityRoute === "brute" ? 1 : 0),
    },
    {
      style: "finesse",
      score: registrationBias.finesse + attributeStyleBias.finesse + smallRandom.finesse + (affinityRoute === "finesse" ? 1 : 0),
    },
    {
      style: "tactic",
      score: registrationBias.tactic + attributeStyleBias.tactic + smallRandom.tactic + (affinityRoute === "tactic" ? 1 : 0),
    },
  ];
  styles.sort((a, b) => b.score - a.score);
  const top2 = styles.slice(0, 2);
  const minScore = top2[1]!.score;
  const weights = top2.map(s => ({ style: s.style, weight: s.score - minScore + 1 }));
  const totalWeight = weights[0]!.weight + weights[1]!.weight;
  const roll = (hashString(`${seed}:route-sample`) % 10000) / 10000;
  return roll < (weights[0]!.weight / totalWeight) ? weights[0]!.style : weights[1]!.style;
}
export function getAvailableActions(
  isPlayer: boolean,
  currentSpirit: number,
  coreSkillSpiritCost: number,
  escapeAllowed: boolean,
  allowEnemyEscape = false,
): CombatActionType[] {
  const actions: CombatActionType[] = ["basic_attack"];
  if (currentSpirit >= coreSkillSpiritCost) {
    actions.push("core_skill");
  }
  if ((isPlayer || allowEnemyEscape) && escapeAllowed) {
    actions.push("escape");
  }
  return actions;
}

// ---- Combat Loadout Switching ----
export function canEquipWeapon(cultivator: Cultivator, loadoutId: WeaponLoadoutId): boolean {
  return cultivator.unlockedWeaponLoadoutIds.includes(loadoutId);
}

export function canEquipSpell(cultivator: Cultivator, loadoutId: SpellLoadoutId): boolean {
  return cultivator.unlockedSpellLoadoutIds.includes(loadoutId);
}

export function equipWeapon(cultivator: Cultivator, loadoutId: WeaponLoadoutId): void {
  if (!canEquipWeapon(cultivator, loadoutId)) {
    throw new Error(`Cannot equip weapon loadout: ${loadoutId}`);
  }
  cultivator.equippedWeaponLoadoutId = loadoutId;
}

export function equipSpell(cultivator: Cultivator, loadoutId: SpellLoadoutId): void {
  if (!canEquipSpell(cultivator, loadoutId)) {
    throw new Error(`Cannot equip spell loadout: ${loadoutId}`);
  }
  cultivator.equippedSpellLoadoutId = loadoutId;
}

export function selectCombatAction(
  cultivator: Cultivator,
  selfSnapshot: CombatSnapshot,
  enemySnapshot: CombatSnapshot,
  isPlayer: boolean,
  escapeAllowed: boolean,
  currentSpirit: number,
  maxSpirit: number,
  coreSkillSpiritCost: number,
  seed: string,
  allowEnemyEscape = false,
): CombatActionType {
  const availableActions = getAvailableActions(isPlayer, currentSpirit, coreSkillSpiritCost, escapeAllowed, allowEnemyEscape);
  if (availableActions.length === 1) {
    return availableActions[0]!;
  }

  const regResult = cultivator.registrationRecord?.result;
  const temperamentId = regResult?.core_temperament_id
    ?? (regResult?.core_temperament ? resolveTemperamentId(regResult.core_temperament) : null);
  const aspectId = regResult?.behavior_aspect_id
    ?? (regResult?.behavior_aspect ? resolveBehaviorAspectId(regResult.behavior_aspect) : null);
  const temperamentWeights = temperamentId ? CORE_TEMPERAMENT_ACTION_WEIGHTS[temperamentId] : undefined;
  const aspectWeights = aspectId ? BEHAVIOR_ASPECT_ACTION_WEIGHTS[aspectId] : undefined;

  const actionBaseWeights: Record<CombatActionType, number> = {
    basic_attack: 0,
    core_skill: 1,
    escape: -4,
  };
  const registrationActionBias: Record<CombatActionType, number> = {
    basic_attack: (temperamentWeights?.basic_attack ?? 0) + (aspectWeights?.basic_attack ?? 0),
    core_skill: (temperamentWeights?.core_skill ?? 0) + (aspectWeights?.core_skill ?? 0),
    escape: (temperamentWeights?.escape ?? 0) + (aspectWeights?.escape ?? 0),
  };

  const selfHpRatio = selfSnapshot.maxHp > 0 ? selfSnapshot.hp / selfSnapshot.maxHp : 0;
  const enemyHpRatio = enemySnapshot.maxHp > 0 ? enemySnapshot.hp / enemySnapshot.maxHp : 0;
  const battleReadiness = isPlayer ? computeReadiness(cultivator) : "stable";
  const battleStateBias: Record<CombatActionType, number> = {
    basic_attack: 0,
    core_skill: 0,
    escape: 0,
  };
  if (selfHpRatio <= 0.35) {
    battleStateBias.core_skill += -1;
    battleStateBias.escape += +4;
  }
  if (enemyHpRatio <= 0.25) {
    battleStateBias.basic_attack += +1;
    battleStateBias.core_skill += +2;
    battleStateBias.escape += -3;
  }
  if (battleReadiness === "poor") {
    battleStateBias.escape += +2;
  }
  if (battleReadiness === "advantaged") {
    battleStateBias.core_skill += +1;
    battleStateBias.escape += -1;
  }

  const spiritRatio = maxSpirit > 0 ? currentSpirit / maxSpirit : 0;
  const resourceBias: Record<CombatActionType, number> = {
    basic_attack: 0,
    core_skill: 0,
    escape: 0,
  };
  if (spiritRatio >= 0.5) {
    resourceBias.core_skill += +1;
  }
  if (spiritRatio <= 0.2) {
    resourceBias.core_skill += -1;
  }

  const actionScores = availableActions.map((actionType) => {
    const smallRandom = (hashString(`${seed}:action-rand:${actionType}`) % 100) / 100;
    const score =
      actionBaseWeights[actionType]
      + registrationActionBias[actionType]
      + battleStateBias[actionType]
      + resourceBias[actionType]
      + smallRandom;
    return { actionType, score };
  });

  actionScores.sort((a, b) => b.score - a.score);
  const top2 = actionScores.slice(0, 2);
  const minScore = Math.min(top2[0]!.score, top2[1]!.score);
  const weightedTop2 = top2.map((entry) => ({
    actionType: entry.actionType,
    weight: entry.score - minScore + 1,
  }));
  const totalWeight = weightedTop2[0]!.weight + weightedTop2[1]!.weight;
  const roll = (hashString(`${seed}:action-sample`) % 10000) / 10000;
  return roll < (weightedTop2[0]!.weight / totalWeight) ? weightedTop2[0]!.actionType : weightedTop2[1]!.actionType;
}
const missDamageBreakdown = (): CombatDamageBreakdown => ({
  baseDamage: 0,
  styleMultiplier: 1,
  triangleMultiplier: 1,
  routeDamageMultiplier: 1,
  critMultiplier: 1,
  actionMultiplier: 1,
  finalDamage: 0,
});
const computeDamage = (
  attack: number,
  defense: number,
  style: CombatStyle,
  playerMainAttrs: ReturnType<typeof deriveMainAttributes> | null,
  triangleMult: number,
  routeDmgMult: number,
  isCrit: boolean,
  critDamagePercent: number,
  actionMultiplier = 1,
): CombatDamageBreakdown => {
  const baseDamage = Math.max(1, attack - (defense * 0.5));
  let styleMultiplier = 1;
  if (playerMainAttrs) {
    const axisAvg = (playerMainAttrs.bingpo + playerMainAttrs.shenfa + playerMainAttrs.daoxin) / 3;
    const axisAttr = style === "brute"
      ? playerMainAttrs.bingpo
      : style === "finesse"
        ? playerMainAttrs.shenfa
        : playerMainAttrs.daoxin;
    styleMultiplier = 1 + clamp((axisAttr - axisAvg) * 0.01, -0.15, 0.15);
  }
  const critMultiplier = isCrit ? (critDamagePercent / 100) : 1;
  const finalDamage = Math.max(1, Math.round(baseDamage * styleMultiplier * triangleMult * routeDmgMult * critMultiplier * actionMultiplier));
  return {
    baseDamage,
    styleMultiplier,
    triangleMultiplier: triangleMult,
    routeDamageMultiplier: routeDmgMult,
    critMultiplier,
    actionMultiplier,
    finalDamage,
  };
};
export const computeEscapeChance = (
  escaperSpeed: number,
  pursuerSpeed: number,
  selfHpRatio: number,
  readiness: ReturnType<typeof computeReadiness>,
): number => {
  const speedDiff = escaperSpeed - pursuerSpeed;
  const disadvantageBonus = selfHpRatio <= 0.20 ? 20 : selfHpRatio <= 0.35 ? 10 : 0;
  return clamp(35 + (speedDiff * 0.2) + disadvantageBonus + readinessModifier(readiness), 10, 85);
};
const guardianCombatScale = (grade: DungeonGrade, rank: DungeonRank): number => {
  const tuning = guardianTuningForDungeon(grade, rank);
  return tuning.threatBase / 136;
};
export const buildCultivatorCombatSnapshot = (
  cultivator: Cultivator,
  escapeAllowed: boolean,
): CombatSnapshot => {
  const mainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const detailedAttrs = deriveDetailedAttributes(mainAttrs);
  const maxHp = Math.max(60, Math.round(80 + (mainAttrs.gengu * 2) + (mainAttrs.tipu * 0.5)));
  const spirit = cultivator.spiritualPower;
  const maxSpirit = cultivator.maxSpiritualPower;

  const weaponLoadout = cultivator.equippedWeaponLoadoutId
    ? getWeaponLoadoutDefinition(cultivator.equippedWeaponLoadoutId)
    : null;
  const spellLoadout = cultivator.equippedSpellLoadoutId
    ? getSpellLoadoutDefinition(cultivator.equippedSpellLoadoutId)
    : null;
  const wAtk = weaponAttack(mainAttrs) + (weaponLoadout?.attackPowerBonus ?? 0);
  const sAtk = spellAttack(mainAttrs) + (spellLoadout?.attackPowerBonus ?? 0);
  const defaultChannel: "weapon" | "spell" = sAtk > wAtk ? "spell" : "weapon";
  const defaultLoadout = defaultChannel === "weapon" ? weaponLoadout : spellLoadout;
  const defaultAttack = defaultChannel === "weapon" ? wAtk : sAtk;
  const defaultCoreSkillSpiritCost = defaultLoadout?.coreSkillSpiritCost ?? Math.max(1, Math.round(maxSpirit * 0.10));
  const defaultCoreSkillPreferredRoute = defaultLoadout?.coreSkillCategory ?? null;

  const weaponTier = (weaponLoadout?.weaponTier ?? 1) as SpellTier;
  const weaponFamilyId = weaponLoadout?.weaponFamilyId ?? null;
  const weaponTypeId = weaponLoadout?.weaponTypeId ?? null;
  const familyDef = weaponFamilyId ? WEAPON_FAMILY_DEFINITIONS[weaponFamilyId] : null;
  const typeDef = weaponTypeId ? WEAPON_TYPE_DEFINITIONS[weaponTypeId] : null;
  const applyBonusStat = (baseStat: number, bonusProfile: { stat: string; values: readonly number[] } | undefined): number => {
    if (!bonusProfile) return baseStat;
    return baseStat + (bonusProfile.values[weaponTier - 1] ?? 0);
  };
  let speed = Math.round(detailedAttrs.sudu);
  let hit = Math.round(detailedAttrs.mingzhong);
  let dodge = Math.round(detailedAttrs.shanbi);
  let crit = Math.round(detailedAttrs.huixin);
  let critDamage = Math.round(detailedAttrs.baoshang);
  let guardHeart = Math.round(detailedAttrs.huxin);
  let tenacity = 0;
  if (familyDef) {
    const b = familyDef.bonusProfile;
    speed = applyBonusStat(speed, b.stat1.stat === "speed" ? b.stat1 : b.stat2.stat === "speed" ? b.stat2 : undefined);
    hit = applyBonusStat(hit, b.stat1.stat === "hit" ? b.stat1 : b.stat2.stat === "hit" ? b.stat2 : undefined);
    dodge = applyBonusStat(dodge, b.stat1.stat === "dodge" ? b.stat1 : b.stat2.stat === "dodge" ? b.stat2 : undefined);
    crit = applyBonusStat(crit, b.stat1.stat === "crit" ? b.stat1 : b.stat2.stat === "crit" ? b.stat2 : undefined);
    critDamage = applyBonusStat(critDamage, b.stat1.stat === "critDamage" ? b.stat1 : b.stat2.stat === "critDamage" ? b.stat2 : undefined);
    guardHeart = applyBonusStat(guardHeart, b.stat1.stat === "guardHeart" ? b.stat1 : b.stat2.stat === "guardHeart" ? b.stat2 : undefined);
    tenacity += (b.stat1.stat === "tenacity" ? b.stat1.values[weaponTier - 1] ?? 0 : 0) + (b.stat2.stat === "tenacity" ? b.stat2.values[weaponTier - 1] ?? 0 : 0);
  }
  if (typeDef) {
    const tb = typeDef.typeBonusProfile;
    speed = applyBonusStat(speed, tb.stat === "speed" ? tb : undefined);
    hit = applyBonusStat(hit, tb.stat === "hit" ? tb : undefined);
    dodge = applyBonusStat(dodge, tb.stat === "dodge" ? tb : undefined);
    crit = applyBonusStat(crit, tb.stat === "crit" ? tb : undefined);
    critDamage = applyBonusStat(critDamage, tb.stat === "critDamage" ? tb : undefined);
    guardHeart = applyBonusStat(guardHeart, tb.stat === "guardHeart" ? tb : undefined);
    tenacity += tb.stat === "tenacity" ? tb.values[weaponTier - 1] ?? 0 : 0;
  }
  guardHeart += tenacity;

  return {
    hp: maxHp,
    maxHp,
    attack: defaultAttack,
    defense: physicalDefense(mainAttrs),
    speed,
    hit,
    dodge,
    crit,
    critDamage,
    guardHeart,
    spirit,
    maxSpirit,
    coreSkillSpiritCost: defaultCoreSkillSpiritCost,
    coreSkillPreferredRoute: defaultCoreSkillPreferredRoute,
    equippedLoadoutId: defaultLoadout?.id ?? null,
    basicAttackStatusHookIds: defaultLoadout?.basicAttackStatusHookIds ?? [],
    coreSkillStatusHookIds: defaultLoadout?.coreSkillStatusHookIds ?? [],
    escapeAllowed,
    weaponAttack: wAtk,
    spellAttack: sAtk,
    weaponLoadoutId: weaponLoadout?.id ?? null,
    spellLoadoutId: spellLoadout?.id ?? null,
    weaponCoreSkillSpiritCost: weaponLoadout?.coreSkillSpiritCost ?? 0,
    spellCoreSkillSpiritCost: spellLoadout?.coreSkillSpiritCost ?? 0,
    weaponCoreSkillPreferredRoute: weaponLoadout?.coreSkillCategory ?? null,
    spellCoreSkillPreferredRoute: spellLoadout?.coreSkillCategory ?? null,
    combatStatuses: [],
  };
};
function matchWildernessOpponent(
  world: WorldState,
  cultivator: Cultivator,
  seed: number,
): Cultivator | null {
  const currentStateId = cultivator.locationId.split(":")[0];
  const candidates = Object.values(world.cultivators).filter(c => {
    if (c.id === cultivator.id) return false;
    const cStateId = c.locationId.split(":")[0];
    if (cStateId !== currentStateId) return false;
    const loc = world.locations[c.locationId];
    if (!loc || loc.kind === "safe") return false;
    const realmGap = Math.abs((REALM_ORDER[cultivator.realm] ?? 0) - (REALM_ORDER[c.realm] ?? 0));
    if (realmGap > 1) return false;
    if (cultivator.sectId && cultivator.sectId === c.sectId) return false;
    if (c.activeJobId) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  return candidates[seed % candidates.length] ?? null;
}
function scaleRogueCultivator(
  cultivator: Cultivator,
): CombatSnapshot {
  const realmMult = cultivator.realm === REALM_QI ? 0.7 : cultivator.realm === REALM_FOUNDATION ? 1.0 : 1.3;
  const hp = Math.round(100 * realmMult);
  const atk = Math.round(30 * realmMult);
  const def = Math.round(20 * realmMult);
  const spd = Math.round(20 * realmMult);
  const hitVal = Math.round(25 * realmMult);
  const dodgeVal = Math.round(15 * realmMult);
  const critVal = Math.round(10 * realmMult);
  const guardVal = Math.round(8 * realmMult);
  const spiritVal = Math.round(50 * realmMult);
  return {
    hp, maxHp: hp, attack: atk, defense: def, speed: spd,
    hit: hitVal, dodge: dodgeVal, crit: critVal, critDamage: 40, guardHeart: guardVal,
    spirit: spiritVal, maxSpirit: spiritVal,
    coreSkillSpiritCost: Math.round(8 * realmMult),
    coreSkillPreferredRoute: null,
    equippedLoadoutId: null,
    basicAttackStatusHookIds: [],
    coreSkillStatusHookIds: [],
    escapeAllowed: true,
    combatStatuses: [],
  };
}
const initializeCombatJobState = (
  world: WorldState,
  cultivator: Cultivator,
  template: EncounterTemplate,
  enemyScale = 1,
  encounterBuildId?: string,
): CombatJobState => {
  const playerSnapshot = buildCultivatorCombatSnapshot(cultivator, template.escapeAllowed !== false);
  const playerSpirit = cultivator.spiritualPower;
  const playerMaxSpirit = cultivator.maxSpiritualPower;

  // ---- Enemy snapshot with optional loadout ----
  const enemyLoadout = template.equippedWeaponLoadoutId
    ? getWeaponLoadoutDefinition(template.equippedWeaponLoadoutId as WeaponLoadoutId)
    : null;
  const enemySpellLoadout = template.equippedSpellLoadoutId
    ? getSpellLoadoutDefinition(template.equippedSpellLoadoutId as SpellLoadoutId)
    : null;
  const enemyChosenLoadout: WeaponLoadoutDefinition | SpellLoadoutDefinition | null = enemyLoadout ?? enemySpellLoadout;
  const enemyAttackBonus = enemyLoadout?.attackPowerBonus ?? enemySpellLoadout?.attackPowerBonus ?? 0;
  const enemyCoreSkillCost = enemyChosenLoadout?.coreSkillSpiritCost ?? 0;
  const enemySpirit = template.spirit ?? 0;
  const enemyMaxSpirit = template.maxSpirit ?? 0;
  const enemyMaxHp = Math.max(1, Math.round(template.baseHp * enemyScale));
  // Enemy per-channel data
  const enemyWeaponAtk = enemyLoadout ? Math.max(1, Math.round((template.attack + (enemyLoadout.attackPowerBonus ?? 0)) * enemyScale)) : 0;
  const enemySpellAtk = enemySpellLoadout ? Math.max(1, Math.round((template.attack + (enemySpellLoadout.attackPowerBonus ?? 0)) * enemyScale)) : 0;
  const enemyDefaultChannel: "weapon" | "spell" = enemySpellAtk > enemyWeaponAtk ? "spell" : "weapon";
  const enemyDefaultLoadout = enemyDefaultChannel === "weapon" ? enemyLoadout : enemySpellLoadout;
  const enemyDefaultAtk = enemyDefaultChannel === "weapon" ? (enemyWeaponAtk || Math.max(1, Math.round((template.attack + enemyAttackBonus) * enemyScale))) : enemySpellAtk;
  const enemySnapshot: CombatSnapshot = {
    hp: enemyMaxHp,
    maxHp: enemyMaxHp,
    attack: enemyDefaultAtk,
    defense: Math.max(1, Math.round(template.defense * enemyScale)),
    speed: Math.max(1, Math.round(template.speed * enemyScale)),
    hit: Math.max(1, Math.round(template.hit)),
    dodge: Math.max(0, Math.round(template.dodge)),
    crit: Math.max(0, Math.round(template.crit)),
    critDamage: Math.max(0, Math.round(template.critDamage)),
    guardHeart: Math.max(0, Math.round(template.guardHeart)),
    spirit: enemySpirit,
    maxSpirit: enemyMaxSpirit,
    coreSkillSpiritCost: enemyCoreSkillCost,
    coreSkillPreferredRoute: enemyDefaultLoadout?.coreSkillCategory ?? null,
    equippedLoadoutId: enemyDefaultLoadout?.id ?? null,
    basicAttackStatusHookIds: enemyChosenLoadout?.basicAttackStatusHookIds ?? [],
    coreSkillStatusHookIds: enemyChosenLoadout?.coreSkillStatusHookIds ?? [],
    escapeAllowed: false,
    weaponAttack: enemyWeaponAtk || undefined,
    spellAttack: enemySpellAtk || undefined,
    weaponLoadoutId: enemyLoadout?.id ?? null,
    spellLoadoutId: enemySpellLoadout?.id ?? null,
    weaponCoreSkillSpiritCost: enemyLoadout?.coreSkillSpiritCost ?? 0,
    spellCoreSkillSpiritCost: enemySpellLoadout?.coreSkillSpiritCost ?? 0,
    weaponCoreSkillPreferredRoute: enemyLoadout?.coreSkillCategory ?? null,
    spellCoreSkillPreferredRoute: enemySpellLoadout?.coreSkillCategory ?? null,
    combatStatuses: [],
  };
  return {
    encounterTemplateId: template.id,
    encounterBuildId,
    maxRounds: template.maxRounds,
    currentRound: 0,
    playerSnapshot,
    enemySnapshot,
    playerStyle: selectCombatRoute(cultivator, `${world.tick}:${cultivator.id}:init-route`),
    enemyStylePreference: [...template.stylePreference],
    rounds: [],
    resolved: false,
    outcome: null,
    playerSpirit,
    playerMaxSpirit,
    enemySpirit,
    enemyMaxSpirit,
    retreated: false,
  };
};
const finalizeCombat = (
  _world: WorldState,
  _cultivator: Cultivator,
  _job: ActionJob,
  state: CombatJobState,
): "victory" | "defeat" => {
  if (state.retreated) {
    state.resolved = true;
    state.outcome = state.retreatingSide === "enemy" ? "victory" : "defeat";
    return state.outcome;
  }
  if (state.playerSnapshot.hp <= 0) {
    state.resolved = true;
    state.outcome = "defeat";
    return "defeat";
  }
  if (state.enemySnapshot.hp <= 0) {
    state.resolved = true;
    state.outcome = "victory";
    return "victory";
  }
  const playerRatio = state.playerSnapshot.maxHp > 0 ? state.playerSnapshot.hp / state.playerSnapshot.maxHp : 0;
  const enemyRatio = state.enemySnapshot.maxHp > 0 ? state.enemySnapshot.hp / state.enemySnapshot.maxHp : 0;
  const outcome: "victory" | "defeat" = playerRatio > enemyRatio ? "victory" : "defeat";
  state.resolved = true;
  state.outcome = outcome;
  return outcome;
};
// Resolve the best attack channel for a given action from a snapshot's per-channel data
function resolveAttackChannel(
  snapshot: CombatSnapshot,
  action: CombatActionType,
  currentSpirit: number,
): { channel: AttackChannel; attack: number; coreSkillSpiritCost: number; coreSkillPreferredRoute: CombatStyle | null } {
  const wAtk = snapshot.weaponAttack ?? snapshot.attack;
  const sAtk = snapshot.spellAttack ?? 0;
  const wCost = snapshot.weaponCoreSkillSpiritCost ?? (snapshot.coreSkillSpiritCost ?? 0);
  const sCost = snapshot.spellCoreSkillSpiritCost ?? 0;
  const wRoute = snapshot.weaponCoreSkillPreferredRoute ?? (snapshot.coreSkillPreferredRoute ?? null);
  const sRoute = snapshot.spellCoreSkillPreferredRoute ?? null;

  if (action === "core_skill") {
    // Only channels where spirit covers the cost are legal
    const wLegal = wAtk > 0 && currentSpirit >= wCost;
    const sLegal = sAtk > 0 && currentSpirit >= sCost;
    if (wLegal && sLegal) {
      // Both legal: pick higher damage; tie-break: weapon
      return sAtk > wAtk
        ? { channel: "spell", attack: sAtk, coreSkillSpiritCost: sCost, coreSkillPreferredRoute: sRoute }
        : { channel: "weapon", attack: wAtk, coreSkillSpiritCost: wCost, coreSkillPreferredRoute: wRoute };
    }
    if (sLegal) return { channel: "spell", attack: sAtk, coreSkillSpiritCost: sCost, coreSkillPreferredRoute: sRoute };
    if (wLegal) return { channel: "weapon", attack: wAtk, coreSkillSpiritCost: wCost, coreSkillPreferredRoute: wRoute };
  }
  // basic_attack or fallback: pick higher damage; tie-break: weapon
  if (sAtk > wAtk && sAtk > 0) {
    return { channel: "spell", attack: sAtk, coreSkillSpiritCost: sCost, coreSkillPreferredRoute: sRoute };
  }
  return { channel: "weapon", attack: wAtk, coreSkillSpiritCost: wCost, coreSkillPreferredRoute: wRoute };
}

const resolveOneRound = (
  state: CombatJobState,
  world: WorldState,
  job: ActionJob,
  cultivator: Cultivator,
): void => {
  if (state.resolved) {
    return;
  }
  state.currentRound += 1;
  const round = state.currentRound;
  const seedBase = `${world.tick}:${job.id}:${state.encounterTemplateId}:round-${round}`;
  const playerAction = selectCombatAction(
    cultivator,
    state.playerSnapshot,
    state.enemySnapshot,
    true,
    state.playerSnapshot.escapeAllowed !== false,
    state.playerSpirit ?? state.playerSnapshot.spirit ?? 0,
    state.playerMaxSpirit ?? state.playerSnapshot.maxSpirit ?? 0,
    state.playerSnapshot.coreSkillSpiritCost ?? 0,
    `${seedBase}:player-action`,
  );
  const enemyCanEscape = state.pvpTargetCultivatorId != null && state.enemySnapshot.escapeAllowed !== false;
  const enemyCurrentSpirit = state.enemySpirit ?? state.enemySnapshot.spirit ?? 0;
  const enemyMaxSpirit = state.enemyMaxSpirit ?? state.enemySnapshot.maxSpirit ?? 0;
  const enemyAction: CombatActionType = selectCombatAction(
    cultivator,
    state.enemySnapshot,
    state.playerSnapshot,
    false,
    enemyCanEscape,
    enemyCurrentSpirit,
    enemyMaxSpirit,
    state.enemySnapshot.coreSkillSpiritCost ?? 0,
    `${seedBase}:enemy-action`,
    enemyCanEscape,
  );

  // Per-round channel selection
  const playerCurrentSpirit = state.playerSpirit ?? state.playerSnapshot.spirit ?? 0;
  const playerChannelResult = resolveAttackChannel(state.playerSnapshot, playerAction, playerCurrentSpirit);
  const enemyChannelResult = resolveAttackChannel(state.enemySnapshot, enemyAction, enemyCurrentSpirit);

  // Apply per-round channel to snapshot attack and core skill params
  state.playerSnapshot.attack = playerChannelResult.attack;
  state.playerSnapshot.coreSkillSpiritCost = playerChannelResult.coreSkillSpiritCost;
  state.playerSnapshot.coreSkillPreferredRoute = playerChannelResult.coreSkillPreferredRoute;
  state.enemySnapshot.attack = enemyChannelResult.attack;
  state.enemySnapshot.coreSkillSpiritCost = enemyChannelResult.coreSkillSpiritCost;
  state.enemySnapshot.coreSkillPreferredRoute = enemyChannelResult.coreSkillPreferredRoute;

  const playerBoundRoute = playerAction === "escape"
    ? null
    : selectCombatRoute(
      cultivator,
      `${seedBase}:player-route`,
      playerAction === "core_skill" ? (playerChannelResult.coreSkillPreferredRoute ?? null) : null,
    );
  const enemyBoundRoute = enemyAction === "core_skill" && enemyChannelResult.coreSkillPreferredRoute
    ? enemyChannelResult.coreSkillPreferredRoute
    : state.enemyStylePreference[hashString(`${seedBase}:enemy-route`) % state.enemyStylePreference.length] ?? "brute";

  // ---- Status passive modifiers ----
  const playerStatuses = state.playerSnapshot.combatStatuses ?? [];
  const enemyStatuses = state.enemySnapshot.combatStatuses ?? [];
  const playerPassiveMods = gatherPassiveModifiers(playerStatuses);
  const enemyPassiveMods = gatherPassiveModifiers(enemyStatuses);

  // Status hook tracking for this round
  const roundAppliedStatuses: NonNullable<CombatRoundLog["appliedStatuses"]> = [];
  const roundConsumedStatuses: NonNullable<CombatRoundLog["consumedStatuses"]> = [];

  const playerInitiative =
    state.playerSnapshot.speed
    + playerPassiveMods.initiativeFlat
    + readinessModifier(computeReadiness(cultivator))
    + (playerBoundRoute ? routeInitiativeBonus(playerBoundRoute) : 0)
    + (hashString(`${seedBase}:initiative`) % 11);
  const enemyInitiative =
    state.enemySnapshot.speed
    + enemyPassiveMods.initiativeFlat
    + (enemyBoundRoute ? routeInitiativeBonus(enemyBoundRoute) : 0)
    + (hashString(`${seedBase}:initiative-enemy`) % 11);
  const playerFirst = playerInitiative === enemyInitiative
    ? (hashString(`${seedBase}:initiative-tiebreak`) % 2) === 0
    : playerInitiative > enemyInitiative;

  const playerMainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const resolveAttack = (
    attacker: CombatSnapshot,
    defender: CombatSnapshot,
    attackerStyle: CombatStyle,
    defenderStyle: CombatStyle,
    attackerIsPlayer: boolean,
    phaseSuffix: "first" | "second",
    actionMultiplier: number,
  ): { result: AttackResult; damage: CombatDamageBreakdown } => {
    const atkMods = attackerIsPlayer ? playerPassiveMods : enemyPassiveMods;
    const defMods = attackerIsPlayer ? enemyPassiveMods : playerPassiveMods;
    const hitChance = computeHitChance(
      attacker.hit + routeHitBonus(attackerStyle) + atkMods.accuracyFlat,
      defender.dodge + routeDodgeBonus(defenderStyle) + defMods.dodgeFlat,
    );
    const hit = (hashString(`${seedBase}:hit-${phaseSuffix}`) % 100) < hitChance;
    if (!hit) {
      return { result: "miss", damage: missDamageBreakdown() };
    }
    const critChance = computeCritChance(
      attacker.crit + routeCritBonus(attackerStyle) + atkMods.critPercent,
      defender.guardHeart + defMods.guardHeartFlat,
    );
    const isCrit = (hashString(`${seedBase}:crit-${phaseSuffix}`) % 100) < critChance;
    const modifiedDefense = Math.max(0, Math.round(defender.defense * (1 + defMods.defensePercent / 100)));
    const damage = computeDamage(
      attacker.attack,
      modifiedDefense,
      attackerStyle,
      attackerIsPlayer ? playerMainAttrs : null,
      triangleMultiplier(attackerStyle, defenderStyle),
      routeDamageMultiplier(attackerStyle),
      isCrit,
      attacker.critDamage,
      actionMultiplier,
    );
    // Apply damage dealt/taken modifiers from statuses
    const dealtMult = Math.max(0, 1 + atkMods.damageDealtPercent / 100);
    const takenMult = Math.max(0, 1 + defMods.damageTakenPercent / 100);
    const adjustedFinal = Math.max(1, Math.round(damage.finalDamage * dealtMult * takenMult));
    defender.hp = Math.max(0, defender.hp - adjustedFinal);
    return {
      result: isCrit ? "crit" : "hit",
      damage: { ...damage, finalDamage: adjustedFinal },
    };
  };

  let playerAttack: CombatRoundLog["playerAttack"] = null;
  let enemyAttack: CombatRoundLog["enemyAttack"] = null;
  let playerSpiritSpent = 0;
  let enemySpiritSpent = 0;
  let playerEscape: EscapeResolution | null | undefined;
  let enemyEscape: EscapeResolution | null | undefined;
  let playerActionSkipped = false;
  let enemyActionSkipped = false;
  let battleEndedByRetreat = false;
  let playerDidHit = false;
  let enemyDidHit = false;
  let playerDamageDealt = 0;
  let enemyDamageDealt = 0;

  // ---- Status hook resolver ----
  const getChannelLoadout = (side: "player" | "enemy", channel: AttackChannel): WeaponLoadoutDefinition | SpellLoadoutDefinition | null => {
    const snapshot = side === "player" ? state.playerSnapshot : state.enemySnapshot;
    if (channel === "weapon") {
      const id = snapshot.weaponLoadoutId;
      return id ? getWeaponLoadoutDefinition(id) : null;
    }
    const id = snapshot.spellLoadoutId;
    return id ? getSpellLoadoutDefinition(id) : null;
  };
  const getChannelTier = (side: "player" | "enemy", channel: AttackChannel): SpellTier => {
    const snapshot = side === "player" ? state.playerSnapshot : state.enemySnapshot;
    if (channel === "spell") {
      const id = snapshot.spellLoadoutId;
      const def = id ? getSpellLoadoutDefinition(id) : null;
      return (def?.spellTier ?? 1) as SpellTier;
    }
    const id = snapshot.weaponLoadoutId;
    const def = id ? getWeaponLoadoutDefinition(id) : null;
    return ((def as WeaponLoadoutDefinition | null)?.weaponTier ?? 1) as SpellTier;
  };
  const resolveStatusHooks = (sourceSide: "player" | "enemy", action: CombatActionType, channel: AttackChannel): void => {
    const loadout = getChannelLoadout(sourceSide, channel);
    if (!loadout) return;
    const hookIds = action === "core_skill" ? loadout.coreSkillStatusHookIds : loadout.basicAttackStatusHookIds;
    if (!hookIds || hookIds.length === 0) return;
    const tier = getChannelTier(sourceSide, channel);
    const sourceLoadoutId = loadout.id;
    for (const hookId of hookIds) {
      const hookDef = getStatusHookDefinition(hookId);
      if (!hookDef) continue;
      for (const app of hookDef.applications) {
        const statusDef = getCombatStatusDefinition(app.statusId);
        if (!statusDef) continue;
        // Determine target: "self" means the caster, "enemy" means the opponent
        const targetIsPlayer = app.targetSide === "self" ? sourceSide === "player" : sourceSide !== "player";
        const targetSnapshot = targetIsPlayer ? state.playerSnapshot : state.enemySnapshot;
        const currentStatuses = targetSnapshot.combatStatuses ?? [];
        const result = applyOrRefreshStatus(currentStatuses, statusDef, tier, sourceLoadoutId, action);
        targetSnapshot.combatStatuses = result.statuses;
        roundAppliedStatuses.push({
          statusId: statusDef.id,
          statusName: statusDef.name,
          targetSide: targetIsPlayer ? "player" : "enemy",
          sourceSide,
          magnitude: result.statuses.find(s => s.id === statusDef.id)?.magnitude ?? 0,
          isRefresh: result.isRefresh,
        });
      }
    }
  };

  const firstActor: CombatRoundLog["firstActor"] = playerFirst ? "player" : "enemy";
  const resolvePlayerAction = (phaseSuffix: "first" | "second") => {
    if (state.playerSnapshot.hp <= 0) {
      playerActionSkipped = true;
      if (playerAction === "escape") {
        playerEscape = { attempted: false, success: false, chance: 0 };
      }
      return;
    }
    if (playerAction === "escape") {
      const selfHpRatio = state.playerSnapshot.maxHp > 0 ? state.playerSnapshot.hp / state.playerSnapshot.maxHp : 0;
      const chance = computeEscapeChance(
        state.playerSnapshot.speed,
        state.enemySnapshot.speed,
        selfHpRatio,
        computeReadiness(cultivator),
      );
      const success = (hashString(`${seedBase}:escape-roll`) % 100) < chance;
      playerEscape = { attempted: true, success, chance };
      if (success) {
        state.retreated = true;
        state.retreatingSide = "player";
        state.resolved = true;
        state.outcome = "defeat";
        battleEndedByRetreat = true;
      }
      return;
    }
    playerAttack = resolveAttack(
      state.playerSnapshot,
      state.enemySnapshot,
      playerBoundRoute ?? "brute",
      enemyBoundRoute ?? "brute",
      true,
      phaseSuffix,
      playerAction === "core_skill" ? 1.6 : 1,
    );
    playerDidHit = playerAttack.result !== "miss";
    playerDamageDealt = playerAttack.damage.finalDamage;
    if (playerAction === "core_skill") {
      const spiritCost = state.playerSnapshot.coreSkillSpiritCost ?? 0;
      const nextSpirit = Math.max(0, (state.playerSpirit ?? state.playerSnapshot.spirit ?? 0) - spiritCost);
      state.playerSpirit = nextSpirit;
      state.playerSnapshot.spirit = nextSpirit;
      playerSpiritSpent = spiritCost;
    }
    // Resolve player status hooks on hit
    if (playerDidHit) {
      resolveStatusHooks("player", playerAction, playerChannelResult.channel);
    }
  };
  const resolveEnemyAction = (phaseSuffix: "first" | "second") => {
    if (state.enemySnapshot.hp <= 0) {
      enemyActionSkipped = true;
      if (enemyAction === "escape") {
        enemyEscape = { attempted: false, success: false, chance: 0 };
      }
      return;
    }
    if (enemyAction === "escape") {
      const selfHpRatio = state.enemySnapshot.maxHp > 0 ? state.enemySnapshot.hp / state.enemySnapshot.maxHp : 0;
      const chance = computeEscapeChance(
        state.enemySnapshot.speed,
        state.playerSnapshot.speed,
        selfHpRatio,
        "stable",
      );
      const success = (hashString(`${seedBase}:enemy-escape-roll`) % 100) < chance;
      enemyEscape = { attempted: true, success, chance };
      if (success) {
        state.retreated = true;
        state.retreatingSide = "enemy";
        state.resolved = true;
        state.outcome = "victory";
        battleEndedByRetreat = true;
      }
      return;
    }
    enemyAttack = resolveAttack(
      state.enemySnapshot,
      state.playerSnapshot,
      enemyBoundRoute ?? "brute",
      playerBoundRoute ?? "brute",
      false,
      phaseSuffix,
      enemyAction === "core_skill" ? 1.6 : 1,
    );
    enemyDidHit = enemyAttack.result !== "miss";
    enemyDamageDealt = enemyAttack.damage.finalDamage;
    if (enemyAction === "core_skill") {
      const spiritCost = state.enemySnapshot.coreSkillSpiritCost ?? 0;
      const nextSpirit = Math.max(0, (state.enemySpirit ?? state.enemySnapshot.spirit ?? 0) - spiritCost);
      state.enemySpirit = nextSpirit;
      state.enemySnapshot.spirit = nextSpirit;
      enemySpiritSpent = spiritCost;
    } else {
      enemySpiritSpent = 0;
    }
    // Resolve enemy status hooks on hit
    if (enemyDidHit) {
      resolveStatusHooks("enemy", enemyAction, enemyChannelResult.channel);
    }
  };

  if (playerFirst) {
    resolvePlayerAction("first");
    if (!battleEndedByRetreat) {
      resolveEnemyAction("second");
    }
  } else {
    resolveEnemyAction("first");
    if (!battleEndedByRetreat) {
      resolvePlayerAction("second");
    }
  }

  if (playerAction === "escape" && !playerEscape) {
    playerEscape = { attempted: false, success: false, chance: 0 };
  }
  if (enemyAction === "escape" && !enemyEscape) {
    enemyEscape = { attempted: false, success: false, chance: 0 };
  }

  // ---- Consumable status triggers ----
  // If player took damage this round, check defender (player) consumable statuses
  if (enemyDidHit && !battleEndedByRetreat) {
    const pStatuses = state.playerSnapshot.combatStatuses ?? [];
    const triggerEvent = (enemyAction === "core_skill") ? "on_core_skill_damage_taken" as const : "on_damage_taken" as const;
    const { modifiers: consumeMods, consumed } = gatherConsumableModifiers(pStatuses, triggerEvent);
    if (consumed.length > 0) {
      state.playerSnapshot.combatStatuses = markConsumed(pStatuses, consumed);
      for (const cid of consumed) {
        const s = pStatuses.find(st => st.id === cid);
        roundConsumedStatuses.push({ statusId: cid, statusName: s?.name ?? String(cid), targetSide: "player" });
      }
      // Apply consumable damage reduction retroactively to player hp
      if (consumeMods.damageTakenPercent !== 0) {
        const reduction = Math.round(enemyDamageDealt * Math.abs(consumeMods.damageTakenPercent) / 100);
        state.playerSnapshot.hp = Math.min(state.playerSnapshot.maxHp, state.playerSnapshot.hp + reduction);
      }
    }
  }
  // If enemy took damage this round, check defender (enemy) consumable statuses
  if (playerDidHit && !battleEndedByRetreat) {
    const eStatuses = state.enemySnapshot.combatStatuses ?? [];
    const triggerEvent = (playerAction === "core_skill") ? "on_core_skill_damage_taken" as const : "on_damage_taken" as const;
    const { modifiers: consumeMods, consumed } = gatherConsumableModifiers(eStatuses, triggerEvent);
    if (consumed.length > 0) {
      state.enemySnapshot.combatStatuses = markConsumed(eStatuses, consumed);
      for (const cid of consumed) {
        const s = eStatuses.find(st => st.id === cid);
        roundConsumedStatuses.push({ statusId: cid, statusName: s?.name ?? String(cid), targetSide: "enemy" });
      }
      if (consumeMods.damageTakenPercent !== 0) {
        const reduction = Math.round(playerDamageDealt * Math.abs(consumeMods.damageTakenPercent) / 100);
        state.enemySnapshot.hp = Math.min(state.enemySnapshot.maxHp, state.enemySnapshot.hp + reduction);
      }
    }
  }

  // ---- Round-end ticks (HOT/DOT/spirit regen) ----
  const roundTickEvents: NonNullable<CombatRoundLog["tickEvents"]> = [];
  if (!battleEndedByRetreat) {
    // Player round-end ticks
    const pTicks = processRoundEndTicks(
      state.playerSnapshot.combatStatuses ?? [],
      state.playerSnapshot.hp,
      state.playerSnapshot.maxHp,
      state.playerSpirit ?? state.playerSnapshot.spirit ?? 0,
      state.playerMaxSpirit ?? state.playerSnapshot.maxSpirit ?? 0,
      spellAttack(deriveMainAttributes(cultivator.registrationRecord)),
    );
    state.playerSnapshot.hp = pTicks.hp;
    state.playerSpirit = pTicks.spirit;
    state.playerSnapshot.spirit = pTicks.spirit;
    for (const t of pTicks.ticks) {
      roundTickEvents.push({ ...t, targetSide: "player" });
    }
    // Enemy round-end ticks (use enemy's attack as proxy for spellAttack)
    const eTicks = processRoundEndTicks(
      state.enemySnapshot.combatStatuses ?? [],
      state.enemySnapshot.hp,
      state.enemySnapshot.maxHp,
      state.enemySpirit ?? state.enemySnapshot.spirit ?? 0,
      state.enemyMaxSpirit ?? state.enemySnapshot.maxSpirit ?? 0,
      state.enemySnapshot.attack,
    );
    state.enemySnapshot.hp = eTicks.hp;
    state.enemySpirit = eTicks.spirit;
    state.enemySnapshot.spirit = eTicks.spirit;
    for (const t of eTicks.ticks) {
      roundTickEvents.push({ ...t, targetSide: "enemy" });
    }
  }

  // ---- Decay and clean statuses ----
  const roundExpiredStatuses: NonNullable<CombatRoundLog["expiredStatuses"]> = [];
  if (!battleEndedByRetreat) {
    const pDecay = decayAndCleanStatuses(state.playerSnapshot.combatStatuses ?? []);
    state.playerSnapshot.combatStatuses = pDecay.remaining;
    for (const e of pDecay.expired) {
      roundExpiredStatuses.push({ ...e, targetSide: "player" });
    }
    const eDecay = decayAndCleanStatuses(state.enemySnapshot.combatStatuses ?? []);
    state.enemySnapshot.combatStatuses = eDecay.remaining;
    for (const e of eDecay.expired) {
      roundExpiredStatuses.push({ ...e, targetSide: "enemy" });
    }
  }

  const roundLog: CombatRoundLog = {
    round,
    playerInitiative,
    enemyInitiative,
    playerRoute: playerBoundRoute ?? enemyBoundRoute ?? undefined,
    enemyRoute: enemyBoundRoute ?? playerBoundRoute ?? undefined,
    firstActor,
    playerAttack,
    enemyAttack,
    playerHpAfter: state.playerSnapshot.hp,
    enemyHpAfter: state.enemySnapshot.hp,
    playerDied: state.playerSnapshot.hp <= 0,
    enemyDied: state.enemySnapshot.hp <= 0,
    playerAction,
    enemyAction,
    playerBoundRoute: playerBoundRoute ?? undefined,
    enemyBoundRoute: enemyBoundRoute ?? undefined,
    playerSpiritSpent,
    enemySpiritSpent,
    playerEscape: playerEscape ?? undefined,
    enemyEscape: enemyEscape ?? undefined,
    playerActionSkipped,
    enemyActionSkipped,
    playerChannel: playerAction !== "escape" ? playerChannelResult.channel : undefined,
    enemyChannel: enemyAction !== "escape" ? enemyChannelResult.channel : undefined,
    appliedStatuses: roundAppliedStatuses.length > 0 ? roundAppliedStatuses : undefined,
    tickEvents: roundTickEvents.length > 0 ? roundTickEvents : undefined,
    consumedStatuses: roundConsumedStatuses.length > 0 ? roundConsumedStatuses : undefined,
    expiredStatuses: roundExpiredStatuses.length > 0 ? roundExpiredStatuses : undefined,
  };
  state.rounds.push(roundLog);

  if (state.resolved || state.playerSnapshot.hp <= 0 || state.enemySnapshot.hp <= 0 || state.currentRound >= state.maxRounds) {
    finalizeCombat(world, cultivator, job, state);
  }
};
const realmPhaseOfLevel = (realmLevel: number): RealmPhase => {
  const normalizedLevel = Math.max(1, Math.floor(realmLevel));
  return REALM_PHASES[(normalizedLevel - 1) % REALM_PHASES.length]!;
};
const travelActionIdOf = (locationId: string) => `travel-to:${locationId}` as const;
const parseTravelDestination = (actionId: ActionId) => actionId.startsWith("travel-to:") ? actionId.slice("travel-to:".length) : null;
const parseEnterWildernessLayer = (actionId: ActionId) => actionId.startsWith("enter-wilderness:") ? actionId.slice("enter-wilderness:".length) : null;
const parseEnterBahuangStrategy = (
  actionId: ActionId,
): "conservative" | "balanced" | "aggressive" | null => {
  if (!actionId.startsWith("enter-bahuang:")) {
    return null;
  }
  const posture = actionId.slice("enter-bahuang:".length);
  return posture === "conservative" || posture === "balanced" || posture === "aggressive"
    ? posture
    : null;
};
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
const isDungeonExpeditionActionId = (actionId: ActionId) =>
  parseStartDungeonExpeditionActionId(actionId) !== null || parseEnterDungeonActionId(actionId) !== null;
const parseJoinNeutralSectId = (actionId: ActionId) =>
  actionId.startsWith("join-neutral-sect:") ? actionId.slice("join-neutral-sect:".length) : null;
const parseSectTaskId = (actionId: ActionId | string): string | null =>
  actionId.startsWith("sect-task:") ? actionId.slice("sect-task:".length) : null;
const parseChatUpTarget = (actionId: ActionId | string): string | null =>
  actionId.startsWith("chat-up:") ? actionId.slice("chat-up:".length) : null;
const parseVoiceTransmitTarget = (actionId: ActionId | string): string | null =>
  actionId.startsWith("voice-transmit:") ? actionId.slice("voice-transmit:".length) : null;
const parseProposeDaoCompanion = (actionId: ActionId | string): string | null =>
  actionId.startsWith("propose-dao-companion:") ? actionId.slice("propose-dao-companion:".length) : null;
const parseAcceptDaoCompanion = (actionId: ActionId | string): string | null =>
  actionId.startsWith("accept-dao-companion:") ? actionId.slice("accept-dao-companion:".length) : null;
const parseRejectDaoCompanion = (actionId: ActionId | string): string | null =>
  actionId.startsWith("reject-dao-companion:") ? actionId.slice("reject-dao-companion:".length) : null;
const parsePartyInviteTarget = (actionId: ActionId | string): string | null =>
  actionId.startsWith("party-invite:") ? actionId.slice("party-invite:".length) : null;
const parseAcceptParty = (actionId: ActionId | string): string | null =>
  actionId.startsWith("accept-party:") ? actionId.slice("accept-party:".length) : null;
const parseRejectParty = (actionId: ActionId | string): string | null =>
  actionId.startsWith("reject-party:") ? actionId.slice("reject-party:".length) : null;
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
  || actionId === "retreat-from-bahuang"
  || actionId === "take-neutral-duty"
  || actionId === "take-mortal-task"
  || actionId.startsWith("travel-to:")
  || actionId.startsWith("equip-weapon:")
  || actionId.startsWith("equip-spell:");
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
        : parseStartDungeonExpeditionActionId(actionId) !== null || parseEnterDungeonActionId(actionId) !== null
          ? "start-dungeon-expedition"
        : parseSectTaskId(actionId) !== null
          ? "sect-task"
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
  const name = input.name.trim();
  if (!name || name.length > 24) throw new Error("Character name must be 1-24 chars.");
  const agentId = normalizeAgentId(input.agentId);
  const starter = starterProfile();
  const cultivatorId = `cultivator-${world.nextCultivatorSequence++}`;
  const starterLocationId = starterLocationIdFromRoll(Math.random());

  // Derive initial loadouts (will be updated after registration)
  const weaponLoadouts = deriveInitialWeaponLoadouts(null);
  const spellLoadouts = deriveInitialSpellLoadouts(null);

  const cultivator: Cultivator = {
    id: cultivatorId,
    name,
    genderPresentation: input.genderPresentation ?? "unspecified",
    pronouns: input.pronouns?.trim() || "TA/TA",
    origin: input.origin?.trim() || "Yun Province",
    temperament: input.temperament?.trim() || "Cautious",
    createdByAgentId: agentId,
    realm: REALM_QI,
    realmLevel: 1,
    realmProgress: 0,
    locationId: starterLocationId,
    residence: defaultResidenceAt(starterLocationId, cultivatorId),
    spiritStones: starter.spiritStones,
    qi: 100,
    maxQi: 100,
    spiritualPower: 100,
    maxSpiritualPower: 100,
    stateReputation: createStateReputation({ [stateIdFromLocationId(starterLocationId)]: 12 }),
    factionReputation: starter.factionReputation,
    lifespan: 160,
    age: clamp(input.age ?? 18, 16, 80),
    sectId: null,
    neutralSectId: null,
    sectTitle: null,
    moralityScore: 0,
    pendingSectApplicationId: null,
    pendingMoralityChoiceId: null,
    pendingPvpChallengeId: null,
    totalContribution: 0,
    neutralContribution: 0,
    contributionReachedAt: 0,
    activeQuests: [],
    completedBaseQuests: 0,
    techniques: starter.techniques,
    inventory: starter.inventory,
    statusEffects: [],
    breakthroughRecords: [],
    dungeonProgress: createDungeonProgress(),
    activeJobId: null,
    injuryTicksRemaining: 0,
    registrationRecord: null,
    // Combat Loadout System
    equippedWeaponLoadoutId: weaponLoadouts.equippedLoadoutId,
    equippedSpellLoadoutId: spellLoadouts.equippedLoadoutId,
    unlockedWeaponLoadoutIds: [...weaponLoadouts.unlockedLoadoutIds],
    unlockedSpellLoadoutIds: [...spellLoadouts.unlockedLoadoutIds],
  };

  world.cultivators[cultivator.id] = cultivator;
  let selectedCultivatorId: string | null = null;
  if (agentId) {
    const binding = ensureAgentBinding(world, agentId);
    binding.cultivatorIds.push(cultivator.id);
    binding.selectedCultivatorId = cultivator.id;
    selectedCultivatorId = cultivator.id;
  }
  addDaoLog(world, cultivator.id, "Character Created", `${cultivator.name} enters the realm.`, ["character"]);
  addMessage(world, cultivator.id, "Registry", "Created", `${cultivator.name} is now active.`);
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

  // Update initial loadouts based on registration data
  const weaponLoadouts = deriveInitialWeaponLoadouts(stored);
  const spellLoadouts = deriveInitialSpellLoadouts(stored);
  cultivator.equippedWeaponLoadoutId = weaponLoadouts.equippedLoadoutId;
  cultivator.equippedSpellLoadoutId = spellLoadouts.equippedLoadoutId;
  cultivator.unlockedWeaponLoadoutIds = [...weaponLoadouts.unlockedLoadoutIds];
  cultivator.unlockedSpellLoadoutIds = [...spellLoadouts.unlockedLoadoutIds];

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
function breakthroughMaterialBasePrice(itemId: ItemId, realmLevel: number): number {
  const PRICES: Record<number, Record<string, number>> = {
    1: { "cloud-heart-grass": 60, "moon-dew-flower": 60, "clear-zhi-leaf": 60, "condensed-qi-dew": 100 },
    2: { "spirit-brook-bamboo": 70, "pure-heart-orchid": 70, "mist-vine": 70, "azure-stone-marrow": 120 },
    3: { "cloud-heart-grass": 90, "spirit-brook-bamboo": 90, "pure-heart-orchid": 90, "meridian-lotus-essence": 250 },
    4: { "mystic-jade-stone": 120, "jade-marrow-sand": 120, "purple-palace-earth": 120, "foundation-spirit-amber": 200 },
    5: { "cold-moon-crystal": 150, "still-cloud-wood": 150, "tranquil-bamboo": 150, "wind-control-crystal": 260 },
    6: { "jade-marrow-sand": 200, "cold-moon-crystal": 200, "tranquil-bamboo": 200, "nine-turn-core-sand": 400 },
  };
  const stageMap = PRICES[realmLevel];
  if (!stageMap || !(itemId in stageMap)) {
    throw new Error(`Item ${itemId} not buyable at realmLevel ${realmLevel}`);
  }
  return stageMap[itemId]!;
}

function breakthroughMaterialsMissing(cultivator: Cultivator, definition: BreakthroughDefinition): Array<{ itemId: ItemId; count: number }> {
  const all = [...definition.genericMaterials, definition.specialMaterial];
  return all
    .map((req) => ({ itemId: req.itemId, count: Math.max(0, req.count - cultivator.inventory[req.itemId]) }))
    .filter((m) => m.count > 0);
}
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
        category: "minor", targetRealm: REALM_QI, targetLevel: 2, marketBuyable: true, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "cloud-heart-grass", count: 1 }, { itemId: "moon-dew-flower", count: 1 }, { itemId: "clear-zhi-leaf", count: 1 }],
        specialMaterial: { itemId: "condensed-qi-dew", count: 1 },
      };
    case 2:
      return {
        category: "minor", targetRealm: REALM_QI, targetLevel: 3, marketBuyable: true, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "spirit-brook-bamboo", count: 1 }, { itemId: "pure-heart-orchid", count: 1 }, { itemId: "mist-vine", count: 1 }],
        specialMaterial: { itemId: "azure-stone-marrow", count: 1 },
      };
    case 3:
      return {
        category: "major", targetRealm: REALM_FOUNDATION, targetLevel: 4, marketBuyable: true, durationTicks: 6, baseSuccessRate: 70,
        genericMaterials: [{ itemId: "cloud-heart-grass", count: 1 }, { itemId: "spirit-brook-bamboo", count: 1 }, { itemId: "pure-heart-orchid", count: 1 }],
        specialMaterial: { itemId: "meridian-lotus-essence", count: 1 },
      };
    case 4:
      return {
        category: "minor", targetRealm: REALM_FOUNDATION, targetLevel: 5, marketBuyable: true, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "mystic-jade-stone", count: 1 }, { itemId: "jade-marrow-sand", count: 1 }, { itemId: "purple-palace-earth", count: 1 }],
        specialMaterial: { itemId: "foundation-spirit-amber", count: 1 },
      };
    case 5:
      return {
        category: "minor", targetRealm: REALM_FOUNDATION, targetLevel: 6, marketBuyable: true, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "cold-moon-crystal", count: 1 }, { itemId: "still-cloud-wood", count: 1 }, { itemId: "tranquil-bamboo", count: 1 }],
        specialMaterial: { itemId: "wind-control-crystal", count: 1 },
      };
    case 6:
      return {
        category: "major", targetRealm: REALM_CORE, targetLevel: 7, marketBuyable: true, durationTicks: 6, baseSuccessRate: 55,
        genericMaterials: [{ itemId: "jade-marrow-sand", count: 1 }, { itemId: "cold-moon-crystal", count: 1 }, { itemId: "tranquil-bamboo", count: 1 }],
        specialMaterial: { itemId: "nine-turn-core-sand", count: 1 },
      };
    case 7:
      return {
        category: "minor", targetRealm: REALM_CORE, targetLevel: 8, marketBuyable: false, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "golden-spirit-flower", count: 1 }, { itemId: "purple-celestial-leaf", count: 1 }, { itemId: "star-fall-sand", count: 1 }],
        specialMaterial: { itemId: "flowing-aurora-core", count: 1 },
      };
    case 8:
      return {
        category: "minor", targetRealm: REALM_CORE, targetLevel: 9, marketBuyable: false, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "moon-glory-jade", count: 1 }, { itemId: "clear-mystic-wood", count: 1 }, { itemId: "chaos-moss", count: 1 }],
        specialMaterial: { itemId: "dragon-radiance-crystal", count: 1 },
      };
    default:
      return null;
  }
}

function breakthroughConsumedItemsOf(
  definition: BreakthroughDefinition,
): Array<{ itemId: ItemId; count: number }> {
  return [...definition.genericMaterials, definition.specialMaterial];
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

  // ---- Loadout source drop (dungeon expedition) ----
  const expSourceTier = metadata.grade === "丙" ? 1 : metadata.grade === "乙" ? 2 : 3;
  if (
    (outcome === "completed" || (outcome === "withdrew" && progress.stepIndex > 0))
    && expSourceTier >= 1 && expSourceTier <= 3
  ) {
    const expSourceDrop = pickLoadoutSourceDrop(expSourceTier as 1 | 2 | 3, `${world.tick}:${cultivator.id}:expedition-loadout-source`);
    cultivator.inventory[expSourceDrop] = (cultivator.inventory[expSourceDrop] ?? 0) + 1;
    addDaoLog(world, cultivator.id, "来源物掉落", `${cultivator.name} 完成地宫远征后获得了${ITEM_CATALOG[expSourceDrop]?.name ?? expSourceDrop}。`, [expSourceDrop.startsWith("weapon-") ? "weapon-source" : "spell-source"]);
  }

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
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  let effectiveProgress = progress;

  if (effectiveProgress.pendingWakeNode) {
    if (
      effectiveProgress.pendingWakeNodeDeadlineTick !== null
      && world.tick >= effectiveProgress.pendingWakeNodeDeadlineTick
    ) {
      effectiveProgress = resolveDungeonWakeNodeByDefault(effectiveProgress);
      world.dungeonExpeditions[cultivator.id] = effectiveProgress;
    } else {
      job.remainingTicks += 1;
      return;
    }
  }

  if (world.tick < effectiveProgress.nextResolutionTick) {
    return;
  }

  const location = world.locations[cultivator.locationId];
  const metadata = dungeonMetadataOf(location);
  if (!metadata) {
    throw new Error("Dungeon expedition requires the cultivator to remain in a dungeon.");
  }

  const beforeInventory = structuredClone(cultivator.inventory);
  const beforeSpiritStones = cultivator.spiritStones;
  const beforeRealmProgress = cultivator.realmProgress;
  const beforeHighestClearedRank = highestClearedRankOf(cultivator, effectiveProgress.grade);
  const beforeEventCount = world.worldEvents.length;
  const beforeCombatCount = world.combatLogs.length;
  const beforePendingMoralityChoiceId = cultivator.pendingMoralityChoiceId;
  const beforePendingChoiceIds = new Set(Object.keys(world.pendingMoralityChoices));

  const actionKind = chooseDungeonExpeditionStepKind({
    targetRank: effectiveProgress.targetRank,
    frontierRank: highestUnlockedRankOf(cultivator, effectiveProgress.grade),
    highestClearedRank: beforeHighestClearedRank,
    policy: effectiveProgress.policy,
    jobId: job.id,
    stepIndex: effectiveProgress.stepIndex,
    worldTick: world.tick,
    cultivatorId: cultivator.id,
  });
  const actionId = actionKind === "guardian"
    ? challengeGuardianActionIdOf(effectiveProgress.targetRank)
    : searchFortuneActionIdOf(effectiveProgress.targetRank);

  const outerJobId = cultivator.activeJobId;
  const syntheticJob: ActionJob = {
    id: `job-${world.nextJobSequence++}`,
    cultivatorId: cultivator.id,
    actionId,
    label: `Dungeon expedition ${actionKind}`,
    remainingTicks: DUNGEON_EXPEDITION_STEP_TICKS,
    totalTicks: DUNGEON_EXPEDITION_STEP_TICKS,
    meta: {
      dungeonGrade: effectiveProgress.grade,
      dungeonRank: effectiveProgress.targetRank,
    },
  };
  if (actionKind === "guardian") {
    const expedGuardianSeed = hashString(`${world.tick}:${cultivator.id}:expedition-guardian:${effectiveProgress.grade}:${effectiveProgress.targetRank}`);
    const expedGuardianEncounter = resolveGuardianEncounterTemplate(expedGuardianSeed);
    const combatState = initializeCombatJobState(
      world,
      cultivator,
      expedGuardianEncounter.template,
      guardianCombatScale(effectiveProgress.grade, effectiveProgress.targetRank),
      expedGuardianEncounter.buildId ?? undefined,
    );
    setCombatJobState(syntheticJob, combatState);
    while (!combatState.resolved && combatState.currentRound < combatState.maxRounds) {
      resolveOneRound(combatState, world, syntheticJob, cultivator);
    }
    setCombatJobState(syntheticJob, combatState);
  }

  resolveEnhancedJob(world, syntheticJob);
  cultivator.activeJobId = outerJobId;

  const flavorEventTitles = actionKind === "search"
    ? extractDungeonFlavorEventTitles(world.worldEvents, beforeEventCount, actionId)
    : (() => {
        // For guardian steps, extract the encounter identity as a flavor title
        const guardianCombat = getCombatJobState(syntheticJob);
        if (!guardianCombat) return [];
        const cfg = getEnemyConfig(guardianCombat.encounterTemplateId as unknown as EnemyConfigId);
        const guardianName = cfg?.nameCn ?? cfg?.name ?? "Guardian";
        return [`${guardianName} encounter`];
      })();

  trimPrependedEntries(world.worldEvents, beforeEventCount);
  trimPrependedEntries(world.combatLogs, beforeCombatCount);

  for (const choiceId of Object.keys(world.pendingMoralityChoices)) {
    if (!beforePendingChoiceIds.has(choiceId)) {
      delete world.pendingMoralityChoices[choiceId];
    }
  }
  cultivator.pendingMoralityChoiceId = beforePendingMoralityChoiceId;

  const inventoryDelta = positiveInventoryDelta(beforeInventory, cultivator.inventory);
  const tierPool = BREAKTHROUGH_TIER_POOL[metadata.materialBand] ?? [metadata.materialBand];
  let primaryMaterialCount = 0;
  for (const matId of tierPool) {
    primaryMaterialCount += inventoryDelta[matId] ?? 0;
    delete inventoryDelta[matId];
  }

  const updatedProgress = recordDungeonExpeditionStep({
    progress: effectiveProgress,
    action: actionKind,
    primaryMaterialCount,
    secondaryDrops: inventoryDelta,
    spiritStoneGain: cultivator.spiritStones - beforeSpiritStones,
    realmProgressGain: cultivator.realmProgress - beforeRealmProgress,
    unlockedNextRank: highestClearedRankOf(cultivator, effectiveProgress.grade) > beforeHighestClearedRank,
    resolvedAtTick: world.tick,
    flavorEventTitles,
  });

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
    return;
  }

  const wakeNode = maybeCreateDungeonWakeNode({
    progress: updatedProgress,
    cultivator,
    actionKind,
    worldTick: world.tick,
  });
  const progressedWithWake = wakeNode
    ? {
        ...updatedProgress,
        wakeNodesEncountered: updatedProgress.wakeNodesEncountered + 1,
        pendingWakeNode: wakeNode,
        pendingWakeNodeDeadlineTick: world.tick + wakeNode.timeoutTicks,
      }
    : updatedProgress;

  world.dungeonExpeditions[cultivator.id] = progressedWithWake;
  job.meta = {
    ...job.meta,
    dungeonExpeditionPolicy: progressedWithWake.policy,
    dungeonExpeditionTargetRank: progressedWithWake.targetRank,
    dungeonExpeditionStepIndex: progressedWithWake.stepIndex,
    dungeonExpeditionNextResolutionTick: progressedWithWake.nextResolutionTick,
  };
}

function preferredMaterialAction(
  world: WorldState,
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
): ActionId | null {
  const missing = breakthroughMaterialsMissing(cultivator, definition);
  if (missing.length === 0) return null;

  if (definition.marketBuyable && world.locations[cultivator.locationId]?.kind === "safe") {
    const firstMissing = missing[0]!;
    const price = buyPrice(cultivator, breakthroughMaterialBasePrice(firstMissing.itemId, cultivator.realmLevel));
    if (cultivator.spiritStones >= price) return "buy-current-breakthrough-material";
    return "take-mortal-task";
  }

  if (definition.marketBuyable) {
    const nearestSafe = findNearestLocationId(world, cultivator.locationId, (c) => c.kind === "safe");
    if (nearestSafe) return travelActionIdOf(nearestSafe);
  }

  if (cultivator.realmLevel <= 3) {
    return preferredDungeonGuardianAction(world, cultivator, "dungeon-c");
  }
  if (cultivator.realmLevel <= 6) {
    if (world.locations[cultivator.locationId]?.nodeType === "wilderness") return "mine-spirit-stones";
    const nearestWild = findNearestLocationId(world, cultivator.locationId, (c) => c.nodeType === "wilderness");
    if (nearestWild) return travelActionIdOf(nearestWild);
    return preferredDungeonGuardianAction(world, cultivator, "dungeon-b");
  }
  return preferredDungeonGuardianAction(world, cultivator, "dungeon-a");
}

function materialSourcesOf(
  definition: BreakthroughDefinition,
): BreakthroughMaterialSourceView[] {
  const sources: BreakthroughMaterialSourceView[] = [];
  const allItems = [...definition.genericMaterials, definition.specialMaterial];

  if (definition.marketBuyable) {
    for (const mat of allItems) {
      sources.push({
        itemId: mat.itemId,
        channel: "market",
        locationHint: "safe",
        actionId: "buy-current-breakthrough-material",
        note: "可在安全城镇坊市购买，价格随境界提升而递增。",
      });
    }
  }

  const realmLevel = definition.targetLevel - 1;
  if (realmLevel <= 3) {
    sources.push({
      itemId: allItems[0]!.itemId,
      channel: "task",
      locationHint: "safe",
      actionId: "take-mortal-task",
      note: "城镇任务可稳定补给炼气期突破灵材。",
    });
    sources.push({
      itemId: allItems[0]!.itemId,
      channel: "dungeon",
      locationHint: "dungeon-c",
      actionId: null,
      note: "丙级地宫与低风险探索事件会掉落炼气期突破灵材。",
    });
  } else if (realmLevel <= 6) {
    sources.push({
      itemId: allItems[0]!.itemId,
      channel: "wilderness",
      locationHint: "wilderness",
      actionId: "mine-spirit-stones",
      note: "荒野矿脉与相关事件会掉落筑基期突破灵材。",
    });
    sources.push({
      itemId: allItems[0]!.itemId,
      channel: "dungeon",
      locationHint: "dungeon-b",
      actionId: null,
      note: "乙级地宫探索与守关链路会掉落筑基期突破灵材。",
    });
  } else {
    sources.push({
      itemId: allItems[0]!.itemId,
      channel: "dungeon",
      locationHint: "dungeon-a",
      actionId: null,
      note: "金丹期突破灵材主要来自甲级地宫高风险探索与守关。",
    });
  }

  return sources;
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

  if (readyByProgress) {
    return preferredMaterialAction(world, cultivator, definition);
  }

  if (cultivator.locationId === cultivator.residence.locationId) {
    return "residence-meditate";
  }
  if (cultivator.spiritStones >= 80 && cultivator.spiritualPower >= 20) {
    return "cultivate";
  }
  return preferredMaterialAction(world, cultivator, definition);
}

function breakthroughViewOf(
  world: WorldState,
  cultivator: Cultivator,
): BreakthroughStateView | null {
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) {
    return null;
  }

  const genericRequirements = definition.genericMaterials.map((mat) => ({
    itemId: mat.itemId,
    count: mat.count,
    owned: cultivator.inventory[mat.itemId],
  }));
  const specialRequirement = {
    itemId: definition.specialMaterial.itemId,
    count: definition.specialMaterial.count,
    owned: cultivator.inventory[definition.specialMaterial.itemId],
  };
  const missingItems = breakthroughConsumedItemsOf(definition)
    .map((item) => {
      const owned = cultivator.inventory[item.itemId];
      const missing = Math.max(0, item.count - owned);
      return { itemId: item.itemId, required: item.count, owned, missing };
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
    genericRequirements,
    specialRequirement,
    materialSources: materialSourcesOf(definition),
    missingItems,
    marketBuyable: definition.marketBuyable,
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
  const nearestBahuangEntryId = findNearestLocationId(
    world,
    cultivator.locationId,
    (candidate) => EIGHT_WASTES_CONTENT.entryLocationIds.includes(candidate.id as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number]),
  );
  const bahuangTravelAction = nearestBahuangEntryId ? travelActionIdOf(nearestBahuangEntryId) : "meditate";
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
  if (cultivator.spiritStones < 120) {
    priorities.push("Need base materials: farm wilderness.");
    if (location?.nodeType === "wilderness") {
      suggestedActions.push("mine-spirit-stones", "hunt-mine-beast");
    } else {
      suggestedActions.push(wildernessTravelAction);
    }
  }
  if (cultivator.inventory["spirit-ore"] + cultivator.inventory["ruin-fragment"] + cultivator.inventory["beast-core"] > 0) priorities.push("You can sell materials in the market.");
  if (hasEffect(cultivator, "insight")) priorities.push("Insight is active. Use it on cultivation or a major encounter.");
  if (hasEffect(cultivator, "spirit-saturated")) priorities.push("Spirit saturation is active. Good time for cultivation.");
  if (breakthrough?.readyByProgress) {
    priorities.push("Realm progress is capped. Advance the breakthrough chain instead of grinding more progress.");
    if (!breakthrough.readyByMaterials) {
      priorities.push("Collect the missing breakthrough materials from market or dungeons.");
    }
    if (breakthrough.recommendedAction) {
      suggestedActions.unshift(breakthrough.recommendedAction);
    }
  }
  const needsProgressionMaterials = !!breakthrough
    && !breakthrough.readyByMaterials
    && !breakthrough.marketBuyable;
  if (needsProgressionMaterials) {
    priorities.push("Need progression materials: clear dungeon.");
    const dungeonView = dungeonViewForLocation(world, cultivator, location);
    suggestedActions.push(
      dungeonView && !dungeonView.lockReason
        ? startDungeonExpeditionActionIdOf(dungeonView.recommendedRank, "balanced")
        : dungeonTravelAction,
    );
  }

  const needsRareExpeditionRewards = meetsRealmRequirement(cultivator, REALM_CORE)
    && cultivator.inventory["ancient-artifact"] <= 0;
  if (needsRareExpeditionRewards) {
    priorities.push("Need rare rewards: run bahuang.");
    const canRunBahuangHere = canEnterBahuang(cultivator, cultivator.locationId).allowed;
    suggestedActions.push(canRunBahuangHere ? "enter-bahuang:balanced" : bahuangTravelAction);
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
        if (sect && cultivator.locationId === sect.headquarters) {
          // Suggest specific task types based on title — prefer higher value tasks
          const taskSeed = `${world.tick}:${cultivator.id}:suggest`;
          const preferredCategory: SectTaskCategory = registration.sectBonus >= 8 ? "patrol-suppress" : "sect-expedition";
          const suggested = pickRandomSectTask(cultivator.sectTitle, preferredCategory, taskSeed);
          const fallbackTask = pickRandomSectTask(cultivator.sectTitle, "resource-tribute", taskSeed);
          suggestedActions.push(suggested ? `sect-task:${suggested.id}` : fallbackTask ? `sect-task:${fallbackTask.id}` : "take-mortal-task");
        } else {
          suggestedActions.push(sect ? travelActionIdOf(sect.headquarters) : mainCityTravelAction);
        }
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

  // ---- Recommend unlock-loadout if player has unlockable items ----
  for (const [itemId, count] of Object.entries(cultivator.inventory) as Array<[ItemId, number]>) {
    if (count <= 0) continue;
    const def = ITEM_CATALOG[itemId];
    if (!def || def.use.kind !== "unlock-loadout") continue;
    const wId = def.use.grantsWeaponLoadoutId;
    const sId = def.use.grantsSpellLoadoutId;
    if (wId && !cultivator.unlockedWeaponLoadoutIds.includes(wId)) {
      suggestedActions.push(`unlock-loadout:${itemId}` as ActionId);
      priorities.push(`You have ${def.name} — use it to permanently unlock a new weapon loadout. Does NOT auto-equip.`);
      break;
    }
    if (sId && !cultivator.unlockedSpellLoadoutIds.includes(sId)) {
      suggestedActions.push(`unlock-loadout:${itemId}` as ActionId);
      priorities.push(`You have ${def.name} — use it to permanently unlock a new spell loadout. Does NOT auto-equip.`);
      break;
    }
  }

  // ---- Recommend residence crafting if player has source materials ----
  if (isAtResidence(cultivator)) {
    const craftable = getLiveCraftableRecipes(cultivator);
    for (const recipe of craftable) {
      if (recipe.id.startsWith("recipe-forge-") || recipe.id.startsWith("recipe-synthesize-")) {
        suggestedActions.push(`residence-produce:${recipe.id}` as ActionId);
        priorities.push(`Craftable at residence: ${recipe.outputItemId}. Costs ${recipe.spiritStoneCost} spirit stones.`);
        break;
      }
    }
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

function ensureOptionalProgressMaps(world: WorldState): void {
  const runtimeWorld = world as WorldState & {
    dungeonExpeditions?: Record<string, unknown>;
    dungeonExpeditionReports?: Record<string, unknown>;
    wildernessProgress?: Record<string, unknown>;
    bahuangProgress?: Record<string, unknown>;
    guixuProgress?: {
      wildernessAttunement?: Record<string, number>;
      personalUnlockedNodeIds?: Record<string, string[]>;
      sharedUnlockedNodeIds?: string[];
      lastResolvedEventIds?: Record<string, string>;
    };
  };

  if (!runtimeWorld.dungeonExpeditions || typeof runtimeWorld.dungeonExpeditions !== "object") {
    runtimeWorld.dungeonExpeditions = {};
  }
  if (!runtimeWorld.dungeonExpeditionReports || typeof runtimeWorld.dungeonExpeditionReports !== "object") {
    runtimeWorld.dungeonExpeditionReports = {};
  }
  if (!runtimeWorld.wildernessProgress || typeof runtimeWorld.wildernessProgress !== "object") {
    runtimeWorld.wildernessProgress = {};
  }
  if (!runtimeWorld.bahuangProgress || typeof runtimeWorld.bahuangProgress !== "object") {
    runtimeWorld.bahuangProgress = {};
  }
  if (!runtimeWorld.guixuProgress || typeof runtimeWorld.guixuProgress !== "object") {
    runtimeWorld.guixuProgress = {
      wildernessAttunement: {},
      personalUnlockedNodeIds: {},
      sharedUnlockedNodeIds: [],
      lastResolvedEventIds: {},
    };
  }
  if (!runtimeWorld.guixuProgress.wildernessAttunement || typeof runtimeWorld.guixuProgress.wildernessAttunement !== "object") {
    runtimeWorld.guixuProgress.wildernessAttunement = {};
  }
  if (!runtimeWorld.guixuProgress.personalUnlockedNodeIds || typeof runtimeWorld.guixuProgress.personalUnlockedNodeIds !== "object") {
    runtimeWorld.guixuProgress.personalUnlockedNodeIds = {};
  }
  if (!Array.isArray(runtimeWorld.guixuProgress.sharedUnlockedNodeIds)) {
    runtimeWorld.guixuProgress.sharedUnlockedNodeIds = [];
  }
  if (!runtimeWorld.guixuProgress.lastResolvedEventIds || typeof runtimeWorld.guixuProgress.lastResolvedEventIds !== "object") {
    runtimeWorld.guixuProgress.lastResolvedEventIds = {};
  }
  // Social system maps
  if (!world.socialLinks || typeof world.socialLinks !== "object") {
    (world as unknown as Record<string, unknown>).socialLinks = {};
  }
  if (!world.daoCompanionProposals || typeof world.daoCompanionProposals !== "object") {
    (world as unknown as Record<string, unknown>).daoCompanionProposals = {};
  }
  if (typeof (world as unknown as Record<string, unknown>).nextDaoCompanionProposalSequence !== "number") {
    (world as unknown as Record<string, unknown>).nextDaoCompanionProposalSequence = 1;
  }
  // Party system maps
  if (!world.partyInvitations || typeof world.partyInvitations !== "object") {
    (world as unknown as Record<string, unknown>).partyInvitations = {};
  }
  if (!world.parties || typeof world.parties !== "object") {
    (world as unknown as Record<string, unknown>).parties = {};
  }
  if (typeof (world as unknown as Record<string, unknown>).nextPartyInvitationSequence !== "number") {
    (world as unknown as Record<string, unknown>).nextPartyInvitationSequence = 1;
  }
  if (typeof (world as unknown as Record<string, unknown>).nextPartySequence !== "number") {
    (world as unknown as Record<string, unknown>).nextPartySequence = 1;
  }
}

function buildGuixuView(world: WorldState, cultivator: Cultivator): CultivatorStateView["guixu"] {
  const unlockedNodeIds = getCultivatorUnlockedGuixuNodeIds(world, cultivator.id);
  const availableNodeIds = listGuixuNodesForLocation(world, cultivator.locationId)
    .filter((node) => canUnlockGuixuNode(world, cultivator, node).allowed || unlockedNodeIds.includes(node.nodeId))
    .map((node) => node.nodeId);
  const wildernessAttunement = world.guixuProgress?.wildernessAttunement?.[cultivator.id] ?? 0;
  const sharedUnlockedNodeIds = Array.isArray(world.guixuProgress?.sharedUnlockedNodeIds)
    ? [...world.guixuProgress.sharedUnlockedNodeIds]
    : [];

  return {
    wildernessAttunement,
    unlockedNodeIds,
    sharedUnlockedNodeIds,
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
  ensureOptionalProgressMaps(world);
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
  const mainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const detailedAttrs = deriveDetailedAttributes(mainAttrs);
  const combatProfile: CultivatorStateView["combatProfile"] = {
    battleReadiness: computeReadiness(cultivator),
    attackChannel: (() => {
      const wLoadout = cultivator.equippedWeaponLoadoutId ? getWeaponLoadoutDefinition(cultivator.equippedWeaponLoadoutId) : null;
      const sLoadout = cultivator.equippedSpellLoadoutId ? getSpellLoadoutDefinition(cultivator.equippedSpellLoadoutId) : null;
      if (wLoadout && !sLoadout) return "weapon" as const;
      if (sLoadout && !wLoadout) return "spell" as const;
      if (wLoadout && sLoadout) {
        const wAtk = weaponAttack(mainAttrs) + wLoadout.attackPowerBonus;
        const sAtk = spellAttack(mainAttrs) + sLoadout.attackPowerBonus;
        return sAtk > wAtk ? "spell" as const : "weapon" as const;
      }
      return "weapon" as const;
    })(),
    coreCombatStats: {
      weaponAttack: weaponAttack(mainAttrs),
      spellAttack: spellAttack(mainAttrs),
      physicalDefense: physicalDefense(mainAttrs),
      spellDefense: spellDefense(mainAttrs),
      speed: detailedAttrs.sudu,
      hit: detailedAttrs.mingzhong,
      dodge: detailedAttrs.shanbi,
      crit: detailedAttrs.huixin,
      critDamage: detailedAttrs.baoshang,
      guardHeart: detailedAttrs.huxin,
    },
    combatTraits: [],
    // Combat Loadout Info
    equippedWeaponLoadout: cultivator.equippedWeaponLoadoutId
      ? (() => {
          const def = getWeaponLoadoutDefinition(cultivator.equippedWeaponLoadoutId);
          return def
            ? {
                id: def.id,
                name: def.name,
                weaponTypeId: def.weaponTypeId,
                weaponTier: def.weaponTier,
                weaponFamilyId: def.weaponFamilyId,
                attackPowerBonus: def.attackPowerBonus,
                coreSkillCategory: def.coreSkillCategory,
                coreSkillSpiritCost: def.coreSkillSpiritCost,
                basicAttackStatusHookIds: [...def.basicAttackStatusHookIds],
                coreSkillStatusHookIds: [...def.coreSkillStatusHookIds],
              }
            : null;
        })()
      : null,
    equippedSpellLoadout: cultivator.equippedSpellLoadoutId
      ? (() => {
          const def = getSpellLoadoutDefinition(cultivator.equippedSpellLoadoutId);
          return def
            ? {
                id: def.id,
                name: def.name,
                spellBranchId: def.spellBranchId,
                spellTier: def.spellTier,
                primaryStatusId: def.primaryStatusId,
                secondaryStatusId: def.secondaryStatusId,
                attackPowerBonus: def.attackPowerBonus,
                coreSkillCategory: def.coreSkillCategory,
                coreSkillSpiritCost: def.coreSkillSpiritCost,
                basicAttackStatusHookIds: [...def.basicAttackStatusHookIds],
                coreSkillStatusHookIds: [...def.coreSkillStatusHookIds],
              }
            : null;
        })()
      : null,
    unlockedWeaponLoadouts: cultivator.unlockedWeaponLoadoutIds
      .map((id) => getWeaponLoadoutDefinition(id))
      .filter(Boolean)
      .map((def) => ({
        id: def!.id,
        name: def!.name,
        weaponTypeId: def!.weaponTypeId,
      })),
    unlockedSpellLoadouts: cultivator.unlockedSpellLoadoutIds
      .map((id) => getSpellLoadoutDefinition(id))
      .filter(Boolean)
      .map((def) => ({
        id: def!.id,
        name: def!.name,
        spellBranchId: def!.spellBranchId,
      })),
  };
  return {
    tick: world.tick,
    cultivator: { id: cultivator.id, name: cultivator.name, realm: cultivator.realm, realmLevel: cultivator.realmLevel, realmPhase: realmPhaseOfLevel(cultivator.realmLevel), realmProgress: cultivator.realmProgress, status: statusOf(cultivator), location: location?.name ?? cultivator.locationId, spiritStones: cultivator.spiritStones, qi: cultivator.qi, maxQi: cultivator.maxQi, spiritualPower: cultivator.spiritualPower, maxSpiritualPower: cultivator.maxSpiritualPower, reputation: currentStateReputation(cultivator), lifespan: cultivator.lifespan, age: Number(cultivator.age.toFixed(2)), genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, moralityScore: cultivator.moralityScore, moralityAlignment: moralityAlignmentOfCultivator(cultivator) },
    cultivation: { mainTechnique: cultivator.techniques[0] ?? "Basic Breathing", techniques: cultivator.techniques },
    combatProfile,
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
          nameByLocale: definition.nameByLocale,
          category: definition.category,
          description: definition.description,
          descriptionByLocale: definition.descriptionByLocale,
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
    dungeonExpedition: {
      ...buildDungeonExpeditionStateView(
        world,
        cultivator,
        cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
      ),
    },
    bahuang: buildBahuangStateView(world, cultivator),
    wilderness: buildWildernessView(world, cultivator),
    guixu: buildGuixuView(world, cultivator),
    derivedState,
    socialLinks: getSocialLinksView(world, cultivatorId),
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
  ensureOptionalProgressMaps(world);
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const activeDungeonExpedition = getActiveDungeonExpedition(world, cultivator.id);
  const activeBahuang = world.bahuangProgress[cultivator.id]?.status === "active"
    ? world.bahuangProgress[cultivator.id]
    : null;
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
  const recipeActions = getLiveCraftableRecipes(cultivator).map((recipe) => ({
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
  const actions: AvailableAction[] = activeWilderness || activeBahuang
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

  // ---- Equip loadout actions (always available when not busy) ----
  for (const loadoutId of cultivator.unlockedWeaponLoadoutIds) {
    if (loadoutId === cultivator.equippedWeaponLoadoutId) continue;
    const wDef = getWeaponLoadoutDefinition(loadoutId);
    if (!wDef) continue;
    actions.push({
      actionId: `equip-weapon:${loadoutId}` as ActionId,
      label: `Equip ${wDef.name}`,
      description: `Switch weapon loadout to ${wDef.name} (${WEAPON_TYPE_NAMES_INLINE[wDef.weaponTypeId] ?? wDef.weaponTypeId}, core skill cost: ${wDef.coreSkillSpiritCost}, bonus: +${wDef.attackPowerBonus}).`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  for (const loadoutId of cultivator.unlockedSpellLoadoutIds) {
    if (loadoutId === cultivator.equippedSpellLoadoutId) continue;
    const sDef = getSpellLoadoutDefinition(loadoutId);
    if (!sDef) continue;
    actions.push({
      actionId: `equip-spell:${loadoutId}` as ActionId,
      label: `Equip ${sDef.name}`,
      description: `Switch spell loadout to ${sDef.name} (${SPELL_BRANCH_NAMES_INLINE[sDef.spellBranchId] ?? sDef.spellBranchId}, core skill cost: ${sDef.coreSkillSpiritCost}, bonus: +${sDef.attackPowerBonus}).`,
      durationTicks: 0,
      kind: "immediate",
    });
  }

  // ---- Unlock loadout actions (from inventory items) ----
  for (const [itemId, count] of Object.entries(cultivator.inventory) as Array<[ItemId, number]>) {
    if (count <= 0) continue;
    const def = ITEM_CATALOG[itemId];
    if (!def || def.use.kind !== "unlock-loadout") continue;
    const wId = def.use.grantsWeaponLoadoutId;
    const sId = def.use.grantsSpellLoadoutId;
    if (wId && cultivator.unlockedWeaponLoadoutIds.includes(wId)) continue;
    if (sId && cultivator.unlockedSpellLoadoutIds.includes(sId)) continue;
    const targetName = wId
      ? getWeaponLoadoutDefinition(wId)?.name ?? wId
      : sId
        ? getSpellLoadoutDefinition(sId)?.name ?? sId
        : itemId;
    actions.push({
      actionId: `unlock-loadout:${itemId}` as ActionId,
      label: `Unlock ${targetName}`,
      description: `Use ${def.name} to permanently unlock ${wId ? "weapon" : "spell"} loadout「${targetName}」. Consumes the item. Does NOT auto-equip.`,
      durationTicks: 0,
      kind: "immediate",
    });
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
    const breakthroughDefinition = breakthroughDefinitionOf(cultivator);
    if (breakthroughDefinition && breakthroughDefinition.marketBuyable) {
      const missing = breakthroughMaterialsMissing(cultivator, breakthroughDefinition);
      if (missing.length > 0) {
        const firstMissing = missing[0]!;
        const price = buyPrice(cultivator, breakthroughMaterialBasePrice(firstMissing.itemId, cultivator.realmLevel));
        actions.push({
          actionId: "buy-current-breakthrough-material",
          label: "Buy current breakthrough material",
          description: `Buy 1 ${firstMissing.itemId} for ${price} spirit stones.`,
          durationTicks: 0,
          kind: "immediate",
          costs: { spiritStones: price },
        });
      }
    }
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
    // ---- Sect task categories (spec Chapter 7) ----
    const sectTaskSeed = `${world.tick}:${cultivator.id}:sect-task`;
    const sectCategories: SectTaskCategory[] = ["resource-tribute", "sect-liaison", "sect-expedition", "patrol-suppress"];
    const categoryLabels: Record<SectTaskCategory, { label: string; desc: string }> = {
      "resource-tribute": { label: "宗门任务：资源上缴", desc: "将资源/材料上缴宗门，获得稳定贡献。" },
      "sect-liaison": { label: "宗门任务：跑腿联络", desc: "为宗门传递消息、护送物资或协调事务。" },
      "sect-expedition": { label: "宗门专属游历", desc: "带着宗门任务目标进行专属探索。" },
      "patrol-suppress": { label: "宗门任务：巡查镇压", desc: "巡逻、镇压、讨伐——风险最高、贡献最多。" },
    };
    for (const cat of sectCategories) {
      const task = pickRandomSectTask(cultivator.sectTitle, cat, `${sectTaskSeed}:${cat}`);
      if (task) {
        const actionId = `sect-task:${task.id}` as import("./model.js").TimedActionId;
        const info = categoryLabels[cat];
        actions.push({
          actionId,
          label: `${info.label}：${task.nameCn}（${task.tier}级）`,
          description: `${task.description} ${info.desc}`,
          durationTicks: task.durationTicks,
          kind: "timed",
        });
      }
    }
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
  } else if (activeBahuang) {
    actions.push({
      actionId: "retreat-from-bahuang",
      label: "Retreat from bahuang",
      description: "Abort the 八荒 expedition before pressure collapses the run.",
      durationTicks: 0,
      kind: "immediate",
    });
    return actions;
  } else if (wildernessLayer) {
    actions.push(buildEnterWildernessAction(cultivator, wildernessLayer));
  }
  if (!activeWilderness && !activeBahuang && EIGHT_WASTES_CONTENT.entryLocationIds.includes(cultivator.locationId as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number])) {
    const gate = canEnterBahuang(cultivator, cultivator.locationId);
    if (gate.allowed) {
      for (const posture of ["conservative", "balanced", "aggressive"] as const) {
        actions.push({
          actionId: `enter-bahuang:${posture}` as ActionId,
          label: `Enter Bahuang (${posture})`,
          description: `Start an independent 八荒 run with ${posture} posture and strategy-backed timeout handling.`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
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
        for (const posture of ["conservative", "balanced", "aggressive"] as const) {
          actions.push({
            actionId: enterDungeonActionIdOf(rank, posture),
            label: `Enter dungeon (${posture}, rank ${rank})`,
            description: `Preferred low-wake entry. Uses ${posture} posture strategy with timeout defaults.`,
            durationTicks: DUNGEON_EXPEDITION_DURATION_TICKS,
            kind: "timed",
          });
        }
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

  // ---- Social actions (搭讪 / 传音 / 道侣) ----
  {
    // 搭讪: chat up someone at the same location (must be in safe zone)
    if (location.kind === "safe") {
      const chatTarget = pickChatUpTarget(world, cultivator.id, `${world.tick}:${cultivator.id}:chat-up`);
      if (chatTarget) {
        const existingLink = getSocialLink(world, cultivator.id, chatTarget.id);
        const levelLabel = existingLink ? getAffinityLevel(existingLink.affinity) : "陌生人";
        actions.push({
          actionId: `chat-up:${chatTarget.id}` as ActionId,
          label: `搭讪：${chatTarget.name}（${levelLabel}）`,
          description: `与${chatTarget.name}攀谈，增进好感度。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    // 传音: send voice message to any 朋友+ level friend, from anywhere
    const friendLinks = getFriendsAtLevel(world, cultivator.id, VOICE_TRANSMIT_MIN_LEVEL);
    for (const link of friendLinks.slice(0, 3)) {
      const friendName = world.cultivators[link.targetCultivatorId]?.name ?? "unknown";
      const level = getAffinityLevel(link.affinity);
      const bondLabel = link.specialBond === "道侣" ? "道侣" : level;
      actions.push({
        actionId: `voice-transmit:${link.targetCultivatorId}` as ActionId,
        label: `传音：${friendName}（${bondLabel}）`,
        description: `向${friendName}传音交流，维系情谊。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    // 申请道侣: propose dao companion to 好友+ cultivator
    if (!hasDaoCompanion(world, cultivator.id)) {
      const companionCandidates = getFriendsAtLevel(world, cultivator.id, DAO_COMPANION_MIN_LEVEL);
      for (const link of companionCandidates.slice(0, 2)) {
        if (link.specialBond) continue;
        if (hasDaoCompanion(world, link.targetCultivatorId)) continue;
        const targetName = world.cultivators[link.targetCultivatorId]?.name ?? "unknown";
        actions.push({
          actionId: `propose-dao-companion:${link.targetCultivatorId}` as ActionId,
          label: `结为道侣：${targetName}`,
          description: `向${targetName}提出道侣之约。需双方均为好友以上关系。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    // 响应道侣: accept/reject pending dao companion proposal
    const pendingProposals = Object.values(world.daoCompanionProposals ?? {}).filter(
      (p) => p.toCultivatorId === cultivator.id && world.tick < p.expiresAtTick,
    );
    for (const proposal of pendingProposals) {
      const fromName = world.cultivators[proposal.fromCultivatorId]?.name ?? "unknown";
      actions.push(
        { actionId: `accept-dao-companion:${proposal.id}` as ActionId, label: `接受道侣：${fromName}`, description: `接受${fromName}的道侣之约。`, durationTicks: 0, kind: "immediate" },
        { actionId: `reject-dao-companion:${proposal.id}` as ActionId, label: `拒绝道侣：${fromName}`, description: `婉拒${fromName}的道侣之约。`, durationTicks: 0, kind: "immediate" },
      );
    }
  }

  // ---- Party / Team actions (组队) ----
  {
    const party = getPartyOf(world, cultivator.id);
    if (party) {
      // Disband party
      actions.push({ actionId: "disband-party" as ActionId, label: "解散队伍", description: "解散当前队伍。", durationTicks: 0, kind: "immediate" });
      const partner = getPartyPartner(world, cultivator.id);
      if (partner && !partner.activeJobId && !cultivator.activeJobId) {
        // Dual survey wilderness (if in wilderness)
        if (activeWilderness) {
          actions.push({
            actionId: "dual-survey-wilderness" as ActionId,
            label: "同行历练",
            description: "与队友共同执行荒野双人任务，获得额外奖励和好感度。",
            durationTicks: DEFAULT_ACTION_DURATIONS["dual-survey-wilderness"],
            kind: "timed",
          });
        }
        // Dual cultivate (if at party leader's residence location)
        const leader = world.cultivators[party.leaderId];
        if (leader && cultivator.locationId === leader.residence.locationId && partner.locationId === leader.residence.locationId) {
          actions.push({
            actionId: "dual-cultivate" as ActionId,
            label: "同行修炼",
            description: "与队友在洞府共同修炼，修炼速度略有提升。",
            durationTicks: DEFAULT_ACTION_DURATIONS["dual-cultivate"],
            kind: "timed",
          });
        }
      }
    } else if (!isInParty(world, cultivator.id)) {
      // Party invite: invite someone with 认识+ affinity at same safe location
      if (location.kind === "safe") {
        const inviteCandidates = getCultivatorsAtLocation(world, cultivator.locationId, cultivator.id)
          .filter((c) => {
            if (c.activeJobId) return false;
            if (isInParty(world, c.id)) return false;
            const link = getSocialLink(world, cultivator.id, c.id);
            return link !== null && meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL);
          });
        for (const candidate of inviteCandidates.slice(0, 3)) {
          const level = getAffinityLevel(getSocialLink(world, cultivator.id, candidate.id)!.affinity);
          actions.push({
            actionId: `party-invite:${candidate.id}` as ActionId,
            label: `组队邀请：${candidate.name}（${level}）`,
            description: `向${candidate.name}发送组队邀请。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
    }
    // Accept/reject pending party invitations
    const pendingPartyInvites = Object.values(world.partyInvitations ?? {}).filter(
      (inv) => inv.toCultivatorId === cultivator.id && world.tick < inv.expiresAtTick,
    );
    for (const inv of pendingPartyInvites) {
      const fromName = world.cultivators[inv.fromCultivatorId]?.name ?? "unknown";
      actions.push(
        { actionId: `accept-party:${inv.id}` as ActionId, label: `接受组队：${fromName}`, description: `接受${fromName}的组队邀请。`, durationTicks: 0, kind: "immediate" },
        { actionId: `reject-party:${inv.id}` as ActionId, label: `拒绝组队：${fromName}`, description: `拒绝${fromName}的组队邀请。`, durationTicks: 0, kind: "immediate" },
      );
    }
  }

  return ensureSafetyNetActions(world, cultivator, location, actions);
}

// Inline name lookups for loadout action descriptions
const WEAPON_TYPE_NAMES_INLINE: Record<string, string> = {
  sword: "剑", "dual-swords": "双剑", dagger: "匕首", gauntlets: "拳套",
  saber: "刀", greatsaber: "巨刀", axe: "斧", hammer: "锤",
  spear: "枪", halberd: "戟", staff: "棍", "hook-sickle": "钩镰",
  whip: "鞭", "chain-blade": "链刃", "meteor-hammer": "流星锤", "silk-ribbon": "绫",
  bow: "弓", crossbow: "弩", fan: "扇", umbrella: "伞",
};
const SPELL_BRANCH_NAMES_INLINE: Record<string, string> = {
  "metal-edge": "金/锋刃", "metal-guard": "金/罡御", "metal-break": "金/破禁",
  "wood-growth": "木/生息", "wood-bind": "木/缠束", "wood-bloom": "木/丰茂",
  "water-frost": "水/寒流", "water-illusion": "水/幻流", "water-flow": "水/润泽",
  "fire-blaze": "火/炽焰", "fire-smelt": "火/炼化", "fire-burst": "火/激燃",
  "earth-wall": "土/岩壁", "earth-suppress": "土/镇岳", "earth-vein": "土/地脉",
};

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
  const allowed = new Set<ActionId>(["meditate", "heal", "residence-breakthrough", "residence-heal", "residence-recover-qi", "residence-heal:use-pill", "residence-heal:no-pill", "residence-recover-qi:use-pill", "residence-recover-qi:no-pill", "use-healing-pill", "use-qi-pill", "use-ward-talisman", "buy-healing-pill", "buy-qi-pill", "buy-ward-talisman", "buy-current-breakthrough-material", "sell-spirit-ore", "sell-ruin-fragment", "sell-beast-core", "take-neutral-duty", "leave-neutral-sect", "withdraw-from-wilderness", "retreat-from-bahuang"]);
  if (actionId.startsWith("travel-to:")) return;
  if (actionId.startsWith("join-neutral-sect:")) return;
  if (actionId.startsWith("residence-produce:")) return;
  if (actionId.startsWith("chat-up:")) return;
  if (actionId.startsWith("voice-transmit:")) return;
  if (actionId.startsWith("propose-dao-companion:")) return;
  if (actionId.startsWith("accept-dao-companion:")) return;
  if (actionId.startsWith("reject-dao-companion:")) return;
  if (actionId.startsWith("party-invite:")) return;
  if (actionId.startsWith("accept-party:")) return;
  if (actionId.startsWith("reject-party:")) return;
  if (actionId === "disband-party") return;
  // Allow low-risk sect tasks (resource tribute) while injured
  const injuredSectTask = parseSectTaskId(actionId);
  if (injuredSectTask) {
    const tpl = getSectTaskById(injuredSectTask);
    if (tpl && (tpl.riskLevel === "none" || tpl.riskLevel === "low")) return;
  }
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
  if (actionId === "buy-current-breakthrough-material") {
    const location = world.locations[cultivator.locationId];
    if (!location || !canTradeAtLocation(location)) {
      throw new Error("You must be in a trading safe settlement.");
    }
    const definition = breakthroughDefinitionOf(cultivator);
    if (!definition) {
      throw new Error("No breakthrough material is required at the current realm level.");
    }
    if (!definition.marketBuyable) {
      throw new Error("Current breakthrough materials cannot be purchased at market.");
    }
    const missing = breakthroughMaterialsMissing(cultivator, definition);
    if (missing.length === 0) {
      throw new Error("All breakthrough materials are already sufficient.");
    }
    const firstMissing = missing[0]!;
    const price = buyPrice(cultivator, breakthroughMaterialBasePrice(firstMissing.itemId, cultivator.realmLevel));
    if (cultivator.spiritStones < price) {
      throw new Error("Not enough spirit stones.");
    }
    cultivator.spiritStones -= price;
    cultivator.inventory[firstMissing.itemId] += 1;
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} bought 1 ${firstMissing.itemId} for ${price}.`,
    };
  }

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
const parseEquipWeaponLoadoutId = (actionId: ActionId): WeaponLoadoutId | null =>
  actionId.startsWith("equip-weapon:") ? actionId.slice("equip-weapon:".length) as WeaponLoadoutId : null;
const parseEquipSpellLoadoutId = (actionId: ActionId): SpellLoadoutId | null =>
  actionId.startsWith("equip-spell:") ? actionId.slice("equip-spell:".length) as SpellLoadoutId : null;
const parseUnlockLoadoutItemId = (actionId: ActionId): ItemId | null =>
  actionId.startsWith("unlock-loadout:") ? actionId.slice("unlock-loadout:".length) as ItemId : null;

function immediateAction(world: WorldState, cultivator: Cultivator, actionId: ActionId): ActionExecutionResult {
  const registration = registrationModifiersOf(cultivator);

  // ---- Equip weapon loadout ----
  const equipWeaponId = parseEquipWeaponLoadoutId(actionId);
  if (equipWeaponId) {
    const def = getWeaponLoadoutDefinition(equipWeaponId);
    if (!def) throw new Error(`Unknown weapon loadout: ${equipWeaponId}`);
    equipWeapon(cultivator, equipWeaponId);
    addDaoLog(world, cultivator.id, "装配切换", `${cultivator.name} equipped ${def.name}.`, ["combat-loadout", "equip-weapon"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} equipped weapon loadout: ${def.name}.`,
    };
  }

  // ---- Equip spell loadout ----
  const equipSpellId = parseEquipSpellLoadoutId(actionId);
  if (equipSpellId) {
    const def = getSpellLoadoutDefinition(equipSpellId);
    if (!def) throw new Error(`Unknown spell loadout: ${equipSpellId}`);
    equipSpell(cultivator, equipSpellId);
    addDaoLog(world, cultivator.id, "装配切换", `${cultivator.name} equipped ${def.name}.`, ["combat-loadout", "equip-spell"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} equipped spell loadout: ${def.name}.`,
    };
  }

  // ---- Unlock loadout via item ----
  const unlockItemId = parseUnlockLoadoutItemId(actionId);
  if (unlockItemId) {
    const itemDef = ITEM_CATALOG[unlockItemId];
    if (!itemDef || itemDef.use.kind !== "unlock-loadout") {
      throw new Error(`Invalid unlock-loadout item: ${unlockItemId}`);
    }
    if ((cultivator.inventory[unlockItemId] ?? 0) < 1) {
      throw new Error(`Item not available: ${unlockItemId}`);
    }
    const wLoadoutId = itemDef.use.grantsWeaponLoadoutId;
    const sLoadoutId = itemDef.use.grantsSpellLoadoutId;
    if (!wLoadoutId && !sLoadoutId) {
      throw new Error(`Item ${unlockItemId} does not grant any loadout.`);
    }
    if (wLoadoutId) {
      if (cultivator.unlockedWeaponLoadoutIds.includes(wLoadoutId)) {
        throw new Error(`Weapon loadout ${wLoadoutId} is already unlocked. Item not consumed.`);
      }
      cultivator.unlockedWeaponLoadoutIds = [...cultivator.unlockedWeaponLoadoutIds, wLoadoutId];
      cultivator.inventory[unlockItemId] -= 1;
      addDaoLog(world, cultivator.id, "装配解锁", `${cultivator.name} 使用「${itemDef.name}」解锁了武器装配「${getWeaponLoadoutDefinition(wLoadoutId)?.name ?? wLoadoutId}」。`, ["loadout-unlock", "weapon-source"]);
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} unlocked weapon loadout: ${getWeaponLoadoutDefinition(wLoadoutId)?.name ?? wLoadoutId}. Not auto-equipped.`,
      };
    }
    if (sLoadoutId) {
      if (cultivator.unlockedSpellLoadoutIds.includes(sLoadoutId)) {
        throw new Error(`Spell loadout ${sLoadoutId} is already unlocked. Item not consumed.`);
      }
      cultivator.unlockedSpellLoadoutIds = [...cultivator.unlockedSpellLoadoutIds, sLoadoutId];
      cultivator.inventory[unlockItemId] -= 1;
      addDaoLog(world, cultivator.id, "装配解锁", `${cultivator.name} 使用「${itemDef.name}」解锁了法术装配「${getSpellLoadoutDefinition(sLoadoutId)?.name ?? sLoadoutId}」。`, ["loadout-unlock", "spell-source"]);
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: `${cultivator.name} unlocked spell loadout: ${getSpellLoadoutDefinition(sLoadoutId)?.name ?? sLoadoutId}. Not auto-equipped.`,
      };
    }
    throw new Error(`Item ${unlockItemId} does not grant any loadout.`);
  }

  const wildernessLayerId = parseEnterWildernessLayer(actionId);
  const bahuangStrategy = parseEnterBahuangStrategy(actionId);
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
  if (bahuangStrategy) {
    enterBahuangExpedition(world, cultivator, bahuangStrategy);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} entered 八荒 with ${bahuangStrategy} posture.`,
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
    addDaoLog(world, cultivator.id, "Joined Sect", `${cultivator.name} joined ${sect.name}.`, ["sect", "join-sect", "sect-join-log"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${sect.name}.` };
  }
  if (actionId === "withdraw-from-wilderness") {
    const summary = withdrawFromWilderness(world, cultivator, "manual-withdraw");
    if (!summary) {
      throw new Error("No active wilderness expedition to withdraw from.");
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }
  if (actionId === "retreat-from-bahuang") {
    const summary = retreatFromBahuang(world, cultivator, "manual-retreat");
    if (!summary) {
      throw new Error("No active bahuang expedition to retreat from.");
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }

  // ---- PVP: Challenge a cultivator ----
  if (actionId.startsWith("challenge-cultivator:")) {
    const targetId = actionId.slice("challenge-cultivator:".length);
    const target = world.cultivators[targetId];
    if (!target) throw new Error("Target cultivator not found.");
    const location = world.locations[cultivator.locationId];
    if (!location || location.kind !== "safe") throw new Error("City duels can only be initiated in safe zones.");
    if (cultivator.locationId !== target.locationId) throw new Error("Target must be in the same location.");
    if (cultivator.activeJobId) throw new Error("Cannot challenge while in an active job.");
    if (target.activeJobId) throw new Error("Target is busy with an active job.");
    if (target.pendingPvpChallengeId) throw new Error("Target already has a pending PVP challenge.");
    if (cultivator.pendingPvpChallengeId) throw new Error("You already have a pending PVP challenge.");
    const hpRatio = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
    if (hpRatio < 0.5) throw new Error("Your qi must be at least 50% to issue a challenge.");
    const realmGap = Math.abs((REALM_ORDER[cultivator.realm] ?? 0) - (REALM_ORDER[target.realm] ?? 0));
    if (realmGap > 2) throw new Error("Realm gap too large for a fair duel.");
    if (cultivator.sectId && cultivator.sectId === target.sectId) throw new Error("Cannot challenge a sect member in the city.");

    const challengeId = `pvp-challenge-${world.nextPvpChallengeSequence++}`;
    const challenge: PendingPvpChallenge = {
      id: challengeId,
      challengerCultivatorId: cultivator.id,
      targetCultivatorId: targetId,
      createdAtTick: world.tick,
      expiresAtTick: world.tick + 3,
      locationId: cultivator.locationId,
    };
    world.pendingPvpChallenges[challengeId] = challenge;
    target.pendingPvpChallengeId = challengeId;
    addMessage(world, targetId, "切磋挑战", "挑战书", `${cultivator.name}向你发起了切磋挑战，请在3个tick内回复。`, { fromCultivatorId: cultivator.id });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} challenged ${target.name} to a duel.` };
  }

  // ---- PVP: Reject challenge ----
  if (actionId.startsWith("reject-pvp-challenge:")) {
    const challengeId = actionId.slice("reject-pvp-challenge:".length);
    const challenge = world.pendingPvpChallenges[challengeId];
    if (!challenge) throw new Error("Challenge not found or already expired.");
    if (challenge.targetCultivatorId !== cultivator.id) throw new Error("Only the challenged cultivator can reject.");
    delete world.pendingPvpChallenges[challengeId];
    cultivator.pendingPvpChallengeId = null;
    const challenger = world.cultivators[challenge.challengerCultivatorId];
    if (challenger) {
      addMessage(world, challenger.id, "切磋回复", "挑战被拒绝", `${cultivator.name}拒绝了你的切磋挑战。`);
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rejected the duel challenge.` };
  }

  // ---- PVP: Accept challenge → start combat ----
  if (actionId.startsWith("accept-pvp-challenge:")) {
    const challengeId = actionId.slice("accept-pvp-challenge:".length);
    const challenge = world.pendingPvpChallenges[challengeId];
    if (!challenge) throw new Error("Challenge not found or already expired.");
    if (challenge.targetCultivatorId !== cultivator.id) throw new Error("Only the challenged cultivator can accept.");
    if (world.tick >= challenge.expiresAtTick) {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error("Challenge has expired.");
    }
    const challenger = world.cultivators[challenge.challengerCultivatorId];
    if (!challenger) throw new Error("Challenger no longer exists.");
    if (cultivator.locationId !== challenge.locationId || challenger.locationId !== challenge.locationId) {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error("Both duelists must remain at the original challenge location.");
    }
    if (challenger.activeJobId) {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error("Challenger is busy.");
    }

    // Clean up challenge
    delete world.pendingPvpChallenges[challengeId];
    cultivator.pendingPvpChallengeId = null;

    // Build opponent snapshot from target (the acceptor)
    const opponentSnapshot = buildCultivatorCombatSnapshot(cultivator, true);
    // Build a dummy template so initializeCombatJobState works for the challenger
    const duelTemplate: EncounterTemplate = {
      id: "pvp-city-duel",
      enemyName: cultivator.name,
      maxRounds: 7,
      stylePreference: ["finesse", "tactic", "brute"],
      baseHp: opponentSnapshot.maxHp,
      attack: opponentSnapshot.attack,
      defense: opponentSnapshot.defense,
      speed: opponentSnapshot.speed,
      hit: opponentSnapshot.hit,
      dodge: opponentSnapshot.dodge,
      crit: opponentSnapshot.crit,
      critDamage: opponentSnapshot.critDamage,
      guardHeart: opponentSnapshot.guardHeart,
      escapeAllowed: true,
      spirit: opponentSnapshot.spirit,
      maxSpirit: opponentSnapshot.maxSpirit,
    };
    const combatState = initializeCombatJobState(world, challenger, duelTemplate, 1, "pvp-city-duel");
    // Overwrite enemy snapshot with real cultivator snapshot
    combatState.enemySnapshot = opponentSnapshot;
    combatState.pvpTargetCultivatorId = cultivator.id;
    combatState.pvpBattleKind = "city-duel";
    const result = startJob(world, challenger, "pvp-duel", "切磋对决");
    if (result.job) {
      setCombatJobState(result.job, combatState);
    }
    addMessage(world, cultivator.id, "切磋开始", "挑战已接受", `你接受了${challenger.name}的切磋挑战，战斗即将开始。`);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} accepted the duel. Combat started for ${challenger.name}.`, job: result.job };
  }

  // ---- Social: 搭讪 (Chat Up) ----
  const chatUpTargetId = parseChatUpTarget(actionId);
  if (chatUpTargetId) {
    const target = getCultivatorOrThrow(world, chatUpTargetId);
    if (cultivator.locationId !== target.locationId) throw new Error("搭讪 requires being at the same location.");
    if (cultivator.id === target.id) throw new Error("Cannot chat up yourself.");
    const { linkAB } = addMutualAffinity(world, cultivator.id, target.id, AFFINITY_GAINS.chatUp);
    const level = getAffinityLevel(linkAB.affinity);
    addDaoLog(world, cultivator.id, "搭讪", `${cultivator.name}与${target.name}攀谈，好感度上升至${linkAB.affinity}（${level}）。`, ["social", "chat-up"]);
    addMessage(world, target.id, "社交", "有人搭讪", `${cultivator.name}在${world.locations[cultivator.locationId]?.name ?? "某处"}向你搭话。`, { fromCultivatorId: cultivator.id });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} chatted up ${target.name}. Affinity: ${linkAB.affinity} (${level}).` };
  }

  // ---- Social: 传音 (Voice Transmit) ----
  const voiceTargetId = parseVoiceTransmitTarget(actionId);
  if (voiceTargetId) {
    const target = getCultivatorOrThrow(world, voiceTargetId);
    if (cultivator.id === target.id) throw new Error("Cannot voice-transmit to yourself.");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || !meetsAffinityLevel(link.affinity, VOICE_TRANSMIT_MIN_LEVEL)) {
      throw new Error(`传音 requires at least ${VOICE_TRANSMIT_MIN_LEVEL} level relationship.`);
    }
    const { linkAB } = addMutualAffinity(world, cultivator.id, target.id, AFFINITY_GAINS.voiceTransmit);
    const level = getAffinityLevel(linkAB.affinity);
    addDaoLog(world, cultivator.id, "传音", `${cultivator.name}向${target.name}传音交流，好感度${linkAB.affinity}（${level}）。`, ["social", "voice-transmit"]);
    addMessage(world, target.id, "传音", `来自${cultivator.name}的传音`, `${cultivator.name}向你传音问候。`, { fromCultivatorId: cultivator.id, toCultivatorId: target.id });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} sent a voice message to ${target.name}. Affinity: ${linkAB.affinity} (${level}).` };
  }

  // ---- Social: 申请道侣 (Propose Dao Companion) ----
  const proposeDaoTargetId = parseProposeDaoCompanion(actionId);
  if (proposeDaoTargetId) {
    const target = getCultivatorOrThrow(world, proposeDaoTargetId);
    if (cultivator.id === target.id) throw new Error("Cannot propose to yourself.");
    if (hasDaoCompanion(world, cultivator.id)) throw new Error("You already have a dao companion.");
    if (hasDaoCompanion(world, target.id)) throw new Error("Target already has a dao companion.");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || !meetsAffinityLevel(link.affinity, DAO_COMPANION_MIN_LEVEL)) {
      throw new Error(`道侣申请 requires at least ${DAO_COMPANION_MIN_LEVEL} level relationship.`);
    }
    // Check no existing pending proposal between these two
    const existing = Object.values(world.daoCompanionProposals ?? {}).find(
      (p) => (p.fromCultivatorId === cultivator.id && p.toCultivatorId === target.id)
        || (p.fromCultivatorId === target.id && p.toCultivatorId === cultivator.id),
    );
    if (existing) throw new Error("A dao companion proposal already exists between you two.");
    if (!world.daoCompanionProposals) (world as unknown as Record<string, unknown>).daoCompanionProposals = {};
    if (typeof (world as unknown as Record<string, unknown>).nextDaoCompanionProposalSequence !== "number") (world as unknown as Record<string, unknown>).nextDaoCompanionProposalSequence = 1;
    const proposalId = `dao-proposal-${world.nextDaoCompanionProposalSequence++}`;
    const proposal = { id: proposalId, fromCultivatorId: cultivator.id, toCultivatorId: target.id, createdAtTick: world.tick, expiresAtTick: world.tick + DAO_COMPANION_PROPOSAL_EXPIRY };
    world.daoCompanionProposals[proposalId] = proposal;
    addMessage(world, target.id, "道侣之约", "道侣申请", `${cultivator.name}向你提出了道侣之约，请在${DAO_COMPANION_PROPOSAL_EXPIRY}个tick内回复。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "道侣申请", `${cultivator.name}向${target.name}提出了道侣之约。`, ["social", "dao-companion", "proposal"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} proposed dao companionship to ${target.name}.` };
  }

  // ---- Social: 接受道侣 (Accept Dao Companion) ----
  const acceptDaoProposalId = parseAcceptDaoCompanion(actionId);
  if (acceptDaoProposalId) {
    const proposal = (world.daoCompanionProposals ?? {})[acceptDaoProposalId];
    if (!proposal) throw new Error("Dao companion proposal not found or expired.");
    if (proposal.toCultivatorId !== cultivator.id) throw new Error("Only the target can accept.");
    if (world.tick >= proposal.expiresAtTick) {
      delete world.daoCompanionProposals[acceptDaoProposalId];
      throw new Error("Dao companion proposal has expired.");
    }
    if (hasDaoCompanion(world, cultivator.id)) throw new Error("You already have a dao companion.");
    if (hasDaoCompanion(world, proposal.fromCultivatorId)) throw new Error("Proposer already has a dao companion.");
    // Set mutual 道侣 bond
    const linkAB = setBond(getOrCreateSocialLink(world, proposal.fromCultivatorId, cultivator.id), "道侣");
    const linkBA = setBond(getOrCreateSocialLink(world, cultivator.id, proposal.fromCultivatorId), "道侣");
    writeSocialLink(world, proposal.fromCultivatorId, linkAB);
    writeSocialLink(world, cultivator.id, linkBA);
    delete world.daoCompanionProposals[acceptDaoProposalId];
    const proposerName = world.cultivators[proposal.fromCultivatorId]?.name ?? "unknown";
    addMessage(world, proposal.fromCultivatorId, "道侣之约", "道侣确立", `${cultivator.name}接受了你的道侣之约，你们正式结为道侣。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "道侣确立", `${cultivator.name}与${proposerName}正式结为道侣。`, ["social", "dao-companion", "accepted"]);
    addDaoLog(world, proposal.fromCultivatorId, "道侣确立", `${proposerName}与${cultivator.name}正式结为道侣。`, ["social", "dao-companion", "accepted"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} accepted dao companionship with ${proposerName}.` };
  }

  // ---- Social: 拒绝道侣 (Reject Dao Companion) ----
  const rejectDaoProposalId = parseRejectDaoCompanion(actionId);
  if (rejectDaoProposalId) {
    const proposal = (world.daoCompanionProposals ?? {})[rejectDaoProposalId];
    if (!proposal) throw new Error("Dao companion proposal not found or expired.");
    if (proposal.toCultivatorId !== cultivator.id) throw new Error("Only the target can reject.");
    delete world.daoCompanionProposals[rejectDaoProposalId];
    const proposerName = world.cultivators[proposal.fromCultivatorId]?.name ?? "unknown";
    addMessage(world, proposal.fromCultivatorId, "道侣之约", "道侣婉拒", `${cultivator.name}婉拒了你的道侣之约。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "道侣婉拒", `${cultivator.name}婉拒了${proposerName}的道侣之约。`, ["social", "dao-companion", "rejected"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rejected dao companionship with ${proposerName}.` };
  }

  // ---- Party: 组队邀请 (Party Invite) ----
  const partyInviteTargetId = parsePartyInviteTarget(actionId);
  if (partyInviteTargetId) {
    const target = getCultivatorOrThrow(world, partyInviteTargetId);
    if (cultivator.id === target.id) throw new Error("Cannot invite yourself to a party.");
    if (cultivator.locationId !== target.locationId) throw new Error("组队邀请 requires being at the same location.");
    if (isInParty(world, cultivator.id)) throw new Error("You are already in a party.");
    if (isInParty(world, target.id)) throw new Error("Target is already in a party.");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || !meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL)) {
      throw new Error(`组队邀请 requires at least ${PARTY_INVITE_MIN_LEVEL} level relationship.`);
    }
    if (!world.partyInvitations) (world as unknown as Record<string, unknown>).partyInvitations = {};
    if (typeof world.nextPartyInvitationSequence !== "number") (world as unknown as Record<string, unknown>).nextPartyInvitationSequence = 1;
    const inviteId = `party-inv-${world.nextPartyInvitationSequence++}`;
    world.partyInvitations[inviteId] = {
      id: inviteId,
      fromCultivatorId: cultivator.id,
      toCultivatorId: target.id,
      createdAtTick: world.tick,
      expiresAtTick: world.tick + PARTY_INVITE_EXPIRY,
    };
    addMessage(world, target.id, "组队邀请", `${cultivator.name}的邀请`, `${cultivator.name}向你发送了组队邀请，请及时回复。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "组队邀请", `${cultivator.name}向${target.name}发送了组队邀请。`, ["social", "party"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} invited ${target.name} to form a party.` };
  }

  // ---- Party: 接受组队 (Accept Party) ----
  const acceptPartyInvId = parseAcceptParty(actionId);
  if (acceptPartyInvId) {
    const invitation = (world.partyInvitations ?? {})[acceptPartyInvId];
    if (!invitation) throw new Error("Party invitation not found or expired.");
    if (invitation.toCultivatorId !== cultivator.id) throw new Error("Only the invited cultivator can accept.");
    if (world.tick >= invitation.expiresAtTick) throw new Error("Party invitation has expired.");
    if (isInParty(world, cultivator.id)) throw new Error("You are already in a party.");
    if (isInParty(world, invitation.fromCultivatorId)) throw new Error("Inviter is already in a party.");
    if (!world.parties) (world as unknown as Record<string, unknown>).parties = {};
    if (typeof world.nextPartySequence !== "number") (world as unknown as Record<string, unknown>).nextPartySequence = 1;
    const partyId = `party-${world.nextPartySequence++}`;
    world.parties[partyId] = {
      id: partyId,
      memberIds: [invitation.fromCultivatorId, cultivator.id],
      leaderId: invitation.fromCultivatorId,
      formedAtTick: world.tick,
    };
    delete world.partyInvitations[acceptPartyInvId];
    const leader = world.cultivators[invitation.fromCultivatorId];
    const leaderName = leader?.name ?? "unknown";
    addMessage(world, invitation.fromCultivatorId, "组队", "组队成功", `${cultivator.name}接受了你的组队邀请。`);
    addDaoLog(world, cultivator.id, "组队成功", `${cultivator.name}与${leaderName}组成了队伍。`, ["social", "party"]);
    addDaoLog(world, invitation.fromCultivatorId, "组队成功", `${leaderName}与${cultivator.name}组成了队伍。`, ["social", "party"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${leaderName}'s party.` };
  }

  // ---- Party: 拒绝组队 (Reject Party) ----
  const rejectPartyInvId = parseRejectParty(actionId);
  if (rejectPartyInvId) {
    const invitation = (world.partyInvitations ?? {})[rejectPartyInvId];
    if (!invitation) throw new Error("Party invitation not found.");
    if (invitation.toCultivatorId !== cultivator.id) throw new Error("Only the invited cultivator can reject.");
    delete world.partyInvitations[rejectPartyInvId];
    const inviterName = world.cultivators[invitation.fromCultivatorId]?.name ?? "unknown";
    addMessage(world, invitation.fromCultivatorId, "组队", "邀请被拒绝", `${cultivator.name}拒绝了你的组队邀请。`);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rejected party invitation from ${inviterName}.` };
  }

  // ---- Party: 解散队伍 (Disband Party) ----
  if (actionId === "disband-party") {
    const party = disbandParty(world, cultivator.id);
    if (!party) throw new Error("You are not in a party.");
    const partnerId = party.memberIds[0] === cultivator.id ? party.memberIds[1] : party.memberIds[0];
    const partnerName = world.cultivators[partnerId]?.name ?? "unknown";
    addMessage(world, partnerId, "组队", "队伍解散", `${cultivator.name}解散了队伍。`);
    addDaoLog(world, cultivator.id, "队伍解散", `${cultivator.name}解散了与${partnerName}的队伍。`, ["social", "party"]);
    addDaoLog(world, partnerId, "队伍解散", `${cultivator.name}解散了队伍。`, ["social", "party"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} disbanded the party.` };
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
  // ---- Dual Survey Wilderness resolution ----
  if (job.actionId === "dual-survey-wilderness") {
    const taskId = job.meta?.dualTaskId;
    const partnerId = job.meta?.dualPartnerId;
    const role = job.meta?.dualRole;
    const task = taskId ? getDualWildernessTaskById(taskId) : null;
    if (task) {
      cultivator.spiritStones += task.spiritStoneReward;
      addCurrentStateReputation(cultivator, task.reputationReward);
      // Only initiator adds mutual affinity (to avoid double-counting)
      if (role === "initiator" && partnerId) {
        addMutualAffinity(world, cultivator.id, partnerId, task.affinityGain);
      }
      addDaoLog(world, cultivator.id, "同行历练", `${cultivator.name}完成了双人荒野任务：${task.nameCn}，获得${task.spiritStoneReward}灵石。`, ["social", "dual-wilderness"]);
      return `${cultivator.name} completed dual wilderness task: ${task.nameCn}.`;
    }
    return `${cultivator.name} completed a dual wilderness task.`;
  }
  // ---- Dual Cultivate resolution ----
  if (job.actionId === "dual-cultivate") {
    const partnerId = job.meta?.dualPartnerId;
    const role = job.meta?.dualRole;
    addRealmProgress(
      cultivator,
      18 +
        Math.floor(cultivator.realmLevel / 2) +
        DUAL_CULTIVATE_BONUS +
        (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
        (hasEffect(cultivator, "qi-surge") ? 6 : 0) +
        (registration?.cultivateBonus ?? 0) -
        (hasEffect(cultivator, "poisoned") ? 8 : 0),
    );
    if (role === "initiator" && partnerId) {
      addMutualAffinity(world, cultivator.id, partnerId, AFFINITY_GAINS.dualCultivate);
    }
    addDaoLog(world, cultivator.id, "同行修炼", `${cultivator.name}与同伴在洞府共同修炼，进步更快。`, ["social", "dual-cultivate"]);
    return `${cultivator.name} cultivated with party partner.`;
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
    // If there are other cultivators at the same location, grow affinity with one
    const socialTarget = pickChatUpTarget(world, cultivator.id, `${world.tick}:${job.id}:socialize`);
    if (socialTarget) {
      const { linkAB } = addMutualAffinity(world, cultivator.id, socialTarget.id, AFFINITY_GAINS.residenceSocialize);
      const level = getAffinityLevel(linkAB.affinity);
      addDaoLog(world, cultivator.id, "洞府会友", `${cultivator.name}在洞府与${socialTarget.name}交流心法，好感度${linkAB.affinity}（${level}）。`, ["social", "residence"]);
    } else {
      addDaoLog(world, cultivator.id, "洞府会友", `${cultivator.name}在洞府独自修习心法。`, ["social", "residence"]);
    }
    return `${cultivator.name} socialized at residence.`;
  }
  if (job.actionId === "take-mortal-task") {
    cultivator.spiritStones += 140 + ((registration?.taskBonus ?? 0) * 10);
    cultivator.inventory[pickBreakthroughDrop("cloud-heart-grass", `${world.tick}:${job.id}:task-material`)] += 1;
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
  // ---- New sect task system (spec Chapter 7) ----
  const sectTaskId = parseSectTaskId(job.actionId);
  if (sectTaskId) {
    const taskTemplate = getSectTaskById(sectTaskId);
    if (!taskTemplate) throw new Error(`Unknown sect task template: ${sectTaskId}`);
    const sect = getCultivatorSect(world, cultivator);
    if (!sect) throw new Error("Sect task requires sect membership.");
    if (!meetsTaskTitleRequirement(cultivator.sectTitle, taskTemplate.minTitle)) {
      throw new Error(`Sect task ${taskTemplate.nameCn} requires title ${taskTemplate.minTitle}, current: ${cultivator.sectTitle}.`);
    }
    const sectLevel = cultivator.sectId ? buildSectLevel(world, cultivator.sectId) : null;
    const resourceBonus = sectBonusValue(sectLevel, "resource");
    const reward = calculateTaskReward(taskTemplate, resourceBonus);
    const previousContribution = cultivator.totalContribution;
    cultivator.spiritStones += reward.spiritStones + ((registration?.sectBonus ?? 0) * 6);
    addCurrentStateReputation(cultivator, reward.reputation + Math.floor((registration?.sectBonus ?? 0) / 3));
    addFactionReputation(cultivator, sect.id, reward.reputation * 2 + Math.floor(resourceBonus / 2));
    applyMoralityDelta(world, cultivator, sect.alignment === "正道" ? 1 : -1, `sect-task:${sectTaskId}`);
    cultivator.totalContribution += reward.contribution;
    if (cultivator.totalContribution > previousContribution) {
      cultivator.contributionReachedAt = world.tick;
    }
    const warProgress = recordFactionWarContribution(world, cultivator, Math.max(10, reward.contribution));
    // Risk effects for high-risk tasks
    if (taskTemplate.riskLevel === "high") {
      const riskRoll = hashString(`${world.tick}:${job.id}:risk`);
      if (riskRoll % 4 === 0) {
        cultivator.qi = clamp(cultivator.qi - 12, 1, cultivator.maxQi);
        cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 3);
        syncWounded(cultivator);
      }
    } else if (taskTemplate.riskLevel === "medium") {
      const riskRoll = hashString(`${world.tick}:${job.id}:risk`);
      if (riskRoll % 6 === 0) {
        cultivator.qi = clamp(cultivator.qi - 6, 1, cultivator.maxQi);
      }
    }
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: taskTemplate.category === "patrol-suppress" ? 4 : 2, intensity: 1 });
    const logCategory = taskTemplate.category === "sect-expedition" ? "宗门专属游历" : "宗门任务";
    addDaoLog(world, cultivator.id, logCategory, `${cultivator.name} 完成了宗门${taskTemplate.tier}级任务「${taskTemplate.nameCn}」，获得贡献 ${reward.contribution}，灵石 ${reward.spiritStones}。`, ["sect", `sect-task-${taskTemplate.category}`, `tier-${taskTemplate.tier}`, "sect-task-log", "sect-contribution-log"]);
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
    return `${cultivator.name} completed sect task: ${taskTemplate.nameCn} (${taskTemplate.tier}).`;
  }
  if (job.actionId === "mine-spirit-stones") {
    const roll = hashString(`${world.tick}:${job.id}`);
    cultivator.spiritStones += 110 + (roll % 80) + ((registration?.mineBonus ?? 0) * 8);
    cultivator.inventory["spirit-ore"] += 1 + (roll % 2) + ((registration?.mineBonus ?? 0) >= 8 ? 1 : 0);
    cultivator.inventory[pickBreakthroughDrop("mystic-jade-stone", `${world.tick}:${job.id}:mine-material`)] += 1;
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
    cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:search-fortune-material`)] += 1;
    // ---- Loadout source drop (search-fortune) ----
    const sfSourceTier = metadata.grade === "丙" ? 1 : metadata.grade === "乙" ? 2 : 3;
    const sfSourceDrop = pickLoadoutSourceDrop(sfSourceTier as 1 | 2 | 3, `${world.tick}:${job.id}:loadout-source`);
    cultivator.inventory[sfSourceDrop] = (cultivator.inventory[sfSourceDrop] ?? 0) + 1;
    addDaoLog(world, cultivator.id, "来源物掉落", `${cultivator.name} 在探索地宫时获得了${ITEM_CATALOG[sfSourceDrop]?.name ?? sfSourceDrop}。`, [sfSourceDrop.startsWith("weapon-") ? "weapon-source" : "spell-source"]);
    return `${cultivator.name} searched the ruins.`;
  }
  if (job.actionId === "hunt-mine-beast" || parseChallengeGuardianRank(job.actionId) !== null) {
    throw new Error("Combat job should resolve through round runtime.");
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
  const combatState = getCombatJobState(job);
  if (combatState && (job.actionId === "hunt-mine-beast" || parseChallengeGuardianRank(job.actionId) !== null)) {
    cultivator.activeJobId = null;
    const outcome = combatState.outcome ?? finalizeCombat(world, cultivator, job, combatState);
    combatState.resolved = true;
    combatState.outcome = outcome;
    setCombatJobState(job, combatState);
    const spCost = job.actionId === "hunt-mine-beast" ? 16 : 24;
    cultivator.spiritualPower = clamp(cultivator.spiritualPower - spCost, 0, cultivator.maxSpiritualPower);

    const totalRounds = combatState.rounds.length;
    const damageTaken = combatState.rounds.reduce(
      (sum, round) => sum + (round.enemyAttack?.damage.finalDamage ?? 0),
      0,
    );
    const retreated = combatState.retreated === true;

    if (job.actionId === "hunt-mine-beast") {
      const baseSeed = `${world.tick}:${job.id}:mine-beast`;
      const encId = combatState.encounterTemplateId;
      // Use the enemy name from the encounter registry, fall back to legacy
      const enemyDisplayName = (() => {
        const cfg = getEnemyConfig(encId as unknown as EnemyConfigId);
        return cfg?.name ?? MINE_BEAST_ENCOUNTER_TEMPLATE.enemyName;
      })();
      if (retreated) {
        addCombatLog(world, {
          cultivatorId: cultivator.id,
          locationId: cultivator.locationId,
          encounterId: encId,
          enemyName: enemyDisplayName,
          outcome: "defeat",
          damageTaken,
          spiritualPowerSpent: 16,
          loot: {},
          summary: `${cultivator.name} retreated from ${enemyDisplayName} after ${totalRounds} rounds.`,
          encounterTemplateId: encId,
          encounterBuildId: combatState.encounterBuildId ?? encId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.playerSnapshot,
          enemySnapshot: combatState.enemySnapshot,
          retreated: true,
        });
        return `${cultivator.name} retreated from ${enemyDisplayName}.`;
      }
      if (outcome === "victory") {
        const spiritOre = 1 + (hashString(`${baseSeed}:loot-spirit-ore`) % 3);
        const spiritStones = 8 + (hashString(`${baseSeed}:loot-spirit-stones`) % 8);
        const beastCoreDrop = (hashString(`${baseSeed}:loot-beast-core`) % 100) < 30 ? 1 : 0;
        cultivator.inventory["spirit-ore"] += spiritOre;
        cultivator.inventory[pickBreakthroughDrop("mystic-jade-stone", `${baseSeed}:mine-beast-material`)] += 1;
        cultivator.spiritStones += spiritStones;
        if (beastCoreDrop > 0) {
          cultivator.inventory["beast-core"] += beastCoreDrop;
        }
        upsertEffect(cultivator, {
          id: "qi-surge",
          name: "Qi Surge",
          description: "Better combat and cultivation.",
          source: "battle",
          remainingTicks: 4,
          intensity: 1,
        });
        addCombatLog(world, {
          cultivatorId: cultivator.id,
          locationId: cultivator.locationId,
          encounterId: encId,
          enemyName: enemyDisplayName,
          outcome,
          damageTaken,
          spiritualPowerSpent: 16,
          loot: {
            "spirit-ore": spiritOre,
            [pickBreakthroughDrop("mystic-jade-stone", `${baseSeed}:mine-beast-material`)]: 1,
            ...(beastCoreDrop > 0 ? { "beast-core": beastCoreDrop } : {}),
          },
          summary: `${cultivator.name} defeated ${enemyDisplayName} in ${totalRounds} rounds.`,
          encounterTemplateId: encId,
          encounterBuildId: combatState.encounterBuildId ?? encId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.playerSnapshot,
          enemySnapshot: combatState.enemySnapshot,
        });
        return `${cultivator.name} defeated ${enemyDisplayName}.`;
      }

      const qiLossPercent = 8 + (hashString(`${baseSeed}:defeat-qi-loss`) % 8);
      const qiLoss = Math.max(1, Math.floor(cultivator.maxQi * (qiLossPercent / 100)));
      cultivator.qi = clamp(cultivator.qi - qiLoss, 1, cultivator.maxQi);
      if ((hashString(`${baseSeed}:defeat-injury`) % 100) < 50) {
        cultivator.injuryTicksRemaining = Math.max(
          cultivator.injuryTicksRemaining,
          Math.max(2, 5 - (registration?.combatGuard ?? 0)),
        );
      }
      syncWounded(cultivator);
      addCombatLog(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        encounterId: encId,
        enemyName: enemyDisplayName,
        outcome,
        damageTaken,
        spiritualPowerSpent: 16,
        loot: {},
        summary: `${cultivator.name} was defeated by ${enemyDisplayName} after ${totalRounds} rounds.`,
        encounterTemplateId: encId,
        encounterBuildId: combatState.encounterBuildId ?? encId,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: combatState.playerSnapshot,
        enemySnapshot: combatState.enemySnapshot,
      });
      return `${cultivator.name} was defeated by ${enemyDisplayName}.`;
    }

    const challengeGuardianRank = parseChallengeGuardianRank(job.actionId);
    if (challengeGuardianRank !== null) {
      const location = world.locations[cultivator.locationId];
      const metadata = dungeonMetadataOf(location);
      if (!location || !metadata) {
        throw new Error("Challenge guardian requires dungeon metadata.");
      }
      const tuning = guardianTuningForDungeon(metadata.grade, challengeGuardianRank);
      const baseSeed = `${world.tick}:${job.id}:ruins-guardian:${metadata.grade}:${challengeGuardianRank}`;
      const guardianEncId = combatState.encounterTemplateId;
      const guardianDisplayName = (() => {
        const cfg = getEnemyConfig(guardianEncId as unknown as EnemyConfigId);
        return cfg ? `${location.name} ${cfg.name}` : `${location.name} Guardian`;
      })();
      if (retreated) {
        addCombatLog(world, {
          cultivatorId: cultivator.id,
          locationId: cultivator.locationId,
          encounterId: guardianEncId,
          enemyName: guardianDisplayName,
          outcome: "defeat",
          damageTaken,
          spiritualPowerSpent: 24,
          loot: {},
          summary: `${cultivator.name} retreated from the guardian of ${location.name}.`,
          encounterTemplateId: guardianEncId,
          encounterBuildId: combatState.encounterBuildId ?? guardianEncId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.playerSnapshot,
          enemySnapshot: combatState.enemySnapshot,
          retreated: true,
        });
        return `${cultivator.name} retreated from the rank ${challengeGuardianRank} guardian of ${location.name}.`;
      }
      if (outcome === "victory") {
        const fragment = tuning.fragmentBase + (hashString(`${baseSeed}:loot-fragment`) % Math.max(1, tuning.fragmentVariance));
        const ward = tuning.wardReward > 0 && (hashString(`${baseSeed}:loot-ward`) % 100) < 60 ? 1 : 0;
        const spiritStones = tuning.spiritStoneBase + (hashString(`${baseSeed}:loot-stones`) % Math.max(1, tuning.spiritStoneVariance));
        cultivator.inventory["ruin-fragment"] += fragment;
        if (ward > 0) {
          cultivator.inventory["ward-talisman"] += ward;
        }
        cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:guardian-material`)] += 1;
        cultivator.spiritStones += spiritStones;
        addRealmProgress(cultivator, tuning.realmProgressReward);
        // ---- Loadout source drop (challenge-guardian victory) ----
        const cgSourceTier = metadata.grade === "丙" ? 1 : metadata.grade === "乙" ? 2 : 3;
        const cgSourceDrop = pickLoadoutSourceDrop(cgSourceTier as 1 | 2 | 3, `${world.tick}:${job.id}:guardian-loadout-source`);
        cultivator.inventory[cgSourceDrop] = (cultivator.inventory[cgSourceDrop] ?? 0) + 1;
        addDaoLog(world, cultivator.id, "来源物掉落", `${cultivator.name} 击败守关后获得了${ITEM_CATALOG[cgSourceDrop]?.name ?? cgSourceDrop}。`, [cgSourceDrop.startsWith("weapon-") ? "weapon-source" : "spell-source"]);
        const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
        if (challengeGuardianRank === highestUnlockedRank) {
          ensureDungeonProgress(cultivator)[metadata.grade].highestClearedRank = Math.max(
            highestClearedRankOf(cultivator, metadata.grade),
            challengeGuardianRank,
          );
        }
        upsertEffect(cultivator, {
          id: "fortune-marked",
          name: "Fortune Marked",
          description: "Better ruins outcomes.",
          source: "guardian",
          remainingTicks: 6,
          intensity: 1,
        });
        addCombatLog(world, {
          cultivatorId: cultivator.id,
          locationId: cultivator.locationId,
          encounterId: guardianEncId,
          enemyName: guardianDisplayName,
          outcome,
          damageTaken,
          spiritualPowerSpent: 24,
          loot: {
            "ruin-fragment": fragment,
            ...(ward > 0 ? { "ward-talisman": ward } : {}),
            [pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:guardian-material`)]: 1,
          },
          summary: `${cultivator.name} broke the guardian seal at ${location.name} rank ${challengeGuardianRank}.`,
          encounterTemplateId: guardianEncId,
          encounterBuildId: combatState.encounterBuildId ?? guardianEncId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.playerSnapshot,
          enemySnapshot: combatState.enemySnapshot,
        });
        addWorldEvent(world, {
          cultivatorId: cultivator.id,
          locationId: cultivator.locationId,
          title: `${location.name} Guardian Broken`,
          content: `${cultivator.name} defeated the ${metadata.grade}${challengeGuardianRank} ${guardianDisplayName} and claimed the sealed reward cache.`,
          severity: "medium",
          tags: ["guardian", location.nodeType, metadata.grade, `rank-${challengeGuardianRank}`, "victory"],
        });
        return `${cultivator.name} defeated the rank ${challengeGuardianRank} guardian of ${location.name}.`;
      }

      const qiLossPercent = 10 + (hashString(`${baseSeed}:defeat-qi-loss`) % 11);
      const qiLoss = Math.max(1, Math.floor(cultivator.maxQi * (qiLossPercent / 100)));
      cultivator.qi = clamp(cultivator.qi - qiLoss, 1, cultivator.maxQi);
      cultivator.injuryTicksRemaining = Math.max(
        cultivator.injuryTicksRemaining,
        Math.max(2, tuning.defeatInjuryTicks - (registration?.combatGuard ?? 0)),
      );
      if ((hashString(`${baseSeed}:defeat-poison`) % 100) < 30) {
        upsertEffect(cultivator, {
          id: "poisoned",
          name: "Poisoned",
          description: "Loses qi each tick.",
          source: "guardian",
          remainingTicks: Math.max(1, tuning.poisonTicks || 2),
          intensity: 1,
        });
      }
      syncWounded(cultivator);
      addCombatLog(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        encounterId: guardianEncId,
        enemyName: guardianDisplayName,
        outcome,
        damageTaken,
        spiritualPowerSpent: 24,
        loot: {},
        summary: `${cultivator.name} was repelled by the guardian of ${location.name}.`,
        encounterTemplateId: guardianEncId,
        encounterBuildId: combatState.encounterBuildId ?? guardianEncId,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: combatState.playerSnapshot,
        enemySnapshot: combatState.enemySnapshot,
      });
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
  }
  // ---- PVP Duel Resolution ----
  if (combatState && job.actionId === "pvp-duel") {
    cultivator.activeJobId = null;
    const outcome = combatState.outcome ?? finalizeCombat(world, cultivator, job, combatState);
    combatState.resolved = true;
    combatState.outcome = outcome;
    setCombatJobState(job, combatState);

    const totalRounds = combatState.rounds.length;
    const damageTaken = combatState.rounds.reduce(
      (sum, round) => sum + (round.enemyAttack?.damage.finalDamage ?? 0),
      0,
    );
    const retreated = combatState.retreated === true;
    const retreatingSide = combatState.retreatingSide ?? "player";
    const targetId = combatState.pvpTargetCultivatorId;
    const target = targetId ? world.cultivators[targetId] : null;
    const targetName = target?.name ?? "Unknown";
    const pvpBattleKind = combatState.pvpBattleKind ?? "city-duel";
    const isCityDuel = pvpBattleKind === "city-duel";
    const baseSeed = `${world.tick}:${job.id}:pvp`;

    // Helper to add combat log for both sides
    const pvpEncounterBuildId = combatState.encounterBuildId ?? "pvp-city-duel";
    const addPvpLog = (cId: string, locId: string, opp: string, oppId: string | undefined, result: "victory" | "defeat", dmg: number, lootMap: Partial<Record<ItemId, number>>, summary: string, isRetreated: boolean) => {
      addCombatLog(world, {
        cultivatorId: cId,
        locationId: locId,
        encounterId: pvpEncounterBuildId,
        enemyName: opp,
        outcome: result,
        damageTaken: dmg,
        spiritualPowerSpent: 0,
        loot: lootMap,
        summary,
        encounterTemplateId: pvpEncounterBuildId,
        encounterBuildId: pvpEncounterBuildId,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: combatState.playerSnapshot,
        enemySnapshot: combatState.enemySnapshot,
        retreated: isRetreated || undefined,
        pvpOpponentCultivatorId: oppId,
        pvpOpponentName: opp,
        pvpBattleKind: pvpBattleKind,
      });
    };

    const enemyDamageTaken = combatState.rounds.reduce(
      (sum, round) => sum + (round.playerAttack?.damage.finalDamage ?? 0),
      0,
    );

    if (retreated) {
      if (retreatingSide === "enemy") {
        if (isCityDuel) {
          cultivator.spiritStones += 8;
          if (target) {
            target.spiritStones = Math.max(0, target.spiritStones - 3);
          }
        }
        addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, {}, `${cultivator.name} won — ${targetName} retreated from the duel.`, false);
        if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} retreated from the duel with ${cultivator.name}.`, true);
        return `${targetName} retreated from the duel with ${cultivator.name}.`;
      }
      if (isCityDuel) {
        cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 8);
        addCurrentStateReputation(cultivator, -1);
        if (target) target.spiritStones += 5;
      }
      addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} retreated from the duel with ${targetName}.`, true);
      if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "victory", enemyDamageTaken, isCityDuel ? { "spirit-stone-reward": 5 } as Partial<Record<ItemId, number>> : {}, `${targetName} won — ${cultivator.name} retreated.`, false);
      return `${cultivator.name} retreated from the duel with ${targetName}.`;
    }

    if (outcome === "victory") {
      // Challenger wins
      if (isCityDuel) {
        cultivator.spiritStones += 15;
        addCurrentStateReputation(cultivator, 2);
        if (target) target.spiritStones = Math.max(0, target.spiritStones - 5);
      }
      addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, isCityDuel ? {} : {}, `${cultivator.name} defeated ${targetName} in a duel (${totalRounds} rounds).`, false);
      if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} was defeated by ${cultivator.name} in a duel.`, false);
      if (targetId) addMutualAffinity(world, cultivator.id, targetId, AFFINITY_GAINS.pvpDuel);
      return `${cultivator.name} defeated ${targetName} in a duel.`;
    }

    if (outcome === "defeat") {
      // Challenger loses
      if (isCityDuel) {
        cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 10);
        if (target) {
          target.spiritStones += 10;
          addCurrentStateReputation(target, 1);
        }
      }
      addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} was defeated by ${targetName} in a duel (${totalRounds} rounds).`, false);
      if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "victory", enemyDamageTaken, {}, `${targetName} defeated ${cultivator.name} in a duel.`, false);
      if (targetId) addMutualAffinity(world, cultivator.id, targetId, AFFINITY_GAINS.pvpDuel);
      return `${cultivator.name} was defeated by ${targetName} in a duel.`;
    }

    // Draw (rounds exhausted)
    addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} fought ${targetName} to a draw (${totalRounds} rounds).`, false);
    if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} fought ${cultivator.name} to a draw.`, false);
    // PVP duel grows mutual affinity regardless of outcome
    if (targetId) addMutualAffinity(world, cultivator.id, targetId, AFFINITY_GAINS.pvpDuel);
    return `${cultivator.name} fought ${targetName} to a draw.`;
  }
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
  // ---- Enhanced resolver for new sect tasks ----
  const enhancedSectTaskId = parseSectTaskId(job.actionId);
  if (enhancedSectTaskId) {
    const summary = resolveJob(world, job);
    const tpl = getSectTaskById(enhancedSectTaskId);
    // Bonus: expedition tasks may grant extra items
    if (tpl?.category === "sect-expedition" && hashString(`${world.tick}:${job.id}:exp-bonus`) % 4 === 0) {
      cultivator.inventory["ruin-fragment"] += 1;
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "宗门游历收获", content: `${cultivator.name} 在宗门专属游历中意外发现了遗迹碎片。`, severity: "medium", tags: ["event", "sect", "expedition", "bonus"] });
    }
    // Bonus: patrol tasks may grant talisman
    if (tpl?.category === "patrol-suppress" && hashString(`${world.tick}:${job.id}:patrol-bonus`) % 3 === 0) {
      cultivator.inventory["ward-talisman"] += 1;
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "宗门赏赐", content: "宗门额外赏赐了一张护身符以酬谢你在巡查中的出色表现。", severity: "medium", tags: ["event", "sect", "patrol", "bounty"] });
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
    cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:enhanced-search-material`)] += 1;
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
  // ---- Wilderness PVP Combat Resolution ----
  if (combatState && job.actionId === "survey-wilderness") {
    cultivator.activeJobId = null;
    const outcome = combatState.outcome ?? finalizeCombat(world, cultivator, job, combatState);
    combatState.resolved = true;
    combatState.outcome = outcome;
    setCombatJobState(job, combatState);

    const totalRounds = combatState.rounds.length;
    const damageTaken = combatState.rounds.reduce(
      (sum, round) => sum + (round.enemyAttack?.damage.finalDamage ?? 0),
      0,
    );
    const enemyDamageTaken = combatState.rounds.reduce(
      (sum, round) => sum + (round.playerAttack?.damage.finalDamage ?? 0),
      0,
    );
    const retreated = combatState.retreated === true;
    const retreatingSide = combatState.retreatingSide ?? "player";
    const targetId = combatState.pvpTargetCultivatorId;
    const target = targetId ? world.cultivators[targetId] : null;
    const targetName = target?.name ?? combatState.enemySnapshot?.maxHp ? "散修" : "Unknown";
    const wBuildId = combatState.encounterBuildId ?? "pvp-wilderness-clash";

    const addWildPvpLog = (cId: string, locId: string, opp: string, oppId: string | undefined, result: "victory" | "defeat", dmg: number, lootMap: Partial<Record<ItemId, number>>, summary: string, isRetreated: boolean) => {
      addCombatLog(world, {
        cultivatorId: cId,
        locationId: locId,
        encounterId: wBuildId,
        enemyName: opp,
        outcome: result,
        damageTaken: dmg,
        spiritualPowerSpent: 0,
        loot: lootMap,
        summary,
        encounterTemplateId: wBuildId,
        encounterBuildId: wBuildId,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: combatState.playerSnapshot,
        enemySnapshot: combatState.enemySnapshot,
        retreated: isRetreated || undefined,
        pvpOpponentCultivatorId: oppId,
        pvpOpponentName: opp,
        pvpBattleKind: "wilderness-clash",
      });
    };

    if (retreated) {
      if (retreatingSide === "enemy") {
        cultivator.spiritStones += 10;
        if (target) {
          target.spiritStones = Math.max(0, target.spiritStones - 5);
          target.injuryTicksRemaining = Math.max(target.injuryTicksRemaining, 1);
        }
        addWildPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, {}, `${targetName} retreated from ${cultivator.name} in the wilderness.`, false);
        if (target) addWildPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} retreated from ${cultivator.name} in the wilderness.`, true);
        return `${targetName} retreated from ${cultivator.name} in the wilderness.`;
      }
      cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 5);
      cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 1);
      if (target) target.spiritStones += 10;
      addWildPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} retreated from ${targetName} in the wilderness.`, true);
      if (target) addWildPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "victory", enemyDamageTaken, {}, `${targetName} won — ${cultivator.name} retreated.`, false);
      return `${cultivator.name} retreated from ${targetName} in the wilderness.`;
    }

    if (outcome === "victory") {
      cultivator.spiritStones += 20;
      cultivator.inventory["beast-core"] = (cultivator.inventory["beast-core"] ?? 0) + 1;
      if (target) {
        target.spiritStones = Math.max(0, target.spiritStones - 15);
        target.injuryTicksRemaining = Math.max(target.injuryTicksRemaining, 2);
      }
      addWildPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, { "beast-core": 1 }, `${cultivator.name} defeated ${targetName} in the wilderness (${totalRounds} rounds).`, false);
      if (target) addWildPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} was defeated by ${cultivator.name} in the wilderness.`, false);
      return `${cultivator.name} defeated ${targetName} in the wilderness.`;
    }

    if (outcome === "defeat") {
      cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 15);
      cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 2);
      if (target) {
        target.spiritStones += 20;
        target.inventory["beast-core"] = (target.inventory["beast-core"] ?? 0) + 1;
      }
      addWildPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} was defeated by ${targetName} in the wilderness (${totalRounds} rounds).`, false);
      if (target) addWildPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "victory", enemyDamageTaken, { "beast-core": 1 }, `${targetName} defeated ${cultivator.name} in the wilderness.`, false);
      return `${cultivator.name} was defeated by ${targetName} in the wilderness.`;
    }

    // Draw
    cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 1);
    if (target) target.injuryTicksRemaining = Math.max(target.injuryTicksRemaining, 1);
    addWildPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} fought ${targetName} to a draw in the wilderness.`, false);
    if (target) addWildPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} fought ${cultivator.name} to a draw.`, false);
    return `${cultivator.name} fought ${targetName} to a draw in the wilderness.`;
  }
  return resolveJob(world, job);
}

export function performAction(world: WorldState, cultivatorId: string, actionId: ActionId): ActionExecutionResult {
  ensureOptionalProgressMaps(world);
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
          breakthroughGenericMaterials: definition.genericMaterials,
          breakthroughSpecialMaterial: definition.specialMaterial,
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
  const enterDungeon = parseEnterDungeonActionId(actionId);
  const searchFortuneRank = parseSearchFortuneRank(actionId);
  const challengeGuardianRank = parseChallengeGuardianRank(actionId);
  if (travelDestination || executeQuestId || exploreGuixuNodeId || startDungeonExpedition || enterDungeon || searchFortuneRank || challengeGuardianRank || parseSectTaskId(actionId) || TIMED_ACTION_IDS.has(actionId)) {
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
      const surveyResult = startJob(world, cultivator, actionId as TimedActionId, `Survey ${layer.name}`, {
        wildernessLayerId: layer.layerId,
        wildernessEventId: eventId,
      });
      // Detect PVP wilderness event and attach combat state
      const wildernessEvt = getWildernessEventDefinition(eventId);
      if (wildernessEvt?.encounterBuildId?.startsWith("pvp-") && surveyResult.job) {
        const opponent = matchWildernessOpponent(world, cultivator, hashString(`${world.tick}:${cultivator.id}:pvp-match`));
        const opponentSnapshot = opponent
          ? buildCultivatorCombatSnapshot(opponent, true)
          : scaleRogueCultivator(cultivator);
        const opponentName = opponent?.name ?? "散修";
        const pvpTemplate: EncounterTemplate = {
          id: wildernessEvt.encounterBuildId!,
          enemyName: opponentName,
          maxRounds: 7,
          stylePreference: ["finesse", "tactic", "brute"],
          baseHp: opponentSnapshot.maxHp,
          attack: opponentSnapshot.attack,
          defense: opponentSnapshot.defense,
          speed: opponentSnapshot.speed,
          hit: opponentSnapshot.hit,
          dodge: opponentSnapshot.dodge,
          crit: opponentSnapshot.crit,
          critDamage: opponentSnapshot.critDamage,
          guardHeart: opponentSnapshot.guardHeart,
          escapeAllowed: true,
          spirit: opponentSnapshot.spirit,
          maxSpirit: opponentSnapshot.maxSpirit,
        };
        const pvpCombat = initializeCombatJobState(world, cultivator, pvpTemplate, 1, wildernessEvt.encounterBuildId!);
        pvpCombat.enemySnapshot = opponentSnapshot;
        pvpCombat.pvpTargetCultivatorId = opponent?.id;
        pvpCombat.pvpBattleKind = "wilderness-clash";
        setCombatJobState(surveyResult.job, pvpCombat);
      }
      return surveyResult;
    }
    // ---- Dual Survey Wilderness (同行历练) ----
    if (actionId === "dual-survey-wilderness") {
      const partner = getPartyPartner(world, cultivator.id);
      if (!partner) throw new Error("同行历练 requires being in a party.");
      if (partner.activeJobId) throw new Error("Party partner is currently busy.");
      const progress = getActiveWildernessProgress(world, cultivator.id);
      if (!progress) throw new Error("同行历练 requires an active wilderness expedition.");
      const layer = getWildernessLayerById(world, progress.layerId);
      if (!layer) throw new Error(`Wilderness layer not found: ${progress.layerId}`);
      const taskSeed = `${world.tick}:${cultivator.id}:${partner.id}:dual-wilderness`;
      const task = pickDualWildernessTask(taskSeed);
      const dualMeta = { dualTaskId: task.id, wildernessLayerId: progress.layerId };
      startJob(world, cultivator, "dual-survey-wilderness" as TimedActionId, `同行历练：${task.nameCn}`, {
        ...dualMeta, dualPartnerId: partner.id, dualRole: "initiator" as const,
      });
      startJob(world, partner, "dual-survey-wilderness" as TimedActionId, `同行历练：${task.nameCn}`, {
        ...dualMeta, dualPartnerId: cultivator.id, dualRole: "partner" as const,
      });
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} and ${partner.name} started dual wilderness task: ${task.nameCn}.` };
    }
    // ---- Dual Cultivate (同行修炼) ----
    if (actionId === "dual-cultivate") {
      const partner = getPartyPartner(world, cultivator.id);
      if (!partner) throw new Error("同行修炼 requires being in a party.");
      if (partner.activeJobId) throw new Error("Party partner is currently busy.");
      const party = getPartyOf(world, cultivator.id)!;
      const leader = world.cultivators[party.leaderId]!;
      if (cultivator.locationId !== leader.residence.locationId) throw new Error("同行修炼 must be at the party leader's residence location.");
      if (partner.locationId !== leader.residence.locationId) throw new Error("Party partner must also be at the leader's residence location.");
      startJob(world, cultivator, "dual-cultivate" as TimedActionId, "同行修炼", {
        dualPartnerId: partner.id, dualRole: "initiator" as const,
      });
      startJob(world, partner, "dual-cultivate" as TimedActionId, "同行修炼", {
        dualPartnerId: cultivator.id, dualRole: "partner" as const,
      });
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} and ${partner.name} started dual cultivation.` };
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
    if (startDungeonExpedition || enterDungeon) {
      const metadata = dungeonMetadataOf(location);
      if (!metadata) {
        throw new Error("Action only available in dungeons.");
      }
      if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
        throw new Error(`Dungeon tier requires ${metadata.minRealm} realm access.`);
      }
      const parsedExpedition = startDungeonExpedition
        ? {
            rank: startDungeonExpedition.rank,
            policy: startDungeonExpedition.policy,
            strategy: strategyFromPolicy(startDungeonExpedition.policy),
          }
        : {
            rank: enterDungeon!.rank,
            policy: enterDungeon!.posture,
            strategy: strategyFromPolicy(enterDungeon!.posture),
          };
      const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
      if (parsedExpedition.rank > highestUnlockedRank) {
        throw new Error(`Dungeon rank ${parsedExpedition.rank} is not unlocked.`);
      }
      const started = startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        `Dungeon expedition rank ${parsedExpedition.rank}`,
        {
          dungeonGrade: metadata.grade,
          dungeonRank: parsedExpedition.rank,
          dungeonExpeditionPolicy: parsedExpedition.policy,
          dungeonExpeditionTargetRank: parsedExpedition.rank,
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
        targetRank: parsedExpedition.rank,
        policy: parsedExpedition.policy,
        strategy: parsedExpedition.strategy,
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
      if (challengeGuardianRank !== null) {
        const cgStartSeed = hashString(`${world.tick}:${cultivator.id}:guardian-encounter:${metadata.grade}:${challengeGuardianRank}`);
        const cgStartEncounter = resolveGuardianEncounterTemplate(cgStartSeed);
        const jobResult = startJob(
          world,
          cultivator,
          actionId as TimedActionId,
          `Challenge guardian rank ${selectedRank}`,
          {
            dungeonGrade: metadata.grade,
            dungeonRank: selectedRank,
          },
          cgStartEncounter.template.maxRounds,
        );
        if (!jobResult.job) {
          throw new Error("Guardian combat job was not created.");
        }
        const combatState = initializeCombatJobState(
          world,
          cultivator,
          cgStartEncounter.template,
          guardianCombatScale(metadata.grade, challengeGuardianRank),
          cgStartEncounter.buildId ?? undefined,
        );
        setCombatJobState(jobResult.job, combatState);
        return jobResult;
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
    if (actionId === "hunt-mine-beast") {
      const huntSeed = hashString(`${world.tick}:${cultivator.id}:hunt-encounter`);
      const encounter = resolveWildernessEncounterTemplate(huntSeed);
      const jobResult = startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        actionId,
        undefined,
        encounter.template.maxRounds,
      );
      if (!jobResult.job) {
        throw new Error("Mine beast combat job was not created.");
      }
      const combatState = initializeCombatJobState(world, cultivator, encounter.template, 1, encounter.buildId ?? undefined);
      setCombatJobState(jobResult.job, combatState);
      return jobResult;
    }
    if (actionId === "take-mortal-task" && location.kind !== "safe") throw new Error("Action only available in safe settlements.");
    if (actionId === "take-sect-errand") {
      const sect = getCultivatorSect(world, cultivator);
      if (!sect || cultivator.locationId !== sect.headquarters) {
        throw new Error("Sect errand requires sect membership at the sect outpost.");
      }
    }
    // ---- New sect task validation ----
    const parsedSectTask = parseSectTaskId(actionId);
    if (parsedSectTask) {
      const sect = getCultivatorSect(world, cultivator);
      if (!sect || cultivator.locationId !== sect.headquarters) {
        throw new Error("Sect task requires sect membership at the sect outpost.");
      }
      const taskTpl = getSectTaskById(parsedSectTask);
      if (!taskTpl) throw new Error(`Unknown sect task: ${parsedSectTask}`);
      if (!meetsTaskTitleRequirement(cultivator.sectTitle, taskTpl.minTitle)) {
        throw new Error(`Sect task requires title ${taskTpl.minTitle}; current title: ${cultivator.sectTitle}.`);
      }
      return startJob(world, cultivator, actionId as TimedActionId, `sect-task:${taskTpl.nameCn}`, undefined, taskTpl.durationTicks);
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
  ensureOptionalProgressMaps(world);
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
      advanceBahuangExpedition(world, cultivator);
      // PVP challenge auto-expiry
      if (cultivator.pendingPvpChallengeId) {
        const pvpChallenge = world.pendingPvpChallenges[cultivator.pendingPvpChallengeId];
        if (!pvpChallenge || world.tick >= pvpChallenge.expiresAtTick) {
          if (pvpChallenge) {
            const pvpChallenger = world.cultivators[pvpChallenge.challengerCultivatorId];
            if (pvpChallenger) {
              addMessage(world, pvpChallenger.id, "切磋超时", "挑战取消", `对${cultivator.name}的切磋挑战已超时取消。`);
            }
            addMessage(world, cultivator.id, "切磋超时", "挑战取消", `${world.cultivators[pvpChallenge.challengerCultivatorId]?.name ?? "某人"}的切磋挑战已超时取消。`);
            delete world.pendingPvpChallenges[cultivator.pendingPvpChallengeId];
          }
          cultivator.pendingPvpChallengeId = null;
        }
      }
    }
    // ---- Social: Co-location passive affinity growth ----
    if (world.tick % CO_LOCATION_AFFINITY_INTERVAL === 0) {
      const locationGroups = new Map<string, string[]>();
      for (const c of Object.values(world.cultivators)) {
        if (c.activeJobId) continue; // only idle cultivators
        const loc = world.locations[c.locationId];
        if (!loc || loc.kind !== "safe") continue;
        const group = locationGroups.get(c.locationId) ?? [];
        group.push(c.id);
        locationGroups.set(c.locationId, group);
      }
      for (const group of locationGroups.values()) {
        if (group.length < 2) continue;
        for (let a = 0; a < group.length; a++) {
          for (let b = a + 1; b < group.length; b++) {
            const existing = getSocialLink(world, group[a]!, group[b]!);
            if (existing && existing.affinity > 0) {
              addMutualAffinity(world, group[a]!, group[b]!, AFFINITY_GAINS.coLocationPassive);
            }
          }
        }
      }
    }
    // ---- Social: Dao companion proposal auto-expiry ----
    if (world.daoCompanionProposals) {
      for (const [proposalId, proposal] of Object.entries(world.daoCompanionProposals)) {
        if (world.tick >= proposal.expiresAtTick) {
          const proposerName = world.cultivators[proposal.fromCultivatorId]?.name ?? "unknown";
          addMessage(world, proposal.fromCultivatorId, "道侣之约", "道侣申请超时", `对${world.cultivators[proposal.toCultivatorId]?.name ?? "某人"}的道侣申请已超时取消。`);
          delete world.daoCompanionProposals[proposalId];
        }
      }
    }
    // ---- Party invitation auto-expiry ----
    if (world.partyInvitations) {
      for (const [invId, inv] of Object.entries(world.partyInvitations)) {
        if (world.tick >= inv.expiresAtTick) {
          addMessage(world, inv.fromCultivatorId, "组队", "邀请超时", `对${world.cultivators[inv.toCultivatorId]?.name ?? "某人"}的组队邀请已超时取消。`);
          delete world.partyInvitations[invId];
        }
      }
    }
    for (const job of Object.values(world.jobs)) {
      job.remainingTicks -= 1;
      const combatState = getCombatJobState(job);
      if (combatState && !combatState.resolved) {
        const cultivator = world.cultivators[job.cultivatorId];
        if (cultivator) {
          resolveOneRound(combatState, world, job, cultivator);
          setCombatJobState(job, combatState);
          if (combatState.resolved) {
            job.remainingTicks = 0;
          }
        }
      }
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

      if (job.remainingTicks > 0 && !(combatState?.resolved)) {
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
