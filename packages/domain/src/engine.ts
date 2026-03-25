import type {
  AgentBinding, AgentPersonaSyncResult, ActionExecutionResult, ActionId, ActionJob, AvailableAction, CharacterSummary,
  CombatLogEntry, CultivationRegistrationRecord, CultivationRegistrationView, Cultivator, CultivatorStateView,
  CreateCultivatorInput, DecisionPolicyView, FactionId, FiveElementId, ItemId, Message, RegistrationAnswer,
  NeutralSect, OrganizationInfoView, RegistrationGameplayEffectsView, RegistrationGameplayModifierView,
  RegistrationQuestionId, ResidenceActionId, SectTitle, StatusEffect, TimedActionId, StrategySnapshot, TickSummary,
  WorldEvent, WorldState, OnboardingProgress, OnboardingStage,
} from "./model.js";
import {
  DEFAULT_ACTION_DURATIONS,
  NEUTRAL_SECTS_BY_STATE,
  RESIDENCE_PRODUCTION_RECIPES,
  STARTER_STATES,
  type StateId,
} from "./constants.js";
import { applyEventEffects, drawEvent, eventSeverityOf, type EventSourceType } from "./events.js";
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
import {
  resolveBehaviorAspectId,
  normalizeCultivationRegistrationRecord,
  resolveCultivationMotiveId,
  resolveSpiritRootKindId,
  resolveTemperamentId,
} from "./registration-taxonomy.js";
import { createEmptyInventory, createFactionReputation } from "./seed.js";
import { getDistance, getNeighbors, type TopologyGraph as RuntimeTopologyGraph } from "./topology.js";

