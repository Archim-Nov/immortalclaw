import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

import { buildNodeEvent } from "./shared.js";

interface WildRow {
  readonly idSuffix: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly nameSuffix: string;
  readonly nameCnSuffix: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly effects: EventTemplate["effects"];
}

const ROWS: Record<string, readonly WildRow[]> = {
  qingzhou: [
    { idSuffix: "wild-basket-shadow", semanticType: "fortune", resultType: "story", nameSuffix: "Basket Shadow", nameCnSuffix: "篮子的影子", description: "州外的药坡上有一只空篮子扣着，影子比篮子本身先被你看见。收药的人不在这一面，篮子也没有人来取。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-dew-cup", semanticType: "human", resultType: "resource", nameSuffix: "Dew Cup", nameCnSuffix: "接露的碗", description: "苍木谷的人在州外用一只碗接叶上的露，接了半碗就停。他把碗边多出来的几枚灵石拨给你，说这一碗他自己喝。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  yangzhou: [
    { idSuffix: "wild-crab-line", semanticType: "fortune", resultType: "story", nameSuffix: "Crab Line", nameCnSuffix: "没人收的蟹线", description: "州外的浅滩上拉着一根蟹线，线头绑在芦苇上，另一头没入水里。听潮阁的船已经不在这一侧。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-cork-float", semanticType: "human", resultType: "resource", nameSuffix: "Cork Float", nameCnSuffix: "漂来的浮子", description: "一只木浮子漂到州外的脚边，上面刻着船号。你把它搁到干处，后来找浮子的人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  zhongzhou: [
    { idSuffix: "wild-ink-stone", semanticType: "fortune", resultType: "story", nameSuffix: "Roadside Inkstone", nameCnSuffix: "路碑下的砚", description: "州外的里程碑下压着一方小砚，墨已经干了。天衡宗的人从旁边过，说这方砚不入册，也没有人把它拿走。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-side-drum", semanticType: "human", resultType: "status", nameSuffix: "Drum at the Side Gate", nameCnSuffix: "侧门的鼓", description: "州外侧门的鼓今天没有人敲。守门的人让你在鼓架下站到汗退，说名册上没有你，阴凉仍可以站。", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  shuzhou: [
    { idSuffix: "wild-moss-step", semanticType: "training", resultType: "status", nameSuffix: "Moss Step", nameCnSuffix: "长苔的那一步", description: "州外石阶有一步长了苔。你把脚放在里侧，等它不再滑，再继续上。这一停很短，呼吸却齐了。", baseWeight: 0.95, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-gourd-vine", semanticType: "human", resultType: "resource", nameSuffix: "Gourd on the Vine", nameCnSuffix: "藤上的葫芦", description: "州外的藤上挂着一只小葫芦，药户说这只裂了，不能入筐。你帮他把裂的那只摘下来丢掉，他给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  youzhou: [
    { idSuffix: "wild-ice-bead", semanticType: "fortune", resultType: "story", nameSuffix: "Ice Bead", nameCnSuffix: "檐上的冰珠", description: "州外哨棚的檐上挂着一排冰珠，风一过就轻轻碰。朔冥殿的人说这不是信号，只是夜里的水。你在下面过的时候没有一颗掉下来。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-spare-flag", semanticType: "human", resultType: "resource", nameSuffix: "Spare Cloth Flag", nameCnSuffix: "备用的布旗", description: "州外的备用布旗被风吹落，杆还在。你把旗重新套上，换班的人给了很少的灵石，没有把你的名字写上岗。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  liangzhou: [
    { idSuffix: "wild-salt-crust", semanticType: "fortune", resultType: "story", nameSuffix: "Salt Crust", nameCnSuffix: "水囊口的盐壳", description: "州外的水囊口结了一层薄盐。赶车的人用指甲刮掉，刮完又把塞子盖上。他没有把水让出来，你也没有问。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-saddle-bell", semanticType: "human", resultType: "resource", nameSuffix: "Saddle Bell", nameCnSuffix: "鞍上松了的铃", description: "镇荒城的骆驼在州外停着，最边上的铃绳松了。你把绳系回去，赶队的人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  leizhou: [
    { idSuffix: "wild-char-stake", semanticType: "fortune", resultType: "story", nameSuffix: "Charred Stake", nameCnSuffix: "焦了的警桩", description: "州外一根警桩的顶被打黑了，桩身还立着。惊霄宫的人看了看，说今天不换，换了也来不及在下一声之前立好。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-rain-cloak", semanticType: "human", resultType: "status", nameSuffix: "Cloak on the Peg", nameCnSuffix: "挂在桩上的斗篷", description: "避雷棚外的桩上挂着一件多余的斗篷。值日的人让你在这一声里披上，声过以后再还回来。斗篷是湿的，雨倒小些。", baseWeight: 1, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  cangzhou: [
    { idSuffix: "wild-kelp-line", semanticType: "fortune", resultType: "story", nameSuffix: "Kelp Line", nameCnSuffix: "礁上的海带绳", description: "州外的礁上晾着一绳海带，绳头没有打结。撼海堡的人说这一绳先晾着，下一潮之前不收。你从绳下低头走过去。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-shell-count", semanticType: "human", resultType: "resource", nameSuffix: "Shell Count", nameCnSuffix: "数过的贝壳", description: "埠头的人在州外用贝壳给船数货，数完把多出来的两只拨到一边。他让你把这两只扔回海里，按杂务给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  wanzhou: [
    { idSuffix: "wild-tea-ring", semanticType: "fortune", resultType: "story", nameSuffix: "Tea Ring", nameCnSuffix: "凳上的茶渍", description: "州外茶棚收了摊，凳上留下一圈茶渍。掌柜说这圈是上一桌的，今天不再擦。你从凳边过，茶渍已经干了。", baseWeight: 0.95, effects: {} },
    { idSuffix: "wild-bead-count", semanticType: "human", resultType: "resource", nameSuffix: "Bead on the Step", nameCnSuffix: "台阶上的算盘珠", description: "万象楼的人在州外的台阶上捡到一颗从算盘上掉下来的珠。他让你送回茶房，茶房给了很少的灵石，珠子留下。", baseWeight: 1, effects: { spiritStones: 6, reputationChange: 1 } },
  ],
};

export function buildWildernessFlavorOverlay(location: Location): EventTemplate[] {
  const rows = ROWS[location.stateId] ?? [];
  return rows.map((row) => buildNodeEvent(location, row));
}
