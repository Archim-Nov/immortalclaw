import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type BreakthroughGenericId = Extract<
  LegacyItemId,
  | "cloud-heart-grass"
  | "moon-dew-flower"
  | "clear-zhi-leaf"
  | "spirit-brook-bamboo"
  | "pure-heart-orchid"
  | "mist-vine"
  | "mystic-jade-stone"
  | "jade-marrow-sand"
  | "purple-palace-earth"
  | "cold-moon-crystal"
  | "still-cloud-wood"
  | "tranquil-bamboo"
  | "golden-spirit-flower"
  | "purple-celestial-leaf"
  | "star-fall-sand"
  | "moon-glory-jade"
  | "clear-mystic-wood"
  | "chaos-moss"
  | "infant-fire-lotus"
  | "nascent-jade"
  | "soul-lamp-wick"
  | "divine-thought-crystal"
  | "heaven-soul-silk"
  | "divine-pattern-stone"
>;

function genericMaterial(
  id: BreakthroughGenericId,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  baseValue: number,
  realmTag: "qi" | "foundation" | "core" | "nascent" | "spirit",
): ItemDefinition {
  return {
    id,
    name,
    nameByLocale: makeLocalizedText(name, nameEn),
    category: "material",
    description,
    descriptionByLocale: makeLocalizedText(description, descriptionEn),
    baseValue,
    tags: ["material", "breakthrough", "generic", realmTag],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const BREAKTHROUGH_GENERICS: Record<BreakthroughGenericId, ItemDefinition> = {
  // ── 练气 ──────────────────────────────────────────
  "cloud-heart-grass": genericMaterial(
    "cloud-heart-grass", "云心草", "Cloud Heart Grass",
    "生于灵气充裕的山涧旁，叶如云翳，入药可凝聚散乱灵气，是炼气期突破的基础灵草。",
    "A spiritual herb that grows near qi-rich mountain streams. Its cloud-like leaves help condense scattered qi.",
    50, "qi",
  ),
  "moon-dew-flower": genericMaterial(
    "moon-dew-flower", "月露花", "Moon Dew Flower",
    "月夜绽放的灵花，花瓣凝结月华精气，服之可净化丹田杂质，利于炼气突破。",
    "A spiritual flower blooming under moonlight, its petals condense lunar essence to purify the dantian.",
    55, "qi",
  ),
  "clear-zhi-leaf": genericMaterial(
    "clear-zhi-leaf", "清芷叶", "Clear Zhi Leaf",
    "常绿灵芝之叶，性清凉，可安定心神、疏通经脉，为炼气期修士常用突破辅材。",
    "An evergreen spirit-mushroom leaf. Its cooling nature calms the mind and opens meridians.",
    50, "qi",
  ),
  "spirit-brook-bamboo": genericMaterial(
    "spirit-brook-bamboo", "灵溪竹", "Spirit Brook Bamboo",
    "生长在灵溪畔的翠竹，吸收水灵之气而生，竹节可入药增进修士吐纳效率。",
    "Emerald bamboo nourished by spiritual streams. Its segments enhance a cultivator's breathing efficiency.",
    60, "qi",
  ),
  "pure-heart-orchid": genericMaterial(
    "pure-heart-orchid", "素心兰", "Pure Heart Orchid",
    "幽兰中的极品，花开无声却香远益清。入药可定神凝气，助修士突破中的心境稳固。",
    "The finest of orchids — blooms silently yet its fragrance carries far. Steadies the cultivator's mental state during breakthroughs.",
    60, "qi",
  ),
  "mist-vine": genericMaterial(
    "mist-vine", "凝烟藤", "Mist Vine",
    "常缠绕于古木之上，藤身若有若无如烟似雾。炼化后可使灵气凝而不散，适合炼气后期修士。",
    "Wraps around ancient trees like ethereal mist. Refined, it prevents qi from dissipating — ideal for late qi-realm cultivators.",
    65, "qi",
  ),

  // ── 筑基 ──────────────────────────────────────────
  "mystic-jade-stone": genericMaterial(
    "mystic-jade-stone", "玄英石", "Mystic Jade Stone",
    "蕴含浓郁地脉灵力的玄色宝石，可稳固灵基、强化经脉，为筑基期修士不可或缺的突破灵材。",
    "A dark gem rich in earth-vein spiritual energy. Essential for stabilizing the spiritual foundation during breakthroughs.",
    100, "foundation",
  ),
  "jade-marrow-sand": genericMaterial(
    "jade-marrow-sand", "玉髓砂", "Jade Marrow Sand",
    "极细的玉质灵砂，由地脉灵晶自然风化而成。可填补灵基裂隙，辅助筑基期修士巩固修为。",
    "Ultra-fine jade spirit sand formed from weathered earth-vein crystals. Fills spiritual foundation cracks.",
    105, "foundation",
  ),
  "purple-palace-earth": genericMaterial(
    "purple-palace-earth", "紫府土", "Purple Palace Earth",
    "传说出自上古紫府仙人洞天，土质紫润，蕴含造化之力。用于筑基突破可大幅稳定丹田。",
    "Said to originate from an ancient immortal's cave-heaven. Its purple-rich earth stabilizes the dantian during foundation breakthroughs.",
    110, "foundation",
  ),
  "cold-moon-crystal": genericMaterial(
    "cold-moon-crystal", "寒月晶", "Cold Moon Crystal",
    "于极寒之地凝结的月华精晶，性寒凉纯净，可压制筑基修士体内的杂质灵气，利于突破。",
    "Moon-essence crystallized in extreme cold. Its purity suppresses impure qi within foundation-realm cultivators.",
    120, "foundation",
  ),
  "still-cloud-wood": genericMaterial(
    "still-cloud-wood", "静云木", "Still Cloud Wood",
    "千年静云松的芯材，纹理如凝固的云纹，入药可使修士在突破时保持心湖不乱。",
    "Heartwood from a thousand-year still-cloud pine. Its cloud-patterned grain helps cultivators maintain mental clarity during breakthroughs.",
    115, "foundation",
  ),
  "tranquil-bamboo": genericMaterial(
    "tranquil-bamboo", "清宁竹", "Tranquil Bamboo",
    "清气充盈的灵竹，竹节内含沉淀纯化的地脉精气。适用于筑基期修士镇压突破时的灵力波动。",
    "Spiritual bamboo filled with purified earth-vein qi. Suppresses spiritual fluctuations during foundation-realm breakthroughs.",
    120, "foundation",
  ),

  // ── 金丹 ──────────────────────────────────────────
  "golden-spirit-flower": genericMaterial(
    "golden-spirit-flower", "金灵花", "Golden Spirit Flower",
    "传闻为天材地宝级灵花，花瓣金光隐现，内含丹元之气。金丹期修士温养丹田的珍贵灵材。",
    "A legendary spirit flower with faintly golden petals imbued with core-formation qi. Precious for nourishing the golden core.",
    200, "core",
  ),
  "purple-celestial-leaf": genericMaterial(
    "purple-celestial-leaf", "紫宸叶", "Purple Celestial Leaf",
    "紫宸古树之叶，叶脉流转紫金之色，蕴含天道韵味。可辅助金丹修士稳固丹品。",
    "Leaf of the Purple Celestial tree, its veins shimmer with purple-gold. Contains a trace of heavenly Dao that stabilizes the golden core's grade.",
    210, "core",
  ),
  "star-fall-sand": genericMaterial(
    "star-fall-sand", "星陨砂", "Star Fall Sand",
    "陨星坠入灵脉后与大地灵气融合所成的极细砂粒。金丹修士用以淬炼丹元、提升丹品。",
    "Ultra-fine sand produced when a meteorite merges with earth-vein qi. Used by core-formation cultivators to temper their golden core.",
    220, "core",
  ),
  "moon-glory-jade": genericMaterial(
    "moon-glory-jade", "月华玉", "Moon Glory Jade",
    "吸收千年月华而生的天然灵玉，内蕴清冷纯净之力。金丹高阶修士用以净化丹田火毒。",
    "Natural spirit jade formed by millennia of absorbed moonlight. Its pure, cool energy purges fire-toxins from the dantian.",
    230, "core",
  ),
  "clear-mystic-wood": genericMaterial(
    "clear-mystic-wood", "清玄木", "Clear Mystic Wood",
    "上古灵木遗珍，木质如琥珀般透亮，蕴藏深厚灵蕴。金丹期修士借其安定心魔。",
    "An ancient spirit-wood relic, amber-clear and deeply imbued with essence. Core-formation cultivators use it to subdue inner demons.",
    220, "core",
  ),
  "chaos-moss": genericMaterial(
    "chaos-moss", "混沌苔", "Chaos Moss",
    "生于灵脉交汇混沌之处的奇苔，兼具阴阳之气。金丹修士以之调和丹田阴阳失衡。",
    "Grows where spiritual veins converge in chaos, balancing yin and yang. Core-formation cultivators use it to harmonize dantian imbalances.",
    230, "core",
  ),

  // ── 元婴 ──────────────────────────────────────────
  "infant-fire-lotus": genericMaterial(
    "infant-fire-lotus", "婴火莲", "Infant Fire Lotus",
    "丹火里开出的小莲。金丹后期要拿它把那一点灵火护住，才能往元婴里送。甲级地宫四层往上才遇得到。",
    "A small lotus opened in core fire. Late golden-core cultivators use it to keep that flame intact on the way to nascent soul. It shows up in 甲级 dungeons from rank 4.",
    420, "nascent",
  ),
  "nascent-jade": genericMaterial(
    "nascent-jade", "元胎玉", "Nascent Jade",
    "温的玉，里面像有一团还没长开的胎息。破元婴和温养元婴时，拿它把那口气稳住。",
    "Warm jade with a breath that has not finished forming. It steadies the qi used to form and nurse a nascent soul.",
    440, "nascent",
  ),
  "soul-lamp-wick": genericMaterial(
    "soul-lamp-wick", "魂灯芯", "Soul Lamp Wick",
    "灯芯很细。点着以后神识不那么容易散，元婴这一段的小突破和破境都用得上。",
    "A thin wick. Once lit, it keeps divine sense from scattering through the nascent-soul steps.",
    430, "nascent",
  ),

  // ── 化神 ──────────────────────────────────────────
  "divine-thought-crystal": genericMaterial(
    "divine-thought-crystal", "神念晶", "Divine Thought Crystal",
    "神识在晶体里走了一圈才会停。元婴后期撞化神，以及化神里的小层，都要它压住念头。甲级七层往上才有。",
    "Divine sense has to circle inside the crystal before it settles. Needed from the step into spirit transformation, and found from 甲级 rank 7.",
    620, "spirit",
  ),
  "heaven-soul-silk": genericMaterial(
    "heaven-soul-silk", "天魂丝", "Heaven Soul Silk",
    "细丝看着轻，绕在识海里却沉。化神这一段用来把散开的神识收回来。",
    "The thread looks light and sits heavy in the sea of consciousness. Spirit-transformation cultivators use it to draw scattered sense back in.",
    640, "spirit",
  ),
  "divine-pattern-stone": genericMaterial(
    "divine-pattern-stone", "神纹石", "Divine Pattern Stone",
    "石头上的纹路自己在走。化神之前按不住，破境和化神里的小层都用它把纹压定。",
    "The lines on the stone move on their own. Before spirit transformation they will not hold still. The breakthrough uses the stone to set them.",
    660, "spirit",
  ),
};
