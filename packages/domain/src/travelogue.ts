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
  if (cultivator.mood?.sentence) {
    const badlyHurt = cultivator.injuryTicksRemaining >= 6;
    const moodIsHurt = cultivator.mood.cause === "wound" || cultivator.mood.cause === "loss";
    if (badlyHurt && !moodIsHurt) return "带伤，心气发沉";
    if (!inDungeon || moodIsHurt || cultivator.mood.cause === "win" || cultivator.mood.cause === "breakthrough") {
      return cultivator.mood.sentence;
    }
  }
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

const SETTLED_MOMENTS: Record<string, readonly TravelNote[]> = {
  meditate: [
    {
      tick: 0,
      kind: "mood",
      title: "调息",
      detail: "找了处背风的地方把气沉下去。没有突破，只是胸口那点乱慢慢平了。",
      locationId: "",
      mood: "呼吸长了一点",
    },
    {
      tick: 0,
      kind: "insight",
      title: "静坐里的杂念",
      detail: "本来想炼气，脑子里先过了一遍今天见过的人。收功时才发现灵力比坐下时厚了一丝。",
      locationId: "",
      mood: "心还没静透，气倒是顺了",
    },
  ],
  cultivate: [
    {
      tick: 0,
      kind: "insight",
      title: "周天转完",
      detail: "功法走完一个周天，丹田发热。离破境还远，可进度不再是零。",
      locationId: "",
      mood: "还在长",
    },
    {
      tick: 0,
      kind: "mood",
      title: "闭关到一半走神",
      detail: "运转到中段时想起城门口的灯火。走神了一息，又把气拉回来。",
      locationId: "",
      mood: "想出去看看，又舍不得这点进境",
    },
  ],
  heal: [
    {
      tick: 0,
      kind: "injury",
      title: "把伤口重新包上",
      detail: "药味压过了血腥。伤还在，至少走路不再一抽一抽地疼。",
      locationId: "",
      mood: "能走了",
    },
  ],
  travel: [
    {
      tick: 0,
      kind: "mood",
      title: "到了一处新地方",
      detail: "路走到头，风和上一站不一样。先站了一会儿，才去看这地方有什么可做的。",
      locationId: "",
      mood: "脚还热着",
    },
    {
      tick: 0,
      kind: "person",
      title: "路上擦肩",
      detail: "进城的人很多，有一个跟你对视了一眼，又各自走了。名字都没问。",
      locationId: "",
      mood: "人来人往，自己也是其中一个",
    },
  ],
  mine: [
    {
      tick: 0,
      kind: "find",
      title: "矿脉里的一下",
      detail: "镐尖磕开一块温热的矿。灵石进了袋，手也震得发麻。",
      locationId: "",
      mood: "累，但袋子沉了",
    },
    {
      tick: 0,
      kind: "close-call",
      title: "矿洞落石",
      detail: "头顶碎石掉了一阵。人躲开了，袖子上全是灰。",
      locationId: "",
      mood: "还想再挖一会儿，也想出去",
    },
  ],
};

export function settledMoment(actionKey: string, seed: number): TravelNote | null {
  const pool = SETTLED_MOMENTS[actionKey];
  if (!pool || pool.length === 0) {
    return null;
  }
  const picked = pool[Math.abs(seed) % pool.length]!;
  return { ...picked };
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
