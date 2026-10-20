/**
 * Social Relationship System (社交关系系统)
 *
 * Affinity levels between cultivators:
 *   1. 认识 (Acquaintance)  — threshold: 0
 *   2. 熟识 (Familiar)      — threshold: 20
 *   3. 朋友 (Friend)        — threshold: 60
 *   4. 好友 (Close Friend)  — threshold: 120
 *   5. 挚友 (Best Friend)   — threshold: 200
 *
 * Special bonds (require 好友+ affinity):
 *   - 道侣 (Dao Companion)  — mutual application + approval
 *
 * Actions:
 *   - 搭讪 (chat-up)   — same location, any cultivator, immediate
 *   - 传音 (voice-transmit) — anywhere, friends/道侣 only, immediate
 *   - 申请道侣 (propose-dao-companion) — 好友+ affinity, immediate
 *   - 响应道侣 (respond-dao-companion) — accept/reject proposal
 */

import type { BondArc, Cultivator, GrudgeArc, OwedFavorView, WorldState } from "./model.js";
import {
  bondArcOf,
  grudgeArcOf,
  noteBondCrossing,
  noteGrudgeCrossing,
} from "./inner-life.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AffinityLevel = "认识" | "熟识" | "朋友" | "好友" | "挚友";

export type SpecialBond = "道侣";

export interface SocialLink {
  readonly targetCultivatorId: string;
  readonly affinity: number;
  readonly specialBond: SpecialBond | null;
  readonly firstMetTick: number;
  readonly lastInteractionTick: number;
  /** Tick of the last 搭讪. Passive affinity does not refresh this. */
  readonly lastChatUpTick?: number;
  /** Positive means the other cultivator owes this one a favor. */
  readonly favorBalance?: number;
  /** Set after a city duel. Stays until a later story clears it. */
  readonly rival?: boolean;
  /** Tick of the last public rivalry scene. Keeps press-rival from firing every tick. */
  readonly lastRivalSceneTick?: number;
  /** This cultivator's result in the latest city duel with the target. */
  readonly lastDuelResult?: CityDuelResult;
  readonly lastDuelStoneDelta?: number;
  readonly lastDuelTick?: number;
  /** Latest gift that changed hands with the target. */
  readonly lastGiftResult?: GiftExchangeResult;
  /** Tick of the last spoken line this cultivator sent. */
  readonly lastSpokenTick?: number;
  readonly lastSpokenLine?: string;
  readonly lastSpokenKind?: string;
  /** Free-chat turns inside the current short exchange. */
  readonly dialogueDepth?: number;
  readonly lastGiftItemName?: string;
  readonly lastGiftTick?: number;
  /** Mutual resentment. Absent on older saves, treated as 0. */
  readonly grudge?: number;
  /** Tick of the last 知己 spar-teach between this pair. */
  readonly lastSparTeachTick?: number;
  /** Tick of the last 知己 spirit-stone share between this pair. */
  readonly lastShareTick?: number;
  /** Reasons this cultivator is owed, oldest first. Absent on older saves. */
  readonly owedFavors?: readonly OwedFavorEntry[];
}

export interface OwedFavorEntry {
  readonly id: string;
  readonly reason: string;
  readonly tick: number;
  readonly source: string;
}

export type CityDuelResult = "win" | "loss" | "draw" | "retreat";

export type GiftExchangeResult = "accepted" | "returned";

export interface DaoCompanionProposal {
  readonly id: string;
  readonly fromCultivatorId: string;
  readonly toCultivatorId: string;
  readonly createdAtTick: number;
  readonly expiresAtTick: number;
}

export interface PartyInvitation {
  readonly id: string;
  readonly fromCultivatorId: string;
  readonly toCultivatorId: string;
  readonly createdAtTick: number;
  readonly expiresAtTick: number;
}

/** Leader plus companions. A dungeon run can share this whole party. */
export const PARTY_MAX_MEMBERS = 5;

