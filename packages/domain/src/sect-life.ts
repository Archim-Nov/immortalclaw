/**
 * Sect posts, merit, map veins, and raids.
 *
 * The grudge ladder is not here. A raid only calls addMutualGrudge when a
 * member of the defending sect is standing on the node.
 */

import { GEOGRAPHY_REGISTRY } from "./geography-registry.js";
import { GameplayRejection } from "./gameplay-error.js";
import { GRUDGE_FROM_DUEL, noteWound, recordLife } from "./inner-life.js";
import type {
  ActionId,
  AvailableAction,
  Cultivator,
  ItemId,
  SectChainId,
  SectLifePostView,
  SectLifeView,
  SectPostId,
  SectTitle,
  SpiritVeinBand,
  SpiritVeinKind,
  SpiritVeinNode,
  WorldState,
} from "./model.js";
import { buildSectLevel } from "./sect-level.js";
import { addMutualGrudge } from "./social.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

const YIELD_INTERVAL = 4;
const RAID_COOLDOWN = 6;
const STOCK_CAP = 8;
const STOCK_CAP_HIGH = 12;
const PROGRESS_CAP = 100;

const BAND_REALM: Record<SpiritVeinBand, number> = {
  qi: 1,
  foundation: 4,
  core: 7,
  nascent: 10,
  spirit: 12,
};

const BAND_ITEMS: Record<SpiritVeinBand, readonly ItemId[]> = {
  qi: ["condensed-qi-dew", "azure-stone-marrow", "meridian-lotus-essence"],
  foundation: ["foundation-spirit-amber", "wind-control-crystal", "nine-turn-core-sand"],
  core: ["flowing-aurora-core", "dragon-radiance-crystal", "core-nourish-dew"],
  nascent: [
    "infant-fire-lotus",
    "nascent-jade",
    "soul-lamp-wick",
    "nurture-nascent-dew",
    "anchor-nascent-sand",
    "nascent-nourish-sand",
    "nine-turn-golden-marrow",
  ],
  spirit: [
    "divine-thought-crystal",
    "heaven-soul-silk",
    "divine-pattern-stone",
    "shatter-nascent-lotus",
    "divine-embryo-dew",
    "divine-transformation-seal",
    "spirit-nourish-dust",
  ],
};

const ITEM_NAME: Partial<Record<ItemId, string>> = {
  "condensed-qi-dew": "凝气清露",
  "azure-stone-marrow": "青冥石髓",
  "meridian-lotus-essence": "洗脉莲心露",
  "foundation-spirit-amber": "定基灵珀",
  "wind-control-crystal": "御风凝晶",
  "nine-turn-core-sand": "九转凝丹砂",
  "flowing-aurora-core": "流霞丹英",
  "dragon-radiance-crystal": "龙曜灵晶",
  "core-nourish-dew": "丹霞露",
  "infant-fire-lotus": "婴火莲",
  "nascent-jade": "元胎玉",
  "soul-lamp-wick": "魂灯芯",
  "nurture-nascent-dew": "养婴露",
  "anchor-nascent-sand": "固婴砂",
  "nascent-nourish-sand": "养魂砂",
  "nine-turn-golden-marrow": "九转紫金髓",
  "divine-thought-crystal": "神念晶",
  "heaven-soul-silk": "天魂丝",
  "divine-pattern-stone": "神纹石",
  "shatter-nascent-lotus": "破婴神莲",
  "divine-embryo-dew": "神胎露",
  "divine-transformation-seal": "化神金章",
  "spirit-nourish-dust": "神纹尘",
};

const BAND_SENTENCE: Record<SpiritVeinBand, string> = {
  qi: "这一脉出炼气用的凝气清露和青冥石髓，隔一阵也会出洗脉莲心露。",
  foundation: "这一脉出筑基用的定基灵珀和御风凝晶，隔一阵也会出九转凝丹砂。",
  core: "这一脉出金丹用的流霞丹英、龙曜灵晶，还有闭关用的丹霞露。",
  nascent: "这一脉出元婴用的婴火莲、元胎玉、魂灯芯、养婴露、固婴砂、九转紫金髓，还有闭关用的养魂砂。",
  spirit: "这一脉出化神用的神念晶、天魂丝、神纹石、破婴神莲、神胎露、化神金章，还有闭关用的神纹尘。",
};

interface PostDef {
  id: SectPostId;
  name: string;
  slots: number;
  dutyTicks: number;
  contribution: number;
  merit: number;
  stones: number;
  progress: number;
  duty: string;
  benefit: string;
}

const POSTS: readonly PostDef[] = [
  {
    id: "outer-chore",
    name: "外门杂役",
    slots: 24,
    dutyTicks: 1,
    contribution: 8,
    merit: 6,
    stones: 24,
    progress: 0,
    duty: "扫院、送药、把册子送到执事手里。做完一趟，贡献和宗门声望都会记上一笔。",
    benefit: "稳定的贡献和一点灵石。药田要自己去收，杂役不代领灵材。",
  },
  {
    id: "inner-cultivate",
    name: "内门修炼",
    slots: 8,
    dutyTicks: 2,
    contribution: 14,
    merit: 10,
    stones: 16,
    progress: 6,
    duty: "在内门静室把本日功课做完。修为会动，宗门声望也记一笔。",
    benefit: "功课带一点修为。境界够了的话，山门会从脉里分你一份灵材。",
  },
  {
    id: "steward",
    name: "执事",
    slots: 4,
    dutyTicks: 2,
    contribution: 16,
    merit: 12,
    stones: 30,
    progress: 2,
    duty: "管名册、派杂役、把库房的账对一遍。",
    benefit: "贡献更高。境界到了筑基，可以带人夺本州的脉。灵材份额直接送到你手里。",
  },
  {
    id: "elder",
    name: "长老",
    slots: 2,
    dutyTicks: 2,
    contribution: 12,
    merit: 14,
    stones: 20,
    progress: 4,
    duty: "上堂议事，决定这条脉还要不要守、下一趟夺哪一处。",
    benefit: "可以议事，也可以宣战。筑基以后，对炼气和筑基的脉，长老出手更容易拿下。",
  },
  {
    id: "master-seat",
    name: "掌门席",
    slots: 1,
    dutyTicks: 2,
    contribution: 18,
    merit: 16,
    stones: 36,
    progress: 4,
    duty: "坐掌门席，把今天的令发下去。令出了，声望涨得最多。",
    benefit: "全宗只有一席。可以议事、宣战，灵材份额也最厚。",
  },
];

