import type {
  CultivationRegistrationRecord,
  FiveElementId,
  RegistrationBehaviorAspectId,
  RegistrationCultivationMotiveId,
  RegistrationLocale,
  RegistrationSpiritRootKindId,
  RegistrationTemperamentId,
} from "./model.js";

const ELEMENT_ORDER: FiveElementId[] = ["metal", "wood", "water", "fire", "earth"];
const ELEMENT_CHARS: Record<FiveElementId, string> = {
  metal: "金",
  wood: "木",
  water: "水",
  fire: "火",
  earth: "土",
};
const ELEMENT_LABELS_EN: Record<FiveElementId, string> = {
  metal: "Metal",
  wood: "Wood",
  water: "Water",
  fire: "Fire",
  earth: "Earth",
};

const TEMPERAMENTS: Record<RegistrationTemperamentId, {
  main: FiveElementId;
  secondary: FiveElementId;
  labels: Record<RegistrationLocale, string>;
  aliases?: string[];
}> = {
  shou_jie: { main: "metal", secondary: "earth", labels: { "zh-CN": "守戒型", en: "Rulebound guardian" } },
  duan_feng: { main: "metal", secondary: "fire", labels: { "zh-CN": "断锋型", en: "Decisive edge" } },
  fu_sheng: { main: "wood", secondary: "water", labels: { "zh-CN": "扶生型", en: "Lifeward guardian" } },
  xiang_rong: { main: "wood", secondary: "fire", labels: { "zh-CN": "向荣型", en: "Growth seeker" } },
  qian_yuan: { main: "water", secondary: "earth", labels: { "zh-CN": "潜渊型", en: "Calm strategist" } },
  guan_lan: { main: "water", secondary: "wood", labels: { "zh-CN": "观澜型", en: "Patient observer" } },
  chi_xin: { main: "fire", secondary: "wood", labels: { "zh-CN": "炽心型", en: "Driven blaze" } },
  zheng_sheng: { main: "fire", secondary: "metal", labels: { "zh-CN": "争胜型", en: "Fervent duelist" } },
  zhen_yue: { main: "earth", secondary: "metal", labels: { "zh-CN": "镇岳型", en: "Resolute guardian" } },
  shou_cheng: { main: "earth", secondary: "water", labels: { "zh-CN": "守成型", en: "Measured caretaker" } },
};

const BEHAVIOR_ASPECTS: Record<RegistrationBehaviorAspectId, {
  elements: FiveElementId[];
  labels: Record<RegistrationLocale, string>;
}> = {
  metal: { elements: ["metal"], labels: { "zh-CN": "金 / 裁断", en: "Metal / Judgment" } },
  wood: { elements: ["wood"], labels: { "zh-CN": "木 / 生发", en: "Wood / Growth" } },
  water: { elements: ["water"], labels: { "zh-CN": "水 / 观势", en: "Water / Observation" } },
  fire: { elements: ["fire"], labels: { "zh-CN": "火 / 烈行", en: "Fire / Advance" } },
  earth: { elements: ["earth"], labels: { "zh-CN": "土 / 镇持", en: "Earth / Endurance" } },
  "metal-wood": { elements: ["metal", "wood"], labels: { "zh-CN": "金木 / 砺生", en: "Metal-Wood / Tempered Growth" } },
  "metal-water": { elements: ["metal", "water"], labels: { "zh-CN": "金水 / 冷鉴", en: "Metal-Water / Cold Appraisal" } },
  "metal-fire": { elements: ["metal", "fire"], labels: { "zh-CN": "金火 / 烈锋", en: "Metal-Fire / Incisive Blaze" } },
  "metal-earth": { elements: ["metal", "earth"], labels: { "zh-CN": "金土 / 守序", en: "Metal-Earth / Ordered Guard" } },
  "wood-water": { elements: ["wood", "water"], labels: { "zh-CN": "木水 / 润悟", en: "Wood-Water / Verdant Insight" } },
  "wood-fire": { elements: ["wood", "fire"], labels: { "zh-CN": "木火 / 荣焰", en: "Wood-Fire / Flourishing Blaze" } },
  "wood-earth": { elements: ["wood", "earth"], labels: { "zh-CN": "木土 / 厚培", en: "Wood-Earth / Grounded Growth" } },
  "water-fire": { elements: ["water", "fire"], labels: { "zh-CN": "水火 / 潜燃", en: "Water-Fire / Latent Flame" } },
  "water-earth": { elements: ["water", "earth"], labels: { "zh-CN": "水土 / 潜守", en: "Water-Earth / Latent Guard" } },
  "fire-earth": { elements: ["fire", "earth"], labels: { "zh-CN": "火土 / 炽垒", en: "Fire-Earth / Blazing Bastion" } },
};

