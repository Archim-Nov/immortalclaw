import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";
import type { EncounterBuildId } from "../../../encounters/catalog.js";

import { buildNodeEvent } from "./shared.js";

export function buildDungeonBEventPack(location: Location): EventTemplate[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).flatMap((rank) => [
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-cache`,
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Supply Vault`,
      nameCnSuffix: `第${rank}层辎重库`,
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
      nameCnSuffix: `第${rank}层淬炼室`,
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
      nameCnSuffix: `第${rank}层压境突破`,
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
      encounterBuildId: (rank <= 3 ? "dungeon-guardian-heavy-yi" : rank <= 6 ? "dungeon-guardian-seal-yi" : "dungeon-guardian-drain-yi") as EncounterBuildId,
      combatMode: "full",
    }),
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-recovery`,
      semanticType: "human",
      resultType: "resource",
      nameSuffix: `Rank ${rank} Expedition Remainder`,
      nameCnSuffix: `第${rank}层遗留物资`,
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
    // ── New: Story row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-inscription`,
      semanticType: "human",
      resultType: "story",
      nameSuffix: `Rank ${rank} Wall Inscription`,
      nameCnSuffix: `第${rank}层壁刻`,
      description: `Faint inscriptions in ${location.name} rank ${rank} record tactics used by past expeditions — worth a quick study.`,
      baseWeight: 0.6,
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
      },
    }),
    // ── New: Status row ──
    buildNodeEvent(location, {
      idSuffix: `rank-${rank}-ward-residue`,
      semanticType: "training",
      resultType: "status",
      nameSuffix: `Rank ${rank} Ward Residue`,
      nameCnSuffix: `第${rank}层残阵余气`,
      description: `Fading ward energy in ${location.name} rank ${rank} buffers your next encounter.`,
      baseWeight: 0.65,
      dungeonGrade: "乙",
      minDungeonRank: rank,
      maxDungeonRank: rank,
      effects: {
        statusEffects: [{ effectId: "warded", ticks: 2 }],
      },
    }),
  ]);
}
