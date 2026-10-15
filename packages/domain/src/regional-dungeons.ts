import { grantCombatPractice } from "./combat-skills.js";
import { regionalEscort, regionalInterior, type InteriorChoice } from "./dungeon-interior.js";
import {
  STATUS_BURNING,
  STATUS_ENTANGLE,
  STATUS_FROSTBITE,
  STATUS_ROOTED,
  STATUS_SPELL_BREAK,
} from "./combat-statuses.js";
import { GameplayRejection } from "./gameplay-error.js";
import { noteWound, recordLife, shiftCultivatorMood } from "./inner-life.js";
import type { GuardianThreat } from "./high-realm-dungeon.js";
import type {
  ActionId,
  AvailableAction,
  CombatStatusId,
  Cultivator,
  DungeonCombatSummary,
  ItemId,
  RegionalDungeonReport,
  RegionalDungeonsView,
  RegionalPlaceView,
  RegionalRunState,
  SpellLoadoutId,
  WorldState,
} from "./model.js";
import type { StateId } from "./constants.js";
import { runPartyBattle, type BattleCombatant, type EnemyPattern } from "./party-battle.js";
import { getPartyOf } from "./social.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

/**
 * One dungeon for each of the nine states, plus three shorter caves.
 *
 * 丙级、乙级、甲级 stay on their own floors. These runs are entered from the
 * state itself, or from a main city or sect outpost when they are not tied
 * to one state. A run is a short job with one Chinese choice.
 */

type Band = "炼气" | "筑基" | "金丹" | "元婴" | "化神";

interface ChoiceOption {
  id: string;
  label: string;
  description: string;
  safe?: boolean;
  kind: "settle" | "fight" | "vigil";
  difficulty?: "easy" | "hard";
  sealSpells?: boolean;
  hpRatio?: number;
  qiCost?: number;
  signature?: boolean;
  stones?: number;
  stoneCost?: number;
  progress?: number;
  reputation?: number;
  injury?: number;
  deviation?: number;
  line: string;
  failLine?: string;
  failStones?: number;
  failInjury?: number;
  failQi?: number;
  failSpirit?: number;
  failDeviation?: number;
}

interface RegionalDungeonDef {
  id: string;
  name: string;
  stateId: string | null;
  where: "state" | "main-city" | "sect-outpost";
  minRealm: number;
  band: string;
  cooldownTicks: number;
  party: boolean;
  durationTicks: number;
  choiceTicks: number;
  tide: boolean;
  prompt: string;
  mechanic: string;
  advice: string;
  signatureItemId: ItemId;
  signatureName: string;
  signatureUse: string;
  bossName: string;
  bossMove: string;
  statusId: CombatStatusId;
  spellLoadoutId: SpellLoadoutId;
  pattern: EnemyPattern;
  spiritDrain: number;
  sightings: readonly string[];
  entryLine: string;
  leaveLine: string;
  leaveStones: number;
  leaveQi: number;
  options: readonly ChoiceOption[];
}

const asSpell = (id: string) => id as SpellLoadoutId;

const STATE_NAMES: Record<string, string> = {
  qingzhou: "青州",
  yangzhou: "扬州",
  zhongzhou: "中州",
  shuzhou: "蜀州",
  youzhou: "幽州",
  liangzhou: "凉州",
  leizhou: "雷州",
  cangzhou: "沧州",
  wanzhou: "宛州",
};

