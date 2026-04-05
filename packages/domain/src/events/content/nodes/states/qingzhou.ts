import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "herb-lockbox",
    semanticType: "fortune",
    resultType: "resource",
    title: "Herb Lockbox",
    titleCn: "药匣余藏",
    description: "A medicine lockbox survives in the ruin and still holds exchangeable stock.",
    baseWeight: 1.1,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "pinework-coffer",
    semanticType: "fortune",
    resultType: "resource",
    title: "Pinework Coffer",
    titleCn: "松纹木匣",
    description: "A cedar-lined coffer from an old herb convoy still carries neat salvage and saleable odds.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 26,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "moss-spring",
    semanticType: "fortune",
    resultType: "status",
    title: "Moss Spring",
    titleCn: "苔泉洗息",
    description: "A moss-lined seep of qi cools the body and steadies breathing for the next corridor.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "pine-resin-censer",
    semanticType: "fortune",
    resultType: "status",
    title: "Pine Resin Censer",
    titleCn: "松脂清炉",
    description: "A slow pine-resin burner still leaks enough clean scent to settle the breath and tighten your focus.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "terrace-rune",
    semanticType: "fortune",
    resultType: "progression",
    title: "Terrace Rune",
    titleCn: "梯田残纹",
    description: "Faded terrace runes show how earlier herb-tenders balanced labor and circulation in the same rhythm.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "herb-keeper-notes",
    semanticType: "fortune",
    resultType: "progression",
    title: "Herb Keeper Notes",
    titleCn: "药守手札",
    description: "A bundle of weathered field notes turns routine route reading into one clean moment of cultivation insight.",
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "terrace-breath",
    semanticType: "training",
    resultType: "progression",
    title: "Terrace Breath",
    titleCn: "梯息行周",
    description: "Old pacing grooves from herb tenders turn one careful lap into usable cultivation progress.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "creek-turn",
    semanticType: "training",
    resultType: "progression",
    title: "Creek Turn",
    titleCn: "溪转回息",
    description: "A narrow creek bend forces deliberate footwork that pays back immediately in calmer circulation.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "vine-hound",
    semanticType: "training",
    resultType: "combat",
    title: "Vine Hound",
    titleCn: "藤犬扑道",
    description: "A beast nesting among old root wards bursts through the undergrowth and turns the corridor rough.",
    baseWeight: 0.85,
    effects: {
      qi: -8,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-swift" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "pollen-burst",
    semanticType: "training",
    resultType: "combat",
    title: "Pollen Burst",
    titleCn: "灵粉迷障",
    description: "A trapped bloom pocket bursts in your face and forces a sloppy, bruising push through the next chamber.",
    baseWeight: 0.82,
    effects: {
      qi: -7,
      spiritualPower: -4,
      spiritStones: 16,
    },
    encounterBuildId: "dungeon-guardian-drain" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "root-ward",
    semanticType: "training",
    resultType: "status",
    title: "Root Ward",
    titleCn: "根脉护势",
    description: "A wooden ward still channels enough stabilizing qi to guard your next push inward.",
    baseWeight: 0.95,
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "sprout-ward",
    semanticType: "training",
    resultType: "status",
    title: "Sprout Ward",
    titleCn: "新芽定神",
    description: "Fresh life pushing through a cracked chamber reminds you how to keep your circulation soft and steady.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "sect-pannier",
    semanticType: "human",
    resultType: "resource",
    title: "Sect Pannier",
    titleCn: "宗门药篓",
    description: "A dropped pannier from an old Qingzhou survey team still contains tradeable salvage.",
    effects: {
      spiritStones: 24,
      reputationChange: 1,
    },
  },
  {
    slot: "medic-ink",
    semanticType: "human",
    resultType: "resource",
    title: "Medic Ink Ledger",
    titleCn: "药坊墨账",
    description: "A field apothecary's side ledger still points to a little clean profit and one useful exchange.",
    effects: {
      spiritStones: 22,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "field-contract",
    semanticType: "human",
    resultType: "status",
    title: "Field Contract",
    titleCn: "药圃旧契",
    description: "A preserved supply contract maps the safer way through the ruin and sharpens your sense for clean returns.",
    effects: {
      spiritStones: 18,
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "drying-rack-token",
    semanticType: "human",
    resultType: "status",
    title: "Drying Rack Token",
    titleCn: "晒架凭牌",
    description: "A caretaker token from an herb-drying platform gives you just enough legitimacy to move more safely.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "gatherer-slate",
    semanticType: "human",
    resultType: "story",
    title: "Gatherer Slate",
    titleCn: "采药石板",
    description: "Gatherer marks on a slate panel point out which side passages tend to pay off cleanly.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "valley-rumor",
    semanticType: "human",
    resultType: "story",
    title: "Valley Rumor",
    titleCn: "谷口传闻",
    description: "Half-erased warnings from herb runners suggest which inner turns are lucky and which only look gentle.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildQingzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
