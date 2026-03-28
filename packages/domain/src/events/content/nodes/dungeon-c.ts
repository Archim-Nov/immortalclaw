import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonCEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Cache`,
      description: `A lower-ruin cache in ${location.name} rank ${rank} still yields basic breakthrough stock and salvage.`,
      baseWeight: 1.2 + (rank * 0.03),
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        spiritStones: 18 + (rank * 6),
        itemRewards: [
          { itemId: "qi-common", count: 1 },
          { itemId: "ruin-fragment", count: rank >= 4 ? 1 : 0 },
        ].filter((reward) => reward.count > 0),
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-breath`,
      semanticType: "training",
      resultType: "progression",
      nameSuffix: `Rank ${rank} Breath Pocket`,
      description: `A brief calm in ${location.name} rank ${rank} lets you refine one clean cycle under pressure.`,
      baseWeight: 1,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        realmProgress: 2 + rank,
        statusEffects: [{ effectId: rank >= 6 ? "insight" : "clear-mind", ticks: rank >= 6 ? 2 : 3 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-hazard`,
      semanticType: "training",
      resultType: "combat",
      nameSuffix: `Rank ${rank} Hazard`,
      description: `A narrow chamber in ${location.name} rank ${rank} forces a bruising adjustment in footing and breath.`,
      baseWeight: 0.82,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        qi: -(6 + rank),
        spiritStones: 10 + (rank * 3),
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-notes`,
      semanticType: "human",
      resultType: "status",
      nameSuffix: `Rank ${rank} Scout Notes`,
      description: `Scattered scout notes in ${location.name} rank ${rank} improve your route sense for the next push.`,
      baseWeight: 0.78,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "fortune-marked", ticks: 2 + Math.floor(rank / 3) }],
      },
    }),
  ]);
}
