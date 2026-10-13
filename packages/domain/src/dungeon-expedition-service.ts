import type {
  ActionJob,
  Cultivator,
  DungeonBeat,
  DungeonExpeditionPolicy,
  DungeonExpeditionProgress,
  DungeonExpeditionReport,
  DungeonExpeditionStateView,
  DungeonGrade,
  DungeonRank,
  DungeonRankYieldHint,
  DungeonStateView,
  ItemId,
  RunStrategy,
  WakeNode,
  WorldState,
} from "./model.js";

export const DUNGEON_EXPEDITION_DURATION_TICKS = 30;
export const DUNGEON_EXPEDITION_STEP_TICKS = 3;
export const DUNGEON_EXPEDITION_MAX_STEPS = DUNGEON_EXPEDITION_DURATION_TICKS / DUNGEON_EXPEDITION_STEP_TICKS;
export const DUNGEON_EXPEDITION_POLICIES = ["conservative", "balanced", "aggressive"] as const satisfies readonly DungeonExpeditionPolicy[];
const MAX_DUNGEON_FLAVOR_EVENTS = 3;
const MAX_DUNGEON_WAKE_NODES = 3;
const DUNGEON_WAKE_TIMEOUT_TICKS = 3;
const DUNGEON_ROUTE_SPLIT_STEPS = new Set([3, 6, 8]);
const DUNGEON_STRATEGY_POSTURES = ["conservative", "balanced", "aggressive"] as const satisfies readonly RunStrategy["posture"][];

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

function strategyFromPosture(posture: RunStrategy["posture"]): RunStrategy {
  if (posture === "conservative") {
    return { posture, bias: "survival-first", pushPreference: "retreat" };
  }
  if (posture === "aggressive") {
    return { posture, bias: "reward-first", pushPreference: "push" };
  }
  return { posture, bias: "survival-first", pushPreference: "neutral" };
}

export function strategyFromPolicy(policy: DungeonExpeditionPolicy): RunStrategy {
  return strategyFromPosture(policy);
}

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function startDungeonExpeditionActionIdOf(rank: DungeonRank, policy: DungeonExpeditionPolicy) {
  return `start-dungeon-expedition:rank-${rank}:${policy}` as const;
}

export function enterDungeonActionIdOf(rank: DungeonRank, posture: RunStrategy["posture"]) {
  return `enter-dungeon:rank-${rank}:${posture}` as const;
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
  strategy?: RunStrategy;
  startedAtTick: number;
}): DungeonExpeditionProgress {
  const strategy = input.strategy ?? strategyFromPolicy(input.policy);
  return {
    cultivatorId: input.cultivatorId,
    jobId: input.jobId,
    locationId: input.locationId,
    grade: input.grade,
    targetRank: input.targetRank,
    policy: input.policy,
    strategy,
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
    flavorEventTitles: [],
    beats: [],
    qiSpent: 0,
    spiritualPowerSpent: 0,
    injuryTicksGained: 0,
    wakeNodesEncountered: 0,
    maxWakeNodes: MAX_DUNGEON_WAKE_NODES,
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
  };
}