export interface Party {
  readonly id: string;
  readonly memberIds: readonly string[];
  readonly leaderId: string;
  readonly formedAtTick: number;
  /** One person waiting to rotate in. They are not on the field, so the cap stays five. */
  readonly reserveIds?: readonly string[];
}

export interface DualWildernessTask {
  readonly id: string;
  readonly nameCn: string;
  readonly description: string;
  readonly spiritStoneReward: number;
  readonly affinityGain: number;
  readonly reputationReward: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AFFINITY_THRESHOLDS: Record<AffinityLevel, number> = {
  "认识": 0,
  "熟识": 20,
  "朋友": 60,
  "好友": 120,
  "挚友": 200,
};

const AFFINITY_LEVELS_ORDERED: readonly AffinityLevel[] = [
  "挚友", "好友", "朋友", "熟识", "认识",
];

/** Ticks before the same person can be chatted up again for full affinity. */
export const CHAT_UP_COOLDOWN_TICKS = 4;

/** Affinity gains per interaction type */
export const AFFINITY_GAINS = {
  /** 搭讪 (chat-up) — strangers at same location */
  chatUp: 10,
  /** 传音 (voice-transmit) — remote message to friend */
  voiceTransmit: 5,
  /** 洞府会友 (residence-socialize) — with social target */
  residenceSocialize: 50,
  /** Co-location passive tick (both idle at same safe location) */
  coLocationPassive: 1,
  /** Shared wilderness/adventure (both doing timed actions at same wilderness) */
  sharedWilderness: 2,
  /** PVP duel completion */
  pvpDuel: 4,
  /** 同行修炼 (dual-cultivate) — party cultivation at residence */
  dualCultivate: 6,
} as const;

/** Minimum affinity to use 传音 (voice-transmit) */
export const VOICE_TRANSMIT_MIN_LEVEL: AffinityLevel = "朋友";

/** Minimum affinity to propose 道侣 */
export const DAO_COMPANION_MIN_LEVEL: AffinityLevel = "好友";

/** Proposal expiry in ticks */
export const DAO_COMPANION_PROPOSAL_EXPIRY = 30;

/** Maximum number of 道侣 bonds per cultivator */
export const MAX_DAO_COMPANIONS = 1;

/** Co-location passive affinity interval (every N ticks) */
export const CO_LOCATION_AFFINITY_INTERVAL = 6;

/** Minimum affinity to send a party invite */
export const PARTY_INVITE_MIN_LEVEL: AffinityLevel = "认识";

/** Party invitation expiry in ticks */
export const PARTY_INVITE_EXPIRY = 10;

/** Maximum party size */
export const MAX_PARTY_SIZE = 2;

/** Extra cultivation progress for dual-cultivate */
export const DUAL_CULTIVATE_BONUS = 4;

/** Spirit stones handed over when answering a help request, if the helper can spare them. */
export const HELP_STONE_GIFT = 8;

/** How many unanswered help requests one cultivator keeps. */
export const PENDING_HELP_LIMIT = 4;

/** Notes kept on a location board. */
export const BOARD_NOTE_LIMIT = 8;

// ---------------------------------------------------------------------------
// Affinity helpers
// ---------------------------------------------------------------------------

export function getAffinityLevel(affinity: number): AffinityLevel {
  for (const level of AFFINITY_LEVELS_ORDERED) {
    if (affinity >= AFFINITY_THRESHOLDS[level]) return level;
  }
  return "认识";
}

/** Player-facing closeness. The integer stays on the link. */
export function affinityCloserPhrase(level: AffinityLevel): string {
  return `两人更近了些（${level}）`;
}

export function affinityLevelRank(level: AffinityLevel): number {
  return AFFINITY_LEVELS_ORDERED.indexOf(level);
}

export function meetsAffinityLevel(
  currentAffinity: number,
  requiredLevel: AffinityLevel,
): boolean {
  return currentAffinity >= AFFINITY_THRESHOLDS[requiredLevel];
}

// ---------------------------------------------------------------------------
// Social link operations (immutable — return new objects)
// ---------------------------------------------------------------------------

export function createSocialLink(
  targetCultivatorId: string,
  tick: number,
  initialAffinity: number = 0,
): SocialLink {
  return {
    targetCultivatorId,
    affinity: initialAffinity,
    specialBond: null,
    firstMetTick: tick,
    lastInteractionTick: tick,
  };
}

export function addAffinity(
  link: SocialLink,
  amount: number,
  tick: number,
): SocialLink {
  return {
    ...link,
    affinity: Math.max(0, link.affinity + amount),
    lastInteractionTick: tick,
  };
}

export function setBond(
  link: SocialLink,
  bond: SpecialBond | null,
): SocialLink {
  return { ...link, specialBond: bond };
}

/** Creditor's favorBalance goes up; the debtor's matching link goes down by the same amount. */
export function adjustFavor(
  world: WorldState,
  creditorId: string,
  debtorId: string,
  amount: number,
): void {
  const credit = getOrCreateSocialLink(world, creditorId, debtorId);
  const debt = getOrCreateSocialLink(world, debtorId, creditorId);
  writeSocialLink(world, creditorId, {
    ...credit,
    favorBalance: (credit.favorBalance ?? 0) + amount,
  });
  writeSocialLink(world, debtorId, {
    ...debt,
    favorBalance: (debt.favorBalance ?? 0) - amount,
  });
}

export function repaymentQuote(reason: string): string {
  return `上回你${reason}，这次我来还这份人情。`;
}

function clipReason(reason: string): string {
  return Array.from(reason.replace(/[。！？]/g, "")).slice(0, 18).join("");
}

/** Creditor is owed one more favor, and the debtor can later quote the reason. */
export function grantOwedFavor(
  world: WorldState,
  creditorId: string,
  debtorId: string,
  reason: string,
  source: string,
): OwedFavorEntry {
  adjustFavor(world, creditorId, debtorId, 1);
  const credit = getSocialLink(world, creditorId, debtorId);
  const entry: OwedFavorEntry = {
    id: `owed-${world.tick}-${creditorId}-${debtorId}-${credit?.owedFavors?.length ?? 0}`,
    reason: clipReason(reason) || "帮过我一回",
    tick: world.tick,
    source,
  };
  if (credit) {
    writeSocialLink(world, creditorId, {
      ...credit,
      owedFavors: [...(credit.owedFavors ?? []), entry].slice(-6),
    });
  }
  return entry;
}

/** Drop one favor the debtor owes the creditor, when one is actually owed. */
export function forgiveOneFavor(
  world: WorldState,
  creditorId: string,
  debtorId: string,
): OwedFavorEntry | null {
  const credit = getSocialLink(world, creditorId, debtorId);
  if (!credit || (credit.favorBalance ?? 0) <= 0) {
    return null;
  }
  const stack = [...(credit.owedFavors ?? [])];
  const taken = stack.shift() ?? {
    id: `owed-legacy-${world.tick}-${debtorId}`,
    reason: "帮过我一回",
    tick: credit.lastInteractionTick,
    source: "legacy",
  };
  adjustFavor(world, creditorId, debtorId, -1);
  const updated = getSocialLink(world, creditorId, debtorId);
  if (updated) {
    writeSocialLink(world, creditorId, { ...updated, owedFavors: stack });
  }
  return taken;
}

export function rememberCityDuel(
  world: WorldState,
  cultivatorId: string,
  targetId: string,
  result: CityDuelResult,
  stoneDelta: number,
): void {
  const link = getOrCreateSocialLink(world, cultivatorId, targetId);
  writeSocialLink(world, cultivatorId, {
    ...link,
    rival: true,
    lastDuelResult: result,
    lastDuelStoneDelta: stoneDelta,
    lastDuelTick: world.tick,
  });
}

export function rememberGiftExchange(
  world: WorldState,
  cultivatorId: string,
  targetId: string,
  result: GiftExchangeResult,
  itemName: string,
): void {
  const link = getOrCreateSocialLink(world, cultivatorId, targetId);
  writeSocialLink(world, cultivatorId, {
    ...link,
    lastGiftResult: result,
    lastGiftItemName: itemName,
    lastGiftTick: world.tick,
  });
}

export function markRival(world: WorldState, cultivatorA: string, cultivatorB: string): void {
  const linkAB = getOrCreateSocialLink(world, cultivatorA, cultivatorB);
  const linkBA = getOrCreateSocialLink(world, cultivatorB, cultivatorA);
  writeSocialLink(world, cultivatorA, { ...linkAB, rival: true });
  writeSocialLink(world, cultivatorB, { ...linkBA, rival: true });
}

export function describeSocialBond(link: SocialLink): string {
  const parts: string[] = [];
  if (link.specialBond) {
    parts.push(link.specialBond);
  }
  if (link.rival) {
    parts.push("宿敌");
  }
  if (link.lastDuelResult) {
    const duelLine: Record<CityDuelResult, string> = {
      win: "城中切磋赢过",
      loss: "城中切磋输过",
      draw: "城中切磋平手",
      retreat: "城中切磋撤过",
    };
    parts.push(duelLine[link.lastDuelResult]);
  }
  if (link.lastGiftResult === "accepted") {
    parts.push("收下过礼");
  } else if (link.lastGiftResult === "returned") {
    parts.push("退过礼");
  }
  const favor = link.favorBalance ?? 0;
  const reason = link.owedFavors?.[0]?.reason;
  if (favor > 0) {
    parts.push(reason ? `对方欠你${favor}份人情，事由是${reason}` : `对方欠你${favor}份人情`);
  } else if (favor < 0) {
    parts.push(`你欠对方${-favor}份人情`);
  }
  const arc = bondArcOf(link.affinity);
  const feud = grudgeArcOf(link.grudge ?? 0);
  if (arc) parts.push(arc);
  if (feud) parts.push(feud);
  if (parts.length === 0) {
    parts.push(getAffinityLevel(link.affinity));
  }
  return parts.join("，");
}

export function describeArcLine(link: SocialLink, selfName: string, otherName: string): string {
  const bond = bondArcOf(link.affinity);
  const feud = grudgeArcOf(link.grudge ?? 0);
  const pair = `${selfName}与${otherName}`;
  if (bond === "知己" && feud === "宿怨") {
    return `${pair}成了知己，也结了宿怨。可以切磋指点，分一小笔灵石，也可以公开挑战。`;
  }
  if (bond === "知己" && feud === "嫌隙") {
    return `${pair}是知己，两人之间也有了嫌隙。可以切磋指点，也可以分出一小笔灵石。`;
  }
  if (bond === "知己") {
    return `${pair}成了知己。可以切磋指点，也可以分出一小笔灵石。`;
  }
  if (bond === "好友" && feud === "宿怨") {
    return `${pair}已是好友，可两人结了宿怨。要紧的事还能开口，但话里已经不那么客气。`;
  }
  if (bond === "好友" && feud === "嫌隙") {
    return `${pair}已是好友，两人之间却有了嫌隙。要紧的事还能开口，但话里已经不那么客气。`;
  }
  if (bond === "好友") {
    return `${pair}已是好友。要紧的事可以直接开口，不必再先客套。`;
  }
  if (bond === "点头之交" && feud === "宿怨") {
    return `${pair}本是点头之交，现在结了宿怨。见面还会招呼，心里却不痛快。`;
  }
  if (bond === "点头之交" && feud === "嫌隙") {
    return `${pair}本是点头之交，现在有了嫌隙。见面还会招呼，心里却不痛快。`;
  }
  if (bond === "点头之交") {
    return `${pair}是点头之交。在城里碰见，会互相招呼一声。`;
  }
  if (feud === "宿怨") {
    return `${pair}结成了宿怨。见面剑拔弩张，可以公开下挑战书，也可以把礼拒了。`;
  }
  if (feud === "嫌隙") {
    return `${pair}之间有了嫌隙。下次见面剑拔弩张，话会很硬。`;
  }
  return `${pair}目前是${getAffinityLevel(link.affinity)}，还没有跨过点头之交，也没有结下嫌隙。`;
}

// ---------------------------------------------------------------------------
// World-level social queries
// ---------------------------------------------------------------------------

export function getSocialLink(
  world: WorldState,
  cultivatorId: string,
  targetId: string,
): SocialLink | null {
  return world.socialLinks?.[cultivatorId]?.[targetId] ?? null;
}

export function getOrCreateSocialLink(
  world: WorldState,
  cultivatorId: string,
  targetId: string,
): SocialLink {
  const existing = getSocialLink(world, cultivatorId, targetId);
  if (existing) return existing;
  return createSocialLink(targetId, world.tick);
}

export function writeSocialLink(
  world: WorldState,
  cultivatorId: string,
  link: SocialLink,
): void {
  if (!world.socialLinks) {
    (world as unknown as Record<string, unknown>).socialLinks = {};
  }
  if (!world.socialLinks[cultivatorId]) {
    world.socialLinks[cultivatorId] = {};
  }
  world.socialLinks[cultivatorId]![link.targetCultivatorId] = link;
}

/**
 * Add affinity bidirectionally between two cultivators.
 * Returns the updated links for both directions.
 */
export function addMutualAffinity(
  world: WorldState,
  cultivatorA: string,
  cultivatorB: string,
  amount: number,
): { linkAB: SocialLink; linkBA: SocialLink } {
  const beforeA = getSocialLink(world, cultivatorA, cultivatorB)?.affinity ?? 0;
  const beforeB = getSocialLink(world, cultivatorB, cultivatorA)?.affinity ?? 0;
  const linkAB = addAffinity(
    getOrCreateSocialLink(world, cultivatorA, cultivatorB),
    amount,
    world.tick,
  );
  const linkBA = addAffinity(
    getOrCreateSocialLink(world, cultivatorB, cultivatorA),
    amount,
    world.tick,
  );
  writeSocialLink(world, cultivatorA, linkAB);
  writeSocialLink(world, cultivatorB, linkBA);
  noteBondCrossing(world, cultivatorA, cultivatorB, beforeA, linkAB.affinity, beforeB, linkBA.affinity);
  return { linkAB, linkBA };
}

export function addMutualGrudge(
  world: WorldState,
  cultivatorA: string,
  cultivatorB: string,
  amount: number,
): void {
  if (amount <= 0 || cultivatorA === cultivatorB) return;
  const beforeA = getSocialLink(world, cultivatorA, cultivatorB)?.grudge ?? 0;
  const beforeB = getSocialLink(world, cultivatorB, cultivatorA)?.grudge ?? 0;
  const linkAB = getOrCreateSocialLink(world, cultivatorA, cultivatorB);
  const linkBA = getOrCreateSocialLink(world, cultivatorB, cultivatorA);
  const nextA = beforeA + amount;
  const nextB = beforeB + amount;
  writeSocialLink(world, cultivatorA, { ...linkAB, grudge: nextA });
  writeSocialLink(world, cultivatorB, { ...linkBA, grudge: nextB });
  noteGrudgeCrossing(world, cultivatorA, cultivatorB, beforeA, nextA, beforeB, nextB);
}

export function hasDaoCompanion(world: WorldState, cultivatorId: string): boolean {
  const links = world.socialLinks?.[cultivatorId];
  if (!links) return false;
  return Object.values(links).some((link) => link.specialBond === "道侣");
}

export function getDaoCompanionId(world: WorldState, cultivatorId: string): string | null {
  const links = world.socialLinks?.[cultivatorId];
  if (!links) return null;
  const entry = Object.values(links).find((link) => link.specialBond === "道侣");
  return entry?.targetCultivatorId ?? null;
}

export function getFriendsAtLevel(
  world: WorldState,
  cultivatorId: string,
  minLevel: AffinityLevel,
): readonly SocialLink[] {
  const links = world.socialLinks?.[cultivatorId];
  if (!links) return [];
  const minAffinity = AFFINITY_THRESHOLDS[minLevel];
  return Object.values(links).filter((link) => link.affinity >= minAffinity);
}

export function getCultivatorsAtLocation(
  world: WorldState,
  locationId: string,
  excludeId?: string,
): readonly Cultivator[] {
  return Object.values(world.cultivators).filter(
    (c) => c.locationId === locationId && c.id !== excludeId,
  );
}

/**
 * Get a social link view for external consumers (e.g., agent state).
 */
export interface SocialLinkView {
  readonly targetCultivatorId: string;
  readonly targetName: string;
  readonly affinity: number;
  readonly level: AffinityLevel;
  readonly specialBond: SpecialBond | null;
  readonly favorBalance: number;
  readonly rival: boolean;
  readonly grudge: number;
  readonly bondArc: BondArc | null;
  readonly grudgeArc: GrudgeArc | null;
  /** Short Chinese line an agent can read back to its owner. */
  readonly bondLine: string;
  /** Full sentence naming the current arc and what it unlocks. */
  readonly arcLine: string;
  /** Short reasons the other cultivator still owes, oldest first. Omitted when none were recorded. */
  readonly owedReasons?: readonly string[];
  readonly lastDuel: { tick: number; result: CityDuelResult; stoneDelta: number } | null;
  readonly lastGift: { tick: number; result: GiftExchangeResult; itemName: string } | null;
}

export function getSocialLinksView(
  world: WorldState,
  cultivatorId: string,
): readonly SocialLinkView[] {
  const links = world.socialLinks?.[cultivatorId];
  if (!links) return [];
  return Object.values(links)
    .filter((link) => link.affinity > 0 || link.rival === true || (link.favorBalance ?? 0) !== 0 || (link.grudge ?? 0) > 0 || (link.owedFavors?.length ?? 0) > 0)
    .sort((a, b) => b.affinity - a.affinity || (b.grudge ?? 0) - (a.grudge ?? 0))
    .map((link) => {
      const targetName = world.cultivators[link.targetCultivatorId]?.name ?? "unknown";
      const selfName = world.cultivators[cultivatorId]?.name ?? "你";
      return {
      targetCultivatorId: link.targetCultivatorId,
      targetName,
      affinity: link.affinity,
      level: getAffinityLevel(link.affinity),
      specialBond: link.specialBond,
      favorBalance: link.favorBalance ?? 0,
      rival: link.rival === true,
      grudge: link.grudge ?? 0,
      bondArc: bondArcOf(link.affinity),
      grudgeArc: grudgeArcOf(link.grudge ?? 0),
      bondLine: describeSocialBond(link),
      arcLine: describeArcLine(link, selfName, targetName),
      ...((link.owedFavors?.length ?? 0) > 0 ? { owedReasons: (link.owedFavors ?? []).map((row) => row.reason) } : {}),
      lastDuel: link.lastDuelResult
        ? {
            tick: link.lastDuelTick ?? 0,
            result: link.lastDuelResult,
            stoneDelta: link.lastDuelStoneDelta ?? 0,
          }
        : null,
      lastGift: link.lastGiftResult
        ? {
            tick: link.lastGiftTick ?? 0,
            result: link.lastGiftResult,
            itemName: link.lastGiftItemName ?? "礼物",
          }
        : null,
    };
    });
}

export function listOwedFavorViews(world: WorldState, cultivatorId: string): OwedFavorView[] {
  const rows: OwedFavorView[] = [];
  for (const link of Object.values(world.socialLinks?.[cultivatorId] ?? {})) {
    const other = world.cultivators[link.targetCultivatorId];
    for (const owed of link.owedFavors ?? []) {
      rows.push({
        id: owed.id,
        otherId: link.targetCultivatorId,
        otherName: other?.name ?? "某人",
        direction: "they-owe",
        reason: owed.reason,
        tick: owed.tick,
      });
    }
  }
  for (const [otherId, links] of Object.entries(world.socialLinks ?? {})) {
    if (otherId === cultivatorId) continue;
    const link = links[cultivatorId];
    if (!link) continue;
    const other = world.cultivators[otherId];
    for (const owed of link.owedFavors ?? []) {
      rows.push({
        id: owed.id,
        otherId,
        otherName: other?.name ?? "某人",
        direction: "you-owe",
        reason: owed.reason,
        tick: owed.tick,
      });
    }
  }
  return rows;
}

/**
 * Pick a random other cultivator at the same location for 搭讪.
 * Prefers cultivators with no existing link (new encounters).
 */
export function pickChatUpTarget(
  world: WorldState,
  cultivatorId: string,
  seed: string,
): Cultivator | null {
  const cultivator = world.cultivators[cultivatorId];
  if (!cultivator) return null;
  const others = getCultivatorsAtLocation(world, cultivator.locationId, cultivatorId)
    .filter((c) => !c.activeJobId); // only idle cultivators
  if (others.length === 0) return null;
  // Prefer strangers
  const strangers = others.filter(
    (c) => !getSocialLink(world, cultivatorId, c.id) || getSocialLink(world, cultivatorId, c.id)!.affinity < AFFINITY_THRESHOLDS["熟识"],
  );
  const pool = strangers.length > 0 ? strangers : others;
  const hash = simpleHash(seed);
  return pool[hash % pool.length]!;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ---------------------------------------------------------------------------
// Party helpers
// ---------------------------------------------------------------------------

export function getPartyOf(world: WorldState, cultivatorId: string): Party | null {
  if (!world.parties) return null;
  for (const party of Object.values(world.parties)) {
    if (party.memberIds.includes(cultivatorId)) return party;
  }
  return null;
}

export function getPartyMembers(world: WorldState, cultivatorId: string): Cultivator[] {
  const party = getPartyOf(world, cultivatorId);
  if (!party) return [];
  return party.memberIds
    .filter((memberId) => memberId !== cultivatorId)
    .map((memberId) => world.cultivators[memberId])
    .filter((member): member is Cultivator => Boolean(member));
}

export function getPartyPartner(world: WorldState, cultivatorId: string): Cultivator | null {
  return getPartyMembers(world, cultivatorId)[0] ?? null;
}

export function isInParty(world: WorldState, cultivatorId: string): boolean {
  return getPartyOf(world, cultivatorId) !== null;
}

export function findReserveParty(world: WorldState, cultivatorId: string): Party | null {
  if (!world.parties) return null;
  for (const party of Object.values(world.parties)) {
    if ((party.reserveIds ?? []).includes(cultivatorId)) return party;
  }
  return null;
}

export function disbandParty(world: WorldState, cultivatorId: string): Party | null {
  const party = getPartyOf(world, cultivatorId);
  if (!party) return null;
  delete world.parties[party.id];
  return party;
}

// ---------------------------------------------------------------------------
// Dual Wilderness Tasks (20 party-only wilderness tasks)
// ---------------------------------------------------------------------------

export const DUAL_WILDERNESS_TASKS: readonly DualWildernessTask[] = [
  { id: "dwt-01", nameCn: "联手猎妖", description: "与同伴合力追踪并猎杀一头妖兽。", spiritStoneReward: 200, affinityGain: 8, reputationReward: 10 },
  { id: "dwt-02", nameCn: "双修阵法", description: "在荒野中布置双人阵法，共同抵御灵气冲击。", spiritStoneReward: 180, affinityGain: 10, reputationReward: 8 },
  { id: "dwt-03", nameCn: "护送灵药", description: "二人护送珍贵灵药穿越危险地带。", spiritStoneReward: 220, affinityGain: 8, reputationReward: 12 },
  { id: "dwt-04", nameCn: "探索古遗迹", description: "联手探索一处古老修仙遗迹。", spiritStoneReward: 250, affinityGain: 12, reputationReward: 15 },
  { id: "dwt-05", nameCn: "围剿妖巢", description: "合力清除一处妖兽巢穴。", spiritStoneReward: 280, affinityGain: 10, reputationReward: 14 },
  { id: "dwt-06", nameCn: "灵脉探测", description: "二人配合探测地下灵脉走向。", spiritStoneReward: 160, affinityGain: 6, reputationReward: 6 },
  { id: "dwt-07", nameCn: "采集珍稀灵草", description: "在危险区域合力采集珍稀灵草。", spiritStoneReward: 190, affinityGain: 7, reputationReward: 8 },
  { id: "dwt-08", nameCn: "破阵寻宝", description: "联手破解古阵法，寻找隐藏宝藏。", spiritStoneReward: 300, affinityGain: 15, reputationReward: 16 },
  { id: "dwt-09", nameCn: "驱散瘴气", description: "二人合力驱散一片浓厚瘴气。", spiritStoneReward: 170, affinityGain: 8, reputationReward: 9 },
  { id: "dwt-10", nameCn: "营救被困修士", description: "联手营救一名被困在险境中的修士。", spiritStoneReward: 210, affinityGain: 12, reputationReward: 15 },
  { id: "dwt-11", nameCn: "封印裂隙", description: "合力封印一处空间裂隙。", spiritStoneReward: 240, affinityGain: 10, reputationReward: 12 },
  { id: "dwt-12", nameCn: "双人试炼", description: "在荒野试炼石前接受双人考验。", spiritStoneReward: 260, affinityGain: 14, reputationReward: 14 },
  { id: "dwt-13", nameCn: "伏击流寇", description: "配合设伏，打击一伙荒野流寇。", spiritStoneReward: 230, affinityGain: 9, reputationReward: 13 },
  { id: "dwt-14", nameCn: "护法修行", description: "一人修行一人护法，轮流进行深入修炼。", spiritStoneReward: 150, affinityGain: 10, reputationReward: 5 },
  { id: "dwt-15", nameCn: "追踪灵兽", description: "联手追踪一头珍稀灵兽的踪迹。", spiritStoneReward: 200, affinityGain: 8, reputationReward: 10 },
  { id: "dwt-16", nameCn: "守护传送阵", description: "合力守护一座临时传送阵直到启动完毕。", spiritStoneReward: 220, affinityGain: 9, reputationReward: 11 },
  { id: "dwt-17", nameCn: "抵御灵潮冲击", description: "联手抵御一次灵潮余波的冲击。", spiritStoneReward: 270, affinityGain: 12, reputationReward: 13 },
  { id: "dwt-18", nameCn: "深入矿脉", description: "二人深入危险矿脉采集灵矿。", spiritStoneReward: 200, affinityGain: 7, reputationReward: 9 },
  { id: "dwt-19", nameCn: "共御兽潮", description: "合力抵御一波突然涌来的兽潮。", spiritStoneReward: 290, affinityGain: 13, reputationReward: 15 },
  { id: "dwt-20", nameCn: "探查秘境入口", description: "联手探查并开启一处隐藏秘境的入口。", spiritStoneReward: 310, affinityGain: 15, reputationReward: 18 },
];

export function getDualWildernessTaskById(id: string): DualWildernessTask | null {
  return DUAL_WILDERNESS_TASKS.find((t) => t.id === id) ?? null;
}

export function pickDualWildernessTask(seed: string): DualWildernessTask {
  const hash = simpleHash(seed);
  return DUAL_WILDERNESS_TASKS[hash % DUAL_WILDERNESS_TASKS.length]!;
}
