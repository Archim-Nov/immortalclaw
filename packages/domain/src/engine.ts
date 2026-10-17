import type {
  AgentBinding, AgentPersonaSyncResult, ActionExecutionResult, ActionId, ActionJob, AvailableAction, CharacterSummary,
  BreakthroughCategory, BreakthroughMaterialSourceView, BreakthroughRateModifier, BreakthroughRecord, BreakthroughStateView,
  CombatLogEntry, CultivationRegistrationRecord, CultivationRegistrationView, Cultivator, CultivatorStateView,
  CreateCultivatorInput, DecisionPolicyView, DungeonBeat, DungeonExpeditionProgress, DungeonExpeditionReport, DungeonExpeditionStateView, DungeonGrade, DungeonRank, DungeonRankYieldHint, DungeonStateView, EventEffect, FiveElementId, ItemId, Message, RealmPhase, RegistrationAnswer,
  MoralityAlignment, PendingMoralityChoiceResponse, PlayerSectFoundingBlockerCode, PlayerSectFoundingOptionsView,
  FoundPlayerSectResult, NeutralSect, OrganizationInfoView, PlayerSectApplicationResult,
  ResolveMoralityChoiceResult,
  PlayerSectRecruitmentListView, RegistrationGameplayEffectsView, RegistrationGameplayModifierView,
  ReviewSectApplicationResult, Sect, SectAdmissionPolicy, SectApplication, SectApplicationListView,
  SectApplicationView, SectMotiveBucketId, SectReapplyCooldown, SectTitle, StatusEffect, TimedActionId,
  StrategySnapshot, TickSummary, UpdateSectAdmissionPolicyResult, WorldEvent, WorldState, OnboardingProgress,
  OnboardingStage, RegistrationCultivationMotiveId, ResidenceActionId, RegistrationQuestionId,
  CombatStyle, CombatJobState, CombatSnapshot, CombatRoundLog, CombatDamageBreakdown, EncounterTemplate, AttackResult, CombatActionType, EscapeResolution, AttackChannel, PartyRoleId,
  WeaponLoadoutId, SpellLoadoutId, WeaponLoadoutDefinition, SpellLoadoutDefinition,
  CombatStatusId, CombatStatusInstance, StatusHookId, SpellTier, StatusEffectId, StatusEffectKind, StatusTargetSide,
  PendingPvpChallenge, PvpBattleKind,
  ProductionQueueEntry,
  MessageTemplateKind, PendingGift, PendingHelpRequest, Commission, CommissionType, LocationBoardNote,
  ResourceUsageSummary, SpiritStoneUsageSummary,
} from "./model.js";
import { PRODUCTION_QUEUE_MAX_LENGTH } from "./model.js";
import {
  deriveMainAttributes,
  deriveDetailedAttributes,
  weaponAttack,
  physicalDefense,
  spellAttack,
  spellDefense,
  BREAKTHROUGH_GROWTH_TABLE,
  computeEffectiveFiveElementScores,
  computeEffectiveMainAttributes,
  createEmptyMainAttributeGrowth,
  distributeMainAttributeGrowth,
  distributeFiveElementGrowth,
  extractFiveElementScores,
  MAIN_ATTRIBUTE_ORDER,
} from "./attributes.js";
import {
  DEFAULT_ACTION_DURATIONS,
  MAX_ACTIVE_BASE_QUESTS,
  MAX_ACTIVE_SECT_QUESTS,
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
import { jiaDungeonSideEvents, jiaScenePack } from "./events/content/jia-scene-choices.js";
import {
  jiaChoiceLine,
  jiaClosingDrop,
  jiaHaulForOption,
  jiaHaulSummaryClause,
  jiaTemperamentForRank,
} from "./jia-temperament.js";
import { realmLabelForLevel, repairCultivatorRealm, realmStageForLevel } from "./realms.js";
import {
  abovePlaceMatches,
  aboveRiteForAction,
  aboveRiteForLevel,
  aboveSpiritDefinition,
  aboveTravelNode,
  type AboveRite,
} from "./above-spirit.js";
import {
  breakthroughMethodIdForLevel,
  breakthroughMethodNarrative,
  quietMethodStep,
} from "./breakthrough-methods.js";
import {
  breakthroughDropPool,
  isRiskyLateMajor,
  rankBandForRealmLevel,
  realmPathView,
  vitalGainForBreakthrough,
} from "./realm-path.js";
import { GameplayRejection } from "./gameplay-error.js";
import { openSpokenLine, type SpeechKind } from "./spoken-lines.js";
import { describeMood, noteSpam, pushTravelNote, settledMoment, spamRewardMultiplier, travelNote } from "./travelogue.js";
import {
  bondArcOf,
  buildCultivatorDigest,
  currentMood,
  GRUDGE_FROM_DRAW,
  GRUDGE_FROM_DUEL,
  GRUDGE_FROM_REJECTION,
  grudgeArcOf,
  moodCauseForDuel,
  noteWound,
  recordLife,
  recordSpokenEcho,
  spreadNearbyGossip,
  SHARE_RESOURCE_COOLDOWN_TICKS,
  SHARE_RESOURCE_MINIMUM,
  SHARE_RESOURCE_STONES,
  shiftCultivatorMood,
  SPAR_TEACH_COOLDOWN_TICKS,
  SPAR_TEACH_PRACTICE,
  SPAR_TEACH_SPIRIT,
} from "./inner-life.js";
import { expireSocialDeepen, listSocialDeepenActions, noteArrivalReunion, performSocialDeepenAction, socialDeepenView } from "./social-deepen.js";
import { answerSectDutyScene, holdSectDutyScene, listSectSceneActions } from "./sect-duty-scenes.js";
import {
  beginSectTimed,
  buildSectLifeView,
  clearSectPost,
  ensureSpiritVeins,
  grantSectMerit,
  isSectTimedAction,
  listSectLifeActions,
  performSectImmediate,
  resolveSectTimed,
  sameSectBond,
  sectLifeGuidance,
  settleVeinYields,
} from "./sect-life.js";
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
  PARTY_ROLE_IDS,
  PARTY_ROLE_LABEL,
  SKILL_SLOT_LIMIT,
  combatLeaningView,
  grantCombatPractice,
  legalPartyRoles,
  listCombatSkillViews,
  listNextUnlocks,
  listResolvedSkills,
  loadoutGuidanceFor,
  partyRoleForCultivator,
  skillContextOf,
  skillsForCultivator,
  applyBreakthroughInsight,
} from "./combat-skills.js";
import {
  bandForTier,
  dungeonSourceTier,
  gearOffer,
  nextGearViews,
  preferredHighTierDrop,
  purchaseNextGear,
  tierAllowed,
} from "./combat-content.js";
import {
  cultivationAidForLevel,
  cultivationDropForRank,
  mysteryEntry,
} from "./high-realm.js";
import { chronicleRelic, jiaRelicByItemId, jiaRelicsHeld } from "./jia-relics.js";
import {
  dungeonAdvice,
  jiaBandFailCost,
  jiaDirectEncounterScale,
  stampJiaGuardianTemplate,
} from "./high-realm-dungeon.js";
import { lightFailCost, lightPlaceName } from "./yi-mystery.js";
import {
  assertRegionalEntry,
  completeRegionalJob,
  leaveRegionalRun,
  listRegionalChoiceActions,
  listRegionalEnterActions,
  openRegionalRun,
  regionalCraftStoneCost,
  regionalGateClause,
  regionalGuidanceHint,
  releaseRegionalJob,
  spendRegionalCraftFiber,
  submitRegionalChoice,
  takeRegionalMeditationAid,
  tickRegionalRun,
  viewRegionalDungeons,
} from "./regional-dungeons.js";
import {
  bahuangBandForDepth,
  huntSentence,
  noteWild,
  wildPlaceForState,
  wildRouteFromBand,
  wildRouteFromPlace,
} from "./wild-places.js";
import { buildGuardianPack, companionWoundTicks, fightDigestText, runPartyBattle, woundTicksForGuardian, type BattleCombatant, type PartyBattleResult } from "./party-battle.js";
import {
  acceptQuest,
  buildAcceptQuestActionId,
  buildExecuteQuestActionId,
  questFacingDescription,
  questFacingName,
  getActiveQuest,
  getActiveQuestByReadableIndex,
  getQuestBoard,
  markQuestInProgress,
  parseQuestActionId,
  refreshQuestBoardsIfDue,
  resolveActiveQuest,
  updateSectTitles,
  updateSectTitlesIfDue,
} from "./quest.js";
import { facingPersonName } from "./facing-names.js";
import {
  createResidenceForState,
  getActiveResidence,
  getFirstCraftableResidenceRecipe,
  getLiveCraftableRecipes,
  getResidenceCatalogEntry,
  getResidenceRecipeById,
  hasResidenceInState,
  isAtResidence,
  requireResidenceActionAllowed,
  residencePriceForState,
} from "./residence.js";
import {
  buildResidenceContext,
  describeResidenceAction,
  describeResidenceScene,
  getRecentResidenceAmbientEventsForResidence,
  pickResidenceAmbientEvent,
} from "./residence-context.js";
import {
  applyClearFixture,
  applyFixture,
  applyUpgrade,
  benefitsOf,
  buildOwnedResidenceView,
  claimCaveReputation,
  discountedSpiritCost,
  fixtureFamily,
  fixtureOffers,
  fixtureSlotCount,
  fixtureViews,
  hostReady,
  hostSpokenLine,
  hostTeaCost,
  HOST_AFFINITY_BASE,
  meditateProgressBonus,
  nearbyHomeLine,
  placedFixtures,
  residenceGlance,
  residenceTierName,
  stampHost,
  upgradeQuote,
  withResidence,
} from "./residence-grandeur.js";
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
  behaviorAspectDescription,
  behaviorAspectLabel,
  motiveDescription,
  motiveLabel,
  registrationLocaleOf,
  resolveCultivationMotiveId,
  resolveSpiritRootKindId,
  spiritRootDescription,
  temperamentDescription,
  temperamentLabel,
  resolveTemperamentId,
  deriveSpiritRootKindId,
  sortedElementEntries,
} from "./registration-taxonomy.js";
import { buildRegistrationProfile } from "./registration-questionnaire.js";
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
  CHAT_UP_COOLDOWN_TICKS,
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
  addMutualGrudge,
  forgiveOneFavor,
  grantOwedFavor,
  listOwedFavorViews,
  repaymentQuote,
  markRival,
  rememberCityDuel,
  rememberGiftExchange,
  HELP_STONE_GIFT,
  PENDING_HELP_LIMIT,
  BOARD_NOTE_LIMIT,
  describeArcLine,
  describeSocialBond,
  disbandParty,
  getAffinityLevel,
  getCultivatorsAtLocation,
  getDaoCompanionId,
  getDualWildernessTaskById,
  getFriendsAtLevel,
  getOrCreateSocialLink,
  getPartyMembers,
  findReserveParty,
  getPartyOf,
  getPartyPartner,
  PARTY_MAX_MEMBERS,
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
  dungeonPostureLabel,
  enterDungeonActionIdOf,
  DUNGEON_EXPEDITION_DURATION_TICKS,
  DUNGEON_EXPEDITION_MAX_STEPS,
  DUNGEON_EXPEDITION_STEP_TICKS,
  getActiveDungeonExpedition,
  isAbortDungeonExpeditionAction,
  dangerousDungeonExit,
  maybeCreateDungeonWakeNode,
  chooseDefaultDungeonWakeOptionId,
  settleDungeonWakeNode,
  appendDungeonBeats,
  flushDungeonSighting,
  carriedClause,
  withCarriedLine,
  parseEnterDungeonActionId,
  parseStartDungeonExpeditionActionId,
  recordDungeonExpeditionStep,
  expeditionPressureFor,
  shouldRetreatDungeonExpedition,
  strategyFromPolicy,
} from "./dungeon-expedition-service.js";
import { interiorRoomBeat, resolveInteriorSkirmish } from "./dungeon-interior.js";
import {
  createPartyExpeditionWake,
  partyWakeAwaitingIds,
  partyWakeIsReady,
  partyWakePublicFields,
  partyWakeResolvedOption,
  publishPartyExpeditionMemories,
  recordPartyWakeVote,
  resolvePartyExpeditionWake,
} from "./party-expedition-social.js";
import {
  advanceBahuangExpedition,
  buildBahuangStateView,
  canEnterBahuang,
  enterBahuangExpedition,
  resolveBahuangWakeDecision,
  retreatFromBahuang,
} from "./bahuang-service.js";
import { pickLoadoutSourceDrop } from "./loadout-sourcing.js";
import { LOADOUT_SOURCE_ITEMS } from "./items/loadout-source-items.js";
import {
  buildRecipeReverseIndex,
  buildBreakthroughReverseIndex,
  buildItemUsageSummary,
  buildSpiritStoneUsageSummary,
  type BreakthroughLevelEntry,
} from "./resource-usage.js";

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

function pickBreakthroughDrop(bandKey: ItemId, seed: string, rank = 1): ItemId {
  const pool = breakthroughDropPool(bandKey, rank);
  return pool[hashString(seed) % pool.length]!;
}
const REALM_ORDER = {
  炼气: 0,
  筑基: 1,
  金丹: 2,
  元婴: 3,
  化神: 4,
  炼虚: 5,
  合体: 6,
  大乘: 7,
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
  const baselineMainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const mainAttrs = computeEffectiveMainAttributes(
    baselineMainAttrs,
    cultivator.mainAttributeGrowth ?? createEmptyMainAttributeGrowth(),
    cultivator.mainAttributePercentageBonus ?? 0,
  );
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
    initialPlayerSnapshot: structuredClone(playerSnapshot),
    initialEnemySnapshot: structuredClone(enemySnapshot),
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
    playerStatusEffectsBefore: structuredClone(cultivator.statusEffects),
    enemyStatusEffectsBefore: [],
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
const parseExploreGuixuNode = (actionId: ActionId) => actionId.startsWith("explore-guixu:") ? actionId.slice("explore-guixu:".length) : null;
const parseResidenceOption = (actionId: ActionId, prefix: string) => actionId.startsWith(prefix) ? actionId.slice(prefix.length) : null;
const parseBuyResidenceStateId = (actionId: ActionId) => actionId.startsWith("buy-residence:") ? actionId.slice("buy-residence:".length) : null;
const parseBahuangWakeDecision = (actionId: ActionId | string): string | null =>
  actionId.startsWith("bahuang-wake-decision:") ? actionId.slice("bahuang-wake-decision:".length) : null;
const parseDungeonWakeDecision = (actionId: ActionId | string): string | null =>
  actionId.startsWith("dungeon-wake-decision:") ? actionId.slice("dungeon-wake-decision:".length) : null;
const parseAnswerHelp = (actionId: ActionId | string): string | null =>
  actionId.startsWith("answer-help:") ? actionId.slice("answer-help:".length) : null;
const parseCallFavor = (actionId: ActionId | string): string | null =>
  actionId.startsWith("call-favor:") ? actionId.slice("call-favor:".length) : null;
const parsePressRival = (actionId: ActionId | string): string | null =>
  actionId.startsWith("press-rival:") ? actionId.slice("press-rival:".length) : null;
const parseBoardNoteKind = (actionId: ActionId | string): "journey" | "favor" | "rival" | "sect" | null => {
  if (actionId === "post-board-note" || actionId === "post-board-note:journey") {
    return "journey";
  }
  if (!actionId.startsWith("post-board-note:")) {
    return null;
  }
  const kind = actionId.slice("post-board-note:".length);
  return kind === "favor" || kind === "rival" || kind === "sect" ? kind : null;
};
const RIVAL_SCENE_COOLDOWN_TICKS = 6;
const FAVOR_CALL_STONES = 12;
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
const parseSendMessage = (actionId: ActionId | string): { targetId: string; kind: MessageTemplateKind; itemId?: string } | null => {
  if (!actionId.startsWith("send-message:")) return null;
  const rest = actionId.slice("send-message:".length);
  const giftMarker = ":gift-item";
  const giftAt = rest.indexOf(giftMarker);
  if (giftAt > 0) {
    const targetId = rest.slice(0, giftAt);
    const after = rest.slice(giftAt + giftMarker.length);
    if (!targetId) return null;
    if (after === "") return { targetId, kind: "gift-item" };
    if (after.startsWith(":") && after.length > 1 && !after.slice(1).includes(":")) {
      return { targetId, kind: "gift-item", itemId: after.slice(1) };
    }
    return null;
  }
  const lastColon = rest.lastIndexOf(":");
  if (lastColon === -1) return null;
  return { targetId: rest.slice(0, lastColon), kind: rest.slice(lastColon + 1) as MessageTemplateKind };
};
const parseAcceptGift = (actionId: ActionId | string): string | null =>
  actionId.startsWith("accept-gift:") ? actionId.slice("accept-gift:".length) : null;
const parseGiftBatch = (
  actionId: ActionId | string,
  prefix: "accept-gift-batch:" | "reject-gift-batch:",
): { fromId: string; itemId: ItemId } | null => {
  if (!actionId.startsWith(prefix)) return null;
  const rest = actionId.slice(prefix.length);
  const split = rest.lastIndexOf(":");
  if (split <= 0 || split >= rest.length - 1) return null;
  return { fromId: rest.slice(0, split), itemId: rest.slice(split + 1) as ItemId };
};

type PendingPvpChallengeInvalidReason =
  | "expired"
  | "challenger-missing"
  | "target-missing"
  | "challenger-left-area"
  | "target-left-area";

function hasActiveTravelJob(world: WorldState, cultivator: Cultivator): boolean {
  if (!cultivator.activeJobId) {
    return false;
  }
  const job = world.jobs[cultivator.activeJobId];
  return job?.actionId.startsWith("travel-to:") ?? false;
}

const CITY_DUEL_REPLY_TICKS = 6;

function publishCityDuel(
  world: WorldState,
  challenge: PendingPvpChallenge,
  challenger: Cultivator,
  target: Cultivator,
): void {
  world.pendingPvpChallenges[challenge.id] = challenge;
  challenger.pendingPvpChallengeId = challenge.id;
  target.pendingPvpChallengeId = challenge.id;
}

function getCityDuelChallengeBlockReason(
  world: WorldState,
  challenger: Cultivator,
  target: Cultivator | undefined,
): string | null {
  if (!target) return "Target cultivator not found.";
  const location = world.locations[challenger.locationId];
  if (!location || location.kind !== "safe") return "City duels can only be initiated in safe zones.";
  if (challenger.id === target.id) return "Cannot challenge yourself.";
  if (challenger.locationId !== target.locationId) return "Target must be in the same location.";
  if (challenger.activeJobId) return "你正忙着，这一手等手头的事做完再来。";
  if (target.activeJobId) return `${target.name}正忙着，改日再来。`;
  if (target.pendingPvpChallengeId) return "Target already has a pending PVP challenge.";
  if (challenger.pendingPvpChallengeId) return "You already have a pending PVP challenge.";
  const hpRatio = challenger.maxQi > 0 ? challenger.qi / challenger.maxQi : 0;
  if (hpRatio < 0.5) return "Your qi must be at least 50% to issue a challenge.";
  const realmGap = Math.abs((REALM_ORDER[challenger.realm] ?? 0) - (REALM_ORDER[target.realm] ?? 0));
  if (realmGap > 2) return "Realm gap too large for a fair duel.";
  if (challenger.sectId && challenger.sectId === target.sectId) return "Cannot challenge a sect member in the city.";
  return null;
}

function getPendingPvpChallengeInvalidReason(
  world: WorldState,
  challenge: PendingPvpChallenge,
): PendingPvpChallengeInvalidReason | null {
  if (world.tick >= challenge.expiresAtTick) {
    return "expired";
  }
  const challenger = world.cultivators[challenge.challengerCultivatorId];
  if (!challenger) {
    return "challenger-missing";
  }
  const target = world.cultivators[challenge.targetCultivatorId];
  if (!target) {
    return "target-missing";
  }
  if (challenger.locationId !== challenge.locationId || hasActiveTravelJob(world, challenger)) {
    return "challenger-left-area";
  }
  if (target.locationId !== challenge.locationId || hasActiveTravelJob(world, target)) {
    return "target-left-area";
  }
  return null;
}

function cancelPendingPvpChallenge(
  world: WorldState,
  challenge: PendingPvpChallenge,
  reason: PendingPvpChallengeInvalidReason,
): void {
  const challenger = world.cultivators[challenge.challengerCultivatorId];
  const target = world.cultivators[challenge.targetCultivatorId];

  delete world.pendingPvpChallenges[challenge.id];
  if (challenger?.pendingPvpChallengeId === challenge.id) {
    challenger.pendingPvpChallengeId = null;
  }
  if (target?.pendingPvpChallengeId === challenge.id) {
    target.pendingPvpChallengeId = null;
  }

  if (reason === "expired") {
    if (challenger && target) {
      addMessage(world, challenger.id, "切磋超时", "挑战取消", `对${target.name}的切磋挑战已超时取消。`);
      addMessage(world, target.id, "切磋超时", "挑战取消", `${challenger.name}的切磋挑战已超时取消。`);
    } else if (target) {
      addMessage(world, target.id, "切磋超时", "挑战取消", "当前切磋挑战已超时取消。");
    }
    return;
  }

  const leftName =
    reason === "challenger-left-area"
      ? (challenger?.name ?? "对方")
      : reason === "target-left-area"
        ? (target?.name ?? "对方")
        : "其中一方";

  if (challenger) {
    addMessage(world, challenger.id, "切磋取消", "挑战取消", `因${leftName}离开当前区域，待回应的切磋挑战已取消。`);
  }
  if (target) {
    addMessage(world, target.id, "切磋取消", "挑战取消", `因${leftName}离开当前区域，当前切磋挑战已取消。`);
  }
}
const parseRejectGift = (actionId: ActionId | string): string | null =>
  actionId.startsWith("reject-gift:") ? actionId.slice("reject-gift:".length) : null;
const parsePostCommission = (actionId: ActionId | string): { type: CommissionType; targetItemId: string } | null => {
  if (!actionId.startsWith("post-commission:")) return null;
  const rest = actionId.slice("post-commission:".length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) return null;
  return { type: rest.slice(0, colonIdx) as CommissionType, targetItemId: rest.slice(colonIdx + 1) };
};
const parseAcceptCommission = (actionId: ActionId | string): string | null =>
  actionId.startsWith("accept-commission:") ? actionId.slice("accept-commission:".length) : null;
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
  const band = rankBandForRealmLevel(realmLevel);
  return { minRank: band.minRank as DungeonRank, maxRank: band.maxRank as DungeonRank };
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

function moralityReasonPhrase(reason: string): string {
  if (reason === "dungeon-wake") return "地宫里的岔路";
  if (reason === "dungeon-encounter") return "地宫里的遭遇";
  if (reason === "join-sect") return "入门";
  if (reason === "take-sect-errand") return "宗门差事";
  if (reason.startsWith("sect-task:")) return "宗门事务";
  if (reason.startsWith("morality-choice:")) return "道心岔路";
  if (reason === "found-sect") return "开宗";
  if (reason === "sect-approved") return "宗门收录";
  return "这一遭";
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
    "心性偏移",
    `${cultivator.name}因${moralityReasonPhrase(reason)}，心性${delta >= 0 ? "往正道偏了" : "往魔道偏了"}${Math.abs(delta)}分。`,
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
  if (cultivator.pendingMoralityChoiceId || hasOpenSceneChoice(world, cultivator)) {
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
      title: eventTitle("choice", choice.title),
      content: choice.prompt,
      severity: "medium",
      tags: ["event-pool", "morality-choice", "pending"],
    }),
  ];
}

function ensureSceneChoiceMap(world: WorldState): void {
  if (!world.pendingSceneChoices) {
    world.pendingSceneChoices = {};
  }
  if (typeof world.nextSceneChoiceSequence !== "number") {
    world.nextSceneChoiceSequence = 1;
  }
}

function cleanupCultivatorPendingSceneChoice(world: WorldState, cultivator: Cultivator): void {
  ensureSceneChoiceMap(world);
  if (!cultivator.pendingSceneChoiceId) {
    return;
  }
  const choice = world.pendingSceneChoices?.[cultivator.pendingSceneChoiceId];
  if (!choice || choice.cultivatorId !== cultivator.id || world.tick >= choice.expiresAtTick) {
    if (cultivator.pendingSceneChoiceId) {
      delete world.pendingSceneChoices?.[cultivator.pendingSceneChoiceId];
    }
    cultivator.pendingSceneChoiceId = null;
  }
}

function hasOpenSceneChoice(world: WorldState, cultivator: Cultivator): boolean {
  cleanupCultivatorPendingSceneChoice(world, cultivator);
  return Boolean(cultivator.pendingSceneChoiceId);
}

function maybeQueueSceneChoice(
  world: WorldState,
  cultivator: Cultivator,
  locationId: string,
  template: WorldState["eventPools"]["globalCommon"][number],
): WorldEvent[] | null {
  if (!template.sceneChoice) {
    return null;
  }
  const optionCount = template.sceneChoice.options.length;
  if (optionCount < 3 || optionCount > 4) {
    return null;
  }
  cleanupCultivatorPendingMoralityChoice(world, cultivator);
  cleanupCultivatorPendingSceneChoice(world, cultivator);
  if (cultivator.pendingMoralityChoiceId || cultivator.pendingSceneChoiceId) {
    return [];
  }
  ensureSceneChoiceMap(world);
  const choiceId = `scene-choice-${world.nextSceneChoiceSequence!++}`;
  const choice = template.sceneChoice;
  world.pendingSceneChoices![choiceId] = {
    id: choiceId,
    cultivatorId: cultivator.id,
    eventId: template.id,
    createdAtTick: world.tick,
    expiresAtTick: world.tick + Math.max(1, choice.expiresInTicks || SCENE_EVENT_TTL),
    title: choice.title,
    prompt: choice.prompt,
    options: choice.options.map((option) => ({
      ...option,
      effectBundle: { ...option.effectBundle },
    })),
  };
  cultivator.pendingSceneChoiceId = choiceId;
  return [
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId,
      title: eventTitle("choice", choice.title),
      content: choice.prompt,
      severity: "medium",
      tags: ["event-pool", "scene-choice", "pending"],
    }),
  ];
}

function sceneChoiceActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  cleanupCultivatorPendingSceneChoice(world, cultivator);
  const pendingId = cultivator.pendingSceneChoiceId;
  if (!pendingId) {
    return [];
  }
  const choice = world.pendingSceneChoices?.[pendingId];
  if (!choice || choice.cultivatorId !== cultivator.id) {
    return [];
  }
  return choice.options.map((option) => ({
    actionId: `choose-event:${option.id}` as ActionId,
    label: option.label,
    description: choice.prompt,
    durationTicks: 0,
    kind: "immediate" as const,
  }));
}

function parseChooseEventOption(actionId: string): string | null {
  if (!actionId.startsWith("choose-event:")) {
    return null;
  }
  const optionId = actionId.slice("choose-event:".length).trim();
  return optionId.length > 0 ? optionId : null;
}

function resolveSceneChoiceAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ActionId,
  optionId: string,
): ActionExecutionResult {
  cleanupCultivatorPendingSceneChoice(world, cultivator);
  const pendingId = cultivator.pendingSceneChoiceId;
  const choice = pendingId ? world.pendingSceneChoices?.[pendingId] : undefined;
  if (!choice || choice.cultivatorId !== cultivator.id) {
    throw new GameplayRejection("眼前没有待决的场面。");
  }
  const option = choice.options.find((entry) => entry.id === optionId);
  if (!option) {
    throw new GameplayRejection("这个选择不在当前场面上。");
  }
  const beforeMorality = cultivator.moralityScore;
  applyEventEffectBundle(cultivator, option.effectBundle, `scene-choice:${choice.id}`);
  cultivator.moralityScore = beforeMorality;
  const haulNote = rememberJiaHaulChoice(world, cultivator, choice.eventId, option.id);
  cultivator.pendingSceneChoiceId = null;
  delete world.pendingSceneChoices?.[choice.id];
  const summary = `${cultivator.name}在${choice.title}里选了「${option.label}」。${option.summary}${haulNote ?? ""}`;
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: eventTitle("choice", choice.title),
    content: summary,
    severity: "low",
    tags: ["event-pool", "scene-choice", option.id],
  });
  addDaoLog(world, cultivator.id, choice.title, summary, ["event-pool", "scene-choice", option.id]);
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary,
  };
}

function rememberJiaHaulChoice(
  world: WorldState,
  cultivator: Cultivator,
  eventId: string,
  optionId: string,
): string | null {
  if (!jiaScenePack(eventId)) return null;
  const haul = jiaHaulForOption(optionId);
  const progress = world.dungeonExpeditions[cultivator.id];
  if (!haul || !progress || progress.grade !== "甲") return null;
  progress.jiaHaul = haul;
  const temperament = progress.jiaTemperament ?? jiaTemperamentForRank(progress.targetRank);
  let injuryEased = false;
  if (haul === "spare") {
    const relief = Math.min(2, cultivator.injuryTicksRemaining);
    if (relief > 0) {
      cultivator.injuryTicksRemaining -= relief;
      syncWounded(cultivator);
      progress.injuryTicksGained = Math.max(0, (progress.injuryTicksGained ?? 0) - relief);
      injuryEased = true;
    }
  }
  const line = jiaChoiceLine({
    rank: progress.targetRank,
    temperament,
    haul,
    injuryEased,
  });
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "find",
    title: "这一择",
    detail: line,
    locationId: cultivator.locationId,
    mood: "先记在袖上",
  }));
  return line;
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

function wildernessGateText(
  layer: NonNullable<ReturnType<typeof getWildernessLayerForLocation>>,
  gate: { allowed: boolean; reason?: string },
): string {
  if (!gate.allowed) {
    if (gate.reason === "Realm requirement not met.") return "境界还没到这一层。";
    if (gate.reason === "Sect contribution requirement not met.") return "宗门贡献还不够。";
    if (gate.reason === "Entry ticket missing.") return "入场符还没备上。";
    return "这会儿还进不去。";
  }
  const ticks = layer.survivalPressure.maxSurvivalTicks;
  const ticket = layer.entryRequirement.entryTicket;
  if (!ticket) return `不消耗入场符。这一层能撑${ticks}刻。`;
  const ticketName = ITEM_CATALOG[ticket]?.name;
  const name = ticketName && /[\u4e00-\u9fff]/u.test(ticketName) ? ticketName : "入场符";
  return `要消耗一份${name}。这一层能撑${ticks}刻。`;
}

function buildEnterWildernessAction(
  world: WorldState,
  cultivator: Cultivator,
  layer: NonNullable<ReturnType<typeof getWildernessLayerForLocation>>,
): AvailableAction {
  const gate = canEnterWilderness(cultivator, layer);
  const wild = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  const gateText = wildernessGateText(layer, gate);
  const pressure = `每刻气血少${layer.survivalPressure.qiDamagePerTick}，灵力少${layer.survivalPressure.spiritualDamagePerTick}。`;

  return {
    actionId: `enter-wilderness:${layer.layerId}` as ActionId,
    label: wild ? `走进${wild.name}` : `进入${layer.name}`,
    description: wild ? `${wild.advice}${gateText}` : `${gateText}${pressure}`,
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
const addDaoLog = (world: WorldState, cultivatorId: string, title: string, content: string, tags: string[], usableFor?: ResourceUsageSummary | SpiritStoneUsageSummary) =>
  world.daoLogs.unshift({ id: `log-${world.nextLogSequence++}`, cultivatorId, tick: world.tick, title, content, tags, ...(usableFor ? { usableFor } : {}) });

// ---- Resource usage reverse indices (lazy-cached) ----

let _recipeReverseIndex: ReturnType<typeof buildRecipeReverseIndex> | null = null;
let _breakthroughReverseIndex: ReturnType<typeof buildBreakthroughReverseIndex> | null = null;
let _spiritStoneUsageSummary: SpiritStoneUsageSummary | null = null;

function getRecipeReverseIndex() {
  if (!_recipeReverseIndex) {
    _recipeReverseIndex = buildRecipeReverseIndex(RESIDENCE_PRODUCTION_RECIPES, ITEM_CATALOG);
  }
  return _recipeReverseIndex;
}

function getBreakthroughReverseIndex() {
  if (!_breakthroughReverseIndex) {
    const levels: BreakthroughLevelEntry[] = [];
    for (let level = 1; level <= 14; level++) {
      const def = breakthroughDefinitionOf({ realmLevel: level } as Cultivator);
      if (def) {
        levels.push({
          targetLevel: def.targetLevel,
          targetRealm: def.targetRealm,
          materials: [...def.genericMaterials, def.specialMaterial],
        });
      }
    }
    _breakthroughReverseIndex = buildBreakthroughReverseIndex(levels);
  }
  return _breakthroughReverseIndex;
}

function getSpiritStoneUsageSummaryCache(): SpiritStoneUsageSummary {
  if (!_spiritStoneUsageSummary) {
    _spiritStoneUsageSummary = buildSpiritStoneUsageSummary(RESIDENCE_PRODUCTION_RECIPES);
  }
  return _spiritStoneUsageSummary;
}

function getItemUsageSummary(itemId: ItemId): ResourceUsageSummary {
  return buildItemUsageSummary(itemId, ITEM_CATALOG, getRecipeReverseIndex(), getBreakthroughReverseIndex());
}

const addResourceGainLog = (
  world: WorldState,
  cultivatorId: string,
  title: string,
  content: string,
  tags: string[],
  gainedItems: ReadonlyArray<{ itemId: ItemId; count: number }>,
) => {
  const firstItem = gainedItems[0];
  if (!firstItem) {
    addDaoLog(world, cultivatorId, title, content, tags);
    return;
  }
  const usableFor = getItemUsageSummary(firstItem.itemId);
  addDaoLog(world, cultivatorId, title, content, tags, usableFor);
};

const addSpiritStoneGainLog = (
  world: WorldState,
  cultivatorId: string,
  title: string,
  content: string,
  tags: string[],
) => {
  addDaoLog(world, cultivatorId, title, content, tags, getSpiritStoneUsageSummaryCache());
};
const addResidenceAmbientLog = (
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
  jobId: string,
) => {
  const residence = getActiveResidence(cultivator);
  if (!residence) {
    return;
  }

  const ambient = pickResidenceAmbientEvent({
    tick: world.tick,
    jobId,
    actionId,
    residence,
  });
  if (!ambient) {
    return;
  }

  addDaoLog(
    world,
    cultivator.id,
    ambient.title,
    ambient.description,
    ["residence", "ambient-event", `ambient-kind:${ambient.kind}`, `residence-id:${residence.id}`, actionId],
  );
};
const addMessage = (
  world: WorldState,
  cultivatorId: string,
  from: string,
  subject: string,
  content: string,
  options: {
    fromCultivatorId?: string | null;
    toCultivatorId?: string | null;
    spokenLine?: string;
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
    ...(options.spokenLine ? { spokenLine: options.spokenLine } : {}),
  } satisfies Message;
  world.messages.unshift(message);
  return message;
};
const MORALITY_SCORE_MIN = -100;
const MORALITY_SCORE_MAX = 100;
const MORALITY_EVENT_TTL = 6;
const SCENE_EVENT_TTL = 12;

const addWorldEvent = (world: WorldState, event: Omit<WorldEvent, "id" | "tick">): WorldEvent =>
  (world.worldEvents.unshift({ id: `event-${world.nextEventSequence++}`, tick: world.tick, ...event }), world.worldEvents[0]!);
type CombatLogInput = Omit<CombatLogEntry, "id" | "tick"> & {
  preCultivatorStatusEffects?: readonly StatusEffect[];
  finalPlayerHp?: number;
};

const addCombatLog = (world: WorldState, entry: CombatLogInput): CombatLogEntry => {
  const rounds = entry.rounds;
  const withSummary: Omit<CombatLogEntry, "id" | "tick"> = { ...entry };
  if (rounds && rounds.length > 0) {
    const startHp = entry.playerSnapshot?.hp ?? 0;
    const endHp = entry.finalPlayerHp ?? rounds[rounds.length - 1]!.playerHpAfter;
    withSummary.totalDamageTaken = Math.max(0, startHp - endHp);
    withSummary.hpDelta = endHp - startHp;
    withSummary.totalSpiritSpent = rounds.reduce((sum, r) => sum + (r.playerSpiritSpent ?? 0), 0);
    withSummary.totalQiSpent = 0;
    // Collect all status changes across rounds
    const statusMap = new Map<string, { statusId: CombatStatusId | StatusEffectId; statusName: string; applied: boolean }>();
    for (const r of rounds) {
      for (const s of r.appliedStatuses ?? []) {
        if (s.targetSide === "player") statusMap.set(s.statusId, { statusId: s.statusId, statusName: s.statusName, applied: true });
      }
      for (const s of r.expiredStatuses ?? []) {
        if (s.targetSide === "player") statusMap.set(s.statusId, { statusId: s.statusId, statusName: s.statusName, applied: false });
      }
      for (const s of r.consumedStatuses ?? []) {
        if (s.targetSide === "player") statusMap.set(s.statusId, { statusId: s.statusId, statusName: s.statusName, applied: false });
      }
    }
    const currentCultivator = world.cultivators[entry.cultivatorId];
    const preCultivatorStatusEffects = new Map((entry.preCultivatorStatusEffects ?? []).map((effect) => [effect.id, effect]));
    const postCultivatorStatusEffects = new Map((currentCultivator?.statusEffects ?? []).map((effect) => [effect.id, effect]));
    for (const [statusId, effect] of postCultivatorStatusEffects) {
      if (!preCultivatorStatusEffects.has(statusId)) {
        statusMap.set(statusId, { statusId, statusName: effect.name, applied: true });
      }
    }
    for (const [statusId, effect] of preCultivatorStatusEffects) {
      if (!postCultivatorStatusEffects.has(statusId)) {
        statusMap.set(statusId, { statusId, statusName: effect.name, applied: false });
      }
    }
    withSummary.statusChanges = Array.from(statusMap.values());
    // Remaining statuses: track combat statuses that survived plus post-combat cultivator statuses.
    const remaining = new Map<string, { statusId: CombatStatusId | StatusEffectId; statusName: string }>();
    for (const r of rounds) {
      for (const s of r.appliedStatuses ?? []) {
        if (s.targetSide === "player") remaining.set(s.statusId, { statusId: s.statusId, statusName: s.statusName });
      }
      for (const s of [...(r.expiredStatuses ?? []), ...(r.consumedStatuses ?? [])]) {
        if (s.targetSide === "player") remaining.delete(s.statusId);
      }
    }
    for (const effect of currentCultivator?.statusEffects ?? []) {
      remaining.set(effect.id, { statusId: effect.id, statusName: effect.name });
    }
    withSummary.statusEffectsRemaining = Array.from(remaining.values());
  }
  world.combatLogs.unshift({ id: `combat-${world.nextCombatSequence++}`, tick: world.tick, ...withSummary });
  return world.combatLogs[0]!;
};

function agentEventLabel(template: { name: string; nameCn?: string }): string {
  const label = template.nameCn?.trim();
  return label ? label : template.name;
}
function eventBracket(tag: string): string {
  if (tag === "exploration") return "探索";
  if (tag === "travel") return "赶路";
  if (tag === "choice") return "抉择";
  if (tag.startsWith("search-fortune")) return "探宝";
  if (tag.startsWith("challenge-guardian")) return "守关";
  return tag;
}
function eventTitle(tag: string, label: string): string {
  return `[${eventBracket(tag)}] ${label}`;
}
function publicEventTitle(title: string): string {
  return title
    .replace(/^\[exploration\]/u, "[探索]")
    .replace(/^\[travel\]/u, "[赶路]")
    .replace(/^\[choice\]/u, "[抉择]")
    .replace(/^\[search-fortune(?::rank-\d+)?\]/u, "[探宝]")
    .replace(/^\[challenge-guardian(?::rank-\d+)?\]/u, "[守关]")
    .replace(/\bDungeon Expedition\b/u, "地宫远征")
    .replace(/^Faction War Progress$/u, "宗门战事");
}

function triggerLocationEvent(
  world: WorldState,
  cultivator: Cultivator,
  source: EventSourceType,
  locationId: string,
  seed: string,
  options?: { flavorBudget?: number },
): WorldEvent[] {
  cleanupCultivatorPendingMoralityChoice(world, cultivator);
  cleanupCultivatorPendingSceneChoice(world, cultivator);
  const drawn = drawEvent(world, source, cultivator, locationId, seed);
  if (!drawn) {
    return [];
  }

  let remainingFlavorBudget = options?.flavorBudget ?? Number.POSITIVE_INFINITY;
  if (drawn.template.signalType === "flavor") {
    if (remainingFlavorBudget <= 0) {
      return [];
    }
    remainingFlavorBudget -= 1;
  }

  const queuedChoiceEvents = maybeQueueMoralityChoice(world, cultivator, locationId, drawn.template)
    ?? maybeQueueSceneChoice(world, cultivator, locationId, drawn.template);
  if (queuedChoiceEvents) {
    return queuedChoiceEvents;
  }

  const emitted: WorldEvent[] = [];
  applyEventEffects(cultivator, drawn.template);
  emitted.push(
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId,
      title: eventTitle(source, agentEventLabel(drawn.template)),
      content: drawn.template.description,
      severity: eventSeverityOf(drawn.template),
      tags: ["event-pool", source, drawn.template.semanticType, drawn.template.resultType, `signal-type:${drawn.template.signalType}`],
    }),
  );

  if (drawn.subEvent && !(drawn.subEvent.signalType === "flavor" && remainingFlavorBudget <= 0)) {
    applyEventEffects(cultivator, drawn.subEvent);
    emitted.push(
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId,
        title: eventTitle(source, agentEventLabel(drawn.subEvent)),
        content: drawn.subEvent.description,
        severity: eventSeverityOf(drawn.subEvent),
        tags: ["event-pool", source, "sub-event", drawn.subEvent.semanticType, drawn.subEvent.resultType, `signal-type:${drawn.subEvent.signalType}`],
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
      title: eventTitle(actionTag, agentEventLabel(drawn.template)),
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
  const locale = registrationLocaleOf(record.result);
  const modifiers = createRegistrationRuntimeModifiers();
  modifiers.dominantElements = dominantElementsOf(record);
  for (const element of modifiers.dominantElements) {
    addRegistrationBonuses(modifiers, ELEMENT_RUNTIME_BONUSES[element.id]);
  }

  const coreTemperament = record.result.core_temperament;
  const coreTemperamentId = record.result.core_temperament_id ?? resolveTemperamentId(coreTemperament);
  if (coreTemperamentId === "shou_jie") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A rule-bound core steadies defense and recovery discipline.`, { combatGuard: 3 });
  } else if (coreTemperamentId === "duan_feng") {
      applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A cutting core sharpens decisive combat and focused dungeon pressure.`, { combatBonus: 4, studyBonus: 2 });
  } else if (coreTemperamentId === "fu_sheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A nurturing core favors healing, low-risk errands, and team utility.`, { healBonus: 4, taskBonus: 2 });
  } else if (coreTemperamentId === "xiang_rong") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A growth-oriented core turns stable sessions into stronger cultivation gains.`, { cultivateBonus: 4, meditateBonus: 2 });
  } else if (coreTemperamentId === "qian_yuan") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A patient core improves scouting, judgment, and safer risk-taking.`, { fortuneBonus: 4, combatGuard: 2 });
  } else if (coreTemperamentId === "guan_lan") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} An observant core improves study efficiency and opportunistic play.`, { fortuneBonus: 3, studyBonus: 3 });
  } else if (coreTemperamentId === "chi_xin") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A driven core converts pressure into cultivation momentum and combat force.`, { cultivateBonus: 3, combatBonus: 3 });
  } else if (coreTemperamentId === "zheng_sheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A competitive core leans into direct encounters and forceful progress.`, { combatBonus: 4, studyBonus: 1 });
  } else if (coreTemperamentId === "zhen_yue") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A mountain-like core reinforces frontline stability and mining resilience.`, { combatGuard: 4, mineBonus: 3 });
  } else if (coreTemperamentId === "shou_cheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, `${temperamentDescription(coreTemperamentId, locale)} A conservative core protects recovery and long-cycle stability.`, { healBonus: 3 });
  }

  const behaviorAspectId = record.result.behavior_aspect_id ?? resolveBehaviorAspectId(record.result.behavior_aspect);
  if (modifiers.dominantElements.length > 0 && behaviorAspectId) {
    const behaviorBonuses = createRegistrationRuntimeModifiers();
    const divisor = modifiers.dominantElements.length === 1 ? 2 : 3;
    for (const element of modifiers.dominantElements) {
      addRegistrationBonuses(behaviorBonuses, scaleRegistrationBonuses(ELEMENT_RUNTIME_BONUSES[element.id], divisor));
    }
    applyRegistrationModifier(
      modifiers,
      "behavior-aspect",
      `Behavior aspect: ${record.result.behavior_aspect}`,
      `${behaviorAspectDescription(behaviorAspectId, locale)} The registration's action bias nudges routine jobs toward its preferred rhythm.`,
      registrationBonusSnapshotOf(behaviorBonuses),
    );
  }

  const motive = record.result.cultivation_motive;
  const cultivationMotiveId = record.result.cultivation_motive_id ?? resolveCultivationMotiveId(motive);
  if (cultivationMotiveId === "seek-longevity") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Longevity-driven cultivation improves recovery and stable long-term progress.`, { healBonus: 4 });
  } else if (cultivationMotiveId === "prove-the-great-dao") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} A path-seeking motive rewards sustained cultivation and hard breakthroughs.`, { cultivateBonus: 4, combatBonus: 2 });
  } else if (cultivationMotiveId === "seek-truth") {
      applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Truth-seeking improves ruins scouting and measured growth.`, { studyBonus: 4, fortuneBonus: 3, cultivateBonus: 1 });
  } else if (cultivationMotiveId === "protect-the-beloved") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Protective intent favors healing and reliable problem-solving work.`, { taskBonus: 3, healBonus: 2 });
  } else if (cultivationMotiveId === "serve-the-world") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} A public-serving motive improves steady task income and support actions.`, { taskBonus: 4, healBonus: 2 });
  } else if (cultivationMotiveId === "avenge-old-grudges") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Old grudges turn effort into sharper direct combat results.`, { combatBonus: 4 });
  } else if (cultivationMotiveId === "compete-for-supremacy") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Competitive intent improves clashes and the study needed to win them.`, { combatBonus: 3, studyBonus: 1 });
  } else if (cultivationMotiveId === "honor-the-clan") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Family or sect pride rewards contribution-focused play.`, { sectBonus: 4, taskBonus: 2 });
  } else if (cultivationMotiveId === "defy-fate") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} Defying fate improves dangerous exploration and hard fights.`, { combatBonus: 3, fortuneBonus: 2 });
  } else if (cultivationMotiveId === "seek-freedom") {
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, `${motiveDescription(cultivationMotiveId, locale)} A freedom-seeking motive favors meditation and open-ended exploration.`, { meditateBonus: 3, fortuneBonus: 2 });
  }

  const spiritRoot = record.result.spirit_root_result;
  const spiritRootKindId = record.result.spirit_root_kind_id ?? resolveSpiritRootKindId(spiritRoot);
  if (spiritRootKindId === "single-root") {
    applyRegistrationModifier(modifiers, "spirit-root", `Spirit root: ${spiritRoot}`, `${spiritRootDescription(spiritRootKindId, locale)} A focused root converts effort into cleaner cultivation and combat output.`, { cultivateBonus: 4, combatBonus: 2 });
  } else if (spiritRootKindId === "dual-root") {
    applyRegistrationModifier(modifiers, "spirit-root", `Spirit root: ${spiritRoot}`, `${spiritRootDescription(spiritRootKindId, locale)} A dual root supports flexible exploration and safer encounters.`, { fortuneBonus: 3, combatGuard: 2 });
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
  const questAction = parseQuestActionId(actionId);
  const executeQuest = questAction?.phase === "execute"
    ? getActiveQuestByReadableIndex(cultivator, questAction.questType, questAction.index)
    : null;
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
    : executeQuest
      ? executeQuest.durationTicks
      : guixuNodeId
        ? (getGuixuNodeById(world, guixuNodeId)?.explorationDurationTicks ?? NaN)
      : isSectTimedAction(actionId)
        ? 1
      : String(actionId).startsWith("enter-regional:")
        ? 3
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
  const stateId = stateIdFromLocationId(locationId);
  const entry = getResidenceCatalogEntry(stateId);
  return {
    id: `residence-${cultivatorId}-${stateId}`,
    locationId: locationId as Cultivator["residence"]["locationId"],
    level: 1 as const,
    name: entry?.name ?? "洞府",
    stateId,
    description: entry?.description ?? "",
    grandeur: 1,
    origin: "starter" as const,
    fixtures: [],
  };
}

const TECHNIQUE_NAME_ZH: Record<string, string> = {
  "Loose Breathing": "松息吐纳",
  "Light Body": "轻身术",
  "Basic Breathing": "基础吐纳",
};

function techniqueDisplayName(techniqueId: string): string {
  return TECHNIQUE_NAME_ZH[techniqueId] ?? techniqueId;
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
  const locale = registrationLocaleOf(record.result);
  if (!coreTemperamentId || !secondaryTemperamentId || !behaviorAspectId || !cultivationMotiveId || !spiritRootKindId) {
    throw new Error("stored registration record is missing required taxonomy IDs — record may not have been normalized at save time.");
  }
  return {
    saved_at: record.saved_at ?? null,
    label_locale: locale,
    core_temperament_id: coreTemperamentId,
    core_temperament: record.result.core_temperament,
    core_temperament_description: temperamentDescription(coreTemperamentId, locale),
    secondary_temperament_id: secondaryTemperamentId,
    secondary_temperament: record.result.secondary_temperament,
    secondary_temperament_description: temperamentDescription(secondaryTemperamentId, locale),
    behavior_aspect_id: behaviorAspectId,
    behavior_aspect: record.result.behavior_aspect,
    behavior_aspect_description: behaviorAspectDescription(behaviorAspectId, locale),
    cultivation_motive_id: cultivationMotiveId,
    cultivation_motive: record.result.cultivation_motive,
    cultivation_motive_description: motiveDescription(cultivationMotiveId, locale),
    spirit_root_kind_id: spiritRootKindId,
    spirit_root_result: record.result.spirit_root_result,
    spirit_root_description: spiritRootDescription(spiritRootKindId, locale),
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
    residences: [defaultResidenceAt(starterLocationId, cultivatorId)],
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
    pendingSceneChoiceId: null,
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
    // Production Queue
    productionQueue: [],
    // Social Verbs
    pendingGifts: [],
    lastGiftTick: 0,
    // Endgame
    guixuCompletedNodeIds: [],
    // Breakthrough Growth
    mainAttributeGrowth: {},
    fiveElementGrowth: {},
    mainAttributePercentageBonus: 0,
  };

  world.cultivators[cultivator.id] = cultivator;
  let selectedCultivatorId: string | null = null;
  if (agentId) {
    const binding = ensureAgentBinding(world, agentId);
    binding.cultivatorIds.push(cultivator.id);
    binding.selectedCultivatorId = cultivator.id;
    selectedCultivatorId = cultivator.id;
  }
  addDaoLog(world, cultivator.id, "初入尘世", `${cultivator.name}踏入了这一界。`, ["character"]);
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
function registrationDaoContent(name: string, result: CultivationRegistrationRecord["result"]): string {
  const temperamentId = result.core_temperament_id ?? resolveTemperamentId(result.core_temperament);
  const aspectId = result.behavior_aspect_id ?? resolveBehaviorAspectId(result.behavior_aspect);
  const motiveId = result.cultivation_motive_id ?? resolveCultivationMotiveId(result.cultivation_motive);
  const temperament = temperamentId ? temperamentLabel(temperamentId, "zh-CN") : result.core_temperament;
  const aspect = aspectId ? behaviorAspectLabel(aspectId, "zh-CN") : result.behavior_aspect;
  const motive = motiveId ? motiveLabel(motiveId, "zh-CN") : result.cultivation_motive;
  const aspectMeaning = aspect.split(" / ")[1]?.trim() || aspect;
  return `${name}问心已定。心性落在${temperament}，行路以${aspectMeaning}为先，所求偏${motive}。`;
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

  addDaoLog(world, cultivator.id, "问心定档", registrationDaoContent(cultivator.name, stored.result), ["registration", "attunement"]);
  addMessage(world, cultivator.id, "Immortal Registry", "Registration Locked", `${cultivator.name}'s cultivation registration has been recorded.`);
  return structuredClone(stored);
}

function hasEffect(cultivator: Cultivator, effectId: StatusEffect["id"]) { return cultivator.statusEffects.some((effect) => effect.id === effectId); }
function upsertEffect(cultivator: Cultivator, effect: StatusEffect) {
  const facing = facingStatus(effect.id, effect.name, effect.description);
  const existing = cultivator.statusEffects.find((entry) => entry.id === effect.id);
  if (existing) {
    existing.remainingTicks = Math.max(existing.remainingTicks, effect.remainingTicks);
    existing.intensity = Math.max(existing.intensity, effect.intensity);
    existing.source = effect.source;
    existing.name = facing.name;
    existing.description = facing.description;
    return;
  }
  cultivator.statusEffects.push({ ...effect, name: facing.name, description: facing.description });
}
function syncWounded(cultivator: Cultivator) {
  cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "wounded");
  if (cultivator.injuryTicksRemaining > 0) {
    const facing = facingStatus("wounded", "带伤", "冒险的事做不了，得先养伤。");
    cultivator.statusEffects.push({ id: "wounded", name: facing.name, description: facing.description, source: "injury", remainingTicks: cultivator.injuryTicksRemaining, intensity: 1 });
  }
}
function raiseInjury(world: WorldState, cultivator: Cultivator, ticks: number): void {
  if (ticks <= cultivator.injuryTicksRemaining) return;
  cultivator.injuryTicksRemaining = ticks;
  syncWounded(cultivator);
  noteWound(world, cultivator);
}

function settleJiaBandFail(
  world: WorldState,
  cultivator: Cultivator,
  grade: DungeonGrade,
  rank: number,
  outcome: "loss" | "withdraw",
): number {
  const cost = jiaBandFailCost(grade, rank, outcome) ?? lightFailCost(grade, rank, outcome);
  if (!cost) return 0;
  const stones = Math.min(cultivator.spiritStones, cost.stoneLoss);
  cultivator.spiritStones -= stones;
  if (cost.spiritLoss > 0) {
    cultivator.spiritualPower = clamp(
      cultivator.spiritualPower - cost.spiritLoss,
      0,
      cultivator.maxSpiritualPower,
    );
  }
  if (cost.injuryTicks > 0) {
    raiseInjury(world, cultivator, cost.injuryTicks);
  }
  if (cost.deviationTicks > 0) {
    upsertEffect(cultivator, {
      id: "deviation",
      name: "Qi Deviation",
      description: "Breath is unsettled after the high-realm fight.",
      source: "guardian",
      remainingTicks: cost.deviationTicks,
      intensity: 1,
    });
  }
  recordLife(cultivator, { tick: world.tick, kind: "fight", text: cost.sentence });
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "injury",
    title: cost.title,
    detail: cost.sentence,
    locationId: cultivator.locationId,
    mood: cost.mood,
  }));
  return stones;
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
  const name = ITEM_CATALOG[itemId]?.name ?? "这件东西";
  if (operation === "buy") return `买${name}`;
  if (operation === "sell") return `卖${name}`;
  if (operation === "study") return `研读${name}`;
  if (itemId === "healing-pill" || itemId === "qi-pill") return `服用${name}`;
  return `使用${name}`;
}
const TIMED_ACTION_PHRASES: Record<string, string> = {
  meditate: "打坐",
  heal: "疗伤",
  cultivate: "运功",
  "residence-meditate": "洞府打坐",
  "residence-heal": "洞府疗伤",
  "residence-heal:use-pill": "洞府疗伤",
  "residence-heal:no-pill": "洞府疗伤",
  "residence-recover-qi": "洞府回气",
  "residence-recover-qi:use-pill": "洞府回气",
  "residence-recover-qi:no-pill": "洞府回气",
  "residence-produce": "洞府炼制",
  "residence-socialize": "洞府闲谈",
  "residence-breakthrough": "洞府破境",
  "mine-spirit-stones": "采集灵石",
  "hunt-mine-beast": "猎兽",
  "take-mortal-task": "城镇差事",
  "take-neutral-duty": "中立差事",
  "take-sect-errand": "宗门差事",
  "survey-wilderness": "再探这一层",
  "withdraw-from-wilderness": "撤出这一层",
  "retreat-from-bahuang": "撤出八荒",
  "abort-dungeon-expedition": "中止地宫远征",
  "search-fortune": "探宝",
};
function timedActionPhrase(actionId: string): string | null {
  if (TIMED_ACTION_PHRASES[actionId]) return TIMED_ACTION_PHRASES[actionId];
  if (actionId.startsWith("residence-produce:")) return "洞府炼制";
  if (actionId.startsWith("search-fortune")) return "探宝";
  if (actionId.startsWith("challenge-guardian")) return "守关";
  if (actionId.startsWith("explore-guixu:")) return "探这一处";
  if (actionId.startsWith("sect-task:")) return "宗门差事";
  return null;
}
function shownJobLabel(actionId: string, label: string): string {
  const englishShell = /^[A-Za-z]/.test(label);
  if (!englishShell && /[\u4e00-\u9fff]/u.test(label)) return label;
  return timedActionPhrase(actionId) ?? (/[\u4e00-\u9fff]/u.test(label) ? label : "手头的事");
}
const STATUS_FACING: Record<string, { name: string; description: string }> = {
  wounded: { name: "带伤", description: "冒险的事做不了，得先养伤。" },
  poisoned: { name: "中毒", description: "每过一刻都在掉气血。" },
  "clear-mind": { name: "心神清明", description: "调息和修炼都顺一些。" },
  "qi-surge": { name: "气血上涌", description: "出手和修炼都顺一些。" },
  "fortune-marked": { name: "气运加身", description: "探宝更容易有收获。" },
  warded: { name: "护体", description: "打架时没那么容易吃亏。" },
  deviation: { name: "走火入魔", description: "修炼不稳，再催就容易出事。" },
  insight: { name: "有所悟", description: "这一阵修炼和出手都亮一点。" },
  "spirit-saturated": { name: "灵气充盈", description: "这一阵修炼更顶用。" },
};
function facingStatus(id: string, fallbackName: string, fallbackDescription: string) {
  return STATUS_FACING[id] ?? { name: fallbackName, description: fallbackDescription };
}
function publicStatusName(statusId: string, statusName: string): string {
  return facingStatus(statusId, statusName, "").name;
}
function publicCombatLog(entry: CombatLogEntry): CombatLogEntry {
  const rename = <T extends { statusName: string; statusId: string }>(row: T): T => ({
    ...row,
    statusName: publicStatusName(row.statusId, row.statusName),
  });
  return {
    ...entry,
    outcomeLabel: entry.outcome === "victory" ? "胜" : "负",
    ...(entry.statusChanges ? { statusChanges: entry.statusChanges.map(rename) } : {}),
    ...(entry.statusEffectsRemaining ? { statusEffectsRemaining: entry.statusEffectsRemaining.map(rename) } : {}),
    ...(entry.rounds
      ? {
          rounds: entry.rounds.map((round) => ({
            ...round,
            ...(round.appliedStatuses ? { appliedStatuses: round.appliedStatuses.map(rename) } : {}),
            ...(round.tickEvents ? { tickEvents: round.tickEvents.map(rename) } : {}),
            ...(round.consumedStatuses ? { consumedStatuses: round.consumedStatuses.map(rename) } : {}),
            ...(round.expiredStatuses ? { expiredStatuses: round.expiredStatuses.map(rename) } : {}),
          })),
        }
      : {}),
  };
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
    effects.techniques = [techniqueDisplayName(technique)];
    hasContent = true;
  }
  return hasContent ? effects : undefined;
}

function realmOfLevel(level: number): Cultivator["realm"] {
  return realmStageForLevel(level);
}

function addRealmProgress(cultivator: Cultivator, amount: number): void {
  cultivator.realmProgress = clamp(cultivator.realmProgress + amount, 0, BREAKTHROUGH_PROGRESS_REQUIRED);
}

function rememberSettledMoment(world: WorldState, cultivator: Cultivator, actionKey: string): void {
  const moment = settledMoment(actionKey, hashString(`${world.tick}:${cultivator.id}:${actionKey}`));
  if (!moment) {
    return;
  }
  pushTravelNote(cultivator, {
    ...moment,
    tick: world.tick,
    locationId: cultivator.locationId,
  });
}

function noteCultivationMark(world: WorldState, cultivator: Cultivator, before: number): void {
  const location = world.locations[cultivator.locationId];
  if (location && isDungeonNode(location.nodeType)) {
    return;
  }
  const marks = [25, 50, 75, 100] as const;
  const crossed = marks.find((mark) => before < mark && cultivator.realmProgress >= mark);
  if (crossed === undefined) {
    return;
  }
  const title = crossed === 100
    ? "修为顶在门槛上"
    : crossed >= 75
      ? "门槛近了"
      : crossed >= 50
        ? "进度过半"
        : "修为刚有了影";
  const detail = `${cultivator.name}感到境界进度到了 ${crossed}。还没破境，但这已经是能写进日记的一步。`;
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: crossed === 100 ? "breakthrough" : "insight",
    title,
    detail,
    locationId: cultivator.locationId,
    mood: crossed >= 100 ? "想破境" : "还在长",
  }));
  recordLife(cultivator, { tick: world.tick, kind: "growth", text: detail });
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
    case 9:
      return {
        category: "major", targetRealm: "元婴", targetLevel: 10, marketBuyable: false, durationTicks: 8, baseSuccessRate: 40,
        genericMaterials: [{ itemId: "infant-fire-lotus", count: 1 }, { itemId: "nascent-jade", count: 1 }, { itemId: "soul-lamp-wick", count: 1 }],
        specialMaterial: { itemId: "nine-turn-golden-marrow", count: 1 },
      };
    case 10:
      return {
        category: "minor", targetRealm: "元婴", targetLevel: 11, marketBuyable: false, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "infant-fire-lotus", count: 1 }, { itemId: "nascent-jade", count: 1 }, { itemId: "soul-lamp-wick", count: 1 }],
        specialMaterial: { itemId: "nurture-nascent-dew", count: 1 },
      };
    case 11:
      return {
        category: "minor", targetRealm: "元婴", targetLevel: 12, marketBuyable: false, durationTicks: 4, baseSuccessRate: null,
        genericMaterials: [{ itemId: "infant-fire-lotus", count: 1 }, { itemId: "nascent-jade", count: 1 }, { itemId: "soul-lamp-wick", count: 1 }],
        specialMaterial: { itemId: "anchor-nascent-sand", count: 1 },
      };
    case 12:
      return {
        category: "major", targetRealm: "化神", targetLevel: 13, marketBuyable: false, durationTicks: 8, baseSuccessRate: 30,
        genericMaterials: [{ itemId: "divine-thought-crystal", count: 1 }, { itemId: "heaven-soul-silk", count: 1 }, { itemId: "divine-pattern-stone", count: 1 }],
        specialMaterial: { itemId: "shatter-nascent-lotus", count: 1 },
      };
    case 13:
      return {
        category: "minor", targetRealm: "化神", targetLevel: 14, marketBuyable: false, durationTicks: 5, baseSuccessRate: null,
        genericMaterials: [{ itemId: "divine-thought-crystal", count: 1 }, { itemId: "heaven-soul-silk", count: 1 }, { itemId: "divine-pattern-stone", count: 1 }],
        specialMaterial: { itemId: "divine-embryo-dew", count: 1 },
      };
    case 14:
      return {
        category: "minor", targetRealm: "化神", targetLevel: 15, marketBuyable: false, durationTicks: 5, baseSuccessRate: null,
        genericMaterials: [{ itemId: "divine-thought-crystal", count: 1 }, { itemId: "heaven-soul-silk", count: 1 }, { itemId: "divine-pattern-stone", count: 1 }],
        specialMaterial: { itemId: "divine-transformation-seal", count: 1 },
      };
    default:
      return aboveSpiritDefinition(cultivator.realmLevel);
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

function dungeonGateLockLine(
  cultivator: Cultivator,
  location: WorldState["locations"][string] | undefined,
): string | null {
  const metadata = dungeonMetadataOf(location);
  if (!metadata || meetsRealmRequirement(cultivator, metadata.minRealm)) return null;
  if (metadata.grade === "甲") {
    return "丹霞内府要得到金丹才进得去。甲级一到三层，探宝和守关会掉丹霞露。";
  }
  if (metadata.grade === "乙") {
    return "乙级地宫要得到筑基才进得去。一到三层是雷泽残阵。";
  }
  return "丙级地宫要得到炼气才进得去。";
}

function dungeonLockReasonOf(cultivator: Cultivator, location: WorldState["locations"][string]): string | null {
  return dungeonGateLockLine(cultivator, location);
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
  const unlockedRanks = meetsRealmRequirement(cultivator, metadata.minRealm)
    ? unlockedDungeonRanksOf(cultivator, metadata.grade)
    : [];
  const availableRanks = unlockedRanks.filter((rank) => mysteryEntry(metadata.grade, rank, cultivator.realmLevel).ok);
  const frontierRank = availableRanks.length > 0
    ? availableRanks[availableRanks.length - 1]!
    : highestUnlockedRank;
  return {
    grade: metadata.grade,
    minRealm: metadata.minRealm,
    highestClearedRank,
    highestUnlockedRank,
    availableRanks,
    frontierRank,
    recommendedRank: recommendedDungeonRankOf(cultivator, metadata.grade),
    materialBand: metadata.materialBand,
    rankYieldHints: buildDungeonRankYieldHints(availableRanks, metadata.materialBand, metadata.grade, location?.stateId),
    advice: `${dungeonAdvice(metadata.grade, recommendedDungeonRankOf(cultivator, metadata.grade), location?.stateId)}${regionalGateClause(location?.stateId)}`,
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

function mergePositiveDrops(
  base: Partial<Record<ItemId, number>>,
  delta: Partial<Record<ItemId, number>>,
): Partial<Record<ItemId, number>> {
  const merged = { ...base };
  for (const [itemId, count] of Object.entries(delta) as Array<[ItemId, number]>) {
    if (count > 0) merged[itemId] = (merged[itemId] ?? 0) + count;
  }
  return merged;
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
    title: "地宫归来",
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

function applyDungeonWakeSettlement(
  world: WorldState,
  cultivator: Cultivator,
  settlement: ReturnType<typeof settleDungeonWakeNode>,
): void {
  if (settlement.stoneDelta !== 0) {
    cultivator.spiritStones = Math.max(0, cultivator.spiritStones + settlement.stoneDelta);
  }
  if (settlement.moralityDelta !== 0) {
    applyMoralityDelta(world, cultivator, settlement.moralityDelta, "dungeon-wake");
  }
  if (settlement.injuryTicks > 0) {
    raiseInjury(world, cultivator, settlement.injuryTicks);
  }
  if (settlement.beat) {
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: settlement.beat.kind,
      title: settlement.beat.title,
      detail: settlement.beat.detail,
      locationId: cultivator.locationId,
      mood: settlement.beat.mood,
    }));
    recordLife(cultivator, { tick: world.tick, kind: settlement.injuryTicks > 0 ? "fight" : "growth", text: settlement.beat.detail });
  }
}

function noteCityRivalry(
  world: WorldState,
  left: Cultivator,
  right: Cultivator,
  detail: string,
  duel: {
    left: { result: "win" | "loss" | "draw" | "retreat"; stoneDelta: number };
    right: { result: "win" | "loss" | "draw" | "retreat"; stoneDelta: number };
  },
): void {
  markRival(world, left.id, right.id);
  rememberCityDuel(world, left.id, right.id, duel.left.result, duel.left.stoneDelta);
  rememberCityDuel(world, right.id, left.id, duel.right.result, duel.right.stoneDelta);
  const purse = (name: string, delta: number) =>
    delta > 0 ? `${name}收下${delta}枚灵石` : delta < 0 ? `${name}落下${-delta}枚灵石` : `${name}灵石没动`;
  const fullDetail = `${detail}${purse(left.name, duel.left.stoneDelta)}。${purse(right.name, duel.right.stoneDelta)}。`;
  pushTravelNote(left, travelNote({
    tick: world.tick,
    kind: "person",
    title: `与${right.name}结了对手`,
    detail: fullDetail,
    locationId: left.locationId,
    mood: "这一架会记住",
  }));
  pushTravelNote(right, travelNote({
    tick: world.tick,
    kind: "person",
    title: `与${left.name}结了对手`,
    detail: fullDetail,
    locationId: right.locationId,
    mood: "这一架会记住",
  }));
  const grudgeGain = duel.left.result === "draw" ? GRUDGE_FROM_DRAW : GRUDGE_FROM_DUEL;
  addMutualGrudge(world, left.id, right.id, grudgeGain);
  const leftSentence = duel.left.result === "retreat" ? `${left.name}从这一场里撤了下来，心气还没平。` : undefined;
  const rightSentence = duel.right.result === "retreat" ? `${right.name}从这一场里撤了下来，心气还没平。` : undefined;
  shiftCultivatorMood(world, left, moodCauseForDuel(duel.left.result), leftSentence);
  shiftCultivatorMood(world, right, moodCauseForDuel(duel.right.result), rightSentence);
  const fightLine = duel.left.result === "win"
    ? `${left.name}在城里赢了${right.name}。这一架会留在两个人的见闻里。`
    : duel.left.result === "loss"
      ? `${left.name}在城里输给了${right.name}。这一架会留在两个人的见闻里。`
      : duel.left.result === "retreat"
        ? `${left.name}和${right.name}的城中切磋有人撤了。这一架还是被记住了。`
        : `${left.name}和${right.name}在城里打成平手。谁也没把谁压住。`;
  recordLife(left, { tick: world.tick, kind: "fight", text: fightLine });
  recordLife(right, { tick: world.tick, kind: "fight", text: fightLine });
  if (duel.left.result === "win" || duel.right.result === "win") {
    const winner = duel.left.result === "win" ? left : right;
    const loser = winner.id === left.id ? right : left;
    spreadNearbyGossip(
      world,
      [left.locationId, right.locationId],
      [left.id, right.id],
      "win",
      `${winner.name}在城里赢了${loser.name}。这件事很快会传到附近人的耳朵里。`,
      `听人说，${winner.name}在城里赢了${loser.name}。`,
    );
  }
}

function pendingDialogueOf(world: WorldState, cultivatorId: string) {
  const rows: Array<{ fromId: string; fromName: string; line: string; tick: number; replyActionId: string }> = [];
  const seen = new Set<string>();
  for (const message of world.messages ?? []) {
    if (message.toCultivatorId !== cultivatorId || !message.spokenLine || !message.fromCultivatorId || message.spokenAnswered) continue;
    if (message.fromCultivatorId === cultivatorId || seen.has(message.fromCultivatorId)) continue;
    const link = getSocialLink(world, cultivatorId, message.fromCultivatorId);
    if (link?.lastSpokenTick !== undefined && link.lastSpokenTick >= message.tick && (link.lastSpokenKind === "say" || link.lastSpokenKind === "reply")) {
      continue;
    }
    seen.add(message.fromCultivatorId);
    const fromName = world.cultivators[message.fromCultivatorId]?.name ?? message.from;
    rows.push({
      fromId: message.fromCultivatorId,
      fromName,
      line: message.spokenLine,
      tick: message.tick,
      replyActionId: `reply-line:${message.fromCultivatorId}`,
    });
    if (rows.length >= 4) break;
  }
  return rows;
}

function relationClause(
  link: ReturnType<typeof getSocialLink>,
  otherName: string,
  previousLevel: string | null,
): string {
  if (!link) return "";
  const parts: string[] = [];
  const level = getAffinityLevel(link.affinity);
  if (previousLevel && previousLevel !== level) {
    parts.push(`关系从${previousLevel}到了${level}`);
  }
  if (link.rival) parts.push(`与${otherName}仍是宿敌`);
  const favor = link.favorBalance ?? 0;
  if (favor > 0) parts.push(`${otherName}还欠着人情`);
  else if (favor < 0) parts.push(`还欠${otherName}人情`);
  if (parts.length === 0) return "";
  return `${parts.slice(0, 2).join("，")}。`;
}

function noteFightDiary(
  world: WorldState,
  self: Cultivator,
  foeName: string,
  rounds: readonly CombatRoundLog[],
  side: "player" | "enemy",
  retreated: boolean,
  retreatingSide: "player" | "enemy" | null,
): void {
  let myCrit = false;
  let myHit = false;
  let theirCrit = false;
  let theirHit = false;
  let myCritCount = 0;
  let guardCount = 0;
  let stance: CombatStyle | undefined;
  for (const round of rounds) {
    const mine = side === "player" ? round.playerAttack : round.enemyAttack;
    const theirs = side === "player" ? round.enemyAttack : round.playerAttack;
    const myRoute = side === "player"
      ? (round.playerRoute ?? round.playerBoundRoute ?? undefined)
      : (round.enemyRoute ?? round.enemyBoundRoute ?? undefined);
    if (!stance && myRoute) stance = myRoute;
    if (mine?.result === "crit") {
      myCrit = true;
      myCritCount += 1;
    } else if (mine?.result === "hit") myHit = true;
    if (theirs?.result === "crit") theirCrit = true;
    else if (theirs?.result === "hit") theirHit = true;
    if (mine?.result === "miss" || theirs?.result === "miss") guardCount += 1;
  }
  let qiPressure = rounds.length > 0 ? 2 : 0;
  if (theirCrit) qiPressure += 4;
  const iRetreated = retreated && retreatingSide === side;
  if (iRetreated) qiPressure += 8;
  if (qiPressure > 0) {
    self.qi = clamp(self.qi - qiPressure, 1, self.maxQi);
  }
  const stanceName = stance === "brute" ? "刚猛" : stance === "finesse" ? "灵巧" : stance === "tactic" ? "算计" : "寻常";
  const strike = myCrit ? "一击破防" : myHit ? "出手击中" : "出手被守住";
  const answer = theirCrit ? "对方破开了守势" : theirHit ? "对方还了一击" : "对方攻势被守住";
  const someoneLeft = retreated && retreatingSide !== null;
  const closing = someoneLeft
    ? `${retreatingSide === side ? self.name : foeName}撤了。这一阵耗了${qiPressure}点灵气。`
    : `这一阵耗了${qiPressure}点灵气。`;
  const consequence = myCritCount > 0
    ? "破防之后，对手的守势松了一拍。"
    : theirCrit
      ? "守势被破开，胸口一滞。"
      : guardCount > 0
        ? "守住了这一下，余劲还在腕上。"
        : "这一阵谁也没破开谁的守势。";
  const detail = `${self.name}与${foeName}过了${rounds.length}合。${self.name}以${stanceName}起手。${strike}，${answer}。破防${myCritCount}次，守势拦住${guardCount}次。${closing}${consequence}`;
  pushTravelNote(self, travelNote({
    tick: world.tick,
    kind: someoneLeft ? "injury" : "person",
    title: `与${foeName}过了手`,
    detail,
    locationId: self.locationId,
    mood: someoneLeft ? "这一架撤得不干净" : "拳脚还在身上",
  }));
}

function namedSectMate(world: WorldState, cultivator: Cultivator): { name: string; cultivatorId: string | null } {
  const peer = getCultivatorsAtLocation(world, cultivator.locationId, cultivator.id)
    .find((candidate) => candidate.sectId !== null && candidate.sectId === cultivator.sectId);
  if (peer) {
    return { name: peer.name, cultivatorId: peer.id };
  }
  const roster = ["周小山", "楚晚", "石不语", "阿宁", "陆沉舟"] as const;
  const index = hashString(`${cultivator.sectId ?? "sect"}:${cultivator.id}:mate`) % roster.length;
  return { name: roster[index] ?? "周小山", cultivatorId: null };
}

function noteSectLife(world: WorldState, cultivator: Cultivator, taskName: string): void {
  const sect = getCultivatorSect(world, cultivator);
  const place = sect?.name ?? "宗门";
  const mate = namedSectMate(world, cultivator);
  const step = Math.min(6, (cultivator.sectDiaryStep ?? 0) + 1);
  const chain: Array<{ title: string; mood: string; kind: "person" | "insight"; detail: string }> = [
    {
      title: "在宗门报了名",
      mood: "名字落在册上了",
      kind: "person",
      detail: `${cultivator.name}在${place}做完「${taskName}」。${mate.name}看着执事把名字记下了。`,
    },
    {
      title: "执事留了话",
      mood: "被记住了",
      kind: "person",
      detail: `${cultivator.name}又办完「${taskName}」。${mate.name}传了执事的话：下次可以走远一点。`,
    },
    {
      title: "同门点了名",
      mood: "路上有人",
      kind: "person",
      detail: `${mate.name}在山门里点了${cultivator.name}的名，说「${taskName}」下次一起办。`,
    },
    {
      title: "夜谈",
      mood: "话比白天多",
      kind: "person",
      detail: `夜里${mate.name}跟${cultivator.name}说了句实话，关于「${taskName}」背后那个人。`,
    },
    {
      title: "长老点了名",
      mood: "这一趟算数",
      kind: "insight",
      detail: `长老点名时，${mate.name}站在${cultivator.name}旁边。「${taskName}」被记进了册子。`,
    },
    {
      title: "同门之约",
      mood: "约在下一次",
      kind: "insight",
      detail: `${mate.name}答应${cultivator.name}：下次一起下地宫，收获里分一成。这份人情记下了。`,
    },
  ];
  const beat = chain[step - 1] ?? chain[0]!;
  if (step === 5) {
    addRealmProgress(cultivator, 4);
  }
  const peer = mate.cultivatorId ? world.cultivators[mate.cultivatorId] : null;
  if (peer && (step === 3 || step === 6)) {
    addMutualAffinity(world, cultivator.id, peer.id, 2);
  }
  if (peer && step === 6) {
    grantOwedFavor(world, cultivator.id, peer.id, "在同门差事里帮过我", "sect");
  }
  cultivator.sectDiaryStep = step >= 6 ? 0 : step;
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: beat.kind,
    title: beat.title,
    detail: beat.detail,
    locationId: cultivator.locationId,
    mood: beat.mood,
  }));
  if (peer) {
    pushTravelNote(peer, travelNote({
      tick: world.tick,
      kind: "person",
      title: `${cultivator.name}的宗门日子`,
      detail: beat.detail,
      locationId: peer.locationId,
      mood: "同门把你写进了这一笔",
    }));
  }
}

function echoDungeonCompanion(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  qiDrain: number,
  skipDrainIds?: ReadonlySet<string>,
): DungeonExpeditionProgress {
  try {
    const ids = expeditionCompanionIds(progress);
    if (ids.length === 0) {
      return progress;
    }
    const stillSharing: string[] = [];
    for (const companionId of ids) {
      try {
        const companion = world.cultivators[companionId];
        if (!companion) continue;
        // A companion who was on the run at the start stays on the roster until the run ends
        // or they explicitly leave. Stepping away from the gate, or starting another job,
        // skips this step's qi chip. It does not erase them.
        if (companion.locationId !== progress.locationId || companion.activeJobId || skipDrainIds?.has(companionId)) {
          stillSharing.push(companionId);
          continue;
        }
        const drain = Math.max(1, Math.floor(qiDrain / 2));
        companion.qi = clamp(companion.qi - drain, 1, companion.maxQi);
        stillSharing.push(companionId);
      } catch {
        // One companion must not drop the others or the leader's step.
      }
    }
    return withCompanionIds(progress, stillSharing);
  } catch {
    return progress;
  }
}

function spokenClauseFromDetail(detail: string): string | null {
  const quote = detail.match(/「([^」]{1,40})」/);
  if (!quote) return null;
  const speaker = detail.match(/^([\u4e00-\u9fffA-Za-z0-9·]{1,8}?)(?:对|跟|向|在|说|回|传|用)/);
  return `${speaker?.[1] ?? "有人"}说：「${quote[1]}」`;
}

function tendClauseFromNote(title: string, detail: string): string | null {
  if (!title.includes("疗") && !detail.includes("把伤压")) return null;
  const match = detail.match(/^([\u4e00-\u9fffA-Za-z0-9·]{1,8}?)(?:用了|耗了).*帮([\u4e00-\u9fffA-Za-z0-9·]{1,8}?)把伤压/);
  if (!match) return null;
  return `${match[1]}给${match[2]}把伤压了下去。`;
}

function rememberSharedMoment(
  world: WorldState,
  principals: readonly Cultivator[],
  clause: string,
  kind: "spoken" | "tended",
): void {
  const ids = new Set(principals.map((person) => person.id));
  for (const progress of Object.values(world.dungeonExpeditions)) {
    const onRun = ids.has(progress.cultivatorId) || expeditionCompanionIds(progress).some((id) => ids.has(id));
    if (!onRun) continue;
    if (kind === "spoken") {
      const heard = progress.heardLines ?? [];
      if (heard.length < 2 && !heard.includes(clause)) progress.heardLines = [...heard, clause];
    } else {
      const tended = progress.tendedLines ?? [];
      if (tended.length < 2 && !tended.includes(clause)) progress.tendedLines = [...tended, clause];
    }
  }
}

function echoPartyWitness(
  world: WorldState,
  principals: readonly Cultivator[],
  title: string,
  detail: string,
): void {
  const party = principals.map((person) => getPartyOf(world, person.id)).find((candidate) => candidate !== null);
  if (!party) return;
  const principalIds = new Set(principals.map((person) => person.id));
  const places = new Set(principals.map((person) => person.locationId));
  for (const memberId of party.memberIds) {
    if (principalIds.has(memberId)) continue;
    const witness = world.cultivators[memberId];
    if (!witness || !places.has(witness.locationId)) continue;
    pushTravelNote(witness, travelNote({
      tick: world.tick,
      kind: "person",
      title,
      detail,
      locationId: witness.locationId,
      mood: "同队的人听见了",
    }));
  }
}

function shareMoment(
  world: WorldState,
  principals: readonly Cultivator[],
  title: string,
  detail: string,
  clause: string,
  kind: "spoken" | "tended",
): void {
  try {
    echoPartyWitness(world, principals, title, detail);
    rememberSharedMoment(world, principals, clause, kind);
  } catch {
    // A witness note must not roll the action back.
  }
}

function seedSharedMoments(world: WorldState, progress: DungeonExpeditionProgress, people: readonly Cultivator[]): void {
  const since = world.tick - 6;
  const heard = [...(progress.heardLines ?? [])];
  const tended = [...(progress.tendedLines ?? [])];
  for (const person of people) {
    for (const note of person.travelNotes ?? []) {
      if (note.tick < since) continue;
      const spoken = spokenClauseFromDetail(note.detail);
      if (spoken && heard.length < 2 && !heard.includes(spoken)) heard.push(spoken);
      const tendedLine = tendClauseFromNote(note.title, note.detail);
      if (tendedLine && tended.length < 2 && !tended.includes(tendedLine)) tended.push(tendedLine);
    }
  }
  if (heard.length > 0) progress.heardLines = heard;
  if (tended.length > 0) progress.tendedLines = tended;
}

function sharedRunRetelling(world: WorldState, leader: Cultivator, progress: DungeonExpeditionProgress): string {
  const companions = expeditionCompanionIds(progress)
    .map((id) => world.cultivators[id])
    .filter((person): person is Cultivator => Boolean(person));
  const people = [leader, ...companions];
  const last = progress.combatRounds?.[progress.combatRounds.length - 1];
  const roles = last && last.party.length > 0
    ? last.party.map((member) => `${member.name}以${member.roleLabel}`).join("，")
    : people.map((person) => `${person.name}以${partyRoleForCultivator(person).label}`).join("，");
  const skillLine = last
    ? last.party
      .filter((member) => member.skills.length > 0)
      .slice(0, 3)
      .map((member) => `${member.name}使出${member.skills.slice(0, 2).join("、")}`)
      .join("，")
    : "";
  const beat = last?.beats[0] ?? progress.beats?.[progress.beats.length - 1]?.detail ?? "";
  const wound = last?.wound ?? "";
  const spoken = (progress.heardLines ?? [])[0] ?? "";
  const tended = (progress.tendedLines ?? [])[0] ?? "";
  const memory = (progress.partyMoments ?? []).map((moment) => moment.pairedLine).filter(Boolean).slice(0, 2).join("");
  return [`${roles}。`, skillLine ? `${skillLine}。` : "", beat, wound, spoken, tended, memory].filter(Boolean).join("");
}

function publishCompanionExpeditionReports(
  world: WorldState,
  leader: Cultivator,
  progress: DungeonExpeditionProgress,
  report: DungeonExpeditionReport,
): void {
  for (const companionId of expeditionCompanionIds(progress)) {
    if (companionId === leader.id) continue;
    const companion = world.cultivators[companionId];
    if (!companion) continue;
    try {
      const copy = structuredClone(report);
      copy.cultivatorId = companion.id;
      copy.sharedLeaderId = leader.id;
      copy.sharedLeaderName = leader.name;
      copy.summary = `你跟着${leader.name}走了这一趟。${report.summary}`;
      world.dungeonExpeditionReports[companion.id] = copy;
    } catch {
      // One companion's report must not drop the leader's.
    }
  }
}

function settleDungeonCompanion(
  world: WorldState,
  leader: Cultivator,
  progress: DungeonExpeditionProgress,
  outcome: DungeonExpeditionReport["outcome"],
  returnLocationId: string,
): void {
  try {
    const ids = expeditionCompanionIds(progress);
    if (ids.length === 0) return;
    const settling = ids
      .map((companionId) => world.cultivators[companionId])
      .filter((companion): companion is Cultivator => Boolean(
        companion && companion.locationId === progress.locationId && !companion.activeJobId,
      ));
    const retelling = sharedRunRetelling(world, leader, progress);
    const settledIds = new Set<string>();
    if (settling.length > 0) {
      const eachShare = Math.max(0, Math.floor(progress.spiritStoneGain * 0.2 / settling.length));
      for (const companion of settling) {
        try {
          let detail = `${leader.name}与${companion.name}一起离开了地宫。`;
          if (outcome === "completed") {
            const share = Math.min(leader.spiritStones, eachShare);
            if (share > 0) {
              leader.spiritStones -= share;
              companion.spiritStones += share;
            }
            detail = `${leader.name}与${companion.name}一起出了地宫。收获里分给${companion.name} ${share} 枚灵石。`;
            addMutualAffinity(world, leader.id, companion.id, 2);
          } else if (outcome === "withdrew" || outcome === "catastrophic") {
            const loss = Math.min(companion.spiritStones, Math.max(4, Math.floor((progress.stonesLost ?? 0) * 0.3)));
            companion.spiritStones -= loss;
            raiseInjury(world, companion, outcome === "catastrophic" ? 4 : 2);
            syncWounded(companion);
            detail = `${leader.name}与${companion.name}一起被拖出地宫。${companion.name}也洒了 ${loss} 枚灵石，身上挂了伤。`;
          } else {
            detail = `${leader.name}中止了探索。${companion.name}跟着一起撤出地宫。`;
          }
          detail = `${detail}${retelling}`;
          companion.locationId = returnLocationId;
          settledIds.add(companion.id);
          pushTravelNote(leader, travelNote({
            tick: world.tick,
            kind: outcome === "completed" ? "person" : "injury",
            title: `与${companion.name}一起出了地宫`,
            detail,
            locationId: leader.locationId,
            mood: outcome === "completed" ? "有人分了这一趟" : "两个人都记得为什么疼",
          }));
          pushTravelNote(companion, travelNote({
            tick: world.tick,
            kind: outcome === "completed" ? "find" : "injury",
            title: `跟着${leader.name}出了地宫`,
            detail,
            locationId: companion.locationId,
            mood: outcome === "completed" ? "口袋里有同伴分来的石头" : "伤是一起带出来的",
          }));
        } catch {
          // One companion must not roll the leader's exit back.
        }
      }
    }
    for (const companionId of ids) {
      if (settledIds.has(companionId)) continue;
      const companion = world.cultivators[companionId];
      if (!companion) continue;
      try {
        pushTravelNote(companion, travelNote({
          tick: world.tick,
          kind: "person",
          title: `${leader.name}的这一趟`,
          detail: `你没有留在门口分这一趟的账。${retelling}`,
          locationId: companion.locationId,
          mood: "人没在门口，这一趟还是听见了",
        }));
      } catch {
        // One absent companion must not drop the others.
      }
    }
  } catch {
    // A companion note must not roll the leader's exit back.
  }
}

function assertMysteryRank(cultivator: Cultivator, grade: DungeonGrade, rank: number): void {
  const gate = mysteryEntry(grade, rank, cultivator.realmLevel);
  if (!gate.ok) throw new GameplayRejection(gate.line);
}

function grantJiaTemperamentDrop(
  cultivator: Cultivator,
  progress: DungeonExpeditionProgress,
  outcome: "completed" | "withdrew",
): void {
  if (progress.grade !== "甲") return;
  const drop = jiaClosingDrop({
    rank: progress.targetRank,
    outcome,
    temperament: progress.jiaTemperament ?? jiaTemperamentForRank(progress.targetRank),
    haul: progress.jiaHaul ?? null,
  });
  if (drop.count <= 0) return;
  cultivator.inventory[drop.itemId] = (cultivator.inventory[drop.itemId] ?? 0) + drop.count;
}

function grantCultivationDrop(
  world: WorldState,
  cultivator: Cultivator,
  grade: "丙" | "乙" | "甲",
  rank: number,
): void {
  const itemId = cultivationDropForRank(grade, rank);
  if (!itemId) return;
  cultivator.inventory[itemId] = (cultivator.inventory[itemId] ?? 0) + 1;
  addResourceGainLog(
    world,
    cultivator.id,
    "秘境灵材",
    `${cultivator.name}在这一层拿到了${ITEM_CATALOG[itemId]?.name ?? itemId}。闭关时用上一份，修为会涨得快一点。`,
    ["cultivation", "dungeon"],
    [{ itemId, count: 1 }],
  );
}

function consumeCultivationAid(cultivator: Cultivator): { name: string; bonus: number } | null {
  if (cultivator.realmProgress >= 100) return null;
  const aid = cultivationAidForLevel(cultivator.realmLevel);
  if (aid) {
    const owned = cultivator.inventory[aid.itemId] ?? 0;
    if (owned > 0) {
      cultivator.inventory[aid.itemId] = owned - 1;
      return { name: aid.name, bonus: aid.bonus };
    }
  }
  const regional = takeRegionalMeditationAid(cultivator);
  if (!regional) return null;
  if (regional.syncWound) syncWounded(cultivator);
  return { name: regional.name, bonus: regional.bonus };
}

function grantLoadoutSourceDrop(
  world: WorldState,
  cultivator: Cultivator,
  grade: "丙" | "乙" | "甲",
  rank: number,
  seed: string,
): void {
  const tier = dungeonSourceTier(grade, rank);
  const drop = preferredHighTierDrop(cultivator, tier, seed) ?? pickLoadoutSourceDrop(tier, seed);
  cultivator.inventory[drop] = (cultivator.inventory[drop] ?? 0) + 1;
  addResourceGainLog(
    world,
    cultivator.id,
    "来源物掉落",
    `${cultivator.name} 得到了${ITEM_CATALOG[drop]?.name ?? drop}。`,
    [drop.startsWith("weapon-") ? "weapon-source" : "spell-source"],
    [{ itemId: drop, count: 1 }],
  );
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

  const flushed = flushDungeonSighting(progress, dungeonPlace(progress));
  if (flushed.sighting) {
    publishExpeditionStory(world, cultivator, flushed.progress, flushed.sighting, "growth");
  }
  progress = flushed.progress;

  const returnLocationId = safeExpeditionReturnLocationId(world, cultivator.locationId);
  cultivator.locationId = returnLocationId;

  const relic = chronicleRelic({
    grade: progress.grade,
    rank: progress.targetRank,
    outcome,
    seed: `${cultivator.id}:${progress.jobId}:${progress.targetRank}`,
  });
  if (outcome === "completed" || (outcome === "withdrew" && progress.stepIndex > 0)) {
    const beforeClose = structuredClone(cultivator.inventory);
    grantLoadoutSourceDrop(world, cultivator, metadata.grade, progress.targetRank, `${world.tick}:${cultivator.id}:expedition-loadout-source`);
    grantCultivationDrop(world, cultivator, metadata.grade, progress.targetRank);
    grantJiaTemperamentDrop(cultivator, progress, outcome);
    progress = {
      ...progress,
      secondaryDrops: mergePositiveDrops(progress.secondaryDrops, positiveInventoryDelta(beforeClose, cultivator.inventory)),
    };
  }
  const report = createDungeonExpeditionReport({
    progress,
    outcome,
    endedAtTick: world.tick,
    returnLocationId,
    returnPlaceName: world.locations[returnLocationId]?.name,
    primaryMaterial: metadata.materialBand,
    relic: relic ?? undefined,
    realmProgressCapped: cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED && progress.realmProgressGain <= 0,
  });

  if (relic) {
    cultivator.inventory[relic.itemId] = (cultivator.inventory[relic.itemId] ?? 0) + 1;
  }

  world.dungeonExpeditionReports[cultivator.id] = report;
  delete world.dungeonExpeditions[cultivator.id];
  const haulClause = jiaHaulSummaryClause({
    grade: progress.grade,
    rank: progress.targetRank,
    outcome,
    secondaryDrops: report.secondaryDrops,
    haul: progress.jiaHaul ?? null,
  });
  if (haulClause) {
    const haulTitle = report.secondaryDropCards?.find((card) => (
      card.itemId === "danxia-cinder" || card.itemId === "fire-poison-bead" || card.itemId === "array-shard"
    ))?.itemName ?? "旁支";
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "find",
      title: haulTitle,
      detail: haulClause,
      locationId: cultivator.locationId,
      mood: "袖上还沾着",
    }));
  }
  settleDungeonCompanion(world, cultivator, progress, outcome, returnLocationId);
  publishPartyExpeditionMemories(world, progress);
  if (relic) publishJiaRelicChronicle(world, cultivator, progress, relic);
  publishCompanionExpeditionReports(world, cultivator, progress, report);
  writeDungeonExpeditionSummaryEvent(world, cultivator.id, returnLocationId, report);
  return report;
}

function publishJiaRelicChronicle(
  world: WorldState,
  leader: Cultivator,
  progress: DungeonExpeditionProgress,
  relic: NonNullable<DungeonExpeditionReport["relic"]>,
): void {
  const people = [leader];
  for (const companionId of expeditionCompanionIds(progress)) {
    const companion = world.cultivators[companionId];
    if (companion && companion.id !== leader.id) people.push(companion);
  }
  const detail = `${leader.name}走完甲级第${relic.rank}层的${relic.mysteryName}，带出${relic.name}。${relic.arcLine}`;
  for (const person of people) {
    try {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "find",
        title: relic.name,
        detail,
        locationId: person.locationId,
        mood: "这一句可以拿回去说",
      }));
      recordLife(person, {
        tick: world.tick,
        kind: "quote",
        text: `${leader.name}说：「${relic.arcLine}」`,
        speakerName: leader.name,
        line: relic.arcLine,
      });
    } catch {
      // One listener must not drop the relic line.
    }
  }
}

function dungeonPlace(progress: DungeonExpeditionProgress): string {
  const base = `${progress.grade}级地宫第${progress.targetRank}层`;
  const name = lightPlaceName(progress.grade, progress.targetRank);
  return name ? `${base}·${name}` : base;
}

function publishExpeditionStory(
  world: WorldState,
  leader: Cultivator,
  progress: DungeonExpeditionProgress,
  note: { kind: DungeonBeat["kind"]; title: string; detail: string; mood: string },
  lifeKind: "growth" | "fight",
): void {
  const people = [leader];
  for (const companionId of expeditionCompanionIds(progress)) {
    const companion = world.cultivators[companionId];
    if (companion && companion.id !== leader.id) people.push(companion);
  }
  for (const person of people) {
    try {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: note.kind,
        title: note.title,
        detail: note.detail,
        locationId: person.locationId,
        mood: note.mood,
      }));
      recordLife(person, { tick: world.tick, kind: lifeKind, text: note.detail });
    } catch {
      // One listener must not drop the story.
    }
  }
}

function attachCarriedLine(world: WorldState, people: readonly Cultivator[], carried: string): void {
  for (const person of people) {
    try {
      const fight = (person.lifeLog ?? []).find((event) => (
        event.kind === "fight" && event.tick === world.tick && !event.text.includes("带出何物")
      ));
      if (fight) fight.text = `${fight.text}${carried}`;
      else recordLife(person, { tick: world.tick, kind: "fight", text: carried });
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "find",
        title: "带出何物",
        detail: carried,
        locationId: person.locationId,
        mood: "这一句可以拿回去说",
      }));
    } catch {
      // A carried line must not roll the step back.
    }
  }
}

function battleCombatantFromCultivator(cultivator: Cultivator): BattleCombatant {
  const snap = buildCultivatorCombatSnapshot(cultivator, true);
  const role = partyRoleForCultivator(cultivator);
  return {
    id: cultivator.id,
    name: cultivator.name,
    side: "party",
    role: role.id,
    hp: snap.hp,
    maxHp: snap.maxHp,
    weaponAttack: snap.weaponAttack ?? snap.attack,
    spellAttack: Math.max(1, snap.spellAttack ?? 0),
    defense: snap.defense,
    speed: snap.speed,
    hit: snap.hit + Math.min(3, Math.floor((cultivator.roleExperience?.[role.id] ?? 0) / 8)),
    dodge: snap.dodge,
    crit: snap.crit,
    critDamage: snap.critDamage,
    guardHeart: snap.guardHeart,
    spirit: cultivator.spiritualPower,
    maxSpirit: Math.max(1, cultivator.maxSpiritualPower),
    skills: skillsForCultivator(cultivator),
  };
}

function battleCombatantForDuel(
  cultivator: Cultivator,
  snap: CombatSnapshot,
  spirit: number,
  maxSpirit: number,
  side: "party" | "enemy",
): BattleCombatant {
  const role = partyRoleForCultivator(cultivator);
  const roleXp = cultivator.roleExperience?.[role.id] ?? 0;
  return {
    id: cultivator.id,
    name: cultivator.name,
    side,
    role: role.id,
    hp: Math.max(1, snap.hp),
    maxHp: Math.max(1, snap.maxHp),
    weaponAttack: Math.max(1, snap.weaponAttack ?? snap.attack),
    spellAttack: Math.max(1, snap.spellAttack ?? snap.attack),
    defense: snap.defense,
    speed: snap.speed,
    hit: snap.hit + Math.min(3, Math.floor(roleXp / 8)),
    dodge: snap.dodge,
    crit: snap.crit,
    critDamage: snap.critDamage,
    guardHeart: snap.guardHeart,
    spirit: Math.max(0, spirit),
    maxSpirit: Math.max(1, maxSpirit),
    skills: skillsForCultivator(cultivator),
  };
}

function paintDuelFromBattle(state: CombatJobState, battle: PartyBattleResult, playerId: string, enemyId: string): void {
  const blank = {
    baseDamage: 0,
    styleMultiplier: 1,
    triangleMultiplier: 1,
    routeDamageMultiplier: 1,
    critMultiplier: 1,
    actionMultiplier: 1,
    finalDamage: 0,
  };
  state.resolved = true;
  state.currentRound = Math.max(1, battle.roundsPlayed);
  state.playerSnapshot = { ...state.playerSnapshot, hp: battle.finalHp[playerId] ?? state.playerSnapshot.hp };
  state.enemySnapshot = { ...state.enemySnapshot, hp: battle.finalHp[enemyId] ?? state.enemySnapshot.hp };
  const cast = battle.summary.party
    .map((member) => {
      const skills = member.skills.filter((name) => name.length > 0).slice(0, 2);
      return skills.length > 0
        ? `${member.name}（${member.roleLabel}）使出${skills.join("、")}`
        : `${member.name}（${member.roleLabel}）`;
    })
    .join("，");
  const spoken = battle.summary.highlights.map((line) => line.note).filter((note) => note.includes("使出"));
  const beats = (spoken.length > 0 ? spoken.slice(0, 2) : battle.summary.beats.slice(0, 2)).join("");
  state.duelReport = `${cast}。${beats}`;
  state.duelSummary = battle.summary;
  state.duelPractice = Object.fromEntries(battle.practice.map((entry) => [entry.id, entry.skillIds]));
  state.rounds = battle.strikeLog.map((strike, index) => ({
    round: index + 1,
    playerInitiative: 1,
    enemyInitiative: 1,
    firstActor: "player" as const,
    playerRoute: state.playerStyle,
    playerAttack: strike.leader ? { result: strike.leader, damage: { ...blank } } : null,
    enemyAttack: strike.enemy ? { result: strike.enemy, damage: { ...blank } } : null,
    playerHpAfter: state.playerSnapshot.hp,
    enemyHpAfter: state.enemySnapshot.hp,
    playerDied: battle.outcome === "loss",
    enemyDied: battle.outcome === "win",
  }));
  if (battle.outcome === "draw") {
    state.duelDraw = true;
    state.retreated = false;
    state.retreatingSide = undefined;
    state.outcome = null;
    return;
  }
  state.duelDraw = false;
  if (battle.outcome === "withdraw") {
    state.retreated = true;
    state.retreatingSide = battle.retreatingSide === "enemy" ? "enemy" : "player";
    state.outcome = state.retreatingSide === "enemy" ? "victory" : "defeat";
    const escape = { attempted: true, success: true, chance: 100 };
    const first = state.rounds[0];
    if (first) {
      if (state.retreatingSide === "enemy") first.enemyEscape = escape;
      else first.playerEscape = escape;
    }
    return;
  }
  state.retreated = false;
  state.retreatingSide = undefined;
  state.outcome = battle.outcome === "loss" ? "defeat" : "victory";
}

function resolveCityDuelWithSkills(
  world: WorldState,
  job: ActionJob,
  cultivator: Cultivator,
  state: CombatJobState,
): boolean {
  const target = state.pvpTargetCultivatorId ? world.cultivators[state.pvpTargetCultivatorId] : null;
  if (!target) return false;
  const ally = battleCombatantForDuel(
    cultivator,
    state.playerSnapshot,
    state.playerSpirit ?? state.playerSnapshot.spirit ?? cultivator.spiritualPower,
    state.playerMaxSpirit ?? state.playerSnapshot.maxSpirit ?? cultivator.maxSpiritualPower,
    "party",
  );
  const enemy = battleCombatantForDuel(
    target,
    state.enemySnapshot,
    state.enemySpirit ?? state.enemySnapshot.spirit ?? target.spiritualPower,
    state.enemyMaxSpirit ?? state.enemySnapshot.maxSpirit ?? target.maxSpiritualPower,
    "enemy",
  );
  const battle = runPartyBattle({
    allies: [ally],
    enemies: [enemy],
    policy: "aggressive",
    seed: `${world.tick}:${job.id}:city-duel`,
    maxRounds: Math.max(1, state.maxRounds),
    leaderId: cultivator.id,
    duel: true,
  });
  paintDuelFromBattle(state, battle, cultivator.id, target.id);
  return true;
}

function paintCombatStateFromBattle(state: CombatJobState, battle: PartyBattleResult): void {
  const blank = {
    baseDamage: 0,
    styleMultiplier: 1,
    triangleMultiplier: 1,
    routeDamageMultiplier: 1,
    critMultiplier: 1,
    actionMultiplier: 1,
    finalDamage: 0,
  };
  state.resolved = true;
  state.currentRound = battle.roundsPlayed;
  state.retreated = battle.outcome === "withdraw";
  state.retreatingSide = battle.outcome === "withdraw" ? "player" : undefined;
  state.outcome = battle.outcome === "loss" ? "defeat" : "victory";
  state.rounds = battle.strikeLog.map((strike, index) => ({
    round: index + 1,
    playerInitiative: 1,
    enemyInitiative: 1,
    firstActor: "player" as const,
    playerAttack: strike.leader ? { result: strike.leader, damage: { ...blank } } : null,
    enemyAttack: strike.enemy ? { result: strike.enemy, damage: { ...blank } } : null,
    playerHpAfter: state.playerSnapshot.hp,
    enemyHpAfter: battle.outcome === "win" ? 0 : state.enemySnapshot.hp,
    playerDied: battle.outcome === "loss",
    enemyDied: battle.outcome === "win",
  }));
}

function keepRecentCombatRounds<T extends { beats: readonly string[] }>(rounds: T[]): T[] {
  const trimmed = rounds.slice(-3);
  const carried = [...rounds].reverse().find((round) => round.beats.some((beat) => beat.includes("带出何物")));
  if (!carried || trimmed.includes(carried)) return trimmed;
  return [carried, ...trimmed.slice(-2)];
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
      if (effectiveProgress.pendingWakeNode.partyKind) {
        const awaiting = partyWakeAwaitingIds(world, effectiveProgress);
        const chosen = partyWakeResolvedOption(effectiveProgress.pendingWakeNode, awaiting, effectiveProgress.policy);
        effectiveProgress = resolvePartyExpeditionWake({
          world,
          progress: effectiveProgress,
          optionId: chosen,
          awaitingIds: awaiting,
          timedOut: true,
        });
      } else {
        const chosen = chooseDefaultDungeonWakeOptionId(effectiveProgress);
        const settlement = settleDungeonWakeNode(effectiveProgress, chosen, "timeout");
        applyDungeonWakeSettlement(world, cultivator, settlement);
        const timeoutLine = settlement.beat?.detail ?? "时辰到了，代选了这一条。";
        addDaoLog(world, cultivator.id, "地宫岔路", timeoutLine, ["dungeon-wake", "timeout"]);
        effectiveProgress = settlement.progress;
      }
      world.dungeonExpeditions[cultivator.id] = effectiveProgress;
      stampDungeonWake(job, effectiveProgress);
    } else {
      job.remainingTicks += 1;
      stampDungeonWake(job, effectiveProgress);
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
  const beforePendingSceneChoiceId = cultivator.pendingSceneChoiceId ?? null;
  const beforeSceneChoiceIds = new Set(Object.keys(world.pendingSceneChoices ?? {}));

  const actionKind = chooseDungeonExpeditionStepKind({
    targetRank: effectiveProgress.targetRank,
    frontierRank: highestUnlockedRankOf(cultivator, effectiveProgress.grade),
    highestClearedRank: beforeHighestClearedRank,
    policy: effectiveProgress.policy,
    jobId: job.id,
    stepIndex: effectiveProgress.stepIndex,
    worldTick: world.tick,
    cultivatorId: cultivator.id,
    grade: effectiveProgress.grade,
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
  let expeditionBattle: PartyBattleResult | null = null;
  let interiorBattle: PartyBattleResult | null = null;
  const battleAllyIds: string[] = [];
  if (actionKind === "guardian") {
    const expedGuardianSeed = hashString(`${world.tick}:${cultivator.id}:expedition-guardian:${effectiveProgress.grade}:${effectiveProgress.targetRank}`);
    const expedGuardianEncounter = resolveGuardianEncounterTemplate(expedGuardianSeed);
    const policyScale = effectiveProgress.policy === "aggressive" ? 1.18 : effectiveProgress.policy === "conservative" ? 0.84 : 1;
    const combatScale = guardianCombatScale(effectiveProgress.grade, effectiveProgress.targetRank) * policyScale;
    const guardianTemplate = stampJiaGuardianTemplate(
      expedGuardianEncounter.template,
      effectiveProgress.grade,
      effectiveProgress.targetRank,
    );
    const combatState = initializeCombatJobState(
      world,
      cultivator,
      guardianTemplate,
      combatScale,
      expedGuardianEncounter.buildId ?? undefined,
    );
    try {
      const allies = [battleCombatantFromCultivator(cultivator)];
      for (const companionId of expeditionCompanionIds(effectiveProgress)) {
        const companion = world.cultivators[companionId];
        if (!companion || companion.locationId !== cultivator.locationId || companion.activeJobId) continue;
        allies.push(battleCombatantFromCultivator(companion));
        battleAllyIds.push(companion.id);
      }
      const template = guardianTemplate;
      const cfg = expedGuardianEncounter.enemyConfigId ? getEnemyConfig(expedGuardianEncounter.enemyConfigId) : null;
      const enemyName = cfg?.nameCn ?? template.enemyName;
      const enemies = buildGuardianPack({
        id: template.id,
        name: enemyName,
        patternKey: expedGuardianEncounter.enemyConfigId ?? template.id,
        grade: effectiveProgress.grade,
        rank: effectiveProgress.targetRank,
        policy: effectiveProgress.policy,
        combatScale,
        baseHp: template.baseHp,
        attack: template.attack,
        defense: template.defense,
        speed: template.speed,
        hit: template.hit,
        dodge: template.dodge,
        crit: template.crit,
        critDamage: template.critDamage,
        guardHeart: template.guardHeart,
        spirit: template.spirit ?? 40,
        maxSpirit: template.maxSpirit ?? template.spirit ?? 40,
      });
      const rankExtra = effectiveProgress.targetRank >= 7 ? 1 : 0;
      expeditionBattle = runPartyBattle({
        allies,
        enemies,
        policy: effectiveProgress.policy,
        seed: `${world.tick}:${job.id}:${effectiveProgress.stepIndex}:party-battle`,
        maxRounds: (effectiveProgress.policy === "conservative" ? 5 : effectiveProgress.policy === "aggressive" ? 8 : 6) + rankExtra,
        leaderId: cultivator.id,
      });
      paintCombatStateFromBattle(combatState, expeditionBattle);
      const practiceBonus = expeditionBattle.outcome === "win" && effectiveProgress.targetRank >= 2 ? 1 : 0;
      for (const entry of expeditionBattle.practice) {
        const person = world.cultivators[entry.id];
        if (!person) continue;
        grantCombatPractice(person, entry.skillIds, 1 + practiceBonus);
      }
    } catch {
      while (!combatState.resolved && combatState.currentRound < combatState.maxRounds) {
        resolveOneRound(combatState, world, syntheticJob, cultivator);
      }
      expeditionBattle = null;
    }
    setCombatJobState(syntheticJob, combatState);
  }

  if (actionKind === "search") {
    const allies = [battleCombatantFromCultivator(cultivator)];
    for (const companionId of expeditionCompanionIds(effectiveProgress)) {
      const companion = world.cultivators[companionId];
      if (!companion || companion.locationId !== cultivator.locationId || companion.activeJobId) continue;
      allies.push(battleCombatantFromCultivator(companion));
      battleAllyIds.push(companion.id);
    }
    interiorBattle = resolveInteriorSkirmish({
      grade: effectiveProgress.grade,
      rank: effectiveProgress.targetRank,
      stepIndex: effectiveProgress.stepIndex,
      actionKind,
      seed: `${world.tick}:${job.id}:${effectiveProgress.stepIndex}:interior`,
      allies,
      leaderId: cultivator.id,
      policy: effectiveProgress.policy,
    });
    if (interiorBattle?.outcome === "win") {
      for (const entry of interiorBattle.practice) {
        const person = world.cultivators[entry.id];
        if (!person) continue;
        grantCombatPractice(person, entry.skillIds, 1);
      }
    }
  }

  resolveEnhancedJob(world, syntheticJob);
  cultivator.activeJobId = outerJobId;

  const qiRatioBefore = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
  const pressure = expeditionPressureFor({
    policy: effectiveProgress.policy,
    rank: effectiveProgress.targetRank,
    grade: effectiveProgress.grade,
    action: actionKind,
    seed: `${world.tick}:${job.id}:${effectiveProgress.stepIndex}:${actionKind}`,
    qiRatio: qiRatioBefore,
  });
  if (pressure.stoneDelta !== 0) {
    cultivator.spiritStones = Math.max(0, cultivator.spiritStones + pressure.stoneDelta);
  }
  if (pressure.moralityDelta !== 0) {
    applyMoralityDelta(world, cultivator, pressure.moralityDelta, "dungeon-encounter");
  }
  const battleSeverity = expeditionBattle?.leaderHpLostRatio ?? 0;
  const battleSpirit = expeditionBattle?.leaderSpiritSpentRatio ?? 0;
  let qiDrain = Math.max(1, Math.round(pressure.qiDrain * (expeditionBattle ? 0.65 + battleSeverity : 1)));
  let spiritualDrain = Math.max(1, Math.round(pressure.spiritualDrain * (expeditionBattle ? 0.55 + battleSpirit : 1)));
  let injuryTicks = pressure.injuryTicks;
  if (expeditionBattle) {
    if (expeditionBattle.outcome === "loss") {
      qiDrain = Math.round(qiDrain * 1.25);
    } else if (expeditionBattle.outcome === "win") {
      const bonus = effectiveProgress.policy === "aggressive"
        ? 2 + Math.floor((effectiveProgress.targetRank - 1) / 3)
        : effectiveProgress.policy === "balanced" ? 1 : 0;
      cultivator.spiritStones += bonus;
    }
    injuryTicks = woundTicksForGuardian({
      rank: effectiveProgress.targetRank,
      grade: effectiveProgress.grade,
      policy: effectiveProgress.policy,
      outcome: expeditionBattle.outcome,
      leaderHpLostRatio: expeditionBattle.leaderHpLostRatio,
      pressureInjury: injuryTicks,
    });
  }
  cultivator.qi = clamp(cultivator.qi - qiDrain, 1, cultivator.maxQi);
  cultivator.spiritualPower = clamp(
    cultivator.spiritualPower - spiritualDrain,
    0,
    cultivator.maxSpiritualPower,
  );
  const woundedNow: Cultivator[] = [];
  if (injuryTicks > 0) {
    raiseInjury(world, cultivator, injuryTicks);
    syncWounded(cultivator);
    woundedNow.push(cultivator);
  }
  if (interiorBattle) {
    const interiorQi = interiorBattle.outcome === "loss" ? 4 : 2;
    cultivator.qi = clamp(cultivator.qi - interiorQi, 1, cultivator.maxQi);
    if (
      interiorBattle.outcome === "loss"
      && effectiveProgress.policy !== "conservative"
      && effectiveProgress.stepIndex === 4
    ) {
      raiseInjury(world, cultivator, 2);
      syncWounded(cultivator);
      if (!woundedNow.some((person) => person.id === cultivator.id)) woundedNow.push(cultivator);
    }
  }
  let bandFailStones = 0;
  let bandFailBeat: { kind: "injury"; title: string; detail: string; mood: string } | null = null;
  if (expeditionBattle && (expeditionBattle.outcome === "loss" || expeditionBattle.outcome === "withdraw")) {
    bandFailStones = settleJiaBandFail(
      world,
      cultivator,
      effectiveProgress.grade,
      effectiveProgress.targetRank,
      expeditionBattle.outcome,
    );
    const bandCost = jiaBandFailCost(
      effectiveProgress.grade,
      effectiveProgress.targetRank,
      expeditionBattle.outcome,
    ) ?? lightFailCost(
      effectiveProgress.grade,
      effectiveProgress.targetRank,
      expeditionBattle.outcome,
    );
    if (bandCost) {
      bandFailBeat = {
        kind: "injury",
        title: bandCost.title,
        detail: bandCost.sentence,
        mood: bandCost.mood,
      };
    }
  }
  const foughtWith = new Set<string>();
  if (expeditionBattle) {
    for (const [companionId, loss] of Object.entries(expeditionBattle.companionQiLoss)) {
      const companion = world.cultivators[companionId];
      if (!companion) continue;
      companion.qi = clamp(companion.qi - loss, 1, companion.maxQi);
      foughtWith.add(companionId);
      const companionInjury = companionWoundTicks({
        rank: effectiveProgress.targetRank,
        grade: effectiveProgress.grade,
        outcome: expeditionBattle.outcome,
        qiLoss: loss,
      });
      if (companionInjury > 0) {
        raiseInjury(world, companion, companionInjury);
        syncWounded(companion);
        woundedNow.push(companion);
      }
    }
    if (woundedNow.length > 0) {
      const names = woundedNow.map((person) => person.name).join("、");
      expeditionBattle.summary.wound = `${names}挂了伤。伤着的时候进不了地宫，得歇着、服疗伤丹，或让身边的人把伤压下去。`;
    }
    if (expeditionBattle.outcome === "win") {
      const hurt = new Set(woundedNow.map((person) => person.id));
      for (const person of [cultivator, ...battleAllyIds.map((id) => world.cultivators[id]).filter((person): person is Cultivator => Boolean(person))]) {
        if (!hurt.has(person.id)) shiftCultivatorMood(world, person, "win");
      }
    }
  }
  addRealmProgress(cultivator, pressure.realmProgress);
  const fightBeats = expeditionBattle?.beats ?? interiorBattle?.beats ?? [];
  const completedStep = effectiveProgress.stepIndex + 1;
  const roomBeat = interiorRoomBeat({
    grade: effectiveProgress.grade,
    rank: effectiveProgress.targetRank,
    step: completedStep,
    fought: Boolean(expeditionBattle || interiorBattle),
  });
  const addedBeats = [
    ...(fightBeats.length > 0 ? fightBeats : [pressure.beat]),
    ...(roomBeat ? [roomBeat] : []),
    ...(bandFailBeat ? [bandFailBeat] : []),
  ];
  const appended = appendDungeonBeats(
    effectiveProgress,
    addedBeats,
    `${world.tick}:${job.id}:${effectiveProgress.stepIndex}`,
    dungeonPlace(effectiveProgress),
  );
  effectiveProgress = {
    ...appended.progress,
    combatRounds: expeditionBattle || interiorBattle
      ? keepRecentCombatRounds([
          ...(effectiveProgress.combatRounds ?? []),
          ...(expeditionBattle ? [expeditionBattle.summary] : []),
          ...(interiorBattle ? [interiorBattle.summary] : []),
        ])
      : effectiveProgress.combatRounds,
    qiSpent: (effectiveProgress.qiSpent ?? 0) + qiDrain,
    spiritualPowerSpent: (effectiveProgress.spiritualPowerSpent ?? 0) + spiritualDrain,
    injuryTicksGained: (effectiveProgress.injuryTicksGained ?? 0) + injuryTicks,
    stonesLost: (effectiveProgress.stonesLost ?? 0) + bandFailStones,
  };
  if (appended.sighting) {
    publishExpeditionStory(world, cultivator, effectiveProgress, appended.sighting, "growth");
  }
  const beatAudience = [cultivator];
  if (expeditionBattle) {
    for (const companionId of battleAllyIds) {
      const companion = world.cultivators[companionId];
      if (companion && companion.id !== cultivator.id) beatAudience.push(companion);
    }
  }
  if (interiorBattle) {
    const interiorLine = fightDigestText(interiorBattle.summary);
    if (interiorLine) {
      recordLife(cultivator, { tick: world.tick, kind: "fight", text: interiorLine });
      for (const companionId of battleAllyIds) {
        const companion = world.cultivators[companionId];
        if (companion) recordLife(companion, { tick: world.tick, kind: "fight", text: interiorLine });
      }
    }
  }
  if (expeditionBattle) {
    const digestLine = fightDigestText(expeditionBattle.summary);
    if (digestLine) {
      for (const person of beatAudience) {
        recordLife(person, { tick: world.tick, kind: "fight", text: digestLine });
      }
    }
  }
  if (expeditionBattle?.summary.wound) {
    const woundDetail = expeditionBattle.summary.wound;
    const audience = new Set<Cultivator>([cultivator, ...woundedNow]);
    for (const person of audience) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "injury",
        title: "这一场留下了伤",
        detail: woundDetail,
        locationId: person.locationId,
        mood: "得先把伤压下去",
      }));
    }
  }
  effectiveProgress = echoDungeonCompanion(world, effectiveProgress, qiDrain, foughtWith);

  const flavorEventTitles = actionKind === "search"
    ? extractDungeonFlavorEventTitles(world.worldEvents, beforeEventCount, actionId)
    : (() => {
        // For guardian steps, extract the encounter identity as a flavor title
        const guardianCombat = getCombatJobState(syntheticJob);
        if (!guardianCombat) return [];
        const cfg = getEnemyConfig(guardianCombat.encounterTemplateId as unknown as EnemyConfigId);
        const guardianName = cfg?.nameCn && /[\u4e00-\u9fff]/u.test(cfg.nameCn) ? cfg.nameCn : "守关";
        return [`${guardianName}这一场`];
      })();

  trimPrependedEntries(world.worldEvents, beforeEventCount);
  trimPrependedEntries(world.combatLogs, beforeCombatCount);

  for (const choiceId of Object.keys(world.pendingMoralityChoices)) {
    if (!beforePendingChoiceIds.has(choiceId)) {
      delete world.pendingMoralityChoices[choiceId];
    }
  }
  cultivator.pendingMoralityChoiceId = beforePendingMoralityChoiceId;
  for (const choiceId of Object.keys(world.pendingSceneChoices ?? {})) {
    if (!beforeSceneChoiceIds.has(choiceId)) {
      delete world.pendingSceneChoices?.[choiceId];
    }
  }
  cultivator.pendingSceneChoiceId = beforePendingSceneChoiceId;

  const inventoryDelta = positiveInventoryDelta(beforeInventory, cultivator.inventory);
  const carriedItems = (Object.entries(inventoryDelta) as Array<[ItemId, number | undefined]>)
    .filter((entry): entry is [ItemId, number] => typeof entry[1] === "number" && entry[1] > 0)
    .slice(0, 2)
    .map(([itemId, count]) => ({ name: ITEM_CATALOG[itemId]?.name ?? itemId, count }));
  const primaryMaterialCount = inventoryDelta[metadata.materialBand] ?? 0;
  delete inventoryDelta[metadata.materialBand];

  let updatedProgress = recordDungeonExpeditionStep({
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
  if (expeditionBattle?.outcome === "win") {
    const carried = carriedClause({
      stones: Math.max(0, cultivator.spiritStones - beforeSpiritStones),
      items: carriedItems,
      seed: `${world.tick}:${cultivator.id}:${updatedProgress.stepIndex}`,
    });
    const rounds = [...(updatedProgress.combatRounds ?? [])];
    const lastRound = rounds[rounds.length - 1];
    if (lastRound) {
      rounds[rounds.length - 1] = { ...lastRound, beats: withCarriedLine(lastRound.beats, carried) };
    }
    updatedProgress = { ...updatedProgress, combatRounds: rounds, carriedLine: carried };
    attachCarriedLine(world, beatAudience, carried);
  }

  const danger = dangerousDungeonExit({
    policy: updatedProgress.policy,
    qi: cultivator.qi,
    maxQi: cultivator.maxQi,
    spiritualPower: cultivator.spiritualPower,
    maxSpiritualPower: cultivator.maxSpiritualPower,
    injuryTicks: cultivator.injuryTicksRemaining,
    rank: updatedProgress.targetRank,
    spiritStones: cultivator.spiritStones,
  });
  if (danger) {
    cultivator.spiritStones = Math.max(0, cultivator.spiritStones - danger.stoneLoss);
    if (danger.injuryTicks > 0) {
      raiseInjury(world, cultivator, danger.injuryTicks);
      syncWounded(cultivator);
    }
    const collapsedAppend = appendDungeonBeats(
      updatedProgress,
      [danger.beat],
      `${world.tick}:${job.id}:collapse`,
      dungeonPlace(updatedProgress),
    );
    const collapsed = {
      ...collapsedAppend.progress,
      stonesLost: (updatedProgress.stonesLost ?? 0) + danger.stoneLoss,
      injuryTicksGained: (updatedProgress.injuryTicksGained ?? 0) + danger.injuryTicks,
    };
    if (collapsedAppend.sighting) {
      publishExpeditionStory(world, cultivator, collapsed, collapsedAppend.sighting, "growth");
    }
    finalizeDungeonExpedition(world, cultivator, collapsed, danger.outcome);
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

  const companionsHere = expeditionCompanionIds(updatedProgress)
    .map((companionId) => world.cultivators[companionId])
    .filter((companion): companion is Cultivator => Boolean(
      companion && companion.locationId === cultivator.locationId && !companion.activeJobId,
    ));
  const partyDraft = companionsHere.length > 0
    ? createPartyExpeditionWake({ progress: updatedProgress, leader: cultivator, companions: companionsHere })
    : null;
  if (partyDraft?.bruise) {
    const bruised = world.cultivators[partyDraft.bruise.cultivatorId];
    if (bruised && bruised.injuryTicksRemaining < partyDraft.bruise.ticks) {
      raiseInjury(world, bruised, partyDraft.bruise.ticks);
    }
  }
  const wakeSect = cultivator.sectId ? world.sects[cultivator.sectId] : null;
  const wakeNeutral = getCultivatorNeutralSect(world, cultivator);
  const wakeNode = partyDraft
    ? partyDraft.node
    : companionsHere.length > 0
      ? null
      : maybeCreateDungeonWakeNode({
          progress: updatedProgress,
          cultivator,
          actionKind,
          worldTick: world.tick,
          sectName: wakeSect?.name ?? wakeNeutral?.name ?? null,
        });
  const progressedBase = partyDraft
    ? { ...updatedProgress, partyWakeKinds: [...(updatedProgress.partyWakeKinds ?? []), partyDraft.kind] }
    : updatedProgress;
  const progressedWithWake = wakeNode
    ? {
        ...progressedBase,
        wakeNodesEncountered: progressedBase.wakeNodesEncountered + 1,
        pendingWakeNode: wakeNode,
        pendingWakeNodeDeadlineTick: world.tick + wakeNode.timeoutTicks,
        usedWakeScenes: [...(progressedBase.usedWakeScenes ?? []), wakeNode.sceneKind ?? wakeNode.partyKind ?? "wake"],
      }
    : progressedBase;

  world.dungeonExpeditions[cultivator.id] = progressedWithWake;
  job.meta = {
    ...job.meta,
    dungeonExpeditionPolicy: progressedWithWake.policy,
    dungeonExpeditionTargetRank: progressedWithWake.targetRank,
    dungeonExpeditionStepIndex: progressedWithWake.stepIndex,
    dungeonExpeditionNextResolutionTick: progressedWithWake.nextResolutionTick,
  };
  stampDungeonWake(job, progressedWithWake);
  if (!wakeNode && companionsHere.length === 0) {
    maybeQueueDungeonSideChoice(world, cultivator, job);
  }
}

function ensureDungeonWakeOnJob(world: WorldState, cultivator: Cultivator): void {
  if (!cultivator.activeJobId) return;
  const progress = getActiveDungeonExpedition(world, cultivator.id);
  if (!progress || progress.jobId !== cultivator.activeJobId) return;
  const job = world.jobs[cultivator.activeJobId];
  if (!job) return;
  const wake = progress.pendingWakeNode;
  const stamped = job.meta?.dungeonWake;
  if (!wake) {
    if (stamped) stampDungeonWake(job, progress);
    return;
  }
  const same = Boolean(
    stamped
    && stamped.context === wake.context
    && stamped.defaultOptionId === wake.defaultOptionId
    && stamped.options.length === wake.options.length
    && stamped.options.every((option, index) => option.optionId === wake.options[index]?.optionId && option.label === wake.options[index]?.label),
  );
  if (!same) stampDungeonWake(job, progress);
}

const DUNGEON_SIDE_CHOICE_CAP = 2;

function maybeQueueDungeonSideChoice(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
): void {
  if (cultivator.pendingSceneChoiceId || cultivator.pendingMoralityChoiceId) return;
  const queued = job.meta?.dungeonSideChoicesQueued ?? 0;
  if (queued >= DUNGEON_SIDE_CHOICE_CAP) return;
  const stateId = stateIdFromLocationId(cultivator.locationId);
  const grade = dungeonMetadataOf(world.locations[cultivator.locationId])?.grade;
  const expedition = world.dungeonExpeditions[cultivator.id];
  const temperament = grade === "甲"
    ? expedition?.jiaTemperament ?? (expedition ? jiaTemperamentForRank(expedition.targetRank) : undefined)
    : undefined;
  const scenes = grade === "甲"
    ? jiaDungeonSideEvents(temperament)
    : [
        ...world.eventPools.globalCommon,
        ...(world.eventPools.stateSpecific[stateId] ?? []),
      ].filter((event) => event.sceneChoice);
  if (scenes.length === 0) return;
  const pick = scenes[hashString(`${job.id}:${world.tick}:dungeon-side`) % scenes.length];
  if (!pick) return;
  const queuedEvents = maybeQueueSceneChoice(world, cultivator, cultivator.locationId, pick);
  if (!queuedEvents || queuedEvents.length === 0 || !cultivator.pendingSceneChoiceId) return;
  const choice = world.pendingSceneChoices?.[cultivator.pendingSceneChoiceId];
  if (choice) {
    choice.expiresAtTick = world.tick + 6;
    if (!choice.prompt.startsWith("地宫里岔开一件闲事。")) {
      choice.prompt = `地宫里岔开一件闲事。${choice.prompt}`;
    }
  }
  job.meta = { ...(job.meta ?? {}), dungeonSideChoicesQueued: queued + 1 };
}

function stampDungeonWake(job: ActionJob, progress: DungeonExpeditionProgress): void {
  const wake = progress.pendingWakeNode;
  const meta = { ...(job.meta ?? {}) };
  if (!wake) {
    delete meta.dungeonWake;
  } else {
    meta.dungeonWake = {
      context: wake.context,
      defaultOptionId: wake.defaultOptionId,
      options: wake.options.map((option) => ({ optionId: option.optionId, label: option.label })),
    };
  }
  job.meta = meta;
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
  if (cultivator.realmLevel >= 15) {
    const veinAction = preferredSpiritVeinAction(world, cultivator);
    if (veinAction) return veinAction;
  }
  return preferredDungeonGuardianAction(world, cultivator, "dungeon-a");
}

function preferredSpiritVeinAction(world: WorldState, cultivator: Cultivator): ActionId | null {
  ensureSpiritVeins(world);
  const veins = Object.values(world.spiritVeins ?? {}).filter((vein) => vein.band === "spirit");
  const vein = veins.find((row) => row.stateId === "liangzhou") ?? veins[0];
  if (!vein) return null;
  if (cultivator.locationId === vein.locationId) return `gather-vein:${vein.id}` as ActionId;
  return travelActionIdOf(vein.locationId) as ActionId;
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
      note: realmLevel >= 15
        ? "这一阶的灵材坊市不卖，甲级也不另开层。凉州或雷州的灵脉，化神后期以后去收，会在化神那一份之外再分出这一档。"
        : realmLevel >= 12
        ? "化神的突破灵材不在坊市出售。甲级地宫七层到九层，探宝和守关都会掉。"
        : realmLevel >= 9
          ? "元婴的突破灵材不在坊市出售。甲级地宫四层往上才有，七层也出。探宝和守关都会掉。"
          : "金丹期突破灵材主要来自甲级地宫高风险探索与守关。",
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
    return breakthroughReadyActionOf(world, cultivator, definition);
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
  const narrative = breakthroughMethodNarrative({
    realmLevel: cultivator.realmLevel,
    successRate: rateInfo.successRate,
    category: definition.category,
  });
  const openRite = cultivator.breakthroughRite && cultivator.breakthroughRite.untilTick >= world.tick
    ? cultivator.breakthroughRite
    : null;

  const view: BreakthroughStateView = {
    targetRealm: definition.targetRealm,
    targetLevel: definition.targetLevel,
    category: definition.category,
    readyByProgress: cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED,
    readyByMaterials: missingItems.length === 0,
    requiresResidence: breakthroughMethodIdForLevel(cultivator.realmLevel) === "residence"
      || breakthroughMethodIdForLevel(cultivator.realmLevel) === "soul-vigil"
      || breakthroughMethodIdForLevel(cultivator.realmLevel) === "twin-lamp",
    genericRequirements,
    specialRequirement,
    materialSources: materialSourcesOf(definition),
    missingItems,
    marketBuyable: definition.marketBuyable,
    majorSuccessRate: rateInfo.successRate,
    rateBreakdown: rateInfo.rateBreakdown,
    recommendedAction: breakthroughRecommendedActionOf(world, cultivator, definition),
    method: narrative?.id,
    methodName: narrative?.name,
    sequence: narrative?.sequence,
    help: narrative?.help,
    rite: openRite ? { method: openRite.method, untilTick: openRite.untilTick } : null,
    previewMainAttributeGrowth: null,
    previewFiveElementGrowth: null,
    previewPercentageBonus: null,
  };

  // Growth preview
  const growthEntry = BREAKTHROUGH_GROWTH_TABLE.find(e => e.slot === cultivator.realmLevel);
  if (growthEntry) {
    const baselineScores = extractFiveElementScores(cultivator.registrationRecord);
    const fiveElGrowth = cultivator.fiveElementGrowth ?? {};
    const effectiveScores = computeEffectiveFiveElementScores(baselineScores, fiveElGrowth);
    const rootKind = cultivator.registrationRecord?.result?.spirit_root_kind_id
      ?? deriveSpiritRootKindId(effectiveScores);
    const sorted = sortedElementEntries(effectiveScores);
    const anchorElements: FiveElementId[] = rootKind === "single-root"
      ? [sorted[0]![0]]
      : [sorted[0]![0], sorted[1]![0]];
    view.previewMainAttributeGrowth = distributeMainAttributeGrowth(growthEntry.mainAttributeTotal, rootKind, anchorElements);
    view.previewFiveElementGrowth = distributeFiveElementGrowth(growthEntry.fiveElementTotal, rootKind, anchorElements);
    view.previewPercentageBonus = growthEntry.percentageBonus;
  }

  return view;
}

function buildBreakthroughAction(cultivator: Cultivator): AvailableAction | null {
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) {
    return null;
  }
  const stage = realmLabelForLevel(definition.targetLevel);
  const major = definition.category === "major";
  return {
    actionId: "residence-breakthrough",
    label: major ? "洞府破境（大境界）" : "洞府破境",
    description: major
      ? `在洞府里尝试大突破，到${stage}。`
      : `在洞府里破到${stage}。`,
    durationTicks: definition.durationTicks,
    kind: "timed",
    costs: {
      itemConsumes: breakthroughConsumedItemsOf(definition),
    },
  };
}

function breakthroughCompany(world: WorldState, cultivator: Cultivator): { id: string; name: string } | null {
  const watch = cultivator.breakthroughWatch;
  if (watch && watch.untilTick >= world.tick) {
    const guard = world.cultivators[watch.guardId];
    if (guard && guard.locationId === cultivator.locationId) {
      return { id: guard.id, name: guard.name };
    }
  }
  const other = Object.values(world.cultivators).find(
    (candidate) => candidate.id !== cultivator.id && candidate.locationId === cultivator.locationId,
  );
  return other ? { id: other.id, name: other.name } : null;
}

function activeBreakthroughRite(cultivator: Cultivator, tick: number, method: NonNullable<Cultivator["breakthroughRite"]>["method"]) {
  const rite = cultivator.breakthroughRite;
  if (!rite || rite.method !== method || rite.untilTick < tick) return null;
  return rite;
}

function nearestPlaceAction(world: WorldState, fromLocationId: string, nodeType: string): ActionId {
  const nearest = findNearestLocationId(world, fromLocationId, (candidate) => candidate.nodeType === nodeType);
  return nearest ? travelActionIdOf(nearest) as ActionId : "meditate";
}

function breakthroughReadyActionOf(
  world: WorldState,
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
): ActionId {
  const method = breakthroughMethodIdForLevel(cultivator.realmLevel);
  const nodeType = world.locations[cultivator.locationId]?.nodeType ?? "";
  const company = breakthroughCompany(world, cultivator);
  if (method === "residence" || !method) {
    return isAtResidence(cultivator)
      ? "residence-breakthrough"
      : (travelActionIdOf(cultivator.residence.locationId) as ActionId);
  }
  if (method === "core-rite") {
    if (nodeType === "sect-outpost") return "core-rite:steady";
    if (company && isAtResidence(cultivator)) return "core-rite:press";
    return nearestPlaceAction(world, cultivator.locationId, "sect-outpost");
  }
  if (method === "infant-fire") {
    if (nodeType === "sect-outpost" || nodeType === "dungeon-a") return "infant-fire-temper";
    return nearestPlaceAction(world, cultivator.locationId, "sect-outpost");
  }
  if (method === "nascent-refine") {
    if (nodeType === "sect-outpost" || nodeType === "dungeon-a") return "refine-nascent";
    return nearestPlaceAction(world, cultivator.locationId, "sect-outpost");
  }
  if (method === "soul-vigil") {
    if (!isAtResidence(cultivator)) return travelActionIdOf(cultivator.residence.locationId) as ActionId;
    return activeBreakthroughRite(cultivator, world.tick, "soul-vigil") ? "seal-soul-vigil" : "begin-soul-vigil";
  }
  if (method === "tribulation") {
    if (nodeType === "wilderness" || nodeType === "dungeon-a") return "face-tribulation";
    return nearestPlaceAction(world, cultivator.locationId, "wilderness");
  }
  if (method === "divine-vigil") {
    if (nodeType === "wilderness" || nodeType === "dungeon-a") return "hold-divine-platform";
    return nearestPlaceAction(world, cultivator.locationId, "wilderness");
  }
  const above = aboveRiteForLevel(cultivator.realmLevel);
  if (above) return aboveReadyAction(world, cultivator, above, nodeType);
  if (!definition) return "meditate";
  if (nodeType === "sect-outpost") {
    return activeBreakthroughRite(cultivator, world.tick, "divine-pattern") ? "seal-divine-step" : "begin-divine-step";
  }
  return nearestPlaceAction(world, cultivator.locationId, "sect-outpost");
}

function aboveReadyAction(world: WorldState, cultivator: Cultivator, rite: AboveRite, nodeType: string): ActionId {
  const atHome = isAtResidence(cultivator);
  if (!abovePlaceMatches(rite.place, nodeType, atHome)) {
    if (rite.place === "residence") return travelActionIdOf(cultivator.residence.locationId) as ActionId;
    return nearestPlaceAction(world, cultivator.locationId, aboveTravelNode(rite.place));
  }
  if (rite.shape === "open-then-seal") {
    const open = rite.method === "void-seal" || rite.method === "twin-lamp" || rite.method === "wind-crossing"
      ? activeBreakthroughRite(cultivator, world.tick, rite.method)
      : null;
    return (open ? rite.actionId : rite.openActionId ?? rite.actionId) as ActionId;
  }
  return rite.actionId as ActionId;
}

function listAboveRiteActions(
  world: WorldState,
  cultivator: Cultivator,
  definition: BreakthroughDefinition,
  rite: AboveRite,
  nodeType: string,
  company: { id: string; name: string } | null,
): AvailableAction[] {
  if (!abovePlaceMatches(rite.place, nodeType, isAtResidence(cultivator))) return [];
  if (rite.shape === "open-then-seal" && rite.openActionId) {
    const open = rite.method === "void-seal" || rite.method === "twin-lamp" || rite.method === "wind-crossing"
      ? activeBreakthroughRite(cultivator, world.tick, rite.method)
      : null;
    if (open) {
      return [breakthroughCostAction(
        definition,
        rite.actionId as ActionId,
        rite.label,
        rite.description(company?.name ?? null),
        0,
        "immediate",
      )];
    }
    return [{
      actionId: rite.openActionId as ActionId,
      label: rite.openLabel ?? rite.label,
      description: rite.openDescription ?? rite.description(null),
      durationTicks: DEFAULT_ACTION_DURATIONS[rite.openActionId] ?? rite.duration,
      kind: "timed",
    }];
  }
  return [breakthroughCostAction(
    definition,
    rite.actionId as ActionId,
    rite.label,
    rite.description(company?.name ?? null),
    DEFAULT_ACTION_DURATIONS[rite.actionId] ?? rite.duration,
    "timed",
  )];
}

function breakthroughCostAction(definition: BreakthroughDefinition, actionId: ActionId, label: string, description: string, durationTicks: number, kind: "timed" | "immediate"): AvailableAction {
  return {
    actionId,
    label,
    description,
    durationTicks,
    kind,
    costs: { itemConsumes: breakthroughConsumedItemsOf(definition) },
  };
}

function listBreakthroughMethodActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const definition = breakthroughDefinitionOf(cultivator);
  const method = breakthroughMethodIdForLevel(cultivator.realmLevel);
  if (!definition || !method) return [];
  if (cultivator.injuryTicksRemaining > 0 && method !== "residence") return [];
  const nodeType = world.locations[cultivator.locationId]?.nodeType ?? "";
  const company = breakthroughCompany(world, cultivator);
  if (method === "residence") {
    return isAtResidence(cultivator) ? [buildBreakthroughAction(cultivator)].filter((action): action is AvailableAction => action !== null) : [];
  }
  if (method === "core-rite") {
    const actions: AvailableAction[] = [];
    if (nodeType === "sect-outpost") {
      actions.push(breakthroughCostAction(
        definition,
        "core-rite:steady",
        "结丹仪（稳妥）",
        "在宗门驻地把这一层金丹走稳。材料会在仪成时耗掉。这一档没有额外代价。",
        DEFAULT_ACTION_DURATIONS["core-rite:steady"] ?? 8,
        "timed",
      ));
    }
    if (company && (nodeType === "sect-outpost" || isAtResidence(cultivator))) {
      actions.push(breakthroughCostAction(
        definition,
        "core-rite:press",
        "结丹仪（催丹）",
        `有${company.name}看着，可以把这一层催成。比稳妥快，大约四分之一的机会留下一段短走火。境界仍然会过去。`,
        DEFAULT_ACTION_DURATIONS["core-rite:press"] ?? 6,
        "timed",
      ));
    }
    return actions;
  }
  if (method === "infant-fire" && (nodeType === "sect-outpost" || nodeType === "dungeon-a")) {
    const help = company ? ` ${company.name}在这一处，成功率会高一截。` : " 一个人也能淬。有同伴在同一处，成功率会高一截。";
    return [breakthroughCostAction(
      definition,
      "infant-fire-temper",
      "婴火淬体",
      `在这里用婴火把金丹淬开。可能失败。失败会没材料、进度退到六成，婴火反噬会让人受伤。${help}`,
      DEFAULT_ACTION_DURATIONS["infant-fire-temper"] ?? 10,
      "timed",
    )];
  }
  if (method === "nascent-refine" && (nodeType === "sect-outpost" || nodeType === "dungeon-a")) {
    const help = company
      ? ` ${company.name}在这一处看着，炼完不挂这点伤。`
      : " 一个人也能炼。炼完婴身会挣一下，人挂一点伤。有人在同一处看着，伤就不必挂。";
    return [breakthroughCostAction(
      definition,
      "refine-nascent",
      "炼婴",
      `在这里把这一层元婴炼稳。材料会在炼成时耗掉。这一阶会成。${help}`,
      DEFAULT_ACTION_DURATIONS["refine-nascent"] ?? 8,
      "timed",
    )];
  }
  if (method === "soul-vigil" && isAtResidence(cultivator)) {
    if (activeBreakthroughRite(cultivator, world.tick, "soul-vigil")) {
      const named = company ? ` ${company.name}也在这洞府里，收口时会记下这个人。` : "";
      return [breakthroughCostAction(
        definition,
        "seal-soul-vigil",
        "魂灯收口",
        `魂灯还亮着。这一步把元婴收口，材料现在才耗。灯灭了就要重新点。${named}`,
        0,
        "immediate",
      )];
    }
    return [{
      actionId: "begin-soul-vigil",
      label: "点上魂灯",
      description: "在自己的洞府点上魂灯，守六个时辰。灯亮以后的八个时辰里收口。这一步不耗材料。",
      durationTicks: DEFAULT_ACTION_DURATIONS["begin-soul-vigil"] ?? 6,
      kind: "timed",
    }];
  }
  if (method === "divine-vigil" && (nodeType === "wilderness" || nodeType === "dungeon-a")) {
    const help = company
      ? ` ${company.name}在这一处看着，守完不挂这点伤。`
      : " 一个人也能守。守完神台会压下来，人挂一点伤。有人在同一处看着，伤就不必挂。";
    return [breakthroughCostAction(
      definition,
      "hold-divine-platform",
      "守神台",
      `在这里把神台守住。材料会在守成时耗掉。这一阶会成。前期的神纹已经落过。${help}`,
      DEFAULT_ACTION_DURATIONS["hold-divine-platform"] ?? 8,
      "timed",
    )];
  }
  if (method === "tribulation" && (nodeType === "wilderness" || nodeType === "dungeon-a")) {
    const help = company
      ? ` ${company.name}在这一处，雷会分掉一点，成功率也高一点。失败时对方也会挂一点伤。`
      : " 一个人迎的话，失败时伤更重。有同伴在同一处，雷会分掉一点。";
    return [breakthroughCostAction(
      definition,
      "face-tribulation",
      "迎天劫",
      `在这里迎一道雷。可能失败。材料会耗，进度会退到六成。${help}`,
      DEFAULT_ACTION_DURATIONS["face-tribulation"] ?? 8,
      "timed",
    )];
  }
  const above = aboveRiteForLevel(cultivator.realmLevel);
  if (above) return listAboveRiteActions(world, cultivator, definition, above, nodeType, company);
  if (method === "divine-pattern" && nodeType === "sect-outpost") {
    if (activeBreakthroughRite(cultivator, world.tick, "divine-pattern")) {
      const help = company
        ? ` ${company.name}在场看着，印会落稳。`
        : " 现在没有旁人。一个人落印也能成，神纹会反噬，人会挂一点伤。";
      return [breakthroughCostAction(
        definition,
        "seal-divine-step",
        "神纹落印",
        `神纹还铺着。这一步落印，材料现在才耗。${help}`,
        0,
        "immediate",
      )];
    }
    return [{
      actionId: "begin-divine-step",
      label: "铺开神纹",
      description: "在宗门驻地把神纹铺开，六个时辰。纹还在的时候落印。这一步不耗材料。",
      durationTicks: DEFAULT_ACTION_DURATIONS["begin-divine-step"] ?? 6,
      kind: "timed",
    }];
  }
  return [];
}

function assertBreakthroughReady(cultivator: Cultivator, definition: BreakthroughDefinition): void {
  if (cultivator.injuryTicksRemaining > 0) {
    throw new GameplayRejection("身上有伤，这一阶的破境做不了。先把伤养好，再来。");
  }
  if (cultivator.realmProgress < BREAKTHROUGH_PROGRESS_REQUIRED) {
    throw new GameplayRejection("修为还没顶满。满了一百再破。");
  }
  if (!hasBreakthroughMaterials(cultivator, definition)) {
    throw new GameplayRejection("突破材料还没齐。");
  }
}

function startBreakthroughJob(
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
  label: string,
  definition: BreakthroughDefinition,
  extra?: { companionId?: string; rateBonus?: number; press?: boolean },
): ActionExecutionResult {
  const rateInfo = breakthroughRateBreakdownOf(cultivator, definition);
  const rateBreakdown = [...rateInfo.rateBreakdown];
  let successRate = rateInfo.successRate;
  if (successRate !== null && extra?.rateBonus) {
    rateBreakdown.push({ source: "companion", delta: extra.rateBonus });
    successRate = clamp(successRate + extra.rateBonus, BREAKTHROUGH_MIN_RATE, BREAKTHROUGH_MAX_RATE);
  }
  return startJob(
    world,
    cultivator,
    actionId,
    label,
    {
      breakthroughCategory: definition.category,
      breakthroughTargetRealm: definition.targetRealm,
      breakthroughTargetLevel: definition.targetLevel,
      breakthroughCommonItemId: definition.genericMaterials[0]?.itemId,
      breakthroughCommonCount: definition.genericMaterials[0]?.count,
      breakthroughSpecialItemId: definition.specialMaterial.itemId,
      breakthroughSpecialCount: definition.specialMaterial.count,
      breakthroughSuccessRate: successRate ?? undefined,
      breakthroughRateBreakdown: rateBreakdown,
      breakthroughCompanionId: extra?.companionId,
      breakthroughMethod: breakthroughMethodIdForLevel(cultivator.realmLevel) ?? undefined,
      breakthroughPress: extra?.press,
    },
    DEFAULT_ACTION_DURATIONS[actionId] ?? definition.durationTicks,
  );
}

function openBreakthroughRite(
  world: WorldState,
  cultivator: Cultivator,
  method: NonNullable<Cultivator["breakthroughRite"]>["method"],
  copy?: { title: string; sentence: string },
): string {
  cultivator.breakthroughRite = { method, stage: "open", untilTick: world.tick + 8 };
  const sentence = copy?.sentence ?? (method === "soul-vigil"
    ? `${cultivator.name}在洞府里点上了魂灯。八个时辰之内收口。灯灭了就要重新点，材料还在身上。`
    : `${cultivator.name}在宗门驻地把神纹铺开了。八个时辰之内落印。材料还在身上。`);
  const title = copy?.title ?? (method === "soul-vigil" ? "点上魂灯" : "铺开神纹");
  addDaoLog(world, cultivator.id, title, sentence, ["breakthrough", method]);
  recordLife(cultivator, { tick: world.tick, kind: "growth", text: sentence });
  return sentence;
}

function performBreakthroughMethodAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ActionId,
): ActionExecutionResult | null {
  const aboveHit = aboveRiteForAction(actionId);
  const timed = actionId === "core-rite:steady"
    || actionId === "core-rite:press"
    || actionId === "infant-fire-temper"
    || actionId === "refine-nascent"
    || actionId === "begin-soul-vigil"
    || actionId === "face-tribulation"
    || actionId === "begin-divine-step"
    || actionId === "hold-divine-platform"
    || Boolean(aboveHit && (aboveHit.openActionId === actionId || (aboveHit.shape === "single" && aboveHit.actionId === actionId)));
  const immediate = actionId === "seal-soul-vigil"
    || actionId === "seal-divine-step"
    || Boolean(aboveHit && aboveHit.shape === "open-then-seal" && aboveHit.actionId === actionId);
  if (!timed && !immediate) return null;
  const definition = breakthroughDefinitionOf(cultivator);
  if (!definition) throw new GameplayRejection("这一阶没有下一道门槛。");
  const method = breakthroughMethodIdForLevel(cultivator.realmLevel);
  if (!method) throw new GameplayRejection("这一阶没有下一道门槛。");
  assertBreakthroughReady(cultivator, definition);
  const nodeType = world.locations[cultivator.locationId]?.nodeType ?? "";
  const company = breakthroughCompany(world, cultivator);
  const refusal = breakthroughMethodNarrative({
    realmLevel: cultivator.realmLevel,
    successRate: definition.baseSuccessRate,
    category: definition.category,
  })?.refusal;

  if (aboveHit) {
    if (method !== aboveHit.method) throw new GameplayRejection(refusal ?? "这一阶不走这个做法。");
    if (!abovePlaceMatches(aboveHit.place, nodeType, isAtResidence(cultivator))) {
      throw new GameplayRejection(aboveHit.wrongPlace);
    }
    if (aboveHit.shape === "open-then-seal" && actionId === aboveHit.openActionId) {
      return startBreakthroughJob(world, cultivator, actionId as TimedActionId, aboveHit.openJobLabel ?? aboveHit.jobLabel, definition, company ? { companionId: company.id } : undefined);
    }
    if (aboveHit.shape === "open-then-seal") {
      const riteMethod = aboveHit.method === "void-seal" || aboveHit.method === "twin-lamp" || aboveHit.method === "wind-crossing"
        ? aboveHit.method
        : null;
      if (!riteMethod || !activeBreakthroughRite(cultivator, world.tick, riteMethod)) {
        throw new GameplayRejection(cultivator.breakthroughRite ? (aboveHit.riteCold ?? "这一步已经散了。材料还在，重新来一次。") : (aboveHit.riteMissing ?? "这一步还没开始。"));
      }
      const named = company?.name ?? null;
      const result = startJob(world, cultivator, "residence-breakthrough", aboveHit.jobLabel, {
        breakthroughCategory: definition.category,
        breakthroughTargetRealm: definition.targetRealm,
        breakthroughTargetLevel: definition.targetLevel,
        breakthroughMethod: aboveHit.method,
      }, 1);
      if (result.job) {
        resolveResidenceBreakthrough(world, cultivator, result.job, {
          tag: aboveHit.actionId,
          successInjuryTicks: named ? aboveHit.successInjuryShared : aboveHit.successInjuryAlone,
          successLife: aboveHit.successLife(cultivator.name, named),
        });
        cultivator.activeJobId = null;
        delete world.jobs[result.job.id];
      }
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: aboveHit.sealSummary?.(cultivator.name) ?? `${cultivator.name}把这一步收了。`,
      };
    }
    return startBreakthroughJob(
      world,
      cultivator,
      actionId as TimedActionId,
      aboveHit.jobLabel,
      definition,
      company && aboveHit.companionRate > 0 ? { companionId: company.id, rateBonus: aboveHit.companionRate } : company ? { companionId: company.id } : undefined,
    );
  }

  if (actionId === "core-rite:steady") {
    if (method !== "core-rite") throw new GameplayRejection(refusal ?? "这一阶不走结丹仪。");
    if (nodeType !== "sect-outpost") throw new GameplayRejection("结丹仪要在宗门驻地里走。你现在不在驻地。");
    return startBreakthroughJob(world, cultivator, actionId, "结丹仪（稳妥）", definition);
  }
  if (actionId === "core-rite:press") {
    if (method !== "core-rite") throw new GameplayRejection(refusal ?? "这一阶不走结丹仪。");
    if (nodeType !== "sect-outpost" && !isAtResidence(cultivator)) {
      throw new GameplayRejection("催丹要在宗门驻地，或自己的洞府里，并且有人看着。");
    }
    if (!company) throw new GameplayRejection("催丹要有人看着。请一位修士来护法，或等眼前有人，再催丹。一个人的话，去宗门驻地走稳妥结丹仪。");
    return startBreakthroughJob(world, cultivator, actionId, "结丹仪（催丹）", definition, { companionId: company.id, press: true });
  }
  if (actionId === "infant-fire-temper") {
    if (method !== "infant-fire") throw new GameplayRejection(refusal ?? "这一阶不走婴火淬体。");
    if (nodeType !== "sect-outpost" && nodeType !== "dungeon-a") {
      throw new GameplayRejection("婴火淬体要在宗门驻地，或甲级地宫门口。洞府里淬不开这颗丹。");
    }
    return startBreakthroughJob(world, cultivator, actionId, "婴火淬体", definition, company ? { companionId: company.id, rateBonus: 10 } : undefined);
  }
  if (actionId === "refine-nascent") {
    if (method !== "nascent-refine") throw new GameplayRejection(refusal ?? "这一阶不炼婴。");
    if (nodeType !== "sect-outpost" && nodeType !== "dungeon-a") {
      throw new GameplayRejection("炼婴要在宗门驻地，或甲级地宫门口。洞府里炼不稳这一层。");
    }
    return startBreakthroughJob(world, cultivator, actionId, "炼婴", definition, company ? { companionId: company.id } : undefined);
  }
  if (actionId === "begin-soul-vigil") {
    if (method !== "soul-vigil") throw new GameplayRejection(refusal ?? "这一阶不点魂灯。");
    if (!isAtResidence(cultivator)) throw new GameplayRejection("魂灯要在自己的洞府里点。先回去。");
    return startBreakthroughJob(world, cultivator, actionId, "点上魂灯", definition);
  }
  if (actionId === "seal-soul-vigil") {
    if (method !== "soul-vigil") throw new GameplayRejection(refusal ?? "这一阶不收魂灯。");
    if (!isAtResidence(cultivator)) throw new GameplayRejection("魂灯要在自己的洞府里收口。先回去。");
    if (!activeBreakthroughRite(cultivator, world.tick, "soul-vigil")) {
      throw new GameplayRejection(cultivator.breakthroughRite
        ? "魂灯已经灭了。材料还在，重新点一次。"
        : "魂灯还没点上。先把魂灯点上。");
    }
    const named = company ? `${company.name}也守在这洞府里。` : "";
    const result = startJob(world, cultivator, "residence-breakthrough", "魂灯收口", {
      breakthroughCategory: definition.category,
      breakthroughTargetRealm: definition.targetRealm,
      breakthroughTargetLevel: definition.targetLevel,
      breakthroughSuccessRate: undefined,
      breakthroughMethod: "soul-vigil",
    }, 1);
    if (result.job) {
      resolveResidenceBreakthrough(world, cultivator, result.job, {
        tag: "seal-soul-vigil",
        successLife: `${cultivator.name}在魂灯下把这一层收了口。${named}元婴又稳了一层。`,
      });
      cultivator.activeJobId = null;
      delete world.jobs[result.job.id];
    }
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}在魂灯下把这一层收了口。`,
    };
  }
  if (actionId === "face-tribulation") {
    if (method !== "tribulation") throw new GameplayRejection(refusal ?? "这一阶不迎天劫。");
    if (nodeType !== "wilderness" && nodeType !== "dungeon-a") {
      throw new GameplayRejection("天劫要在荒野或甲级地宫门口迎。城里和洞府接不住这一道雷。");
    }
    return startBreakthroughJob(world, cultivator, actionId, "迎天劫", definition, company ? { companionId: company.id, rateBonus: 8 } : undefined);
  }
  if (actionId === "hold-divine-platform") {
    if (method !== "divine-vigil") throw new GameplayRejection(refusal ?? "这一阶不守神台。");
    if (nodeType !== "wilderness" && nodeType !== "dungeon-a") {
      throw new GameplayRejection("守神台要在荒野，或甲级地宫门口。驻地里的神纹已经落过了。");
    }
    return startBreakthroughJob(world, cultivator, actionId, "守神台", definition, company ? { companionId: company.id } : undefined);
  }
  if (actionId === "begin-divine-step") {
    if (method !== "divine-pattern") throw new GameplayRejection(refusal ?? "这一阶不铺神纹。");
    if (nodeType !== "sect-outpost") throw new GameplayRejection("神纹要在宗门驻地铺开。先到驻地。");
    return startBreakthroughJob(world, cultivator, actionId, "铺开神纹", definition);
  }
  if (method !== "divine-pattern") throw new GameplayRejection(refusal ?? "这一阶不落神纹。");
  if (nodeType !== "sect-outpost") throw new GameplayRejection("神纹要在宗门驻地落印。先到驻地。");
  if (!activeBreakthroughRite(cultivator, world.tick, "divine-pattern")) {
    throw new GameplayRejection(cultivator.breakthroughRite
      ? "神纹已经散了。材料还在，重新铺一次。"
      : "神纹还没铺开。先把神纹铺开。");
  }
  const result = startJob(world, cultivator, "residence-breakthrough", "神纹落印", {
    breakthroughCategory: definition.category,
    breakthroughTargetRealm: definition.targetRealm,
    breakthroughTargetLevel: definition.targetLevel,
    breakthroughMethod: "divine-pattern",
  }, 1);
  if (result.job) {
    resolveResidenceBreakthrough(world, cultivator, result.job, {
      tag: "seal-divine-step",
      successInjuryTicks: company ? 0 : 4,
      successLife: company
        ? `${cultivator.name}在${company.name}看着的时候把神纹落了印。化神又往前了一层。`
        : `${cultivator.name}一个人把神纹落了印。印是成了，反噬也挂上了一点伤。`,
    });
    cultivator.activeJobId = null;
    delete world.jobs[result.job.id];
  }
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary: `${cultivator.name}把神纹落了印。`,
  };
}

function resolveTimedBreakthrough(world: WorldState, cultivator: Cultivator, job: ActionJob): string {
  const above = aboveRiteForAction(job.actionId);
  if (above && above.openActionId === job.actionId && above.shape === "open-then-seal") {
    const definition = breakthroughDefinitionOf(cultivator);
    if (!definition || cultivator.realmProgress < BREAKTHROUGH_PROGRESS_REQUIRED || !hasBreakthroughMaterials(cultivator, definition)) {
      throw new Error("Breakthrough materials are missing.");
    }
    const method = above.method === "void-seal" || above.method === "twin-lamp" || above.method === "wind-crossing" ? above.method : "divine-pattern";
    return openBreakthroughRite(world, cultivator, method, {
      title: above.openLabel ?? above.label,
      sentence: above.openSentence?.(cultivator.name) ?? `${cultivator.name}把这一步开了。八个时辰之内收口。材料还在身上。`,
    });
  }
  if (above && above.shape === "single" && above.actionId === job.actionId) {
    const companion = job.meta?.breakthroughCompanionId ? world.cultivators[job.meta.breakthroughCompanionId] : undefined;
    const shared = Boolean(companion && companion.locationId === cultivator.locationId);
    const company = shared ? companion?.name ?? null : null;
    return resolveResidenceBreakthrough(world, cultivator, job, {
      tag: above.actionId,
      injuryTicks: shared ? above.failInjuryShared : above.failInjuryAlone,
      deviationTicks: above.failDeviation,
      companionId: shared ? companion?.id ?? null : null,
      companionInjuryTicks: shared ? above.companionFailInjury : 0,
      companionLife: companion && above.companionLife ? above.companionLife(companion.name, cultivator.name) : undefined,
      successInjuryTicks: shared ? above.successInjuryShared : above.successInjuryAlone,
      successLife: above.successLife(cultivator.name, company),
      failureLife: above.failureLife(cultivator.name, company),
    });
  }
  if (job.actionId === "begin-soul-vigil" || job.actionId === "begin-divine-step") {
    const definition = breakthroughDefinitionOf(cultivator);
    if (!definition || cultivator.realmProgress < BREAKTHROUGH_PROGRESS_REQUIRED || !hasBreakthroughMaterials(cultivator, definition)) {
      throw new Error("Breakthrough materials are missing.");
    }
    return openBreakthroughRite(world, cultivator, job.actionId === "begin-soul-vigil" ? "soul-vigil" : "divine-pattern");
  }
  if (job.actionId === "core-rite:steady" || job.actionId === "core-rite:press") {
    return resolveResidenceBreakthrough(world, cultivator, job, {
      tag: job.actionId,
      successDeviationChance: job.actionId === "core-rite:press" ? 25 : 0,
      successLife: job.actionId === "core-rite:press"
        ? `${cultivator.name}把这一层金丹催成了。人还在金丹里，只是往前了一层。`
        : `${cultivator.name}在宗门驻地把结丹仪走完了。这一层金丹落稳，人还在金丹里。`,
    });
  }
  if (job.actionId === "infant-fire-temper") {
    return resolveResidenceBreakthrough(world, cultivator, job, {
      tag: "infant-fire-temper",
      injuryTicks: 8,
      deviationTicks: 8,
      failureLife: `${cultivator.name}的婴火反噬了。材料已经耗了，进度退到六成，身上的伤比寻常大境界更重，气息也乱了一阵。`,
      successLife: `${cultivator.name}的金丹在婴火里裂开，元婴成形。气血和灵力都涨了一截，这一阶的兵器和功法这才装备得上。`,
    });
  }
  if (job.actionId === "refine-nascent" || job.actionId === "hold-divine-platform") {
    const companion = job.meta?.breakthroughCompanionId ? world.cultivators[job.meta.breakthroughCompanionId] : undefined;
    const shared = Boolean(companion && companion.locationId === cultivator.locationId);
    const refining = job.actionId === "refine-nascent";
    return resolveResidenceBreakthrough(world, cultivator, job, {
      tag: job.actionId,
      successInjuryTicks: shared ? 0 : 4,
      successLife: refining
        ? (shared
          ? `${cultivator.name}在${companion?.name ?? "同伴"}看着的时候把这一层元婴炼稳了。婴身没有挣开，人没有挂伤。`
          : `${cultivator.name}一个人把这一层元婴炼完了。婴身挣了一下，人挂了一点伤，这一层还是过去了。`)
        : (shared
          ? `${cultivator.name}在${companion?.name ?? "同伴"}看着的时候把神台守住了。台没有压下来，人没有挂伤，化神又往前了一层。`
          : `${cultivator.name}一个人把神台守住了。台压下来一点，人挂了一点伤，这一层还是过去了。`),
    });
  }
  if (job.actionId === "face-tribulation") {
    const companion = job.meta?.breakthroughCompanionId ? world.cultivators[job.meta.breakthroughCompanionId] : undefined;
    const shared = Boolean(companion && companion.locationId === cultivator.locationId);
    return resolveResidenceBreakthrough(world, cultivator, job, {
      tag: "face-tribulation",
      injuryTicks: shared ? 6 : 10,
      deviationTicks: 8,
      companionId: shared ? companion?.id : null,
      companionInjuryTicks: shared ? 2 : 0,
      failureLife: shared
        ? `${cultivator.name}没能把天劫挨过去。${companion?.name ?? "同伴"}在旁边分了一道雷。材料没了，进度退到六成，两个人都挂了伤，气息也乱了一阵。`
        : `${cultivator.name}没能把天劫挨过去。雷是一个人扛的，材料没了，进度退到六成，伤得很重，气息也乱了一阵。`,
      successLife: `${cultivator.name}把天劫挨了过去，进了化神。雷过之后，气血和灵力都涨了一截，化神的兵器和功法这才装备得上。`,
    });
  }
  return resolveResidenceBreakthrough(world, cultivator, job);
}

function recordBreakthrough(
  cultivator: Cultivator,
  record: BreakthroughRecord,
): void {
  cultivator.breakthroughRecords.push(record);
}

function resolveResidenceBreakthrough(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
  flavor?: {
    tag?: string;
    successLife?: string;
    failureLife?: string;
    injuryTicks?: number;
    deviationTicks?: number;
    successDeviationChance?: number;
    successInjuryTicks?: number;
    companionId?: string | null;
    companionInjuryTicks?: number;
    companionLife?: string;
  },
): string {
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
  delete cultivator.breakthroughRite;

  const rateInfo = breakthroughRateBreakdownOf(cultivator, definition);
  const successRate = job.meta?.breakthroughSuccessRate ?? rateInfo.successRate;
  const rateBreakdown = job.meta?.breakthroughRateBreakdown ?? rateInfo.rateBreakdown;
  const success =
    definition.category === "minor"
      ? true
      : (hashString(`${world.tick}:${job.id}:breakthrough`) % 100) < (successRate ?? definition.baseSuccessRate ?? 0);
  const flavorTag = flavor?.tag ?? "residence-breakthrough";
  const lateWound = isRiskyLateMajor(definition.targetRealm, definition.category);

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
    const failureText = flavor?.failureLife ?? (lateWound
      ? `${cultivator.name}撞${definition.targetRealm}没有成。材料已经耗了，进度退到六成，身上还挂着伤，气息也乱了一阵。`
      : `${cultivator.name}这一次破境没有成，进度退回到还能再试的地方。`);
    addDaoLog(
      world,
      cultivator.id,
      "破境未成",
      failureText,
      ["breakthrough", "failure", flavorTag, definition.category],
    );
    addWorldEvent(world, {
      cultivatorId: cultivator.id,
      locationId: cultivator.locationId,
      title: "破境未成",
      content: failureText,
      severity: "medium",
      tags: ["breakthrough", "failure", definition.category],
    });
    shiftCultivatorMood(world, cultivator, "loss", "破境没有成，心气沉了一下，还得再攒。");
    const injuryTicks = flavor && typeof flavor.injuryTicks === "number" ? flavor.injuryTicks : lateWound ? 6 : 0;
    const deviationTicks = flavor && typeof flavor.deviationTicks === "number" ? flavor.deviationTicks : lateWound ? 6 : 0;
    if (injuryTicks > 0) raiseInjury(world, cultivator, injuryTicks);
    if (deviationTicks > 0) {
      upsertEffect(cultivator, {
        id: "deviation",
        name: "Qi Deviation",
        description: "Cultivation becomes unstable and risky.",
        source: "breakthrough",
        remainingTicks: deviationTicks,
        intensity: 1,
      });
    }
    const companion = flavor?.companionId ? world.cultivators[flavor.companionId] : undefined;
    if (companion && (flavor?.companionInjuryTicks ?? 0) > 0 && companion.locationId === cultivator.locationId) {
      raiseInjury(world, companion, flavor?.companionInjuryTicks ?? 0);
      recordLife(companion, {
        tick: world.tick,
        kind: "growth",
        text: flavor?.companionLife ?? `${companion.name}在${cultivator.name}的天劫里分了一道雷，挂了一点伤。`,
      });
    }
    recordLife(cultivator, {
      tick: world.tick,
      kind: "growth",
      text: failureText,
    });
    return failureText;
  }

  cultivator.realmLevel = definition.targetLevel;
  cultivator.realm = realmOfLevel(definition.targetLevel);
  cultivator.realmProgress = 0;
  const vitalGain = vitalGainForBreakthrough(fromLevel);
  cultivator.maxQi += vitalGain.qi;
  cultivator.maxSpiritualPower += vitalGain.spirit;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  cultivator.lifespan += vitalGain.lifespan;
  const lateReputation: Partial<Record<Cultivator["realm"], number>> = {
    元婴: 8,
    化神: 14,
    炼虚: 16,
    合体: 18,
    大乘: 20,
  };
  const lateRep = definition.category === "major" ? lateReputation[cultivator.realm] ?? 0 : 0;
  const openedLateRealm = lateRep > 0;
  if (openedLateRealm) {
    addCurrentStateReputation(cultivator, lateRep);
  }

  // ---- Breakthrough Growth Package ----
  const growthEntry = BREAKTHROUGH_GROWTH_TABLE.find(e => e.slot === fromLevel);
  const baselineScores = extractFiveElementScores(cultivator.registrationRecord);
  const fiveElGrowth = cultivator.fiveElementGrowth ?? {};
  const effectiveScores = computeEffectiveFiveElementScores(baselineScores, fiveElGrowth);
  const rootKind = cultivator.registrationRecord?.result?.spirit_root_kind_id
    ?? deriveSpiritRootKindId(effectiveScores);
  const sorted = sortedElementEntries(effectiveScores);
  const anchorElements: FiveElementId[] = rootKind === "single-root"
    ? [sorted[0]![0]]
    : [sorted[0]![0], sorted[1]![0]];

  let mainGrowthPackage: Record<string, number> | undefined;
  let elementGrowthPackage: Record<string, number> | undefined;
  if (growthEntry) {
    mainGrowthPackage = distributeMainAttributeGrowth(
      growthEntry.mainAttributeTotal, rootKind, anchorElements,
    );
    elementGrowthPackage = distributeFiveElementGrowth(
      growthEntry.fiveElementTotal, rootKind, anchorElements,
    );

    // Accumulate growth on cultivator
    if (!cultivator.mainAttributeGrowth) cultivator.mainAttributeGrowth = {};
    for (const attr of MAIN_ATTRIBUTE_ORDER) {
      cultivator.mainAttributeGrowth[attr] = (cultivator.mainAttributeGrowth[attr] ?? 0) + mainGrowthPackage[attr];
    }
    if (!cultivator.fiveElementGrowth) cultivator.fiveElementGrowth = {};
    const FIVE_ELEMENT_IDS: FiveElementId[] = ["metal", "wood", "water", "fire", "earth"];
    for (const elem of FIVE_ELEMENT_IDS) {
      cultivator.fiveElementGrowth[elem] = (cultivator.fiveElementGrowth[elem] ?? 0) + elementGrowthPackage[elem];
    }
    cultivator.mainAttributePercentageBonus = (cultivator.mainAttributePercentageBonus ?? 0) + growthEntry.percentageBonus;
  }

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
    grantedMainAttributeGrowth: mainGrowthPackage,
    grantedFiveElementGrowth: elementGrowthPackage,
    grantedPercentageBonus: growthEntry?.percentageBonus,
  });
  const successText = flavor?.successLife ?? (openedLateRealm
    ? (cultivator.realm === "炼虚" || cultivator.realm === "合体" || cultivator.realm === "大乘"
      ? `${cultivator.name}破境进了${cultivator.realm}。气血和灵力都涨了一截。兵器和功法仍停在化神。`
      : `${cultivator.name}破境进了${cultivator.realm}。气血和灵力都涨了一截，这一阶的兵器和功法这才装备得上。`)
    : `${cultivator.name}破境到了第${cultivator.realmLevel}层。境界松动之后，整个人都轻了一点。`);
  addDaoLog(
    world,
    cultivator.id,
    "破境",
    successText,
    ["breakthrough", "success", flavorTag, definition.category, "action-complete"],
  );
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "破境",
    content: successText,
    severity: definition.category === "major" ? "high" : "medium",
    tags: ["breakthrough", "success", definition.category],
  });
  shiftCultivatorMood(world, cultivator, "breakthrough");
  if ((flavor?.successInjuryTicks ?? 0) > cultivator.injuryTicksRemaining) {
    cultivator.injuryTicksRemaining = flavor?.successInjuryTicks ?? 0;
    syncWounded(cultivator);
  }
  recordLife(cultivator, {
    tick: world.tick,
    kind: "growth",
    text: successText,
  });
  if ((flavor?.successDeviationChance ?? 0) > 0 && (hashString(`${world.tick}:${job.id}:core-rite-press`) % 100) < (flavor?.successDeviationChance ?? 0)) {
    upsertEffect(cultivator, {
      id: "deviation",
      name: "Qi Deviation",
      description: "Cultivation becomes unstable and risky.",
      source: "core-rite-press",
      remainingTicks: 3,
      intensity: 1,
    });
    recordLife(cultivator, {
      tick: world.tick,
      kind: "growth",
      text: `${cultivator.name}这一层催成了，只是丹火急了一点，气息乱了片刻。`,
    });
  }
  if (definition.category === "major") {
    const insight = applyBreakthroughInsight(cultivator);
    const fragmentName = insight.fragmentId ? (ITEM_CATALOG[insight.fragmentId]?.name ?? "功法残页") : "";
    const detail = insight.fragmentId ? `${insight.detail}那一页是${fragmentName}。` : insight.detail;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "breakthrough",
      title: "破境有所得",
      detail,
      locationId: cultivator.locationId,
      mood: "境界松了，手上的招也顺了一点",
    }));
  }
  return successText;
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
      description: `花${price}灵石。`,
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
      description: `能换${income}灵石。`,
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

  // ── Layer 1: 恢复层（安全硬优先） ──
  const recoveryWarnings: string[] = [];
  const recoveryPriorities: string[] = [];
  const recoveryActions: ActionId[] = [];

  if (readiness === "poor") {
    recoveryWarnings.push("身体状态不佳，行动能力受限。");
    recoveryPriorities.push("当前状态较差，应优先进行低风险的恢复和安全收入活动。");
  }
  if (recoveryState === "injured" || recoveryState === "wounded") {
    recoveryWarnings.push("当前受伤，战斗力和行动效率大幅下降。");
    recoveryPriorities.push("身体带伤，建议尽快疗伤恢复。");
    if (!isAtResidence(cultivator) && !canHealHere) {
      recoveryWarnings.push("此地无法直接疗伤，需先赶往安全地点。");
    }
    recoveryActions.push(
      isAtResidence(cultivator) ? "residence-heal" : canHealHere ? "heal" : safeTravelAction,
    );
  }
  if (recoveryState === "depleted") {
    recoveryWarnings.push("灵力枯竭，无法支撑任何高消耗行动。");
    recoveryPriorities.push("灵力见底，建议调息回灵后再行动。");
    if (!isAtResidence(cultivator) && !canHealHere) {
      recoveryWarnings.push("此地无法直接恢复灵力，需先赶往安全地点或居所。");
    }
    recoveryActions.push(isAtResidence(cultivator) ? "residence-recover-qi" : canHealHere ? "heal" : safeTravelAction);
  }
  if (cultivator.injuryTicksRemaining > 0 && recoveryState !== "injured" && recoveryState !== "wounded") {
    recoveryWarnings.push("伤势未愈，不宜冒险。");
    recoveryPriorities.push("建议先养伤再进行高风险活动。");
    recoveryActions.push(canHealHere ? "heal" : safeTravelAction);
  }
  if (hasEffect(cultivator, "poisoned")) {
    recoveryWarnings.push("中毒状态持续消耗灵力，每刻都在损失气力。");
    if (!isAtResidence(cultivator) && !canHealHere) {
      recoveryWarnings.push("此地无法直接解毒，需先赶往安全地点。");
    }
    recoveryPriorities.push("中毒得先解：在能疗伤的地方疗伤，或者回洞府疗伤。");
    recoveryActions.unshift(canHealHere ? "heal" : isAtResidence(cultivator) ? "residence-heal" : safeTravelAction);
  }
  if (hasEffect(cultivator, "deviation")) {
    recoveryWarnings.push("走火入魔，灵力运转紊乱，高风险修炼可能加重偏差。");
    recoveryWarnings.push("偏差无法直接清除，只能通过低风险恢复行动等待自然消退。");
    if (!isAtResidence(cultivator) && !canHealHere) {
      recoveryWarnings.push("此地无法稳定偏差，需先赶往安全地点。");
    }
    recoveryPriorities.push("偏差活跃期间，应避免修炼，先稳定身心。");
    recoveryActions.push(isAtResidence(cultivator) ? "residence-recover-qi" : canHealHere ? "heal" : safeTravelAction);
  }

  // Recovery safety net
  const hasLowRiskSuggestion = recoveryActions.some((actionId) => isLowRiskAction(actionId));
  if ((readiness === "poor" || recoveryState !== "healthy") && !hasLowRiskSuggestion) {
    if (isAtResidence(cultivator)) {
      recoveryActions.push("residence-recover-qi");
    } else if (location?.kind === "safe") {
      recoveryActions.push("take-mortal-task");
    } else {
      recoveryActions.push(safeTravelAction);
    }
  }

  // ── Layer 2: 突破/材料层 ──
  const breakthroughWarnings: string[] = [];
  const breakthroughPriorities: string[] = [];
  const breakthroughActions: ActionId[] = [];

  if (cultivator.spiritStones < 120) {
    breakthroughPriorities.push("灵石不足，建议前往荒野采集基础资源。");
    breakthroughActions.push(location?.nodeType === "wilderness" ? "mine-spirit-stones" : wildernessTravelAction);
  }
  if (cultivator.inventory["spirit-ore"] + cultivator.inventory["ruin-fragment"] + cultivator.inventory["beast-core"] > 0) {
    breakthroughPriorities.push("持有可出售材料，可前往主城坊市交易变现。");
  }
  if (hasEffect(cultivator, "insight")) breakthroughPriorities.push("悟道状态活跃，适合修炼或挑战重大机遇，效果倍增。");
  if (hasEffect(cultivator, "spirit-saturated")) breakthroughPriorities.push("灵气充盈状态，修炼效率提升，宜把握时机。");
  if (breakthrough?.readyByProgress) {
    breakthroughPriorities.push("修为已至瓶颈，继续积累无益，应推进突破链。");
    if (!breakthrough.readyByMaterials) {
      breakthroughPriorities.push("突破材料尚未齐备，可通过市场购买或副本掉落获取。");
    }
    if (breakthrough.recommendedAction) {
      breakthroughActions.unshift(breakthrough.recommendedAction);
    }
  }
  const needsProgressionMaterials = !!breakthrough
    && !breakthrough.readyByMaterials
    && !breakthrough.marketBuyable;
  if (needsProgressionMaterials) {
    breakthroughPriorities.push("进阶材料无法购买，需挑战对应等阶副本获取。");
    const dungeonView = dungeonViewForLocation(world, cultivator, location);
    breakthroughActions.push(
      dungeonView && !dungeonView.lockReason
        ? enterDungeonActionIdOf(dungeonView.recommendedRank, "balanced")
        : dungeonTravelAction,
    );
  }
  const needsRareExpeditionRewards = meetsRealmRequirement(cultivator, REALM_CORE)
    && cultivator.inventory["ancient-artifact"] <= 0;
  if (needsRareExpeditionRewards) {
    breakthroughPriorities.push("境界已高，需要稀有奇物，可进入八荒远征探索。");
    const canRunBahuangHere = canEnterBahuang(cultivator, cultivator.locationId, world).allowed;
    breakthroughActions.push(canRunBahuangHere ? "enter-bahuang:balanced" : bahuangTravelAction);
  }

  // ── Layer 3: 地点/行程层 ──
  const locationPriorities: string[] = [];
  const locationActions: ActionId[] = [];

  // Location-aware suggestions
  if (location) {
    if (isAtResidence(cultivator)) {
      locationPriorities.push("身处居所，适宜修炼、疗伤和炼制。");
    } else if (isMainCityNode(location.nodeType)) {
      locationPriorities.push("身处主城，可进行交易、接取任务或领取宗门差事。");
    } else if (location.nodeType === "wilderness") {
      locationPriorities.push("身处荒野，适合采集灵石和狩猎矿兽。");
    } else if (dungeonMetadataOf(location)) {
      const lockLine = dungeonGateLockLine(cultivator, location);
      if (lockLine) {
        locationPriorities.push(lockLine);
        locationActions.push("dungeon-gate-locked");
      } else {
        locationPriorities.push("身处秘境入口，可挑战副本获取进阶材料。");
      }
    } else if (EIGHT_WASTES_CONTENT.entryLocationIds.includes(location.id as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number])) {
      locationPriorities.push("身处八荒入口，可发起远征探索稀有资源。");
    }
    const regionalHint = regionalGuidanceHint(world, cultivator);
    if (regionalHint) {
      locationPriorities.push(regionalHint.priority);
      locationActions.push(regionalHint.actionId);
    }
  }

  // Registration-based suggestions (only when healthy)
  if (registration && cultivator.injuryTicksRemaining <= 0) {
    if (registration.cultivateBonus >= 8) locationPriorities.push("天赋偏向修炼，适合长时间闭关。");
    if (registration.fortuneBonus >= 8) locationPriorities.push("天赋偏向探索，适合灵活寻宝和机遇。");
    if (registration.sectBonus >= 4) {
      if (cultivator.neutralSectId) {
        const neutralSect = getCultivatorNeutralSect(world, cultivator);
        locationActions.push(
          neutralSect && cultivator.locationId === neutralSect.headquarters
            ? "take-neutral-duty"
            : neutralSect
              ? travelActionIdOf(neutralSect.headquarters)
              : mainCityTravelAction,
        );
      } else if (cultivator.sectId) {
        const sect = getCultivatorSect(world, cultivator);
        if (sect && cultivator.locationId === sect.headquarters) {
          const taskSeed = `${world.tick}:${cultivator.id}:suggest`;
          const preferredCategory: SectTaskCategory = registration.sectBonus >= 8 ? "patrol-suppress" : "sect-expedition";
          const suggested = pickRandomSectTask(cultivator.sectTitle, preferredCategory, taskSeed);
          const fallbackTask = pickRandomSectTask(cultivator.sectTitle, "resource-tribute", taskSeed);
          locationActions.push(suggested ? `sect-task:${suggested.id}` : fallbackTask ? `sect-task:${fallbackTask.id}` : "take-mortal-task");
        } else {
          locationActions.push(sect ? travelActionIdOf(sect.headquarters) : mainCityTravelAction);
        }
      }
    }
    if (registration.fortuneBonus >= 8) {
      const dungeonView = dungeonViewForLocation(world, cultivator, location);
      locationActions.push(
        dungeonView && !dungeonView.lockReason
          ? searchFortuneActionIdOf(dungeonView.recommendedRank)
          : dungeonTravelAction,
      );
    }
    if (registration.mineBonus >= 6) locationActions.push(location?.nodeType === "wilderness" ? "mine-spirit-stones" : wildernessTravelAction);
    if (registration.cultivateBonus >= 8) locationActions.push("cultivate");
  }

  // Unlock-loadout recommendations
  for (const [itemId, count] of Object.entries(cultivator.inventory) as Array<[ItemId, number]>) {
    if (count <= 0) continue;
    const def = ITEM_CATALOG[itemId];
    if (!def || def.use.kind !== "unlock-loadout") continue;
    const wId = def.use.grantsWeaponLoadoutId;
    const sId = def.use.grantsSpellLoadoutId;
    if (wId && !cultivator.unlockedWeaponLoadoutIds.includes(wId)) {
      locationActions.push(`unlock-loadout:${itemId}` as ActionId);
      locationPriorities.push(`持有${def.name}，可用于永久解锁新武器配装（不会自动装备）。`);
      break;
    }
    if (sId && !cultivator.unlockedSpellLoadoutIds.includes(sId)) {
      locationActions.push(`unlock-loadout:${itemId}` as ActionId);
      locationPriorities.push(`持有${def.name}，可用于永久解锁新法术配装（不会自动装备）。`);
      break;
    }
  }

  // Residence crafting recommendations
  if (isAtResidence(cultivator)) {
    const craftable = getLiveCraftableRecipes(cultivator);
    for (const recipe of craftable) {
      if (recipe.id.startsWith("recipe-forge-") || recipe.id.startsWith("recipe-synthesize-")) {
        locationActions.push(`residence-produce:${recipe.id}` as ActionId);
        locationPriorities.push(`居所可炼制：${ITEM_CATALOG[recipe.outputItemId]?.name ?? "这件东西"}，消耗 ${recipe.spiritStoneCost} 灵石。`);
        break;
      }
    }
  }

  const sectHint = sectLifeGuidance(world, cultivator);
  if (sectHint) {
    locationPriorities.unshift(sectHint.priority);
    locationActions.unshift(sectHint.actionId);
  }
  if (!cultivator.sectId && cultivator.neutralSectId) {
    const joinedName = world.neutralSects[cultivator.neutralSectId]?.name;
    if (joinedName) locationPriorities.unshift(`已经入了${joinedName}。`);
  }

  // ── Merge layers: recovery > breakthrough > location ──
  const warnings = [...recoveryWarnings, ...breakthroughWarnings];
  const priorities = [...recoveryPriorities, ...breakthroughPriorities, ...locationPriorities];
  if (world.dungeonExpeditions[cultivator.id]?.pendingWakeNode) {
    priorities.unshift("地宫岔路待决");
  }
  const allActions = [...recoveryActions, ...breakthroughActions, ...locationActions];
  const suggestedActions = allActions.length > 0
    ? Array.from(new Set(allActions)).slice(0, 4) as ActionId[]
    : ["cultivate" as ActionId];
  return { warnings, priorities, suggestedActions };
}

/**
 * DECISION-SURFACE RULE: Every action recommended by any decision surface
 * (onboarding, agentGuidance, strategySnapshot) MUST exist in the current
 * availableActions set. When adding a new action to the game:
 *   1. Register it in listAvailableActions() so it appears in the action list.
 *   2. Only then may guidance/onboarding/strategy reference its ActionId.
 * This function enforces the invariant at the boundary.
 */
function filterToAvailable(candidates: readonly ActionId[], available: ReadonlySet<ActionId>): ActionId[] {
  const filtered = candidates.filter((id) => available.has(id));
  return filtered.length > 0 ? filtered : [];
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
      "主人的话可以压过新手提示。安全提醒先于冒险。运行时的建议只是建议，眼前合法的行动都可以自己选。",
  };
}

function onboardingHint(stage: OnboardingStage): string {
  if (stage === "registered") {
    return "先在城里做一件不冒险的事，把第一圈走起来。";
  }
  if (stage === "first-action") {
    return "去本州的荒野走一趟。";
  }
  if (stage === "first-travel") {
    return "在本地告示上接一件基础事务，做完它。";
  }
  if (stage === "first-quest") {
    return "回到洞府，打坐一次。";
  }
  if (stage === "first-residence-cultivation") {
    return "修为攒满，备好突破灵材，在洞府里做成那件特殊物品，再破境。";
  }
  if (stage === "first-breakthrough" || stage === "completed") {
    return "开头这几步已经走过。接下来靠事务、洞府修炼和宗门选择慢慢往上走。";
  }
  return "开头这几步已经走过。接下来慢慢往上走。";
}

function onboardingRecommendedActions(world: WorldState, stage: OnboardingStage, cultivator: Cultivator): ActionId[] {
  if (stage === "registered") {
    return ["take-mortal-task"];
  }
  if (stage === "first-action") {
    const wildernessLocationId = `${stateIdFromLocationId(cultivator.locationId)}:wilderness`;
    return [cultivator.locationId === wildernessLocationId
      ? travelActionIdOf(mainCityLocationIdOf(stateIdFromLocationId(cultivator.locationId)))
      : travelActionIdOf(wildernessLocationId)];
  }
  if (stage === "first-travel") {
    const activeBaseQuest = cultivator.activeQuests.find((quest) => quest.category === "base");
    if (activeBaseQuest) {
      const activeBaseQuestIndex = cultivator.activeQuests.findIndex((quest) => quest.id === activeBaseQuest.id);
      return [buildExecuteQuestActionId(activeBaseQuest.type, activeBaseQuestIndex) as ActionId];
    }
    const board = getQuestBoard(world, cultivator.locationId);
    const baseQuest = board?.quests.find((quest) => quest.category === "base");
    return [baseQuest ? (buildAcceptQuestActionId(baseQuest.type, baseQuest.boardIndex) as ActionId) : "take-mortal-task"];
  }
  if (stage === "first-quest") {
    return [cultivator.locationId === cultivator.residence.locationId
      ? "residence-meditate"
      : (`travel-to:${cultivator.residence.locationId}` as ActionId)];
  }
  if (stage === "first-residence-cultivation") {
    const breakthroughAction = breakthroughViewOf(world, cultivator)?.recommendedAction;
    return [breakthroughAction
      ?? (cultivator.locationId === cultivator.residence.locationId
        ? "residence-meditate"
        : (`travel-to:${cultivator.residence.locationId}` as ActionId))];
  }
  return [];
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
    recommendedActions: onboardingRecommendedActions(world, stage, cultivator),
    hint: onboardingHint(stage),
    recommendedOnly: true,
    allowsFreeExploration: true,
  };
}

export function getStrategySnapshot(world: WorldState, cultivatorId: string): StrategySnapshot {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const plan = guidance(world, cultivator);
  const availableActionIds = new Set(listAvailableActions(world, cultivatorId).map((a) => a.actionId));
  const policy = decisionPolicy();
  const riskLevel =
    plan.warnings.length >= 2 || cultivator.injuryTicksRemaining > 0 || hasEffect(cultivator, "deviation")
      ? "high"
      : plan.warnings.length === 1 || hasEffect(cultivator, "poisoned")
        ? "medium"
        : "low";
  const shortTermGoal =
    plan.priorities[0] ??
    (cultivator.spiritStones < 120 ? "先把身上的灵石补上。" : "把眼前这一圈稳稳做完。");
  const longTermGoal =
    cultivator.sectId
      ? `一边往下一境走，一边在${world.sects[cultivator.sectId]?.name ?? "宗门"}里把位子站稳。`
      : cultivator.neutralSectId
        ? `一边往下一境走，一边在${world.neutralSects[cultivator.neutralSectId]?.name ?? "门派"}里慢慢出力。`
        : "先把灵石和伤势稳住，再去接更重的事务、更远的路和宗门。";
  const filtered = filterToAvailable(plan.suggestedActions, availableActionIds);
  const recommendedSequence: ActionId[] =
    filtered.length > 0 ? filtered : ["cultivate"];
  const reason =
    plan.warnings.length > 0
      ? plan.warnings.join(" ")
      : plan.priorities.join(" ") || "眼下还稳，可以接着走主线。";
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

  const place = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  const route = place ? wildRouteFromPlace(place) : null;
  return {
    layerId: layer.layerId,
    layerName: route?.placeName ?? layer.name,
    ticksSurvived: progress.ticksSurvived,
    remainingSurvivalTicks: progress.remainingSurvivalTicks,
    status: progress.status,
    ...(route
      ? {
          placeName: route.placeName,
          advice: route.advice,
          mysteryLine: route.mysteryLine,
          statusLabel: route.statusLabel,
          enemyLabel: route.enemyLabel,
          followerLabel: route.followerLabel,
        }
      : {}),
  };
}

function buildWildRouteView(world: WorldState, cultivator: Cultivator): CultivatorStateView["wildRoute"] {
  const bahuang = world.bahuangProgress[cultivator.id];
  if (bahuang?.status === "active") {
    return wildRouteFromBand(bahuangBandForDepth(bahuang.depth));
  }
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  const travelDestination = job ? parseTravelDestination(job.actionId) : null;
  const destination = travelDestination ? world.locations[travelDestination] : null;
  if (destination?.nodeType === "wilderness") {
    const place = wildPlaceForState(destination.stateId);
    if (place) return wildRouteFromPlace(place);
  }
  const here = world.locations[cultivator.locationId];
  if (here?.nodeType === "wilderness" || getActiveWildernessProgress(world, cultivator.id)) {
    const place = wildPlaceForState(here?.stateId);
    if (place) return wildRouteFromPlace(place);
  }
  return null;
}

function reconcileBusyState(world: WorldState): void {
  const jobByCultivator = new Map<string, ActionJob>();
  for (const job of Object.values(world.jobs)) {
    if (!jobByCultivator.has(job.cultivatorId)) {
      jobByCultivator.set(job.cultivatorId, job);
    }
  }
  for (const cultivator of Object.values(world.cultivators)) {
    if (cultivator.activeJobId && !world.jobs[cultivator.activeJobId]) {
      cultivator.activeJobId = null;
    }
    if (!cultivator.activeJobId) {
      const orphan = jobByCultivator.get(cultivator.id);
      if (orphan) {
        cultivator.activeJobId = orphan.id;
      }
    }
    const expedition = world.dungeonExpeditions[cultivator.id];
    if (!expedition) {
      continue;
    }
    const liveJob = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
    if (liveJob && liveJob.id === expedition.jobId) {
      continue;
    }
    try {
      finalizeDungeonExpedition(world, cultivator, expedition, "withdrew");
    } catch {
      delete world.dungeonExpeditions[cultivator.id];
    }
  }
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
  if (!world.regionalRuns || typeof world.regionalRuns !== "object") {
    world.regionalRuns = {};
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
  // Ensure productionQueue and pendingGifts exist on all cultivators
  for (const cultivator of Object.values(world.cultivators)) {
    if (!Array.isArray(cultivator.productionQueue)) {
      cultivator.productionQueue = [];
    }
    if (!Array.isArray(cultivator.pendingGifts)) {
      cultivator.pendingGifts = [];
    }
    if (typeof cultivator.lastGiftTick !== "number") {
      cultivator.lastGiftTick = -1;
    }
    if (!Array.isArray(cultivator.guixuCompletedNodeIds)) {
      cultivator.guixuCompletedNodeIds = [];
    }
  }
  // Ensure commissions record exists
  if (!world.commissions || typeof world.commissions !== "object") {
    (world as unknown as Record<string, unknown>).commissions = {};
  }
  if (typeof (world as unknown as Record<string, unknown>).nextCommissionSequence !== "number") {
    (world as unknown as Record<string, unknown>).nextCommissionSequence = 1;
  }
  ensureSpiritVeins(world);
  reconcileBusyState(world);
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

function neutralPostName(postId: string | null | undefined): string {
  if (postId === "outer-chore") return "外门杂役";
  if (postId === "inner-cultivate") return "内门修炼";
  if (postId === "steward") return "执事";
  if (postId === "elder") return "长老";
  if (postId === "master-seat") return "掌门席";
  return "外门";
}

function buildSectStateView(world: WorldState, cultivator: Cultivator): CultivatorStateView["sect"] {
  if (!cultivator.sectId) {
    const neutral = getCultivatorNeutralSect(world, cultivator);
    if (!neutral) return null;
    return {
      id: neutral.id,
      name: neutral.name,
      alignment: "中立",
      role: neutralPostName(cultivator.sectPost),
      treasury: 0,
      memberCount: neutral.memberIds.length,
    };
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
    role: cultivator.sectTitle ?? "外门",
    treasury: sect.treasury,
    memberCount: sect.memberIds.length,
    level: sectLevel?.level,
    bonuses: sectLevel?.bonuses ?? [],
    activeWarId: activeWar?.warId ?? null,
    warObjectives: activeWar ? structuredClone(activeWar.objectives) : [],
  };
}

/** NPCs after the reserved agent slots. Party partners and bonds are not counted here. */
const NEARBY_NPC_LIMIT = 8;
/** Social buttons (chat-up, greet, gift, duel, party invite) stop here. The nearby list does not. */
const SOCIAL_ACTION_LIMIT = 8;
/** Ticks a social-action page stays put before the next unbound agents rotate in. */
const SOCIAL_PAGE_HOLD_TICKS = 4;

function sectDisplayName(world: WorldState, sectId: string | null): string | null {
  if (!sectId) {
    return null;
  }
  return world.sects[sectId]?.name ?? world.neutralSects[sectId]?.name ?? null;
}

function isAgentCultivator(cultivator: Cultivator): boolean {
  return typeof cultivator.createdByAgentId === "string" && cultivator.createdByAgentId.length > 0;
}

function nearbyPriority(world: WorldState, self: Cultivator, other: Cultivator): number {
  if (getPartyOf(world, self.id)?.memberIds.includes(other.id)) return 0;
  const link = getSocialLink(world, self.id, other.id);
  if (link && (link.affinity > 0 || link.rival === true || (link.favorBalance ?? 0) !== 0)) return 1;
  if (isAgentCultivator(other)) return 2;
  return 3;
}

function selectNearbyCultivators(world: WorldState, cultivator: Cultivator): Cultivator[] {
  const ordered = [...getCultivatorsAtLocation(world, cultivator.locationId, cultivator.id)]
    .sort((left, right) => {
      const byRank = nearbyPriority(world, cultivator, left) - nearbyPriority(world, cultivator, right);
      if (byRank !== 0) return byRank;
      return left.name.localeCompare(right.name, "zh") || left.id.localeCompare(right.id);
    });
  const selected: Cultivator[] = [];
  let npcCount = 0;
  for (const other of ordered) {
    if (nearbyPriority(world, cultivator, other) < 3) {
      selected.push(other);
      continue;
    }
    if (npcCount >= NEARBY_NPC_LIMIT) {
      continue;
    }
    selected.push(other);
    npcCount += 1;
  }
  return selected;
}

function socialWindow(world: WorldState, cultivator: Cultivator): {
  agentsHere: number;
  page: number;
  pageCount: number;
  targets: Cultivator[];
} {
  const listed = selectNearbyCultivators(world, cultivator);
  const pinned: Cultivator[] = [];
  const agents: Cultivator[] = [];
  const npcs: Cultivator[] = [];
  for (const other of listed) {
    const rank = nearbyPriority(world, cultivator, other);
    if (rank < 2) pinned.push(other);
    else if (rank === 2) agents.push(other);
    else npcs.push(other);
  }
  const pinnedShown = pinned.slice(0, SOCIAL_ACTION_LIMIT);
  const room = SOCIAL_ACTION_LIMIT - pinnedShown.length;
  const pageCount = room > 0 && agents.length > room ? Math.ceil(agents.length / room) : 1;
  const offset = cultivator.socialPageOffset ?? 0;
  const page = pageCount <= 1 ? 0 : (Math.floor(world.tick / SOCIAL_PAGE_HOLD_TICKS) + offset) % pageCount;
  const agentShown = room <= 0
    ? []
    : agents.length <= room
      ? agents
      : agents.slice(page * room, page * room + room);
  const npcRoom = Math.max(0, room - agentShown.length);
  return {
    agentsHere: listed.filter((other) => isAgentCultivator(other)).length,
    page,
    pageCount,
    targets: [...pinnedShown, ...agentShown, ...npcs.slice(0, npcRoom)],
  };
}

function socialActionTargets(world: WorldState, cultivator: Cultivator): Cultivator[] {
  return socialWindow(world, cultivator).targets;
}

function nearbyActionNote(world: WorldState, cultivator: Cultivator): string {
  const window = socialWindow(world, cultivator);
  return `同场能看见的修士有 ${window.agentsHere} 位，都在 nearbyCultivators 里。搭讪、问候、赠礼、切磋和组队先列这一页，最多 ${SOCIAL_ACTION_LIMIT} 位。第 ${window.page + 1}/${window.pageCount} 页，每 ${SOCIAL_PAGE_HOLD_TICKS} 刻换一页。认识了的人留在这一页上。`;
}

function nearbyHomeViews(world: WorldState, cultivator: Cultivator): NonNullable<CultivatorStateView["nearbyHomes"]> {
  const homes: NonNullable<CultivatorStateView["nearbyHomes"]>[number][] = [];
  for (const other of getCultivatorsAtLocation(world, cultivator.locationId, cultivator.id)) {
    const home = other.residences?.find((residence) => residence.locationId === cultivator.locationId);
    if (!home) continue;
    homes.push({
      ownerId: other.id,
      ownerName: other.name,
      residenceName: home.name,
      grandeur: home.grandeur ?? 1,
      tierName: residenceTierName(home),
      glance: residenceGlance(home),
      ...(home.displayedRelic
        ? { displayedRelic: { name: home.displayedRelic.name, arcLine: home.displayedRelic.arcLine } }
        : {}),
    });
  }
  return homes
    .sort((left, right) => right.grandeur - left.grandeur || left.ownerName.localeCompare(right.ownerName, "zh"))
    .slice(0, 4);
}

function nearbyCultivatorsOf(world: WorldState, cultivator: Cultivator): NonNullable<CultivatorStateView["nearbyCultivators"]> {
  const locationName = world.locations[cultivator.locationId]?.name ?? "这里";
  return selectNearbyCultivators(world, cultivator)
    .map((other) => {
      const link = getSocialLink(world, cultivator.id, other.id);
      return {
        cultivatorId: other.id,
        name: other.name,
        realm: other.realm,
        realmLevel: other.realmLevel,
        sectName: sectDisplayName(world, other.sectId ?? other.neutralSectId),
        idle: !other.activeJobId,
        affinity: link ? link.affinity : null,
        bondLine: link ? describeSocialBond(link) : null,
        bondArc: link ? bondArcOf(link.affinity) : null,
        grudgeArc: link ? grudgeArcOf(link.grudge ?? 0) : null,
        grudge: link?.grudge ?? 0,
        arcLine: link ? describeArcLine(link, cultivator.name, other.name) : null,
        rival: link?.rival === true,
        favorBalance: link?.favorBalance ?? 0,
        placeLine: link && grudgeArcOf(link.grudge ?? 0)
          ? `${other.name}也在${locationName}。你们有${grudgeArcOf(link.grudge ?? 0)}，见面剑拔弩张。`
          : `${other.name}也在${locationName}。`,
        ...(() => {
          const home = other.residences?.find((residence) => residence.locationId === cultivator.locationId);
          return home ? { homeLine: nearbyHomeLine(home, other.name) } : {};
        })(),
      };
    });
}

function partyShareOf(world: WorldState, cultivator: Cultivator): NonNullable<CultivatorStateView["party"]> | null {
  const members = getPartyMembers(world, cultivator.id);
  const partner = members[0];
  if (!partner) {
    return null;
  }
  const party = getPartyOf(world, cultivator.id);
  const size = party?.memberIds.length ?? members.length + 1;
  const openSeats = Math.max(0, PARTY_MAX_MEMBERS - size);
  const full = openSeats === 0;
  const location = world.locations[cultivator.locationId];
  const placeName = location?.name ?? "这里";
  const inDungeon = Boolean(location && dungeonMetadataOf(location));
  const here = members.filter((member) => member.locationId === cultivator.locationId);
  const idleHere = here.filter((member) => !member.activeJobId);
  const busyHere = here.filter((member) => Boolean(member.activeJobId));
  const away = members.filter((member) => member.locationId !== cultivator.locationId);
  const ready = idleHere.length > 0 && !cultivator.activeJobId && inDungeon;
  const idleNames = idleHere.map((member) => member.name).join("、");
  const awayNames = away.map((member) => member.name).join("、");
  const busyNames = busyHere.map((member) => member.name).join("、");
  const seatLine = full
    ? "队伍已满，五人就是上限。"
    : `还空着${openSeats}个位子。同城认识的人可以先组上，人齐了再到门口。`;
  let shareNote: string;
  if (ready) {
    const awayLine = awayNames ? `${awayNames}还没到门口，这一趟带不走。` : "";
    const busyLine = busyNames ? `${busyNames}正在做事，不会被拖进来。` : "";
    shareNote = `${idleNames}就在地宫门口，而且闲着。下地宫会把他们算进这一趟，不另开工。出来时还在身边的人，会分到灵石，也会分到伤。${awayLine}${busyLine}${seatLine}`;
  } else if (idleHere.length === 0 && here.length === 0) {
    shareNote = `${partner.name}不在${placeName}。这一趟不会分险。${seatLine}`;
  } else if (idleHere.length === 0 && busyHere.length > 0) {
    shareNote = `${busyNames || partner.name}正在做事。这一趟不会把人拖进来。${seatLine}`;
  } else if (!inDungeon && idleHere.length > 0) {
    const awayLine = awayNames ? `${awayNames}还在别处，这一趟不会分险。` : "还在别处的人，这一趟不会分险。";
    shareNote = `${idleNames}就在${placeName}，还没到地宫门口。先在城里结伴，到了门口再下，闲着的人才会一起进去，不另开工，也会分到灵石。${awayLine}${seatLine}`;
  } else {
    shareNote = `${partner.name}在身边。到了地宫门口再下，才会一起分险。${seatLine}`;
  }
  return {
    partnerId: partner.id,
    partnerName: partner.name,
    partnerLocationId: partner.locationId,
    partnerHere: partner.locationId === cultivator.locationId,
    partnerIdle: !partner.activeJobId,
    dungeonShareReady: ready,
    shareNote,
    openSeats,
    full,
    atGate: inDungeon ? idleHere.map((member) => member.name) : [],
    waitingInCity: inDungeon ? [] : idleHere.map((member) => member.name),
    reserve: (() => {
      const reserveId = party?.reserveIds?.[0];
      const reserve = reserveId ? world.cultivators[reserveId] : null;
      return reserve ? { cultivatorId: reserve.id, name: reserve.name } : null;
    })(),
    members: members.map((member) => ({
      cultivatorId: member.id,
      name: member.name,
      here: member.locationId === cultivator.locationId,
      idle: !member.activeJobId,
    })),
  };
}

function findSharedExpedition(world: WorldState, cultivatorId: string): DungeonExpeditionProgress | null {
  for (const progress of Object.values(world.dungeonExpeditions)) {
    if (expeditionCompanionIds(progress).includes(cultivatorId)) return progress;
  }
  return null;
}

function appendSharedExpeditionActions(world: WorldState, cultivator: Cultivator, actions: AvailableAction[]): void {
  const sharedRun = findSharedExpedition(world, cultivator.id);
  if (!sharedRun) return;
  const partyWake = sharedRun.pendingWakeNode;
  if (partyWake?.partyKind && partyWakeAwaitingIds(world, sharedRun).includes(cultivator.id)) {
    for (const option of partyWake.options) {
      const actionId = `dungeon-wake-decision:${option.optionId}` as ActionId;
      if (actions.some((action) => action.actionId === actionId)) continue;
      actions.push({
        actionId,
        label: `地宫抉择：${option.label}`,
        description: `${partyWake.context} ${option.description}`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (actions.some((action) => action.actionId === "leave-shared-expedition")) return;
  actions.push({
    actionId: "leave-shared-expedition",
    label: "退出这一趟地宫",
    description: "明确离开同伴的地宫。人还在名册上时，只是暂时不在门口，不会被悄悄抹掉。",
    durationTicks: 0,
    kind: "immediate",
  });
}

function expeditionCompanionIds(progress: DungeonExpeditionProgress): string[] {
  if (progress.companionIds && progress.companionIds.length > 0) {
    return progress.companionIds;
  }
  return progress.companionId ? [progress.companionId] : [];
}

function withCompanionIds(progress: DungeonExpeditionProgress, companionIds: string[]): DungeonExpeditionProgress {
  return {
    ...progress,
    companionIds,
    companionId: companionIds[0] ?? null,
  };
}

function sharedDungeonOf(world: WorldState, cultivatorId: string): CultivatorStateView["sharedDungeon"] {
  for (const progress of Object.values(world.dungeonExpeditions)) {
    if (!expeditionCompanionIds(progress).includes(cultivatorId)) {
      continue;
    }
    const leader = world.cultivators[progress.cultivatorId];
    const leaderName = leader?.name ?? "同行的人";
    const locationName = world.locations[progress.locationId]?.name ?? "地宫";
    return {
      leaderId: progress.cultivatorId,
      leaderName,
      rank: progress.targetRank,
      grade: progress.grade,
      locationName,
      stayPut: true,
      shareNote: `你跟着${leaderName}下了${progress.targetRank}阶。自己没有开工。人在开跑时就算进这一趟，中途离开门口不会被悄悄抹掉，回来还能接着打。要退出用 leave-shared-expedition。出来时还在地宫里的人，会分到灵石，也会分到伤。`,
      ...(progress.combatRounds && progress.combatRounds.length > 0
        ? { combatRounds: progress.combatRounds }
        : {}),
      ...(() => {
        const fields = partyWakePublicFields(world, progress);
        if (!fields || !progress.pendingWakeNode) return {};
        return {
          partyWake: {
            kind: fields.partyKind,
            context: progress.pendingWakeNode.context,
            ...(fields.subjectId ? { subjectId: fields.subjectId } : {}),
            ...(fields.subjectName ? { subjectName: fields.subjectName } : {}),
            safeOptionId: fields.safeOptionId,
            defaultOptionId: progress.pendingWakeNode.defaultOptionId,
            votedIds: fields.votedIds,
            awaitingNames: fields.awaitingNames,
            options: progress.pendingWakeNode.options,
          },
        };
      })(),
    };
  }
  return null;
}

function itemDisplayName(itemId: string): string {
  return ITEM_CATALOG[itemId as ItemId]?.name ?? itemId;
}

function resolveGiftItemId(
  cultivator: Cultivator,
  actionItemId: string | undefined,
  bodyItemId: string | null | undefined,
): ItemId {
  const requested = actionItemId ?? bodyItemId?.trim() ?? "";
  if (requested) {
    const itemId = requested as ItemId;
    if (!ITEM_CATALOG[itemId]) throw new Error("没有这件东西。");
    if ((cultivator.inventory[itemId] ?? 0) <= 0) throw new Error("身上没有这件能送的东西。");
    return itemId;
  }
  const giftableEntry = Object.entries(cultivator.inventory).find(([, count]) => count > 0);
  if (!giftableEntry) throw new Error("身上没有能送的东西。");
  return giftableEntry[0] as ItemId;
}

export function getCultivatorState(world: WorldState, cultivatorId: string): CultivatorStateView {
  ensureOptionalProgressMaps(world);
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  repairCultivatorRealm(cultivator);
  ensureDungeonWakeOnJob(world, cultivator);
  const location = world.locations[cultivator.locationId]; const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null; const neutralSect = getCultivatorNeutralSect(world, cultivator);
  const activeResidence = getActiveResidence(cultivator);
  const recentResidenceAmbientEvents = activeResidence
    ? getRecentResidenceAmbientEventsForResidence(
        world.daoLogs.filter((entry) => entry.cultivatorId === cultivatorId),
        activeResidence.id,
        2,
      )
    : [];
  const sectView = buildSectStateView(world, cultivator);
  const policy = decisionPolicy();
  const allAvailableActions = listAvailableActions(world, cultivatorId);
  const availableActionIdSet = new Set(allAvailableActions.map((a) => a.actionId));
  const availableItemActionIds = new Map<ItemId, ActionId[]>();
  for (const action of allAvailableActions) {
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
  const baselineMainAttrs = deriveMainAttributes(cultivator.registrationRecord);
  const mainAttrs = computeEffectiveMainAttributes(
    baselineMainAttrs,
    cultivator.mainAttributeGrowth ?? createEmptyMainAttributeGrowth(),
    cultivator.mainAttributePercentageBonus ?? 0,
  );
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
    ...(() => {
      const skillViews = listCombatSkillViews(skillContextOf(cultivator));
      const readyIds = new Set(skillsForCultivator(cultivator).map((skill) => skill.id));
      return {
        partyRole: partyRoleForCultivator(cultivator),
        availableSkills: skillViews,
        legalPartyRoles: legalPartyRoles(cultivator).map((id) => ({ id, label: PARTY_ROLE_LABEL[id] })),
        preferredPartyRole: cultivator.preferredPartyRole
          ? { id: cultivator.preferredPartyRole, label: PARTY_ROLE_LABEL[cultivator.preferredPartyRole] }
          : null,
        equippedSkillIds: [...(cultivator.preferredSkillIds ?? [])],
        equippedSkills: skillViews.filter((skill) => readyIds.has(skill.id)),
        skillProficiency: { ...(cultivator.skillProficiency ?? {}) },
        roleExperience: { ...(cultivator.roleExperience ?? {}) },
        combatLeaning: combatLeaningView(cultivator),
        weaponSkills: skillViews.filter((skill) => skill.pool === "weapon"),
        rootSkills: skillViews.filter((skill) => skill.pool === "root"),
        loadoutGuidance: loadoutGuidanceFor(cultivator),
        nextUnlocks: listNextUnlocks(skillContextOf(cultivator)),
        ...nextGearViews(cultivator),
      };
    })(),
  };
  return {
    tick: world.tick,
    cultivator: { id: cultivator.id, name: cultivator.name, realm: cultivator.realm, realmLevel: cultivator.realmLevel, realmPhase: realmPhaseOfLevel(cultivator.realmLevel), realmProgress: cultivator.realmProgress, status: statusOf(cultivator), location: location?.name ?? cultivator.locationId, locationId: cultivator.locationId, spiritStones: cultivator.spiritStones, qi: cultivator.qi, maxQi: cultivator.maxQi, spiritualPower: cultivator.spiritualPower, maxSpiritualPower: cultivator.maxSpiritualPower, reputation: currentStateReputation(cultivator), lifespan: cultivator.lifespan, age: Number(cultivator.age.toFixed(2)), genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, moralityScore: cultivator.moralityScore, moralityAlignment: moralityAlignmentOfCultivator(cultivator) },
    cultivation: {
      mainTechnique: techniqueDisplayName(cultivator.techniques[0] ?? "Basic Breathing"),
      techniques: cultivator.techniques.map(techniqueDisplayName),
    },
    combatProfile,
    neutralSect: neutralSect ? { id: neutralSect.id, name: neutralSect.name, alignment: neutralSect.alignment, stateId: neutralSect.stateId, headquarters: neutralSect.headquarters, role: "member", memberCount: neutralSect.memberIds.length, neutralContribution: cultivator.neutralContribution, rewardMultiplier: neutralSect.rewardMultiplier, competitive: false } : null,
    ...(buildSectLifeView(world, cultivator) ? { sectLife: buildSectLifeView(world, cultivator)! } : {}),
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
    nearbyOpportunities: [location && canTradeAtLocation(location) ? "这里能买卖。" : "换个地方，机会会多一些。", location?.nodeType === "wilderness" ? "可以采集，也可以猎兽。" : "留意这一带的事。"],
    statusEffects: cultivator.statusEffects.map((effect) => {
      const facing = facingStatus(effect.id, effect.name, effect.description);
      return { id: effect.id, name: facing.name, description: facing.description, remainingTicks: effect.remainingTicks, source: effect.source };
    }),
    factionReputation: Object.entries(cultivator.factionReputation).map(([factionId, value]) => ({
      factionId,
      name: factionNameOf(world, factionId),
      value,
      standing: standing(value),
    })),
    recentEvents: getRecentWorldEvents(world, cultivatorId, 5).map((event) => ({ ...event, title: publicEventTitle(event.title) })),
    recentCombats: getCombatLogs(world, cultivatorId, 4).map(publicCombatLog),
    travelogue: {
      mood: describeMood(cultivator, Boolean(getActiveDungeonExpedition(world, cultivator.id))),
      notes: [...(cultivator.travelNotes ?? [])],
    },
    mood: currentMood(cultivator, world.tick),
    digest: buildCultivatorDigest(world, cultivator),
    ...socialDeepenView(world, cultivator),
    ...(() => {
      const owedFavors = listOwedFavorViews(world, cultivator.id);
      return owedFavors.length > 0 ? { owedFavors } : {};
    })(),
    ...(() => {
      const pendingDialogue = pendingDialogueOf(world, cultivator.id);
      return pendingDialogue.length > 0 ? { pendingDialogue } : {};
    })(),
    registration: registrationViewOf(cultivator),
    registrationEffects: registrationEffectsViewOf(cultivator),
    registrationProfile: cultivator.registrationRecord ? buildRegistrationProfile(cultivator.registrationRecord) : null,
    ...(() => {
      const breakthrough = breakthroughViewOf(world, cultivator);
      return {
        breakthrough,
        realmPath: realmPathView({
          realm: cultivator.realm,
          realmLevel: cultivator.realmLevel,
          realmProgress: cultivator.realmProgress,
          next: breakthrough
            ? {
                targetRealm: breakthrough.targetRealm,
                targetLevel: breakthrough.targetLevel,
                category: breakthrough.category,
                successRate: breakthrough.majorSuccessRate,
              }
            : null,
        }),
      };
    })(),
    dungeon: dungeonViewForLocation(world, cultivator, location),
    dungeonExpedition: (() => {
      const view = buildDungeonExpeditionStateView(
        world,
        cultivator,
        cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
      );
      const active = getActiveDungeonExpedition(world, cultivator.id);
      const fields = active ? partyWakePublicFields(world, active) : null;
      if (!fields || !view.wakeNodeHint) return view;
      return {
        ...view,
        wakeNodeHint: {
          ...view.wakeNodeHint,
          partyKind: fields.partyKind,
          safeOptionId: fields.safeOptionId,
          ...(fields.subjectId ? { subjectId: fields.subjectId } : {}),
          ...(fields.subjectName ? { subjectName: fields.subjectName } : {}),
          votedIds: fields.votedIds,
          awaitingNames: fields.awaitingNames,
        },
      };
    })(),
    regionalDungeons: viewRegionalDungeons(world, cultivator),
    bahuang: buildBahuangStateView(world, cultivator),
    wilderness: buildWildernessView(world, cultivator),
    wildRoute: buildWildRouteView(world, cultivator),
    guixu: buildGuixuView(world, cultivator),
    derivedState,
    socialLinks: getSocialLinksView(world, cultivatorId),
    residences: cultivator.residences.map((r) => buildOwnedResidenceView(r, r.locationId === cultivator.locationId)),
    ...(() => {
      const homes = nearbyHomeViews(world, cultivator);
      return homes.length > 0 ? { nearbyHomes: homes } : {};
    })(),
    activeResidence,
    residenceContext: activeResidence
      ? buildResidenceContext(activeResidence, world.tick, recentResidenceAmbientEvents)
      : null,
    productionQueue: (cultivator.productionQueue ?? []).map((e) => ({ slot: e.slot, recipeId: e.recipeId, ticksRemaining: e.ticksRemaining })),
    pendingGifts: (cultivator.pendingGifts ?? []).map((g) => ({
      messageId: g.messageId,
      fromCultivatorId: g.fromCultivatorId,
      fromName: world.cultivators[g.fromCultivatorId]?.name ?? "unknown",
      itemId: g.itemId,
      itemName: itemDisplayName(g.itemId),
      count: g.count,
    })),
    localCommissions: Object.values(world.commissions ?? {})
      .filter((c) => c.locationId === cultivator.locationId && c.completedAtTick === null && c.acceptedById === null && c.posterId !== cultivator.id)
      .map((c) => ({
        id: c.id,
        posterName: facingPersonName(world.cultivators[c.posterId]?.name ?? "某人"),
        type: c.type,
        targetItemId: c.targetItemId,
        targetCount: c.targetCount,
        rewardSpiritStones: c.rewardSpiritStones,
      })),
    nearbyCultivators: nearbyCultivatorsOf(world, cultivator),
    nearbyNote: nearbyActionNote(world, cultivator),
    socialPage: (() => {
      const window = socialWindow(world, cultivator);
      return { index: window.page, pageCount: window.pageCount, holdTicks: SOCIAL_PAGE_HOLD_TICKS };
    })(),
    party: partyShareOf(world, cultivator),
    sharedDungeon: sharedDungeonOf(world, cultivator.id),
    localBoard: (world.locationBoards?.[cultivator.locationId] ?? []).map((note) => ({
      authorName: note.authorName,
      tick: note.tick,
      text: note.text,
      kind: note.kind,
    })),
    endgame: {
      guixuCompletedNodeIds: cultivator.guixuCompletedNodeIds ?? [],
      originHeartAwakened: (cultivator.guixuCompletedNodeIds ?? []).includes("guixu-origin-heart"),
    },
    onboarding: (() => {
      const raw = computeOnboardingProgress(world, cultivator);
      return {
        ...raw,
        recommendedActions: filterToAvailable(raw.recommendedActions, availableActionIdSet),
      };
    })(),
    decisionPolicy: policy,
    agentGuidance: (() => {
      const raw = guidance(world, cultivator);
      return {
        warnings: raw.warnings,
        priorities: raw.priorities,
        suggestedActions: filterToAvailable(raw.suggestedActions, availableActionIdSet),
      };
    })(),
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
        label: "洞府回气",
        description: "不花灵石，先把气调回来。",
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
          label: `前往${world.locations[nearestSafeLocationId]?.name ?? "能歇脚的地方"}`,
          description: "先回到能歇脚的地方。",
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
        label: "城镇差事",
        description: "在城里做一件稳当的差事。",
        durationTicks: DEFAULT_ACTION_DURATIONS["take-mortal-task"],
        kind: "timed",
      },
    ];
  }
  return actions;
}

function atOwnSectHall(world: WorldState, cultivator: Cultivator): boolean {
  const sect = cultivator.sectId ? world.sects[cultivator.sectId] : null;
  if (sect && cultivator.locationId === sect.headquarters) return true;
  const neutral = getCultivatorNeutralSect(world, cultivator);
  return Boolean(neutral && cultivator.locationId === neutral.headquarters);
}

function contentGearActions(cultivator: Cultivator, location: { kind: string; nodeType: string }): AvailableAction[] {
  const listed: AvailableAction[] = [];
  const shop = canTradeAtLocation(location);
  const member = Boolean(cultivator.sectId || cultivator.neutralSectId);
  const earned = cultivator.sectId ? cultivator.totalContribution : cultivator.neutralContribution;
  for (const kind of ["weapon", "spell"] as const) {
    const offer = gearOffer(cultivator, kind);
    if (!offer?.reachable) continue;
    if (shop && offer.soldAtShop !== false) {
      listed.push({
        actionId: kind === "weapon" ? "buy-next-weapon" : "buy-next-manual",
        label: kind === "weapon" ? `坊市买${offer.name}` : `坊市买${offer.name}`,
        description: `${offer.seek}坊市要${offer.shopPrice}灵石。买回去还得用掉才会学会，不会自动换上。`,
        durationTicks: 0,
        kind: "immediate",
        costs: { spiritStones: offer.shopPrice },
      });
    }
    if (location.kind === "safe" && member && earned >= offer.contributionGate) {
      listed.push({
        actionId: kind === "weapon" ? "exchange-sect-weapon" : "exchange-sect-manual",
        label: kind === "weapon" ? `宗门换${offer.name}` : `宗门换${offer.name}`,
        description: `${offer.seek}宗门要${offer.sectPrice}灵石，贡献得到${offer.contributionGate}。换回去还得用掉才会学会。`,
        durationTicks: 0,
        kind: "immediate",
        costs: { spiritStones: offer.sectPrice },
      });
    }
  }
  return listed;
}

function travelCardFor(world: WorldState, locationId: string): { label: string; description: string } {
  const place = world.locations[locationId];
  const name = place?.name ?? locationId;
  if (place?.nodeType === "sect-outpost" && place.organizationType === "neutral-sect" && place.organizationId) {
    const sectName = world.neutralSects[place.organizationId]?.name ?? name;
    return {
      label: `前往${name}`,
      description: `${name}是${sectName}的中立山门。到了据点就能入门。`,
    };
  }
  if (place?.nodeType === "sect-outpost" && place.organizationType === "player-sect") {
    const sectName = (place.organizationId && world.sects[place.organizationId]?.name) || name;
    return {
      label: `前往${name}（玩家宗门）`,
      description: `${name}是玩家自建的${sectName}。想入门，到据点或本州主城报名。`,
    };
  }
  if (place?.nodeType === "wilderness") {
    const wild = wildPlaceForState(place.stateId);
    if (wild) {
      return {
        label: `前往${wild.name}`,
        description: wild.advice,
      };
    }
  }
  return {
    label: `前往${name}`,
    description: `前往${name}。`,
  };
}

function residenceGrandeurActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const residence = getActiveResidence(cultivator);
  if (!residence) return [];
  const actions: AvailableAction[] = [];
  const upgrade = upgradeQuote(residence);
  actions.push({
    actionId: "upgrade-residence",
    label: `修府：${upgrade.tierName}`,
    description: upgrade.line,
    durationTicks: 0,
    kind: "immediate",
    costs: { spiritStones: upgrade.price },
  });
  for (const offer of fixtureOffers(residence)) {
    actions.push({
      actionId: offer.actionId as ActionId,
      label: offer.nextTier === 1 ? `置办${offer.name}` : `换上${offer.tierName}${offer.name}`,
      description: offer.line,
      durationTicks: 0,
      kind: "immediate",
      costs: { spiritStones: offer.price },
    });
  }
  for (const fixture of fixtureViews(residence)) {
    actions.push({
      actionId: `clear-fixture:${fixture.id}` as ActionId,
      label: `撤下${fixture.name}`,
      description: `把${fixture.name}撤下来，空出一个位子。灵石不退，再买从最低一阶重新算。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  for (const relic of jiaRelicsHeld(cultivator.inventory)) {
    if (residence.displayedRelic?.itemId === relic.itemId) continue;
    actions.push({
      actionId: `display-relic:${relic.itemId}` as ActionId,
      label: `把${relic.name}摆上案`,
      description: `${relic.arcLine}摆上以后东西还在袋子里。来府里的人能看见案上这一句。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  if (residence.displayedRelic) {
    actions.push({
      actionId: "clear-displayed-relic",
      label: `收回案上的${residence.displayedRelic.name}`,
      description: "案上不再摆这件。袋子里的份数不变。",
      durationTicks: 0,
      kind: "immediate",
    });
  }
  const tea = hostTeaCost(residence);
  for (const guest of socialActionTargets(world, cultivator)) {
    if (!hostReady(residence, guest.id, world.tick).ok) continue;
    actions.push({
      actionId: `host-guest:${guest.id}` as ActionId,
      label: `请${guest.name}到府里坐`,
      description: `请${guest.name}进${residenceTierName(residence)}坐一坐，花${tea}灵石温茶。人在这城里就能请。好感加得很少，隔四个时辰才能再请这一位。`,
      durationTicks: 0,
      kind: "immediate",
      costs: { spiritStones: tea },
    });
  }
  return actions;
}

const SEND_MESSAGE_KIND_ZH = {
  greet: "问候",
  "share-info": "分享见闻",
  "request-help": "求援",
} as const;

function enterDungeonStanceLine(posture: "conservative" | "balanced" | "aggressive"): string {
  if (posture === "conservative") return "这一趟稳妥偏守。真有险处，先保人，再谈往里走。";
  if (posture === "aggressive") return "这一趟凶猛偏攻。会压着门口往里，也受得住更深的伤。";
  return "这一趟走均衡。该进的时候进，该收的时候收。";
}

function enterDungeonCardDescription(
  dungeon: DungeonStateView,
  rank: DungeonRank,
  posture: "conservative" | "balanced" | "aggressive",
): string {
  const yieldLine = describeDungeonExpeditionAction({ dungeon, rank, policy: posture });
  const road = dungeon.grade === "甲" && rank === dungeon.frontierRank
    ? "进门以后先走一段，岔路和侧室在守关前面。"
    : "";
  return `${yieldLine}${road}${enterDungeonStanceLine(posture)}`;
}

export function listAvailableActions(world: WorldState, cultivatorId: string): AvailableAction[] {
  ensureOptionalProgressMaps(world);
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const activeResidence = getActiveResidence(cultivator);
  const activeDungeonExpedition = getActiveDungeonExpedition(world, cultivator.id);
  const activeBahuang = world.bahuangProgress[cultivator.id]?.status === "active"
    ? world.bahuangProgress[cultivator.id]
    : null;
  const readinessLevel = computeReadiness(cultivator);
  const highRiskAllowed = readinessLevel === "ready" || readinessLevel === "advantaged";
    if (cultivator.activeJobId) {
    ensureDungeonWakeOnJob(world, cultivator);
    const sectBusy = listSectSceneActions(world, cultivator);
    const regionalBusy = listRegionalChoiceActions(world, cultivator);
    const sceneBusy = sceneChoiceActions(world, cultivator);
    if (!activeDungeonExpedition) {
      return [...sectBusy, ...regionalBusy, ...sceneBusy];
    }
    const busyActions: AvailableAction[] = [{
      actionId: "abort-dungeon-expedition",
      label: "中止地宫远征",
      description: "停下这一趟，回到能歇脚的地方，并把这一趟的账结了。",
      durationTicks: 0,
      kind: "immediate",
    }];
    const wake = activeDungeonExpedition.pendingWakeNode;
    if (wake) {
      for (const option of wake.options) {
        busyActions.push({
          actionId: `dungeon-wake-decision:${option.optionId}` as ActionId,
          label: `地宫抉择：${option.label}`,
          description: `${wake.context} ${option.description}`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    return [...sectBusy, ...regionalBusy, ...busyActions, ...sceneBusy];
  }
  const location = world.locations[cultivator.locationId];
  if (!location) throw new Error(`Location not found: ${cultivator.locationId}`);
  const registration = registrationModifiersOf(cultivator);
  const breakthrough = breakthroughViewOf(world, cultivator);
  const methodActions =
    breakthrough?.readyByProgress && breakthrough.readyByMaterials
      ? listBreakthroughMethodActions(world, cultivator)
      : [];
  const localSect = getLocalSect(world, cultivator.locationId);
  const localNeutralSect = getLocalNeutralSect(world, cultivator.locationId);
  const joinedNeutralSect = getCultivatorNeutralSect(world, cultivator);
  const joinedSect = getCultivatorSect(world, cultivator);
  const activeWilderness = getActiveWildernessProgress(world, cultivator.id);
  const wildernessLayer = getWildernessLayerForLocation(world, cultivator.locationId);
  const residenceActionDescription = (baseDescription: string) =>
    activeResidence ? describeResidenceAction(baseDescription, activeResidence, world.tick) : baseDescription;
  const recipeActions = getLiveCraftableRecipes(cultivator).map((recipe) => {
    const outputName = ITEM_CATALOG[recipe.outputItemId]?.name ?? "这件东西";
    return {
    actionId: `residence-produce:${recipe.id}` as ActionId,
    label: `洞府炼制：${outputName}`,
    description: residenceActionDescription(`在洞府炼制${outputName}。`),
    durationTicks: recipe.durationTicks,
    kind: "timed" as const,
    costs: {
      spiritStones: recipe.spiritStoneCost,
      itemConsumes: recipe.inputMaterials.map((material) => ({ itemId: material.itemId, count: material.count })),
    },
  };
  });
  const queueActions: AvailableAction[] = [];
  if (isAtResidence(cultivator) && (cultivator.productionQueue?.length ?? 0) < PRODUCTION_QUEUE_MAX_LENGTH) {
    for (const recipe of getLiveCraftableRecipes(cultivator)) {
      const queuedName = ITEM_CATALOG[recipe.outputItemId]?.name ?? "这件东西";
      queueActions.push({
        actionId: `queue-production:${recipe.id}` as ActionId,
        label: `排队炼制：${queuedName}`,
        description: `把${queuedName}排进炉里。材料现在就扣，炼成了再交给你。`,
        durationTicks: 0,
        kind: "immediate",
        costs: {
          spiritStones: recipe.spiritStoneCost,
          itemConsumes: recipe.inputMaterials.map((m) => ({ itemId: m.itemId, count: m.count })),
        },
      });
    }
  }
  if (isAtResidence(cultivator) && cultivator.productionQueue && cultivator.productionQueue.length > 0) {
    for (const entry of cultivator.productionQueue) {
      queueActions.push({
        actionId: `cancel-production:${entry.slot}` as ActionId,
        label: `取消排队（第${entry.slot + 1}炉）`,
        description: "取消这一炉，扣掉的材料退回来。",
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  const actions: AvailableAction[] = activeWilderness || activeBahuang
    ? []
    : getNeighborLocations(world, cultivator.locationId)
      .map(({ locationId: neighborId, ticks }) => {
        const card = travelCardFor(world, neighborId);
        return {
          actionId: travelActionIdOf(neighborId) as ActionId,
          label: card.label,
          description: card.description,
          durationTicks: ticks,
          kind: "timed" as const,
        };
      });
  actions.push({
    actionId: "meditate",
    label: "打坐",
    description: "把灵力调回来。",
    durationTicks: DEFAULT_ACTION_DURATIONS.meditate,
    kind: "timed",
    ...(cultivator.injuryTicksRemaining > 0
      ? { suboptimal: { reason: "meditation-does-not-heal-injury" } }
      : {}),
  });
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
    if (!tierAllowed(cultivator.realmLevel, wDef.weaponTier ?? 1)) continue;
    actions.push({
      actionId: `equip-weapon:${loadoutId}` as ActionId,
      label: `换上${wDef.name}`,
      description: `把兵器换成${wDef.name}（${WEAPON_TYPE_NAMES_INLINE[wDef.weaponTypeId] ?? wDef.weaponTypeId}，这一式耗灵${wDef.coreSkillSpiritCost}，伤害+${wDef.attackPowerBonus}）。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  for (const loadoutId of cultivator.unlockedSpellLoadoutIds) {
    if (loadoutId === cultivator.equippedSpellLoadoutId) continue;
    const sDef = getSpellLoadoutDefinition(loadoutId);
    if (!sDef) continue;
    if (!tierAllowed(cultivator.realmLevel, sDef.spellTier ?? 1)) continue;
    actions.push({
      actionId: `equip-spell:${loadoutId}` as ActionId,
      label: `换上${sDef.name}`,
      description: `把法术换成${sDef.name}（${SPELL_BRANCH_NAMES_INLINE[sDef.spellBranchId] ?? sDef.spellBranchId}，这一式耗灵${sDef.coreSkillSpiritCost}，伤害+${sDef.attackPowerBonus}）。`,
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
      label: `学会${targetName}`,
      description: `用${def.name}学会${wId ? "兵器" : "法术"}「${targetName}」。东西会用掉，不会自动换上。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }

  actions.push(...contentGearActions(cultivator, location));

  if (cultivator.injuryTicksRemaining > 0) {
    appendSharedExpeditionActions(world, cultivator, actions);
    if (activeWilderness) {
      actions.push({
        actionId: "withdraw-from-wilderness",
        label: "撤出这一层",
        description: "先退出这一层，免得再耗下去。",
        durationTicks: 0,
        kind: "immediate",
      });
      actions.push(...sceneChoiceActions(world, cultivator));
      return actions;
    }
    if (isAtResidence(cultivator)) {
      actions.push(
        {
          actionId: "residence-heal",
          label: "洞府疗伤",
          description: residenceActionDescription("在洞府里把伤养一养。"),
          durationTicks: DEFAULT_ACTION_DURATIONS["residence-heal"],
          kind: "timed",
        },
        {
          actionId: "residence-recover-qi",
          label: "洞府回气",
          description: residenceActionDescription("在洞府里把气调回来。"),
          durationTicks: DEFAULT_ACTION_DURATIONS["residence-recover-qi"],
          kind: "timed",
        },
        ...recipeActions,
        ...queueActions,
      );
      actions.push(...methodActions);
      return ensureSafetyNetActions(world, cultivator, location, actions);
    }
    if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "疗伤", description: "把伤养一养。", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
    actions.push(...listSectLifeActions(world, cultivator));
    return ensureSafetyNetActions(world, cultivator, location, actions);
  }
  if (isAtResidence(cultivator)) {
    actions.push(
      ...(!breakthrough?.readyByProgress
        ? [{
            actionId: "residence-meditate" as const,
            label: "洞府打坐",
          description: residenceActionDescription("在洞府里闭关打坐。"),
            durationTicks: DEFAULT_ACTION_DURATIONS["residence-meditate"],
            kind: "timed" as const,
          }]
        : []),
      {
        actionId: "residence-heal",
        label: "洞府疗伤",
        description: residenceActionDescription("在洞府里把伤养一养。"),
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-heal"],
        kind: "timed",
      },
      {
        actionId: "residence-recover-qi",
        label: "洞府回气",
        description: residenceActionDescription("在洞府里把气调回来。"),
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-recover-qi"],
        kind: "timed",
      },
      ...recipeActions,
      ...queueActions,
      {
        actionId: "residence-socialize",
        label: "洞府闲谈",
        description: residenceActionDescription("在洞府里坐一会儿。"),
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-socialize"],
        kind: "timed",
      },
    );
  }
  if (!activeWilderness && !activeBahuang) {
    actions.push(...methodActions);
  }
  if (!breakthrough?.readyByProgress) {
    actions.push({ actionId: "cultivate", label: "运功", description: "花一些灵石，把修为往前推一截。", durationTicks: DEFAULT_ACTION_DURATIONS.cultivate, kind: "timed" });
  }
  if (location.kind === "safe") actions.push({ actionId: "take-mortal-task", label: "城镇差事", description: "在城里做一件稳当的差事。", durationTicks: DEFAULT_ACTION_DURATIONS["take-mortal-task"], kind: "timed" });
  if (canTradeAtLocation(location)) {
    const breakthroughDefinition = breakthroughDefinitionOf(cultivator);
    if (breakthroughDefinition && breakthroughDefinition.marketBuyable) {
      const missing = breakthroughMaterialsMissing(cultivator, breakthroughDefinition);
      if (missing.length > 0) {
        const firstMissing = missing[0]!;
        const price = buyPrice(cultivator, breakthroughMaterialBasePrice(firstMissing.itemId, cultivator.realmLevel));
        actions.push({
          actionId: "buy-current-breakthrough-material",
          label: `买${itemDisplayName(firstMissing.itemId)}`,
          description: `花${price}灵石买一份${itemDisplayName(firstMissing.itemId)}。`,
          durationTicks: 0,
          kind: "immediate",
          costs: { spiritStones: price },
        });
      }
    }
    for (const itemId of ["healing-pill", "qi-pill", "ward-talisman", "eight-wastes-pass"] as const) {
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
    // ---- Buy residence in current state ----
    const currentStateId = stateIdFromLocationId(cultivator.locationId);
    if (!hasResidenceInState(cultivator, currentStateId)) {
      const price = residencePriceForState(currentStateId);
      const entry = getResidenceCatalogEntry(currentStateId);
      actions.push({
        actionId: `buy-residence:${currentStateId}` as ActionId,
        label: `买下洞府：${entry?.name ?? "这一处"}`,
        description: `在${entry?.stateName ?? "这一州"}花${price}灵石买一处洞府。${entry?.description ?? ""}`.trim(),
        durationTicks: 0,
        kind: "immediate",
        costs: { spiritStones: price },
      });
    }
  }
  actions.push(...residenceGrandeurActions(world, cultivator));
  if (!cultivator.sectId && !cultivator.neutralSectId && localNeutralSect?.joinable) {
    actions.push({
      actionId: `join-neutral-sect:${localNeutralSect.id}`,
      label: `入门：${localNeutralSect.name}`,
      description: `在${localNeutralSect.name}据点入门。这是本州的中立门派。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  if (!cultivator.sectId && !cultivator.neutralSectId && localSect) {
    const aligned = cultivatorMatchesSectAlignment(localSect, cultivator);
    if (cultivator.completedBaseQuests >= 1 && aligned) {
      actions.push({
        actionId: "join-sect",
        label: `入门：${localSect.name}（玩家宗门）`,
        description: `${localSect.name}是玩家自建的宗门。你已经做过一桩基础事务，道心也对得上，可以直接入门。`,
        durationTicks: 0,
        kind: "immediate",
      });
    } else {
      const reason = cultivator.completedBaseQuests < 1
        ? "你还没做过一桩基础事务，眼下不能直接入门。"
        : "你的道心和这家宗门的正魔不合，眼下不能直接入门。";
      actions.push({
        actionId: "open-player-sect-recruitment",
        label: `${localSect.name}不收直接入门`,
        description: `${localSect.name}是玩家自建的宗门。${reason}想入门，到据点或本州主城报名。这张卡交上去也不会入门。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (joinedNeutralSect?.headquarters === cultivator.locationId) {
    actions.push({ actionId: "take-neutral-duty", label: "中立差事", description: "给这家门派做一件稳当、慢一点的差事。", durationTicks: DEFAULT_ACTION_DURATIONS["take-neutral-duty"], kind: "timed" });
    actions.push({ actionId: "leave-neutral-sect", label: "离开这处中立门派", description: "退出这家中立门派，贡献清掉。", durationTicks: 0, kind: "immediate" });
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
  if (atOwnSectHall(world, cultivator) && (cultivator.bandErrandReadyTick ?? 0) <= world.tick) {
    for (const kind of ["weapon", "spell"] as const) {
      const offer = gearOffer(cultivator, kind);
      if (!offer || offer.tier < 4 || !offer.reachable) continue;
      const actionId = kind === "weapon" ? "band-errand:weapon" as const : "band-errand:manual" as const;
      actions.push({
        actionId,
        label: kind === "weapon" ? `宗门差事：取${offer.name}的锻材` : `宗门差事：取${offer.name}的残页`,
        description: `${offer.seek}这趟差事带回一份锻材或残页，不直接学会。隔六个时辰才能再跑。`,
        durationTicks: DEFAULT_ACTION_DURATIONS[actionId],
        kind: "timed",
      });
    }
  }
  const board = getQuestBoard(world, cultivator.locationId);
  if (board) {
    const baseQuestCount = cultivator.activeQuests.filter((quest) => quest.category === "base").length;
    const sectQuestCount = cultivator.activeQuests.filter((quest) => quest.category === "sect").length;
    for (const quest of board.quests) {
      if (quest.category === "base" && baseQuestCount >= MAX_ACTIVE_BASE_QUESTS) {
        continue;
      }
      if (quest.category === "sect" && sectQuestCount >= MAX_ACTIVE_SECT_QUESTS) {
        continue;
      }
      actions.push({
        actionId: buildAcceptQuestActionId(quest.type, quest.boardIndex) as ActionId,
        label: `接下：${questFacingName(quest)}`,
        description: `${questFacingDescription(quest)}做完能得${quest.reward.spiritStones}灵石。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  for (const [activeIndex, activeQuest] of cultivator.activeQuests.entries()) {
    actions.push({
      actionId: buildExecuteQuestActionId(activeQuest.type, activeIndex) as ActionId,
      label: `去做：${questFacingName(activeQuest)}`,
      description: questFacingDescription(activeQuest),
      durationTicks: activeQuest.durationTicks,
      kind: "timed",
    });
  }
  if (activeWilderness) {
    actions.push(
      {
        actionId: "survey-wilderness",
        label: "再探这一层",
        description: (() => {
          const wild = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
          return wild
            ? `${wild.advice}再走一段，会留下一句见闻。`
            : "再往这一层里走一段，会留下一句见闻。";
        })(),
        durationTicks: DEFAULT_ACTION_DURATIONS["survey-wilderness"],
        kind: "timed",
      },
      {
        actionId: "withdraw-from-wilderness",
        label: "撤出这一层",
        description: (() => {
          const wild = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
          return wild ? `${wild.withdraw}不另扣灵石。` : "先从这一层退出来。不另扣灵石。";
        })(),
        durationTicks: 0,
        kind: "immediate",
      },
    );
  } else if (activeBahuang) {
    actions.push({
      actionId: "retreat-from-bahuang",
      label: "撤出八荒",
      description: `${bahuangBandForDepth(activeBahuang.depth).retreat}原来的那笔灵石还是要扣。`,
      durationTicks: 0,
      kind: "immediate",
    });
    // If there's a pending wake node, offer decision choices
    if (activeBahuang.pendingWakeNodeIndex !== null) {
      const wakeNode = activeBahuang.encounteredWakeNodes[activeBahuang.pendingWakeNodeIndex];
      if (wakeNode) {
        for (const option of wakeNode.options) {
          actions.push({
            actionId: `bahuang-wake-decision:${option.optionId}` as ActionId,
            label: `八荒抉择：${option.label}`,
            description: `${wakeNode.context} — ${option.description}`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
    }
    actions.push(...sceneChoiceActions(world, cultivator));
    appendSharedExpeditionActions(world, cultivator, actions);
    return actions;
  } else if (wildernessLayer) {
    actions.push(buildEnterWildernessAction(world, cultivator, wildernessLayer));
  }
  if (!activeWilderness && !activeBahuang && highRiskAllowed && EIGHT_WASTES_CONTENT.entryLocationIds.includes(cultivator.locationId as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number])) {
    const gate = canEnterBahuang(cultivator, cultivator.locationId, world);
    if (gate.allowed) {
      for (const posture of ["conservative", "balanced", "aggressive"] as const) {
        const stance = dungeonPostureLabel(posture);
        actions.push({
          actionId: `enter-bahuang:${posture}` as ActionId,
          label: `进八荒（${stance}）`,
          description: `${bahuangBandForDepth(0).advice}姿态是${stance}。`,
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
          label: `探${node.name}`,
          description: `走进${node.name}，把这一处的事看完。`,
          durationTicks: node.explorationDurationTicks,
          kind: "timed",
        });
        continue;
      }

      const unlockCheck = canUnlockGuixuNode(world, cultivator, node);
      if (unlockCheck.allowed) {
        actions.push({
          actionId: `unlock-guixu:${node.nodeId}` as ActionId,
          label: `打开${node.name}`,
          description: `用荒野里积下的感应打开${node.name}。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
  }
  if (location.nodeType === "wilderness") {
    actions.push({ actionId: "mine-spirit-stones", label: "采集灵石", description: "捡灵石，也挖一点矿。", durationTicks: DEFAULT_ACTION_DURATIONS["mine-spirit-stones"], kind: "timed" });
    if (highRiskAllowed) {
      const hunted = wildPlaceForState(location.stateId);
      actions.push({
        actionId: "hunt-mine-beast",
        label: hunted ? `猎${hunted.enemy}` : "猎兽",
        description: hunted
          ? `${hunted.name}上打的是${hunted.enemy}，旁边是${hunted.follower}，身上挂${hunted.statusLabel}。`
          : "跟这一带的兽打一场，收获会多一些。",
        durationTicks: DEFAULT_ACTION_DURATIONS["hunt-mine-beast"],
        kind: "timed",
      });
    }
  }
  if (isDungeonNode(location.nodeType) && !activeDungeonExpedition) {
    const lockLine = dungeonGateLockLine(cultivator, location);
    if (lockLine) {
      const grade = dungeonMetadataOf(location)?.grade;
      actions.push({
        actionId: "dungeon-gate-locked",
        label: grade === "甲" ? "丹霞内府还进不去" : grade === "乙" ? "乙级地宫还进不去" : "丙级地宫还进不去",
        description: lockLine,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (isDungeonNode(location.nodeType) && highRiskAllowed && !dungeonGateLockLine(cultivator, location)) {
    const dungeonView = dungeonViewForLocation(world, cultivator, location);
    const partyShare = partyShareOf(world, cultivator);
    const shareSuffix = partyShare?.dungeonShareReady ? ` ${partyShare.shareNote}` : "";
    if (dungeonView && !dungeonView.lockReason) {
      for (const rank of dungeonView.availableRanks) {
        for (const posture of ["conservative", "balanced", "aggressive"] as const) {
          const stance = dungeonPostureLabel(posture);
          actions.push({
            actionId: enterDungeonActionIdOf(rank, posture),
            label: `进${dungeonView.grade}级地宫第${rank}阶（${stance}）`,
            description: `${enterDungeonCardDescription(dungeonView, rank, posture)}${shareSuffix}`,
            durationTicks: DUNGEON_EXPEDITION_DURATION_TICKS,
            kind: "timed",
          });
        }
      }
    }
  }
  actions.push(...listRegionalEnterActions(world, cultivator));
  actions.push(...listRegionalChoiceActions(world, cultivator));
  if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "疗伤", description: "把气血和伤一起养一养。", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
  if (location.kind === "safe") {
    const duelTargets = socialActionTargets(world, cultivator)
      .filter((candidate) => getCityDuelChallengeBlockReason(world, cultivator, candidate) === null);
    for (const candidate of duelTargets) {
      const feud = grudgeArcOf(getSocialLink(world, cultivator.id, candidate.id)?.grudge ?? 0);
      actions.push({
        actionId: `challenge-cultivator:${candidate.id}` as ActionId,
        label: feud ? `再战：${candidate.name}（剑拔弩张）` : `切磋：${candidate.name}`,
        description: feud
          ? `${candidate.name}和你有${feud}。再战一场，话可以之后再说。`
          : `约${candidate.name}在城里切磋一场。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (cultivator.pendingPvpChallengeId) {
    const pendingChallenge = world.pendingPvpChallenges[cultivator.pendingPvpChallengeId];
    if (pendingChallenge && getPendingPvpChallengeInvalidReason(world, pendingChallenge) === null) {
      const remain = Math.max(0, pendingChallenge.expiresAtTick - world.tick);
      if (pendingChallenge.targetCultivatorId === cultivator.id) {
        const challengerName = world.cultivators[pendingChallenge.challengerCultivatorId]?.name ?? "对方";
        actions.push(
          {
            actionId: `accept-pvp-challenge:${pendingChallenge.id}` as ActionId,
            label: `应战：${challengerName}（还剩${remain}刻）`,
            description: `接受${challengerName}的切磋。挑战书还剩 ${remain} 刻，过了就自动搁下。`,
            durationTicks: 0,
            kind: "immediate",
          },
          {
            actionId: `reject-pvp-challenge:${pendingChallenge.id}` as ActionId,
            label: `拒绝切磋：${challengerName}（还剩${remain}刻）`,
            description: `拒绝${challengerName}的切磋。还剩 ${remain} 刻，过了这场自己会搁下。`,
            durationTicks: 0,
            kind: "immediate",
          },
        );
      } else if (pendingChallenge.challengerCultivatorId === cultivator.id) {
        const targetName = world.cultivators[pendingChallenge.targetCultivatorId]?.name ?? "对方";
        actions.push({
          actionId: `await-pvp-challenge:${pendingChallenge.id}` as ActionId,
          label: `切磋待回应：${targetName}（还剩${remain}刻）`,
          description: `挑战书已经递给${targetName}。对方要在 ${remain} 刻内用 accept-pvp-challenge:${pendingChallenge.id} 应战，或用 reject-pvp-challenge:${pendingChallenge.id} 拒绝。过了这几刻，这场就会自己搁下。把这张卡提交给 act 不会再开一场，也不会取消。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
  }

  // ---- Social actions (搭讪 / 传音 / 道侣) ----
  {
    const socialWindowView = socialWindow(world, cultivator);
    if (socialWindowView.pageCount > 1) {
      actions.push({
        actionId: "cycle-social-page",
        label: "换一页同场的人",
        description: `搭讪和问候每次最多 ${SOCIAL_ACTION_LIMIT} 位。这一页没有的修士，换一页就能搭讪。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    // 搭讪: chat up someone at the same location (must be in safe zone)
    if (location.kind === "safe") {
      const chatTargets = socialActionTargets(world, cultivator)
        .filter((candidate) => !candidate.activeJobId);
      for (const chatTarget of chatTargets) {
        const existingLink = getSocialLink(world, cultivator.id, chatTarget.id);
        const onCooldown = existingLink?.lastChatUpTick !== undefined
          && world.tick - existingLink.lastChatUpTick < CHAT_UP_COOLDOWN_TICKS;
        const levelLabel = existingLink ? getAffinityLevel(existingLink.affinity) : "陌生人";
        const feud = grudgeArcOf(existingLink?.grudge ?? 0);
        const fellow = sameSectBond(cultivator, chatTarget);
        if (feud) {
          actions.push({
            actionId: `refuse-gift:${chatTarget.id}` as ActionId,
            label: `拒礼：${chatTarget.name}`,
            description: `${chatTarget.name}就在眼前，你们有${feud}，剑拔弩张。礼不必收，递过来也不会涨好感。这句话说出去，对方听得见。刚攀谈过也不影响拒礼。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
        if (!onCooldown) {
          actions.push({
            actionId: `chat-up:${chatTarget.id}` as ActionId,
            label: feud ? `攀谈：${chatTarget.name}（${feud}，剑拔弩张）` : fellow ? `攀谈：${chatTarget.name}（同门）` : `搭讪：${chatTarget.name}（${levelLabel}）`,
            description: feud
              ? `${chatTarget.name}和你有${feud}，见面剑拔弩张。这句话会很硬。不想给面子，就拒礼，或者再战。`
              : fellow
                ? `${chatTarget.name}是同门。话可以直说，赠礼也更顺。认识之后才能组队。`
                : `与${chatTarget.name}攀谈，增进好感度。认识之后才能组队，同一心跳里可以接着邀请。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
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
    const arcPeers = getCultivatorsAtLocation(world, cultivator.locationId, cultivator.id);
    for (const peer of arcPeers) {
      const link = getSocialLink(world, cultivator.id, peer.id);
      if (!link) continue;
      if (bondArcOf(link.affinity) === "知己" && !peer.activeJobId && !cultivator.activeJobId) {
        const sparReady = link.lastSparTeachTick === undefined || world.tick - link.lastSparTeachTick >= SPAR_TEACH_COOLDOWN_TICKS;
        const shareReady = link.lastShareTick === undefined || world.tick - link.lastShareTick >= SHARE_RESOURCE_COOLDOWN_TICKS;
        if (sparReady) {
          actions.push({
            actionId: `spar-teach:${peer.id}` as ActionId,
            label: `指点：${peer.name}`,
            description: `你们已是知己。带${peer.name}把一式走两遍，对方会更熟一点。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
        if (shareReady) {
          actions.push({
            actionId: `share-resource:${peer.id}` as ActionId,
            label: `分灵石：${peer.name}`,
            description: `分给${peer.name}八枚灵石。身上至少要留得起这一笔。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
      if (grudgeArcOf(link.grudge ?? 0) === "宿怨" && getCityDuelChallengeBlockReason(world, cultivator, peer) === null) {
        actions.push({
          actionId: `grudge-challenge:${peer.id}` as ActionId,
          label: `宿怨挑战：${peer.name}`,
          description: `嫌隙已成宿怨。公开向${peer.name}下挑战书。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
  }

  // ---- Party / Team actions (组队) ----
  {
    const party = getPartyOf(world, cultivator.id);
    if (party) {
      // Disband party
      actions.push({ actionId: "disband-party" as ActionId, label: "解散队伍", description: "解散当前队伍。", durationTicks: 0, kind: "immediate" });
      if (party.leaderId === cultivator.id) {
        const reserveId = party.reserveIds?.[0];
        const reserveName = reserveId ? world.cultivators[reserveId]?.name : null;
        for (const memberId of party.memberIds) {
          if (memberId === cultivator.id) continue;
          const memberName = world.cultivators[memberId]?.name ?? memberId;
          actions.push({
            actionId: `party-kick:${memberId}` as ActionId,
            label: `请离：${memberName}`,
            description: reserveName
              ? `把${memberName}请出队伍，${reserveName}补上这个位子。场上仍不超过五人。`
              : `把${memberName}请出队伍。场上仍不超过五人。`,
            durationTicks: 0,
            kind: "immediate",
          });
          if (reserveId && reserveName) {
            actions.push({
              actionId: `party-rotate:${memberId}` as ActionId,
              label: `轮换：${reserveName}换下${memberName}`,
              description: `${reserveName}上场，${memberName}改去候补。场上仍是五人。`,
              durationTicks: 0,
              kind: "immediate",
            });
          }
        }
      }
      for (const mate of getPartyMembers(world, cultivator.id)) {
        actions.push(
          {
            actionId: `send-message:${mate.id}:rendezvous-at-gate` as ActionId,
            label: `约到门口：${mate.name}`,
            description: `传话给${mate.name}，约在地宫门口会合。会带一句不一样的话。同一句隔几刻才能再传。`,
            durationTicks: 0,
            kind: "immediate",
          },
          {
            actionId: `send-message:${mate.id}:ready-to-enter` as ActionId,
            label: `可以下了：${mate.name}`,
            description: `告诉${mate.name}人已就绪，可以一起下地宫。不另开工。`,
            durationTicks: 0,
            kind: "immediate",
          },
          {
            actionId: `send-message:${mate.id}:wait` as ActionId,
            label: `先等一等：${mate.name}`,
            description: `让${mate.name}先别下，在原地等。`,
            durationTicks: 0,
            kind: "immediate",
          },
        );
        const sayId = `say:${mate.id}` as ActionId;
        if (!actions.some((action) => action.actionId === sayId)) {
          actions.push({
            actionId: sayId,
            label: `说话：${mate.name}`,
            description: `对同队的${mate.name}说一句，最多四十字。不另外写，就代说一句。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
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
    }
    if ((!party || party.memberIds.length < PARTY_MAX_MEMBERS) && location.kind === "safe") {
      const inviteCandidates = socialActionTargets(world, cultivator)
        .filter((c) => {
          if (c.activeJobId) return false;
          if (isInParty(world, c.id)) return false;
          const link = getSocialLink(world, cultivator.id, c.id);
          return link !== null && meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL);
        });
      for (const candidate of inviteCandidates) {
        const level = getAffinityLevel(getSocialLink(world, cultivator.id, candidate.id)!.affinity);
        actions.push({
          actionId: `party-invite:${candidate.id}` as ActionId,
          label: `组队邀请：${candidate.name}（${level}）`,
            description: `向${candidate.name}发送组队邀请。人可以先在城里结伴，到地宫门口再一起下。五人满员为止。`,
          durationTicks: 0,
          kind: "immediate",
        });
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

  // ---- Social Verbs (结构化消息 / 赠送 / 委托) ----
  {
    // send-message to nearby cultivators at same location
    const nearbyTargets = socialActionTargets(world, cultivator);
    for (const target of nearbyTargets) {
      for (const kind of ["greet", "share-info", "request-help"] as const) {
        actions.push({
          actionId: `send-message:${target.id}:${kind}` as ActionId,
          label: `发送消息（${SEND_MESSAGE_KIND_ZH[kind]}）：${target.name}`,
          description: kind === "greet"
            ? `向${target.name}问候。问候之后就认识了，可以接着组队。`
            : kind === "share-info"
              ? `向${target.name}分享见闻。`
              : `向${target.name}求援。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
      // gift-item: only if haven't gifted this tick
      if ((cultivator.lastGiftTick ?? -1) < world.tick) {
        const giftableItems = Object.entries(cultivator.inventory).filter(([, count]) => count > 0);
        for (const [itemId] of giftableItems.slice(0, 2)) {
          const itemName = itemDisplayName(itemId);
          const feud = grudgeArcOf(getSocialLink(world, cultivator.id, target.id)?.grudge ?? 0);
          const fellow = sameSectBond(cultivator, target);
          actions.push({
            actionId: `send-message:${target.id}:gift-item:${itemId}` as ActionId,
            label: `赠送${itemName}：${target.name}`,
            description: feud === "宿怨"
              ? `${target.name}和你是宿怨，见面剑拔弩张。${itemName}递过去也会被退回，东西还在你手里，好感不会涨。要说话就当面拒礼，或者再战。`
              : feud
                ? `${target.name}和你有嫌隙，见面剑拔弩张。${itemName}可以先放下，但好感不会涨。对方可以拒。`
              : fellow
                ? `把1个${itemName}递给同门${target.name}。同门之间，这份礼更顺。`
                : `将1个${itemName}赠予${target.name}，增进好感。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
      if (target.injuryTicksRemaining > 0) {
        actions.push({
          actionId: `tend-wound:${target.id}` as ActionId,
          label: `疗伤：${target.name}`,
          description: `帮${target.name}压伤。身上有疗伤丹就用一枚，没有就耗一点灵力。对方会欠一份人情。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
      const sayId = `say:${target.id}` as ActionId;
      if (!actions.some((action) => action.actionId === sayId)) {
        actions.push({
          actionId: sayId,
          label: `说话：${target.name}`,
          description: `对${target.name}说一句短话，最多四十字。不另外写，就代说一句，每次不一样。同一句不能连着说。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    for (const mate of getPartyMembers(world, cultivator.id)) {
      if (mate.id === cultivator.id || mate.locationId !== cultivator.locationId || mate.injuryTicksRemaining <= 0) continue;
      const tendId = `tend-wound:${mate.id}` as ActionId;
      if (actions.some((action) => action.actionId === tendId)) continue;
      actions.push({
        actionId: tendId,
        label: `疗伤：${mate.name}`,
        description: `帮${mate.name}压伤。身上有疗伤丹就用一枚，没有就耗一点灵力。对方会欠一份人情。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    // read-messages: available when there are unread messages addressed to this cultivator
    for (const pending of pendingDialogueOf(world, cultivator.id)) {
      actions.push({
        actionId: pending.replyActionId as ActionId,
        label: `回话：${pending.fromName}`,
        description: `${pending.fromName}说：「${pending.line}」回一句，最多四十字。来回两句就先停。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    const unreadMessages = (world.messages ?? []).filter((m) => m.toCultivatorId === cultivator.id);
    if (unreadMessages.length > 0) {
      actions.push({
        actionId: "read-messages" as ActionId,
        label: `阅读消息（${unreadMessages.length}条未读）`,
        description: "批量确认所有已收到的消息。",
        durationTicks: 0,
        kind: "immediate",
      });
    }
    for (const request of cultivator.pendingHelpRequests ?? []) {
      const fromName = world.cultivators[request.fromCultivatorId]?.name ?? "某人";
      actions.push({
        actionId: `answer-help:${request.fromCultivatorId}` as ActionId,
        label: `回应求助：${fromName}`,
        description: `帮${fromName}一把。有灵石就分出${HELP_STONE_GIFT}枚，没有就陪一段路。对方会欠一份人情。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    const myLinks = Object.values(world.socialLinks?.[cultivator.id] ?? {});
    if (location.kind === "safe") {
      actions.push({
        actionId: "post-board-note",
        label: "在告示上留话",
        description: "把最近的见闻贴在此地，后来的人能读到。",
        durationTicks: 0,
        kind: "immediate",
      });
      if (myLinks.some((link) => (link.favorBalance ?? 0) > 0)) {
        actions.push({
          actionId: "post-board-note:favor",
          label: "告示：谁还欠人情",
          description: "把还没还清的人情写在告示上，让后来的人看见。",
          durationTicks: 0,
          kind: "immediate",
        });
      }
      if (myLinks.some((link) => link.rival === true)) {
        actions.push({
          actionId: "post-board-note:rival",
          label: "告示：写下过节",
          description: "把宿敌的名字钉在告示上。",
          durationTicks: 0,
          kind: "immediate",
        });
      }
      if (cultivator.sectId) {
        actions.push({
          actionId: "post-board-note:sect",
          label: "告示：同门的话",
          description: "留一句点了同门名字的话。",
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    for (const link of myLinks) {
      const target = world.cultivators[link.targetCultivatorId];
      if (!target || target.locationId !== cultivator.locationId || target.id === cultivator.id) {
        continue;
      }
      if ((link.favorBalance ?? 0) > 0) {
        actions.push({
          actionId: `call-favor:${target.id}` as ActionId,
          label: `兑人情：${target.name}`,
          description: `${target.name}欠着人情。当面兑掉一份，能还的就还${FAVOR_CALL_STONES}枚灵石。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
      if (link.rival === true) {
        actions.push({
          actionId: `press-rival:${target.id}` as ActionId,
          label: `当众过节：${target.name}`,
          description: `与${target.name}当众压一手。不另开战局，过节会写进两边的游记。`,
          durationTicks: 0,
          kind: "immediate",
        });
      }
    }
    const giftGroups = new Map<string, NonNullable<Cultivator["pendingGifts"]>>();
    for (const gift of cultivator.pendingGifts ?? []) {
      const key = `${gift.fromCultivatorId}\0${gift.itemId}`;
      const group = giftGroups.get(key) ?? [];
      group.push(gift);
      giftGroups.set(key, group);
    }
    for (const group of giftGroups.values()) {
      const first = group[0]!;
      const fromName = world.cultivators[first.fromCultivatorId]?.name ?? "某人";
      const itemName = itemDisplayName(first.itemId);
      const total = group.reduce((sum, gift) => sum + gift.count, 0);
      if (group.length === 1) {
        actions.push(
          { actionId: `accept-gift:${first.messageId}` as ActionId, label: `收下${fromName}的${itemName}`, description: `收下${fromName}送来的${total}份${itemName}。`, durationTicks: 0, kind: "immediate" },
          { actionId: `reject-gift:${first.messageId}` as ActionId, label: `退回${fromName}的${itemName}`, description: `把${fromName}的${itemName}退回去。`, durationTicks: 0, kind: "immediate" },
        );
        continue;
      }
      actions.push(
        { actionId: `accept-gift-batch:${first.fromCultivatorId}:${first.itemId}` as ActionId, label: `收下${fromName}的${itemName}（${total}份）`, description: `${fromName}连着送来${group.length}次${itemName}，一共${total}份。这一张卡一次收下。原来的单份接受仍然有效。`, durationTicks: 0, kind: "immediate" },
        { actionId: `reject-gift-batch:${first.fromCultivatorId}:${first.itemId}` as ActionId, label: `退回${fromName}的${itemName}（${total}份）`, description: `把${fromName}送来的这${total}份${itemName}一起退回去。原来的单份拒绝仍然有效。`, durationTicks: 0, kind: "immediate" },
      );
    }
    // post-commission: at safe locations, post a gather/deliver commission
    if (location.kind === "safe") {
      for (const commType of ["gather", "deliver"] as const) {
        const commItems = Object.entries(cultivator.inventory).filter(([, count]) => count > 0).slice(0, 1);
        for (const [itemId] of commItems) {
          actions.push({
            actionId: `post-commission:${commType}:${itemId}` as ActionId,
            label: `发布委托（${commType === "gather" ? "采集" : "运送"}）：${itemDisplayName(itemId)}`,
            description: `在告示上请人${commType === "gather" ? "采集" : "运送"}${itemDisplayName(itemId)}。`,
            durationTicks: 0,
            kind: "immediate",
          });
        }
      }
    }
    // accept-commission: accept available commissions at same location
    const localCommissions = Object.values(world.commissions ?? {}).filter(
      (c) => c.locationId === cultivator.locationId && c.completedAtTick === null && c.acceptedById === null && c.posterId !== cultivator.id,
    );
    for (const commission of localCommissions.slice(0, 3)) {
      const owned = cultivator.inventory[commission.targetItemId] ?? 0;
      if (owned < commission.targetCount) {
        continue;
      }
      const posterName = facingPersonName(world.cultivators[commission.posterId]?.name ?? "某人");
      actions.push({
        actionId: `accept-commission:${commission.id}` as ActionId,
        label: `接受委托：${posterName}的${commission.type === "gather" ? "采集" : "运送"}任务`,
        description: `接受${posterName}发布的${itemDisplayName(commission.targetItemId)}${commission.type === "gather" ? "采集" : "运送"}，做完得${commission.rewardSpiritStones}灵石。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }

  appendSharedExpeditionActions(world, cultivator, actions);
  if (!getPartyOf(world, cultivator.id) && !findReserveParty(world, cultivator.id)) {
    for (const party of Object.values(world.parties ?? {})) {
      if (party.memberIds.length < PARTY_MAX_MEMBERS) continue;
      if ((party.reserveIds ?? []).length > 0) continue;
      const leader = world.cultivators[party.leaderId];
      if (!leader || leader.locationId !== cultivator.locationId) continue;
      const link = getSocialLink(world, cultivator.id, leader.id);
      if (!link || !meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL)) continue;
      actions.push({
        actionId: `queue-party-reserve:${leader.id}` as ActionId,
        label: `候补：${leader.name}的队伍`,
        description: `${leader.name}的队伍已满。排队候补，队长可以轮换你上场。场上仍是五人。`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (findReserveParty(world, cultivator.id)) {
    actions.push({
      actionId: "leave-party-reserve",
      label: "退出候补",
      description: "离开队伍的候补位。",
      durationTicks: 0,
      kind: "immediate",
    });
  }
  const standing = partyRoleForCultivator(cultivator);
  for (const roleId of legalPartyRoles(cultivator)) {
    actions.push({
      actionId: `set-party-role:${roleId}` as ActionId,
      label: `站位：${PARTY_ROLE_LABEL[roleId]}`,
      description: roleId === standing.id
        ? `当前站${PARTY_ROLE_LABEL[roleId]}。这套兵器和法器站得住这个位置。`
        : `改站${PARTY_ROLE_LABEL[roleId]}。只有这套搭配能出的位置可以选。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  const readyIds = new Set(cultivator.preferredSkillIds ?? []);
  const slotSkills = listResolvedSkills(skillContextOf(cultivator)).filter(
    (skill) => skill.id !== "basic-strike" && skill.roles.includes(standing.id),
  );
  for (const skill of slotSkills) {
    const equipped = readyIds.has(skill.id);
    const kind = skill.channel === "spell" ? "法术" : "兵器";
    const fit = skill.aptitude === "off"
      ? "这一式逆着你的偏向，装上也能用，威力会略收。"
      : skill.aptitude === "favored"
        ? "这一式顺着你的偏向。"
        : "这一式不吃偏向。";
    actions.push({
      actionId: `equip-skill-slot:${skill.id}` as ActionId,
      label: equipped ? `卸下：${skill.name}` : `装上：${skill.name}`,
      description: equipped
        ? `从随身的${SKILL_SLOT_LIMIT}个招位里卸下${skill.name}（${kind}）。`
        : `把${skill.name}（${kind}）放进随身招位。${fit}最多${SKILL_SLOT_LIMIT}式，寻常一击始终还在。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  if ((cultivator.preferredSkillIds ?? []).length > 0) {
    actions.push({
      actionId: "clear-skill-loadout",
      label: "清空随身招式",
      description: "不指定招位，战斗里改用当前站位能用的全部招。",
      durationTicks: 0,
      kind: "immediate",
    });
  }
  actions.push(...listSocialDeepenActions(world, cultivator));
  actions.push(...listSectLifeActions(world, cultivator));
  actions.unshift(...sceneChoiceActions(world, cultivator));

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

function requireIdle(cultivator: Cultivator) {
  if (cultivator.activeJobId) {
    throw new GameplayRejection("你正忙着，手头的事还没做完。等这一趟结束再来。地宫还在走的话，用 abort-dungeon-expedition 结账，人会回到安全的地方。");
  }
}
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
  const allowed = new Set<ActionId>(["meditate", "heal", "residence-breakthrough", "residence-heal", "residence-recover-qi", "residence-heal:use-pill", "residence-heal:no-pill", "residence-recover-qi:use-pill", "residence-recover-qi:no-pill", "use-healing-pill", "use-qi-pill", "use-ward-talisman", "buy-healing-pill", "buy-qi-pill", "buy-ward-talisman", "buy-current-breakthrough-material", "buy-next-weapon", "buy-next-manual", "exchange-sect-weapon", "exchange-sect-manual", "sell-spirit-ore", "sell-ruin-fragment", "sell-beast-core", "take-neutral-duty", "leave-neutral-sect", "withdraw-from-wilderness", "retreat-from-bahuang"]);
  if (
    actionId === "core-rite:steady"
    || actionId === "core-rite:press"
    || actionId === "infant-fire-temper"
    || actionId === "refine-nascent"
    || actionId === "begin-soul-vigil"
    || actionId === "seal-soul-vigil"
    || actionId === "face-tribulation"
    || actionId === "begin-divine-step"
    || actionId === "seal-divine-step"
    || actionId === "hold-divine-platform"
    || aboveRiteForAction(actionId)
  ) return;
  if (actionId.startsWith("travel-to:")) return;
  if (actionId.startsWith("join-neutral-sect:")) return;
  if (actionId.startsWith("residence-produce:")) return;
  if (actionId.startsWith("chat-up:")) return;
  if (actionId.startsWith("take-post:")) return;
  if (actionId === "resign-post") return;
  if (actionId.startsWith("refuse-gift:")) return;
  if (actionId.startsWith("await-pvp-challenge:")) return;
  if (actionId === "post-duty") return;
  if (actionId.startsWith("gather-vein:")) return;
  if (actionId.startsWith("sect-chain:recruit-chore")) return;
  if (actionId.startsWith("voice-transmit:")) return;
  if (actionId.startsWith("propose-dao-companion:")) return;
  if (actionId.startsWith("accept-dao-companion:")) return;
  if (actionId.startsWith("reject-dao-companion:")) return;
  if (actionId.startsWith("party-invite:")) return;
  if (actionId.endsWith(":rendezvous-at-gate") || actionId.endsWith(":ready-to-enter") || actionId.endsWith(":wait")) return;
  if (actionId.startsWith("accept-party:")) return;
  if (actionId.startsWith("reject-party:")) return;
  if (actionId === "disband-party") return;
  if (actionId.startsWith("party-kick:")) return;
  if (actionId.startsWith("party-rotate:")) return;
  if (actionId.startsWith("queue-party-reserve:")) return;
  if (actionId === "leave-party-reserve") return;
  if (actionId === "leave-shared-expedition") return;
  if (actionId.startsWith("tend-wound:")) return;
  if (actionId.startsWith("accept-gift:") || actionId.startsWith("accept-gift-batch:")) return;
  if (actionId.startsWith("reject-gift:") || actionId.startsWith("reject-gift-batch:")) return;
  if (actionId.startsWith("say:")) return;
  if (actionId.startsWith("reply-line:")) return;
  if (actionId.startsWith("ask-favor:")) return;
  if (actionId.startsWith("accept-favor:")) return;
  if (actionId.startsWith("decline-favor:")) return;
  if (actionId.startsWith("fulfill-favor:")) return;
  if (actionId.startsWith("abandon-favor:")) return;
  if (actionId.startsWith("leave-note:")) return;
  if (actionId.startsWith("read-note:")) return;
  if (actionId.startsWith("reply-note:")) return;
  if (actionId === "leave-spot-note" || actionId.startsWith("reply-spot-note:")) return;
  if (actionId === "post-sect-notice" || actionId.startsWith("reply-sect-notice:")) return;
  if (actionId.startsWith("join-sect-task:")) return;
  if (actionId.startsWith("guide-junior:")) return;
  if (actionId.startsWith("mention-gossip:")) return;
  if (actionId.startsWith("wait-for:")) return;
  if (actionId.startsWith("spar-teach:")) return;
  if (actionId.startsWith("share-resource:")) return;
  if (actionId.startsWith("set-party-role:")) return;
  if (actionId.startsWith("equip-skill-slot:")) return;
  if (actionId === "clear-skill-loadout") return;
  if (actionId === "cycle-social-page") return;
  if (actionId.startsWith("buy-residence:")) return;
  if (actionId === "upgrade-residence") return;
  if (actionId.startsWith("place-fixture:")) return;
  if (actionId.startsWith("clear-fixture:")) return;
  if (actionId.startsWith("host-guest:")) return;
  if (actionId.startsWith("display-relic:") || actionId === "clear-displayed-relic") return;
  // Allow low-risk sect tasks (resource tribute) while injured
  const injuredSectTask = parseSectTaskId(actionId);
  if (injuredSectTask) {
    const tpl = getSectTaskById(injuredSectTask);
    if (tpl && (tpl.riskLevel === "none" || tpl.riskLevel === "low")) return;
  }
  if (!allowed.has(actionId)) throw new Error("身上有伤，这一手做不了。先养伤、赶路，或做坊市里的稳妥事。");
}
function startJob(
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
  label: string,
  meta?: ActionJob["meta"],
  durationTicks?: number,
): ActionExecutionResult {
  const shown = shownJobLabel(actionId, label);
  const job = createJob(world, cultivator.id, actionId, shown);
  if (typeof durationTicks === "number" && Number.isFinite(durationTicks) && durationTicks > 0) {
    job.remainingTicks = durationTicks;
    job.totalTicks = durationTicks;
  }
  if (meta) {
    job.meta = meta;
  }
  cultivator.activeJobId = job.id;
  world.jobs[job.id] = job;
  const summary = shown.startsWith("前往")
    ? `${cultivator.name}动身${shown}。`
    : `${cultivator.name}开始${shown}。`;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary, job };
}
function marketSell(world: WorldState, cultivator: Cultivator, itemId: ItemId, base: number, actionId: ActionId): ActionExecutionResult {
  const location = world.locations[cultivator.locationId];
  if (!location || !canTradeAtLocation(location)) throw new Error("You must be in a trading safe settlement."); if (cultivator.inventory[itemId] <= 0) throw new Error(`Item not available: ${itemId}`);
  const income = sellPrice(cultivator, base); cultivator.inventory[itemId] -= 1; cultivator.spiritStones += income;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}卖出一份${itemDisplayName(itemId)}，换了${income}灵石。` };
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
    addResourceGainLog(world, cultivator.id, "坊市购买", `${cultivator.name}在坊市购入了1个${ITEM_CATALOG[firstMissing.itemId]?.name ?? firstMissing.itemId}，花费${price}灵石。`, ["market", "buy"], [{ itemId: firstMissing.itemId, count: 1 }]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}买了一份${itemDisplayName(firstMissing.itemId)}，花了${price}灵石。`,
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
    addResourceGainLog(world, cultivator.id, "坊市购买", `${cultivator.name}在坊市购入了1个${ITEM_CATALOG[binding.itemId]?.name ?? binding.itemId}，花费${price}灵石。`, ["market", "buy"], [{ itemId: binding.itemId, count: 1 }]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}买了一份${itemDisplayName(binding.itemId)}，花了${price}灵石。`,
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
  const injuryBeforeUse = cultivator.injuryTicksRemaining;
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
  if (binding.itemId === "healing-pill" && cultivator.injuryTicksRemaining < injuryBeforeUse) {
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "injury",
      title: "服下疗伤丹",
      detail: `${cultivator.name}服下疗伤丹，伤势从${injuryBeforeUse}刻压到${cultivator.injuryTicksRemaining}刻。`,
      locationId: cultivator.locationId,
      mood: cultivator.injuryTicksRemaining > 0 ? "伤轻了，还没好全" : "伤压下去了",
    }));
  }
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary: binding.operation === "study"
      ? `${cultivator.name}研读了${itemDisplayName(binding.itemId)}。`
      : binding.itemId === "ward-talisman"
        ? `${cultivator.name}使用了${itemDisplayName(binding.itemId)}。获得护体，持续六刻。`
      : (binding.itemId === "healing-pill" || binding.itemId === "qi-pill")
        ? `${cultivator.name}服用了${itemDisplayName(binding.itemId)}。`
        : `${cultivator.name}使用了${itemDisplayName(binding.itemId)}。`,
  };
}
const parseEquipWeaponLoadoutId = (actionId: ActionId): WeaponLoadoutId | null =>
  actionId.startsWith("equip-weapon:") ? actionId.slice("equip-weapon:".length) as WeaponLoadoutId : null;
const parseEquipSpellLoadoutId = (actionId: ActionId): SpellLoadoutId | null =>
  actionId.startsWith("equip-spell:") ? actionId.slice("equip-spell:".length) as SpellLoadoutId : null;
const parseUnlockLoadoutItemId = (actionId: ActionId): ItemId | null =>
  actionId.startsWith("unlock-loadout:") ? actionId.slice("unlock-loadout:".length) as ItemId : null;

const ACT_SUMMARY_CAP = 80;

function summaryWithSpokenLine(lead: string, spoken: string, tail = ""): string {
  const head = `${lead}：「`;
  const foot = `」${tail}`;
  const room = ACT_SUMMARY_CAP - Array.from(head).length - Array.from(foot).length;
  const spokenChars = Array.from(spoken);
  const shown = room >= spokenChars.length
    ? spoken
    : `${spokenChars.slice(0, Math.max(1, room - 1)).join("")}…`;
  return `${head}${shown}${foot}`;
}

function immediateAction(world: WorldState, cultivator: Cultivator, actionId: ActionId, speechLine?: string | null, bodyItemId?: string | null): ActionExecutionResult {
  const sectSummary = performSectImmediate(world, cultivator, actionId);
  if (sectSummary) {
    addDaoLog(world, cultivator.id, "宗门职位", sectSummary, ["sect", "sect-life"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: sectSummary };
  }
  if (actionId.startsWith("refuse-gift:")) {
    const otherId = actionId.slice("refuse-gift:".length);
    const other = getCultivatorOrThrow(world, otherId);
    if (other.locationId !== cultivator.locationId) throw new GameplayRejection("拒礼要当面。人现在不在一处。");
    const feud = grudgeArcOf(getSocialLink(world, cultivator.id, other.id)?.grudge ?? 0);
    if (!feud) throw new GameplayRejection(`${other.name}和你还没有嫌隙。礼若是不想收，等对方递过来再拒。`);
    const pending = (cultivator.pendingGifts ?? []).filter((gift) => gift.fromCultivatorId === other.id);
    for (const gift of pending) {
      other.inventory[gift.itemId] = (other.inventory[gift.itemId] ?? 0) + gift.count;
    }
    if (pending.length > 0) {
      cultivator.pendingGifts = (cultivator.pendingGifts ?? []).filter((gift) => gift.fromCultivatorId !== other.id);
      addMutualGrudge(world, cultivator.id, other.id, GRUDGE_FROM_REJECTION);
    }
    const line = "东西我不要。上次那一架还没算完。";
    const detail = `${cultivator.name}当着${other.name}的面把礼拒了：「${line}」两个人剑拔弩张。`;
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: detail, names: [other.name] });
    recordLife(other, { tick: world.tick, kind: "relationship", text: detail, names: [cultivator.name] });
    addDaoLog(world, cultivator.id, "拒礼", detail, ["social", "feud"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: detail };
  }
  const registration = registrationModifiersOf(cultivator);
  if (
    actionId === "buy-next-weapon"
    || actionId === "buy-next-manual"
    || actionId === "exchange-sect-weapon"
    || actionId === "exchange-sect-manual"
  ) {
    const location = world.locations[cultivator.locationId];
    const kind = actionId.endsWith("weapon") ? "weapon" as const : "spell" as const;
    const path = actionId.startsWith("exchange-") ? "sect" as const : "shop" as const;
    if (path === "shop") {
      if (!location || !canTradeAtLocation(location)) throw new Error("得在坊市才能买下一阶。");
    } else if (!location || location.kind !== "safe") {
      throw new Error("得在安全的地方才能用宗门换。");
    }
    const bought = purchaseNextGear(cultivator, kind, path);
    addDaoLog(world, cultivator.id, path === "shop" ? "坊市取物" : "宗门换物", bought.summary, ["combat-content", path, kind]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: bought.summary,
    };
  }

  // ---- Equip weapon loadout ----
  const equipWeaponId = parseEquipWeaponLoadoutId(actionId);
  if (equipWeaponId) {
    const def = getWeaponLoadoutDefinition(equipWeaponId);
    if (!def) throw new Error(`Unknown weapon loadout: ${equipWeaponId}`);
    if (!tierAllowed(cultivator.realmLevel, def.weaponTier ?? 1)) {
      throw new Error(`要到${bandForTier(def.weaponTier ?? 1).realm}才能装备${def.name}。`);
    }
    equipWeapon(cultivator, equipWeaponId);
    const equipped = `${cultivator.name}换上了${def.name}。`;
    addDaoLog(world, cultivator.id, "装配切换", equipped, ["combat-loadout", "equip-weapon"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: equipped,
    };
  }

  // ---- Equip spell loadout ----
  const equipSpellId = parseEquipSpellLoadoutId(actionId);
  if (equipSpellId) {
    const def = getSpellLoadoutDefinition(equipSpellId);
    if (!def) throw new Error(`Unknown spell loadout: ${equipSpellId}`);
    if (!tierAllowed(cultivator.realmLevel, def.spellTier ?? 1)) {
      throw new Error(`要到${bandForTier(def.spellTier ?? 1).realm}才能装备${def.name}。`);
    }
    equipSpell(cultivator, equipSpellId);
    const equipped = `${cultivator.name}换上了${def.name}。`;
    addDaoLog(world, cultivator.id, "装配切换", equipped, ["combat-loadout", "equip-spell"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: equipped,
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
        summary: `${cultivator.name}学会了${getWeaponLoadoutDefinition(wLoadoutId)?.name ?? "这套兵器"}，还没有换上。`,
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
        summary: `${cultivator.name}学会了${getSpellLoadoutDefinition(sLoadoutId)?.name ?? "这套法术"}，还没有换上。`,
      };
    }
    throw new Error(`Item ${unlockItemId} does not grant any loadout.`);
  }

  const wildernessLayerId = parseEnterWildernessLayer(actionId);
  const bahuangStrategy = parseEnterBahuangStrategy(actionId);
  if (wildernessLayerId) {
    enterWildernessExpedition(world, cultivator, wildernessLayerId);
    const placeName = wildPlaceForState(world.locations[cultivator.locationId]?.stateId)?.name
      ?? getWildernessLayerById(world, wildernessLayerId)?.name
      ?? "这一层荒野";
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}走进了${placeName}。`,
    };
  }
  if (bahuangStrategy) {
    enterBahuangExpedition(world, cultivator, bahuangStrategy);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}进了八荒，姿态是${dungeonPostureLabel(bahuangStrategy)}。`,
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
  if (actionId === "open-player-sect-recruitment") {
    const here = world.locations[cultivator.locationId];
    const playerSectName = here?.organizationType === "player-sect" && here.organizationId
      ? world.sects[here.organizationId]?.name
      : null;
    const where = playerSectName ? `${playerSectName}是玩家自建的宗门。` : "这是玩家自建的宗门。";
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: `${where}这张卡不会入门。想进去，到据点或本州主城报名。`,
    };
  }
  if (actionId === "resolve-morality-event-choice") {
    const pending = getPendingMoralityChoice(world, cultivator.id).choice;
    const detail = pending
      ? `「${pending.title}」的 choiceId 是 ${pending.choiceId}。选项：${pending.options.map((option) => `${option.label}（${option.id}）`).join("，")}。`
      : "眼前没有待选的道心岔路。";
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: `这张卡不能提交给 /agent/act。${detail}请改走 POST /agent/events/choose。`,
    };
  }
  if (actionId === "open-player-sect-founding" || actionId === "review-player-sect-applications") {
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: "这张卡交上去不会创办宗门，也不会审申请。",
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
    const joined = `${cultivator.name}入了${neutralSect.name}。`;
    addMessage(world, cultivator.id, neutralSect.name, "入门", joined);
    addDaoLog(world, cultivator.id, "入门", joined, ["neutral-sect", "join-neutral-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: joined };
  }
  if (actionId === "leave-neutral-sect") {
    const neutralSect = getCultivatorNeutralSect(world, cultivator);
    if (!neutralSect) throw new Error("Cultivator is not in a neutral sect.");
    if (cultivator.locationId !== neutralSect.headquarters) throw new Error("Leaving a neutral sect requires returning to its headquarters.");
    neutralSect.memberIds = neutralSect.memberIds.filter((memberId) => memberId !== cultivator.id);
    cultivator.neutralSectId = null;
    cultivator.neutralContribution = 0;
    clearSectPost(cultivator);
    const left = `${cultivator.name}离开了${neutralSect.name}。`;
    addDaoLog(world, cultivator.id, "离宗", left, ["neutral-sect", "leave-neutral-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: left };
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
    const joined = `${cultivator.name}入了${sect.name}。`;
    addMessage(world, cultivator.id, sect.name, "入门", joined);
    addDaoLog(world, cultivator.id, "入门", joined, ["sect", "join-sect", "sect-join-log"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: joined };
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

  // ---- Bahuang: Wake Decision ----
  const wakeDecisionOptionId = parseBahuangWakeDecision(actionId);
  if (wakeDecisionOptionId) {
    const summary = resolveBahuangWakeDecision(world, cultivator, wakeDecisionOptionId);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }

  // ---- PVP: Challenge a cultivator ----
  if (actionId.startsWith("challenge-cultivator:")) {
    const targetId = actionId.slice("challenge-cultivator:".length);
    const target = world.cultivators[targetId];
    const blockReason = getCityDuelChallengeBlockReason(world, cultivator, target);
    if (blockReason) throw new Error(blockReason);

    const challengeId = `pvp-challenge-${world.nextPvpChallengeSequence++}`;
    const challenge: PendingPvpChallenge = {
      id: challengeId,
      challengerCultivatorId: cultivator.id,
      targetCultivatorId: targetId,
      createdAtTick: world.tick,
      expiresAtTick: world.tick + CITY_DUEL_REPLY_TICKS,
      locationId: cultivator.locationId,
    };
    publishCityDuel(world, challenge, cultivator, target);
    addMessage(world, targetId, "切磋挑战", "挑战书", `${cultivator.name}向你发起了切磋挑战，请在${CITY_DUEL_REPLY_TICKS}刻内回复。`, { fromCultivatorId: cultivator.id });
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
      addMutualGrudge(world, cultivator.id, challenger.id, GRUDGE_FROM_REJECTION);
      shiftCultivatorMood(world, challenger, "rejection", `${cultivator.name}拒绝了这场切磋，挑战书像被当面按下。`);
      shiftCultivatorMood(world, cultivator, "rejection", `拒绝了${challenger.name}的切磋，场上安静了一下。`);
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rejected the duel challenge.` };
  }

  // ---- PVP: Accept challenge → start combat ----
  if (actionId.startsWith("accept-pvp-challenge:")) {
    const challengeId = actionId.slice("accept-pvp-challenge:".length);
    const challenge = world.pendingPvpChallenges[challengeId];
    if (!challenge) throw new Error("Challenge not found or already expired.");
    if (challenge.targetCultivatorId !== cultivator.id) throw new Error("Only the challenged cultivator can accept.");
    const invalidReason = getPendingPvpChallengeInvalidReason(world, challenge);
    if (invalidReason === "expired") {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error("Challenge has expired.");
    }
    if (invalidReason === "challenger-left-area" || invalidReason === "target-left-area") {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error("Both duelists must remain at the original challenge location.");
    }
    const challenger = world.cultivators[challenge.challengerCultivatorId];
    if (!challenger) throw new Error("Challenger no longer exists.");
    if (challenger.activeJobId) {
      delete world.pendingPvpChallenges[challengeId];
      cultivator.pendingPvpChallengeId = null;
      throw new Error(`${challenger.name}正忙着，这场切磋先作罢。`);
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
    combatState.initialEnemySnapshot = structuredClone(opponentSnapshot);
    combatState.enemyStatusEffectsBefore = structuredClone(cultivator.statusEffects);
    combatState.pvpTargetCultivatorId = cultivator.id;
    combatState.pvpBattleKind = "city-duel";
    const result = startJob(world, challenger, "pvp-duel", "切磋对决");
    if (result.job) {
      setCombatJobState(result.job, combatState);
    }
    addMessage(world, cultivator.id, "切磋开始", "挑战已接受", `你接受了${challenger.name}的切磋挑战，战斗即将开始。`);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} accepted the duel. Combat started for ${challenger.name}.`, job: result.job };
  }

  if (actionId.startsWith("await-pvp-challenge:")) {
    const challengeId = actionId.slice("await-pvp-challenge:".length);
    const challenge = world.pendingPvpChallenges[challengeId];
    if (!challenge || challenge.challengerCultivatorId !== cultivator.id) {
      throw new GameplayRejection("这张挑战书已经不在你手里。");
    }
    const remain = Math.max(0, challenge.expiresAtTick - world.tick);
    const targetName = world.cultivators[challenge.targetCultivatorId]?.name ?? "对方";
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: `挑战书还在${targetName}手里，还剩 ${remain} 刻，没有取消。等对方用 accept-pvp-challenge:${challengeId} 应战。把这张卡再提交一次也不会开战。`,
    };
  }

  // ---- Social: 搭讪 (Chat Up) ----
  const chatUpTargetId = parseChatUpTarget(actionId);
  if (chatUpTargetId) {
    const target = getCultivatorOrThrow(world, chatUpTargetId);
    if (cultivator.locationId !== target.locationId) throw new Error("搭讪 requires being at the same location.");
    if (cultivator.id === target.id) throw new Error("Cannot chat up yourself.");
    const existingLink = getSocialLink(world, cultivator.id, target.id);
    if (existingLink?.lastChatUpTick !== undefined && world.tick - existingLink.lastChatUpTick < CHAT_UP_COOLDOWN_TICKS) {
      const wait = CHAT_UP_COOLDOWN_TICKS - (world.tick - existingLink.lastChatUpTick);
      throw new GameplayRejection(`刚与${target.name}说过话，再过 ${wait} 刻。同一句话重复多了，情分涨得很慢。`);
    }
    const previousLevel = existingLink ? getAffinityLevel(existingLink.affinity) : null;
    const feud = grudgeArcOf(existingLink?.grudge ?? 0);
    const spoken = openSpokenLine(world, cultivator.id, target.id, "chat-up", world.tick, speechLine);
    const chatGain = feud ? 0 : (sameSectBond(cultivator, target) ? AFFINITY_GAINS.chatUp + 4 : AFFINITY_GAINS.chatUp);
    const linkAB = chatGain > 0
      ? addMutualAffinity(world, cultivator.id, target.id, chatGain).linkAB
      : (getSocialLink(world, cultivator.id, target.id) ?? existingLink);
    if (!linkAB) throw new GameplayRejection("这句没送出去。");
    if (feud) {
      const place = world.locations[cultivator.locationId]?.name ?? "这里";
      const tense = `${cultivator.name}和${target.name}在${place}碰了面。话没热，剑拔弩张。`;
      recordLife(cultivator, { tick: world.tick, kind: "relationship", text: tense, names: [target.name] });
      recordLife(target, { tick: world.tick, kind: "relationship", text: tense, names: [cultivator.name] });
    }
    const current = getSocialLink(world, cultivator.id, target.id) ?? linkAB;
    writeSocialLink(world, cultivator.id, { ...current, lastChatUpTick: world.tick });
    const reverse = getSocialLink(world, target.id, cultivator.id);
    if (reverse) {
      writeSocialLink(world, target.id, { ...reverse, lastChatUpTick: world.tick });
    }
    const level = getAffinityLevel(linkAB.affinity);
    addDaoLog(world, cultivator.id, "搭讪", `${cultivator.name}与${target.name}攀谈，好感度上升至${linkAB.affinity}（${level}）。`, ["social", "chat-up"]);
    const chatPlace = world.locations[cultivator.locationId]?.name ?? "城里";
    addMessage(world, target.id, cultivator.name, "有人搭讪", `${cultivator.name}在${chatPlace}向你搭话：「${spoken}」`, { fromCultivatorId: cultivator.id, spokenLine: spoken });
    const chatClause = relationClause(getSocialLink(world, cultivator.id, target.id), target.name, previousLevel);
    const chatDetail = `${cultivator.name}在${chatPlace}跟${target.name}攀谈，说到：「${spoken}」关系到了${level}。${chatClause}`;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `与${target.name}说上了话`,
      detail: chatDetail,
      locationId: cultivator.locationId,
      mood: level === "认识" ? "多了一个能说话的人" : "这人渐渐熟了",
    }));
    const heard = relationClause(getSocialLink(world, target.id, cultivator.id), cultivator.name, previousLevel);
    pushTravelNote(target, travelNote({
      tick: world.tick,
      kind: "person",
      title: `${cultivator.name}过来攀谈`,
      detail: `${cultivator.name}在${chatPlace}跟${target.name}说：「${spoken}」关系到了${level}。${heard}`,
      locationId: target.locationId,
      mood: "有人找上门说话",
    }));
    shareMoment(
      world,
      [cultivator, target],
      `${cultivator.name}过来攀谈`,
      chatDetail,
      `${cultivator.name}说：「${spoken}」`,
      "spoken",
    );
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: summaryWithSpokenLine(`${cultivator.name}和${target.name}搭了话`, spoken, "。") };
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
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}向${target.name}传了一音。好感至${linkAB.affinity}（${level}）。` };
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
    addMutualGrudge(world, cultivator.id, proposal.fromCultivatorId, GRUDGE_FROM_REJECTION);
    const proposer = world.cultivators[proposal.fromCultivatorId];
    if (proposer) shiftCultivatorMood(world, proposer, "rejection", `${cultivator.name}婉拒了道侣之约，这句话会在心里停一阵。`);
    shiftCultivatorMood(world, cultivator, "rejection", `婉拒了${proposerName}的道侣之约，话说完，场上也静了。`);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rejected dao companionship with ${proposerName}.` };
  }

  // ---- Social page: show the next unbound agents ----
  if (actionId === "cycle-social-page") {
    const window = socialWindow(world, cultivator);
    if (window.pageCount <= 1) {
      throw new GameplayRejection("这一页已经是全部能搭讪的人。");
    }
    cultivator.socialPageOffset = (cultivator.socialPageOffset ?? 0) + 1;
    const next = socialWindow(world, cultivator);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} turned the social page to ${next.page + 1}/${next.pageCount}.`,
    };
  }

  // ---- Party: 组队邀请 (Party Invite) ----
  const partyInviteTargetId = parsePartyInviteTarget(actionId);
  if (partyInviteTargetId) {
    const target = getCultivatorOrThrow(world, partyInviteTargetId);
    if (cultivator.id === target.id) throw new Error("Cannot invite yourself to a party.");
    if (cultivator.locationId !== target.locationId) throw new Error("组队邀请 requires being at the same location.");
    const ownParty = getPartyOf(world, cultivator.id);
    if (ownParty && ownParty.memberIds.length >= PARTY_MAX_MEMBERS) {
      throw new GameplayRejection("队伍已满，五人就是上限。这一趟带不了第六个人。");
    }
    if (isInParty(world, target.id)) throw new Error("Target is already in a party.");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || !meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL)) {
      throw new GameplayRejection(`还没认识${target.name}。先搭讪或问候一声，认识了才能组队。同一心跳里可以先搭讪再邀请。`);
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
    const invitePlace = world.locations[cultivator.locationId]?.name ?? "这里";
    addMessage(world, target.id, "组队邀请", `${cultivator.name}的邀请`, `${cultivator.name}向你发送了组队邀请。人可以先在${invitePlace}结伴，到地宫门口再一起下。五人满员为止。请及时回复。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "组队邀请", `${cultivator.name}向${target.name}发送了组队邀请。`, ["social", "party"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}向${target.name}发出了组队邀请。` };
  }

  // ---- Party: 接受组队 (Accept Party) ----
  const acceptPartyInvId = parseAcceptParty(actionId);
  if (acceptPartyInvId) {
    const invitation = (world.partyInvitations ?? {})[acceptPartyInvId];
    if (!invitation) throw new Error("Party invitation not found or expired.");
    if (invitation.toCultivatorId !== cultivator.id) throw new Error("Only the invited cultivator can accept.");
    if (world.tick >= invitation.expiresAtTick) throw new Error("Party invitation has expired.");
    if (isInParty(world, cultivator.id)) throw new Error("You are already in a party.");
    if (!world.parties) (world as unknown as Record<string, unknown>).parties = {};
    if (typeof world.nextPartySequence !== "number") (world as unknown as Record<string, unknown>).nextPartySequence = 1;
    const existingParty = getPartyOf(world, invitation.fromCultivatorId);
    if (existingParty) {
      if (existingParty.memberIds.length >= PARTY_MAX_MEMBERS) {
        throw new GameplayRejection("队伍已满，五人就是上限。这一趟带不了第六个人。");
      }
      const waitingElsewhere = findReserveParty(world, cultivator.id);
      if (waitingElsewhere && waitingElsewhere.id !== existingParty.id) {
        throw new GameplayRejection("你正在另一支队伍候补。先退出候补。");
      }
      world.parties[existingParty.id] = {
        ...existingParty,
        memberIds: [...existingParty.memberIds, cultivator.id],
        reserveIds: (existingParty.reserveIds ?? []).filter((id) => id !== cultivator.id),
      };
    } else {
      const partyId = `party-${world.nextPartySequence++}`;
      world.parties[partyId] = {
        id: partyId,
        memberIds: [invitation.fromCultivatorId, cultivator.id],
        leaderId: invitation.fromCultivatorId,
        formedAtTick: world.tick,
      };
    }
    delete world.partyInvitations[acceptPartyInvId];
    const leader = world.cultivators[invitation.fromCultivatorId];
    const leaderName = leader?.name ?? "unknown";
    addMessage(world, invitation.fromCultivatorId, "组队", "组队成功", `${cultivator.name}接受了你的组队邀请。`);
    addDaoLog(world, cultivator.id, "组队成功", `${cultivator.name}与${leaderName}组成了队伍。`, ["social", "party"]);
    addDaoLog(world, invitation.fromCultivatorId, "组队成功", `${leaderName}与${cultivator.name}组成了队伍。`, ["social", "party"]);
    const sameSect = Boolean(leader?.sectId && leader.sectId === cultivator.sectId);
    const acceptPlace = world.locations[cultivator.locationId];
    const acceptInDungeon = Boolean(acceptPlace && dungeonMetadataOf(acceptPlace));
    const meetLine = acceptInDungeon
      ? "人已经在地宫门口。闲着就会一起下，不另开工。"
      : "人还在城里。到了地宫门口、大家都闲着，才会一起下，不另开工。";
    const partyDetail = sameSect
      ? `${cultivator.name}与${leaderName}同门结伴，路上有人照应。${meetLine}`
      : `${cultivator.name}与${leaderName}把名字写在同一张路上。${meetLine}`;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `与${leaderName}结伴`,
      detail: partyDetail,
      locationId: cultivator.locationId,
      mood: sameSect ? "同门在身边" : "路上不剩自己一个",
    }));
    if (leader) {
      pushTravelNote(leader, travelNote({
        tick: world.tick,
        kind: "person",
        title: `与${cultivator.name}结伴`,
        detail: partyDetail,
        locationId: leader.locationId,
        mood: sameSect ? "同门在身边" : "路上不剩自己一个",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}加入了${leaderName}的队伍。` };
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
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}拒绝了${inviterName}的组队邀请。` };
  }

  // ---- Party: 解散队伍 (Disband Party) ----
  if (actionId === "disband-party") {
    const party = disbandParty(world, cultivator.id);
    if (!party) throw new Error("You are not in a party.");
    const others = party.memberIds.filter((memberId) => memberId !== cultivator.id);
    const otherNames = others.map((memberId) => world.cultivators[memberId]?.name ?? "unknown").join("、");
    for (const memberId of others) {
      addMessage(world, memberId, "组队", "队伍解散", `${cultivator.name}解散了队伍。`);
      addDaoLog(world, memberId, "队伍解散", `${cultivator.name}解散了队伍。`, ["social", "party"]);
    }
    addDaoLog(world, cultivator.id, "队伍解散", `${cultivator.name}解散了与${otherNames}的队伍。`, ["social", "party"]);
    for (const reserveId of party.reserveIds ?? []) {
      addMessage(world, reserveId, "组队", "队伍解散", `${cultivator.name}解散了队伍，候补也取消了。`);
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}解散了队伍。` };
  }

  if (actionId.startsWith("party-kick:")) {
    const memberId = actionId.slice("party-kick:".length);
    const party = getPartyOf(world, cultivator.id);
    if (!party || party.leaderId !== cultivator.id) throw new GameplayRejection("只有队长能请人离队。");
    if (memberId === cultivator.id) throw new GameplayRejection("队长不能把自己请走。要散伙就解散队伍。");
    if (!party.memberIds.includes(memberId)) throw new GameplayRejection("这个人不在队伍里。");
    const reserveId = party.reserveIds?.[0];
    const reserve = reserveId ? world.cultivators[reserveId] : null;
    const nextMembers = reserve
      ? party.memberIds.map((id) => id === memberId ? reserve.id : id)
      : party.memberIds.filter((id) => id !== memberId);
    const kicked = world.cultivators[memberId];
    if (nextMembers.length <= 1 && !reserve) {
      delete world.parties[party.id];
    } else {
      world.parties[party.id] = { ...party, memberIds: nextMembers, reserveIds: reserve ? [] : party.reserveIds };
    }
    if (kicked) {
      const kickedDetail = reserve
        ? `${cultivator.name}请${kicked.name}离队，${reserve.name}补上了这个位子。`
        : `${cultivator.name}请你离开了队伍。`;
      addMessage(world, kicked.id, "组队", "离开了队伍", kickedDetail);
      pushTravelNote(kicked, travelNote({
        tick: world.tick,
        kind: "person",
        title: `离开了${cultivator.name}的队伍`,
        detail: reserve
          ? `${cultivator.name}请${kicked.name}离队，${reserve.name}补上了这个位子。场上的人仍然不超过五个。`
          : `${cultivator.name}请${kicked.name}离队。场上的人仍然不超过五个。`,
        locationId: kicked.locationId,
        mood: "位子空出来了",
      }));
    }
    if (reserve) {
      addMessage(world, reserve.id, "组队", "候补上场", `${cultivator.name}请${kicked?.name ?? "一名队员"}离队，你补上了这个位子。`);
      const reserveBond = relationClause(getSocialLink(world, reserve.id, cultivator.id), cultivator.name, null);
      pushTravelNote(reserve, travelNote({
        tick: world.tick,
        kind: "person",
        title: `补上了${cultivator.name}的队伍`,
        detail: `${cultivator.name}请${kicked?.name ?? "一名队员"}离队，${reserve.name}补上了这个位子。场上仍不超过五人。${reserveBond}`,
        locationId: reserve.locationId,
        mood: "位子轮到自己了",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} removed ${kicked?.name ?? memberId} from the party.` };
  }

  if (actionId.startsWith("queue-party-reserve:")) {
    const leaderId = actionId.slice("queue-party-reserve:".length);
    const party = getPartyOf(world, leaderId);
    if (!party || party.leaderId !== leaderId) throw new GameplayRejection("没有找到这支满员的队伍。");
    if (party.memberIds.length < PARTY_MAX_MEMBERS) throw new GameplayRejection("队伍还有空位。直接接受邀请就行，不必候补。");
    if ((party.reserveIds ?? []).length > 0) throw new GameplayRejection("候补位已经有人。");
    if (isInParty(world, cultivator.id) || findReserveParty(world, cultivator.id)) throw new GameplayRejection("你已经在一支队伍或候补里。");
    const leader = world.cultivators[leaderId];
    if (!leader || leader.locationId !== cultivator.locationId) throw new GameplayRejection("候补要和队长待在同一个地方。");
    const link = getSocialLink(world, cultivator.id, leaderId);
    if (!link || !meetsAffinityLevel(link.affinity, PARTY_INVITE_MIN_LEVEL)) {
      throw new GameplayRejection(`还没认识${leader?.name ?? "队长"}。先搭讪，认识了再候补。`);
    }
    world.parties[party.id] = { ...party, reserveIds: [cultivator.id] };
    addMessage(world, leaderId, "组队", "有人候补", `${cultivator.name}在满员的队伍外候着。你可以轮换一个人，让${cultivator.name}上场。场上仍是五人。`);
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `候着${leader.name}的队伍`,
      detail: `${cultivator.name}没有挤进第六个位子，只在${leader.name}的队伍外候着。队长轮换以后才能上场。`,
      locationId: cultivator.locationId,
      mood: "人还在门外",
    }));
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} queued as reserve for ${leader.name}'s party.` };
  }

  if (actionId === "leave-party-reserve") {
    const party = findReserveParty(world, cultivator.id);
    if (!party) throw new GameplayRejection("你不在任何队伍的候补里。");
    world.parties[party.id] = { ...party, reserveIds: (party.reserveIds ?? []).filter((id) => id !== cultivator.id) };
    const leader = world.cultivators[party.leaderId];
    const leaderName = leader?.name ?? "队长";
    const leftReserve = `${cultivator.name}退出了${leaderName}的候补，不再等这个位子。`;
    if (leader) {
      addMessage(world, leader.id, "组队", "候补走了", `${cultivator.name}退出了候补。`);
      pushTravelNote(leader, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}退出了候补`,
        detail: leftReserve,
        locationId: leader.locationId,
        mood: "门外空了",
      }));
    }
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `退出了${leaderName}的候补`,
      detail: leftReserve,
      locationId: cultivator.locationId,
      mood: "不再等这个位子",
    }));
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} left the party reserve.` };
  }

  if (actionId.startsWith("party-rotate:")) {
    const memberId = actionId.slice("party-rotate:".length);
    const party = getPartyOf(world, cultivator.id);
    if (!party || party.leaderId !== cultivator.id) throw new GameplayRejection("只有队长能轮换上场的人。");
    const reserveId = party.reserveIds?.[0];
    if (!reserveId) throw new GameplayRejection("没有人在候补。");
    if (memberId === cultivator.id || !party.memberIds.includes(memberId)) throw new GameplayRejection("只能把队员换成候补。");
    const reserve = world.cultivators[reserveId];
    const outgoing = world.cultivators[memberId];
    if (!reserve) throw new GameplayRejection("候补的人已经不在了。");
    world.parties[party.id] = {
      ...party,
      memberIds: party.memberIds.map((id) => id === memberId ? reserveId : id),
      reserveIds: [memberId],
    };
    const outgoingName = outgoing?.name ?? memberId;
    addMessage(world, reserve.id, "组队", "轮换上场", `${cultivator.name}让你换下${outgoingName}。场上仍是五人。`);
    if (outgoing) addMessage(world, outgoing.id, "组队", "改去候补", `${cultivator.name}让${reserve.name}上场，你改去候补。`);
    const rotateBond = relationClause(getSocialLink(world, cultivator.id, reserve.id), reserve.name, null)
      || relationClause(getSocialLink(world, cultivator.id, memberId), outgoingName, null);
    const rotateDetail = `${cultivator.name}让${reserve.name}换下${outgoingName}。队伍还是五个人，多出来的人在候补。${rotateBond}`;
    for (const person of [cultivator, reserve, outgoing].filter((person): person is Cultivator => Boolean(person))) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${reserve.name}换下了${outgoingName}`,
        detail: rotateDetail,
        locationId: person.locationId,
        mood: "位子转了一手",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} rotated ${reserve.name} in for ${outgoingName}.` };
  }

  if (actionId === "leave-shared-expedition") {
    let removed = false;
    for (const progress of Object.values(world.dungeonExpeditions)) {
      const ids = expeditionCompanionIds(progress);
      if (!ids.includes(cultivator.id)) continue;
      const next = ids.filter((id) => id !== cultivator.id);
      world.dungeonExpeditions[progress.cultivatorId] = withCompanionIds(progress, next);
      const leader = world.cultivators[progress.cultivatorId];
      const parted = `${cultivator.name}明确退出了这一趟。和${leader?.name ?? "同行的人"}的地宫，到这里分开。`;
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "person",
        title: "退出了同行的地宫",
        detail: parted,
        locationId: cultivator.locationId,
        mood: "这一趟自己走了",
      }));
      if (leader) {
        pushTravelNote(leader, travelNote({
          tick: world.tick,
          kind: "person",
          title: `${cultivator.name}退出了这一趟`,
          detail: parted,
          locationId: leader.locationId,
          mood: "有人说要先走",
        }));
      }
      removed = true;
    }
    if (!removed) throw new GameplayRejection("你没有跟在别人的地宫里。");
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} left the shared dungeon expedition.` };
  }

  if (actionId.startsWith("set-party-role:")) {
    const roleId = actionId.slice("set-party-role:".length) as PartyRoleId;
    if (!PARTY_ROLE_IDS.includes(roleId)) throw new GameplayRejection("没有这个站位。");
    if (!legalPartyRoles(cultivator).includes(roleId)) {
      throw new GameplayRejection(`这套兵器和法器站不了${PARTY_ROLE_LABEL[roleId]}。换一件能出这个位置的兵器或法器，再选。`);
    }
    cultivator.preferredPartyRole = roleId;
    const stillLegal = new Set(listResolvedSkills(skillContextOf(cultivator))
      .filter((skill) => skill.roles.includes(roleId))
      .map((skill) => skill.id));
    cultivator.preferredSkillIds = (cultivator.preferredSkillIds ?? []).filter((id) => stillLegal.has(id)).slice(0, SKILL_SLOT_LIMIT);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} set party role to ${PARTY_ROLE_LABEL[roleId]}. ${combatLeaningView(cultivator).roleHint}`,
    };
  }

  if (actionId.startsWith("equip-skill-slot:")) {
    const skillId = actionId.slice("equip-skill-slot:".length);
    const roleId = partyRoleForCultivator(cultivator).id;
    const known = listResolvedSkills(skillContextOf(cultivator)).find(
      (skill) => skill.id === skillId && skill.id !== "basic-strike" && skill.roles.includes(roleId),
    );
    if (!known) throw new GameplayRejection("这一式不在当前站位能用的招里。");
    const current = [...(cultivator.preferredSkillIds ?? [])];
    const index = current.indexOf(skillId);
    if (index >= 0) {
      current.splice(index, 1);
      cultivator.preferredSkillIds = current;
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}卸下了${known.name}。` };
    }
    if (current.length >= SKILL_SLOT_LIMIT) {
      throw new GameplayRejection(`随身只能带${SKILL_SLOT_LIMIT}式。先卸下一式，再装这一式。`);
    }
    current.push(skillId);
    cultivator.preferredSkillIds = current;
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}装上了${known.name}。${loadoutGuidanceFor(cultivator)}`,
    };
  }

  if (actionId === "clear-skill-loadout") {
    cultivator.preferredSkillIds = [];
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}把随身招式清空了。` };
  }

  if (actionId.startsWith("tend-wound:")) {
    const targetId = actionId.slice("tend-wound:".length);
    const target = getCultivatorOrThrow(world, targetId);
    if (target.id === cultivator.id) throw new GameplayRejection("自己的伤要自己歇，或服下疗伤丹。");
    if (target.locationId !== cultivator.locationId) throw new GameplayRejection("人得在眼前才能疗伤。");
    if (target.injuryTicksRemaining <= 0) throw new GameplayRejection(`${target.name}现在没有伤。`);
    const usedPill = (cultivator.inventory["healing-pill"] ?? 0) > 0;
    if (usedPill) {
      cultivator.inventory["healing-pill"] -= 1;
    } else {
      const cost = Math.max(4, Math.round(cultivator.maxSpiritualPower * 0.08));
      if (cultivator.spiritualPower < cost) {
        throw new GameplayRejection(`灵力不够，身上也没有疗伤丹，帮不了${target.name}。`);
      }
      cultivator.spiritualPower -= cost;
    }
    const cleared = usedPill ? 5 : 3;
    target.injuryTicksRemaining = Math.max(0, target.injuryTicksRemaining - cleared);
    syncWounded(target);
    grantOwedFavor(world, cultivator.id, target.id, "替我压了伤", "tend-wound");
    const rival = getSocialLink(world, cultivator.id, target.id)?.rival === true;
    const how = usedPill ? `${cultivator.name}用了一枚疗伤丹` : `${cultivator.name}耗了一点灵力`;
    const awkward = rival
      ? "两人是宿敌，这一手仍旧别扭，人情还是记下了。"
      : `${target.name}欠${cultivator.name}一份人情。`;
    const detail = `${how}，帮${target.name}把伤压下去，还剩${target.injuryTicksRemaining}刻。${awkward}`;
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}给${target.name}疗了伤`,
        detail,
        locationId: person.locationId,
        mood: rival ? "宿敌也伸了手" : "伤轻了一点",
      }));
    }
    shareMoment(
      world,
      [cultivator, target],
      `${cultivator.name}给${target.name}疗了伤`,
      detail,
      `${cultivator.name}给${target.name}把伤压了下去。`,
      "tended",
    );
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name} tended ${target.name}. Injury left: ${target.injuryTicksRemaining}.`,
    };
  }

  if (actionId.startsWith("say:")) {
    const targetId = actionId.slice("say:".length);
    const target = getCultivatorOrThrow(world, targetId);
    if (target.id === cultivator.id) throw new GameplayRejection("不能对自己说话。");
    const party = getPartyOf(world, cultivator.id);
    const samePlace = target.locationId === cultivator.locationId;
    const sameParty = Boolean(party && party.memberIds.includes(target.id));
    if (!samePlace && !sameParty) throw new GameplayRejection("人得在眼前，或是同队，才能说这句话。");
    const spoken = openSpokenLine(world, cultivator.id, target.id, "say", world.tick, speechLine);
    const detail = `${cultivator.name}对${target.name}说：「${spoken}」`;
    addMessage(world, target.id, cultivator.name, "有人说话", detail, { fromCultivatorId: cultivator.id, toCultivatorId: target.id, spokenLine: spoken });
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}说了一句`,
        detail,
        locationId: person.locationId,
        mood: "话留在了耳朵里",
      }));
    }
    shareMoment(world, [cultivator, target], `${cultivator.name}说了一句`, detail, `${cultivator.name}说：「${spoken}」`, "spoken");
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}对${target.name}说了一句。` };
  }

  if (actionId.startsWith("reply-line:")) {
    const targetId = actionId.slice("reply-line:".length);
    const target = getCultivatorOrThrow(world, targetId);
    const pending = (world.messages ?? []).find((message) => message.toCultivatorId === cultivator.id && message.fromCultivatorId === target.id && message.spokenLine && !message.spokenAnswered);
    if (!pending) throw new GameplayRejection(`${target.name}没有一句还等着你回。`);
    const spoken = openSpokenLine(world, cultivator.id, target.id, "reply", world.tick, speechLine, { heardLine: pending.spokenLine });
    for (const message of world.messages ?? []) {
      if (message.toCultivatorId === cultivator.id && message.fromCultivatorId === target.id && message.spokenLine && !message.spokenAnswered) {
        message.spokenAnswered = true;
      }
    }
    const detail = `${cultivator.name}回${target.name}：「${spoken}」`;
    addMessage(world, target.id, cultivator.name, "有人回话", detail, { fromCultivatorId: cultivator.id, toCultivatorId: target.id, spokenLine: spoken });
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}回了一句`,
        detail,
        locationId: person.locationId,
        mood: "话接上了",
      }));
    }
    shareMoment(world, [cultivator, target], `${cultivator.name}回了一句`, detail, `${cultivator.name}说：「${spoken}」`, "spoken");
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}回了${target.name}一句。` };
  }

  if (actionId.startsWith("spar-teach:")) {
    const targetId = actionId.slice("spar-teach:".length);
    const target = getCultivatorOrThrow(world, targetId);
    if (target.id === cultivator.id) throw new GameplayRejection("不能指点自己。");
    if (target.locationId !== cultivator.locationId) throw new GameplayRejection("人得在眼前，才能切磋指点。");
    if (target.activeJobId || cultivator.activeJobId) throw new GameplayRejection("有人还在忙，这回指点不了。");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || bondArcOf(link.affinity) !== "知己") {
      throw new GameplayRejection(`和${target.name}还不是知己，指点这事先放一放。`);
    }
    if (link.lastSparTeachTick !== undefined && world.tick - link.lastSparTeachTick < SPAR_TEACH_COOLDOWN_TICKS) {
      const wait = SPAR_TEACH_COOLDOWN_TICKS - (world.tick - link.lastSparTeachTick);
      throw new GameplayRejection(`刚指点过${target.name}，再过${wait}刻才能再教。`);
    }
    if (cultivator.spiritualPower < SPAR_TEACH_SPIRIT) {
      throw new GameplayRejection(`灵力不够，这回指点不了${target.name}。`);
    }
    cultivator.spiritualPower -= SPAR_TEACH_SPIRIT;
    const taught = skillsForCultivator(target).find((skill) => skill.id !== "basic-strike");
    let detail: string;
    if (taught) {
      grantCombatPractice(target, [taught.id], SPAR_TEACH_PRACTICE);
      detail = `${cultivator.name}带${target.name}把「${taught.name}」走了两遍。${target.name}的这一式熟了一点。`;
      recordLife(target, { tick: world.tick, kind: "growth", text: detail });
    } else {
      target.realmProgress = clamp(target.realmProgress + 4, 0, 100);
      detail = `${cultivator.name}陪${target.name}拆了几手。没有新招，修为还是厚了一点。`;
      recordLife(target, { tick: world.tick, kind: "growth", text: detail });
    }
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: detail });
    const stamp = (ownerId: string, otherId: string) => {
      const current = getOrCreateSocialLink(world, ownerId, otherId);
      writeSocialLink(world, ownerId, { ...current, lastSparTeachTick: world.tick });
    };
    stamp(cultivator.id, target.id);
    stamp(target.id, cultivator.id);
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}指点了${target.name}`,
        detail,
        locationId: person.locationId,
        mood: "招熟了一点",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} taught ${target.name} a skill.` };
  }

  if (actionId.startsWith("share-resource:")) {
    const targetId = actionId.slice("share-resource:".length);
    const target = getCultivatorOrThrow(world, targetId);
    if (target.id === cultivator.id) throw new GameplayRejection("不能把灵石分给自己。");
    if (target.locationId !== cultivator.locationId) throw new GameplayRejection("人得在眼前，才能把灵石递过去。");
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || bondArcOf(link.affinity) !== "知己") {
      throw new GameplayRejection(`和${target.name}还不是知己，灵石先不分。`);
    }
    if (link.lastShareTick !== undefined && world.tick - link.lastShareTick < SHARE_RESOURCE_COOLDOWN_TICKS) {
      const wait = SHARE_RESOURCE_COOLDOWN_TICKS - (world.tick - link.lastShareTick);
      throw new GameplayRejection(`刚分过灵石给${target.name}，再过${wait}刻。`);
    }
    if (cultivator.spiritStones < SHARE_RESOURCE_MINIMUM) {
      throw new GameplayRejection("身上的灵石不够分出八枚，先留着自己用。");
    }
    cultivator.spiritStones -= SHARE_RESOURCE_STONES;
    target.spiritStones += SHARE_RESOURCE_STONES;
    const detail = `${cultivator.name}分给${target.name}八枚灵石。知己之间，这一小笔不用再推来推去。`;
    const stamp = (ownerId: string, otherId: string) => {
      const current = getOrCreateSocialLink(world, ownerId, otherId);
      writeSocialLink(world, ownerId, { ...current, lastShareTick: world.tick });
    };
    stamp(cultivator.id, target.id);
    stamp(target.id, cultivator.id);
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: detail });
    recordLife(target, { tick: world.tick, kind: "relationship", text: detail });
    shiftCultivatorMood(world, cultivator, "gift", `把八枚灵石分给${target.name}，递出去的时候心里是热的。`);
    shiftCultivatorMood(world, target, "gift", `${cultivator.name}分来八枚灵石，手里和心里都热了一点。`);
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}分了灵石`,
        detail,
        locationId: person.locationId,
        mood: "手里多了热气",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} shared ${SHARE_RESOURCE_STONES} stones with ${target.name}.` };
  }

  if (actionId.startsWith("grudge-challenge:")) {
    const targetId = actionId.slice("grudge-challenge:".length);
    const target = world.cultivators[targetId];
    const link = target ? getSocialLink(world, cultivator.id, target.id) : null;
    if (!target || !link || grudgeArcOf(link.grudge ?? 0) !== "宿怨") {
      throw new GameplayRejection(`和${target?.name ?? "对方"}还没到宿怨，不必为这点嫌隙公开挑战。`);
    }
    const blockReason = getCityDuelChallengeBlockReason(world, cultivator, target);
    if (blockReason) throw new Error(blockReason);
    const challengeId = `pvp-challenge-${world.nextPvpChallengeSequence++}`;
    const challenge: PendingPvpChallenge = {
      id: challengeId,
      challengerCultivatorId: cultivator.id,
      targetCultivatorId: targetId,
      createdAtTick: world.tick,
      expiresAtTick: world.tick + CITY_DUEL_REPLY_TICKS,
      locationId: cultivator.locationId,
    };
    publishCityDuel(world, challenge, cultivator, target);
    const detail = `宿怨已成。${cultivator.name}公开向${target.name}下了挑战书，请在${CITY_DUEL_REPLY_TICKS}刻内回应。`;
    addMessage(world, targetId, "宿怨挑战", "挑战书", detail, { fromCultivatorId: cultivator.id });
    recordLife(cultivator, { tick: world.tick, kind: "fight", text: detail });
    recordLife(target, { tick: world.tick, kind: "fight", text: detail });
    for (const person of [cultivator, target]) {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}下了挑战书`,
        detail,
        locationId: person.locationId,
        mood: "宿怨摆到了明面上",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} challenged ${target.name} over a feud.` };
  }

  // ---- Social Verbs: send-message ----
  const sendMessageParsed = parseSendMessage(actionId);
  if (sendMessageParsed) {
    const { targetId, kind } = sendMessageParsed;
    const target = getCultivatorOrThrow(world, targetId);
    if (cultivator.id === target.id) throw new Error("不能给自己传话。");
    if (kind === "rendezvous-at-gate" || kind === "ready-to-enter" || kind === "wait") {
      const party = getPartyOf(world, cultivator.id);
      if (!party || !party.memberIds.includes(target.id)) {
        throw new GameplayRejection("只有同队的人能传这句。先组上队，再用传话约门口。");
      }
      const place = world.locations[cultivator.locationId]?.name ?? "这里";
      const lines = {
        "rendezvous-at-gate": {
          subject: "门口会合",
          content: `${cultivator.name}传话：到地宫门口会合。人到了、闲着，再一起下。`,
          title: `约${target.name}到门口`,
          replyTitle: `${cultivator.name}约在门口`,
          mood: "约在地宫门口",
          summary: `${cultivator.name}约${target.name}到门口会合。`,
        },
        "ready-to-enter": {
          subject: "可以下了",
          content: `${cultivator.name}传话：人已就绪，可以下地宫。闲着就一起进，不另开工。`,
          title: `告诉${target.name}可以下了`,
          replyTitle: `${cultivator.name}说可以下了`,
          mood: "等人一起进",
          summary: `${cultivator.name}告诉${target.name}可以下了。`,
        },
        wait: {
          subject: "先等一等",
          content: `${cultivator.name}传话：先别下。在原地等，齐了再进。`,
          title: `让${target.name}先等`,
          replyTitle: `${cultivator.name}说先等`,
          mood: "先别进门",
          summary: `${cultivator.name}让${target.name}先等一等。`,
        },
      } as const;
      const line = lines[kind];
      const spoken = openSpokenLine(world, cultivator.id, target.id, kind, world.tick, speechLine);
      const detail = `${line.content}「${spoken}」人在${place}。`;
      addMessage(world, target.id, cultivator.name, line.subject, detail, { fromCultivatorId: cultivator.id, toCultivatorId: target.id, spokenLine: spoken });
      addMessage(world, cultivator.id, cultivator.name, line.subject, `你对${target.name}说：「${spoken}」${line.content}`, { fromCultivatorId: cultivator.id, toCultivatorId: cultivator.id, spokenLine: spoken });
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "person",
        title: line.title,
        detail,
        locationId: cultivator.locationId,
        mood: line.mood,
      }));
      pushTravelNote(target, travelNote({
        tick: world.tick,
        kind: "person",
        title: line.replyTitle,
        detail,
        locationId: target.locationId,
        mood: line.mood,
      }));
      shareMoment(world, [cultivator, target], line.title, detail, `${cultivator.name}说：「${spoken}」`, "spoken");
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: line.summary };
    }
    if (cultivator.locationId !== target.locationId) throw new Error("传话要当面。人现在不在一处。");
    if (kind === "gift-item") {
      // gift-item: deduct the named item, or the first one in the bag, and open one gift notice
      if ((cultivator.lastGiftTick ?? -1) >= world.tick) throw new Error("这一刻已经送过礼了。下一刻再送。");
      const feud = grudgeArcOf(getSocialLink(world, cultivator.id, target.id)?.grudge ?? 0);
      if (feud === "宿怨") {
        const place = world.locations[cultivator.locationId]?.name ?? "这里";
        const tense = `${cultivator.name}把礼递向${target.name}，人在${place}。话没热，剑拔弩张，礼没收下。`;
        recordLife(cultivator, { tick: world.tick, kind: "relationship", text: tense, names: [target.name] });
        recordLife(target, { tick: world.tick, kind: "relationship", text: tense, names: [cultivator.name] });
        cultivator.lastGiftTick = world.tick;
        addDaoLog(world, cultivator.id, "拒礼", tense, ["social", "feud", "gift"]);
        return {
          tick: world.tick,
          cultivatorId: cultivator.id,
          actionId,
          accepted: true,
          summary: `${target.name}和你有宿怨，剑拔弩张，礼没收下。好感没有涨。`,
        };
      }
      const giftItemId = resolveGiftItemId(cultivator, sendMessageParsed.itemId, bodyItemId);
      const giftName = itemDisplayName(giftItemId);
      const giftSpoken = openSpokenLine(world, cultivator.id, target.id, "gift-item", world.tick, speechLine, { giftName });
      cultivator.inventory[giftItemId as ItemId] = (cultivator.inventory[giftItemId as ItemId] ?? 0) - 1;
      cultivator.lastGiftTick = world.tick;
      const giftContent = `${cultivator.name}向你赠送了1个${giftName}，说：「${giftSpoken}」请接受或拒绝。`;
      const giftMsg = addMessage(world, target.id, cultivator.name, `${cultivator.name}的赠礼`, giftContent, { fromCultivatorId: cultivator.id, toCultivatorId: target.id, spokenLine: giftSpoken });
      const gift: PendingGift = { messageId: giftMsg.id, fromCultivatorId: cultivator.id, itemId: giftItemId as ItemId, count: 1, tick: world.tick };
      if (!target.pendingGifts) target.pendingGifts = [];
      target.pendingGifts.push(gift);
      const fellowGift = sameSectBond(cultivator, target);
      const tenseGift = feud === "嫌隙";
      if (!tenseGift) {
        addMutualAffinity(world, cultivator.id, target.id, fellowGift ? 21 : 15);
      } else {
        const place = world.locations[cultivator.locationId]?.name ?? "这里";
        const tense = `${cultivator.name}把礼递给${target.name}，人在${place}。话没热，剑拔弩张，好感没有涨。`;
        recordLife(cultivator, { tick: world.tick, kind: "relationship", text: tense, names: [target.name] });
        recordLife(target, { tick: world.tick, kind: "relationship", text: tense, names: [cultivator.name] });
      }
      addDaoLog(
        world,
        cultivator.id,
        "赠礼",
        tenseGift
          ? `${cultivator.name}把1个${giftName}递给${target.name}。两个人有嫌隙，剑拔弩张，好感没有涨。`
          : fellowGift
            ? `${cultivator.name}把1个${giftName}递给同门${target.name}。好感度+21。`
            : `${cultivator.name}向${target.name}赠送了1个${giftName}。好感度+15。`,
        ["social", "gift"],
      );
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "person",
        title: `把东西递给${target.name}`,
        detail: `${cultivator.name}把1个${giftName}塞进${target.name}手里，说：「${giftSpoken}」还没说收不收。`,
        locationId: cultivator.locationId,
        mood: "东西先离开了自己",
      }));
      pushTravelNote(target, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}递来一份礼`,
        detail: `${cultivator.name}递来1个${giftName}，说：「${giftSpoken}」收或不收，都得回一句话。`,
        locationId: target.locationId,
        mood: "手里多了别人的东西",
      }));
      shareMoment(
        world,
        [cultivator, target],
        `${cultivator.name}递来一份礼`,
        `${cultivator.name}把1个${giftName}塞给${target.name}，说：「${giftSpoken}」`,
        `${cultivator.name}说：「${giftSpoken}」`,
        "spoken",
      );
      return {
        tick: world.tick,
        cultivatorId: cultivator.id,
        actionId,
        accepted: true,
        summary: tenseGift
          ? `${cultivator.name}把1个${giftName}递给${target.name}。你们有嫌隙，剑拔弩张，好感没有涨。`
          : `${cultivator.name}送了1个${giftName}给${fellowGift ? "同门" : ""}${target.name}。好感+${fellowGift ? 21 : 15}。`,
      };
    }
    // Non-gift message: greet / share-info / request-help
    const kindLabels: Record<string, string> = SEND_MESSAGE_KIND_ZH;
    const messageLevelBefore = getSocialLink(world, cultivator.id, target.id);
    const messagePrevious = messageLevelBefore ? getAffinityLevel(messageLevelBefore.affinity) : null;
    const speechKind: SpeechKind = kind === "share-info" || kind === "request-help" ? kind : "greet";
    const spoken = openSpokenLine(world, cultivator.id, target.id, speechKind, world.tick, speechLine);
    addMutualAffinity(world, cultivator.id, target.id, 3);
    const msgSubject = kindLabels[kind] ?? kind;
    addMessage(world, target.id, cultivator.name, msgSubject, `${cultivator.name}说：「${spoken}」`, { fromCultivatorId: cultivator.id, toCultivatorId: target.id, spokenLine: spoken });
    addDaoLog(world, cultivator.id, "消息", `${cultivator.name}向${target.name}发送了${msgSubject}。好感度+3。`, ["social", "message"]);
    if (kind === "request-help") {
      const existing = (target.pendingHelpRequests ?? []).filter((request) => request.fromCultivatorId !== cultivator.id);
      const request: PendingHelpRequest = {
        id: `help-${cultivator.id}-${world.tick}`,
        fromCultivatorId: cultivator.id,
        tick: world.tick,
      };
      target.pendingHelpRequests = [...existing, request].slice(-PENDING_HELP_LIMIT);
    }
    const messageNotes: Record<string, { title: string; detail: string; replyTitle: string; replyDetail: string }> = {
      greet: {
        title: `向${target.name}问了好`,
        detail: `${cultivator.name}在${world.locations[cultivator.locationId]?.name ?? "这里"}跟${target.name}点了下头，说：「${spoken}」`,
        replyTitle: `${cultivator.name}打了招呼`,
        replyDetail: `${cultivator.name}跟你问了好：「${spoken}」人就在眼前。`,
      },
      "share-info": {
        title: `把见闻说给${target.name}`,
        detail: `${cultivator.name}把路上的事说给${target.name}听：「${spoken}」对方听完，没有立刻走开。`,
        replyTitle: `${cultivator.name}说了路上的事`,
        replyDetail: `${cultivator.name}分享了一段见闻：「${spoken}」值得记下来。`,
      },
      "request-help": {
        title: `向${target.name}求了一手`,
        detail: `${cultivator.name}向${target.name}开口求助：「${spoken}」人情还没落地，话已经说出去了。`,
        replyTitle: `${cultivator.name}来求助`,
        replyDetail: `${cultivator.name}向你求了一手：「${spoken}」帮或不帮，都会被记住。`,
      },
    };
    const note = messageNotes[kind];
    if (note) {
      const said = relationClause(getSocialLink(world, cultivator.id, target.id), target.name, messagePrevious);
      const heard = relationClause(getSocialLink(world, target.id, cultivator.id), cultivator.name, messagePrevious);
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "person",
        title: note.title,
        detail: `${note.detail}${said}`,
        locationId: cultivator.locationId,
        mood: "多了一句能回给主人的话",
      }));
      pushTravelNote(target, travelNote({
        tick: world.tick,
        kind: "person",
        title: note.replyTitle,
        detail: `${note.replyDetail}${heard}`,
        locationId: target.locationId,
        mood: "有人找上门了",
      }));
      shareMoment(world, [cultivator, target], note.title, `${note.detail}${said}`, `${cultivator.name}说：「${spoken}」`, "spoken");
    }
    const messageSummaries: Record<string, string> = {
      greet: summaryWithSpokenLine(`${cultivator.name}向${target.name}问了好`, spoken, "。好感+3。"),
      "share-info": summaryWithSpokenLine(`${cultivator.name}把见闻说给了${target.name}`, spoken, "。好感+3。"),
      "request-help": summaryWithSpokenLine(`${cultivator.name}向${target.name}求了一手`, spoken, "。好感+3。"),
    };
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: messageSummaries[kind] ?? `${cultivator.name}向${target.name}传了话。好感+3。` };
  }

  // ---- Social Verbs: read-messages ----
  if (actionId === "read-messages") {
    const myMessages = (world.messages ?? []).filter((m) => m.toCultivatorId === cultivator.id);
    if (myMessages.length === 0) throw new Error("没有要看的消息。");
    // Remove read messages from world.messages
    world.messages = (world.messages ?? []).filter((m) => m.toCultivatorId !== cultivator.id);
    addDaoLog(world, cultivator.id, "阅读消息", `${cultivator.name}确认了${myMessages.length}条消息。`, ["social", "message"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}看了${myMessages.length}条消息。` };
  }

  const acceptedBatch = parseGiftBatch(actionId, "accept-gift-batch:");
  const rejectedBatch = parseGiftBatch(actionId, "reject-gift-batch:");
  if (acceptedBatch || rejectedBatch) {
    const parsed = (acceptedBatch ?? rejectedBatch)!;
    const matching = (cultivator.pendingGifts ?? []).filter(
      (gift) => gift.fromCultivatorId === parsed.fromId && gift.itemId === parsed.itemId,
    );
    if (matching.length === 0) throw new Error("这份礼已经不在了。");
    const total = matching.reduce((sum, gift) => sum + gift.count, 0);
    const itemName = itemDisplayName(parsed.itemId);
    const ids = new Set(matching.map((gift) => gift.messageId));
    const sender = world.cultivators[parsed.fromId];
    const fromName = sender?.name ?? "某人";
    cultivator.pendingGifts = (cultivator.pendingGifts ?? []).filter((gift) => !ids.has(gift.messageId));
    if (acceptedBatch) {
      cultivator.inventory[parsed.itemId] = (cultivator.inventory[parsed.itemId] ?? 0) + total;
      const forgiven = forgiveOneFavor(world, cultivator.id, parsed.fromId);
      rememberGiftExchange(world, cultivator.id, parsed.fromId, "accepted", itemName);
      rememberGiftExchange(world, parsed.fromId, cultivator.id, "accepted", itemName);
      const detail = forgiven
        ? `${cultivator.name}把${fromName}送来的${total}份${itemName}一起收下了，并勾掉了一份对方欠下的人情。`
        : `${cultivator.name}把${fromName}送来的${total}份${itemName}一起收下了。`;
      addMessage(world, parsed.fromId, "赠礼", "赠礼已被接受", `${cultivator.name}收下了你送来的${total}份${itemName}。`, { fromCultivatorId: cultivator.id });
      addResourceGainLog(world, cultivator.id, "接受赠礼", detail, ["social", "gift"], [{ itemId: parsed.itemId, count: total }]);
      pushTravelNote(cultivator, travelNote({ tick: world.tick, kind: "person", title: `收下了${fromName}的礼`, detail, locationId: cultivator.locationId, mood: "手里多了一叠东西" }));
      if (sender) {
        pushTravelNote(sender, travelNote({ tick: world.tick, kind: "person", title: `${cultivator.name}收下了礼`, detail, locationId: sender.locationId, mood: "东西送到了" }));
        shiftCultivatorMood(world, sender, "gift", `${cultivator.name}把这几份礼一起收下了。`);
      }
      shiftCultivatorMood(world, cultivator, "gift");
      recordLife(cultivator, { tick: world.tick, kind: "relationship", text: detail });
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}收下了${fromName}送来的${total}份${itemName}。` };
    }
    if (!sender) throw new Error("这份礼已经不在了。");
    sender.inventory[parsed.itemId] = (sender.inventory[parsed.itemId] ?? 0) + total;
    rememberGiftExchange(world, cultivator.id, parsed.fromId, "returned", itemName);
    rememberGiftExchange(world, parsed.fromId, cultivator.id, "returned", itemName);
    const detail = `${cultivator.name}把${fromName}的${total}份${itemName}一起退了回去。`;
    addMessage(world, parsed.fromId, "赠礼", "赠礼被退还", `${cultivator.name}退回了你送来的${total}份${itemName}。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "拒绝赠礼", detail, ["social", "gift"]);
    pushTravelNote(cultivator, travelNote({ tick: world.tick, kind: "person", title: `退回了${fromName}的礼`, detail, locationId: cultivator.locationId, mood: "东西没有留下" }));
    pushTravelNote(sender, travelNote({ tick: world.tick, kind: "person", title: `${cultivator.name}退回了礼`, detail, locationId: sender.locationId, mood: "礼被退了回来" }));
    addMutualGrudge(world, cultivator.id, sender.id, GRUDGE_FROM_REJECTION);
    shiftCultivatorMood(world, sender, "rejection", `${cultivator.name}把这几份礼一起退了回来。`);
    shiftCultivatorMood(world, cultivator, "rejection");
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: detail });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}把${fromName}的${total}份${itemName}退了回去。` };
  }

  // ---- Social Verbs: accept-gift ----
  const acceptGiftMsgId = parseAcceptGift(actionId);
  if (acceptGiftMsgId) {
    const gifts = cultivator.pendingGifts ?? [];
    const giftIdx = gifts.findIndex((g) => g.messageId === acceptGiftMsgId);
    if (giftIdx === -1) throw new Error("这份礼已经不在了。");
    const gift = gifts[giftIdx];
    cultivator.inventory[gift.itemId] = (cultivator.inventory[gift.itemId] ?? 0) + gift.count;
    cultivator.pendingGifts = [...gifts.slice(0, giftIdx), ...gifts.slice(giftIdx + 1)];
    const giver = world.cultivators[gift.fromCultivatorId];
    const fromName = giver?.name ?? "unknown";
    const giftName = itemDisplayName(gift.itemId);
    const forgiven = forgiveOneFavor(world, cultivator.id, gift.fromCultivatorId);
    rememberGiftExchange(world, cultivator.id, gift.fromCultivatorId, "accepted", giftName);
    rememberGiftExchange(world, gift.fromCultivatorId, cultivator.id, "accepted", giftName);
    addMessage(world, gift.fromCultivatorId, "赠礼", "赠礼已被接受", `${cultivator.name}接受了你赠送的${gift.count}个${giftName}。`, { fromCultivatorId: cultivator.id });
    addResourceGainLog(world, cultivator.id, "接受赠礼", `${cultivator.name}接受了${fromName}赠送的${gift.count}个${giftName}。`, ["social", "gift"], [{ itemId: gift.itemId as ItemId, count: gift.count }]);
    const giftBond = relationClause(getSocialLink(world, cultivator.id, gift.fromCultivatorId), fromName, null);
    const pillEase = gift.itemId === "healing-pill" && cultivator.injuryTicksRemaining > 0
      ? `${cultivator.name}还挂着伤，这枚疗伤丹服下去能减轻伤势。`
      : "";
    const giftDetail = (forgiven
      ? `${cultivator.name}收下了${fromName}的${giftName}，并勾掉了一份对方欠下的人情。`
      : `${cultivator.name}收下了${fromName}送来的${gift.count}个${giftName}。`) + pillEase + giftBond;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `收下了${fromName}的礼`,
      detail: giftDetail,
      locationId: cultivator.locationId,
      mood: forgiven ? "人情轻了一点" : "手里多了一样东西",
    }));
    if (giver) {
      pushTravelNote(giver, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}收下了礼`,
        detail: giftDetail,
        locationId: giver.locationId,
        mood: forgiven ? "欠的那一份消了" : "东西送到了",
      }));
      shiftCultivatorMood(world, giver, "gift", `${cultivator.name}收下了这份礼，递出去的那点热意还在。`);
    }
    shiftCultivatorMood(world, cultivator, "gift");
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: giftDetail });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}收下了${fromName}送来的${gift.count}份${giftName}。` };
  }

  // ---- Social Verbs: reject-gift ----
  const rejectGiftMsgId = parseRejectGift(actionId);
  if (rejectGiftMsgId) {
    const gifts = cultivator.pendingGifts ?? [];
    const giftIdx = gifts.findIndex((g) => g.messageId === rejectGiftMsgId);
    if (giftIdx === -1) throw new Error("这份礼已经不在了。");
    const gift = gifts[giftIdx];
    // Return item to sender
    const sender = getCultivatorOrThrow(world, gift.fromCultivatorId);
    sender.inventory[gift.itemId] = (sender.inventory[gift.itemId] ?? 0) + gift.count;
    cultivator.pendingGifts = [...gifts.slice(0, giftIdx), ...gifts.slice(giftIdx + 1)];
    const fromName = sender.name;
    const giftName = itemDisplayName(gift.itemId);
    rememberGiftExchange(world, cultivator.id, gift.fromCultivatorId, "returned", giftName);
    rememberGiftExchange(world, gift.fromCultivatorId, cultivator.id, "returned", giftName);
    const rejectDetail = `${cultivator.name}把${fromName}的${giftName}退了回去。东西回到了原主手里。`;
    addMessage(world, gift.fromCultivatorId, "赠礼", "赠礼被退还", `${cultivator.name}拒绝了你赠送的${gift.count}个${giftName}，物品已退还。`, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "拒绝赠礼", `${cultivator.name}拒绝了${fromName}的赠礼，${gift.count}个${giftName}已退还。`, ["social", "gift"]);
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `退回了${fromName}的礼`,
      detail: rejectDetail,
      locationId: cultivator.locationId,
      mood: "东西没有留下",
    }));
    pushTravelNote(sender, travelNote({
      tick: world.tick,
      kind: "person",
      title: `${cultivator.name}退回了礼`,
      detail: rejectDetail,
      locationId: sender.locationId,
      mood: "礼被退了回来",
    }));
    addMutualGrudge(world, cultivator.id, sender.id, GRUDGE_FROM_REJECTION);
    shiftCultivatorMood(world, sender, "rejection", `${cultivator.name}把礼退了回来，心里堵着。`);
    shiftCultivatorMood(world, cultivator, "rejection", `把${fromName}的礼退了回去，话说出口，心里也不算松。`);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}把${fromName}的${giftName}退了回去。` };
  }

  // ---- Social Verbs: post-commission ----
  const postCommParsed = parsePostCommission(actionId);
  if (postCommParsed) {
    const { type, targetItemId } = postCommParsed;
    const location = world.locations[cultivator.locationId];
    if (!location || location.kind !== "safe") throw new Error("Commissions can only be posted at safe locations.");
    const rewardAmount = 50; // fixed reward for now
    if (cultivator.spiritStones < rewardAmount) throw new Error("Not enough spirit stones to fund the commission reward.");
    cultivator.spiritStones -= rewardAmount;
    if (!world.commissions) world.commissions = {};
    if (!world.nextCommissionSequence) world.nextCommissionSequence = 1;
    const commId = `comm-${world.nextCommissionSequence++}`;
    const commission: Commission = {
      id: commId,
      posterId: cultivator.id,
      locationId: cultivator.locationId,
      type,
      targetItemId: targetItemId as ItemId,
      targetCount: 1,
      rewardSpiritStones: rewardAmount,
      acceptedById: null,
      createdAtTick: world.tick,
      completedAtTick: null,
    };
    world.commissions[commId] = commission;
    addDaoLog(world, cultivator.id, "发布委托", `${cultivator.name}在告示板发布了${type === "gather" ? "采集" : "运送"}${targetItemId}的委托，悬赏${rewardAmount}灵石。`, ["social", "commission"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} posted a ${type} commission for ${targetItemId}.` };
  }

  // ---- Social Verbs: accept-commission ----
  const acceptCommId = parseAcceptCommission(actionId);
  if (acceptCommId) {
    const commission = (world.commissions ?? {})[acceptCommId];
    if (!commission) throw new Error("Commission not found.");
    if (commission.acceptedById) throw new Error("Commission already accepted.");
    if (commission.completedAtTick !== null) throw new Error("Commission already completed.");
    if (commission.posterId === cultivator.id) throw new Error("Cannot accept your own commission.");
    if (commission.locationId !== cultivator.locationId) throw new Error("Must be at the same location as the commission.");
    // Check if the acceptor has the required item
    const hasItem = (cultivator.inventory[commission.targetItemId] ?? 0) >= commission.targetCount;
    if (!hasItem) {
      throw new GameplayRejection(`Need ${commission.targetCount} ${commission.targetItemId} to fulfill this commission. It is not listed while you are short.`);
    }
    // Fulfill immediately: deduct item, pay reward, add affinity
    cultivator.inventory[commission.targetItemId] = (cultivator.inventory[commission.targetItemId] ?? 0) - commission.targetCount;
    cultivator.spiritStones += commission.rewardSpiritStones;
    world.commissions[acceptCommId] = { ...commission, acceptedById: cultivator.id, completedAtTick: world.tick };
    addMutualAffinity(world, cultivator.id, commission.posterId, 25);
    const posterName = world.cultivators[commission.posterId]?.name ?? "unknown";
    addMessage(world, commission.posterId, "委托", "委托已完成", `${cultivator.name}完成了你发布的${commission.type === "gather" ? "采集" : "运送"}${commission.targetItemId}委托。`, { fromCultivatorId: cultivator.id });
    addSpiritStoneGainLog(world, cultivator.id, "完成委托", `${cultivator.name}完成了${posterName}的${commission.targetItemId}委托，获得${commission.rewardSpiritStones}灵石。好感度+25。`, ["social", "commission"]);
    addDaoLog(world, commission.posterId, "委托完成", `${cultivator.name}完成了你发布的${commission.targetItemId}委托。好感度+25。`, ["social", "commission"]);
    grantOwedFavor(world, cultivator.id, commission.posterId, "办了我的委托", "commission");
    const poster = world.cultivators[commission.posterId];
    const commissionDetail = `${cultivator.name}办完了${posterName}贴出的${commission.targetItemId}委托。灵石进了口袋，${posterName}还欠着一份人情。`;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `办完${posterName}的委托`,
      detail: commissionDetail,
      locationId: cultivator.locationId,
      mood: "差事落地了",
    }));
    if (poster) {
      pushTravelNote(poster, travelNote({
        tick: world.tick,
        kind: "person",
        title: `${cultivator.name}办完了委托`,
        detail: commissionDetail,
        locationId: poster.locationId,
        mood: "告示上的事有人接了",
      }));
    }
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} fulfilled ${posterName}'s commission for ${commission.targetItemId}. Reward: ${commission.rewardSpiritStones} stones. Affinity +25.` };
  }

  const answerHelpRequesterId = parseAnswerHelp(actionId);
  if (answerHelpRequesterId) {
    const requests = cultivator.pendingHelpRequests ?? [];
    const request = requests.find((entry) => entry.fromCultivatorId === answerHelpRequesterId);
    if (!request) {
      throw new GameplayRejection("没有这份求助。");
    }
    const asker = getCultivatorOrThrow(world, answerHelpRequesterId);
    cultivator.pendingHelpRequests = requests.filter((entry) => entry.fromCultivatorId !== answerHelpRequesterId);
    const paid = cultivator.spiritStones >= HELP_STONE_GIFT;
    if (paid) {
      cultivator.spiritStones -= HELP_STONE_GIFT;
      asker.spiritStones += HELP_STONE_GIFT;
    }
    grantOwedFavor(world, cultivator.id, asker.id, "应了我的求助", "help");
    const helpDetail = paid
      ? `${cultivator.name}应了${asker.name}的求助，递出${HELP_STONE_GIFT}枚灵石。${asker.name}欠下一份人情。`
      : `${cultivator.name}应了${asker.name}的求助。灵石不够，只能陪着走了一段路。人情还是记下了。`;
    addMessage(world, asker.id, "求助", "有人应了", helpDetail, { fromCultivatorId: cultivator.id });
    addDaoLog(world, cultivator.id, "应援", helpDetail, ["social", "help"]);
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `帮了${asker.name}一把`,
      detail: helpDetail,
      locationId: cultivator.locationId,
      mood: paid ? "口袋轻了，人情重了" : "人送到了，东西没送到",
    }));
    pushTravelNote(asker, travelNote({
      tick: world.tick,
      kind: "person",
      title: `${cultivator.name}应了求助`,
      detail: helpDetail,
      locationId: asker.locationId,
      mood: "有人肯伸手",
    }));
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: helpDetail };
  }

  const boardKind = parseBoardNoteKind(actionId);
  if (boardKind) {
    const boardLocation = world.locations[cultivator.locationId];
    if (!boardLocation || boardLocation.kind !== "safe") {
      throw new GameplayRejection("只有安全的地方才有告示板。");
    }
    const links = Object.values(world.socialLinks?.[cultivator.id] ?? {});
    let text: string | null = null;
    if (boardKind === "journey") {
      text = cultivator.travelNotes?.[0]?.detail ?? `${cultivator.name}路过此地，留了一句话。`;
    } else if (boardKind === "favor") {
      const owed = links.filter((link) => (link.favorBalance ?? 0) > 0);
      if (owed.length === 0) {
        throw new GameplayRejection("没有可以写上告示的人情。");
      }
      const names = owed
        .map((link) => world.cultivators[link.targetCultivatorId]?.name ?? "某人")
        .slice(0, 3)
        .join("、");
      text = `${cultivator.name}在告示上写着：${names}还欠着人情。路过的人都能看见。`;
    } else if (boardKind === "rival") {
      const rivals = links.filter((link) => link.rival === true);
      if (rivals.length === 0) {
        throw new GameplayRejection("没有可以写上告示的过节。");
      }
      const names = rivals
        .map((link) => world.cultivators[link.targetCultivatorId]?.name ?? "某人")
        .slice(0, 3)
        .join("、");
      text = `${cultivator.name}把与${names}的过节钉在告示上。名字就在那里。`;
    } else {
      if (!cultivator.sectId) {
        throw new GameplayRejection("还没有宗门，写不下同门的话。");
      }
      const mate = namedSectMate(world, cultivator);
      text = `${cultivator.name}留了同门的话：与${mate.name}的差事还记在册上。`;
    }
    const note: LocationBoardNote = {
      authorId: cultivator.id,
      authorName: cultivator.name,
      tick: world.tick,
      text,
      kind: boardKind,
    };
    const existing = world.locationBoards?.[cultivator.locationId] ?? [];
    world.locationBoards = {
      ...(world.locationBoards ?? {}),
      [cultivator.locationId]: [note, ...existing].slice(0, BOARD_NOTE_LIMIT),
    };
    const boardDetail = `${cultivator.name}把一句话钉在${boardLocation.name}的告示上：${text}`;
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "mood",
      title: "在告示上留了话",
      detail: boardDetail,
      locationId: cultivator.locationId,
      mood: "话留在了原地",
    }));
    recordLife(cultivator, { tick: world.tick, kind: "relationship", text: boardDetail, topic: "note", names: [cultivator.name] });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} left a ${boardKind} note on the board at ${boardLocation.name}.` };
  }

  const callFavorTargetId = parseCallFavor(actionId);
  if (callFavorTargetId) {
    const target = getCultivatorOrThrow(world, callFavorTargetId);
    if (target.locationId !== cultivator.locationId) {
      throw new GameplayRejection("兑人情要当面。");
    }
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link || (link.favorBalance ?? 0) <= 0) {
      throw new GameplayRejection(`${target.name}不欠你人情。`);
    }
    const forgiven = forgiveOneFavor(world, cultivator.id, target.id);
    if (!forgiven) {
      throw new GameplayRejection(`${target.name}不欠你人情。`);
    }
    const paid = target.spiritStones >= FAVOR_CALL_STONES;
    if (paid) {
      target.spiritStones -= FAVOR_CALL_STONES;
      cultivator.spiritStones += FAVOR_CALL_STONES;
    }
    const quote = repaymentQuote(forgiven.reason);
    const favorDetail = paid
      ? `${cultivator.name}兑了${target.name}欠的一份人情，收回${FAVOR_CALL_STONES}枚灵石。${target.name}说：「${quote}」`
      : `${cultivator.name}兑了${target.name}欠的一份人情。${target.name}说：「${quote}」灵石还不上，这句话先把上回那份还上。`;
    for (const person of [cultivator, target]) {
      recordLife(person, {
        tick: world.tick,
        kind: "relationship",
        text: favorDetail,
        topic: "repay",
        names: [cultivator.name, target.name],
      });
      recordLife(person, {
        tick: world.tick,
        kind: "quote",
        text: `${target.name}说：「${quote}」`,
        speakerName: target.name,
        line: quote,
      });
    }
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `兑了${target.name}的人情`,
      detail: favorDetail,
      locationId: cultivator.locationId,
      mood: paid ? "口袋沉了一点" : "话先记下了",
    }));
    pushTravelNote(target, travelNote({
      tick: world.tick,
      kind: "person",
      title: `${cultivator.name}来兑人情`,
      detail: favorDetail,
      locationId: target.locationId,
      mood: paid ? "还掉了一份" : "还是欠着一句承诺",
    }));
    addMessage(world, target.id, "人情", "有人来兑", favorDetail, { fromCultivatorId: cultivator.id, spokenLine: quote });
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: favorDetail };
  }

  const pressRivalTargetId = parsePressRival(actionId);
  if (pressRivalTargetId) {
    const target = getCultivatorOrThrow(world, pressRivalTargetId);
    if (target.locationId !== cultivator.locationId) {
      throw new GameplayRejection("过节要当面对。");
    }
    const link = getSocialLink(world, cultivator.id, target.id);
    if (!link?.rival) {
      throw new GameplayRejection(`与${target.name}还不是对手。`);
    }
    if (link.lastRivalSceneTick !== undefined && world.tick - link.lastRivalSceneTick < RIVAL_SCENE_COOLDOWN_TICKS) {
      const wait = RIVAL_SCENE_COOLDOWN_TICKS - (world.tick - link.lastRivalSceneTick);
      throw new GameplayRejection(`过节刚吵过，再过 ${wait} 刻。`);
    }
    const roll = hashString(`${world.tick}:${cultivator.id}:${target.id}:rival-scene`) % 3;
    let rivalDetail = `${cultivator.name}与${target.name}当众对峙了一阵。谁也没拔剑，话是难听的。宿敌还是宿敌。`;
    if (roll === 0 && target.spiritStones >= 6) {
      target.spiritStones -= 6;
      cultivator.spiritStones += 6;
      rivalDetail = `${cultivator.name}当众压过${target.name}一头。对方甩出6枚灵石，名字还是对手。`;
    } else if (roll === 1 && cultivator.spiritStones >= 6) {
      cultivator.spiritStones -= 6;
      target.spiritStones += 6;
      rivalDetail = `${target.name}当众把${cultivator.name}的话顶了回去。6枚灵石换了手，过节没消。`;
    }
    const stamp = (fromId: string, toId: string) => {
      const current = getSocialLink(world, fromId, toId);
      if (current) {
        writeSocialLink(world, fromId, { ...current, lastRivalSceneTick: world.tick, rival: true });
      }
    };
    stamp(cultivator.id, target.id);
    stamp(target.id, cultivator.id);
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "person",
      title: `与${target.name}当众过了一节`,
      detail: rivalDetail,
      locationId: cultivator.locationId,
      mood: "这页会留着",
    }));
    pushTravelNote(target, travelNote({
      tick: world.tick,
      kind: "person",
      title: `与${cultivator.name}当众过了一节`,
      detail: rivalDetail,
      locationId: target.locationId,
      mood: "这页会留着",
    }));
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: rivalDetail };
  }

  throw new Error(`Unsupported action: ${actionId}`);
}
function resolveJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId); cultivator.activeJobId = null;
  if (isSectTimedAction(job.actionId)) {
    const summary = resolveSectTimed(world, cultivator, job.actionId, job.meta?.sectSceneLine);
    addDaoLog(world, cultivator.id, "宗门事务", summary, ["sect", "sect-life"]);
    return summary;
  }
  const registration = registrationModifiersOf(cultivator);
  const questAction = parseQuestActionId(job.actionId);
  const activeQuestId = typeof job.meta?.activeQuestId === "string" ? job.meta.activeQuestId : null;
  const guixuNodeId = parseExploreGuixuNode(job.actionId);
  const travelDestination = parseTravelDestination(job.actionId);
  if (travelDestination) {
    const destination = world.locations[travelDestination];
    if (!destination) {
      throw new Error(`Invalid travel destination: ${travelDestination}`);
    }
    if (destination.nodeType === "wilderness" && job.meta?.wildSighting !== true) {
      const arrived = wildPlaceForState(destination.stateId);
      if (arrived) {
        noteWild(cultivator, {
          tick: world.tick,
          locationId: travelDestination,
          title: "路上的见闻",
          detail: `${arrived.name}这一段的见闻：${arrived.road}`,
        });
      }
    }
    cultivator.locationId = travelDestination;
    noteArrivalReunion(world, cultivator);
    triggerLocationEvent(
      world,
      cultivator,
      "exploration",
      travelDestination,
      `${world.tick}:${cultivator.id}:${job.id}:arrival`,
    );
    addDaoLog(world, cultivator.id, "赶路", `${cultivator.name}到了${destination.name}。`, ["travel"]);
    rememberSettledMoment(world, cultivator, "travel");
    return `${cultivator.name}到了${destination.name}。`;
  }
  if (questAction?.phase === "execute" && activeQuestId) {
    const resolved = resolveActiveQuest(world, cultivator, activeQuestId, `${world.tick}:${job.id}:${activeQuestId}`);
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
      addSpiritStoneGainLog(world, cultivator.id, "同行历练", `${cultivator.name}完成了双人荒野任务：${task.nameCn}，获得${task.spiritStoneReward}灵石。`, ["social", "dual-wilderness"]);
      return `${cultivator.name}完成了双人荒野任务：${task.nameCn}。`;
    }
    return `${cultivator.name}完成了双人荒野任务。`;
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
    rememberSettledMoment(world, cultivator, "meditate");
    return `${cultivator.name}打坐完了，灵力回来一些。`;
  }
  if (job.actionId === "heal") {
    cultivator.qi = clamp(cultivator.qi + 45 + (registration?.healBonus ?? 0), 0, cultivator.maxQi);
    cultivator.injuryTicksRemaining = Math.max(
      0,
      cultivator.injuryTicksRemaining - 4 - Math.floor((registration?.healBonus ?? 0) / 4),
    );
    cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned");
    upsertEffect(cultivator, { id: "clear-mind", name: "心神清明", description: "调息和修炼都顺一些。", source: "sanctuary", remainingTicks: 4, intensity: 1 });
    syncWounded(cultivator);
    rememberSettledMoment(world, cultivator, "heal");
    return `${cultivator.name}把伤养了一阵。`;
  }
  if (job.actionId === "cultivate") {
    const aid = consumeCultivationAid(cultivator);
    const progressBefore = cultivator.realmProgress;
    addRealmProgress(
      cultivator,
      18 +
        Math.floor(cultivator.realmLevel / 2) +
        (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
        (hasEffect(cultivator, "qi-surge") ? 6 : 0) +
        (registration?.cultivateBonus ?? 0) -
        (hasEffect(cultivator, "poisoned") ? 8 : 0) +
        (aid?.bonus ?? 0),
    );
    noteCultivationMark(world, cultivator, progressBefore);
    rememberSettledMoment(world, cultivator, "cultivate");
    return aid
      ? `${cultivator.name}闭关时用了一份${aid.name}，修为多涨了一截。`
      : `${cultivator.name}运功完了，修为涨了一截。`;
  }
  if (job.actionId === "residence-meditate") {
    const residence = getActiveResidence(cultivator);
    const { timeSense } = residence ? describeResidenceScene(residence, world.tick) : { timeSense: "此刻" };
    const fallback = job.meta?.residenceMeditateFallback === true;
    if (!fallback) {
      cultivator.spiritStones -= 80;
    }
    const aid = consumeCultivationAid(cultivator);
    const baseGain =
      (fallback ? 4 : 10) +
      (hashString(`${world.tick}:${job.id}:residence-meditate`) % (fallback ? 3 : 5)) +
      (hasEffect(cultivator, "clear-mind") ? 4 : 0) +
      (registration?.cultivateBonus ?? 0) +
      (aid?.bonus ?? 0);
    const furnishingBonus = meditateProgressBonus(residence, baseGain);
    const gain = baseGain + furnishingBonus;
    const progressBefore = cultivator.realmProgress;
    addRealmProgress(cultivator, gain);
    noteCultivationMark(world, cultivator, progressBefore);
    const roll = hashString(`${world.tick}:${job.id}:residence-meditate:roll`) % 100;
    if (roll < (fallback ? 5 : 15)) {
      upsertEffect(cultivator, {
        id: "insight",
        name: "有所悟",
        description: "这一阵修炼和出手都亮一点。",
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
      `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}闭关修炼，消耗 ${fallback ? 0 : 80} 灵石，修为增加 ${gain}。${furnishingBonus > 0 ? `屋里的布置又添了${furnishingBonus}分。` : ""}${aid ? `用了一份${aid.name}。` : ""}`,
      ["cultivation", "residence"],
    );
    addResidenceAmbientLog(world, cultivator, job.actionId, job.id);
    rememberSettledMoment(world, cultivator, "cultivate");
    return `${cultivator.name}在洞府里打坐完了。`;
  }
  if (job.actionId === "residence-heal") {
    const residence = getActiveResidence(cultivator);
    const { timeSense } = residence ? describeResidenceScene(residence, world.tick) : { timeSense: "此刻" };
    const usePill = job.meta?.residenceHealUsePill === true;
    if (usePill && cultivator.inventory["healing-pill"] > 0) {
      cultivator.inventory["healing-pill"] -= 1;
    }
    const healed = (usePill ? 6 : 4) + Math.floor((registration?.healBonus ?? 0) / 4) + benefitsOf(residence).healBonus;
    cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - healed);
    cultivator.qi = clamp(cultivator.qi + (usePill ? 55 : 35) + (registration?.healBonus ?? 0), 0, cultivator.maxQi);
    cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned");
    syncWounded(cultivator);
    addDaoLog(
      world,
      cultivator.id,
      "洞府疗伤",
      `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}疗伤${usePill ? "并服用疗伤丹" : ""}，伤势恢复 ${healed}。`,
      ["recovery", "residence"],
    );
    addResidenceAmbientLog(world, cultivator, job.actionId, job.id);
    return `${cultivator.name}在洞府里把伤养了一阵。`;
  }
  if (job.actionId === "residence-recover-qi") {
    const residence = getActiveResidence(cultivator);
    const { timeSense } = residence ? describeResidenceScene(residence, world.tick) : { timeSense: "此刻" };
    const usePill = job.meta?.residenceRecoverQiUsePill === true;
    if (usePill && cultivator.inventory["qi-pill"] > 0) {
      cultivator.inventory["qi-pill"] -= 1;
      upsertEffect(cultivator, {
        id: "spirit-saturated",
        name: "灵气充盈",
        description: "这一阵修炼更顶用。",
        source: "residence-recover-qi",
        remainingTicks: 4,
        intensity: 1,
      });
    }
    const qiGain = Math.max(1, Math.floor(cultivator.maxQi * (usePill ? 0.6 : 0.35))) + benefitsOf(residence).qiBonus;
    cultivator.qi = clamp(cultivator.qi + qiGain, 0, cultivator.maxQi);
    addDaoLog(
      world,
      cultivator.id,
      "洞府调息",
      `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}调息${usePill ? "并服用回气丹" : ""}，恢复气血 ${qiGain}。`,
      ["recovery", "residence"],
    );
    addResidenceAmbientLog(world, cultivator, job.actionId, job.id);
    return `${cultivator.name}在洞府里把气调了回来。`;
  }
  if (
    job.actionId === "residence-breakthrough"
    || job.actionId === "core-rite:steady"
    || job.actionId === "core-rite:press"
    || job.actionId === "infant-fire-temper"
    || job.actionId === "refine-nascent"
    || job.actionId === "begin-soul-vigil"
    || job.actionId === "face-tribulation"
    || job.actionId === "begin-divine-step"
    || job.actionId === "hold-divine-platform"
    || aboveRiteForAction(job.actionId)
  ) {
    return resolveTimedBreakthrough(world, cultivator, job);
  }
  if (job.actionId === "residence-produce") {
    const residence = getActiveResidence(cultivator);
    const { timeSense } = residence ? describeResidenceScene(residence, world.tick) : { timeSense: "此刻" };
    const recipe = job.meta?.residenceRecipeId ? getResidenceRecipeById(job.meta.residenceRecipeId) : null;
    if (!recipe) {
      throw new Error("Residence production recipe missing.");
    }
    const residenceStoneCost = discountedSpiritCost(residence, recipe.spiritStoneCost);
    const craftedStoneCost = regionalCraftStoneCost(cultivator, residenceStoneCost);
    if (cultivator.spiritStones < craftedStoneCost || !recipe.inputMaterials.every((material) => cultivator.inventory[material.itemId] >= material.count)) {
      throw new Error("No craftable residence recipe with current materials.");
    }
    for (const material of recipe.inputMaterials) {
      cultivator.inventory[material.itemId] -= material.count;
    }
    cultivator.spiritStones -= craftedStoneCost;
    spendRegionalCraftFiber(cultivator, residenceStoneCost, craftedStoneCost);
    cultivator.inventory[recipe.outputItemId] += recipe.outputCount;
    addResourceGainLog(
      world,
      cultivator.id,
      "洞府生产",
      `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}完成了洞府生产，产出 ${recipe.outputCount} 个 ${recipe.outputItemId}。`,
      ["production", "residence"],
      [{ itemId: recipe.outputItemId, count: recipe.outputCount }],
    );
    addResidenceAmbientLog(world, cultivator, job.actionId, job.id);
    return `${cultivator.name}在洞府里炼出了${ITEM_CATALOG[recipe.outputItemId]?.name ?? "这件东西"}。`;
  }
  if (job.actionId === "residence-socialize") {
    const residence = getActiveResidence(cultivator);
    const { timeSense } = residence ? describeResidenceScene(residence, world.tick) : { timeSense: "此刻" };
    // If there are other cultivators at the same location, grow affinity with one
    const socialTarget = pickChatUpTarget(world, cultivator.id, `${world.tick}:${job.id}:socialize`);
    if (socialTarget) {
      const { linkAB } = addMutualAffinity(world, cultivator.id, socialTarget.id, AFFINITY_GAINS.residenceSocialize + benefitsOf(residence).hostAffinity);
      const level = getAffinityLevel(linkAB.affinity);
      addDaoLog(world, cultivator.id, "洞府会友", `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}与${socialTarget.name}交流心法，好感度${linkAB.affinity}（${level}）。`, ["social", "residence"]);
    } else {
      addDaoLog(world, cultivator.id, "洞府会友", `${timeSense}的${residence?.name ?? "洞府"}里，${cultivator.name}独自整理心法与见闻。`, ["social", "residence"]);
    }
    addResidenceAmbientLog(world, cultivator, job.actionId, job.id);
    return `${cultivator.name}在洞府里坐了一会儿。`;
  }
  if (job.actionId === "take-mortal-task") {
    const progressBefore = cultivator.realmProgress;
    const fatigue = noteSpam(cultivator, "take-mortal-task", world.tick);
    const multiplier = spamRewardMultiplier(fatigue.count);
    const stoneGain = Math.max(12, Math.floor((140 + ((registration?.taskBonus ?? 0) * 10)) * multiplier));
    const progressGain = Math.max(fatigue.count >= 5 ? 0 : 1, Math.round(4 * multiplier));
    cultivator.spiritStones += stoneGain;
    cultivator.inventory[pickBreakthroughDrop("cloud-heart-grass", `${world.tick}:${job.id}:task-material`)] += fatigue.count >= 4 ? 0 : 1;
    addCurrentStateReputation(cultivator, Math.max(1, Math.floor((8 + Math.floor((registration?.taskBonus ?? 0) / 2)) * multiplier)));
    addRealmProgress(cultivator, progressGain);
    noteCultivationMark(world, cultivator, progressBefore);
    if (fatigue.note) {
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "mood",
        title: "城里的差事做腻了",
        detail: fatigue.note,
        locationId: cultivator.locationId,
        mood: "想离开主城走走",
      }));
    } else if (progressGain > 0) {
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "insight",
        title: "跑腿里的一点进境",
        detail: `${cultivator.name}在城里办完一件差事，修为轻轻动了 ${progressGain}。这不是闭关，但总比停在原地强。`,
        locationId: cultivator.locationId,
        mood: "还在长，只是很慢",
      }));
    }
    return fatigue.note
      ? `${cultivator.name}把城里的差事做完了，不过同样的差事再做就腻了。修为涨了${progressGain}。`
      : `${cultivator.name}把城里的差事做完了。修为涨了${progressGain}。`;
  }
  if (job.actionId === "take-neutral-duty") {
    const neutralSect = getCultivatorNeutralSect(world, cultivator);
    if (!neutralSect) {
      throw new Error("Neutral duty requires neutral sect membership.");
    }
    cultivator.spiritStones += 120;
    addCurrentStateReputation(cultivator, 4);
    cultivator.neutralContribution += 40;
    grantSectMerit(world, cultivator, 4);
    addFactionReputation(cultivator, neutralSect.id, 8);
    upsertEffect(cultivator, { id: "clear-mind", name: "心神清明", description: "调息和修炼都顺一些。", source: "neutral-sect", remainingTicks: 2, intensity: 1 });
    addDaoLog(world, cultivator.id, "中立差事", `${cultivator.name}给${neutralSect.name}做完了一件差事。`, ["neutral-sect", "neutral-duty"]);
    return `${cultivator.name}把${neutralSect.name}的差事做完了。`;
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
    grantSectMerit(world, cultivator, Math.max(4, Math.floor(contributionDelta / 5)));
    if (cultivator.totalContribution > previousContribution) {
      cultivator.contributionReachedAt = world.tick;
    }
    const warProgress = recordFactionWarContribution(world, cultivator, Math.max(20, contributionDelta));
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 });
    addDaoLog(world, cultivator.id, "宗门差事", `${cultivator.name}把宗门差事做完了。`, ["sect", "sect-quest-complete"]);
    noteSectLife(world, cultivator, "宗门差事");
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
    return `${cultivator.name}把宗门差事做完了。`;
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
    grantSectMerit(world, cultivator, Math.max(4, Math.floor(reward.contribution / 5)));
    if (cultivator.totalContribution > previousContribution) {
      cultivator.contributionReachedAt = world.tick;
    }
    const warProgress = recordFactionWarContribution(world, cultivator, Math.max(10, reward.contribution));
    // Risk effects for high-risk tasks
    if (taskTemplate.riskLevel === "high") {
      const riskRoll = hashString(`${world.tick}:${job.id}:risk`);
      if (riskRoll % 4 === 0) {
        cultivator.qi = clamp(cultivator.qi - 12, 1, cultivator.maxQi);
        raiseInjury(world, cultivator, 3);
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
    addSpiritStoneGainLog(world, cultivator.id, logCategory, `${cultivator.name} 完成了宗门${taskTemplate.tier}级任务「${taskTemplate.nameCn}」，获得贡献 ${reward.contribution}，灵石 ${reward.spiritStones}。`, ["sect", `sect-task-${taskTemplate.category}`, `tier-${taskTemplate.tier}`, "sect-task-log", "sect-contribution-log"]);
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
    noteSectLife(world, cultivator, taskTemplate.nameCn);
    return `${cultivator.name} completed sect task: ${taskTemplate.nameCn} (${taskTemplate.tier}).`;
  }
  if (job.actionId === "mine-spirit-stones") {
    const roll = hashString(`${world.tick}:${job.id}`);
    cultivator.spiritStones += 110 + (roll % 80) + ((registration?.mineBonus ?? 0) * 8);
    cultivator.inventory["spirit-ore"] += 1 + (roll % 2) + ((registration?.mineBonus ?? 0) >= 8 ? 1 : 0);
    cultivator.inventory[pickBreakthroughDrop("mystic-jade-stone", `${world.tick}:${job.id}:mine-material`)] += 1;
    cultivator.qi = clamp(cultivator.qi - Math.max(6, 14 - (registration?.combatGuard ?? 0)), 1, cultivator.maxQi);
    if (roll % 5 === 0) {
      raiseInjury(world, cultivator, Math.max(2, 5 - (registration?.combatGuard ?? 0)));
      syncWounded(cultivator);
    }
    rememberSettledMoment(world, cultivator, "mine");
    return `${cultivator.name}采到了灵石和矿。`;
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
    cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:search-fortune-material`, fallbackSearchFortuneRank)] += 1;
    grantLoadoutSourceDrop(world, cultivator, metadata.grade, fallbackSearchFortuneRank, `${world.tick}:${job.id}:loadout-source`);
    grantCultivationDrop(world, cultivator, metadata.grade, fallbackSearchFortuneRank);
    return `${cultivator.name}在这层探了一遭。`;
  }
  if (job.actionId === "hunt-mine-beast" || parseChallengeGuardianRank(job.actionId) !== null) {
    throw new Error("Combat job should resolve through round runtime.");
  }
  /* Legacy fallback block kept temporarily during the registration modifier patch.
  if (job.actionId === "meditate") { cultivator.spiritualPower = clamp(cultivator.spiritualPower + 28 + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (registration?.meditateBonus ?? 0), 0, cultivator.maxSpiritualPower); return `${cultivator.name} recovered spiritual power.`; }
  if (job.actionId === "heal") { cultivator.qi = clamp(cultivator.qi + 45 + (registration?.healBonus ?? 0), 0, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 4 - Math.floor((registration?.healBonus ?? 0) / 4)); cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned"); upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sanctuary", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); return `${cultivator.name} recovered from injuries.`; }
  if (job.actionId === "cultivate") { cultivator.realmProgress = clamp(cultivator.realmProgress + 18 + Math.floor(cultivator.realmLevel / 2) + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (hasEffect(cultivator, "qi-surge") ? 6 : 0) - (hasEffect(cultivator, "poisoned") ? 8 : 0), 0, 200); if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) { cultivator.realmProgress -= 100; cultivator.realmLevel += 1; cultivator.realm = cultivator.realmLevel <= 3 ? "炼气" : cultivator.realmLevel <= 6 ? "筑基" : "金丹"; cultivator.maxQi += 12; cultivator.maxSpiritualPower += 12; cultivator.qi = cultivator.maxQi; cultivator.spiritualPower = cultivator.maxSpiritualPower; cultivator.lifespan += 12; return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`; } return `${cultivator.name} gained cultivation progress.`; }
  if (job.actionId === "take-mortal-task") { cultivator.spiritStones += 140; cultivator.reputation += 8; cultivator.karma = Math.max(0, cultivator.karma - 2); return `${cultivator.name} finished a town task.`; }
  if (job.actionId === "take-sect-errand") { cultivator.spiritStones += 180; cultivator.reputation += 6; upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 }); return `${cultivator.name}把宗门差事做完了。`; }
  if (job.actionId === "mine-spirit-stones") { const roll = hashString(`${world.tick}:${job.id}`); cultivator.spiritStones += 110 + (roll % 80); cultivator.inventory["spirit-ore"] += 1 + (roll % 2); cultivator.qi = clamp(cultivator.qi - 14, 1, cultivator.maxQi); if (roll % 5 === 0) { cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 5); syncWounded(cultivator); } return `${cultivator.name} mined stones and ore.`; }
  if (job.actionId === "search-fortune") { const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}`); if (roll % 3 === 0) cultivator.inventory["ruin-fragment"] += hasEffect(cultivator, "fortune-marked") ? 2 : 1; else if (roll % 3 === 1) { cultivator.realmProgress = clamp(cultivator.realmProgress + 10, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 }); } else { cultivator.spiritStones += 220; cultivator.inventory["ruin-fragment"] += 1; } return `${cultivator.name} searched the ruins.`; }
  const encounterId = job.actionId === "hunt-mine-beast" ? "mine-beast" : "ruins-guardian"; const roll = hashString(`${world.tick}:${job.id}:${encounterId}`); const power = cultivator.qi + Math.floor(cultivator.spiritualPower * 0.6) + cultivator.realmLevel * 10 + Math.floor(cultivator.reputation / 3) + (hasEffect(cultivator, "qi-surge") ? 18 : 0) + (hasEffect(cultivator, "warded") ? 14 : 0) + (job.actionId === "challenge-guardian" && hasEffect(cultivator, "fortune-marked") ? 12 : 0) - (hasEffect(cultivator, "poisoned") ? 12 : 0) + (roll % 22); const threat = job.actionId === "hunt-mine-beast" ? 145 + (roll % 20) : 172 + (roll % 24); cultivator.spiritualPower = clamp(cultivator.spiritualPower - (job.actionId === "hunt-mine-beast" ? 16 : 24), 0, cultivator.maxSpiritualPower);
  if (power >= threat) { if (job.actionId === "hunt-mine-beast") { cultivator.inventory["spirit-ore"] += 2 + (roll % 2); cultivator.spiritStones += 120 + (roll % 60); if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1; upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 }); } else { cultivator.inventory["ruin-fragment"] += 1 + (roll % 2); cultivator.inventory["ward-talisman"] += 1; cultivator.realmProgress = clamp(cultivator.realmProgress + 12, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 }); } addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` }); return `${cultivator.name} won a combat encounter.`; }
  cultivator.qi = clamp(cultivator.qi - (job.actionId === "hunt-mine-beast" ? 24 + (roll % 10) : 32 + (roll % 12)), 1, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, job.actionId === "hunt-mine-beast" ? 5 : 7); if (job.actionId === "challenge-guardian") upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` }); return `${cultivator.name} lost a combat encounter.`; }
  */
  if (job.actionId === "band-errand:weapon" || job.actionId === "band-errand:manual") {
    const kind = job.actionId === "band-errand:weapon" ? "weapon" as const : "spell" as const;
    const offer = gearOffer(cultivator, kind);
    if (!offer || offer.tier < 4) {
      return `${cultivator.name}跑了一趟宗门差事，这一阶没有要带回来的东西。`;
    }
    const itemId = (kind === "weapon" ? `weapon-material-${offer.id}` : `spell-fragment-${offer.id}`) as ItemId;
    cultivator.inventory[itemId] = (cultivator.inventory[itemId] ?? 0) + 1;
    cultivator.bandErrandReadyTick = world.tick + 6;
    const name = ITEM_CATALOG[itemId]?.name ?? offer.name;
    const summary = `${cultivator.name}在宗门跑了一趟差事，带回一份${name}。回洞府按配方做完，用掉才会学会。同一趟要隔六个时辰。`;
    addResourceGainLog(world, cultivator.id, "宗门差事", summary, ["sect", "combat-content", kind], [{ itemId, count: 1 }]);
    return summary;
  }
  throw new Error(`Unsupported timed action: ${job.actionId}`);
}

function resolveEnhancedJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  if (String(job.actionId).startsWith("enter-regional:")) {
    cultivator.activeJobId = null;
    return completeRegionalJob(world, cultivator, job, (person) => battleCombatantFromCultivator(person));
  }
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
      const huntedPlace = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
      const enemyDisplayName = huntedPlace?.enemy ?? (() => {
        const cfg = getEnemyConfig(encId as unknown as EnemyConfigId);
        return cfg?.name ?? MINE_BEAST_ENCOUNTER_TEMPLATE.enemyName;
      })();
      const huntedLine = huntedPlace ? huntSentence(huntedPlace, retreated ? "retreat" : outcome === "victory" ? "win" : "loss") : null;
      if (huntedLine) {
        noteWild(cultivator, {
          tick: world.tick,
          locationId: cultivator.locationId,
          title: outcome === "victory" && !retreated ? `斗过${enemyDisplayName}` : `没打过${enemyDisplayName}`,
          detail: huntedLine,
          fight: true,
        });
      }
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
          summary: huntedLine ?? `${cultivator.name} retreated from ${enemyDisplayName} after ${totalRounds} rounds.`,
          encounterTemplateId: encId,
          encounterBuildId: combatState.encounterBuildId ?? encId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.initialPlayerSnapshot,
          enemySnapshot: combatState.initialEnemySnapshot,
          preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
          finalPlayerHp: combatState.playerSnapshot.hp,
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
        addRealmProgress(cultivator, 4 + Math.floor(cultivator.realmLevel / 3));
        if (!huntedLine) {
          pushTravelNote(cultivator, travelNote({
            tick: world.tick,
            kind: "find",
            title: `斗过${enemyDisplayName}`,
            detail: `${cultivator.name}在荒野里斗过${enemyDisplayName}，身上还留着那一战的气血翻涌，修为也跟着动了一截。`,
            locationId: cultivator.locationId,
            mood: "打完还想再找一场",
          }));
        }
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
          summary: huntedLine ?? `${cultivator.name} defeated ${enemyDisplayName} in ${totalRounds} rounds.`,
          encounterTemplateId: encId,
          encounterBuildId: combatState.encounterBuildId ?? encId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.initialPlayerSnapshot,
          enemySnapshot: combatState.initialEnemySnapshot,
          preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
          finalPlayerHp: combatState.playerSnapshot.hp,
        });
        return `${cultivator.name} defeated ${enemyDisplayName}.`;
      }

      const qiLossPercent = 8 + (hashString(`${baseSeed}:defeat-qi-loss`) % 8);
      const qiLoss = Math.max(1, Math.floor(cultivator.maxQi * (qiLossPercent / 100)));
      cultivator.qi = clamp(cultivator.qi - qiLoss, 1, cultivator.maxQi);
      if ((hashString(`${baseSeed}:defeat-injury`) % 100) < 50) {
        raiseInjury(world, cultivator, Math.max(2, 5 - (registration?.combatGuard ?? 0)));
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
        summary: huntedLine ?? `${cultivator.name} was defeated by ${enemyDisplayName} after ${totalRounds} rounds.`,
        encounterTemplateId: encId,
        encounterBuildId: combatState.encounterBuildId ?? encId,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: combatState.initialPlayerSnapshot,
        enemySnapshot: combatState.initialEnemySnapshot,
        preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
        finalPlayerHp: combatState.playerSnapshot.hp,
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
      noteFightDiary(
        world,
        cultivator,
        guardianDisplayName,
        combatState.rounds,
        "player",
        retreated,
        retreated ? (combatState.retreatingSide ?? "player") : null,
      );
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
          playerSnapshot: combatState.initialPlayerSnapshot,
          enemySnapshot: combatState.initialEnemySnapshot,
          preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
          finalPlayerHp: combatState.playerSnapshot.hp,
          retreated: true,
        });
        if (!job.label.startsWith("Dungeon expedition")) {
          settleJiaBandFail(world, cultivator, metadata.grade, challengeGuardianRank, "withdraw");
        }
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
        cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:guardian-material`, challengeGuardianRank)] += 1;
        cultivator.spiritStones += spiritStones;
        addRealmProgress(cultivator, tuning.realmProgressReward);
        grantLoadoutSourceDrop(world, cultivator, metadata.grade, challengeGuardianRank, `${world.tick}:${job.id}:guardian-loadout-source`);
        grantCultivationDrop(world, cultivator, metadata.grade, challengeGuardianRank);
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
            [pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:guardian-material`, challengeGuardianRank)]: 1,
          },
          summary: `${cultivator.name} broke the guardian seal at ${location.name} rank ${challengeGuardianRank}.`,
          encounterTemplateId: guardianEncId,
          encounterBuildId: combatState.encounterBuildId ?? guardianEncId,
          totalRounds,
          rounds: combatState.rounds,
          playerSnapshot: combatState.initialPlayerSnapshot,
          enemySnapshot: combatState.initialEnemySnapshot,
          preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
          finalPlayerHp: combatState.playerSnapshot.hp,
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
      raiseInjury(world, cultivator, Math.max(2, tuning.defeatInjuryTicks - (registration?.combatGuard ?? 0)));
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
        playerSnapshot: combatState.initialPlayerSnapshot,
        enemySnapshot: combatState.initialEnemySnapshot,
        preCultivatorStatusEffects: combatState.playerStatusEffectsBefore,
        finalPlayerHp: combatState.playerSnapshot.hp,
      });
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        title: `${location.name} Guardian Counterattack`,
        content: `${cultivator.name} was forced back by the ${metadata.grade}${challengeGuardianRank} guardian of ${location.name}.`,
        severity: "high",
        tags: ["guardian", location.nodeType, metadata.grade, `rank-${challengeGuardianRank}`, "defeat"],
      });
      if (!job.label.startsWith("Dungeon expedition")) {
        settleJiaBandFail(world, cultivator, metadata.grade, challengeGuardianRank, "loss");
      }
      return `${cultivator.name} was repelled by the rank ${challengeGuardianRank} guardian of ${location.name}.`;
    }
  }
  // ---- PVP Duel Resolution ----
  if (combatState && job.actionId === "pvp-duel") {
    cultivator.activeJobId = null;
    if (!(combatState.duelDraw && !combatState.retreated)) {
      const outcome = combatState.outcome ?? finalizeCombat(world, cultivator, job, combatState);
      combatState.outcome = outcome;
    }
    combatState.resolved = true;
    setCombatJobState(job, combatState);
    const outcome = combatState.outcome;

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
      const isPlayerPerspective = cId === cultivator.id;
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
        combatRounds: combatState.duelSummary ? [combatState.duelSummary] : undefined,
        totalRounds,
        rounds: combatState.rounds,
        playerSnapshot: isPlayerPerspective ? combatState.initialPlayerSnapshot : combatState.initialEnemySnapshot,
        enemySnapshot: isPlayerPerspective ? combatState.initialEnemySnapshot : combatState.initialPlayerSnapshot,
        preCultivatorStatusEffects: isPlayerPerspective ? combatState.playerStatusEffectsBefore : combatState.enemyStatusEffectsBefore,
        finalPlayerHp: isPlayerPerspective ? combatState.playerSnapshot.hp : combatState.enemySnapshot.hp,
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

    if (isCityDuel && target) {
      const retreatSide = retreated ? retreatingSide : null;
      noteFightDiary(world, cultivator, targetName, combatState.rounds, "player", retreated, retreatSide);
      noteFightDiary(world, target, cultivator.name, combatState.rounds, "enemy", retreated, retreatSide);
      const verdict = retreated
        ? `${retreatingSide === "enemy" ? targetName : cultivator.name}撤了`
        : outcome === "victory"
          ? `${cultivator.name}赢了`
          : outcome === "defeat"
            ? `${targetName}赢了`
            : "这一架打成平手";
      const report = combatState.duelReport
        ? `${cultivator.name}与${targetName}在城里切磋。${combatState.duelReport}${verdict}。`
        : `${cultivator.name}与${targetName}在城里切磋。${verdict}。`;
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "person",
        title: `与${targetName}切磋`,
        detail: report,
        locationId: cultivator.locationId,
        mood: "城里过了一手",
      }));
      pushTravelNote(target, travelNote({
        tick: world.tick,
        kind: "person",
        title: `与${cultivator.name}切磋`,
        detail: report,
        locationId: target.locationId,
        mood: "城里过了一手",
      }));
      echoPartyWitness(world, [cultivator, target], `听见${cultivator.name}与${targetName}切磋`, report);
      const digestLine = combatState.duelSummary ? fightDigestText(combatState.duelSummary) : null;
      if (digestLine) {
        recordLife(cultivator, { tick: world.tick, kind: "fight", text: digestLine });
        recordLife(target, { tick: world.tick, kind: "fight", text: digestLine });
      }
      const practice = combatState.duelPractice ?? {};
      const longFight = combatState.rounds.length >= 5;
      grantCombatPractice(cultivator, practice[cultivator.id] ?? [], outcome === "victory" && longFight ? 2 : 1);
      grantCombatPractice(target, practice[target.id] ?? [], outcome === "defeat" && longFight ? 2 : 1);
    }

    if (retreated) {
      if (retreatingSide === "enemy") {
        const leftBefore = cultivator.spiritStones;
        const rightBefore = target?.spiritStones ?? 0;
        if (isCityDuel) {
          cultivator.spiritStones += 8;
          if (target) {
            target.spiritStones = Math.max(0, target.spiritStones - 3);
          }
        }
        addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, {}, `${cultivator.name} won — ${targetName} retreated from the duel.`, false);
        if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} retreated from the duel with ${cultivator.name}.`, true);
        if (isCityDuel && target) noteCityRivalry(world, cultivator, target, `${targetName}从与${cultivator.name}的城中切磋里退了下去。这一架记成了对手。`, {
          left: { result: "win", stoneDelta: cultivator.spiritStones - leftBefore },
          right: { result: "retreat", stoneDelta: target.spiritStones - rightBefore },
        });
        return `${targetName} retreated from the duel with ${cultivator.name}.`;
      }
      const leftBefore = cultivator.spiritStones;
      const rightBefore = target?.spiritStones ?? 0;
      if (isCityDuel) {
        cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 8);
        addCurrentStateReputation(cultivator, -1);
        if (target) target.spiritStones += 5;
      }
      addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} retreated from the duel with ${targetName}.`, true);
      if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "victory", enemyDamageTaken, isCityDuel ? { "spirit-stone-reward": 5 } as Partial<Record<ItemId, number>> : {}, `${targetName} won — ${cultivator.name} retreated.`, false);
      if (isCityDuel && target) noteCityRivalry(world, cultivator, target, `${cultivator.name}从与${targetName}的城中切磋里退了下去。这一架记成了对手。`, {
        left: { result: "retreat", stoneDelta: cultivator.spiritStones - leftBefore },
        right: { result: "win", stoneDelta: target.spiritStones - rightBefore },
      });
      return `${cultivator.name} retreated from the duel with ${targetName}.`;
    }

    if (outcome === "victory") {
      // Challenger wins
      const leftBefore = cultivator.spiritStones;
      const rightBefore = target?.spiritStones ?? 0;
      if (isCityDuel) {
        cultivator.spiritStones += 15;
        addCurrentStateReputation(cultivator, 2);
        if (target) target.spiritStones = Math.max(0, target.spiritStones - 5);
      }
      addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "victory", damageTaken, isCityDuel ? {} : {}, `${cultivator.name} defeated ${targetName} in a duel (${totalRounds} rounds).`, false);
      if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} was defeated by ${cultivator.name} in a duel.`, false);
      if (targetId) addMutualAffinity(world, cultivator.id, targetId, AFFINITY_GAINS.pvpDuel);
      if (isCityDuel && target) noteCityRivalry(world, cultivator, target, `${cultivator.name}在城里赢了${targetName}。这一架记成了对手。`, {
        left: { result: "win", stoneDelta: cultivator.spiritStones - leftBefore },
        right: { result: "loss", stoneDelta: target.spiritStones - rightBefore },
      });
      return `${cultivator.name} defeated ${targetName} in a duel.`;
    }

    if (outcome === "defeat") {
      // Challenger loses
      const leftBefore = cultivator.spiritStones;
      const rightBefore = target?.spiritStones ?? 0;
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
      if (isCityDuel && target) noteCityRivalry(world, cultivator, target, `${cultivator.name}在城里输给了${targetName}。这一架记成了对手。`, {
        left: { result: "loss", stoneDelta: cultivator.spiritStones - leftBefore },
        right: { result: "win", stoneDelta: target.spiritStones - rightBefore },
      });
      return `${cultivator.name} was defeated by ${targetName} in a duel.`;
    }

    // Draw (rounds exhausted)
    addPvpLog(cultivator.id, cultivator.locationId, targetName, targetId, "defeat", damageTaken, {}, `${cultivator.name} fought ${targetName} to a draw (${totalRounds} rounds).`, false);
    if (target) addPvpLog(target.id, target.locationId, cultivator.name, cultivator.id, "defeat", enemyDamageTaken, {}, `${targetName} fought ${cultivator.name} to a draw.`, false);
    // PVP duel grows mutual affinity regardless of outcome
    if (targetId) addMutualAffinity(world, cultivator.id, targetId, AFFINITY_GAINS.pvpDuel);
    if (isCityDuel && target) noteCityRivalry(world, cultivator, target, `${cultivator.name}与${targetName}在城里打成平手。这一架记成了对手。`, {
      left: { result: "draw", stoneDelta: 0 },
      right: { result: "draw", stoneDelta: 0 },
    });
    return `${cultivator.name} fought ${targetName} to a draw.`;
  }
  if (parseStartDungeonExpeditionActionId(job.actionId) || parseEnterDungeonActionId(job.actionId)) {
    cultivator.activeJobId = null;
    let report = world.dungeonExpeditionReports[cultivator.id];
    if (!report) {
      const progress = getActiveDungeonExpedition(world, cultivator.id);
      if (progress) {
        report = finalizeDungeonExpedition(world, cultivator, progress, "withdrew");
      } else {
        const metadata = dungeonMetadataOf(world.locations[cultivator.locationId]);
        const returnLocationId = safeExpeditionReturnLocationId(world, cultivator.locationId);
        cultivator.locationId = returnLocationId;
        report = {
          cultivatorId: cultivator.id,
          grade: metadata?.grade ?? "丙",
          targetRank: 1,
          policy: "balanced",
          outcome: "withdrew",
          startedAtTick: world.tick,
          endedAtTick: world.tick,
          stepsResolved: 0,
          primaryMaterial: { itemId: metadata?.materialBand ?? "cloud-heart-grass", count: 0 },
          secondaryDrops: {},
          spiritStoneGain: 0,
          realmProgressGain: 0,
          unlockedNextRank: false,
          returnLocationId,
          summary: `${cultivator.name} 被送出地宫。这次远征没有留下完整记录，人已经回到安全的地方。`,
          flavorEvents: [],
          beats: [],
          qiSpent: 0,
          spiritualPowerSpent: 0,
          injuryTicksGained: 0,
        };
        world.dungeonExpeditionReports[cultivator.id] = report;
        delete world.dungeonExpeditions[cultivator.id];
      }
    }
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: report.outcome === "catastrophic" ? "setback" : report.outcome === "completed" ? "find" : "mood",
      title: "地宫归来",
      detail: report.summary,
      locationId: cultivator.locationId,
      mood: report.outcome === "catastrophic" ? "劫后余生" : report.outcome === "completed" ? "这一趟值得讲" : "人回来了，账也算清了",
    }));
    recordLife(cultivator, {
      tick: world.tick,
      kind: report.outcome === "completed" ? "growth" : "fight",
      text: report.summary,
    });
    return report.summary;
  }
  if (job.actionId === "heal") {
    const summary = resolveJob(world, job);
    cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "deviation");
    return summary;
  }
  if (job.actionId === "cultivate") {
    cultivator.activeJobId = null;
    const aid = consumeCultivationAid(cultivator);
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
      (hasEffect(cultivator, "deviation") ? 12 : 0) +
      (aid?.bonus ?? 0);
    const progressBefore = cultivator.realmProgress;
    addRealmProgress(cultivator, gain);
    noteCultivationMark(world, cultivator, progressBefore);
    rememberSettledMoment(world, cultivator, "cultivate");
    if (cultivateRoll % 7 === 0) {
      upsertEffect(cultivator, { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "闭关有所得", content: `${cultivator.name}这一阵打坐，眼前亮了一下。`, severity: "medium", tags: ["event", "retreat", "insight"] });
    }
    if (cultivateRoll % 19 === 0 && !hasEffect(cultivator, "clear-mind")) {
      upsertEffect(cultivator, { id: "deviation", name: "Qi Deviation", description: "Cultivation becomes unstable and risky.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "走火入魔", content: `${cultivator.name}这一阵催得太急，气息乱了。`, severity: "high", tags: ["event", "cultivation", "deviation"] });
    }
    const aidNote = aid ? `用了一份${aid.name}。` : "";
    if (cultivator.realmProgress >= BREAKTHROUGH_PROGRESS_REQUIRED && cultivator.realmLevel >= 9) {
      const step = quietMethodStep(cultivator.realmLevel) ?? "下一阶按眼下这一境的做法破，灵材到对应的秘境里拿。";
      return `${cultivator.name}的修为顶在门槛上。${aidNote}${step}`;
    }
    return aid
      ? `${cultivator.name}闭关时用了一份${aid.name}，修为多涨了一截。`
      : `${cultivator.name}运功完了，修为涨了一截。`;
  }
  if (job.actionId === "take-sect-errand") {
    const summary = resolveJob(world, job);
    if (hashString(`${world.tick}:${job.id}:sect`) % 3 === 0) {
      cultivator.inventory["ward-talisman"] += 1;
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "宗门赏赐", content: "宗门额外赏赐了一张镇煞符，酬谢你把这趟差事做干净了。", severity: "medium", tags: ["event", "sect", "bounty"] });
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
      throw new GameplayRejection(dungeonGateLockLine(cultivator, location) ?? "这一处地宫现在进不去。");
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
    cultivator.inventory[pickBreakthroughDrop(metadata.materialBand, `${world.tick}:${job.id}:enhanced-search-material`, searchFortuneRank)] += 1;
    grantCultivationDrop(world, cultivator, metadata.grade, searchFortuneRank);
    if (dungeonSourceTier(metadata.grade, searchFortuneRank) >= 4) {
      grantLoadoutSourceDrop(world, cultivator, metadata.grade, searchFortuneRank, `${world.tick}:${job.id}:enhanced-loadout-source`);
    }
    triggerNodeSpecificEvent(
      world,
      cultivator,
      searchFortuneActionIdOf(searchFortuneRank),
      cultivator.locationId,
      `${world.tick}:${job.id}:${cultivator.locationId}:node-search`,
      { grade: metadata.grade, rank: searchFortuneRank },
    );
    return `${cultivator.name}在${location.name}探了第${searchFortuneRank}阶。`;
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
      const isPlayerPerspective = cId === cultivator.id;
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
        playerSnapshot: isPlayerPerspective ? combatState.initialPlayerSnapshot : combatState.initialEnemySnapshot,
        enemySnapshot: isPlayerPerspective ? combatState.initialEnemySnapshot : combatState.initialPlayerSnapshot,
        preCultivatorStatusEffects: isPlayerPerspective ? combatState.playerStatusEffectsBefore : combatState.enemyStatusEffectsBefore,
        finalPlayerHp: isPlayerPerspective ? combatState.playerSnapshot.hp : combatState.enemySnapshot.hp,
        retreated: isRetreated || undefined,
        pvpOpponentCultivatorId: oppId,
        pvpOpponentName: opp,
        pvpBattleKind: "wilderness-clash",
      });
    };

    if (target) {
      addMutualGrudge(world, cultivator.id, target.id, GRUDGE_FROM_DUEL);
    }

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

function performResidenceGrandeurAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: ActionId,
): ActionExecutionResult | null {
  const placing = actionId.startsWith("place-fixture:") ? actionId.slice("place-fixture:".length) : null;
  const clearing = actionId.startsWith("clear-fixture:") ? actionId.slice("clear-fixture:".length) : null;
  const hosting = actionId.startsWith("host-guest:") ? actionId.slice("host-guest:".length) : null;
  const displaying = actionId.startsWith("display-relic:") ? actionId.slice("display-relic:".length) : null;
  const clearingDisplay = actionId === "clear-displayed-relic";
  if (
    actionId !== "upgrade-residence"
    && placing === null
    && clearing === null
    && hosting === null
    && displaying === null
    && !clearingDisplay
  ) {
    return null;
  }
  const residence = getActiveResidence(cultivator);
  if (!residence) {
    throw new GameplayRejection("修府、置办陈设、摆遗物和待客，都要在自己的洞府里。先回去。");
  }
  const done = (summary: string): ActionExecutionResult => ({
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId,
    accepted: true,
    summary,
  });

  if (actionId === "upgrade-residence") {
    const quote = upgradeQuote(residence);
    if (cultivator.spiritStones < quote.price) {
      throw new GameplayRejection(`灵石不够。修到${quote.tierName}要${quote.price}，身上只有${cultivator.spiritStones}。`);
    }
    const previous = residenceTierName(residence);
    cultivator.spiritStones -= quote.price;
    withResidence(cultivator, residence.id, (home) => applyUpgrade(home, quote.nextGrandeur));
    const grant = claimCaveReputation(cultivator, residence);
    const fame = grant > 0 ? `本州声望涨了${grant}点。` : "";
    const text = `${cultivator.name}把${residence.name}从${previous}修成了${quote.tierName}，花了${quote.price}灵石。${fame}`;
    addDaoLog(world, cultivator.id, "修缮洞府", text, ["residence", "purchase", "grandeur"]);
    recordLife(cultivator, { tick: world.tick, kind: "growth", text });
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "find",
      title: `${residence.name}修成了${quote.tierName}`,
      detail: text,
      locationId: cultivator.locationId,
      mood: "府里比昨天宽",
    }));
    return done(text);
  }

  if (placing !== null) {
    const family = fixtureFamily(placing);
    if (!family) throw new GameplayRejection("没有这件陈设。");
    const offer = fixtureOffers(residence).find((row) => row.fixtureId === placing);
    if (!offer) {
      const current = (residence.fixtures ?? []).find((fixture) => fixture.id === placing);
      if (current && current.tier >= family.maxTier) {
        throw new GameplayRejection(`${family.name}已经到顶，再买也没有下一阶。`);
      }
      const slots = fixtureSlotCount(residence.grandeur ?? 1);
      throw new GameplayRejection(`这处${residenceTierName(residence)}只有${slots}个位子，已经满了。先撤下一件，或者把府邸再修大。`);
    }
    if (cultivator.spiritStones < offer.price) {
      throw new GameplayRejection(`灵石不够。${offer.tierName}的${family.name}要${offer.price}，身上只有${cultivator.spiritStones}。`);
    }
    cultivator.spiritStones -= offer.price;
    withResidence(cultivator, residence.id, (home) => applyFixture(home, placing, offer.nextTier));
    const grant = claimCaveReputation(cultivator, residence);
    const fame = grant > 0 ? `本州声望涨了${grant}点。` : "";
    const text = offer.cosmetic
      ? `${cultivator.name}在${residence.name}添了${offer.tierName}的${family.name}，花了${offer.price}灵石。来的人看得见。${fame}`
      : `${cultivator.name}在${residence.name}安了${offer.tierName}的${family.name}，花了${offer.price}灵石。${fame}`;
    addDaoLog(world, cultivator.id, "置办陈设", text, ["residence", "purchase", "fixture"]);
    recordLife(cultivator, { tick: world.tick, kind: "growth", text });
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "find",
      title: `${residence.name}里多了${family.name}`,
      detail: text,
      locationId: cultivator.locationId,
      mood: "府里又多了一件东西",
    }));
    return done(text);
  }

  if (clearing !== null) {
    const family = fixtureFamily(clearing);
    const exists = (residence.fixtures ?? []).some((fixture) => fixture.id === clearing);
    if (!family || !exists) throw new GameplayRejection("这件本来就没摆着。");
    withResidence(cultivator, residence.id, (home) => applyClearFixture(home, clearing));
    const text = `${cultivator.name}把${residence.name}里的${family.name}撤了下来。灵石不退。`;
    addDaoLog(world, cultivator.id, "撤下陈设", text, ["residence", "fixture"]);
    return done(text);
  }

  if (displaying !== null) {
    const relic = jiaRelicByItemId(displaying);
    if (!relic) throw new GameplayRejection("这不是能摆上案的甲级遗物。");
    if ((cultivator.inventory[relic.itemId] ?? 0) < 1) {
      throw new GameplayRejection(`袋子里没有${relic.name}。`);
    }
    withResidence(cultivator, residence.id, (home) => {
      home.displayedRelic = { itemId: relic.itemId, name: relic.name, arcLine: relic.arcLine };
    });
    const text = `${cultivator.name}把${relic.name}摆在${residence.name}的案上。${relic.arcLine}`;
    recordLife(cultivator, { tick: world.tick, kind: "growth", text });
    pushTravelNote(cultivator, travelNote({
      tick: world.tick,
      kind: "find",
      title: `案上摆着${relic.name}`,
      detail: text,
      locationId: cultivator.locationId,
      mood: "来的人看得见",
    }));
    return done(text);
  }

  if (clearingDisplay) {
    const shown = residence.displayedRelic;
    if (!shown) throw new GameplayRejection("案上本来就空着。");
    withResidence(cultivator, residence.id, (home) => {
      delete home.displayedRelic;
    });
    const text = `${cultivator.name}把案上的${shown.name}收回了。袋子里的份数没变。`;
    return done(text);
  }

  const guest = hosting ? world.cultivators[hosting] : undefined;
  if (!guest || guest.id === cultivator.id) throw new GameplayRejection("请不到这个人。");
  if (guest.locationId !== cultivator.locationId) {
    throw new GameplayRejection(`${guest.name}不在这城里，门开了也没人进来。`);
  }
  const ready = hostReady(residence, guest.id, world.tick);
  if (!ready.ok) {
    throw new GameplayRejection(`${guest.name}刚在府里坐过。再过${ready.wait}个时辰再请。`);
  }
  const cost = hostTeaCost(residence);
  if (cultivator.spiritStones < cost) {
    throw new GameplayRejection(`待客要${cost}灵石温茶，身上不够。`);
  }
  cultivator.spiritStones -= cost;
  const spoken = hostSpokenLine(residence, world.tick, guest.id);
  const tierName = residenceTierName(residence);
  addMutualAffinity(world, cultivator.id, guest.id, HOST_AFFINITY_BASE + benefitsOf(residence).hostAffinity);
  withResidence(cultivator, residence.id, (home) => stampHost(home, guest.id, world.tick));
  const hostText = `${cultivator.name}把${guest.name}请到${tierName}里坐了一会儿。`;
  const guestText = `${guest.name}在${cultivator.name}的${residence.name}坐了一会儿。眼下这里是${tierName}。`;
  recordLife(cultivator, { tick: world.tick, kind: "relationship", text: hostText, names: [guest.name], topic: "bond" });
  recordLife(guest, { tick: world.tick, kind: "relationship", text: guestText, names: [cultivator.name], topic: "bond" });
  recordSpokenEcho(world, cultivator, guest, spoken);
  shiftCultivatorMood(world, cultivator, "bond", "把人请到家里坐了一会儿，心里比刚才热一点。");
  addMessage(world, guest.id, cultivator.name, "有人请你进府", `${cultivator.name}把你请到${residence.name}里。${residenceGlance(residence)}对方说：「${spoken}」`, {
    fromCultivatorId: cultivator.id,
    toCultivatorId: guest.id,
    spokenLine: spoken,
  });
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "person",
    title: `请${guest.name}进府坐了坐`,
    detail: `${hostText}${cultivator.name}说：「${spoken}」`,
    locationId: cultivator.locationId,
    mood: "家里有人坐着",
  }));
  pushTravelNote(guest, travelNote({
    tick: world.tick,
    kind: "person",
    title: `在${cultivator.name}府里坐了一会儿`,
    detail: `${guestText}${residenceGlance(residence)}`,
    locationId: guest.locationId,
    mood: "看见了别人的府",
  }));
  addDaoLog(world, cultivator.id, "洞府待客", `${hostText}${cultivator.name}说：「${spoken}」`, ["residence", "social"]);
  addDaoLog(world, guest.id, "洞府作客", guestText, ["residence", "social"]);
  return done(`${hostText}${cultivator.name}说：「${spoken}」`);
}

export function performAction(world: WorldState, cultivatorId: string, actionId: ActionId, speechLine?: string | null, bodyItemId?: string | null): ActionExecutionResult {
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
    addDaoLog(world, cultivator.id, "地宫远征", report.summary, ["dungeon-expedition", "aborted"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: report.summary,
    };
  }
  const dungeonWakeOptionId = parseDungeonWakeDecision(actionId);
  if (dungeonWakeOptionId) {
    const ownProgress = getActiveDungeonExpedition(world, cultivator.id);
    const progress = ownProgress?.pendingWakeNode ? ownProgress : findSharedExpedition(world, cultivator.id);
    if (!progress?.pendingWakeNode) {
      throw new GameplayRejection("地宫里没有待决的岔路。");
    }
    if (!progress.pendingWakeNode.options.some((option) => option.optionId === dungeonWakeOptionId)) {
      throw new GameplayRejection("这个选择不在当前岔路上。");
    }
    if (progress.pendingWakeNode.partyKind) {
      const awaiting = partyWakeAwaitingIds(world, progress);
      if (!awaiting.includes(cultivator.id)) {
        throw new GameplayRejection("这一岔路不是在等你开口。");
      }
      let next = recordPartyWakeVote(progress, cultivator.id, dungeonWakeOptionId);
      const ready = next.pendingWakeNode ? partyWakeIsReady(next.pendingWakeNode, awaiting) : false;
      if (ready && next.pendingWakeNode) {
        const chosen = partyWakeResolvedOption(next.pendingWakeNode, awaiting, next.policy);
        next = resolvePartyExpeditionWake({
          world,
          progress: next,
          optionId: chosen,
          awaitingIds: awaiting,
          timedOut: false,
        });
      }
      world.dungeonExpeditions[progress.cultivatorId] = next;
      const leaderJobId = world.cultivators[progress.cultivatorId]?.activeJobId;
      if (leaderJobId && world.jobs[leaderJobId]) stampDungeonWake(world.jobs[leaderJobId], next);
      const title = next.beats?.[next.beats.length - 1]?.title;
      const summary = ready && title
        ? `${cultivator.name}在地宫里${title}。`
        : `${cultivator.name}把这一岔路的话放了下来。`;
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
    }
    const settlement = settleDungeonWakeNode(progress, dungeonWakeOptionId, "chosen");
    applyDungeonWakeSettlement(world, cultivator, settlement);
    world.dungeonExpeditions[cultivator.id] = settlement.progress;
    if (cultivator.activeJobId && world.jobs[cultivator.activeJobId]) {
      stampDungeonWake(world.jobs[cultivator.activeJobId], settlement.progress);
    }
    const summary = settlement.beat
      ? `${cultivator.name}在地宫里${settlement.beat.title}。${settlement.beat.detail}`
      : `${cultivator.name}在地宫里把这一岔路走完了。`;
    addDaoLog(world, cultivator.id, "地宫岔路", summary, ["dungeon-wake", "chosen"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }
  const sceneOptionId = parseChooseEventOption(actionId);
  if (sceneOptionId) {
    return resolveSceneChoiceAction(world, cultivator, actionId, sceneOptionId);
  }
  if (actionId === "dungeon-gate-locked") {
    const line = dungeonGateLockLine(cultivator, world.locations[cultivator.locationId]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: false,
      summary: line ?? "这一处地宫现在进得去。",
    };
  }
  if (actionId === "leave-regional") {
    const summary = leaveRegionalRun(world, cultivator);
    releaseRegionalJob(world, cultivator);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary };
  }
  if (actionId.startsWith("regional-choice:")) {
    const optionId = actionId.slice("regional-choice:".length);
    const choice = submitRegionalChoice(world, cultivator, optionId, (person) => battleCombatantFromCultivator(person));
    if (choice.done) releaseRegionalJob(world, cultivator);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: choice.summary };
  }
  if (actionId.startsWith("sect-scene:")) {
    return answerSectDutyScene(world, cultivator, actionId.slice("sect-scene:".length));
  }
  requireIdle(cultivator);
  requireSafeIfInjured(cultivator, actionId);
  const location = world.locations[cultivator.locationId];
  if (!location) throw new Error(`Location not found: ${cultivator.locationId}`);
  if (actionId.startsWith("enter-regional:")) {
    const dungeonId = actionId.slice("enter-regional:".length);
    const plan = assertRegionalEntry(world, cultivator, dungeonId);
    const started = startJob(
      world,
      cultivator,
      actionId as TimedActionId,
      plan.label,
      undefined,
      plan.durationTicks,
    );
    const summary = openRegionalRun(world, cultivator, dungeonId, started.job?.id ?? "");
    return { ...started, summary };
  }
  const breakthroughMethodResult = performBreakthroughMethodAction(world, cultivator, actionId);
  if (breakthroughMethodResult) return breakthroughMethodResult;
  const socialDeepenResult = performSocialDeepenAction(world, cultivator, actionId, speechLine);
  if (socialDeepenResult) return socialDeepenResult;
  // ---- Buy Residence ----
  const buyResidenceStateId = parseBuyResidenceStateId(actionId);
  if (buyResidenceStateId) {
    if (!canTradeAtLocation(location)) {
      throw new Error("You must be in a safe settlement to purchase a residence.");
    }
    if (stateIdFromLocationId(cultivator.locationId) !== buyResidenceStateId) {
      throw new Error("You must be in the target state to buy a residence there.");
    }
    if (hasResidenceInState(cultivator, buyResidenceStateId)) {
      throw new Error("You already own a residence in this state.");
    }
    const price = residencePriceForState(buyResidenceStateId);
    if (cultivator.spiritStones < price) {
      throw new Error(`Not enough spirit stones. Need ${price}, have ${cultivator.spiritStones}.`);
    }
    cultivator.spiritStones -= price;
    const newResidence = createResidenceForState(buyResidenceStateId, cultivator.id);
    cultivator.residences = [...cultivator.residences, newResidence];
    cultivator.residence = newResidence;
    addDaoLog(world, cultivator.id, "购入洞府", `${cultivator.name}在${getResidenceCatalogEntry(buyResidenceStateId)?.stateName ?? buyResidenceStateId}购入了${newResidence.name}，花费${price}灵石。`, ["residence", "purchase"]);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}在${getResidenceCatalogEntry(buyResidenceStateId)?.stateName ?? "这一州"}买下了${newResidence.name}，花了${price}灵石。`,
    };
  }
  const residenceSink = performResidenceGrandeurAction(world, cultivator, actionId);
  if (residenceSink) return residenceSink;
  // ---- Queue Production ----
  if (actionId.startsWith("queue-production:")) {
    const recipeId = actionId.slice("queue-production:".length);
    if (!isAtResidence(cultivator)) throw new Error("Must be at residence to queue production.");
    if ((cultivator.productionQueue?.length ?? 0) >= PRODUCTION_QUEUE_MAX_LENGTH) throw new GameplayRejection("Production queue is full.");
    if ((cultivator.productionQueue ?? []).some((entry) => entry.recipeId === recipeId)) {
      throw new GameplayRejection(`这炉「${recipeId}」已经在排队。同样的方子再排只会空耗灵材，先换个方子，或者去地宫和荒野走走。`);
    }
    const recipe = RESIDENCE_PRODUCTION_RECIPES.find((r) => r.id === recipeId && r.enabledInLive);
    if (!recipe) throw new Error(`Unknown or disabled recipe: ${recipeId}`);
    const queuedResidenceCost = discountedSpiritCost(getActiveResidence(cultivator), recipe.spiritStoneCost);
    const queuedStoneCost = regionalCraftStoneCost(cultivator, queuedResidenceCost);
    if (cultivator.spiritStones < queuedStoneCost) throw new Error(`Not enough spirit stones. Need ${queuedStoneCost}.`);
    for (const mat of recipe.inputMaterials) {
      if ((cultivator.inventory[mat.itemId] ?? 0) < mat.count) throw new Error(`Not enough ${mat.itemId}. Need ${mat.count}.`);
    }
    cultivator.spiritStones -= queuedStoneCost;
    spendRegionalCraftFiber(cultivator, queuedResidenceCost, queuedStoneCost);
    for (const mat of recipe.inputMaterials) {
      cultivator.inventory[mat.itemId] = (cultivator.inventory[mat.itemId] ?? 0) - mat.count;
    }
    if (!cultivator.productionQueue) cultivator.productionQueue = [];
    const entry: ProductionQueueEntry = {
      slot: cultivator.productionQueue.length,
      recipeId: recipe.id,
      outputItemId: recipe.outputItemId,
      outputCount: recipe.outputCount,
      consumedMaterials: recipe.inputMaterials.map((m) => ({ itemId: m.itemId, count: m.count })),
      consumedSpiritStones: queuedStoneCost,
      ticksRemaining: recipe.durationTicks,
      totalTicks: recipe.durationTicks,
    };
    cultivator.productionQueue.push(entry);
    addDaoLog(world, cultivator.id, "排队生产", `将${recipe.outputItemId}加入生产队列（位置${entry.slot}）。`, ["production", "queue"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `把${ITEM_CATALOG[recipe.outputItemId]?.name ?? "这件东西"}排进了第${entry.slot + 1}炉。` };
  }
  // ---- Cancel Production ----
  if (actionId.startsWith("cancel-production:")) {
    const slotIndex = parseInt(actionId.slice("cancel-production:".length), 10);
    if (!cultivator.productionQueue || !Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex >= cultivator.productionQueue.length) {
      throw new Error(`Invalid production queue slot: ${slotIndex}`);
    }
    const entry = cultivator.productionQueue[slotIndex]!;
    cultivator.spiritStones += entry.consumedSpiritStones;
    for (const mat of entry.consumedMaterials) {
      cultivator.inventory[mat.itemId] = (cultivator.inventory[mat.itemId] ?? 0) + mat.count;
    }
    cultivator.productionQueue.splice(slotIndex, 1);
    for (let s = 0; s < cultivator.productionQueue.length; s++) {
      cultivator.productionQueue[s]!.slot = s;
    }
    addDaoLog(world, cultivator.id, "取消生产", `取消了${entry.recipeId}的生产，材料已归还。`, ["production", "cancel"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `Cancelled production of ${entry.recipeId}. Materials returned.` };
  }
  const parsedQuestAction = parseQuestActionId(actionId);
  if (parsedQuestAction?.phase === "accept") {
    const acceptedQuest = acceptQuest(world, cultivator, parsedQuestAction.questType, parsedQuestAction.index);
    return {
      tick: world.tick,
      cultivatorId: cultivator.id,
      actionId,
      accepted: true,
      summary: `${cultivator.name}接下了${questFacingName(acceptedQuest)}。`,
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
      const produceResidenceCost = discountedSpiritCost(getActiveResidence(cultivator), recipe.spiritStoneCost);
      const produceStoneCost = regionalCraftStoneCost(cultivator, produceResidenceCost);
      const materialsReady = recipe.inputMaterials.every((material) => cultivator.inventory[material.itemId] >= material.count);
      if (cultivator.spiritStones < produceStoneCost || !materialsReady) {
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
    if (actionId === "residence-breakthrough") {
      const method = breakthroughMethodIdForLevel(cultivator.realmLevel);
      if (method && method !== "residence") {
        const narrative = breakthroughMethodNarrative({
          realmLevel: cultivator.realmLevel,
          successRate: null,
          category: null,
        });
        throw new GameplayRejection(narrative?.refusal ?? "这一阶不在洞府里破。");
      }
    }
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
      const method = breakthroughMethodIdForLevel(cultivator.realmLevel);
      if (method && method !== "residence") {
        const narrative = breakthroughMethodNarrative({
          realmLevel: cultivator.realmLevel,
          successRate: definition.baseSuccessRate,
          category: definition.category,
        });
        throw new GameplayRejection(narrative?.refusal ?? "这一阶不在洞府里破。");
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
          breakthroughCommonItemId: definition.genericMaterials[0]?.itemId,
          breakthroughCommonCount: definition.genericMaterials[0]?.count,
          breakthroughSpecialItemId: definition.specialMaterial.itemId,
          breakthroughSpecialCount: definition.specialMaterial.count,
          breakthroughSuccessRate: rateInfo.successRate ?? undefined,
          breakthroughRateBreakdown: rateInfo.rateBreakdown,
        },
        definition.durationTicks,
      );
    }
    return startJob(world, cultivator, actionId, actionId);
  }
  const travelDestination = parseTravelDestination(actionId);
  const questAction = parseQuestActionId(actionId);
  const exploreGuixuNodeId = parseExploreGuixuNode(actionId);
  const startDungeonExpedition = parseStartDungeonExpeditionActionId(actionId);
  const enterDungeon = parseEnterDungeonActionId(actionId);
  const searchFortuneRank = parseSearchFortuneRank(actionId);
  const challengeGuardianRank = parseChallengeGuardianRank(actionId);
  if (travelDestination || questAction?.phase === "execute" || exploreGuixuNodeId || startDungeonExpedition || enterDungeon || searchFortuneRank || challengeGuardianRank || parseSectTaskId(actionId) || isSectTimedAction(actionId) || TIMED_ACTION_IDS.has(actionId)) {
    if (travelDestination) {
      const destination = world.locations[travelDestination];
      if (!destination) throw new Error(`Travel destination not found: ${travelDestination}`);
      const directNeighbor = getNeighborLocations(world, cultivator.locationId).some((neighbor) => neighbor.locationId === travelDestination);
      if (!directNeighbor) throw new Error("Travel destination is not directly reachable from current location.");
      const placeName = destination.nodeType === "wilderness"
        ? (wildPlaceForState(destination.stateId)?.name ?? destination.name)
        : destination.name;
      return startJob(world, cultivator, actionId as TimedActionId, `前往${placeName}`);
    }
    if (questAction?.phase === "execute") {
      const quest = getActiveQuestByReadableIndex(cultivator, questAction.questType, questAction.index);
      if (!quest) throw new Error(`Active quest not found: ${questAction.questType}:${questAction.index}`);
      markQuestInProgress(cultivator, quest.id);
      return startJob(world, cultivator, actionId as TimedActionId, `去做：${questFacingName(quest)}`, {
        activeQuestId: quest.id,
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
      const surveyPlace = wildPlaceForState(world.locations[cultivator.locationId]?.stateId)?.name ?? "这一层";
      const surveyResult = startJob(world, cultivator, actionId as TimedActionId, `再探${surveyPlace}`, {
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
        pvpCombat.initialEnemySnapshot = structuredClone(opponentSnapshot);
        pvpCombat.enemyStatusEffectsBefore = structuredClone(opponent?.statusEffects ?? []);
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
      if (partner.activeJobId) throw new Error(`${partner.name}正忙着，这趟等对方空了再来。`);
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
      return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name}和${partner.name}开始同行历练：${task.nameCn}。` };
    }
    // ---- Dual Cultivate (同行修炼) ----
    if (actionId === "dual-cultivate") {
      const partner = getPartyPartner(world, cultivator.id);
      if (!partner) throw new Error("同行修炼 requires being in a party.");
      if (partner.activeJobId) throw new Error(`${partner.name}正忙着，这趟等对方空了再来。`);
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
      return startJob(world, cultivator, actionId as TimedActionId, `探${node.name}`, {
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
        throw new GameplayRejection(dungeonGateLockLine(cultivator, location) ?? "这一处地宫现在进不去。");
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
      assertMysteryRank(cultivator, metadata.grade, parsedExpedition.rank);
      const started = startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        `地宫远征：${metadata.grade}级第${parsedExpedition.rank}阶（${dungeonPostureLabel(parsedExpedition.policy)}）`,
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
      const expeditionProgress = createDungeonExpeditionProgress({
        cultivatorId: cultivator.id,
        jobId: started.job.id,
        locationId: cultivator.locationId,
        grade: metadata.grade,
        targetRank: parsedExpedition.rank,
        policy: parsedExpedition.policy,
        strategy: parsedExpedition.strategy,
        startedAtTick: world.tick,
      });
      const atGate = getPartyMembers(world, cultivator.id)
        .filter((member) => member.locationId === cultivator.locationId);
      const sharing = atGate.filter((member) => !member.activeJobId).slice(0, PARTY_MAX_MEMBERS - 1);
      if (sharing.length > 0) {
        expeditionProgress.companionIds = sharing.map((member) => member.id);
        expeditionProgress.companionId = sharing[0]!.id;
      }
      world.dungeonExpeditions[cultivator.id] = expeditionProgress;
      if (sharing.length > 0) {
        seedSharedMoments(world, expeditionProgress, [cultivator, ...sharing]);
      }
      if (atGate.length > 0) {
        const placeName = location.name;
        const sharingNames = sharing.map((member) => member.name).join("、");
        for (const member of atGate) {
          const bound = sharing.some((candidate) => candidate.id === member.id);
          addMutualAffinity(world, cultivator.id, member.id, AFFINITY_GAINS.sharedWilderness);
          const inviteDetail = bound
            ? `${cultivator.name}在${placeName}拉上${sharingNames}一起下${parsedExpedition.rank}阶。人就在门口。出来时还在身边的人，会分到灵石，也会分到伤。`
            : `${cultivator.name}在${placeName}开始了${parsedExpedition.rank}阶探索。${member.name}就在门口。想进去的话，自己也能进。`;
          addMessage(world, member.id, "地宫", "同行的人进了地宫", inviteDetail, { fromCultivatorId: cultivator.id });
          pushTravelNote(cultivator, travelNote({
            tick: world.tick,
            kind: "person",
            title: `邀${member.name}一起下地宫`,
            detail: inviteDetail,
            locationId: cultivator.locationId,
            mood: "门口还有自己人",
          }));
          pushTravelNote(member, travelNote({
            tick: world.tick,
            kind: "person",
            title: `${cultivator.name}进了地宫`,
            detail: inviteDetail,
            locationId: member.locationId,
            mood: "同伴先走了进去",
          }));
        }
      }
      return started;
    }
    if (searchFortuneRank || challengeGuardianRank) {
      const metadata = dungeonMetadataOf(location);
      if (!metadata) {
        throw new Error("Action only available in dungeons.");
      }
      if (!meetsRealmRequirement(cultivator, metadata.minRealm)) {
        throw new GameplayRejection(dungeonGateLockLine(cultivator, location) ?? "这一处地宫现在进不去。");
      }
      const selectedRank = (searchFortuneRank ?? challengeGuardianRank)!;
      const highestUnlockedRank = highestUnlockedRankOf(cultivator, metadata.grade);
      if (selectedRank > highestUnlockedRank) {
        throw new Error(`Dungeon rank ${selectedRank} is not unlocked.`);
      }
      assertMysteryRank(cultivator, metadata.grade, selectedRank);
      if (challengeGuardianRank !== null) {
        const cgStartSeed = hashString(`${world.tick}:${cultivator.id}:guardian-encounter:${metadata.grade}:${challengeGuardianRank}`);
        const cgStartEncounter = resolveGuardianEncounterTemplate(cgStartSeed);
        const jobResult = startJob(
          world,
          cultivator,
          actionId as TimedActionId,
          `守第${selectedRank}关`,
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
          stampJiaGuardianTemplate(cgStartEncounter.template, metadata.grade, challengeGuardianRank),
          guardianCombatScale(metadata.grade, challengeGuardianRank) * jiaDirectEncounterScale(metadata.grade, challengeGuardianRank),
          cgStartEncounter.buildId ?? undefined,
        );
        setCombatJobState(jobResult.job, combatState);
        return jobResult;
      }
      return startJob(
        world,
        cultivator,
        actionId as TimedActionId,
        `${searchFortuneRank ? "探宝" : "守关"}：第${selectedRank}阶`,
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
      return startJob(world, cultivator, actionId as TimedActionId, `宗门差事：${taskTpl.nameCn}`, undefined, taskTpl.durationTicks);
    }
    if (actionId === "take-neutral-duty") {
      const neutralSect = getCultivatorNeutralSect(world, cultivator);
      if (!neutralSect || cultivator.locationId !== neutralSect.headquarters) {
        throw new Error("Neutral duty requires neutral sect membership at its headquarters.");
      }
    }
    if (actionId === "band-errand:weapon" || actionId === "band-errand:manual") {
      if (!atOwnSectHall(world, cultivator)) {
        throw new GameplayRejection("这趟差事要在自己宗门的驻地跑。");
      }
      const kind = actionId === "band-errand:weapon" ? "weapon" as const : "spell" as const;
      const offer = gearOffer(cultivator, kind);
      if (!offer || offer.tier < 4 || !offer.reachable) {
        throw new GameplayRejection("这一阶还不用跑宗门差事。坊市买得到，或境界还没到。");
      }
      if ((cultivator.bandErrandReadyTick ?? 0) > world.tick) {
        throw new GameplayRejection("这一趟差事刚跑过。隔六个时辰再来。");
      }
    }
    if (actionId === "heal" && !canHealAtLocation(location)) throw new Error("Heal requires a safe location.");
    if (isSectTimedAction(actionId)) {
      const spec = beginSectTimed(world, cultivator, actionId);
      return startJob(world, cultivator, actionId as TimedActionId, spec.label, undefined, spec.ticks);
    }
    return startJob(world, cultivator, actionId as TimedActionId, actionId);
  }
  return immediateAction(world, cultivator, actionId, speechLine, bodyItemId);
}

function settleFailedTimedJob(world: WorldState, job: ActionJob, error: unknown): string {
  const message = error instanceof Error ? error.message : "Action failed.";
  const cultivator = world.cultivators[job.cultivatorId];
  if (!cultivator) {
    return `Action ended early: ${message}`;
  }
  cultivator.activeJobId = null;
  const progress = world.dungeonExpeditions[cultivator.id];
  if (progress && progress.jobId === job.id) {
    try {
      const report = finalizeDungeonExpedition(world, cultivator, progress, "withdrew");
      pushTravelNote(cultivator, travelNote({
        tick: world.tick,
        kind: "setback",
        title: "地宫中断",
        detail: report.summary,
        locationId: cultivator.locationId,
        mood: "人出来了，这一趟不算完",
      }));
      recordLife(cultivator, { tick: world.tick, kind: "fight", text: report.summary });
      return report.summary;
    } catch {
      delete world.dungeonExpeditions[cultivator.id];
      cultivator.locationId = safeExpeditionReturnLocationId(world, cultivator.locationId);
    }
  }
  const summary = `${cultivator.name} 的行动提前结束：${message}。人已经空出来，世界仍在往前走。`;
  addDaoLog(world, cultivator.id, "行动中断", summary, ["action-failed", job.actionId]);
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "行动中断",
    content: summary,
    severity: "medium",
    tags: ["action-failed", job.actionId],
  });
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "setback",
    title: "行动中断",
    detail: summary,
    locationId: cultivator.locationId,
    mood: "事情没做成，人还在",
  }));
  return summary;
}

export function advanceWorld(world: WorldState, steps: number): TickSummary {
  ensureOptionalProgressMaps(world);
  const safeSteps = clamp(Math.floor(steps), 1, 200); const completedJobs: TickSummary["completedJobs"] = []; const triggeredEvents: WorldEvent[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    world.tick += 1;
    settleVeinYields(world);
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
      // ---- Production Queue tick advancement ----
      if (cultivator.productionQueue && cultivator.productionQueue.length > 0) {
        const front = cultivator.productionQueue[0]!;
        front.ticksRemaining -= 1;
        if (front.ticksRemaining <= 0) {
          cultivator.inventory[front.outputItemId] = (cultivator.inventory[front.outputItemId] ?? 0) + front.outputCount;
          addResourceGainLog(world, cultivator.id, "生产完成", `炼制完成：${front.outputItemId} x${front.outputCount}。`, ["production"], [{ itemId: front.outputItemId as ItemId, count: front.outputCount }]);
          cultivator.productionQueue.shift();
          for (let s = 0; s < cultivator.productionQueue.length; s++) {
            cultivator.productionQueue[s]!.slot = s;
          }
        }
      }
      applyWildernessPressure(world, cultivator);
      advanceBahuangExpedition(world, cultivator);
      // PVP challenge auto-expiry
      if (cultivator.pendingPvpChallengeId) {
        const pvpChallenge = world.pendingPvpChallenges[cultivator.pendingPvpChallengeId];
        if (!pvpChallenge) {
          cultivator.pendingPvpChallengeId = null;
        } else {
          const invalidReason = getPendingPvpChallengeInvalidReason(world, pvpChallenge);
          if (invalidReason !== null) {
            cancelPendingPvpChallenge(world, pvpChallenge, invalidReason);
          }
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
            if (existing && existing.affinity > 0 && !grudgeArcOf(existing.grudge ?? 0)) {
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
    expireSocialDeepen(world);
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
      try {
      job.remainingTicks -= 1;
      const combatState = getCombatJobState(job);
      if (combatState && !combatState.resolved) {
        const cultivator = world.cultivators[job.cultivatorId];
        if (cultivator) {
          const cityDuel = job.actionId === "pvp-duel" && (combatState.pvpBattleKind ?? "city-duel") === "city-duel";
          if (cityDuel) {
            try {
              if (!resolveCityDuelWithSkills(world, job, cultivator, combatState)) {
                resolveOneRound(combatState, world, job, cultivator);
              }
            } catch {
              resolveOneRound(combatState, world, job, cultivator);
            }
          } else {
            resolveOneRound(combatState, world, job, cultivator);
          }
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
          const roadPlace = world.locations[travelDestination];
          if (roadPlace?.nodeType === "wilderness" && job.meta?.wildSighting !== true) {
            const wild = wildPlaceForState(roadPlace.stateId);
            if (wild) {
              noteWild(cultivator, {
                tick: world.tick,
                locationId: cultivator.locationId,
                title: "路上的见闻",
                detail: `${wild.name}这一段的见闻：${wild.road}`,
              });
              job.meta = { ...(job.meta ?? {}), wildSighting: true };
            }
          }
          const roll = hashString(`${world.tick}:${job.id}:${cultivator.id}:travel-event`) % 100;
          if (roll < 30) {
            const seed = `${world.tick}:${cultivator.id}:${job.id}:travel`;
            const flavorCount = job.meta?.travelFlavorEventCount ?? 0;
            const flavorBudget = Math.max(0, 2 - flavorCount);
            const preview = drawEvent(world, "travel", cultivator, cultivator.locationId, seed);
            if (preview && preview.template.signalType === "flavor" && flavorBudget <= 0) {
              // Flavor cap reached — skip this event
            } else {
              const events = triggerLocationEvent(
                world,
                cultivator,
                "travel",
                cultivator.locationId,
                seed,
                { flavorBudget },
              );
              const emittedFlavorCount = events.filter((event) => event.tags.includes("signal-type:flavor")).length;
              if (emittedFlavorCount > 0) {
                job.meta = { ...job.meta, travelFlavorEventCount: flavorCount + emittedFlavorCount };
              }
              triggeredEvents.push(...events);
            }
          }
        }
      }

      const activeDungeonExpedition = getActiveDungeonExpedition(world, job.cultivatorId);
      if (activeDungeonExpedition && activeDungeonExpedition.jobId === job.id && isDungeonExpeditionActionId(job.actionId)) {
        resolveDungeonExpeditionStepIfDue(world, job, activeDungeonExpedition);
      }
      if (String(job.actionId).startsWith("enter-regional:")) {
        tickRegionalRun(world, job, (person) => battleCombatantFromCultivator(person));
      }
      holdSectDutyScene(world, job);

      if (job.remainingTicks > 0 && !(combatState?.resolved)) {
        continue;
      }

      const summary = resolveEnhancedJob(world, job);
      completedJobs.push({ cultivatorId: job.cultivatorId, actionId: job.actionId, summary });
      addDaoLog(world, job.cultivatorId, "行动完成", summary, ["action-complete", job.actionId]);
      delete world.jobs[job.id];
      } catch (error) {
        const summary = settleFailedTimedJob(world, job, error);
        completedJobs.push({ cultivatorId: job.cultivatorId, actionId: job.actionId, summary });
        delete world.jobs[job.id];
      }
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
    title: eventTitle("choice", choice.title),
    content: `${cultivator.name}选了${option.label}。${option.summary}`,
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
    summary: `${cultivator.name}在「${choice.title}」上选了${option.label}。`,
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
  const SECT_APPLICATION_GAP_TICKS = 12;
  if (
    typeof cultivator.lastSectApplicationTick === "number"
    && world.tick - cultivator.lastSectApplicationTick < SECT_APPLICATION_GAP_TICKS
  ) {
    const wait = SECT_APPLICATION_GAP_TICKS - (world.tick - cultivator.lastSectApplicationTick);
    throw new GameplayRejection(`刚递过入派申请，宗门的人还记得你的脸。再等 ${wait} 个时辰再投别家，或者先去地宫走走。`);
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
  cultivator.lastSectApplicationTick = world.tick;
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
