/**
 * Party wakes inside a shared dungeon run.
 *
 * A solo run still uses the older route wakes. When companions came through the
 * gate, the run pauses three times. On 丙 and 甲 those are a wound, the loot,
 * and an unclaimed find. On 乙 the middle pause is that floor's own favor.
 * The choice stays open for ten ticks, the same window as a solo dungeon wake.
 * If the votes never lock, the timeout keeps the safe side even when the
 * posture is aggressive. The paired 上回你… lines are written when the run
 * ends, so they still sit inside the six-tick digest.
 */

import { partyRoleForCultivator } from "./combat-skills.js";
import { recordLife, shiftCultivatorMood } from "./inner-life.js";
import { yiPlaceForRank } from "./yi-midrun.js";
import type {
  Cultivator,
  DungeonBeat,
  DungeonExpeditionPolicy,
  DungeonExpeditionProgress,
  PartyExpeditionMoment,
  PartyWakeKind,
  WakeNode,
  WorldState,
} from "./model.js";
import { addMutualAffinity, addMutualGrudge, getSocialLink, grantOwedFavor } from "./social.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

const PARTY_WAKE_TIMEOUT_TICKS = 10;
const SHORTCUT_STONES = 12;
const SEIZE_STONES = 10;
const CRACK_GRUDGE = 3;
const LEAVE_GRUDGE = 2;

const HARMFUL_PARTY_OPTIONS = new Set(["leave-wound", "take-shortcut", "seize-treasure", "take-opening"]);

export function isHarmfulPartyOption(optionId: string): boolean {
  return HARMFUL_PARTY_OPTIONS.has(optionId);
}

function companionIdsOf(progress: DungeonExpeditionProgress): string[] {
  if (progress.companionIds && progress.companionIds.length > 0) return progress.companionIds;
  return progress.companionId ? [progress.companionId] : [];
}

export function partyWakeAwaitingIds(world: WorldState, progress: DungeonExpeditionProgress): string[] {
  const ids = [progress.cultivatorId, ...companionIdsOf(progress)];
  const seen = new Set<string>();
  const awaiting: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const person = world.cultivators[id];
    if (!person || person.locationId !== progress.locationId) continue;
    if (id !== progress.cultivatorId && person.activeJobId) continue;
    awaiting.push(id);
  }
  return awaiting;
}

function tallyVotes(node: WakeNode, awaitingIds: readonly string[]): { counts: Map<string, number>; voted: number } {
  const allowed = new Set(awaitingIds);
  const counts = new Map<string, number>();
  const seen = new Set<string>();
  for (const vote of node.votes ?? []) {
    if (!allowed.has(vote.cultivatorId) || seen.has(vote.cultivatorId)) continue;
    if (!node.options.some((option) => option.optionId === vote.optionId)) continue;
    seen.add(vote.cultivatorId);
    counts.set(vote.optionId, (counts.get(vote.optionId) ?? 0) + 1);
  }
  return { counts, voted: seen.size };
}

function lockedOptionId(node: WakeNode, awaitingIds: readonly string[]): string | null {
  if (awaitingIds.length === 0) return null;
  const { counts, voted } = tallyVotes(node, awaitingIds);
  const remaining = awaitingIds.length - voted;
  let bestId = "";
  let best = 0;
  let second = 0;
  for (const [id, count] of counts) {
    if (count > best) {
      second = best;
      best = count;
      bestId = id;
    } else if (count > second) {
      second = count;
    }
  }
  if (!bestId) return null;
  if (best > second + remaining) return bestId;
  return null;
}

export function partyWakeIsReady(node: WakeNode, awaitingIds: readonly string[]): boolean {
  if (awaitingIds.length === 0) return true;
  if (lockedOptionId(node, awaitingIds)) return true;
  const voted = new Set((node.votes ?? []).map((vote) => vote.cultivatorId));
  return awaitingIds.every((id) => voted.has(id));
}

function harmfulOptionId(node: WakeNode): string | null {
  return node.options.find((option) => isHarmfulPartyOption(option.optionId))?.optionId ?? null;
}

/**
 * A strict majority is kept. Otherwise the posture is consulted, and a pick
 * that would open a crack or take the loot is replaced by the safe option.
 */
export function partyWakeResolvedOption(
  node: WakeNode,
  awaitingIds: readonly string[],
  posture: DungeonExpeditionPolicy,
): string {
  const locked = lockedOptionId(node, awaitingIds);
  if (locked) return locked;
  const safe = node.safeOptionId ?? node.defaultOptionId;
  const posturePick = posture === "aggressive" ? (harmfulOptionId(node) ?? safe) : safe;
  if (isHarmfulPartyOption(posturePick)) return safe;
  return posturePick;
}

export function recordPartyWakeVote(
  progress: DungeonExpeditionProgress,
  cultivatorId: string,
  optionId: string,
): DungeonExpeditionProgress {
  const node = progress.pendingWakeNode;
  if (!node) return progress;
  const votes = (node.votes ?? []).filter((vote) => vote.cultivatorId !== cultivatorId);
  votes.push({ cultivatorId, optionId });
  return {
    ...progress,
    pendingWakeNode: { ...node, votes },
  };
}

function mostInjured(people: readonly Cultivator[]): Cultivator | null {
  const wounded = people.filter((person) => person.injuryTicksRemaining > 0);
  wounded.sort((left, right) => right.injuryTicksRemaining - left.injuryTicksRemaining);
  return wounded[0] ?? null;
}

