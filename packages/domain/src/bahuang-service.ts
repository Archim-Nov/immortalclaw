import { bahuangBandScenes, bahuangOptionEffect, type BahuangOptionEffect } from "./bahuang-scenes.js";
import { grantCombatPractice } from "./combat-skills.js";
import { buildCultivatorCombatSnapshot } from "./combat-snapshot.js";
import { bahuangRoomLine } from "./dungeon-interior.js";
import { GameplayRejection } from "./gameplay-error.js";
import { recordWildernessAttunement } from "./guixu-service.js";
import {
  GRUDGE_FROM_DRAW,
  GRUDGE_FROM_DUEL,
  grudgeArcOf,
  moodCauseForDuel,
  recordLife,
  shiftCultivatorMood,
} from "./inner-life.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import { fightDigestText, type PartyBattleResult } from "./party-battle.js";
import { runCultivatorSkillDuel } from "./skill-duel.js";
import {
  AFFINITY_GAINS,
  addMutualAffinity,
  addMutualGrudge,
  affinityCloserPhrase,
  getAffinityLevel,
  getSocialLink,
} from "./social.js";
import {
  bahuangBandForDepth,
  noteWild,
  pickWildLine,
  wildRouteFromBand,
} from "./wild-places.js";
import type {
  BahuangExpeditionProgress,
  BahuangExpeditionStateView,
  CombatLogEntry,
  Cultivator,
  ItemId,
  RunStrategy,
  WakeNode,
  WorldEvent,
  WorldState,
} from "./model.js";
import { EIGHT_WASTES_CONTENT } from "./seed.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

const REALM_ORDER: Record<string, number> = {
  "鐐兼皵": 0,
  "炼气": 0,
  "绛戝熀": 1,
  "筑基": 1,
  "閲戜腹": 2,
  "金丹": 2,
  "元婴": 3,
  "化神": 4,
  "炼虚": 5,
  "合体": 6,
  "大乘": 7,
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

function finishBahuangWake(input: {
  nodeId: string;
  sceneKind: string;
  context: string;
  options: WakeNode["options"];
  defaultOptionId: string;
  subjectId?: string;
}): WakeNode {
  return { ...input, timeoutTicks: WAKE_TIMEOUT_TICKS };
}

function sceneWake(progress: BahuangExpeditionProgress, nodeId: string): WakeNode {
  const band = bahuangBandForDepth(progress.depth);
  const scenes = bahuangBandScenes(band.name);
  const used = new Set(progress.encounteredWakeNodes.map((node) => node.sceneKind).filter((kind): kind is string => Boolean(kind)));
  const open = scenes.filter((scene) => !used.has(scene.sceneKind));
  const pool = open.length > 0 ? open : scenes;
  const scene = pool[hashString(`${nodeId}:type`) % pool.length] ?? scenes[0]!;
  return finishBahuangWake({
    nodeId,
    sceneKind: scene.sceneKind,
    context: scene.context,
    options: scene.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
      description: option.description,
    })),
    defaultOptionId: scene.defaultOptionId,
  });
}

function meetingWake(progress: BahuangExpeditionProgress, other: Cultivator, nodeId: string): WakeNode {
  const band = bahuangBandForDepth(progress.depth);
  return finishBahuangWake({
    nodeId,
    sceneKind: "meeting",
    subjectId: other.id,
    context: `${band.name}里碰见${other.name}。${band.statusLabel}还挂着，${band.enemy}在前，${band.follower}跟在旁边。可以避开，也可以攀谈，也可以在这里交手。`,
    options: [
      { optionId: "slip-past", label: "避开", description: "不打招呼，从旁边走过去。" },
      { optionId: "speak-with", label: "攀谈", description: "停下来说两句，这一架先不开。" },
      { optionId: "cross-hands", label: "交手", description: "在这里过一手。" },
    ],
    defaultOptionId: "slip-past",
  });
}

export function previewBahuangWakes(progress: BahuangExpeditionProgress): WakeNode[] {
  const band = bahuangBandForDepth(progress.depth);
  return bahuangBandScenes(band.name).map((scene, index) => finishBahuangWake({
    nodeId: `bahuang-preview-${band.name}-${index}`,
    sceneKind: scene.sceneKind,
    context: scene.context,
    options: scene.options.map((option) => ({
      optionId: option.optionId,
      label: option.label,
      description: option.description,
    })),
    defaultOptionId: scene.defaultOptionId,
  }));
}

