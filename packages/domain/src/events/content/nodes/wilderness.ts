import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";
import type { EncounterBuildId } from "../../../encounters/catalog.js";

import { buildNodeEvent } from "./shared.js";

export function buildWildernessEventPack(location: Location): EventTemplate[] {
  return [
    // ── Resource ──
    buildNodeEvent(location, {
      idSuffix: "ore-seam",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Ore Seam",
      nameCnSuffix: "矿脉裂缝",
      description: `A mineral seam breaks open near ${location.name}.`,
      baseWeight: 1.2,
      effects: {
        spiritStones: 28,
        itemRewards: [{ itemId: "spirit-ore", count: 1 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "spirit-herb-pocket",
      semanticType: "training",
      resultType: "resource",
      nameSuffix: "Spirit Herb Pocket",
      nameCnSuffix: "灵草丛",
      description: `A dense herb pocket near ${location.name} yields stable stock useful for foundation breakthroughs.`,
      baseWeight: 0.85,
      minRealm: "筑基",
      effects: {
        spiritStones: 36,
        itemRewards: [{ itemId: "foundation-common", count: 1 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "drift-crystal",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Drift Crystal",
      nameCnSuffix: "浮晶散落",
      description: `Loose crystals near ${location.name} catch the light — small but tradeable.`,
      baseWeight: 0.9,
      effects: {
        spiritStones: 44,
      },
    }),
    // ── Status ──
    buildNodeEvent(location, {
      idSuffix: "calm-hollow",
      semanticType: "training",
      resultType: "status",
      nameSuffix: "Calm Hollow",
      nameCnSuffix: "静谷清息",
      description: `A sheltered hollow near ${location.name} lets you catch your breath and settle your qi.`,
      baseWeight: 0.95,
      effects: {
        statusEffects: [{ effectId: "clear-mind", ticks: 3 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "dust-gust",
      semanticType: "training",
      resultType: "status",
      nameSuffix: "Dust Gust",
      nameCnSuffix: "尘风袭体",
      description: `A sudden grit-laden gust near ${location.name} stings the skin and blurs the path ahead.`,
      baseWeight: 0.75,
      effects: {
        qi: -5,
        spiritualPower: -3,
      },
    }),
    // ── Story ──
    buildNodeEvent(location, {
      idSuffix: "old-marker",
      semanticType: "human",
      resultType: "story",
      nameSuffix: "Old Marker",
      nameCnSuffix: "旧路标石",
      description: `A weathered marker near ${location.name} points toward a safer route through the wastes.`,
      baseWeight: 0.8,
      effects: {
        statusEffects: [{ effectId: "fortune-marked", ticks: 2 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "beast-den-traces",
      semanticType: "human",
      resultType: "story",
      nameSuffix: "Beast Den Traces",
      nameCnSuffix: "兽穴痕迹",
      description: `Claw marks and shed fur near ${location.name} suggest a predator's territory boundary.`,
      baseWeight: 0.7,
      effects: {
        spiritStones: 20,
        statusEffects: [{ effectId: "warded", ticks: 2 }],
      },
    }),
    // ── Combat ──
    buildNodeEvent(location, {
      idSuffix: "vein-beast-ambush",
      semanticType: "training",
      resultType: "combat",
      nameSuffix: "Vein Beast Ambush",
      nameCnSuffix: "脉兽袭击",
      description: `A burrowing beast near ${location.name} lunges from loose ground.`,
      baseWeight: 0.7,
      effects: {
        qi: -8,
        spiritStones: 22,
      },
      encounterBuildId: "wilderness-vein-beast-hunt" as EncounterBuildId,
    }),
    buildNodeEvent(location, {
      idSuffix: "stone-sentinel-stir",
      semanticType: "training",
      resultType: "combat",
      nameSuffix: "Stone Sentinel Stir",
      nameCnSuffix: "石哨卫惊醒",
      description: `A dormant stone construct near ${location.name} hums back to attention.`,
      baseWeight: 0.55,
      effects: {
        qi: -10,
        spiritStones: 30,
        itemRewards: [{ itemId: "spirit-ore", count: 1 }],
      },
      encounterBuildId: "wilderness-stone-sentinel-clash" as EncounterBuildId,
    }),
    // ── Progression ──
    buildNodeEvent(location, {
      idSuffix: "wild-circulation",
      semanticType: "training",
      resultType: "progression",
      nameSuffix: "Wild Circulation",
      nameCnSuffix: "荒原行气",
      description: `The open terrain near ${location.name} lets your qi move freely for a short cycle.`,
      baseWeight: 0.85,
      effects: {
        realmProgress: 3,
      },
    }),
  ];
}
