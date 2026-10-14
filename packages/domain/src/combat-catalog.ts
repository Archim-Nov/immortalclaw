import type { FiveElementId, PartyRoleId, WeaponFamilyId, WeaponTypeId } from "./model.js";

/**
 * Reviewable combat catalog.
 *
 * Realms: 炼气 入门, 筑基 小成, 金丹 大成, 元婴 大圆满, 化神.
 * Weapon families already in the world: 轻快（剑、双剑、短刃、拳套）、沉重（刀、巨刀、斧、锤）、
 * 长兵（枪、戟、棍、钩镰）、柔兵（鞭、链刃、流星锤、绫）、远术（弓、弩、扇、伞）.
 * 矛 is the same arm as 枪. 杖 is the same arm as 棍. 爪 is the same arm as 拳套.
 * There is no separate 异灵根 element. A single root learns one school. A dual root learns two.
 * A spell focus outside the root still casts that school, a little weaker.
 *
 * Each family has two techniques at 入门, 小成, 大成, and 大圆满, then a family ultimate and
 * one 化神 signature per weapon type. Each element has damage plus ward, control, or heal,
 * at every band. 入门 additions need a little practice, so a brand-new cultivator still opens
 * with the older shared techniques.
 */

export type CatalogRank = "入门" | "小成" | "大成" | "大圆满" | "化神";
export type CatalogTier = 1 | 2 | 3 | 4 | 5;

const GATE: Record<CatalogRank, { level: number; tier: CatalogTier; prof: number }> = {
  入门: { level: 1, tier: 1, prof: 2 },
  小成: { level: 4, tier: 2, prof: 6 },
  大成: { level: 7, tier: 3, prof: 12 },
  大圆满: { level: 10, tier: 4, prof: 18 },
  化神: { level: 13, tier: 5, prof: 22 },
};

export interface ContentSkill {
  id: string;
  name: string;
  roles: readonly PartyRoleId[];
  channel: "weapon" | "spell";
  spiritCost: number;
  qiCost?: number;
  cooldown: number;
  target: "enemy" | "all-enemies" | "ally" | "self" | "all-allies";
  power: number;
  guardRatio?: number;
  wardRatio?: number;
  healRatio?: number;
  hitBonus?: number;
  critBonus?: number;
  slow?: boolean;
  focus?: boolean;
  shred?: number;
  summary: string;
  families?: readonly WeaponFamilyId[];
  weaponTypes?: readonly WeaponTypeId[];
  elements?: readonly FiveElementId[];
  minRealmLevel: number;
  minProficiency: number;
  minTier: CatalogTier;
  manualRank: CatalogRank;
}

type SkillSeed = Omit<ContentSkill, "minRealmLevel" | "minProficiency" | "minTier" | "manualRank">;

function skill(rank: CatalogRank, seed: SkillSeed): ContentSkill {
  const gate = GATE[rank];
  return {
    ...seed,
    manualRank: rank,
    minRealmLevel: gate.level,
    minProficiency: gate.prof,
    minTier: gate.tier,
  };
}

function family(
  rank: CatalogRank,
  id: string,
  name: string,
  familyId: WeaponFamilyId,
  roles: readonly PartyRoleId[],
  power: number,
  spirit: number,
  cooldown: number,
  summary: string,
  extra: Partial<SkillSeed> = {},
): ContentSkill {
  return skill(rank, {
    id,
    name,
    roles,
    channel: "weapon",
    spiritCost: spirit,
    cooldown,
    target: extra.target ?? (power <= 0 && (extra.wardRatio ?? 1) < 1 && extra.target === undefined ? "self" : power <= 0 ? "self" : "enemy"),
    power,
    families: [familyId],
    summary,
    ...extra,
  });
}

