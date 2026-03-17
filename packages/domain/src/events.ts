import type {
  Cultivator,
  ItemId,
  Location,
  RealmStage,
  StatusEffectId,
  WorldState,
} from "./model.js";
import { STATE_IDS, type NodeType, type StateId } from "./constants.js";

export type EventSourceType = "exploration" | "travel";
export type EventSemanticType = "fortune" | "training" | "human";
export type EventResultType = "resource" | "progression" | "status" | "combat" | "story";
export type EventPoolLayer = "global-common" | "state-specific" | "node-specific" | "special-overlay";

export interface EventEffect {
  readonly spiritStones?: number;
  readonly qi?: number;
  readonly spiritualPower?: number;
  readonly realmProgress?: number;
  readonly injuryTicksRemaining?: number;
  readonly itemRewards?: ReadonlyArray<{ itemId: ItemId; count: number }>;
  readonly statusEffects?: ReadonlyArray<{ effectId: StatusEffectId; ticks: number }>;
  readonly karmaChange?: number;
  readonly reputationChange?: number;
}

export interface EventTemplate {
  readonly id: string;
  readonly layer: EventPoolLayer;
  readonly source: EventSourceType;
  readonly semanticType: EventSemanticType;
  readonly resultType: EventResultType;
  readonly name: string;
  readonly nameCn: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly stateId: StateId | null;
  readonly nodeType: NodeType | null;
  readonly minRealm: RealmStage | null;
  readonly effects: EventEffect;
}

export interface EventPools {
  readonly globalCommon: readonly EventTemplate[];
  readonly stateSpecific: Readonly<Record<StateId, readonly EventTemplate[]>>;
  readonly nodeSpecific: Readonly<Record<string, readonly EventTemplate[]>>;
  readonly travelPool: readonly EventTemplate[];
}

export interface DrawnEvent {
  readonly template: EventTemplate;
  readonly subEvent: EventTemplate | null;
  readonly locationId: string;
  readonly tick: number;
}

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
  warded: { name: "Warded", description: "Lower combat and tribulation risk." },
  deviation: { name: "Qi Deviation", description: "Cultivation becomes unstable and risky." },
  insight: { name: "Insight", description: "Short-term bonus to cultivation and combat." },
  "spirit-saturated": { name: "Spirit Saturated", description: "Short-term cultivation boost." },
};

const STATE_EVENT_PREFIX: Record<StateId, string> = {
  qingzhou: "qz",
  yangzhou: "yz",
  zhongzhou: "zz",
  shuzhou: "sz",
  youzhou: "uz",
  liangzhou: "lz",
  leizhou: "rz",
  cangzhou: "cz",
  wanzhou: "wz",
};

