import type { FiveElementId, PartyRoleId, WeaponFamilyId, WeaponTypeId } from "./model.js";
import type { CatalogRank, ContentSkill } from "./combat-catalog.js";

/**
 * Techniques past 化神.
 * 炼虚 opens at realm 16 and tier 6, 合体 at 19 and tier 7, 大乘 at 22 and tier 8.
 * Each weapon family and each root has two arts per band. Each of the twenty weapon
 * types keeps a signature, with the same job as its 化神 signature and a new name.
 */

type RankName = Extract<CatalogRank, "炼虚" | "合体" | "大乘">;

const GATE: Record<RankName, { level: number; tier: 6 | 7 | 8; prof: number }> = {
  炼虚: { level: 16, tier: 6, prof: 22 },
  合体: { level: 19, tier: 7, prof: 22 },
  大乘: { level: 22, tier: 8, prof: 22 },
};

type SkillExtra = Partial<Pick<
  ContentSkill,
  "qiCost" | "target" | "guardRatio" | "wardRatio" | "healRatio" | "hitBonus" | "critBonus" | "slow" | "focus" | "shred"
>>;

function art(
  rank: RankName,
  id: string,
  name: string,
  channel: "weapon" | "spell",
  roles: readonly PartyRoleId[],
  power: number,
  spirit: number,
  cooldown: number,
  summary: string,
  scope: { families?: readonly WeaponFamilyId[]; elements?: readonly FiveElementId[]; weaponTypes?: readonly WeaponTypeId[] },
  extra: SkillExtra = {},
): ContentSkill {
  const gate = GATE[rank];
  return {
    id,
    name,
    roles,
    channel,
    spiritCost: spirit,
    cooldown,
    target: extra.target ?? (power <= 0 ? "self" : "enemy"),
    power,
    summary,
    ...scope,
    ...extra,
    manualRank: rank,
    minRealmLevel: gate.level,
    minProficiency: gate.prof,
    minTier: gate.tier,
  };
}

