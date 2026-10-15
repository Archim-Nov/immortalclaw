import type { Cultivator, Residence } from "./model.js";
import { residenceRiskMultiplier } from "./residence.js";

/**
 * Spirit-stone sink on a cave the cultivator already owns.
 * Benefits are clamped. Prices are not.
 */

export const HOST_COOLDOWN_TICKS = 4;
export const HOST_AFFINITY_BASE = 6;
export const HOST_AFFINITY_CAP = 2;
export const MEDITATE_PROGRESS_CAP = 2;
export const HEAL_TICK_CAP = 1;
export const QI_BONUS_CAP = 4;
export const PRODUCE_DISCOUNT_CAP = 0.1;
export const FIXTURE_SLOT_CAP = 12;

export const RESIDENCE_BENEFIT_LINE =
  "陈设的用处有顶。闭关最多比原来多两分进境，疗伤最多快一刻，调息最多多四点气血，炼制最多少花一成灵石，待客最多多两点好感。屏风和观景台只给人看，不进这些数。";

const FIXTURE_TIER_BASE = [0, 2_400, 12_000, 56_000, 220_000] as const;
const FIXTURE_TIER_NAMES = ["", "粗成", "灵纹", "宝光", "仙品"] as const;

interface FixtureFamily {
  readonly id: string;
  readonly name: string;
  readonly maxTier: 3 | 4;
  readonly priceScale: number;
  readonly cosmetic: boolean;
  readonly blurb: string;
  readonly meditate?: readonly number[];
  readonly qi?: readonly number[];
  readonly heal?: readonly number[];
  readonly produce?: readonly number[];
  readonly host?: readonly number[];
}

export const FIXTURE_FAMILIES: readonly FixtureFamily[] = [
  {
    id: "putuan",
    name: "蒲团",
    maxTier: 4,
    priceScale: 1,
    cosmetic: false,
    blurb: "闭关时进境会多一点点。",
    meditate: [0, 0.04, 0.06, 0.08, 0.1],
  },
  {
    id: "juling",
    name: "聚灵阵",
    maxTier: 4,
    priceScale: 1.6,
    cosmetic: false,
    blurb: "打坐和调息都顺一点。",
    meditate: [0, 0.02, 0.03, 0.04, 0.05],
    qi: [0, 2, 3, 4, 5],
  },
  {
    id: "danlu",
    name: "丹炉",
    maxTier: 4,
    priceScale: 1.8,
    cosmetic: false,
    blurb: "炼丹少花一点灵石。",
    produce: [0, 0.05, 0.08, 0.1, 0.12],
  },
  {
    id: "lianqi",
    name: "炼器台",
    maxTier: 4,
    priceScale: 1.5,
    cosmetic: false,
    blurb: "炼器少花一点灵石。",
    produce: [0, 0.03, 0.05, 0.07, 0.09],
  },
  {
    id: "lingquan",
    name: "灵泉",
    maxTier: 4,
    priceScale: 1.4,
    cosmetic: false,
    blurb: "疗伤时伤势退得快一点。",
    heal: [0, 1, 1, 1, 2],
  },
  {
    id: "yaopu",
    name: "药圃",
    maxTier: 4,
    priceScale: 1.2,
    cosmetic: false,
    blurb: "在府里歇着，心会静一点。",
    meditate: [0, 0.01, 0.02, 0.02, 0.03],
  },
  {
    id: "cangjing",
    name: "藏经阁",
    maxTier: 4,
    priceScale: 2.2,
    cosmetic: false,
    blurb: "请人进来说话时，底气稳一点。",
    meditate: [0, 0.01, 0.02, 0.03, 0.04],
    host: [0, 0, 1, 1, 2],
  },
  {
    id: "pingfeng",
    name: "屏风",
    maxTier: 3,
    priceScale: 0.8,
    cosmetic: true,
    blurb: "只是给人看的。",
  },
  {
    id: "lingshou",
    name: "灵兽窝",
    maxTier: 4,
    priceScale: 1.3,
    cosmetic: false,
    blurb: "窝里有活物，府里不那么冷清。",
    host: [0, 0, 0, 1, 1],
  },
  {
    id: "guanjing",
    name: "观景台",
    maxTier: 3,
    priceScale: 1.1,
    cosmetic: true,
    blurb: "能看见城和远处的山，不改修为。",
  },
  {
    id: "hushan",
    name: "护山阵",
    maxTier: 4,
    priceScale: 2.4,
    cosmetic: false,
    blurb: "把门挡住，养伤的人也踏实一点。",
    heal: [0, 0, 1, 1, 1],
  },
  {
    id: "chaan",
    name: "茶案",
    maxTier: 3,
    priceScale: 0.9,
    cosmetic: false,
    blurb: "请人进来坐，好感多一点点。",
    host: [0, 1, 2, 2],
  },
] as const;

