/**
 * Relationship arcs, mood, and the six-tick digest.
 *
 * One tick is one 时辰 (two hours): 4380 ticks a year, twelve ticks a day.
 * The digest looks back six ticks, which is twelve hours.
 */

import { quietRealmStep } from "./realm-path.js";
import type {
  BondArc,
  Cultivator,
  CultivatorDigest,
  CultivatorMood,
  GossipItem,
  GossipKind,
  GrudgeArc,
  HeardGossip,
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
  "嫌隙": 8,
  "宿怨": 18,
};

const BOND_ORDER: readonly BondArc[] = ["点头之交", "好友", "知己"];
const GRUDGE_ORDER: readonly GrudgeArc[] = ["嫌隙", "宿怨"];

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
  topic: "bond" | "repay" = "bond",
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
    recordLife(person, { tick: world.tick, kind: "relationship", text: detail, topic, names: [a.name, b.name] });
  }
}

const BOND_LINES: Record<BondArc, (a: string, b: string) => string> = {
  "点头之交": (a, b) => `${a}和${b}从生疏走到了点头之交。以后在城里碰见，会互相招呼一声。`,
  "好友": (a, b) => `${a}和${b}的交情到了好友。要紧的事可以开口，不必再先客套。`,
  "知己": (a, b) => `${a}和${b}成了知己。此后可以切磋指点，也可以把一小笔灵石分给对方。`,
};

const GRUDGE_LINES: Record<GrudgeArc, (a: string, b: string) => string> = {
  "嫌隙": (a, b) => `${a}和${b}之间起了嫌隙。话还没有撕破，心里已经不痛快。`,
  "宿怨": (a, b) => `${a}和${b}的嫌隙结成了宿怨。此后可以公开下挑战书。`,
};

const GOSSIP_MEMORY = 6;
const HEARD_GOSSIP_LIMIT = 3;

function clipLine(text: string): string {
  return Array.from(text).slice(0, 40).join("");
}

/** Tell idle neighbors about a bond, a feud, a win, or a failed favor. The people involved already know. */
export function spreadNearbyGossip(
  world: WorldState,
  locationIds: readonly string[],
  aboutIds: readonly string[],
  kind: GossipKind,
  text: string,
  shortLine: string,
): void {
  const places = [...new Set(locationIds.filter((id) => id.length > 0))];
  if (places.length === 0) return;
  const line = clipLine(shortLine);
  const item: GossipItem = {
    id: `gossip-${world.nextGossipSequence ?? 1}`,
    tick: world.tick,
    locationId: places[0]!,
    aboutIds: [...aboutIds],
    kind,
    text,
    shortLine: line,
  };
  world.nextGossipSequence = (world.nextGossipSequence ?? 1) + 1;
  const board = (world.gossip ?? []).filter((row) => world.tick - row.tick <= GOSSIP_MEMORY);
  board.unshift(item);
  world.gossip = board.slice(0, 24);
  const about = new Set(aboutIds);
  for (const person of Object.values(world.cultivators)) {
    if (!places.includes(person.locationId) || about.has(person.id)) continue;
    const heard = person.heardGossip ?? [];
    if (heard.some((row) => row.shortLine === line && world.tick - row.tick <= GOSSIP_MEMORY)) continue;
    const entry: HeardGossip = { id: item.id, tick: world.tick, text, shortLine: line, kind };
    person.heardGossip = [entry, ...heard].slice(0, HEARD_GOSSIP_LIMIT);
    pushTravelNote(person, travelNote({
      tick: world.tick,
      kind: "person",
      title: "听见了一桩闲话",
      detail: text,
      locationId: person.locationId,
      mood: "耳朵里多了一句",
    }));
    const names = aboutIds
      .map((id) => world.cultivators[id]?.name)
      .filter((name): name is string => Boolean(name));
    recordLife(person, { tick: world.tick, kind: "relationship", text, topic: "gossip", names });
  }
}

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
  if (stages.includes("知己")) {
    spreadNearbyGossip(
      world,
      [a.locationId, b.locationId],
      [a.id, b.id],
      "bond",
      `${a.name}和${b.name}成了知己。附近的人很快也会听见这件事。`,
      `听人说，${a.name}和${b.name}成了知己。`,
    );
  }
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
  const stage = stages[stages.length - 1]!;
  spreadNearbyGossip(
    world,
    [a.locationId, b.locationId],
    [a.id, b.id],
    "feud",
    `${a.name}和${b.name}之间的${stage}传开了。附近的人不需要亲眼看见，也已经听见了。`,
    `听人说，${a.name}和${b.name}结了${stage}。`,
  );
}

export function buildCultivatorDigest(world: WorldState, cultivator: Cultivator): CultivatorDigest {
  const mood = currentMood(cultivator, world.tick);
  const windowStart = world.tick - DIGEST_WINDOW_TICKS;
  const recent = (cultivator.lifeLog ?? []).filter((event) => event.tick > windowStart && event.tick <= world.tick);
  const growth = recent.filter((event) => event.kind === "growth").map((event) => event.text).slice(0, 4);
  const fights = recent.filter((event) => event.kind === "fight").map((event) => event.text).slice(0, 4);
  const relationshipEvents = recent.filter((event) => event.kind === "relationship");
  const relationships = relationshipEvents.map((event) => event.text).slice(0, 4);
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
  const nextStep = quietRealmStep(cultivator.realmLevel);
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
    summary: summarizeDigest(cultivator.name, mood, growth, fights, relationshipEvents, quotes, nextStep),
    ...(nextStep ? { nextStep } : {}),
  };
}

function summarizeDigest(
  name: string,
  mood: CultivatorMood,
  growth: readonly string[],
  fights: readonly string[],
  relationshipEvents: readonly LifeEvent[],
  quotes: readonly { speakerName: string; line: string }[],
  nextStep: string | null,
): string {
  const socialTexts = relationshipEvents.map((event) => event.text).slice(0, 3);
  const named: string[] = [];
  for (const event of relationshipEvents) {
    for (const person of event.names ?? []) {
      if (!person || person === name || named.includes(person)) continue;
      named.push(person);
      if (named.length >= 3) break;
    }
    if (named.length >= 3) break;
  }
  const quote = quotes[0];
  if (socialTexts.length === 0 && fights.length === 0 && growth.length === 0 && !quote) {
    const step = nextStep ? `${nextStep}` : "";
    return `${name}最近六个时辰过得平常，没有特别要报的事。${step}${mood.sentence}`;
  }
  const parts = [`${name}最近六个时辰里有这些事。`];
  if (named.length > 0) parts.push(`说到的人有${named.join("、")}。`);
  if (socialTexts.length > 0) {
    parts.push(...socialTexts);
    if (fights[0]) parts.push(fights[0]);
  } else {
    if (fights[0]) parts.push(fights[0]);
    if (growth[0]) parts.push(growth[0]);
  }
  if (quote) parts.push(`${quote.speakerName}说过：「${quote.line}」`);
  parts.push(mood.sentence);
  return parts.join("");
}

export function crossedBondStages(before: number, after: number): BondArc[] {
  return stagesCrossed(BOND_ORDER, BOND_ARC_THRESHOLDS, before, after);
}

export function crossedGrudgeStages(before: number, after: number): GrudgeArc[] {
  return stagesCrossed(GRUDGE_ORDER, GRUDGE_ARC_THRESHOLDS, before, after);
}
