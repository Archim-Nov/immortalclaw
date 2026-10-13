import { GameplayRejection } from "./gameplay-error.js";
import type { WorldState } from "./model.js";
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
  if (cleaned && previous === cleaned && recentPair) {
    throw new GameplayRejection("这句话刚说过。换一句，或等几刻。");
  }
  const pool = POOLS[kind];
  let line = cleaned;
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
  return line;
}
