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
};

/** Generated lines when the speaker's mood is no longer steady. Each line stays within 40 characters. */
export const MOOD_LINE_POOLS: Record<Exclude<MoodId, "steady">, Record<SpeechKind, readonly string[]>> = {
  lifted: {
    "chat-up": ["刚打完一场，看见你也想说两句。", "今天走路都轻，过来跟你打个招呼。"],
    greet: ["我刚顺过来，路过就跟你说一声。", "你也在。我今天高兴，想跟你多站一会儿。"],
    "share-info": ["我刚从那条路回来，坑在左边，你绕开。", "今天顺，路上的事我跟你说清楚。"],
    "request-help": ["我这会儿有劲，可这件事还是得两个人。", "你要是空，帮我把这趟走完。"],
    "gift-item": ["这个你拿着。我刚高兴，不想再拎着。", "路过买的，觉得该给你，你就收。"],
    "rendezvous-at-gate": ["我先去地宫门口。你也过来，别让我白等。", "门口见。我今天想下去看看。"],
    "ready-to-enter": ["人齐了就下。我这口气还热着。", "可以进了。你跟着我，别拉开。"],
    wait: ["你先别下。我想跟你一起进。", "门口等我一下。我马上到，别自己冲。"],
    say: ["刚打完一场，还热着。有句话我想现在说。", "今天顺，所以我把这句当面告诉你。"],
    reply: ["你这句我接住了。我现在就去办。", "行。你说的那件，我跟着做。"],
  },
  sore: {
    "chat-up": ["我走得慢，还是想过来跟你说一声。", "伤没好全。你要是不忙，听我说两句。"],
    greet: ["人还在。我身上不利索，招呼短一点。", "我看见你了。别让我站太久。"],
    "share-info": ["前头不安全。我走不快，你自己留神。", "那条路有人蹲着。我伤着，没法陪你去看。"],
    "request-help": ["我这伤还在，这件事搬不动，你搭把手。", "一个人我吃力。你要是空，就帮我这一回。"],
    "gift-item": ["这个你拿着。我身上有伤，自己用不上。", "伤还没好，东西先给你，别推回来。"],
    "rendezvous-at-gate": ["我走得慢。你到门口等我，别先进去。", "地宫门口见。我得歇一歇再过去。"],
    "ready-to-enter": ["可以下了，你走慢一点。我跟得上。", "人齐了再进。我这伤经不起再跑。"],
    wait: ["先别下。我还在路上，伤着走不快。", "门口等我。别一个人冲进去。"],
    say: ["伤还在身上。这句话我还是想当面说完。", "别让我站太久。有件事我得告诉你。"],
    reply: ["你说的我听见，人还不利索，可我会去办。", "行。你先走，我拖着这伤随后到。"],
  },
  warm: {
    "chat-up": ["看见你就想过来。今天不谈大事，说两句就好。", "我记着你先前那份好。过来打个招呼。"],
    greet: ["你也在。我专门绕过来跟你说一声。", "人碰见了。你要是有空，我们站一会儿。"],
    "share-info": ["有句话我只告诉你。前头那处先别一个人去。", "路上的事我跟你说。你听完自己定。"],
    "request-help": ["跟你开口不难。这事我需要你帮一手。", "我想请你。你要是不方便，就直接说。"],
    "gift-item": ["这个你收着。我不是来让你还礼的。", "给你的。你先前帮过我，我记到现在。"],
    "rendezvous-at-gate": ["门口见一面再下。我想跟你一起走。", "地宫门口等我。人齐了再进。"],
    "ready-to-enter": ["可以下了。你在旁边，我踏实些。", "人齐了。进吧，我跟着你。"],
    wait: ["你先别下。我想跟你一起进门。", "等我一下。我马上到，别自己走。"],
    say: ["你先前那份心意我还记着，所以过来跟你说。", "我不是来客套的。有件事想跟你说清楚。"],
    reply: ["你的话我接着。需要我做的，我去做。", "行，我按你说的来。你放心。"],
  },
  stung: {
    "chat-up": ["我这会儿不痛快，还是想把招呼打了。", "话不好听。看见你，我还是要说一声。"],
    greet: ["人我看见了。今天这句短，你别多心。", "我过来打个招呼。别的事等一下再说。"],
    "share-info": ["前头有人盯着。我心情差，话就说到这儿。", "那条路别去。我刚在那儿吃了亏。"],
    "request-help": ["这件事我自己办砸了。你要是肯，就帮我收个尾。", "我知道不该再开口。可这事确实缺你。"],
    "gift-item": ["这个你还是拿着。我不是来求和的。", "东西放下就走。你收不收，随你。"],
    "rendezvous-at-gate": ["门口见。我还有句话没说完。", "地宫门口等我。别在城里跟我装没看见。"],
    "ready-to-enter": ["人齐了就下。站在这儿干耗，我更烦。", "可以进了。你要是不去，现在说。"],
    wait: ["先别下。这口气还没顺，我不要你一个人冲。", "等我。别把我扔在半路。"],
    say: ["你刚才把我挡回去了。这件事我还是要问清楚。", "别岔开。我找你，就是为了刚才那件事。"],
    reply: ["你这句我接了。可别指望我装得高兴。", "行，我去做。话先说到这儿。"],
  },
  echoing: {
    "chat-up": ["你刚才那句还在我耳朵里。我再跟你说一声。", "我还想着上一句，看见你就过来了。"],
    greet: ["你那句话我还没答完。人碰见了，我补一声。", "路过再叫你。刚才那事还没落地。"],
    "share-info": ["接着刚才那句说。前头那条路你别一个人去。", "还有一句。我听到的未必全真，你自己看。"],
    "request-help": ["刚才那句还在。这件事我想请你帮忙。", "我还是得开口。你要是空，就帮我这一回。"],
    "gift-item": ["配上刚才那句话，这个你拿着。", "你先收着。上一句的事，我们回头再说。"],
    "rendezvous-at-gate": ["门口我们把刚才那句说完。你过来。", "地宫门口见。别让那句话吊着。"],
    "ready-to-enter": ["可以下了。刚才的话，进门之前说完。", "人齐了就走。那句我还记着。"],
    wait: ["先别下。刚才那句还没说完。", "等我到了再进。话也一起说完。"],
    say: ["你刚才那句我还在想。我接着说。", "上一句没完，我补这一句。"],
    reply: ["你前面那句我接上了。就按这个办。", "那句我还在想。你要我做的，我做。"],
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

function pickLine(pool: readonly string[], seed: string, previous: string | null): string {
  const usable = fit(pool);
  const source = usable.length > 0 ? usable : ["我有句话想跟你说清楚。"];
  let index = hashString(seed) % source.length;
  const opening = (line: string) => Array.from(line).slice(0, 4).join("");
  if (source.length > 1 && (source[index] === previous || (previous && opening(source[index]!) === opening(previous)))) {
    index = (index + 1) % source.length;
  }
  return source[index] ?? source[0]!;
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
  const wounded = speaker.injuryTicksRemaining > 0 || listener.injuryTicksRemaining > 0;
  const atGate = Boolean(world.locations[speaker.locationId]?.nodeType.startsWith("dungeon") || world.locations[speaker.locationId]?.dungeon);
  const favor = context?.favorReason ?? favorReasonBetween(world, speakerId, listenerId);
  const heard = context?.heardLine ?? "";
  const gift = context?.giftName;
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
  const previous = speakerLink?.lastSpokenLine ?? null;
  if (cleaned && previous === cleaned && recentPair) {
    throw new GameplayRejection("这句话刚说过。换一句，或等几刻。");
  }
  const scene = situationalLines(world, speakerId, listenerId, kind, context);
  const gossipLine = !cleaned && scene.length === 0 && GOSSIP_KINDS.has(kind) ? takeGossipLine(world, speakerId, previous) : null;
  const speakerMood = world.cultivators[speakerId]?.mood?.id;
  const flavored = speakerMood && speakerMood !== "steady" ? MOOD_LINE_POOLS[speakerMood]?.[kind] : undefined;
  let line = cleaned ?? (scene.length > 0 ? pickLine(scene, `${speakerId}:${listenerId}:${tick}:${kind}:scene`, previous) : null) ?? gossipLine;
  if (!line) {
    const mooded = flavored && flavored.length > 0 ? flavored : null;
    const pool = mooded ?? [...POOLS[kind], ...((kind === "chat-up" || kind === "greet") ? placeLines(world, speakerId) : [])];
    line = pickLine(pool, `${speakerId}:${listenerId}:${tick}:${kind}`, previous);
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
