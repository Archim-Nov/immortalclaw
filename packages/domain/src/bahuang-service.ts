import { recordWildernessAttunement } from "./guixu-service.js";
import type {
  BahuangExpeditionProgress,
  BahuangExpeditionStateView,
  Cultivator,
  RunStrategy,
  WakeNode,
  WorldEvent,
  WorldState,
} from "./model.js";
import { EIGHT_WASTES_CONTENT } from "./seed.js";

const REALM_ORDER: Record<string, number> = {
  "鐐兼皵": 0,
  "炼气": 0,
  "绛戝熀": 1,
  "筑基": 1,
  "閲戜腹": 2,
  "金丹": 2,
};

const MAX_WAKE_NODES = 3;
const WAKE_TIMEOUT_TICKS = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function addWorldEvent(
  world: WorldState,
  event: Omit<WorldEvent, "id" | "tick">,
): void {
  world.worldEvents.unshift({
    id: `event-${world.nextEventSequence++}`,
    tick: world.tick,
    ...event,
  });
}

function strategyDefaults(posture: RunStrategy["posture"]): RunStrategy {
  if (posture === "conservative") {
    return { posture, bias: "survival-first", pushPreference: "retreat" };
  }
  if (posture === "aggressive") {
    return { posture, bias: "reward-first", pushPreference: "push" };
  }
  return { posture, bias: "survival-first", pushPreference: "neutral" };
}

function createWakeNode(progress: BahuangExpeditionProgress, worldTick: number): WakeNode | null {
  if (progress.encounteredWakeNodes.length >= MAX_WAKE_NODES || progress.pendingWakeNodeIndex !== null) {
    return null;
  }

  const chance = progress.strategy.posture === "conservative" ? 14 : progress.strategy.posture === "balanced" ? 24 : 34;
  const forceFirst = progress.strategy.posture === "aggressive" && progress.encounteredWakeNodes.length === 0;
  const roll = hashString(`${progress.cultivatorId}:${progress.depth}:${worldTick}:bahuang-wake`) % 100;
  if (!forceFirst && roll >= chance) {
    return null;
  }

  const nodeId = `bahuang-wake-${progress.cultivatorId}-${progress.depth}-${progress.encounteredWakeNodes.length + 1}`;
  const type = hashString(`${nodeId}:type`) % 4;
  if (type === 0) {
    return {
      nodeId,
      context: "Depth pressure spikes: continue deeper now or bank current haul.",
      options: [
        { optionId: "continue-deeper", label: "Continue Deeper", description: "Push the expedition for stronger rewards." },
        { optionId: "bank-now", label: "Bank Now", description: "Stabilize and secure current gains." },
      ],
      defaultOptionId: progress.strategy.pushPreference === "push" ? "continue-deeper" : "bank-now",
      timeoutTicks: WAKE_TIMEOUT_TICKS,
    };
  }
  if (type === 1) {
    return {
      nodeId,
      context: "A volatile cache can be opened by spending rare supplies.",
      options: [
        { optionId: "spend-rare-supply", label: "Spend Rare Supply", description: "Use talisman coverage for a high-value pull." },
        { optionId: "skip-cache", label: "Skip Cache", description: "Avoid supply loss and maintain route stability." },
      ],
      defaultOptionId: progress.strategy.bias === "reward-first" ? "spend-rare-supply" : "skip-cache",
      timeoutTicks: WAKE_TIMEOUT_TICKS,
    };
  }
  if (type === 2) {
    return {
      nodeId,
      context: "A hazard corridor appears with a possible detour.",
      options: [
        { optionId: "detour-hazard", label: "Detour Hazard", description: "Risk a harder segment for better loot density." },
        { optionId: "safe-route", label: "Safe Route", description: "Take the longer route with lower pressure." },
      ],
      defaultOptionId: progress.strategy.posture === "aggressive" ? "detour-hazard" : "safe-route",
      timeoutTicks: WAKE_TIMEOUT_TICKS,
    };
  }
  return {
    nodeId,
    context: "Pressure trend suggests an emergency retreat window.",
    options: [
      { optionId: "hold-line", label: "Hold Line", description: "Stay on route and trust current strategy." },
      { optionId: "emergency-retreat", label: "Emergency Retreat", description: "Abort expedition before collapse." },
    ],
    defaultOptionId: progress.strategy.pushPreference === "retreat" ? "emergency-retreat" : "hold-line",
    timeoutTicks: WAKE_TIMEOUT_TICKS,
  };
}

