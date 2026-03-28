import type { NodeType, StateId } from "../../../constants.js";
import type { EventTemplate } from "../../../events.js";
import type { Location } from "../../../model.js";

interface NodeEventSpec {
  readonly idSuffix: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly nameSuffix: string;
  readonly nameCnSuffix?: string;
  readonly description: string;
  readonly baseWeight: number;
  readonly effects: EventTemplate["effects"];
}

export function buildNodeEvent(location: Location, spec: NodeEventSpec): EventTemplate {
  return {
    id: `${location.id}-${spec.idSuffix}`,
    layer: "node-specific",
    source: "exploration",
    semanticType: spec.semanticType,
    resultType: spec.resultType,
    name: `${location.name} ${spec.nameSuffix}`,
    nameCn: `${location.name} ${spec.nameCnSuffix ?? spec.nameSuffix}`,
    description: spec.description,
    baseWeight: spec.baseWeight,
    stateId: location.stateId as StateId,
    nodeType: location.nodeType as NodeType,
    minRealm: null,
    effects: spec.effects,
  };
}
