import {
  computeEffectiveMainAttributes,
  createEmptyMainAttributeGrowth,
  deriveMainAttributes,
  extractFiveElementScores,
  physicalDefense,
  spellAttack,
  weaponAttack,
} from "./attributes.js";
import {
  getSpellLoadoutDefinition,
  getWeaponLoadoutDefinition,
  SPELL_BRANCH_ELEMENT_MAP,
} from "./combat-loadouts.js";
import type {
  AttackChannel,
  CombatLeaningId,
  CombatSkillView,
  Cultivator,
  FiveElementId,
  PartyRoleId,
  SpellBranchId,
  WeaponFamilyId,
  WeaponTypeId,
} from "./model.js";
import { deriveSpiritRootKindId, sortedElementEntries } from "./registration-taxonomy.js";

export const PARTY_ROLE_LABEL: Record<PartyRoleId, string> = {
  dps: "主攻",
  breaker: "破法",
  guard: "护卫",
  support: "辅助",
  control: "控场",
};

export const COMBAT_LEANING_LABEL: Record<CombatLeaningId, "兵器偏" | "法术偏" | "均衡"> = {
  weapon: "兵器偏",
  spell: "法术偏",
  balanced: "均衡",
};

/** How far the two sides must sit before a cultivator is called 兵器偏 or 法术偏. */
const LEANING_GAP = 12;

export type SkillTarget = CombatSkillView["target"];

export interface ResolvedCombatSkill {
  id: string;
  name: string;
  role: PartyRoleId;
  roles: readonly PartyRoleId[];
  channel: AttackChannel;
  spiritCost: number;
  qiCost: number;
  cooldown: number;
  target: SkillTarget;
  power: number;
  guardRatio: number;
  wardRatio: number;
  healRatio: number;
  hitBonus: number;
  critBonus: number;
  slow: boolean;
  focus: boolean;
  shred: number;
  summary: string;
  /** How this skill sits against the cultivator's leaning. Absent on hand-built fight fixtures. */
  aptitude?: "favored" | "off" | "neutral";
}

interface SkillDraft {
  id: string;
  name: string;
  roles: readonly PartyRoleId[];
  channel: AttackChannel;
  spiritCost: number;
  qiCost?: number;
  cooldown: number;
  target: SkillTarget;
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
  always?: boolean;
  families?: readonly WeaponFamilyId[];
  weaponTypes?: readonly WeaponTypeId[];
  elements?: readonly FiveElementId[];
  branches?: readonly SpellBranchId[];
}

const SHARED_SKILLS: readonly SkillDraft[] = [
  {
    id: "basic-strike",
    name: "寻常一击",
    roles: ["dps", "breaker"],
    channel: "weapon",
    spiritCost: 0,
    cooldown: 0,
    target: "enemy",
    power: 1,
    summary: "不耗灵力的普通一击，稳，但没有额外效果。",
    always: true,
  },
  {
    id: "stored-strike",
    name: "蓄力",
    roles: ["dps"],
    channel: "weapon",
    spiritCost: 8,
    cooldown: 2,
    target: "enemy",
    power: 1.3,
    summary: "把一口气压进下一击。伤害更高，冷却也更长，不适合连放。",
    always: true,
  },
  {
    id: "guard-stance",
    name: "守势",
    roles: ["guard"],
    channel: "weapon",
    spiritCost: 0,
    cooldown: 1,
    target: "self",
    power: 0,
    guardRatio: 0.5,
    focus: true,
    summary: "这一拍不进攻，接下来吃到的第一击减半，并把敌人的注意引过来。",
    always: true,
  },
  {
    id: "short-step",
    name: "垫步",
    roles: ["guard"],
    channel: "weapon",
    spiritCost: 0,
    cooldown: 0,
    target: "self",
    power: 0,
    guardRatio: 0.72,
    summary: "随手一挡，每拍都能用，减伤比守势差一截。",
    always: true,
  },
  {
    id: "shared-ward",
    name: "护持",
    roles: ["support"],
    channel: "spell",
    spiritCost: 6,
    cooldown: 2,
    target: "ally",
    power: 0,
    wardRatio: 0.75,
    summary: "给一个人加一层薄护，下一击轻一些。",
    always: true,
  },
  {
    id: "shared-heal",
    name: "托底",
    roles: ["support"],
    channel: "spell",
    spiritCost: 4,
    cooldown: 2,
    target: "ally",
    power: 0,
    healRatio: 0.06,
    summary: "很小的一口回复，便宜，补不回重伤。",
    always: true,
  },
  {
    id: "shared-snare",
    name: "缠步",
    roles: ["control"],
    channel: "weapon",
    spiritCost: 5,
    cooldown: 2,
    target: "enemy",
    power: 0.6,
    slow: true,
    summary: "伤害不高，但让对方下一拍变慢。",
    always: true,
  },
  {
    id: "shared-daze",
    name: "扰神",
    roles: ["control"],
    channel: "spell",
    spiritCost: 3,
    cooldown: 1,
    target: "enemy",
    power: 0.5,
    hitBonus: -4,
    summary: "便宜的干扰，命中差一截，几乎没有硬控。",
    always: true,
  },
  {
    id: "shared-break",
    name: "拆招",
    roles: ["breaker"],
    channel: "weapon",
    spiritCost: 6,
    cooldown: 2,
    target: "enemy",
    power: 1.08,
    shred: 0.85,
    summary: "这一击打在防上，伤害只略高于平砍，但防势会松一点。",
    always: true,
  },
];

