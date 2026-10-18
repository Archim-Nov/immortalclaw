import { maybeEightWastesPass } from "./eight-wastes-pass.js";
import { recordWildernessAttunement } from "./guixu-service.js";
import { pickLoadoutSourceDrop } from "./loadout-sourcing.js";
import { wildRoomLine } from "./dungeon-interior.js";
import { syncWildBeat } from "./wild-beats.js";
import {
  noteWild,
  pickWildLine,
  wildPlaceForState,
  wildSightingGap,
} from "./wild-places.js";
import type {
  ActionJob,
  Cultivator,
  ItemId,
  WildernessLayer,
  WildernessProgress,
  WorldEvent,
  WorldState,
} from "./model.js";
import { getWildernessEventDefinition } from "./wilderness-events.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

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

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function matrixKey(from: string, to: string): string {
  return `${from}|${to}`;
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

function nearestSafeLocationId(world: WorldState, fromLocationId: string): string {
  let bestLocationId = fromLocationId;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [locationId, location] of Object.entries(world.locations)) {
    if (location.kind !== "safe") {
      continue;
    }

    const distance = world.topology.distanceMatrix.get(matrixKey(fromLocationId, locationId));
    if (typeof distance === "number" && Number.isFinite(distance) && distance < bestDistance) {
      bestDistance = distance;
      bestLocationId = locationId;
    }
  }

  return bestLocationId;
}

function applyInventoryDelta(
  inventory: Record<ItemId, number>,
  delta: Partial<Record<ItemId, number>>,
  direction: 1 | -1,
): void {
  for (const [itemId, count] of Object.entries(delta) as Array<[ItemId, number]>) {
    inventory[itemId] = Math.max(0, (inventory[itemId] ?? 0) + count * direction);
  }
}

function pickRegionalReward(layer: WildernessLayer, seed: string): ItemId | null {
  if (layer.rewardTable.length === 0) {
    return null;
  }

  const roll = hashString(seed) % 100;
  const reward = layer.rewardTable.find((entry) => roll < entry.dropRate);
  return reward?.itemId ?? null;
}

export function getWildernessLayerById(world: WorldState, layerId: string): WildernessLayer | null {
  return world.wildernessLayers[layerId] ?? null;
}

export function getWildernessLayerForLocation(world: WorldState, locationId: string): WildernessLayer | null {
  return Object.values(world.wildernessLayers)
    .find((layer) => layer.locationIds.includes(locationId) && layer.status !== "prototype")
    ?? null;
}

export function getActiveWildernessProgress(world: WorldState, cultivatorId: string): WildernessProgress | null {
  const progress = world.wildernessProgress[cultivatorId];
  return progress?.status === "active" ? progress : null;
}

export function canEnterWilderness(
  cultivator: Cultivator,
  layer: WildernessLayer,
): { allowed: boolean; reason?: string } {
  const currentRealmScore = (REALM_ORDER[cultivator.realm] ?? 0) * 10 + cultivator.realmLevel;
  const requiredRealmScore = (REALM_ORDER[layer.entryRequirement.minRealm] ?? 0) * 10 + 1;
  if (currentRealmScore < requiredRealmScore) {
    return { allowed: false, reason: "Realm requirement not met." };
  }

  if (
    typeof layer.entryRequirement.minContribution === "number"
    && cultivator.totalContribution < layer.entryRequirement.minContribution
  ) {
    return { allowed: false, reason: "Sect contribution requirement not met." };
  }

  if (
    layer.entryRequirement.entryTicket
    && (cultivator.inventory[layer.entryRequirement.entryTicket] ?? 0) <= 0
  ) {
    return { allowed: false, reason: "Entry ticket missing." };
  }

  return { allowed: true };
}