const POST_BY_ID = new Map(POSTS.map((post) => [post.id, post]));

interface ChainDef {
  id: SectChainId;
  name: string;
  ticks: number;
  merit: number;
  contribution: number;
  stones: number;
  progress: number;
  summary: string;
}

const CHAINS: readonly ChainDef[] = [
  {
    id: "transmit",
    name: "传功",
    ticks: 2,
    merit: 12,
    contribution: 10,
    stones: 0,
    progress: 4,
    summary: "在山门把一式拆开讲给同门。你有进境，在场的同门也会沾一点。",
  },
  {
    id: "patrol",
    name: "巡山",
    ticks: 2,
    merit: 10,
    contribution: 12,
    stones: 12,
    progress: 0,
    summary: "沿着山门或本州荒野走一圈。偶尔会挂点伤，声望照记。",
  },
  {
    id: "guard-vein",
    name: "护脉",
    ticks: 2,
    merit: 14,
    contribution: 10,
    stones: 0,
    progress: 0,
    summary: "守在自己的脉上。脉还没有主，而你的境界够，这一趟就替山门收下。",
  },
  {
    id: "recruit-chore",
    name: "收徒杂役",
    ticks: 1,
    merit: 6,
    contribution: 8,
    stones: 10,
    progress: 0,
    summary: "在山门接待新来的人，把杂役的活派下去。炼气弟子每天都能做。",
  },
  {
    id: "escort",
    name: "护送",
    ticks: 3,
    merit: 16,
    contribution: 12,
    stones: 40,
    progress: 0,
    summary: "把一车灵材从山门送到该去的地方。耗时更长，声望也更多。",
  },
  {
    id: "council",
    name: "议事",
    ticks: 1,
    merit: 18,
    contribution: 8,
    stones: 0,
    progress: 0,
    summary: "长老或掌门上堂。两票落在十二个时辰里，山门再记一笔通过的声望。",
  },
];

const CHAIN_BY_ID = new Map(CHAINS.map((chain) => [chain.id, chain]));

interface SectRecord {
  id: string;
  name: string;
  headquarters: string;
  stateId: string;
  memberIds: string[];
  sectMerit?: number;
  lastRaidTick?: number;
  councilVotes?: number;
  councilUntilTick?: number;
  founderCultivatorId?: string;
}

