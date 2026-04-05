import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "reef-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Reef Coffer",
    titleCn: "礁匣余藏",
    description: "A reef-anchored coffer still holds ore and payment chips under a crust of salt.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "tide-lockbox",
    semanticType: "fortune",
    resultType: "resource",
    title: "Tide Lockbox",
    titleCn: "潮柜碎赏",
    description: "A tide-thrown lockbox from an older harbor run still hides enough trade value to justify cracking it open.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "salt-lantern",
    semanticType: "fortune",
    resultType: "status",
    title: "Salt Lantern",
    titleCn: "盐灯护势",
    description: "A brine lantern burns with a steady blue flame that helps you keep a defensive rhythm.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "sea-wind-gap",
    semanticType: "fortune",
    resultType: "status",
    title: "Sea Wind Gap",
    titleCn: "海隙清觉",
    description: "A cold cut of sea wind through the reef corridor cleans the head and sharpens your sense for safe openings.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "barnacle-script",
    semanticType: "fortune",
    resultType: "progression",
    title: "Barnacle Script",
    titleCn: "藤壶残字",
    description: "A crusted inscription under barnacles reveals how older salvagers paced force against resistance.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "harbor-chart",
    semanticType: "fortune",
    resultType: "progression",
    title: "Harbor Chart",
    titleCn: "港潮图签",
    description: "A damaged harbor chart turns tidal caution into one direct lesson in controlled movement.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "tide-draw",
    semanticType: "training",
    resultType: "progression",
    title: "Tide Draw",
    titleCn: "潮力回引",
    description: "Pulling against the pressure of the chamber teaches clean force and efficient release.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "rope-pull",
    semanticType: "training",
    resultType: "progression",
    title: "Rope Pull",
    titleCn: "缆绳磨劲",
    description: "A snapped salvage rope line still trains the same compact pulling discipline that kept divers alive here.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "anchor-pull",
    semanticType: "training",
    resultType: "combat",
    title: "Anchor Pull",
    titleCn: "沉锚乱击",
    description: "A hanging chain whips loose and turns the next chamber into a rough physical scramble.",
    baseWeight: 0.85,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-seal" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "reef-maw",
    semanticType: "training",
    resultType: "combat",
    title: "Reef Maw",
    titleCn: "礁喉骤袭",
    description: "A salt-hardened beast lunges from a flooded split and forces a fast, ugly answer at close range.",
    baseWeight: 0.83,
    effects: {
      qi: -8,
      spiritualPower: -4,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-drain" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "brine-wall",
    semanticType: "training",
    resultType: "status",
    title: "Brine Wall",
    titleCn: "咸壁稳阵",
    description: "A surviving salt wall still breaks enough spray and pressure to give you a safer stance.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "harbor-breath",
    semanticType: "training",
    resultType: "status",
    title: "Harbor Breath",
    titleCn: "港息澄心",
    description: "Matching the chamber to the rhythm of tide and breath leaves your circulation cleaner than before.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "diver-chalk",
    semanticType: "human",
    resultType: "resource",
    title: "Diver Chalk",
    titleCn: "潜客粉记",
    description: "Diver chalk marks lead to a small recovery stash and a little negotiable value.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "dock-tally",
    semanticType: "human",
    resultType: "resource",
    title: "Dock Tally",
    titleCn: "埠头余账",
    description: "A dockside tally board still settles into real money once someone bothers to carry it back.",
    effects: {
      spiritStones: 20,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "salvage-knot",
    semanticType: "human",
    resultType: "status",
    title: "Salvage Knot",
    titleCn: "打捞绳结",
    description: "A marked salvage knot reveals which lines previous crews trusted under pressure and surge.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "salted-notes",
    semanticType: "human",
    resultType: "status",
    title: "Salted Notes",
    titleCn: "盐浸札记",
    description: "Sea-warped notes in an old diver's hand sharpen your guess for which chambers still pay cleanly.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "harbor-slate",
    semanticType: "human",
    resultType: "story",
    title: "Harbor Slate",
    titleCn: "港簿石板",
    description: "A weathered harbor slate lists which flooded side chambers locals now avoid entirely.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "tide-rumor",
    semanticType: "human",
    resultType: "story",
    title: "Tide Rumor",
    titleCn: "潮声密闻",
    description: "Half-finished remarks from earlier salvagers frame the ruin as a place where patience earns more than bravado.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildCangzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