const MOTIVES: Record<RegistrationCultivationMotiveId, {
  labels: Record<RegistrationLocale, string>;
  aliases?: string[];
}> = {
  "seek-longevity": { labels: { "zh-CN": "求长生", en: "Seek longevity" } },
  "prove-the-great-dao": { labels: { "zh-CN": "证大道", en: "Prove the Great Dao" } },
  "seek-truth": { labels: { "zh-CN": "求真知", en: "Seek truth" } },
  "protect-the-beloved": { labels: { "zh-CN": "护所爱", en: "Protect the beloved" } },
  "serve-the-world": { labels: { "zh-CN": "济世人", en: "Serve the world" } },
  "avenge-old-grudges": { labels: { "zh-CN": "雪旧恨", en: "Avenge old grudges" } },
  "compete-for-supremacy": { labels: { "zh-CN": "争高低", en: "Compete for supremacy" } },
  "honor-the-clan": { labels: { "zh-CN": "振门庭", en: "Honor the clan" } },
  "defy-fate": { labels: { "zh-CN": "逆天命", en: "Defy fate" } },
  "seek-freedom": { labels: { "zh-CN": "求逍遥", en: "Seek freedom" } },
};

const LEGACY_TEMPERAMENT_ALIASES: Record<string, RegistrationTemperamentId> = {
  "calm strategist": "qian_yuan",
  "patient observer": "guan_lan",
  "resolute guardian": "zhen_yue",
  "fervent duelist": "zheng_sheng",
  "measured caretaker": "shou_cheng",
};

const LEGACY_BEHAVIOR_ALIASES: Record<string, RegistrationBehaviorAspectId> = {
  "water / observation": "water",
  "fire / advance": "fire",
  "earth / endurance": "earth",
  "wood / growth": "wood",
  "metal / judgment": "metal",
};

const LEGACY_MOTIVE_ALIASES: Record<string, RegistrationCultivationMotiveId> = {
  "seek truth": "seek-truth",
  "defend kin": "protect-the-beloved",
  "challenge heaven": "defy-fate",
  "master the sword": "compete-for-supremacy",
  "preserve order": "honor-the-clan",
};

function normalizedKey(input: string) {
  return input.trim().toLowerCase();
}

function hasCjk(input: string) {
  return /[\u3400-\u9fff]/.test(input);
}

function sortedElementEntries(
  scores: Record<FiveElementId, number>,
  preferredElement: FiveElementId | null = null,
) {
  return (Object.entries(scores) as Array<[FiveElementId, number]>).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    if (preferredElement) {
      if (left[0] === preferredElement) {
        return -1;
      }
      if (right[0] === preferredElement) {
        return 1;
      }
    }
    return ELEMENT_ORDER.indexOf(left[0]) - ELEMENT_ORDER.indexOf(right[0]);
  });
}

export function registrationLocaleOf(result: CultivationRegistrationRecord["result"]): RegistrationLocale {
  if (result.label_locale === "zh-CN" || result.label_locale === "en") {
    return result.label_locale;
  }
  const joined = [
    result.core_temperament,
    result.secondary_temperament,
    result.behavior_aspect,
    result.cultivation_motive,
    result.spirit_root_result,
  ].join(" ");
  return hasCjk(joined) ? "zh-CN" : "en";
}