interface Membership {
  kind: "player" | "neutral";
  record: SectRecord;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

function postOf(id: string): PostDef | null {
  return POST_BY_ID.get(id as SectPostId) ?? null;
}

function chainOf(id: string): ChainDef | null {
  return CHAIN_BY_ID.get(id as SectChainId) ?? null;
}

function stateName(stateId: string): string {
  return GEOGRAPHY_REGISTRY[stateId as keyof typeof GEOGRAPHY_REGISTRY]?.name ?? stateId;
}

function stateRisk(stateId: string): string {
  return GEOGRAPHY_REGISTRY[stateId as keyof typeof GEOGRAPHY_REGISTRY]?.risk ?? "low";
}

function neutralSectId(stateId: string): string | null {
  return GEOGRAPHY_REGISTRY[stateId as keyof typeof GEOGRAPHY_REGISTRY]?.neutralSect.id ?? null;
}

function bandsFor(risk: string): { herb: SpiritVeinBand; mine: SpiritVeinBand; spirit: SpiritVeinBand } {
  if (risk === "high") return { herb: "core", mine: "nascent", spirit: "spirit" };
  if (risk === "medium") return { herb: "foundation", mine: "core", spirit: "nascent" };
  return { herb: "qi", mine: "foundation", spirit: "foundation" };
}

function membership(world: WorldState, cultivator: Cultivator): Membership | null {
  if (cultivator.sectId) {
    const sect = world.sects[cultivator.sectId];
    if (!sect) return null;
    return { kind: "player", record: sect };
  }
  if (cultivator.neutralSectId) {
    const sect = world.neutralSects[cultivator.neutralSectId];
    if (!sect) return null;
    return { kind: "neutral", record: sect };
  }
  return null;
}

function contributionOf(cultivator: Cultivator): number {
  return Math.max(cultivator.totalContribution ?? 0, cultivator.neutralContribution ?? 0);
}

function titleRank(title: SectTitle | null): number {
  if (title === "宗主") return 4;
  if (title === "长老") return 3;
  if (title === "精英") return 2;
  if (title === "内门") return 1;
  if (title === "外门") return 0;
  return -1;
}

function atHeadquarters(cultivator: Cultivator, member: Membership): boolean {
  return cultivator.locationId === member.record.headquarters;
}

function sameSect(left: Cultivator, right: Cultivator): boolean {
  return Boolean(
    (left.sectId && left.sectId === right.sectId)
    || (left.neutralSectId && left.neutralSectId === right.neutralSectId),
  );
}

function holders(world: WorldState, member: Membership, postId: SectPostId): Cultivator[] {
  return member.record.memberIds
    .map((id) => world.cultivators[id])
    .filter((person): person is Cultivator => Boolean(person && person.sectPost === postId && (
      (member.kind === "player" && person.sectId === member.record.id)
      || (member.kind === "neutral" && person.neutralSectId === member.record.id)
    )));
}

function veinStock(vein: SpiritVeinNode): number {
  return vein.pouch.reduce((sum, row) => sum + row.count, 0);
}

function veinCap(tier: number): number {
  return tier >= 4 ? STOCK_CAP_HIGH : STOCK_CAP;
}

function ownedVeins(world: WorldState, member: Membership): SpiritVeinNode[] {
  return Object.values(world.spiritVeins ?? {}).filter((vein) => vein.ownerKind === member.kind && vein.ownerId === member.record.id);
}

function meritOf(record: SectRecord): number {
  return Math.max(0, Math.floor(record.sectMerit ?? 0));
}

export function sectTierOf(merit: number, veinCount: number): { tier: number; name: string } {
  if (merit >= 360 && veinCount >= 3) return { tier: 5, name: "一州之望" };
  if (merit >= 180 && veinCount >= 3) return { tier: 4, name: "大宗" };
  if (merit >= 80 && veinCount >= 2) return { tier: 3, name: "中宗" };
  if (merit >= 24) return { tier: 2, name: "小宗" };
  return { tier: 1, name: "初立山门" };
}

function tierOfMember(world: WorldState, member: Membership): { tier: number; name: string; merit: number; veinCount: number } {
  const merit = meritOf(member.record);
  const veinCount = ownedVeins(world, member).length;
  return { ...sectTierOf(merit, veinCount), merit, veinCount };
}

function addMerit(record: SectRecord, amount: number): number {
  record.sectMerit = Math.max(0, meritOf(record) + amount);
  return record.sectMerit;
}

export function grantSectMerit(world: WorldState, cultivator: Cultivator, amount: number): number {
  const member = membership(world, cultivator);
  if (!member || amount === 0) return member ? meritOf(member.record) : 0;
  return addMerit(member.record, amount);
}

export function clearSectPost(cultivator: Cultivator): void {
  cultivator.sectPost = null;
}

function giveItem(cultivator: Cultivator, itemId: ItemId, count = 1): void {
  cultivator.inventory[itemId] = (cultivator.inventory[itemId] ?? 0) + count;
}

function giveProgress(cultivator: Cultivator, amount: number): void {
  if (amount <= 0) return;
  cultivator.realmProgress = Math.min(PROGRESS_CAP, cultivator.realmProgress + amount);
}

function giveContribution(world: WorldState, cultivator: Cultivator, member: Membership, amount: number): void {
  if (amount === 0) return;
  const next = Math.max(0, cultivator.totalContribution + amount);
  if (next > cultivator.totalContribution) cultivator.contributionReachedAt = world.tick;
  cultivator.totalContribution = next;
  if (member.kind === "neutral") {
    cultivator.neutralContribution = Math.max(0, cultivator.neutralContribution + amount);
  }
}

function note(world: WorldState, cultivator: Cultivator, title: string, detail: string, mood: string, kind: "growth" | "fight" | "relationship" = "growth"): void {
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: kind === "fight" ? "person" : "insight",
    title,
    detail,
    locationId: cultivator.locationId,
    mood,
  }));
  recordLife(cultivator, { tick: world.tick, kind, text: detail });
}

function hurt(world: WorldState, cultivator: Cultivator, ticks: number): void {
  if (ticks <= cultivator.injuryTicksRemaining) return;
  cultivator.injuryTicksRemaining = ticks;
  noteWound(world, cultivator);
}

function postBlock(world: WorldState, cultivator: Cultivator, post: PostDef, member: Membership): string | null {
  if (cultivator.sectPost === post.id) return "你已经坐在这个职位上。";
  if (cultivator.sectPost) return "先辞掉现在的职位，再领下一份。";
  const used = holders(world, member, post.id).length;
  if (used >= post.slots) return `${post.name}只有 ${post.slots} 个名额，现在满了。`;
  const contribution = contributionOf(cultivator);
  const realm = cultivator.realmLevel;
  const rank = titleRank(cultivator.sectTitle);
  if (post.id === "outer-chore") return null;
  if (post.id === "inner-cultivate") {
    if (contribution >= 40 || realm >= 4 || rank >= 1) return null;
    return "内门要贡献满 40，或者境界到筑基，或者已经是内门弟子。";
  }
  if (post.id === "steward") {
    if (contribution >= 80 || rank >= 1) return null;
    return "执事要贡献满 80，或者已经是内门弟子。";
  }
  if (post.id === "elder") {
    if (realm < 4) return "长老要境界到筑基。炼气先把杂役做熟。";
    if (contribution >= 160 || rank >= 3) return null;
    return "长老要贡献满 160，或者已经挂着长老、宗主的头衔。";
  }
  const founder = member.kind === "player" && member.record.founderCultivatorId === cultivator.id;
  if ((founder || cultivator.sectTitle === "宗主") && realm >= 4) return null;
  if (contribution >= 400 && realm >= 7) return null;
  if (founder) return "开山的人到了筑基才能坐掌门席。这之前先做杂役。";
  return "掌门席只留给开山之人、宗主，或贡献满 400 并且到了金丹的弟子。全宗一席。";
}

function canGatherBand(cultivator: Cultivator, band: SpiritVeinBand): boolean {
  return cultivator.realmLevel >= BAND_REALM[band];
}

function standingOn(cultivator: Cultivator, vein: SpiritVeinNode): boolean {
  return cultivator.locationId === vein.locationId;
}

