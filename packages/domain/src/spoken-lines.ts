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
  | "reply"
  | "voice-transmit";

export interface SpeechContext {
  giftName?: string;
  heardLine?: string;
  favorReason?: string;
}

const PARTY_KINDS = new Set<SpeechKind>(["rendezvous-at-gate", "ready-to-enter", "wait"]);
const FREE_KINDS = new Set<SpeechKind>(["say", "reply"]);
const GOSSIP_KINDS = new Set<SpeechKind>(["chat-up", "greet", "share-info", "say"]);
const HONORIFIC = "(?:兄|姐|妹|弟|姑娘|公子|师兄|师姐)";

const POOLS: Record<SpeechKind, readonly string[]> = {
  "chat-up": [
    "我看你在这儿站了一会儿，过来打个招呼。",
    "你也歇在这儿？我先把名字告诉你。",
    "路上碰见，不说一声就走过去，怪别扭的。",
    "我叫一声，你要是忙，挥个手就行。",
  ],
  greet: [
    "你也在。我刚到，先跟你说一声。",
    "人还在就好。我路过，看见你了。",
    "今天这地方不算安静，你自己也小心。",
    "我回来了。你要是有事，现在可以说。",
  ],
  "share-info": [
    "前头那条路我走过，坑不浅，你别一个人去。",
    "城里今天人杂，口袋捂紧一点。",
    "我听到一句，未必全真，你自己掂量。",
    "东边那处先别摸。我看见有人在那儿盯着。",
  ],
  "request-help": [
    "这事我一个人搬不动，你要是有空就搭把手。",
    "我想借你一会儿。不是客套，是真缺人。",
    "开口不好看，可再拖下去我自己办不成。",
    "帮我这一回。人情我记着，不会装忘。",
  ],
  "gift-item": [
    "这个你拿着，放在我身上也是占地方。",
    "不是什么贵的，你别推，我已经递出来了。",
    "路过看见，觉得你用得上，就买了。",
    "收下吧。我不图你现在就回一份礼。",
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
    "你先听我说完，这句不长。",
    "我找你，是有件具体的事。",
    "别忙着走。我问完就放你。",
    "这件事我想当面说，传音说不清。",
  ],
  reply: [
    "你说的我接住了。接着讲就行。",
    "行，我按你刚才那句办。",
    "我在。你要我做什么，直说。",
    "那句我听到了。你别再绕一圈。",
  ],
  "voice-transmit": [
    "人没在跟前，这句话先递到你手里。",
    "符到了你就看。我这边还好。",
    "不在一处。有句话想让你听见。",
    "你要是得空，回我一声就行。",
  ],
};

