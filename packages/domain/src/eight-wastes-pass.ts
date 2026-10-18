import type { Cultivator, DungeonExpeditionOutcome, WildernessProgress, WorldState } from "./model.js";
import { noteWild } from "./wild-places.js";

export const EIGHT_WASTES_PASS_ID = "eight-wastes-pass" as const;

/**
 * Drop chances are percents. A wilderness stay sets passFound after the
 * first success, so survey, hunt, beat, and the layer tick do not stack.
 */
export const EIGHT_WASTES_PASS_RATES = {
  survey: 14,
  hunt: 16,
  beat: 10,
  layer: 5,
  dungeonMid: 28,
  dungeonMidClear: 40,
  dungeonDeep: 42,
  dungeonDeepClear: 55,
} as const;

/** Numbers from before this pass. Tests compare the live table against them. */
export const BAHUANG_REWARD_BEFORE = {
  spiritMin: 30,
  spiritMax: 90,
  completionStones: 200,
  completionProgress: 10,
  pocket: 6,
  retreatStones: 50,
} as const;

export type WildernessPassSource = "survey" | "hunt" | "beat" | "layer";

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function wildernessPassHits(source: WildernessPassSource, seed: string): boolean {
  return hashString(`${seed}:eight-wastes-pass:${source}`) % 100 < EIGHT_WASTES_PASS_RATES[source];
}

export function maybeEightWastesPass(input: {
  world: WorldState;
  cultivator: Cultivator;
  source: WildernessPassSource;
  seed: string;
  placeName: string;
  progress?: WildernessProgress | null;
}): string | null {
  if (input.progress?.passFound) return null;
  if (!wildernessPassHits(input.source, input.seed)) return null;
  if (input.progress) input.progress.passFound = true;
  input.cultivator.inventory[EIGHT_WASTES_PASS_ID] = (input.cultivator.inventory[EIGHT_WASTES_PASS_ID] ?? 0) + 1;
  const detail = `${input.placeName}里摸到一枚八荒令。`;
  noteWild(input.cultivator, {
    tick: input.world.tick,
    locationId: input.cultivator.locationId,
    title: "八荒令",
    detail,
  });
  return detail;
}

/**
 * 丙, 乙, and 甲 share this table.
 * Ranks 1–3 never drop. Abort and a collapse never drop.
 * Ranks 4–6 are the mid band. Ranks 7–9 are the deep band.
 * A clear is a little more likely than a withdraw.
 */
export function dungeonPassCount(input: {
  rank: number;
  outcome: DungeonExpeditionOutcome;
  seed: string;
}): number {
  if (input.rank < 4) return 0;
  if (input.outcome !== "completed" && input.outcome !== "withdrew") return 0;
  const deep = input.rank >= 7;
  const clear = input.outcome === "completed";
  const rate = deep
    ? (clear ? EIGHT_WASTES_PASS_RATES.dungeonDeepClear : EIGHT_WASTES_PASS_RATES.dungeonDeep)
    : (clear ? EIGHT_WASTES_PASS_RATES.dungeonMidClear : EIGHT_WASTES_PASS_RATES.dungeonMid);
  return hashString(`${input.seed}:eight-wastes-pass:dungeon`) % 100 < rate ? 1 : 0;
}