const QUICK: readonly ContentSkill[] = [
  family("入门", "late-quick-point", "点剑", "quick", ["dps"], 1.14, 6, 1, "练过几回的点刺。比连刺更准，单下仍然轻，不能拿来收场。", { hitBonus: 6 }),
  family("入门", "late-quick-unload", "卸力", "quick", ["guard"], 0, 4, 2, "剑身一偏，卸掉下一击的一部分。减伤一般，自己不站死。", { guardRatio: 0.62 }),
  family("小成", "late-quick-triple", "青锋三叠", "quick", ["dps"], 1.28, 10, 2, "筑基剑上的三叠。比连刺沉，灵力也更贵，不能当普攻连放。", { hitBonus: 4 }),
  family("小成", "late-quick-return", "回身刺", "quick", ["dps", "guard"], 0, 8, 2, "刺完收势，下一击轻一截。这一拍不追伤害。", { guardRatio: 0.66 }),
  family("大成", "late-quick-star", "寒星贯虹", "quick", ["dps"], 1.46, 18, 2, "金丹以后的直取。会心略高，打完要收一拍。", { critBonus: 6 }),
  family("大成", "late-quick-shadow", "分影刺", "quick", ["dps"], 1.22, 12, 2, "两道影子里只有一道是真的。命中好，伤害让给寒星。", { hitBonus: 8 }),
  family("大圆满", "late-quick-dragon", "游龙九转", "quick", ["dps"], 1.72, 30, 3, "元婴轻兵器的大式。伤高，灵力和一口气血都要付，一场放一次就该歇。", { qiCost: 4 }),
  family("大圆满", "late-quick-step", "无影步", "quick", ["guard"], 0, 16, 3, "人已经不在原来的位置。下一击打空大半，自己不输出。", { guardRatio: 0.5 }),
  family("化神", "late-quick-nine", "轻灵九变", "quick", ["dps"], 1.96, 40, 4, "化神轻兵器的收束。比寻常连刺重得多，灵力几乎见底，同一场不要再开第二式大的。", { qiCost: 8 }),
];

const HEAVY: readonly ContentSkill[] = [
  family("入门", "late-heavy-sink", "沉斩", "heavy", ["dps"], 1.22, 8, 2, "把刀压实了再斩。比劈斩省一点灵力，也没那么爆。"),
  family("入门", "late-heavy-lean", "靠山", "heavy", ["guard"], 0, 6, 2, "肩头顶住兵器，把下一击卸到地上。会把人引过来。", { guardRatio: 0.5, focus: true }),
  family("小成", "late-heavy-open", "开山势", "heavy", ["dps"], 1.34, 14, 2, "筑基重兵器把势子拉开。比劈斩沉，冷却也更长。"),
  family("小成", "late-heavy-bar", "横山架", "heavy", ["guard"], 0, 8, 2, "刀斧横在身前。减伤比守势好，这一拍不进攻。", { guardRatio: 0.42, focus: true }),
  family("大成", "late-heavy-split", "裂岳斩", "heavy", ["dps", "breaker"], 1.52, 20, 3, "金丹一斩，防势会松一点。三拍里只能认真放一次。", { shred: 0.86 }),
  family("大成", "late-heavy-arm", "震臂", "heavy", ["guard"], 0, 12, 3, "手臂上的劲压住自己的门。减伤好，人得从你这边过。", { guardRatio: 0.4, focus: true }),
  family("大圆满", "late-heavy-fall", "崩山式", "heavy", ["dps"], 1.78, 32, 3, "元婴重击。伤很高，自己也要吐一口气血，打完往往只能回到寻常一击。", { qiCost: 5 }),
  family("大圆满", "late-heavy-hold", "镇山", "heavy", ["guard"], 0, 18, 3, "人如山，下一击被压掉大半。这一拍不砍人。", { guardRatio: 0.38, focus: true }),
  family("化神", "late-heavy-sky", "镇岳开天", "heavy", ["dps"], 2.08, 46, 4, "化神重兵器的一开。这一下很重，灵力和气血都压着，一场只够开一次。", { qiCost: 10 }),
];

