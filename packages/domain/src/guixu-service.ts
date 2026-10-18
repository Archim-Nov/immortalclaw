import type {
  ActionJob,
  AvailableAction,
  Cultivator,
  GuixuNode,
  GuixuNodeCard,
  GuixuProgress,
  GuixuRunView,
  ItemId,
  WorldEvent,
  WorldState,
} from "./model.js";
import { eventPoolForNode, getGuixuEventDefinition } from "./guixu-events.js";
import type { GuixuEventDefinition } from "./guixu-events.js";
import { GameplayRejection } from "./gameplay-error.js";
import { recordLife } from "./inner-life.js";
import {
  GUIXU_CHOICE_TICKS,
  GUIXU_FACING,
  guixuNodeName,
  guixuOption,
  guixuScenes,
  guixuTierLabel,
  guixuTypeLabel,
  guixuWakeCap,
  nextAmbientLine,
  realmGateLabel,
} from "./guixu-scenes.js";
import type { GuixuChoiceOption } from "./guixu-scenes.js";
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

const ITEM_FACING: Partial<Record<ItemId, { unit: string; name: string }>> = {
  "ancient-artifact": { unit: "件", name: "上古遗宝" },
  "legendary-artifact": { unit: "件", name: "传说遗宝" },
  "ruin-fragment": { unit: "块", name: "残碑碎片" },
};

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function addWorldEvent(
  world: WorldState,
  event: Omit<WorldEvent, "id" | "tick">,
): WorldEvent {
  const stored = {
    id: `event-${world.nextEventSequence++}`,
    tick: world.tick,
    ...event,
  };
  world.worldEvents.unshift(stored);
  return stored;
}

function ensurePersonalUnlockList(progress: GuixuProgress, cultivatorId: string): string[] {
  if (!Array.isArray(progress.personalUnlockedNodeIds[cultivatorId])) {
    progress.personalUnlockedNodeIds[cultivatorId] = [];
  }
  return progress.personalUnlockedNodeIds[cultivatorId]!;
}

function chineseCount(count: number): string {
  if (count === 1) return "一";
  if (count === 2) return "两";
  return String(count);
}

function writeGuixuNote(world: WorldState, cultivator: Cultivator, title: string, detail: string): void {
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

function applyChoice(cultivator: Cultivator, option: GuixuChoiceOption): void {
  cultivator.spiritStones += option.stones ?? 0;
  if (option.realmProgress) {
    cultivator.realmProgress = Math.max(0, Math.min(100, cultivator.realmProgress + option.realmProgress));
  }
  if (option.qiCost) {
    cultivator.qi = Math.max(1, cultivator.qi - option.qiCost);
  }
  if (option.injuryTicks) {
    cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, option.injuryTicks);
  }
  for (const [itemId, count] of Object.entries(option.rewards ?? {})) {
    if (!count) continue;
    cultivator.inventory[itemId as ItemId] += count;
  }
}

function clearWake(job: ActionJob, ambientDue: boolean): void {
  const meta = { ...(job.meta ?? {}) };
  delete meta.guixuWake;
  if (ambientDue) meta.guixuAmbientDue = true;
  job.meta = meta;
}

function haulSentence(event: GuixuEventDefinition, progressAdded: number, progressWanted: number): string {
  const pieces: string[] = [];
  const stones = event.spiritStoneReward ?? 0;
  if (stones > 0) pieces.push(`${stones}枚灵石`);
  for (const [itemId, count] of Object.entries(event.rewards ?? {})) {
    if (!count) continue;
    const facing = ITEM_FACING[itemId as ItemId];
    if (!facing) continue;
    pieces.push(`${chineseCount(count)}${facing.unit}${facing.name}`);
  }
  const haul = pieces.length > 0 ? `带出何物：${pieces.join("，")}。` : "这一趟没有另带东西。";
  if (progressAdded > 0) return `${haul}修为涨了${progressAdded}。`;
  if (progressWanted > 0) return `${haul}修为已经满了，再涨要等破境。`;
  return haul;
}

export function recordWildernessAttunement(world: WorldState, cultivatorId: string, amount = 1): number {
  const nextValue = Math.max(0, (world.guixuProgress.wildernessAttunement[cultivatorId] ?? 0) + amount);
  world.guixuProgress.wildernessAttunement[cultivatorId] = nextValue;
  return nextValue;
}