export function enterWildernessExpedition(
  world: WorldState,
  cultivator: Cultivator,
  layerId: string,
): WildernessProgress {
  const layer = getWildernessLayerById(world, layerId);
  if (!layer) {
    throw new Error(`Wilderness layer not found: ${layerId}`);
  }
  if (!layer.locationIds.includes(cultivator.locationId)) {
    throw new Error("Current location does not connect to this wilderness layer.");
  }

  const gate = canEnterWilderness(cultivator, layer);
  if (!gate.allowed) {
    throw new Error(gate.reason ?? "Cannot enter wilderness.");
  }

  if (layer.entryRequirement.entryTicket) {
    cultivator.inventory[layer.entryRequirement.entryTicket] -= 1;
  }

  const progress: WildernessProgress = {
    cultivatorId: cultivator.id,
    layerId,
    enteredAtTick: world.tick,
    ticksSurvived: 0,
    remainingSurvivalTicks: layer.survivalPressure.maxSurvivalTicks,
    status: "active",
    lastEventId: null,
  };

  world.wildernessProgress[cultivator.id] = progress;
  const entered = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: entered ? `走进${entered.name}` : "Eight Wastes Entry",
    content: entered
      ? `${cultivator.name}走进${entered.name}。${entered.advice}`
      : `${cultivator.name} crossed into ${layer.name}.`,
    severity: "medium",
    tags: ["wilderness", "entry"],
  });
  if (entered) {
    noteWild(cultivator, {
      tick: world.tick,
      locationId: cultivator.locationId,
      title: `走进${entered.name}`,
      detail: entered.advice,
    });
  }

  return progress;
}

export function withdrawFromWilderness(
  world: WorldState,
  cultivator: Cultivator,
  reason: string,
): string | null {
  const progress = getActiveWildernessProgress(world, cultivator.id);
  if (!progress) {
    return null;
  }

  const layer = getWildernessLayerById(world, progress.layerId);
  if (!layer) {
    delete world.wildernessProgress[cultivator.id];
    return null;
  }

  cultivator.spiritStones = Math.max(0, cultivator.spiritStones - layer.retreatCost.spiritStoneLoss);
  applyInventoryDelta(cultivator.inventory, layer.retreatCost.itemLoss, -1);
  cultivator.realmProgress = Math.max(0, cultivator.realmProgress - layer.retreatCost.progressLoss * 5);
  cultivator.injuryTicksRemaining = Math.max(
    cultivator.injuryTicksRemaining,
    layer.survivalPressure.injuryTicksOnRetreat,
  );

  if (cultivator.activeJobId) {
    delete world.jobs[cultivator.activeJobId];
    cultivator.activeJobId = null;
  }

  const place = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  cultivator.locationId = nearestSafeLocationId(world, cultivator.locationId);
  progress.status = "withdrawn";
  delete world.wildernessProgress[cultivator.id];

  const sentence = place?.withdraw ?? `${cultivator.name} retreated from ${layer.name}.`;
  if (place) {
    noteWild(cultivator, {
      tick: world.tick,
      locationId: cultivator.locationId,
      title: `从${place.name}退出`,
      detail: sentence,
    });
  }
  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: place ? `从${place.name}退出` : "Wilderness Retreat",
    content: sentence,
    severity: "high",
    tags: ["wilderness", "retreat", reason],
  });

  return sentence;
}

export function applyWildernessPressure(world: WorldState, cultivator: Cultivator): string | null {
  const progress = getActiveWildernessProgress(world, cultivator.id);
  if (!progress) {
    return null;
  }

  const layer = getWildernessLayerById(world, progress.layerId);
  if (!layer) {
    delete world.wildernessProgress[cultivator.id];
    return null;
  }

  progress.ticksSurvived += 1;
  progress.remainingSurvivalTicks = Math.max(0, layer.survivalPressure.maxSurvivalTicks - progress.ticksSurvived);
  recordWildernessAttunement(world, cultivator.id, 1);
  const place = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  if (place) {
    const gap = wildSightingGap(`${cultivator.id}:wild-gap`);
    const last = progress.lastSightingAt ?? 0;
    if (progress.ticksSurvived - last >= gap) {
      progress.lastSightingAt = progress.ticksSurvived;
      const body = pickWildLine(place.sightings, `${cultivator.id}:${progress.ticksSurvived}:wild-sight`);
      noteWild(cultivator, {
        tick: world.tick,
        locationId: cultivator.locationId,
        title: "这一段见闻",
        detail: `${place.name}这一段的见闻：${body}`,
      });
    } else if (progress.ticksSurvived % 2 === 0) {
      noteWild(cultivator, {
        tick: world.tick,
        locationId: cultivator.locationId,
        title: "路上的一处",
        detail: wildRoomLine(place.name, `${cultivator.id}:${progress.ticksSurvived}:room`),
      });
    }
    if (progress.ticksSurvived > 0 && progress.ticksSurvived % 4 === 0) {
      maybeEightWastesPass({
        world,
        cultivator,
        source: "layer",
        seed: `${cultivator.id}:${progress.layerId}:${progress.ticksSurvived}:layer`,
        placeName: place.name,
        progress,
      });
    }
  }
  cultivator.qi = clamp(cultivator.qi - layer.survivalPressure.qiDamagePerTick, 0, cultivator.maxQi);
  cultivator.spiritualPower = clamp(
    cultivator.spiritualPower - layer.survivalPressure.spiritualDamagePerTick,
    0,
    cultivator.maxSpiritualPower,
  );

  if (syncWildBeat(progress, place, Boolean(cultivator.activeJobId))) {
    return null;
  }

  if (
    progress.ticksSurvived >= layer.survivalPressure.maxSurvivalTicks
    || cultivator.qi <= 0
    || cultivator.spiritualPower <= 0
  ) {
    return withdrawFromWilderness(world, cultivator, "timeout");
  }

  return null;
}

