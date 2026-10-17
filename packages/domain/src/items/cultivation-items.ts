import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type CultivationItemId = Extract<
  LegacyItemId,
  "core-nourish-dew" | "nascent-nourish-sand" | "spirit-nourish-dust" | "void-nourish-mist" | "unity-nourish-dew" | "mahayana-nourish-ash"
>;

function cultivationMaterial(
  id: CultivationItemId,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  baseValue: number,
  realmTag: "core" | "nascent" | "spirit" | "void" | "unity" | "mahayana",
): ItemDefinition {
  return {
    id,
    name,
    nameByLocale: makeLocalizedText(name, nameEn),
    category: "material",
    description,
    descriptionByLocale: makeLocalizedText(description, descriptionEn),
    baseValue,
    tags: ["material", "cultivation", realmTag],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const CULTIVATION_ITEMS: Record<CultivationItemId, ItemDefinition> = {
  "core-nourish-dew": cultivationMaterial(
    "core-nourish-dew",
    "丹霞露",
    "Core Nourish Dew",
    "金丹闭关时用的露。甲级一到三层的丹霞内府会掉。手里有一份，闭关就用掉，修为涨得快一点。没有也能照常闭关。",
    "Dew used while a golden-core cultivator meditates. It drops in the Danxia treasury, ranks 1 to 3 of a 甲级 dungeon. One dose speeds that sitting. Meditation still works without it.",
    180,
    "core",
  ),
  "nascent-nourish-sand": cultivationMaterial(
    "nascent-nourish-sand",
    "养魂砂",
    "Nascent Nourish Sand",
    "元婴闭关时按在识海里的细砂。甲级四到六层的婴火莲池才有。金丹后期就能进去拿。用上一份，这一次闭关涨得更多。",
    "Fine sand a nascent-soul cultivator presses into the sea of consciousness during meditation. It drops in the infant-fire pool, 甲级 ranks 4 to 6.",
    360,
    "nascent",
  ),
  "spirit-nourish-dust": cultivationMaterial(
    "spirit-nourish-dust",
    "神纹尘",
    "Spirit Nourish Dust",
    "化神闭关时用来稳住神纹的尘。甲级七到九层的神纹天隙才出。得到元婴后期才进得去。闭关用上一份，修为会多涨一截。",
    "Dust that holds a divine pattern still during meditation. It drops in the divine rift, 甲级 ranks 7 to 9, which opens at late nascent soul.",
    520,
    "spirit",
  ),
  "void-nourish-mist": cultivationMaterial(
    "void-nourish-mist",
    "虚纹雾",
    "Void Nourish Mist",
    "炼虚闭关时用来稳住那一层空的雾。凉州和雷州的灵脉，化神后期以后去收才会分出来。手里有一份，闭关就用掉，修为涨得快一点。没有也能照常闭关。",
    "Mist that holds the empty layer still during meditation. It comes from the spirit veins of Liangzhou and Leizhou once a cultivator has reached late spirit transformation.",
    680,
    "void",
  ),
  "unity-nourish-dew": cultivationMaterial(
    "unity-nourish-dew",
    "合道露",
    "Unity Nourish Dew",
    "合体闭关时用来把两道气留在一处的露。人到了炼虚后期，同一条灵脉才会分出来。用上一份，这一次闭关涨得更多。",
    "Dew that keeps two breaths together during meditation. The same veins yield it once a cultivator has reached late void refinement.",
    820,
    "unity",
  ),
  "mahayana-nourish-ash": cultivationMaterial(
    "mahayana-nourish-ash",
    "乘风灰",
    "Mahayana Nourish Ash",
    "大乘闭关时按住余风的灰。人到了合体后期，凉州和雷州的灵脉才会分出来。闭关用上一份，修为会多涨一截。",
    "Ash that holds the leftover wind during meditation. The veins yield it once a cultivator has reached late unity.",
    960,
    "mahayana",
  ),
};