export function getGuixuNodeById(world: WorldState, nodeId: string): GuixuNode | null {
  return world.guixuNodes[nodeId] ?? null;
}

export function listGuixuNodesForLocation(world: WorldState, locationId: string): GuixuNode[] {
  return Object.values(world.guixuNodes).filter((node) => node.anchorLocationId === locationId);
}

export function getCultivatorUnlockedGuixuNodeIds(world: WorldState, cultivatorId: string): string[] {
  const personal = world.guixuProgress.personalUnlockedNodeIds[cultivatorId] ?? [];
  const merged = new Set([...personal, ...world.guixuProgress.sharedUnlockedNodeIds]);
  return [...merged];
}

export function isGuixuNodeUnlockedForCultivator(
  world: WorldState,
  cultivatorId: string,
  nodeId: string,
): boolean {
  return getCultivatorUnlockedGuixuNodeIds(world, cultivatorId).includes(nodeId);
}

export function canUnlockGuixuNode(
  world: WorldState,
  cultivator: Cultivator,
  node: GuixuNode,
): { allowed: boolean; reason?: string } {
  const name = guixuNodeName(node);
  if (isGuixuNodeUnlockedForCultivator(world, cultivator.id, node.nodeId)) {
    return { allowed: false, reason: "这一处已经开过了。" };
  }

  const currentRealmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredRealmScore = (REALM_ORDER[node.unlockRequirement.minRealm] ?? 0) * 10 + 1;
  if (currentRealmScore < requiredRealmScore) {
    return { allowed: false, reason: `境界还不够。${name}要到${realmGateLabel(node.unlockRequirement.minRealm)}才应。` };
  }

  const attunement = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;
  if (attunement < node.unlockRequirement.wildernessProgress) {
    return {
      allowed: false,
      reason: `仙缘还不够。${name}要仙缘${node.unlockRequirement.wildernessProgress}，你眼下是${attunement}。`,
    };
  }

  return { allowed: true };
}

export function guixuUnlockSentence(cultivator: Cultivator, node: GuixuNode): string {
  const name = guixuNodeName(node);
  if (node.sharedProgress) {
    return `${cultivator.name}把${name}打开了。这一处是共用的，旁人也能进去。`;
  }
  return `${cultivator.name}把${name}打开了。这一处只记在自己名下。`;
}

export function unlockGuixuNode(
  world: WorldState,
  cultivator: Cultivator,
  nodeId: string,
): GuixuNode {
  const node = getGuixuNodeById(world, nodeId);
  if (!node) {
    throw new GameplayRejection("没有这一处归虚。");
  }

  const unlockCheck = canUnlockGuixuNode(world, cultivator, node);
  if (!unlockCheck.allowed) {
    throw new GameplayRejection(unlockCheck.reason ?? "这一处现在打不开。");
  }

  if (node.sharedProgress) {
    if (!world.guixuProgress.sharedUnlockedNodeIds.includes(node.nodeId)) {
      world.guixuProgress.sharedUnlockedNodeIds.push(node.nodeId);
    }
  } else {
    const unlockedNodes = ensurePersonalUnlockList(world.guixuProgress, cultivator.id);
    if (!unlockedNodes.includes(node.nodeId)) {
      unlockedNodes.push(node.nodeId);
    }
  }

  const sentence = guixuUnlockSentence(cultivator, node);
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "归虚开了一处",
    content: sentence,
    severity: node.sharedProgress ? "high" : "medium",
    tags: node.sharedProgress ? ["guixu", "unlock", "shared-progress"] : ["guixu", "unlock"],
  });
  writeGuixuNote(world, cultivator, "归虚", sentence);

  return node;
}

export function pickGuixuEventId(node: GuixuNode, seed: string): string {
  const pool = eventPoolForNode(node.nodeId, node.eventPool);
  return pool[hashString(seed) % pool.length] ?? pool[0]!;
}

