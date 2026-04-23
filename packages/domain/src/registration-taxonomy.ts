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
  description: Record<RegistrationLocale, string>;
  aliases?: string[];
}> = {
  shou_jie: {
    main: "metal",
    secondary: "earth",
    labels: { "zh-CN": "守戒型", en: "Rulebound guardian" },
    description: {
      "zh-CN": "守戒型的人先立边界与规矩，再决定如何行动。你重秩序、底线与可持续，宁可慢半步，也不愿把局面做乱。",
      en: "A rulebound guardian sets boundaries and standards before acting. You value order, limits, and stability, preferring a slower step over letting the situation fall into chaos.",
    },
  },
  duan_feng: {
    main: "metal",
    secondary: "fire",
    labels: { "zh-CN": "断锋型", en: "Decisive edge" },
    description: {
      "zh-CN": "断锋型的人习惯在僵局里先下刀，靠决断撕开缺口。你重时机与效率，愿意承担出手后的代价。",
      en: "A decisive edge cuts into stalemates first and forces open a path. You value timing and efficiency, and you are willing to pay the price of acting early.",
    },
  },
  fu_sheng: {
    main: "wood",
    secondary: "water",
    labels: { "zh-CN": "扶生型", en: "Lifeward guardian" },
    description: {
      "zh-CN": "扶生型的人先护住人和生机，再图后手。你擅长照看、修补与托底，让局面在压力下还能继续生长。",
      en: "A lifeward guardian protects people and living momentum before seeking advantage. You excel at supporting, repairing, and stabilizing so growth can continue under pressure.",
    },
  },
  xiang_rong: {
    main: "wood",
    secondary: "fire",
    labels: { "zh-CN": "向荣型", en: "Growth seeker" },
    description: {
      "zh-CN": "向荣型的人总会寻找继续生长的空间。你不满足于守成，更擅长把现有基础推成新的上升势头。",
      en: "A growth seeker is always looking for the next space to expand. You are not satisfied with merely preserving what exists; you push foundations into fresh momentum.",
    },
  },
  qian_yuan: {
    main: "water",
    secondary: "earth",
    labels: { "zh-CN": "潜渊型", en: "Calm strategist" },
    description: {
      "zh-CN": "潜渊型的人会先把自己藏进水下，看清局势与暗流再出手。你不急着表态，但一旦判断完成，通常比旁人更稳。",
      en: "A calm strategist stays beneath the surface first, reading the currents before acting. You do not rush to declare yourself, but once you decide, your footing is usually steadier than most.",
    },
  },
  guan_lan: {
    main: "water",
    secondary: "wood",
    labels: { "zh-CN": "观澜型", en: "Patient observer" },
    description: {
      "zh-CN": "观澜型的人习惯像看潮势一样观察变化，先辨认结构，再决定站位。你擅长长线判断、趋势感和耐心等待。",
      en: "A patient observer watches change like the tide, recognizing structure before choosing a position. You are good at long-range judgment, sensing trends, and waiting with patience.",
    },
  },
  chi_xin: {
    main: "fire",
    secondary: "wood",
    labels: { "zh-CN": "炽心型", en: "Driven blaze" },
    description: {
      "zh-CN": "炽心型的人以热意和信念驱动自己，认定之事就会全力投入。你容易点燃他人，也愿意把代价先扛在自己身上。",
      en: "A driven blaze is powered by conviction and heat. Once committed, you throw your whole self in, ignite others around you, and often shoulder the cost first.",
    },
  },
  zheng_sheng: {
    main: "fire",
    secondary: "metal",
    labels: { "zh-CN": "争胜型", en: "Fervent duelist" },
    description: {
      "zh-CN": "争胜型的人天然在意输赢与高下。你会主动争先，喜欢正面对抗，并把压力转成向前的冲劲。",
      en: "A fervent duelist naturally cares about victory and rank. You compete head-on, move to the front, and turn pressure into forward momentum.",
    },
  },
  zhen_yue: {
    main: "earth",
    secondary: "metal",
    labels: { "zh-CN": "镇岳型", en: "Resolute guardian" },
    description: {
      "zh-CN": "镇岳型的人像山一样先稳住阵脚。你擅长承压、挡线与维持秩序，是动荡局面里的压舱石。",
      en: "A resolute guardian steadies the ground like a mountain. You absorb pressure, hold the line, and preserve order when everything else starts to shake.",
    },
  },
  shou_cheng: {
    main: "earth",
    secondary: "water",
    labels: { "zh-CN": "守成型", en: "Measured caretaker" },
    description: {
      "zh-CN": "守成型的人重保存、重延续、重不出错。你更愿意把已有的一切稳稳守住，再慢慢积累下一步。",
      en: "A measured caretaker values preservation, continuity, and avoiding wasteful errors. You would rather secure what already exists and accumulate the next step gradually.",
    },
  },
};

