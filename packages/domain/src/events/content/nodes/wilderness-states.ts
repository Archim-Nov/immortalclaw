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
    { idSuffix: "wild-drying-cloth", semanticType: "fortune", resultType: "resource", nameSuffix: "Drying Cloth", nameCnSuffix: "晒药布", description: "州外的风把一块晒药布吹到沟里，布角上还别着几枚用来压布的灵石。收药的人不在这一侧。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-terrace-mist", semanticType: "fortune", resultType: "story", nameSuffix: "Terrace Mist", nameCnSuffix: "药坡的雾", description: "雾从药坡脚往上走，只没到膝。坡上有人在喊今天先不收露水，喊完就没再出声。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-boar-row", semanticType: "training", resultType: "combat", nameSuffix: "Boar in the Rows", nameCnSuffix: "拱翻药垄的猪", description: "一头野猪把新起的药垄拱翻了一截，看见人也不跑远。你把它赶开时靴上全是泥，垄沟里掉着十几枚灵石。", baseWeight: 0.75, effects: { qi: -6, spiritStones: 12 } },
    { idSuffix: "wild-apprentice-wait", semanticType: "human", resultType: "resource", nameSuffix: "Apprentice Waiting", nameCnSuffix: "等篮子的学徒", description: "苍木谷的学徒在州外的路口等一只篮子，篮子在你来之前已经被别人拿走一半。他仍按剩下的份量给了你一点跑腿钱。", baseWeight: 0.7, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "wild-pine-shrine", semanticType: "training", resultType: "status", nameSuffix: "Pine Shrine", nameCnSuffix: "松下的小祠", description: "州外松林里的小祠没有香。你在石阶上坐到雾散，没有人来赶，气息比在路上稳。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-plot-watch", semanticType: "human", resultType: "story", nameSuffix: "Watching a Plot", nameCnSuffix: "替人看一块地", description: "药户托你在他回去取筐的时候看着这块地，不要让人把刚晒的叶子踩进泥里。他回来时叶子还在，话只说了半句。", baseWeight: 0.65, effects: { reputationChange: 1 } },
  ],
  yangzhou: [
    { idSuffix: "wild-stuck-pole", semanticType: "fortune", resultType: "resource", nameSuffix: "Stuck Pole", nameCnSuffix: "插在泥里的篙", description: "州外的浅滩上插着一根没人收的竹篙，篙眼里塞着船家用来压篙的灵石。船已经看不见了。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-reed-cut", semanticType: "fortune", resultType: "story", nameSuffix: "Cut Reeds", nameCnSuffix: "被割开的芦苇", description: "芦苇被割开一条只够一个人侧身的缝，缝尽头没有人。听潮阁的人若来过，也没有留下旗。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-slick-bank", semanticType: "training", resultType: "combat", nameSuffix: "Slick Bank", nameCnSuffix: "滑脚的河岸", description: "河岸的泥突然塌了一块，你半条腿陷进去才拔出来。拔的时候带出一只被泥埋住的小钱袋，里面的灵石不多。", baseWeight: 0.75, effects: { qi: -5, spiritStones: 12 } },
    { idSuffix: "wild-ferry-wait", semanticType: "human", resultType: "resource", nameSuffix: "Waiting for the Ferry", nameCnSuffix: "等船的人", description: "州外渡口今天的船晚了。一个抱药箱的人请你帮他把箱子放到干处，船到了以后把少付的那点船钱补给你。", baseWeight: 0.7, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "wild-canal-shed", semanticType: "training", resultType: "status", nameSuffix: "Canal Shed", nameCnSuffix: "渠边的棚", description: "渠边的空棚挡住了最湿的那一阵风。你在棚里把鞋里的水倒掉，再上路时呼吸已经慢下来。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-tide-mark", semanticType: "human", resultType: "story", nameSuffix: "Tide Mark", nameCnSuffix: "潮位记号", description: "木桩上新刻了一道潮位，旁边写着一个船名，说这一潮不等。你看见的时候水已经过了那道线。", baseWeight: 0.65, effects: {} },
  ],
  zhongzhou: [
    { idSuffix: "wild-dropped-tally", semanticType: "fortune", resultType: "resource", nameSuffix: "Dropped Tally", nameCnSuffix: "掉在草里的筹码", description: "官道外的草里躺着一根驿站筹码，作废的印已经盖上。筹码孔里仍穿着一枚没人拆走的灵石。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-milestone-ink", semanticType: "fortune", resultType: "story", nameSuffix: "Fresh Ink", nameCnSuffix: "新墨的里程", description: "州外的里程碑被人用新墨改了一个数字，又划掉。改的人和划的人都没留名字，路还是原来的路。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-drill-edge", semanticType: "training", resultType: "combat", nameSuffix: "Edge of the Drill", nameCnSuffix: "演武场边上", description: "州外的演武场没有围栏，一根木械飞出来打在你小腿上。带队的人把械收回去，丢下几枚灵石，队列没有停。", baseWeight: 0.75, effects: { qi: -4, spiritStones: 10 } },
    { idSuffix: "wild-courier-rest", semanticType: "human", resultType: "resource", nameSuffix: "Courier Sitting Down", nameCnSuffix: "坐下的驿卒", description: "一个驿卒在州外的坡上坐下，把一封不急的短签交给你，说他的脚今天不再走了。你送到下一座亭子，拿到很少的脚钱。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
    { idSuffix: "wild-permit-shade", semanticType: "training", resultType: "status", nameSuffix: "Permit Shade", nameCnSuffix: "路引下的阴凉", description: "天衡宗的人在州外核完一份路引，让你在他们的伞下站到汗退。核完的路引不是你的，阴凉是真的。", baseWeight: 0.65, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
    { idSuffix: "wild-struck-name", semanticType: "human", resultType: "story", nameSuffix: "Name off the List", nameCnSuffix: "从名单上拿掉", description: "州外的告示板有人把一个名字揭下来，揭的人说这个人的差已经销了，人情还没销。纸被风吹到沟里。", baseWeight: 0.65, effects: {} },
  ],
  shuzhou: [
    { idSuffix: "wild-snagged-basket", semanticType: "fortune", resultType: "resource", nameSuffix: "Snagged Basket", nameCnSuffix: "挂住的背篓", description: "州外的树枝上挂着一只空背篓，篓带里缝着几枚灵石。篓主人若还在崖下，这一时也上不来。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-one-bell", semanticType: "fortune", resultType: "story", nameSuffix: "One Bell", nameCnSuffix: "一声铃", description: "雾里的小祠只响了一声铃。破云门的巡山人从另一条棱上过去，没有下到你这条路上。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-loose-plank", semanticType: "training", resultType: "combat", nameSuffix: "Loose Plank", nameCnSuffix: "松了的栈板", description: "州外栈道一块板子在你脚下翻起，木刺刮过小腿。你把板子踩回去时，板下的缝里有别人落下的灵石。", baseWeight: 0.75, effects: { qi: -5, spiritStones: 12 } },
    { idSuffix: "wild-tea-for-two", semanticType: "human", resultType: "resource", nameSuffix: "Tea for Someone Else", nameCnSuffix: "留给别人的茶", description: "山路上的茶棚给你倒了碗凉茶，说这碗钱已经有人付过，付的人还在上面的坡里。你喝完，掌柜仍找补了几枚。", baseWeight: 0.7, effects: { spiritStones: 8, reputationChange: 1 } },
    { idSuffix: "wild-ledge-breath", semanticType: "training", resultType: "progression", nameSuffix: "Ledge Breath", nameCnSuffix: "崖边的一口气", description: "州外的崖边风大，你没有靠近最外的那一步，只把气息在原地走完。进境很少，脚是自己的。", baseWeight: 0.7, effects: { realmProgress: 2 } },
    { idSuffix: "wild-whose-shelf", semanticType: "human", resultType: "story", nameSuffix: "Whose Shelf", nameCnSuffix: "这架木耳是谁的", description: "州外一块岩架上晾着木耳，两个过路的人争这是谁家的。他们说到一个还在破云门值日的名字，然后各自走了。", baseWeight: 0.65, effects: {} },
  ],
  youzhou: [
    { idSuffix: "wild-snow-marker-coin", semanticType: "fortune", resultType: "resource", nameSuffix: "Coin at the Marker", nameCnSuffix: "雪标下的灵石", description: "州外的雪标被风吹斜，标杆洞里塞着换班的人没拿走的几枚灵石。洞口已经又薄薄结了一层冰。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-grey-smoke", semanticType: "fortune", resultType: "story", nameSuffix: "Grey Smoke", nameCnSuffix: "灰色的烟", description: "哨楼的烟变成灰色，路边的猎人说这是灶灭了，不是示警。他没有改自己的路，你也还在原来的方向上。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-crust-break", semanticType: "training", resultType: "combat", nameSuffix: "Crust Breaking", nameCnSuffix: "踩破的雪壳", description: "州外的雪壳在你脚下破开，冷水浸到踝。你爬上来时带出一只冻在冰里的小袋，袋里的灵石不多。", baseWeight: 0.75, effects: { qi: -6, spiritStones: 10 } },
    { idSuffix: "wild-shared-fire", semanticType: "human", resultType: "status", nameSuffix: "Shared Fire", nameCnSuffix: "借来的火", description: "朔冥殿的巡哨在州外生了一小堆火，让你烤到手指能弯为止。火不是给你留的，他们也没有问你的名字。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
    { idSuffix: "wild-fur-debt", semanticType: "human", resultType: "resource", nameSuffix: "Fur Debt", nameCnSuffix: "皮货上的人情", description: "一个猎人在州外把多捆的一扎皮子交给你，说送到下一座棚就算他还了上次的火。棚里的人给了很少的灵石，皮子留下。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
    { idSuffix: "wild-missed-relief", semanticType: "human", resultType: "story", nameSuffix: "Missed Relief", nameCnSuffix: "没来换班的人", description: "州外的哨位空着。木板上写着该来的名字，和一句“若再缺，就把干粮留给下一班”。干粮还在盒子里。", baseWeight: 0.65, effects: {} },
  ],
  liangzhou: [
    { idSuffix: "wild-dry-stopper", semanticType: "fortune", resultType: "resource", nameSuffix: "Dry Stopper", nameCnSuffix: "干了的囊塞", description: "州外的沙里露出水囊塞。水早干了，塞子上的绳子还拴着几枚用来证明这囊有主的灵石。主人不在。", baseWeight: 0.8, effects: { spiritStones: 12 } },
    { idSuffix: "wild-wrong-banner", semanticType: "fortune", resultType: "story", nameSuffix: "Banner Backwards", nameCnSuffix: "翻了面的旗", description: "镇荒城的一面路旗在州外翻了个面。老车夫看了看绳，说是松了，不是改道，然后继续赶他的车。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-hot-mile", semanticType: "training", resultType: "progression", nameSuffix: "Hot Mile", nameCnSuffix: "没有影子的一里", description: "州外这一里没有能站的影子。你走完才在旗杆下停住，进境比这一袋水更清楚。", baseWeight: 0.75, effects: { realmProgress: 2 } },
    { idSuffix: "wild-shared-shade", semanticType: "human", resultType: "status", nameSuffix: "Shared Shade", nameCnSuffix: "让出的阴凉", description: "车队在州外只剩一块布能挡太阳。有人侧过身让你站进影子里喝完一口水，布仍是他们的。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-well-name", semanticType: "human", resultType: "resource", nameSuffix: "Name at the Well", nameCnSuffix: "井栏上的名字", description: "州外的井栏上刻着一个欠水的名字。管井的人说那个人今天若来，先还水再打水。你帮着把井绳换上，他给了几枚灵石。", baseWeight: 0.7, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "wild-empty-trough", semanticType: "human", resultType: "story", nameSuffix: "Empty Trough", nameCnSuffix: "空了的水槽", description: "驿马的水槽是空的。槽沿写着“下一队来了再灌”，字是干的。你路过时没有下一队。", baseWeight: 0.65, effects: {} },
  ],
  leizhou: [
    { idSuffix: "wild-warm-shard", semanticType: "fortune", resultType: "resource", nameSuffix: "Warm Shard", nameCnSuffix: "还热的碎玻璃", description: "州外一块被雷打过的沙地还是热的。玻璃渣不值钱，渣下震出来的灵石还没被人捡。", baseWeight: 0.8, effects: { spiritStones: 14 } },
    { idSuffix: "wild-flag-down", semanticType: "fortune", resultType: "story", nameSuffix: "Flag Down", nameCnSuffix: "提前落下的旗", description: "惊霄宫的警旗在州外提前落了。守旗的人说杆裂了，今天改成喊，喊声这一时还没传到你脚下。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-close-crack", semanticType: "training", resultType: "combat", nameSuffix: "Close Crack", nameCnSuffix: "很近的一声", description: "干雷在州外很近的地方炸开，你手里的东西掉进水里。捡起来时摸到别人掉的灵石，人已经不在这片坡上。", baseWeight: 0.75, effects: { qi: -6, spiritStones: 10 } },
    { idSuffix: "wild-shed-edge", semanticType: "human", resultType: "status", nameSuffix: "Edge of the Shed", nameCnSuffix: "棚檐下的位子", description: "避雷棚满了，惊霄宫的人仍让你站在檐下，直到这一声过去。檐下没有座位，雨倒是小些。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "warded", ticks: 2 }] } },
    { idSuffix: "wild-oil-errand", semanticType: "human", resultType: "resource", nameSuffix: "Oil to the Next Shed", nameCnSuffix: "送到下一座棚的油", description: "一个弟子在州外把小瓶灯油交给你，下一座警棚就在看得见的地方。你送到，对方按杂务给了几枚灵石。", baseWeight: 0.7, effects: { spiritStones: 12, reputationChange: 1 } },
    { idSuffix: "wild-unclaimed-stake", semanticType: "human", resultType: "story", nameSuffix: "Unclaimed Stake", nameCnSuffix: "没人认的警桩", description: "州外一根警桩倒着，桩上的名字被雨冲得只剩半个。过路的人看了看，没有把它扶起来，也没有说这半个字是谁。", baseWeight: 0.65, effects: {} },
  ],
  cangzhou: [
    { idSuffix: "wild-salt-pouch", semanticType: "fortune", resultType: "resource", nameSuffix: "Salt Pouch", nameCnSuffix: "盐壳里的袋子", description: "州外退潮后的礁缝里卡着一只被盐壳住的小袋。袋子裂开，灵石还在，腥味一时洗不掉。", baseWeight: 0.8, effects: { spiritStones: 14 } },
    { idSuffix: "wild-missed-tide", semanticType: "fortune", resultType: "story", nameSuffix: "Missed Tide", nameCnSuffix: "错过的一潮", description: "州外的桩上还挂着一包药，船已经趁潮走了。撼海堡的人说下一潮才有船，这一包先不管。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-wet-rope", semanticType: "training", resultType: "progression", nameSuffix: "Wet Rope", nameCnSuffix: "浸满水的缆", description: "州外有人在收一条浸满水的缆绳，你被叫去拉最后几步。绳子上肩以后，气息比在干板上走更齐。", baseWeight: 0.75, effects: { realmProgress: 1, spiritStones: 8 } },
    { idSuffix: "wild-bell-twice", semanticType: "human", resultType: "resource", nameSuffix: "Two Strokes of the Bell", nameCnSuffix: "两下港钟", description: "起雾时州外的港钟没有人摇。你替还没到的值日摇了两下，他赶到以后把差银分了一半。", baseWeight: 0.7, effects: { spiritStones: 10, reputationChange: 1 } },
    { idSuffix: "wild-drying-shed", semanticType: "training", resultType: "status", nameSuffix: "Drying Shed", nameCnSuffix: "烘干衣服的棚", description: "撼海堡的棚子在州外挡着风。你把湿袖口烤到不再滴水，棚里的人没有赶你，也没有给你第二碗热水。", baseWeight: 0.7, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-night-fare", semanticType: "human", resultType: "story", nameSuffix: "Night Fare", nameCnSuffix: "夜航记在谁头上", description: "两个船工在州外的滩上争昨晚的夜航算谁的人情。船已经不在，名字他们说得很清楚，今天结不了。", baseWeight: 0.65, effects: {} },
  ],
  wanzhou: [
    { idSuffix: "wild-stool-change", semanticType: "fortune", resultType: "resource", nameSuffix: "Change on the Stool", nameCnSuffix: "凳上的找零", description: "州外茶棚收摊，凳上还留着上一桌的找零。掌柜说那个人已经进了城，这几枚不必再入账。", baseWeight: 0.8, effects: { spiritStones: 10 } },
    { idSuffix: "wild-half-introduction", semanticType: "fortune", resultType: "story", nameSuffix: "Half an Introduction", nameCnSuffix: "半句引荐", description: "万象楼的人在州外的茶棚把你往一张桌前指了指，桌边的人却先走了。后半句介绍没有说出来。", baseWeight: 0.7, effects: {} },
    { idSuffix: "wild-alley-scrape", semanticType: "training", resultType: "combat", nameSuffix: "Alley Scrape", nameCnSuffix: "巷口刮到", description: "州外的窄巷里一辆车拐得太急，车角刮过你的手臂。车夫没停，只把掉下来的灵石留在泥里。", baseWeight: 0.75, effects: { qi: -4, spiritStones: 10 } },
    { idSuffix: "wild-bill-margin", semanticType: "human", resultType: "resource", nameSuffix: "Margin of the Bill", nameCnSuffix: "账单边上的字", description: "茶棚掌柜把你的茶钱划掉，在账单边上写下四个字：上次的信。他不解释是哪一封，钱也不再收。", baseWeight: 0.7, effects: { spiritStones: 8, reputationChange: 1 } },
    { idSuffix: "wild-short-line", semanticType: "human", resultType: "status", nameSuffix: "Short Line", nameCnSuffix: "一句短话", description: "万象楼的跑堂让你把一句“位子留给欠账的人”带到州外的下一座棚。话带到以后，你在棚里坐到心跳慢下来。", baseWeight: 0.65, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 2 }] } },
    { idSuffix: "wild-names-on-the-wall", semanticType: "human", resultType: "story", nameSuffix: "Names on the Wall", nameCnSuffix: "墙上的一排名字", description: "州外茶棚的墙上写着一排还挂着茶钱的名字。掌柜说有的人是故意不来结，他今天不请你去讨。", baseWeight: 0.65, effects: {} },
  ],
};

export function buildWildernessStateOverlay(location: Location): EventTemplate[] {
  const rows = ROWS[location.stateId] ?? [];
  return rows.map((row) => buildNodeEvent(location, row));
}