/** Generated lines when the speaker's mood is no longer steady. Each line stays within 40 characters. */
export const MOOD_LINE_POOLS: Record<Exclude<MoodId, "steady">, Record<SpeechKind, readonly string[]>> = {
  lifted: {
    "chat-up": ["刚打完一场，看见你也想说两句。", "今天走路都轻，过来跟你打个招呼。", "这场打完了，胸口还热，过来跟你说一声。", "今天顺，看见你就想站一会儿。"],
    greet: ["我刚顺过来，路过就跟你说一声。", "你也在。我今天高兴，想跟你多站一会儿。", "人碰见了。我这会儿轻快，招呼也长一点。", "路过看见你，想把今天的顺当说给你。"],
    "share-info": ["我刚从那条路回来，坑在左边，你绕开。", "今天顺，路上的事我跟你说清楚。", "东边那处我刚走过，人少，你要去就趁现在。", "城里今天好走。口袋还是捂紧一点。"],
    "request-help": ["我这会儿有劲，可这件事还是得两个人。", "你要是空，帮我把这趟走完。", "我自己也能动手，可有你在会快些。", "帮我这一截。完了我请你喝茶。"],
    "gift-item": ["这个你拿着。我刚高兴，不想再拎着。", "路过买的，觉得该给你，你就收。", "今天顺手，这个就给你了。", "你收着。我不是临时起意。"],
    "rendezvous-at-gate": ["我先去地宫门口。你也过来，别让我白等。", "门口见。我今天想下去看看。", "我往门口走了。你到了叫我。", "地宫门口等我。今天这趟我想下去。"],
    "ready-to-enter": ["人齐了就下。我这口气还热着。", "可以进了。你跟着我，别拉开。", "脚下这条路，现在走正合适。", "准备好了就进。我这口气还在。"],
    wait: ["你先别下。我想跟你一起进。", "门口等我一下。我马上到，别自己冲。", "先站一会儿。我随后就到门口。", "别一个人先下。我马上过来。"],
    say: ["刚打完一场，还热着。有句话我想现在说。", "今天顺，所以我把这句当面告诉你。", "有件事趁我还热着，当面告诉你。", "这句不长。今天高兴，所以现在说。"],
    reply: ["你这句我接住了。我现在就去办。", "行。你说的那件，我跟着做。", "我听见了。你接着说，我接着办。", "行，就按你这句。我现在动身。"],
    "voice-transmit": ["今天顺，先把这句传到你手里。", "人不在跟前。我这边还热着，告诉你一声。", "符到了你就看。今天这趟走得顺。", "有句话趁热递过去。你回我一声就行。"],
  },
  sore: {
    "chat-up": ["我走得慢，还是想过来跟你说一声。", "伤没好全。你要是不忙，听我说两句。", "人不利索，招呼就短一点。你要忙就先走。", "我在这儿歇着。看见你，还是想说一声。"],
    greet: ["人还在。我身上不利索，招呼短一点。", "我看见你了。别让我站太久。", "路过打个招呼。我站不久，你别客气。", "人我看见了。伤还在，话就说到这儿。"],
    "share-info": ["前头不安全。我走不快，你自己留神。", "那条路有人蹲着。我伤着，没法陪你去看。", "东边先别去。我刚在那儿吃了亏，还没缓过来。", "路上的坑我记得。你自己绕，我跟不上。"],
    "request-help": ["我这伤还在，这件事搬不动，你搭把手。", "一个人我吃力。你要是空，就帮我这一回。", "开口不好看。伤还挂着，这件事我自己办不成。", "你要是有空，帮我把这截路走完。"],
    "gift-item": ["这个你拿着。我身上有伤，自己用不上。", "伤还没好，东西先给你，别推回来。", "我拎不动了。这个你收着。", "东西先放你那儿。我这伤用不上。"],
    "rendezvous-at-gate": ["我走得慢。你到门口等我，别先进去。", "地宫门口见。我得歇一歇再过去。", "你先到门口。我拖着伤，慢一点。", "别在门口等太久。我歇一歇就来。"],
    "ready-to-enter": ["可以下了，你走慢一点。我跟得上。", "人齐了再进。我这伤经不起再跑。", "进可以进。你别拉开，我走得慢。", "人齐了就下。我这伤再跑就散。"],
    wait: ["先别下。我还在路上，伤着走不快。", "门口等我。别一个人冲进去。", "你先守着门口。我歇一歇就到。", "先别进。我这伤还得缓一下。"],
    say: ["伤还在身上。这句话我还是想当面说完。", "别让我站太久。有件事我得告诉你。", "人不利索，这句话还是得说完。", "我站不久。有件事当面告诉你。"],
    reply: ["你说的我听见，人还不利索，可我会去办。", "行。你先走，我拖着这伤随后到。", "我接住了。伤还在，事我会去办。", "行。你别等我站直，我随后就到。"],
    "voice-transmit": ["伤还在身上。这句话先传到你手里。", "人没在跟前。我走不快，你自己留神。", "符到了你就看。我这边还得歇一歇。", "有句话想让你听见。我这伤不适合赶路。"],
  },
  warm: {
    "chat-up": ["看见你就想过来。今天不谈大事，说两句就好。", "我记着你先前那份好。过来打个招呼。", "人在跟前，我想站一会儿再走。", "今天不谈买卖。看见你，说两句就好。"],
    greet: ["你也在。我专门绕过来跟你说一声。", "人碰见了。你要是有空，我们站一会儿。", "路过就想叫你一声。你要忙，挥个手就行。", "人还在就好。我绕过来，就是想打这个招呼。"],
    "share-info": ["有句话我只告诉你。前头那处先别一个人去。", "路上的事我跟你说。你听完自己定。", "东边那条路我走过。你要去，我跟你说清楚。", "城里今天人杂。这句话我只告诉你。"],
    "request-help": ["跟你开口不难。这事我需要你帮一手。", "我想请你。你要是不方便，就直接说。", "这事我想交给你。你不肯，我就自己扛。", "帮我这一回。人情我记着，不会装忘。"],
    "gift-item": ["这个你收着。我不是来让你还礼的。", "给你的。你先前帮过我，我记到现在。", "路过看见，觉得该给你，就买了。", "你拿着。我不图你现在回一份。"],
    "rendezvous-at-gate": ["门口见一面再下。我想跟你一起走。", "地宫门口等我。人齐了再进。", "我往门口去。你也来，我们一起下。", "别散开。门口见了再定进不进。"],
    "ready-to-enter": ["可以下了。你在旁边，我踏实些。", "人齐了。进吧，我跟着你。", "脚下这条路，一起走。", "准备好了就进。你在，我踏实。"],
    wait: ["你先别下。我想跟你一起进门。", "等我一下。我马上到，别自己走。", "门口等我。齐了再进。", "先别一个人下。我随后就到。"],
    say: ["你先前那份心意我还记着，所以过来跟你说。", "我不是来客套的。有件事想跟你说清楚。", "有句话想当面告诉你。不长。", "我找你，是有件具体的事，不是客套。"],
    reply: ["你的话我接着。需要我做的，我去做。", "行，我按你说的来。你放心。", "我在。你要我做什么，直说。", "你这句我接住了。接着办就行。"],
    "voice-transmit": ["人不在跟前。有句话想让你听见。", "符到了你就看。我记着你先前那份好。", "这句不长。你要是得空，回我一声。", "我在别处。这句话先递到你手里。"],
  },
  stung: {
    "chat-up": ["我这会儿不痛快，还是想把招呼打了。", "话不好听。看见你，我还是要说一声。", "人我看见了。今天这句短，你别多想。", "我过来打个招呼。别的事先不提。"],
    greet: ["人我看见了。今天这句短，你别多心。", "我过来打个招呼。别的事等一下再说。", "路过叫你一声。我这会儿不想多站。", "人还在。招呼打了，我就走。"],
    "share-info": ["前头有人盯着。我心情差，话就说到这儿。", "那条路别去。我刚在那儿吃了亏。", "东边先别摸。我刚从那儿回来，不痛快。", "路上的事我就说这一句。你自己掂量。"],
    "request-help": ["这件事我自己办砸了。你要是肯，就帮我收个尾。", "我知道不该再开口。可这事确实缺你。", "帮我收个尾。你不肯，我就自己扛着。", "开口难看。这件事我一个人收不了场。"],
    "gift-item": ["这个你还是拿着。我不是来求和的。", "东西放下就走。你收不收，随你。", "礼是这个。话先说到这儿。", "你收着。我不是来把话说软的。"],
    "rendezvous-at-gate": ["门口见。我还有句话没说完。", "地宫门口等我。别在城里跟我装没看见。", "我往门口走。你要来就来，别装没听见。", "门口见一面。话没说完，别散。"],
    "ready-to-enter": ["人齐了就下。站在这儿干耗，我更烦。", "可以进了。你要是不去，现在说。", "再等就凉了。进，或者现在回我。", "人齐了就走。你不去，当面说。"],
    wait: ["先别下。这口气还没顺，我不要你一个人冲。", "等我。别把我扔在半路。", "你先守着门口。我这口气还没顺。", "先别一个人进。我随后就到。"],
    say: ["你刚才把我挡回去了。这件事我还是要问清楚。", "别岔开。我找你，就是为了刚才那件事。", "这件事我还是要问。你别装没听见。", "话不好听。我找你，就是为了把这件说开。"],
    reply: ["你这句我接了。可别指望我装得高兴。", "行，我去做。话先说到这儿。", "我听见了。事我去办，脸色你别计较。", "行。你说的那件，我去做。"],
    "voice-transmit": ["话不好听，还是要让你听见。", "人不在跟前。这句你自己看。", "符到了就看。我这会儿不想装没事。", "有句话先递过去。你回不回，随你。"],
  },
  echoing: {
    "chat-up": ["又看见你了。我过来站一会儿。", "人还在这儿。我再跟你说一声。", "路过，想再打个招呼。", "你没走远。我还有一句想当面说。"],
    greet: ["人碰见了，我再补一声招呼。", "路过再叫你。人还在就好。", "你也在。我把招呼补上。", "看见你了。这声招呼不长。"],
    "share-info": ["还有一句路上的事。前头那条路你别一个人去。", "我听到的未必全真，你自己看。", "东边那处我又想了一遍，你先别一个人去。", "口袋捂紧。城里今天不干净。"],
    "request-help": ["这件事我想请你帮忙。你要是空，就帮我这一回。", "我还是得开口。你要是不方便，就直说。", "帮我这一截。人情我记着。", "一个人我办不成。你要是空，搭把手。"],
    "gift-item": ["这个你拿着。话我们回头再说。", "你先收着。东西我已经递出来了。", "路过买的，觉得该给你。", "收下吧。我不图你现在回礼。"],
    "rendezvous-at-gate": ["门口见。你过来，我们再把行程对一下。", "地宫门口等我。别散开。", "我往门口走。你到了叫我。", "人齐了再下。门口见。"],
    "ready-to-enter": ["可以下了。进门之前，你要有话说就说。", "人齐了就走。我跟着你。", "脚下这条路，现在走。", "准备好了就进。别再耗着。"],
    wait: ["先别下。我还有一句要当面说完。", "等我到了再进。别一个人冲。", "门口等我一下。齐了再走。", "你先守着门口。我随后就到。"],
    say: ["我接着说。这句不长。", "有句话还想当面补上。", "别忙着走。我把这句说完。", "我找你，是想把这件事说清楚。"],
    reply: ["你的话我接上了。就按这个办。", "我还在。你要我做的，我做。", "行，我按你说的来。", "这句我接住了。你接着讲。"],
    "voice-transmit": ["人不在跟前。这句话我再递一次，内容换过了。", "符到了你就看。我还有一句想让你听见。", "我在别处。你要是得空，回我一声。", "有句话先送到你手里。不长。"],
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

function shortPlace(name: string | undefined): string {
  const place = name && Array.from(name).length <= 6 ? name : "这儿";
  return place;
}

function fit(lines: readonly string[]): string[] {
  return lines.filter((line) => Array.from(line).length <= SPEECH_MAX_CHARS && Array.from(line).length > 0);
}

const RECENT_LINE_TICKS = 8;
const HEARD_LINE_TICKS = 24;

function isHollowEcho(line: string): boolean {
  if (/「[^」]{2,}」/.test(line)) return false;
  return /上一句|刚才那句|刚才那事|刚才的话|那句话/.test(line);
}

function recentSpokenLines(world: WorldState, speakerId: string, listenerId: string, tick: number): string[] {
  const lines: string[] = [];
  const last = getSocialLink(world, speakerId, listenerId)?.lastSpokenLine;
  if (last) lines.push(last);
  for (const message of world.messages ?? []) {
    if (message.fromCultivatorId !== speakerId || !message.spokenLine) continue;
    const addressed = message.toCultivatorId === listenerId || message.cultivatorId === listenerId;
    if (!addressed || tick - message.tick > RECENT_LINE_TICKS) continue;
    lines.push(message.spokenLine);
  }
  return lines;
}

function concreteHeardLine(world: WorldState, speakerId: string, listenerId: string, tick: number): string | null {
  const listenerName = world.cultivators[listenerId]?.name;
  const found: { tick: number; line: string }[] = [];
  const consider = (when: number, line: string | undefined) => {
    if (!line || tick - when > HEARD_LINE_TICKS || isHollowEcho(line)) return;
    found.push({ tick: when, line });
  };
  for (const message of world.messages ?? []) {
    if (message.fromCultivatorId !== listenerId || !message.spokenLine) continue;
    const toSpeaker = message.toCultivatorId === speakerId || message.cultivatorId === speakerId;
    if (!toSpeaker) continue;
    consider(message.tick, message.spokenLine);
  }
  for (const event of world.cultivators[speakerId]?.lifeLog ?? []) {
    if (event.kind !== "quote" || event.speakerName !== listenerName) continue;
    consider(event.tick, event.line);
  }
  let best: { tick: number; line: string } | undefined;
  for (const row of found) {
    if (!best || row.tick >= best.tick) best = row;
  }
  return best?.line ?? null;
}

function echoAttachedLines(kind: SpeechKind, heard: string): string[] {
  const bare = heard.replace(/[「」"“”]/g, "").replace(/[，。！？、\s]/g, "");
  const piece = Array.from(bare).slice(0, 8).join("");
  if (Array.from(piece).length < 2) return [];
  const quoted = `「${piece}」`;
  const lines: Record<SpeechKind, readonly string[]> = {
    "chat-up": [`你说${quoted}，我过来再接一句。`, `${quoted}我听见了。当面再跟你说一声。`],
    greet: [`${quoted}我还记着。路过再打个招呼。`, `你那句${quoted}，我来补一声招呼。`],
    "share-info": [`顺着${quoted}，我再补一句路上的事。`, `${quoted}我记下了。前头你自己留神。`],
    "request-help": [`你说${quoted}。这件事我还是想请你。`, `${quoted}我听见了。这趟还得你搭把手。`],
    "gift-item": [`你说${quoted}。这个你先拿着。`, `${quoted}我还记着。东西先给你。`],
    "rendezvous-at-gate": [`你说${quoted}。门口见，我们再对一下。`, `${quoted}我听见了。地宫门口等我。`],
    "ready-to-enter": [`你说${quoted}。人齐了就可以下。`, `${quoted}我接住了。现在可以进。`],
    wait: [`你说${quoted}。先别下，等我到了。`, `${quoted}我听见了。门口等一下。`],
    say: [`接着${quoted}，我把这句说完。`, `你那句${quoted}，我当面接上。`],
    reply: [`${quoted}我接住了。接着办。`, `你说${quoted}。我按这个来。`],
    "voice-transmit": [`你说${quoted}。人不在跟前，我再递一句。`, `${quoted}我听见了。这句话先送到你手里。`],
  };
  return fit(lines[kind]);
}

function pickLine(
  pool: readonly string[],
  seed: string,
  blocked: string | readonly (string | null | undefined)[] | null,
): string {
  const banned = (Array.isArray(blocked) ? blocked : [blocked]).filter((line): line is string => Boolean(line));
  const opening = (line: string) => Array.from(line).slice(0, 4).join("");
  const usable = fit(pool);
  const source = usable.length > 0 ? usable : ["我有句话想跟你说清楚。"];
  const fresh = source.filter((line) => !banned.some((ban) => ban === line || opening(ban) === opening(line)));
  const choices = fresh.length > 0 ? fresh : source;
  let index = hashString(seed) % choices.length;
  const previous = banned[0] ?? null;
  if (choices.length > 1 && (choices[index] === previous || (previous && opening(choices[index]!) === opening(previous)))) {
    index = (index + 1) % choices.length;
  }
  return choices[index] ?? choices[0]!;
}

function favorReasonBetween(world: WorldState, speakerId: string, listenerId: string): string | undefined {
  return getSocialLink(world, speakerId, listenerId)?.owedFavors?.[0]?.reason
    ?? getSocialLink(world, listenerId, speakerId)?.owedFavors?.[0]?.reason;
}

function situationalLines(
  world: WorldState,
  speakerId: string,
  listenerId: string,
  kind: SpeechKind,
  context: SpeechContext | undefined,
): string[] {
  const speaker = world.cultivators[speakerId];
  const listener = world.cultivators[listenerId];
  if (!speaker || !listener) return [];
  const place = shortPlace(world.locations[speaker.locationId]?.name);
  const grudge = getSocialLink(world, speakerId, listenerId)?.grudge ?? 0;
  const gift = context?.giftName;
  if (grudge >= 8 && kind === "voice-transmit") {
    return fit([
      "人不在跟前。这句不好听，你自己看。",
      "符到了就看。上次那一架还没算完。",
      "话先说硬的。你回不回，随你。",
      "我在别处。这句不是来讲和的。",
    ]);
  }
  if (grudge >= 8 && kind === "gift-item" && gift) {
    return fit([
      `这${gift}你看着办。上次那一架还没算完。`,
      `${gift}放下。我不是来讲和的。`,
      `礼是这${gift}。话先说硬的。`,
    ]);
  }
  if (grudge >= 8 && (kind === "chat-up" || kind === "greet" || kind === "gift-item")) {
    return fit([
      "上次那一架还没算完。",
      "你再靠近，我就当是来再战的。",
      "礼你留着。我这边不收。",
      "话先说硬的。你要打，现在就行。",
    ]);
  }
  if (grudge >= 8 && speaker.mood?.id !== "stung" && (kind === "say" || kind === "share-info" || kind === "request-help")) {
    return fit([
      "上次那一架还没算完。",
      "你再靠近，我就当是来再战的。",
      "礼你留着。我这边不收。",
      "话先说硬的。你要打，现在就行。",
    ]);
  }
  const wounded = speaker.injuryTicksRemaining > 0 || listener.injuryTicksRemaining > 0;
  const atGate = Boolean(world.locations[speaker.locationId]?.nodeType.startsWith("dungeon") || world.locations[speaker.locationId]?.dungeon);
  const favor = context?.favorReason ?? favorReasonBetween(world, speakerId, listenerId);
  const heard = context?.heardLine ?? "";
  if (kind === "gift-item" && gift) {
    return fit([
      `这${gift}你拿着，我留着也用不上。`,
      `路过看见这${gift}，想着该给你。`,
      `${gift}先给你。我不图你现在回礼。`,
      `你把这${gift}收好。我已经从身上拿下来了。`,
    ]);
  }
  if (kind === "reply" && heard) {
    const lines: string[] = [];
    if (heard.includes("伤")) lines.push("伤我知道了。你先别硬撑。", "你都伤成这样了，还站着说。先歇一歇。");
    if (/门口|地宫/.test(heard)) lines.push("门口的事我知道了。你到了就叫我。", "地宫那头我去。你别一个人先进。");
    if (heard.includes("等")) lines.push("那我等你。你别走到半路又改主意。", "行，我在这儿等。你快点过来。");
    if (/草|人情|守/.test(heard)) lines.push("那份情我认。回头我还你。", "你说的那件事我记下了，不会装没听见。");
    if (heard.includes("灯")) lines.push("灯的事我知道了。你带着就好。", "你灯还在就行。我们一起走。");
    if (lines.length === 0) {
      lines.push("你刚才那句我接住了。接着说就行。", "我在。你要我做什么，直说。", "行，我按你刚才那句办。");
    }
    return fit(lines);
  }
  if (favor && (kind === "say" || kind === "greet" || kind === "request-help")) {
    return fit([
      `上回你${favor}，我还记着。今天把这句说开。`,
      `那份人情还在。我来，就是为了这件事。`,
      `${listener.name}，上回${favor}的事，我想当面说。`,
    ]);
  }
  if (wounded && (kind === "say" || kind === "greet" || kind === "request-help" || kind === "chat-up")) {
    const who = listener.injuryTicksRemaining > 0 ? `${listener.name}身上有伤` : "我这伤还没好";
    return fit([
      `${who}，别急着往前赶。`,
      `伤还挂着。有句话我还是得说完。`,
      `先别谈地宫。这伤不处理，人走不远。`,
    ]);
  }
  if (atGate && (kind === "chat-up" || kind === "rendezvous-at-gate" || kind === "ready-to-enter" || kind === "wait")) {
    return fit([
      `${place}的风硬。你也等在门口，一起下还是再看？`,
      "人还没齐。门口先站着，别自己进去。",
      "到门口了。你要是准备好，我们就下。",
    ]);
  }
  return [];
}

function placeLines(world: WorldState, speakerId: string): string[] {
  const speaker = world.cultivators[speakerId];
  const place = shortPlace(speaker ? world.locations[speaker.locationId]?.name : undefined);
  return fit([
    `${place}这会儿我看见你了，过来打个招呼。`,
    `我在${place}歇脚，你要是也歇，我们可以说两句。`,
  ]);
}

function assertAddress(world: WorldState, speakerId: string, listenerId: string, line: string): void {
  const listener = world.cultivators[listenerId];
  if (!listener) return;
  if (line.includes(listener.name)) return;
  for (const person of Object.values(world.cultivators)) {
    if (person.id === speakerId || person.id === listenerId || !person.name) continue;
    if (line.includes(person.name)) {
      throw new GameplayRejection(`这句话是在叫${person.name}。你要说给${listener.name}听。`);
    }
    const surname = Array.from(person.name)[0];
    if (!surname || listener.name.startsWith(surname)) continue;
    if (new RegExp(`${surname}${HONORIFIC}`).test(line)) {
      throw new GameplayRejection(`这句话是在叫别人。你要说给${listener.name}听。`);
    }
  }
  for (const message of world.messages ?? []) {
    if (message.toCultivatorId !== speakerId || !message.spokenLine || message.spokenAnswered) continue;
    if (message.fromCultivatorId && message.fromCultivatorId !== listenerId && message.spokenLine === line) {
      const other = world.cultivators[message.fromCultivatorId]?.name ?? "别人";
      throw new GameplayRejection(`这句话是${other}的。你要回的是${listener.name}。`);
    }
  }
}

export function errandLine(
  world: WorldState,
  speakerId: string,
  listenerId: string,
  purpose: "ask-fetch" | "ask-escort" | "ask-guard" | "ask-deliver" | "accept" | "note",
  supplied: string | null | undefined,
  detail?: { herb?: string; thirdName?: string; heard?: string },
): string {
  const cleaned = cleanSpokenLine(supplied);
  if (cleaned) {
    assertAddress(world, speakerId, listenerId, cleaned);
    return cleaned;
  }
  const herb = detail?.herb ?? "云心草";
  const third = detail?.thirdName ?? "那个人";
  const heard = detail?.heard ?? "";
  const pools: Record<typeof purpose, string[]> = {
    "ask-fetch": [
      `帮我带一株${herb}回来。路上小心。`,
      `我缺一株${herb}。你要是肯跑一趟，我记你的情。`,
      `${herb}我自己腾不出手。你帮我采一株。`,
    ],
    "ask-escort": [
      "你把我送到地宫门口就行。我一个人走不踏实。",
      "陪我走到门口。到了你就可以回头。",
      "这趟路我想有个人跟着。你送到门口就好。",
    ],
    "ask-guard": [
      "我要闭关。你在洞府外守一守，别让人闯进来。",
      "破境的时候我顾不上门外。你替我守一会儿。",
      "洞府外面得有个人。你肯守的话，我就放心。",
    ],
    "ask-deliver": [
      `这株${herb}帮我送到${third}手里。人不在也没关系。`,
      `${third}在别处。你把${herb}带过去就行。`,
      `帮我跑一趟，把${herb}交给${third}。`,
    ],
    accept: [
      "行，这事我应下了。你等我的信。",
      "我去办。办成了你再谢我。",
      "说定了。我接下来就去。",
    ],
    note: heard.includes("门口")
      ? ["门口的话我看见了。人还在，你别急。", "字条我看了。城门口的事我知道。"]
      : [
          "字条我看见了。人还在，你别急。",
          "你留的话我读了。回头见面再说。",
          "我看见了。你要我做的，我会去办。",
        ],
  };
  return pickLine(pools[purpose], `${speakerId}:${listenerId}:${world.tick}:${purpose}`, null);
}

export function openSpokenLine(
  world: WorldState,
  speakerId: string,
  listenerId: string,
  kind: SpeechKind,
  tick: number,
  supplied?: string | null,
  context?: SpeechContext,
): string {
  const cleaned = cleanSpokenLine(supplied);
  if (cleaned) assertAddress(world, speakerId, listenerId, cleaned);
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
  const blocked = recentSpokenLines(world, speakerId, listenerId, tick);
  const previous = blocked[0] ?? speakerLink?.lastSpokenLine ?? null;
  if (cleaned && previous === cleaned && recentPair) {
    throw new GameplayRejection("这句话刚说过。换一句，或等几刻。");
  }
  const scene = situationalLines(world, speakerId, listenerId, kind, context);
  const gossipLine = !cleaned && scene.length === 0 && GOSSIP_KINDS.has(kind) ? takeGossipLine(world, speakerId, previous) : null;
  const speakerMood = world.cultivators[speakerId]?.mood?.id;
  const heardConcrete = speakerMood === "echoing" ? concreteHeardLine(world, speakerId, listenerId, tick) : null;
  const echoLines = heardConcrete ? echoAttachedLines(kind, heardConcrete) : [];
  const flavored = echoLines.length > 0
    ? echoLines
    : speakerMood && speakerMood !== "steady" && speakerMood !== "echoing"
      ? MOOD_LINE_POOLS[speakerMood]?.[kind]
      : undefined;
  let line = cleaned ?? (scene.length > 0 ? pickLine(scene, `${speakerId}:${listenerId}:${tick}:${kind}:scene`, blocked) : null) ?? gossipLine;
  if (!line) {
    const mooded = flavored && flavored.length > 0 ? flavored : null;
    const pool = mooded ?? [...POOLS[kind], ...((kind === "chat-up" || kind === "greet") ? placeLines(world, speakerId) : [])];
    line = pickLine(pool, `${speakerId}:${listenerId}:${tick}:${kind}`, blocked);
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
  const speaker = world.cultivators[speakerId];
  const listener = world.cultivators[listenerId];
  if (speaker && listener) recordSpokenEcho(world, speaker, listener, line);
  return line;
}