export function temperamentLabel(id: RegistrationTemperamentId, locale: RegistrationLocale) {
  return TEMPERAMENTS[id].labels[locale];
}

export function motiveLabel(id: RegistrationCultivationMotiveId, locale: RegistrationLocale) {
  return MOTIVES[id].labels[locale];
}

export function behaviorAspectLabel(id: RegistrationBehaviorAspectId, locale: RegistrationLocale) {
  return BEHAVIOR_ASPECTS[id].labels[locale];
}

export function resolveTemperamentId(label: string): RegistrationTemperamentId | null {
  const key = normalizedKey(label);
  if (LEGACY_TEMPERAMENT_ALIASES[key]) {
    return LEGACY_TEMPERAMENT_ALIASES[key];
  }
  for (const [id, entry] of Object.entries(TEMPERAMENTS) as Array<[RegistrationTemperamentId, typeof TEMPERAMENTS[RegistrationTemperamentId]]>) {
    if (Object.values(entry.labels).some((value) => normalizedKey(value) === key)) {
      return id;
    }
    if (Object.values(entry.labels).some((value) => label.includes(value))) {
      return id;
    }
  }
  return null;
}

export function resolveCultivationMotiveId(label: string): RegistrationCultivationMotiveId | null {
  const key = normalizedKey(label);
  if (LEGACY_MOTIVE_ALIASES[key]) {
    return LEGACY_MOTIVE_ALIASES[key];
  }
  for (const [id, entry] of Object.entries(MOTIVES) as Array<[RegistrationCultivationMotiveId, typeof MOTIVES[RegistrationCultivationMotiveId]]>) {
    if (Object.values(entry.labels).some((value) => normalizedKey(value) === key)) {
      return id;
    }
    if (Object.values(entry.labels).some((value) => label.includes(value))) {
      return id;
    }
  }
  return null;
}

export function temperamentPrimaryElement(id: RegistrationTemperamentId): FiveElementId {
  return TEMPERAMENTS[id].main;
}

export function resolveBehaviorAspectId(label: string): RegistrationBehaviorAspectId | null {
  const key = normalizedKey(label);
  if (LEGACY_BEHAVIOR_ALIASES[key]) {
    return LEGACY_BEHAVIOR_ALIASES[key];
  }
  for (const [id, entry] of Object.entries(BEHAVIOR_ASPECTS) as Array<[RegistrationBehaviorAspectId, typeof BEHAVIOR_ASPECTS[RegistrationBehaviorAspectId]]>) {
    if (Object.values(entry.labels).some((value) => normalizedKey(value) === key)) {
      return id;
    }
  }
  return null;
}

