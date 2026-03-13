import type {
  AgentBinding, AgentPersonaSyncResult, ActionExecutionResult, ActionId, ActionJob, AvailableAction, CharacterSummary,
  CombatLogEntry, CultivationRegistrationRecord, CultivationRegistrationView, Cultivator, CultivatorStateView,
  CreateCultivatorInput, FactionId, FiveElementId, ItemId, RegistrationAnswer, RegistrationGameplayEffectsView,
  RegistrationGameplayModifierView, RegistrationQuestionId, StatusEffect,
  StrategySnapshot, TickSummary, TribulationPreview, WorldEvent, WorldState,
} from "./model.js";
import {
  resolveBehaviorAspectId,
  normalizeCultivationRegistrationRecord,
  resolveCultivationMotiveId,
  resolveSpiritRootKindId,
  resolveTemperamentId,
} from "./registration-taxonomy.js";
import { createEmptyInventory, createFactionReputation } from "./seed.js";

const TICKS_PER_YEAR = 4380;
const ACTION_DURATIONS = {
  "travel-town": 1, "travel-market": 1, "travel-sect-gate": 1, "travel-spirit-mine": 1,
  "travel-mystic-ruins": 1, "travel-healing-sanctuary": 1, meditate: 1, heal: 2, cultivate: 4,
  "take-mortal-task": 2, "mine-spirit-stones": 3, "search-fortune": 3, "take-sect-errand": 2,
  "hunt-mine-beast": 2, "challenge-guardian": 3,
} as const;
const TIMED_ACTION_IDS = new Set<keyof typeof ACTION_DURATIONS>(Object.keys(ACTION_DURATIONS) as Array<keyof typeof ACTION_DURATIONS>);
const TRAVEL_LABELS: Record<string, string> = {
  "travel-town": "Return to town", "travel-market": "Go to market", "travel-sect-gate": "Go to sect gate",
  "travel-spirit-mine": "Go to spirit mine", "travel-mystic-ruins": "Go to mystic ruins",
  "travel-healing-sanctuary": "Go to healing sanctuary",
};
const TRAVEL_TARGETS = {
  "travel-town": "mortal-town", "travel-market": "market", "travel-sect-gate": "sect-gate",
  "travel-spirit-mine": "spirit-mine", "travel-mystic-ruins": "mystic-ruins", "travel-healing-sanctuary": "healing-sanctuary",
} as const;
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
const MANUAL_TECHNIQUES: Record<"study-sword-manual" | "study-alchemy-manual" | "study-array-manual", { itemId: ItemId; technique: string; summary: string; effect: StatusEffect }> = {
  "study-sword-manual": { itemId: "sword-manual", technique: "青霄剑意", summary: "Learned a sword manual and sharpened combat instincts.", effect: { id: "insight", name: "Insight", description: "Short-term bonus to cultivation and combat.", source: "manual", remainingTicks: 5, intensity: 1 } },
  "study-alchemy-manual": { itemId: "alchemy-manual", technique: "回元火候", summary: "Learned an alchemy manual and stabilized recovery.", effect: { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "manual", remainingTicks: 6, intensity: 1 } },
  "study-array-manual": { itemId: "array-manual", technique: "护脉阵纹", summary: "Learned an array manual and improved protection.", effect: { id: "warded", name: "Warded", description: "Lower combat and tribulation risk.", source: "manual", remainingTicks: 6, intensity: 1 } },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const hashString = (input: string) => Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
const normalizeAgentId = (input: string | null | undefined) => input?.trim() ? input.trim() : null;
const getCultivatorOrThrow = (world: WorldState, id: string) => {
  const cultivator = world.cultivators[id];
  if (!cultivator) throw new Error(`Cultivator not found: ${id}`);
  return cultivator;
};
const getAgentBinding = (world: WorldState, agentId: string) => world.agentBindings[agentId] ?? null;
function ensureAgentBinding(world: WorldState, agentId: string): AgentBinding {
  const existing = getAgentBinding(world, agentId);
  if (existing) return existing;
  return (world.agentBindings[agentId] = { agentId, cultivatorIds: [], selectedCultivatorId: null });
}
const addDaoLog = (world: WorldState, cultivatorId: string, title: string, content: string, tags: string[]) =>
  world.daoLogs.unshift({ id: `log-${world.nextLogSequence++}`, cultivatorId, tick: world.tick, title, content, tags });
const addMessage = (world: WorldState, cultivatorId: string, from: string, subject: string, content: string) =>
  world.messages.unshift({ id: `msg-${world.nextMessageSequence++}`, cultivatorId, tick: world.tick, from, subject, content });
const addWorldEvent = (world: WorldState, event: Omit<WorldEvent, "id" | "tick">): WorldEvent =>
  (world.worldEvents.unshift({ id: `event-${world.nextEventSequence++}`, tick: world.tick, ...event }), world.worldEvents[0]!);
const addCombatLog = (world: WorldState, entry: Omit<CombatLogEntry, "id" | "tick">): CombatLogEntry =>
  (world.combatLogs.unshift({ id: `combat-${world.nextCombatSequence++}`, tick: world.tick, ...entry }), world.combatLogs[0]!);
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
  tribulationBonus: number;
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
  | "tribulationBonus"
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
  "tribulationBonus",
  "studyBonus",
];