export function createPartyExpeditionWake(input: {
  progress: DungeonExpeditionProgress;
  leader: Cultivator;
  companions: readonly Cultivator[];
}): { node: WakeNode; kind: PartyWakeKind; bruise?: { cultivatorId: string; ticks: number } } | null {
  const { progress, leader, companions } = input;
  if (companions.length === 0) return null;
  if (progress.wakeNodesEncountered >= progress.maxWakeNodes || progress.pendingWakeNode) return null;
  const done = new Set(progress.partyWakeKinds ?? []);
  const step = progress.stepIndex;
  const nodeId = `dungeon-wake-${progress.jobId}-${step}`;
  if (step === 3 && !done.has("tend-wound")) {
    const present = [leader, ...companions];
    const subject = mostInjured(present) ?? companions[0] ?? leader;
    const already = subject.injuryTicksRemaining;
    return {
      kind: "tend-wound",
      bruise: already > 0 ? undefined : { cultivatorId: subject.id, ticks: 2 },
      node: {
        nodeId: `${nodeId}-tend`,
        partyKind: "tend-wound",
        subjectId: subject.id,
        context: already > 0
          ? `${subject.name}的伤还挂着，还有${already}刻。旁边的人可以伸手压一压，也可以当没看见。`
          : `${subject.name}的肩被阵纹擦开了，血往袖子里渗。旁边的人可以伸手把伤压住，也可以当没看见。`,
        options: [
          {
            optionId: "tend-companion",
            label: "伸手压伤",
            description: "耗一点灵力，或者用身上的疗伤丹。伤会轻一些，这一手记成替对方挡了一剑。",
          },
          {
            optionId: "leave-wound",
            label: "先顾自己",
            description: "伤先挂着。这一手不重，可旁边的人会记得。",
          },
        ],
        defaultOptionId: "tend-companion",
        safeOptionId: "tend-companion",
        timeoutTicks: PARTY_WAKE_TIMEOUT_TICKS,
        votes: [],
      },
    };
  }
  if (step === 6 && progress.grade === "乙" && !done.has("floor-bond")) {
    const place = yiPlaceForRank(progress.targetRank);
    const copy = floorBondCopy(place);
    const subject = pressedCompanion(companions);
    return {
      kind: "floor-bond",
      node: {
        nodeId: `${nodeId}-bond`,
        partyKind: "floor-bond",
        subjectId: subject.id,
        context: copy.context(subject.name),
        options: [
          {
            optionId: "cover-mate",
            label: copy.coverLabel,
            description: copy.coverDescription,
          },
          {
            optionId: "take-opening",
            label: copy.takeLabel,
            description: copy.takeDescription,
          },
        ],
        defaultOptionId: "cover-mate",
        safeOptionId: "cover-mate",
        timeoutTicks: PARTY_WAKE_TIMEOUT_TICKS,
        votes: [],
      },
    };
  }
  if (step === 6 && !done.has("loot-contention")) {
    return {
      kind: "loot-contention",
      node: {
        nodeId: `${nodeId}-loot`,
        partyKind: "loot-contention",
        context: "石室角落堆着还没凉的灵石，旁边一条更暗的短路。让出去，大家一起慢走。先拿、钻短路，脚下是快了，身后的人会记着。",
        options: [
          {
            optionId: "yield-loot",
            label: "把这一份让出去",
            description: "灵石留在队里。让的人记一笔人情。",
          },
          {
            optionId: "take-shortcut",
            label: "走短路先拿",
            description: "自己多拿一些。队里会裂一道不深的缝。",
          },
        ],
        defaultOptionId: "yield-loot",
        safeOptionId: "yield-loot",
        timeoutTicks: PARTY_WAKE_TIMEOUT_TICKS,
        votes: [],
      },
    };
  }
  if (step === 8 && !done.has("treasure-split")) {
    return {
      kind: "treasure-split",
      node: {
        nodeId: `${nodeId}-treasure`,
        partyKind: "treasure-split",
        context: "壁缝里卡着一件还没人认领的东西，灯一照就看见了。可以当面分开，让给身上有伤的人，或者先伸手。",
        options: [
          {
            optionId: "split-treasure",
            label: "当面分开",
            description: "谁也不多拿。",
          },
          {
            optionId: "yield-treasure",
            label: "让给伤重的人",
            description: "有伤就归伤重的。没有伤，就归这一趟灵石最少的那个。",
          },
          {
            optionId: "seize-treasure",
            label: "先伸手",
            description: "东西进自己口袋。这一手不重，旁边的人会记得。",
          },
        ],
        defaultOptionId: "split-treasure",
        safeOptionId: "split-treasure",
        timeoutTicks: PARTY_WAKE_TIMEOUT_TICKS,
        votes: [],
      },
    };
  }
  return null;
}

export function partyWakePublicFields(world: WorldState, progress: DungeonExpeditionProgress): {
  partyKind: PartyWakeKind;
  safeOptionId: string;
  subjectId?: string;
  subjectName?: string;
  votedIds: string[];
  awaitingNames: string[];
} | null {
  const node = progress.pendingWakeNode;
  if (!node?.partyKind) return null;
  const subject = node.subjectId ? world.cultivators[node.subjectId] : undefined;
  return {
    partyKind: node.partyKind,
    safeOptionId: node.safeOptionId ?? node.defaultOptionId,
    ...(node.subjectId ? { subjectId: node.subjectId } : {}),
    ...(subject ? { subjectName: subject.name } : {}),
    votedIds: (node.votes ?? []).map((vote) => vote.cultivatorId),
    awaitingNames: partyWakeAwaitingIds(world, progress)
      .map((id) => world.cultivators[id]?.name)
      .filter((name): name is string => Boolean(name)),
  };
}

function votersFor(node: WakeNode, awaitingIds: readonly string[], optionId: string): string[] {
  const allowed = new Set(awaitingIds);
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const vote of node.votes ?? []) {
    if (vote.optionId !== optionId || !allowed.has(vote.cultivatorId) || seen.has(vote.cultivatorId)) continue;
    seen.add(vote.cultivatorId);
    ids.push(vote.cultivatorId);
  }
  return ids;
}

