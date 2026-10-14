import type { StateEventRow } from "./template.js";

const choice = (
  title: string,
  prompt: string,
  aid: { id: string; label: string; summary: string; spiritStones?: number; reputationChange?: number },
  take: { id: string; label: string; summary: string; spiritStones: number },
): StateEventRow["moralityChoice"] => ({
  title,
  prompt,
  expiresInTicks: 6,
  options: [
    {
      id: aid.id,
      label: aid.label,
      summary: aid.summary,
      moralityDelta: 3,
      effectBundle: {
        ...(aid.spiritStones ? { spiritStones: aid.spiritStones } : {}),
        ...(aid.reputationChange ? { reputationChange: aid.reputationChange } : { reputationChange: 1 }),
      },
    },
    {
      id: take.id,
      label: take.label,
      summary: take.summary,
      moralityDelta: -3,
      effectBundle: { spiritStones: take.spiritStones },
    },
  ] as const,
});

export const EXPLORATION_MORE: Record<string, readonly StateEventRow[]> = {
  qingzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Overturned Drying Rack", titleCn: "被风掀翻的晒药架", description: "坡下的晒药架被风掀起一角，几片已经烘干的叶子贴在泥里。主人不在，你只拾起还能用的那几片，份量只够换一点灵石。", baseWeight: 0.9, effects: { spiritStones: 14 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Crane over the Terrace", titleCn: "药坡上的鹤", description: "药坡上空飞过一只白鹤，并不落地。坡上的人抬头看了一眼就继续翻叶子，像是这种事在青州不值得停手。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "combat", title: "Bees in the Bloom", titleCn: "花丛里的野蜂", description: "你拨开一丛正在采的花，野蜂从里面涌出来。不是妖兽，只是蜇得你退了两步，袖口上还是刮下一点能换碎石的蜂蜡。", baseWeight: 0.8, effects: { qi: -5, spiritStones: 10 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Apprentice Basket", titleCn: "学徒的篮子", description: "苍木谷的学徒把篮子扣在路边，脚踝肿了。他请你把这一筐送到坡下的收药棚，又说你若只拿走上面那几株好的，他追不上。", baseWeight: 0.7, effects: {}, moralityChoice: choice("学徒的篮子", "学徒的脚踝肿了，这一筐要送到坡下的收药棚。你是送下去，还是只拿走上面那几株好的？", { id: "deliver", label: "把整筐送下去", summary: "送到棚里，棚主按条子给了很少的灵石。" }, { id: "skim-herbs", label: "拿走好的那几株", summary: "篮子还在路边，好叶子已经不在了。", spiritStones: 24 }) },
    { slot: "h-05", semanticType: "human", resultType: "resource", title: "Shed Name", titleCn: "收药棚里听见的名字", description: "收药棚里两个人压低声音，说西镇有人欠了人情还没还。名字你听清了。棚主看见你在听，塞过来几枚灵石，叫你记住也行，忘掉也行。", baseWeight: 0.75, effects: { spiritStones: 12, reputationChange: 1 } },
    { slot: "h-06", semanticType: "human", resultType: "status", title: "Water Jar at the Gate", titleCn: "山门的水缸", description: "苍木谷山门外贴着今天的杂务，你顺手把空了的水缸添满。管事点了下头，没有多话，只让你在门槛上坐到气息平下来。", baseWeight: 0.7, effects: { reputationChange: 1, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
  yangzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Wet Ledger Page", titleCn: "被水泡软的账页", description: "码头的账页被浪花打湿了一角，数字糊了。伙计撕下那一页准备重抄，撕下来的纸背粘着几枚用来压纸的灵石。", baseWeight: 0.9, effects: { spiritStones: 14 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Lantern that Missed the River", titleCn: "没放进河里的灯", description: "河灯摊收得早，最后一盏灯还坐在湿板上，罩子里写着一个铺名。河面已经没有灯了，这一盏谁也没放出去。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "progression", title: "Poling Against the Current", titleCn: "逆水撑一竿", description: "船家让你在最窄的那段帮着撑一竿。水把竹竿往回推，你撑完以后手臂是麻的，气息却被这股反力压得更实。", baseWeight: 0.85, effects: { realmProgress: 1, spiritStones: 8 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Unclaimed Crate", titleCn: "没人认的货箱", description: "听潮阁的杂役在埠头找一只写错名的货箱。箱子没上锁，他说你若帮他抬到阁里的账房，有一点脚钱；你若现在打开，里面的零碎也够你走。", baseWeight: 0.7, effects: {}, moralityChoice: choice("没人认的货箱", "这只货箱写错了名，听潮阁的人还在找。你是帮他抬到账房，还是现在打开拿走里面的零碎？", { id: "carry", label: "抬到账房", summary: "箱子原样交出去，只拿了规定的脚钱。", spiritStones: 8 }, { id: "open", label: "现在打开", summary: "零碎进了你的袋子，箱子还留在埠头。", spiritStones: 26 }) },
    { slot: "h-05", semanticType: "human", resultType: "story", title: "Ferry Gossip", titleCn: "渡口的闲话", description: "等船的人说，有个跑船的把一笔人情记在了听潮阁的名下，人却已经换了航线。话讲到船来就断了，没有人请你去传。", baseWeight: 0.75, effects: {} },
    { slot: "h-06", semanticType: "human", resultType: "resource", title: "Tide Bell Rope", titleCn: "潮钟的绳子", description: "听潮阁今天的值日是看着潮钟，绳子磨断了半截。你帮着把新绳穿上，管事按杂务给了几枚灵石，钟还是他们的人来敲。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  zhongzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Miscounted Seal Wax", titleCn: "多出来的封泥", description: "档案房清点封泥，数目对不上，多出来的一小块被推到桌角。管事说这块作废，作废的泥里嵌着压箱用的灵石。", baseWeight: 0.85, effects: { spiritStones: 12 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Name Struck from the Board", titleCn: "从榜上划掉的名字", description: "官署门口的榜上有一个名字被墨线划掉，旁边注着“人已经离城”。划线的墨还湿，看榜的人没有停留。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "combat", title: "Practice Yard Spill", titleCn: "演武场上被扫到", description: "你从演武场边经过，一对对练的人收势不及，木械扫到你的肩。带队的人让你到旁边坐下，赔了很少的灵石，对练仍旧继续。", baseWeight: 0.8, effects: { qi: -4, spiritStones: 10 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Unsigned Copy", titleCn: "没署名的抄件", description: "天衡宗的书吏抄完一份路引，正本已经送走，桌上还留着没署名的底稿。他说你若帮他送到对面的值房，有跑腿钱；底稿上的空印若被你拿走，短时间内对不上。", baseWeight: 0.65, effects: {}, moralityChoice: choice("没署名的抄件", "正本已经送走，桌上这份底稿没署名。你是送到值房，还是把那枚还没核销的空印带走？", { id: "deliver-copy", label: "送到值房", summary: "底稿和空印都交到该去的地方。" }, { id: "take-seal", label: "带走空印", summary: "空印离开了桌子，值房还以为底稿在路上。", spiritStones: 24 }) },
    { slot: "h-05", semanticType: "human", resultType: "resource", title: "Clerk's Owed Favor", titleCn: "书吏记得的人情", description: "一个书吏认出你曾经帮他找过一份掉了的路引。他不谈旧事，只把今天多出来的几枚茶钱推过来，说这页账他已经划掉了。", baseWeight: 0.75, effects: { spiritStones: 12, reputationChange: 1 } },
    { slot: "h-06", semanticType: "human", resultType: "status", title: "Reading the Duty Board", titleCn: "把值日念完", description: "天衡宗值房的人把今天谁守门、谁送文念给你听，因为你站在门口没走。念完以后他让你在廊上站一会儿，说知道名字，下次就不用乱找人。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  shuzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Snagged Herb Bundle", titleCn: "挂在栈道上的药束", description: "栈道栏杆上挂着一小束被人钩落又没捡的药。风把它吹得直响。你取下来的时候，下面的谷里没有应声的人。", baseWeight: 0.85, effects: { spiritStones: 14, itemRewards: [{ itemId: "clear-zhi-leaf", count: 1 }] } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Bell that Rang Once", titleCn: "只响了一声的铃", description: "山腰的小祠自己响了一声铃，没有风。破云门的巡山人从你身边过去，说这声不用报，报了也没有人上山看。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "progression", title: "Rope Bridge Pause", titleCn: "在绳桥上停住", description: "绳桥晃得厉害，你在中间停住，等它自己慢下来再走。这一停把呼吸从嗓子眼压回了丹田，进境只有一点点。", baseWeight: 0.85, effects: { realmProgress: 2 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Guide's Second Path", titleCn: "向导的第二条路", description: "当地向导说有一条不踩药户地界的慢路，也有一条直接从别人的木耳架上穿过去的快路。他两段都肯带，价钱不一样。", baseWeight: 0.7, effects: {}, moralityChoice: choice("向导的两条路", "慢路不踩别人的木耳架，快路会踏坏人家晾着的货。你走哪一条？", { id: "slow", label: "走不踩架子的慢路", summary: "多花时间，药户的架子还在。" }, { id: "fast", label: "从木耳架上穿过去", summary: "你先到了，架上的货少了一截。", spiritStones: 22 }) },
    { slot: "h-05", semanticType: "human", resultType: "story", title: "Tea Left for a Name", titleCn: "留给一个名字的茶", description: "茶棚老板把一碗已经凉了的茶放在窗边，说是给一个还没到的采药人留的。那个人今天可能会来，也可能把人情再拖一天。", baseWeight: 0.75, effects: {} },
    { slot: "h-06", semanticType: "human", resultType: "resource", title: "Poyun Rope Check", titleCn: "破云门查绳", description: "破云门今天的杂务是把栈道上的旧绳换下来。你帮着把断的那截卷好送回山门，管事称了重量，给了很少的灵石。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  youzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Glove in the Snow", titleCn: "雪里的一只手套", description: "路标旁边的雪被什么扒开过，里面只有一只手套，手套心里攥着几枚冷得粘手的灵石。另一只不在这里。", baseWeight: 0.85, effects: { spiritStones: 12 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Smoke that Changed Color", titleCn: "变了色的烟", description: "远处哨楼的烟先白后灰。路边的人看懂了，说这不是敌情，是他们自己的灶灭了又重新点上。你跟着看完，没有人解释第二句。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "combat", title: "Ice Giving Way", titleCn: "冰面裂开", description: "你踩着别人留下的脚印过河，最后一步冰还是裂了。水只没到膝，对岸的猎人把你拉上来，地上掉着他刚才打到的那点零碎灵石。", baseWeight: 0.8, effects: { qi: -6, spiritStones: 10 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Extra Fur Bundle", titleCn: "多出来的皮捆", description: "朔冥殿的巡哨在清点皮捆，数目比账上多一捆。带队的说你可以帮他送回殿里，也可以当这捆从来没被数到。", baseWeight: 0.7, effects: {}, moralityChoice: choice("多出来的皮捆", "皮捆比账上多了一捆。你是送回朔冥殿，还是当成没被数到的那捆带走？", { id: "return-fur", label: "送回殿里", summary: "账和货对上了，你只拿了送一趟的脚钱。", spiritStones: 8 }, { id: "keep-fur", label: "当成没数到", summary: "这捆离开了雪地，账上仍是原来的数。", spiritStones: 24 }) },
    { slot: "h-05", semanticType: "human", resultType: "resource", title: "Watchfire Favor", titleCn: "烽火边还的情", description: "上次你在哨棚躲过风，今天换班的人认出你，把多烤的一张饼和几枚灵石塞过来。他说饼不能留到明天，人情可以。", baseWeight: 0.75, effects: { spiritStones: 10, reputationChange: 1 } },
    { slot: "h-06", semanticType: "human", resultType: "status", title: "Reading the Cold Roster", titleCn: "寒夜里的名册", description: "朔冥殿的人在风口念今天谁守哪一段。你的名字不在册上，他仍让你听完，说迷路的时候至少知道该喊谁。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  liangzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Buried Waterskin Stopper", titleCn: "埋住的水囊塞", description: "沙里露出一只水囊的塞子。水已经干了，塞子底下压着主人用来压囊的几枚灵石，人没有回来挖。", baseWeight: 0.85, effects: { spiritStones: 12 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Banner Facing the Wrong Way", titleCn: "旗面向了反", description: "镇荒城的路旗今天有一面翻了个面。过路的老车夫看了一眼，说这是捆绳松了，不是改道。他没有下车去改。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "progression", title: "Walking the Hot Sand", titleCn: "在烫沙上走", description: "正午的沙烫得不能停。你把步子放短，每一步都把气息沉下去，走到有影子的地方时，脚痛，进境却是实的。", baseWeight: 0.85, effects: { realmProgress: 2 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Last Waterskin", titleCn: "最后一袋水", description: "车队只剩一袋还满的水，有人已经开始晕。押车的问你这袋是匀给后面的人，还是你自己带着先到下一座井。", baseWeight: 0.7, effects: {}, moralityChoice: choice("最后一袋水", "车队只剩这一袋满的水，后面有人已经走不稳。你是把水匀下去，还是自己带着先到下一座井？", { id: "share-water", label: "把水匀下去", summary: "你自己只剩底，队伍还在往前走。" }, { id: "keep-water", label: "自己先到井边", summary: "你先到了，袋里的水还在，后面的人慢了一截。", spiritStones: 20 }) },
    { slot: "h-05", semanticType: "human", resultType: "story", title: "Name in the Quartermaster Book", titleCn: "料册上的名字", description: "军驿的料册边角写着一个名字，旁边是“欠水一袋，下次来补”。管册的人说这个人三天没出现，名字先留着。", baseWeight: 0.75, effects: {} },
    { slot: "h-06", semanticType: "human", resultType: "resource", title: "Zhenhuang Rope Duty", titleCn: "镇荒城的绳差", description: "镇荒城今天让人把驿马的断缰换掉。你帮着把旧缰盘好，管事按杂务给了几枚灵石，没有让你进内院。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  leizhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Warm Glass Bead", titleCn: "还热的玻璃珠", description: "雷刚停，路边一块沙子凝成了指甲大的玻璃珠。它不值钱，珠子陷进去的沙里却有几枚被震出来的灵石。", baseWeight: 0.85, effects: { spiritStones: 14 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Banner Taken Down Early", titleCn: "提前收起的警旗", description: "惊霄宫的警旗比往常早收了一炷香。守旗的人说不是天晴了，是旗杆裂了，今天的警示改用喊的。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "combat", title: "Startled by a Crack", titleCn: "被一声雷惊开", description: "干雷在很近的地方炸开，你手里的东西掉进水沟。捡起来的时候沟里还有别人掉的灵石，雷已经滚到山那边去了。", baseWeight: 0.8, effects: { qi: -6, spiritStones: 10 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Shelter Headcount", titleCn: "避雷棚里的人数", description: "避雷棚里的位置不够。惊霄宫的人在点名，还差一个空位。棚外有个挑担的人没进来，他问你这个位子是留给他，还是你自己坐到雷停。", baseWeight: 0.7, effects: {}, moralityChoice: choice("避雷棚的空位", "棚里还差一个空位，棚外的人挑着担子。你是把位子留给他，还是自己坐到雷停？", { id: "hold-seat", label: "把位子留给他", summary: "你在棚檐下站完这一阵，他进来时把干粮分了你一块。" }, { id: "sit-out", label: "自己坐到雷停", summary: "位子你坐了，担子还在雨里。", spiritStones: 18 }) },
    { slot: "h-05", semanticType: "human", resultType: "resource", title: "Returned Warning", titleCn: "还回来的示警", description: "上次你帮着把闲人拦在雷区外面，今天巡逻的人看见你，把多领的两块干粮和几枚灵石递过来。他说示警没有赏，这两块是他自己的。", baseWeight: 0.75, effects: { spiritStones: 10, reputationChange: 1 } },
    { slot: "h-06", semanticType: "human", resultType: "status", title: "Jingxiao Pole Duty", titleCn: "惊霄宫的旗杆差", description: "惊霄宫的杂务是把裂了的旗杆用绳子临时捆住。你帮着捆完，管事让你在棚里避过下一声雷，灵石只给了几枚。", baseWeight: 0.7, effects: { spiritStones: 8, statusEffects: [{ effectId: "warded", ticks: 2 }] } },
  ],
  cangzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Salt-Stiff Pouch", titleCn: "被盐僵住的袋子", description: "退潮以后，礁石缝里卡着一只被盐僵住的小袋。袋子裂了，灵石还在，海货的腥味一时洗不掉。", baseWeight: 0.85, effects: { spiritStones: 14 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Boat that Did Not Wait", titleCn: "没有等的船", description: "埠头的人说有一条船原定等一个送药的，潮水一到还是走了。药还在桩上，人没出现，船也不会回来接这一潮。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "progression", title: "Hauling the Wet Rope", titleCn: "拉湿绳", description: "撼海堡的人在收一条浸满水的缆绳，你被临时叫去帮着拉。绳子很沉，拉到桩上以后，肩是酸的，气息比在平地上走更齐。", baseWeight: 0.85, effects: { realmProgress: 1, spiritStones: 8 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Unlisted Catch", titleCn: "没上账的一网", description: "一个潜水的人把没上港账的一小网东西放在你脚边。他说你可以帮他补进撼海堡的账，也可以当这网是你自己摸到的。", baseWeight: 0.7, effects: {}, moralityChoice: choice("没上账的一网", "这一网还没进港账。你是帮他补上，还是当成自己摸到的带走？", { id: "file-catch", label: "补进港账", summary: "账上有了这一网，你只拿了记账的那一点。" }, { id: "claim-catch", label: "当成自己的", summary: "网里的东西离开了埠头，账上仍是空的。", spiritStones: 24 }) },
    { slot: "h-05", semanticType: "human", resultType: "story", title: "Name on the Piling", titleCn: "桩上的名字", description: "码头木桩上用刀刻着一个名字，下面是“欠我一次夜航”。刻痕里还有木屑，像是今天才补的一刀。", baseWeight: 0.75, effects: {} },
    { slot: "h-06", semanticType: "human", resultType: "resource", title: "Harbor Bell Duty", titleCn: "港钟的差事", description: "撼海堡今天让人在起雾时摇两下港钟。你替值日的人摇了这两下，他把自己的那点差银分了一半给你。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
  ],
  wanzhou: [
    { slot: "f-04", semanticType: "fortune", resultType: "resource", title: "Tea Money under the Cup", titleCn: "杯底的茶钱", description: "茶棚收摊时，一只扣着的杯子底下还压着客人留下的茶钱。掌柜说这个位子的人不会回来了，钱也不必入他的账。", baseWeight: 0.85, effects: { spiritStones: 12 } },
    { slot: "f-05", semanticType: "fortune", resultType: "story", title: "Unfinished Introduction", titleCn: "没说完的引荐", description: "万象楼的跑堂把两个人往一张桌前送，其中一个人临时走了。留下的那个看了你一眼，没有把后半句介绍说出来。", baseWeight: 0.8, effects: {} },
    { slot: "t-04", semanticType: "training", resultType: "combat", title: "Alley Shoulder", titleCn: "巷子里的一撞", description: "窄巷里有人扛着箱子拐弯，箱子角撞上你的肩。他不肯停，只把掉出来的几枚灵石留在地上，算是没把箱子也放下。", baseWeight: 0.8, effects: { qi: -4, spiritStones: 10 } },
    { slot: "h-04", semanticType: "human", resultType: "resource", title: "Pawn Ticket", titleCn: "当票上的名字", description: "一张当票夹在你落座的凳缝里，名字还在赎回期内。柜上的人说你可以把票送回本人常去的茶棚，也可以现在拿去抵掉里面那点不值钱的东西。", baseWeight: 0.7, effects: {}, moralityChoice: choice("当票上的名字", "这张当票还在赎回期内，名字写得很清楚。你是送回本人常去的茶棚，还是现在拿去抵掉？", { id: "return-ticket", label: "把当票送回去", summary: "本人把票收回去，只给了你很少的跑腿钱。", spiritStones: 8 }, { id: "redeem", label: "现在拿去抵掉", summary: "东西出了当铺，名字还在票上。", spiritStones: 26 }) },
    { slot: "h-05", semanticType: "human", resultType: "resource", title: "Favor Written on the Bill", titleCn: "写在账单边上的人情", description: "掌柜把你的茶钱划掉，在账单边上写了四个字：上次的信。他不解释上次是哪一封，钱也不再收。", baseWeight: 0.75, effects: { spiritStones: 8, reputationChange: 1 } },
    { slot: "h-06", semanticType: "human", resultType: "status", title: "Wanxiang Errand Board", titleCn: "万象楼的跑腿板", description: "万象楼门口的板子上写着今天还没人接的短差：带一句话到茶桥，不接货。你把那句话带到，对方只点头，你在楼里坐到心跳慢下来。", baseWeight: 0.7, effects: { reputationChange: 1, statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
  ],
};
