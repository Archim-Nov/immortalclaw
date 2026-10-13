import type { Cultivator, RealmPhase, RealmStage } from "./model.js";

const REALM_QI: RealmStage = "炼气";
const REALM_FOUNDATION: RealmStage = "筑基";
const REALM_CORE: RealmStage = "金丹";
const REALM_NASCENT: RealmStage = "元婴";
const REALM_SPIRIT: RealmStage = "化神";
const REALM_PHASES: readonly RealmPhase[] = ["前期", "中期", "后期"];

/** Levels 1–9 keep their old stages. 10–15 extend the ladder. */
export const MAX_REALM_LEVEL = 15;

export const REALM_STAGE_ORDER: Record<RealmStage, number> = {
  炼气: 0,
  筑基: 1,
  金丹: 2,
  元婴: 3,
  化神: 4,
};

function normalizeRealmLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }
  return Math.max(1, Math.floor(level));
}

export function realmStageForLevel(level: number): RealmStage {
  const normalizedLevel = normalizeRealmLevel(level);
  if (normalizedLevel <= 3) {
    return REALM_QI;
  }
  if (normalizedLevel <= 6) {
    return REALM_FOUNDATION;
  }
  if (normalizedLevel <= 9) {
    return REALM_CORE;
  }
  if (normalizedLevel <= 12) {
    return REALM_NASCENT;
  }
  return REALM_SPIRIT;
}

export function realmPhaseForLevel(level: number): RealmPhase {
  const normalizedLevel = normalizeRealmLevel(level);
  return REALM_PHASES[(normalizedLevel - 1) % REALM_PHASES.length]!;
}

export function realmLabelForLevel(level: number): string {
  return `${realmStageForLevel(level)}${realmPhaseForLevel(level)}`;
}

export function repairCultivatorRealm(cultivator: Pick<Cultivator, "realm" | "realmLevel">): boolean {
  const canonicalRealm = realmStageForLevel(cultivator.realmLevel);
  if (cultivator.realm === canonicalRealm) {
    return false;
  }
  cultivator.realm = canonicalRealm;
  return true;
}
