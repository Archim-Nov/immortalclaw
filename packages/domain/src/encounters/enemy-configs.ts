/**
 * Enemy Config Registry
 *
 * Each enemy config is the reusable mechanical identity of one opponent.
 * It defines how a specific enemy fights, what loadout they carry, and
 * what context tags they belong to.
 *
 * This is the "actor" layer — encounter builds are the "scene direction" layer.
 */

import type { CombatStyle, EncounterTemplate, WeaponLoadoutId, SpellLoadoutId } from "../model.js";

// ---- Branded ID ----
export type EnemyConfigId = string & { readonly __brand: "EnemyConfigId" };

// ---- Context Tags ----
export type EnemyContextTag =
  | "wilderness"
  | "guardian"
  | "dungeon"
  | "ritual"
  | "elite"
  | "ambush"
  | "ruin"
  | "beast"
  | "construct"
  | "cultivator";

// ---- Reward Bias Tags ----
export type RewardBiasTag =
  | "weapon-material"
  | "spell-fragment"
  | "salvage"
  | "cultivation-aid"
  | "utility";

// ---- Enemy Config Definition ----
export interface EnemyConfigDefinition {
  readonly id: EnemyConfigId;
  readonly name: string;
  readonly nameCn: string;
  readonly maxRounds: number;
  readonly stylePreference: readonly CombatStyle[];
  readonly baseHp: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly hit: number;
  readonly dodge: number;
  readonly crit: number;
  readonly critDamage: number;
  readonly guardHeart: number;
  readonly escapeAllowed?: boolean;
  readonly equippedWeaponLoadoutId?: WeaponLoadoutId;
  readonly equippedSpellLoadoutId?: SpellLoadoutId;
  readonly spirit?: number;
  readonly maxSpirit?: number;
  readonly contextTags: readonly EnemyContextTag[];
  readonly rewardBias: readonly RewardBiasTag[];
}

// ---- Registry ----