const FAMILY_BY_ID = new Map(FIXTURE_FAMILIES.map((family) => [family.id, family]));

const HOST_POOLS: Record<string, readonly string[]> = {
  "1": [
    "屋里就一张席。你坐，茶是热的。",
    "地方窄，你别嫌。人到了就行。",
    "门没闩。进来坐，外面的事先放下。",
  ],
  "2": [
    "洞府刚能住人。你坐里面，风进不来。",
    "石壁还潮。茶在炉上，你自己倒。",
    "我把位子空出来了。你坐，我不送客。",
  ],
  "3": [
    "灵府比以前宽。你坐茶案那边。",
    "阵是新布的，别踩纹路。坐里面。",
    "你来得正好。茶刚温，不谈买卖。",
  ],
  "4": [
    "仙府太大，找座要走几步。你跟我来。",
    "外间给客人。你坐，我不多问来意。",
    "这地方空。你要是累，就在这儿歇。",
  ],
  "5": [
    "洞天里安静。你要坐，就坐灵泉边上。",
    "外面的声音进不来。你坐，慢慢说。",
    "我很少请人进这一重。你算一个。",
  ],
  expansion: [
    "又往外拓了一重。你来得正好，阵刚稳。",
    "洞天又深了一层。路我熟，你跟着走。",
    "新拓的这一重还空。你坐，别站着。",
  ],
};

const FIXTURE_HOST_LINES: Record<string, readonly string[]> = {
  putuan: ["蒲团只有一张软的。给你，我坐旧的。"],
  juling: ["聚灵阵开着。你坐里面，灵气顺一点。"],
  danlu: ["丹炉还热。你坐远一点，烟熏人。"],
  lianqi: ["炼器台占了半间。你坐另一头。"],
  lingquan: ["灵泉边凉。你身上要是有伤，就近着坐。"],
  yaopu: ["药圃刚浇过。你踩石板，别踩苗。"],
  cangjing: ["阁里的书不外借。人可以进，书留下。"],
  pingfeng: ["屏风是摆着看的。你别笑，坐吧。"],
  lingshou: ["灵兽在窝里。你别伸手，它认生。"],
  guanjing: ["观景台能看见城。你要看，我陪你站一会儿。"],
  hushan: ["护山阵亮着。进来就行，外面的事先放下。"],
  chaan: ["茶案上就两只杯子。你的那只在右边。"],
};

export interface ResidenceBenefits {
  readonly meditateFraction: number;
  readonly qiBonus: number;
  readonly healBonus: number;
  readonly produceDiscount: number;
  readonly hostAffinity: number;
  readonly prestige: number;
}

export interface ResidenceFixtureView {
  id: string;
  name: string;
  tier: number;
  tierName: string;
  cosmetic: boolean;
  line: string;
}

export interface ResidenceOfferView {
  actionId: string;
  fixtureId: string;
  name: string;
  nextTier: number;
  tierName: string;
  price: number;
  cosmetic: boolean;
  line: string;
}

export interface ResidenceUpgradeView {
  actionId: "upgrade-residence";
  nextGrandeur: number;
  tierName: string;
  price: number;
  slotCount: number;
  line: string;
}

export interface OwnedResidenceView {
  id: string;
  stateId: string;
  locationId: string;
  name: string;
  description: string;
  isActive: boolean;
  grandeur: number;
  tierName: string;
  slotCount: number;
  usedSlots: number;
  prestige: number;
  glance: string;
  benefitLine: string;
  fixtures: ResidenceFixtureView[];
  nextUpgrade: ResidenceUpgradeView;
  offers?: ResidenceOfferView[];
}