function buildGlobalCommonPool(): EventTemplate[] {
  const rows: Array<Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm">> = [
    { id: "g-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Spirit Herb", nameCn: "路边灵草", description: "A low-grade herb patch adds value to your satchel.", baseWeight: 1, effects: { spiritStones: 40 } },
    { id: "g-f-02", semanticType: "fortune", resultType: "resource", name: "Abandoned Pouch", nameCn: "废弃储物袋", description: "A weathered pouch still holds a few stones.", baseWeight: 1, effects: { spiritStones: 60 } },
    { id: "g-f-03", semanticType: "fortune", resultType: "progression", name: "Broken Stele Insight", nameCn: "残碑感悟", description: "A fragmentary carving stirs a brief realization.", baseWeight: 1, effects: { realmProgress: 3 } },
    { id: "g-f-04", semanticType: "fortune", resultType: "status", name: "Spirit Spring", nameCn: "灵泉浸泡", description: "A hidden spring calms the breath and mind.", baseWeight: 1, effects: { statusEffects: [{ effectId: "clear-mind", ticks: 3 }] } },
    { id: "g-f-05", semanticType: "fortune", resultType: "story", name: "Crane Crossing", nameCn: "路遇仙鹤", description: "A crane circles overhead and leaves an omen.", baseWeight: 1, effects: { karmaChange: 1 } },
    { id: "g-t-01", semanticType: "training", resultType: "progression", name: "Solo Practice", nameCn: "独自参悟", description: "A clean cycle yields practical progress.", baseWeight: 1, effects: { realmProgress: 2 } },
    { id: "g-t-02", semanticType: "training", resultType: "status", name: "Walking Breath", nameCn: "行走练气", description: "Breath control while moving triggers a short surge.", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { id: "g-t-03", semanticType: "training", resultType: "resource", name: "Foraging Drill", nameCn: "采药锻炼", description: "The route doubles as a gathering session.", baseWeight: 1, effects: { spiritStones: 25 } },
    { id: "g-t-04", semanticType: "training", resultType: "combat", name: "Wild Beast", nameCn: "野兽遭遇", description: "A minor beast tests your footing.", baseWeight: 1, effects: { qi: -8, spiritStones: 20 } },
    { id: "g-t-05", semanticType: "training", resultType: "story", name: "Senior's Hint", nameCn: "路遇前辈", description: "A passing senior leaves one cryptic sentence.", baseWeight: 1, effects: { reputationChange: 1 } },
    { id: "g-h-01", semanticType: "human", resultType: "resource", name: "Rogue Request", nameCn: "散修求助", description: "Helping another rogue cultivator pays modestly.", baseWeight: 1, effects: { spiritStones: 30, reputationChange: 1 } },
    { id: "g-h-02", semanticType: "human", resultType: "status", name: "Old Acquaintance", nameCn: "路遇故人", description: "A familiar face boosts your confidence.", baseWeight: 1, effects: { statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
    { id: "g-h-03", semanticType: "human", resultType: "story", name: "Teahouse Rumor", nameCn: "茶摊消息", description: "A rumor reframes local movement and risk.", baseWeight: 1, effects: { karmaChange: 1 } },
    { id: "g-h-04", semanticType: "human", resultType: "combat", name: "Road Ambush", nameCn: "遭遇劫道", description: "Bandits force a short clash on the road.", baseWeight: 1, effects: { qi: -10, spiritStones: 25 } },
    { id: "g-h-05", semanticType: "human", resultType: "resource", name: "Merchant Cooperation", nameCn: "商旅互助", description: "A caravan shares route pay for escort help.", baseWeight: 1, effects: { spiritStones: 50 } },
  ];

  return rows.map((event) => ({
    ...event,
    layer: "global-common",
    source: "exploration",
    stateId: null,
    nodeType: null,
    minRealm: null,
  }));
}

function buildStateSpecificEvents(stateId: StateId): EventTemplate[] {
  const prefix = STATE_EVENT_PREFIX[stateId];
  const label = stateId;
  const base = [
    { id: `${prefix}-f-01`, semanticType: "fortune", resultType: "resource", title: "Local Herb Cache", titleCn: "州特灵草", effects: { spiritStones: 45 } },
    { id: `${prefix}-f-02`, semanticType: "fortune", resultType: "progression", title: "Regional Stele", titleCn: "州域残碑", effects: { realmProgress: 4 } },
    { id: `${prefix}-f-03`, semanticType: "fortune", resultType: "status", title: "Clean Wind", titleCn: "清风洗尘", effects: { statusEffects: [{ effectId: "clear-mind", ticks: 4 }] } },
    { id: `${prefix}-t-01`, semanticType: "training", resultType: "progression", title: "Route Drill", titleCn: "行路操练", effects: { realmProgress: 3 } },
    { id: `${prefix}-t-02`, semanticType: "training", resultType: "combat", title: "Local Beast", titleCn: "州野妖兽", effects: { qi: -9, spiritStones: 20 } },
    { id: `${prefix}-t-03`, semanticType: "training", resultType: "resource", title: "Terrain Harvest", titleCn: "地形采集", effects: { spiritStones: 35 } },
    { id: `${prefix}-h-01`, semanticType: "human", resultType: "resource", title: "Sect Courier", titleCn: "宗门传信", effects: { spiritStones: 35, reputationChange: 1 } },
    { id: `${prefix}-h-02`, semanticType: "human", resultType: "story", title: "Hidden Local", titleCn: "山间隐者", effects: { karmaChange: 1 } },
    { id: `${prefix}-h-03`, semanticType: "human", resultType: "status", title: "Supply Contract", titleCn: "物资求购", effects: { spiritStones: 30, statusEffects: [{ effectId: "fortune-marked", ticks: 2 }] } },
  ] as const;

  return base.map((row) => ({
    id: row.id,
    layer: "state-specific" as const,
    source: "exploration" as const,
    semanticType: row.semanticType,
    resultType: row.resultType,
    name: `${label}-${row.title}`,
    nameCn: row.titleCn,
    description: `${label} local event: ${row.title}.`,
    baseWeight: 1,
    stateId,
    nodeType: null,
    minRealm: null,
    effects: row.effects,
  }));
}

function buildNodeSpecificEvents(locations: Record<string, Location>): Record<string, EventTemplate[]> {
  const nodeSpecific: Record<string, EventTemplate[]> = {};
  for (const [locationId, location] of Object.entries(locations)) {
    if (
      location.nodeType !== "wilderness" &&
      location.nodeType !== "dungeon-c" &&
      location.nodeType !== "dungeon-b" &&
      location.nodeType !== "dungeon-a"
    ) {
      continue;
    }

    const event: EventTemplate = {
      id: `${locationId}-node-01`,
      layer: "node-specific",
      source: "exploration",
      semanticType: location.nodeType === "wilderness" ? "fortune" : "training",
      resultType: location.nodeType === "wilderness" ? "resource" : "combat",
      name: `${location.name} Local Trigger`,
      nameCn: `${location.name}本地触发`,
      description: `A node-specific event tied to ${location.name}.`,
      baseWeight: 1,
      stateId: location.stateId as StateId,
      nodeType: location.nodeType as NodeType,
      minRealm: null,
      effects:
        location.nodeType === "wilderness"
          ? { spiritStones: 28, itemRewards: [{ itemId: "spirit-ore", count: 1 }] }
          : { qi: -12, spiritStones: 30, itemRewards: [{ itemId: "ruin-fragment", count: 1 }] },
    };

    nodeSpecific[locationId] = [event];
  }
  return nodeSpecific;
}

function buildTravelPool(): EventTemplate[] {
  const rows: Array<Omit<EventTemplate, "layer" | "source" | "stateId" | "nodeType" | "minRealm">> = [
    { id: "tr-f-01", semanticType: "fortune", resultType: "resource", name: "Roadside Pickup", nameCn: "路边捡拾", description: "A minor find while moving.", baseWeight: 1, effects: { spiritStones: 20 } },
    { id: "tr-f-02", semanticType: "fortune", resultType: "status", name: "Tailwind", nameCn: "顺风赶路", description: "Momentum keeps your qi flow smooth.", baseWeight: 1, effects: { statusEffects: [{ effectId: "qi-surge", ticks: 2 }] } },
    { id: "tr-f-03", semanticType: "fortune", resultType: "story", name: "Fellow Traveler", nameCn: "路遇同行", description: "A brief exchange updates local rumor maps.", baseWeight: 1, effects: { reputationChange: 1 } },
    { id: "tr-t-01", semanticType: "training", resultType: "progression", name: "Walking Insight", nameCn: "行路参悟", description: "Breath pacing yields incremental progress.", baseWeight: 1, effects: { realmProgress: 1 } },
    { id: "tr-t-02", semanticType: "training", resultType: "status", name: "Load Bearing", nameCn: "负重行走", description: "Sustained pace strengthens spiritual channels.", baseWeight: 1, effects: { spiritualPower: 8 } },
    { id: "tr-t-03", semanticType: "training", resultType: "combat", name: "Road Beast", nameCn: "路遇妖兽", description: "A brief clash interrupts travel.", baseWeight: 1, effects: { qi: -8, spiritStones: 16 } },
    { id: "tr-h-01", semanticType: "human", resultType: "resource", name: "Passing Merchant", nameCn: "过路商人", description: "Trade intel translates into a small gain.", baseWeight: 1, effects: { spiritStones: 25 } },
    { id: "tr-h-02", semanticType: "human", resultType: "story", name: "Roadside Notice", nameCn: "路边告示", description: "A posted notice hints at regional flux.", baseWeight: 1, effects: { karmaChange: 1 } },
    { id: "tr-h-03", semanticType: "human", resultType: "combat", name: "Bandit Blockade", nameCn: "山匪截路", description: "Bandits force a rough pass-through.", baseWeight: 1, effects: { qi: -10, spiritStones: 24 } },
  ];

  return rows.map((event) => ({
    ...event,
    layer: "global-common",
    source: "travel",
    stateId: null,
    nodeType: null,
    minRealm: null,
  }));
}

export function createEventPools(locations: Record<string, Location>): EventPools {
  const stateSpecific = {} as Record<StateId, readonly EventTemplate[]>;
  for (const stateId of STATE_IDS) {
    stateSpecific[stateId] = buildStateSpecificEvents(stateId);
  }

  return {
    globalCommon: buildGlobalCommonPool(),
    stateSpecific,
    nodeSpecific: buildNodeSpecificEvents(locations),
    travelPool: buildTravelPool(),
  };
}

function applyOverlayWeights(candidates: WeightedEvent[], cultivator: Cultivator): WeightedEvent[] {
  const dominantElement = cultivator.registrationRecord
    ? (Object.entries(cultivator.registrationRecord.result.five_element_scores)
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
    : null;

  return candidates.map((entry) => {
    let weight = entry.weight;

    // recovery-state overlay
    if (cultivator.injuryTicksRemaining > 0) {
      if (entry.template.resultType === "status") {
        weight *= 1.25;
      }
      if (entry.template.resultType === "combat") {
        weight *= 0.7;
      }
    }

    // sect-affiliation overlay
    if (cultivator.sectId && entry.template.semanticType === "human") {
      weight *= 1.15;
    }

    // dominant-element overlay
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

  const stateEvents = pool.stateSpecific[location.stateId as StateId] ?? [];
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
  if (typeof effects.karmaChange === "number") {
    cultivator.karma = Math.max(0, cultivator.karma + effects.karmaChange);
  }
  if (typeof effects.reputationChange === "number") {
    cultivator.reputation = Math.max(0, cultivator.reputation + effects.reputationChange);
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