const DUNGEONS: readonly RegionalDungeonDef[] = [
  {
    id: "qinglan-herb-cave",
    name: "青岚药窟",
    stateId: "qingzhou",
    where: "state",
    minRealm: 4,
    band: "筑基",
    cooldownTicks: 16,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "藤还活着，露挂在上面。",
    mechanic: "等露不打就能接住露芯。割藤要打活藤。拔根更险，缠绕会缠上来，赢了才有露芯。",
    advice: "青州的青岚药窟不在丙级地宫里，也不是州外的青岚坡。得到筑基，从这一州就能进。藤还活着。等露、割藤、拔根，三条路不一样。带出来的是青岚露芯，筑基闭关时按在舌下。",
    signatureItemId: "qinglan-dew-core",
    signatureName: "青岚露芯",
    signatureUse: "筑基闭关时用一份，修为多涨一点。不是丹霞露。",
    bossName: "活藤",
    bossMove: "缠绕会缠上脚",
    statusId: STATUS_ENTANGLE,
    spellLoadoutId: asSpell("wood-bind-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "藤上的露还没干。你把袖口撩起来，瓶子已经先凉了。",
      "石缝里有一截新根。你踩过去，鞋底先被缠了一下。",
      "窟顶在滴水。滴进瓶子里的那一滴是绿的。",
    ],
    entryLine: "青岚药窟的口子不大。藤从石壁上垂下来，露还挂着。",
    leaveLine: "你从青岚药窟退出来，瓶子是空的，鞋上还有露。",
    leaveStones: 6,
    leaveQi: 0,
    options: [
      {
        id: "qinglan-wait",
        label: "等露",
        description: "多站一会儿，等那滴露落进瓶子。不跟藤打。",
        safe: true,
        kind: "settle",
        signature: true,
        stones: 8,
        progress: 3,
        line: "你在窟里多站了一会儿。露滴进瓶子，青岚露芯是温的。",
      },
      {
        id: "qinglan-cut",
        label: "割藤",
        description: "把挡路的藤割开。活藤会还手，缠绕缠上来。",
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 14,
        progress: 3,
        line: "藤断开来，露芯还在切口上。你把它收进瓶子。",
        failLine: "活藤把脚缠住了。露没接到，人退出来的时候袖子是湿的。",
        failStones: 8,
        failInjury: 2,
        failQi: 6,
      },
      {
        id: "qinglan-pull",
        label: "拔根",
        description: "把根拔出来。露芯更多，藤也会缠得更紧。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 22,
        progress: 4,
        line: "根拔出来的时候还在动。露芯比等来的那滴更满。",
        failLine: "根没拔动。藤顺着小腿缠上来，这一趟露芯没有，人还挂了伤。",
        failStones: 12,
        failInjury: 3,
        failQi: 10,
      },
    ],
  },
  {
    id: "tide-bell-cave",
    name: "听潮钟窟",
    stateId: "yangzhou",
    where: "state",
    minRealm: 5,
    band: "筑基中期",
    cooldownTicks: 20,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: true,
    prompt: "钟在水面下，潮还没退干净。",
    mechanic: "潮开的八刻才进得去，二十四刻一潮。绕开钟不打。敲钟或潜入要跟沉钟打，钟鸣会抽灵力，并挂霜寒。",
    advice: "扬州的听潮钟窟跟着潮，不是州外的听潮浦。潮开时从这一州进得去，潮退了门就关。得到筑基中期。绕钟、敲钟、潜入，三条路。带出来的是潮钟碎片，闭关时能把灵力拉回一点。",
    signatureItemId: "tide-bell-shard",
    signatureName: "潮钟碎片",
    signatureUse: "筑基闭关时握着，灵力回一点，修为也多涨一点。",
    bossName: "沉钟",
    bossMove: "钟鸣抽走一口灵力，霜寒贴上来",
    statusId: STATUS_FROSTBITE,
    spellLoadoutId: asSpell("water-frost-tier-2"),
    pattern: "drain",
    spiritDrain: 4,
    sightings: [
      "潮还没退尽。你踩进水里，鞋先凉了，钟在前面响了一下。",
      "窟壁上有一圈水线。水线以上是干的，钟却还在滴。",
      "有人在钟沿上留了半个掌印，印里是盐。",
    ],
    entryLine: "听潮钟窟的门这会儿开着。水还没退到钟座下面。",
    leaveLine: "你从听潮钟窟退出来，裤脚是湿的，碎片没带上。",
    leaveStones: 6,
    leaveQi: 0,
    options: [
      {
        id: "tide-walk",
        label: "绕开钟",
        description: "沿着水线绕过去，不敲。碎片在钟座外侧。",
        safe: true,
        kind: "settle",
        signature: true,
        stones: 6,
        progress: 2,
        line: "你没敲那口钟。钟座外侧嵌着一块潮钟碎片，拿下来的时候还凉。",
      },
      {
        id: "tide-strike",
        label: "敲钟",
        description: "敲一下。沉钟会响，灵力先被抽走一口，霜寒跟着来。",
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 16,
        progress: 3,
        line: "钟响过以后，一块碎片从钟唇上震下来。",
        failLine: "钟鸣先把灵力抽走一口。人没站住，碎片还在钟上。",
        failStones: 8,
        failInjury: 2,
        failQi: 6,
        failSpirit: 6,
      },
      {
        id: "tide-dive",
        label: "潜入钟腹",
        description: "从钟腹进去。碎片更多，钟也更沉。",
        kind: "fight",
        difficulty: "hard",
        qiCost: 6,
        signature: true,
        stones: 24,
        progress: 4,
        line: "你从钟腹里摸出一块更大的碎片。手上的水是咸的。",
        failLine: "钟腹里的水把人托不住。出来的时候灵力是空的，碎片没拿到。",
        failStones: 12,
        failInjury: 3,
        failQi: 8,
        failSpirit: 8,
      },
    ],
  },
  {
    id: "cloud-plank-break",
    name: "栈云断索",
    stateId: "shuzhou",
    where: "state",
    minRealm: 4,
    band: "筑基",
    cooldownTicks: 16,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "索还连着，藤已经在咬。",
    mechanic: "慢走，索还够，要打一架才有纤维。快跑索更细，架更难。砍藤不打，纤维也没了，只剩几枚灵石。",
    advice: "蜀州的栈云断索不在州外的栈云径上。得到筑基，从这一州进。索只有这一根。慢走、快跑、砍藤，三条路。带出来的是云栈纤维，洞府炼制时用一份，这一炉灵石少两成。",
    signatureItemId: "cloud-plank-fiber",
    signatureName: "云栈纤维",
    signatureUse: "洞府炼制时用一份，这一炉少两成灵石。用过就没了。",
    bossName: "藤猿",
    bossMove: "缠绕会拖住先手",
    statusId: STATUS_ENTANGLE,
    spellLoadoutId: asSpell("wood-bind-tier-2"),
    pattern: "swift",
    spiritDrain: 0,
    sightings: [
      "索在脚下响了一声。你抓住旁边的藤，藤上已经起毛。",
      "云贴着崖壁。索的另一头看不见，只有藤猿在上面看。",
      "有一截旧索垂在石缝里，新的那根还绷着。",
    ],
    entryLine: "栈云断索的板还在，索细了一圈。藤从石缝里探出来。",
    leaveLine: "你从栈云断索退回来，索还在响，纤维没到手。",
    leaveStones: 6,
    leaveQi: 0,
    options: [
      {
        id: "plank-slow",
        label: "慢走",
        description: "顺着索慢慢过去。藤猿会拦，索还够用。",
        safe: true,
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 10,
        progress: 3,
        line: "索还够。你从藤猿让开的那一截上拆下一束云栈纤维。",
        failLine: "走得慢，藤猿还是把路封了。纤维没拆下来，索上只剩一手汁。",
        failStones: 8,
        failInjury: 2,
        failQi: 6,
      },
      {
        id: "plank-run",
        label: "快跑",
        description: "索会更细。过去以后纤维多，架也更难打。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 20,
        progress: 4,
        line: "你跑过那截细索，袖上挂着一束还绷着的纤维。",
        failLine: "索细的地方断了一股。人退回来，纤维散在崖下，这一趟没拿到。",
        failStones: 12,
        failInjury: 3,
        failQi: 10,
      },
      {
        id: "plank-cut",
        label: "砍藤",
        description: "把藤砍断，不跟藤猿打。纤维一起断了，只剩几枚灵石。",
        kind: "settle",
        stones: 14,
        line: "藤断了，索也松了。云栈纤维没留住，石缝里只捡到几枚灵石。",
      },
    ],
  },
  {
    id: "old-tea-seat",
    name: "茶桥旧席",
    stateId: "wanzhou",
    where: "state",
    minRealm: 7,
    band: "金丹前期",
    cooldownTicks: 30,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "席还温着，茶渍干在桥板上。",
    mechanic: "入席不打，揭一张旧茶纹。掀席要跟桥影打，定根会拖住步子。离席什么都不带。",
    advice: "宛州的茶桥旧席不在州外的茶桥野。得到金丹前期，从这一州进。入席、掀席、离席，三条路。带出来的是旧茶纹。金丹闭关时若没有丹霞露，用这一份，涨得少一些。",
    signatureItemId: "old-tea-pattern",
    signatureName: "旧茶纹",
    signatureUse: "金丹闭关时若没有丹霞露，用一份，修为少涨一点。",
    bossName: "桥影",
    bossMove: "定根会拖住步子",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("earth-suppress-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "桥板上的茶渍还在。你坐下的时候，席子先热了一下。",
      "栏杆上扣着一只空杯。杯底有纹，像是被人揭走过一层。",
      "桥下的水不响。影先动，人还坐着。",
    ],
    entryLine: "茶桥旧席还在桥头。茶是冷的，席上有一块干了的渍。",
    leaveLine: "你离开茶桥旧席，杯子还扣着，纹没揭下来。",
    leaveStones: 8,
    leaveQi: 0,
    options: [
      {
        id: "tea-sit",
        label: "入席",
        description: "坐下。不跟桥影打，纹从席边揭下来。",
        safe: true,
        kind: "settle",
        signature: true,
        stones: 4,
        progress: 5,
        line: "你在桥头坐了一会儿。旧茶纹是从席子边上揭下来的，还带着一点茶味。",
      },
      {
        id: "tea-flip",
        label: "掀席",
        description: "把席掀开。桥影会站起来，定根拖住步子，东西更多。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 28,
        progress: 4,
        line: "席掀开以后，桥影散了。旧茶纹下面还压着一叠灵石。",
        failLine: "桥影把步子定住了。席没掀开，纹还在原处，人退到桥头。",
        failStones: 14,
        failInjury: 3,
        failQi: 8,
      },
      {
        id: "tea-leave-seat",
        label: "离席",
        description: "不坐。纹不揭，人先走。",
        kind: "settle",
        line: "你在席边站了一站，没有坐下。旧茶纹还在席上。",
      },
    ],
  },
  {
    id: "balance-stele",
    name: "衡碑试衡",
    stateId: "zhongzhou",
    where: "state",
    minRealm: 8,
    band: "金丹中期",
    cooldownTicks: 24,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "碑还正着，两边的秤已经有人动过。",
    mechanic: "居中不打，衡石碎片从碑座掉下来。偏左或偏右都要打，定根会压先手。偏右更重。",
    advice: "中州的衡碑试衡不在州外的衡野驿，也不是地宫里的旧驿石廊。得到金丹中期，从这一州进。居中、偏左、偏右，三条路。带出来的是衡石碎片。金丹闭关时若没有丹霞露，用一份，这一州的名声也会动一动。",
    signatureItemId: "balance-stone-chip",
    signatureName: "衡石碎片",
    signatureUse: "金丹闭关时若没有丹霞露，用一份。修为少涨一点，这一州的名声也加一点。",
    bossName: "碑卫",
    bossMove: "定根压住先手",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("earth-suppress-tier-2"),
    pattern: "seal",
    spiritDrain: 0,
    sightings: [
      "碑上的字只剩半行。你伸手去摸，秤先晃了一下。",
      "左边的盘里有一枚旧石子，右边是空的。",
      "碑座下有新鲜的石屑。上一个人把哪一边压低了，看不出来。",
    ],
    entryLine: "衡碑试衡的碑还立着。两边的秤都是平的，像在等人动手。",
    leaveLine: "你从衡碑前退开，秤还是平的，碎片没掉下来。",
    leaveStones: 10,
    leaveQi: 0,
    options: [
      {
        id: "stele-center",
        label: "居中",
        description: "不压两边。碑座自己掉一块碎片。",
        safe: true,
        kind: "settle",
        signature: true,
        stones: 8,
        progress: 4,
        reputation: 2,
        line: "碑没有偏。衡石碎片从碑座上掉下来，你收进袋子。",
      },
      {
        id: "stele-left",
        label: "偏左",
        description: "把左秤压下去。碑卫会出来，定根压先手。",
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 18,
        progress: 3,
        line: "左秤沉下去以后，碑卫退了。碎片比居中的那块大一圈。",
        failLine: "左秤压下去，人先被定在碑前。碎片没到手，步子还沉。",
        failStones: 12,
        failInjury: 3,
        failQi: 8,
      },
      {
        id: "stele-right",
        label: "偏右",
        description: "把右秤压下去。这一边更重，赢了灵石也多。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 28,
        progress: 4,
        line: "右秤落到底。碑卫散开的时候，石屑和灵石一起掉下来。",
        failLine: "右秤太重。碑卫把人压在原地，碎片还在碑座里。",
        failStones: 16,
        failInjury: 3,
        failQi: 10,
      },
    ],
  },
  {
    id: "frost-night-hunt",
    name: "猎霜夜巡",
    stateId: "youzhou",
    where: "state",
    minRealm: 9,
    band: "金丹后期",
    cooldownTicks: 24,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "爪印比靴子深，霜还没化。",
    mechanic: "掩味要先花气血，然后打一场寻常的。引兽不花那口气血，进场就少一截血，霜寒更重。退回林线什么都不带。",
    advice: "幽州的猎霜夜巡不在州外的猎霜原上。得到金丹后期，从这一州进。掩味、引兽、退回林线，三条路。带出来的是霜猎骨。金丹闭关时若没有丹霞露就用它，身上有伤还能压下去两刻。",
    signatureItemId: "frost-hunt-bone",
    signatureName: "霜猎骨",
    signatureUse: "金丹闭关时若没有丹霞露，用一份。有伤的话，这一坐再把伤压下去两刻。",
    bossName: "霜犬",
    bossMove: "霜寒先贴上来",
    statusId: STATUS_FROSTBITE,
    spellLoadoutId: asSpell("water-frost-tier-2"),
    pattern: "swift",
    spiritDrain: 0,
    sightings: [
      "草上全是霜。你蹲下去看爪印，印比靴子深。",
      "一堆熄了的火。炭还在，干粮不在，只剩一根结霜的骨头。",
      "林线外面有狗叫。人还没看见，呼出来的气已经是白的。",
    ],
    entryLine: "猎霜夜巡的灯油在林子口就凝了。爪印是新的。",
    leaveLine: "你退回林线，爪印还在，骨头没捡到。",
    leaveStones: 10,
    leaveQi: 0,
    options: [
      {
        id: "frost-cover",
        label: "掩味",
        description: "先花一口气血把味道盖住，再打。霜犬不会一上来就扑满。",
        safe: true,
        kind: "fight",
        difficulty: "easy",
        qiCost: 8,
        signature: true,
        stones: 12,
        progress: 4,
        line: "味道盖住以后，霜犬没有立刻扑上来。你从它让开的雪里捡到一节霜猎骨。",
        failLine: "味道盖住了，架还是没打过。骨头留在雪里，人先退回来。",
        failStones: 10,
        failInjury: 2,
        failQi: 6,
      },
      {
        id: "frost-lure",
        label: "引兽",
        description: "不掩味。进场就少一截血，霜寒更重，东西也多。",
        kind: "fight",
        difficulty: "hard",
        hpRatio: 0.75,
        signature: true,
        stones: 26,
        progress: 4,
        line: "霜犬是顺着味道来的。架打完，雪里多了一节还凉着的骨头。",
        failLine: "味道没盖。霜犬贴着寒气扑上来，人没撑住，骨头还在它那边。",
        failStones: 14,
        failInjury: 3,
        failQi: 10,
      },
      {
        id: "frost-back",
        label: "退回林线",
        description: "不打。骨头不拿，人先出林子。",
        kind: "settle",
        line: "你退回林线。狗叫还在里面，霜猎骨没有带出来。",
      },
    ],
  },
  {
    id: "scorched-altar",
    name: "焦雷祭坛",
    stateId: "leizhou",
    where: "state",
    minRealm: 10,
    band: "元婴",
    cooldownTicks: 28,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "坛上的灰还是热的。这不是雷泽残阵，也不是焦林野。",
    mechanic: "避到焦木后面，雷祭还是要打，但轻一些。站在坛上硬接，焚灼先贴手，赢了东西多。退出祭坛什么都不带。",
    advice: "雷州的焦雷祭坛不在地宫的雷泽残阵里，也不是州外的焦林野。得到元婴，从这一州进。避到焦木后，或站在坛上。带出来的是焦雷芯。它不是婴火莲，不能拿去破境。元婴闭关时若没有养魂砂，用一份，涨得少一些。",
    signatureItemId: "scorched-thunder-core",
    signatureName: "焦雷芯",
    signatureUse: "元婴闭关时若没有养魂砂，用一份。不是婴火莲，不能拿去破境。",
    bossName: "雷祭",
    bossMove: "落雷挂上焚灼",
    statusId: STATUS_BURNING,
    spellLoadoutId: asSpell("fire-blaze-tier-2"),
    pattern: "burst",
    spiritDrain: 0,
    sightings: [
      "坛石是热的。你缩回手，灰从焦木上震下来，落在袖上。",
      "地面有一条新的焦痕。绕开以后，鞋底还是烫了一下。",
      "雷没有落在林子里。它落在坛上，灰还在冒。",
    ],
    entryLine: "焦雷祭坛的灰还温着。这里不是雷泽残阵，也不是焦林野。",
    leaveLine: "你退出焦雷祭坛，袖上有灰，芯没拿到。",
    leaveStones: 14,
    leaveQi: 0,
    options: [
      {
        id: "altar-shelter",
        label: "避到焦木后",
        description: "先避开这一落。雷祭还在，架轻一些。",
        safe: true,
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 16,
        progress: 4,
        line: "焦木挡住了这一落。雷祭退开以后，坛心留着一颗还温的焦雷芯。",
        failLine: "焦木后面也不稳。雷祭没有退，芯还在坛心里，人先出来了。",
        failStones: 16,
        failInjury: 3,
        failQi: 8,
        failDeviation: 1,
      },
      {
        id: "altar-stand",
        label: "站在坛上",
        description: "不避。焚灼先贴手，赢了芯更满，灵石也多。",
        kind: "fight",
        difficulty: "hard",
        qiCost: 10,
        signature: true,
        stones: 30,
        progress: 5,
        line: "你站在坛上等它落完。焦雷芯冷却下来的时候，手里的灰还是热的。",
        failLine: "这一落直接打在坛上。焚灼贴着手，芯没拿住，人退到焦木外面。",
        failStones: 20,
        failInjury: 4,
        failQi: 12,
        failDeviation: 2,
      },
      {
        id: "altar-leave",
        label: "退出祭坛",
        description: "不接这一落。芯不拿。",
        kind: "settle",
        line: "你退出祭坛。雷还在坛上响，焦雷芯没有带出来。",
      },
    ],
  },
  {
    id: "salt-wreck",
    name: "盐风沉舶",
    stateId: "cangzhou",
    where: "state",
    minRealm: 12,
    band: "元婴后期",
    cooldownTicks: 30,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "船舱只开得了一处。",
    mechanic: "只开一舱。盐舱是盐纹晶。石箱是灵石，没有晶。暗舱是空的，潮灌进来，挂伤，灵石也少。",
    advice: "沧州的盐风沉舶不在州外的盐风礁上。得到元婴后期，从这一州进。三舱只开一处：盐舱、石箱、暗舱。带出来的是盐纹晶。元婴闭关时若没有养魂砂，用一份，涨得少一些。它不是破境灵材。",
    signatureItemId: "salt-pattern-crystal",
    signatureName: "盐纹晶",
    signatureUse: "元婴闭关时若没有养魂砂，用一份。不是破境灵材。",
    bossName: "舱影",
    bossMove: "这一处不靠打，靠你开哪一舱",
    statusId: STATUS_FROSTBITE,
    spellLoadoutId: asSpell("water-frost-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "舱板上的盐结成一层。你舔到嘴唇，风已经把盐送进来了。",
      "有一舱门是新封的，绳还湿。另外两扇能推动。",
      "船底有水声。人还站在板上，鞋已经咸了。",
    ],
    entryLine: "盐风沉舶歪在礁内侧。三扇舱门都还在，只能开一扇。",
    leaveLine: "你从盐风沉舶上下来，三扇舱门都没开，嘴唇是咸的。",
    leaveStones: 12,
    leaveQi: 0,
    options: [
      {
        id: "salt-hold",
        label: "开盐舱",
        description: "开这一舱。盐纹晶在舱底，灵石不多。",
        safe: true,
        kind: "settle",
        signature: true,
        stones: 6,
        progress: 4,
        line: "盐舱的底上有一枚盐纹晶。你把它擦干，手里是咸的。",
      },
      {
        id: "salt-chest",
        label: "抬石箱",
        description: "抬这一箱。箱子是灵石，盐纹晶不在里面。",
        kind: "settle",
        stones: 36,
        line: "石箱里是灵石。盐纹晶没有，你把箱子合上了。",
      },
      {
        id: "salt-dark",
        label: "进暗舱",
        description: "进这扇新封的。里面没有货，潮会灌进来。",
        kind: "settle",
        stoneCost: 24,
        injury: 4,
        deviation: 2,
        line: "暗舱里没有货。潮灌进来，人挂了伤，袋子里的灵石也少了一截。",
      },
    ],
  },
  {
    id: "sand-gate-seal",
    name: "砂门闭关",
    stateId: "liangzhou",
    where: "state",
    minRealm: 13,
    band: "化神",
    cooldownTicks: 36,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "关里的法诀先乱。兵器还拿得住。",
    mechanic: "进门以后法术被封，兵器还能用。持兵进关是寻常的一架。硬用法术会先吃一层反噬，架更难。断法挂在镇沙将身上。",
    advice: "凉州的砂门闭关不在州外的砂门碛上。得到化神，从这一州进。法术进门会被封住，兵器还能用。持兵，或硬用法术。带出来的是镇沙符页。它不是神纹尘，不能拿去破境。化神闭关时若没有神纹尘，用这一页稳住一手。",
    signatureItemId: "sand-seal-page",
    signatureName: "镇沙符页",
    signatureUse: "化神闭关时若没有神纹尘，用一页。不是神纹尘，不能拿去破境。",
    bossName: "镇沙将",
    bossMove: "断法会乱掉这一手",
    statusId: STATUS_SPELL_BREAK,
    spellLoadoutId: asSpell("metal-break-tier-2"),
    pattern: "seal",
    spiritDrain: 0,
    sightings: [
      "牙缝里有沙。你把符纸抽出来，上面的字先糊了一笔。",
      "关里没有风，沙还是往袖口里灌。兵刃上的沙倒是少。",
      "前一个人的法诀写在墙上，写到一半就断了。",
    ],
    entryLine: "砂门闭关的门开着一条缝。沙打在符纸上，法诀先乱了一拍。",
    leaveLine: "你退出砂门闭关，符页没抄到，牙缝里还有沙。",
    leaveStones: 18,
    leaveQi: 0,
    options: [
      {
        id: "sand-weapon",
        label: "持兵进关",
        description: "收起法术，用兵器。镇沙将会挂断法，兵器这边还打得动。",
        safe: true,
        kind: "fight",
        difficulty: "easy",
        sealSpells: true,
        signature: true,
        stones: 18,
        progress: 5,
        line: "法术在门里用不出来。你用兵器把这一架打完，镇沙符页从将旗上撕下来。",
        failLine: "法术被封住了，兵器也没压住。符页还在旗上，人退出去的时候牙缝里都是沙。",
        failStones: 22,
        failInjury: 4,
        failQi: 10,
        failSpirit: 8,
        failDeviation: 2,
      },
      {
        id: "sand-spell",
        label: "硬用法术",
        description: "法术仍然被封，硬用还会反噬。赢了东西多，输了更重。",
        kind: "fight",
        difficulty: "hard",
        sealSpells: true,
        hpRatio: 0.8,
        signature: true,
        stones: 32,
        progress: 5,
        line: "法术没能用出来，反噬也过去了。你还是把那页符撕了下来。",
        failLine: "法术在门里是空的。反噬先到，镇沙将还站着，符页没撕下来。",
        failStones: 28,
        failInjury: 4,
        failQi: 14,
        failSpirit: 10,
        failDeviation: 3,
      },
      {
        id: "sand-back",
        label: "退出关口",
        description: "不进。符页不抄。",
        kind: "settle",
        line: "你在关口停了一停，没有进去。镇沙符页还在里面。",
      },
    ],
  },
  {
    id: "wanderer-cave",
    name: "散修旧洞",
    stateId: null,
    where: "main-city",
    minRealm: 3,
    band: "炼气后期",
    cooldownTicks: 12,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "洞不深，石底下压着半张札。",
    mechanic: "撬开要打一架，才拿得走残札。只拿明处的不打，札还压着。硬砸更难，赢了灵石多。",
    advice: "散修旧洞在主城里，不占丙级的层。得到炼气后期就能进。撬开、只拿明处的、硬砸，三条路。带出来的是旧洞残札，炼气后期闭关时用一份。",
    signatureItemId: "wanderer-slip",
    signatureName: "旧洞残札",
    signatureUse: "炼气后期闭关时用一份，修为少涨一点。",
    bossName: "洞里的人",
    bossMove: "先手会慢半拍",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("earth-suppress-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "洞壁上有一排烟痕。火塘是冷的，石底下露出半张纸。",
      "门口的席子卷着。有人在这儿住过，碗还扣在地上。",
      "你踩到一块松动的石。石底下有纸边，人还没来得及拆。",
    ],
    entryLine: "散修旧洞的口子在城根下。里面有火塘，人已经不在。",
    leaveLine: "你从散修旧洞里退出来，残札还压在石头底下。",
    leaveStones: 4,
    leaveQi: 0,
    options: [
      {
        id: "wanderer-pry",
        label: "撬开",
        description: "把石头撬开。洞里会有人拦一下。",
        safe: true,
        kind: "fight",
        difficulty: "easy",
        signature: true,
        stones: 10,
        progress: 2,
        line: "石头撬开以后，旧洞残札还是干的。你把它折好收起来。",
        failLine: "石头没撬开。洞里的人把你挡在门口，残札还在下面。",
        failStones: 6,
        failInjury: 2,
        failQi: 4,
      },
      {
        id: "wanderer-open",
        label: "只拿明处的",
        description: "不撬。明处有几枚灵石，残札不动。",
        kind: "settle",
        stones: 12,
        line: "你只拿了明处的灵石。旧洞残札还压在石头底下。",
      },
      {
        id: "wanderer-smash",
        label: "硬砸",
        description: "直接砸。架更难，赢了灵石多，残札也在。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 18,
        progress: 2,
        line: "石块砸开了。残札和一捧灵石混在灰里，你把札拣出来。",
        failLine: "石没砸开，人倒先挂了灰。残札还在底下。",
        failStones: 8,
        failInjury: 2,
        failQi: 8,
      },
    ],
  },
  {
    id: "merchant-hold",
    name: "游商暗仓",
    stateId: null,
    where: "main-city",
    minRealm: 7,
    band: "金丹",
    cooldownTicks: 20,
    party: true,
    durationTicks: 3,
    choiceTicks: 2,
    tide: false,
    prompt: "仓门半掩着，账页压在柜上。",
    mechanic: "付钱，三十六枚灵石换一页账，不打。动手要打仓卫，赢了才有账页。离开则仓门重新合上。",
    advice: "游商暗仓在主城里。得到金丹就能进。付钱，或动手。带出来的是游商账页。金丹闭关时若没有丹霞露，用这一页，这一州的名声也会动一动。",
    signatureItemId: "merchant-ledger",
    signatureName: "游商账页",
    signatureUse: "金丹闭关时若没有丹霞露，用一页。修为少涨一点，这一州的名声也加一点。",
    bossName: "仓卫",
    bossMove: "先手会被压住一下",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("earth-suppress-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "仓里的灯是省着的。账页压在柜上，角已经被手摸毛了。",
      "有一箱没有封。你看了一眼，里面是空的，箱子是做样子的。",
      "仓卫站在门后，没有出声，手放在箱子上。",
    ],
    entryLine: "游商暗仓的门半掩着。里面有灯，账页就在柜上。",
    leaveLine: "你离开游商暗仓，门在身后合上，账页没带走。",
    leaveStones: 0,
    leaveQi: 0,
    options: [
      {
        id: "merchant-pay",
        label: "付钱",
        description: "给三十六枚灵石。账页递过来，不打。",
        safe: true,
        kind: "settle",
        signature: true,
        stoneCost: 36,
        progress: 2,
        reputation: 1,
        line: "账页递过来的时候还温着。灵石先少了三十六枚。",
      },
      {
        id: "merchant-fight",
        label: "动手",
        description: "不付钱。仓卫会拦，赢了账页和一点灵石都在。",
        kind: "fight",
        difficulty: "hard",
        signature: true,
        stones: 10,
        progress: 3,
        line: "仓卫让开了。账页还在柜上，你把它抽出来，边角是毛的。",
        failLine: "仓卫没有让。账页还压在柜上，这一趟灵石也散了一点。",
        failStones: 16,
        failInjury: 3,
        failQi: 8,
      },
      {
        id: "merchant-shut",
        label: "离开",
        description: "不买，也不打。门重新合上。",
        kind: "settle",
        line: "你把仓门带上。账页还在里面。",
      },
    ],
  },
  {
    id: "ancient-vigil",
    name: "古修闭关室",
    stateId: null,
    where: "sect-outpost",
    minRealm: 10,
    band: "元婴",
    cooldownTicks: 24,
    party: false,
    durationTicks: 4,
    choiceTicks: 2,
    tide: false,
    prompt: "室里只容一个人。灰要坐满才留得住。",
    mechanic: "单人。坐下要坐满剩下的时辰，中途起来灰就散了。只在门口站一站，没有灰。时辰到了还没开口，也按坐下算。",
    advice: "古修闭关室在宗门驻地，不在主城。得到元婴，一个人进去。坐下要坐满，起来就没有灰。带出来的是闭关灰。元婴闭关时若没有养魂砂，用一份，涨得少一些。",
    signatureItemId: "vigil-ash",
    signatureName: "闭关灰",
    signatureUse: "元婴闭关时若没有养魂砂，用一份，修为少涨一点。",
    bossName: "空室",
    bossMove: "这一处没有守关，时辰不到灰不落",
    statusId: STATUS_ROOTED,
    spellLoadoutId: asSpell("earth-suppress-tier-2"),
    pattern: "pressure",
    spiritDrain: 0,
    sightings: [
      "蒲团上有一层薄灰。你坐下的时候，灰没有扬起来。",
      "墙上的灯芯短了一截。上一个人坐到灯灭才走。",
      "室里没有第二张席。门在你身后合上，外面的声音轻了。",
    ],
    entryLine: "古修闭关室只容一个人。蒲团上有一层薄灰。",
    leaveLine: "坐到一半起来了。灰没留住，气血也空了一截。",
    leaveStones: 0,
    leaveQi: 12,
    options: [
      {
        id: "vigil-sit",
        label: "坐下",
        description: "坐满剩下的时辰。灰会落下来。中途起来就没有。",
        safe: true,
        kind: "vigil",
        signature: true,
        progress: 8,
        line: "时辰坐满了。闭关灰落在蒲团上，你把它拢进袋子。",
      },
      {
        id: "vigil-door",
        label: "只在门口站一站",
        description: "不坐。看一眼就走，灰不拿。",
        kind: "settle",
        progress: 1,
        line: "你在门口站了一会儿，没有坐下。灰还在蒲团上。",
      },
      {
        id: "vigil-rise",
        label: "现在就走",
        description: "不坐满。这一趟没有灰。",
        kind: "settle",
        line: "你没有坐下。室里的灰还是原来的那一层。",
      },
    ],
  },
];

