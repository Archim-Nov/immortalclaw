import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonAEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Sealed Cache`,
      description: `A high-tier cache in ${location.name} rank ${rank} still condenses late breakthrough stock and heavily warded salvage.`,
      baseWeight: 1.05 + (rank * 0.025),
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        spiritStones: 42 + (rank * 10),
        itemRewards: [
          { itemId: "core-common", count: 1 },
          { itemId: "ruin-fragment", count: 2 + Math.floor(rank / 4) },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-array`,
      semanticType: "training",
      resultType: "progression",
      nameSuffix: `Rank ${rank} Array Residue`,
      description: `Residual array force in ${location.name} rank ${rank} punishes sloppy circulation but rewards exact control.`,
      baseWeight: 0.95,
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        realmProgress: 8 + rank,
        statusEffects: [{ effectId: "insight", ticks: 2 + Math.floor(rank / 3) }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-hazard`,
      semanticType: "training",
      resultType: "combat",
      nameSuffix: `Rank ${rank} Killing Pressure`,
      description: `A lethal chamber in ${location.name} rank ${rank} extracts a visible price in qi and spirit before you can stabilize.`,
      baseWeight: 0.88,
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        qi: -(10 + rank),
        spiritualPower: -(3 + Math.floor(rank / 2)),
        spiritStones: 18 + (rank * 5),
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-ward`,
      semanticType: "human",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Warded Relic`,
      description: `A warded remnant in ${location.name} rank ${rank} survives only because weaker teams could not crack it safely.`,
      baseWeight: 0.74,
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: rank >= 6
        ? {
            itemRewards: [{ itemId: "ward-talisman", count: 1 }],
            statusEffects: [{ effectId: "fortune-marked", ticks: 3 }],
          }
        : {
            itemRewards: [{ itemId: "ward-talisman", count: 1 }],
          },
    }),
  ]);
}