const FAMILY: readonly ContentSkill[] = [
  art("炼虚", "void-quick-star", "虚步点星", "weapon", ["dps"], 2.32, 52, 4, "人已经不在剑尖原来的地方。这一下很准，灵力见底，一场点一次。", { families: ["quick"] }, { qiCost: 10, hitBonus: 6 }),
  art("炼虚", "void-quick-yield", "空处收势", "weapon", ["guard"], 0, 36, 4, "收势的时候人让开一寸。下一击被卸掉大半，这一拍不追。", { families: ["quick"] }, { qiCost: 6, guardRatio: 0.34 }),
  art("合体", "unity-quick-shadow", "并影三叠", "weapon", ["dps"], 2.56, 64, 4, "三道影子并成一下。比虚步更沉，放完只能回到便宜的刺。", { families: ["quick"] }, { qiCost: 12, hitBonus: 6 }),
  art("合体", "unity-quick-slip", "合身一避", "weapon", ["guard"], 0, 44, 4, "两处身形叠在一处，下一击打空大半。", { families: ["quick"] }, { qiCost: 8, guardRatio: 0.3 }),
  art("大乘", "maha-quick-nine", "渡劫九变", "weapon", ["dps"], 2.88, 78, 5, "轻兵器到大乘的收束。比化神的轻灵九变更重，一场只开这一式。", { families: ["quick"] }, { qiCost: 14, hitBonus: 8 }),
  art("大乘", "maha-quick-void", "劫外无踪", "weapon", ["guard"], 0, 52, 5, "人站在劫外那一寸。下一击几乎落空，自己也不输出。", { families: ["quick"] }, { qiCost: 10, guardRatio: 0.26 }),

  art("炼虚", "void-heavy-split", "裂虚斩", "weapon", ["dps"], 2.4, 54, 4, "刀斧劈进空处。这一下很重，灵力和气血都压着，一场只斩一次。", { families: ["heavy"] }, { qiCost: 11 }),
  art("炼虚", "void-heavy-bar", "虚岳架", "weapon", ["guard"], 0, 38, 4, "兵器架成一座空山。下一击被卸开，火力也过来了。", { families: ["heavy"] }, { qiCost: 6, guardRatio: 0.32, focus: true }),
  art("合体", "unity-heavy-fall", "并山崩", "weapon", ["dps"], 2.64, 66, 4, "两股势子并成一崩。比裂虚更沉，放完人要歇。", { families: ["heavy"] }, { qiCost: 13 }),
  art("合体", "unity-heavy-hold", "合岳镇", "weapon", ["guard"], 0, 46, 4, "人与山叠在一处。下一击被压掉大半，这一拍不砍。", { families: ["heavy"] }, { qiCost: 8, guardRatio: 0.28, focus: true }),
  art("大乘", "maha-heavy-sky", "渡岳开天", "weapon", ["dps"], 2.96, 80, 5, "重兵器到大乘的一开。比镇岳开天更重，一场只够这一下。", { families: ["heavy"] }, { qiCost: 15 }),
  art("大乘", "maha-heavy-seal", "劫外镇山", "weapon", ["guard"], 0, 54, 5, "山留在劫外。下一击几乎卸尽，火力全到自己身上。", { families: ["heavy"] }, { qiCost: 10, guardRatio: 0.24, focus: true }),

  art("炼虚", "void-pole-line", "破虚直取", "weapon", ["dps", "breaker"], 2.28, 52, 4, "枪尖只走那一条空缝。命中很稳，防势也会松一点。", { families: ["polearm"] }, { qiCost: 10, hitBonus: 8, shred: 0.82 }),
  art("炼虚", "void-pole-sweep", "虚枪扫界", "weapon", ["control"], 0.7, 40, 4, "枪尾扫过面前这一排。每个人都慢一拍，单下不负责击倒。", { families: ["polearm"] }, { qiCost: 8, target: "all-enemies", slow: true }),
  art("合体", "unity-pole-tide", "并潮断势", "weapon", ["dps"], 2.52, 64, 4, "两道枪势并成一断。伤高，连放会把自己掏空。", { families: ["polearm"] }, { qiCost: 12, hitBonus: 8 }),
  art("合体", "unity-pole-rail", "合栏一卷", "weapon", ["control"], 0.74, 48, 4, "枪杆卷过全场。人多的时候才值这一口灵力。", { families: ["polearm"] }, { qiCost: 8, target: "all-enemies", slow: true }),
  art("大乘", "maha-pole-cloud", "渡云破界", "weapon", ["dps", "breaker"], 2.84, 76, 5, "大乘枪上的一式。又直又重，灵力见底，不要拿来试探。", { families: ["polearm"] }, { qiCost: 14, hitBonus: 8, shred: 0.7 }),
  art("大乘", "maha-pole-bar", "劫外横栏", "weapon", ["control"], 0.78, 58, 5, "栏架在劫外。每个敌人都慢下来，单下仍然不重。", { families: ["polearm"] }, { qiCost: 10, target: "all-enemies", slow: true }),

  art("炼虚", "void-flex-net", "虚罗绞身", "weapon", ["control"], 1.72, 48, 4, "软兵器在空处收成一绞。步子被拖住，伤害也跟上了，一场只绞一次。", { families: ["flexible"] }, { qiCost: 8, slow: true }),
  art("炼虚", "void-flex-draw", "空索连抽", "weapon", ["dps"], 2.2, 50, 4, "索子抽直了才落下。比连抽重一个大境界，冷却压着连甩。", { families: ["flexible"] }, { qiCost: 8 }),
  art("合体", "unity-flex-lock", "并丝锁龙", "weapon", ["control"], 1.9, 60, 4, "两股丝并成一锁。人走不动，这一下也不便宜。", { families: ["flexible"] }, { qiCost: 10, slow: true }),
  art("合体", "unity-flex-fall", "合坠一砸", "weapon", ["dps"], 2.48, 62, 4, "锤头和索子叠在一处砸下来。伤高，三拍里只能认真来一次。", { families: ["flexible"] }, { qiCost: 12 }),
  art("大乘", "maha-flex-net", "劫网绞空", "weapon", ["control"], 2.1, 72, 5, "网收到劫外再绞紧。步子和退路一起没了，一场一次。", { families: ["flexible"] }, { qiCost: 12, slow: true }),
  art("大乘", "maha-flex-star", "渡星一坠", "weapon", ["dps"], 2.8, 76, 5, "流星从渡口落下来。砸空就亏掉这一场的灵力。", { families: ["flexible"] }, { qiCost: 14 }),

  art("炼虚", "void-range-arc", "虚弧贯星", "weapon", ["dps"], 2.3, 52, 4, "远兵找那一道空缝。会心很高，空了就亏一整场的节奏。", { families: ["ranged-mystic"] }, { qiCost: 10, critBonus: 10 }),
  art("炼虚", "void-range-screen", "空障遥护", "weapon", ["support"], 0, 36, 4, "远处丢一层空障给同伴。只挡下一击，比化神的远障厚。", { families: ["ranged-mystic"] }, { qiCost: 6, target: "ally", wardRatio: 0.62 }),
  art("合体", "unity-range-star", "并星一落", "weapon", ["dps"], 2.55, 64, 4, "两箭几乎叠成一落。比虚弧更吃灵力，空了就亏。", { families: ["ranged-mystic"] }, { qiCost: 12, critBonus: 12 }),
  art("合体", "unity-range-wall", "合幕张开", "weapon", ["guard"], 0, 44, 4, "伞面和扇影并成一幕。下一击被挡住一截，这一拍不射人。", { families: ["ranged-mystic"] }, { qiCost: 8, guardRatio: 0.4 }),
  art("大乘", "maha-range-arc", "渡星天弧", "weapon", ["dps"], 2.86, 78, 5, "大乘远兵的一落。会心极高，灵力用尽，后面只剩平射。", { families: ["ranged-mystic"] }, { qiCost: 14, critBonus: 14 }),
  art("大乘", "maha-range-canopy", "劫外伞幕", "weapon", ["support"], 0, 56, 5, "幕罩住身侧每一个人。每人只挡下一击，很贵，一场铺一次。", { families: ["ranged-mystic"] }, { qiCost: 10, target: "all-allies", wardRatio: 0.5 }),
];