function people(world: WorldState, ids: readonly string[]): Cultivator[] {
  return ids
    .map((id) => world.cultivators[id])
    .filter((person): person is Cultivator => Boolean(person));
}

function shiftMorality(person: Cultivator, delta: number): void {
  person.moralityScore = Math.max(-100, Math.min(100, Math.round(person.moralityScore + delta)));
}

function syncWound(person: Cultivator): void {
  person.statusEffects = person.statusEffects.filter((effect) => effect.id !== "wounded");
  if (person.injuryTicksRemaining > 0) {
    person.statusEffects.push({
      id: "wounded",
      name: "Wounded",
      description: "Risky actions are restricted.",
      source: "injury",
      remainingTicks: person.injuryTicksRemaining,
      intensity: 1,
    });
  }
}

function canPayTend(person: Cultivator): boolean {
  if ((person.inventory["healing-pill"] ?? 0) > 0) return true;
  return person.spiritualPower >= Math.max(4, Math.round(person.maxSpiritualPower * 0.08));
}

function payTend(person: Cultivator): boolean {
  if ((person.inventory["healing-pill"] ?? 0) > 0) {
    person.inventory["healing-pill"] -= 1;
    return true;
  }
  const cost = Math.max(4, Math.round(person.maxSpiritualPower * 0.08));
  if (person.spiritualPower < cost) return false;
  person.spiritualPower -= cost;
  return true;
}

function healerRank(person: Cultivator): number {
  try {
    return partyRoleForCultivator(person).id === "support" ? 0 : 1;
  } catch {
    return 1;
  }
}

function pickHealer(candidates: readonly Cultivator[]): Cultivator | null {
  const ordered = [...candidates].sort((left, right) => {
    const role = healerRank(left) - healerRank(right);
    if (role !== 0) return role;
    return right.spiritualPower - left.spiritualPower;
  });
  return ordered.find((person) => canPayTend(person)) ?? null;
}

function alreadyOwes(world: WorldState, creditorId: string, debtorId: string, reason: string): boolean {
  return (getSocialLink(world, creditorId, debtorId)?.owedFavors ?? []).some((row) => row.reason === reason);
}

function remember(
  progress: DungeonExpeditionProgress,
  moment: PartyExpeditionMoment,
): DungeonExpeditionProgress {
  return {
    ...progress,
    partyMoments: [...(progress.partyMoments ?? []), moment].slice(-8),
  };
}

function finishWake(
  progress: DungeonExpeditionProgress,
  beat: DungeonBeat,
  extra?: Partial<DungeonExpeditionProgress>,
): DungeonExpeditionProgress {
  return {
    ...progress,
    ...extra,
    beats: [...(progress.beats ?? []), beat].slice(-8),
    pendingWakeNode: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: progress.resolvedWakeNodeCount + 1,
  };
}

function postureName(posture: DungeonExpeditionPolicy): string {
  if (posture === "conservative") return "保守";
  if (posture === "aggressive") return "冒进";
  return "均衡";
}

function timeoutClause(timedOut: boolean, posture: DungeonExpeditionPolicy, fellBack: boolean): string {
  if (!timedOut || !fellBack) return "";
  return `时辰到了，还有人没开口。这一趟是${postureName(posture)}，可没人把抢和弃伤说死，就先按不伤情分的那边收。`;
}

function sceneNote(world: WorldState, peopleToTell: readonly Cultivator[], title: string, detail: string, mood: string): void {
  for (const person of peopleToTell) {
    pushTravelNote(person, travelNote({
      tick: world.tick,
      kind: "person",
      title,
      detail,
      locationId: person.locationId,
      mood,
    }));
  }
}

