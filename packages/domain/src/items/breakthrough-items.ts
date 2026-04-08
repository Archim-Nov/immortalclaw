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
>;

function specialMaterial(
  id: BreakthroughSpecialId,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  baseValue: number,
  realmTag: "qi" | "foundation" | "core",
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
    "九转淬炼的紫金精髓，为金丹后期修士迈向圆满的终极灵材。得之，丹品可臻极致，为日后破境奠定根基。",
    "Purple-golden marrow refined through nine turns. The ultimate material for late core-formation cultivators approaching perfection.",
    500, "core", "minor",
  ),
};