function chainBlock(world: WorldState, cultivator: Cultivator, chain: ChainDef, member: Membership): string | null {
  const realm = cultivator.realmLevel;
  const contribution = contributionOf(cultivator);
  const post = cultivator.sectPost;
  const rank = titleRank(cultivator.sectTitle);
  if (chain.id === "guard-vein") {
    const vein = Object.values(world.spiritVeins ?? {}).find((row) => standingOn(cultivator, row));
    if (!vein) return "护脉要站在那条脉上。";
    if (!canGatherBand(cultivator, vein.band)) return "你现在的境界还守不住这一脉。";
    if (vein.ownerId && !(vein.ownerKind === member.kind && vein.ownerId === member.record.id)) {
      return "这是别宗的脉。要夺就宣战，护脉护的是自己的，或还没有主的。";
    }
    return null;
  }
  if (chain.id === "patrol") {
    const location = world.locations[cultivator.locationId];
    const inState = location?.stateId === member.record.stateId;
    const wild = location?.nodeType === "wilderness";
    if (!atHeadquarters(cultivator, member) && !(inState && wild)) return "巡山从山门出发，或在本州荒野走。";
    return null;
  }
  if (!atHeadquarters(cultivator, member)) return "这件宗门事务要在山门做。";
  if (chain.id === "recruit-chore") return null;
  if (chain.id === "transmit") {
    if (post === "inner-cultivate" || post === "steward" || post === "elder" || post === "master-seat" || contribution >= 40 || rank >= 1) return null;
    return "传功要内门的职位，或贡献满 40。";
  }
  if (chain.id === "escort") {
    if (post === "steward" || post === "inner-cultivate" || post === "elder" || post === "master-seat" || contribution >= 80 || rank >= 1) return null;
    return "护送要执事、内门，或贡献满 80。";
  }
  if (post === "elder" || post === "master-seat") return null;
  return "议事只有长老和掌门能上堂。";
}

function gatherBlock(cultivator: Cultivator, vein: SpiritVeinNode, member: Membership): string | null {
  if (!standingOn(cultivator, vein)) return "人要到这条脉上才能收。";
  if (!(vein.ownerKind === member.kind && vein.ownerId === member.record.id)) return "这条脉不是本宗的，收不了。";
  if (!canGatherBand(cultivator, vein.band)) return "你现在的境界还吃不下这一脉的灵材。先把境界提上去。";
  if (veinStock(vein) <= 0) return "这一脉还没熟。过几个时辰再来收。";
  return null;
}

function raidBlock(world: WorldState, cultivator: Cultivator, vein: SpiritVeinNode, member: Membership): string | null {
  const post = cultivator.sectPost;
  const canLead = post === "elder" || post === "master-seat" || (post === "steward" && cultivator.realmLevel >= 4);
  if (!canLead) return "宣战要长老、掌门，或筑基以后的执事。炼气先把山门的活做熟。";
  if (cultivator.realmLevel < 4) return "筑基以前不要宣战。";
  if (vein.stateId !== member.record.stateId) return "先打本州的脉。人还没铺到别的州。";
  if (vein.ownerKind === "none" || !vein.ownerId) return "这条脉还没有主。去护脉，就能替山门收下。";
  if (vein.ownerKind === member.kind && vein.ownerId === member.record.id) return "这已经是本宗的脉。";
  if (!atHeadquarters(cultivator, member) && !standingOn(cultivator, vein)) return "宣战要在山门，或人已经站在那条脉上。";
  if ((member.record.lastRaidTick ?? -RAID_COOLDOWN) + RAID_COOLDOWN > world.tick) return "这宗刚刚动过手。过六个时辰再宣战。";
  if (vein.raidLockUntilTick > world.tick) return "这条脉刚打过。过几个时辰再来。";
  return null;
}

function takeFromPouch(vein: SpiritVeinNode): ItemId | null {
  const row = [...vein.pouch].sort((a, b) => b.count - a.count)[0];
  if (!row || row.count <= 0) return null;
  row.count -= 1;
  if (row.count <= 0) vein.pouch = vein.pouch.filter((entry) => entry.count > 0);
  return row.itemId;
}

function putPouch(vein: SpiritVeinNode, itemId: ItemId, cap: number): boolean {
  if (veinStock(vein) >= cap) return false;
  const row = vein.pouch.find((entry) => entry.itemId === itemId);
  if (row) row.count += 1;
  else vein.pouch.push({ itemId, count: 1 });
  return true;
}

function ownerMember(world: WorldState, vein: SpiritVeinNode): Membership | null {
  if (!vein.ownerId || vein.ownerKind === "none") return null;
  if (vein.ownerKind === "player") {
    const sect = world.sects[vein.ownerId];
    return sect ? { kind: "player", record: sect } : null;
  }
  const sect = world.neutralSects[vein.ownerId];
  return sect ? { kind: "neutral", record: sect } : null;
}

function pullShare(world: WorldState, cultivator: Cultivator, member: Membership): string {
  const veins = ownedVeins(world, member)
    .filter((vein) => vein.stateId === member.record.stateId && canGatherBand(cultivator, vein.band) && veinStock(vein) > 0)
    .sort((a, b) => veinStock(b) - veinStock(a));
  const vein = veins[0];
  if (!vein) return "库房这一趟没有现成的份额。脉要是熟了，下次执事、内门以上能带一份回来。";
  const itemId = takeFromPouch(vein);
  if (!itemId) return "库房这一趟没有现成的份额。";
  giveItem(cultivator, itemId);
  const name = ITEM_NAME[itemId] ?? itemId;
  return `山门从${vein.name}分了一份${name}到你手里。`;
}