const TICKS_PER_YEAR = 4380;
const TIMED_ACTION_IDS = new Set<string>(Object.keys(DEFAULT_ACTION_DURATIONS));
const DEFAULT_STARTER_STATE = STARTER_STATES[0];
const FACTION_NAMES: Record<FactionId, string> = {
  townsfolk: "Townsfolk", "market-guild": "Market Guild", "qing-yun-sect": "Qing Yun Sect", "rogue-cultivators": "Rogue Cultivators",
};
const ELEMENT_LABELS: Record<FiveElementId, string> = {
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  fire: "Fire",
  earth: "Earth",
};
const REALM_QI = "炼气" as Cultivator["realm"];
const REALM_FOUNDATION = "筑基" as Cultivator["realm"];
const REALM_CORE = "金丹" as Cultivator["realm"];
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
const MANUAL_TECHNIQUES: Record<"study-sword-manual" | "study-alchemy-manual" | "study-array-manual", { itemId: ItemId; technique: string; summary: string; effect: StatusEffect }> = {
  "study-sword-manual": { itemId: "sword-manual", technique: "青霄剑意", summary: "Learned a sword manual and sharpened combat instincts.", effect: { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "manual", remainingTicks: 5, intensity: 1 } },
  "study-alchemy-manual": { itemId: "alchemy-manual", technique: "回元火候", summary: "Learned an alchemy manual and stabilized recovery.", effect: { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "manual", remainingTicks: 6, intensity: 1 } },
  "study-array-manual": { itemId: "array-manual", technique: "护脉阵纹", summary: "Learned an array manual and improved protection.", effect: { id: "warded", name: "Warded", description: "Lower combat risk.", source: "manual", remainingTicks: 6, intensity: 1 } },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hashString = (input: string) => Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
const travelActionIdOf = (locationId: string) => `travel-to:${locationId}` as const;
const parseTravelDestination = (actionId: ActionId) => actionId.startsWith("travel-to:") ? actionId.slice("travel-to:".length) : null;
const parseAcceptQuestId = (actionId: ActionId) => actionId.startsWith("accept-quest:") ? actionId.slice("accept-quest:".length) : null;
const parseExecuteQuestId = (actionId: ActionId) => actionId.startsWith("execute-quest:") ? actionId.slice("execute-quest:".length) : null;
const parseResidenceOption = (actionId: ActionId, prefix: string) => actionId.startsWith(prefix) ? actionId.slice(prefix.length) : null;
const parseJoinNeutralSectId = (actionId: ActionId) =>
  actionId.startsWith("join-neutral-sect:") ? actionId.slice("join-neutral-sect:".length) : null;
const topologyOf = (world: WorldState) => world.topology as unknown as RuntimeTopologyGraph;
const getDistanceBetween = (world: WorldState, fromLocationId: string, toLocationId: string) =>
  getDistance(topologyOf(world), fromLocationId as never, toLocationId as never);
const getNeighborLocations = (world: WorldState, locationId: string) =>
  getNeighbors(topologyOf(world), locationId as never).map((neighbor) => ({ locationId: neighbor.locationId as string, ticks: neighbor.ticks }));
const isMainCityNode = (nodeType: string) => nodeType === "main-city";
const isSubTownNode = (nodeType: string) => nodeType.startsWith("sub-town-");
const isDungeonNode = (nodeType: string) => nodeType.startsWith("dungeon-");
const stateIdFromLocationId = (locationId: string) => locationId.split(":")[0] as StateId;
const mainCityLocationIdOf = (stateId: StateId) => `${stateId}:main-city`;
const canTradeAtLocation = (location: { kind: string; nodeType: string }) => location.kind === "safe" && (isMainCityNode(location.nodeType) || isSubTownNode(location.nodeType));
const canHealAtLocation = (location: { kind: string }) => location.kind === "safe";
const isLowRiskAction = (actionId: ActionId) =>
  actionId === "meditate"
  || actionId === "heal"
  || actionId === "residence-recover-qi"
  || actionId === "residence-heal"
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
function getLocalNeutralSect(world: WorldState, locationId: string): NeutralSect | null {
  const location = world.locations[locationId];
  if (!location || location.nodeType !== "main-city") {
    return null;
  }
  const definition = NEUTRAL_SECTS_BY_STATE[location.stateId as StateId];
  if (!definition) {
    return null;
  }
  return world.neutralSects[definition.id] ?? null;
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
  const drawn = drawEvent(world, source, cultivator, locationId, seed);
  if (!drawn) {
    return [];
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
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A cutting core sharpens decisive combat and manual study.", { combatBonus: 4, studyBonus: 2 });
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
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Truth-seeking improves manual study, ruins scouting, and measured growth.", { studyBonus: 4, fortuneBonus: 3, cultivateBonus: 1 });
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
  const duration = travelDestination
    ? getDistanceBetween(world, cultivator.locationId, travelDestination)
    : executeQuestId
      ? (cultivator.activeQuests.find((quest) => quest.id === executeQuestId)?.durationTicks ?? NaN)
      : DEFAULT_ACTION_DURATIONS[actionId];
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
  return { techniques: ["Loose Breathing", "Light Body"], spiritStones: 360, inventory: { ...createEmptyInventory(), "healing-pill": 1, "qi-pill": 1 }, reputation: 12, factionReputation: createFactionReputation({ townsfolk: 8, "qing-yun-sect": 0, "market-guild": 4, "rogue-cultivators": 6 }) };
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
  const cultivator: Cultivator = { id: cultivatorId, name, genderPresentation: input.genderPresentation ?? "unspecified", pronouns: input.pronouns?.trim() || "TA/TA", origin: input.origin?.trim() || "Yun Province", temperament: input.temperament?.trim() || "Cautious", createdByAgentId: agentId, realm: REALM_QI, realmLevel: 1, realmProgress: 0, locationId: starterLocationId, residence: defaultResidenceAt(starterLocationId, cultivatorId), spiritStones: starter.spiritStones, qi: 100, maxQi: 100, spiritualPower: 100, maxSpiritualPower: 100, karma: 0, reputation: starter.reputation, factionReputation: starter.factionReputation, lifespan: 160, age: clamp(input.age ?? 18, 16, 80), sectId: null, neutralSectId: null, sectTitle: null, totalContribution: 0, neutralContribution: 0, contributionReachedAt: 0, activeQuests: [], completedBaseQuests: 0, techniques: starter.techniques, inventory: starter.inventory, statusEffects: [], activeJobId: null, injuryTicksRemaining: 0, registrationRecord: null };
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
function buyPrice(cultivator: Cultivator, base: number) { return Math.max(Math.floor(base * 0.65), base - Math.max(0, Math.min(50, Math.floor((cultivator.factionReputation["market-guild"] ?? 0) / 15) * 10))); }
function sellPrice(cultivator: Cultivator, base: number) { return Math.max(15, base + Math.max(-20, Math.min(40, Math.floor((cultivator.factionReputation["market-guild"] ?? 0) / 20) * 10))); }
function guidance(world: WorldState, cultivator: Cultivator) {
  const registration = registrationModifiersOf(cultivator);
  const location = world.locations[cultivator.locationId];
  const readiness = computeReadiness(cultivator);
  const recoveryState = computeRecoveryState(cultivator);
  const canHealHere = location ? canHealAtLocation(location) : false;
  const nearestSafeLocationId = findNearestLocationId(world, cultivator.locationId, (candidate) => canHealAtLocation(candidate));
  const safeTravelAction = nearestSafeLocationId ? travelActionIdOf(nearestSafeLocationId) : "meditate";
  const nearestMainCityId = findNearestLocationId(world, cultivator.locationId, (candidate) => isMainCityNode(candidate.nodeType));
  const mainCityTravelAction = nearestMainCityId ? travelActionIdOf(nearestMainCityId) : "meditate";
  const nearestDungeonId = findNearestLocationId(world, cultivator.locationId, (candidate) => isDungeonNode(candidate.nodeType));
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
  if (cultivator.inventory["sword-manual"] + cultivator.inventory["alchemy-manual"] + cultivator.inventory["array-manual"] > 0) priorities.push("Study manuals before the next long action.");
  if (hasEffect(cultivator, "insight")) priorities.push("Insight is active. Use it on cultivation or a major encounter.");
  if (hasEffect(cultivator, "spirit-saturated")) priorities.push("Spirit saturation is active. Good time for cultivation.");
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
        suggestedActions.push(mainCityTravelAction);
      }
    }
    if (registration.fortuneBonus >= 8) suggestedActions.push(location && isDungeonNode(location.nodeType) ? "search-fortune" : dungeonTravelAction);
    if (registration.mineBonus >= 6) suggestedActions.push(location?.nodeType === "wilderness" ? "mine-spirit-stones" : wildernessTravelAction);
    if (registration.cultivateBonus >= 8) suggestedActions.push("cultivate");
  }
  if (cultivator.inventory["sword-manual"] > 0) suggestedActions.push("study-sword-manual");
  if (cultivator.inventory["alchemy-manual"] > 0) suggestedActions.push("study-alchemy-manual");
  if (cultivator.inventory["array-manual"] > 0) suggestedActions.push("study-array-manual");
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
    return "Keep cultivating safely until your first breakthrough.";
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
    return cultivator.locationId === cultivator.residence.locationId
      ? "residence-meditate"
      : (`travel-to:${cultivator.residence.locationId}` as ActionId);
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

export function getCultivatorState(world: WorldState, cultivatorId: string): CultivatorStateView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId); const location = world.locations[cultivator.locationId]; const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null; const neutralSect = getCultivatorNeutralSect(world, cultivator);
  const policy = decisionPolicy();
  const derivedState = {
    readiness: computeReadiness(cultivator),
    recoveryState: computeRecoveryState(cultivator),
    activityContext: computeActivityContext(cultivator, world),
    daoPotential: computeDaoPotential(cultivator),
  };
  return {
    tick: world.tick,
    cultivator: { id: cultivator.id, name: cultivator.name, realm: cultivator.realm, realmLevel: cultivator.realmLevel, realmProgress: cultivator.realmProgress, status: statusOf(cultivator), location: location?.name ?? cultivator.locationId, spiritStones: cultivator.spiritStones, qi: cultivator.qi, maxQi: cultivator.maxQi, spiritualPower: cultivator.spiritualPower, maxSpiritualPower: cultivator.maxSpiritualPower, karma: cultivator.karma, reputation: cultivator.reputation, lifespan: cultivator.lifespan, age: Number(cultivator.age.toFixed(2)), genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament },
    cultivation: { mainTechnique: cultivator.techniques[0] ?? "Basic Breathing", techniques: cultivator.techniques },
    neutralSect: neutralSect ? { id: neutralSect.id, name: neutralSect.name, stateId: neutralSect.stateId, headquarters: neutralSect.headquarters, role: "member", memberCount: neutralSect.memberIds.length, neutralContribution: cultivator.neutralContribution, rewardMultiplier: neutralSect.rewardMultiplier, competitive: false } : null,
    sect: sect ? { id: sect.id, name: sect.name, role: cultivator.sectTitle ?? "外门", treasury: sect.treasury, memberCount: sect.memberIds.length } : null,
    inventory: cultivator.inventory,
    inventoryDetails: Object.entries(cultivator.inventory).filter(([, count]) => count > 0).map(([itemId, count]) => ({ id: itemId as ItemId, name: world.itemDefinitions[itemId as ItemId].name, category: world.itemDefinitions[itemId as ItemId].category, description: world.itemDefinitions[itemId as ItemId].description, count, baseValue: world.itemDefinitions[itemId as ItemId].baseValue })),
    currentJob: cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
    nearbyOpportunities: [location && canTradeAtLocation(location) ? "Sell or buy supplies." : "Move for a better opportunity.", location?.nodeType === "wilderness" ? "Mine or hunt a beast." : "Stay aware of local events."],
    statusEffects: cultivator.statusEffects.map((effect) => ({ id: effect.id, name: effect.name, description: effect.description, remainingTicks: effect.remainingTicks, source: effect.source })),
    factionReputation: (Object.keys(cultivator.factionReputation) as FactionId[]).map((factionId) => ({ factionId, name: FACTION_NAMES[factionId], value: cultivator.factionReputation[factionId], standing: standing(cultivator.factionReputation[factionId]) })),
    recentEvents: getRecentWorldEvents(world, cultivatorId, 5),
    recentCombats: getCombatLogs(world, cultivatorId, 4),
    registration: registrationViewOf(cultivator),
    registrationEffects: registrationEffectsViewOf(cultivator),
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
  const cultivator = getCultivatorOrThrow(world, cultivatorId); if (cultivator.activeJobId) return [];
  const location = world.locations[cultivator.locationId];
  if (!location) throw new Error(`Location not found: ${cultivator.locationId}`);
  const localNeutralSect = getLocalNeutralSect(world, cultivator.locationId);
  const joinedNeutralSect = getCultivatorNeutralSect(world, cultivator);
  const actions: AvailableAction[] = getNeighborLocations(world, cultivator.locationId)
    .map(({ locationId: neighborId, ticks }) => ({
      actionId: travelActionIdOf(neighborId) as ActionId,
      label: `Travel to ${world.locations[neighborId]?.name ?? neighborId}`,
      description: `Travel to ${world.locations[neighborId]?.name ?? neighborId}.`,
      durationTicks: ticks,
      kind: "timed" as const,
    }));
  actions.push({ actionId: "meditate", label: "Meditate", description: "Recover spiritual power.", durationTicks: DEFAULT_ACTION_DURATIONS.meditate, kind: "timed" });
  if (cultivator.inventory["healing-pill"] > 0) actions.push({ actionId: "use-healing-pill", label: "Use healing pill", description: "Restore qi.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["qi-pill"] > 0) actions.push({ actionId: "use-qi-pill", label: "Use qi pill", description: "Restore spiritual power.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["ward-talisman"] > 0) actions.push({ actionId: "use-ward-talisman", label: "Use ward talisman", description: "Gain warded status.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["sword-manual"] > 0) actions.push({ actionId: "study-sword-manual", label: "Study sword manual", description: "Consume a manual for a new technique and insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["alchemy-manual"] > 0) actions.push({ actionId: "study-alchemy-manual", label: "Study alchemy manual", description: "Consume a manual for recovery-focused insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["array-manual"] > 0) actions.push({ actionId: "study-array-manual", label: "Study array manual", description: "Consume a manual for protective insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.injuryTicksRemaining > 0) {
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
      );
      return ensureSafetyNetActions(world, cultivator, location, actions);
    }
    if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "Heal", description: "Recover injuries.", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
    return ensureSafetyNetActions(world, cultivator, location, actions);
  }
  if (isAtResidence(cultivator)) {
    const recipeActions = RESIDENCE_PRODUCTION_RECIPES.map((recipe) => ({
      actionId: `residence-produce:${recipe.id}` as ActionId,
      label: `Residence produce (${recipe.outputItemId})`,
      description: `Craft ${recipe.outputItemId} at residence.`,
      durationTicks: DEFAULT_ACTION_DURATIONS["residence-produce"],
      kind: "timed" as const,
    }));
    actions.push(
      {
        actionId: "residence-meditate",
        label: "Residence meditate",
        description: "Closed-door cultivation at residence.",
        durationTicks: DEFAULT_ACTION_DURATIONS["residence-meditate"],
        kind: "timed",
      },
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
  actions.push({ actionId: "cultivate", label: "Cultivate", description: "Spend spirit stones to gain progress.", durationTicks: DEFAULT_ACTION_DURATIONS.cultivate, kind: "timed" });
  if (location.kind === "safe") actions.push({ actionId: "take-mortal-task", label: "Take town task", description: "Stable income.", durationTicks: DEFAULT_ACTION_DURATIONS["take-mortal-task"], kind: "timed" });
  if (canTradeAtLocation(location)) {
    actions.push({ actionId: "buy-healing-pill", label: "Buy healing pill", description: `${buyPrice(cultivator, 100)} spirit stones.`, durationTicks: 0, kind: "immediate" }, { actionId: "buy-qi-pill", label: "Buy qi pill", description: `${buyPrice(cultivator, 60)} spirit stones.`, durationTicks: 0, kind: "immediate" }, { actionId: "buy-ward-talisman", label: "Buy ward talisman", description: `${buyPrice(cultivator, 180)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["spirit-ore"] > 0) actions.push({ actionId: "sell-spirit-ore", label: "Sell spirit ore", description: `${sellPrice(cultivator, 115)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["ruin-fragment"] > 0) actions.push({ actionId: "sell-ruin-fragment", label: "Sell ruin fragment", description: `${sellPrice(cultivator, 145)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["beast-core"] > 0) actions.push({ actionId: "sell-beast-core", label: "Sell beast core", description: `${sellPrice(cultivator, 210)} spirit stones.`, durationTicks: 0, kind: "immediate" });
  }
  if (location.nodeType === "main-city") {
    if (!cultivator.sectId && !cultivator.neutralSectId && localNeutralSect?.joinable) {
      actions.push({ actionId: `join-neutral-sect:${localNeutralSect.id}`, label: `Join ${localNeutralSect.name}`, description: "Join the local neutral organization for a safer progression loop.", durationTicks: 0, kind: "immediate" });
    }
    if (joinedNeutralSect?.headquarters === cultivator.locationId) {
      actions.push({ actionId: "take-neutral-duty", label: "Take neutral duty", description: "A safe but slower organization duty.", durationTicks: DEFAULT_ACTION_DURATIONS["take-neutral-duty"], kind: "timed" });
      actions.push({ actionId: "leave-neutral-sect", label: "Leave neutral sect", description: "End neutral sect membership and reset neutral contribution.", durationTicks: 0, kind: "immediate" });
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
  if (location.nodeType === "wilderness") actions.push({ actionId: "mine-spirit-stones", label: "Mine spirit stones", description: "Gather stones and ore.", durationTicks: DEFAULT_ACTION_DURATIONS["mine-spirit-stones"], kind: "timed" }, { actionId: "hunt-mine-beast", label: "Hunt mine beast", description: "PVE combat for better loot.", durationTicks: DEFAULT_ACTION_DURATIONS["hunt-mine-beast"], kind: "timed" });
  if (isDungeonNode(location.nodeType)) actions.push({ actionId: "search-fortune", label: "Search ruins", description: "Look for fragments and gains.", durationTicks: DEFAULT_ACTION_DURATIONS["search-fortune"], kind: "timed" }, { actionId: "challenge-guardian", label: "Challenge guardian", description: "PVE combat for rare loot.", durationTicks: DEFAULT_ACTION_DURATIONS["challenge-guardian"], kind: "timed" });
  if (canHealAtLocation(location)) actions.push({ actionId: "heal", label: "Heal", description: "Recover qi and injuries.", durationTicks: DEFAULT_ACTION_DURATIONS.heal, kind: "timed" });
  return ensureSafetyNetActions(world, cultivator, location, actions);
}

function requireIdle(cultivator: Cultivator) { if (cultivator.activeJobId) throw new Error("Cultivator is already executing another action."); }
function isResidenceAction(actionId: ActionId): actionId is ResidenceActionId {
  return actionId.startsWith("residence-") && !actionId.startsWith("residence-produce:") && !actionId.startsWith("residence-heal:") && !actionId.startsWith("residence-recover-qi:");
}
function requireSafeIfInjured(cultivator: Cultivator, actionId: ActionId) {
  if (cultivator.injuryTicksRemaining <= 0) return;
  const allowed = new Set<ActionId>(["meditate", "heal", "residence-heal", "residence-recover-qi", "residence-heal:use-pill", "residence-heal:no-pill", "residence-recover-qi:use-pill", "residence-recover-qi:no-pill", "use-healing-pill", "use-qi-pill", "use-ward-talisman", "study-sword-manual", "study-alchemy-manual", "study-array-manual", "buy-healing-pill", "buy-qi-pill", "buy-ward-talisman", "sell-spirit-ore", "sell-ruin-fragment", "sell-beast-core", "take-neutral-duty", "leave-neutral-sect"]);
  if (actionId.startsWith("travel-to:")) return;
  if (actionId.startsWith("join-neutral-sect:")) return;
  if (!allowed.has(actionId)) throw new Error("Cultivator is injured and can only do safe actions.");
}
function startJob(
  world: WorldState,
  cultivator: Cultivator,
  actionId: TimedActionId,
  label: string,
  meta?: ActionJob["meta"],
): ActionExecutionResult {
  const job = createJob(world, cultivator.id, actionId, label);
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
  const income = sellPrice(cultivator, base); cultivator.inventory[itemId] -= 1; cultivator.spiritStones += income; cultivator.factionReputation["market-guild"] += 1;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} sold 1 ${itemId} for ${income}.` };
}
function immediateAction(world: WorldState, cultivator: Cultivator, actionId: ActionId): ActionExecutionResult {
  const registration = registrationModifiersOf(cultivator);
  const joinNeutralSectId = parseJoinNeutralSectId(actionId);
  if (actionId === "buy-healing-pill" || actionId === "buy-qi-pill" || actionId === "buy-ward-talisman") {
    const location = world.locations[cultivator.locationId];
    if (!location || !canTradeAtLocation(location)) throw new Error("You must be in a trading safe settlement."); const itemId = actionId === "buy-healing-pill" ? "healing-pill" : actionId === "buy-qi-pill" ? "qi-pill" : "ward-talisman"; const base = itemId === "healing-pill" ? 100 : itemId === "qi-pill" ? 60 : 180; const price = buyPrice(cultivator, base); if (cultivator.spiritStones < price) throw new Error("Not enough spirit stones."); cultivator.spiritStones -= price; cultivator.inventory[itemId] += 1; cultivator.factionReputation["market-guild"] += 1; return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} bought ${itemId} for ${price}.` };
  }
  if (actionId === "sell-spirit-ore") return marketSell(world, cultivator, "spirit-ore", 115, actionId);
  if (actionId === "sell-ruin-fragment") return marketSell(world, cultivator, "ruin-fragment", 145, actionId);
  if (actionId === "sell-beast-core") return marketSell(world, cultivator, "beast-core", 210, actionId);
  if (actionId === "use-healing-pill") { if (cultivator.inventory["healing-pill"] <= 0) throw new Error("Item not available: healing-pill"); cultivator.inventory["healing-pill"] -= 1; cultivator.qi = clamp(cultivator.qi + 35, 0, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 2); syncWounded(cultivator); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} restored qi with a healing pill.` }; }
  if (actionId === "use-qi-pill") { if (cultivator.inventory["qi-pill"] <= 0) throw new Error("Item not available: qi-pill"); cultivator.inventory["qi-pill"] -= 1; cultivator.spiritualPower = clamp(cultivator.spiritualPower + 30, 0, cultivator.maxSpiritualPower); upsertEffect(cultivator, { id: "spirit-saturated", name: "Spirit Saturated", description: "Short-term cultivation boost.", source: "qi-pill", remainingTicks: 4, intensity: 1 }); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} restored spiritual power with a qi pill.` }; }
  if (actionId === "use-ward-talisman") { if (cultivator.inventory["ward-talisman"] <= 0) throw new Error("Item not available: ward-talisman"); cultivator.inventory["ward-talisman"] -= 1; upsertEffect(cultivator, { id: "warded", name: "Warded", description: "Lower combat risk.", source: "talisman", remainingTicks: 6, intensity: 1 }); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} is now warded.` }; }
  if (actionId === "study-sword-manual" || actionId === "study-alchemy-manual" || actionId === "study-array-manual") {
    const manual = MANUAL_TECHNIQUES[actionId];
    if (cultivator.inventory[manual.itemId] <= 0) throw new Error(`Item not available: ${manual.itemId}`);
    cultivator.inventory[manual.itemId] -= 1;
    if (!cultivator.techniques.includes(manual.technique)) cultivator.techniques.push(manual.technique);
    cultivator.realmProgress = clamp(cultivator.realmProgress + 8 + (registration?.studyBonus ?? 0), 0, 200);
    upsertEffect(cultivator, manual.effect);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} studied a manual and gained new insight.` };
  }
  if (joinNeutralSectId) {
    const location = world.locations[cultivator.locationId];
    if (!location || location.nodeType !== "main-city") throw new Error("You must be in a main city to join a neutral sect.");
    if (cultivator.sectId || cultivator.neutralSectId) throw new Error("Cultivator already belongs to an organization.");
    const neutralSect = world.neutralSects[joinNeutralSectId];
    if (!neutralSect) throw new Error(`Neutral sect not found: ${joinNeutralSectId}`);
    if (neutralSect.headquarters !== cultivator.locationId) throw new Error("You can only join the neutral sect based in this state's main city.");
    cultivator.neutralSectId = neutralSect.id;
    cultivator.neutralContribution = 0;
    cultivator.reputation += 4;
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
    if (!location || location.nodeType !== "main-city") throw new Error("You must be in a main city to join a sect.");
    if (cultivator.sectId || cultivator.neutralSectId) throw new Error("Cultivator has already joined an organization.");
    if (cultivator.completedBaseQuests < 1) throw new Error("Join sect requires completing at least 1 base quest.");
    const sect = world.sects["qing-yun-sect"];
    cultivator.sectId = sect.id;
    cultivator.sectTitle = "外门";
    cultivator.reputation += 10;
    cultivator.factionReputation["qing-yun-sect"] += 15;
    sect.memberIds.push(cultivator.id);
    addMessage(world, cultivator.id, "Sect", "Accepted", `${cultivator.name} joined ${sect.name}.`);
    addDaoLog(world, cultivator.id, "Joined Sect", `${cultivator.name} joined ${sect.name}.`, ["sect", "join-sect"]);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${sect.name}.` };
  }
  throw new Error(`Unsupported action: ${actionId}`);
}
function resolveJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId); cultivator.activeJobId = null;
  const registration = registrationModifiersOf(cultivator);
  const executeQuestId = parseExecuteQuestId(job.actionId);
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
        cultivator.factionReputation["qing-yun-sect"] += 8;
      } else {
        cultivator.factionReputation.townsfolk += 4;
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
    cultivator.realmProgress = clamp(
      cultivator.realmProgress +
        18 +
        Math.floor(cultivator.realmLevel / 2) +
        (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
        (hasEffect(cultivator, "qi-surge") ? 6 : 0) +
        (registration?.cultivateBonus ?? 0) -
        (hasEffect(cultivator, "poisoned") ? 8 : 0),
      0,
      200,
    );
    if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) {
      cultivator.realmProgress -= 100;
      cultivator.realmLevel += 1;
      cultivator.realm = cultivator.realmLevel <= 3 ? REALM_QI : cultivator.realmLevel <= 6 ? REALM_FOUNDATION : REALM_CORE;
      cultivator.maxQi += 12;
      cultivator.maxSpiritualPower += 12;
      cultivator.qi = cultivator.maxQi;
      cultivator.spiritualPower = cultivator.maxSpiritualPower;
      cultivator.lifespan += 12;
      return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`;
    }
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
    cultivator.realmProgress = clamp(cultivator.realmProgress + gain, 0, 200);
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
    cultivator.reputation += 8 + Math.floor((registration?.taskBonus ?? 0) / 2);
    cultivator.karma = Math.max(0, cultivator.karma - 2);
    cultivator.factionReputation.townsfolk += 8;
    return `${cultivator.name} finished a town task.`;
  }
  if (job.actionId === "take-neutral-duty") {
    const neutralSect = getCultivatorNeutralSect(world, cultivator);
    if (!neutralSect) {
      throw new Error("Neutral duty requires neutral sect membership.");
    }
    cultivator.spiritStones += 120;
    cultivator.reputation += 4;
    cultivator.neutralContribution += 40;
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "neutral-sect", remainingTicks: 2, intensity: 1 });
    addDaoLog(world, cultivator.id, "Neutral Duty", `${cultivator.name} completed a duty for ${neutralSect.name}.`, ["neutral-sect", "neutral-duty"]);
    return `${cultivator.name} finished neutral sect duty.`;
  }
  if (job.actionId === "take-sect-errand") {
    const previousContribution = cultivator.totalContribution;
    cultivator.spiritStones += 180 + ((registration?.sectBonus ?? 0) * 12);
    cultivator.reputation += 6 + Math.floor((registration?.sectBonus ?? 0) / 2);
    cultivator.factionReputation["qing-yun-sect"] += 12 + (registration?.sectBonus ?? 0);
    cultivator.totalContribution += 60 + Math.floor((registration?.sectBonus ?? 0) / 2);
    if (cultivator.totalContribution > previousContribution) {
      cultivator.contributionReachedAt = world.tick;
    }
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 });
    addDaoLog(world, cultivator.id, "Sect Duty", `${cultivator.name} completed a sect errand.`, ["sect", "sect-quest-complete"]);
    return `${cultivator.name} finished a sect errand.`;
  }
  if (job.actionId === "mine-spirit-stones") {
    const roll = hashString(`${world.tick}:${job.id}`);
    cultivator.spiritStones += 110 + (roll % 80) + ((registration?.mineBonus ?? 0) * 8);
    cultivator.inventory["spirit-ore"] += 1 + (roll % 2) + ((registration?.mineBonus ?? 0) >= 8 ? 1 : 0);
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
  if (job.actionId === "search-fortune") {
    const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}`);
    if (roll % 3 === 0) {
      cultivator.inventory["ruin-fragment"] += (hasEffect(cultivator, "fortune-marked") ? 2 : 1) + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
    } else if (roll % 3 === 1) {
      cultivator.realmProgress = clamp(cultivator.realmProgress + 10 + (registration?.fortuneBonus ?? 0), 0, 200);
      upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 });
    } else {
      cultivator.spiritStones += 220 + ((registration?.fortuneBonus ?? 0) * 10);
      cultivator.inventory["ruin-fragment"] += 1 + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
    }
    cultivator.factionReputation["rogue-cultivators"] += 3;
    return `${cultivator.name} searched the ruins.`;
  }
  if (job.actionId === "hunt-mine-beast" || job.actionId === "challenge-guardian") {
    const encounterId = job.actionId === "hunt-mine-beast" ? "mine-beast" : "ruins-guardian";
    const roll = hashString(`${world.tick}:${job.id}:${encounterId}`);
    const power =
      cultivator.qi +
      Math.floor(cultivator.spiritualPower * 0.6) +
      cultivator.realmLevel * 10 +
      Math.floor(cultivator.reputation / 3) +
      (hasEffect(cultivator, "qi-surge") ? 18 : 0) +
      (hasEffect(cultivator, "warded") ? 14 : 0) +
      (job.actionId === "challenge-guardian" && hasEffect(cultivator, "fortune-marked") ? 12 : 0) +
      (registration?.combatBonus ?? 0) -
      (hasEffect(cultivator, "poisoned") ? 12 : 0) +
      (roll % 22);
    const threat = job.actionId === "hunt-mine-beast" ? 145 + (roll % 20) : 172 + (roll % 24);
    cultivator.spiritualPower = clamp(cultivator.spiritualPower - (job.actionId === "hunt-mine-beast" ? 16 : 24), 0, cultivator.maxSpiritualPower);
    if (power >= threat) {
      if (job.actionId === "hunt-mine-beast") {
        cultivator.inventory["spirit-ore"] += 2 + (roll % 2);
        cultivator.spiritStones += 120 + (roll % 60);
        if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1;
        upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 });
      } else {
        cultivator.inventory["ruin-fragment"] += 1 + (roll % 2);
        cultivator.inventory["ward-talisman"] += 1;
        cultivator.realmProgress = clamp(cultivator.realmProgress + 12, 0, 200);
        upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 });
      }
      addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` });
      return `${cultivator.name} won a combat encounter.`;
    }
    cultivator.qi = clamp(
      cultivator.qi - Math.max(8, (job.actionId === "hunt-mine-beast" ? 24 + (roll % 10) : 32 + (roll % 12)) - ((registration?.combatGuard ?? 0) * 2)),
      1,
      cultivator.maxQi,
    );
    cultivator.injuryTicksRemaining = Math.max(
      cultivator.injuryTicksRemaining,
      Math.max(2, (job.actionId === "hunt-mine-beast" ? 5 : 7) - (registration?.combatGuard ?? 0)),
    );
    if (job.actionId === "challenge-guardian") upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: 4, intensity: 1 });
    syncWounded(cultivator);
    addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` });
    return `${cultivator.name} lost a combat encounter.`;
  }
  /* Legacy fallback block kept temporarily during the registration modifier patch.
  if (job.actionId === "meditate") { cultivator.spiritualPower = clamp(cultivator.spiritualPower + 28 + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (registration?.meditateBonus ?? 0), 0, cultivator.maxSpiritualPower); return `${cultivator.name} recovered spiritual power.`; }
  if (job.actionId === "heal") { cultivator.qi = clamp(cultivator.qi + 45 + (registration?.healBonus ?? 0), 0, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 4 - Math.floor((registration?.healBonus ?? 0) / 4)); cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id !== "poisoned"); upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sanctuary", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); return `${cultivator.name} recovered from injuries.`; }
  if (job.actionId === "cultivate") { cultivator.realmProgress = clamp(cultivator.realmProgress + 18 + Math.floor(cultivator.realmLevel / 2) + (hasEffect(cultivator, "clear-mind") ? 8 : 0) + (hasEffect(cultivator, "qi-surge") ? 6 : 0) - (hasEffect(cultivator, "poisoned") ? 8 : 0), 0, 200); if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) { cultivator.realmProgress -= 100; cultivator.realmLevel += 1; cultivator.realm = cultivator.realmLevel <= 3 ? "炼气" : cultivator.realmLevel <= 6 ? "筑基" : "金丹"; cultivator.maxQi += 12; cultivator.maxSpiritualPower += 12; cultivator.qi = cultivator.maxQi; cultivator.spiritualPower = cultivator.maxSpiritualPower; cultivator.lifespan += 12; return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`; } return `${cultivator.name} gained cultivation progress.`; }
  if (job.actionId === "take-mortal-task") { cultivator.spiritStones += 140; cultivator.reputation += 8; cultivator.karma = Math.max(0, cultivator.karma - 2); cultivator.factionReputation.townsfolk += 8; return `${cultivator.name} finished a town task.`; }
  if (job.actionId === "take-sect-errand") { cultivator.spiritStones += 180; cultivator.reputation += 6; cultivator.factionReputation["qing-yun-sect"] += 12; upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 }); return `${cultivator.name} finished a sect errand.`; }
  if (job.actionId === "mine-spirit-stones") { const roll = hashString(`${world.tick}:${job.id}`); cultivator.spiritStones += 110 + (roll % 80); cultivator.inventory["spirit-ore"] += 1 + (roll % 2); cultivator.qi = clamp(cultivator.qi - 14, 1, cultivator.maxQi); if (roll % 5 === 0) { cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 5); syncWounded(cultivator); } return `${cultivator.name} mined stones and ore.`; }
  if (job.actionId === "search-fortune") { const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}`); if (roll % 3 === 0) cultivator.inventory["ruin-fragment"] += hasEffect(cultivator, "fortune-marked") ? 2 : 1; else if (roll % 3 === 1) { cultivator.realmProgress = clamp(cultivator.realmProgress + 10, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 }); } else { cultivator.spiritStones += 220; cultivator.inventory["ruin-fragment"] += 1; } cultivator.factionReputation["rogue-cultivators"] += 3; return `${cultivator.name} searched the ruins.`; }
  const encounterId = job.actionId === "hunt-mine-beast" ? "mine-beast" : "ruins-guardian"; const roll = hashString(`${world.tick}:${job.id}:${encounterId}`); const power = cultivator.qi + Math.floor(cultivator.spiritualPower * 0.6) + cultivator.realmLevel * 10 + Math.floor(cultivator.reputation / 3) + (hasEffect(cultivator, "qi-surge") ? 18 : 0) + (hasEffect(cultivator, "warded") ? 14 : 0) + (job.actionId === "challenge-guardian" && hasEffect(cultivator, "fortune-marked") ? 12 : 0) - (hasEffect(cultivator, "poisoned") ? 12 : 0) + (roll % 22); const threat = job.actionId === "hunt-mine-beast" ? 145 + (roll % 20) : 172 + (roll % 24); cultivator.spiritualPower = clamp(cultivator.spiritualPower - (job.actionId === "hunt-mine-beast" ? 16 : 24), 0, cultivator.maxSpiritualPower);
  if (power >= threat) { if (job.actionId === "hunt-mine-beast") { cultivator.inventory["spirit-ore"] += 2 + (roll % 2); cultivator.spiritStones += 120 + (roll % 60); if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1; upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 }); } else { cultivator.inventory["ruin-fragment"] += 1 + (roll % 2); cultivator.inventory["ward-talisman"] += 1; cultivator.realmProgress = clamp(cultivator.realmProgress + 12, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 }); } addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` }); return `${cultivator.name} won a combat encounter.`; }
  cultivator.qi = clamp(cultivator.qi - (job.actionId === "hunt-mine-beast" ? 24 + (roll % 10) : 32 + (roll % 12)), 1, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, job.actionId === "hunt-mine-beast" ? 5 : 7); if (job.actionId === "challenge-guardian") upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); addCombatLog(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` }); return `${cultivator.name} lost a combat encounter.`; }
  */
  throw new Error(`Unsupported timed action: ${job.actionId}`);
}

function resolveEnhancedJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId);
  const registration = registrationModifiersOf(cultivator);
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
    cultivator.realmProgress = clamp(cultivator.realmProgress + gain, 0, 200);
    if (cultivateRoll % 7 === 0) {
      upsertEffect(cultivator, { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Closed-Door Insight", content: "The retreat produced a sudden insight into the path ahead.", severity: "medium", tags: ["event", "retreat", "insight"] });
    }
    if (cultivateRoll % 19 === 0 && !hasEffect(cultivator, "clear-mind")) {
      upsertEffect(cultivator, { id: "deviation", name: "Qi Deviation", description: "Cultivation becomes unstable and risky.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Qi Deviation", content: "A forced cycle disturbed the qi flow and left a deviation behind.", severity: "high", tags: ["event", "cultivation", "deviation"] });
    }
    if (cultivator.realmProgress >= 100 && cultivator.realmLevel < 9) {
      cultivator.realmProgress -= 100;
      cultivator.realmLevel += 1;
      cultivator.realm = cultivator.realmLevel <= 3 ? REALM_QI : cultivator.realmLevel <= 6 ? REALM_FOUNDATION : REALM_CORE;
      cultivator.maxQi += 12;
      cultivator.maxSpiritualPower += 12;
      cultivator.qi = cultivator.maxQi;
      cultivator.spiritualPower = cultivator.maxSpiritualPower;
      cultivator.lifespan += 12;
      return `${cultivator.name} broke through to level ${cultivator.realmLevel}.`;
    }
    return `${cultivator.name} gained cultivation progress.`;
  }
  if (job.actionId === "take-sect-errand") {
    const summary = resolveJob(world, job);
    if (hashString(`${world.tick}:${job.id}:sect`) % 3 === 0) {
      cultivator.inventory["array-manual"] += 1;
      addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Sect Bounty", content: "The sect added a manual copy to your reward for finishing the errand cleanly.", severity: "medium", tags: ["event", "sect", "bounty"] });
    }
    return summary;
  }
  if (job.actionId === "search-fortune") {
    cultivator.activeJobId = null;
    const roll = hashString(`${cultivator.id}:${job.id}:${world.tick}:fortune-enhanced`);
    if (roll % 4 === 0) {
      cultivator.inventory["ruin-fragment"] += (hasEffect(cultivator, "fortune-marked") ? 2 : 1) + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
      if (roll % 8 === 0) cultivator.inventory["sword-manual"] += 1;
    } else if (roll % 4 === 1) {
      cultivator.realmProgress = clamp(cultivator.realmProgress + 10 + (registration?.fortuneBonus ?? 0), 0, 200);
      upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 });
    } else if (roll % 4 === 2) {
      cultivator.spiritStones += 220 + ((registration?.fortuneBonus ?? 0) * 10);
      cultivator.inventory["ruin-fragment"] += 1 + ((registration?.fortuneBonus ?? 0) >= 8 ? 1 : 0);
      if (roll % 6 === 0) cultivator.inventory["alchemy-manual"] += 1;
    } else {
      upsertEffect(cultivator, { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "ruins", remainingTicks: 5, intensity: 1 });
      if (roll % 5 === 0) cultivator.inventory["array-manual"] += 1;
    }
    cultivator.factionReputation["rogue-cultivators"] += 3;
    return `${cultivator.name} searched the ruins.`;
  }
  const summary = resolveJob(world, job);
  if (job.actionId === "challenge-guardian" && summary.includes("won")) {
    if (hashString(`${world.tick}:${job.id}:guardian`) % 3 === 0) cultivator.inventory["sword-manual"] += 1;
  }
  return summary;
}