export interface NearbyHomeView {
  ownerId: string;
  ownerName: string;
  residenceName: string;
  grandeur: number;
  tierName: string;
  glance: string;
}

export function residenceGrandeur(residence: Residence): number {
  const value = residence.grandeur;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

export function residenceTierName(residence: Residence): string {
  const grandeur = residenceGrandeur(residence);
  if (grandeur <= 1) return residence.origin === "bought" ? "石室" : "草庐";
  if (grandeur === 2) return "洞府";
  if (grandeur === 3) return "灵府";
  if (grandeur === 4) return "仙府";
  if (grandeur === 5) return "洞天";
  return `洞天·${chineseCount(grandeur - 4)}重`;
}

export function fixtureSlotCount(grandeur: number): number {
  const tier = Math.max(1, Math.floor(grandeur));
  if (tier <= 1) return 2;
  if (tier === 2) return 3;
  if (tier === 3) return 4;
  if (tier === 4) return 6;
  if (tier === 5) return 8;
  return Math.min(FIXTURE_SLOT_CAP, 8 + (tier - 5));
}

export function upgradeCostBase(nextGrandeur: number): number {
  if (nextGrandeur <= 2) return 8_000;
  if (nextGrandeur === 3) return 28_000;
  if (nextGrandeur === 4) return 96_000;
  if (nextGrandeur === 5) return 280_000;
  let cost = 280_000;
  const steps = nextGrandeur - 5;
  for (let index = 0; index < steps; index += 1) {
    if (cost > Number.MAX_SAFE_INTEGER / 2) return Number.MAX_SAFE_INTEGER;
    cost *= 2;
  }
  return cost;
}

export function scaleResidencePrice(stateId: string, base: number): number {
  if (!Number.isFinite(base) || base >= Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  const scaled = Math.round(base * residenceRiskMultiplier(stateId));
  if (!Number.isFinite(scaled) || scaled > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, scaled);
}

export function upgradePrice(residence: Residence): number {
  return scaleResidencePrice(residence.stateId, upgradeCostBase(residenceGrandeur(residence) + 1));
}

export function hostTeaCost(residence: Residence): number {
  const grandeur = Math.min(residenceGrandeur(residence), 8);
  return 20 + grandeur * 10;
}

export function fixtureFamily(id: string): FixtureFamily | null {
  return FAMILY_BY_ID.get(id) ?? null;
}

export function placedFixtures(residence: Residence): Array<{ id: string; tier: number }> {
  return (residence.fixtures ?? []).filter((fixture) => fixtureFamily(fixture.id) && fixture.tier > 0);
}

export function fixturePrice(stateId: string, family: FixtureFamily, tier: number): number {
  const base = FIXTURE_TIER_BASE[tier] ?? 0;
  return scaleResidencePrice(stateId, Math.round(base * family.priceScale));
}

export function fixtureTierName(tier: number): string {
  return FIXTURE_TIER_NAMES[tier] ?? `${tier}阶`;
}

function diminish(values: readonly number[]): number {
  const sorted = [...values].filter((value) => value > 0).sort((left, right) => right - left);
  let sum = 0;
  let weight = 1;
  for (const value of sorted) {
    sum += value * weight;
    weight *= 0.5;
  }
  return sum;
}

function channelValues(residence: Residence, channel: "meditate" | "qi" | "heal" | "produce" | "host"): number[] {
  const values: number[] = [];
  for (const placed of placedFixtures(residence)) {
    const family = fixtureFamily(placed.id);
    const row = family?.[channel];
    if (!row) continue;
    values.push(row[placed.tier] ?? 0);
  }
  return values;
}

export function benefitsOf(residence: Residence | null): ResidenceBenefits {
  if (!residence) {
    return { meditateFraction: 0, qiBonus: 0, healBonus: 0, produceDiscount: 0, hostAffinity: 0, prestige: 0 };
  }
  const grandeur = residenceGrandeur(residence);
  const fixturePrestige = placedFixtures(residence).reduce((sum, fixture) => {
    const family = fixtureFamily(fixture.id);
    const weight = family?.cosmetic ? 2 : 1;
    return sum + fixture.tier * weight;
  }, 0);
  return {
    meditateFraction: Math.min(0.12, diminish(channelValues(residence, "meditate"))),
    qiBonus: Math.min(QI_BONUS_CAP, Math.round(diminish(channelValues(residence, "qi")))),
    healBonus: Math.min(HEAL_TICK_CAP, Math.round(diminish(channelValues(residence, "heal")))),
    produceDiscount: Math.min(PRODUCE_DISCOUNT_CAP, diminish(channelValues(residence, "produce"))),
    hostAffinity: Math.min(HOST_AFFINITY_CAP, Math.round(diminish(channelValues(residence, "host")))),
    prestige: grandeur * 3 + fixturePrestige,
  };
}

export function meditateProgressBonus(residence: Residence | null, baseGain: number): number {
  const fraction = benefitsOf(residence).meditateFraction;
  if (fraction <= 0 || baseGain <= 0) return 0;
  return Math.min(MEDITATE_PROGRESS_CAP, Math.max(1, Math.round(baseGain * fraction)));
}

export function discountedSpiritCost(residence: Residence | null, cost: number): number {
  if (cost <= 0) return cost;
  const discount = benefitsOf(residence).produceDiscount;
  if (discount <= 0) return cost;
  return Math.max(1, Math.floor(cost * (1 - discount)));
}

export function residenceGlance(residence: Residence): string {
  const tierName = residenceTierName(residence);
  const names = placedFixtures(residence)
    .slice(0, 3)
    .map((fixture) => fixtureFamily(fixture.id)?.name)
    .filter((name): name is string => Boolean(name));
  if (residenceGrandeur(residence) <= 1 && names.length === 0) {
    return `${residence.name}眼下还是一间${tierName}，陈设很少。`;
  }
  if (names.length === 0) {
    return `${residence.name}已经是${tierName}，屋里还空着。`;
  }
  return `${residence.name}是一处${tierName}，屋里看得见${names.join("、")}。`;
}

export function nearbyHomeLine(residence: Residence, ownerName: string): string {
  return `${ownerName}在这城里有一处${residence.name}，眼下是${residenceTierName(residence)}。${residenceGlance(residence)}`;
}

export function upgradeQuote(residence: Residence): ResidenceUpgradeView {
  const nextGrandeur = residenceGrandeur(residence) + 1;
  const price = upgradePrice(residence);
  const tierName = residenceTierName({ ...residence, grandeur: nextGrandeur, origin: residence.origin });
  const slotCount = fixtureSlotCount(nextGrandeur);
  const endless = nextGrandeur > 5;
  const line = endless
    ? `洞天还能再拓。下一重是${tierName}，要${price}灵石，没有顶。位子会变成${slotCount}个。用 upgrade-residence。`
    : `下一阶是${tierName}，要${price}灵石。位子从${fixtureSlotCount(residenceGrandeur(residence))}个变成${slotCount}个。用 upgrade-residence。`;
  return {
    actionId: "upgrade-residence",
    nextGrandeur,
    tierName,
    price,
    slotCount,
    line,
  };
}

export function fixtureOffers(residence: Residence): ResidenceOfferView[] {
  const slotsLeft = fixtureSlotCount(residenceGrandeur(residence)) - placedFixtures(residence).length;
  const placed = new Map(placedFixtures(residence).map((fixture) => [fixture.id, fixture.tier]));
  const offers: ResidenceOfferView[] = [];
  for (const family of FIXTURE_FAMILIES) {
    const current = placed.get(family.id) ?? 0;
    if (current >= family.maxTier) continue;
    if (current === 0 && slotsLeft <= 0) continue;
    const nextTier = current + 1;
    const price = fixturePrice(residence.stateId, family, nextTier);
    const tierName = fixtureTierName(nextTier);
    const replacing = current > 0;
    const line = replacing
      ? `把${family.name}换成${tierName}，要${price}灵石。还是占原来那个位子。${family.blurb}`
      : `安一件${tierName}的${family.name}，要${price}灵石。${family.blurb}`;
    offers.push({
      actionId: `place-fixture:${family.id}`,
      fixtureId: family.id,
      name: family.name,
      nextTier,
      tierName,
      price,
      cosmetic: family.cosmetic,
      line,
    });
  }
  return offers;
}

export function fixtureViews(residence: Residence): ResidenceFixtureView[] {
  return placedFixtures(residence).map((fixture) => {
    const family = fixtureFamily(fixture.id)!;
    return {
      id: family.id,
      name: family.name,
      tier: fixture.tier,
      tierName: fixtureTierName(fixture.tier),
      cosmetic: family.cosmetic,
      line: family.blurb,
    };
  });
}

export function buildOwnedResidenceView(residence: Residence, isActive: boolean): OwnedResidenceView {
  const benefits = benefitsOf(residence);
  return {
    id: residence.id,
    stateId: residence.stateId,
    locationId: residence.locationId,
    name: residence.name,
    description: residence.description,
    isActive,
    grandeur: residenceGrandeur(residence),
    tierName: residenceTierName(residence),
    slotCount: fixtureSlotCount(residenceGrandeur(residence)),
    usedSlots: placedFixtures(residence).length,
    prestige: benefits.prestige,
    glance: residenceGlance(residence),
    benefitLine: RESIDENCE_BENEFIT_LINE,
    fixtures: fixtureViews(residence),
    nextUpgrade: upgradeQuote(residence),
    ...(isActive ? { offers: fixtureOffers(residence) } : {}),
  };
}

export function hostSpokenLine(residence: Residence, tick: number, guestId: string): string {
  const grandeur = residenceGrandeur(residence);
  const bucket = grandeur >= 6 ? "expansion" : String(Math.min(grandeur, 5));
  const notable = [...placedFixtures(residence)].sort((left, right) => right.tier - left.tier)[0];
  const fixtureLines = notable ? FIXTURE_HOST_LINES[notable.id] ?? [] : [];
  const pool = [...fixtureLines, ...(HOST_POOLS[bucket] ?? HOST_POOLS["1"]!)];
  const index = hashString(`${tick}:${residence.id}:${guestId}:host-line`) % pool.length;
  return pool[index] ?? HOST_POOLS["1"]![0]!;
}

export function allHostLines(): string[] {
  return [
    ...Object.values(HOST_POOLS).flat(),
    ...Object.values(FIXTURE_HOST_LINES).flat(),
  ];
}

export function hostReady(residence: Residence, guestId: string, tick: number): { ok: true } | { ok: false; wait: number } {
  const last = residence.hostTicks?.[guestId];
  if (last === undefined) return { ok: true };
  const wait = HOST_COOLDOWN_TICKS - (tick - last);
  if (wait <= 0) return { ok: true };
  return { ok: false, wait };
}

export function withResidence(
  cultivator: Cultivator,
  residenceId: string,
  change: (residence: Residence) => void,
): void {
  for (const residence of cultivator.residences) {
    if (residence.id === residenceId) change(residence);
  }
  if (
    cultivator.residence?.id === residenceId
    && !cultivator.residences.includes(cultivator.residence)
  ) {
    change(cultivator.residence);
  }
}

export function applyUpgrade(residence: Residence, nextGrandeur: number): void {
  residence.grandeur = nextGrandeur;
}

export function applyFixture(residence: Residence, fixtureId: string, tier: number): void {
  const next = placedFixtures(residence).filter((fixture) => fixture.id !== fixtureId);
  next.push({ id: fixtureId, tier });
  residence.fixtures = next;
}

export function applyClearFixture(residence: Residence, fixtureId: string): void {
  residence.fixtures = placedFixtures(residence).filter((fixture) => fixture.id !== fixtureId);
}

export function stampHost(residence: Residence, guestId: string, tick: number): void {
  residence.hostTicks = { ...(residence.hostTicks ?? {}), [guestId]: tick };
}

function chineseCount(value: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  if (value <= 10) return ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][value] ?? String(value);
  if (value < 20) return `十${digits[value - 10] ?? ""}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${digits[tens] ?? ""}十${ones ? digits[ones] ?? "" : ""}`;
  }
  return String(value);
}

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}
