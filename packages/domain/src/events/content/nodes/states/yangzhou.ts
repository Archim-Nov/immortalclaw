import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "silt-cache",
    semanticType: "fortune",
    resultType: "resource",
    title: "Silt Cache",
    titleCn: "淤泥旧藏",
    description: "A silt-packed stash near a drowned chamber still yields ore and loose payment slips.",
    baseWeight: 1.1,
    effects: {
      spiritStones: 26,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "river-crate",
    semanticType: "fortune",
    resultType: "resource",
    title: "River Crate",
    titleCn: "河埠木箱",
    description: "A waterlogged freight crate still hides enough saleable stock to justify hauling it open.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "lantern-wash",
    semanticType: "fortune",
    resultType: "status",
    title: "Lantern Wash",
    titleCn: "灯影回潮",
    description: "Reflected canal light ripples through the hall and kicks your circulation back into rhythm.",
    effects: {
      statusEffects: [{ effectId: "qi-surge", ticks: 2 }],
    },
  },
  {
    slot: "tide-bell",
    semanticType: "fortune",
    resultType: "status",
    title: "Tide Bell",
    titleCn: "潮铃定拍",
    description: "A drowned bell still rings faintly through the chamber and gives your movement a clean timing anchor.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "canal-marker",
    semanticType: "fortune",
    resultType: "progression",
    title: "Canal Marker",
    titleCn: "河标旧记",
    description: "Flood marks and tow glyphs reveal a practical rhythm for conserving effort under drag and weight.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "ropeway-ledger",
    semanticType: "fortune",
    resultType: "progression",
    title: "Ropeway Ledger",
    titleCn: "纤路账册",
    description: "A dock ledger full of distances and timing notes turns logistics into one exact cultivation lesson.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "towpath-stance",
    semanticType: "training",
    resultType: "progression",
    title: "Towpath Stance",
    titleCn: "纤道站桩",
    description: "A long pulling corridor rewards steady legwork and disciplined breathing.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "dock-pivot",
    semanticType: "training",
    resultType: "progression",
    title: "Dock Pivot",
    titleCn: "埠头转步",
    description: "Repeated pivots over damp stone teach you how to keep balance while changing force quickly.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "slick-pier",
    semanticType: "training",
    resultType: "combat",
    title: "Slick Pier",
    titleCn: "滑埠冲撞",
    description: "Water-slick stone turns a routine advance into a short, bruising scuffle with the local hazard.",
    baseWeight: 0.85,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-swift" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "wake-serpent",
    semanticType: "training",
    resultType: "combat",
    title: "Wake Serpent",
    titleCn: "尾波妖游",
    description: "A hidden current-beast whips through the chamber wake and forces a messy close-range exchange.",
    baseWeight: 0.82,
    effects: {
      qi: -8,
      spiritualPower: -4,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-drain" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "canal-pass",
    semanticType: "training",
    resultType: "status",
    title: "Canal Pass",
    titleCn: "河关稳路",
    description: "A preserved pass-token helps you hold a safer route line through the broken docks.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "mooring-rhythm",
    semanticType: "training",
    resultType: "status",
    title: "Mooring Rhythm",
    titleCn: "系缆调息",
    description: "Working against the pull of old moorings tightens your circulation into a brief, forceful cadence.",
    effects: {
      statusEffects: [{ effectId: "qi-surge", ticks: 2 }],
    },
  },
  {
    slot: "smuggler-drop",
    semanticType: "human",
    resultType: "resource",
    title: "Smuggler Drop",
    titleCn: "私渡遗包",
    description: "A hidden handoff point was abandoned in a hurry and leaves something useful behind.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "ward-talisman", count: 1 }],
    },
  },
  {
    slot: "ferry-docket",
    semanticType: "human",
    resultType: "resource",
    title: "Ferry Docket",
    titleCn: "渡单余酬",
    description: "A ferryman's forgotten docket still converts cleanly into cash once you carry it back out.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "lockkeeper-token",
    semanticType: "human",
    resultType: "status",
    title: "Lockkeeper Token",
    titleCn: "闸吏凭牌",
    description: "An old lockkeeper token gives you a brief edge in reading which flooded routes remain stable.",
    effects: {
      spiritStones: 16,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "wet-manifest",
    semanticType: "human",
    resultType: "status",
    title: "Wet Manifest",
    titleCn: "湿账护行",
    description: "A preserved cargo manifest still signals which crews once had enough warding to move here safely.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "ferry-notice",
    semanticType: "human",
    resultType: "story",
    title: "Ferry Notice",
    titleCn: "渡口告示",
    description: "A soaked notice board lists which tunnel branches are drawing the wrong kind of traffic tonight.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "broker-whisper",
    semanticType: "human",
    resultType: "story",
    title: "Broker Whisper",
    titleCn: "牙行密语",
    description: "A broker's shorthand scratched into the wall hints which chambers once hid the cleanest private trade.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildYangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