function rememberMet(progress: BahuangExpeditionProgress, otherId: string): void {
  const met = progress.metCultivatorIds ?? [];
  if (met.includes(otherId)) return;
  progress.metCultivatorIds = [...met, otherId];
}

function findBahuangPeer(world: WorldState, progress: BahuangExpeditionProgress): Cultivator | null {
  const bandName = bahuangBandForDepth(progress.depth).name;
  const met = new Set(progress.metCultivatorIds ?? []);
  const peers = Object.values(world.cultivators).filter((candidate) => {
    if (candidate.id === progress.cultivatorId || met.has(candidate.id)) return false;
    const other = world.bahuangProgress[candidate.id];
    if (!other || other.status !== "active") return false;
    return bahuangBandForDepth(other.depth).name === bandName;
  }).sort((left, right) => left.id.localeCompare(right.id));
  if (peers.length === 0) return null;
  const index = hashString(`${progress.cultivatorId}:${progress.depth}:peer`) % peers.length;
  return peers[index] ?? null;
}

function peerStillHere(world: WorldState, progress: BahuangExpeditionProgress, peerId: string): Cultivator | null {
  const peer = world.cultivators[peerId];
  const peerRun = world.bahuangProgress[peerId];
  if (!peer || !peerRun || peerRun.status !== "active") return null;
  if (bahuangBandForDepth(peerRun.depth).name !== bahuangBandForDepth(progress.depth).name) return null;
  return peer;
}

function createWakeNode(world: WorldState, progress: BahuangExpeditionProgress, worldTick: number): WakeNode | null {
  if (progress.encounteredWakeNodes.length >= MAX_WAKE_NODES || progress.pendingWakeNodeIndex !== null) {
    return null;
  }

  const chance = progress.strategy.posture === "conservative" ? 14 : progress.strategy.posture === "balanced" ? 24 : 34;
  const forceFirst = progress.encounteredWakeNodes.length === 0;
  const roll = hashString(`${progress.cultivatorId}:${progress.depth}:${worldTick}:bahuang-wake`) % 100;
  if (!forceFirst && roll >= chance) {
    return null;
  }

  const nodeId = `bahuang-wake-${progress.cultivatorId}-${progress.depth}-${progress.encounteredWakeNodes.length + 1}`;
  const alreadyMet = progress.encounteredWakeNodes.some((node) => node.sceneKind === "meeting");
  const peer = alreadyMet ? null : findBahuangPeer(world, progress);
  if (peer) {
    rememberMet(progress, peer.id);
    return meetingWake(progress, peer, nodeId);
  }
  return sceneWake(progress, nodeId);
}

function rememberBahuangLine(world: WorldState, cultivator: Cultivator, title: string, detail: string): void {
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "insight",
    title,
    detail,
    locationId: cultivator.locationId,
    mood: "这一句可以拿回去说",
  }));
  recordLife(cultivator, { tick: world.tick, kind: "growth", text: detail });
}

function maybeBahuangSighting(world: WorldState, cultivator: Cultivator, progress: BahuangExpeditionProgress): void {
  const gap = progress.nextSightingGap ?? (2 + (hashString(`${cultivator.id}:bahuang-gap`) % 3));
  progress.nextSightingGap = gap;
  const last = progress.lastSightingDepth ?? 0;
  if (progress.depth - last < gap) return;
  progress.lastSightingDepth = progress.depth;
  progress.nextSightingGap = (2 + (hashString(`${cultivator.id}:${progress.depth}:next-gap`) % 3)) as 2 | 3 | 4;
  const band = bahuangBandForDepth(progress.depth);
  const line = pickWildLine(band.sightings, `${cultivator.id}:${progress.depth}:sight`);
  rememberBahuangLine(world, cultivator, "八荒里的见闻", `${band.name}这一段的见闻：${line}`);
}

function maybeBahuangRoom(world: WorldState, cultivator: Cultivator, progress: BahuangExpeditionProgress): void {
  if (progress.lastSightingDepth === progress.depth) return;
  if (progress.depth % 2 !== 0) return;
  const band = bahuangBandForDepth(progress.depth);
  rememberBahuangLine(
    world,
    cultivator,
    "路上的一处",
    bahuangRoomLine(band.name, `${cultivator.id}:${progress.depth}:room`),
  );
}