const BY_ID = new Map(DUNGEONS.map((dungeon) => [dungeon.id, dungeon]));

export type RegionalCombatantOf = (cultivator: Cultivator) => BattleCombatant;

interface MeditationAid {
  itemId: ItemId;
  name: string;
  band: Band;
  bonus: number;
  spirit?: number;
  injury?: number;
  reputation?: boolean;
}

const MEDITATION_AIDS: readonly MeditationAid[] = [
  { itemId: "wanderer-slip", name: "旧洞残札", band: "炼气", bonus: 2 },
  { itemId: "qinglan-dew-core", name: "青岚露芯", band: "筑基", bonus: 4 },
  { itemId: "tide-bell-shard", name: "潮钟碎片", band: "筑基", bonus: 4, spirit: 6 },
  { itemId: "old-tea-pattern", name: "旧茶纹", band: "金丹", bonus: 6 },
  { itemId: "balance-stone-chip", name: "衡石碎片", band: "金丹", bonus: 6, reputation: true },
  { itemId: "frost-hunt-bone", name: "霜猎骨", band: "金丹", bonus: 6, injury: 2 },
  { itemId: "merchant-ledger", name: "游商账页", band: "金丹", bonus: 4, reputation: true },
  { itemId: "scorched-thunder-core", name: "焦雷芯", band: "元婴", bonus: 8 },
  { itemId: "salt-pattern-crystal", name: "盐纹晶", band: "元婴", bonus: 8 },
  { itemId: "vigil-ash", name: "闭关灰", band: "元婴", bonus: 8 },
  { itemId: "sand-seal-page", name: "镇沙符页", band: "化神", bonus: 10 },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function stateOf(locationId: string): string {
  return locationId.split(":")[0] ?? "";
}

function nodeOf(locationId: string): string {
  return locationId.split(":")[1] ?? "";
}

function stateName(world: WorldState, stateId: string | null, locationId: string): string {
  if (stateId) return world.states[stateId]?.name ?? STATE_NAMES[stateId] ?? stateId;
  const here = stateOf(locationId);
  return world.states[here]?.name ?? STATE_NAMES[here] ?? "这一州";
}

function runsOf(world: WorldState): Record<string, RegionalRunState> {
  if (!world.regionalRuns) world.regionalRuns = {};
  return world.regionalRuns;
}

function dungeonOf(id: string): RegionalDungeonDef | null {
  return BY_ID.get(id) ?? null;
}

function mustDungeon(id: string): RegionalDungeonDef {
  const dungeon = dungeonOf(id);
  if (!dungeon) throw new GameplayRejection("没有这一处秘境。");
  return dungeon;
}

export function tideWindow(tick: number): { open: boolean; opensAt: number; closesAt: number } {
  const cycle = 24;
  const openFor = 8;
  const into = ((tick % cycle) + cycle) % cycle;
  if (into < openFor) {
    const opensAt = tick - into;
    return { open: true, opensAt, closesAt: opensAt + openFor };
  }
  const opensAt = tick + (cycle - into);
  return { open: false, opensAt, closesAt: opensAt + openFor };
}

function canStand(dungeon: RegionalDungeonDef, locationId: string): boolean {
  if (dungeon.where === "state") return dungeon.stateId === stateOf(locationId);
  if (dungeon.where === "main-city") return nodeOf(locationId) === "main-city";
  return nodeOf(locationId) === "sect-outpost";
}

function phaseNow(run: RegionalRunState): RegionalRunState["phase"] {
  return run.phase;
}

function findRun(world: WorldState, cultivatorId: string): RegionalRunState | null {
  const runs = world.regionalRuns ?? {};
  if (runs[cultivatorId]) return runs[cultivatorId]!;
  for (const run of Object.values(runs)) {
    if (run.companionIds.includes(cultivatorId)) return run;
  }
  return null;
}

function safeOption(dungeon: RegionalDungeonDef): ChoiceOption {
  return dungeon.options.find((option) => option.safe) ?? dungeon.options[0]!;
}

function interiorScene(dungeonId: string) {
  return regionalInterior(dungeonId);
}

function interiorSafe(dungeonId: string): InteriorChoice | null {
  const scene = interiorScene(dungeonId);
  if (!scene) return null;
  return scene.options.find((option) => option.safe) ?? scene.options[0] ?? null;
}

function applyInteriorChoice(world: WorldState, run: RegionalRunState, option: InteriorChoice): void {
  if (run.interiorResolved) return;
  const dungeon = dungeonOf(run.dungeonId);
  const leader = world.cultivators[run.leaderId];
  if (!dungeon || !leader) {
    run.interiorResolved = true;
    return;
  }
  const companions = presentCultivators(world, run).filter((person) => person.id !== leader.id);
  if ((option.stones ?? 0) > 0) splitStones(leader, companions, option.stones ?? 0);
  if ((option.stones ?? 0) < 0) payStones(leader, -(option.stones ?? 0));
  if ((option.qi ?? 0) > 0) spendQi(leader, option.qi ?? 0);
  if ((option.injury ?? 0) > 0 && leader.injuryTicksRemaining < (option.injury ?? 0)) {
    leader.injuryTicksRemaining = option.injury ?? 0;
    noteWound(world, leader);
  }
  const reputation = option.reputation ?? 0;
  if (reputation > 0) addReputation(leader, dungeon.stateId ?? stateOf(leader.locationId), reputation);
  if (reputation < 0) {
    const key = (dungeon.stateId ?? stateOf(leader.locationId)) as StateId;
    leader.stateReputation[key] = Math.max(0, (leader.stateReputation[key] ?? 0) + reputation);
  }
  notePeople(
    world,
    presentCultivators(world, run),
    { kind: (option.injury ?? 0) > 0 ? "injury" : "find", title: dungeon.name, detail: option.line, mood: "这一段可以回去说" },
    { kind: (option.injury ?? 0) > 0 ? "fight" : "growth", text: option.line },
  );
  run.interiorResolved = true;
  run.interiorVotes = {};
}

function ensureInteriorNoted(world: WorldState, run: RegionalRunState): void {
  if (run.interiorResolved) return;
  const safe = interiorSafe(run.dungeonId);
  if (!safe) {
    run.interiorResolved = true;
    return;
  }
  applyInteriorChoice(world, run, safe);
}

function realmBand(level: number): Band | null {
  if (level >= 13) return "化神";
  if (level >= 10) return "元婴";
  if (level >= 7) return "金丹";
  if (level >= 4) return "筑基";
  if (level >= 3) return "炼气";
  return null;
}

function entryBlock(world: WorldState, cultivator: Cultivator, dungeon: RegionalDungeonDef): string | null {
  if (!canStand(dungeon, cultivator.locationId)) return "这一处不在这里进。";
  if (findRun(world, cultivator.id)) return "人还在秘境里。";
  if (cultivator.injuryTicksRemaining > 0) return "身上有伤，这一处先别进。";
  if (cultivator.realmLevel < dungeon.minRealm) return `得到${dungeon.band}才进得去。`;
  const until = cultivator.regionalCooldowns?.[dungeon.id] ?? 0;
  if (until > world.tick) return `这一处还要再等，下一回在第${until}刻。`;
  if (dungeon.tide && !tideWindow(world.tick).open) {
    const next = tideWindow(world.tick).opensAt;
    return `听潮钟窟这会儿潮退了。下一潮在第${next}刻。`;
  }
  return null;
}

function companionsFor(world: WorldState, leader: Cultivator, dungeon: RegionalDungeonDef): Cultivator[] {
  if (!dungeon.party) return [];
  const party = getPartyOf(world, leader.id);
  if (!party) return [];
  return party.memberIds
    .filter((id) => id !== leader.id)
    .map((id) => world.cultivators[id])
    .filter((cultivator): cultivator is Cultivator => Boolean(cultivator))
    .filter((cultivator) => cultivator.locationId === leader.locationId && !cultivator.activeJobId)
    .slice(0, 4);
}

function presentCultivators(world: WorldState, run: RegionalRunState): Cultivator[] {
  const leader = world.cultivators[run.leaderId];
  if (!leader) return [];
  const people = [leader];
  for (const id of run.companionIds) {
    const cultivator = world.cultivators[id];
    if (cultivator && cultivator.locationId === leader.locationId) people.push(cultivator);
  }
  return people;
}

function votesNeeded(count: number): number {
  if (count <= 1) return 1;
  return Math.floor(count / 2) + 1;
}

function notePeople(
  world: WorldState,
  people: readonly Cultivator[],
  note: { kind: "find" | "setback" | "injury" | "insight"; title: string; detail: string; mood: string },
  life?: { kind: "growth" | "fight"; text: string },
): void {
  for (const person of people) {
    try {
      pushTravelNote(person, travelNote({
        tick: world.tick,
        kind: note.kind,
        title: note.title,
        detail: note.detail,
        locationId: person.locationId,
        mood: note.mood,
      }));
      if (life) recordLife(person, { tick: world.tick, kind: life.kind, text: life.text });
    } catch {
      // One listener must not drop the line.
    }
  }
}

function writeSighting(world: WorldState, run: RegionalRunState): void {
  if (run.sightingWritten) return;
  const dungeon = dungeonOf(run.dungeonId);
  const leader = world.cultivators[run.leaderId];
  if (!dungeon || !leader) return;
  const line = dungeon.sightings[hashString(`${run.startedAtTick}:${run.leaderId}:${dungeon.id}`) % dungeon.sightings.length]!;
  const text = `${dungeon.name}的见闻：${line}`;
  notePeople(
    world,
    presentCultivators(world, run),
    { kind: "insight", title: `${dungeon.name}的见闻`, detail: text, mood: "这一句可以拿回去说" },
    { kind: "growth", text },
  );
  run.sightingWritten = true;
}

function rememberCooldown(cultivator: Cultivator, dungeon: RegionalDungeonDef, tick: number): void {
  cultivator.regionalCooldowns = {
    ...(cultivator.regionalCooldowns ?? {}),
    [dungeon.id]: tick + dungeon.cooldownTicks,
  };
}

function payStones(cultivator: Cultivator, amount: number): number {
  const paid = Math.min(cultivator.spiritStones, Math.max(0, amount));
  cultivator.spiritStones -= paid;
  return paid;
}

function splitStones(leader: Cultivator, companions: readonly Cultivator[], stones: number): number {
  if (stones <= 0) {
    leader.spiritStones += 0;
    return 0;
  }
  if (companions.length === 0) {
    leader.spiritStones += stones;
    return stones;
  }
  const share = Math.max(1, Math.floor(stones / (companions.length + 3)));
  let given = 0;
  for (const companion of companions) {
    companion.spiritStones += share;
    given += share;
  }
  const rest = Math.max(0, stones - given);
  leader.spiritStones += rest;
  return rest;
}

function addReputation(cultivator: Cultivator, stateId: string, amount: number): void {
  if (amount <= 0 || !stateId) return;
  const key = stateId as StateId;
  cultivator.stateReputation[key] = (cultivator.stateReputation[key] ?? 0) + amount;
}

function addProgress(cultivator: Cultivator, amount: number): void {
  if (amount <= 0) return;
  cultivator.realmProgress = Math.min(100, cultivator.realmProgress + amount);
}

function hangDeviation(cultivator: Cultivator, ticks: number): void {
  if (ticks <= 0) return;
  const existing = cultivator.statusEffects.find((effect) => effect.id === "deviation");
  if (existing) {
    existing.remainingTicks = Math.max(existing.remainingTicks, ticks);
    return;
  }
  cultivator.statusEffects.push({
    id: "deviation",
    name: "Qi Deviation",
    description: "Cultivation becomes unstable and risky.",
    source: "regional-dungeon",
    remainingTicks: ticks,
    intensity: 1,
  });
}

function spendQi(cultivator: Cultivator, amount: number): void {
  if (amount <= 0) return;
  cultivator.qi = Math.max(1, cultivator.qi - amount);
}

function spendSpirit(cultivator: Cultivator, amount: number): void {
  if (amount <= 0) return;
  cultivator.spiritualPower = Math.max(0, cultivator.spiritualPower - amount);
}

export function prepareRegionalFighter(
  base: BattleCombatant,
  mods: { hpRatio?: number; sealSpells?: boolean },
): BattleCombatant {
  const skills = mods.sealSpells
    ? base.skills.filter((skill) => skill.channel !== "spell" || skill.id === "basic-strike")
    : base.skills;
  const hp = mods.hpRatio ? Math.max(1, Math.round(base.maxHp * mods.hpRatio)) : base.hp;
  return { ...base, hp, skills };
}

function bossOf(dungeon: RegionalDungeonDef, allies: readonly BattleCombatant[], hard: boolean): BattleCombatant {
  const leader = allies[0];
  const partyScale = 1 + Math.max(0, allies.length - 1) * 0.2;
  const hp = Math.max(36, Math.round((leader?.maxHp ?? 80) * (hard ? 1.55 : 0.7) * partyScale));
  const attack = Math.max(4, Math.round((leader?.weaponAttack ?? 12) * (hard ? 0.95 : 0.4)));
  const defense = Math.max(1, Math.round((leader?.defense ?? 8) * (hard ? 0.7 : 0.35)));
  return {
    id: dungeon.id,
    name: dungeon.bossName,
    side: "enemy",
    role: "dps",
    hp,
    maxHp: hp,
    weaponAttack: attack,
    spellAttack: Math.max(1, attack),
    defense,
    speed: Math.max(1, (leader?.speed ?? 10) - (hard ? 0 : 1)),
    hit: 80,
    dodge: hard ? 8 : 4,
    crit: hard ? 12 : 6,
    critDamage: 140,
    guardHeart: 0,
    spirit: 40,
    maxSpirit: 40,
    skills: [],
    pattern: dungeon.pattern,
    elite: true,
    threat: {
      statusId: dungeon.statusId,
      tier: 2,
      spellLoadoutId: dungeon.spellLoadoutId,
      extraSpiritDrain: dungeon.spiritDrain,
    } satisfies GuardianThreat,
  };
}

function pushCombatLog(
  world: WorldState,
  cultivator: Cultivator,
  dungeon: RegionalDungeonDef,
  summary: DungeonCombatSummary,
  line: string,
  won: boolean,
): void {
  if (!Array.isArray(world.combatLogs)) return;
  if (typeof world.nextCombatSequence !== "number") world.nextCombatSequence = world.combatLogs.length + 1;
  world.combatLogs.unshift({
    id: `combat-${world.nextCombatSequence++}`,
    tick: world.tick,
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    encounterId: `regional:${dungeon.id}`,
    enemyName: dungeon.bossName,
    outcome: won ? "victory" : "defeat",
    damageTaken: 0,
    spiritualPowerSpent: 0,
    loot: {},
    summary: line,
    combatRounds: [summary],
    retreated: summary.outcome === "withdraw" || undefined,
  });
}

function storeReport(
  world: WorldState,
  run: RegionalRunState,
  dungeon: RegionalDungeonDef,
  report: RegionalDungeonReport,
): void {
  const leader = world.cultivators[run.leaderId];
  if (leader) leader.regionalReport = report;
  for (const id of run.companionIds) {
    const companion = world.cultivators[id];
    if (!companion || !leader || companion.locationId !== leader.locationId) continue;
    companion.regionalReport = {
      ...report,
      line: report.signatureName ? `${report.line}东西在${leader.name}袋子里。` : report.line,
      sharedLeaderId: leader.id,
      sharedLeaderName: leader.name,
    };
  }
  run.report = report;
  run.summary = report.line;
  run.phase = "resolved";
  if (leader) rememberCooldown(leader, dungeon, world.tick);
}

function finishSettle(
  world: WorldState,
  run: RegionalRunState,
  dungeon: RegionalDungeonDef,
  option: ChoiceOption,
  won: boolean | null,
  combatRounds?: DungeonCombatSummary[],
): void {
  const leader = world.cultivators[run.leaderId];
  if (!leader) return;
  const companions = presentCultivators(world, run).filter((person) => person.id !== leader.id);
  const failed = won === false;
  const stonesGain = failed ? 0 : option.stones ?? 0;
  const stoneCost = failed ? option.failStones ?? 0 : option.stoneCost ?? 0;
  const injury = failed ? option.failInjury ?? 0 : option.injury ?? 0;
  const deviation = failed ? option.failDeviation ?? 0 : option.deviation ?? 0;
  const qi = failed ? option.failQi ?? 0 : option.qiCost ?? 0;
  const spirit = failed ? option.failSpirit ?? 0 : 0;
  const line = failed ? option.failLine ?? "这一场没站住。" : option.line;
  const signature = !failed && option.signature === true;
  const paid = payStones(leader, stoneCost);
  const kept = splitStones(leader, companions, stonesGain);
  if (signature) leader.inventory[dungeon.signatureItemId] = (leader.inventory[dungeon.signatureItemId] ?? 0) + 1;
  if (!failed) {
    addProgress(leader, option.progress ?? 0);
    addReputation(leader, dungeon.stateId ?? stateOf(leader.locationId), option.reputation ?? 0);
  }
  spendQi(leader, failed ? qi : 0);
  spendSpirit(leader, spirit);
  if (!failed && option.qiCost) spendQi(leader, 0);
  hangDeviation(leader, deviation);
  if (injury > 0) {
    const raised = injury > leader.injuryTicksRemaining;
    if (raised) leader.injuryTicksRemaining = injury;
    if (raised) noteWound(world, leader);
  } else if (failed) {
    shiftCultivatorMood(world, leader, "loss", "这一处没拿下来，还得再等一等。");
  } else if (signature) {
    shiftCultivatorMood(world, leader, "win", `${dungeon.name}里的东西到手了。`);
  }
  for (const companion of companions) {
    if (failed) spendQi(companion, Math.max(2, Math.floor((option.failQi ?? 4) / 2)));
    if (failed && injury > 0 && companion.injuryTicksRemaining < 1) {
      companion.injuryTicksRemaining = 1;
      noteWound(world, companion);
    }
  }
  const lifeKind = failed || combatRounds || injury > 0 ? "fight" : "growth";
  notePeople(
    world,
    [leader, ...companions],
    {
      kind: failed ? "setback" : "find",
      title: dungeon.name,
      detail: line,
      mood: failed ? "这一趟没拿住" : "这一句可以拿回去说",
    },
    { kind: lifeKind, text: line },
  );
  const outcome: RegionalDungeonReport["outcome"] = failed || (injury > 0 && !signature)
    ? "failed"
    : option.kind === "vigil"
      ? "sat"
      : signature || stonesGain > 0 || (option.progress ?? 0) > 0
        ? "cleared"
        : "withdrew";
  storeReport(world, run, dungeon, {
    dungeonId: dungeon.id,
    name: dungeon.name,
    outcome,
    line,
    signatureName: signature ? dungeon.signatureName : null,
    stones: kept - paid,
    endedAtTick: world.tick,
    ...(combatRounds ? { combatRounds } : {}),
  });
}

function runFight(
  world: WorldState,
  run: RegionalRunState,
  dungeon: RegionalDungeonDef,
  option: ChoiceOption,
  combatantOf: RegionalCombatantOf,
): void {
  const leader = world.cultivators[run.leaderId];
  if (!leader) return;
  const people = presentCultivators(world, run);
  if (option.qiCost && option.kind === "fight") {
    for (const person of people) spendQi(person, option.qiCost);
  }
  const allies = people.map((person) => prepareRegionalFighter(combatantOf(person), {
    hpRatio: option.hpRatio,
    sealSpells: option.sealSpells,
  }));
  const hard = option.difficulty === "hard";
  const escort = hard ? regionalEscort(dungeon.id, allies[0]) : null;
  const battle = runPartyBattle({
    allies,
    enemies: escort ? [escort, bossOf(dungeon, allies, hard)] : [bossOf(dungeon, allies, hard)],
    policy: hard ? "aggressive" : "balanced",
    seed: `${world.tick}:${run.leaderId}:${dungeon.id}:${option.id}`,
    maxRounds: hard ? 7 : 6,
    leaderId: leader.id,
  });
  const won = battle.outcome === "win";
  if (won) {
    for (const entry of battle.practice) {
      const cultivator = world.cultivators[entry.id];
      if (cultivator) grantCombatPractice(cultivator, entry.skillIds, 1);
    }
  }
  const line = won ? `${option.line}这一场${dungeon.bossName}${dungeon.bossMove}。` : (option.failLine ?? "这一场没站住。");
  for (const person of people) {
    pushCombatLog(world, person, dungeon, battle.summary, line, won);
  }
  const fought: ChoiceOption = won
    ? { ...option, line }
    : option;
  finishSettle(world, run, dungeon, fought, won, [battle.summary]);
}

function applyOption(
  world: WorldState,
  run: RegionalRunState,
  optionId: string,
  combatantOf: RegionalCombatantOf,
  jobEnding: boolean,
): void {
  if (run.phase === "resolved") return;
  const dungeon = mustDungeon(run.dungeonId);
  ensureInteriorNoted(world, run);
  const option = dungeon.options.find((entry) => entry.id === optionId) ?? safeOption(dungeon);
  if (!run.sightingWritten) writeSighting(world, run);
  if (option.kind === "vigil" && !jobEnding) {
    run.phase = "vigil";
    run.summary = `${dungeon.name}里坐下来了。时辰没到，灰还没落。`;
    const leader = world.cultivators[run.leaderId];
    if (leader) {
      notePeople(world, [leader], {
        kind: "insight",
        title: dungeon.name,
        detail: run.summary,
        mood: "人还坐着",
      });
    }
    return;
  }
  if (option.kind === "fight") {
    runFight(world, run, dungeon, option, combatantOf);
    return;
  }
  finishSettle(world, run, dungeon, option, null);
}

function applyLeave(world: WorldState, run: RegionalRunState): void {
  const dungeon = mustDungeon(run.dungeonId);
  const leader = world.cultivators[run.leaderId];
  if (!leader || run.phase === "resolved") return;
  if (!run.sightingWritten) writeSighting(world, run);
  const companions = presentCultivators(world, run).filter((person) => person.id !== leader.id);
  const paid = payStones(leader, dungeon.leaveStones);
  spendQi(leader, dungeon.leaveQi);
  const line = dungeon.leaveLine;
  notePeople(
    world,
    [leader, ...companions],
    { kind: "setback", title: dungeon.name, detail: line, mood: "人先出来了" },
    { kind: "fight", text: line },
  );
  shiftCultivatorMood(world, leader, "loss", "这一处先退了，东西没带出来。");
  storeReport(world, run, dungeon, {
    dungeonId: dungeon.id,
    name: dungeon.name,
    outcome: "withdrew",
    line,
    signatureName: null,
    stones: -paid,
    endedAtTick: world.tick,
  });
}

export function regionalGateClause(stateId: string | undefined): string {
  const dungeon = DUNGEONS.find((entry) => entry.where === "state" && entry.stateId === stateId);
  if (!dungeon) return "";
  return `${dungeon.name}不在这几层里，${dungeon.band}从这一州进。`;
}

export function assertRegionalEntry(
  world: WorldState,
  cultivator: Cultivator,
  dungeonId: string,
): { durationTicks: number; label: string } {
  const dungeon = mustDungeon(dungeonId);
  const block = entryBlock(world, cultivator, dungeon);
  if (block) throw new GameplayRejection(block);
  return { durationTicks: dungeon.durationTicks, label: `进${dungeon.name}` };
}

export function openRegionalRun(
  world: WorldState,
  cultivator: Cultivator,
  dungeonId: string,
  jobId: string,
): string {
  const dungeon = mustDungeon(dungeonId);
  const block = entryBlock(world, cultivator, dungeon);
  if (block) throw new GameplayRejection(block);
  const companions = companionsFor(world, cultivator, dungeon);
  const run: RegionalRunState = {
    leaderId: cultivator.id,
    dungeonId: dungeon.id,
    jobId,
    companionIds: companions.map((companion) => companion.id),
    startedAtTick: world.tick,
    deadlineTick: world.tick + dungeon.choiceTicks,
    sightingWritten: false,
    phase: "choice",
    votes: {},
    summary: dungeon.entryLine,
    report: null,
    interiorResolved: false,
    interiorVotes: {},
  };
  runsOf(world)[cultivator.id] = run;
  notePeople(world, [cultivator, ...companions], {
    kind: "find",
    title: dungeon.name,
    detail: dungeon.entryLine,
    mood: "人已经进门",
  });
  return dungeon.entryLine;
}

export function submitRegionalChoice(
  world: WorldState,
  cultivator: Cultivator,
  optionId: string,
  combatantOf: RegionalCombatantOf,
): { summary: string; done: boolean } {
  const run = findRun(world, cultivator.id);
  if (!run || run.phase !== "choice") throw new GameplayRejection("这一处没有在等你开口。");
  const dungeon = mustDungeon(run.dungeonId);
  const scene = interiorScene(run.dungeonId);
  const interiorOption = scene?.options.find((option) => option.id === optionId) ?? null;
  if (interiorOption) {
    if (run.interiorResolved) throw new GameplayRejection("旁边这一处已经看过了。");
    const present = presentCultivators(world, run);
    if (!present.some((person) => person.id === cultivator.id)) {
      throw new GameplayRejection("这一岔路不是在等你开口。");
    }
    if (present.length <= 1) {
      applyInteriorChoice(world, run, interiorOption);
      return { summary: interiorOption.line, done: false };
    }
    run.interiorVotes = { ...(run.interiorVotes ?? {}), [cultivator.id]: optionId };
    const needed = votesNeeded(present.length);
    const tally = new Map<string, number>();
    for (const person of present) {
      const vote = run.interiorVotes[person.id];
      if (!vote) continue;
      tally.set(vote, (tally.get(vote) ?? 0) + 1);
    }
    const winner = [...tally.entries()].find(([, count]) => count >= needed);
    if (!winner) return { summary: `${cultivator.name}先看了看旁边。`, done: false };
    const chosen = scene?.options.find((option) => option.id === winner[0]) ?? interiorOption;
    applyInteriorChoice(world, run, chosen);
    return { summary: chosen.line, done: false };
  }
  if (!dungeon.options.some((option) => option.id === optionId)) {
    throw new GameplayRejection("这个选择不在当前岔路上。");
  }
  const present = presentCultivators(world, run);
  if (!present.some((person) => person.id === cultivator.id)) {
    throw new GameplayRejection("这一岔路不是在等你开口。");
  }
  run.votes[cultivator.id] = optionId;
  const needed = votesNeeded(present.length);
  const tally = new Map<string, number>();
  for (const person of present) {
    const vote = run.votes[person.id];
    if (!vote) continue;
    tally.set(vote, (tally.get(vote) ?? 0) + 1);
  }
  const winner = [...tally.entries()].find(([, count]) => count >= needed);
  if (!winner) {
    return { summary: `${cultivator.name}把这一岔的话放了下来。`, done: false };
  }
  applyOption(world, run, winner[0], combatantOf, false);
  return { summary: run.summary, done: phaseNow(run) === "resolved" };
}

export function leaveRegionalRun(world: WorldState, cultivator: Cultivator): string {
  const run = runsOf(world)[cultivator.id];
  if (!run || run.phase === "resolved") throw new GameplayRejection("人没有在州府秘境里。");
  applyLeave(world, run);
  return run.summary;
}

export function releaseRegionalJob(world: WorldState, cultivator: Cultivator): void {
  const jobId = cultivator.activeJobId;
  if (jobId) {
    const job = world.jobs[jobId];
    if (job && String(job.actionId).startsWith("enter-regional:")) {
      delete world.jobs[jobId];
      cultivator.activeJobId = null;
    }
  }
  const run = findRun(world, cultivator.id);
  if (run?.phase === "resolved") delete runsOf(world)[run.leaderId];
}

export function tickRegionalRun(
  world: WorldState,
  job: { cultivatorId: string; id: string; actionId: string; remainingTicks: number },
  combatantOf: RegionalCombatantOf,
): void {
  const run = runsOf(world)[job.cultivatorId];
  if (!run || run.jobId !== job.id) return;
  if (run.phase === "resolved") {
    job.remainingTicks = 0;
    return;
  }
  if (!run.sightingWritten && world.tick > run.startedAtTick) writeSighting(world, run);
  if (run.phase === "choice" && world.tick >= run.deadlineTick) {
    const dungeon = mustDungeon(run.dungeonId);
    applyOption(world, run, safeOption(dungeon).id, combatantOf, false);
    if (phaseNow(run) === "resolved") job.remainingTicks = 0;
  }
}

export function completeRegionalJob(
  world: WorldState,
  cultivator: Cultivator,
  job: { id: string },
  combatantOf: RegionalCombatantOf,
): string {
  const run = runsOf(world)[cultivator.id];
  if (!run || run.jobId !== job.id) return `${cultivator.name}从秘境里出来了。`;
  if (run.phase === "choice") {
    const dungeon = mustDungeon(run.dungeonId);
    applyOption(world, run, safeOption(dungeon).id, combatantOf, true);
  } else if (run.phase === "vigil") {
    const dungeon = mustDungeon(run.dungeonId);
    const sitting = dungeon.options.find((option) => option.kind === "vigil") ?? safeOption(dungeon);
    finishSettle(world, run, dungeon, sitting, null);
  }
  const summary = run.summary;
  delete runsOf(world)[cultivator.id];
  return summary;
}

function placeView(world: WorldState, cultivator: Cultivator, dungeon: RegionalDungeonDef): RegionalPlaceView {
  const block = entryBlock(world, cultivator, dungeon);
  const until = cultivator.regionalCooldowns?.[dungeon.id] ?? 0;
  const tide = dungeon.tide ? tideWindow(world.tick) : null;
  const open = block === null;
  return {
    id: dungeon.id,
    name: dungeon.name,
    stateName: stateName(world, dungeon.stateId, cultivator.locationId),
    band: dungeon.band,
    minRealm: dungeon.minRealm,
    mechanic: dungeon.mechanic,
    advice: dungeon.advice,
    signatureName: dungeon.signatureName,
    signatureUse: dungeon.signatureUse,
    bossName: dungeon.bossName,
    bossMove: dungeon.bossMove,
    open,
    lockReason: open ? null : block,
    cooldownUntilTick: until > world.tick ? until : null,
    opensAtTick: tide && !tide.open ? tide.opensAt : null,
    actionId: open ? `enter-regional:${dungeon.id}` : null,
    party: dungeon.party,
  };
}

export function viewRegionalDungeons(world: WorldState, cultivator: Cultivator): RegionalDungeonsView {
  const places = DUNGEONS
    .filter((dungeon) => canStand(dungeon, cultivator.locationId))
    .map((dungeon) => placeView(world, cultivator, dungeon));
  const run = findRun(world, cultivator.id);
  const dungeon = run ? dungeonOf(run.dungeonId) : null;
  const leader = run ? world.cultivators[run.leaderId] : null;
  const active = run && dungeon && leader && run.phase !== "resolved"
    ? {
      dungeonId: dungeon.id,
      name: dungeon.name,
      leaderId: leader.id,
      leaderName: leader.name,
      phase: run.phase,
      stepLine: run.phase === "vigil"
        ? `${dungeon.name}里还坐着。时辰没到，灰不落。`
        : run.interiorResolved
          ? `${dungeon.prompt}人已经在里面。`
          : `${dungeon.prompt}${interiorScene(dungeon.id)?.prompt ?? ""}人已经在里面。`,
      safeOptionId: run.phase === "choice" ? safeOption(dungeon).id : null,
      awaitingNames: run.phase === "choice"
        ? presentCultivators(world, run).filter((person) => !run.votes[person.id]).map((person) => person.name)
        : [],
      options: run.phase === "choice"
        ? dungeon.options.map((option) => ({
          optionId: option.id,
          label: option.label,
          description: option.description,
        }))
        : [],
      interior: run.phase === "choice" && !run.interiorResolved && interiorScene(dungeon.id)
        ? {
          prompt: interiorScene(dungeon.id)!.prompt,
          safeOptionId: interiorSafe(dungeon.id)?.id ?? "",
          options: interiorScene(dungeon.id)!.options.map((option) => ({
            optionId: option.id,
            label: option.label,
            description: option.description,
          })),
        }
        : null,
    }
    : null;
  const names = places.map((place) => place.name);
  const advice = names.length === 0
    ? ""
    : names.length === 1
      ? places[0]!.advice
      : `${names.join("、")}都能从这里看见。进哪一处，读那一条的规矩。`;
  return {
    advice,
    places,
    active,
    lastReport: cultivator.regionalReport ?? null,
  };
}

export function listRegionalEnterActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  if (cultivator.activeJobId) return [];
  return DUNGEONS
    .filter((dungeon) => canStand(dungeon, cultivator.locationId) && entryBlock(world, cultivator, dungeon) === null)
    .map((dungeon) => ({
      actionId: `enter-regional:${dungeon.id}` as ActionId,
      label: `进${dungeon.name}`,
      description: dungeon.advice,
      durationTicks: dungeon.durationTicks,
      kind: "timed" as const,
    }));
}

