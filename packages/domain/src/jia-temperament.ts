import { mysteryForRank } from "./high-realm.js";
import type {
  DungeonExpeditionOutcome,
  DungeonGrade,
  ItemId,
  JiaHaulChoice,
  JiaTemperamentId,
} from "./model.js";

/**
 * Side loot for a 甲 run.
 *
 * The rank picks 丹霞, 火毒, or 阵纹. The item enters the bag when the run
 * withdraws or finishes, before the report is written. 乙 and 丙 are not here.
 */

export const JIA_TEMPERAMENT_ORDER = ["danxia", "fire-poison", "array"] as const satisfies readonly JiaTemperamentId[];

export const JIA_TEMPERAMENT_LOOT = {
  danxia: { itemId: "danxia-cinder" as const, name: "丹霞余砂" },
  "fire-poison": { itemId: "fire-poison-bead" as const, name: "火毒凝滴" },
  array: { itemId: "array-shard" as const, name: "阵纹残片" },
} satisfies Record<JiaTemperamentId, { itemId: ItemId; name: string }>;

export function jiaTemperamentForRank(rank: number): JiaTemperamentId {
  const step = Math.max(1, Math.floor(rank));
  return JIA_TEMPERAMENT_ORDER[(step - 1) % JIA_TEMPERAMENT_ORDER.length]!;
}

export function jiaTemperamentItemId(rank: number): ItemId {
  return JIA_TEMPERAMENT_LOOT[jiaTemperamentForRank(rank)].itemId;
}

export function jiaHaulForOption(optionId: string): JiaHaulChoice | null {
  if (optionId === "walk") return "spare";
  if (optionId === "help") return "swap";
  if (optionId === "risk") return "extra";
  return null;
}

export function jiaPlaceName(rank: number): string {
  return mysteryForRank("甲", rank)?.name ?? "甲级地宫";
}

function nextTemperament(id: JiaTemperamentId): JiaTemperamentId {
  const index = JIA_TEMPERAMENT_ORDER.indexOf(id);
  return JIA_TEMPERAMENT_ORDER[(index + 1) % JIA_TEMPERAMENT_ORDER.length]!;
}

function bandExtra(rank: number): number {
  const step = Math.max(1, Math.min(9, Math.floor(rank)));
  if (step >= 7) return 3;
  if (step >= 4) return 2;
  return 1;
}

export interface JiaClosingDrop {
  temperament: JiaTemperamentId;
  itemId: ItemId;
  name: string;
  count: number;
  place: string;
}

export function jiaClosingDrop(input: {
  rank: number;
  outcome: "completed" | "withdrew";
  temperament?: JiaTemperamentId | null;
  haul?: JiaHaulChoice | null;
}): JiaClosingDrop {
  const base = input.temperament ?? jiaTemperamentForRank(input.rank);
  const temperament = input.haul === "swap" ? nextTemperament(base) : base;
  const loot = JIA_TEMPERAMENT_LOOT[temperament];
  let count = input.outcome === "completed" ? 1 + bandExtra(input.rank) : 1;
  if (input.haul === "extra") count += 1;
  if (input.haul === "spare") count -= 1;
  return {
    temperament,
    itemId: loot.itemId,
    name: loot.name,
    count: Math.max(0, count),
    place: jiaPlaceName(input.rank),
  };
}

export function jiaChoiceLine(input: {
  rank: number;
  temperament: JiaTemperamentId;
  haul: JiaHaulChoice;
  injuryEased: boolean;
}): string {
  const place = jiaPlaceName(input.rank);
  const fromName = JIA_TEMPERAMENT_LOOT[input.temperament].name;
  const toName = JIA_TEMPERAMENT_LOOT[nextTemperament(input.temperament)].name;
  if (input.haul === "spare") {
    const wound = input.injuryEased ? "伤按下去两刻。" : "";
    return `若这一趟从${place}撤出或走完，少带一份${fromName}。${wound}`;
  }
  if (input.haul === "extra") {
    return `若这一趟从${place}撤出或走完，多带一份${fromName}。`;
  }
  return `若这一趟从${place}撤出或走完，旁支换成${toName}。`;
}

function heldTemperament(drops: Partial<Record<ItemId, number>>): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const id of JIA_TEMPERAMENT_ORDER) {
    const loot = JIA_TEMPERAMENT_LOOT[id];
    const count = drops[loot.itemId] ?? 0;
    if (count > 0 && (!best || count > best.count)) best = { name: loot.name, count };
  }
  return best;
}

export function jiaHaulSummaryClause(input: {
  grade: DungeonGrade;
  rank: number;
  outcome: DungeonExpeditionOutcome;
  secondaryDrops: Partial<Record<ItemId, number>>;
  haul?: JiaHaulChoice | null;
}): string | null {
  if (input.grade !== "甲") return null;
  if (input.outcome !== "completed" && input.outcome !== "withdrew") return null;
  const place = jiaPlaceName(input.rank);
  const held = heldTemperament(input.secondaryDrops);
  const head = input.outcome === "completed"
    ? `${place}这一层走完了`
    : `人是从${place}中途撤出的`;
  if (input.haul === "spare" && (!held || held.count <= 0)) {
    return `${head}，这一择少带了一份。伤也轻些。`;
  }
  if (!held) return null;
  if (input.haul === "extra") {
    return `${head}，这一择多留了一份，带出${held.count}份${held.name}。`;
  }
  if (input.haul === "swap") {
    return `${head}，这一择换了旁支，带出${held.count}份${held.name}。`;
  }
  if (input.haul === "spare") {
    return `${head}，这一择少带了一份，带出${held.count}份${held.name}。伤也轻些。`;
  }
  const fullness = input.outcome === "completed" ? "旁支更满" : "旁支少一截";
  return `${head}，${fullness}，带出${held.count}份${held.name}。`;
}