const FAMILY_SKILLS: readonly SkillDraft[] = [
  {
    id: "quick-flurry",
    name: "连刺",
    roles: ["dps"],
    channel: "weapon",
    spiritCost: 5,
    cooldown: 1,
    target: "enemy",
    power: 1.2,
    hitBonus: 4,
    summary: "轻兵器的连点，灵力便宜，单下不算爆。",
    families: ["quick"],
  },
  {
    id: "quick-riposte",
    name: "回锋",
    roles: ["dps", "guard"],
    channel: "weapon",
    spiritCost: 4,
    cooldown: 2,
    target: "enemy",
    power: 0.9,
    guardRatio: 0.7,
    summary: "刺完顺手收势，伤害一般，自己也挡掉一点。",
    families: ["quick"],
  },
  {
    id: "heavy-cleave",
    name: "劈斩",
    roles: ["dps"],
    channel: "weapon",
    spiritCost: 10,
    cooldown: 2,
    target: "enemy",
    power: 1.38,
    summary: "重兵器的一记，伤高，灵力和冷却都压着，不能当普攻用。",
    families: ["heavy"],
  },
  {
    id: "heavy-brace",
    name: "横架",
    roles: ["guard"],
    channel: "weapon",
    spiritCost: 4,
    cooldown: 1,
    target: "self",
    power: 0,
    guardRatio: 0.45,
    focus: true,
    summary: "把兵器横在身前，减伤比守势更好，同样会把火力拉过来。",
    families: ["heavy"],
  },
  {
    id: "pole-thrust",
    name: "贯刺",
    roles: ["dps", "breaker"],
    channel: "weapon",
    spiritCost: 6,
    cooldown: 1,
    target: "enemy",
    power: 1.16,
    hitBonus: 8,
    shred: 0.9,
    summary: "长兵直线，命中稳，略微破防，爆发不如重斩。",
    families: ["polearm"],
  },
  {
    id: "pole-sweep",
    name: "横扫",
    roles: ["control"],
    channel: "weapon",
    spiritCost: 8,
    cooldown: 2,
    target: "all-enemies",
    power: 0.72,
    slow: true,
    summary: "扫一圈，每个目标都吃不满一记单攻，人多才值。",
    families: ["polearm"],
  },
  {
    id: "flex-bind",
    name: "绕锁",
    roles: ["control"],
    channel: "weapon",
    spiritCost: 7,
    cooldown: 2,
    target: "enemy",
    power: 0.75,
    slow: true,
    summary: "软兵器缠住手脚，伤害让位给减速。",
    families: ["flexible"],
  },
  {
    id: "flex-lash",
    name: "抽击",
    roles: ["dps"],
    channel: "weapon",
    spiritCost: 6,
    cooldown: 1,
    target: "enemy",
    power: 1.18,
    summary: "一记抽打，介于连刺和劈斩之间。",
    families: ["flexible"],
  },
  {
    id: "range-snipe",
    name: "定点",
    roles: ["dps"],
    channel: "weapon",
    spiritCost: 8,
    cooldown: 2,
    target: "enemy",
    power: 1.26,
    critBonus: 8,
    summary: "远程找空门，会心更高，冷却压着连射。",
    families: ["ranged-mystic"],
  },
  {
    id: "range-cover",
    name: "遥护",
    roles: ["support"],
    channel: "spell",
    spiritCost: 6,
    cooldown: 2,
    target: "ally",
    power: 0,
    wardRatio: 0.7,
    summary: "远处丢一层护，比护持略厚，仍然只挡下一击。",
    families: ["ranged-mystic"],
  },
];