export function pickWildernessSurveyEventId(layer: WildernessLayer, seed: string): string {
  const pool = layer.eventPool.length > 0 ? layer.eventPool : ["wilderness-extreme-storm"];
  return pool[hashString(seed) % pool.length] ?? pool[0]!;
}

export function resolveWildernessSurvey(
  world: WorldState,
  cultivator: Cultivator,
  job: ActionJob,
): string {
  const progress = getActiveWildernessProgress(world, cultivator.id);
  if (!progress) {
    throw new Error("Survey wilderness requires an active wilderness expedition.");
  }

  const layer = getWildernessLayerById(world, progress.layerId);
  if (!layer) {
    throw new Error(`Wilderness layer not found: ${progress.layerId}`);
  }

  const eventId = job.meta?.wildernessEventId ?? pickWildernessSurveyEventId(layer, `${world.tick}:${job.id}`);
  const eventDefinition = getWildernessEventDefinition(eventId);
  if (!eventDefinition) {
    throw new Error(`Unknown wilderness event: ${eventId}`);
  }

  progress.lastEventId = eventId;
  cultivator.qi = clamp(cultivator.qi - (eventDefinition.qiDamage ?? 0), 1, cultivator.maxQi);
  cultivator.spiritualPower = clamp(
    cultivator.spiritualPower - (eventDefinition.spiritualDamage ?? 0),
    0,
    cultivator.maxSpiritualPower,
  );
  cultivator.spiritStones += eventDefinition.spiritStoneReward ?? 0;
  cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, eventDefinition.injuryTicks ?? 0);

  for (const [itemId, count] of Object.entries(eventDefinition.rewards ?? {})) {
    cultivator.inventory[itemId as keyof Cultivator["inventory"]] += count ?? 0;
  }

  const regionalReward = pickRegionalReward(layer, `${world.tick}:${cultivator.id}:${job.id}:regional`);
  if (regionalReward) {
    cultivator.inventory[regionalReward] += 1;
  }

  addWorldEvent(world, {
    cultivatorId: cultivator.id,
    locationId: cultivator.locationId,
    title: eventDefinition.title,
    content: eventDefinition.content,
    severity: eventDefinition.severity,
    tags: eventDefinition.tags,
  });

  const surveyed = wildPlaceForState(world.locations[cultivator.locationId]?.stateId);
  const alreadyTold = cultivator.travelNotes?.[0]?.tick === world.tick
    && (cultivator.travelNotes[0]?.title.includes("见闻") ?? false);
  if (surveyed && !alreadyTold) {
    const body = pickWildLine(surveyed.sightings, `${world.tick}:${cultivator.id}:${job.id}:survey-sight`);
    noteWild(cultivator, {
      tick: world.tick,
      locationId: cultivator.locationId,
      title: "这一段见闻",
      detail: `${surveyed.name}这一段的见闻：${body}`,
    });
  }

  const passLine = maybeEightWastesPass({
    world,
    cultivator,
    source: "survey",
    seed: `${world.tick}:${job.id}:survey`,
    placeName: surveyed?.name ?? "荒野",
    progress,
  });

  // ---- Loadout source drop (wilderness survey) ----
  if (layer.tier >= 1 && layer.tier <= 3) {
    const wsSourceDrop = pickLoadoutSourceDrop(layer.tier as 1 | 2 | 3, `${world.tick}:${cultivator.id}:${job.id}:wilderness-source`);
    cultivator.inventory[wsSourceDrop] = (cultivator.inventory[wsSourceDrop] ?? 0) + 1;
  }

  if (eventDefinition.forcedRetreat) {
    withdrawFromWilderness(world, cultivator, eventId);
  }

  if (surveyed) return passLine ? `${surveyed.name}这一段走完了。${passLine}` : `${surveyed.name}这一段走完了。`;
  return passLine ? `${cultivator.name}在这一层走了一段。${passLine}` : `${cultivator.name}在这一层走了一段。`;
}
