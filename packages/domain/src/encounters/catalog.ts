/**
 * Encounter Build Registry
 *
 * Each encounter build is the reusable routing identity behind a fight scene.
 * It says which enemy configs appear, under what entry, and with what family identity.
 *
 * This is the "scene direction" layer — enemy configs are the "actor" layer.
 */

import type { EnemyConfigId, EnemyContextTag, RewardBiasTag } from "./enemy-configs.js";

// ---- Branded ID ----
export type EncounterBuildId = string & { readonly __brand: "EncounterBuildId" };

// ---- Battle Source Kind ----
export type BattleSourceKind =
  | "pve-event"
  | "pve-direct"
  | "pvp-duel"
  | "pvp-arena";

// ---- Encounter Family ----
export type EncounterFamily =
  | "wilderness-beast"
  | "wilderness-guardian"
  | "dungeon-guardian-heavy"
  | "dungeon-guardian-spell"
  | "dungeon-guardian-seal"
  | "dungeon-guardian-swift"
  | "dungeon-guardian-drain"
  | "dungeon-hazard"
  | "event-encounter";

// ---- Encounter Build Definition ----
export interface EncounterBuildDefinition {
  readonly id: EncounterBuildId;
  readonly name: string;
  readonly nameCn: string;
  readonly battleSourceKind: BattleSourceKind;
  readonly enemyConfigIds: readonly EnemyConfigId[];
  readonly encounterFamily: EncounterFamily;
  readonly contextTags: readonly EnemyContextTag[];
  readonly rewardBias: readonly RewardBiasTag[];
}

// ---- Registry ----