const POLE: readonly ContentSkill[] = [
  family("入门", "late-pole-straight", "直取", "polearm", ["dps", "breaker"], 1.14, 6, 1, "枪尖只走直线。练过以后比贯刺更准，伤害仍旧老实。", { hitBonus: 8 }),
  family("入门", "late-pole-block", "拦路", "polearm", ["control"], 0.7, 6, 2, "枪杆横出去拌人的脚。伤害薄，用来拖一拍。", { slow: true }),
  family("小成", "late-pole-rainbow", "长虹贯日", "polearm", ["dps", "breaker"], 1.26, 10, 2, "筑基长兵取直线。命中稳，爆发仍让给后面的重式。", { hitBonus: 6 }),
  family("小成", "late-pole-rail", "横栏", "polearm", ["control"], 0.62, 12, 2, "枪杆扫过面前这一排。每个人都吃不满一记，人多才值。", { target: "all-enemies", slow: true }),
  family("大成", "late-pole-dragon", "枪出如龙", "polearm", ["dps", "breaker"], 1.48, 18, 3, "金丹枪势。比贯刺破得开一些，冷却也更老实。", { shred: 0.88 }),
  family("大成", "late-pole-sweep", "卷地扫", "polearm", ["control"], 0.7, 16, 3, "枪尾贴地卷出去。全场减速，单下不负责击倒。", { target: "all-enemies", slow: true }),
  family("大圆满", "late-pole-tide", "一枪断潮", "polearm", ["dps"], 1.7, 28, 3, "元婴长兵的断势。伤高，付得出灵力才值得，连放会把自己掏空。", { qiCost: 4 }),
  family("大圆满", "late-pole-horse", "拒马", "polearm", ["guard"], 0, 14, 3, "枪横成拒。下一击被挡住一截，人也被你牵住。", { guardRatio: 0.45, focus: true }),
  family("化神", "late-pole-cloud", "天枪破云", "polearm", ["dps", "breaker"], 2.0, 42, 4, "化神枪上的一式。又直又重，灵力见底，不要拿来试探。", { qiCost: 8, hitBonus: 6 }),
];

const FLEX: readonly ContentSkill[] = [
  family("入门", "late-flex-toss", "抛索", "flexible", ["control"], 0.72, 6, 2, "软兵器先抛出去绊人。伤害让位给减速。", { slow: true }),
  family("入门", "late-flex-draw", "连抽", "flexible", ["dps"], 1.16, 6, 1, "鞭梢连着点两下。便宜，单下不高，练熟了才顺。"),
  family("小成", "late-flex-bind", "软索缠身", "flexible", ["control"], 0.8, 10, 2, "筑基把人缠住。仍然是控，不是收割。", { slow: true }),
  family("小成", "late-flex-silk", "抽丝", "flexible", ["dps"], 1.22, 10, 2, "顺着索子抽一下。介于连抽和后面的重砸之间。"),
  family("大成", "late-flex-thousand", "千丝绕", "flexible", ["control"], 0.9, 16, 2, "金丹把索抛开。人多的时候才值这一口灵力。", { slow: true }),
  family("大成", "late-flex-burst", "链暴", "flexible", ["dps"], 1.4, 16, 2, "链子甩直了砸下去。比抽丝重，冷却压着连甩。"),
  family("大圆满", "late-flex-dragon", "锁龙鞭", "flexible", ["control", "dps"], 1.35, 26, 3, "元婴软兵器既能拖住，也能打出一记。灵力和气血都要。", { qiCost: 3, slow: true }),
  family("大圆满", "late-flex-star", "星坠", "flexible", ["dps"], 1.62, 28, 3, "流星锤从顶上砸下来。伤高，三拍里只能认真来一次。", { qiCost: 4 }),
  family("化神", "late-flex-net", "天罗绞", "flexible", ["control"], 1.55, 36, 4, "化神把人锁死一拍。伤害终于跟上，一场只够绞一次。", { qiCost: 6, slow: true }),
];