function bahuangCarriedLine(progress: BahuangExpeditionProgress): string {
  const bits: string[] = [];
  for (const [itemId, count] of Object.entries(progress.rewards.items) as Array<[ItemId, number | undefined]>) {
    if (!count || count <= 0) continue;
    const name = ITEM_CATALOG[itemId]?.name ?? itemId;
    bits.push(count > 1 ? `${count}份${name}` : name);
    if (bits.length >= 2) break;
  }
  if (progress.rewards.spiritStones > 0) bits.push(`${progress.rewards.spiritStones}枚灵石`);
  if (bits.length === 0) bits.push("袖口上的一层荒尘");
  return `带出何物：${bits.join("，")}。`;
}

export function canEnterBahuang(
  cultivator: Cultivator,
  locationId: string,
  world: WorldState,
): { allowed: boolean; reason?: string } {
  if (!EIGHT_WASTES_CONTENT.entryLocationIds.includes(locationId as (typeof EIGHT_WASTES_CONTENT.entryLocationIds)[number])) {
    return { allowed: false, reason: "这里连不上八荒的入口。" };
  }

  const realmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredScore = (REALM_ORDER[EIGHT_WASTES_CONTENT.entryRequirement.minRealm] ?? 0) * 10 + 1;
  if (realmScore < requiredScore) {
    return { allowed: false, reason: "境界还没到，进不了八荒。" };
  }
  if (cultivator.realmLevel < EIGHT_WASTES_CONTENT.entryRequirement.minRealmLevel) {
    return { allowed: false, reason: "境界等级还没到，进不了八荒。" };
  }
  const attunement = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;
  if (attunement < EIGHT_WASTES_CONTENT.entryRequirement.minWildernessAttunement) {
    return { allowed: false, reason: "荒野里的感应还不够，进不了八荒。" };
  }
  if (cultivator.totalContribution < EIGHT_WASTES_CONTENT.entryRequirement.minContribution) {
    return { allowed: false, reason: "宗门贡献还不够，进不了八荒。" };
  }
  if ((cultivator.inventory[EIGHT_WASTES_CONTENT.entryRequirement.entryTicket] ?? 0) <= 0) {
    return { allowed: false, reason: "没有八荒令，进不了八荒。" };
  }
  const { entryWindowCycle, entryWindowDuration } = EIGHT_WASTES_CONTENT.entryRequirement;
  if (world.tick % entryWindowCycle >= entryWindowDuration) {
    const ticksUntilOpen = entryWindowCycle - (world.tick % entryWindowCycle);
    return { allowed: false, reason: `八荒入口关着，再过${ticksUntilOpen}刻才开。` };
  }

  return { allowed: true };
}

