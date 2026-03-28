import type { Location } from "../../../../model.js";

import { buildRegionalDungeonEventPack, type RegionalDungeonEventRow } from "./template.js";

const ROWS = [
  {
    slot: "frost-locker",
    semanticType: "fortune",
    resultType: "resource",
    title: "Frost Locker",
    description: "A cold locker preserves salvage long after the original expedition is gone.",
    baseWeight: 1.05,
    effects: {
      spiritStones: 28,
      itemRewards: [{ itemId: "ruin-fragment", count: 1 }],
    },
  },
  {
    slot: "watchfire-ember",
    semanticType: "fortune",
    resultType: "status",
    title: "Watchfire Ember",
    description: "A stubborn watchfire ember warms the limbs just enough to keep you steady.",
    effects: {
      statusEffects: [{ effectId: "warded", ticks: 2 }],
    },
  },
  {
    slot: "ice-step",
    semanticType: "training",
    resultType: "progression",
    title: "Ice Step",
    description: "Frost-polished stone demands short, exact steps and rewards that discipline immediately.",
    effects: {
      realmProgress: 4,
    },
  },
  {
    slot: "whiteout-brush",
    semanticType: "training",
    resultType: "combat",
    title: "Whiteout Brush",
    description: "A burst of biting wind and rubble turns the next turn into a punishing scramble.",
    baseWeight: 0.85,
    effects: {
      qi: -10,
      spiritualPower: -6,
      spiritStones: 18,
    },
  },
  {
    slot: "border-ration",
    semanticType: "human",
    resultType: "resource",
    title: "Border Ration",
    description: "A border patrol cache still holds usable supplies and a little coin value.",
    effects: {
      spiritStones: 22,
      reputationChange: 1,
    },
  },
  {
    slot: "sentry-notch",
    semanticType: "human",
    resultType: "story",
    title: "Sentry Notch",
    description: "Sentry cuts in the wall show where prior teams chose to shelter and where they refused to linger.",
    baseWeight: 0.9,
    effects: {
      statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
    },
  },
] as const satisfies readonly RegionalDungeonEventRow[];

export function buildYouzhouDungeonEventPack(location: Location) {
  return buildRegionalDungeonEventPack(location, ROWS);
}
