import type { EventTemplate } from "../../../../events.js";
import type { Location } from "../../../../model.js";
import type { EncounterBuildId } from "../../../../encounters/catalog.js";

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
  readonly encounterBuildId?: EncounterBuildId | null;
  readonly combatMode?: EventTemplate["combatMode"];
}

const RANK_BANDS = [
  { suffix: "band-1-3", minDungeonRank: 1, maxDungeonRank: 3 },
  { suffix: "band-4-6", minDungeonRank: 4, maxDungeonRank: 6 },
  { suffix: "band-7-9", minDungeonRank: 7, maxDungeonRank: 9 },
] as const;

export function buildRegionalDungeonEventPack(
  location: Location,
  rows: readonly RegionalDungeonEventRow[],
): EventTemplate[] {
  const dungeonGrade = location.dungeon?.grade ?? null;
  return rows.flatMap((row) =>
    RANK_BANDS.map((band) =>
      buildNodeEvent(location, {
        idSuffix: `${row.slot}-${band.suffix}`,
        semanticType: row.semanticType,
        resultType: row.resultType,
        nameSuffix: row.title,
        nameCnSuffix: row.titleCn ?? row.title,
        description: row.description,
        baseWeight: row.baseWeight ?? 1,
        dungeonGrade,
        minDungeonRank: band.minDungeonRank,
        maxDungeonRank: band.maxDungeonRank,
        effects: row.effects,
        encounterBuildId: row.encounterBuildId ?? null,
        combatMode: row.combatMode ?? null,
      })),
  );
}