const ENCOUNTER_BUILDS: Record<string, EncounterBuildDefinition> = {
  // ── Wilderness: Direct PVE ──
  "wilderness-vein-beast-hunt": {
    id: "wilderness-vein-beast-hunt" as EncounterBuildId,
    name: "Vein Beast Hunt",
    nameCn: "脉兽追猎",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-vein-beast" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "wilderness-dust-crawler-ambush": {
    id: "wilderness-dust-crawler-ambush" as EncounterBuildId,
    name: "Dust Crawler Ambush",
    nameCn: "尘行蜈突袭",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-dust-crawler" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["salvage"],
  },
  "wilderness-stone-sentinel-clash": {
    id: "wilderness-stone-sentinel-clash" as EncounterBuildId,
    name: "Stone Sentinel Clash",
    nameCn: "石哨卫交锋",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-stone-sentinel" as EnemyConfigId],
    encounterFamily: "wilderness-guardian",
    contextTags: ["wilderness", "construct", "guardian"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Wilderness: Event PVE ──
  "wilderness-ancient-guardian-event": {
    id: "wilderness-ancient-guardian-event" as EncounterBuildId,
    name: "Ancient Guardian Encounter",
    nameCn: "古守遭遇",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["wilderness-ancient-guardian" as EnemyConfigId],
    encounterFamily: "wilderness-guardian",
    contextTags: ["wilderness", "guardian", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Dungeon: Guardian Families (Direct PVE) ──
  "dungeon-guardian-heavy": {
    id: "dungeon-guardian-heavy" as EncounterBuildId,
    name: "Heavy Guardian Encounter",
    nameCn: "重压守关",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["guardian-heavy-warden" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-heavy",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },
  "dungeon-guardian-spell": {
    id: "dungeon-guardian-spell" as EncounterBuildId,
    name: "Spell Guardian Encounter",
    nameCn: "术式守关",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["guardian-spell-warden" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-spell",
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  "dungeon-guardian-seal": {
    id: "dungeon-guardian-seal" as EncounterBuildId,
    name: "Iron Seal Guardian Encounter",
    nameCn: "守印铁卫守关",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["guardian-iron-seal" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-seal",
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },
  "dungeon-guardian-swift": {
    id: "dungeon-guardian-swift" as EncounterBuildId,
    name: "Swift Guardian Encounter",
    nameCn: "速袭守关",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["guardian-swift-striker" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-swift",
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "dungeon-guardian-drain": {
    id: "dungeon-guardian-drain" as EncounterBuildId,
    name: "Drain Guardian Encounter",
    nameCn: "消耗守关",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["guardian-drain-ward" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-drain",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },

  // ══════════════════════════════════════════════════════════
  //  Dungeon: Grade-Tiered Guardian Encounter Builds (丙/乙/甲)
  // ══════════════════════════════════════════════════════════

  // ── Heavy Warden ──
  "dungeon-guardian-heavy-bing": {
    id: "dungeon-guardian-heavy-bing" as EncounterBuildId,
    name: "Heavy Guardian (Bing)",
    nameCn: "重压守关·丙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-heavy-warden-bing" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-heavy",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },
  "dungeon-guardian-heavy-yi": {
    id: "dungeon-guardian-heavy-yi" as EncounterBuildId,
    name: "Heavy Guardian (Yi)",
    nameCn: "重压守关·乙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-heavy-warden-yi" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-heavy",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },
  "dungeon-guardian-heavy-jia": {
    id: "dungeon-guardian-heavy-jia" as EncounterBuildId,
    name: "Heavy Guardian (Jia)",
    nameCn: "重压守关·甲",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-heavy-warden-jia" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-heavy",
    contextTags: ["guardian", "dungeon", "elite"],
    rewardBias: ["weapon-material"],
  },

  // ── Spell Warden ──
  "dungeon-guardian-spell-bing": {
    id: "dungeon-guardian-spell-bing" as EncounterBuildId,
    name: "Spell Guardian (Bing)",
    nameCn: "术式守关·丙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-spell-warden-bing" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-spell",
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  "dungeon-guardian-spell-yi": {
    id: "dungeon-guardian-spell-yi" as EncounterBuildId,
    name: "Spell Guardian (Yi)",
    nameCn: "术式守关·乙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-spell-warden-yi" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-spell",
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  "dungeon-guardian-spell-jia": {
    id: "dungeon-guardian-spell-jia" as EncounterBuildId,
    name: "Spell Guardian (Jia)",
    nameCn: "术式守关·甲",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-spell-warden-jia" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-spell",
    contextTags: ["guardian", "dungeon", "ritual", "elite"],
    rewardBias: ["spell-fragment"],
  },

  // ── Iron Seal ──
  "dungeon-guardian-seal-bing": {
    id: "dungeon-guardian-seal-bing" as EncounterBuildId,
    name: "Iron Seal Guardian (Bing)",
    nameCn: "守印铁卫守关·丙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-iron-seal-bing" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-seal",
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },
  "dungeon-guardian-seal-yi": {
    id: "dungeon-guardian-seal-yi" as EncounterBuildId,
    name: "Iron Seal Guardian (Yi)",
    nameCn: "守印铁卫守关·乙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-iron-seal-yi" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-seal",
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },
  "dungeon-guardian-seal-jia": {
    id: "dungeon-guardian-seal-jia" as EncounterBuildId,
    name: "Iron Seal Guardian (Jia)",
    nameCn: "守印铁卫守关·甲",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-iron-seal-jia" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-seal",
    contextTags: ["guardian", "dungeon", "construct", "elite"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Swift Striker ──
  "dungeon-guardian-swift-bing": {
    id: "dungeon-guardian-swift-bing" as EncounterBuildId,
    name: "Swift Guardian (Bing)",
    nameCn: "速袭守关·丙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-swift-striker-bing" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-swift",
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "dungeon-guardian-swift-yi": {
    id: "dungeon-guardian-swift-yi" as EncounterBuildId,
    name: "Swift Guardian (Yi)",
    nameCn: "速袭守关·乙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-swift-striker-yi" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-swift",
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "dungeon-guardian-swift-jia": {
    id: "dungeon-guardian-swift-jia" as EncounterBuildId,
    name: "Swift Guardian (Jia)",
    nameCn: "速袭守关·甲",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-swift-striker-jia" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-swift",
    contextTags: ["guardian", "dungeon", "ambush", "elite"],
    rewardBias: ["salvage", "weapon-material"],
  },

  // ── Drain Ward ──
  "dungeon-guardian-drain-bing": {
    id: "dungeon-guardian-drain-bing" as EncounterBuildId,
    name: "Drain Guardian (Bing)",
    nameCn: "消耗守关·丙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-drain-ward-bing" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-drain",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },
  "dungeon-guardian-drain-yi": {
    id: "dungeon-guardian-drain-yi" as EncounterBuildId,
    name: "Drain Guardian (Yi)",
    nameCn: "消耗守关·乙",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-drain-ward-yi" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-drain",
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },
  "dungeon-guardian-drain-jia": {
    id: "dungeon-guardian-drain-jia" as EncounterBuildId,
    name: "Drain Guardian (Jia)",
    nameCn: "消耗守关·甲",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["guardian-drain-ward-jia" as EnemyConfigId],
    encounterFamily: "dungeon-guardian-drain",
    contextTags: ["guardian", "dungeon", "elite"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },

  // ══════════════════════════════════════════════════════════
  //  Wilderness: Additional Event Encounter Builds
  // ══════════════════════════════════════════════════════════

  "wilderness-spirit-wisp-haunt": {
    id: "wilderness-spirit-wisp-haunt" as EncounterBuildId,
    name: "Spirit Wisp Haunt",
    nameCn: "灵游火纠缠",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["wilderness-spirit-wisp" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  "wilderness-wind-hawk-dive": {
    id: "wilderness-wind-hawk-dive" as EncounterBuildId,
    name: "Wind Hawk Dive",
    nameCn: "风鸢俯冲",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-wind-hawk" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage"],
  },
  "wilderness-marsh-lurker-ambush": {
    id: "wilderness-marsh-lurker-ambush" as EncounterBuildId,
    name: "Marsh Lurker Ambush",
    nameCn: "沼伏突袭",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["wilderness-marsh-lurker" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["cultivation-aid"],
  },
  "wilderness-shadow-hound-pack": {
    id: "wilderness-shadow-hound-pack" as EncounterBuildId,
    name: "Shadow Hound Pack",
    nameCn: "影犬狩猎",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-shadow-hound" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "wilderness-iron-beetle-clash": {
    id: "wilderness-iron-beetle-clash" as EncounterBuildId,
    name: "Iron Beetle Clash",
    nameCn: "铁甲虫碰撞",
    battleSourceKind: "pve-direct",
    enemyConfigIds: ["wilderness-iron-beetle" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast", "construct"],
    rewardBias: ["weapon-material"],
  },
  "wilderness-rift-serpent-strike": {
    id: "wilderness-rift-serpent-strike" as EncounterBuildId,
    name: "Rift Serpent Strike",
    nameCn: "裂缝蛇突袭",
    battleSourceKind: "pve-event",
    enemyConfigIds: ["wilderness-rift-serpent" as EnemyConfigId],
    encounterFamily: "wilderness-beast",
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage", "cultivation-aid"],
  },
};

// ---- Public API ----

export function getEncounterBuild(id: EncounterBuildId): EncounterBuildDefinition | null {
  return ENCOUNTER_BUILDS[id] ?? null;
}

export function getAllEncounterBuilds(): readonly EncounterBuildDefinition[] {
  return Object.values(ENCOUNTER_BUILDS);
}

export function getEncounterBuildsByFamily(family: EncounterFamily): readonly EncounterBuildDefinition[] {
  return Object.values(ENCOUNTER_BUILDS).filter((b) => b.encounterFamily === family);
}

export function getEncounterBuildsBySource(source: BattleSourceKind): readonly EncounterBuildDefinition[] {
  return Object.values(ENCOUNTER_BUILDS).filter((b) => b.battleSourceKind === source);
}

export function getEncounterBuildsByTag(tag: EnemyContextTag): readonly EncounterBuildDefinition[] {
  return Object.values(ENCOUNTER_BUILDS).filter((b) => b.contextTags.includes(tag));
}

/** All guardian encounter build IDs for dungeon use, for random selection per grade/rank. */
const DUNGEON_GUARDIAN_BUILD_IDS: readonly EncounterBuildId[] = [
  "dungeon-guardian-heavy" as EncounterBuildId,
  "dungeon-guardian-spell" as EncounterBuildId,
  "dungeon-guardian-seal" as EncounterBuildId,
  "dungeon-guardian-swift" as EncounterBuildId,
  "dungeon-guardian-drain" as EncounterBuildId,
];

/** All wilderness encounter build IDs for direct PVE hunt selection. */
const WILDERNESS_DIRECT_BUILD_IDS: readonly EncounterBuildId[] = [
  "wilderness-vein-beast-hunt" as EncounterBuildId,
  "wilderness-dust-crawler-ambush" as EncounterBuildId,
  "wilderness-stone-sentinel-clash" as EncounterBuildId,
  "wilderness-wind-hawk-dive" as EncounterBuildId,
  "wilderness-shadow-hound-pack" as EncounterBuildId,
  "wilderness-iron-beetle-clash" as EncounterBuildId,
];

export function pickDungeonGuardianBuildId(seed: number): EncounterBuildId {
  return DUNGEON_GUARDIAN_BUILD_IDS[Math.abs(seed) % DUNGEON_GUARDIAN_BUILD_IDS.length];
}

export function pickWildernessCombatBuildId(seed: number): EncounterBuildId {
  return WILDERNESS_DIRECT_BUILD_IDS[Math.abs(seed) % WILDERNESS_DIRECT_BUILD_IDS.length];
}