export function enterBahuangExpedition(
  world: WorldState,
  cultivator: Cultivator,
  strategyPosture: RunStrategy["posture"],
): BahuangExpeditionProgress {
  if (world.bahuangProgress[cultivator.id]?.status === "active") {
    throw new GameplayRejection("八荒这一趟还没走完。");
  }

  const gate = canEnterBahuang(cultivator, cultivator.locationId, world);
  if (!gate.allowed) {
    throw new GameplayRejection(gate.reason ?? "这会儿进不了八荒。");
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
  const gateBand = bahuangBandForDepth(0);
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: `走进${gateBand.name}`,
    content: `${cultivator.name}走进${gateBand.name}。${gateBand.advice}`,
    severity: "medium",
    tags: ["bahuang", "entry", strategyPosture],
  });
  noteWild(cultivator, {
    tick: world.tick,
    locationId: cultivator.locationId,
    title: `走进${gateBand.name}`,
    detail: gateBand.advice,
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

  const band = bahuangBandForDepth(progress.depth);
  const leaving = reason === "collapse" ? band.loss : band.retreat;
  noteWild(cultivator, {
    tick: world.tick,
    locationId: cultivator.locationId,
    title: reason === "collapse" ? `${band.name}没走出去` : `从${band.name}撤出`,
    detail: leaving,
  });

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
    title: reason === "collapse" ? `${band.name}没走出去` : `从${band.name}撤出`,
    content: leaving,
    severity: "high",
    tags: ["bahuang", "retreat", reason],
  });

  return leaving;
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
      const wake = progress.encounteredWakeNodes[progress.pendingWakeNodeIndex];
      const band = bahuangBandForDepth(progress.depth);
      const timedOut = wake?.sceneKind === "meeting"
        ? `${band.name}里时辰到了。这一面没碰上，也没有交手。`
        : `${band.name}里时辰到了，这一处没选，东西没有进袋子。`;
      rememberBahuangLine(world, cultivator, "八荒里的见闻", timedOut);
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
  const depthScaling = 1 + Math.floor(progress.depth / 3) * 0.25;
  const spiritStoneGain = Math.floor((EIGHT_WASTES_CONTENT.rewardTable.spiritStones.min
    + (rewardRoll % (EIGHT_WASTES_CONTENT.rewardTable.spiritStones.max - EIGHT_WASTES_CONTENT.rewardTable.spiritStones.min + 1))) * depthScaling);
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
  if (progress.depth >= EIGHT_WASTES_CONTENT.rewardTable.deepRunMinDepth) {
    const deepRoll = hashString(`${cultivator.id}:${world.tick}:${progress.depth}:deep-run`) % 100;
    if (deepRoll < EIGHT_WASTES_CONTENT.rewardTable.deepRunDropRate) {
      const deepItem = EIGHT_WASTES_CONTENT.rewardTable.deepRunItems[0];
      progress.rewards.items[deepItem] = (progress.rewards.items[deepItem] ?? 0) + 1;
      cultivator.inventory[deepItem] += 1;
    }
  }
  if (progress.depth >= EIGHT_WASTES_CONTENT.rewardTable.legendaryMinDepth) {
    const legendaryRoll = hashString(`${cultivator.id}:${world.tick}:${progress.depth}:legendary`) % 100;
    if (legendaryRoll < EIGHT_WASTES_CONTENT.rewardTable.legendaryDropRate) {
      const legendaryItem = EIGHT_WASTES_CONTENT.rewardTable.legendaryItems[0];
      progress.rewards.items[legendaryItem] = (progress.rewards.items[legendaryItem] ?? 0) + 1;
      cultivator.inventory[legendaryItem] += 1;
    }
  }

  recordWildernessAttunement(world, cultivator.id, 1);
  maybeBahuangSighting(world, cultivator, progress);
  maybeBahuangRoom(world, cultivator, progress);

  const wakeNode = createWakeNode(world, progress, world.tick);
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
      const bonus = EIGHT_WASTES_CONTENT.rewardTable.completionBonus;
      progress.rewards.spiritStones += bonus.spiritStones;
      progress.rewards.realmProgress += bonus.realmProgress;
      cultivator.spiritStones += bonus.spiritStones;
      cultivator.realmProgress = clamp(cultivator.realmProgress + bonus.realmProgress, 0, 100);
      for (const itemId of bonus.guaranteedItems) {
        progress.rewards.items[itemId] = (progress.rewards.items[itemId] ?? 0) + 1;
        cultivator.inventory[itemId] += 1;
      }
      const carried = bahuangCarriedLine(progress);
      const doneBand = bahuangBandForDepth(progress.depth);
      addWorldEvent(world, {
        cultivatorId: cultivator.id,
        locationId: cultivator.locationId,
        title: "八荒远征完成",
        content: `${cultivator.name}走出${doneBand.name}。${carried}`,
        severity: "medium",
        tags: ["bahuang", "completed"],
      });
      rememberBahuangLine(world, cultivator, "带出何物", `${doneBand.name}走到了头。${carried}`);
      delete world.bahuangProgress[cultivator.id];
      return;
    }

    const failed = cultivator.qi <= 0 || cultivator.spiritualPower <= 0;
    const exitBand = bahuangBandForDepth(progress.depth);
    noteWild(cultivator, {
      tick: world.tick,
      locationId: cultivator.locationId,
      title: failed ? `${exitBand.name}没走出去` : `从${exitBand.name}撤出`,
      detail: failed ? exitBand.loss : exitBand.retreat,
    });
    progress.status = failed ? "failed" : "retreated";
    retreatFromBahuang(world, cultivator, failed ? "collapse" : "pressure");
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

  const route = wildRouteFromBand(bahuangBandForDepth(progress.depth));
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
    placeName: route.placeName,
    advice: route.advice,
    mysteryLine: route.mysteryLine,
    statusLabel: route.statusLabel,
    enemyLabel: route.enemyLabel,
    followerLabel: route.followerLabel,
  };
}