function resolveTend(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  optionId: string,
  awaitingIds: readonly string[],
  timedOut: boolean,
): DungeonExpeditionProgress {
  const node = progress.pendingWakeNode;
  const subject = node?.subjectId ? world.cultivators[node.subjectId] : undefined;
  const present = people(world, awaitingIds);
  const fellBack = timedOut && optionId === (node?.safeOptionId ?? "tend-companion");
  const tail = timeoutClause(timedOut, progress.policy, fellBack);
  if (!subject) {
    return finishWake(progress, {
      kind: "mood",
      title: "伤已经不在了",
      detail: `要压的人已经不在这一趟里。${tail}`,
      mood: "这一手没处落",
    });
  }
  if (optionId === "leave-wound") {
    const leavers = people(world, votersFor(node!, awaitingIds, "leave-wound"));
    for (const leaver of leavers) {
      if (leaver.id === subject.id) continue;
      addMutualGrudge(world, leaver.id, subject.id, LEAVE_GRUDGE);
      shiftMorality(leaver, -1);
    }
    const names = (leavers.length > 0 ? leavers : present.filter((person) => person.id !== subject.id))
      .map((person) => person.name)
      .join("、");
    const detail = `${names || "旁边的人"}看见${subject.name}挂着伤，先顾了自己。缝不深，人会记得。${tail}`;
    sceneNote(world, present, "先顾了自己", detail, "这一手会记得");
    const actor = leavers.find((person) => person.id !== subject.id) ?? present.find((person) => person.id !== subject.id);
    let next = progress;
    if (actor) {
      shiftCultivatorMood(world, subject, "rejection", `${actor.name}看见伤，先走了。`);
      next = remember(progress, {
        kind: "crack",
        actorId: actor.id,
        otherId: subject.id,
        actorLine: `上回我看见你挂着伤，先走了。`,
        pairedLine: `上回你看见我挂着伤，先走了。`,
        witnessLine: `${actor.name}看见${subject.name}挂着伤，先走了。同队的人都看见了。`,
        witnessIds: awaitingIds.filter((id) => id !== actor.id && id !== subject.id),
      });
    }
    return finishWake(next, { kind: "injury", title: "先顾了自己", detail, mood: "缝不深" });
  }

  const voters = votersFor(node!, awaitingIds, "tend-companion");
  const pool = people(world, voters.length > 0 ? voters : awaitingIds).filter((person) => person.id !== subject.id);
  const healer = subject.injuryTicksRemaining > 0 ? pickHealer(pool) : null;
  if (!healer || subject.injuryTicksRemaining <= 0) {
    const detail = subject.injuryTicksRemaining <= 0
      ? `${subject.name}的伤已经压下去了。这一趟不用再伸一次手。${tail}`
      : `${subject.name}的伤还挂着。旁边的人想伸手，灵力不够，身上也没有疗伤丹。${tail}`;
    sceneNote(world, present, "伤还在", detail, "手伸了，没压住");
    const next = remember(progress, {
      kind: "memory",
      actorId: (pool[0] ?? subject).id,
      otherId: subject.id,
      actorLine: subject.injuryTicksRemaining <= 0 ? `上回你的伤已经压下去了。` : `上回我想替你压伤，灵力不够。`,
      pairedLine: subject.injuryTicksRemaining <= 0 ? `上回我的伤已经压下去了。` : `上回你想替我压伤，灵力不够。`,
      witnessLine: detail,
      witnessIds: awaitingIds.filter((id) => id !== subject.id && id !== (pool[0]?.id ?? "")),
    });
    return finishWake(next, { kind: "injury", title: "伤还在", detail, mood: "手没压住" });
  }

  const usedPill = (healer.inventory["healing-pill"] ?? 0) > 0;
  payTend(healer);
  const cleared = usedPill ? 5 : 3;
  subject.injuryTicksRemaining = Math.max(0, subject.injuryTicksRemaining - cleared);
  syncWound(subject);
  if (!alreadyOwes(world, healer.id, subject.id, "替我挡了一剑")) {
    grantOwedFavor(world, healer.id, subject.id, "替我挡了一剑", "party-wake");
  }
  addMutualAffinity(world, healer.id, subject.id, 1);
  shiftMorality(healer, 1);
  const how = usedPill ? `${healer.name}用了一枚疗伤丹` : `${healer.name}耗了一点灵力`;
  const detail = `${how}，按住${subject.name}的肩，把血口压住了。还剩${subject.injuryTicksRemaining}刻。${subject.name}欠这一手。${tail}`;
  sceneNote(world, present, `${healer.name}压了伤`, detail, "伤轻了一点");
  shiftCultivatorMood(world, subject, "gift", `${healer.name}把伤压住了，这一手还热着。`);
  const tended = `${healer.name}给${subject.name}把伤压了下去。`;
  const next = remember(progress, {
    kind: "favor",
    actorId: healer.id,
    otherId: subject.id,
    reason: "替我挡了一剑",
    actorLine: "上回我替你挡了一剑。",
    pairedLine: "上回你替我挡了一剑。",
    witnessLine: `${healer.name}替${subject.name}挡了一剑。同队的人都看见了。`,
    witnessIds: awaitingIds.filter((id) => id !== healer.id && id !== subject.id),
  });
  return finishWake(next, { kind: "person", title: "伸手压伤", detail, mood: "这一手还热着" }, {
    tendedLines: [...(progress.tendedLines ?? []), tended].slice(-2),
  });
}

function poorest(candidates: readonly Cultivator[]): Cultivator | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) => left.spiritStones - right.spiritStones)[0] ?? null;
}

function richest(candidates: readonly Cultivator[]): Cultivator | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) => right.spiritStones - left.spiritStones)[0] ?? null;
}

function resolveLoot(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  optionId: string,
  awaitingIds: readonly string[],
  timedOut: boolean,
): DungeonExpeditionProgress {
  const node = progress.pendingWakeNode!;
  const present = people(world, awaitingIds);
  const fellBack = timedOut && optionId === (node.safeOptionId ?? "yield-loot");
  const tail = timeoutClause(timedOut, progress.policy, fellBack);
  if (optionId === "take-shortcut") {
    const taker = people(world, votersFor(node, awaitingIds, "take-shortcut"))[0] ?? present[0];
    if (!taker) {
      return finishWake(progress, { kind: "mood", title: "短路没人走", detail: `路口空着。${tail}`, mood: "人已经散了" });
    }
    taker.spiritStones += SHORTCUT_STONES;
    shiftMorality(taker, -1);
    const others = present.filter((person) => person.id !== taker.id);
    for (const other of others) addMutualGrudge(world, taker.id, other.id, CRACK_GRUDGE);
    const otherNames = others.map((person) => person.name).join("、");
    const detail = `${taker.name}钻进更暗的那条，多拿走一捧灵石。${otherNames || "身后"}还站在原来的路口。${tail}`;
    sceneNote(world, present, "走了短路", detail, "脚下快了，身后有人");
    const other = others[0];
    let next = progress;
    if (other) {
      shiftCultivatorMood(world, other, "rejection", `${taker.name}先走了那条短路。`);
      next = remember(progress, {
        kind: "crack",
        actorId: taker.id,
        otherId: other.id,
        actorLine: "上回我先走了那条短路。",
        pairedLine: "上回你先走了那条短路。",
        witnessLine: `${taker.name}先走了那条短路。同队的人都看见了。`,
        witnessIds: awaitingIds.filter((id) => id !== taker.id && id !== other.id),
      });
    }
    return finishWake(next, { kind: "close-call", title: "走了短路", detail, mood: "身后有人记着" });
  }

  const receiver = poorest(present);
  const yielder = richest(present.filter((person) => person.id !== receiver?.id));
  if (!receiver || !yielder) {
    const detail = `这一堆灵石没有人先伸手。${tail}`;
    sceneNote(world, present, "没人先拿", detail, "东西还在原地");
    return finishWake(progress, { kind: "find", title: "没人先拿", detail, mood: "东西还在原地" });
  }
  if (!alreadyOwes(world, yielder.id, receiver.id, "把灵材让给我")) {
    grantOwedFavor(world, yielder.id, receiver.id, "把灵材让给我", "party-wake");
  }
  addMutualAffinity(world, yielder.id, receiver.id, 1);
  shiftMorality(yielder, 1);
  const detail = `${yielder.name}没有去拿那一堆灵石，留给了${receiver.name}。短路也没人钻。${tail}`;
  sceneNote(world, present, "把这一份让出去", detail, "东西留在队里");
  shiftCultivatorMood(world, receiver, "gift", `${yielder.name}把那份灵材让了过来。`);
  const next = remember(progress, {
    kind: "favor",
    actorId: yielder.id,
    otherId: receiver.id,
    reason: "把灵材让给我",
    actorLine: "上回我把那份灵材让给你。",
    pairedLine: "上回你把那份灵材让给我。",
    witnessLine: `${yielder.name}把那份灵材让给了${receiver.name}。同队的人都看见了。`,
    witnessIds: awaitingIds.filter((id) => id !== yielder.id && id !== receiver.id),
  });
  return finishWake(next, { kind: "find", title: "把这一份让出去", detail, mood: "东西留在队里" });
}

