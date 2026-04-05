import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "cliff-niche",
    semanticType: "fortune",
    resultType: "resource",
    title: "Cliff Niche",
    titleCn: "崖龛余藏",
    description: "A hidden cliffside niche stores ore and salvage that better-equipped teams missed.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 26,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "timber-cradle",
    semanticType: "fortune",
    resultType: "resource",
    title: "Timber Cradle",
    titleCn: "木架旧箧",
    description: "A timber cradle from an abandoned survey line still hides enough salvage to matter.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "cedar-mist",
    semanticType: "fortune",
    resultType: "status",
    title: "Cedar Mist",
    titleCn: "杉雾澄心",
    description: "Cool cedar-laced mist from a fissure eases your breathing despite the pressure of the ruins.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "ridge-echo",
    semanticType: "fortune",
    resultType: "status",
    title: "Ridge Echo",
    titleCn: "山回清响",
    description: "A clean ridge echo lets you place the next step before you see it and calms the body's overcorrections.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "woodgrain-copy",
    semanticType: "fortune",
    resultType: "progression",
    title: "Woodgrain Copy",
    titleCn: "木纹摹刻",
    description: "A copied carving from an older shrine chamber turns patient observation into immediate internal gain.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "hidden-stair-runes",
    semanticType: "fortune",
    resultType: "progression",
    title: "Hidden Stair Runes",
    titleCn: "隐阶残篆",
    description: "Faded runes on a hidden stair reveal how to hold one steady breath across uneven elevation.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "switchback-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Switchback Breath",
    titleCn: "回折调息",
    description: "Repeated angled climbs turn your route through the chamber into a practical training cycle.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "ledge-stance",
    semanticType: "training",
    resultType: "progression",
    title: "Ledge Stance",
    titleCn: "崖沿立步",
    description: "Holding your balance on a narrow ledge teaches exact tension and more economical motion.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "hanging-plank",
    semanticType: "training",
    resultType: "combat",
    title: "Hanging Plank",
    titleCn: "悬板惊险",
    description: "A hanging crossing starts to give way and forces a fast, ugly exchange to get through safely.",
    baseWeight: 0.85,
    effects: {
      qi: -10,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-seal" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "stone-ape",
    semanticType: "training",
    resultType: "combat",
    title: "Stone Ape",
    titleCn: "山猿扰路",
    description: "A ruin-dwelling ape leaps the gap before you and turns a careful climb into a blunt collision.",
    baseWeight: 0.83,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-heavy" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "wind-baffle",
    semanticType: "training",
    resultType: "status",
    title: "Wind Baffle",
    titleCn: "挡风旧障",
    description: "A half-standing wind baffle gives you a brief pocket of safety in an otherwise punishing corridor.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "suspended-calm",
    semanticType: "training",
    resultType: "status",
    title: "Suspended Calm",
    titleCn: "悬空凝神",
    description: "A still point above a drop forces your mind to quiet down and rewards it immediately.",
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "guide-cairn",
    semanticType: "human",
    resultType: "resource",
    title: "Guide Cairn",
    titleCn: "引路石垒",
    description: "Small stacked guide stones hide a surveyor's stash beneath them.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "herb-basket",
    semanticType: "human",
    resultType: "resource",
    title: "Herb Basket",
    titleCn: "药篓余货",
    description: "An herbalist's old basket still holds a little saleable stock and a cleaner route mark.",
    effects: {
      spiritStones: 20,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "rope-marker",
    semanticType: "human",
    resultType: "status",
    title: "Rope Marker",
    titleCn: "绳记护路",
    description: "A set of rope markers reveals which supports previous teams trusted when the mountain turned mean.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "tea-scrap",
    semanticType: "human",
    resultType: "status",
    title: "Tea Scrap",
    titleCn: "茶札余温",
    description: "A tiny tea note from a resting climber steadies your breathing and sharpens route judgment.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "shrine-bell",
    semanticType: "human",
    resultType: "story",
    title: "Shrine Bell",
    titleCn: "古庙钟声",
    description: "A bell note from a forgotten shrine chamber reveals where the wind moves cleanest through the ruin.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "ridge-whisper",
    semanticType: "human",
    resultType: "story",
    title: "Ridge Whisper",
    titleCn: "山脊耳语",
    description: "Whispers left by old guides suggest which inner switchbacks take time and which take blood.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildShuzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