function closeBahuangWake(
  world: WorldState,
  cultivator: Cultivator,
  progress: BahuangExpeditionProgress,
  option: WakeNode["options"][number],
): string {
  progress.pendingWakeNodeIndex = null;
  progress.pendingWakeNodeDeadlineTick = null;
  progress.resolvedWakeNodeCount += 1;
  const sentence = `${cultivator.name}在八荒里选了「${option.label}」。${option.description}`;
  rememberBahuangLine(world, cultivator, "八荒里的抉择", sentence);
  return sentence;
}

function applySceneEffect(
  cultivator: Cultivator,
  progress: BahuangExpeditionProgress,
  effect: BahuangOptionEffect,
): void {
  if (effect.kind === "ease") {
    progress.pressure = Math.max(0, progress.pressure - effect.pressure);
    return;
  }
  if (effect.kind === "pocket") {
    progress.pressure += 1;
    progress.rewards.spiritStones += effect.amount;
    cultivator.spiritStones += effect.amount;
    return;
  }
  if (effect.kind === "stones") {
    progress.pressure += effect.pressure ?? 0;
    progress.rewards.spiritStones += effect.amount;
    cultivator.spiritStones += effect.amount;
    return;
  }
  if (effect.kind === "realm") {
    progress.pressure += effect.pressure;
    progress.rewards.realmProgress += effect.amount;
    cultivator.realmProgress = Math.min(100, cultivator.realmProgress + effect.amount);
    return;
  }
  if (effect.kind === "ration") {
    if (effect.delta < 0 && progress.supplies.rations <= 0) return;
    progress.supplies.rations = Math.max(0, progress.supplies.rations + effect.delta);
    progress.pressure = Math.max(0, progress.pressure - effect.pressure);
    return;
  }
  if (effect.kind === "spend") {
    if (cultivator.spiritStones < effect.cost) return;
    cultivator.spiritStones -= effect.cost;
    progress.rewards.spiritStones += effect.gain;
    cultivator.spiritStones += effect.gain;
    return;
  }
  if (effect.kind === "stock") {
    progress.supplies.rations += effect.rations;
    progress.pressure += effect.pressure;
  }
}

function wearFromFight(cultivator: Cultivator, hpLostRatio: number): void {
  const qiLoss = Math.max(2, Math.round(cultivator.maxQi * Math.min(1, Math.max(0, hpLostRatio)) * 0.18));
  const spiritLoss = Math.max(1, Math.round(cultivator.maxSpiritualPower * 0.08));
  cultivator.qi = clamp(cultivator.qi - qiLoss, 1, cultivator.maxQi);
  cultivator.spiritualPower = clamp(cultivator.spiritualPower - spiritLoss, 0, cultivator.maxSpiritualPower);
}

function writeMeetingCombat(
  world: WorldState,
  cultivator: Cultivator,
  opponent: Cultivator,
  battle: PartyBattleResult,
  summary: string,
  won: boolean,
): void {
  const entry: CombatLogEntry = {
    id: `combat-${world.nextCombatSequence++}`,
    tick: world.tick,
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    encounterId: "bahuang-meeting",
    enemyName: opponent.name,
    outcome: won ? "victory" : "defeat",
    damageTaken: 0,
    spiritualPowerSpent: Math.max(1, Math.round(cultivator.maxSpiritualPower * 0.08)),
    loot: {},
    summary,
    encounterTemplateId: "bahuang-meeting",
    encounterBuildId: "bahuang-meeting",
    pvpOpponentCultivatorId: opponent.id,
    pvpOpponentName: opponent.name,
    pvpBattleKind: "bahuang-meeting",
    totalRounds: battle.roundsPlayed,
    combatRounds: [battle.summary],
  };
  world.combatLogs.unshift(entry);
}

