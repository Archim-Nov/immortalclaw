import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "frost-locker",
    semanticType: "fortune",
    resultType: "resource",
    title: "Frost Locker",
    titleCn: "霜柜遗藏",
    description: "A cold locker preserves salvage long after the original expedition is gone.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "supply-sled",
    semanticType: "fortune",
    resultType: "resource",
    title: "Supply Sled",
    titleCn: "雪橇余资",
    description: "A half-buried supply sled still carries enough usable material to justify the effort.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "watchfire-ember",
    semanticType: "fortune",
    resultType: "status",
    title: "Watchfire Ember",
    titleCn: "哨火余烬",
    description: "A stubborn watchfire ember warms the limbs just enough to keep you steady.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "ice-breath-gap",
    semanticType: "fortune",
    resultType: "status",
    title: "Ice Breath Gap",
    titleCn: "冰隙醒神",
    description: "A current of cutting air through an ice seam strips away hesitation and leaves your senses cleaner.",
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "beacon-marks",
    semanticType: "fortune",
    resultType: "progression",
    title: "Beacon Marks",
    titleCn: "烽痕定息",
    description: "Old beacon marks show how sentries turned repetition and cold into a practical training discipline.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "snow-route-notes",
    semanticType: "fortune",
    resultType: "progression",
    title: "Snow Route Notes",
    titleCn: "雪路批注",
    description: "Route notes from a frontier runner teach how to trim waste from long motion in hostile weather.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "ice-step",
    semanticType: "training",
    resultType: "progression",
    title: "Ice Step",
    titleCn: "冰面碎步",
    description: "Frost-polished stone demands short, exact steps and rewards that discipline immediately.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "march-discipline",
    semanticType: "training",
    resultType: "progression",
    title: "March Discipline",
    titleCn: "边行整息",
    description: "A half-collapsed corridor still forces the same measured pace that hardened older patrol lines.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "whiteout-brush",
    semanticType: "training",
    resultType: "combat",
    title: "Whiteout Brush",
    titleCn: "白障冲阵",
    description: "A burst of biting wind and rubble turns the next turn into a punishing scramble.",
    baseWeight: 0.85,
    effects: {
      qi: -10,
      spiritualPower: -6,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-drain" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "wolf-shadow",
    semanticType: "training",
    resultType: "combat",
    title: "Wolf Shadow",
    titleCn: "雪狼逼影",
    description: "A hungry shadow in the frost line closes too fast and forces a hard answer before you can set your stance.",
    baseWeight: 0.84,
    effects: {
      qi: -9,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-swift" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "shielded-niche",
    semanticType: "training",
    resultType: "status",
    title: "Shielded Niche",
    titleCn: "避风凹壁",
    description: "A soldier's old shield wall still leaves behind one pocket where the cold cannot fully reach you.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "coldwatch-focus",
    semanticType: "training",
    resultType: "status",
    title: "Coldwatch Focus",
    titleCn: "寒哨凝神",
    description: "Holding your line against the cold for one measured stretch pushes your attention into a sharper state.",
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "border-ration",
    semanticType: "human",
    resultType: "resource",
    title: "Border Ration",
    titleCn: "边军口粮",
    description: "A border patrol cache still holds usable supplies and a little coin value.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "fur-bundle",
    semanticType: "human",
    resultType: "resource",
    title: "Fur Bundle",
    titleCn: "寒裘余包",
    description: "A hunter's fur bundle still contains enough tradeable stock to turn a rough trip profitable.",
    effects: {
      spiritStones: 20,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "watchpost-pass",
    semanticType: "human",
    resultType: "status",
    title: "Watchpost Pass",
    titleCn: "哨牌通行",
    description: "An intact watchpost pass still tells you which inner routes once had enough men and fire to stay safe.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "camp-ash",
    semanticType: "human",
    resultType: "status",
    title: "Camp Ash",
    titleCn: "营灰旧迹",
    description: "Warm ash pressed beneath stone suggests where prior teams rested without paying for it later.",
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
  {
    slot: "sentry-notch",
    semanticType: "human",
    resultType: "story",
    title: "Sentry Notch",
    titleCn: "哨痕留记",
    description: "Sentry cuts in the wall show where prior teams chose to shelter and where they refused to linger.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "frontier-murmur",
    semanticType: "human",
    resultType: "story",
    title: "Frontier Murmur",
    titleCn: "边声低语",
    description: "Low remarks scratched into frost-white stone frame the ruin as a place where caution outlives bravado.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildYouzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