const ELEMENT: readonly ContentSkill[] = [
  art("炼虚", "void-metal-cut", "空金断脉", "spell", ["breaker", "dps"], 2.36, 54, 4, "金行炼虚的一断。防势和血一起掉，自己的灵力也空，一场只够这一下。", { elements: ["metal"] }, { qiCost: 10, shred: 0.7 }),
  art("炼虚", "void-metal-body", "虚身不坏", "spell", ["guard"], 0, 40, 4, "人定在一层空的金身里。下一击被削掉大半，火力全到自己身上。", { elements: ["metal"] }, { qiCost: 8, guardRatio: 0.32, focus: true }),
  art("合体", "unity-metal-blade", "并金成刃", "spell", ["breaker", "dps"], 2.6, 66, 4, "两道金气并成一刃。壳子掉得更厉害，放完只能回到便宜的针。", { elements: ["metal"] }, { qiCost: 12, shred: 0.66 }),
  art("合体", "unity-metal-bell", "合身金钟", "spell", ["guard"], 0, 48, 4, "钟与人叠在一处。下一击轻很多，这一拍不进攻。", { elements: ["metal"] }, { qiCost: 8, guardRatio: 0.28, focus: true }),
  art("大乘", "maha-metal-cut", "劫金一斩", "spell", ["breaker", "dps"], 2.92, 80, 5, "金行大乘的一斩。比天金一斩更沉，一场只够这一下。", { elements: ["metal"] }, { qiCost: 14, shred: 0.6 }),
  art("大乘", "maha-metal-body", "乘风金身", "spell", ["guard"], 0, 56, 5, "金身留在风里。下一击几乎卸尽，人得从你这边过。", { elements: ["metal"] }, { qiCost: 10, guardRatio: 0.24, focus: true }),

  art("炼虚", "void-wood-green", "空木回青", "spell", ["support"], 0, 46, 4, "枯处在空里回青。补上一口，再留一层薄护，不能当每拍的托底。", { elements: ["wood"] }, { qiCost: 8, healRatio: 0.3, wardRatio: 0.64 }),
  art("炼虚", "void-wood-vine", "虚藤锁步", "spell", ["control"], 0.7, 42, 4, "藤从脚下的空处长出来。每个敌人都慢一拍，单下不重。", { elements: ["wood"] }, { qiCost: 8, target: "all-enemies", slow: true }),
  art("合体", "unity-wood-spring", "并木回春", "spell", ["support"], 0, 56, 4, "两股生气并成一口。回得更多，灵力很贵，一场里补一次就该停。", { elements: ["wood"] }, { qiCost: 10, healRatio: 0.34, wardRatio: 0.58 }),
  art("合体", "unity-wood-grove", "合林成障", "spell", ["control"], 0.72, 52, 4, "林子在两处并成一排。步子被拖住，伤害让位给这场缠。", { elements: ["wood"] }, { qiCost: 8, target: "all-enemies", slow: true }),
  art("大乘", "maha-wood-tree", "渡生一木", "spell", ["support"], 0, 68, 5, "木行大乘的一补。一口就回来，再留一层护，一场只铺这一次。", { elements: ["wood"] }, { qiCost: 12, healRatio: 0.38, wardRatio: 0.52 }),
  art("大乘", "maha-wood-forest", "劫外万林", "spell", ["control"], 0.74, 64, 5, "林子长在劫外。每个敌人都慢下来，贵在铺满。", { elements: ["wood"] }, { qiCost: 10, target: "all-enemies", slow: true }),

  art("炼虚", "void-water-river", "空潮没舟", "spell", ["dps"], 2.28, 52, 4, "水行炼虚的一潮。这一下很重，灵力见底，队伍里还得有人守。", { elements: ["water"] }, { qiCost: 10 }),
  art("炼虚", "void-water-mirror", "虚镜迷踪", "spell", ["control"], 1.28, 44, 4, "人走进一层空的水镜。步子和准头一起丢，伤害让位给这场乱。", { elements: ["water"] }, { qiCost: 8, slow: true, hitBonus: -8 }),
  art("合体", "unity-water-deep", "并水成渊", "spell", ["dps"], 2.52, 64, 4, "两股水并成一渊。比空潮更沉，连放会空。", { elements: ["water"] }, { qiCost: 12 }),
  art("合体", "unity-water-maze", "合镜乱步", "spell", ["control"], 1.42, 54, 4, "两面镜子叠在一起。人走不直，准头也差一截。", { elements: ["water"] }, { qiCost: 8, slow: true, hitBonus: -10 }),
  art("大乘", "maha-water-river", "渡河一倒", "spell", ["dps"], 2.84, 76, 5, "水行大乘的一倒。比天河倒卷更重，放完要有人补。", { elements: ["water"] }, { qiCost: 14 }),
  art("大乘", "maha-water-sky", "劫外水天", "spell", ["control"], 1.55, 66, 5, "水天连在一处。步子、准头一起乱，一场只布这一次。", { elements: ["water"] }, { qiCost: 10, slow: true, hitBonus: -12 }),

  art("炼虚", "void-fire-li", "空明离火", "spell", ["dps"], 2.44, 56, 4, "火行炼虚的一朵离火。比南明离火更吃灵力，一场只够放一次。", { elements: ["fire"] }, { qiCost: 12 }),
  art("炼虚", "void-fire-field", "虚火铺天", "spell", ["dps"], 0.74, 48, 4, "火铺在空处。每个人都挨到，没有一个人被这一式放倒。", { elements: ["fire"] }, { qiCost: 8, target: "all-enemies" }),
  art("合体", "unity-fire-true", "并火成真", "spell", ["dps"], 2.7, 68, 4, "两朵火并成一朵真火。法术侧这一档最重的单攻之一，放完要有人补。", { elements: ["fire"] }, { qiCost: 14 }),
  art("合体", "unity-fire-plain", "合焚八方", "spell", ["dps"], 0.76, 58, 4, "火从两处铺开。单下比并火轻，贵在没有人站在火外面。", { elements: ["fire"] }, { qiCost: 10, target: "all-enemies" }),
  art("大乘", "maha-fire-true", "渡劫真火", "spell", ["dps"], 3.02, 82, 5, "火行大乘的一朵真火。比空明离火更重，一场只放这一次。", { elements: ["fire"] }, { qiCost: 16 }),
  art("大乘", "maha-fire-field", "劫外焚野", "spell", ["dps"], 0.78, 70, 5, "野火烧到劫外。每个人都挨到，单下仍比真火轻。", { elements: ["fire"] }, { qiCost: 12, target: "all-enemies" }),

  art("炼虚", "void-earth-city", "空土成城", "spell", ["guard", "support"], 0, 44, 4, "土行炼虚给全队一层空城，自己站到前面。很贵，一场铺一次。", { elements: ["earth"] }, { qiCost: 8, target: "all-allies", wardRatio: 0.5, focus: true }),
  art("炼虚", "void-earth-peak", "虚岳压顶", "spell", ["guard", "dps"], 1.78, 50, 4, "一座空山压下去。能打，也会把火力拉到自己面前。", { elements: ["earth"] }, { qiCost: 10, focus: true }),
  art("合体", "unity-earth-city", "并土为城", "spell", ["guard", "support"], 0, 54, 4, "两道土脉并成一城。全队只挡下一击，自己站在城前。", { elements: ["earth"] }, { qiCost: 10, target: "all-allies", wardRatio: 0.46, focus: true }),
  art("合体", "unity-earth-peak", "合岳镇身", "spell", ["guard", "dps"], 1.95, 60, 4, "山与人叠在一处压下去。能打，也会把人引过来。", { elements: ["earth"] }, { qiCost: 12, focus: true }),
  art("大乘", "maha-earth-kun", "渡劫坤元", "spell", ["guard", "support"], 0, 66, 5, "土行大乘给全队一层厚壁。比坤元镇世更实，一场铺一次。", { elements: ["earth"] }, { qiCost: 12, target: "all-allies", wardRatio: 0.42, focus: true }),
  art("大乘", "maha-earth-peak", "劫外岳落", "spell", ["guard", "dps"], 2.15, 74, 5, "山从劫外落下来。能打，火力也全到自己面前。", { elements: ["earth"] }, { qiCost: 14, focus: true }),
];