export function canEnterBahuang(
  cultivator: Cultivator,
  locationId: string,
): { allowed: boolean; reason?: string } {
  if (!EIGHT_WASTES_CONTENT.entryLocationIds.includes(locationId as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number])) {
    return { allowed: false, reason: "Current location does not connect to 八荒入口." };
  }

  const realmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredScore = (REALM_ORDER[EIGHT_WASTES_CONTENT.entryRequirement.minRealm] ?? 0) * 10 + 1;
  if (realmScore < requiredScore) {
    return { allowed: false, reason: "Realm requirement not met." };
  }
  if (cultivator.totalContribution < EIGHT_WASTES_CONTENT.entryRequirement.minContribution) {
    return { allowed: false, reason: "Sect contribution requirement not met." };
  }
  if ((cultivator.inventory[EIGHT_WASTES_CONTENT.entryRequirement.entryTicket] ?? 0) <= 0) {
    return { allowed: false, reason: "Entry ticket missing." };
  }

  return { allowed: true };
}

export function enterBahuangExpedition(
  world: WorldState,
  cultivator: Cultivator,
  strategyPosture: RunStrategy["posture"],
): BahuangExpeditionProgress {
  if (world.bahuangProgress[cultivator.id]?.status === "active") {
    throw new Error("Bahuang expedition already active.");
  }

  const gate = canEnterBahuang(cultivator, cultivator.locationId);
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "Cannot enter bahuang.");
  }

  cultivator.inventory[EIGHT_WASTES_CONTENT.entryRequirement.entryTicket] -= 1;
  const entryTalismans = Math.min(cultivator.inventory["ward-talisman"] ?? 0, 2);
  cultivator.inventory["ward-talisman"] -= entryTalismans;

  const progress: BahuangExpeditionProgress = {
    cultivatorId: cultivator.id,
    status: "active",
    depth: 0,
    supplies: {
      rations: 6,
      talismans: entryTalismans,
    },
    pressure: 0,
    strategy: strategyDefaults(strategyPosture),
    encounteredWakeNodes: [],
    pendingWakeNodeIndex: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    rewards: {
      spiritStones: 0,
      items: {},
      realmProgress: 0,
    },
  };

  world.bahuangProgress[cultivator.id] = progress;
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "Bahuang Entry",
    content: `${cultivator.name} entered 八荒 with ${strategyPosture} posture.`,
    severity: "medium",
    tags: ["bahuang", "entry", strategyPosture],
  });
  return progress;
}

export function retreatFromBahuang(
  world: WorldState,
  cultivator: Cultivator,
  reason: string,
): string | null {
  const progress = world.bahuangProgress[cultivator.id];
  if (!progress || progress.status !== "active") {
    return null;
  }

  cultivator.spiritStones = Math.max(0, cultivator.spiritStones - EIGHT_WASTES_CONTENT.retreatCost.spiritStoneLoss);
  cultivator.realmProgress = Math.max(0, cultivator.realmProgress - EIGHT_WASTES_CONTENT.retreatCost.progressLoss * 5);
  cultivator.injuryTicksRemaining = Math.max(
    cultivator.injuryTicksRemaining,
    EIGHT_WASTES_CONTENT.expedition.injuryTicksOnRetreat,
  );

  progress.status = "retreated";
  delete world.bahuangProgress[cultivator.id];

  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "Bahuang Retreat",
    content: `${cultivator.name} retreated from 八荒 (${reason}).`,
    severity: "high",
    tags: ["bahuang", "retreat", reason],
  });

  return `${cultivator.name} retreated from 八荒.`;
}

