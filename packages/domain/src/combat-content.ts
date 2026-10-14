import {
  extractFiveElementScores,
} from "./attributes.js";
import {
  SPELL_BRANCH_ELEMENT_MAP,
  SPELL_LOADOUT_DEFINITIONS,
  WEAPON_LOADOUT_DEFINITIONS,
  WEAPON_TYPE_DEFINITIONS,
} from "./combat-loadouts.js";
import type {
  CombatNextGear,
  Cultivator,
  FiveElementId,
  ItemId,
  SpellBranchId,
  SpellLoadoutId,
  WeaponFamilyId,
  WeaponLoadoutId,
  WeaponTypeId,
} from "./model.js";
import { deriveSpiritRootKindId, sortedElementEntries } from "./registration-taxonomy.js";
import { realmStageForLevel } from "./realms.js";

/**
 * Realm bands already used by the ladder: 炼气 1–3, 筑基 4–6, 金丹 7–9, 元婴 10–12, 化神 13–15.
 * Weapon tiers and spell manuals use the same five steps. The manual words are 入门, 小成, 大成, 大圆满, 化神.
 * Existing loadout titles still say 入门篇 through 秘传篇. The agent-facing rank is this ladder.
 */
export const CONTENT_BANDS = [
  { realm: "炼气", minLevel: 1, tier: 1 as const, manualRank: "入门" },
  { realm: "筑基", minLevel: 4, tier: 2 as const, manualRank: "小成" },
  { realm: "金丹", minLevel: 7, tier: 3 as const, manualRank: "大成" },
  { realm: "元婴", minLevel: 10, tier: 4 as const, manualRank: "大圆满" },
  { realm: "化神", minLevel: 13, tier: 5 as const, manualRank: "化神" },
] as const;

export type ContentTier = 1 | 2 | 3 | 4 | 5;
export type ManualRankName = (typeof CONTENT_BANDS)[number]["manualRank"];

export {
  CATALOG_ELEMENTS,
  CATALOG_FAMILIES,
  CONTENT_SKILLS,
  type CatalogRank,
  type CatalogTier,
  type ContentSkill,
} from "./combat-catalog.js";

export function bandForTier(tier: number) {
  return CONTENT_BANDS.find((band) => band.tier === tier) ?? CONTENT_BANDS[0]!;
}

export function bandForLevel(realmLevel: number) {
  const realm = realmStageForLevel(realmLevel);
  return CONTENT_BANDS.find((band) => band.realm === realm) ?? CONTENT_BANDS[0]!;
}

export function tierAllowed(realmLevel: number, tier: number): boolean {
  return realmLevel >= bandForTier(tier).minLevel;
}

export function primaryRootElements(cultivator: Cultivator): FiveElementId[] {
  const scores = extractFiveElementScores(cultivator.registrationRecord);
  const kind = cultivator.registrationRecord?.result.spirit_root_kind_id
    ?? (cultivator.registrationRecord ? deriveSpiritRootKindId(scores) : "dual-root");
  const sorted = sortedElementEntries(scores);
  const first = sorted[0]?.[0] ?? "metal";
  const second = sorted[1]?.[0] ?? "wood";
  return kind === "single-root" ? [first] : [first, second];
}

const SHOP_WEAPON: Record<ContentTier, number> = { 1: 120, 2: 270, 3: 480, 4: 780, 5: 1200 };
const SHOP_SPELL: Record<ContentTier, number> = { 1: 90, 2: 210, 3: 390, 4: 660, 5: 1020 };
const SECT_WEAPON: Record<ContentTier, number> = { 1: 80, 2: 180, 3: 320, 4: 520, 5: 800 };
const SECT_SPELL: Record<ContentTier, number> = { 1: 60, 2: 140, 3: 260, 4: 440, 5: 680 };
const CONTRIBUTION_GATE: Record<ContentTier, number> = { 1: 0, 2: 40, 3: 80, 4: 140, 5: 220 };

const ELEMENT_BRANCH: Record<FiveElementId, SpellBranchId> = {
  metal: "metal-edge",
  wood: "wood-growth",
  water: "water-flow",
  fire: "fire-blaze",
  earth: "earth-wall",
};

