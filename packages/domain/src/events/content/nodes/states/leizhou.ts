import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "thunder-glass",
    semanticType: "fortune",
    resultType: "resource",
    title: "Thunder Glass",
    titleCn: "雷熔晶屑",
    description: "A thunder-fused seam leaves behind sharp salvage and cleanly tradeable shards.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "storm-cradle",
    semanticType: "fortune",
    resultType: "resource",
    title: "Storm Cradle",
    titleCn: "雷槽余矿",
    description: "A storm-cut cradle in the rock still holds enough conductive salvage to make a careful haul worth it.",
    effects: {
      spiritStones: 24,
      itemRewards: [{ itemId: "spirit-ore", count: 1 }],
    },
  },
  {
    slot: "storm-pocket",
    semanticType: "fortune",
    resultType: "status",
    title: "Storm Pocket",
    titleCn: "雷隙振脉",
    description: "A still eye in the storm-charged chamber jolts your circulation back to life.",
    effects: {
      statusEffects: [{ effectId: "qi-surge", ticks: 2 }],
    },
  },
  {
    slot: "charged-fog",
    semanticType: "fortune",
    resultType: "status",
    title: "Charged Fog",
    titleCn: "电雾明觉",
    description: "A charged haze outlines the safer route for a heartbeat and rewards immediate attention.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "lightning-script",
    semanticType: "fortune",
    resultType: "progression",
    title: "Lightning Script",
    titleCn: "霆痕残篆",
    description: "A pattern burned into the wall by earlier strikes teaches forceful control without wasted motion.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "anomaly-chart",
    semanticType: "fortune",
    resultType: "progression",
    title: "Anomaly Chart",
    titleCn: "异象图签",
    description: "A patrol chart mapping old surge patterns turns caution into one clean advance in understanding.",
    baseWeight: 0.98,
    effects: {
      realmProgress: 5,
    },
  },
  {
    slot: "charged-step",
    semanticType: "training",
    resultType: "progression",
    title: "Charged Step",
    titleCn: "逐电踏位",
    description: "Each careful step through a struck corridor teaches efficient control under pressure.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "grounding-stance",
    semanticType: "training",
    resultType: "progression",
    title: "Grounding Stance",
    titleCn: "引雷站桩",
    description: "A grounded stone lane rewards exact posture and keeps your circulation from scattering in the charge.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "rod-strike",
    semanticType: "training",
    resultType: "combat",
    title: "Rod Strike",
    titleCn: "雷柱横击",
    description: "A live conductor arc snaps across the hall and forces an ugly scramble through it.",
    baseWeight: 0.85,
    effects: {
      qi: -11,
      spiritualPower: -8,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-spell" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "spark-fiend",
    semanticType: "training",
    resultType: "combat",
    title: "Spark Fiend",
    titleCn: "雷煞突现",
    description: "A dormant spark-fiend core flashes awake and turns your next step into a costly close exchange.",
    baseWeight: 0.84,
    effects: {
      qi: -9,
      spiritualPower: -5,
      spiritStones: 18,
    },
    encounterBuildId: "dungeon-guardian-swift" as import("../../../../encounters/catalog.js").EncounterBuildId,
    combatMode: "full",
  },
  {
    slot: "ward-line",
    semanticType: "training",
    resultType: "status",
    title: "Ward Line",
    titleCn: "避雷符线",
    description: "A faded ward line still grounds enough of the local charge to leave you a safer window.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "crack-focus",
    semanticType: "training",
    resultType: "status",
    title: "Crack Focus",
    titleCn: "裂鸣开悟",
    description: "Listening through the chamber's thunder cracks pushes your attention into an unusually sharp state.",
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "patrol-sigil",
    semanticType: "human",
    resultType: "resource",
    title: "Patrol Sigil",
    titleCn: "巡雷残符",
    description: "A storm patrol cache was left behind with a little reward and one intact ward.",
    effects: {
      spiritStones: 20,
      itemRewards: [{ itemId: "ward-talisman", count: 1 }],
    },
  },
  {
    slot: "shelter-mark",
    semanticType: "human",
    resultType: "resource",
    title: "Shelter Mark",
    titleCn: "避雷刻记",
    description: "A shelter token from an earlier warning team still trades well among people who know the route.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "warning-banner",
    semanticType: "human",
    resultType: "status",
    title: "Warning Banner",
    titleCn: "警雷旗记",
    description: "A storm banner still shows which angles prior teams considered survivable instead of merely brave.",
    effects: {
      spiritStones: 14,
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "charged-ink",
    semanticType: "human",
    resultType: "status",
    title: "Charged Ink",
    titleCn: "雷墨留痕",
    description: "Conductive ink in a patrol notebook makes the chamber's hidden pattern easier to read at a glance.",
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
  {
    slot: "rain-shelter",
    semanticType: "human",
    resultType: "story",
    title: "Rain Shelter",
    titleCn: "雨棚旧札",
    description: "Shelter marks on the wall show where previous teams survived the worst surges.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "insight", ticks: 2 }],
    },
  },
  {
    slot: "storm-whisper",
    semanticType: "human",
    resultType: "story",
    title: "Storm Whisper",
    titleCn: "雷廊低语",
    description: "Notes left in haste suggest the ruin respects nerve, but only after it respects preparation.",
    baseWeight: 0.92,
    effects: {
      statusEffects: [{ effectId: "clear-mind", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildLeizhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