const RANGE: readonly ContentSkill[] = [
  family("入门", "late-range-try", "试射", "ranged-mystic", ["dps"], 1.18, 6, 2, "先放一箭看空门。会心略高，伤害还没到穿云那一档。", { critBonus: 4 }),
  family("入门", "late-range-screen", "远障", "ranged-mystic", ["support"], 0, 6, 2, "远处丢一层薄障给同伴。只挡下一击。", { target: "ally", wardRatio: 0.78 }),
  family("小成", "late-range-feather", "落羽", "ranged-mystic", ["dps"], 1.3, 12, 2, "筑基远兵找缝。会心更高，仍要等冷却，不能连射。", { critBonus: 6 }),
  family("小成", "late-range-wall", "遥障", "ranged-mystic", ["support"], 0, 10, 2, "比远障厚一层。还是只护一个人的下一击。", { target: "ally", wardRatio: 0.7 }),
  family("大成", "late-range-cloud", "穿云箭", "ranged-mystic", ["dps"], 1.48, 18, 3, "金丹一箭取高处。比定点沉，三拍里放一次。"),
  family("大成", "late-range-canopy", "伞幕", "ranged-mystic", ["guard", "support"], 0, 12, 3, "伞面撑开，下一击被挡住一截。这一拍不射人。", { guardRatio: 0.5 }),
  family("大圆满", "late-range-fan", "断流一扇", "ranged-mystic", ["dps", "control"], 1.5, 26, 3, "元婴远术扫开对方的步子。伤害和减速都在，灵力不便宜。", { qiCost: 3, slow: true }),
  family("大圆满", "late-range-beads", "连珠", "ranged-mystic", ["dps"], 1.58, 24, 3, "三箭几乎叠在一起。比穿云箭更吃灵力，空了就亏。", { qiCost: 2, critBonus: 4 }),
  family("化神", "late-range-arc", "天弧落星", "ranged-mystic", ["dps"], 2.02, 44, 4, "化神远兵的一落。会心很高，灵力几乎用尽，空了就亏一整场的节奏。", { qiCost: 8, critBonus: 10 }),
];

function signature(
  typeId: WeaponTypeId,
  name: string,
  roles: readonly PartyRoleId[],
  power: number,
  spirit: number,
  qi: number,
  summary: string,
  extra: Partial<SkillSeed> = {},
): ContentSkill {
  return skill("化神", {
    id: `late-type-${typeId}`,
    name,
    roles,
    channel: "weapon",
    spiritCost: spirit,
    qiCost: qi,
    cooldown: 4,
    target: extra.target ?? (power <= 0 ? "self" : "enemy"),
    power,
    weaponTypes: [typeId],
    summary,
    ...extra,
  });
}

