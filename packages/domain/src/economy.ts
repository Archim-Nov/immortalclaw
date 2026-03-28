import { deriveMainAttributes } from "./attributes.js";
import type {
  ActivityContext,
  Cultivator,
  DaoPotential,
  ReadinessLevel,
  RecoveryState,
  WorldState,
} from "./model.js";

const NEGATIVE_EFFECTS = new Set(["wounded", "poisoned", "deviation"]);
const POSITIVE_EFFECTS = new Set(["clear-mind", "qi-surge", "fortune-marked", "warded", "insight", "spirit-saturated"]);
const RETREATING_ACTION_IDS = new Set(["residence-heal", "residence-recover-qi", "heal"]);

export function computeReadiness(cultivator: Cultivator): ReadinessLevel {
  if (cultivator.injuryTicksRemaining > 0) return "poor";
  if (cultivator.qi < cultivator.maxQi * 0.25) return "poor";
  if (countNegativeEffects(cultivator) >= 2) return "poor";
  if (isSupplyInsufficient(cultivator)) return "poor";

  if (
    cultivator.qi >= cultivator.maxQi * 0.8
    && hasPositiveEffect(cultivator)
    && isSupplySufficient(cultivator)
    && cultivator.injuryTicksRemaining === 0
  ) {
    return "advantaged";
  }

  if (
    cultivator.qi >= cultivator.maxQi * 0.6
    && isSupplyBasic(cultivator)
    && cultivator.injuryTicksRemaining === 0
  ) {
    return "ready";
  }

  return "stable";
}

export function computeRecoveryState(cultivator: Cultivator): RecoveryState {
  if (cultivator.injuryTicksRemaining > 4) return "injured";
  if (cultivator.injuryTicksRemaining > 0) return "wounded";
  if (cultivator.qi < cultivator.maxQi * 0.25) return "depleted";
  return "healthy";
}

export function computeActivityContext(cultivator: Cultivator, world: WorldState): ActivityContext {
  if (!cultivator.activeJobId) return "stationed";
  const job = world.jobs[cultivator.activeJobId];
  if (!job) return "stationed";

  if (job.actionId.startsWith("travel-to:")) return "traveling";
  if (RETREATING_ACTION_IDS.has(job.actionId)) return "retreating";
  if (
    job.actionId === "residence-heal"
    || job.actionId === "residence-recover-qi"
    || job.actionId === "heal"
    || job.actionId === "meditate"
  ) {
    return "recovering";
  }

  if (
    job.actionId.startsWith("search-fortune:rank-")
    || job.actionId.startsWith("start-dungeon-expedition:rank-")
  ) {
    return "exploring";
  }
  if (job.actionId === "take-sect-errand") return "sect-duty";
  if (
    job.actionId === "hunt-mine-beast"
    || job.actionId.startsWith("challenge-guardian:rank-")
    || job.actionId.startsWith("execute-quest:")
  ) {
    return "encounter-resolving";
  }

  if (job.actionId === "take-mortal-task") return "tasking";
  return "stationed";
}

export function computeDaoPotential(cultivator: Cultivator): DaoPotential {
  const realmBase =
    cultivator.realm === "炼气"
      ? 10 + cultivator.realmLevel * 5
      : cultivator.realm === "筑基"
        ? 50 + cultivator.realmLevel * 8
        : 100 + cultivator.realmLevel * 12;

  const mainAttributes = deriveMainAttributes(cultivator.registrationRecord);
  const attributeAverage = Math.floor(
    Object.values(mainAttributes).reduce((sum, value) => sum + value, 0) / Object.values(mainAttributes).length,
  );
  const detailedAttributeModifier = Math.floor((cultivator.spiritualPower / Math.max(1, cultivator.maxSpiritualPower)) * 20);

  const readiness = computeReadiness(cultivator);
  const readinessModifier =
    readiness === "advantaged"
      ? 15
      : readiness === "ready"
        ? 8
        : readiness === "stable"
          ? 0
          : -10;
  const statusModifier =
    (hasPositiveEffect(cultivator) ? 5 : 0)
    + countNegativeEffects(cultivator) * -5
    + (cultivator.injuryTicksRemaining > 0 ? -10 : 0);

  const score = Math.max(0, realmBase + attributeAverage + detailedAttributeModifier + readinessModifier + statusModifier);
  return {
    score,
    tier: daoPotentialTier(score),
    breakdown: {
      realmBase,
      attributeAverage,
      detailedAttributeModifier,
      readinessModifier,
      statusModifier,
    },
  };
}

function daoPotentialTier(score: number): DaoPotential["tier"] {
  if (score >= 200) return "grandmaster";
  if (score >= 150) return "master";
  if (score >= 120) return "expert";
  if (score >= 90) return "adept";
  if (score >= 60) return "apprentice";
  return "novice";
}

function countNegativeEffects(cultivator: Cultivator): number {
  return cultivator.statusEffects.filter((effect) => NEGATIVE_EFFECTS.has(effect.id)).length;
}

function hasPositiveEffect(cultivator: Cultivator): boolean {
  return cultivator.statusEffects.some((effect) => POSITIVE_EFFECTS.has(effect.id));
}

function isSupplyInsufficient(cultivator: Cultivator): boolean {
  return cultivator.spiritStones < 30
    && cultivator.inventory["healing-pill"] === 0
    && cultivator.inventory["qi-pill"] === 0;
}

function isSupplySufficient(cultivator: Cultivator): boolean {
  return cultivator.spiritStones >= 200
    && (cultivator.inventory["healing-pill"] >= 1 || cultivator.inventory["qi-pill"] >= 1);
}

function isSupplyBasic(cultivator: Cultivator): boolean {
  return cultivator.spiritStones >= 80;
}
