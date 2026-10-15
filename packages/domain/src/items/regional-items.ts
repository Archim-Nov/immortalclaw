import type { ItemDefinition, LegacyItemId } from "../model.js";
import { makeLocalizedText, MATERIAL_USE } from "./shared.js";

type RegionalItemId = Extract<
  LegacyItemId,
  | "qinglan-dew-core"
  | "tide-bell-shard"
  | "cloud-plank-fiber"
  | "old-tea-pattern"
  | "balance-stone-chip"
  | "frost-hunt-bone"
  | "scorched-thunder-core"
  | "salt-pattern-crystal"
  | "sand-seal-page"
  | "wanderer-slip"
  | "merchant-ledger"
  | "vigil-ash"
>;

function regionalMaterial(
  id: RegionalItemId,
  name: string,
  nameEn: string,
  description: string,
  descriptionEn: string,
  baseValue: number,
  tag: string,
): ItemDefinition {
  return {
    id,
    name,
    nameByLocale: makeLocalizedText(name, nameEn),
    category: "material",
    description,
    descriptionByLocale: makeLocalizedText(description, descriptionEn),
    baseValue,
    tags: ["material", "regional-dungeon", tag],
    trade: { buyBasePrice: null, sellBasePrice: null, tradableAt: "none" },
    use: MATERIAL_USE,
  };
}

export const REGIONAL_ITEMS: Record<RegionalItemId, ItemDefinition> = {
  "qinglan-dew-core": regionalMaterial(
    "qinglan-dew-core",
    "青岚露芯",
    "Qinglan Dew Core",
    "青岚药窟里接到的一滴芯。筑基闭关时按在舌下，修为多涨一点。不是丹霞露，坊市不收。",
    "A drop taken from the Qinglan herb cave. A foundation cultivator uses it while meditating. It is not core dew, and it is not sold.",
    40,
    "foundation",
  ),
  "tide-bell-shard": regionalMaterial(
    "tide-bell-shard",
    "潮钟碎片",
    "Tide Bell Shard",
    "听潮钟窟里敲下来的一块。筑基闭关时握着，灵力会回一点，修为也多涨一点。坊市不收。",
    "A shard from the tide-bell cave. Holding it during foundation meditation returns a little spirit.",
    48,
    "foundation",
  ),
  "cloud-plank-fiber": regionalMaterial(
    "cloud-plank-fiber",
    "云栈纤维",
    "Cloud Plank Fiber",
    "栈云断索上拆下来的一束。洞府炼制时用上一份，这一炉灵石少两成。用过就没了。坊市不收。",
    "Fiber from the cloud-plank break. One strand takes a fifth off the spirit stones of a single residence craft.",
    36,
    "craft",
  ),
  "old-tea-pattern": regionalMaterial(
    "old-tea-pattern",
    "旧茶纹",
    "Old Tea Pattern",
    "茶桥旧席边上揭下来的纹。金丹闭关时若没有丹霞露，用这一份，涨得少一些。坊市不收。",
    "A pattern lifted from the old tea seat. A core cultivator can meditate on it when core dew is absent.",
    90,
    "core",
  ),
  "balance-stone-chip": regionalMaterial(
    "balance-stone-chip",
    "衡石碎片",
    "Balance Stone Chip",
    "衡碑座上掉下来的一块。金丹闭关时若没有丹霞露，用这一份，修为少涨一点，这一州的名声也动一动。坊市不收。",
    "A chip from the balance stele. Meditation without core dew spends it and adds a little local standing.",
    90,
    "core",
  ),
  "frost-hunt-bone": regionalMaterial(
    "frost-hunt-bone",
    "霜猎骨",
    "Frost Hunt Bone",
    "猎霜夜巡里留下的一节骨。金丹闭关时若没有丹霞露就用它。身上有伤的话，这一坐还能把伤压下去两刻。坊市不收。",
    "A bone from the frost hunt. Core meditation can spend it, and a wound shortens by two ticks.",
    96,
    "core",
  ),
  "scorched-thunder-core": regionalMaterial(
    "scorched-thunder-core",
    "焦雷芯",
    "Scorched Thunder Core",
    "焦雷祭坛上冷却下来的一颗芯。元婴闭关时若没有养魂砂，用这一份，涨得少一些。它不是婴火莲，也不能拿去破境。坊市不收。",
    "A cooled core from the scorched altar. Nascent meditation can spend it. It does not replace an infant-fire lotus.",
    160,
    "nascent",
  ),
  "salt-pattern-crystal": regionalMaterial(
    "salt-pattern-crystal",
    "盐纹晶",
    "Salt Pattern Crystal",
    "盐风沉舶舱底的一枚晶。元婴闭关时若没有养魂砂，用这一份，涨得少一些。不是破境灵材。坊市不收。",
    "A crystal from the salt wreck. Nascent meditation can spend it. It is not a breakthrough material.",
    170,
    "nascent",
  ),
  "sand-seal-page": regionalMaterial(
    "sand-seal-page",
    "镇沙符页",
    "Sand Seal Page",
    "砂门闭关里抄下来的一页。化神闭关时若没有神纹尘，用这一页稳住一手，涨得少一些。不是神纹尘，也不能拿去破境。坊市不收。",
    "A page from the sand-gate seal. Divine meditation can spend it when spirit dust is absent.",
    220,
    "spirit",
  ),
  "wanderer-slip": regionalMaterial(
    "wanderer-slip",
    "旧洞残札",
    "Wanderer Slip",
    "散修旧洞石底下的半张札。炼气后期闭关时用一份，修为少涨一点。坊市不收。",
    "A slip from the wanderer's cave. Late qi-refining meditation can spend it.",
    16,
    "qi",
  ),
  "merchant-ledger": regionalMaterial(
    "merchant-ledger",
    "游商账页",
    "Merchant Ledger",
    "游商暗仓里递出来的一页账。金丹闭关时若没有丹霞露，用这一页，修为少涨一点，这一州的名声也动一动。坊市不收。",
    "A page from the merchant hold. Core meditation can spend it and add a little local standing.",
    70,
    "core",
  ),
  "vigil-ash": regionalMaterial(
    "vigil-ash",
    "闭关灰",
    "Vigil Ash",
    "古修闭关室里坐满时辰留下的一把灰。元婴闭关时若没有养魂砂，用这一份，涨得少一些。坊市不收。",
    "Ash from a finished vigil. Nascent meditation can spend it when nurture sand is absent.",
    150,
    "nascent",
  ),
};