const TYPE_SIGNATURES: readonly ContentSkill[] = [
  signature("sword", "天游一剑", ["dps"], 2.12, 44, 8, "剑修到化神才压得住的一剑。比家族通式更吃这把剑，一场一剑。", { hitBonus: 6 }),
  signature("dual-swords", "双剑合璧", ["dps"], 2.02, 42, 8, "两把剑终于并成一下。总伤很高，灵力也是两把一起算的。"),
  signature("dagger", "一刺封喉", ["dps"], 2.0, 40, 7, "匕首赌在一处。会心极高，空了这一场就没有第二下。", { critBonus: 14 }),
  signature("gauntlets", "裂空拳", ["dps"], 1.9, 38, 7, "拳套到化神的贴身一拳。比贴身短打重一个境界，气血和灵力一起付。"),
  signature("saber", "刀断长河", ["dps"], 2.1, 44, 9, "刀修的化神一断。势子很重，放完这一刀，后面几拍只能用便宜的招。"),
  signature("greatsaber", "开天一刀", ["dps"], 2.14, 48, 10, "巨刀的化神一开，是兵器侧最重的单下。放完人要歇，队伍得有人补。"),
  signature("axe", "斧开天门", ["breaker", "dps"], 1.9, 42, 8, "斧修的破门一击。防势掉得厉害，自己也要付气血，一场只开一次。", { shred: 0.72 }),
  signature("hammer", "锤定乾坤", ["guard"], 0, 32, 6, "大锤顿在身前，下一击被压掉大半，火力也过来了。这一拍不砸人。", { guardRatio: 0.36, focus: true }),
  signature("spear", "枪挑日月", ["dps", "breaker"], 2.05, 42, 8, "枪修的化神直取。命中很稳，灵力见底，不要拿来试探。", { hitBonus: 8 }),
  signature("halberd", "戟镇八方", ["guard"], 0, 32, 6, "戟枝张开，人从哪边来都要先过你。减伤好，这一拍不追击。", { guardRatio: 0.38, focus: true }),
  signature("staff", "棍定山河", ["guard"], 0, 32, 6, "棍修把自家的门定住，并把火力拉过来。这一式是给队伍挡的。", { guardRatio: 0.4, focus: true }),
  signature("hook-sickle", "锁魂钩", ["breaker", "control"], 1.2, 36, 6, "钩子先开防，再拖慢一步。伤害不是主菜。", { shred: 0.78, slow: true }),
  signature("whip", "鞭锁九州", ["control"], 1.15, 34, 6, "鞭修化神把步子锁住。比长抽沉得多，一场里抽这一下就够。", { slow: true }),
  signature("chain-blade", "碎星链", ["breaker"], 1.85, 40, 8, "链刃绞开防势。比平砍重得多，灵力也重，一场一次。", { shred: 0.74 }),
  signature("meteor-hammer", "星陨", ["dps"], 2.06, 46, 9, "锤头从高处落下来。伤很高，砸空就亏掉这一场的灵力。"),
  signature("silk-ribbon", "九天绫", ["control", "support"], 0.8, 34, 6, "绫带缠住步子，再给自己留一层薄护。伤害可以忽略。", { slow: true, guardRatio: 0.7 }),
  signature("bow", "弓落星河", ["dps"], 2.08, 44, 8, "弓修的化神一箭。赌会心，灵力用尽，空了就只剩平射。", { critBonus: 12 }),
  signature("crossbow", "破关弩", ["breaker"], 1.92, 42, 8, "弩箭专打防。装填极慢，中了防势会松一大截。", { shred: 0.7 }),
  signature("fan", "扇镇风云", ["control"], 1.2, 36, 6, "扇修的化神控场。把人钉慢才是这一式的用处，灵力很贵。", { slow: true }),
  signature("umbrella", "盖世伞", ["guard", "support"], 0, 32, 6, "伞盖罩住自己和身侧。下一击轻很多，这一拍不打人。", { guardRatio: 0.42, wardRatio: 0.7, target: "all-allies" }),
];

function spell(
  rank: CatalogRank,
  id: string,
  name: string,
  element: FiveElementId,
  roles: readonly PartyRoleId[],
  power: number,
  spirit: number,
  cooldown: number,
  summary: string,
  extra: Partial<SkillSeed> = {},
): ContentSkill {
  return skill(rank, {
    id,
    name,
    roles,
    channel: "spell",
    spiritCost: spirit,
    cooldown,
    target: extra.target ?? (power <= 0 ? "ally" : "enemy"),
    power,
    elements: [element],
    summary,
    ...extra,
  });
}