const BEHAVIOR_ASPECTS: Record<RegistrationBehaviorAspectId, {
  elements: FiveElementId[];
  labels: Record<RegistrationLocale, string>;
  description: Record<RegistrationLocale, string>;
}> = {
  metal: {
    elements: ["metal"],
    labels: { "zh-CN": "金 / 裁断", en: "Metal / Judgment" },
    description: {
      "zh-CN": "你的行动风格偏向裁断：先分清轻重和边界，再利落地下判断。适合快速收束问题、切掉干扰。",
      en: "Your action style leans toward judgment: separate priorities and boundaries first, then decide cleanly. It is suited to narrowing problems fast and cutting away noise.",
    },
  },
  wood: {
    elements: ["wood"],
    labels: { "zh-CN": "木 / 生发", en: "Wood / Growth" },
    description: {
      "zh-CN": "你的行动风格偏向生发：先扶住萌芽，再让事情自己长出结果。适合经营关系、培育机会和长期推进。",
      en: "Your action style leans toward growth: support the first sprout and let results grow from there. It fits nurturing relationships, opportunities, and long-term progress.",
    },
  },
  water: {
    elements: ["water"],
    labels: { "zh-CN": "水 / 观势", en: "Water / Observation" },
    description: {
      "zh-CN": "你的行动风格偏向观势：先感受流向，再顺着暗流调整位置。适合侦察、等待节点和以小动换大势。",
      en: "Your action style leans toward observation: feel the flow first, then adjust with the current. It suits scouting, waiting for openings, and using small moves to shape bigger outcomes.",
    },
  },
  fire: {
    elements: ["fire"],
    labels: { "zh-CN": "火 / 烈行", en: "Fire / Advance" },
    description: {
      "zh-CN": "你的行动风格偏向烈行：认准目标后迅速推进，用动能带动局面。适合抢节奏、打突破和正面施压。",
      en: "Your action style leans toward advance: once the goal is clear, you push quickly and let momentum carry the field. It fits tempo grabs, breakthroughs, and direct pressure.",
    },
  },
  earth: {
    elements: ["earth"],
    labels: { "zh-CN": "土 / 镇持", en: "Earth / Endurance" },
    description: {
      "zh-CN": "你的行动风格偏向镇持：先稳住根基和结构，再慢慢加码。适合托底、防守和把风险压在可控范围。",
      en: "Your action style leans toward endurance: stabilize the foundation first, then add pressure gradually. It suits anchoring, defense, and keeping risk contained.",
    },
  },
  "metal-wood": {
    elements: ["metal", "wood"],
    labels: { "zh-CN": "金木 / 砺生", en: "Metal-Wood / Tempered Growth" },
    description: {
      "zh-CN": "砺生意味着先立框架再促成长。你既要求结构清晰，也愿意给潜力留出上升空间。",
      en: "Tempered Growth means establishing structure before encouraging expansion. You want clarity and order, but you still leave room for potential to rise.",
    },
  },
  "metal-water": {
    elements: ["metal", "water"],
    labels: { "zh-CN": "金水 / 冷鉴", en: "Metal-Water / Cold Appraisal" },
    description: {
      "zh-CN": "冷鉴意味着冷静观察后再精准出手。你不轻易表态，但一旦判断完成，往往切中要害。",
      en: "Cold Appraisal means staying cool, observing, and then striking with precision. You do not reveal yourself easily, but your completed judgment tends to land on the vital point.",
    },
  },
  "metal-fire": {
    elements: ["metal", "fire"],
    labels: { "zh-CN": "金火 / 烈锋", en: "Metal-Fire / Incisive Blaze" },
    description: {
      "zh-CN": "烈锋意味着锋芒和推进同时存在。你会用高压节奏逼出结果，适合在混乱中强行开路。",
      en: "Incisive Blaze combines sharpness with aggressive momentum. You force results through pressure and can carve a path straight through confusion.",
    },
  },
  "metal-earth": {
    elements: ["metal", "earth"],
    labels: { "zh-CN": "金土 / 守序", en: "Metal-Earth / Ordered Guard" },
    description: {
      "zh-CN": "守序意味着一边划边界，一边稳结构。你适合建立规矩、看守底线，并让团队不至于失控。",
      en: "Ordered Guard means drawing boundaries while holding the structure steady. You are suited to setting rules, protecting limits, and preventing collapse.",
    },
  },
  "wood-water": {
    elements: ["wood", "water"],
    labels: { "zh-CN": "木水 / 润悟", en: "Wood-Water / Verdant Insight" },
    description: {
      "zh-CN": "润悟意味着在观察中滋养变化。你擅长慢慢理解人和事，再用温和的方式把方向带出来。",
      en: "Verdant Insight means nurturing change through careful observation. You understand people and situations gradually, then guide them with a gentler hand.",
    },
  },
  "wood-fire": {
    elements: ["wood", "fire"],
    labels: { "zh-CN": "木火 / 荣焰", en: "Wood-Fire / Flourishing Blaze" },
    description: {
      "zh-CN": "荣焰意味着成长与热情互相点燃。你不仅自己会冲，还会让周围的人一起进入上升势头。",
      en: "Flourishing Blaze means growth and passion ignite one another. You do not just surge forward yourself; you pull others into the same upward current.",
    },
  },
  "wood-earth": {
    elements: ["wood", "earth"],
    labels: { "zh-CN": "木土 / 厚培", en: "Wood-Earth / Grounded Growth" },
    description: {
      "zh-CN": "厚培意味着给成长打地基。你擅长耐心铺垫，把看似微小的积累变成长期优势。",
      en: "Grounded Growth means laying deep soil beneath expansion. You are good at patient setup, turning small accumulations into lasting advantage.",
    },
  },
  "water-fire": {
    elements: ["water", "fire"],
    labels: { "zh-CN": "水火 / 潜燃", en: "Water-Fire / Latent Flame" },
    description: {
      "zh-CN": "潜燃意味着表面克制、内里灼热。你常常先压住情绪与意图，等到时机成熟再突然爆发。",
      en: "Latent Flame means restraint on the surface and heat underneath. You often suppress emotion and intent until the moment is right, then erupt all at once.",
    },
  },
  "water-earth": {
    elements: ["water", "earth"],
    labels: { "zh-CN": "水土 / 潜守", en: "Water-Earth / Latent Guard" },
    description: {
      "zh-CN": "潜守意味着一边看水势、一边稳住根基。你会先把局面守住，再从细小变化里寻找真正值得出手的时机。",
      en: "Latent Guard means reading the current while holding the ground. You secure the situation first, then act only when subtle shifts reveal a truly worthwhile opening.",
    },
  },
  "fire-earth": {
    elements: ["fire", "earth"],
    labels: { "zh-CN": "火土 / 炽垒", en: "Fire-Earth / Blazing Bastion" },
    description: {
      "zh-CN": "炽垒意味着既能冲锋也能顶住。你擅长在高压环境里维持推进，不轻易被反扑打散。",
      en: "Blazing Bastion means being able to charge and hold at once. You keep advancing under pressure and are difficult to scatter with a counterattack.",
    },
  },
};

