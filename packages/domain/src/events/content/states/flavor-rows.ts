import type { StateEventRow } from "./template.js";

export const EXPLORATION_FLAVOR: Record<string, readonly StateEventRow[]> = {
  qingzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Dew on the Drying Cloth", titleCn: "晒药布上的露", description: "青州药坡的晒药布还没有收，布上的露水把叶子的影子印了出来。收药的人在坡下喊先别收，等太阳把这一层吃掉。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Name on the Gate Slate", titleCn: "门房石板上的名字", description: "苍木谷门房的石板上用粉笔写着今天谁扫阶。写你前面那个名字的人已经走了，管事让你把粉笔放回盒里，给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  yangzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Net Dripping on the Plank", titleCn: "滴在跳板上的网", description: "听潮阁的一张小网从杆上滴水，滴到跳板正中。过船的人侧着脚走，没有人把网挪开。你等两滴过去，再上板。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "status", title: "After the Tide Count", titleCn: "潮数点完以后", description: "听潮阁的人把今天的潮数念完，让站在廊外的人各自散。你的名字不在册上，他仍让你在檐下站到鞋不再滴水。", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  zhongzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Ink Not Yet Dry", titleCn: "还没干的榜墨", description: "中州街口的榜刚贴上，墨还没干。看榜的人用手背试了一下就缩回来。你没有去碰那一行字，风已经把纸角吹起一点。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Brush Washed in the Corridor", titleCn: "廊上洗过的笔", description: "天衡宗的书吏在廊上洗笔，把笔挂到滴水的地方。他让你把空砚送回值房，值房的人按跑腿给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  shuzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Moss on the Inner Plank", titleCn: "里侧栈板上的苔", description: "蜀州这段栈道的里侧长了一层薄苔，外侧的人仍贴着栏杆走。破云门的巡山人用杖点了点苔，说今天不换板，然后过去了。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Bell Left Unrung", titleCn: "没有再敲的铃", description: "山腰的小祠铃绳被人按住，破云门的人说这一声已经报过，不必再敲。你帮他把绳绕回钩上，他给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  youzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Breath on the Marker", titleCn: "雪标上的白气", description: "幽州的雪标被风吹斜，有人凑近看上面的刻度，白气糊住了最下面一行。他看完把标杆扶正一点，没有改自己的路。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "status", title: "Roster Read in the Wind", titleCn: "风口念完的名册", description: "朔冥殿的人在风口把这一班的名字念完，炭火只够再烤一只手。你的名字不在册上，他仍让你烤到手指能弯。", baseWeight: 1, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Shadow under the Banner", titleCn: "旗影里的歇脚", description: "镇荒城的路旗在正午只剩窄窄一条影子。车夫把水囊放在影子里，自己站在外面。你从影子边缘过，水囊没有让给你。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Trough Scraped Clean", titleCn: "刮净的马槽", description: "镇荒城的值日把马槽刮净，把木刮搁在槽沿。他让你把空料袋叠好放到棚里，按杂务给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  leizhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Count before the Next Crack", titleCn: "下一声之前的数", description: "惊霄宫的人在棚外数到七，雷没有来。他收了手，说今天先数到这里。棚里的人把脚从门槛上拿开，你也把步子放回去。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "status", title: "Oil Checked and Left", titleCn: "点过又留下的灯油", description: "惊霄宫的值日把警棚的灯油点了一下，确认还能燃，就把灯芯按回去。他让你在檐下等到这一阵风过去。", baseWeight: 1, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  cangzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Two Strokes and Then Stop", titleCn: "港钟只摇了两下", description: "撼海堡的港钟在雾里摇了两下就停了。埠头的人说这是叫值日的人回来，不是叫船。船还系在原来的桩上。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Page Weighted with a Shell", titleCn: "用贝壳压住的账页", description: "账房的人用一只贝壳压住还没干的账页，说这页先不要收。你帮他把滴水的袖口拧干，他按杂务给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
  wanzhou: [
    { slot: "f-06", semanticType: "fortune", resultType: "story", title: "Seat Turned to the Rail", titleCn: "转到栏边的位子", description: "万象楼的跑堂把一张空椅转到茶桥栏边，说这个位子今晚留给还没到的人。椅上没有茶，你从椅背后面走过去。", baseWeight: 1, effects: {} },
    { slot: "h-07", semanticType: "human", resultType: "resource", title: "Pot Counted and Covered", titleCn: "数完又盖上的壶", description: "值茶的人把空壶数完，盖上，推到你手边，说送到茶房即可，不必再加水。茶房收了壶，给了很少的灵石。", baseWeight: 1, effects: { spiritStones: 8, reputationChange: 1 } },
  ],
};
