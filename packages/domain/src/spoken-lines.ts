import { GameplayRejection } from "./gameplay-error.js";
import { recordSpokenEcho } from "./inner-life.js";
import type { MoodId, WorldState } from "./model.js";
import { getOrCreateSocialLink, getSocialLink, writeSocialLink } from "./social.js";

export const SPEECH_MAX_CHARS = 40;
export const PARTY_LINE_COOLDOWN_TICKS = 3;
export const FREE_SAY_COOLDOWN_TICKS = 2;
export const DIALOGUE_WINDOW_TICKS = 6;
/** Opening line plus two replies. The next one waits. */
export const DIALOGUE_MAX_TURNS = 3;

export type SpeechKind =
  | "chat-up"
  | "greet"
  | "share-info"
  | "request-help"
  | "gift-item"
  | "rendezvous-at-gate"
  | "ready-to-enter"
  | "wait"
  | "say"
  | "reply";

const PARTY_KINDS = new Set<SpeechKind>(["rendezvous-at-gate", "ready-to-enter", "wait"]);
const FREE_KINDS = new Set<SpeechKind>(["say", "reply"]);
const GOSSIP_KINDS = new Set<SpeechKind>(["chat-up", "greet", "share-info", "say"]);

const POOLS: Record<SpeechKind, readonly string[]> = {
  "chat-up": [
    "路上见着你，想打个招呼。",
    "这地方人不多，你也是路过？",
    "看你面生，可愿说两句？",
    "我先自报个名字，免得彼此陌生。",
  ],
  greet: [
    "今日见着你，心里稳一点。",
    "人还在，这就够打个招呼。",
    "路过你面前，不说一声不像话。",
    "风挺硬的，你也出来了。",
  ],
  "share-info": [
    "前头那条路我走过，不太干净。",
    "城里今天人杂，你自己留神。",
    "我听到一句，未必全真，你掂量。",
    "有个地方先别一个人去。",
  ],
  "request-help": [
    "这事我一个人吃力，你要是有空。",
    "我想借你一只手，不是客套。",
    "开口不好看，可我确实需要你。",
    "帮我这一回，人情我记着。",
  ],
  "gift-item": [
    "这个你拿着，比放在我身上有用。",
    "不是什么贵重的，你别推。",
    "路过看见，觉得该给你。",
    "收下吧。我不图你立刻回礼。",
  ],
  "rendezvous-at-gate": [
    "别在城里耗着，地宫门口见。",
    "我先往门口走，你也过来。",
    "人齐了再下，别散开。",
    "门口等我。到了再说进不进。",
  ],
  "ready-to-enter": [
    "人齐了，可以下了。",
    "我这边准备好了，你呢？",
    "再等就凉了，进吧。",
    "脚下这条路，一起走。",
  ],
  wait: [
    "先别下，我还没到。",
    "门口站一站，齐了再进。",
    "这回先等，别一个人冲。",
    "你先守着门口，我随后就到。",
  ],
  say: [
    "有句话，我想当面说。",
    "你听我说完这一句。",
    "不是传令，就是想跟你说说话。",
    "这句不长，你听着就行。",
  ],
  reply: [
    "我听见了。",
    "这话我记下了。",
    "你先说完，我接着。",
    "行，我知道了。",
  ],
};