const METAL: readonly ContentSkill[] = [
  spell("入门", "late-metal-needle", "金针", "metal", ["breaker"], 1.16, 8, 2, "细针找缝。破防有限，比金锋省灵力，练过才稳。", { shred: 0.9 }),
  spell("入门", "late-metal-bell", "护心钟", "metal", ["guard"], 0, 8, 2, "一口金气罩住心口。下一击轻一些，人会被你吸引。", { target: "self", guardRatio: 0.55, focus: true }),
  spell("小成", "late-metal-break", "庚金破甲", "metal", ["breaker", "dps"], 1.34, 14, 2, "金行小成。破防清楚，比金锋更吃灵力。", { shred: 0.8 }),
  spell("小成", "late-metal-bell-big", "金钟罩", "metal", ["guard"], 0, 12, 2, "钟形金罩比护心钟厚。这一拍不进攻，火力会过来。", { target: "self", guardRatio: 0.48, focus: true }),
  spell("大成", "late-metal-lock", "金锁横江", "metal", ["control"], 0.92, 16, 2, "金行大成把人锁在原处。伤害薄，减速实，用来给队友换拍子。", { slow: true }),
  spell("大成", "late-metal-spike", "锐金刺", "metal", ["dps"], 1.4, 16, 2, "一道金芒直刺。比金针狠，仍然让大圆满的刃域去收场。"),
  spell("大圆满", "late-metal-domain", "万刃金域", "metal", ["dps"], 1.74, 30, 3, "金行元婴的一片刃域。伤高，灵力见底，借来的法器还会再收一截。", { qiCost: 4 }),
  spell("大圆满", "late-metal-body", "金刚护体", "metal", ["guard", "support"], 0, 22, 3, "把金气罩到同伴身上。比护持厚，三拍里铺一次。", { wardRatio: 0.6 }),
  spell("化神", "late-metal-cut", "天金一斩", "metal", ["breaker", "dps"], 2.08, 46, 4, "金行化神的一斩。防势和血一起掉，自己的灵力和气血也空，一场只够这一下。", { qiCost: 9, shred: 0.74 }),
  spell("化神", "late-metal-still", "不动金身", "metal", ["guard"], 0, 34, 4, "人定在金身里。下一击被削掉大半，火力全到自己身上。", { target: "self", guardRatio: 0.36, focus: true, qiCost: 6 }),
];

const WOOD: readonly ContentSkill[] = [
  spell("入门", "late-wood-green", "回青", "wood", ["support"], 0, 8, 2, "枯处回一点青。比托底多补一口，仍然补不回重伤。", { healRatio: 0.08 }),
  spell("入门", "late-wood-vine", "藤绊", "wood", ["control"], 0.65, 6, 2, "一根藤绊住脚踝。伤害很低，只为了拖慢。", { slow: true }),
  spell("小成", "late-wood-wither", "枯荣术", "wood", ["support"], 0, 12, 2, "木行小成。先枯后荣，补得比回青明显，冷却也更长。", { healRatio: 0.12 }),
  spell("小成", "late-wood-sprout", "新芽", "wood", ["support"], 0, 8, 2, "一层新叶护在同伴身上。减伤有限，便宜。", { wardRatio: 0.75 }),
  spell("大成", "late-wood-forest", "森罗缠", "wood", ["control"], 0.78, 14, 2, "木行大成把藤蔓抛出去。伤害让位给缠步，给辅助换一口喘息。", { slow: true }),
  spell("大成", "late-wood-rain", "花雨", "wood", ["support"], 0, 14, 2, "细花落在全队身上，每人只挡下一击。铺得开，就不厚。", { target: "all-allies", wardRatio: 0.8 }),
  spell("大圆满", "late-wood-spring", "万木回春", "wood", ["support"], 0, 26, 3, "木行元婴的一补。回得回来，灵力很贵，一场里补一两次就该停。", { healRatio: 0.2, qiCost: 3 }),
  spell("大圆满", "late-wood-thorn", "荆棘反缚", "wood", ["control"], 1.2, 22, 3, "荆棘倒卷，既拖步子，也扎得出血。比森罗缠贵一档。", { slow: true }),
  spell("化神", "late-wood-tree", "建木生息", "wood", ["support"], 0, 38, 4, "木行化神。补上一口，再留一层薄护。灵力几乎用尽，不能当每拍的托底。", { healRatio: 0.26, wardRatio: 0.7, qiCost: 6 }),
  spell("化神", "late-wood-grove", "万木成林", "wood", ["control"], 0.72, 40, 4, "林子在脚下长开，每个敌人都慢下来。单下不重，贵在铺满。", { target: "all-enemies", slow: true, qiCost: 6 }),
];

