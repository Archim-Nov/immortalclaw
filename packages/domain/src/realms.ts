import type { Cultivator, RealmPhase, RealmStage } from "./model.js";

const REALM_QI: RealmStage = "炼气";
const REALM_FOUNDATION: RealmStage = "筑基";
const REALM_CORE: RealmStage = "金丹";
const REALM_PHASES: readonly RealmPhase[] = ["前期", "中期", "后期"];

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
  return REALM_CORE;
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