function nextRequirement(world: WorldState, member: Membership): string {
  const current = tierOfMember(world, member);
  const level = member.kind === "player" ? buildSectLevel(world, member.record.id) : null;
  const levelSentence = level
    ? `个人贡献叠在一起，宗门等级现在是 ${level.level}，下一级要攒到 ${level.nextLevelExp}。`
    : "";
  if (current.tier <= 1) {
    return `再攒 ${24 - current.merit} 点宗门声望，${member.record.name}就能从初立山门升为小宗。做杂役、巡山、护脉都算在宗门身上。眼下声望是 ${current.merit}。${levelSentence}`;
  }
  if (current.tier === 2) {
    return `要升中宗，声望得到 80，并且本宗至少占住 2 条脉。眼下声望 ${current.merit}，占脉 ${current.veinCount}。${levelSentence}`;
  }
  if (current.tier === 3) {
    return `要升大宗，声望得到 180，并且把本州三条脉都占住。眼下声望 ${current.merit}，占脉 ${current.veinCount}。${levelSentence}`;
  }
  if (current.tier === 4) {
    return `三条脉还在的话，声望再攒到 360，${member.record.name}就能称一州之望。眼下声望 ${current.merit}。${levelSentence}`;
  }
  return `${member.record.name}已经是一州之望。守住本州的三条脉，别让人夺了。${levelSentence}`;
}

function dailyLine(cultivator: Cultivator, member: Membership, tierName: string): string {
  const post = cultivator.sectPost ? postOf(cultivator.sectPost) : null;
  if (!post) return "今天先在山门领一份外门杂役。杂役做完，宗门声望和你的贡献都会记上一笔。";
  if (cultivator.realmLevel < 4) {
    return `你现在是${post.name}。今天把本职做完，再去本宗的药田收一份炼气灵材。筑基以前别去宣战。`;
  }
  if (post.id === "elder" || post.id === "master-seat") {
    return `你现在是${post.name}。今天可以上堂议事，也可以看看本州哪条脉能夺。山门眼下是${tierName}。`;
  }
  return `你现在是${post.name}。今天做本职，再巡一趟山或者去护脉。山门眼下是${tierName}。`;
}

function ensureOneVein(
  world: WorldState,
  id: string,
  stateId: string,
  locationId: string,
  kind: SpiritVeinKind,
  band: SpiritVeinBand,
  name: string,
  ownerKind: SpiritVeinNode["ownerKind"],
  ownerId: string | null,
): void {
  const veins = world.spiritVeins ?? {};
  world.spiritVeins = veins;
  if (veins[id]) return;
  if (!world.locations[locationId]) return;
  veins[id] = {
    id,
    stateId,
    locationId,
    kind,
    band,
    name,
    ownerKind,
    ownerId,
    pouch: [],
    lastYieldTick: world.tick,
    raidLockUntilTick: 0,
  };
}

export function ensureSpiritVeins(world: WorldState): void {
  if (!world.spiritVeins) world.spiritVeins = {};
  for (const stateId of Object.keys(GEOGRAPHY_REGISTRY)) {
    const risk = stateRisk(stateId);
    const bands = bandsFor(risk);
    const name = stateName(stateId);
    const neutralId = neutralSectId(stateId);
    const neutral = neutralId ? world.neutralSects[neutralId] : undefined;
    const south = world.locations[`${stateId}:sub-town-south`] ? `${stateId}:sub-town-south` : `${stateId}:main-city`;
    const wild = `${stateId}:wilderness`;
    const hall = neutral?.headquarters ?? wild;
    const ownHerb = neutral ? "neutral" as const : "none" as const;
    const herbOwner = neutral ? neutral.id : null;
    const ownSpirit = risk === "high" || risk === "medium" || !neutral ? "none" as const : "neutral" as const;
    const spiritOwner = ownSpirit === "neutral" && neutral ? neutral.id : null;
    ensureOneVein(world, `${stateId}:herb-field`, stateId, south, "herb-field", bands.herb, `${name}药田`, ownHerb, herbOwner);
    ensureOneVein(world, `${stateId}:mine`, stateId, wild, "mine", bands.mine, `${name}矿脉`, "none", null);
    ensureOneVein(world, `${stateId}:spirit-vein`, stateId, hall, "spirit-vein", bands.spirit, `${name}灵脉`, ownSpirit, spiritOwner);
  }
}

export function settleVeinYields(world: WorldState): void {
  ensureSpiritVeins(world);
  for (const vein of Object.values(world.spiritVeins ?? {})) {
    const elapsed = world.tick - vein.lastYieldTick;
    const steps = Math.floor(elapsed / YIELD_INTERVAL);
    if (steps <= 0) continue;
    const apply = Math.min(steps, 6);
    vein.lastYieldTick += steps * YIELD_INTERVAL;
    const owner = ownerMember(world, vein);
    const tier = owner ? tierOfMember(world, owner).tier : 1;
    const per = tier >= 3 ? 2 : 1;
    const cap = veinCap(tier);
    const items = BAND_ITEMS[vein.band];
    const base = Math.floor(vein.lastYieldTick / YIELD_INTERVAL);
    for (let i = 0; i < apply; i += 1) {
      for (let k = 0; k < per; k += 1) {
        const itemId = items[(base + i + k) % items.length];
        if (!itemId) continue;
        putPouch(vein, itemId, cap);
      }
    }
  }
}

function veinView(world: WorldState, cultivator: Cultivator, vein: SpiritVeinNode, member: Membership) {
  const owner = ownerMember(world, vein);
  const yours = vein.ownerKind === member.kind && vein.ownerId === member.record.id;
  const gatherOk = gatherBlock(cultivator, vein, member) === null;
  return {
    id: vein.id,
    name: vein.name,
    kind: vein.kind,
    band: vein.band,
    locationId: vein.locationId,
    locationName: world.locations[vein.locationId]?.name ?? vein.locationId,
    ownerName: owner?.record.name ?? "还没有主",
    yours,
    stock: veinStock(vein),
    materials: `${BAND_SENTENCE[vein.band]}人要到${world.locations[vein.locationId]?.name ?? "那一处"}才能收。`,
    gatherActionId: gatherOk ? `gather-vein:${vein.id}` : null,
  };
}

