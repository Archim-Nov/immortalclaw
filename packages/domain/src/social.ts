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

import type { Cultivator, WorldState } from "./model.js";

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
}

export interface DaoCompanionProposal {
  readonly id: string;
  readonly fromCultivatorId: string;
  readonly toCultivatorId: string;
  readonly createdAtTick: number;
  readonly expiresAtTick: number;
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

/** Affinity gains per interaction type */
export const AFFINITY_GAINS = {
  /** 搭讪 (chat-up) — strangers at same location */
  chatUp: 3,
  /** 传音 (voice-transmit) — remote message to friend */
  voiceTransmit: 2,
  /** 洞府会友 (residence-socialize) — with social target */
  residenceSocialize: 5,
  /** Co-location passive tick (both idle at same safe location) */
  coLocationPassive: 1,
  /** Shared wilderness/adventure (both doing timed actions at same wilderness) */
  sharedWilderness: 2,
  /** PVP duel completion */
  pvpDuel: 4,
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

// ---------------------------------------------------------------------------
// Affinity helpers
// ---------------------------------------------------------------------------

export function getAffinityLevel(affinity: number): AffinityLevel {
  for (const level of AFFINITY_LEVELS_ORDERED) {
    if (affinity >= AFFINITY_THRESHOLDS[level]) return level;
  }
  return "认识";
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
  return { linkAB, linkBA };
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
}

export function getSocialLinksView(
  world: WorldState,
  cultivatorId: string,
): readonly SocialLinkView[] {
  const links = world.socialLinks?.[cultivatorId];
  if (!links) return [];
  return Object.values(links)
    .filter((link) => link.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .map((link) => ({
      targetCultivatorId: link.targetCultivatorId,
      targetName: world.cultivators[link.targetCultivatorId]?.name ?? "unknown",
      affinity: link.affinity,
      level: getAffinityLevel(link.affinity),
      specialBond: link.specialBond,
    }));
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
