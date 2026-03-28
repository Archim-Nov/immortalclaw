import type { DrawnEvent, EventSourceType, EventTemplate } from "../events.js";
import type { Cultivator, DungeonGrade, DungeonRank, EventEffect, StatusEffectId, WorldState } from "../model.js";

interface WeightedEvent {
  readonly template: EventTemplate;
  readonly weight: number;
}

interface DungeonEventContext {
  readonly grade: DungeonGrade;
  readonly rank: DungeonRank;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const REALM_ORDER: Record<Cultivator["realm"], number> = { 炼气: 0, 筑基: 1, 金丹: 2 };

const hashString = (input: string) =>
  Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;

const STATUS_META: Record<StatusEffectId, { name: string; description: string }> = {
  wounded: { name: "Wounded", description: "Risky actions are restricted." },
  poisoned: { name: "Poisoned", description: "Loses qi each tick." },
  "clear-mind": { name: "Clear Mind", description: "Better recovery and cultivation." },
  "qi-surge": { name: "Qi Surge", description: "Better combat and cultivation." },
  "fortune-marked": { name: "Fortune Marked", description: "Better ruins outcomes." },
  warded: { name: "Warded", description: "Lower combat risk." },
  deviation: { name: "Qi Deviation", description: "Cultivation becomes unstable and risky." },
  insight: { name: "Insight", description: "Short-term bonus to cultivation and combat." },
  "spirit-saturated": { name: "Spirit Saturated", description: "Short-term cultivation boost." },
};
const currentStateIdOf = (cultivator: Cultivator) => cultivator.locationId.split(":")[0] as keyof Cultivator["stateReputation"];

function addCurrentStateReputation(cultivator: Cultivator, delta: number) {
  const stateId = currentStateIdOf(cultivator);
  cultivator.stateReputation[stateId] = Math.max(0, (cultivator.stateReputation[stateId] ?? 0) + delta);
}

function meetsMinRealm(cultivator: Cultivator, minRealm: EventTemplate["minRealm"]) {
  if (!minRealm) {
    return true;
  }
  return REALM_ORDER[cultivator.realm] >= REALM_ORDER[minRealm];
}

function meetsDungeonContext(
  event: EventTemplate,
  dungeonContext?: DungeonEventContext,
) {
  const requiresDungeonContext =
    !!event.dungeonGrade
    || event.minDungeonRank !== null && event.minDungeonRank !== undefined
    || event.maxDungeonRank !== null && event.maxDungeonRank !== undefined;
  if (!requiresDungeonContext) {
    return true;
  }
  if (!dungeonContext) {
    return false;
  }
  if (event.dungeonGrade && event.dungeonGrade !== dungeonContext.grade) {
    return false;
  }
  if (event.minDungeonRank && dungeonContext.rank < event.minDungeonRank) {
    return false;
  }
  if (event.maxDungeonRank && dungeonContext.rank > event.maxDungeonRank) {
    return false;
  }
  return true;
}

function applyOverlayWeights(candidates: WeightedEvent[], cultivator: Cultivator): WeightedEvent[] {
  const dominantElement = cultivator.registrationRecord
    ? (Object.entries(cultivator.registrationRecord.result.five_element_scores)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
    : null;

  return candidates.map((entry) => {
    let weight = entry.weight;

    if (cultivator.injuryTicksRemaining > 0) {
      if (entry.template.resultType === "status") {
        weight *= 1.25;
      }
      if (entry.template.resultType === "combat") {
        weight *= 0.7;
      }
    }

    if (cultivator.sectId && entry.template.semanticType === "human") {
      weight *= 1.15;
    }

    if (dominantElement === "water" && entry.template.semanticType === "fortune") {
      weight *= 1.15;
    }
    if (dominantElement === "fire" && entry.template.semanticType === "training") {
      weight *= 1.12;
    }
    if (dominantElement === "earth" && entry.template.resultType === "resource") {
      weight *= 1.1;
    }

    return { template: entry.template, weight };
  });
}

function weightedPick(candidates: WeightedEvent[], seed: string): EventTemplate | null {
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((sum, entry) => sum + Math.max(entry.weight, 0), 0);
  if (totalWeight <= 0) {
    return null;
  }

  const roll = (hashString(seed) / 0xffffffff) * totalWeight;
  let cursor = 0;
  for (const candidate of candidates) {
    cursor += Math.max(candidate.weight, 0);
    if (roll <= cursor) {
      return candidate.template;
    }
  }

  return candidates[candidates.length - 1]?.template ?? null;
}

function candidatesFor(
  world: WorldState,
  source: EventSourceType,
  cultivator: Cultivator,
  locationId: string,
  dungeonContext?: DungeonEventContext,
): WeightedEvent[] {
  const location = world.locations[locationId];
  if (!location) {
    return [];
  }

  const pool = world.eventPools;
  const candidates: WeightedEvent[] = [];

  for (const event of pool.globalCommon) {
    if (event.source === source && meetsMinRealm(cultivator, event.minRealm) && meetsDungeonContext(event, dungeonContext)) {
      candidates.push({ template: event, weight: event.baseWeight });
    }
  }

  if (source === "travel") {
    for (const event of pool.travelPool) {
      if (meetsMinRealm(cultivator, event.minRealm) && meetsDungeonContext(event, dungeonContext)) {
        candidates.push({ template: event, weight: event.baseWeight });
      }
    }

    const stateTravelEvents = pool.travelStateSpecific[location.stateId] ?? [];
    for (const event of stateTravelEvents) {
      if (event.source === source && meetsMinRealm(cultivator, event.minRealm) && meetsDungeonContext(event, dungeonContext)) {
        candidates.push({ template: event, weight: event.baseWeight * 1.5 });
      }
    }

    return candidates;
  }

  const stateEvents = pool.stateSpecific[location.stateId] ?? [];
  for (const event of stateEvents) {
    if (event.source === source && meetsMinRealm(cultivator, event.minRealm) && meetsDungeonContext(event, dungeonContext)) {
      candidates.push({ template: event, weight: event.baseWeight * 1.5 });
    }
  }

  const nodeEvents = pool.nodeSpecific[locationId] ?? [];
  for (const event of nodeEvents) {
    if (event.source === source && meetsMinRealm(cultivator, event.minRealm) && meetsDungeonContext(event, dungeonContext)) {
      candidates.push({ template: event, weight: event.baseWeight * 2 });
    }
  }

  return candidates;
}

function nodeCandidatesFor(
  world: WorldState,
  cultivator: Cultivator,
  locationId: string,
  dungeonContext?: DungeonEventContext,
): WeightedEvent[] {
  const nodeEvents = world.eventPools.nodeSpecific[locationId] ?? [];
  return nodeEvents
    .filter((event) =>
      event.source === "exploration"
      && meetsMinRealm(cultivator, event.minRealm)
      && meetsDungeonContext(event, dungeonContext),
    )
    .map((event) => ({ template: event, weight: event.baseWeight }));
}

export function drawEvent(
  world: WorldState,
  source: EventSourceType,
  cultivator: Cultivator,
  locationId: string,
  seedInput?: string,
  dungeonContext?: DungeonEventContext,
): DrawnEvent | null {
  const baseCandidates = candidatesFor(world, source, cultivator, locationId, dungeonContext);
  const hasPendingMoralityChoice =
    cultivator.pendingMoralityChoiceId
    && world.pendingMoralityChoices[cultivator.pendingMoralityChoiceId]
    && world.tick < world.pendingMoralityChoices[cultivator.pendingMoralityChoiceId]!.expiresAtTick;
  const eligibleCandidates = hasPendingMoralityChoice
    ? baseCandidates.filter((entry) => !entry.template.moralityChoice)
    : baseCandidates;
  const weighted = applyOverlayWeights(eligibleCandidates, cultivator);
  const baseSeed = seedInput ?? `${world.tick}:${cultivator.id}:${source}:${locationId}`;
  const mainEvent = weightedPick(weighted, `${baseSeed}:main`);
  if (!mainEvent) {
    return null;
  }

  let subEvent: EventTemplate | null = null;
  if (mainEvent.resultType !== "combat" && !mainEvent.moralityChoice) {
    const subRoll = hashString(`${baseSeed}:sub-roll`) % 100;
    if (subRoll < 30) {
      const storyCandidates = weighted.filter(
        (entry) => entry.template.resultType === "story" && entry.template.id !== mainEvent.id,
      );
      subEvent = weightedPick(storyCandidates, `${baseSeed}:sub-pick`);
    }
  }

  return {
    template: mainEvent,
    subEvent,
    locationId,
    tick: world.tick,
  };
}

export function drawNodeSpecificEvent(
  world: WorldState,
  cultivator: Cultivator,
  locationId: string,
  seedInput?: string,
  dungeonContext?: DungeonEventContext,
): DrawnEvent | null {
  if (!world.locations[locationId]) {
    return null;
  }

  const baseCandidates = nodeCandidatesFor(world, cultivator, locationId, dungeonContext);
  if (baseCandidates.length === 0) {
    return null;
  }

  const weighted = applyOverlayWeights(baseCandidates, cultivator);
  const baseSeed = seedInput ?? `${world.tick}:${cultivator.id}:node:${locationId}`;
  const mainEvent = weightedPick(weighted, `${baseSeed}:node-main`);
  if (!mainEvent) {
    return null;
  }

  return {
    template: mainEvent,
    subEvent: null,
    locationId,
    tick: world.tick,
  };
}

function upsertStatusEffect(
  cultivator: Cultivator,
  effectId: StatusEffectId,
  ticks: number,
  source: string,
) {
  const existing = cultivator.statusEffects.find((effect) => effect.id === effectId);
  if (existing) {
    existing.remainingTicks = Math.max(existing.remainingTicks, ticks);
    existing.source = source;
    existing.intensity = Math.max(existing.intensity, 1);
    return;
  }

  cultivator.statusEffects.push({
    id: effectId,
    name: STATUS_META[effectId].name,
    description: STATUS_META[effectId].description,
    source,
    remainingTicks: ticks,
    intensity: 1,
  });
}

export function applyEventEffectBundle(
  cultivator: Cultivator,
  effects: EventEffect,
  source = "event",
): void {
  if (typeof effects.spiritStones === "number") {
    cultivator.spiritStones = Math.max(0, cultivator.spiritStones + effects.spiritStones);
  }
  if (typeof effects.qi === "number") {
    cultivator.qi = clamp(cultivator.qi + effects.qi, 1, cultivator.maxQi);
  }
  if (typeof effects.spiritualPower === "number") {
    cultivator.spiritualPower = clamp(
      cultivator.spiritualPower + effects.spiritualPower,
      0,
      cultivator.maxSpiritualPower,
    );
  }
  if (typeof effects.realmProgress === "number") {
    cultivator.realmProgress = clamp(cultivator.realmProgress + effects.realmProgress, 0, 100);
  }
  if (typeof effects.injuryTicksRemaining === "number") {
    cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, effects.injuryTicksRemaining);
  }
  if (typeof effects.injuryTicksDelta === "number") {
    cultivator.injuryTicksRemaining = Math.max(0, cultivator.injuryTicksRemaining + effects.injuryTicksDelta);
  }
  if (typeof effects.reputationChange === "number") {
    addCurrentStateReputation(cultivator, effects.reputationChange);
  }

  for (const reward of effects.itemRewards ?? []) {
    cultivator.inventory[reward.itemId] = (cultivator.inventory[reward.itemId] ?? 0) + reward.count;
  }
  for (const status of effects.statusEffects ?? []) {
    upsertStatusEffect(cultivator, status.effectId, status.ticks, source);
  }
}

export function applyEventEffects(cultivator: Cultivator, template: EventTemplate): void {
  applyEventEffectBundle(cultivator, template.effects, `event:${template.id}`);
}

export function eventSeverityOf(template: EventTemplate): "low" | "medium" | "high" {
  if (template.resultType === "combat") {
    return "high";
  }
  if (template.resultType === "status" || template.resultType === "progression") {
    return "medium";
  }
  return "low";
}