export function parseEnterDungeonActionId(
  actionId: string,
): { rank: DungeonRank; posture: RunStrategy["posture"] } | null {
  const prefix = "enter-dungeon:rank-";
  if (!actionId.startsWith(prefix)) {
    return null;
  }

  const [rankPart, posturePart] = actionId.slice(prefix.length).split(":");
  const rank = Number.parseInt(rankPart ?? "", 10);
  if (!Number.isInteger(rank) || rank < 1 || rank > 9) {
    return null;
  }
  if (!DUNGEON_STRATEGY_POSTURES.includes(posturePart as RunStrategy["posture"])) {
    return null;
  }

  return {
    rank: rank as DungeonRank,
    posture: posturePart as RunStrategy["posture"],
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
  const pendingWakeNode = active?.pendingWakeNode ?? null;

  return {
    active: active
      ? {
          grade: active.grade,
          targetRank: active.targetRank,
          policy: active.policy,
          strategy: active.strategy,
          startedAtTick: active.startedAtTick,
          stepsResolved: active.stepIndex,
          maxSteps: active.maxSteps,
          nextResolutionTick: active.nextResolutionTick,
          remainingTicks: job?.remainingTicks ?? 0,
        }
      : null,
    lastReport,
    wakeNodeHint: pendingWakeNode
      ? {
          nodeId: pendingWakeNode.nodeId,
          context: pendingWakeNode.context,
          defaultOptionId: pendingWakeNode.defaultOptionId,
          timeoutTicks: pendingWakeNode.timeoutTicks,
        }
      : null,
  };
}

export function resolveDungeonWakeNodeByDefault(progress: DungeonExpeditionProgress): DungeonExpeditionProgress {
  if (!progress.pendingWakeNode) {
    return progress;
  }

  const safeOption = progress.pendingWakeNode.options.find((option) =>
    option.optionId.includes("safe")
    || option.optionId.includes("stable")
    || option.optionId.includes("avoid")
    || option.optionId.includes("bank")
    || option.optionId.includes("retreat"),
  );
  const riskyOption = progress.pendingWakeNode.options.find((option) => !safeOption || option.optionId !== safeOption.optionId);

  let chosenOptionId = progress.pendingWakeNode.defaultOptionId;
  if (progress.strategy.posture === "conservative" && progress.strategy.bias === "survival-first") {
    chosenOptionId = safeOption?.optionId ?? progress.pendingWakeNode.defaultOptionId;
  } else if (progress.strategy.posture === "aggressive" && progress.strategy.bias === "reward-first") {
    chosenOptionId = riskyOption?.optionId ?? progress.pendingWakeNode.defaultOptionId;
  }
  const risky = riskyOption?.optionId === chosenOptionId;

  return {
    ...progress,
    spiritStoneGain: progress.spiritStoneGain + (risky ? 18 : 0),
    realmProgressGain: progress.realmProgressGain + (risky ? 2 : 0),
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: progress.resolvedWakeNodeCount + 1,
  };
}

export function maybeCreateDungeonWakeNode(input: {
  progress: DungeonExpeditionProgress;
  cultivator: Cultivator;
  actionKind: "search" | "guardian";
  worldTick: number;
}): WakeNode | null {
  const { progress, cultivator, actionKind } = input;
  if (progress.wakeNodesEncountered >= progress.maxWakeNodes || progress.pendingWakeNode) {
    return null;
  }

  const nodeId = `dungeon-wake-${progress.jobId}-${progress.stepIndex}-${progress.wakeNodesEncountered + 1}`;
  if (DUNGEON_ROUTE_SPLIT_STEPS.has(progress.stepIndex)) {
    return {
      nodeId,
      context: "A route split appears: one stable corridor, one volatile shortcut.",
      options: [
        {
          optionId: "stable-route",
          label: "Stable Route",
          description: "Maintain lower risk and slower progress.",
        },
        {
          optionId: "volatile-route",
          label: "Take Shortcut",
          description: "Accept higher pressure for stronger rewards.",
        },
      ],
      defaultOptionId: progress.strategy.posture === "aggressive" ? "volatile-route" : "stable-route",
      timeoutTicks: DUNGEON_WAKE_TIMEOUT_TICKS,
    };
  }

  const qiRatio = cultivator.maxQi > 0 ? cultivator.qi / cultivator.maxQi : 0;
  const spiritualRatio = cultivator.maxSpiritualPower > 0
    ? cultivator.spiritualPower / cultivator.maxSpiritualPower
    : 0;
  if (actionKind === "guardian" && (qiRatio < 0.55 || spiritualRatio < 0.55 || cultivator.injuryTicksRemaining > 0)) {
    return {
      nodeId,
      context: "An elite encounter is tracking your expedition path.",
      options: [
        {
          optionId: "engage-elite",
          label: "Engage Elite",
          description: "Attempt a harder fight for progression rewards.",
        },
        {
          optionId: "avoid-elite",
          label: "Avoid Elite",
          description: "Preserve safety and continue with regular clears.",
        },
      ],
      defaultOptionId: progress.strategy.posture === "conservative" ? "avoid-elite" : "engage-elite",
      timeoutTicks: DUNGEON_WAKE_TIMEOUT_TICKS,
    };
  }

  const rewardsSignificant = progress.spiritStoneGain >= 180 || progress.primaryMaterialCount >= 4;
  const pressureHigh = qiRatio < 0.5 || spiritualRatio < 0.5 || cultivator.injuryTicksRemaining >= 3;
  if (rewardsSignificant && pressureHigh) {
    return {
      nodeId,
      context: "Current gains can be banked now or pushed one more segment.",
      options: [
        {
          optionId: "bank-progress",
          label: "Bank Progress",
          description: "Lock current gains and reduce pressure growth.",
        },
        {
          optionId: "push-deeper",
          label: "Push Deeper",
          description: "Continue deeper for a stronger step payout.",
        },
      ],
      defaultOptionId: progress.strategy.posture === "conservative" ? "bank-progress" : "push-deeper",
      timeoutTicks: DUNGEON_WAKE_TIMEOUT_TICKS,
    };
  }

  return null;
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

function mergeFlavorEventTitles(
  existing: readonly string[],
  delta: readonly string[],
): string[] {
  const merged = [...existing];
  for (const title of delta) {
    if (!title || merged.includes(title)) {
      continue;
    }
    merged.push(title);
    if (merged.length >= MAX_DUNGEON_FLAVOR_EVENTS) {
      return merged.slice(0, MAX_DUNGEON_FLAVOR_EVENTS);
    }
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
  flavorEventTitles: string[];
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
    flavorEventTitles: mergeFlavorEventTitles(input.progress.flavorEventTitles, input.flavorEventTitles),
  };
}

function summarizeSecondaryDrops(drops: Partial<Record<ItemId, number>>): string {
  const topDrops = (Object.entries(drops) as Array<[ItemId, number | undefined]>)
    .filter((entry): entry is [ItemId, number] => typeof entry[1] === "number" && entry[1] > 0)
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

function outcomePhrase(outcome: DungeonExpeditionReport["outcome"]): string {
  if (outcome === "completed") {
    return "走完了";
  }
  if (outcome === "withdrew") {
    return "提前撤出了";
  }
  if (outcome === "aborted") {
    return "中途放弃了";
  }
  return "几乎是被抬出来的";
}

const POSTURE_LABEL: Record<DungeonExpeditionPolicy, string> = {
  conservative: "稳妥",
  balanced: "均衡",
  aggressive: "冒进",
};

const DUNGEON_BEAT_POOL: readonly DungeonBeat[] = [
  {
    kind: "find",
    title: "石室残材",
    detail: "塌掉的石室角落里还剩一截温热的灵材，像是有人刚挖走过一回，又没能拿干净。",
    mood: "小有收获，脚步轻了些",
  },
  {
    kind: "find",
    title: "壁缝灵光",
    detail: "墙缝里渗出一点细碎的灵光，刮下来能入药，也沾了满手潮灰。",
    mood: "手还是脏的，心里却稳",
  },
  {
    kind: "close-call",
    title: "夹壁骤合",
    detail: "阵纹忽然亮了一下，左右石壁往中间挤。人是侧身挤出来的，背后的衣料撕了一条。",
    mood: "后背还在发凉",
  },
  {
    kind: "close-call",
    title: "暗器擦肩",
    detail: "岔路上方掉下一枚生锈的暗器，贴着肩膀落下，钉在脚边的砖缝里还在颤。",
    mood: "走得比进来时小心",
  },
  {
    kind: "person",
    title: "岔路散修",
    detail: "遇见一个同样在探路的散修。对方只点了点头，把一盏快灭的灯往这边偏了偏，就拐进另一条岔路。",
    mood: "地宫里居然不算只剩自己",
  },
  {
    kind: "person",
    title: "石台上的人",
    detail: "石台上坐着个调息的人，看见来客就收了功，说前面三丈有活阵，说完便起身往回走。",
    mood: "记住了那句话",
  },
  {
    kind: "insight",
    title: "残诀半行",
    detail: "石壁上剩半行刻痕，读到第二遍时灵台清了一瞬，像是把刚才乱掉的呼吸又顺了回去。",
    mood: "心里亮了一下",
  },
  {
    kind: "mood",
    title: "潮气压胸",
    detail: "越往里走潮气越重，灯火显得很矮。并没有出事，只是胸口一直发紧。",
    mood: "想出去透口气",
  },
  {
    kind: "mood",
    title: "路还算顺",
    detail: "这一段居然没什么岔子。脚印、壁灯、落灰的石阶都按着该有的样子排开。",
    mood: "走得顺，胆子也大了一点",
  },
  {
    kind: "injury",
    title: "肩上的口子",
    detail: "暗处扫来一道锋芒，肩上被拉开一道不深的口子。血不多，可袖子已经湿了一块。",
    mood: "带伤，还想再看一段",
  },
];

export function expeditionPressureFor(input: {
  policy: DungeonExpeditionPolicy;
  rank: DungeonRank;
  action: "search" | "guardian";
  seed: string;
}): {
  qiDrain: number;
  spiritualDrain: number;
  injuryTicks: number;
  realmProgress: number;
  beat: DungeonBeat;
} {
  const roll = hashString(`${input.seed}:pressure`) % 100;
  const beat = DUNGEON_BEAT_POOL[hashString(`${input.seed}:beat`) % DUNGEON_BEAT_POOL.length]!;
  const rankBump = input.rank >= 7 ? 2 : input.rank >= 4 ? 1 : 0;
  const guardianBump = input.action === "guardian" ? 1 : 0;

  if (input.policy === "conservative") {
    return {
      qiDrain: 1 + rankBump,
      spiritualDrain: 1 + guardianBump,
      injuryTicks: 0,
      realmProgress: 2 + guardianBump,
      beat: beat.kind === "injury"
        ? {
            kind: "close-call",
            title: "收手及时",
            detail: "那一下本来能伤到人。稳妥的走法让你提前侧开，只留下掌心一层冷汗。",
            mood: "还活着，而且知道自己为什么还活着",
          }
        : beat,
    };
  }

  if (input.policy === "aggressive") {
    const injured = roll < 22;
    return {
      qiDrain: 4 + rankBump + guardianBump,
      spiritualDrain: 3 + guardianBump,
      injuryTicks: injured ? 5 : 0,
      realmProgress: 7 + guardianBump + Math.floor((input.rank - 1) / 3),
      beat: injured
        ? {
            kind: "injury",
            title: "冒进的代价",
            detail: "你选了那条更短的路。灵材确实更多，肩上也实实在在地挨了一下，血把护腕浸透了一圈。",
            mood: "疼，但东西在手里",
          }
        : beat,
    };
  }

  const grazed = roll < 8;
  return {
    qiDrain: 2 + rankBump,
    spiritualDrain: 2 + guardianBump,
    injuryTicks: grazed ? 2 : 0,
    realmProgress: 4 + guardianBump,
    beat: grazed
      ? {
          kind: "injury",
          title: "擦伤",
          detail: "均衡着往前走，还是被阵纹擦到了小臂。不至于退，接下来几步会疼。",
          mood: "挂着轻伤，还没到该撤的时候",
        }
      : beat,
  };
}

export function createDungeonExpeditionReport(input: {
  progress: DungeonExpeditionProgress;
  outcome: DungeonExpeditionReport["outcome"];
  endedAtTick: number;
  returnLocationId: string;
  primaryMaterial: ItemId;
}): DungeonExpeditionReport {
  const remembered = input.progress.beats?.[input.progress.beats.length - 1];
  const summary = [
    `地宫${outcomePhrase(input.outcome)}${input.progress.grade}${input.progress.targetRank}阶，姿态是${POSTURE_LABEL[input.progress.policy]}。`,
    `带回 ${input.progress.primaryMaterialCount} ${input.primaryMaterial}，旁支 ${summarizeSecondaryDrops(input.progress.secondaryDrops)}，灵石 ${input.progress.spiritStoneGain}，修为 +${input.progress.realmProgressGain}。`,
    `气血耗去 ${input.progress.qiSpent ?? 0}，灵力耗去 ${input.progress.spiritualPowerSpent ?? 0}。`,
    remembered ? `记得最清楚的是：${remembered.detail}` : null,
    `人已回到 ${input.returnLocationId}。`,
    `(${outcomeVerb(input.outcome)} rank ${input.progress.targetRank} ${input.progress.policy})`,
  ].filter((part): part is string => Boolean(part)).join("");

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
    flavorEvents: [...input.progress.flavorEventTitles],
    beats: [...(input.progress.beats ?? [])],
    qiSpent: input.progress.qiSpent ?? 0,
    spiritualPowerSpent: input.progress.spiritualPowerSpent ?? 0,
    injuryTicksGained: input.progress.injuryTicksGained ?? 0,
  };
}