export function seekLine(channel: "weapon" | "spell", tier: number): string {
  const band = bandForTier(tier);
  const thing = channel === "weapon" ? "兵器" : "功法";
  if (tier >= 5) {
    return `化神这一阶${thing}，先得自己破进化神。洞府破境要的灵材在甲级地宫七层到九层。兵器和功法的锻造材料也从七层起。到了化神，坊市和宗门才卖这一阶，宗门要贡献 220，不扣。`;
  }
  if (tier >= 4) {
    return `元婴这一阶${thing}，先得自己破进元婴。洞府破境要的灵材从甲级地宫四层起。四层往上也能出大圆满的锻造材料，七层往上才是化神。到了元婴，坊市和宗门才卖这一阶，宗门要贡献 140，不扣。`;
  }
  const where = tier <= 2
    ? "丙级地宫六层往上、坊市，或宗门"
    : "乙级地宫五层往上、坊市，或宗门";
  return `${band.realm}这一阶${thing}，${where}。坊市和宗门只卖你这把兵器、这门功法还缺的下一阶，不让你跳阶。破境会悟到一点，护送或守关办成，有时留下一页残页。把功法或兵器送给别人，对方用掉才会学会。`;
}

export function weaponNameAtTier(typeId: WeaponTypeId, tier: number): string | null {
  const found = Object.values(WEAPON_LOADOUT_DEFINITIONS).find(
    (weapon) => weapon.weaponTypeId === typeId && (weapon.weaponTier ?? 1) === tier,
  );
  return found?.name ?? null;
}

export function manualNameAtTier(branchId: SpellBranchId, tier: number): string | null {
  const found = Object.values(SPELL_LOADOUT_DEFINITIONS).find(
    (spell) => spell.spellBranchId === branchId && (spell.spellTier ?? 1) === tier,
  );
  return found?.name ?? null;
}

export interface GearOffer extends CombatNextGear {
  itemId: ItemId;
  kind: "weapon" | "spell";
}

function counts(cultivator: Cultivator, itemId: ItemId): number {
  return cultivator.inventory[itemId] ?? 0;
}

function nextWeaponLoadout(cultivator: Cultivator) {
  const equipped = cultivator.equippedWeaponLoadoutId
    ? WEAPON_LOADOUT_DEFINITIONS[cultivator.equippedWeaponLoadoutId]
    : null;
  const typeId = equipped?.weaponTypeId ?? "sword";
  const owned = new Set(cultivator.unlockedWeaponLoadoutIds);
  return Object.values(WEAPON_LOADOUT_DEFINITIONS)
    .filter((weapon) => weapon.weaponTypeId === typeId)
    .sort((a, b) => (a.weaponTier ?? 1) - (b.weaponTier ?? 1))
    .find((weapon) => !owned.has(weapon.id) && counts(cultivator, `weapon-item-${weapon.id}` as ItemId) <= 0) ?? null;
}

function nextSpellLoadout(cultivator: Cultivator) {
  const equipped = cultivator.equippedSpellLoadoutId
    ? SPELL_LOADOUT_DEFINITIONS[cultivator.equippedSpellLoadoutId]
    : null;
  const branch = equipped?.spellBranchId ?? ELEMENT_BRANCH[primaryRootElements(cultivator)[0] ?? "metal"];
  const owned = new Set(cultivator.unlockedSpellLoadoutIds);
  return Object.values(SPELL_LOADOUT_DEFINITIONS)
    .filter((spell) => spell.spellBranchId === branch)
    .sort((a, b) => (a.spellTier ?? 1) - (b.spellTier ?? 1))
    .find((spell) => !owned.has(spell.id) && counts(cultivator, `spell-manual-${spell.id}` as ItemId) <= 0) ?? null;
}

function offerFrom(kind: "weapon" | "spell", id: string, name: string, tier: ContentTier, realmLevel: number): GearOffer {
  const band = bandForTier(tier);
  return {
    id,
    name,
    tier,
    realm: band.realm,
    manualRank: band.manualRank,
    reachable: tierAllowed(realmLevel, tier),
    shopPrice: kind === "weapon" ? SHOP_WEAPON[tier] : SHOP_SPELL[tier],
    sectPrice: kind === "weapon" ? SECT_WEAPON[tier] : SECT_SPELL[tier],
    contributionGate: CONTRIBUTION_GATE[tier],
    seek: seekLine(kind, tier),
    itemId: (kind === "weapon" ? `weapon-item-${id}` : `spell-manual-${id}`) as ItemId,
    kind,
  };
}

export function gearOffer(cultivator: Cultivator, kind: "weapon" | "spell"): GearOffer | null {
  if (kind === "weapon") {
    const weapon = nextWeaponLoadout(cultivator);
    if (!weapon) return null;
    return offerFrom("weapon", weapon.id, weapon.name, (weapon.weaponTier ?? 1) as ContentTier, cultivator.realmLevel);
  }
  const spell = nextSpellLoadout(cultivator);
  if (!spell) return null;
  return offerFrom("spell", spell.id, spell.name, (spell.spellTier ?? 1) as ContentTier, cultivator.realmLevel);
}

