import { bahuangRoomLine } from "./dungeon-interior.js";
import { recordWildernessAttunement } from "./guixu-service.js";
import { recordLife } from "./inner-life.js";
import { ITEM_CATALOG } from "./items/catalog.js";
import {
  bahuangBandForDepth,
  noteWild,
  pickWildLine,
  wildRouteFromBand,
} from "./wild-places.js";
import type {
  BahuangExpeditionProgress,
  BahuangExpeditionStateView,
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
}): WakeNode {
  return { ...input, timeoutTicks: WAKE_TIMEOUT_TICKS };
}

function bahuangWakeOf(kind: number, progress: BahuangExpeditionProgress, nodeId: string): WakeNode {
  if (kind === 0) {
    return finishBahuangWake({
      nodeId,
      sceneKind: "depth",
      context: "深处的压力突然重了一截。可以继续往下、先把收获收好、只探一处口袋，或者丢一份干粮换一段退路。",
      options: [
        { optionId: "continue-deeper", label: "继续往下", description: "压力会松一点，路还是往深处。" },
        { optionId: "bank-now", label: "先把收获收好", description: "把已经到手的灵石再稳一成。" },
        { optionId: "scout-pocket", label: "只探一处口袋", description: "不多走，只在手边摸一把。" },
        { optionId: "drop-ration", label: "丢一份干粮", description: "少一口粮，换压力退一截。" },
      ],
      defaultOptionId: progress.strategy.pushPreference === "push" ? "continue-deeper" : "bank-now",
    });
  }
  if (kind === 1) {
    return finishBahuangWake({
      nodeId,
      sceneKind: "cache",
      context: "荒尘里露出一只不稳的匣子。可以耗一张符撬开、绕开、用灵石硬砸，或者做个记号以后再来。",
      options: [
        { optionId: "spend-rare-supply", label: "耗一张符", description: "有符就换一把更厚的收获。" },
        { optionId: "skip-cache", label: "绕开匣子", description: "不耗补给，路还按原来的走。" },
        { optionId: "crack-cache", label: "用灵石砸开", description: "花一点灵石，匣子里未必比花掉的多多少。" },
        { optionId: "leave-mark", label: "做个记号", description: "先记下位置，人继续往前。" },
      ],
      defaultOptionId: progress.strategy.bias === "reward-first" ? "spend-rare-supply" : "skip-cache",
    });
  }
  if (kind === 2) {
    return finishBahuangWake({
      nodeId,
      sceneKind: "hazard",
      context: "前面是一条险廊，旁边有绕路。可以硬穿、走长路、贴着灯沿，或者等尘土落下再走。",
      options: [
        { optionId: "detour-hazard", label: "硬穿险廊", description: "压力升高，修为也会多一点。" },
        { optionId: "safe-route", label: "走长路", description: "绕开这一段，人稳一些。" },
        { optionId: "lamp-edge", label: "贴着灯沿走", description: "不快不慢，手边也许能摸到几枚灵石。" },
        { optionId: "wait-dust", label: "等尘土落下", description: "停一停，压力会退一点。" },
      ],
      defaultOptionId: progress.strategy.posture === "aggressive" ? "detour-hazard" : "safe-route",
    });
  }
  if (kind === 3) {
    return finishBahuangWake({
      nodeId,
      sceneKind: "retreat",
      context: "压力已经顶到该撤的地方。可以守住原来的走法、立刻撤出，或者把脚步放慢。",
      options: [
        { optionId: "hold-line", label: "守住原来的走法", description: "不改路线，按进八荒时定的姿态走。" },
        { optionId: "emergency-retreat", label: "立刻撤出", description: "这一趟到此为止，人先出去。" },
        { optionId: "slow-step", label: "把脚步放慢", description: "不撤，只是这一段走得轻一点。" },
      ],
      defaultOptionId: progress.strategy.pushPreference === "retreat" ? "emergency-retreat" : "hold-line",
    });
  }
  if (kind === 4) {
    return finishBahuangWake({
      nodeId,
      sceneKind: "trace",
      context: "尘上有一串还没被盖住的脚印。可以顺着走、把脚印抹平、在旁边加一个自己的记号，或者踩着脚印追。",
      options: [
        { optionId: "smooth-trace", label: "把脚印抹平", description: "后来的人少被这串脚印带偏。" },
        { optionId: "mark-trace", label: "在旁边做记号", description: "自己的记号留下，脚印不动。" },
        { optionId: "follow-trace", label: "顺着脚印走", description: "不追人，只沿着印子走一段。" },
        { optionId: "chase-trace", label: "踩着脚印追", description: "追得上也许有东西，尘也会扬起来。" },
      ],
      defaultOptionId: progress.strategy.bias === "reward-first" ? "chase-trace" : "smooth-trace",
    });
  }
  return finishBahuangWake({
    nodeId,
    sceneKind: "camp",
    context: "背风处有一堆灭掉的火。可以烤一会儿、把剩下的干柴留下、只看灰里有没有字，或者把灰翻开。",
    options: [
      { optionId: "warm-camp", label: "烤一会儿", description: "火已经灭了，余温还在。" },
      { optionId: "leave-camp", label: "把干柴留下", description: "自己不烤，留给后来的人。" },
      { optionId: "read-camp", label: "只看灰里的字", description: "有字就记下，灰不翻。" },
      { optionId: "rake-camp", label: "把灰翻开", description: "灰里可能有东西，尘也会扑到脸上。" },
    ],
    defaultOptionId: progress.strategy.posture === "aggressive" ? "rake-camp" : "warm-camp",
  });
}