export function performAction(world: WorldState, cultivatorId: string, actionId: ActionId): ActionExecutionResult {
  const cultivator = getCultivatorOrThrow(world, cultivatorId); requireIdle(cultivator); requireSafeIfInjured(cultivator, actionId);
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
      return startJob(world, cultivator, normalizedActionId, normalizedActionId, { residenceRecipeId: recipe.id });
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
      return startJob(world, cultivator, actionId, actionId, { residenceRecipeId: recipe.id });
    }
    if (actionId === "residence-meditate") {
      return startJob(world, cultivator, actionId, actionId, {
        residenceMeditateFallback: cultivator.spiritStones < 80,
      });
    }
    return startJob(world, cultivator, actionId, actionId);
  }
  const travelDestination = parseTravelDestination(actionId);
  const executeQuestId = parseExecuteQuestId(actionId);
  if (travelDestination || executeQuestId || TIMED_ACTION_IDS.has(actionId)) {
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
    if (actionId === "cultivate") { if (cultivator.spiritStones < 80) throw new Error("Not enough spirit stones."); if (cultivator.spiritualPower < 20) throw new Error("Not enough spiritual power."); cultivator.spiritStones -= 80; cultivator.spiritualPower -= 20; }
    if ((actionId === "mine-spirit-stones" || actionId === "hunt-mine-beast") && location.nodeType !== "wilderness") throw new Error("Action only available in wilderness.");
    if ((actionId === "search-fortune" || actionId === "challenge-guardian") && !isDungeonNode(location.nodeType)) throw new Error("Action only available in dungeons.");
    if (actionId === "take-mortal-task" && location.kind !== "safe") throw new Error("Action only available in safe settlements.");
    if (actionId === "take-sect-errand" && (location.nodeType !== "main-city" || !cultivator.sectId)) throw new Error("Sect errand requires a main city and sect membership.");
    if (actionId === "take-neutral-duty") {
      const neutralSect = getCultivatorNeutralSect(world, cultivator);
      if (!neutralSect || cultivator.locationId !== neutralSect.headquarters || location.nodeType !== "main-city") {
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

      if (job.remainingTicks > 0) {
        continue;
      }

      const summary = resolveEnhancedJob(world, job);
      completedJobs.push({ cultivatorId: job.cultivatorId, actionId: job.actionId, summary });
      addDaoLog(world, job.cultivatorId, "Action Complete", summary, ["action-complete", job.actionId]);
      delete world.jobs[job.id];
    }
    for (const cultivator of Object.values(world.cultivators)) {
      const location = world.locations[cultivator.locationId];
      if (!location) continue;
      const roll = hashString(`${world.tick}:${cultivator.id}:${cultivator.locationId}:event`); if (cultivator.activeJobId || roll % 17 !== 0) continue;
      if (location.kind === "safe") {
        if (canTradeAtLocation(location) && roll % 34 === 0) { cultivator.inventory["sword-manual"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Black Market Broker", content: "A hidden broker offered a copied sword manual at a suspiciously low price.", severity: "medium", tags: ["event", "market", "black-market"] })); }
        else if (location.nodeType === "main-city") { const localNeutralSect = getLocalNeutralSect(world, cultivator.locationId); cultivator.factionReputation["qing-yun-sect"] += cultivator.sectId ? 5 : 1; upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: localNeutralSect ? "neutral-sect" : "city", remainingTicks: 3, intensity: 1 }); if (roll % 5 === 0) cultivator.inventory["array-manual"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: roll % 5 === 0 ? (localNeutralSect ? `${localNeutralSect.name} Duty Notice` : "City Notice Board") : (localNeutralSect ? `${localNeutralSect.name} Notice` : "City Notice"), content: roll % 5 === 0 ? (localNeutralSect ? `A ${localNeutralSect.name} duty payout included a copied manual.` : "A city notice board posted steady work and modest rewards.") : (localNeutralSect ? `Members of ${localNeutralSect.name} are recruiting steady hands for safe duty.` : "The city registrar posted fresh safe work opportunities."), severity: "low", tags: ["event", localNeutralSect ? "neutral-sect" : "city"] })); }
        else if (canTradeAtLocation(location)) { cultivator.inventory["qi-pill"] += 1; cultivator.factionReputation["market-guild"] += 4; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Guild Discount", content: "The market guild gave a free qi pill.", severity: "low", tags: ["event", "market"] })); }
        else { cultivator.spiritStones += 60; cultivator.factionReputation.townsfolk += 4; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Town Rush", content: "A quick town request paid out.", severity: "low", tags: ["event", "town"] })); }
      }
      else if (location.kind === "resource") { cultivator.inventory["spirit-ore"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Vein Surge", content: "A loose ore vein opened nearby.", severity: "medium", tags: ["event", "mine"] })); }
      else if (location.kind === "adventure") { cultivator.inventory["ruin-fragment"] += 1; upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 }); triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, locationId: cultivator.locationId, title: "Ruins Resonance", content: "A broken tablet resonated with you.", severity: "medium", tags: ["event", "ruins"] })); }
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
    return {
      organizationType: "player",
      id: sect.id,
      name: sect.name,
      type: sect.type,
      treasury: sect.treasury,
      memberCount: sect.memberIds.length,
      spiritVeins: sect.spiritVeins,
      headquarters: sect.headquarters,
      role,
      totalContribution: cultivator.totalContribution,
      lastTitleUpdateTick: sect.lastTitleUpdateTick,
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
