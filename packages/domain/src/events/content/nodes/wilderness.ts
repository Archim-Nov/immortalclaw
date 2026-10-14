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
      description: `${location.name}附近的石缝裂开一条，里面不是矿脉，只嵌着一小块能换灵石的矿和几枚碎石。`,
      baseWeight: 0.88,
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
      description: `${location.name}附近有一丛长得密的灵草，筑基以后才值得停下来收。收完也只有一小把土和一点灵石，不够当一笔大收获。`,
      baseWeight: 0.85,
      minRealm: "筑基",
      effects: {
        spiritStones: 36,
        itemRewards: [{ itemId: "purple-palace-earth", count: 1 }],
      },
    }),
    buildNodeEvent(location, {
      idSuffix: "drift-crystal",
      semanticType: "fortune",
      resultType: "resource",
      nameSuffix: "Drift Crystal",
      nameCnSuffix: "浮晶散落",
      description: `${location.name}附近的地面上散着几粒反光的碎晶，捡起来只能换一点灵石，不能当矿开。`,
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
      description: `${location.name}旁边有一处背风的浅坑。你在里面把气喘匀，再出去时脚步比进来时稳。`,
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
      description: `${location.name}突然刮过一阵带着砂的风，打在脸上，前面的路也看短了一截。你低下头等它过去，灵力被带掉一点。`,
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
      description: `${location.name}附近有一块旧路标，箭头指向绕开乱石的那一侧。字已经淡了，方向还认得。`,
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
      description: `${location.name}附近的石头上有爪印和一撮脱掉的毛。这是兽走的边，不是让你追进去的路。边上还掉着几枚灵石。`,
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
      description: `${location.name}脚下的土突然松了，一头钻地的兽从侧面扑出来。你把它逼开，地上留下它扒出来的一点灵石。`,
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
      description: `${location.name}旁边一具原本不动的石哨突然嗡了一声。它动得很慢，你退开时还是被带掉一点灵力，石缝里掉出一小块矿。`,
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
      description: `${location.name}这一片没有树挡着，气息可以按你自己的步子走完一个小周天。进境不多，也没有人来打断。`,
      baseWeight: 0.85,
      effects: {
        realmProgress: 3,
      },
    }),
  ];
}