/** Generated lines when the speaker's mood is no longer steady. Each line stays within 40 characters. */
export const MOOD_LINE_POOLS: Record<Exclude<MoodId, "steady">, Record<SpeechKind, readonly string[]>> = {
  lifted: {
    "chat-up": ["这会儿心气正盛，想跟你打个招呼。", "刚赢过一场，看见你也想说一声。"],
    greet: ["心气正好，路过就跟你问一声。", "今天心里亮，见着你就高兴。"],
    "share-info": ["心气正盛，有句话想告诉你。", "刚顺过来，路上的事我跟你说。"],
    "request-help": ["这会儿有劲，可这件事还是想请你。", "心气正好，开口求你也不觉得难。"],
    "gift-item": ["心气正盛，这个你拿着。", "刚高兴着，东西该给你。"],
    "rendezvous-at-gate": ["心气正好，地宫门口等我。", "这会儿亮得很，门口见。"],
    "ready-to-enter": ["心气正好，人齐了就可以下了。", "这会儿正好，可以下了。"],
    wait: ["心气正好，你先别下，齐了再进。", "先别下，我这口气还想跟你一起。"],
    say: ["心气正盛，有句话想当面说。", "这会儿高兴，所以来跟你说一声。"],
    reply: ["我听见了，这会儿心里也亮。", "这话我记下了，人也跟着高兴。"],
  },
  sore: {
    "chat-up": ["身上还疼着，还是想跟你打个招呼。", "伤没好全，看见你还是想说一声。"],
    greet: ["身上发沉，路过还是跟你问一声。", "伤还在，见着你心里稳一点。"],
    "share-info": ["身上还疼，这句话你还是听一下。", "伤着走路，路上的事我简短说。"],
    "request-help": ["身上发沉，这件事我一个人吃力。", "伤还在，想借你一只手。"],
    "gift-item": ["身上还疼，这个你拿着比我有用。", "伤没好，东西先给你。"],
    "rendezvous-at-gate": ["身上还不利索，你到门口等我。", "伤还在，地宫门口见。"],
    "ready-to-enter": ["身上还疼，人齐了再下。", "伤没好全，可以下了，你慢一点。"],
    wait: ["身上还疼，你先别下，我随后到。", "先别下，这点伤还得缓一缓。"],
    say: ["身上还疼着，这句话我还是想当面说。", "伤没好，有句话还是要告诉你。"],
    reply: ["我听见了，身上还疼着也回你。", "这话我记下了，人还不利索。"],
  },
  warm: {
    "chat-up": ["心里热着，看见你就想打个招呼。", "这点热意还在，想跟你说两句。"],
    greet: ["心里热着，路过就跟你问一声。", "见着你，这点热意还在。"],
    "share-info": ["心里热着，路上的事想说给你听。", "这点热意还在，有句话给你。"],
    "request-help": ["心里热着，这件事还是想请你。", "跟你开口不难，我需要你帮一手。"],
    "gift-item": ["心里热着，这个你拿着。", "这点热意还在，东西该给你。"],
    "rendezvous-at-gate": ["心里热着，想在门口见你一面。", "这点热意还在，地宫门口等我。"],
    "ready-to-enter": ["心里热着，人齐了就可以下了。", "这点热意还在，可以下了。"],
    wait: ["心里热着，你先别下，我马上到。", "先别下，我想跟你一起进。"],
    say: ["心里热着，所以想跟你说一句。", "这点热意还在，有句话当面讲。"],
    reply: ["我听见了，心里也热着。", "这话我记下了，人也跟着暖。"],
  },
  stung: {
    "chat-up": ["心里堵着，还是想跟你打个招呼。", "有点不痛快，看见你还是说一声。"],
    greet: ["心里堵着，路过还是跟你问一声。", "话里有刺，招呼还是要打。"],
    "share-info": ["心里堵着，这句话你还是听一下。", "有点不痛快，路上的事我照样说。"],
    "request-help": ["心里堵着，这件事我还是得开口。", "话不好听，可我确实需要你。"],
    "gift-item": ["心里堵着，这个你还是拿着。", "有点不痛快，东西还是给你。"],
    "rendezvous-at-gate": ["心里堵着，还是约你在门口见。", "有点不痛快，地宫门口等我。"],
    "ready-to-enter": ["心里堵着，人齐了就可以下了。", "话里有刺，可以下了。"],
    wait: ["心里堵着，你先别下，齐了再说。", "先别下，这口气还没顺。"],
    say: ["心里堵着，这句话我还是要说。", "有点不痛快，有句话当面讲清楚。"],
    reply: ["我听见了，心里还是堵着。", "这话我记下了，人还没顺过来。"],
  },
  echoing: {
    "chat-up": ["刚才那句还在耳朵里，还是想招呼你。", "耳边那句话没散，看见你再说一声。"],
    greet: ["刚才那句还在，路过再问你一声。", "耳边还留着话，见着你就想应一声。"],
    "share-info": ["刚才那句还在，路上的事我接着说。", "耳边那句话没散，还有一句给你。"],
    "request-help": ["刚才那句还在，这件事我想请你。", "耳边还留着话，我还是得开口。"],
    "gift-item": ["刚才那句还在，这个你拿着。", "耳边那句话没散，东西该给你。"],
    "rendezvous-at-gate": ["刚才那句还在，门口我们接着说。", "耳边还留着话，地宫门口等我。"],
    "ready-to-enter": ["刚才那句还在，人齐了就可以下了。", "耳边那句话没散，可以下了。"],
    wait: ["刚才那句还在，你先别下。", "先别下，耳边那句话还没说完。"],
    say: ["刚才那句还在耳朵里，我接着说。", "耳边还留着话，所以再当面讲一句。"],
    reply: ["我听见了，刚才那句也还在。", "这话我记下了，耳朵里还留着上一句。"],
  },
};