function resolveTreasure(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  optionId: string,
  awaitingIds: readonly string[],
  timedOut: boolean,
): DungeonExpeditionProgress {
  const node = progress.pendingWakeNode!;
  const present = people(world, awaitingIds);
  const fellBack = timedOut && optionId === (node.safeOptionId ?? "split-treasure");
  const tail = timeoutClause(timedOut, progress.policy, fellBack);
  if (optionId === "seize-treasure") {
    const seizer = people(world, votersFor(node, awaitingIds, "seize-treasure"))[0] ?? present[0];
    if (!seizer) {
      return finishWake(progress, { kind: "mood", title: "东西还在缝里", detail: `没有人伸手。${tail}`, mood: "灯还照着" });
    }
    seizer.spiritStones += SEIZE_STONES;
    shiftMorality(seizer, -1);
    const others = present.filter((person) => person.id !== seizer.id);
    for (const other of others) addMutualGrudge(world, seizer.id, other.id, CRACK_GRUDGE);
    const detail = `${seizer.name}先伸手，把那件东西收进自己口袋。旁边的人看见了，没有抢回来。${tail}`;
    sceneNote(world, present, "先伸了手", detail, "这一手不重");
    const other = others[0];
    let next = progress;
    if (other) {
      shiftCultivatorMood(world, other, "rejection", `${seizer.name}先伸手拿走了那件东西。`);
      next = remember(progress, {
        kind: "crack",
        actorId: seizer.id,
        otherId: other.id,
        actorLine: "上回我先伸手拿走了那件东西。",
        pairedLine: "上回你先伸手拿走了那件东西。",
        witnessLine: `${seizer.name}先伸手拿走了那件东西。同队的人都看见了。`,
        witnessIds: awaitingIds.filter((id) => id !== seizer.id && id !== other.id),
      });
    }
    return finishWake(next, { kind: "close-call", title: "先伸了手", detail, mood: "旁边的人看见了" });
  }
  if (optionId === "yield-treasure") {
    const hurt = mostInjured(present);
    const receiver = hurt ?? poorest(present);
    const yielder = richest(present.filter((person) => person.id !== receiver?.id))
      ?? present.find((person) => person.id !== receiver?.id);
    if (!receiver || !yielder) {
      return finishWake(progress, { kind: "find", title: "东西还在缝里", detail: `没有第二个人可以让。${tail}`, mood: "灯还照着" });
    }
    if (!alreadyOwes(world, yielder.id, receiver.id, "把争到的东西让给我")) {
      grantOwedFavor(world, yielder.id, receiver.id, "把争到的东西让给我", "party-wake");
    }
    addMutualAffinity(world, yielder.id, receiver.id, 1);
    shiftMorality(yielder, 1);
    const detail = `${yielder.name}把争到的那一份推给了${receiver.name}。${tail}`;
    sceneNote(world, present, "让了出去", detail, "这一份有主了");
    shiftCultivatorMood(world, receiver, "gift", `${yielder.name}把争到的东西让了过来。`);
    const next = remember(progress, {
      kind: "favor",
      actorId: yielder.id,
      otherId: receiver.id,
      reason: "把争到的东西让给我",
      actorLine: "上回我把争到的东西让给你。",
      pairedLine: "上回你把争到的东西让给我。",
      witnessLine: `${yielder.name}把争到的东西让给了${receiver.name}。同队的人都看见了。`,
      witnessIds: awaitingIds.filter((id) => id !== yielder.id && id !== receiver.id),
    });
    return finishWake(next, { kind: "find", title: "让了出去", detail, mood: "这一份有主了" });
  }

  for (const person of present) shiftMorality(person, 1);
  const detail = `壁缝里那件东西被当面分开。谁也没多拿，灯还是原来的灯。${tail}`;
  sceneNote(world, present, "当面分开", detail, "谁也没多拿");
  const actor = present[0];
  const other = present[1];
  let next = progress;
  if (actor && other) {
    addMutualAffinity(world, actor.id, other.id, 1);
    next = remember(progress, {
      kind: "memory",
      actorId: actor.id,
      otherId: other.id,
      actorLine: "上回我们把那件东西当面分开了。",
      pairedLine: "上回我们把那件东西当面分开了。",
      witnessLine: "壁缝里那件东西当面分开了。谁也没多拿。",
      witnessIds: awaitingIds.filter((id) => id !== actor.id && id !== other.id),
    });
  }
  return finishWake(next, { kind: "find", title: "当面分开", detail, mood: "谁也没多拿" });
}

