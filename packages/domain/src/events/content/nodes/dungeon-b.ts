import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonBEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Supply Vault`,
      description: `A mid-tier vault in ${location.name} rank ${rank} still holds denser breakthrough stock and battlefield salvage.`,
      baseWeight: 1.12 + (rank * 0.03),
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        spiritStones: 28 + (rank * 8),
        itemRewards: [
          { itemId: "foundation-common", count: 1 },
          { itemId: "ruin-fragment", count: 1 + Math.floor(rank / 4) },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-tempering`,
      semanticType: "training",
      resultType: "progression",
      nameSuffix: `Rank ${rank} Tempering Chamber`,
      description: `A heavier pressure chamber in ${location.name} rank ${rank} rewards controlled circulation and posture.`,
      baseWeight: 0.98,
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        realmProgress: 5 + rank,
        statusEffects: [{ effectId: rank >= 5 ? "insight" : "qi-surge", ticks: 2 + Math.floor(rank / 4) }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-hazard`,
      semanticType: "training",
      resultType: "combat",
      nameSuffix: `Rank ${rank} Pressure Break`,
      description: `A compressed passage in ${location.name} rank ${rank} turns into a costly exchange against the ruin itself.`,
      baseWeight: 0.85,
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        qi: -(8 + rank),
        spiritualPower: -(Math.floor(rank / 2) + 2),
        spiritStones: 14 + (rank * 4),
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-recovery`,
      semanticType: "human",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Expedition Remainder`,
      description: `An abandoned mid-tier expedition cache in ${location.name} rank ${rank} still carries useful supplies.`,
      baseWeight: 0.78,
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        itemRewards: rank >= 5
          ? [{ itemId: "healing-pill", count: 1 }]
          : [{ itemId: "qi-pill", count: 1 }],
      },
    }),
  ]);
}