function takeGossipLine(world: WorldState, speakerId: string, previous: string | null): string | null {
  const heard = world.cultivators[speakerId]?.heardGossip;
  if (!heard) return null;
  const fresh = heard.find((item) => !item.mentioned && world.tick - item.tick <= DIALOGUE_WINDOW_TICKS && item.shortLine);
  if (!fresh || fresh.shortLine === previous) return null;
  fresh.mentioned = true;
  return fresh.shortLine;
}

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function cleanSpokenLine(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, SPEECH_MAX_CHARS).join("");
}

export function openSpokenLine(
  world: WorldState,
  speakerId: string,
  listenerId: string,
  kind: SpeechKind,
  tick: number,
  supplied?: string | null,
): string {
  const speakerLink = getSocialLink(world, speakerId, listenerId);
  const heard = getSocialLink(world, listenerId, speakerId);
  const recentSpeaker = speakerLink?.lastSpokenTick !== undefined && tick - speakerLink.lastSpokenTick <= DIALOGUE_WINDOW_TICKS;
  const recentPair = recentSpeaker
    || (heard?.lastSpokenTick !== undefined && tick - heard.lastSpokenTick <= DIALOGUE_WINDOW_TICKS);
  if (PARTY_KINDS.has(kind) && speakerLink?.lastSpokenKind === kind && speakerLink.lastSpokenTick !== undefined && tick - speakerLink.lastSpokenTick < PARTY_LINE_COOLDOWN_TICKS) {
    throw new GameplayRejection("这句话刚传过。换一句，或等几刻再约。");
  }
  if (FREE_KINDS.has(kind) && speakerLink && (speakerLink.lastSpokenKind === "say" || speakerLink.lastSpokenKind === "reply") && speakerLink.lastSpokenTick !== undefined && tick - speakerLink.lastSpokenTick < FREE_SAY_COOLDOWN_TICKS) {
    throw new GameplayRejection("话太密了。隔一刻再开口。");
  }
  const depth = recentPair ? Math.max(speakerLink?.dialogueDepth ?? 0, heard?.dialogueDepth ?? 0) : 0;
  if (FREE_KINDS.has(kind) && depth >= DIALOGUE_MAX_TURNS) {
    throw new GameplayRejection("这几句已经说完了。过几刻再开口。");
  }
  const cleaned = cleanSpokenLine(supplied);
  const previous = speakerLink?.lastSpokenLine ?? heard?.lastSpokenLine ?? null;
  const gossipLine = !cleaned && GOSSIP_KINDS.has(kind) ? takeGossipLine(world, speakerId, previous) : null;
  if (cleaned && previous === cleaned && recentPair) {
    throw new GameplayRejection("这句话刚说过。换一句，或等几刻。");
  }
  const speakerMood = world.cultivators[speakerId]?.mood?.id;
  const flavored = speakerMood && speakerMood !== "steady" ? MOOD_LINE_POOLS[speakerMood]?.[kind] : undefined;
  const pool = flavored && flavored.length > 0 ? flavored : POOLS[kind];
  let line = cleaned ?? gossipLine;
  if (!line) {
    let index = hashString(`${speakerId}:${listenerId}:${tick}:${kind}`) % pool.length;
    if (pool[index] === previous && pool.length > 1) index = (index + 1) % pool.length;
    line = pool[index] ?? pool[0]!;
  }
  const nextDepth = FREE_KINDS.has(kind) ? (recentPair ? depth + 1 : 1) : (recentPair ? depth : 0);
  const speakerBase = getOrCreateSocialLink(world, speakerId, listenerId);
  writeSocialLink(world, speakerId, {
    ...speakerBase,
    lastSpokenTick: tick,
    lastSpokenLine: line,
    lastSpokenKind: kind,
    dialogueDepth: nextDepth,
  });
  const listenerBase = getOrCreateSocialLink(world, listenerId, speakerId);
  writeSocialLink(world, listenerId, {
    ...listenerBase,
    lastSpokenLine: line,
    dialogueDepth: nextDepth,
  });
  const speaker = world.cultivators[speakerId];
  const listener = world.cultivators[listenerId];
  if (speaker && listener) recordSpokenEcho(world, speaker, listener, line);
  return line;
}