interface SignatureSeed {
  type: WeaponTypeId;
  names: readonly [string, string, string];
  note: string;
  roles: readonly PartyRoleId[];
  power: number;
  spirit: number;
  qi: number;
  extra?: SkillExtra;
}

const SIGNATURES: readonly SignatureSeed[] = [
  { type: "sword", names: ["空游一剑", "并真一剑", "渡劫一剑"], note: "比家族通式更吃这把剑。", roles: ["dps"], power: 2.12, spirit: 44, qi: 8, extra: { hitBonus: 6 } },
  { type: "dual-swords", names: ["裂空合璧", "合真双影", "劫外合璧"], note: "两把剑并成一下，灵力按两把算。", roles: ["dps"], power: 2.02, spirit: 42, qi: 8 },
  { type: "dagger", names: ["虚处封喉", "并影一刺", "渡影封喉"], note: "赌在一处，空了这一场就没有第二下。", roles: ["dps"], power: 2, spirit: 40, qi: 7, extra: { critBonus: 14 } },
  { type: "gauntlets", names: ["碎空一拳", "合脉崩拳", "渡劫裂空"], note: "贴身的一拳，气血和灵力一起付。", roles: ["dps"], power: 1.9, spirit: 38, qi: 7 },
  { type: "saber", names: ["断空一刀", "并岳断河", "渡川一刀"], note: "势子很重，放完后面几拍只能用便宜的招。", roles: ["dps"], power: 2.1, spirit: 44, qi: 9 },
  { type: "greatsaber", names: ["开虚一刀", "合川开天", "劫外开天"], note: "兵器侧最重的单下之一，放完人要歇。", roles: ["dps"], power: 2.14, spirit: 48, qi: 10 },
  { type: "axe", names: ["裂界开山", "并山破门", "渡劫开山"], note: "专打防势，自己也要付气血。", roles: ["breaker", "dps"], power: 1.9, spirit: 42, qi: 8, extra: { shred: 0.72 } },
  { type: "hammer", names: ["镇空定势", "合岳定坤", "渡劫定锤"], note: "这一拍不砸人，火力会过来。", roles: ["guard"], power: 0, spirit: 32, qi: 6, extra: { guardRatio: 0.36, focus: true } },
  { type: "spear", names: ["破虚挑月", "并潮挑日", "渡云挑星"], note: "命中很稳，不要拿来试探。", roles: ["dps", "breaker"], power: 2.05, spirit: 42, qi: 8, extra: { hitBonus: 8 } },
  { type: "halberd", names: ["虚阙镇方", "合阙八方", "劫阙镇世"], note: "人从哪边来都要先过你。", roles: ["guard"], power: 0, spirit: 32, qi: 6, extra: { guardRatio: 0.38, focus: true } },
  { type: "staff", names: ["定空山河", "并海定棍", "渡风定河"], note: "这一式是给队伍挡的。", roles: ["guard"], power: 0, spirit: 32, qi: 6, extra: { guardRatio: 0.4, focus: true } },
  { type: "hook-sickle", names: ["空钩锁魂", "合钩牵神", "渡劫锁魂"], note: "先开防，再拖慢一步。", roles: ["breaker", "control"], power: 1.2, spirit: 36, qi: 6, extra: { shred: 0.78, slow: true } },
  { type: "whip", names: ["缠虚锁步", "并龙锁洲", "乘风锁劫"], note: "把步子锁住，一场里抽这一下就够。", roles: ["control"], power: 1.15, spirit: 34, qi: 6, extra: { slow: true } },
  { type: "chain-blade", names: ["碎空绞星", "合狩碎星", "劫外碎星"], note: "链刃绞开防势，一场一次。", roles: ["breaker"], power: 1.85, spirit: 40, qi: 8, extra: { shred: 0.74 } },
  { type: "meteor-hammer", names: ["虚坠一锤", "并坠星陨", "渡坠星河"], note: "砸空就亏掉这一场的灵力。", roles: ["dps"], power: 2.06, spirit: 46, qi: 9 },
  { type: "silk-ribbon", names: ["空纱绕身", "合元九绫", "劫纱天绫"], note: "缠住步子，再给自己留一层薄护。", roles: ["control", "support"], power: 0.8, spirit: 34, qi: 6, extra: { slow: true, guardRatio: 0.7 } },
  { type: "bow", names: ["贯虚落星", "并星落河", "渡星一箭"], note: "赌会心，空了就只剩平射。", roles: ["dps"], power: 2.08, spirit: 44, qi: 8, extra: { critBonus: 12 } },
  { type: "crossbow", names: ["裂界破关", "合工穿甲", "劫外破关"], note: "装填极慢，中了防势会松一大截。", roles: ["breaker"], power: 1.92, spirit: 42, qi: 8, extra: { shred: 0.7 } },
  { type: "fan", names: ["空纹镇风", "并阙镇云", "乘风镇劫"], note: "把人钉慢才是这一式的用处。", roles: ["control"], power: 1.2, spirit: 36, qi: 6, extra: { slow: true } },
  { type: "umbrella", names: ["虚幕盖世", "合幕护身", "渡劫天幕"], note: "罩住自己和身侧，这一拍不打人。", roles: ["guard", "support"], power: 0, spirit: 32, qi: 6, extra: { guardRatio: 0.42, wardRatio: 0.7, target: "all-allies" } },
];