const FLOOR_TAKE_STONES = 8;
const FLOOR_BOND_AFFINITY = 2;

interface FloorBondCopy {
  reason: string;
  context: (name: string) => string;
  coverLabel: string;
  coverDescription: string;
  takeLabel: string;
  takeDescription: string;
  actorLine: string;
  pairedLine: string;
  crackActor: string;
  crackPaired: string;
  witnessCover: (actor: string, subject: string) => string;
  witnessCrack: (actor: string, subject: string) => string;
  coverDetail: (actor: string, subject: string, paid: "pill" | "spirit") => string;
  crackDetail: (actor: string, others: string) => string;
}

const FLOOR_BOND: Record<string, FloorBondCopy> = {
  雷泽残阵: {
    reason: "断法的时候把丹递给我",
    context: (name) => `${name}的法门被残阵压住了，这一手出不来。可以把回气丹递过去，也可以趁这个空档先去捡阵脚上的灵石。`,
    coverLabel: "把丹递过去",
    coverDescription: "耗一枚回气丹，或者一点灵力。法门松一松，这一手记成断法时递过丹。",
    takeLabel: "趁断法先捡",
    takeDescription: "自己多拿几枚灵石。旁边的人会记得这一手。",
    actorLine: "上回断法的时候我把丹递给你。",
    pairedLine: "上回断法的时候你把丹递给我。",
    crackActor: "上回我趁你断法，先捡了阵脚上的灵石。",
    crackPaired: "上回你趁我断法，先捡了阵脚上的灵石。",
    witnessCover: (actor, subject) => `${actor}在断法的时候把丹递给了${subject}。同队的人都看见了。`,
    witnessCrack: (actor, subject) => `${actor}趁${subject}断法，先捡了阵脚上的灵石。同队的人都看见了。`,
    coverDetail: (actor, subject, paid) => paid === "pill"
      ? `${actor}把一枚回气丹递到${subject}手上。断掉的法门松了一点。${subject}欠这一手。`
      : `${actor}耗了一点灵力，把${subject}被压住的法门顶开一点。${subject}欠这一手。`,
    crackDetail: (actor, others) => `${actor}趁断法的空档，先捡了阵脚上的灵石。${others || "旁边的人"}还站在原地。`,
  },
  沉雾沼: {
    reason: "雾里把我拉上来",
    context: (name) => `${name}的脚踝被雾丝缠住了，人还陷在湿处。可以停下来拉上一把，也可以自己先踩上干处。`,
    coverLabel: "拉上干处",
    coverDescription: "停一步，把人从雾丝里拉上来。这一手记成雾里拉过。",
    takeLabel: "自己先踩过去",
    takeDescription: "干处归自己。被缠住的人还在雾里。",
    actorLine: "上回雾里我把你拉上来。",
    pairedLine: "上回雾里你把我拉上来。",
    crackActor: "上回我自己先踩过干处，你还缠在雾里。",
    crackPaired: "上回你自己先踩过干处，我还缠在雾里。",
    witnessCover: (actor, subject) => `${actor}在雾里把${subject}拉上了干处。同队的人都看见了。`,
    witnessCrack: (actor, subject) => `${actor}自己先踩过干处，${subject}还缠在雾里。同队的人都看见了。`,
    coverDetail: (actor, subject, paid) => paid === "pill"
      ? `${actor}把${subject}拉上干处，又递了一枚回气丹。${subject}欠这一手。`
      : `${actor}耗了一点灵力，把${subject}从雾丝里拉上干处。${subject}欠这一手。`,
    crackDetail: (actor, others) => `${actor}自己先踩上干处。${others || "旁边的人"}还缠在雾里。`,
  },
  铜棺窟: {
    reason: "霜寒里把袖口分给我",
    context: (name) => `${name}的手被霜寒贴住了，指节还僵着。可以把袖口分过去暖一暖，也可以先去摸棺沿上那点东西。`,
    coverLabel: "把袖口分过去",
    coverDescription: "把袖口让过去。寒退一点，这一手记成霜寒里分过袖。",
    takeLabel: "先摸棺沿",
    takeDescription: "自己先摸到棺沿上的东西。旁边的手还是冷的。",
    actorLine: "上回霜寒里我把袖口分给你。",
    pairedLine: "上回霜寒里你把袖口分给我。",
    crackActor: "上回我先摸了棺沿，你的手还是冷的。",
    crackPaired: "上回你先摸了棺沿，我的手还是冷的。",
    witnessCover: (actor, subject) => `${actor}在霜寒里把袖口分给了${subject}。同队的人都看见了。`,
    witnessCrack: (actor, subject) => `${actor}先摸了棺沿，${subject}的手还是冷的。同队的人都看见了。`,
    coverDetail: (actor, subject, paid) => paid === "pill"
      ? `${actor}把袖口分给${subject}，又递了一枚回气丹。手上的霜退了一点。${subject}欠这一手。`
      : `${actor}耗了一点灵力，把袖口分给${subject}。霜寒从手上退了一点。${subject}欠这一手。`,
    crackDetail: (actor, others) => `${actor}先摸了棺沿上的东西。${others || "旁边的人"}的手还是冷的。`,
  },
};

function floorBondCopy(place: string): FloorBondCopy {
  return FLOOR_BOND[place] ?? FLOOR_BOND["雷泽残阵"]!;
}

