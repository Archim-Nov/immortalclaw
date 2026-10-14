/**
 * Relationship arcs, mood, and the six-tick digest.
 *
 * One tick is one 时辰 (two hours): 4380 ticks a year, twelve ticks a day.
 * The digest looks back six ticks, which is twelve hours.
 */

import type {
  BondArc,
  Cultivator,
  CultivatorDigest,
  CultivatorMood,
  GrudgeArc,
  LifeEvent,
  MoodCause,
  MoodId,
  WorldState,
} from "./model.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

export const BOND_ARC_THRESHOLDS: Record<BondArc, number> = {
  "点头之交": 20,
  "好友": 120,
  "知己": 200,
};

export const GRUDGE_ARC_THRESHOLDS: Record<GrudgeArc, number> = {
  "嫩隙": 8,
  "宿怨": 18,
};

const BOND_ORDER: readonly BondArc[] = ["点头之交", "好友", "知己"];
const GRUDGE_ORDER: readonly GrudgeArc[] = ["嫩隙", "宿怨"];

export const DIGEST_WINDOW_TICKS = 6;
export const HOURS_PER_TICK = 2;

export const SPAR_TEACH_COOLDOWN_TICKS = 4;
export const SHARE_RESOURCE_COOLDOWN_TICKS = 4;
export const SHARE_RESOURCE_STONES = 8;
export const SHARE_RESOURCE_MINIMUM = 16;
export const SPAR_TEACH_SPIRIT = 6;
export const SPAR_TEACH_PRACTICE = 2;

export const GRUDGE_FROM_REJECTION = 8;
export const GRUDGE_FROM_DUEL = 10;
export const GRUDGE_FROM_DRAW = 6;

const LIFE_LOG_LIMIT = 40;

const MOOD_TABLE: Record<MoodCause, { id: MoodId; label: string; sentence: string }> = {
  win: {
    id: "lifted",
    label: "心气正盛",
    sentence: "这一场赢了，胸口还热着，连走路都轻一点。",
  },
  wound: {
    id: "sore",
    label: "心气发沉",
    sentence: "伤还挂在身上，心气跟着沉了下去，暂时不想再硬闯。",
  },
  loss: {
    id: "sore",
    label: "心气发沉",
    sentence: "这一场输了，心气沉下去，短时间内不想再找人动手。",
  },
  gift: {
    id: "warm",
    label: "心里热着",
    sentence: "有人把东西递到手里，这点热意还没散。",
  },
  rejection: {
    id: "stung",
    label: "心里发堵",
    sentence: "被挡了回来，心里堵着，一时不想装成没事。",
  },
  spoken: {
    id: "echoing",
    label: "话还在耳边",
    sentence: "耳边还留着刚才那句话，走路时会再想一遍。",
  },
  breakthrough: {
    id: "lifted",
    label: "心气正盛",
    sentence: "境界松动了，浑身都轻了一点，连呼吸都比昨天长。",
  },
  bond: {
    id: "warm",
    label: "心里热着",
    sentence: "和这个人走近了一步，心里比刚才热一点。",
  },
  settled: {
    id: "steady",
    label: "心境平稳",
    sentence: "这会儿心境平稳，没有特别想抓住的事。",
  },
};

export function bondArcOf(affinity: number): BondArc | null {
  let current: BondArc | null = null;
  for (const stage of BOND_ORDER) {
    if (affinity >= BOND_ARC_THRESHOLDS[stage]) current = stage;
  }
  return current;
}

export function grudgeArcOf(grudge: number): GrudgeArc | null {
  let current: GrudgeArc | null = null;
  for (const stage of GRUDGE_ORDER) {
    if (grudge >= GRUDGE_ARC_THRESHOLDS[stage]) current = stage;
  }
  return current;
}

export function moodCauseForDuel(result: "win" | "loss" | "draw" | "retreat"): MoodCause {
  if (result === "win") return "win";
  if (result === "draw") return "settled";
  return "loss";
}