const MOTIVES: Record<RegistrationCultivationMotiveId, {
  labels: Record<RegistrationLocale, string>;
  description: Record<RegistrationLocale, string>;
  aliases?: string[];
}> = {
  "seek-longevity": {
    labels: { "zh-CN": "求长生", en: "Seek longevity" },
    description: {
      "zh-CN": "你修行不为功名、不为权势，只为看见那些唯有漫长岁月才能揭示的风景。死亡是一道问号，而你选择用一生去拒绝它。",
      en: "You cultivate not for glory or power, but to outlast fate — to walk paths that only immortal decades can reveal and see what lies beyond an ordinary life's end.",
    },
  },
  "prove-the-great-dao": {
    labels: { "zh-CN": "证大道", en: "Prove the Great Dao" },
    description: {
      "zh-CN": "天地间必有一条法则足以解释一切——你要以自己的修行亲手证明它，而不只是追随他人的足迹。",
      en: "A single law must underlie all things — you intend to prove it with your own cultivation, not merely follow the footsteps of those who came before.",
    },
  },
  "seek-truth": {
    labels: { "zh-CN": "求真知", en: "Seek truth" },
    description: {
      "zh-CN": "你走进废墟、典籍、秘境，不是为了财富，而是为了那个更深的问题——世界究竟是如何运转的。知识本身就是你的修行。",
      en: "You enter ruins, comb through texts, and probe hidden places not for wealth, but for the deeper question: how does the world truly work? Knowledge itself is your cultivation.",
    },
  },
  "protect-the-beloved": {
    labels: { "zh-CN": "护所爱", en: "Protect the beloved" },
    description: {
      "zh-CN": "你的力量属于你在意的人。每一次突破、每一件收集的法宝，都是你为那些你愿意挡在身前的人筑起的一堵墙。",
      en: "Your strength belongs to those you love. Every breakthrough, every resource gathered, is another wall raised between them and a world that would harm them.",
    },
  },
  "serve-the-world": {
    labels: { "zh-CN": "济世人", en: "Serve the world" },
    description: {
      "zh-CN": "你看见太多无力者承受本不该由他们承受的代价。你修行，是要把这份重量挑过来——让更多人不再这么难。",
      en: "You have seen too many bear burdens that were never theirs to carry. You cultivate to shoulder that weight — so more people can stand a little easier.",
    },
  },
  "avenge-old-grudges": {
    labels: { "zh-CN": "雪旧恨", en: "Avenge old grudges" },
    description: {
      "zh-CN": "有些债不还不行。那份愤怒和悲痛从未离开，反而成了你最稳定的燃料——日日夜夜，从不熄灭。",
      en: "A debt of blood or humiliation that cannot rest. That anger never left you; it only steadied into the most reliable fuel you have — burning day and night, never going out.",
    },
  },
  "compete-for-supremacy": {
    labels: { "zh-CN": "争高低", en: "Compete for supremacy" },
    description: {
      "zh-CN": "你要站在最高处，不是因为仇恨，也不是因为使命，只是因为那个问题必须有答案：这世间谁更强？",
      en: "You need to stand at the top — not from hatred, not from duty, but because that question demands an answer: who is strongest in this world?",
    },
  },
  "honor-the-clan": {
    labels: { "zh-CN": "振门庭", en: "Honor the clan" },
    description: {
      "zh-CN": "你的名字背后有一个家，有人曾为你低头，有人曾为你受苦。你修行，是要让这份重量变成所有人都仰视的高度。",
      en: "Your name carries a family behind it — people who bowed their heads or endured hardship on your behalf. You cultivate to turn that weight into something others must look up to.",
    },
  },
  "defy-fate": {
    labels: { "zh-CN": "逆天命", en: "Defy fate" },
    description: {
      "zh-CN": "天道给你写了一个结局，而你决定把那页纸撕掉。每一次境界突破，都是你对命数的一次正面抵抗。",
      en: "Heaven wrote a fate for you — and you intend to tear that page out. Every realm breakthrough is a direct refusal, a proof that what was ordained was simply wrong.",
    },
  },
  "seek-freedom": {
    labels: { "zh-CN": "求逍遥", en: "Seek freedom" },
    description: {
      "zh-CN": "你修行，是为了欠任何人的都越来越少。没有规矩能比你的意志更高，没有天地能给你划出终点——力量，只是走向自由的代价。",
      en: "You cultivate to owe less and less to anyone. No rule may stand higher than your will, no sky may draw your finish line. Strength is simply the price of true freedom.",
    },
  },
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

const SPIRIT_ROOT_DESCRIPTIONS: Record<RegistrationSpiritRootKindId, Record<RegistrationLocale, string>> = {
  "single-root": {
    "zh-CN": "单灵根意味着一种元素明显占优，修行路线更集中，突破时更容易把力量拧成一股绳。代价是风格通常更专、更窄。",
    en: "A single root means one element clearly dominates. The cultivation path is more focused and breakthroughs gather power more cleanly, but the style is usually narrower and more specialized.",
  },
  "dual-root": {
    "zh-CN": "双灵根意味着两种元素并强，路径更灵活，转向与适应能力更强。代价是需要在两股气机之间维持平衡。",
    en: "A dual root means two elements rise together. The path is more flexible and adaptable, but it demands balance between two active currents of qi.",
  },
};

function normalizedKey(input: string) {
  return input.trim().toLowerCase();
}

function hasOwnTaxonomyId<TKey extends string>(
  table: Record<TKey, unknown>,
  id: string,
): id is TKey {
  return Object.prototype.hasOwnProperty.call(table, id);
}

function hasCjk(input: string) {
  return /[\u3400-\u9fff]/.test(input);
}

export function sortedElementEntries(
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

export function temperamentDescription(id: RegistrationTemperamentId, locale: RegistrationLocale) {
  return TEMPERAMENTS[id].description[locale];
}

export function motiveLabel(id: RegistrationCultivationMotiveId, locale: RegistrationLocale) {
  return MOTIVES[id].labels[locale];
}

export function motiveDescription(id: RegistrationCultivationMotiveId, locale: RegistrationLocale) {
  return MOTIVES[id].description[locale];
}

export function behaviorAspectLabel(id: RegistrationBehaviorAspectId, locale: RegistrationLocale) {
  return BEHAVIOR_ASPECTS[id].labels[locale];
}

export function behaviorAspectDescription(id: RegistrationBehaviorAspectId, locale: RegistrationLocale) {
  return BEHAVIOR_ASPECTS[id].description[locale];
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

export function temperamentSecondaryElement(id: RegistrationTemperamentId): FiveElementId {
  return TEMPERAMENTS[id].secondary;
}

export function behaviorAspectElements(id: RegistrationBehaviorAspectId): FiveElementId[] {
  return [...BEHAVIOR_ASPECTS[id].elements];
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

export function spiritRootDescription(kind: RegistrationSpiritRootKindId, locale: RegistrationLocale) {
  return SPIRIT_ROOT_DESCRIPTIONS[kind][locale];
}

export function normalizeCultivationRegistrationRecord(
  record: CultivationRegistrationRecord,
): CultivationRegistrationRecord {
  const locale = registrationLocaleOf(record.result);
  const coreTemperamentId = record.result.core_temperament_id
    ? hasOwnTaxonomyId(TEMPERAMENTS, record.result.core_temperament_id)
      ? record.result.core_temperament_id
      : null
    : resolveTemperamentId(record.result.core_temperament);
  if (!coreTemperamentId) {
    throw new Error("registration record must include a recognized core temperament id or label.");
  }
  const secondaryTemperamentId =
    record.result.secondary_temperament_id
      ? hasOwnTaxonomyId(TEMPERAMENTS, record.result.secondary_temperament_id)
        ? record.result.secondary_temperament_id
        : null
      : resolveTemperamentId(record.result.secondary_temperament);
  if (!secondaryTemperamentId) {
    throw new Error("registration record must include a recognized secondary temperament id or label.");
  }
  const behaviorAspectId = record.result.behavior_aspect_id
    ? hasOwnTaxonomyId(BEHAVIOR_ASPECTS, record.result.behavior_aspect_id)
      ? record.result.behavior_aspect_id
      : null
    : resolveBehaviorAspectId(record.result.behavior_aspect)
      ?? deriveBehaviorAspectId(record.result.five_element_scores, temperamentPrimaryElement(coreTemperamentId));
  if (!behaviorAspectId) {
    throw new Error("registration record must include a recognized behavior aspect id or label.");
  }
  const cultivationMotiveId =
    record.result.cultivation_motive_id
      ? hasOwnTaxonomyId(MOTIVES, record.result.cultivation_motive_id)
        ? record.result.cultivation_motive_id
        : null
      : resolveCultivationMotiveId(record.result.cultivation_motive);
  if (!cultivationMotiveId) {
    throw new Error("registration record must include a recognized cultivation motive id or label.");
  }
  const spiritRootKindId = record.result.spirit_root_kind_id
    ? (record.result.spirit_root_kind_id === "single-root" || record.result.spirit_root_kind_id === "dual-root")
      ? record.result.spirit_root_kind_id
      : null
    : deriveSpiritRootKindId(record.result.five_element_scores);
  if (!spiritRootKindId) {
    throw new Error("registration record must include a recognized spirit root kind id.");
  }

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
      spirit_root_result: record.result.spirit_root_result?.trim() || spiritRootLabel(
        spiritRootKindId,
        record.result.five_element_scores,
        locale,
        temperamentPrimaryElement(coreTemperamentId),
      ),
    },
  };
}