const WATER: readonly ContentSkill[] = [
  spell("入门", "late-water-splash", "泼水", "water", ["control"], 0.7, 6, 2, "一捧水泼在步子上。伤害薄，人会慢一拍。", { slow: true }),
  spell("入门", "late-water-sip", "润喉", "water", ["support"], 0, 6, 2, "很小的一口水。比润泽还省，补得也更少。", { healRatio: 0.07 }),
  spell("小成", "late-water-tide", "寒潮", "water", ["control"], 0.86, 12, 2, "水行小成的一浪。比寒流更沉一点，仍然是拖节奏。", { slow: true }),
  spell("小成", "late-water-thread", "细流", "water", ["support"], 0, 8, 2, "细水慢补。比润喉稳，一场里可以补两次，补不回崩掉的血。", { healRatio: 0.09 }),
  spell("大成", "late-water-mirror", "镜花水月", "water", ["control"], 0.7, 14, 2, "水行大成扰了对方的眼。命中会差一截，伤害很低。", { slow: true, hitBonus: -8 }),
  spell("大成", "late-water-cover", "覆水", "water", ["support"], 0, 12, 2, "一层水膜覆在同伴身上，只挡下一击。", { wardRatio: 0.68 }),
  spell("大圆满", "late-water-sink", "弱水沉舟", "water", ["control", "dps"], 1.42, 28, 3, "水行元婴把人按进迟缓里。伤害终于像样，连放会空。", { slow: true, qiCost: 4 }),
  spell("大圆满", "late-water-rain", "甘霖", "water", ["support"], 0, 20, 3, "一场及时的雨。比细流补得多，三拍里下一次。", { healRatio: 0.16 }),
  spell("化神", "late-water-river", "天河倒卷", "water", ["dps"], 2.0, 44, 4, "水行化神的一倒。这一下很重，灵力见底，队伍里还得有人守和补。", { qiCost: 8 }),
  spell("化神", "late-water-maze", "水镜迷踪", "water", ["control"], 1.15, 36, 4, "人走进水镜里，步子和准头一起丢。伤害让位给这场乱。", { slow: true, hitBonus: -6, qiCost: 6 }),
];

const FIRE: readonly ContentSkill[] = [
  spell("入门", "late-fire-spark", "星火", "fire", ["dps"], 1.2, 8, 2, "一小团火。比激燃便宜，也远远没到真火。练熟了才稳。"),
  spell("入门", "late-fire-scorch", "灼甲", "fire", ["breaker"], 1.1, 8, 2, "火舔在防上。破得有限，用来给后面的熔甲做铺垫。", { shred: 0.9 }),
  spell("小成", "late-fire-heart", "焚心", "fire", ["dps"], 1.38, 14, 2, "火行小成。比炽焰猛一点，仍低于后面的真火。"),
  spell("小成", "late-fire-ember", "余烬", "fire", ["dps"], 1.18, 10, 2, "大火之后的余烬。便宜，用来填冷却，不要指望它收场。"),
  spell("大成", "late-fire-melt", "熔甲", "fire", ["breaker"], 1.48, 18, 3, "火行大成把防炼开。爆发让给三昧，这一式负责把壳子剥掉。", { shred: 0.78 }),
  spell("大成", "late-fire-plain", "燎原", "fire", ["dps"], 0.68, 20, 3, "火铺开。每个人都挨到，没有一个人被这一式放倒。", { target: "all-enemies" }),
  spell("大圆满", "late-fire-samadhi", "三昧真火", "fire", ["dps"], 1.86, 34, 3, "火行元婴的真火。伤很高，打完往往得回到便宜的火。", { qiCost: 5 }),
  spell("大圆满", "late-fire-furnace", "炉心", "fire", ["breaker"], 1.5, 24, 3, "炉火专烤防具。比熔甲更吃灵力，壳子掉得更厉害。", { shred: 0.8 }),
  spell("化神", "late-fire-li", "南明离火", "fire", ["dps"], 2.16, 48, 4, "火行化神的一朵离火。法术侧最重的单攻之一，一场只够放一次，放完要有人补。", { qiCost: 10 }),
  spell("化神", "late-fire-sky", "焚天", "fire", ["dps"], 0.76, 42, 4, "天被点着的那一下铺到所有人。单下比离火轻，贵在没有人站在火外面。", { target: "all-enemies", qiCost: 8 }),
];