function postView(world: WorldState, cultivator: Cultivator, post: PostDef, member: Membership): SectLifePostView {
  const block = postBlock(world, cultivator, post, member);
  const held = cultivator.sectPost === post.id;
  return {
    id: post.id,
    name: post.name,
    duty: post.duty,
    benefit: post.benefit,
    requirement: held ? "这就是你现在的职位。" : (block ?? "现在可以领。"),
    slotsUsed: holders(world, member, post.id).length,
    slotsMax: post.slots,
    held,
    canTake: block === null,
    actionId: block === null ? `take-post:${post.id}` : null,
  };
}

export function buildSectLifeView(world: WorldState, cultivator: Cultivator): SectLifeView | null {
  ensureSpiritVeins(world);
  const member = membership(world, cultivator);
  if (!member) return null;
  const tier = tierOfMember(world, member);
  const posts = POSTS.map((post) => postView(world, cultivator, post, member));
  const held = posts.find((post) => post.held) ?? null;
  const inState = Object.values(world.spiritVeins ?? {}).filter((vein) => vein.stateId === member.record.stateId);
  const ownedElsewhere = ownedVeins(world, member).filter((vein) => vein.stateId !== member.record.stateId);
  const veins = [...inState, ...ownedElsewhere].map((vein) => veinView(world, cultivator, vein, member));
  const chains = CHAINS.flatMap((chain) => {
    const block = chainBlock(world, cultivator, chain, member);
    if (block) return [];
    return [{ id: chain.id, name: chain.name, actionId: `sect-chain:${chain.id}`, summary: chain.summary }];
  });
  const raids = Object.values(world.spiritVeins ?? {}).flatMap((vein) => {
    const block = raidBlock(world, cultivator, vein, member);
    if (block) return [];
    return [{
      veinId: vein.id,
      name: vein.name,
      actionId: `declare-raid:${vein.id}`,
      summary: `${vein.name}现在归${ownerMember(world, vein)?.record.name ?? "别人"}。夺下来，出产就转到本宗。`,
    }];
  });
  return {
    sectId: member.record.id,
    sectName: member.record.name,
    post: held,
    posts,
    tier: tier.tier,
    tierName: tier.name,
    merit: tier.merit,
    veinCount: tier.veinCount,
    nextRequirement: nextRequirement(world, member),
    daily: dailyLine(cultivator, member, tier.name),
    veins,
    chains,
    raids,
  };
}

export function sectLifeGuidance(world: WorldState, cultivator: Cultivator): { priority: string; actionId: ActionId } | null {
  const view = buildSectLifeView(world, cultivator);
  const member = membership(world, cultivator);
  if (!view || !member) return null;
  const here = view.veins.find((vein) => vein.gatherActionId && vein.locationId === cultivator.locationId);
  if (here?.gatherActionId) {
    return { priority: view.daily, actionId: here.gatherActionId as ActionId };
  }
  if (atHeadquarters(cultivator, member)) {
    if (cultivator.sectPost) return { priority: view.daily, actionId: "post-duty" };
    return { priority: view.daily, actionId: "take-post:outer-chore" };
  }
  return { priority: `${view.daily}人现在不在山门。`, actionId: `travel-to:${member.record.headquarters}` as ActionId };
}

export function listSectLifeActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const member = membership(world, cultivator);
  if (!member) return [];
  ensureSpiritVeins(world);
  const actions: AvailableAction[] = [];
  for (const post of POSTS) {
    if (postBlock(world, cultivator, post, member) !== null) continue;
    actions.push({
      actionId: `take-post:${post.id}`,
      label: `领职：${post.name}`,
      description: `${post.duty}${post.benefit}名额 ${holders(world, member, post.id).length}/${post.slots}。`,
      durationTicks: 0,
      kind: "immediate",
    });
  }
  if (cultivator.sectPost) {
    const post = postOf(cultivator.sectPost);
    actions.push({
      actionId: "resign-post",
      label: "辞去职位",
      description: post ? `辞掉${post.name}。名额会空出来，今天的本职也不能再做。` : "辞掉现在的职位。",
      durationTicks: 0,
      kind: "immediate",
    });
    if (post && atHeadquarters(cultivator, member)) {
      actions.push({
        actionId: "post-duty",
        label: `本职：${post.name}`,
        description: post.duty,
        durationTicks: post.dutyTicks,
        kind: "timed",
      });
    }
  }
  for (const chain of CHAINS) {
    if (chainBlock(world, cultivator, chain, member) !== null) continue;
    actions.push({
      actionId: `sect-chain:${chain.id}`,
      label: `宗门事务：${chain.name}`,
      description: chain.summary,
      durationTicks: chain.ticks,
      kind: "timed",
    });
  }
  for (const vein of Object.values(world.spiritVeins ?? {})) {
    if (gatherBlock(cultivator, vein, member) === null) {
      actions.push({
        actionId: `gather-vein:${vein.id}`,
        label: `收脉：${vein.name}`,
        description: `${vein.name}里有 ${veinStock(vein)} 份熟了的灵材。${BAND_SENTENCE[vein.band]}`,
        durationTicks: 1,
        kind: "timed",
      });
    }
    if (raidBlock(world, cultivator, vein, member) !== null) continue;
    const ownerName = ownerMember(world, vein)?.record.name ?? "别人";
    actions.push({
      actionId: `declare-raid:${vein.id}`,
      label: `宣战夺脉：${vein.name}`,
      description: `向${ownerName}动手，抢${vein.name}。拿下以后出产归本宗。打输会挂伤，贡献也会掉。`,
      durationTicks: 2,
      kind: "timed",
    });
  }
  return actions;
}