const RANK_NAMES: readonly RankName[] = ["炼虚", "合体", "大乘"];
const POWER_SCALE = [1.12, 1.24, 1.38] as const;
const SPIRIT_ADD = [8, 18, 32] as const;
const QI_ADD = [2, 4, 6] as const;
const COOLDOWN = [4, 4, 5] as const;
const ID_PREFIX = ["void-type", "unity-type", "maha-type"] as const;

function rankExtra(base: SkillExtra, step: 0 | 1 | 2, power: number): SkillExtra {
  const extra: SkillExtra = { ...base };
  if (power <= 0 && extra.target === "all-allies") {
    extra.guardRatio = [0.38, 0.34, 0.3][step];
    if (extra.wardRatio !== undefined) extra.wardRatio = [0.64, 0.58, 0.52][step];
  } else if (power <= 0 && extra.guardRatio !== undefined) {
    extra.guardRatio = [0.34, 0.3, 0.26][step];
  }
  if (extra.shred !== undefined) extra.shred = Math.round(extra.shred * [0.96, 0.92, 0.88][step]! * 100) / 100;
  if (extra.hitBonus !== undefined && extra.hitBonus > 0) extra.hitBonus += [2, 4, 6][step]!;
  if (extra.hitBonus !== undefined && extra.hitBonus < 0) extra.hitBonus -= [2, 4, 6][step]!;
  if (extra.critBonus !== undefined) extra.critBonus += [2, 4, 6][step]!;
  return extra;
}

