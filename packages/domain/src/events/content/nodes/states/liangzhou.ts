import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "sand-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Sand Coffer",
    titleCn: "沙藏木匣",
    description: "A coffer buried under grit still pays out to anyone patient enough to clear it properly.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 30,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "camel-cache",
    semanticType: "fortune",
    resultType: "resource",
    title: "Camel Cache",
    titleCn: "驼队余仓",
    description: "A caravan cache missed by later scavengers still carries hard, practical value.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "shade-well",
    semanticType: "fortune",
    resultType: "status",
    title: "Shade Well",
    titleCn: "阴井清息",
    description: "A rare pocket of cool air lets you recover your pacing before the next exposed stretch.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "dust-veil",
    semanticType: "fortune",
    resultType: "status",
    title: "Dust Veil",
    titleCn: "风沙藏机",
    description: "A curtain of fine dust briefly hides you from the chamber's worst angles and sharpens route instinct.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "route-tablet",
    semanticType: "fortune",
    resultType: "progression",
    title: "Route Tablet",
    titleCn: "商途残碑",
    description: "A route tablet teaches how seasoned desert hands balanced patience, distance, and force.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "dune-script",
    semanticType: "fortune",
    resultType: "progression",
    title: "Dune Script",
    titleCn: "沙痕秘字",
    description: "Wind-cut script in a side chamber turns survival pragmatism into one sharp cultivation lesson.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "dune-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Dune Breath",
    titleCn: "沙脊吐纳",
    description: "Wind-scored channels reward slow, efficient breathing and exact foot placement.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "supply-turn",
    semanticType: "training",
    resultType: "progression",
    title: "Supply Turn",
    titleCn: "折路搬运",
    description: "A broken supply lane teaches how to keep effort compact when every step wastes water and strength.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "grit-crossing",
    semanticType: "training",
    resultType: "combat",
    title: "Grit Crossing",
    titleCn: "砂暴压阵",
    description: "Loose stone and windblown grit turn a crossing into a draining clash of endurance.",
    baseWeight: 0.85,
    effects: {
      qi: -11,
      spiritStones: 20,
    },
    encounterBuildId: "dungeon-guardian-heavy" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "scorpion-surge",
    semanticType: "training",
    resultType: "combat",
    title: "Scorpion Surge",
    titleCn: "沙蝎突袭",
    description: "A nest stirred under thin sand forces a short, punishing response before it spreads around you.",
    baseWeight: 0.83,
    effects: {
      qi: -9,
      spiritualPower: -4,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-swift" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "banner-rig",
    semanticType: "training",
    resultType: "status",
    title: "Banner Rig",
    titleCn: "旗障借势",
    description: "A half-standing convoy banner still breaks enough wind to let you gather yourself before the next push.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "dry-step-focus",
    semanticType: "training",
    resultType: "status",
    title: "Dry Step Focus",
    titleCn: "旱步凝神",
    description: "A stretch of perfectly hard-packed ground rewards exact footwork with rare mental quiet.",
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "caravan-tally",
    semanticType: "human",
    resultType: "resource",
    title: "Caravan Tally",
    titleCn: "商队旧账",
    description: "A caravan quartermaster's tally cache still hides convertible value.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "water-ration-stash",
    semanticType: "human",
    resultType: "resource",
    title: "Water Ration Stash",
    titleCn: "水囊余藏",
    description: "A carefully hidden ration stash still pays out to anyone disciplined enough to find it before panic does.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "waybill-seal",
    semanticType: "human",
    resultType: "status",
    title: "Waybill Seal",
    titleCn: "路引封记",
    description: "A stamped waybill reveals which route branches once had enough cover to stay orderly.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "desert-embers",
    semanticType: "human",
    resultType: "status",
    title: "Desert Embers",
    titleCn: "营火余温",
    description: "Heat trapped in the ash of an old desert camp steadies your breath more than the dry air should allow.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "quartermaster-scratch",
    semanticType: "human",
    resultType: "story",
    title: "Quartermaster Scratch",
    titleCn: "军需刻痕",
    description: "Scratched route notes warn which inner branches tend to empty your waterskins fastest.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "desert-murmur",
    semanticType: "human",
    resultType: "story",
    title: "Desert Murmur",
    titleCn: "荒途低语",
    description: "Dry remarks left by earlier caravans frame the ruin as a place where good judgment matters more than pride.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildLiangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
