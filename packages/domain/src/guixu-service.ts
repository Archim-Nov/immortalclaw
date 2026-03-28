import type {
  ActionJob,
  Cultivator,
  GuixuNode,
  GuixuProgress,
  WorldEvent,
  WorldState,
} from "./model.js";
import { getGuixuEventDefinition } from "./guixu-events.js";

const REALM_ORDER: Record<string, number> = {
  "鐐兼皵": 0,
  "炼气": 0,
  "绛戝熀": 1,
  "筑基": 1,
  "閲戜腹": 2,
  "金丹": 2,
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
  if (isGuixuNodeUnlockedForCultivator(world, cultivator.id, node.nodeId)) {
    return { allowed: false, reason: "Guixu node already unlocked." };
  }

  const currentRealmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredRealmScore = (REALM_ORDER[node.unlockRequirement.minRealm] ?? 0) * 10 + 1;
  if (currentRealmScore < requiredRealmScore) {
    return { allowed: false, reason: "Realm requirement not met." };
  }

  const attunement = world.guixuProgress.wildernessAttunement[cultivator.id] ?? 0;
  if (attunement < node.unlockRequirement.wildernessProgress) {
    return { allowed: false, reason: "More wilderness attunement is required." };
  }

  return { allowed: true };
}

export function unlockGuixuNode(
  world: WorldState,
  cultivator: Cultivator,
  nodeId: string,
): GuixuNode {
  const node = getGuixuNodeById(world, nodeId);
  if (!node) {
    throw new Error(`Guixu node not found: ${nodeId}`);
  }

  const unlockCheck = canUnlockGuixuNode(world, cultivator, node);
  if (!unlockCheck.allowed) {
    throw new Error(unlockCheck.reason ?? "Cannot unlock Guixu node.");
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

  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: "Guixu Node Unlocked",
    content: `${cultivator.name} unlocked ${node.name}.`,
    severity: node.sharedProgress ? "high" : "medium",
    tags: node.sharedProgress ? ["guixu", "unlock", "shared-progress"] : ["guixu", "unlock"],
  });

  return node;
}

export function pickGuixuEventId(node: GuixuNode, seed: string): string {
  const pool = node.eventPool.length > 0 ? node.eventPool : ["guixu-threshold-vision"];
  return pool[hashString(seed) % pool.length] ?? pool[0]!;
}

export function resolveGuixuExploration(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
): string {
  const nodeId = job.meta?.guixuNodeId;
  if (!nodeId) {
    throw new Error("Guixu exploration requires a target node.");
  }

  const node = getGuixuNodeById(world, nodeId);
  if (!node) {
    throw new Error(`Guixu node not found: ${nodeId}`);
  }
  if (!isGuixuNodeUnlockedForCultivator(world, cultivator.id, nodeId)) {
    throw new Error(`Guixu node not unlocked: ${nodeId}`);
  }

  const eventId = job.meta?.guixuEventId ?? pickGuixuEventId(node, `${world.tick}:${cultivator.id}:${job.id}:guixu`);
  const eventDefinition = getGuixuEventDefinition(eventId);
  if (!eventDefinition) {
    throw new Error(`Unknown Guixu event: ${eventId}`);
  }

  cultivator.spiritStones += eventDefinition.spiritStoneReward ?? 0;
  cultivator.realmProgress = Math.max(
    0,
    Math.min(100, cultivator.realmProgress + (eventDefinition.realmProgressReward ?? 0)),
  );
  for (const [itemId, count] of Object.entries(eventDefinition.rewards ?? {})) {
    cultivator.inventory[itemId as keyof Cultivator["inventory"]] += count ?? 0;
  }
  world.guixuProgress.lastResolvedEventIds[cultivator.id] = eventId;

  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: eventDefinition.title,
    content: eventDefinition.content,
    severity: eventDefinition.severity,
    tags: eventDefinition.tags,
  });

  return `${cultivator.name} ${eventDefinition.summary}.`;
}