const ELEMENT_RUNTIME_BONUSES: Record<FiveElementId, Partial<RegistrationBonusValues>> = {
  metal: { combatBonus: 4, studyBonus: 3 },
  wood: { cultivateBonus: 4, healBonus: 4 },
  water: { fortuneBonus: 4, combatGuard: 2 },
  fire: { cultivateBonus: 3, combatBonus: 4 },
  earth: { mineBonus: 4, tribulationBonus: 4, healBonus: 2 },
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
    tribulationBonus: 0,
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
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A rule-bound core steadies defense, recovery discipline, and tribulation prep.", { combatGuard: 3, tribulationBonus: 3 });
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
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A mountain-like core reinforces frontline stability, mining resilience, and tribulation support.", { combatGuard: 4, mineBonus: 3, tribulationBonus: 2 });
  } else if (coreTemperamentId === "shou_cheng") {
    applyRegistrationModifier(modifiers, "core-temperament", `Core temperament: ${coreTemperament}`, "A conservative core protects recovery and long-cycle stability.", { healBonus: 3, tribulationBonus: 3 });
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
    applyRegistrationModifier(modifiers, "cultivation-motive", `Cultivation motive: ${motive}`, "Longevity-driven cultivation improves recovery and tribulation preparation.", { healBonus: 4, tribulationBonus: 2 });
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
    applyRegistrationModifier(modifiers, "spirit-root", `Spirit root: ${spiritRoot}`, "A focused root converts effort into cleaner cultivation, combat, and tribulation support.", { cultivateBonus: 4, combatBonus: 2, tribulationBonus: 2 });
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

function createJob(world: WorldState, cultivatorId: string, actionId: keyof typeof ACTION_DURATIONS, label: string): ActionJob {
  return { id: `job-${world.nextJobSequence++}`, cultivatorId, actionId, label, remainingTicks: ACTION_DURATIONS[actionId], totalTicks: ACTION_DURATIONS[actionId] };
}

function starterProfile(startingPath: Cultivator["startingPath"]) {
  if (startingPath === "sword") return { techniques: ["Taiyi Sword", "Wind Step"], spiritStones: 320, inventory: { ...createEmptyInventory(), "healing-pill": 1, "qi-pill": 1, "sword-manual": 1 }, reputation: 16, factionReputation: createFactionReputation({ townsfolk: 6, "qing-yun-sect": 12, "market-guild": 2, "rogue-cultivators": -4 }) };
  if (startingPath === "alchemy") return { techniques: ["Warm Flame", "Herb Sense"], spiritStones: 280, inventory: { ...createEmptyInventory(), "healing-pill": 2, "qi-pill": 1, "alchemy-manual": 1 }, reputation: 14, factionReputation: createFactionReputation({ townsfolk: 4, "qing-yun-sect": 2, "market-guild": 12, "rogue-cultivators": 0 }) };
  if (startingPath === "array") return { techniques: ["Array Basics", "Still Mind"], spiritStones: 260, inventory: { ...createEmptyInventory(), "healing-pill": 1, "qi-pill": 2, "ward-talisman": 1, "array-manual": 1 }, reputation: 15, factionReputation: createFactionReputation({ townsfolk: 3, "qing-yun-sect": 4, "market-guild": 10, "rogue-cultivators": 3 }) };
  return { techniques: ["Loose Breathing", "Light Body"], spiritStones: 360, inventory: { ...createEmptyInventory(), "healing-pill": 1, "qi-pill": 1 }, reputation: 12, factionReputation: createFactionReputation({ townsfolk: 8, "qing-yun-sect": 0, "market-guild": 4, "rogue-cultivators": 6 }) };
}
function toSummary(cultivator: Cultivator, selectedCultivatorId: string | null): CharacterSummary {
  return { id: cultivator.id, name: cultivator.name, genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, startingPath: cultivator.startingPath, realm: cultivator.realm, realmLevel: cultivator.realmLevel, locationId: cultivator.locationId, sectId: cultivator.sectId, isSelected: cultivator.id === selectedCultivatorId };
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
  const agentId = normalizeAgentId(input.agentId); const starter = starterProfile(input.startingPath ?? "wanderer");
  const cultivator: Cultivator = { id: `cultivator-${world.nextCultivatorSequence++}`, name, genderPresentation: input.genderPresentation ?? "unspecified", pronouns: input.pronouns?.trim() || "TA/TA", origin: input.origin?.trim() || "Yun Province", temperament: input.temperament?.trim() || "Cautious", startingPath: input.startingPath ?? "wanderer", createdByAgentId: agentId, realm: REALM_QI, realmLevel: 1, realmProgress: 0, locationId: "mortal-town", spiritStones: starter.spiritStones, qi: 100, maxQi: 100, spiritualPower: 100, maxSpiritualPower: 100, karma: 0, reputation: starter.reputation, factionReputation: starter.factionReputation, lifespan: 160, age: clamp(input.age ?? 18, 16, 80), sectId: null, techniques: starter.techniques, inventory: starter.inventory, statusEffects: [], activeJobId: null, injuryTicksRemaining: 0, nextTribulationTick: 100, registrationRecord: null };
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

export function getMessages(world: WorldState, cultivatorId: string) { getCultivatorOrThrow(world, cultivatorId); return world.messages.filter((m) => m.cultivatorId === cultivatorId); }
export function getDaoLogs(world: WorldState, cultivatorId: string) { getCultivatorOrThrow(world, cultivatorId); return world.daoLogs.filter((e) => e.cultivatorId === cultivatorId); }
export function getCombatLogs(world: WorldState, cultivatorId: string, limit = 10) { getCultivatorOrThrow(world, cultivatorId); return world.combatLogs.filter((e) => e.cultivatorId === cultivatorId).slice(0, clamp(limit, 1, 50)); }
export function getRecentWorldEvents(world: WorldState, cultivatorId?: string, limit = 10) { return (cultivatorId ? world.worldEvents.filter((e) => e.cultivatorId === null || e.cultivatorId === cultivatorId) : world.worldEvents).slice(0, clamp(limit, 1, 50)); }
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
function tribulationDifficulty(cultivator: Cultivator) { return cultivator.realm === REALM_FOUNDATION ? 65 + cultivator.realmLevel * 5 : cultivator.realm === REALM_CORE ? 95 + cultivator.realmLevel * 6 : 0; }
function tribulationType(cultivator: Cultivator) { return cultivator.realm === REALM_FOUNDATION ? "Foundation Tribulation" : cultivator.realm === REALM_CORE ? "Core Tribulation" : "None"; }
function guidance(world: WorldState, cultivator: Cultivator) {
  const registration = registrationModifiersOf(cultivator);
  const warnings: string[] = []; const priorities: string[] = []; const suggestedActions: ActionId[] = [];
  if (cultivator.injuryTicksRemaining > 0) { warnings.push("Character is injured."); priorities.push("Recover before risky actions."); suggestedActions.push(cultivator.locationId === "healing-sanctuary" ? "heal" : "travel-healing-sanctuary"); }
  if (hasEffect(cultivator, "poisoned")) warnings.push("Poison drains HP each tick.");
  if (hasEffect(cultivator, "deviation")) { warnings.push("Qi deviation is active."); priorities.push("Stabilize before cultivation."); suggestedActions.push(cultivator.locationId === "healing-sanctuary" ? "heal" : "travel-healing-sanctuary"); }
  if (cultivator.spiritStones < 120) { priorities.push("Earn more spirit stones."); suggestedActions.push(cultivator.locationId === "mortal-town" ? "take-mortal-task" : "travel-town"); }
  if (cultivator.inventory["spirit-ore"] + cultivator.inventory["ruin-fragment"] + cultivator.inventory["beast-core"] > 0) priorities.push("You can sell materials in the market.");
  if (cultivator.inventory["sword-manual"] + cultivator.inventory["alchemy-manual"] + cultivator.inventory["array-manual"] > 0) priorities.push("Study manuals before the next long action.");
  if (hasEffect(cultivator, "insight")) priorities.push("Insight is active. Use it on cultivation or a major encounter.");
  if (hasEffect(cultivator, "spirit-saturated")) priorities.push("Spirit saturation is active. Good time for cultivation.");
  if (cultivator.nextTribulationTick - world.tick <= 10) { warnings.push("Tribulation warning active."); suggestedActions.push(cultivator.locationId === "healing-sanctuary" ? "heal" : "travel-healing-sanctuary"); }
  if (registration && cultivator.injuryTicksRemaining <= 0) {
    if (registration.cultivateBonus >= 8) priorities.push("Registration favors longer cultivation sessions.");
    if (registration.fortuneBonus >= 8) priorities.push("Registration favors scouting and flexible opportunity play.");
    if (registration.tribulationBonus >= 6 && cultivator.nextTribulationTick - world.tick <= 20) priorities.push("Registration supports safer tribulation preparation if you start early.");
    if (registration.sectBonus >= 4 && cultivator.sectId) suggestedActions.push(cultivator.locationId === "sect-gate" ? "take-sect-errand" : "travel-sect-gate");
    if (registration.fortuneBonus >= 8) suggestedActions.push(cultivator.locationId === "mystic-ruins" ? "search-fortune" : "travel-mystic-ruins");
    if (registration.mineBonus >= 6) suggestedActions.push(cultivator.locationId === "spirit-mine" ? "mine-spirit-stones" : "travel-spirit-mine");
    if (registration.cultivateBonus >= 8) suggestedActions.push("cultivate");
  }
  if (cultivator.inventory["sword-manual"] > 0) suggestedActions.push("study-sword-manual");
  if (cultivator.inventory["alchemy-manual"] > 0) suggestedActions.push("study-alchemy-manual");
  if (cultivator.inventory["array-manual"] > 0) suggestedActions.push("study-array-manual");
  if (!suggestedActions.length) suggestedActions.push("cultivate");
  return { warnings, priorities, suggestedActions: Array.from(new Set(suggestedActions)).slice(0, 4) as ActionId[] };
}

export function getStrategySnapshot(world: WorldState, cultivatorId: string): StrategySnapshot {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const plan = guidance(world, cultivator);
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
      : "Grow resources and stability until joining a sect or surviving the next tribulation feels safe.";
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
  };
}

export function getTribulationPreview(world: WorldState, cultivatorId: string): TribulationPreview {
  const cultivator = getCultivatorOrThrow(world, cultivatorId);
  const registration = registrationModifiersOf(cultivator);
  const supportScore =
    (cultivator.sectId ? 6 : 0) +
    (cultivator.locationId === "healing-sanctuary" ? 10 : 0) +
    (hasEffect(cultivator, "warded") ? 16 : 0) +
    (hasEffect(cultivator, "clear-mind") ? 8 : 0) +
    (registration?.tribulationBonus ?? 0) -
    (hasEffect(cultivator, "poisoned") ? 10 : 0);
  return { nextTribulationTick: cultivator.nextTribulationTick, tribulationType: tribulationType(cultivator), difficulty: tribulationDifficulty(cultivator), isWarned: cultivator.nextTribulationTick - world.tick <= 10, preparationTime: Math.max(cultivator.nextTribulationTick - world.tick, 0), supportScore };
}

export function getCultivatorState(world: WorldState, cultivatorId: string): CultivatorStateView {
  const cultivator = getCultivatorOrThrow(world, cultivatorId); const zone = world.zones[cultivator.locationId]; const sect = cultivator.sectId ? world.sects[cultivator.sectId] ?? null : null;
  return {
    tick: world.tick,
    cultivator: { id: cultivator.id, name: cultivator.name, realm: cultivator.realm, realmLevel: cultivator.realmLevel, realmProgress: cultivator.realmProgress, status: statusOf(cultivator), location: zone.name, spiritStones: cultivator.spiritStones, qi: cultivator.qi, maxQi: cultivator.maxQi, spiritualPower: cultivator.spiritualPower, maxSpiritualPower: cultivator.maxSpiritualPower, karma: cultivator.karma, reputation: cultivator.reputation, lifespan: cultivator.lifespan, age: Number(cultivator.age.toFixed(2)), genderPresentation: cultivator.genderPresentation, pronouns: cultivator.pronouns, origin: cultivator.origin, temperament: cultivator.temperament, startingPath: cultivator.startingPath },
    cultivation: { mainTechnique: cultivator.techniques[0] ?? "Basic Breathing", techniques: cultivator.techniques },
    sect: sect ? { id: sect.id, name: sect.name, role: "Outer Disciple", treasury: sect.treasury, memberCount: sect.memberIds.length } : null,
    tribulation: getTribulationPreview(world, cultivatorId),
    inventory: cultivator.inventory,
    inventoryDetails: Object.entries(cultivator.inventory).filter(([, count]) => count > 0).map(([itemId, count]) => ({ id: itemId as ItemId, name: world.itemDefinitions[itemId as ItemId].name, category: world.itemDefinitions[itemId as ItemId].category, description: world.itemDefinitions[itemId as ItemId].description, count, baseValue: world.itemDefinitions[itemId as ItemId].baseValue })),
    currentJob: cultivator.activeJobId ? world.jobs[cultivator.activeJobId] ?? null : null,
    nearbyOpportunities: [cultivator.locationId === "market" ? "Sell or buy supplies." : "Move for a better opportunity.", cultivator.locationId === "spirit-mine" ? "Mine or hunt a beast." : "Stay aware of zone events."],
    statusEffects: cultivator.statusEffects.map((effect) => ({ id: effect.id, name: effect.name, description: effect.description, remainingTicks: effect.remainingTicks, source: effect.source })),
    factionReputation: (Object.keys(cultivator.factionReputation) as FactionId[]).map((factionId) => ({ factionId, name: FACTION_NAMES[factionId], value: cultivator.factionReputation[factionId], standing: standing(cultivator.factionReputation[factionId]) })),
    recentEvents: getRecentWorldEvents(world, cultivatorId, 5),
    recentCombats: getCombatLogs(world, cultivatorId, 4),
    registration: registrationViewOf(cultivator),
    registrationEffects: registrationEffectsViewOf(cultivator),
    agentGuidance: guidance(world, cultivator),
  };
}

export function listAvailableActions(world: WorldState, cultivatorId: string): AvailableAction[] {
  const cultivator = getCultivatorOrThrow(world, cultivatorId); if (cultivator.activeJobId) return [];
  const actions: AvailableAction[] = Object.entries(TRAVEL_TARGETS).filter(([, zoneId]) => zoneId !== cultivator.locationId).map(([actionId]) => ({ actionId: actionId as ActionId, label: TRAVEL_LABELS[actionId], description: "Change zone.", durationTicks: ACTION_DURATIONS[actionId as keyof typeof ACTION_DURATIONS], kind: "timed" }));
  actions.push({ actionId: "meditate", label: "Meditate", description: "Recover spiritual power.", durationTicks: 1, kind: "timed" });
  if (cultivator.inventory["healing-pill"] > 0) actions.push({ actionId: "use-healing-pill", label: "Use healing pill", description: "Restore qi.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["qi-pill"] > 0) actions.push({ actionId: "use-qi-pill", label: "Use qi pill", description: "Restore spiritual power.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["ward-talisman"] > 0) actions.push({ actionId: "use-ward-talisman", label: "Use ward talisman", description: "Gain warded status.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["sword-manual"] > 0) actions.push({ actionId: "study-sword-manual", label: "Study sword manual", description: "Consume a manual for a new technique and insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["alchemy-manual"] > 0) actions.push({ actionId: "study-alchemy-manual", label: "Study alchemy manual", description: "Consume a manual for recovery-focused insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.inventory["array-manual"] > 0) actions.push({ actionId: "study-array-manual", label: "Study array manual", description: "Consume a manual for protective insight.", durationTicks: 0, kind: "immediate" });
  if (cultivator.injuryTicksRemaining > 0) { if (cultivator.locationId === "healing-sanctuary") actions.push({ actionId: "heal", label: "Heal", description: "Recover injuries.", durationTicks: 2, kind: "timed" }); return actions; }
  actions.push({ actionId: "cultivate", label: "Cultivate", description: "Spend spirit stones to gain progress.", durationTicks: 4, kind: "timed" });
  if (cultivator.locationId === "mortal-town") actions.push({ actionId: "take-mortal-task", label: "Take town task", description: "Stable income.", durationTicks: 2, kind: "timed" });
  if (cultivator.locationId === "market") {
    actions.push({ actionId: "buy-healing-pill", label: "Buy healing pill", description: `${buyPrice(cultivator, 100)} spirit stones.`, durationTicks: 0, kind: "immediate" }, { actionId: "buy-qi-pill", label: "Buy qi pill", description: `${buyPrice(cultivator, 60)} spirit stones.`, durationTicks: 0, kind: "immediate" }, { actionId: "buy-ward-talisman", label: "Buy ward talisman", description: `${buyPrice(cultivator, 180)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["spirit-ore"] > 0) actions.push({ actionId: "sell-spirit-ore", label: "Sell spirit ore", description: `${sellPrice(cultivator, 115)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["ruin-fragment"] > 0) actions.push({ actionId: "sell-ruin-fragment", label: "Sell ruin fragment", description: `${sellPrice(cultivator, 145)} spirit stones.`, durationTicks: 0, kind: "immediate" });
    if (cultivator.inventory["beast-core"] > 0) actions.push({ actionId: "sell-beast-core", label: "Sell beast core", description: `${sellPrice(cultivator, 210)} spirit stones.`, durationTicks: 0, kind: "immediate" });
  }
  if (cultivator.locationId === "sect-gate") cultivator.sectId ? actions.push({ actionId: "take-sect-errand", label: "Take sect errand", description: "Build sect standing.", durationTicks: 2, kind: "timed" }) : actions.push({ actionId: "join-sect", label: "Join sect", description: "Enter Qing Yun Sect.", durationTicks: 0, kind: "immediate" });
  if (cultivator.locationId === "spirit-mine") actions.push({ actionId: "mine-spirit-stones", label: "Mine spirit stones", description: "Gather stones and ore.", durationTicks: 3, kind: "timed" }, { actionId: "hunt-mine-beast", label: "Hunt mine beast", description: "PVE combat for better loot.", durationTicks: 2, kind: "timed" });
  if (cultivator.locationId === "mystic-ruins") actions.push({ actionId: "search-fortune", label: "Search ruins", description: "Look for fragments and gains.", durationTicks: 3, kind: "timed" }, { actionId: "challenge-guardian", label: "Challenge guardian", description: "PVE combat for rare loot.", durationTicks: 3, kind: "timed" });
  if (cultivator.locationId === "healing-sanctuary") actions.push({ actionId: "heal", label: "Heal", description: "Recover qi and injuries.", durationTicks: 2, kind: "timed" });
  return actions;
}

function requireIdle(cultivator: Cultivator) { if (cultivator.activeJobId) throw new Error("Cultivator is already executing another action."); }
function requireSafeIfInjured(cultivator: Cultivator, actionId: ActionId) {
  if (cultivator.injuryTicksRemaining <= 0) return;
  const allowed = new Set<ActionId>(["meditate", "heal", "travel-healing-sanctuary", "travel-market", "use-healing-pill", "use-qi-pill", "use-ward-talisman", "study-sword-manual", "study-alchemy-manual", "study-array-manual", "buy-healing-pill", "buy-qi-pill", "buy-ward-talisman", "sell-spirit-ore", "sell-ruin-fragment", "sell-beast-core"]);
  if (!allowed.has(actionId)) throw new Error("Cultivator is injured and can only do safe actions.");
}
function startJob(world: WorldState, cultivator: Cultivator, actionId: keyof typeof ACTION_DURATIONS, label: string): ActionExecutionResult {
  const job = createJob(world, cultivator.id, actionId, label); cultivator.activeJobId = job.id; world.jobs[job.id] = job;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} started ${label}.`, job };
}
function marketSell(world: WorldState, cultivator: Cultivator, itemId: ItemId, base: number, actionId: ActionId): ActionExecutionResult {
  if (cultivator.locationId !== "market") throw new Error("You must be in the market."); if (cultivator.inventory[itemId] <= 0) throw new Error(`Item not available: ${itemId}`);
  const income = sellPrice(cultivator, base); cultivator.inventory[itemId] -= 1; cultivator.spiritStones += income; cultivator.factionReputation["market-guild"] += 1;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} sold 1 ${itemId} for ${income}.` };
}
function immediateAction(world: WorldState, cultivator: Cultivator, actionId: ActionId): ActionExecutionResult {
  const registration = registrationModifiersOf(cultivator);
  if (actionId === "buy-healing-pill" || actionId === "buy-qi-pill" || actionId === "buy-ward-talisman") {
    if (cultivator.locationId !== "market") throw new Error("You must be in the market."); const itemId = actionId === "buy-healing-pill" ? "healing-pill" : actionId === "buy-qi-pill" ? "qi-pill" : "ward-talisman"; const base = itemId === "healing-pill" ? 100 : itemId === "qi-pill" ? 60 : 180; const price = buyPrice(cultivator, base); if (cultivator.spiritStones < price) throw new Error("Not enough spirit stones."); cultivator.spiritStones -= price; cultivator.inventory[itemId] += 1; cultivator.factionReputation["market-guild"] += 1; return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} bought ${itemId} for ${price}.` };
  }
  if (actionId === "sell-spirit-ore") return marketSell(world, cultivator, "spirit-ore", 115, actionId);
  if (actionId === "sell-ruin-fragment") return marketSell(world, cultivator, "ruin-fragment", 145, actionId);
  if (actionId === "sell-beast-core") return marketSell(world, cultivator, "beast-core", 210, actionId);
  if (actionId === "use-healing-pill") { if (cultivator.inventory["healing-pill"] <= 0) throw new Error("Item not available: healing-pill"); cultivator.inventory["healing-pill"] -= 1; cultivator.qi = clamp(cultivator.qi + 35, 0, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - 2); syncWounded(cultivator); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} restored qi with a healing pill.` }; }
  if (actionId === "use-qi-pill") { if (cultivator.inventory["qi-pill"] <= 0) throw new Error("Item not available: qi-pill"); cultivator.inventory["qi-pill"] -= 1; cultivator.spiritualPower = clamp(cultivator.spiritualPower + 30, 0, cultivator.maxSpiritualPower); upsertEffect(cultivator, { id: "spirit-saturated", name: "Spirit Saturated", description: "Short-term cultivation boost.", source: "qi-pill", remainingTicks: 4, intensity: 1 }); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} restored spiritual power with a qi pill.` }; }
  if (actionId === "use-ward-talisman") { if (cultivator.inventory["ward-talisman"] <= 0) throw new Error("Item not available: ward-talisman"); cultivator.inventory["ward-talisman"] -= 1; upsertEffect(cultivator, { id: "warded", name: "Warded", description: "Lower combat and tribulation risk.", source: "talisman", remainingTicks: 6, intensity: 1 }); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} is now warded.` }; }
  if (actionId === "study-sword-manual" || actionId === "study-alchemy-manual" || actionId === "study-array-manual") {
    const manual = MANUAL_TECHNIQUES[actionId];
    if (cultivator.inventory[manual.itemId] <= 0) throw new Error(`Item not available: ${manual.itemId}`);
    cultivator.inventory[manual.itemId] -= 1;
    if (!cultivator.techniques.includes(manual.technique)) cultivator.techniques.push(manual.technique);
    cultivator.realmProgress = clamp(cultivator.realmProgress + 8 + (registration?.studyBonus ?? 0), 0, 200);
    upsertEffect(cultivator, manual.effect);
    return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} studied a manual and gained new insight.` };
  }
  if (actionId === "join-sect") { if (cultivator.locationId !== "sect-gate") throw new Error("You must be at the sect gate."); if (cultivator.sectId) throw new Error("Cultivator has already joined a sect."); const sect = world.sects["qing-yun-sect"]; cultivator.sectId = sect.id; cultivator.reputation += 10; cultivator.factionReputation["qing-yun-sect"] += 15; sect.memberIds.push(cultivator.id); addMessage(world, cultivator.id, "Sect", "Accepted", `${cultivator.name} joined ${sect.name}.`); return { tick: world.tick, cultivatorId: cultivator.id, actionId, accepted: true, summary: `${cultivator.name} joined ${sect.name}.` }; }
  throw new Error(`Unsupported action: ${actionId}`);
}
function resolveJob(world: WorldState, job: ActionJob): string {
  const cultivator = getCultivatorOrThrow(world, job.cultivatorId); cultivator.activeJobId = null;
  const registration = registrationModifiersOf(cultivator);
  if (job.actionId in TRAVEL_TARGETS) { cultivator.locationId = TRAVEL_TARGETS[job.actionId as keyof typeof TRAVEL_TARGETS]; return `${cultivator.name} arrived at ${world.zones[cultivator.locationId].name}.`; }
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
  if (job.actionId === "take-mortal-task") {
    cultivator.spiritStones += 140 + ((registration?.taskBonus ?? 0) * 10);
    cultivator.reputation += 8 + Math.floor((registration?.taskBonus ?? 0) / 2);
    cultivator.karma = Math.max(0, cultivator.karma - 2);
    cultivator.factionReputation.townsfolk += 8;
    return `${cultivator.name} finished a town task.`;
  }
  if (job.actionId === "take-sect-errand") {
    cultivator.spiritStones += 180 + ((registration?.sectBonus ?? 0) * 12);
    cultivator.reputation += 6 + Math.floor((registration?.sectBonus ?? 0) / 2);
    cultivator.factionReputation["qing-yun-sect"] += 12 + (registration?.sectBonus ?? 0);
    upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 });
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
      addCombatLog(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` });
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
    addCombatLog(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` });
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
  if (power >= threat) { if (job.actionId === "hunt-mine-beast") { cultivator.inventory["spirit-ore"] += 2 + (roll % 2); cultivator.spiritStones += 120 + (roll % 60); if (roll % 2 === 0) cultivator.inventory["beast-core"] += 1; upsertEffect(cultivator, { id: "qi-surge", name: "Qi Surge", description: "Better combat and cultivation.", source: "battle", remainingTicks: 4, intensity: 1 }); } else { cultivator.inventory["ruin-fragment"] += 1 + (roll % 2); cultivator.inventory["ward-talisman"] += 1; cultivator.realmProgress = clamp(cultivator.realmProgress + 12, 0, 200); upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "guardian", remainingTicks: 6, intensity: 1 }); } addCombatLog(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "victory", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} won the encounter.` }); return `${cultivator.name} won a combat encounter.`; }
  cultivator.qi = clamp(cultivator.qi - (job.actionId === "hunt-mine-beast" ? 24 + (roll % 10) : 32 + (roll % 12)), 1, cultivator.maxQi); cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, job.actionId === "hunt-mine-beast" ? 5 : 7); if (job.actionId === "challenge-guardian") upsertEffect(cultivator, { id: "poisoned", name: "Poisoned", description: "Loses qi each tick.", source: "guardian", remainingTicks: 4, intensity: 1 }); syncWounded(cultivator); addCombatLog(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, encounterId, enemyName: encounterId === "mine-beast" ? "Mine Beast" : "Ruins Guardian", outcome: "defeat", damageTaken: 0, spiritualPowerSpent: job.actionId === "hunt-mine-beast" ? 16 : 24, loot: {}, summary: `${cultivator.name} lost the encounter.` }); return `${cultivator.name} lost a combat encounter.`; }
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
      addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Closed-Door Insight", content: "The retreat produced a sudden insight into the path ahead.", severity: "medium", tags: ["event", "retreat", "insight"] });
    }
    if (cultivateRoll % 19 === 0 && !hasEffect(cultivator, "clear-mind")) {
      upsertEffect(cultivator, { id: "deviation", name: "Qi Deviation", description: "Cultivation becomes unstable and risky.", source: "cultivation", remainingTicks: 4, intensity: 1 });
      addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Qi Deviation", content: "A forced cycle disturbed the qi flow and left a deviation behind.", severity: "high", tags: ["event", "cultivation", "deviation"] });
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
      addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Sect Bounty", content: "The sect added a manual copy to your reward for finishing the errand cleanly.", severity: "medium", tags: ["event", "sect", "bounty"] });
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
  if (TIMED_ACTION_IDS.has(actionId as keyof typeof ACTION_DURATIONS)) {
    if (actionId === "cultivate") { if (cultivator.spiritStones < 80) throw new Error("Not enough spirit stones."); if (cultivator.spiritualPower < 20) throw new Error("Not enough spiritual power."); cultivator.spiritStones -= 80; cultivator.spiritualPower -= 20; }
    if ((actionId === "mine-spirit-stones" || actionId === "hunt-mine-beast") && cultivator.locationId !== "spirit-mine") throw new Error("Action only available in the spirit mine.");
    if ((actionId === "search-fortune" || actionId === "challenge-guardian") && cultivator.locationId !== "mystic-ruins") throw new Error("Action only available in the mystic ruins.");
    if (actionId === "take-mortal-task" && cultivator.locationId !== "mortal-town") throw new Error("Action only available in town.");
    if (actionId === "take-sect-errand" && (cultivator.locationId !== "sect-gate" || !cultivator.sectId)) throw new Error("Sect errand requires sect gate and sect membership.");
    if (actionId === "heal" && cultivator.locationId !== "healing-sanctuary") throw new Error("Heal requires healing sanctuary.");
    return startJob(world, cultivator, actionId as keyof typeof ACTION_DURATIONS, TRAVEL_LABELS[actionId] ?? actionId);
  }
  return immediateAction(world, cultivator, actionId);
}