function signatureSummary(rank: RankName, name: string, note: string, power: number, extra: SkillExtra): string {
  if (power <= 0 && extra.target === "all-allies") return `${rank}的${name}罩住身侧。${note}下一击轻很多，灵力几乎用尽。`;
  if (power <= 0) return `${rank}的${name}把下一击卸掉大半。${note}这一拍不进攻。`;
  if (extra.slow && power < 1.7) return `${rank}的${name}先把步子拖住。${note}一场里用一次就够。`;
  if (extra.shred !== undefined && power < 2.2) return `${rank}的${name}专打防势。${note}一场只开一次。`;
  return `${rank}的${name}比化神那一式更沉。${note}放完只能回到便宜的招。`;
}

const TYPE_SIGNATURES: readonly ContentSkill[] = SIGNATURES.flatMap((seed) => RANK_NAMES.map((rank, step) => {
  const index = step as 0 | 1 | 2;
  const power = seed.power <= 0 ? 0 : Math.round(seed.power * POWER_SCALE[index] * 100) / 100;
  const extra = rankExtra(seed.extra ?? {}, index, seed.power);
  const name = seed.names[index]!;
  return art(
    rank,
    `${ID_PREFIX[index]}-${seed.type}`,
    name,
    "weapon",
    seed.roles,
    power,
    seed.spirit + SPIRIT_ADD[index],
    COOLDOWN[index],
    signatureSummary(rank, name, seed.note, power, extra),
    { weaponTypes: [seed.type] },
    { ...extra, qiCost: seed.qi + QI_ADD[index] },
  );
}));

export const LATER_CONTENT_SKILLS: readonly ContentSkill[] = [
  ...FAMILY,
  ...ELEMENT,
  ...TYPE_SIGNATURES,
];