export function resolveGuixuExploration(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
): string {
  const nodeId = job.meta?.guixuNodeId;
  if (!nodeId) {
    throw new GameplayRejection("这一趟归虚没有对上入口。");
  }

  const node = getGuixuNodeById(world, nodeId);
  if (!node) {
    throw new GameplayRejection("没有这一处归虚。");
  }
  if (!isGuixuNodeUnlockedForCultivator(world, cultivator.id, nodeId)) {
    throw new GameplayRejection("这一处还没打开。");
  }

  const eventId = job.meta?.guixuEventId ?? pickGuixuEventId(node, `${world.tick}:${cultivator.id}:${job.id}:guixu`);
  const eventDefinition = getGuixuEventDefinition(eventId);
  if (!eventDefinition) {
    throw new GameplayRejection("这一处归虚没有对上的收尾。");
  }

  const progressBefore = cultivator.realmProgress;
  const progressWanted = eventDefinition.realmProgressReward ?? 0;
  cultivator.spiritStones += eventDefinition.spiritStoneReward ?? 0;
  cultivator.realmProgress = Math.max(0, Math.min(100, progressBefore + progressWanted));
  for (const [itemId, count] of Object.entries(eventDefinition.rewards ?? {})) {
    if (!count) continue;
    cultivator.inventory[itemId as ItemId] += count;
  }
  world.guixuProgress.lastResolvedEventIds[cultivator.id] = eventId;

  if (!cultivator.guixuCompletedNodeIds) cultivator.guixuCompletedNodeIds = [];
  if (!cultivator.guixuCompletedNodeIds.includes(nodeId)) {
    cultivator.guixuCompletedNodeIds.push(nodeId);
  }

  const name = guixuNodeName(node);
  const haul = haulSentence(eventDefinition, cultivator.realmProgress - progressBefore, progressWanted);
  const summary = `${cultivator.name}在${name}里把这一趟走完了。${eventDefinition.content}${haul}`;
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: eventDefinition.title,
    content: `${eventDefinition.content}${haul}`,
    severity: eventDefinition.severity,
    tags: eventDefinition.tags,
  });
  writeGuixuNote(world, cultivator, "归虚", summary);

  return summary;
}

function rememberLine(job: ActionJob, line: string): void {
  const seen = job.meta?.guixuSeenLines ?? [];
  if (seen.includes(line)) return;
  job.meta = { ...(job.meta ?? {}), guixuSeenLines: [...seen, line] };
}

function openWake(world: WorldState, cultivator: Cultivator, job: ActionJob, node: GuixuNode): void {
  const opened = job.meta?.guixuWakesOpened ?? 0;
  const scene = guixuScenes(node.nodeId)[opened];
  if (!scene) return;
  job.meta = {
    ...(job.meta ?? {}),
    guixuWakesOpened: opened + 1,
    guixuWake: {
      sceneId: scene.sceneId,
      context: scene.context,
      deadlineTick: world.tick + GUIXU_CHOICE_TICKS,
      options: scene.options.map((option) => ({
        optionId: option.optionId,
        label: option.label,
        description: option.description,
      })),
    },
  };
  job.remainingTicks += 1;
  rememberLine(job, scene.context);
  writeGuixuNote(world, cultivator, "归虚", `见闻：${scene.context}`);
}

function writeAmbient(world: WorldState, cultivator: Cultivator, job: ActionJob, node: GuixuNode): void {
  if (!job.meta?.guixuAmbientDue || job.remainingTicks <= 0) return;
  const line = nextAmbientLine(node.nodeId, job.meta.guixuSeenLines ?? []);
  const meta = { ...(job.meta ?? {}) };
  meta.guixuAmbientDue = false;
  job.meta = meta;
  if (!line) return;
  rememberLine(job, line);
  writeGuixuNote(world, cultivator, "归虚", `见闻：${line}`);
}

function timeoutWake(world: WorldState, cultivator: Cultivator, job: ActionJob, node: GuixuNode): void {
  const sentence = `时辰到了，${guixuNodeName(node)}这一处没选。`;
  clearWake(job, true);
  writeGuixuNote(world, cultivator, "归虚", sentence);
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "时辰到了",
    content: sentence,
    severity: "low",
    tags: ["guixu", "timeout"],
  });
}

