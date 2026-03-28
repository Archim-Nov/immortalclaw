import type {
  ActionJob,
  Cultivator,
  DungeonExpeditionPolicy,
  DungeonExpeditionProgress,
  DungeonExpeditionReport,
  DungeonExpeditionStateView,
  DungeonGrade,
  DungeonRank,
  DungeonRankYieldHint,
  DungeonStateView,
  ItemId,
  WorldState,
} from "./model.js";

export const DUNGEON_EXPEDITION_DURATION_TICKS = 30;
export const DUNGEON_EXPEDITION_STEP_TICKS = 3;
export const DUNGEON_EXPEDITION_MAX_STEPS = DUNGEON_EXPEDITION_DURATION_TICKS / DUNGEON_EXPEDITION_STEP_TICKS;
export const DUNGEON_EXPEDITION_POLICIES = ["conservative", "balanced", "aggressive"] as const satisfies readonly DungeonExpeditionPolicy[];

const SECONDARY_DROPS_BY_BAND: Record<"1-3" | "4-6" | "7-9", ItemId[]> = {
  "1-3": ["ruin-fragment"],
  "4-6": ["ruin-fragment", "healing-pill", "qi-pill"],
  "7-9": ["ruin-fragment", "healing-pill", "qi-pill", "ward-talisman"],
};

const ESTIMATED_MATERIAL_YIELD_BY_BAND: Record<
  "1-3" | "4-6" | "7-9",
  Record<DungeonExpeditionPolicy, { min: number; max: number }>
> = {
  "1-3": {
    conservative: { min: 2, max: 3 },
    balanced: { min: 3, max: 4 },
    aggressive: { min: 3, max: 5 },
  },
  "4-6": {
    conservative: { min: 3, max: 4 },
    balanced: { min: 4, max: 5 },
    aggressive: { min: 4, max: 6 },
  },
  "7-9": {
    conservative: { min: 4, max: 5 },
    balanced: { min: 5, max: 6 },
    aggressive: { min: 5, max: 7 },
  },
};

const POLICY_GUARDIAN_WEIGHT: Record<DungeonExpeditionPolicy, number> = {
  conservative: 20,
  balanced: 50,
  aggressive: 80,
};

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function startDungeonExpeditionActionIdOf(rank: DungeonRank, policy: DungeonExpeditionPolicy) {
  return `start-dungeon-expedition:rank-${rank}:${policy}` as const;
}

export function parseStartDungeonExpeditionActionId(
  actionId: string,
): { rank: DungeonRank; policy: DungeonExpeditionPolicy } | null {
  const prefix = "start-dungeon-expedition:rank-";
  if (!actionId.startsWith(prefix)) {
    return null;
  }

  const [rankPart, policyPart] = actionId.slice(prefix.length).split(":");
  const rank = Number.parseInt(rankPart ?? "", 10);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) {
    return null;
  }
  if (!DUNGEON_EXPEDITION_POLICIES.includes(policyPart as DungeonExpeditionPolicy)) {
    return null;
  }

  return {
    rank: rank as DungeonRank,
    policy: policyPart as DungeonExpeditionPolicy,
  };
}

export function isAbortDungeonExpeditionAction(actionId: string): actionId is "abort-dungeon-expedition" {
  return actionId === "abort-dungeon-expedition";
}

function yieldBandForRank(rank: DungeonRank): "1-3" | "4-6" | "7-9" {
  if (rank <= 3) {
    return "1-3";
  }
  if (rank <= 6) {
    return "4-6";
  }
  return "7-9";
}

export function buildDungeonRankYieldHints(
  availableRanks: DungeonRank[],
  primaryMaterial: ItemId,
): DungeonRankYieldHint[] {
  return availableRanks.map((rank) => {
    const band = yieldBandForRank(rank);
    return {
      rank,
      primaryMaterial,
      estimatedExpeditionYieldByPolicy: {
        conservative: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].conservative },
        balanced: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].balanced },
        aggressive: { ...ESTIMATED_MATERIAL_YIELD_BY_BAND[band].aggressive },
      },
      notableSecondaryDrops: [...SECONDARY_DROPS_BY_BAND[band]],
    };
  });
}