const ELEMENT_SKILLS: readonly SkillDraft[] = [
  {
    id: "metal-edge-cut",
    name: "金锋",
    roles: ["breaker", "dps"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "enemy",
    power: 1.24,
    shred: 0.82,
    summary: "金行锋芒，破防清楚，灵力不便宜。",
    elements: ["metal"],
  },
  {
    id: "metal-guard-qi",
    name: "罡护",
    roles: ["guard"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "self",
    power: 0,
    guardRatio: 0.42,
    focus: true,
    summary: "金行罡气护身，减伤好，自己变成靶子。",
    elements: ["metal"],
  },
  {
    id: "wood-heal",
    name: "生息",
    roles: ["support"],
    channel: "spell",
    spiritCost: 11,
    cooldown: 3,
    target: "ally",
    power: 0,
    healRatio: 0.14,
    summary: "木行回气，回复明显，冷却长，一场里放不了几次。",
    elements: ["wood"],
  },
  {
    id: "wood-bind",
    name: "缠束",
    roles: ["control"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "enemy",
    power: 0.7,
    slow: true,
    summary: "木行缠住对方，伤害薄，减速实。",
    elements: ["wood"],
  },
  {
    id: "water-mend",
    name: "润泽",
    roles: ["support"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "ally",
    power: 0,
    healRatio: 0.1,
    summary: "水行缓补，比生息便宜，也补得少。",
    elements: ["water"],
  },
  {
    id: "water-frost",
    name: "寒流",
    roles: ["control"],
    channel: "spell",
    spiritCost: 7,
    cooldown: 2,
    target: "enemy",
    power: 0.78,
    slow: true,
    summary: "水行寒气，伤害和减速都中等。",
    elements: ["water"],
  },
  {
    id: "fire-burst",
    name: "激燃",
    roles: ["dps"],
    channel: "spell",
    spiritCost: 14,
    cooldown: 3,
    target: "enemy",
    power: 1.55,
    summary: "火行一爆。炼气期灵力撑不起连放，打完往往得回到寻常一击。",
    elements: ["fire"],
  },
  {
    id: "fire-smelt",
    name: "炼化",
    roles: ["breaker"],
    channel: "spell",
    spiritCost: 9,
    cooldown: 2,
    target: "enemy",
    power: 1.16,
    shred: 0.8,
    summary: "火行炼开防势，爆发不如激燃，破防更稳。",
    elements: ["fire"],
  },
  {
    id: "earth-wall",
    name: "岩壁",
    roles: ["guard", "support"],
    channel: "spell",
    spiritCost: 10,
    cooldown: 3,
    target: "all-allies",
    power: 0,
    wardRatio: 0.7,
    summary: "土行给全队一层岩壁，每人只挡下一击，冷却长。",
    elements: ["earth"],
  },
  {
    id: "earth-suppress",
    name: "镇岳",
    roles: ["guard", "control"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "enemy",
    power: 0.85,
    focus: true,
    slow: true,
    summary: "压住对方的同时把火力引到自己身上。",
    elements: ["earth"],
  },
];

const BRANCH_SKILLS: readonly SkillDraft[] = [
  {
    id: "branch-metal-point",
    name: "点金",
    roles: ["breaker"],
    channel: "spell",
    spiritCost: 7,
    cooldown: 2,
    target: "enemy",
    power: 1.18,
    shred: 0.88,
    summary: "金锋法器上的点刺，比金锋省一点灵力，破防也弱一点。",
    branches: ["metal-edge"],
  },
  {
    id: "branch-metal-break",
    name: "破禁",
    roles: ["breaker"],
    channel: "spell",
    spiritCost: 12,
    cooldown: 2,
    target: "enemy",
    power: 1.3,
    shred: 0.75,
    summary: "破禁一击，防势掉得厉害，灵力贵。",
    branches: ["metal-break"],
  },
  {
    id: "branch-metal-aegis",
    name: "金罡",
    roles: ["guard"],
    channel: "spell",
    spiritCost: 9,
    cooldown: 2,
    target: "ally",
    power: 0,
    wardRatio: 0.62,
    summary: "把罡气罩在同伴身上，比护持厚，不能每拍放。",
    branches: ["metal-guard"],
  },
  {
    id: "branch-wood-growth",
    name: "丰养",
    roles: ["support"],
    channel: "spell",
    spiritCost: 9,
    cooldown: 3,
    target: "ally",
    power: 0,
    healRatio: 0.12,
    summary: "生息法门里更稳的一补，仍然一场只能补一两次。",
    branches: ["wood-growth"],
  },
  {
    id: "branch-wood-bloom",
    name: "花荫",
    roles: ["support"],
    channel: "spell",
    spiritCost: 7,
    cooldown: 2,
    target: "all-allies",
    power: 0,
    wardRatio: 0.8,
    summary: "一层薄花荫罩住全队，减伤有限。",
    branches: ["wood-bloom"],
  },
  {
    id: "branch-water-illusion",
    name: "幻流",
    roles: ["control"],
    channel: "spell",
    spiritCost: 6,
    cooldown: 2,
    target: "enemy",
    power: 0.55,
    slow: true,
    summary: "幻影扰步，伤害很低，用来拖节奏。",
    branches: ["water-illusion"],
  },
  {
    id: "branch-fire-blaze",
    name: "炽焰",
    roles: ["dps"],
    channel: "spell",
    spiritCost: 11,
    cooldown: 2,
    target: "enemy",
    power: 1.32,
    summary: "稳定的火行输出，低于激燃，也没有那么吃灵力。",
    branches: ["fire-blaze"],
  },
  {
    id: "branch-earth-vein",
    name: "地脉",
    roles: ["support"],
    channel: "spell",
    spiritCost: 8,
    cooldown: 2,
    target: "ally",
    power: 0,
    healRatio: 0.08,
    wardRatio: 0.85,
    summary: "补一点，再留一层薄护，两项都不大。",
    branches: ["earth-vein"],
  },
];

const WEAPON_SIGNATURES: Record<WeaponTypeId, SkillDraft> = {
  sword: sig("sword", "剑引", ["dps"], 1.16, 5, 1, { hitBonus: 4, summary: "剑上的引手，轻，连得动。" }),
  "dual-swords": sig("dual-swords", "双辉", ["dps"], 1.12, 6, 1, { summary: "双剑各切一下，总伤不高于一记重斩。" }),
  dagger: sig("dagger", "刺喉", ["dps"], 1.2, 6, 2, { critBonus: 8, summary: "匕首赌会心，空了就亏。" }),
  gauntlets: sig("gauntlets", "贴身", ["dps"], 1.14, 4, 1, { summary: "贴身短打，便宜，单下不高。" }),
  saber: sig("saber", "刀势", ["dps"], 1.28, 8, 2, { summary: "刀势比剑重，冷却也更长。" }),
  greatsaber: sig("greatsaber", "开山", ["dps"], 1.42, 12, 3, { summary: "巨刀一开，伤很高，炼气期放完就要歇。" }),
  axe: sig("axe", "裂阵", ["breaker"], 1.22, 8, 2, { shred: 0.8, summary: "斧头找防，破得开，节奏慢。" }),
  hammer: sig("hammer", "镇锤", ["guard"], 0.95, 6, 2, { focus: true, summary: "锤压把人钉在自己面前，伤害让位给牵制。" }),
  spear: sig("spear", "枪出", ["dps", "breaker"], 1.18, 5, 1, { hitBonus: 8, summary: "枪直取中路，命中好，爆发一般。" }),
  halberd: sig("halberd", "横戟", ["guard"], 1.05, 6, 2, { focus: true, summary: "戟横住门，伤不高，人得先过你。" }),
  staff: sig("staff", "搅棍", ["control"], 0.8, 6, 2, { slow: true, summary: "棍搅脚步，用来拖，不用来收。" }),
  "hook-sickle": sig("hook-sickle", "锁喉", ["breaker"], 1.1, 6, 2, { shred: 0.85, summary: "钩开防势，伤害中等。" }),
  whip: sig("whip", "长抽", ["control"], 0.85, 5, 1, { slow: true, summary: "鞭梢拖慢对方，自己不站桩。" }),
  "chain-blade": sig("chain-blade", "链绞", ["breaker"], 1.15, 7, 2, { shred: 0.86, summary: "链刃绞防，比平砍略强。" }),
  "meteor-hammer": sig("meteor-hammer", "砸星", ["dps"], 1.34, 11, 2, { summary: "流星锤砸下去很重，灵力也重。" }),
  "silk-ribbon": sig("silk-ribbon", "绕绫", ["control"], 0.7, 6, 2, { slow: true, summary: "绫带缠步，伤害薄。" }),
  bow: sig("bow", "望羽", ["dps"], 1.24, 7, 2, { critBonus: 6, summary: "远弓找缝，会心略高。" }),
  crossbow: sig("crossbow", "重矢", ["breaker"], 1.3, 9, 2, { shred: 0.84, summary: "弩箭破防，装填慢。" }),
  fan: sig("fan", "扇影", ["control"], 0.75, 6, 2, { slow: true, summary: "扇影乱步，法器和控场更合。" }),
  umbrella: sig("umbrella", "撑伞", ["guard", "support"], 0.6, 5, 1, { guardRatio: 0.6, summary: "伞面挡住下一击，伤害可以忽略。" }),
};

function sig(
  typeId: WeaponTypeId,
  name: string,
  roles: readonly PartyRoleId[],
  power: number,
  spiritCost: number,
  cooldown: number,
  extra: Partial<SkillDraft> & { summary: string },
): SkillDraft {
  return {
    id: `weapon-${typeId}`,
    name,
    roles,
    channel: extra.channel ?? "weapon",
    spiritCost,
    cooldown,
    target: extra.target ?? "enemy",
    power,
    hitBonus: extra.hitBonus,
    critBonus: extra.critBonus,
    shred: extra.shred,
    slow: extra.slow,
    focus: extra.focus,
    guardRatio: extra.guardRatio,
    summary: extra.summary,
    weaponTypes: [typeId],
  };
}

const ALL_SKILLS: readonly SkillDraft[] = [
  ...SHARED_SKILLS,
  ...FAMILY_SKILLS,
  ...ELEMENT_SKILLS,
  ...BRANCH_SKILLS,
  ...Object.values(WEAPON_SIGNATURES),
];

const CHANNEL_BY_ID = new Map(ALL_SKILLS.map((skill) => [skill.id, skill.channel]));

export const PARTY_ROLE_IDS: readonly PartyRoleId[] = ["dps", "breaker", "guard", "support", "control"];

/** How many preferred skills an agent can keep ready, besides the basic strike. */
export const SKILL_SLOT_LIMIT = 3;

/** Practice stops here. The power gain at the cap is 4.8%. */
export const SKILL_PROFICIENCY_CAP = 24;

const UNIVERSAL_SKILL_IDS = new Set(SHARED_SKILLS.map((skill) => skill.id));

export function proficiencyPowerMultiplier(points: number | undefined): number {
  const capped = Math.min(SKILL_PROFICIENCY_CAP, Math.max(0, Math.floor(points ?? 0)));
  return 1 + capped * 0.002;
}

export interface SkillContext {
  weaponType: WeaponTypeId | null;
  weaponFamily: WeaponFamilyId | null;
  spellBranch: SpellBranchId | null;
  spellElement: FiveElementId | null;
  rootElements: readonly FiveElementId[];
  weaponAttack: number;
  spellAttack: number;
  defense: number;
  proficiency?: Readonly<Record<string, number>>;
  /** Top element score minus the next one. Absent on older hand-built contexts. */
  rootFocus?: number;
  temperament?: string;
  /** Absent on older hand-built contexts, which stay 均衡 and take no bonus. */
  leaning?: CombatLeaningId;
}

export function spiritRootElementsOf(cultivator: Cultivator): FiveElementId[] {
  const scores = extractFiveElementScores(cultivator.registrationRecord);
  const kind = cultivator.registrationRecord?.result.spirit_root_kind_id
    ?? (cultivator.registrationRecord ? deriveSpiritRootKindId(scores) : "dual-root");
  const sorted = sortedElementEntries(scores);
  const first = sorted[0]?.[0] ?? "metal";
  const second = sorted[1]?.[0] ?? "wood";
  return kind === "single-root" ? [first] : [first, second];
}

function spiritRootFocus(cultivator: Cultivator): number {
  const sorted = sortedElementEntries(extractFiveElementScores(cultivator.registrationRecord));
  const top = sorted[0]?.[1] ?? 0;
  const next = sorted[1]?.[1] ?? 0;
  return Math.max(0, top - next);
}

export function deriveCombatLeaning(ctx: SkillContext): CombatLeaningId {
  let weaponSide = ctx.weaponAttack;
  let spellSide = ctx.spellAttack;
  if (ctx.weaponType) weaponSide += 8;
  if (ctx.weaponFamily === "quick" || ctx.weaponFamily === "heavy" || ctx.weaponFamily === "polearm") {
    weaponSide += 4;
  }
  if (ctx.weaponFamily === "flexible" || ctx.weaponFamily === "ranged-mystic") spellSide += 3;
  if (ctx.spellBranch) spellSide += 8;
  if (ctx.rootElements.length <= 1) spellSide += 12;
  if (ctx.spellElement && ctx.rootElements.includes(ctx.spellElement)) spellSide += 6;
  if ((ctx.rootFocus ?? 0) >= 15) spellSide += 6;
  const temperament = ctx.temperament ?? "";
  if (/刚|勇|武|刀|剑|猛/.test(temperament)) weaponSide += 4;
  if (/静|慧|灵|术|文|柔|慎/.test(temperament)) spellSide += 4;
  const gap = weaponSide - spellSide;
  if (gap >= LEANING_GAP) return "weapon";
  if (gap <= -LEANING_GAP) return "spell";
  return "balanced";
}

export function skillContextOf(cultivator: Cultivator): SkillContext {
  const weapon = cultivator.equippedWeaponLoadoutId
    ? getWeaponLoadoutDefinition(cultivator.equippedWeaponLoadoutId)
    : null;
  const spell = cultivator.equippedSpellLoadoutId
    ? getSpellLoadoutDefinition(cultivator.equippedSpellLoadoutId)
    : null;
  const baseline = deriveMainAttributes(cultivator.registrationRecord);
  const main = computeEffectiveMainAttributes(
    baseline,
    cultivator.mainAttributeGrowth ?? createEmptyMainAttributeGrowth(),
    cultivator.mainAttributePercentageBonus ?? 0,
  );
  const ctx: SkillContext = {
    weaponType: weapon?.weaponTypeId ?? null,
    weaponFamily: weapon?.weaponFamilyId ?? null,
    spellBranch: spell?.spellBranchId ?? null,
    spellElement: spell ? SPELL_BRANCH_ELEMENT_MAP[spell.spellBranchId] : null,
    rootElements: spiritRootElementsOf(cultivator),
    weaponAttack: weaponAttack(main) + (weapon?.attackPowerBonus ?? 0),
    spellAttack: spellAttack(main) + (spell?.attackPowerBonus ?? 0),
    defense: physicalDefense(main),
    proficiency: cultivator.skillProficiency,
    rootFocus: spiritRootFocus(cultivator),
    temperament: cultivator.temperament,
    leaning: "balanced",
  };
  ctx.leaning = deriveCombatLeaning(ctx);
  return ctx;
}

function elementMatches(draft: SkillDraft, ctx: SkillContext): boolean {
  if (!draft.elements || draft.elements.length === 0) {
    return true;
  }
  return draft.elements.some((element) => ctx.rootElements.includes(element) || ctx.spellElement === element);
}

function skillAvailable(draft: SkillDraft, ctx: SkillContext): boolean {
  if (draft.always) {
    return true;
  }
  if (draft.weaponTypes && (!ctx.weaponType || !draft.weaponTypes.includes(ctx.weaponType))) {
    return false;
  }
  if (draft.families && (!ctx.weaponFamily || !draft.families.includes(ctx.weaponFamily))) {
    return false;
  }
  if (draft.branches && (!ctx.spellBranch || !draft.branches.includes(ctx.spellBranch))) {
    return false;
  }
  return elementMatches(draft, ctx);
}

function tightenRatio(ratio: number, favored: boolean): number {
  if (ratio >= 1) return ratio;
  const next = favored ? ratio * 0.96 : Math.min(0.98, ratio * 1.04);
  return Math.round(next * 100) / 100;
}

function resolveDraft(draft: SkillDraft, ctx: SkillContext): ResolvedCombatSkill {
  const borrowed = Boolean(
    draft.elements
    && draft.elements.length > 0
    && !draft.elements.some((element) => ctx.rootElements.includes(element))
    && draft.elements.includes(ctx.spellElement ?? "metal"),
  );
  let power = borrowed ? Math.round(draft.power * 0.9 * 100) / 100 : draft.power;
  if (power > 0) {
    power = Math.round(power * proficiencyPowerMultiplier(ctx.proficiency?.[draft.id]) * 100) / 100;
  }
  const leaning = ctx.leaning ?? "balanced";
  const favored = leaning !== "balanced" && (
    (leaning === "weapon" && draft.channel === "weapon")
    || (leaning === "spell" && draft.channel === "spell")
  );
  const aptitude: ResolvedCombatSkill["aptitude"] = leaning === "balanced" ? "neutral" : favored ? "favored" : "off";
  let spiritCost = draft.spiritCost;
  let hitBonus = draft.hitBonus ?? 0;
  let healRatio = draft.healRatio ?? 0;
  let guardRatio = draft.guardRatio ?? 1;
  let wardRatio = draft.wardRatio ?? 1;
  if (aptitude === "favored" || aptitude === "off") {
    if (power > 0) {
      power = Math.round(power * (favored ? 1.06 : 0.94) * 100) / 100;
      hitBonus += favored ? 3 : -2;
    }
    if (spiritCost > 0) spiritCost = Math.max(1, spiritCost + (favored ? -1 : 1));
    if (healRatio > 0) healRatio = Math.round(healRatio * (favored ? 1.06 : 0.94) * 1000) / 1000;
    guardRatio = tightenRatio(guardRatio, favored);
    wardRatio = tightenRatio(wardRatio, favored);
  }
  let summary = borrowed ? `${draft.summary}这一式借的是法器，不是本命灵根，威力略收。` : draft.summary;
  if (aptitude === "favored") summary = `${summary}顺着偏向，这一式略强。`;
  if (aptitude === "off") summary = `${summary}逆着偏向，这一式略收。`;
  return {
    id: draft.id,
    name: draft.name,
    role: draft.roles[0] ?? "dps",
    roles: draft.roles,
    channel: draft.channel,
    spiritCost,
    qiCost: draft.qiCost ?? 0,
    cooldown: draft.cooldown,
    target: draft.target,
    power,
    guardRatio,
    wardRatio,
    healRatio,
    hitBonus,
    critBonus: draft.critBonus ?? 0,
    slow: draft.slow ?? false,
    focus: draft.focus ?? false,
    shred: draft.shred ?? 1,
    summary,
    aptitude,
  };
}

export function listResolvedSkills(ctx: SkillContext): ResolvedCombatSkill[] {
  const seen = new Set<string>();
  const skills: ResolvedCombatSkill[] = [];
  for (const draft of ALL_SKILLS) {
    if (!skillAvailable(draft, ctx) || seen.has(draft.id)) {
      continue;
    }
    seen.add(draft.id);
    skills.push(resolveDraft(draft, ctx));
  }
  return skills;
}

function poolOf(channel: AttackChannel): { pool: "weapon" | "root"; poolLabel: "兵器" | "法术" } {
  return channel === "spell"
    ? { pool: "root", poolLabel: "法术" }
    : { pool: "weapon", poolLabel: "兵器" };
}

function aptitudeLabelOf(aptitude: ResolvedCombatSkill["aptitude"]): "顺手" | "别扭" | "平常" {
  if (aptitude === "favored") return "顺手";
  if (aptitude === "off") return "别扭";
  return "平常";
}

export function listCombatSkillViews(ctx: SkillContext): CombatSkillView[] {
  return listResolvedSkills(ctx).map((skill) => ({
    id: skill.id,
    name: skill.name,
    role: skill.role,
    roleLabel: PARTY_ROLE_LABEL[skill.role],
    channel: skill.channel,
    spiritCost: skill.spiritCost,
    qiCost: skill.qiCost,
    cooldown: skill.cooldown,
    target: skill.target,
    power: skill.power,
    summary: skill.summary,
    ...poolOf(skill.channel),
    aptitude: skill.aptitude ?? "neutral",
    aptitudeLabel: aptitudeLabelOf(skill.aptitude),
  }));
}

function roleHintFor(role: PartyRoleId, leaning: CombatLeaningId): string {
  const side = leaning === "weapon" ? "兵器" : leaning === "spell" ? "法术" : "";
  if (role === "dps" || role === "breaker") {
    if (!side) return "主攻和破法两边都能打。你目前没有明显偏向，按队伍缺的输出选就行。";
    return `主攻和破法更适合走${side}。另一边的招还能放进招位，只是威力略收，灵力也略贵。`;
  }
  if (!side) return "护卫、辅助、控场用兵器或法术都行。你两边差不多，按队友缺什么补。";
  return `护卫、辅助、控场用兵器或法术都行。你更顺手的是${side}，逆着偏向的守、补、控会略弱一点。`;
}

export function combatLeaningView(cultivator: Cultivator): {
  id: CombatLeaningId;
  label: string;
  reason: string;
  roleHint: string;
} {
  const ctx = skillContextOf(cultivator);
  const id = ctx.leaning ?? deriveCombatLeaning(ctx);
  const role = partyRoleForCultivator(cultivator).id;
  const reason = id === "weapon"
    ? "体魄和手上的兵器压过灵根法术，出手更顺的是兵器。"
    : id === "spell"
      ? "灵根和法术压过兵器，出手更顺的是法术。"
      : "兵器和灵根法术差不多，两边都能用，没有明显偏科。";
  return {
    id,
    label: COMBAT_LEANING_LABEL[id],
    reason,
    roleHint: roleHintFor(role, id),
  };
}

export function loadoutGuidanceFor(cultivator: Cultivator): string {
  const leaning = skillContextOf(cultivator).leaning ?? "balanced";
  const label = COMBAT_LEANING_LABEL[leaning];
  const chosen = cultivator.preferredSkillIds ?? [];
  if (chosen.length === 0) {
    if (leaning === "balanced") return "三个招位可以兵器和法术混着装。你目前两边差不多，按队伍缺的位置选。";
    const side = leaning === "weapon" ? "兵器" : "法术";
    return `你是${label}。三个招位仍可以混装，顺着${side}的招更顺手，硬塞满另一边会略亏。`;
  }
  const ready = skillsForCultivator(cultivator).filter((skill) => skill.id !== "basic-strike");
  const off = ready.filter((skill) => skill.aptitude === "off").length;
  const favored = ready.filter((skill) => skill.aptitude === "favored").length;
  if (leaning === "balanced") return "这一套混着兵器和法术。你没有明显偏向，这样装不会吃亏。";
  if (off > 0 && favored === 0) {
    return `这一套几乎都逆着${label}。能打，但同阶顺着偏向的人更省灵力，也打得更实。队伍里有人补这一侧就不必全换。`;
  }
  if (off > 0 && favored > 0) {
    return `兵器和法术混在招位里。逆着${label}的那几式略收，顺着的几式略增。多个人各走一边，比每个人都乱装更稳。`;
  }
  return `这一套顺着${label}。威力、命中和灵力都会略好一点。`;
}

export function inferPartyRole(ctx: SkillContext): PartyRoleId {
  const branch = ctx.spellBranch;
  const type = ctx.weaponType;
  if (branch === "wood-growth" || branch === "wood-bloom" || branch === "water-flow" || branch === "earth-vein") {
    return "support";
  }
  if (branch === "wood-bind" || branch === "water-frost" || branch === "water-illusion") {
    return "control";
  }
  if (branch === "earth-wall" || branch === "earth-suppress" || branch === "metal-guard") {
    return "guard";
  }
  if (type === "hammer" || type === "umbrella" || type === "staff" || type === "halberd") {
    return "guard";
  }
  if (branch === "metal-break" || branch === "metal-edge" || branch === "fire-smelt" || type === "axe" || type === "hook-sickle") {
    return "breaker";
  }
  if (ctx.weaponFamily === "flexible" || type === "silk-ribbon" || type === "fan" || type === "whip") {
    return "control";
  }
  if (ctx.rootElements[0] === "wood" && ctx.spellAttack >= ctx.weaponAttack) {
    return "support";
  }
  if (ctx.rootElements[0] === "water" && ctx.spellAttack + 2 >= ctx.weaponAttack) {
    return "control";
  }
  if (ctx.rootElements[0] === "earth" && ctx.defense >= ctx.weaponAttack) {
    return "guard";
  }
  return "dps";
}

export function legalPartyRoles(cultivator: Cultivator): PartyRoleId[] {
  const ctx = skillContextOf(cultivator);
  const skills = listResolvedSkills(ctx);
  const roles = new Set<PartyRoleId>([inferPartyRole(ctx)]);
  for (const skill of skills) {
    if (UNIVERSAL_SKILL_IDS.has(skill.id)) continue;
    for (const role of skill.roles) roles.add(role);
  }
  return PARTY_ROLE_IDS.filter((role) => roles.has(role));
}

export function partyRoleForCultivator(cultivator: Cultivator): { id: PartyRoleId; label: string } {
  const legal = legalPartyRoles(cultivator);
  const preferred = cultivator.preferredPartyRole;
  const id = preferred && legal.includes(preferred) ? preferred : inferPartyRole(skillContextOf(cultivator));
  return { id, label: PARTY_ROLE_LABEL[id] };
}

export function skillsForCultivator(cultivator: Cultivator): ResolvedCombatSkill[] {
  const role = partyRoleForCultivator(cultivator).id;
  const all = listResolvedSkills(skillContextOf(cultivator)).filter(
    (skill) => skill.id === "basic-strike" || skill.roles.includes(role),
  );
  const preferred = (cultivator.preferredSkillIds ?? []).filter((id) => all.some((skill) => skill.id === id));
  if (preferred.length === 0) return all;
  return all.filter((skill) => skill.id === "basic-strike" || preferred.includes(skill.id));
}

export function grantCombatPractice(cultivator: Cultivator, skillIds: readonly string[], amount: number): void {
  const gain = Math.max(0, Math.floor(amount));
  const ids = skillIds.filter((id) => id && id !== "basic-strike");
  if (gain <= 0 || ids.length === 0) return;
  const leaning = skillContextOf(cultivator).leaning ?? "balanced";
  const book = { ...(cultivator.skillProficiency ?? {}) };
  for (const id of ids) {
    const channel = CHANNEL_BY_ID.get(id);
    const favored = channel !== undefined && leaning !== "balanced" && (
      (leaning === "weapon" && channel === "weapon") || (leaning === "spell" && channel === "spell")
    );
    book[id] = Math.min(SKILL_PROFICIENCY_CAP, (book[id] ?? 0) + gain + (favored ? 1 : 0));
  }
  cultivator.skillProficiency = book;
  const role = partyRoleForCultivator(cultivator).id;
  cultivator.roleExperience = {
    ...(cultivator.roleExperience ?? {}),
    [role]: Math.min(40, (cultivator.roleExperience?.[role] ?? 0) + gain),
  };
}

export function catalogSkillCountForRole(role: PartyRoleId): number {
  return ALL_SKILLS.filter((skill) => skill.roles.includes(role)).length;
}

export function allSkillDrafts(): readonly SkillDraft[] {
  return ALL_SKILLS;
}