export function holdGuixuExploration(world: WorldState, job: ActionJob): void {
  if (!String(job.actionId).startsWith("explore-guixu:")) return;
  const cultivator = world.cultivators[job.cultivatorId];
  if (!cultivator) return;
  const nodeId = job.meta?.guixuNodeId;
  if (!nodeId) return;
  const node = getGuixuNodeById(world, nodeId);
  if (!node) return;

  const pending = job.meta?.guixuWake;
  if (pending) {
    if (world.tick < pending.deadlineTick) {
      job.remainingTicks += 1;
      return;
    }
    timeoutWake(world, cultivator, job, node);
    return;
  }

  if (job.remainingTicks <= 0) return;
  const opened = job.meta?.guixuWakesOpened ?? 0;
  const cap = guixuWakeCap(node.nodeId, job.totalTicks);
  const spent = job.totalTicks - job.remainingTicks;
  const due = opened < cap && (
    (opened === 0 && spent >= 1)
    || (opened >= 1 && job.remainingTicks <= 1 && spent >= 2)
  );
  if (due) {
    openWake(world, cultivator, job, node);
    return;
  }
  writeAmbient(world, cultivator, job, node);
}

export function listGuixuChoiceActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  const wake = job?.meta?.guixuWake;
  if (!wake) return [];
  return wake.options.map((option) => ({
    actionId: `guixu-choice:${option.optionId}` as AvailableAction["actionId"],
    label: `归虚抉择：${option.label}`,
    description: `${wake.context}${option.description}`,
    durationTicks: 0,
    kind: "immediate" as const,
  }));
}

export function answerGuixuChoice(world: WorldState, cultivator: Cultivator, optionId: string): string {
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  const wake = job?.meta?.guixuWake;
  if (!job || !wake) throw new GameplayRejection("归虚里没有待决的岔路。");
  if (!wake.options.some((option) => option.optionId === optionId)) {
    throw new GameplayRejection("这个选择不在当前岔路上。");
  }
  const option = guixuOption(wake.sceneId, optionId);
  if (!option) throw new GameplayRejection("这个选择不在当前岔路上。");
  applyChoice(cultivator, option);
  const nodeId = job.meta?.guixuNodeId;
  const node = nodeId ? getGuixuNodeById(world, nodeId) : null;
  const name = node ? guixuNodeName(node) : "归虚";
  const summary = `${cultivator.name}在${name}里${option.label}。${option.line}`;
  clearWake(job, true);
  writeGuixuNote(world, cultivator, "归虚岔路", `见闻：${option.line}`);
  return summary;
}

export function guixuPlaceLine(world: WorldState, cultivator: Cultivator): string {
  const here = listGuixuNodesForLocation(world, cultivator.locationId);
  if (here.length > 0) return "人在归虚门口。仙缘够了，境界也够了，才能把这一处打开。";
  return "归虚的门口在青州甲级地宫。人要站在那里，仙缘和境界都够，才能打开。";
}

export function guixuNodeCards(world: WorldState, cultivator: Cultivator): GuixuNodeCard[] {
  return listGuixuNodesForLocation(world, cultivator.locationId).map((node) => {
    const facing = GUIXU_FACING[node.nodeId];
    const unlocked = isGuixuNodeUnlockedForCultivator(world, cultivator.id, node.nodeId);
    const lock = unlocked ? null : canUnlockGuixuNode(world, cultivator, node);
    return {
      nodeId: node.nodeId,
      name: guixuNodeName(node),
      tier: facing?.tierLabel ?? guixuTierLabel(node.tier),
      nodeType: facing?.typeLabel ?? guixuTypeLabel(node.nodeType),
      shared: node.sharedProgress,
      unlocked,
      attunementNeeded: node.unlockRequirement.wildernessProgress,
      advice: facing?.advice ?? "这一处归虚要仙缘和境界都够了才进得去。",
      ...(lock && !lock.allowed && lock.reason ? { lockLine: lock.reason } : {}),
    };
  });
}

export function guixuRunView(world: WorldState, cultivator: Cultivator): GuixuRunView | null {
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  const wake = job?.meta?.guixuWake;
  const nodeId = job?.meta?.guixuNodeId;
  if (!wake || !nodeId) return null;
  const node = getGuixuNodeById(world, nodeId);
  return {
    nodeId,
    nodeName: node ? guixuNodeName(node) : "归虚",
    decisionLine: "归虚岔路待决",
    context: wake.context,
    deadlineTick: wake.deadlineTick,
    options: wake.options.map((option) => ({ ...option })),
  };
}

export { guixuNodeName };
