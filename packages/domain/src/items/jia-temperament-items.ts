import type { ItemDefinition } from "../model.js";
import { JIA_TEMPERAMENT_LOOT } from "../jia-temperament.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type TemperamentItemId = (typeof JIA_TEMPERAMENT_LOOT)[keyof typeof JIA_TEMPERAMENT_LOOT]["itemId"];

const COPY: Record<TemperamentItemId, { name: string; nameEn: string; description: string; descriptionEn: string }> = {
  "danxia-cinder": {
    name: "丹霞余砂",
    nameEn: "Danxia Cinder",
    description: "丹霞炉壁上刮下来的一撮余砂。甲级沾了丹霞这一池，撤出或走完时才会进袋子。坊市不收，也不能代替丹霞露。",
    descriptionEn: "Cinder scraped from a Danxia wall. It enters the bag when a Danxia-aspected 甲 run withdraws or finishes. It is not sold, and it does not replace core dew.",
  },
  "fire-poison-bead": {
    name: "火毒凝滴",
    nameEn: "Fire-Poison Bead",
    description: "石缝里凝住的一滴火毒。甲级沾了火毒这一池，撤出或走完时才会进袋子。坊市不收。",
    descriptionEn: "A bead of fire poison from a crack. It enters the bag when a fire-poison 甲 run withdraws or finishes. It is not sold.",
  },
  "array-shard": {
    name: "阵纹残片",
    nameEn: "Array Shard",
    description: "半亮的阵纹上震下来的一片。甲级沾了阵纹这一池，撤出或走完时才会进袋子。坊市不收。",
    descriptionEn: "A shard shaken off a half-lit array. It enters the bag when an array-aspected 甲 run withdraws or finishes. It is not sold.",
  },
};

function temperamentItem(itemId: TemperamentItemId): ItemDefinition {
  const copy = COPY[itemId];
  return {
    id: itemId,
    name: copy.name,
    nameByLocale: makeLocalizedText(copy.name, copy.nameEn),
    category: "material",
    description: copy.description,
    descriptionByLocale: makeLocalizedText(copy.description, copy.descriptionEn),
    baseValue: 24,
    tags: ["material", "jia-temperament"],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const JIA_TEMPERAMENT_ITEMS: Record<TemperamentItemId, ItemDefinition> = {
  "danxia-cinder": temperamentItem("danxia-cinder"),
  "fire-poison-bead": temperamentItem("fire-poison-bead"),
  "array-shard": temperamentItem("array-shard"),
};
