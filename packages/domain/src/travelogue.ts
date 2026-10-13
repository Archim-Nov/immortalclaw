import type { Cultivator, TravelNote, TravelNoteKind } from "./model.js";

export const TRAVELOGUE_LIMIT = 12;
const SPAM_WINDOW_TICKS = 8;

export function pushTravelNote(cultivator: Cultivator, note: TravelNote): void {
  const notes = cultivator.travelNotes ? [...cultivator.travelNotes] : [];
  notes.unshift(note);
  cultivator.travelNotes = notes.slice(0, TRAVELOGUE_LIMIT);
}

export function noteSpam(
  cultivator: Cultivator,
  key: string,
  tick: number,
): { count: number; note: string | null } {
  const fatigue = cultivator.actionFatigue;
  if (!fatigue || fatigue.key !== key || tick - fatigue.lastTick > SPAM_WINDOW_TICKS) {
    cultivator.actionFatigue = { key, count: 1, lastTick: tick };
    return { count: 1, note: null };
  }
  const count = fatigue.count + 1;
  cultivator.actionFatigue = { key, count, lastTick: tick };
  if (count >= 3) {
    return {
      count,
      note: `同样的事情已经连做了${count}次，收益开始变淡。地宫、荒野，或者一场正经的斗法，会比继续重复更有收获。`,
    };
  }
  return { count, note: null };
}

export function spamRewardMultiplier(count: number): number {
  if (count <= 2) {
    return 1;
  }
  if (count === 3) {
    return 0.7;
  }
  if (count === 4) {
    return 0.45;
  }
  return 0.25;
}

export function describeMood(cultivator: Cultivator, inDungeon: boolean): string {
  if (cultivator.injuryTicksRemaining >= 6) {
    return "带伤，心气发沉";
  }
  if (cultivator.injuryTicksRemaining > 0) {
    return "挂着轻伤，走路会留神";
  }
  if (cultivator.maxQi > 0 && cultivator.qi / cultivator.maxQi < 0.35) {
    return "气虚，想找个地方调息";
  }
  if (inDungeon) {
    return "神思收在地宫里";
  }
  if (cultivator.realmProgress >= 100) {
    return "修为顶在门槛上，想破境";
  }
  return cultivator.travelNotes?.[0]?.mood ?? "心境平稳";
}

export function travelNote(input: {
  tick: number;
  kind: TravelNoteKind;
  title: string;
  detail: string;
  locationId: string;
  mood?: string;
}): TravelNote {
  return input;
}
