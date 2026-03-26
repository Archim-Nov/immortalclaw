import type { DrawnEvent, EventSourceType, EventTemplate } from "../events.js";
import type { Cultivator, StatusEffectId, WorldState } from "../model.js";

interface WeightedEvent {
  readonly template: EventTemplate;
  readonly weight: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
  locationId: string,
): WeightedEvent[] {
  const location = world.locations[locationId];
  if (!location) {
    return [];
  }

  const pool = world.eventPools;
  const candidates: WeightedEvent[] = [];

  for (const event of pool.globalCommon) {
    if (event.source === source) {
      candidates.push({ template: event, weight: event.baseWeight });
    }
  }

  if (source === "travel") {
    for (const event of pool.travelPool) {
      candidates.push({ template: event, weight: event.baseWeight });
    }
    return candidates;
  }

  const stateEvents = pool.stateSpecific[location.stateId] ?? [];
  for (const event of stateEvents) {
    if (event.source === source) {
      candidates.push({ template: event, weight: event.baseWeight * 1.5 });
    }
  }

  const nodeEvents = pool.nodeSpecific[locationId] ?? [];
  for (const event of nodeEvents) {
    if (event.source === source) {
      candidates.push({ template: event, weight: event.baseWeight * 2 });
    }
  }

  return candidates;
}

export function drawEvent(
  world: WorldState,
  source: EventSourceType,
  cultivator: Cultivator,
  locationId: string,
  seedInput?: string,
): DrawnEvent | null {
  const baseCandidates = candidatesFor(world, source, locationId);
  const weighted = applyOverlayWeights(baseCandidates, cultivator);
  const baseSeed = seedInput ?? `${world.tick}:${cultivator.id}:${source}:${locationId}`;
  const mainEvent = weightedPick(weighted, `${baseSeed}:main`);
  if (!mainEvent) {
    return null;
  }

  let subEvent: EventTemplate | null = null;
  if (mainEvent.resultType !== "combat") {
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

export function applyEventEffects(cultivator: Cultivator, template: EventTemplate): void {
  const effects = template.effects;

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
    cultivator.realmProgress = clamp(cultivator.realmProgress + effects.realmProgress, 0, 200);
  }
  if (typeof effects.injuryTicksRemaining === "number") {
    cultivator.injuryTicksRemaining = Math.max(cultivator.injuryTicksRemaining, effects.injuryTicksRemaining);
  }
  if (typeof effects.reputationChange === "number") {
    addCurrentStateReputation(cultivator, effects.reputationChange);
  }

  for (const reward of effects.itemRewards ?? []) {
    cultivator.inventory[reward.itemId] = (cultivator.inventory[reward.itemId] ?? 0) + reward.count;
  }
  for (const status of effects.statusEffects ?? []) {
    upsertStatusEffect(cultivator, status.effectId, status.ticks, `event:${template.id}`);
  }
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