function pressedCompanion(companions: readonly Cultivator[]): Cultivator {
  const wounded = [...companions].sort((left, right) => right.injuryTicksRemaining - left.injuryTicksRemaining);
  if ((wounded[0]?.injuryTicksRemaining ?? 0) > 0) return wounded[0]!;
  return [...companions].sort((left, right) => left.spiritualPower - right.spiritualPower)[0]!;
}

function canPayCover(person: Cultivator): boolean {
  if ((person.inventory["qi-pill"] ?? 0) > 0) return true;
  return person.spiritualPower >= Math.max(4, Math.round(person.maxSpiritualPower * 0.08));
}

function payCover(person: Cultivator): "pill" | "spirit" | null {
  if ((person.inventory["qi-pill"] ?? 0) > 0) {
    person.inventory["qi-pill"] -= 1;
    return "pill";
  }
  const cost = Math.max(4, Math.round(person.maxSpiritualPower * 0.08));
  if (person.spiritualPower < cost) return null;
  person.spiritualPower -= cost;
  return "spirit";
}

function resolveFloorBond(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  optionId: string,
  awaitingIds: readonly string[],
  timedOut: boolean,
): DungeonExpeditionProgress {
  const node = progress.pendingWakeNode!;
  const copy = floorBondCopy(yiPlaceForRank(progress.targetRank));
  const present = people(world, awaitingIds);
  const subject = node.subjectId ? world.cultivators[node.subjectId] : undefined;
  const fellBack = timedOut && optionId === (node.safeOptionId ?? "cover-mate");
  const tail = timeoutClause(timedOut, progress.policy, fellBack);
  if (!subject) {
    return finishWake(progress, {
      kind: "mood",
      title: "人已经不在了",
      detail: `要护的人已经不在这一趟里。${tail}`,
      mood: "这一手没处落",
    });
  }
  if (optionId === "take-opening") {
    const taker = people(world, votersFor(node, awaitingIds, "take-opening"))[0] ?? present.find((person) => person.id !== subject.id) ?? present[0];
    if (!taker) {
      return finishWake(progress, { kind: "mood", title: "空档没人捡", detail: `这一层的空档空着。${tail}`, mood: "人已经散了" });
    }
    taker.spiritStones += FLOOR_TAKE_STONES;
    shiftMorality(taker, -1);
    const others = present.filter((person) => person.id !== taker.id);
    for (const other of others) addMutualGrudge(world, taker.id, other.id, CRACK_GRUDGE);
    const otherNames = others.map((person) => person.name).join("、");
    const detail = `${copy.crackDetail(taker.name, otherNames)}${tail}`;
    sceneNote(world, present, copy.takeLabel, detail, "这一手会记得");
    const other = others.find((person) => person.id === subject.id) ?? others[0];
    let next = progress;
    if (other) {
      shiftCultivatorMood(world, other, "rejection", `${taker.name}先顾了自己这一手。`);
      next = remember(progress, {
        kind: "crack",
        actorId: taker.id,
        otherId: other.id,
        actorLine: copy.crackActor,
        pairedLine: copy.crackPaired,
        witnessLine: copy.witnessCrack(taker.name, other.name),
        witnessIds: awaitingIds.filter((id) => id !== taker.id && id !== other.id),
      });
    }
    return finishWake(next, { kind: "close-call", title: copy.takeLabel, detail, mood: "旁边的人看见了" });
  }

  const voters = votersFor(node, awaitingIds, "cover-mate");
  const pool = people(world, voters.length > 0 ? voters : awaitingIds).filter((person) => person.id !== subject.id);
  const helper = pool.find((person) => canPayCover(person)) ?? null;
  if (!helper) {
    const detail = `${subject.name}还陷在这一层里。旁边的人想伸手，灵力不够，身上也没有回气丹。${tail}`;
    sceneNote(world, present, "手没伸上", detail, "人还在原地");
    const actor = pool[0] ?? subject;
    const next = remember(progress, {
      kind: "memory",
      actorId: actor.id,
      otherId: subject.id,
      actorLine: `上回我想拉你一把，手里没有够用的东西。`,
      pairedLine: `上回你想拉我一把，手里没有够用的东西。`,
      witnessLine: detail,
      witnessIds: awaitingIds.filter((id) => id !== subject.id && id !== actor.id),
    });
    return finishWake(next, { kind: "person", title: "手没伸上", detail, mood: "人还在原地" });
  }
  const paid = payCover(helper);
  if (!paid) {
    return finishWake(progress, { kind: "mood", title: "手没伸上", detail: `${subject.name}还在原地。${tail}`, mood: "这一手没落下来" });
  }
  if (!alreadyOwes(world, helper.id, subject.id, copy.reason)) {
    grantOwedFavor(world, helper.id, subject.id, copy.reason, "party-wake");
  }
  addMutualAffinity(world, helper.id, subject.id, FLOOR_BOND_AFFINITY);
  shiftMorality(helper, 1);
  const detail = `${copy.coverDetail(helper.name, subject.name, paid)}${tail}`;
  sceneNote(world, present, copy.coverLabel, detail, "这一手还热着");
  shiftCultivatorMood(world, subject, "gift", `${helper.name}这一手还热着。`);
  const next = remember(progress, {
    kind: "favor",
    actorId: helper.id,
    otherId: subject.id,
    reason: copy.reason,
    actorLine: copy.actorLine,
    pairedLine: copy.pairedLine,
    witnessLine: copy.witnessCover(helper.name, subject.name),
    witnessIds: awaitingIds.filter((id) => id !== helper.id && id !== subject.id),
  });
  return finishWake(next, { kind: "person", title: copy.coverLabel, detail, mood: "这一手还热着" });
}