function riskLabelForPolicy(policy: DungeonExpeditionPolicy): string {
  if (policy === "conservative") {
    return "Low risk; withdraw after any real warning sign.";
  }
  if (policy === "balanced") {
    return "Medium risk; push when the frontier looks worthwhile.";
  }
  return "High risk; pressures the frontier and tolerates deeper damage.";
}

export function describeDungeonExpeditionAction(input: {
  dungeon: DungeonStateView;
  rank: DungeonRank;
  policy: DungeonExpeditionPolicy;
}): string {
  const hint = input.dungeon.rankYieldHints.find((entry) => entry.rank === input.rank);
  const estimate = hint?.estimatedExpeditionYieldByPolicy[input.policy];
  const primaryMaterial = hint?.primaryMaterial ?? input.dungeon.materialBand;
  const estimatedRange = estimate ? `${estimate.min}-${estimate.max}` : "several";
  const frontierNote = input.rank === input.dungeon.frontierRank
    ? "May challenge the frontier guardian if the run stays stable."
    : "Farms an already unlocked rank without pushing higher."
    ;

  return `Run a 30-minute ${input.dungeon.grade}${input.rank} expedition for about ${estimatedRange} ${primaryMaterial}. ${frontierNote} ${riskLabelForPolicy(input.policy)}`;
}

export function createDungeonExpeditionProgress(input: {
  cultivatorId: string;
  jobId: string;
  locationId: string;
  grade: DungeonGrade;
  targetRank: DungeonRank;
  policy: DungeonExpeditionPolicy;
  startedAtTick: number;
}): DungeonExpeditionProgress {
  return {
    cultivatorId: input.cultivatorId,
    jobId: input.jobId,
    locationId: input.locationId,
    grade: input.grade,
    targetRank: input.targetRank,
    policy: input.policy,
    startedAtTick: input.startedAtTick,
    stepIndex: 0,
    maxSteps: DUNGEON_EXPEDITION_MAX_STEPS,
    nextResolutionTick: input.startedAtTick + DUNGEON_EXPEDITION_STEP_TICKS,
    searchSteps: 0,
    guardianSteps: 0,
    primaryMaterialCount: 0,
    secondaryDrops: {},
    spiritStoneGain: 0,
    realmProgressGain: 0,
    unlockedNextRank: false,
    lastResolvedAction: null,
  };
}

export function getActiveDungeonExpedition(
  world: WorldState,
  cultivatorId: string,
): DungeonExpeditionProgress | null {
  return world.dungeonExpeditions[cultivatorId] ?? null;
}

export function buildDungeonExpeditionStateView(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob | null,
): DungeonExpeditionStateView {
  const active = getActiveDungeonExpedition(world, cultivator.id);
  const lastReport = world.dungeonExpeditionReports[cultivator.id] ?? null;

  return {
    active: active
      ? {
          grade: active.grade,
          targetRank: active.targetRank,
          policy: active.policy,
          startedAtTick: active.startedAtTick,
          stepsResolved: active.stepIndex,
          maxSteps: active.maxSteps,
          nextResolutionTick: active.nextResolutionTick,
          remainingTicks: job?.remainingTicks ?? 0,
        }
      : null,
    lastReport,
  };
}

export function chooseDungeonExpeditionStepKind(input: {
  targetRank: DungeonRank;
  frontierRank: DungeonRank;
  highestClearedRank: number;
  policy: DungeonExpeditionPolicy;
  jobId: string;
  stepIndex: number;
  worldTick: number;
  cultivatorId: string;
}): "search" | "guardian" {
  if (input.highestClearedRank >= input.targetRank || input.targetRank < input.frontierRank) {
    return "search";
  }

  const guardianWeight = POLICY_GUARDIAN_WEIGHT[input.policy];
  const roll = hashString(
    `${input.cultivatorId}:${input.jobId}:${input.worldTick}:${input.stepIndex}:dungeon-expedition`,
  ) % 100;

  return roll < guardianWeight ? "guardian" : "search";
}

export function shouldRetreatDungeonExpedition(
  cultivator: Cultivator,
  policy: DungeonExpeditionPolicy,
): boolean {
  const qiRatio = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
  if (policy === "conservative") {
    return qiRatio < 0.6 || cultivator.injuryTicksRemaining > 0;
  }
  if (policy === "balanced") {
    return qiRatio < 0.4 || cultivator.injuryTicksRemaining >= 4;
  }
  return qiRatio < 0.25 || cultivator.injuryTicksRemaining >= 8;
}