export function currentMood(cultivator: Cultivator, tick: number): CultivatorMood {
  if (cultivator.mood) return cultivator.mood;
  const steady = MOOD_TABLE.settled;
  return {
    id: steady.id,
    label: steady.label,
    sentence: steady.sentence,
    sinceTick: tick,
    cause: "settled",
  };
}

export function shiftCultivatorMood(
  world: WorldState,
  cultivator: Cultivator,
  cause: MoodCause,
  sentence?: string,
): CultivatorMood {
  const base = MOOD_TABLE[cause];
  const mood: CultivatorMood = {
    id: base.id,
    label: base.label,
    sentence: sentence ?? base.sentence,
    sinceTick: world.tick,
    cause,
  };
  cultivator.mood = mood;
  recordLife(cultivator, { tick: world.tick, kind: "mood", text: mood.sentence });
  return mood;
}

export function recordLife(cultivator: Cultivator, event: LifeEvent): void {
  const log = cultivator.lifeLog ? [...cultivator.lifeLog] : [];
  const previous = log[0];
  if (previous && previous.tick === event.tick && previous.kind === event.kind && previous.text === event.text) {
    return;
  }
  log.unshift(event);
  cultivator.lifeLog = log.slice(0, LIFE_LOG_LIMIT);
}

export function noteWound(world: WorldState, cultivator: Cultivator): void {
  shiftCultivatorMood(world, cultivator, "wound");
  recordLife(cultivator, {
    tick: world.tick,
    kind: "fight",
    text: `${cultivator.name}挂了伤。伤着的时候进不了地宫，得先歇一歇，或者请身边的人把伤压下去。`,
  });
}

export function recordSpokenEcho(
  world: WorldState,
  speaker: Cultivator,
  listener: Cultivator,
  line: string,
): void {
  const text = `${speaker.name}说：「${line}」`;
  const event: LifeEvent = {
    tick: world.tick,
    kind: "quote",
    text,
    speakerName: speaker.name,
    line,
  };
  recordLife(speaker, event);
  recordLife(listener, event);
  shiftCultivatorMood(world, listener, "spoken");
}

function stagesCrossed<T extends string>(
  order: readonly T[],
  thresholds: Record<T, number>,
  before: number,
  after: number,
): T[] {
  return order.filter((stage) => before < thresholds[stage] && after >= thresholds[stage]);
}

function pairOf(world: WorldState, aId: string, bId: string): [Cultivator, Cultivator] | null {
  const a = world.cultivators[aId];
  const b = world.cultivators[bId];
  if (!a || !b) return null;
  return [a, b];
}

function writePairNote(
  world: WorldState,
  a: Cultivator,
  b: Cultivator,
  title: string,
  detail: string,
  mood: string,
): void {
  for (const person of [a, b]) {
    pushTravelNote(person, travelNote({
      tick: world.tick,
      kind: "person",
      title,
      detail,
      locationId: person.locationId,
      mood,
    }));
    recordLife(person, { tick: world.tick, kind: "relationship", text: detail });
  }
}

const BOND_LINES: Record<BondArc, (a: string, b: string) => string> = {
  "点头之交": (a, b) => `${a}和${b}从生疏走到了点头之交。以后在城里碰见，会互相招呼一声。`,
  "好友": (a, b) => `${a}和${b}的交情到了好友。要紧的事可以开口，不必再先客套。`,
  "知己": (a, b) => `${a}和${b}成了知己。此后可以切磋指点，也可以把一小笔灵石分给对方。`,
};

const GRUDGE_LINES: Record<GrudgeArc, (a: string, b: string) => string> = {
  "嫩隙": (a, b) => `${a}和${b}之间起了嫩隙。话还没有撕破，心里已经不痛快。`,
  "宿怨": (a, b) => `${a}和${b}的嫌隙结成了宿怨。此后可以公开下挑战书。`,
};