const EARTH: readonly ContentSkill[] = [
  spell("入门", "late-earth-raise", "培土", "earth", ["support"], 0, 8, 2, "培一层薄土。补得少，再留一层很薄的护。", { healRatio: 0.06, wardRatio: 0.85 }),
  spell("入门", "late-earth-stop", "挡土", "earth", ["guard"], 0, 6, 2, "土块挡在身前。减伤一般，比守势稍好。", { target: "self", guardRatio: 0.58 }),
  spell("小成", "late-earth-thick", "厚土护", "earth", ["guard", "support"], 0, 12, 2, "土行小成给一个人加一层厚护。比护持实，不能每拍铺。", { wardRatio: 0.62 }),
  spell("小成", "late-earth-pad", "垫土", "earth", ["support"], 0, 8, 2, "脚下垫一点土，人缓过一口气。补得少，便宜。", { healRatio: 0.08 }),
  spell("大成", "late-earth-press", "山岳压", "earth", ["guard", "control"], 0.95, 16, 2, "土行大成压住对方，同时把火力引到自己身上。伤害不是重点。", { focus: true, slow: true }),
  spell("大成", "late-earth-vein", "地脉回春", "earth", ["support"], 0, 14, 2, "地脉里挤出一口生气。补一点，再留一层薄护。", { healRatio: 0.1, wardRatio: 0.8 }),
  spell("大圆满", "late-earth-dragon", "地龙翻身", "earth", ["dps", "guard"], 1.55, 28, 3, "土行元婴掀起一拍。能打，也会把人引过来。", { focus: true, qiCost: 4 }),
  spell("大圆满", "late-earth-city", "岩城", "earth", ["guard", "support"], 0, 22, 3, "一座矮墙罩住全队，每人只挡下一击。比花雨更实，也更贵。", { target: "all-allies", wardRatio: 0.62 }),
  spell("化神", "late-earth-kun", "坤元镇世", "earth", ["guard", "support"], 0, 36, 4, "土行化神给全队一层厚壁，自己站到前面。很贵，一场铺一次。", { target: "all-allies", wardRatio: 0.55, focus: true, qiCost: 6 }),
  spell("化神", "late-earth-peak", "岳镇", "earth", ["guard", "dps"], 1.6, 40, 4, "一座山压下去。能打，也会把所有火力拉到自己面前。", { focus: true, qiCost: 8 }),
];

export const CONTENT_SKILLS: readonly ContentSkill[] = [
  ...QUICK,
  ...HEAVY,
  ...POLE,
  ...FLEX,
  ...RANGE,
  ...TYPE_SIGNATURES,
  ...METAL,
  ...WOOD,
  ...WATER,
  ...FIRE,
  ...EARTH,
];

export const CATALOG_FAMILIES: readonly WeaponFamilyId[] = ["quick", "heavy", "polearm", "flexible", "ranged-mystic"];
export const CATALOG_ELEMENTS: readonly FiveElementId[] = ["metal", "wood", "water", "fire", "earth"];