export function advanceBahuangExpedition(world: WorldState, cultivator: Cultivator): void {
  const progress = world.bahuangProgress[cultivator.id];
  if (!progress || progress.status !== "active") {
    return;
  }

  if (progress.pendingWakeNodeIndex !== null) {
    if (
      progress.pendingWakeNodeDeadlineTick !== null
      && world.tick >= progress.pendingWakeNodeDeadlineTick
    ) {
      progress.pendingWakeNodeIndex = null;
      progress.pendingWakeNodeDeadlineTick = null;
      progress.resolvedWakeNodeCount += 1;
    }
    return;
  }

  progress.depth += 1;
  progress.supplies.rations = Math.max(0, progress.supplies.rations - EIGHT_WASTES_CONTENT.expedition.rationCostPerTick);

  let pressureGain: number = EIGHT_WASTES_CONTENT.expedition.pressurePerTick;
  if (progress.supplies.talismans > 0) {
    progress.supplies.talismans -= 1;
    pressureGain = Math.max(1, pressureGain - EIGHT_WASTES_CONTENT.expedition.pressureMitigationPerTalisman);
  }
  progress.pressure = clamp(progress.pressure + pressureGain, 0, EIGHT_WASTES_CONTENT.expedition.maxPressure);

  const qiDamage = Math.max(2, Math.floor(progress.pressure / 3));
  const spiritualDamage = Math.max(1, Math.floor(progress.pressure / 4));
  cultivator.qi = clamp(cultivator.qi - qiDamage, 0, cultivator.maxQi);
  cultivator.spiritualPower = clamp(cultivator.spiritualPower - spiritualDamage, 0, cultivator.maxSpiritualPower);

  const rewardRoll = hashString(`${cultivator.id}:${world.tick}:${progress.depth}:bahuang-reward`);
  const spiritStoneGain = EIGHT_WASTES_CONTENT.rewardTable.spiritStones.min
    + (rewardRoll % (EIGHT_WASTES_CONTENT.rewardTable.spiritStones.max - EIGHT_WASTES_CONTENT.rewardTable.spiritStones.min + 1));
  const realmProgressGain = EIGHT_WASTES_CONTENT.rewardTable.realmProgress.min
    + (rewardRoll % (EIGHT_WASTES_CONTENT.rewardTable.realmProgress.max - EIGHT_WASTES_CONTENT.rewardTable.realmProgress.min + 1));

  progress.rewards.spiritStones += spiritStoneGain;
  progress.rewards.realmProgress += realmProgressGain;
  cultivator.spiritStones += spiritStoneGain;
  cultivator.realmProgress = clamp(cultivator.realmProgress + realmProgressGain, 0, 100);

  for (const itemId of EIGHT_WASTES_CONTENT.rewardTable.guaranteedItems) {
    progress.rewards.items[itemId] = (progress.rewards.items[itemId] ?? 0) + 1;
    cultivator.inventory[itemId] += 1;
  }
  const rareRoll = rewardRoll % 100;
  if (rareRoll < EIGHT_WASTES_CONTENT.rewardTable.rareItemDropRate) {
    const rareItem = EIGHT_WASTES_CONTENT.rewardTable.rareItems[0];
    progress.rewards.items[rareItem] = (progress.rewards.items[rareItem] ?? 0) + 1;
    cultivator.inventory[rareItem] += 1;
  }

  recordWildernessAttunement(world, cultivator.id, 1);

  const wakeNode = createWakeNode(progress, world.tick);
  if (wakeNode) {
    progress.encounteredWakeNodes.push(wakeNode);
    progress.pendingWakeNodeIndex = progress.encounteredWakeNodes.length - 1;
    progress.pendingWakeNodeDeadlineTick = world.tick + wakeNode.timeoutTicks;
  }

  if (
    progress.depth >= EIGHT_WASTES_CONTENT.expedition.maxDepth
    || progress.pressure >= EIGHT_WASTES_CONTENT.expedition.maxPressure
    || progress.supplies.rations <= 0
    || cultivator.qi <= 0
    || cultivator.spiritualPower <= 0
  ) {
    if (progress.depth >= EIGHT_WASTES_CONTENT.expedition.maxDepth && cultivator.qi > 0 && cultivator.spiritualPower > 0) {
      progress.status = "completed";
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        title: "Bahuang Completion",
        content: `${cultivator.name} completed an 八荒 run at depth ${progress.depth}.`,
        severity: "medium",
        tags: ["bahuang", "completed"],
      });
      delete world.bahuangProgress[cultivator.id];
      return;
    }

    progress.status = cultivator.qi <= 0 || cultivator.spiritualPower <= 0 ? "failed" : "retreated";
    retreatFromBahuang(world, cultivator, progress.status === "failed" ? "collapse" : "pressure");
  }
}

export function buildBahuangStateView(
  world: WorldState,
  cultivator: Cultivator,
): BahuangExpeditionStateView | null {
  const progress = world.bahuangProgress[cultivator.id];
  if (!progress) {
    return null;
  }

  return {
    status: progress.status,
    depth: progress.depth,
    supplies: { ...progress.supplies },
    pressure: progress.pressure,
    strategy: { ...progress.strategy },
    pendingWakeNode: progress.pendingWakeNodeIndex !== null
      ? progress.encounteredWakeNodes[progress.pendingWakeNodeIndex] ?? null
      : null,
    rewards: {
      spiritStones: progress.rewards.spiritStones,
      items: { ...progress.rewards.items },
      realmProgress: progress.rewards.realmProgress,
    },
  };
}