export function advanceWorld(world: WorldState, steps: number): TickSummary {
  const safeSteps = clamp(Math.floor(steps), 1, 200); const completedJobs: TickSummary["completedJobs"] = []; const tribulations: TickSummary["tribulations"] = []; const triggeredEvents: WorldEvent[] = [];
  for (let i = 0; i < safeSteps; i += 1) {
    world.tick += 1;
    for (const cultivator of Object.values(world.cultivators)) {
      cultivator.age += 1 / TICKS_PER_YEAR; if (!cultivator.activeJobId && cultivator.injuryTicksRemaining > 0) cultivator.injuryTicksRemaining -= 1; if (cultivator.locationId === "healing-sanctuary" && !cultivator.activeJobId) { cultivator.qi = clamp(cultivator.qi + 3, 1, cultivator.maxQi); cultivator.spiritualPower = clamp(cultivator.spiritualPower + 3, 0, cultivator.maxSpiritualPower); }
      cultivator.statusEffects = cultivator.statusEffects.filter((effect) => effect.id === "wounded" || ((effect.id !== "poisoned" || (cultivator.qi = clamp(cultivator.qi - 4 * effect.intensity, 1, cultivator.maxQi))) && (effect.id !== "clear-mind" || (cultivator.spiritualPower = clamp(cultivator.spiritualPower + 3 * effect.intensity, 0, cultivator.maxSpiritualPower))) && (effect.id !== "spirit-saturated" || (cultivator.spiritualPower = clamp(cultivator.spiritualPower + 2 * effect.intensity, 0, cultivator.maxSpiritualPower))) && --effect.remainingTicks > 0));
      syncWounded(cultivator);
    }
    for (const job of Object.values(world.jobs)) { job.remainingTicks -= 1; if (job.remainingTicks > 0) continue; const summary = resolveEnhancedJob(world, job); completedJobs.push({ cultivatorId: job.cultivatorId, actionId: job.actionId, summary }); delete world.jobs[job.id]; }
    for (const cultivator of Object.values(world.cultivators)) {
      const roll = hashString(`${world.tick}:${cultivator.id}:${cultivator.locationId}:event`); if (cultivator.activeJobId || roll % 17 !== 0) continue;
      if (cultivator.locationId === "mortal-town") { cultivator.spiritStones += 60; cultivator.factionReputation.townsfolk += 4; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Town Rush", content: "A quick town request paid out.", severity: "low", tags: ["event", "town"] })); }
      else if (cultivator.locationId === "market") { if (roll % 34 === 0) { cultivator.inventory["sword-manual"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Black Market Broker", content: "A hidden broker offered a copied sword manual at a suspiciously low price.", severity: "medium", tags: ["event", "market", "black-market"] })); } else { cultivator.inventory["qi-pill"] += 1; cultivator.factionReputation["market-guild"] += 4; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Guild Discount", content: "The market guild gave a free qi pill.", severity: "low", tags: ["event", "market"] })); } }
      else if (cultivator.locationId === "sect-gate") { cultivator.factionReputation["qing-yun-sect"] += cultivator.sectId ? 5 : 3; upsertEffect(cultivator, { id: "clear-mind", name: "Clear Mind", description: "Better recovery and cultivation.", source: "sect", remainingTicks: 3, intensity: 1 }); if (roll % 5 === 0) cultivator.inventory["array-manual"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: roll % 5 === 0 ? "Sect Bounty Board" : "Sect Notice", content: roll % 5 === 0 ? "A sect bounty paid out with a copied manual and a bit more trust." : "A sect elder noticed you.", severity: "low", tags: ["event", "sect"] })); }
      else if (cultivator.locationId === "spirit-mine") { cultivator.inventory["spirit-ore"] += 1; triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Vein Surge", content: "A loose ore vein opened nearby.", severity: "medium", tags: ["event", "mine"] })); }
      else if (cultivator.locationId === "mystic-ruins") { cultivator.inventory["ruin-fragment"] += 1; upsertEffect(cultivator, { id: "fortune-marked", name: "Fortune Marked", description: "Better ruins outcomes.", source: "ruins", remainingTicks: 5, intensity: 1 }); triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: "Ruins Resonance", content: "A broken tablet resonated with you.", severity: "medium", tags: ["event", "ruins"] })); }
      else if (cultivator.locationId === "healing-sanctuary") { cultivator.qi = clamp(cultivator.qi + 12, 1, cultivator.maxQi); cultivator.spiritualPower = clamp(cultivator.spiritualPower + 12, 0, cultivator.maxSpiritualPower); upsertEffect(cultivator, { id: "warded", name: "Warded", description: "Lower combat and tribulation risk.", source: "sanctuary", remainingTicks: 4, intensity: 1 }); upsertEffect(cultivator, { id: roll % 5 === 0 ? "insight" : "spirit-saturated", name: roll % 5 === 0 ? "Insight" : "Spirit Saturated", description: roll % 5 === 0 ? "Short-term bonus to cultivation and combat." : "Short-term cultivation boost.", source: "sanctuary", remainingTicks: 4, intensity: 1 }); triggeredEvents.push(addWorldEvent(world, { cultivatorId: cultivator.id, zoneId: cultivator.locationId, title: roll % 5 === 0 ? "Retreat Epiphany" : "Spring Tide", content: roll % 5 === 0 ? "The sanctuary retreat triggered a small epiphany." : "Healing mist strengthened your body.", severity: "medium", tags: ["event", "healing"] })); }
    }
    for (const cultivator of Object.values(world.cultivators)) {
      const difficulty = tribulationDifficulty(cultivator); if (!difficulty || world.tick < cultivator.nextTribulationTick || cultivator.activeJobId) continue;
      cultivator.nextTribulationTick += 100; const support = getTribulationPreview(world, cultivator.id).supportScore; const score = cultivator.qi + cultivator.spiritualPower + Math.floor(cultivator.reputation / 5) + support;
      if (score >= difficulty + 50) { cultivator.qi = clamp(cultivator.qi - 12, 1, cultivator.maxQi); cultivator.spiritualPower = clamp(cultivator.spiritualPower - 15, 0, cultivator.maxSpiritualPower); tribulations.push({ cultivatorId: cultivator.id, success: true, summary: `${cultivator.name} passed ${tribulationType(cultivator)}.` }); }
      else { cultivator.qi = clamp(cultivator.qi - 36, 1, cultivator.maxQi); cultivator.spiritualPower = clamp(cultivator.spiritualPower - 24, 0, cultivator.maxSpiritualPower); cultivator.realmProgress = Math.max(0, cultivator.realmProgress - 15); cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, 6); syncWounded(cultivator); tribulations.push({ cultivatorId: cultivator.id, success: false, summary: `${cultivator.name} failed ${tribulationType(cultivator)}.` }); }
    }
  }
  world.updatedAt = new Date().toISOString(); return { tick: world.tick, advancedTicks: safeSteps, completedJobs, tribulations, triggeredEvents };
}

export function getSectInfo(world: WorldState, cultivatorId: string) {
  const cultivator = getCultivatorOrThrow(world, cultivatorId); if (!cultivator.sectId) return null; const sect = world.sects[cultivator.sectId]; if (!sect) return null;
  return { id: sect.id, name: sect.name, type: sect.type, treasury: sect.treasury, memberCount: sect.memberIds.length, spiritVeins: sect.spiritVeins, role: "Outer Disciple" };
}