function closePeerMeeting(world: WorldState, actor: Cultivator, peer: Cultivator): void {
  const progress = world.bahuangProgress[peer.id];
  if (!progress || progress.status !== "active" || progress.pendingWakeNodeIndex === null) return;
  const wake = progress.encounteredWakeNodes[progress.pendingWakeNodeIndex];
  if (!wake || wake.sceneKind !== "meeting" || wake.subjectId !== actor.id) return;
  progress.pendingWakeNodeIndex = null;
  progress.pendingWakeNodeDeadlineTick = null;
  progress.resolvedWakeNodeCount += 1;
  rememberMet(progress, actor.id);
}

function resolveBahuangMeeting(
  world: WorldState,
  cultivator: Cultivator,
  progress: BahuangExpeditionProgress,
  wakeNode: WakeNode,
  optionId: string,
): string {
  const band = bahuangBandForDepth(progress.depth);
  const peerId = wakeNode.subjectId;
  const named = peerId ? world.cultivators[peerId] : null;
  const peer = peerId ? peerStillHere(world, progress, peerId) : null;
  const gone = `${band.name}里本来要碰见${named?.name ?? "那个人"}。人已经不在这一带，这一架没开。`;

  if (optionId === "slip-past") {
    const sentence = peer
      ? `${cultivator.name}在${band.name}避开了${peer.name}。人从旁边走过去，这一架没开。`
      : gone;
    progress.pendingWakeNodeIndex = null;
    progress.pendingWakeNodeDeadlineTick = null;
    progress.resolvedWakeNodeCount += 1;
    rememberBahuangLine(world, cultivator, "八荒里的见闻", sentence);
    return sentence;
  }

  if (optionId === "speak-with") {
    progress.pendingWakeNodeIndex = null;
    progress.pendingWakeNodeDeadlineTick = null;
    progress.resolvedWakeNodeCount += 1;
    if (!peer) {
      rememberBahuangLine(world, cultivator, "八荒里的见闻", gone);
      return gone;
    }
    const link = getSocialLink(world, cultivator.id, peer.id);
    const feud = grudgeArcOf(link?.grudge ?? 0);
    let sentence: string;
    if (feud) {
      sentence = `${cultivator.name}在${band.name}和${peer.name}说了两句。话没热，剑拔弩张。`;
      recordLife(cultivator, { tick: world.tick, kind: "relationship", text: sentence, names: [peer.name] });
      recordLife(peer, { tick: world.tick, kind: "relationship", text: sentence, names: [cultivator.name] });
    } else {
      const { linkAB } = addMutualAffinity(world, cultivator.id, peer.id, 3);
      sentence = `${cultivator.name}在${band.name}和${peer.name}攀谈了两句。${affinityCloserPhrase(getAffinityLevel(linkAB.affinity))}。`;
    }
    rememberBahuangLine(world, cultivator, "八荒里的见闻", sentence);
    rememberBahuangLine(world, peer, "八荒里的见闻", sentence);
    return sentence;
  }

  if (optionId !== "cross-hands") {
    throw new GameplayRejection("这个选择不在当前岔路上。");
  }

  progress.pendingWakeNodeIndex = null;
  progress.pendingWakeNodeDeadlineTick = null;
  progress.resolvedWakeNodeCount += 1;
  if (!peer) {
    rememberBahuangLine(world, cultivator, "八荒里的见闻", gone);
    return gone;
  }

  const battle = runCultivatorSkillDuel({
    left: cultivator,
    right: peer,
    seed: `${world.tick}:${cultivator.id}:${peer.id}:bahuang-meeting`,
    maxRounds: 7,
  });
  const rightSnap = buildCultivatorCombatSnapshot(peer, true);
  const rightEnd = battle.finalHp[peer.id] ?? rightSnap.maxHp;
  const rightRatio = Math.max(0, (rightSnap.maxHp - rightEnd) / Math.max(1, rightSnap.maxHp));
  wearFromFight(cultivator, battle.leaderHpLostRatio);
  wearFromFight(peer, rightRatio);
  for (const entry of battle.practice) {
    const person = world.cultivators[entry.id];
    if (person) grantCombatPractice(person, entry.skillIds, 1);
  }

  const leftBefore = cultivator.spiritStones;
  const rightBefore = peer.spiritStones;
  let leftResult: "win" | "loss" | "draw" | "retreat" = "draw";
  let rightResult: "win" | "loss" | "draw" | "retreat" = "draw";
  if (battle.outcome === "win") {
    cultivator.spiritStones += 36;
    peer.spiritStones = Math.max(0, peer.spiritStones - 18);
    leftResult = "win";
    rightResult = "loss";
  } else if (battle.outcome === "loss") {
    cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 24);
    peer.spiritStones += 30;
    leftResult = "loss";
    rightResult = "win";
  } else if (battle.outcome === "withdraw") {
    if (battle.retreatingSide === "enemy") {
      cultivator.spiritStones += 24;
      peer.spiritStones = Math.max(0, peer.spiritStones - 12);
      leftResult = "win";
      rightResult = "retreat";
    } else {
      cultivator.spiritStones = Math.max(0, cultivator.spiritStones - 18);
      peer.spiritStones += 12;
      leftResult = "retreat";
      rightResult = "win";
    }
  }
  const purse = (name: string, before: number, after: number) => {
    const delta = after - before;
    if (delta > 0) return `${name}收下${delta}枚灵石`;
    if (delta < 0) return `${name}落下${-delta}枚灵石`;
    return `${name}灵石没动`;
  };
  const verdict = battle.outcome === "win"
    ? `${cultivator.name}在${band.name}赢了${peer.name}`
    : battle.outcome === "loss"
      ? `${cultivator.name}在${band.name}输给了${peer.name}`
      : battle.outcome === "withdraw"
        ? `${battle.retreatingSide === "enemy" ? peer.name : cultivator.name}从${band.name}这一场里撤了`
        : `${cultivator.name}和${peer.name}在${band.name}打成平手`;
  const skillLine = fightDigestText(battle.summary) ?? battle.summary.beats[0] ?? "";
  const sentence = `${verdict}。${skillLine}${purse(cultivator.name, leftBefore, cultivator.spiritStones)}。${purse(peer.name, rightBefore, peer.spiritStones)}。`;
  const leftWon = leftResult === "win";
  writeMeetingCombat(world, cultivator, peer, battle, sentence, leftWon);
  writeMeetingCombat(world, peer, cultivator, battle, sentence, rightResult === "win");
  addMutualGrudge(world, cultivator.id, peer.id, battle.outcome === "draw" ? GRUDGE_FROM_DRAW : GRUDGE_FROM_DUEL);
  addMutualAffinity(world, cultivator.id, peer.id, AFFINITY_GAINS.pvpDuel);
  shiftCultivatorMood(world, cultivator, moodCauseForDuel(leftResult));
  shiftCultivatorMood(world, peer, moodCauseForDuel(rightResult));
  recordLife(cultivator, { tick: world.tick, kind: "fight", text: sentence, names: [peer.name] });
  recordLife(peer, { tick: world.tick, kind: "fight", text: sentence, names: [cultivator.name] });
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "person",
    title: "八荒里的交手",
    detail: sentence,
    locationId: cultivator.locationId,
    mood: "这一架会记住",
  }));
  pushTravelNote(peer, travelNote({
    tick: world.tick,
    kind: "person",
    title: "八荒里的交手",
    detail: sentence,
    locationId: peer.locationId,
    mood: "这一架会记住",
  }));
  rememberMet(progress, peer.id);
  const peerRun = world.bahuangProgress[peer.id];
  if (peerRun) rememberMet(peerRun, cultivator.id);
  closePeerMeeting(world, cultivator, peer);
  return sentence;
}