export function resolvePartyExpeditionWake(input: {
  world: WorldState;
  progress: DungeonExpeditionProgress;
  optionId: string;
  awaitingIds: readonly string[];
  timedOut: boolean;
}): DungeonExpeditionProgress {
  const { world, progress, optionId, awaitingIds, timedOut } = input;
  const kind = progress.pendingWakeNode?.partyKind;
  if (!progress.pendingWakeNode || !kind) return progress;
  if (kind === "tend-wound") return resolveTend(world, progress, optionId, awaitingIds, timedOut);
  if (kind === "loot-contention") return resolveLoot(world, progress, optionId, awaitingIds, timedOut);
  if (kind === "floor-bond") return resolveFloorBond(world, progress, optionId, awaitingIds, timedOut);
  return resolveTreasure(world, progress, optionId, awaitingIds, timedOut);
}

function escortPair(world: WorldState, left: Cultivator, right: Cultivator): { asker: Cultivator; escorter: Cultivator } | null {
  const favor = Object.values(world.personalFavors ?? {}).find((row) => (
    row.kind === "escort-gate"
    && row.status === "fulfilled"
    && ((row.fromId === left.id && row.toId === right.id) || (row.fromId === right.id && row.toId === left.id))
  ));
  if (favor) {
    const asker = world.cultivators[favor.fromId];
    const escorter = world.cultivators[favor.toId];
    if (asker && escorter) return { asker, escorter };
  }
  const leftEscorted = (getSocialLink(world, left.id, right.id)?.owedFavors ?? [])
    .some((entry) => entry.reason.includes("送到门口") || entry.reason.includes("护送"));
  if (leftEscorted) return { asker: right, escorter: left };
  const rightEscorted = (getSocialLink(world, right.id, left.id)?.owedFavors ?? [])
    .some((entry) => entry.reason.includes("送到门口") || entry.reason.includes("护送"));
  if (rightEscorted) return { asker: left, escorter: right };
  return null;
}

function escortMoment(world: WorldState, left: Cultivator, right: Cultivator): PartyExpeditionMoment | null {
  const pair = escortPair(world, left, right);
  if (!pair) return null;
  const { asker, escorter } = pair;
  return {
    kind: "memory",
    actorId: escorter.id,
    otherId: asker.id,
    reason: "escort-gate",
    actorLine: "上回我把你送到地宫门口。这一趟是一起下来的。",
    pairedLine: "上回你把我送到地宫门口。",
    witnessLine: `${escorter.name}把${asker.name}送到了地宫门口。这一趟是一起下来的。`,
  };
}

function rendezvousMoment(
  world: WorldState,
  progress: DungeonExpeditionProgress,
  left: Cultivator,
  right: Cultivator,
): PartyExpeditionMoment | null {
  const earliest = progress.startedAtTick - 12;
  const speakerLink = [getSocialLink(world, left.id, right.id), getSocialLink(world, right.id, left.id)]
    .find((link) => link?.lastSpokenKind === "rendezvous-at-gate" && (link.lastSpokenTick ?? -1) >= earliest);
  if (!speakerLink) return null;
  const speaker = speakerLink.targetCultivatorId === right.id ? left : right;
  const listener = speaker.id === left.id ? right : left;
  return {
    kind: "memory",
    actorId: speaker.id,
    otherId: listener.id,
    reason: "rendezvous-at-gate",
    actorLine: "上回我约你在门口见。人真的一起来了。",
    pairedLine: "上回你约我在门口见。",
    witnessLine: `${speaker.name}约${listener.name}在门口见。人真的一起来了。`,
  };
}

function gateMoments(world: WorldState, progress: DungeonExpeditionProgress): PartyExpeditionMoment[] {
  const ids = [progress.cultivatorId, ...companionIdsOf(progress)];
  const party = people(world, ids);
  const found: PartyExpeditionMoment[] = [];
  for (let index = 0; index < party.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < party.length; otherIndex += 1) {
      const left = party[index];
      const right = party[otherIndex];
      if (!left || !right) continue;
      if (!found.some((moment) => moment.reason === "escort-gate")) {
        const escort = escortMoment(world, left, right);
        if (escort) found.push(escort);
      }
      if (!found.some((moment) => moment.reason === "rendezvous-at-gate")) {
        const meeting = rendezvousMoment(world, progress, left, right);
        if (meeting) found.push(meeting);
      }
    }
  }
  return found;
}

function writeEndLine(
  world: WorldState,
  person: Cultivator,
  otherName: string,
  line: string,
): void {
  pushTravelNote(person, travelNote({
    tick: world.tick,
    kind: "person",
    title: `还记着${otherName}`,
    detail: line,
    locationId: person.locationId,
    mood: "这话留到了出地宫",
  }));
  recordLife(person, {
    tick: world.tick,
    kind: "relationship",
    text: line,
    names: [otherName],
    topic: "favor",
  });
}

export function publishPartyExpeditionMemories(world: WorldState, progress: DungeonExpeditionProgress): void {
  try {
    const moments = [...(progress.partyMoments ?? []), ...gateMoments(world, progress)];
    const seen = new Set<string>();
    for (const moment of moments) {
      const actor = world.cultivators[moment.actorId];
      const other = world.cultivators[moment.otherId];
      if (!actor || !other || actor.id === other.id) continue;
      const key = `${moment.actorId}:${moment.otherId}:${moment.pairedLine}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (moment.witnessLine) {
        for (const witnessId of moment.witnessIds ?? []) {
          const witness = world.cultivators[witnessId];
          if (!witness || witness.id === actor.id || witness.id === other.id) continue;
          writeEndLine(world, witness, other.name, moment.witnessLine);
        }
      }
      writeEndLine(world, actor, other.name, moment.actorLine);
      writeEndLine(world, other, actor.name, moment.pairedLine);
    }
  } catch {
    // An exit memory must not roll the expedition report back.
  }
}
