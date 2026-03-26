import type {
  ItemId,
  RealmStage,
  StatusEffectId,
} from "./model.js";
import type { NodeType, StateId } from "./constants.js";

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

export { createEventPools } from "./events/catalog.js";
export { applyEventEffects, drawEvent, eventSeverityOf } from "./events/engine.js";
