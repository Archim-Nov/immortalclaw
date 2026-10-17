import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type BreakthroughSpecialId = Extract<
  LegacyItemId,
  | "condensed-qi-dew"
  | "azure-stone-marrow"
  | "meridian-lotus-essence"
  | "foundation-spirit-amber"
  | "wind-control-crystal"
  | "nine-turn-core-sand"
  | "flowing-aurora-core"
  | "dragon-radiance-crystal"
  | "nine-turn-golden-marrow"
  | "nurture-nascent-dew"
  | "anchor-nascent-sand"
  | "shatter-nascent-lotus"
  | "divine-embryo-dew"
  | "divine-transformation-seal"
  | "void-altar-seal"
  | "void-imprint-dew"
  | "shattered-array-banner"
  | "unity-rite-slip"
  | "twin-lamp-oil"
  | "heaven-man-token"
  | "heaven-pillar-core"
  | "kalpa-platform-dust"
  | "wind-crossing-sail"
>;

function specialMaterial(
  id: BreakthroughSpecialId,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  baseValue: number,
  realmTag: "qi" | "foundation" | "core" | "nascent" | "spirit" | "void" | "unity" | "mahayana",
  categoryTag: "minor" | "major",
): ItemDefinition {
  return {
    id,
    name,
    nameByLocale: makeLocalizedText(name, nameEn),
    category: "material",
    description,
    descriptionByLocale: makeLocalizedText(description, descriptionEn),
    baseValue,
    tags: ["material", "breakthrough", "special", realmTag, categoryTag],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const BREAKTHROUGH_ITEMS: Record<BreakthroughSpecialId, ItemDefinition> = {
  // ── 练气 ──────────────────────────────────────────
  "condensed-qi-dew": specialMaterial(
    "condensed-qi-dew", "凝气清露", "Condensed Qi Dew",
    "以天然灵泉凝结而成的清透露珠，入体后可引导散乱灵气汇入丹田，为炼气前期突破中期的关键特殊灵材。",
    "Crystal-clear dew condensed from natural spirit springs. Guides scattered qi into the dantian for the first minor breakthrough.",
    100, "qi", "minor",
  ),
  "azure-stone-marrow": specialMaterial(
    "azure-stone-marrow", "青冥石髓", "Azure Stone Marrow",
    "青色灵石深处渗出的精髓液，蕴含凝练灵气之力。炼气中期突破后期时，可助修士稳固吐纳根基。",
    "Essence seeping from azure spirit stones. Stabilizes breathing foundations for mid-to-late qi condensation breakthrough.",
    120, "qi", "minor",
  ),
  "meridian-lotus-essence": specialMaterial(
    "meridian-lotus-essence", "洗脉莲心露", "Meridian Lotus Essence",
    "取自九品莲心的珍稀灵露，一滴即可洗涤经脉杂质。炼气圆满冲击筑基的必备重宝，服用后灵气贯通十二正经。",
    "Rare essence from a ninth-grade lotus heart. A single drop can cleanse meridian impurities. Essential for the major breakthrough from qi condensation to foundation establishment.",
    250, "qi", "major",
  ),

  // ── 筑基 ──────────────────────────────────────────
  "foundation-spirit-amber": specialMaterial(
    "foundation-spirit-amber", "定基灵珀", "Foundation Spirit Amber",
    "埋藏万年的灵脉琥珀，内封远古灵气精华。筑基前期突破中期时，可镇定灵基，使根基更加牢固。",
    "An ancient spirit-vein amber encasing primordial essence. Stabilizes the spiritual foundation for the first foundation-realm minor breakthrough.",
    200, "foundation", "minor",
  ),
  "wind-control-crystal": specialMaterial(
    "wind-control-crystal", "御风凝晶", "Wind Control Crystal",
    "高空灵风凝结的透明晶体，蕴含御风行气之道。筑基中期突破后期时，以之调控体内灵力运转。",
    "A transparent crystal formed from high-altitude spiritual winds. Controls qi circulation for the mid-to-late foundation breakthrough.",
    260, "foundation", "minor",
  ),
  "nine-turn-core-sand": specialMaterial(
    "nine-turn-core-sand", "九转凝丹砂", "Nine-Turn Core Sand",
    "经九次灵火淬炼的朱砂灵材，每一粒都蕴含结丹机缘。筑基圆满冲击金丹的至关重要之物，失之则丹胎难成。",
    "Cinnabar refined through nine rounds of spirit fire. Each grain holds the seed of core formation. Essential for the major breakthrough from foundation to golden core.",
    400, "foundation", "major",
  ),

  // ── 金丹 ──────────────────────────────────────────
  "flowing-aurora-core": specialMaterial(
    "flowing-aurora-core", "流霞丹英", "Flowing Aurora Core",
    "天际流霞凝成的丹状灵物，内含绚烂元气。金丹前期突破中期时，以之温养丹元，提升丹品。",
    "A pill-shaped spirit substance crystallized from flowing aurora. Nourishes the golden core for the first core-realm minor breakthrough.",
    300, "core", "minor",
  ),
  "dragon-radiance-crystal": specialMaterial(
    "dragon-radiance-crystal", "龙曜灵晶", "Dragon Radiance Crystal",
    "传说为龙族遗珍，晶体散发幽幽龙威。金丹中期突破后期时，借龙威淬炼丹品，使金丹更趋圆满。",
    "Said to be a dragon-clan remnant, this crystal radiates subtle draconic pressure. Tempers the golden core for the mid-to-late breakthrough.",
    380, "core", "minor",
  ),
  "nine-turn-golden-marrow": specialMaterial(
    "nine-turn-golden-marrow", "九转紫金髓", "Nine-Turn Golden Marrow",
    "九转淬炼的紫金精髓。金丹后期撞元婴时，靠它把丹壳打开一条缝。甲级地宫四层往上才出，坊市不卖。",
    "Purple-golden marrow refined through nine turns. Late golden-core cultivators need it to open the core on the way to nascent soul. It drops in 甲级 dungeons from rank 4 and is not sold.",
    560, "nascent", "major",
  ),
  "nurture-nascent-dew": specialMaterial(
    "nurture-nascent-dew", "养婴露", "Nurture Nascent Dew",
    "元婴前期到中期时用来喂那一点刚成形的婴。露不多，甲级四层往上的探宝和守关会掉。",
    "Used to feed a nascent soul that has only just formed, from early to mid nascent soul. It drops from 甲级 rank 4 upward.",
    480, "nascent", "minor",
  ),
  "anchor-nascent-sand": specialMaterial(
    "anchor-nascent-sand", "固婴砂", "Anchor Nascent Sand",
    "元婴中期到后期，把婴按回丹田里的细砂。没有它，这一层小突破稳不住。",
    "Fine sand that settles the nascent soul back into the dantian for the mid-to-late nascent step.",
    500, "nascent", "minor",
  ),
  "shatter-nascent-lotus": specialMaterial(
    "shatter-nascent-lotus", "破婴神莲", "Shatter Nascent Lotus",
    "元婴后期撞化神时用的莲。莲开的时候婴要碎一层壳，壳不碎就过不去。甲级七层往上才有。",
    "The lotus used when a late nascent soul breaks into spirit transformation. The shell has to crack. It drops from 甲级 rank 7.",
    780, "spirit", "major",
  ),
  "divine-embryo-dew": specialMaterial(
    "divine-embryo-dew", "神胎露", "Divine Embryo Dew",
    "化神前期到中期的露，用来把刚碎开的那层壳养稳。甲级七层往上会掉。",
    "Dew for the first minor step inside spirit transformation, once the shell has cracked. It drops from 甲级 rank 7.",
    700, "spirit", "minor",
  ),
  "divine-transformation-seal": specialMaterial(
    "divine-transformation-seal", "化神金章", "Divine Transformation Seal",
    "化神中期到后期压神识的金章。这一层小突破靠它把神识按住，不让纹路再散开。",
    "A seal that holds divine sense for the mid-to-late spirit-transformation step, so the pattern does not scatter again.",
    740, "spirit", "minor",
  ),
  "void-altar-seal": specialMaterial(
    "void-altar-seal", "炼虚金印", "Void Altar Seal",
    "化神后期立炼虚台时压在台心的金印。印不在，台立不起来。凉州和雷州的灵脉，到了化神后期才会分出来。坊市不卖。",
    "The seal pressed into the heart of the void altar. Late spirit transformation needs it, and it is not sold.",
    980, "void", "major",
  ),
  "void-imprint-dew": specialMaterial(
    "void-imprint-dew", "虚空印露", "Void Imprint Dew",
    "炼虚前期按实虚空印时用的露。印拓开以后才耗，露不在就按不实。",
    "Dew used when the void seal is pressed shut. It is spent only on the second step.",
    920, "void", "minor",
  ),
  "shattered-array-banner": specialMaterial(
    "shattered-array-banner", "碎虚阵旗", "Shattered Array Banner",
    "炼虚中期走碎虚阵时插在阵眼的旗。旗不在，阵走不完。",
    "The banner set at the eye of the shattered-void array for the mid-to-late void step.",
    940, "void", "minor",
  ),
  "unity-rite-slip": specialMaterial(
    "unity-rite-slip", "合道仪札", "Unity Rite Slip",
    "炼虚后期在宗门驻地走合道仪时展开的札。札不在，两道气并不到一处。",
    "The slip opened during the unity rite. Without it the two breaths do not meet.",
    1200, "unity", "major",
  ),
  "twin-lamp-oil": specialMaterial(
    "twin-lamp-oil", "双魂灯油", "Twin Lamp Oil",
    "合体前期点双魂灯时用的油。灯亮着收口才耗，灯灭了油还在。",
    "Oil for the twin lamps. It is spent only when the lamps are sealed while still lit.",
    1160, "unity", "minor",
  ),
  "heaven-man-token": specialMaterial(
    "heaven-man-token", "天人合符", "Heaven Man Token",
    "合体中期在宗门驻地合上的符。符不在，这一层小突破合不上。",
    "The token joined at a sect outpost for the mid-to-late unity step.",
    1180, "unity", "minor",
  ),
  "heaven-pillar-core": specialMaterial(
    "heaven-pillar-core", "天劫柱芯", "Heaven Pillar Core",
    "合体后期扶天劫柱时按在柱心的芯。芯不在，柱扶不住。坊市不卖。",
    "The core pressed into the heaven pillar. Late unity needs it, and it is not sold.",
    1480, "mahayana", "major",
  ),
  "kalpa-platform-dust": specialMaterial(
    "kalpa-platform-dust", "劫台尘", "Kalpa Platform Dust",
    "大乘前期守劫台时撒在台面上的尘。尘不在，台守不住。这一阶会成。",
    "Dust spread on the kalpa platform. The step succeeds once the dust is there.",
    1420, "mahayana", "minor",
  ),
  "wind-crossing-sail": specialMaterial(
    "wind-crossing-sail", "乘风帆", "Wind Crossing Sail",
    "大乘中期在荒野乘风时挂上的帆。风还在、帆也在，才渡得过去。帆在渡的那一步才耗。",
    "The sail hung for the wind crossing. It is spent only while the wind is still up.",
    1440, "mahayana", "minor",
  ),
};
