import type { EventTemplate } from "../../../../events.js";
import type { Location } from "../../../../model.js";

import { buildNodeEvent } from "../shared.js";

export interface RegionalDungeonEventRow {
  readonly slot: string;
  readonly semanticType: EventTemplate["semanticType"];
  readonly resultType: EventTemplate["resultType"];
  readonly title: string;
  readonly titleCn?: string;
  readonly description: string;
  readonly baseWeight?: number;
  readonly effects: EventTemplate["effects"];
}

export function buildRegionalDungeonEventPack(
  location: Location,
  rows: readonly RegionalDungeonEventRow[],
): EventTemplate[] {
  return rows.map((row) =>
    buildNodeEvent(location, {
      idSuffix: row.slot,
      semanticType: row.semanticType,
      resultType: row.resultType,
      nameSuffix: row.title,
      nameCnSuffix: row.titleCn ?? row.title,
      description: row.description,
      baseWeight: row.baseWeight ?? 1,
      effects: row.effects,
    }),
  );
}