export function noteBondCrossing(
  world: WorldState,
  aId: string,
  bId: string,
  beforeA: number,
  afterA: number,
  beforeB: number,
  afterB: number,
): void {
  const pair = pairOf(world, aId, bId);
  if (!pair) return;
  const [a, b] = pair;
  const stages = BOND_ORDER.filter((stage) => {
    const line = BOND_ARC_THRESHOLDS[stage];
    return (beforeA < line && afterA >= line) || (beforeB < line && afterB >= line);
  });
  if (stages.length === 0) return;
  for (const stage of stages) {
    writePairNote(world, a, b, `走到了${stage}`, BOND_LINES[stage](a.name, b.name), stage);
  }
  const warm = `${a.name}和${b.name}走近了一步，心里比刚才热一点。`;
  shiftCultivatorMood(world, a, "bond", warm);
  shiftCultivatorMood(world, b, "bond", warm);
}

export function noteGrudgeCrossing(
  world: WorldState,
  aId: string,
  bId: string,
  beforeA: number,
  afterA: number,
  beforeB: number,
  afterB: number,
): void {
  const pair = pairOf(world, aId, bId);
  if (!pair) return;
  const [a, b] = pair;
  const stages = GRUDGE_ORDER.filter((stage) => {
    const line = GRUDGE_ARC_THRESHOLDS[stage];
    return (beforeA < line && afterA >= line) || (beforeB < line && afterB >= line);
  });
  if (stages.length === 0) return;
  for (const stage of stages) {
    writePairNote(world, a, b, `结下了${stage}`, GRUDGE_LINES[stage](a.name, b.name), stage);
  }
  const stung = `${a.name}和${b.name}的嫌隙深了一层，心里堵着，话也不想装得客气。`;
  shiftCultivatorMood(world, a, "rejection", stung);
  shiftCultivatorMood(world, b, "rejection", stung);
}

export function buildCultivatorDigest(world: WorldState, cultivator: Cultivator): CultivatorDigest {
  const mood = currentMood(cultivator, world.tick);
  const windowStart = world.tick - DIGEST_WINDOW_TICKS;
  const recent = (cultivator.lifeLog ?? []).filter((event) => event.tick > windowStart && event.tick <= world.tick);
  const growth = recent.filter((event) => event.kind === "growth").map((event) => event.text).slice(0, 4);
  const fights = recent.filter((event) => event.kind === "fight").map((event) => event.text).slice(0, 4);
  const relationships = recent.filter((event) => event.kind === "relationship").map((event) => event.text).slice(0, 4);
  const seenQuotes = new Set<string>();
  const quotes: Array<CultivatorDigest["quotes"][number]> = [];
  for (const event of recent) {
    if (event.kind !== "quote" || !event.line || !event.speakerName) continue;
    const key = `${event.tick}:${event.speakerName}:${event.line}`;
    if (seenQuotes.has(key)) continue;
    seenQuotes.add(key);
    quotes.push({ speakerName: event.speakerName, line: event.line, tick: event.tick });
    if (quotes.length >= 4) break;
  }
  return {
    windowTicks: DIGEST_WINDOW_TICKS,
    windowHours: DIGEST_WINDOW_TICKS * HOURS_PER_TICK,
    fromTick: Math.max(0, windowStart + 1),
    toTick: world.tick,
    mood,
    growth,
    fights,
    relationships,
    quotes,
    summary: summarizeDigest(cultivator.name, mood, growth, fights, relationships, quotes),
  };
}

function summarizeDigest(
  name: string,
  mood: CultivatorMood,
  growth: readonly string[],
  fights: readonly string[],
  relationships: readonly string[],
  quotes: readonly { speakerName: string; line: string }[],
): string {
  const news = [...relationships, ...fights, ...growth].slice(0, 4);
  const said = quotes.slice(0, 2).map((quote) => `${quote.speakerName}说过：「${quote.line}」`);
  if (news.length === 0 && said.length === 0) {
    return `${name}最近六个时辰过得平常，没有特别要报的事。${mood.sentence}`;
  }
  return [`${name}最近六个时辰里有这些事。`, ...news, ...said, mood.sentence].join("");
}

export function crossedBondStages(before: number, after: number): BondArc[] {
  return stagesCrossed(BOND_ORDER, BOND_ARC_THRESHOLDS, before, after);
}

export function crossedGrudgeStages(before: number, after: number): GrudgeArc[] {
  return stagesCrossed(GRUDGE_ORDER, GRUDGE_ARC_THRESHOLDS, before, after);
}
