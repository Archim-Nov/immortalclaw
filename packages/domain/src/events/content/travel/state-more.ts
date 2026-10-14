import type { StateEventRow } from "../states/template.js";

function roadChoice(
  title: string,
  prompt: string,
  aid: { id: string; label: string; summary: string },
  take: { id: string; label: string; summary: string; spiritStones: number },
): StateEventRow["moralityChoice"] {
  return {
    title,
    prompt,
    expiresInTicks: 6,
    options: [
      {
        id: aid.id,
        label: aid.label,
        summary: aid.summary,
        moralityDelta: 3,
        effectBundle: { reputationChange: 1, spiritStones: 8 },
      },
      {
        id: take.id,
        label: take.label,
        summary: take.summary,
        moralityDelta: -3,
        effectBundle: { spiritStones: take.spiritStones },
      },
    ] as const,
  };
}

export const TRAVEL_STATE_MORE: Record<string, readonly StateEventRow[]> = {
  qingzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Mud on the Herb Slip", titleCn: "粘了泥的药签", description: "田埂上掉着一张苍木谷的收药签，签角还粘着泥。签本身不能兑钱，压签的那两枚灵石还在。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "progression", title: "Ditch Path Balance", titleCn: "沟边走直", description: "这一段路只剩沟边一条窄土。你走完以后鞋是湿的，呼吸却比在官道上更齐，进境很少。", effects: { realmProgress: 1 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Basket Left at the Fork", titleCn: "岔路口的篮子", description: "岔路口放着半篮青叶，纸条写着送到百草镇。镇已经不远。你若自己留下好的那几片，纸条上的铺名也不会知道是谁拿的。", effects: {}, moralityChoice: roadChoice("岔路口的篮子", "半篮青叶和一张送到百草镇的纸条还在岔路口。你是送去，还是留下好的那几片？", { id: "take-basket", label: "把篮子送去", summary: "铺子按纸条收了，只给了很少的脚钱。" }, { id: "keep-leaves", label: "留下好叶子", summary: "篮子还在，好的那几片不在了。", spiritStones: 22 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Drying Rack Argument", titleCn: "晒架边的争执", description: "两个药户站在晒架边争一束叶子是谁先摘的。你路过时他们已经不看路人，只反复说同一个名字，像是还有一笔旧人情没算清。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Cangmu Gate Sentence", titleCn: "带到苍木谷的一句话", description: "路上一个弟子把一句“西坡今天不收人”托给你，让你带到苍木谷门口即可。值日的人听完点头，按跑腿给了几枚灵石。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  yangzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Coin in the Scupper", titleCn: "排水孔里的灵石", description: "船舷的排水孔堵住了，船家让你帮忙拨开。拨开以后水是浑的，孔里却卡着一枚过路人掉下去的灵石。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "combat", title: "Pole in the Ribs", titleCn: "竹篙撞到肋", description: "窄河上两船交错，对方的竹篙扫到你的肋。船家骂了一句，丢过来几枚灵石，船并没有停。", effects: { qi: -5, spiritStones: 10 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Wrong-Name Parcel", titleCn: "写错名的包裹", description: "渡口的包裹写错了收件人，真名在侧面。听潮阁的人还没到。你可以把包裹留到他来，也可以现在把里面的零碎取走。", effects: {}, moralityChoice: roadChoice("写错名的包裹", "包裹上的名字写错了，侧面才是真名，听潮阁的人还没到。你是把包裹留给他，还是现在取走零碎？", { id: "hold-parcel", label: "留给他", summary: "人来了以后，只给了你守着的那一点。" }, { id: "empty-parcel", label: "取走零碎", summary: "包裹还在渡口，里面已经空了。", spiritStones: 22 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Owes the Fare", titleCn: "船钱记在谁头上", description: "两个老客在争上一趟的船钱到底记在谁的人情里。船家不参与，只说名字他都认识，这一趟先开。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "status", title: "Tingchao Rope Watch", titleCn: "听潮阁的缆差", description: "听潮阁的值日让你在船靠岸时拉住缆绳，只拉这一次。拉完他把你让进棚里避了阵水汽，差银只有几枚。", effects: { spiritStones: 8, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  zhongzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Expired Road Pass", titleCn: "过期的路引", description: "驿亭长凳下压着一张过期路引，纸已经不能再用。压纸的灵石还是热的，像是刚被谁的手心捂过。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "progression", title: "Keeping the Posted Pace", titleCn: "按驿程走", description: "你照着驿程牌上的时辰走，不抄小路。走到下一座亭子时，时辰刚好，气息也没有散。", effects: { realmProgress: 1 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Extra Seal on the Form", titleCn: "多盖的一枚印", description: "书吏在路上清点文书，发现有一页多盖了一枚还没核销的印。他问你是帮他把这一页送回天衡宗，还是当这页已经丢了。", effects: {}, moralityChoice: roadChoice("多盖的一枚印", "这一页多盖了印，还没核销。你是送回天衡宗，还是当成已经丢了的那一页？", { id: "return-form", label: "送回天衡宗", summary: "页和印都回到值房，你只拿了跑腿钱。" }, { id: "drop-form", label: "当成丢了", summary: "这一页离开了文书袋，值房还没发觉。", spiritStones: 24 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Name Called at the Gate", titleCn: "关口喊到的名字", description: "关口的人喊一个名字，喊了三遍没人应。旁边的旅客说这个人欠了驿站一笔茶钱，可能是故意慢半步。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Tianheng Slip", titleCn: "天衡宗的短签", description: "一个换班的弟子把短签塞给你，只写着“东门的灯油到了”。你送到天衡宗侧门，值日的人收了签，给了几枚灵石。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  shuzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Peg in the Plank", titleCn: "栈道板上的钉子", description: "栈道一块板子松了，钉子缝里卡着行人掉下去的灵石。你把板子踩稳的时候，石子从缝里滚进手心。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "status", title: "Fog Step", titleCn: "雾里落脚", description: "山雾把前面两步都挡住了。你每落一脚都先探一下，走出雾时小腿是紧的，神识倒清楚。", effects: { qi: -4, statusEffects: [{ effectId: "insight", ticks: 2 }] } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Herb Left on the Rail", titleCn: "栏杆上的药", description: "栈道栏杆上搁着一束写了名字的药，下面就是别人的坡地。你可以把药带到破云门的巡山棚，也可以现在收进自己袋里。", effects: {}, moralityChoice: roadChoice("栏杆上的药", "这束药上写着名字，下面是别人的坡地。你是带到破云门的巡山棚，还是现在收进自己袋里？", { id: "bring-herb", label: "带到巡山棚", summary: "棚里的人收下了，只给了你很少的灵石。" }, { id: "bag-herb", label: "收进自己袋里", summary: "栏杆空了，名字还在那张湿纸上。", spiritStones: 22 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Cut the Rope", titleCn: "谁割过这根绳", description: "两个山民站在断绳前争是谁最后用过。他们提到一个还在山上的名字，说那个人欠他们一次带路，今天没出现。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Poyun Cairn", titleCn: "破云门的石堆", description: "破云门让过路的人若看见倒塌的指路石堆就码回去。你把三块石头码上，后面的巡山人给了几枚灵石，没有留你的名字。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  youzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Frozen Strap Buckle", titleCn: "冻住的带扣", description: "雪地里露出半截断带，带扣冻在一起。扣心里夹着主人没来得及取走的几枚灵石。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "combat", title: "Wind Taking the Cloak", titleCn: "风扯走披风", description: "一阵风把你的披风角扯进枯枝，扯下来时枝上还挂着别人留下的小钱袋。你的脸被刮破一点，钱袋里只有很少的灵石。", effects: { qi: -5, spiritStones: 10 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Ration at the Marker", titleCn: "路标下的干粮", description: "路标下压着一份写了名字的干粮，是给后面那拨人留的。朔冥殿的记号还在。你可以把干粮留在原处，也可以现在吃掉换成自己的路。", effects: {}, moralityChoice: roadChoice("路标下的干粮", "这份干粮写着后面那拨人的名字，朔冥殿的记号还在。你是留在原处，还是现在拿走？", { id: "leave-ration", label: "留在原处", summary: "干粮还在。后一拨人里有人后来把几枚灵石放回了路标下。" }, { id: "eat-ration", label: "现在拿走", summary: "记号还在，干粮不在了。", spiritStones: 18 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Missed the Watch", titleCn: "谁没来换哨", description: "两个换哨的人在风里等第三个人。他们说那个人欠了上一班的人情，今天若再不来，名字就会被写进棚里的木板。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "status", title: "Shuoming Firewood", titleCn: "朔冥殿的柴", description: "朔冥殿的短差是把一捆潮柴送到哨棚门口，不必进棚。你送到以后，棚里的人让你烤了烤手，柴仍归他们的值日。", effects: { spiritStones: 8, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Sand in the Boot", titleCn: "靴子里的沙", description: "你把靴子里的沙倒出来时，沙里混着一枚被磨得发暗的灵石。大概是上一个在这儿歇脚的人没倒干净。", effects: { spiritStones: 8 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "progression", title: "No Shade for a Mile", titleCn: "一里没有影子", description: "这一里路没有任何能站的影子。你没有跑，只是把呼吸压短，走到下一根旗杆时，进境比喝水更实在。", effects: { realmProgress: 2 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Marked Waterskin", titleCn: "做了记号的水囊", description: "旗杆下挂着一只做了记号的水囊，是给后面车辆留的。镇荒城的结还在。你可以把水留着，也可以自己喝掉赶路。", effects: {}, moralityChoice: roadChoice("做了记号的水囊", "这只水囊是给后面的车留的，镇荒城的结还在。你是把水留下，还是自己喝掉赶路？", { id: "leave-skin", label: "把水留下", summary: "水囊还挂在旗杆上，后面的人把几枚灵石塞进了结里。" }, { id: "drink", label: "自己喝掉", summary: "你先走了，旗杆下只剩空囊。", spiritStones: 16 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Took the Last Shade", titleCn: "谁占了最后一块阴", description: "两个车夫在争上一站的阴凉到底该让给谁。他们提到一个欠水的名字，说那个人若再出现，先把水还上再谈位子。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Zhenhuang Flag Cord", titleCn: "镇荒城的旗绳", description: "镇荒城的路旗绳断了，过路的人若会打结就帮着接上。你把结打完，后面的驿卒给了几枚灵石，旗仍是他们的。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  leizhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Ash on the Milestone", titleCn: "碑上的灰", description: "雷把里程碑表面打出一层灰。你抹开灰的时候，碑座缝里震出几枚原本卡死的灵石。", effects: { spiritStones: 12 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "status", title: "Waiting Out One Roll", titleCn: "等过一声雷", description: "你在石棚里等过最近的一声雷再走。雷过去以后耳朵还嗡，气息却比冒雨赶的人更稳。", effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Warning Stake", titleCn: "还没插上的警桩", description: "惊霄宫的警桩倒在路边，这一段还没标。你可以把桩重新插上再走，也可以把它脚上绑的那点灵石解下来，当没看见倒桩。", effects: {}, moralityChoice: roadChoice("倒了的警桩", "惊霄宫的警桩倒了，这一段还没标。你是把桩插回去，还是解下桩上那点灵石就走？", { id: "reset-stake", label: "把桩插回去", summary: "路重新有了标记，你只拿了桩上原本给值日的几枚。" }, { id: "untie", label: "解下灵石就走", summary: "桩还倒着，灵石不在绳子上了。", spiritStones: 20 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Stayed in the Last Strike", titleCn: "上一声雷里谁没走", description: "避雨的人说，上一声雷的时候有个名字没有进棚。他们不确定那个人是走了，还是还在外面的坡上，谁也不想现在出去看。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Jingxiao Oil Flask", titleCn: "惊霄宫的灯油", description: "一个弟子把一小瓶灯油交给你，让你送到下一座警棚，不必停留。棚里的人接过油，按杂务给了几枚灵石。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  cangzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Coin under the Cleat", titleCn: "缆桩下的灵石", description: "你帮着把缆绳从桩上解下时，桩洞里滚出一枚被盐壳包住的灵石。船已经走了，没有人回头要。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "progression", title: "Walking the Wet Plank", titleCn: "湿板上走完", description: "埠头的湿板又滑又短。你走完这一段没有滑倒，气息却像在船上站过一程，进境只有一点。", effects: { realmProgress: 1 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Catch Left on the Pile", titleCn: "桩上的一兜海货", description: "木桩上挂着一兜没人认领的海货，撼海堡的牌还别在绳上。你可以把这一兜送到堡里的账房，也可以现在拿去换路费。", effects: {}, moralityChoice: roadChoice("桩上的一兜海货", "这兜海货还别着撼海堡的牌，人却不在。你是送到账房，还是现在拿去换路费？", { id: "turn-in", label: "送到账房", summary: "牌和货都进了账，你只拿了送一趟的钱。" }, { id: "sell-catch", label: "拿去换路费", summary: "牌子还在绳上，货已经不在桩上。", spiritStones: 22 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Which Boat Owes the Night", titleCn: "哪条船欠了夜航", description: "两个船工在争昨晚的夜航算谁的人情。名字他们说了，船已经离港，这场争执今天不会有结果。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "status", title: "Hanhai Fog Bell", titleCn: "撼海堡的雾钟", description: "起雾时撼海堡的短差是在埠头敲两下钟。你替还没到的值日敲了，他赶到以后让你在棚里把湿衣服烘干。", effects: { spiritStones: 8, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  wanzhou: [
    { slot: "tr-f-05", semanticType: "fortune", resultType: "resource", title: "Change on the Stool", titleCn: "凳上的找零", description: "茶棚的凳子上留着上一桌的找零，掌柜说那桌的人已经出城。他不收这几枚，也不写进今天的账。", effects: { spiritStones: 10 } },
    { slot: "tr-t-04", semanticType: "training", resultType: "combat", title: "Cart Corner", titleCn: "车角刮过", description: "巷口一辆车拐得太急，车角刮过你的手臂。车夫没有停车，只把车上掉下来的一把灵石留在泥里。", effects: { qi: -4, spiritStones: 10 } },
    { slot: "tr-h-04", semanticType: "human", resultType: "resource", title: "Letter under the Cup", titleCn: "杯下的信", description: "你落座时发现杯下压着一封还没送出的信，收信人在茶桥。万象楼的人说这封不走他们的正式差。你可以送去，也可以把信里夹着的灵石取出。", effects: {}, moralityChoice: roadChoice("杯下的信", "这封信还没送到茶桥，里面夹着灵石。你是把信送去，还是把灵石取出、信留在杯下？", { id: "deliver-letter", label: "把信送去", summary: "信到了本人手里，你只拿了路上的那一点。" }, { id: "take-coin", label: "取出灵石", summary: "信还压在杯下，里面的灵石不在了。", spiritStones: 22 }) },
    { slot: "tr-h-05", semanticType: "human", resultType: "story", title: "Who Still Owes the Tea", titleCn: "谁的茶钱还挂着", description: "掌柜对着墙上一排名字说，这些茶钱都还挂着，有的人是故意不来结。他没有请你去讨，只是把名字念得很清楚。", effects: {} },
    { slot: "tr-s-01", semanticType: "human", resultType: "resource", title: "Wanxiang Short Line", titleCn: "万象楼的一句短话", description: "万象楼的跑堂让你把一句“今晚的位子留给欠账的人”带到下一座茶棚。茶棚的人听完，按跑腿给了几枚灵石。", effects: { spiritStones: 12, reputationChange: 1 } },
  ],
};
