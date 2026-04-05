import type { EventTemplate } from "../../../events.js";
import type { ItemId, Location } from "../../../model.js";
import type { EncounterBuildId } from "../../../encounters/catalog.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonCEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Cache`,
      nameCnSuffix: `第${rank}层宝箱`,
      description: `A lower-ruin cache in ${location.name} rank ${rank} still yields basic breakthrough stock and salvage.`,
      baseWeight: 1.2 + (rank * 0.03),
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        spiritStones: 18 + (rank * 6),
        itemRewards: ([
          { itemId: "qi-common", count: 1 },
          { itemId: "ruin-fragment", count: rank >= 4 ? 1 : 0 },
        ] satisfies ReadonlyArray<{ itemId: ItemId; count: number }>).filter((reward) => reward.count > 0),
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-breath`,
      semanticType: "training",
      resultType: "progression",
      nameSuffix: `Rank ${rank} Breath Pocket`,
      nameCnSuffix: `第${rank}层息泉`,
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
      nameCnSuffix: `第${rank}层险阻`,
      description: `A narrow chamber in ${location.name} rank ${rank} forces a bruising adjustment in footing and breath.`,
      baseWeight: 0.82,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        qi: -(6 + rank),
        spiritStones: 10 + (rank * 3),
      },
      encounterBuildId: (rank <= 3 ? "dungeon-guardian-swift-bing" : rank <= 6 ? "dungeon-guardian-heavy-bing" : "dungeon-guardian-spell-bing") as EncounterBuildId,
      combatMode: "full",
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-notes`,
      semanticType: "human",
      resultType: "status",
      nameSuffix: `Rank ${rank} Scout Notes`,
      nameCnSuffix: `第${rank}层探报`,
      description: `Scattered scout notes in ${location.name} rank ${rank} improve your route sense for the next push.`,
      baseWeight: 0.78,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "fortune-marked", ticks: 2 + Math.floor(rank / 3) }],
      },
    }),
    // ── New: Story/flavor row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-traces`,
      semanticType: "human",
      resultType: "story",
      nameSuffix: `Rank ${rank} Explorer Traces`,
      nameCnSuffix: `第${rank}层探索痕迹`,
      description: `Faded marks on the wall in ${location.name} rank ${rank} suggest someone mapped this corridor before.`,
      baseWeight: 0.65,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "warded", ticks: 2 }],
      },
    }),
    // ── New: Resource recovery row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-drip-pool`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Drip Pool`,
      nameCnSuffix: `第${rank}层滴泉`,
      description: `A slow drip in ${location.name} rank ${rank} has pooled enough diluted spirit water to top up your reserves.`,
      baseWeight: 0.7,
      dungeonGrade: "丙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        qi: 6 + rank,
        spiritStones: 8 + rank * 2,
      },
    }),
  ]);
}
