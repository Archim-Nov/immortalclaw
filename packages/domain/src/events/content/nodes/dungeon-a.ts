import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";
import type { EncounterBuildId } from "../../../encounters/catalog.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonAEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Sealed Cache`,
      nameCnSuffix: `第${rank}层封印宝箱`,
      description: `A high-tier cache in ${location.name} rank ${rank} still condenses late breakthrough stock and heavily warded salvage.`,
      baseWeight: 1.05 + (rank * 0.025),
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        spiritStones: 42 + (rank * 10),
        itemRewards: [
          { itemId: "moon-glory-jade", count: 1 },
          { itemId: "ruin-fragment", count: 2 + Math.floor(rank / 4) },
        ],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-array`,
      semanticType: "training",
      resultType: "progression",
      nameSuffix: `Rank ${rank} Array Residue`,
      nameCnSuffix: `第${rank}层残阵余波`,
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
      nameCnSuffix: `第${rank}层杀气压境`,
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
      encounterBuildId: (rank <= 3 ? "dungeon-guardian-seal-jia" : rank <= 6 ? "dungeon-guardian-drain-jia" : "dungeon-guardian-spell-jia") as EncounterBuildId,
      combatMode: "full",
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-ward`,
      semanticType: "human",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Warded Relic`,
      nameCnSuffix: `第${rank}层守护遗物`,
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
    // ── New: Story row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-sigil-mark`,
      semanticType: "human",
      resultType: "story",
      nameSuffix: `Rank ${rank} Sigil Mark`,
      nameCnSuffix: `第${rank}层符刻`,
      description: `Ancient sigil marks in ${location.name} rank ${rank} hint at the original guardian formation's layout.`,
      baseWeight: 0.55,
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "warded", ticks: 2 }],
        realmProgress: 2,
      },
    }),
    // ── New: Status row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-spirit-well`,
      semanticType: "fortune",
      resultType: "status",
      nameSuffix: `Rank ${rank} Spirit Well`,
      nameCnSuffix: `第${rank}层灵泉`,
      description: `A dormant spirit well in ${location.name} rank ${rank} still emits enough energy to steady your next encounter.`,
      baseWeight: 0.6,
      dungeonGrade: "甲",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "insight", ticks: 2 }],
      },
    }),
    ...(rank === 4
      ? [
          buildNodeEvent(location, {
            idSuffix: "rank-4-missing-stone",
            semanticType: "training",
            resultType: "status",
            nameSuffix: "Rank 4 Missing Stone",
            nameCnSuffix: "第四层缺了的石头",
            description: "甲四层的阵脚缺了一块石头。你没有补上，阵纹只轻轻刮过袖口，并不伤人。石缝里卡着一小片残符，没有别的东西。",
            baseWeight: 0.5,
            dungeonGrade: "甲",
            minDungeonRank: 4,
            maxDungeonRank: 4,
            effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] },
          }),
        ]
      : []),
    ...(rank === 7
      ? [
          buildNodeEvent(location, {
            idSuffix: "rank-7-warm-flask",
            semanticType: "human",
            resultType: "story",
            nameSuffix: "Rank 7 Warm Flask",
            nameCnSuffix: "第七层还温的水壶",
            description: "甲七层的平台上，前一支队伍留下的水壶还是温的。壶盖里面刻着一个名字，和一句“先出去的人把伤者带走”。",
            baseWeight: 0.5,
            dungeonGrade: "甲",
            minDungeonRank: 7,
            maxDungeonRank: 7,
            effects: { reputationChange: 1 },
          }),
        ]
      : []),
  ]);
}