export function performSectImmediate(world: WorldState, cultivator: Cultivator, actionId: string): string | null {
  if (actionId === "resign-post") {
    const member = membership(world, cultivator);
    if (!member) throw new GameplayRejection("你还没有宗门，没有职位可辞。");
    const post = cultivator.sectPost ? postOf(cultivator.sectPost) : null;
    if (!post) throw new GameplayRejection("你现在没有职位。");
    if (!atHeadquarters(cultivator, member)) throw new GameplayRejection("辞职位要回山门。");
    clearSectPost(cultivator);
    const detail = `${cultivator.name}辞掉了${member.record.name}的${post.name}。名额空了出来。`;
    note(world, cultivator, "辞了职位", detail, "今天不再管这份活");
    return detail;
  }
  if (!actionId.startsWith("take-post:")) return null;
  const post = postOf(actionId.slice("take-post:".length));
  const member = membership(world, cultivator);
  if (!member) throw new GameplayRejection("先加入一座宗门，才能领职位。");
  if (!post) throw new GameplayRejection("没有这个职位。");
  if (!atHeadquarters(cultivator, member)) throw new GameplayRejection("领职位要在山门。");
  const block = postBlock(world, cultivator, post, member);
  if (block) throw new GameplayRejection(block);
  cultivator.sectPost = post.id;
  const detail = `${cultivator.name}在${member.record.name}领了${post.name}。${post.duty}`;
  note(world, cultivator, `领了${post.name}`, detail, "名字落在职册上了");
  return detail;
}

export function isSectTimedAction(actionId: string): boolean {
  return actionId === "post-duty"
    || actionId.startsWith("sect-chain:")
    || actionId.startsWith("gather-vein:")
    || actionId.startsWith("declare-raid:");
}

export function beginSectTimed(world: WorldState, cultivator: Cultivator, actionId: string): { label: string; ticks: number } {
  ensureSpiritVeins(world);
  const member = membership(world, cultivator);
  if (!member) throw new GameplayRejection("这件事务要先有宗门。");
  if (actionId === "post-duty") {
    const post = cultivator.sectPost ? postOf(cultivator.sectPost) : null;
    if (!post) throw new GameplayRejection("你还没有职位。先领一份，再做本职。");
    if (!atHeadquarters(cultivator, member)) throw new GameplayRejection("本职要在山门做。");
    return { label: post.name, ticks: post.dutyTicks };
  }
  if (actionId.startsWith("sect-chain:")) {
    const chain = chainOf(actionId.slice("sect-chain:".length));
    if (!chain) throw new GameplayRejection("没有这件宗门事务。");
    const block = chainBlock(world, cultivator, chain, member);
    if (block) throw new GameplayRejection(block);
    return { label: chain.name, ticks: chain.ticks };
  }
  if (actionId.startsWith("gather-vein:")) {
    const vein = world.spiritVeins?.[actionId.slice("gather-vein:".length)];
    if (!vein) throw new GameplayRejection("地图上没有这条脉。");
    const block = gatherBlock(cultivator, vein, member);
    if (block) throw new GameplayRejection(block);
    return { label: vein.name, ticks: 1 };
  }
  if (actionId.startsWith("declare-raid:")) {
    const vein = world.spiritVeins?.[actionId.slice("declare-raid:".length)];
    if (!vein) throw new GameplayRejection("地图上没有这条脉。");
    const block = raidBlock(world, cultivator, vein, member);
    if (block) throw new GameplayRejection(block);
    return { label: `夺${vein.name}`, ticks: 2 };
  }
  throw new GameplayRejection("这不是宗门事务。");
}

function payWork(
  world: WorldState,
  cultivator: Cultivator,
  member: Membership,
  reward: { contribution: number; merit: number; stones: number; progress: number },
): void {
  giveContribution(world, cultivator, member, reward.contribution);
  addMerit(member.record, reward.merit);
  cultivator.spiritStones += reward.stones;
  giveProgress(cultivator, reward.progress);
}

function raidSucceeds(world: WorldState, cultivator: Cultivator, vein: SpiritVeinNode, member: Membership): boolean {
  if (cultivator.realmLevel < BAND_REALM[vein.band]) return false;
  const owner = ownerMember(world, vein);
  const ownerMerit = owner ? meritOf(owner.record) : 0;
  const selfMerit = meritOf(member.record);
  const post = cultivator.sectPost;
  if (
    (post === "elder" || post === "master-seat")
    && selfMerit >= 24
    && ownerMerit < selfMerit
    && (vein.band === "qi" || vein.band === "foundation")
  ) {
    return true;
  }
  if (ownerMerit >= selfMerit + 40 && post !== "elder" && post !== "master-seat") return false;
  const chance = Math.min(92, 48 + (post === "elder" || post === "master-seat" ? 18 : 8) + (selfMerit > ownerMerit ? 16 : 0));
  return hashString(`${world.tick}:${cultivator.id}:${vein.id}:raid`) % 100 < chance;
}

function resolveRaid(world: WorldState, cultivator: Cultivator, vein: SpiritVeinNode, member: Membership): string {
  const previous = ownerMember(world, vein);
  const defenders = previous
    ? previous.record.memberIds
      .map((id) => world.cultivators[id])
      .filter((person): person is Cultivator => Boolean(
        person
        && person.id !== cultivator.id
        && person.locationId === vein.locationId
        && ((previous.kind === "player" && person.sectId === previous.record.id)
          || (previous.kind === "neutral" && person.neutralSectId === previous.record.id)),
      ))
    : [];
  for (const defender of defenders) {
    addMutualGrudge(world, cultivator.id, defender.id, GRUDGE_FROM_DUEL);
    hurt(world, defender, 2);
  }
  member.record.lastRaidTick = world.tick;
  vein.raidLockUntilTick = world.tick + RAID_COOLDOWN;
  const success = raidSucceeds(world, cultivator, vein, member);
  if (!success) {
    hurt(world, cultivator, 2);
    giveContribution(world, cultivator, member, -12);
    addMerit(member.record, -8);
    const detail = `${cultivator.name}突袭${vein.name}没能拿下。人受了伤，贡献也掉了一截。`;
    note(world, cultivator, "突袭没拿下", detail, "这一趟亏了", "fight");
    return detail;
  }
  vein.ownerKind = member.kind;
  vein.ownerId = member.record.id;
  addMerit(member.record, 24);
  giveContribution(world, cultivator, member, 20);
  const detail = `${cultivator.name}夺下了${vein.name}。这条脉以后归${member.record.name}，出产也跟着转过来。`;
  note(world, cultivator, "夺下了脉", detail, "山门大了一圈", "fight");
  if (previous) {
    const loss = `山门失守。${vein.name}被${member.record.name}夺走了。`;
    for (const id of previous.record.memberIds) {
      const person = world.cultivators[id];
      if (!person || person.id === cultivator.id) continue;
      note(world, person, "山门失守", loss, "脉不在自己手里了", "relationship");
    }
  }
  return detail;
}