export function resolveBahuangWakeDecision(
  world: WorldState,
  cultivator: Cultivator,
  optionId: string,
): string {
  const progress = world.bahuangProgress[cultivator.id];
  if (!progress || progress.status !== "active") {
    throw new GameplayRejection("眼前没有在走的八荒。");
  }
  if (progress.pendingWakeNodeIndex === null) {
    throw new GameplayRejection("眼前没有待决的岔路。");
  }
  const wakeNode = progress.encounteredWakeNodes[progress.pendingWakeNodeIndex];
  if (!wakeNode) {
    throw new GameplayRejection("这处岔路已经不在了。");
  }
  const option = wakeNode.options.find((o) => o.optionId === optionId);
  if (!option) {
    throw new GameplayRejection("这个选择不在当前岔路上。");
  }

  if (wakeNode.sceneKind === "meeting") {
    return resolveBahuangMeeting(world, cultivator, progress, wakeNode, optionId);
  }

  const sceneEffect = bahuangOptionEffect(optionId);
  if (sceneEffect) {
    if (sceneEffect.kind === "retreat") {
      const leaving = `${cultivator.name}在八荒里选了「${option.label}」。${option.description}`;
      rememberBahuangLine(world, cultivator, "八荒里的抉择", leaving);
      retreatFromBahuang(world, cultivator, "emergency-wake-retreat");
      return leaving;
    }
    applySceneEffect(cultivator, progress, sceneEffect);
    return closeBahuangWake(world, cultivator, progress, option);
  }

  // Older saves can still be holding one of the first six wakes.
  if (optionId === "continue-deeper") {
    progress.pressure = Math.max(0, progress.pressure - 2);
  } else if (optionId === "bank-now") {
    cultivator.spiritStones += Math.floor(progress.rewards.spiritStones * 0.1);
  } else if (optionId === "spend-rare-supply") {
    if (progress.supplies.talismans > 0) {
      progress.supplies.talismans -= 1;
      const bonusStones = 40 + (hashString(`${cultivator.id}:${world.tick}:wake-cache`) % 60);
      progress.rewards.spiritStones += bonusStones;
      cultivator.spiritStones += bonusStones;
    }
  } else if (optionId === "scout-pocket") {
    const found = 8;
    progress.pressure += 1;
    progress.rewards.spiritStones += found;
    cultivator.spiritStones += found;
  } else if (optionId === "drop-ration") {
    if (progress.supplies.rations > 0) {
      progress.supplies.rations -= 1;
      progress.pressure = Math.max(0, progress.pressure - 3);
    }
  } else if (optionId === "crack-cache") {
    if (cultivator.spiritStones >= 8) {
      cultivator.spiritStones -= 8;
      const found = 12;
      progress.rewards.spiritStones += found;
      cultivator.spiritStones += found;
    }
  } else if (optionId === "leave-mark" || optionId === "wait-dust") {
    progress.pressure = Math.max(0, progress.pressure - 1);
  } else if (optionId === "lamp-edge") {
    progress.pressure += 1;
    progress.rewards.spiritStones += 6;
    cultivator.spiritStones += 6;
  } else if (optionId === "slow-step") {
    progress.pressure = Math.max(0, progress.pressure - 2);
  } else if (optionId === "detour-hazard") {
    progress.pressure += 3;
    const bonusProgress = 5 + (hashString(`${cultivator.id}:${world.tick}:wake-detour`) % 8);
    progress.rewards.realmProgress += bonusProgress;
    cultivator.realmProgress = Math.min(100, cultivator.realmProgress + bonusProgress);
  } else if (optionId === "smooth-trace" || optionId === "leave-camp") {
    progress.pressure = Math.max(0, progress.pressure - 1);
  } else if (optionId === "mark-trace") {
    progress.rewards.spiritStones += 2;
    cultivator.spiritStones += 2;
  } else if (optionId === "follow-trace") {
    progress.pressure += 1;
    progress.rewards.spiritStones += 6;
    cultivator.spiritStones += 6;
  } else if (optionId === "chase-trace" || optionId === "rake-camp") {
    progress.pressure += 2;
    progress.rewards.spiritStones += 8;
    cultivator.spiritStones += 8;
  } else if (optionId === "warm-camp") {
    progress.pressure = Math.max(0, progress.pressure - 2);
  } else if (optionId === "read-camp") {
    progress.rewards.spiritStones += 4;
    cultivator.spiritStones += 4;
  } else if (optionId === "emergency-retreat") {
    const sentence = `${cultivator.name}在八荒里选了「${option.label}」。${option.description}`;
    rememberBahuangLine(world, cultivator, "八荒里的抉择", sentence);
    retreatFromBahuang(world, cultivator, "emergency-wake-retreat");
    return sentence;
  }

  progress.pendingWakeNodeIndex = null;
  progress.pendingWakeNodeDeadlineTick = null;
  progress.resolvedWakeNodeCount += 1;

  const sentence = `${cultivator.name}在八荒里选了「${option.label}」。${option.description}`;
  rememberBahuangLine(world, cultivator, "八荒里的抉择", sentence);
  return sentence;
}
