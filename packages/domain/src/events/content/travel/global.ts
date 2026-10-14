import type { EventTemplate } from "../../../events.js";
import { deriveSignalType } from "../../../events.js";

import { createTravelSceneRows } from "../scene-choices.js";
import { createTravelGlobalMoreRows } from "./global-more.js";

export type TravelGlobalRow =
  Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm" | "signalType">
  & { readonly minRealm?: EventTemplate["minRealm"] };

function withSignal(row: TravelGlobalRow): TravelGlobalRow & { signalType: EventTemplate["signalType"] } {
  return { ...row, signalType: deriveSignalType(row.resultType, row.effects) };
}

export function createTravelGlobalRows(): readonly (TravelGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    ...createTravelGlobalBaseRows(),
    ...createTravelGlobalMoreRows(),
    ...createTravelSceneRows(),
  ];
}

function createTravelGlobalBaseRows(): readonly (TravelGlobalRow & { signalType: EventTemplate["signalType"] })[] {
  return [
    withSignal({ id: "tr-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Pickup", nameCn: "路边捡漏", description: "道旁的草丛里露出半截储物袋的角，里头还剩几枚灵石和碎银，大概是哪位赶路的散修不慎遗落的。捡起来掂了掂，虽不多，聊胜于无。", baseWeight: 1, effects: { spiritStones: 20 } }),
    withSignal({ id: "tr-f-02", semanticType: "fortune", resultType: "status", name: "Tailwind", nameCn: "顺风赶路", description: "山谷间忽来一阵清风，恰好顺着行路方向吹拂，灵气借风势渗入经脉，步伐轻快了不少，气息运转也比平时顺畅。", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } }),
    withSignal({ id: "tr-f-03", semanticType: "fortune", resultType: "story", name: "Fellow Traveler", nameCn: "路遇同行", description: "一位背着药篓的散修与你同行了一段路，闲聊间提起了前方几处关卡的近况和沿途哪家客栈还算清净。临别时拱了拱手，各自上路。", baseWeight: 1, effects: { reputationChange: 1 } }),
    withSignal({ id: "tr-f-04", semanticType: "fortune", resultType: "resource", name: "Supply Caravan Remainder", nameCn: "行商余货", description: "一支商队刚从岔路折返，车辙旁散落着几包被弃置的修炼辅材。看成色应是某家坊市的滞销品，对突破修炼倒还堪用。", baseWeight: 0.7, minRealm: "筑基", effects: { spiritStones: 32, itemRewards: [{ itemId: "jade-marrow-sand", count: 1 }] } }),
    withSignal({ id: "tr-t-01", semanticType: "training", resultType: "progression", name: "Walking Insight", nameCn: "行路参悟", description: "长途步行的节奏恰好与呼吸法诀暗合，走着走着忽然有种气沉丹田的感觉，意识到自己无意间完成了一个微小的修炼循环。", baseWeight: 1, effects: { realmProgress: 1, itemRewards: [{ itemId: "clear-zhi-leaf", count: 1 }] } }),
    withSignal({ id: "tr-t-02", semanticType: "training", resultType: "status", name: "Load Bearing", nameCn: "负重行走", description: "背着行囊在山道上走了许久，虽然疲劳渐增，但灵力在持续消耗中反而打通了几处淤塞的经络，精神力微微提升。", baseWeight: 1, effects: { spiritualPower: 8 } }),
    withSignal({ id: "tr-t-03", semanticType: "training", resultType: "combat", name: "Road Beast", nameCn: "路遇妖兽", description: "拐过山弯时一头低阶妖兽从灌木丛中扑出，只来得及侧身一闪便短兵相接。一番缠斗后将它逼退，虽耗了些灵力，倒也搜出几枚灵石。", baseWeight: 1, effects: { qi: -8, spiritStones: 16 } }),
    withSignal({ id: "tr-h-01", semanticType: "human", resultType: "resource", name: "Passing Merchant", nameCn: "过路商人", description: "路边歇脚时遇到一位走街串巷的灵材商，攀谈几句后他以低于坊市的价格出让了一小批货物，说是急着赶路不想多带。", baseWeight: 1, effects: { spiritStones: 25 } }),
    withSignal({ id: "tr-h-02", semanticType: "human", resultType: "story", name: "Roadside Notice", nameCn: "路边告示", description: "驿站外的木板上贴着几张告示，有悬赏缉拿逃犯的、有招募护卫的、还有一张褪色的寻人启事。虽然与你无关，但多少透露了一些区域局势。", baseWeight: 1, effects: {} }),
    withSignal({ id: "tr-h-03", semanticType: "human", resultType: "combat", name: "Bandit Blockade", nameCn: "山匪拦路", description: "窄路上几个蒙面汉子拦住去路，为首的比划着一把卷刃的法器。好在他们并非修士，几招之后便作鸟兽散，连带着扔下了些灵石。", baseWeight: 1, effects: { qi: -10, spiritStones: 24 } }),
    withSignal({ id: "tr-h-04", semanticType: "human", resultType: "resource", name: "Ancient Relay Cache", nameCn: "古驿遗藏", description: "一位白发老驿卒指着墙角的旧暗格说，这是前朝传信修士留下的应急物资，非金丹以上的灵压无法开启封印。打开后里面的材料保存得相当完好。", baseWeight: 0.45, minRealm: "金丹", effects: { spiritStones: 48, itemRewards: [{ itemId: "star-fall-sand", count: 1 }] } }),
    // ── 新增风味事件 ──
    withSignal({ id: "tr-fl-01", semanticType: "fortune", resultType: "story", name: "Sunset Vista", nameCn: "落日远眺", description: "翻过一道山脊后，视野忽然开阔。远处层峦叠嶂，一轮红日正缓缓沉入天际，云霞铺满半边天。在这样的景色面前，赶路的焦躁消散了几分。", baseWeight: 0.9, effects: {} }),
    withSignal({ id: "tr-fl-02", semanticType: "human", resultType: "story", name: "Children's Song", nameCn: "童谣入耳", description: "经过一座小村落时，几个孩子正在溪边唱着当地的童谣。旋律简单，歌词里混着些散修传说和山精故事。你放慢脚步听了一会儿，然后继续赶路。", baseWeight: 0.9, effects: {} }),
    withSignal({ id: "tr-fl-03", semanticType: "training", resultType: "story", name: "Old Bridge Inscription", nameCn: "古桥题刻", description: "一座斑驳的石桥栏杆上刻着几行小字，似乎是某位前辈修士路过时随手留下的修炼心得。字迹已经模糊，但仔细辨认后还是记住了几句有用的口诀。", baseWeight: 0.9, effects: { reputationChange: 1 } }),
  ];
}
