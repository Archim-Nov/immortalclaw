import type { NodeType, StateId } from "../../../constants.js";
import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";
import type { EncounterBuildId } from "../../../encounters/catalog.js";

interface NodeEventSpec {
  readonly idSuffix: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly nameSuffix: string;
  readonly nameCnSuffix?: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly minRealm?: EventTemplate["minRealm"];
  readonly dungeonGrade?: EventTemplate["dungeonGrade"];
  readonly minDungeonRank?: EventTemplate["minDungeonRank"];
  readonly maxDungeonRank?: EventTemplate["maxDungeonRank"];
  readonly effects: EventTemplate["effects"];
  readonly encounterBuildId?: EncounterBuildId | null;
  readonly combatMode?: EventTemplate["combatMode"];
}

function deriveNodeSignalType(spec: Pick<NodeEventSpec, "resultType" | "effects">): EventTemplate["signalType"] {
  if (spec.resultType === "resource" || spec.resultType === "combat" || spec.resultType === "progression") {
    return "decision";
  }
  if (spec.resultType === "story") {
    return "flavor";
  }
  if ((spec.effects.qi ?? 0) < 0 || (spec.effects.injuryTicksRemaining ?? 0) > 0) {
    return "decision";
  }
  return "flavor";
}

export function buildNodeEvent(location: Location, spec: NodeEventSpec): EventTemplate {
  return {
    id: `${location.id}-${spec.idSuffix}`,
    layer: "node-specific",
    source: "exploration",
    semanticType: spec.semanticType,
    resultType: spec.resultType,
    signalType: deriveNodeSignalType(spec),
    name: `${location.name} ${spec.nameSuffix}`,
    nameCn: `${location.name} ${spec.nameCnSuffix ?? spec.nameSuffix}`,
    description: spec.description,
    baseWeight: spec.baseWeight,
    stateId: location.stateId as StateId,
    nodeType: location.nodeType as NodeType,
    minRealm: spec.minRealm ?? null,
    dungeonGrade: spec.dungeonGrade ?? null,
    minDungeonRank: spec.minDungeonRank ?? null,
    maxDungeonRank: spec.maxDungeonRank ?? null,
    effects: spec.effects,
    encounterBuildId: spec.encounterBuildId ?? null,
    combatMode: spec.combatMode ?? null,
  };
}