const ENEMY_CONFIGS: Record<string, EnemyConfigDefinition> = {
  // ── Wilderness: Mine Beast Family ──
  "wilderness-vein-beast": {
    id: "wilderness-vein-beast" as EnemyConfigId,
    name: "Vein Beast",
    nameCn: "脉兽",
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
    equippedWeaponLoadoutId: "starter-gauntlets" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "wilderness-dust-crawler": {
    id: "wilderness-dust-crawler" as EnemyConfigId,
    name: "Dust Crawler",
    nameCn: "尘行蜈",
    maxRounds: 5,
    stylePreference: ["finesse", "brute", "tactic"],
    baseHp: 100,
    attack: 30,
    defense: 14,
    speed: 28,
    hit: 35,
    dodge: 22,
    crit: 12,
    critDamage: 35,
    guardHeart: 3,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["salvage"],
  },
  "wilderness-stone-sentinel": {
    id: "wilderness-stone-sentinel" as EnemyConfigId,
    name: "Stone Sentinel",
    nameCn: "石哨卫",
    maxRounds: 5,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 160,
    attack: 28,
    defense: 32,
    speed: 14,
    hit: 28,
    dodge: 6,
    crit: 5,
    critDamage: 30,
    guardHeart: 12,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    spirit: 40,
    maxSpirit: 40,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    contextTags: ["wilderness", "construct", "guardian"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Dungeon: Guardian Family — Heavy Pressure ──
  "guardian-heavy-warden": {
    id: "guardian-heavy-warden" as EnemyConfigId,
    name: "Heavy Warden",
    nameCn: "重压守卫",
    maxRounds: 7,
    stylePreference: ["brute", "tactic", "finesse"],
    baseHp: 200,
    attack: 50,
    defense: 30,
    speed: 14,
    hit: 35,
    dodge: 8,
    crit: 10,
    critDamage: 50,
    guardHeart: 14,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    spirit: 60,
    maxSpirit: 60,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },

  // ── Dungeon: Guardian Family — Spell Caster ──
  "guardian-spell-warden": {
    id: "guardian-spell-warden" as EnemyConfigId,
    name: "Spell Warden",
    nameCn: "术式守卫",
    maxRounds: 7,
    stylePreference: ["tactic", "finesse", "brute"],
    baseHp: 160,
    attack: 38,
    defense: 22,
    speed: 20,
    hit: 38,
    dodge: 14,
    crit: 14,
    critDamage: 45,
    guardHeart: 8,
    equippedWeaponLoadoutId: "starter-sword" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-fire-blaze" as SpellLoadoutId,
    spirit: 80,
    maxSpirit: 80,
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },

  // ── Dungeon: Guardian Family — Fortified Defender ──
  "guardian-iron-seal": {
    id: "guardian-iron-seal" as EnemyConfigId,
    name: "Iron Seal Guardian",
    nameCn: "守印铁卫",
    maxRounds: 7,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 240,
    attack: 40,
    defense: 38,
    speed: 12,
    hit: 30,
    dodge: 5,
    crit: 6,
    critDamage: 35,
    guardHeart: 18,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-wall" as SpellLoadoutId,
    spirit: 50,
    maxSpirit: 50,
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Dungeon: Guardian Family — Speed Raider ──
  "guardian-swift-striker": {
    id: "guardian-swift-striker" as EnemyConfigId,
    name: "Swift Striker",
    nameCn: "速袭守卫",
    maxRounds: 7,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 140,
    attack: 45,
    defense: 18,
    speed: 30,
    hit: 40,
    dodge: 24,
    crit: 18,
    critDamage: 55,
    guardHeart: 4,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },

  // ── Dungeon: Guardian Family — Attrition / Drain ──
  "guardian-drain-ward": {
    id: "guardian-drain-ward" as EnemyConfigId,
    name: "Drain Ward",
    nameCn: "消耗守卫",
    maxRounds: 7,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 180,
    attack: 34,
    defense: 26,
    speed: 16,
    hit: 32,
    dodge: 10,
    crit: 8,
    critDamage: 38,
    guardHeart: 10,
    equippedWeaponLoadoutId: "starter-whip" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-water-flow" as SpellLoadoutId,
    spirit: 70,
    maxSpirit: 70,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },

  // ── Wilderness: Ancient Guardian (event-based) ──
  "wilderness-ancient-guardian": {
    id: "wilderness-ancient-guardian" as EnemyConfigId,
    name: "Ancient Guardian",
    nameCn: "古守",
    maxRounds: 5,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 180,
    attack: 42,
    defense: 28,
    speed: 16,
    hit: 32,
    dodge: 8,
    crit: 10,
    critDamage: 45,
    guardHeart: 12,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    spirit: 50,
    maxSpirit: 50,
    contextTags: ["wilderness", "guardian", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ══════════════════════════════════════════════════════════
  //  Wilderness: Additional Beast Types (event variety)
  // ══════════════════════════════════════════════════════════

  "wilderness-spirit-wisp": {
    id: "wilderness-spirit-wisp" as EnemyConfigId,
    name: "Spirit Wisp",
    nameCn: "灵游火",
    maxRounds: 5,
    stylePreference: ["tactic", "finesse", "brute"],
    baseHp: 80,
    attack: 22,
    defense: 10,
    speed: 24,
    hit: 34,
    dodge: 20,
    crit: 14,
    critDamage: 38,
    guardHeart: 2,
    equippedSpellLoadoutId: "starter-fire-blaze" as SpellLoadoutId,
    spirit: 60,
    maxSpirit: 60,
    contextTags: ["wilderness", "beast", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  "wilderness-wind-hawk": {
    id: "wilderness-wind-hawk" as EnemyConfigId,
    name: "Wind Hawk",
    nameCn: "风鸢",
    maxRounds: 5,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 85,
    attack: 32,
    defense: 10,
    speed: 32,
    hit: 36,
    dodge: 28,
    crit: 16,
    critDamage: 42,
    guardHeart: 2,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage"],
  },
  "wilderness-marsh-lurker": {
    id: "wilderness-marsh-lurker" as EnemyConfigId,
    name: "Marsh Lurker",
    nameCn: "沼伏",
    maxRounds: 5,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 130,
    attack: 28,
    defense: 20,
    speed: 16,
    hit: 30,
    dodge: 12,
    crit: 10,
    critDamage: 36,
    guardHeart: 8,
    equippedWeaponLoadoutId: "starter-whip" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-water-flow" as SpellLoadoutId,
    spirit: 40,
    maxSpirit: 40,
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["cultivation-aid"],
  },
  "wilderness-shadow-hound": {
    id: "wilderness-shadow-hound" as EnemyConfigId,
    name: "Shadow Hound",
    nameCn: "影犬",
    maxRounds: 5,
    stylePreference: ["finesse", "brute", "tactic"],
    baseHp: 90,
    attack: 34,
    defense: 12,
    speed: 30,
    hit: 38,
    dodge: 24,
    crit: 20,
    critDamage: 50,
    guardHeart: 3,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  "wilderness-iron-beetle": {
    id: "wilderness-iron-beetle" as EnemyConfigId,
    name: "Iron Beetle",
    nameCn: "铁甲虫",
    maxRounds: 5,
    stylePreference: ["brute", "tactic", "finesse"],
    baseHp: 170,
    attack: 26,
    defense: 34,
    speed: 10,
    hit: 24,
    dodge: 4,
    crit: 4,
    critDamage: 28,
    guardHeart: 14,
    equippedWeaponLoadoutId: "starter-gauntlets" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast", "construct"],
    rewardBias: ["weapon-material"],
  },
  "wilderness-rift-serpent": {
    id: "wilderness-rift-serpent" as EnemyConfigId,
    name: "Rift Serpent",
    nameCn: "裂缝蛇",
    maxRounds: 5,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 95,
    attack: 30,
    defense: 14,
    speed: 28,
    hit: 32,
    dodge: 26,
    crit: 12,
    critDamage: 40,
    guardHeart: 4,
    equippedWeaponLoadoutId: "starter-sword" as WeaponLoadoutId,
    contextTags: ["wilderness", "beast"],
    rewardBias: ["salvage", "cultivation-aid"],
  },

  // ══════════════════════════════════════════════════════════
  //  Dungeon: Grade-Tiered Guardian Configs (丙/乙/甲)
  // ══════════════════════════════════════════════════════════

  // ── Heavy Warden — 丙 ──
  "guardian-heavy-warden-bing": {
    id: "guardian-heavy-warden-bing" as EnemyConfigId,
    name: "Heavy Warden (Bing)",
    nameCn: "重压守卫·丙",
    maxRounds: 5,
    stylePreference: ["brute", "tactic", "finesse"],
    baseHp: 130,
    attack: 32,
    defense: 20,
    speed: 12,
    hit: 24,
    dodge: 6,
    crit: 7,
    critDamage: 35,
    guardHeart: 9,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    spirit: 35,
    maxSpirit: 35,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },
  // ── Heavy Warden — 乙 ──
  "guardian-heavy-warden-yi": {
    id: "guardian-heavy-warden-yi" as EnemyConfigId,
    name: "Heavy Warden (Yi)",
    nameCn: "重压守卫·乙",
    maxRounds: 7,
    stylePreference: ["brute", "tactic", "finesse"],
    baseHp: 200,
    attack: 50,
    defense: 30,
    speed: 14,
    hit: 35,
    dodge: 8,
    crit: 10,
    critDamage: 50,
    guardHeart: 14,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    spirit: 60,
    maxSpirit: 60,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["weapon-material"],
  },
  // ── Heavy Warden — 甲 ──
  "guardian-heavy-warden-jia": {
    id: "guardian-heavy-warden-jia" as EnemyConfigId,
    name: "Heavy Warden (Jia)",
    nameCn: "重压守卫·甲",
    maxRounds: 8,
    stylePreference: ["brute", "tactic", "finesse"],
    baseHp: 280,
    attack: 68,
    defense: 42,
    speed: 16,
    hit: 46,
    dodge: 10,
    crit: 13,
    critDamage: 60,
    guardHeart: 19,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-suppress" as SpellLoadoutId,
    spirit: 85,
    maxSpirit: 85,
    contextTags: ["guardian", "dungeon", "elite"],
    rewardBias: ["weapon-material"],
  },

  // ── Spell Warden — 丙 ──
  "guardian-spell-warden-bing": {
    id: "guardian-spell-warden-bing" as EnemyConfigId,
    name: "Spell Warden (Bing)",
    nameCn: "术式守卫·丙",
    maxRounds: 5,
    stylePreference: ["tactic", "finesse", "brute"],
    baseHp: 105,
    attack: 25,
    defense: 14,
    speed: 17,
    hit: 26,
    dodge: 10,
    crit: 10,
    critDamage: 35,
    guardHeart: 5,
    equippedWeaponLoadoutId: "starter-sword" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-fire-blaze" as SpellLoadoutId,
    spirit: 50,
    maxSpirit: 50,
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  // ── Spell Warden — 乙 ──
  "guardian-spell-warden-yi": {
    id: "guardian-spell-warden-yi" as EnemyConfigId,
    name: "Spell Warden (Yi)",
    nameCn: "术式守卫·乙",
    maxRounds: 7,
    stylePreference: ["tactic", "finesse", "brute"],
    baseHp: 160,
    attack: 38,
    defense: 22,
    speed: 20,
    hit: 38,
    dodge: 14,
    crit: 14,
    critDamage: 45,
    guardHeart: 8,
    equippedWeaponLoadoutId: "starter-sword" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-fire-blaze" as SpellLoadoutId,
    spirit: 80,
    maxSpirit: 80,
    contextTags: ["guardian", "dungeon", "ritual"],
    rewardBias: ["spell-fragment"],
  },
  // ── Spell Warden — 甲 ──
  "guardian-spell-warden-jia": {
    id: "guardian-spell-warden-jia" as EnemyConfigId,
    name: "Spell Warden (Jia)",
    nameCn: "术式守卫·甲",
    maxRounds: 8,
    stylePreference: ["tactic", "finesse", "brute"],
    baseHp: 225,
    attack: 52,
    defense: 30,
    speed: 24,
    hit: 50,
    dodge: 18,
    crit: 18,
    critDamage: 55,
    guardHeart: 11,
    equippedWeaponLoadoutId: "starter-sword" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-fire-blaze" as SpellLoadoutId,
    spirit: 110,
    maxSpirit: 110,
    contextTags: ["guardian", "dungeon", "ritual", "elite"],
    rewardBias: ["spell-fragment"],
  },

  // ── Iron Seal — 丙 ──
  "guardian-iron-seal-bing": {
    id: "guardian-iron-seal-bing" as EnemyConfigId,
    name: "Iron Seal Guardian (Bing)",
    nameCn: "守印铁卫·丙",
    maxRounds: 5,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 155,
    attack: 26,
    defense: 25,
    speed: 10,
    hit: 20,
    dodge: 4,
    crit: 4,
    critDamage: 28,
    guardHeart: 12,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-wall" as SpellLoadoutId,
    spirit: 30,
    maxSpirit: 30,
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },
  // ── Iron Seal — 乙 ──
  "guardian-iron-seal-yi": {
    id: "guardian-iron-seal-yi" as EnemyConfigId,
    name: "Iron Seal Guardian (Yi)",
    nameCn: "守印铁卫·乙",
    maxRounds: 7,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 240,
    attack: 40,
    defense: 38,
    speed: 12,
    hit: 30,
    dodge: 5,
    crit: 6,
    critDamage: 35,
    guardHeart: 18,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-wall" as SpellLoadoutId,
    spirit: 50,
    maxSpirit: 50,
    contextTags: ["guardian", "dungeon", "construct"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },
  // ── Iron Seal — 甲 ──
  "guardian-iron-seal-jia": {
    id: "guardian-iron-seal-jia" as EnemyConfigId,
    name: "Iron Seal Guardian (Jia)",
    nameCn: "守印铁卫·甲",
    maxRounds: 8,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 335,
    attack: 55,
    defense: 52,
    speed: 14,
    hit: 40,
    dodge: 7,
    crit: 8,
    critDamage: 42,
    guardHeart: 24,
    equippedWeaponLoadoutId: "starter-halberd" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-earth-wall" as SpellLoadoutId,
    spirit: 70,
    maxSpirit: 70,
    contextTags: ["guardian", "dungeon", "construct", "elite"],
    rewardBias: ["weapon-material", "cultivation-aid"],
  },

  // ── Swift Striker — 丙 ──
  "guardian-swift-striker-bing": {
    id: "guardian-swift-striker-bing" as EnemyConfigId,
    name: "Swift Striker (Bing)",
    nameCn: "速袭守卫·丙",
    maxRounds: 5,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 90,
    attack: 30,
    defense: 12,
    speed: 26,
    hit: 28,
    dodge: 17,
    crit: 13,
    critDamage: 42,
    guardHeart: 3,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  // ── Swift Striker — 乙 ──
  "guardian-swift-striker-yi": {
    id: "guardian-swift-striker-yi" as EnemyConfigId,
    name: "Swift Striker (Yi)",
    nameCn: "速袭守卫·乙",
    maxRounds: 7,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 140,
    attack: 45,
    defense: 18,
    speed: 30,
    hit: 40,
    dodge: 24,
    crit: 18,
    critDamage: 55,
    guardHeart: 4,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["guardian", "dungeon", "ambush"],
    rewardBias: ["salvage", "weapon-material"],
  },
  // ── Swift Striker — 甲 ──
  "guardian-swift-striker-jia": {
    id: "guardian-swift-striker-jia" as EnemyConfigId,
    name: "Swift Striker (Jia)",
    nameCn: "速袭守卫·甲",
    maxRounds: 8,
    stylePreference: ["finesse", "tactic", "brute"],
    baseHp: 195,
    attack: 62,
    defense: 25,
    speed: 36,
    hit: 54,
    dodge: 32,
    crit: 23,
    critDamage: 65,
    guardHeart: 6,
    equippedWeaponLoadoutId: "starter-dagger" as WeaponLoadoutId,
    contextTags: ["guardian", "dungeon", "ambush", "elite"],
    rewardBias: ["salvage", "weapon-material"],
  },

  // ── Drain Ward — 丙 ──
  "guardian-drain-ward-bing": {
    id: "guardian-drain-ward-bing" as EnemyConfigId,
    name: "Drain Ward (Bing)",
    nameCn: "消耗守卫·丙",
    maxRounds: 5,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 120,
    attack: 22,
    defense: 17,
    speed: 14,
    hit: 22,
    dodge: 7,
    crit: 6,
    critDamage: 30,
    guardHeart: 7,
    equippedWeaponLoadoutId: "starter-whip" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-water-flow" as SpellLoadoutId,
    spirit: 45,
    maxSpirit: 45,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },
  // ── Drain Ward — 乙 ──
  "guardian-drain-ward-yi": {
    id: "guardian-drain-ward-yi" as EnemyConfigId,
    name: "Drain Ward (Yi)",
    nameCn: "消耗守卫·乙",
    maxRounds: 7,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 180,
    attack: 34,
    defense: 26,
    speed: 16,
    hit: 32,
    dodge: 10,
    crit: 8,
    critDamage: 38,
    guardHeart: 10,
    equippedWeaponLoadoutId: "starter-whip" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-water-flow" as SpellLoadoutId,
    spirit: 70,
    maxSpirit: 70,
    contextTags: ["guardian", "dungeon"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },
  // ── Drain Ward — 甲 ──
  "guardian-drain-ward-jia": {
    id: "guardian-drain-ward-jia" as EnemyConfigId,
    name: "Drain Ward (Jia)",
    nameCn: "消耗守卫·甲",
    maxRounds: 8,
    stylePreference: ["tactic", "brute", "finesse"],
    baseHp: 250,
    attack: 47,
    defense: 36,
    speed: 18,
    hit: 44,
    dodge: 13,
    crit: 10,
    critDamage: 46,
    guardHeart: 14,
    equippedWeaponLoadoutId: "starter-whip" as WeaponLoadoutId,
    equippedSpellLoadoutId: "starter-water-flow" as SpellLoadoutId,
    spirit: 95,
    maxSpirit: 95,
    contextTags: ["guardian", "dungeon", "elite"],
    rewardBias: ["spell-fragment", "cultivation-aid"],
  },
};

// ---- Public API ----

export function getEnemyConfig(id: EnemyConfigId): EnemyConfigDefinition | null {
  return ENEMY_CONFIGS[id] ?? null;
}

export function getAllEnemyConfigs(): readonly EnemyConfigDefinition[] {
  return Object.values(ENEMY_CONFIGS);
}

export function getEnemyConfigsByTag(tag: EnemyContextTag): readonly EnemyConfigDefinition[] {
  return Object.values(ENEMY_CONFIGS).filter((c) => c.contextTags.includes(tag));
}

/** Convert an EnemyConfigDefinition to the runtime EncounterTemplate format. */
export function enemyConfigToEncounterTemplate(config: EnemyConfigDefinition): EncounterTemplate {
  return {
    id: config.id,
    enemyName: config.name,
    maxRounds: config.maxRounds,
    stylePreference: [...config.stylePreference],
    baseHp: config.baseHp,
    attack: config.attack,
    defense: config.defense,
    speed: config.speed,
    hit: config.hit,
    dodge: config.dodge,
    crit: config.crit,
    critDamage: config.critDamage,
    guardHeart: config.guardHeart,
    escapeAllowed: config.escapeAllowed,
    equippedWeaponLoadoutId: config.equippedWeaponLoadoutId as string | undefined,
    equippedSpellLoadoutId: config.equippedSpellLoadoutId as string | undefined,
    spirit: config.spirit,
    maxSpirit: config.maxSpirit,
  };
}