export function deriveBehaviorAspectId(
  scores: Record<FiveElementId, number>,
  preferredElement: FiveElementId | null = null,
): RegistrationBehaviorAspectId {
  const sorted = sortedElementEntries(scores, preferredElement);
  const [first, second, third] = sorted;
  if (!first) {
    throw new Error("registration record must include behavior scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return first[0];
  }
  let pair: FiveElementId[] = [first[0], second[0]];
  if (third && second[1] === third[1] && preferredElement && preferredElement !== first[0]) {
    const tied = sorted.filter(([, score]) => score === second[1]).map(([elementId]) => elementId);
    if (tied.includes(preferredElement)) {
      pair = [first[0], preferredElement];
    }
  }
  pair = [...pair].sort((left, right) => ELEMENT_ORDER.indexOf(left) - ELEMENT_ORDER.indexOf(right));
  return `${pair[0]}-${pair[1]}` as RegistrationBehaviorAspectId;
}

export function resolveSpiritRootKindId(label: string): RegistrationSpiritRootKindId | null {
  if (label.includes("单灵根") || normalizedKey(label).includes("single root")) {
    return "single-root";
  }
  if (
    label.includes("偏灵根")
    || label.includes("双灵根")
    || normalizedKey(label).includes("biased root")
    || normalizedKey(label).includes("leaning root")
    || normalizedKey(label).includes("dual root")
  ) {
    return "dual-root";
  }
  return null;
}

export function deriveSpiritRootKindId(scores: Record<FiveElementId, number>): RegistrationSpiritRootKindId {
  const sorted = sortedElementEntries(scores);
  const [first, second] = sorted;
  if (!first) {
    throw new Error("registration record must include spirit root scores.");
  }
  if (!second || first[1] - second[1] >= 3) {
    return "single-root";
  }
  return "dual-root";
}

export function spiritRootLabel(
  kind: RegistrationSpiritRootKindId,
  scores: Record<FiveElementId, number>,
  locale: RegistrationLocale,
  preferredElement: FiveElementId | null = null,
) {
  const [first, second] = sortedElementEntries(scores, preferredElement);
  if (!first) {
    throw new Error("registration record must include spirit root scores.");
  }
  if (locale === "zh-CN") {
    if (kind === "single-root") {
      return `${ELEMENT_CHARS[first[0]]}单灵根`;
    }
    return `${ELEMENT_CHARS[first[0]]}${ELEMENT_CHARS[second?.[0] ?? first[0]]}双灵根`;
  }
  if (kind === "single-root") {
    return `${ELEMENT_LABELS_EN[first[0]]} single root`;
  }
  return `${ELEMENT_LABELS_EN[first[0]]}-${ELEMENT_LABELS_EN[second?.[0] ?? first[0]]} dual root`;
}

export function normalizeCultivationRegistrationRecord(
  record: CultivationRegistrationRecord,
): CultivationRegistrationRecord {
  const locale = registrationLocaleOf(record.result);
  const coreTemperamentId = record.result.core_temperament_id ?? resolveTemperamentId(record.result.core_temperament);
  if (!coreTemperamentId) {
    throw new Error("registration record must include a recognized core temperament id or label.");
  }
  const secondaryTemperamentId =
    record.result.secondary_temperament_id ?? resolveTemperamentId(record.result.secondary_temperament);
  if (!secondaryTemperamentId) {
    throw new Error("registration record must include a recognized secondary temperament id or label.");
  }
  const behaviorAspectId = record.result.behavior_aspect_id
    ?? resolveBehaviorAspectId(record.result.behavior_aspect)
    ?? deriveBehaviorAspectId(record.result.five_element_scores, temperamentPrimaryElement(coreTemperamentId));
  const cultivationMotiveId =
    record.result.cultivation_motive_id ?? resolveCultivationMotiveId(record.result.cultivation_motive);
  if (!cultivationMotiveId) {
    throw new Error("registration record must include a recognized cultivation motive id or label.");
  }
  const spiritRootKindId = deriveSpiritRootKindId(record.result.five_element_scores);

  return {
    ...record,
    result: {
      ...record.result,
      label_locale: locale,
      core_temperament_id: coreTemperamentId,
      core_temperament: record.result.core_temperament?.trim() || temperamentLabel(coreTemperamentId, locale),
      secondary_temperament_id: secondaryTemperamentId,
      secondary_temperament: record.result.secondary_temperament?.trim() || temperamentLabel(secondaryTemperamentId, locale),
      behavior_aspect_id: behaviorAspectId,
      behavior_aspect: record.result.behavior_aspect?.trim() || behaviorAspectLabel(behaviorAspectId, locale),
      cultivation_motive_id: cultivationMotiveId,
      cultivation_motive: record.result.cultivation_motive?.trim() || motiveLabel(cultivationMotiveId, locale),
      spirit_root_kind_id: spiritRootKindId,
      spirit_root_result: spiritRootLabel(
        spiritRootKindId,
        record.result.five_element_scores,
        locale,
        temperamentPrimaryElement(coreTemperamentId),
      ),
    },
  };
}