export function resolveSectTimed(world: WorldState, cultivator: Cultivator, actionId: string): string {
  ensureSpiritVeins(world);
  const member = membership(world, cultivator);
  if (!member) return `${cultivator.name}已经不在宗门里，这件事务作罢。`;
  if (actionId === "post-duty") {
    const post = cultivator.sectPost ? postOf(cultivator.sectPost) : null;
    if (!post) return `${cultivator.name}中途把职位辞了，本职没有做成。`;
    payWork(world, cultivator, member, post);
    const share = post.id === "outer-chore" ? "药田要自己去收。" : pullShare(world, cultivator, member);
    const tier = tierOfMember(world, member);
    const detail = `${cultivator.name}做完了${post.name}的本职。贡献和宗门声望都记上了，${member.record.name}现在是${tier.name}。${share}`;
    note(world, cultivator, `做完${post.name}`, detail, "今天的活落了地");
    return detail;
  }
  if (actionId.startsWith("sect-chain:")) {
    const chain = chainOf(actionId.slice("sect-chain:".length));
    if (!chain) return `${cultivator.name}没找到这件事务。`;
    if (chain.id === "guard-vein") {
      const vein = Object.values(world.spiritVeins ?? {}).find((row) => standingOn(cultivator, row));
      if (!vein) return `${cultivator.name}没站在脉上，护脉作罢。`;
      const owned = vein.ownerKind === member.kind && vein.ownerId === member.record.id;
      if (!owned && vein.ownerId) return `${vein.name}是别宗的，这一趟没有护成。`;
      if (!owned) {
        vein.ownerKind = member.kind;
        vein.ownerId = member.record.id;
      } else {
        putPouch(vein, BAND_ITEMS[vein.band][0]!, veinCap(tierOfMember(world, member).tier));
      }
      payWork(world, cultivator, member, chain);
      const detail = owned
        ? `${cultivator.name}守完了${vein.name}。脉还在本宗手里，库里又多了一份。`
        : `${cultivator.name}护着${vein.name}走了一趟。这条脉还没有主，现在归${member.record.name}。`;
      note(world, cultivator, "护脉", detail, "脉还在");
      return detail;
    }
    if (chain.id === "patrol") {
      const roll = hashString(`${world.tick}:${cultivator.id}:patrol`) % 5;
      if (roll === 0) hurt(world, cultivator, 1);
    }
    if (chain.id === "transmit") {
      const fellow = member.record.memberIds
        .map((id) => world.cultivators[id])
        .find((person) => person && person.id !== cultivator.id && person.locationId === cultivator.locationId);
      if (fellow) {
        giveProgress(fellow, 2);
        note(world, fellow, "同门传了一手", `${cultivator.name}在山门传功，${fellow.name}在旁边听完，修为轻轻动了一点。`, "听了一手");
      }
    }
    if (chain.id === "council") {
      const until = member.record.councilUntilTick ?? 0;
      if (world.tick > until) {
        member.record.councilVotes = 1;
        member.record.councilUntilTick = world.tick + 12;
      } else {
        member.record.councilVotes = (member.record.councilVotes ?? 0) + 1;
      }
      if ((member.record.councilVotes ?? 0) >= 2) {
        addMerit(member.record, 12);
        member.record.councilVotes = 0;
      }
    }
    payWork(world, cultivator, member, chain);
    const tier = tierOfMember(world, member);
    const detail = `${cultivator.name}办完了${chain.name}。${member.record.name}的声望动了，眼下是${tier.name}。`;
    note(world, cultivator, chain.name, detail, "这件事务算数");
    return detail;
  }
  if (actionId.startsWith("gather-vein:")) {
    const vein = world.spiritVeins?.[actionId.slice("gather-vein:".length)];
    if (!vein) return `${cultivator.name}没有找到那条脉。`;
    if (gatherBlock(cultivator, vein, member) && veinStock(vein) <= 0) {
      return `${cultivator.name}在${vein.name}转了一圈，这一趟没收到。脉还是空的。`;
    }
    if (vein.ownerKind !== member.kind || vein.ownerId !== member.record.id) {
      return `${vein.name}已经不是本宗的，这一趟没有收成。`;
    }
    const itemId = takeFromPouch(vein);
    if (!itemId) return `${cultivator.name}在${vein.name}转了一圈，这一趟没收到。脉还是空的。`;
    giveItem(cultivator, itemId);
    const name = ITEM_NAME[itemId] ?? itemId;
    const detail = `${cultivator.name}从${vein.name}收了一份${name}。`;
    note(world, cultivator, `收下${name}`, detail, "手里多了一份灵材");
    return detail;
  }
  if (actionId.startsWith("declare-raid:")) {
    const vein = world.spiritVeins?.[actionId.slice("declare-raid:".length)];
    if (!vein) return `${cultivator.name}没有找到那条脉。`;
    return resolveRaid(world, cultivator, vein, member);
  }
  return `${cultivator.name}把这件事务放下了。`;
}

export function sameSectBond(left: Cultivator, right: Cultivator): boolean {
  return sameSect(left, right);
}