export function isDungeonExpeditionCatastrophic(cultivator: Cultivator): boolean {
  const qiThreshold = cultivator.maxQi * 0.1;
  const spiritualThreshold = cultivator.maxSpiritualPower * 0.1;
  return cultivator.qi <= qiThreshold
    || cultivator.spiritualPower <= spiritualThreshold
    || cultivator.injuryTicksRemaining >= 10;
}

function mergeDropCounts(
  base: Partial<Record<ItemId, number>>,
  delta: Partial<Record<ItemId, number>>,
): Partial<Record<ItemId, number>> {
  const merged = { ...base };
  for (const [itemId, count] of Object.entries(delta) as Array<[ItemId, number]>) {
    if (count <= 0) {
      continue;
    }
    merged[itemId] = (merged[itemId] ?? 0) + count;
  }
  return merged;
}

export function recordDungeonExpeditionStep(input: {
  progress: DungeonExpeditionProgress;
  action: "search" | "guardian";
  primaryMaterialCount: number;
  secondaryDrops: Partial<Record<ItemId, number>>;
  spiritStoneGain: number;
  realmProgressGain: number;
  unlockedNextRank: boolean;
  resolvedAtTick: number;
}): DungeonExpeditionProgress {
  return {
    ...input.progress,
    stepIndex: input.progress.stepIndex + 1,
    nextResolutionTick: input.resolvedAtTick + DUNGEON_EXPEDITION_STEP_TICKS,
    searchSteps: input.progress.searchSteps + (input.action === "search" ? 1 : 0),
    guardianSteps: input.progress.guardianSteps + (input.action === "guardian" ? 1 : 0),
    primaryMaterialCount: input.progress.primaryMaterialCount + input.primaryMaterialCount,
    secondaryDrops: mergeDropCounts(input.progress.secondaryDrops, input.secondaryDrops),
    spiritStoneGain: input.progress.spiritStoneGain + Math.max(0, input.spiritStoneGain),
    realmProgressGain: input.progress.realmProgressGain + Math.max(0, input.realmProgressGain),
    unlockedNextRank: input.progress.unlockedNextRank || input.unlockedNextRank,
    lastResolvedAction: input.action,
  };
}

function summarizeSecondaryDrops(drops: Partial<Record<ItemId, number>>): string {
  const topDrops = Object.entries(drops)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([itemId, count]) => `${count} ${itemId}`);

  return topDrops.length > 0 ? topDrops.join(", ") : "no notable side loot";
}

function outcomeVerb(outcome: DungeonExpeditionReport["outcome"]): string {
  if (outcome === "completed") {
    return "completed";
  }
  if (outcome === "withdrew") {
    return "withdrew from";
  }
  if (outcome === "aborted") {
    return "aborted";
  }
  return "barely escaped";
}

export function createDungeonExpeditionReport(input: {
  progress: DungeonExpeditionProgress;
  outcome: DungeonExpeditionReport["outcome"];
  endedAtTick: number;
  returnLocationId: string;
  primaryMaterial: ItemId;
}): DungeonExpeditionReport {
  const summary = `Dungeon expedition ${outcomeVerb(input.outcome)} rank ${input.progress.targetRank} ${input.progress.policy} route with ${input.progress.primaryMaterialCount} ${input.primaryMaterial} and ${summarizeSecondaryDrops(input.progress.secondaryDrops)}.`;

  return {
    cultivatorId: input.progress.cultivatorId,
    grade: input.progress.grade,
    targetRank: input.progress.targetRank,
    policy: input.progress.policy,
    outcome: input.outcome,
    startedAtTick: input.progress.startedAtTick,
    endedAtTick: input.endedAtTick,
    stepsResolved: input.progress.stepIndex,
    primaryMaterial: {
      itemId: input.primaryMaterial,
      count: input.progress.primaryMaterialCount,
    },
    secondaryDrops: { ...input.progress.secondaryDrops },
    spiritStoneGain: input.progress.spiritStoneGain,
    realmProgressGain: input.progress.realmProgressGain,
    unlockedNextRank: input.progress.unlockedNextRank,
    returnLocationId: input.returnLocationId,
    summary,
  };
}
