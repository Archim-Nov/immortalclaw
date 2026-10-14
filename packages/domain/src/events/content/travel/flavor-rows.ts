import type { StateEventRow } from "../states/template.js";

export const TRAVEL_FLAVOR: Record<string, readonly StateEventRow[]> = {
  qingzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Leaf Stuck to the Axle", titleCn: "粘在车轴上的叶子", description: "青州的送药车停下来抠车轴，轴上粘着一片还绿的叶子。车夫抠下来看了看，说不是这一车的货，然后把叶子丢进沟里。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Slip for the Next Shed", titleCn: "交到下一座棚的条子", description: "一个苍木谷的弟子把写着“西坡今天的露不收”的条子交给你，下一座棚就在看得见的地方。你送到，值日的人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  yangzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Oar Knocking the Hull", titleCn: "敲着船帮的桨", description: "扬州窄河里，一支没人握的桨随着水敲船帮，一下一下，并不齐。船家在舱里应了一声，桨仍敲着，船没有停。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "status", title: "Rope Handed Back", titleCn: "递回去的缆绳", description: "听潮阁的值日把收了一半的缆绳递给你，只让你拉到桩上就松开。拉完他把你让到不溅水的一侧，差银只有很少几枚。", baseWeight: 1, effects: { spiritStones: 6, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  zhongzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Milestone Newly Chalked", titleCn: "新画过的里程", description: "中州官道的里程碑被人用白粉改了一个数字，又用手指抹掉。抹的痕迹还在。你按原来的数字走，没有人出来纠正。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Seal Box to the Side Door", titleCn: "送到侧门的印盒", description: "一个换班的弟子把空印盒交给你，说侧门有人收，不必进天衡宗的正院。你送到，收盒的人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  shuzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "One Step Left Out", titleCn: "少踩的那一级", description: "蜀州石阶有一级是湿的，前后的脚印都避开了它。你也避开了。上面的雾里有人咳嗽，没有下来看是谁在数台阶。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Staff Returned to the Cairn", titleCn: "放回石堆的竹杖", description: "破云门的人把一根多余的竹杖交给你，让你放到前面倒塌过又码好的石堆旁。你放到了，后面的巡山人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  youzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Track Filled by Noon", titleCn: "中午就被填上的辙", description: "幽州的雪在中午软了一点，早上的车辙被后来的脚填平。朔冥殿的人看了看，说这条还能走，然后自己踩出新的一行。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "status", title: "Charcoal Counted Once", titleCn: "只数了一遍的炭", description: "哨楼下的人把炭数了一遍，说够下一班用，就不再添。他让你在门洞里站到脸上的雪化掉。", baseWeight: 1, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Waterline on the Skin", titleCn: "水囊上的刻度", description: "凉州的赶车人用指甲在水囊上按了一道，说这一道要留到下一座井。你看见的时候，囊还在他手里，刻度没有被喝过去。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Feed Bag Folded", titleCn: "叠好的料袋", description: "镇荒城的人把空料袋交给你，让你叠好挂到下一根旗杆上，不必进内院。旗杆下的人收下了，给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  leizhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Pole Still Warm", titleCn: "还热的旗杆", description: "雷州路边的旗杆摸上去还热，旗却已经收了。惊霄宫的人说杆裂了才收的，不是天晴。你的手在杆上停了一下就拿开。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Shed Told to Wait", titleCn: "让下一座棚再等", description: "一个弟子把“这一阵过去再开棚门”交到你手上，下一座警棚就在坡下。你把话带到，接话的人给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  cangzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Knot Left for the Next Tide", titleCn: "留给下一潮的结", description: "沧州的缆绳上多打了一个结，船工说这个结是留给下一潮认的，这一潮不解开。船已经靠稳，结还在。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "status", title: "Bell Rope Dried", titleCn: "烘干的钟绳", description: "撼海堡的人把湿钟绳在棚里抖开，让你帮着拉到不再滴水。拉完他没有再让你摇钟，只让你在棚里站到袖口干。", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  wanzhou: [
    { slot: "tr-f-06", semanticType: "fortune", resultType: "story", title: "Cup Left Facing Out", titleCn: "杯口朝外的茶盏", description: "万州茶桥上有一只茶盏杯口朝外，跑堂说这是告诉后来的人这个位子还没结。你从盏边过，茶已经凉了，没有人请你喝。", baseWeight: 1, effects: {} },
    { slot: "tr-h-06", semanticType: "human", resultType: "resource", title: "Four Words to the Next Shed", titleCn: "带到下一座棚的四个字", description: "万象楼的人让你把“位子先留着”带到州外的下一座茶棚。棚里的人听完点头，按跑腿给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
};
