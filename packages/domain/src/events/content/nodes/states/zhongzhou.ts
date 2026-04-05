import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "archive-strongbox",
    semanticType: "fortune",
    resultType: "resource",
    title: "Archive Strongbox",
    titleCn: "档匣余封",
    description: "A clerk's strongbox survives behind broken seals and still holds a clean payout.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 30,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "seal-cabinet",
    semanticType: "fortune",
    resultType: "resource",
    title: "Seal Cabinet",
    titleCn: "封柜旧赏",
    description: "A side cabinet of stamped seals still conceals enough salvage to make a careful search worthwhile.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "seal-hall",
    semanticType: "fortune",
    resultType: "status",
    title: "Seal Hall",
    titleCn: "封厅定神",
    description: "Residual order qi in the hall settles scattered thoughts and sharpens controlled movement.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "ledger-light",
    semanticType: "fortune",
    resultType: "status",
    title: "Ledger Light",
    titleCn: "账灯明识",
    description: "A regulation lamp still burns in one corner and rewards methodical observation over impatience.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "inspection-notes",
    semanticType: "fortune",
    resultType: "progression",
    title: "Inspection Notes",
    titleCn: "巡检批注",
    description: "Official inspection notes reduce a complex route to one efficient governing principle you can use immediately.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "registry-margin",
    semanticType: "fortune",
    resultType: "progression",
    title: "Registry Margin",
    titleCn: "簿册旁注",
    description: "A precise margin note on an old registry page teaches how to keep discipline without wasting force.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "measured-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Measured Breath",
    titleCn: "律步凝息",
    description: "Inspection marks on the floor naturally break your movement into a disciplined cultivation cadence.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "record-step",
    semanticType: "training",
    resultType: "progression",
    title: "Record Step",
    titleCn: "案前步法",
    description: "A patterned clerical route through the chamber teaches how to move efficiently without breaking composure.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "law-array",
    semanticType: "training",
    resultType: "combat",
    title: "Law Array",
    titleCn: "律阵反噬",
    description: "A failing restraint array snaps alive just long enough to turn the next chamber into a painful lesson.",
    baseWeight: 0.84,
    effects: {
      qi: -8,
      spiritualPower: -4,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-spell" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "patrol-clash",
    semanticType: "training",
    resultType: "combat",
    title: "Patrol Clash",
    titleCn: "巡线交冲",
    description: "A collapsed patrol lane forces you into a sharp collision with lingering danger before you can reset your line.",
    baseWeight: 0.83,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-heavy" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "inspector-array",
    semanticType: "training",
    resultType: "status",
    title: "Inspector Array",
    titleCn: "检阵开悟",
    description: "A half-working inspection array punishes sloppy footing and rewards precise control.",
    baseWeight: 0.95,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "hall-permit",
    semanticType: "training",
    resultType: "status",
    title: "Hall Permit",
    titleCn: "厅符护行",
    description: "An old permit marker still points you toward the route prior officials trusted most.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "courier-packet",
    semanticType: "human",
    resultType: "resource",
    title: "Courier Packet",
    titleCn: "驿使遗包",
    description: "An abandoned courier packet still has enough value left in it to matter.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "seal-runner-cache",
    semanticType: "human",
    resultType: "resource",
    title: "Seal Runner Cache",
    titleCn: "封递余赏",
    description: "A relay runner's hidden reserve survives intact and still converts into respectable value.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "inspection-band",
    semanticType: "human",
    resultType: "status",
    title: "Inspection Band",
    titleCn: "巡检缚带",
    description: "A cloth band from an older inspection team reminds you which paths were watched because they were safest.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "scribe-dust",
    semanticType: "human",
    resultType: "status",
    title: "Scribe Dust",
    titleCn: "书吏拂尘",
    description: "The neat order of a scribe's abandoned workstation smooths your thoughts more than it should.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "edict-scrap",
    semanticType: "human",
    resultType: "story",
    title: "Edict Scrap",
    titleCn: "诏纸残片",
    description: "A torn enforcement notice hints which inner chambers were once sealed off first.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "registry-rumor",
    semanticType: "human",
    resultType: "story",
    title: "Registry Rumor",
    titleCn: "册府流闻",
    description: "Whispers preserved in the margins suggest the ruin remembers procedure better than the people above it do.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildZhongzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