export function previewBahuangWakes(progress: BahuangExpeditionProgress): WakeNode[] {
  return [0, 1, 2, 3, 4, 5].map((kind) => placeWake(progress, bahuangWakeOf(kind, progress, `bahuang-preview-${kind}`)));
}

function placeWake(progress: BahuangExpeditionProgress, node: WakeNode): WakeNode {
  const band = bahuangBandForDepth(progress.depth);
  if (node.context.startsWith(band.name)) return node;
  return { ...node, context: `${band.name}里。${node.context}` };
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
  const type = hashString(`${nodeId}:type`) % 6;
  return placeWake(progress, bahuangWakeOf(type, progress, nodeId));
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
    return { allowed: false, reason: "Current location does not connect to 八荒入口." };
  }

  const realmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredScore = (REALM_ORDER[EIGHT_WASTES_CONTENT.entryRequirement.minRealm] ?? 0) * 10 + 1;
  if (realmScore < requiredScore) {
    return { allowed: false, reason: "Realm requirement not met." };
  }
  if (cultivator.realmLevel < EIGHT_WASTES_CONTENT.entryRequirement.minRealmLevel) {
    return { allowed: false, reason: `需要境界等级 ≥ ${EIGHT_WASTES_CONTENT.entryRequirement.minRealmLevel}，当前 ${cultivator.realmLevel}。` };
  }
  const attunement = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;
  if (attunement < EIGHT_WASTES_CONTENT.entryRequirement.minWildernessAttunement) {
    return { allowed: false, reason: `需要荒野适性 ≥ ${EIGHT_WASTES_CONTENT.entryRequirement.minWildernessAttunement}，当前 ${attunement}。` };
  }
  if (cultivator.totalContribution < EIGHT_WASTES_CONTENT.entryRequirement.minContribution) {
    return { allowed: false, reason: "Sect contribution requirement not met." };
  }
  if ((cultivator.inventory[EIGHT_WASTES_CONTENT.entryRequirement.entryTicket] ?? 0) <= 0) {
    return { allowed: false, reason: "Entry ticket missing." };
  }
  const { entryWindowCycle, entryWindowDuration } = EIGHT_WASTES_CONTENT.entryRequirement;
  if (world.tick % entryWindowCycle >= entryWindowDuration) {
    const ticksUntilOpen = entryWindowCycle - (world.tick % entryWindowCycle);
    return { allowed: false, reason: `八荒入口目前关闭，将在 ${ticksUntilOpen} ticks 后开放。` };
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

  const gate = canEnterBahuang(cultivator, cultivator.locationId, world);
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

export function resolveBahuangWakeDecision(
  world: WorldState,
  cultivator: Cultivator,
  optionId: string,
): string {
  const progress = world.bahuangProgress[cultivator.id];
  if (!progress || progress.status !== "active") {
    throw new Error("No active bahuang expedition.");
  }
  if (progress.pendingWakeNodeIndex === null) {
    throw new Error("No pending wake node to resolve.");
  }
  const wakeNode = progress.encounteredWakeNodes[progress.pendingWakeNodeIndex];
  if (!wakeNode) {
    throw new Error("Wake node not found.");
  }
  const option = wakeNode.options.find((o) => o.optionId === optionId);
  if (!option) {
    throw new Error(`Invalid wake option: ${optionId}. Valid: ${wakeNode.options.map((o) => o.optionId).join(", ")}`);
  }

  // Apply option effects
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