export function listRegionalChoiceActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const run = findRun(world, cultivator.id);
  if (!run || run.phase === "resolved") return [];
  const dungeon = dungeonOf(run.dungeonId);
  if (!dungeon) return [];
  const actions: AvailableAction[] = [];
  if (run.phase === "choice" && presentCultivators(world, run).some((person) => person.id === cultivator.id)) {
    const scene = run.interiorResolved ? null : interiorScene(dungeon.id);
    for (const option of scene?.options ?? []) {
      actions.push({
        actionId: `regional-choice:${option.id}` as ActionId,
        label: `${dungeon.name}：${option.label}`,
        description: `${scene?.prompt ?? ""}${option.description}`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
    for (const option of dungeon.options) {
      actions.push({
        actionId: `regional-choice:${option.id}` as ActionId,
        label: `${dungeon.name}：${option.label}`,
        description: `${dungeon.prompt}${option.description}`,
        durationTicks: 0,
        kind: "immediate",
      });
    }
  }
  if (run.leaderId === cultivator.id) {
    actions.push({
      actionId: "leave-regional",
      label: `退出${dungeon.name}`,
      description: dungeon.leaveLine,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  return actions;
}

export function regionalGuidanceHint(
  world: WorldState,
  cultivator: Cultivator,
): { priority: string; actionId: ActionId } | null {
  const open = DUNGEONS.find((dungeon) => canStand(dungeon, cultivator.locationId) && entryBlock(world, cultivator, dungeon) === null);
  if (!open) return null;
  return {
    priority: open.advice,
    actionId: `enter-regional:${open.id}` as ActionId,
  };
}

export function takeRegionalMeditationAid(
  cultivator: Cultivator,
): { name: string; bonus: number; syncWound: boolean } | null {
  if (cultivator.realmProgress >= 100) return null;
  const band = realmBand(cultivator.realmLevel);
  if (!band) return null;
  const aid = MEDITATION_AIDS.find((entry) => entry.band === band && (cultivator.inventory[entry.itemId] ?? 0) > 0);
  if (!aid) return null;
  cultivator.inventory[aid.itemId] = (cultivator.inventory[aid.itemId] ?? 0) - 1;
  if (aid.spirit) {
    cultivator.spiritualPower = Math.min(cultivator.maxSpiritualPower, cultivator.spiritualPower + aid.spirit);
  }
  let syncWound = false;
  if (aid.injury && cultivator.injuryTicksRemaining > 0) {
    cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining - aid.injury);
    syncWound = true;
  }
  if (aid.reputation) addReputation(cultivator, stateOf(cultivator.locationId), 1);
  return { name: aid.name, bonus: aid.bonus, syncWound };
}

export function regionalCraftStoneCost(cultivator: Cultivator, cost: number): number {
  if (cost <= 0) return cost;
  if ((cultivator.inventory["cloud-plank-fiber"] ?? 0) <= 0) return cost;
  return Math.max(1, Math.floor(cost * 0.8));
}

export function spendRegionalCraftFiber(cultivator: Cultivator, baseCost: number, charged: number): void {
  if (charged >= baseCost) return;
  if ((cultivator.inventory["cloud-plank-fiber"] ?? 0) <= 0) return;
  cultivator.inventory["cloud-plank-fiber"] -= 1;
}

export function regionalCatalog(): ReadonlyArray<{
  id: string;
  stateId: string | null;
  name: string;
  band: string;
  minRealm: number;
  mechanic: string;
  signatureName: string;
  where: RegionalDungeonDef["where"];
}> {
  return DUNGEONS.map((dungeon) => ({
    id: dungeon.id,
    stateId: dungeon.stateId,
    name: dungeon.name,
    band: dungeon.band,
    minRealm: dungeon.minRealm,
    mechanic: dungeon.mechanic,
    signatureName: dungeon.signatureName,
    where: dungeon.where,
  }));
}
