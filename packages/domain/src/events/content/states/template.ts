import type { StateId } from "../../../constants.js";
import type { EventTemplate } from "../../../events.js";

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

export interface StateEventRow {
  readonly slot: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly title: string;
  readonly titleCn: string;
  readonly description: string;
  readonly baseWeight?: number;
  readonly minRealm?: EventTemplate["minRealm"];
  readonly effects: EventTemplate["effects"];
  readonly moralityChoice?: EventTemplate["moralityChoice"];
}

export function buildStateEventPack(
  stateId: StateId,
  rows: readonly StateEventRow[],
  source: EventTemplate["source"] = "exploration",
): EventTemplate[] {
  const prefix = STATE_EVENT_PREFIX[stateId];

  return rows.map((row) => ({
    id: `${prefix}-${row.slot}`,
    layer: "state-specific" as const,
    source,
    semanticType: row.semanticType,
    resultType: row.resultType,
    name: row.title,
    nameCn: row.titleCn,
    description: row.description,
    baseWeight: row.baseWeight ?? 1,
    stateId,
    nodeType: null,
    minRealm: row.minRealm ?? null,
    effects: row.effects,
    ...(row.moralityChoice ? { moralityChoice: row.moralityChoice } : {}),
  }));
}