export function nextGearViews(cultivator: Cultivator): { nextWeapon: CombatNextGear | null; nextManual: CombatNextGear | null } {
  const weapon = gearOffer(cultivator, "weapon");
  const manual = gearOffer(cultivator, "spell");
  const view = (offer: GearOffer | null): CombatNextGear | null => {
    if (!offer) return null;
    const { itemId: _itemId, kind: _kind, ...rest } = offer;
    return rest;
  };
  return { nextWeapon: view(weapon), nextManual: view(manual) };
}

function earnedContribution(cultivator: Cultivator): number {
  return cultivator.sectId ? cultivator.totalContribution : cultivator.neutralContribution;
}

export function purchaseNextGear(
  cultivator: Cultivator,
  kind: "weapon" | "spell",
  path: "shop" | "sect",
): { itemId: ItemId; price: number; name: string; summary: string } {
  const offer = gearOffer(cultivator, kind);
  if (!offer) throw new Error(kind === "weapon" ? "这把兵器没有更高的一阶了。" : "这门功法没有更高的一阶了。");
  if (!offer.reachable) {
    throw new Error(`要到${offer.realm}才能拿${offer.name}。现在买回去也装备不上。`);
  }
  if (path === "sect") {
    if (!cultivator.sectId && !cultivator.neutralSectId) throw new Error("得先入一门宗，才能用贡献换。");
    const earned = earnedContribution(cultivator);
    if (earned < offer.contributionGate) {
      throw new Error(`宗门贡献还没到${offer.contributionGate}。先把宗里的差事做一做。`);
    }
  }
  const price = path === "shop" ? offer.shopPrice : offer.sectPrice;
  if (cultivator.spiritStones < price) throw new Error(`灵石不够。要${price}，身上只有${cultivator.spiritStones}。`);
  cultivator.spiritStones -= price;
  cultivator.inventory[offer.itemId] = counts(cultivator, offer.itemId) + 1;
  const where = path === "shop" ? "坊市" : "宗门";
  const summary = `${cultivator.name}在${where}取到了${offer.name}，花了${price}灵石。用掉以后才学会，不会自动换上。`;
  return { itemId: offer.itemId, price, name: offer.name, summary };
}

export function dungeonSourceTier(grade: "丙" | "乙" | "甲", rank: number): ContentTier {
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  if (grade === "丙") return step >= 6 ? 2 : 1;
  if (grade === "乙") return step >= 5 ? 3 : 2;
  if (step >= 7) return 5;
  if (step >= 4) return 4;
  return 3;
}

function fragmentOf(branch: SpellBranchId, tier: ContentTier): ItemId | null {
  const spell = Object.values(SPELL_LOADOUT_DEFINITIONS).find(
    (entry) => entry.spellBranchId === branch && (entry.spellTier ?? 1) === tier,
  );
  if (!spell) return null;
  return `spell-fragment-${spell.id}` as ItemId;
}

export function insightFragmentFor(cultivator: Cultivator): ItemId | null {
  const equipped = cultivator.equippedSpellLoadoutId
    ? SPELL_LOADOUT_DEFINITIONS[cultivator.equippedSpellLoadoutId]
    : null;
  const branch = equipped?.spellBranchId ?? ELEMENT_BRANCH[primaryRootElements(cultivator)[0] ?? "metal"];
  const tier = bandForLevel(cultivator.realmLevel).tier;
  const itemId = fragmentOf(branch, tier);
  if (!itemId) return null;
  const spell = Object.values(SPELL_LOADOUT_DEFINITIONS).find(
    (entry) => entry.spellBranchId === branch && (entry.spellTier ?? 1) === tier,
  );
  if (spell && cultivator.unlockedSpellLoadoutIds.includes(spell.id as SpellLoadoutId)) return null;
  if (counts(cultivator, itemId) > 0) return null;
  return itemId;
}

export function favorFragmentFor(cultivator: Cultivator): ItemId | null {
  const element = primaryRootElements(cultivator)[0] ?? "metal";
  const branch = ELEMENT_BRANCH[element];
  const tier = bandForLevel(cultivator.realmLevel).tier;
  const itemId = fragmentOf(branch, tier);
  if (!itemId) return null;
  if (counts(cultivator, itemId) > 0) return null;
  return itemId;
}

export function equipTierOf(kind: "weapon" | "spell", id: string): number {
  if (kind === "weapon") return WEAPON_LOADOUT_DEFINITIONS[id as WeaponLoadoutId]?.weaponTier ?? 1;
  return SPELL_LOADOUT_DEFINITIONS[id as SpellLoadoutId]?.spellTier ?? 1;
}

export function weaponFamilyOf(typeId: WeaponTypeId): WeaponFamilyId {
  return WEAPON_TYPE_DEFINITIONS[typeId].weaponFamilyId;
}

export function spellElementOf(branchId: SpellBranchId): FiveElementId {
  return SPELL_BRANCH_ELEMENT_MAP[branchId];
}
