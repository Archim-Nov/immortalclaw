/**
 * Personal favors, sect-hall life, notes, and the gossip those events leave behind.
 *
 * Public commissions and request-help stay as they are. A favor here is one
 * cultivator asking another for a concrete errand.
 */

import { GameplayRejection } from "./gameplay-error.js";
import { grudgeArcOf, shiftCultivatorMood, spreadNearbyGossip, recordLife } from "./inner-life.js";
import type {
  ActionExecutionResult,
  AvailableAction,
  Cultivator,
  FavorKind,
  FavorView,
  GossipView,
  ItemId,
  LifeTopic,
  NoteReply,
  PendingNoteView,
  PersonalFavor,
  PersonalNote,
  SectNotice,
  SectNoticeView,
  SectTitle,
  SpotNoteView,
  WorldState,
} from "./model.js";
import { addMutualAffinity, addMutualGrudge, forgiveOneFavor, getPartyOf, getSocialLink, grantOwedFavor, repaymentQuote } from "./social.js";
import { cleanSpokenLine, errandLine, openSpokenLine } from "./spoken-lines.js";
import { favorFragmentFor } from "./combat-content.js";
import { pushTravelNote, travelNote } from "./travelogue.js";

export const FAVOR_HERB_ID = "cloud-heart-grass" as ItemId;
export const ASK_FAVOR_COOLDOWN_TICKS = 4;
export const FAVOR_OFFER_TTL = 6;
export const FAVOR_WORK_TTL = 8;
export const OPEN_FAVOR_LIMIT = 2;
export const INCOMING_FAVOR_LIMIT = 4;
export const NOTE_COOLDOWN_TICKS = 3;
export const UNREAD_NOTE_LIMIT = 3;
export const SPOT_NOTE_LIMIT = 8;
export const SECT_NOTICE_LIMIT = 8;
export const SECT_NOTICE_COOLDOWN_TICKS = 3;
export const JOINT_SECT_COOLDOWN_TICKS = 4;
export const GUIDE_COOLDOWN_TICKS = 4;
export const JOINT_CONTRIBUTION = 8;
export const GUIDE_SENIOR_CONTRIBUTION = 6;
export const GUIDE_JUNIOR_CONTRIBUTION = 4;
export const GUIDE_PROGRESS = 3;
export const GUIDE_SPIRIT = 4;
export const FAVOR_AFFINITY_DONE = 12;
export const FAVOR_AFFINITY_FAIL = 6;
export const FAVOR_GRUDGE_FAIL = 8;
export const REUNITE_COOLDOWN_TICKS = 12;
export const WAIT_FOR_TTL = 48;

const FAVOR_KINDS: readonly FavorKind[] = ["fetch-herb", "escort-gate", "guard-breakthrough", "deliver-gift"];
const TITLE_RANK: Record<SectTitle, number> = {
  "外门": 0,
  "内门": 1,
  "精英": 2,
  "长老": 3,
  "宗主": 4,
};

const FAVOR_ASK: Record<FavorKind, (asker: string, asked: string, third: string, herb: string) => string> = {
  "fetch-herb": (asker, asked, _third, herb) => `${asker}请${asked}帮忙去采一株${herb}。这件事不大，可人得亲自跑一趟。`,
  "escort-gate": (asker, asked) => `${asker}请${asked}把人送到地宫门口。路上有个人陪着，心里踏实一点。`,
  "guard-breakthrough": (asker, asked) => `${asker}请${asked}在闭关时守在外面。破境的时候，门外得有个人。`,
  "deliver-gift": (asker, asked, third, herb) => `${asker}请${asked}把一株${herb}送到${third}手里。人不必当面，东西要送到。`,
};

function takeSequence(world: WorldState, key: "nextPersonalFavorSequence" | "nextPersonalNoteSequence" | "nextSectNoticeSequence" | "nextMessageSequence"): number {
  const current = world[key] ?? 1;
  world[key] = current + 1;
  return current;
}

function ensureMaps(world: WorldState): void {
  if (!world.personalFavors) world.personalFavors = {};
  if (!world.personalNotes) world.personalNotes = {};
  if (!Array.isArray(world.gossip)) world.gossip = [];
  if (!world.sectBoards) world.sectBoards = {};
  if (typeof world.nextPersonalFavorSequence !== "number") world.nextPersonalFavorSequence = 1;
  if (typeof world.nextPersonalNoteSequence !== "number") world.nextPersonalNoteSequence = 1;
  if (typeof world.nextGossipSequence !== "number") world.nextGossipSequence = 1;
  if (typeof world.nextSectNoticeSequence !== "number") world.nextSectNoticeSequence = 1;
  if (typeof world.nextMessageSequence !== "number") world.nextMessageSequence = 1;
  if (!Array.isArray(world.messages)) world.messages = [];
}

function herbName(world: WorldState): string {
  return world.itemDefinitions[FAVOR_HERB_ID]?.name ?? "云心草";
}

function placeName(world: WorldState, locationId: string): string {
  return world.locations[locationId]?.name ?? "原地";
}

function personName(world: WorldState, id: string | undefined): string {
  if (!id) return "某人";
  return world.cultivators[id]?.name ?? "某人";
}

export function sectKeyOf(cultivator: Cultivator): string | null {
  if (cultivator.sectId) return `sect:${cultivator.sectId}`;
  if (cultivator.neutralSectId) return `neutral:${cultivator.neutralSectId}`;
  return null;
}

function sectNameOf(world: WorldState, cultivator: Cultivator): string {
  if (cultivator.sectId) return world.sects[cultivator.sectId]?.name ?? "宗门";
  if (cultivator.neutralSectId) return world.neutralSects[cultivator.neutralSectId]?.name ?? "宗门";
  return "宗门";
}

function isDungeonGate(world: WorldState, locationId: string): boolean {
  const location = world.locations[locationId];
  return Boolean(location && (location.nodeType.startsWith("dungeon") || location.dungeon));
}

function cooling(cultivator: Cultivator, key: string, tick: number, wait: number): boolean {
  const last = cultivator.socialCooldowns?.[key];
  return last !== undefined && tick - last < wait;
}

function markCool(cultivator: Cultivator, key: string, tick: number): void {
  cultivator.socialCooldowns = { ...(cultivator.socialCooldowns ?? {}), [key]: tick };
}

function takeItem(cultivator: Cultivator, itemId: ItemId, count = 1): boolean {
  const owned = cultivator.inventory[itemId] ?? 0;
  if (owned < count) return false;
  cultivator.inventory[itemId] = owned - count;
  return true;
}

function giveItem(cultivator: Cultivator, itemId: ItemId, count = 1): void {
  cultivator.inventory[itemId] = (cultivator.inventory[itemId] ?? 0) + count;
}

function contributionOf(cultivator: Cultivator): number {
  return cultivator.sectId ? cultivator.totalContribution : cultivator.neutralContribution;
}

function addContribution(cultivator: Cultivator, amount: number): void {
  if (cultivator.sectId) cultivator.totalContribution += amount;
  else cultivator.neutralContribution += amount;
}

function isSenior(senior: Cultivator, junior: Cultivator): boolean {
  const seniorRank = senior.sectTitle ? TITLE_RANK[senior.sectTitle] : -1;
  const juniorRank = junior.sectTitle ? TITLE_RANK[junior.sectTitle] : -1;
  if (seniorRank > juniorRank && seniorRank >= 0) return true;
  return contributionOf(senior) >= contributionOf(junior) + 15;
}

function postMessage(
  world: WorldState,
  cultivatorId: string,
  from: string,
  subject: string,
  content: string,
  fromCultivatorId?: string,
  spokenLine?: string,
): void {
  ensureMaps(world);
  world.messages.unshift({
    id: `msg-${takeSequence(world, "nextMessageSequence")}`,
    cultivatorId,
    tick: world.tick,
    from,
    fromCultivatorId: fromCultivatorId ?? null,
    toCultivatorId: cultivatorId,
    subject,
    content,
    ...(spokenLine ? { spokenLine } : {}),
  });
}

function writePeople(
  world: WorldState,
  people: readonly Cultivator[],
  title: string,
  detail: string,
  mood: string,
  topic: LifeTopic = "favor",
  quote?: { speakerName: string; line: string },
): void {
  const seen = new Set<string>();
  const names = people.filter((person) => person).map((person) => person.name);
  for (const person of people) {
    if (!person || seen.has(person.id)) continue;
    seen.add(person.id);
    pushTravelNote(person, travelNote({
      tick: world.tick,
      kind: "person",
      title,
      detail,
      locationId: person.locationId,
      mood,
    }));
    recordLife(person, { tick: world.tick, kind: "relationship", text: detail, topic, names });
    if (quote) {
      recordLife(person, {
        tick: world.tick,
        kind: "quote",
        text: `${quote.speakerName}说：「${quote.line}」`,
        speakerName: quote.speakerName,
        line: quote.line,
      });
    }
  }
}

function openFavors(world: WorldState): PersonalFavor[] {
  return Object.values(world.personalFavors ?? {}).filter((favor) => favor.status === "offered" || favor.status === "accepted");
}

function favorSummary(world: WorldState, favor: PersonalFavor): string {
  const asker = personName(world, favor.fromId);
  const asked = personName(world, favor.toId);
  const third = personName(world, favor.thirdId);
  const herb = herbName(world);
  if (favor.status === "accepted") {
    if (favor.kind === "fetch-herb") return `${asked}已经应下${asker}，答应把一株${herb}带回来。`;
    if (favor.kind === "escort-gate") return `${asked}已经应下${asker}，答应把人送到地宫门口。`;
    if (favor.kind === "guard-breakthrough") return `${asked}已经应下${asker}，答应在闭关时守在门外。`;
    return `${asked}已经应下${asker}，答应把${herb}送到${third}手里。`;
  }
  return FAVOR_ASK[favor.kind](asker, asked, third, herb);
}

function samePlace(a: Cultivator, b: Cultivator): boolean {
  return a.locationId === b.locationId;
}

function othersHere(world: WorldState, cultivator: Cultivator, limit = 8): Cultivator[] {
  return Object.values(world.cultivators)
    .filter((other) => other.id !== cultivator.id && other.locationId === cultivator.locationId)
    .slice(0, limit);
}

function isOnTheRoad(world: WorldState, person: Cultivator): boolean {
  if (!person.activeJobId) return false;
  return world.jobs[person.activeJobId]?.actionId.startsWith("travel-to:") ?? false;
}

function inAnotherCity(world: WorldState, left: Cultivator, right: Cultivator): boolean {
  const leftPlace = world.locations[left.locationId];
  const rightPlace = world.locations[right.locationId];
  if (!leftPlace || !rightPlace) return left.locationId !== right.locationId;
  return leftPlace.stateId !== rightPlace.stateId;
}

function isFavorPartner(world: WorldState, left: Cultivator, right: Cultivator): boolean {
  const forward = getSocialLink(world, left.id, right.id);
  const back = getSocialLink(world, right.id, left.id);
  if ((forward?.favorBalance ?? 0) !== 0 || (back?.favorBalance ?? 0) !== 0) return true;
  if ((forward?.owedFavors?.length ?? 0) > 0 || (back?.owedFavors?.length ?? 0) > 0) return true;
  return openFavors(world).some((favor) =>
    (favor.fromId === left.id && favor.toId === right.id) || (favor.fromId === right.id && favor.toId === left.id));
}

function canWaitFor(world: WorldState, cultivator: Cultivator, target: Cultivator): boolean {
  if (cultivator.id === target.id || cultivator.waitingFor) return false;
  if (cooling(cultivator, `wait-for:${target.id}`, world.tick, REUNITE_COOLDOWN_TICKS)) return false;
  const party = getPartyOf(world, cultivator.id);
  const mate = Boolean(party && party.memberIds.includes(target.id));
  if (!mate && !isFavorPartner(world, cultivator, target)) return false;
  const moving = isOnTheRoad(world, cultivator) || isOnTheRoad(world, target);
  if (moving) return true;
  return inAnotherCity(world, cultivator, target);
}

function waitCandidates(world: WorldState, cultivator: Cultivator): Cultivator[] {
  const found = new Map<string, Cultivator>();
  const add = (person: Cultivator | undefined) => {
    if (!person || person.id === cultivator.id) return;
    found.set(person.id, person);
  };
  const party = getPartyOf(world, cultivator.id);
  for (const id of party?.memberIds ?? []) add(world.cultivators[id]);
  for (const id of Object.keys(world.socialLinks?.[cultivator.id] ?? {})) add(world.cultivators[id]);
  for (const [otherId, links] of Object.entries(world.socialLinks ?? {})) {
    const link = links[cultivator.id];
    if (!link) continue;
    if ((link.favorBalance ?? 0) !== 0 || (link.owedFavors?.length ?? 0) > 0) add(world.cultivators[otherId]);
  }
  for (const favor of openFavors(world)) {
    if (favor.fromId === cultivator.id) add(world.cultivators[favor.toId]);
    if (favor.toId === cultivator.id) add(world.cultivators[favor.fromId]);
  }
  return [...found.values()].filter((target) => canWaitFor(world, cultivator, target));
}

function canAsk(world: WorldState, asker: Cultivator, target: Cultivator): boolean {
  if (asker.id === target.id) return false;
  if (cooling(asker, `ask-favor:${target.id}`, world.tick, ASK_FAVOR_COOLDOWN_TICKS)) return false;
  const open = openFavors(world);
  if (open.filter((favor) => favor.fromId === asker.id).length >= OPEN_FAVOR_LIMIT) return false;
  if (open.some((favor) => favor.fromId === asker.id && favor.toId === target.id)) return false;
  if (open.filter((favor) => favor.toId === target.id && favor.status === "offered").length >= INCOMING_FAVOR_LIMIT) return false;
  return true;
}

function deliverCandidates(world: WorldState, asker: Cultivator, helperId: string): Cultivator[] {
  const knownIds = Object.keys(world.socialLinks?.[asker.id] ?? {});
  const known = knownIds
    .map((id) => world.cultivators[id])
    .filter((person): person is Cultivator => Boolean(person) && person.id !== helperId && person.id !== asker.id);
  const rest = Object.values(world.cultivators).filter((person) => person.id !== asker.id && person.id !== helperId && !knownIds.includes(person.id));
  return [...known, ...rest].slice(0, 2);
}

function action(actionId: AvailableAction["actionId"], label: string, description: string): AvailableAction {
  return { actionId, label, description, durationTicks: 0, kind: "immediate" };
}

export function listSocialDeepenActions(world: WorldState, cultivator: Cultivator): AvailableAction[] {
  ensureMaps(world);
  const actions: AvailableAction[] = [];
  const herb = herbName(world);
  const location = world.locations[cultivator.locationId];
  for (const target of othersHere(world, cultivator)) {
    if (canAsk(world, cultivator, target)) {
      actions.push(
        action(
          `ask-favor:${target.id}:fetch-herb`,
          `请托：${target.name}去采${herb}`,
          `请${target.name}去采一株${herb}。对方可以应，也可以拒。办成了会欠一份人情。`,
        ),
        action(
          `ask-favor:${target.id}:escort-gate`,
          `请托：${target.name}送到门口`,
          `请${target.name}把你送到地宫门口。两个人都到了门口，这件事才算办成。`,
        ),
        action(
          `ask-favor:${target.id}:guard-breakthrough`,
          `请托：${target.name}守关`,
          `请${target.name}在你闭关时守在洞府外。人守在门外，破境才踏实。`,
        ),
      );
      if ((cultivator.inventory[FAVOR_HERB_ID] ?? 0) > 0) {
        for (const third of deliverCandidates(world, cultivator, target.id)) {
          actions.push(action(
            `ask-favor:${target.id}:deliver-gift:${third.id}`,
            `请托：${target.name}把${herb}送给${third.name}`,
            `把一株${herb}交给${target.name}，请其送到${third.name}手里。人不必都在眼前。`,
          ));
        }
      }
    }
    const key = sectKeyOf(cultivator);
    if (key && key === sectKeyOf(target) && !cooling(cultivator, `joint:${target.id}`, world.tick, JOINT_SECT_COOLDOWN_TICKS) && !cultivator.activeJobId && !target.activeJobId) {
      actions.push(action(
        `join-sect-task:${target.id}`,
        `同门差事：与${target.name}一起办`,
        `和${target.name}一起办一趟宗门差事。两个人都记一笔贡献，也记一份交情。`,
      ));
    }
    if (key && key === sectKeyOf(target) && isSenior(cultivator, target) && !cooling(cultivator, `guide:${target.id}`, world.tick, GUIDE_COOLDOWN_TICKS)) {
      actions.push(action(
        `guide-junior:${target.id}`,
        `提点后辈：${target.name}`,
        `你是${target.name}的前辈。花一点灵力带对方走一程，对方的修为和贡献都会长一点。`,
      ));
    }
    for (const heard of cultivator.heardGossip ?? []) {
      if (heard.mentioned || world.tick - heard.tick > 6) continue;
      actions.push(action(
        `mention-gossip:${heard.id}:${target.id}`,
        `闲谈：告诉${target.name}`,
        `把刚听见的事告诉${target.name}。说的是：${heard.shortLine}`,
      ));
    }
  }

  for (const favor of openFavors(world)) {
    if (favor.toId === cultivator.id && favor.status === "offered") {
      const asker = personName(world, favor.fromId);
      actions.push(
        action(`accept-favor:${favor.id}`, `应下请托：${asker}`, `${favorSummary(world, favor)}应下以后，再按事情本身去办。`),
        action(`decline-favor:${favor.id}`, `回绝请托：${asker}`, `回绝${asker}的请托。话说明白了，两边的心情都会受影响。`),
      );
    }
    if (favor.toId === cultivator.id && favor.status === "accepted") {
      const asker = personName(world, favor.fromId);
      actions.push(
        action(`fulfill-favor:${favor.id}`, `办完请托：${asker}`, `${favorSummary(world, favor)}办成了，对方会欠你一份人情。`),
        action(`abandon-favor:${favor.id}`, `这件请托黄了：${asker}`, `这件应下的事办不成了。说清楚，免得一直拖着。`),
      );
    }
  }

  for (const note of Object.values(world.personalNotes ?? {})) {
    if (note.toId === cultivator.id && (note.replies ?? []).length === 0) {
      const fromName = personName(world, note.fromId);
      actions.push(
        action(`read-note:${note.id}`, `看字条：${fromName}`, `${fromName}留了字条：「${note.line}」先看过，也可以回一句。`),
        action(`reply-note:${note.id}`, `回字条：${fromName}`, `回${fromName}的字条。act 的 body 可带 line，最多四十字。人不在眼前也能回。`),
      );
    }
    if (note.toId === null && note.locationId === cultivator.locationId && note.fromId !== cultivator.id && !(note.replies ?? []).some((reply) => reply.fromId === cultivator.id)) {
      const fromName = personName(world, note.fromId);
      actions.push(action(
        `reply-spot-note:${note.id}`,
        `回应留话：${fromName}`,
        `${fromName}在${placeName(world, note.locationId)}留了话：「${note.line}」回一句，对方回头能看见。`,
      ));
    }
  }

  if (location?.kind === "safe" && !cooling(cultivator, `spot:${cultivator.locationId}`, world.tick, NOTE_COOLDOWN_TICKS)) {
    const pinned = Object.values(world.personalNotes ?? {}).filter((note) => note.toId === null && note.locationId === cultivator.locationId);
    if (pinned.length < SPOT_NOTE_LIMIT) {
      actions.push(action(
        "leave-spot-note",
        "在此地留一张字条",
        `把一句话留在${placeName(world, cultivator.locationId)}。后来的人看见了可以回一句。act 的 body 可带 line。`,
      ));
    }
  }

  const sectKey = sectKeyOf(cultivator);
  if (sectKey && location?.kind === "safe" && !cooling(cultivator, "sect-notice", world.tick, SECT_NOTICE_COOLDOWN_TICKS)) {
    actions.push(action(
      "post-sect-notice",
      "在宗门告示上留话",
      `把一句话写上${sectNameOf(world, cultivator)}的告示。同门不论在不在眼前，回头都能看见。`,
    ));
  }
  if (sectKey) {
    for (const notice of (world.sectBoards?.[sectKey] ?? []).slice(0, 6)) {
      if (notice.authorId === cultivator.id) continue;
      if ((notice.replies ?? []).some((reply) => reply.fromId === cultivator.id)) continue;
      actions.push(action(
        `reply-sect-notice:${notice.id}`,
        `回告示：${notice.authorName}`,
        `${notice.authorName}在宗门告示上写着：「${notice.text}」回一句，对方的见闻里会留下。`,
      ));
    }
  }

  const noteTargets: Cultivator[] = [];
  const pushNoteTarget = (other: Cultivator | undefined) => {
    if (!other || other.id === cultivator.id || noteTargets.some((row) => row.id === other.id)) return;
    if (noteTargets.length >= 8) return;
    noteTargets.push(other);
  };
  for (const id of Object.keys(world.socialLinks?.[cultivator.id] ?? {})) pushNoteTarget(world.cultivators[id]);
  for (const other of othersHere(world, cultivator)) pushNoteTarget(other);
  for (const other of Object.values(world.cultivators)) {
    if (other.locationId !== cultivator.locationId) pushNoteTarget(other);
  }
  for (const other of noteTargets) {
    if (cooling(cultivator, `note:${other.id}`, world.tick, NOTE_COOLDOWN_TICKS)) continue;
    const unread = Object.values(world.personalNotes ?? {}).filter((note) => note.toId === other.id && (note.replies ?? []).length === 0);
    if (unread.length >= UNREAD_NOTE_LIMIT) continue;
    actions.push(action(
      `leave-note:${other.id}`,
      `留字条给${other.name}`,
      `给${other.name}留一张字条。人不在眼前也能留，对方回头可以看，也可以回一句。`,
    ));
  }

  for (const target of waitCandidates(world, cultivator)) {
    const away = isOnTheRoad(world, target) ? "还在路上" : "在别的城里";
    actions.push(action(
      `wait-for:${target.id}`,
      `等${target.name}`,
      `${target.name}${away}。在这里等，人到了会记一笔重逢。同一对人隔一阵才再等。`,
    ));
  }

  return actions;
}

function lineOr(supplied: string | null | undefined, fallback: string): string {
  return cleanSpokenLine(supplied) ?? fallback;
}

function relationBeat(world: WorldState, left: Cultivator, right: Cultivator, detail: string, affinity: number): string {
  const feud = grudgeArcOf(getSocialLink(world, left.id, right.id)?.grudge ?? 0);
  if (feud) {
    const tense = `${detail}两个人有${feud}，剑拔弩张，好感没有涨。`;
    const mood = `${left.name}和${right.name}话没热，剑拔弩张。`;
    shiftCultivatorMood(world, left, "rejection", mood);
    shiftCultivatorMood(world, right, "rejection", mood);
    return tense;
  }
  addMutualAffinity(world, left.id, right.id, affinity);
  shiftCultivatorMood(world, left, "spoken", `${left.name}把${right.name}的话接住了。`);
  shiftCultivatorMood(world, right, "spoken", `${right.name}把${left.name}的话接住了。`);
  return `${detail}好感轻轻动了一点。`;
}

function resolveFavorFailure(
  world: WorldState,
  favor: PersonalFavor,
  reason: "declined" | "abandoned" | "expired",
): void {
  const asker = world.cultivators[favor.fromId];
  const asked = world.cultivators[favor.toId];
  if (!asker || !asked) return;
  const wasAccepted = favor.status === "accepted";
  if (favor.itemId) giveItem(asker, favor.itemId, 1);
  favor.itemId = undefined;
  favor.status = reason === "declined" ? "declined" : "failed";
  const detail = reason === "declined"
    ? `${asked.name}没有应下${asker.name}的请托。话拒绝得很明白，两边心里都不痛快。`
    : reason === "abandoned"
      ? `${asked.name}放下了已经应下的请托。${asker.name}托付的事黄了，人情没结上。`
      : wasAccepted
        ? `${asked.name}答应${asker.name}的事过了时辰还没办成。这份请托黄了，人情没结上。`
        : `${asker.name}的请托过了时辰，${asked.name}一直没有应。这份请托黄了。`;
  addMutualAffinity(world, asker.id, asked.id, -FAVOR_AFFINITY_FAIL);
  addMutualGrudge(world, asker.id, asked.id, FAVOR_GRUDGE_FAIL);
  const moodLine = `${detail}心里堵着，一时不想装成没事。`;
  shiftCultivatorMood(world, asker, "rejection", moodLine);
  shiftCultivatorMood(world, asked, "rejection", moodLine);
  writePeople(world, [asker, asked], reason === "declined" ? "请托被回绝了" : "请托黄了", detail, "心里发堵");
  spreadNearbyGossip(
    world,
    [asker.locationId, asked.locationId],
    [asker.id, asked.id],
    "favor-failed",
    `${asked.name}没有办成${asker.name}托付的事。这件事很快传进附近人的耳朵。`,
    `听人说，${asker.name}托${asked.name}的事黄了。`,
  );
}

function favorReason(world: WorldState, favor: PersonalFavor): string {
  const herb = herbName(world);
  if (favor.kind === "fetch-herb") return `替我采了${herb}`;
  if (favor.kind === "escort-gate") return "替我护送到门口";
  if (favor.kind === "guard-breakthrough") return "替我守关";
  return `替我送了${herb}`;
}

function isCloseTo(world: WorldState, leftId: string, rightId: string): boolean {
  const link = getSocialLink(world, leftId, rightId);
  if (link && (link.affinity >= 20 || link.specialBond)) return true;
  const party = getPartyOf(world, leftId);
  return Boolean(party && party.memberIds.includes(rightId));
}

function consumeRepayment(
  world: WorldState,
  helper: Cultivator,
  beneficiary: Cultivator,
): { reason: string; creditor: Cultivator; forFriend: boolean } | null {
  if ((getSocialLink(world, beneficiary.id, helper.id)?.favorBalance ?? 0) > 0) {
    const taken = forgiveOneFavor(world, beneficiary.id, helper.id);
    if (taken) return { reason: taken.reason, creditor: beneficiary, forFriend: false };
  }
  for (const creditorId of Object.keys(world.socialLinks ?? {})) {
    if (creditorId === beneficiary.id || creditorId === helper.id) continue;
    const link = world.socialLinks?.[creditorId]?.[helper.id];
    if (!link || (link.favorBalance ?? 0) <= 0) continue;
    if (!isCloseTo(world, creditorId, beneficiary.id)) continue;
    const creditor = world.cultivators[creditorId];
    if (!creditor) continue;
    const taken = forgiveOneFavor(world, creditorId, helper.id);
    if (!taken) continue;
    return { reason: taken.reason, creditor, forFriend: true };
  }
  return null;
}

function finishFavor(world: WorldState, favor: PersonalFavor, detail: string): ActionExecutionResult {
  const asker = world.cultivators[favor.fromId];
  const asked = world.cultivators[favor.toId];
  if (!asker || !asked) throw new GameplayRejection("请托的人已经不在了。");
  favor.status = "fulfilled";
  addMutualAffinity(world, asker.id, asked.id, FAVOR_AFFINITY_DONE);
  const repay = consumeRepayment(world, asked, asker);
  grantOwedFavor(world, asked.id, asker.id, favorReason(world, favor), favor.kind);
  let page = "";
  if (favor.kind === "escort-gate" || favor.kind === "guard-breakthrough") {
    const fragment = favorFragmentFor(asker);
    if (fragment) {
      asker.inventory[fragment] = (asker.inventory[fragment] ?? 0) + 1;
      page = `${asker.name}手里多了一页功法残页。`;
    }
  }
  const quote = repay ? repaymentQuote(repay.reason) : null;
  const linked = !quote || !repay
    ? ""
    : repay.forFriend
      ? `${asked.name}替${asker.name}办了这件事，算是还${repay.creditor.name}的人情：「${quote}」`
      : `${asked.name}说：「${quote}」`;
  const full = `${linked ? `${detail}${linked}` : detail}${page}`;
  const warm = `${full}这份人情记下了，心里也热着。`;
  shiftCultivatorMood(world, asker, "gift", warm);
  shiftCultivatorMood(world, asked, "gift", warm);
  const third = favor.thirdId ? world.cultivators[favor.thirdId] : undefined;
  const people = [asker, asked, ...(third ? [third] : []), ...(repay?.forFriend ? [repay.creditor] : [])];
  writePeople(
    world,
    people,
    repay ? "人情还上了" : "请托办成了",
    full,
    "心里热着",
    repay ? "repay" : "favor",
    quote ? { speakerName: asked.name, line: quote } : undefined,
  );
  postMessage(world, asker.id, asked.name, "请托办成了", full, asked.id, quote ?? undefined);
  if (repay?.forFriend) postMessage(world, repay.creditor.id, asked.name, "人情还上了", full, asked.id, quote ?? undefined);
  return {
    tick: world.tick,
    cultivatorId: asked.id,
    actionId: `fulfill-favor:${favor.id}`,
    accepted: true,
    summary: full,
  };
}

function requireFavor(world: WorldState, favorId: string): PersonalFavor {
  const favor = world.personalFavors?.[favorId];
  if (!favor) throw new GameplayRejection("这件请托已经不在了。");
  return favor;
}

function unreadFor(world: WorldState, cultivatorId: string): PersonalNote[] {
  return Object.values(world.personalNotes ?? {}).filter((note) => note.toId === cultivatorId && (note.replies ?? []).length === 0);
}

export function expireSocialDeepen(world: WorldState): void {
  ensureMaps(world);
  for (const favor of Object.values(world.personalFavors ?? {})) {
    if ((favor.status !== "offered" && favor.status !== "accepted") || world.tick <= favor.deadlineTick) continue;
    resolveFavorFailure(world, favor, "expired");
  }
  for (const person of Object.values(world.cultivators)) {
    if (!person.waitingFor) continue;
    if (world.tick - person.waitingFor.sinceTick <= WAIT_FOR_TTL) continue;
    person.waitingFor = undefined;
  }
}

export function noteArrivalReunion(world: WorldState, arriver: Cultivator): void {
  const meetings: Array<{ waiter: Cultivator; target: Cultivator }> = [];
  const seen = new Set<string>();
  const consider = (waiter: Cultivator, target: Cultivator) => {
    const wait = waiter.waitingFor;
    if (!wait || wait.targetId !== target.id) return;
    if (waiter.locationId !== target.locationId || target.activeJobId) return;
    const key = [waiter.id, target.id].sort().join(":");
    if (seen.has(key)) return;
    seen.add(key);
    meetings.push({ waiter, target });
  };
  const waitedFor = arriver.waitingFor ? world.cultivators[arriver.waitingFor.targetId] : undefined;
  if (waitedFor) consider(arriver, waitedFor);
  for (const other of Object.values(world.cultivators)) {
    if (other.id !== arriver.id) consider(other, arriver);
  }
  for (const meeting of meetings) {
    const wait = meeting.waiter.waitingFor;
    meeting.waiter.waitingFor = undefined;
    if (!wait || world.tick - wait.sinceTick > WAIT_FOR_TTL) continue;
    const coolKey = `reunite:${[meeting.waiter.id, meeting.target.id].sort().join(":")}`;
    if (cooling(meeting.waiter, coolKey, world.tick, REUNITE_COOLDOWN_TICKS)) continue;
    if (cooling(meeting.target, coolKey, world.tick, REUNITE_COOLDOWN_TICKS)) continue;
    const place = placeName(world, meeting.waiter.locationId);
    const traveled = meeting.waiter.id === arriver.id;
    const detail = traveled
      ? `${meeting.waiter.name}赶到${place}，${meeting.target.name}已经在。人见面了，这一面算是重逢。`
      : `${meeting.waiter.name}在${place}等到了${meeting.target.name}。人到了，这一面算是重逢。`;
    writePeople(world, [meeting.waiter, meeting.target], "人见面了", detail, "这一面算是重逢", "reunite");
    markCool(meeting.waiter, coolKey, world.tick);
    markCool(meeting.target, coolKey, world.tick);
    markCool(meeting.waiter, `wait-for:${meeting.target.id}`, world.tick);
  }
  noteCrossing(world, arriver);
}

function acceptedFavorBetween(world: WorldState, leftId: string, rightId: string): boolean {
  return Object.values(world.personalFavors ?? {}).some((favor) => (
    favor.status === "accepted"
    && ((favor.fromId === leftId && favor.toId === rightId) || (favor.fromId === rightId && favor.toId === leftId))
  ));
}

function noteCrossing(world: WorldState, arriver: Cultivator): void {
  const others = Object.values(world.cultivators).filter((other) => other.id !== arriver.id && other.locationId === arriver.locationId);
  let foe: Cultivator | null = null;
  let arc: "嫌隙" | "宿怨" | null = null;
  for (const other of others) {
    const found = grudgeArcOf(getSocialLink(world, arriver.id, other.id)?.grudge ?? 0);
    if (!found) continue;
    if (!arc || found === "宿怨") {
      foe = other;
      arc = found;
    }
  }
  const place = placeName(world, arriver.locationId);
  if (foe && arc) {
    const key = `feud-meet:${[arriver.id, foe.id].sort().join(":")}`;
    if (!cooling(arriver, key, world.tick, 6) && !cooling(foe, key, world.tick, 6)) {
      const errand = acceptedFavorBetween(world, arriver.id, foe.id);
      const detail = `${arriver.name}进了${place}，${foe.name}已经在。两个人有${arc}，见面剑拔弩张。${errand ? "答应的事还没办完。" : ""}`;
      writePeople(world, [arriver, foe], "再见面了", detail, "剑拔弩张", "reunite");
      const mood = `${arriver.name}和${foe.name}再见面，剑拔弩张。`;
      shiftCultivatorMood(world, arriver, "rejection", mood);
      shiftCultivatorMood(world, foe, "rejection", mood);
      markCool(arriver, key, world.tick);
      markCool(foe, key, world.tick);
      return;
    }
  }
  for (const other of others) {
    if (!acceptedFavorBetween(world, arriver.id, other.id)) continue;
    const key = `favor-sight:${[arriver.id, other.id].sort().join(":")}`;
    if (cooling(arriver, key, world.tick, 6) || cooling(other, key, world.tick, 6)) continue;
    const detail = `${arriver.name}在${place}看见${other.name}。答应的事还没办完。`;
    writePeople(world, [arriver, other], "答应的事还挂着", detail, "事情还没办完", "favor");
    markCool(arriver, key, world.tick);
    markCool(other, key, world.tick);
    return;
  }
}

export function performSocialDeepenAction(
  world: WorldState,
  cultivator: Cultivator,
  actionId: string,
  speechLine?: string | null,
): ActionExecutionResult | null {
  ensureMaps(world);
  const ask = parseAskFavor(actionId);
  if (ask) return askFavor(world, cultivator, ask.targetId, ask.kind, ask.thirdId, speechLine);
  if (actionId.startsWith("accept-favor:")) return acceptFavor(world, cultivator, actionId.slice("accept-favor:".length), speechLine);
  if (actionId.startsWith("wait-for:")) return waitForPerson(world, cultivator, actionId.slice("wait-for:".length));
  if (actionId.startsWith("decline-favor:")) return declineFavor(world, cultivator, actionId.slice("decline-favor:".length));
  if (actionId.startsWith("fulfill-favor:")) return fulfillFavor(world, cultivator, actionId.slice("fulfill-favor:".length));
  if (actionId.startsWith("abandon-favor:")) return abandonFavor(world, cultivator, actionId.slice("abandon-favor:".length));
  if (actionId.startsWith("leave-note:")) return leaveNote(world, cultivator, actionId.slice("leave-note:".length), speechLine);
  if (actionId.startsWith("read-note:")) return readNote(world, cultivator, actionId.slice("read-note:".length));
  if (actionId.startsWith("reply-note:")) return replyNote(world, cultivator, actionId.slice("reply-note:".length), speechLine);
  if (actionId === "leave-spot-note") return leaveSpotNote(world, cultivator, speechLine);
  if (actionId.startsWith("reply-spot-note:")) return replySpotNote(world, cultivator, actionId.slice("reply-spot-note:".length), speechLine);
  if (actionId === "post-sect-notice") return postSectNotice(world, cultivator, speechLine);
  if (actionId.startsWith("reply-sect-notice:")) return replySectNotice(world, cultivator, actionId.slice("reply-sect-notice:".length), speechLine);
  if (actionId.startsWith("join-sect-task:")) return joinSectTask(world, cultivator, actionId.slice("join-sect-task:".length));
  if (actionId.startsWith("guide-junior:")) return guideJunior(world, cultivator, actionId.slice("guide-junior:".length));
  const mention = /^mention-gossip:([^:]+):(.+)$/.exec(actionId);
  if (mention) return mentionGossip(world, cultivator, mention[1]!, mention[2]!, speechLine);
  return null;
}

function parseAskFavor(actionId: string): { targetId: string; kind: FavorKind; thirdId?: string } | null {
  if (!actionId.startsWith("ask-favor:")) return null;
  const rest = actionId.slice("ask-favor:".length);
  const deliver = /^(.*):deliver-gift:(.+)$/.exec(rest);
  if (deliver?.[1] && deliver[2]) return { targetId: deliver[1], kind: "deliver-gift", thirdId: deliver[2] };
  for (const kind of FAVOR_KINDS) {
    if (kind === "deliver-gift") continue;
    const suffix = `:${kind}`;
    if (rest.endsWith(suffix)) return { targetId: rest.slice(0, -suffix.length), kind };
  }
  return null;
}

function askFavor(
  world: WorldState,
  cultivator: Cultivator,
  targetId: string,
  kind: FavorKind,
  thirdId: string | undefined,
  speechLine?: string | null,
): ActionExecutionResult {
  const target = world.cultivators[targetId];
  if (!target) throw new GameplayRejection("你要托的人不在这世上。");
  if (target.id === cultivator.id) throw new GameplayRejection("这件事情不能托给自己。");
  if (!samePlace(cultivator, target)) throw new GameplayRejection("请托要当面说。人得在眼前。");
  if (cooling(cultivator, `ask-favor:${target.id}`, world.tick, ASK_FAVOR_COOLDOWN_TICKS)) {
    throw new GameplayRejection(`你刚托过${target.name}。隔几刻再开口。`);
  }
  const open = openFavors(world);
  if (open.filter((favor) => favor.fromId === cultivator.id).length >= OPEN_FAVOR_LIMIT) {
    throw new GameplayRejection("你手上已经有两件还没结果的请托。等一件了结再开口。");
  }
  if (open.some((favor) => favor.fromId === cultivator.id && favor.toId === target.id)) {
    throw new GameplayRejection(`你已经托了${target.name}一件事。等这件有结果再开口。`);
  }
  if (open.filter((favor) => favor.toId === target.id && favor.status === "offered").length >= INCOMING_FAVOR_LIMIT) {
    throw new GameplayRejection(`${target.name}手头的请托已经堆着了。等对方清一清再托。`);
  }
  const third = thirdId ? world.cultivators[thirdId] : undefined;
  if (kind === "deliver-gift" && (!third || third.id === cultivator.id || third.id === target.id)) {
    throw new GameplayRejection("送礼得有第三个人，而且不能是你自己或跑腿的人。");
  }
  const purpose = kind === "fetch-herb" ? "ask-fetch" : kind === "escort-gate" ? "ask-escort" : kind === "guard-breakthrough" ? "ask-guard" : "ask-deliver";
  const spoken = errandLine(world, cultivator.id, target.id, purpose, speechLine, {
    herb: herbName(world),
    thirdName: third?.name,
  });
  if (kind === "deliver-gift" && !takeItem(cultivator, FAVOR_HERB_ID)) {
    throw new GameplayRejection(`身上没有${herbName(world)}，这件礼送不出去。`);
  }
  const favor: PersonalFavor = {
    id: `favor-${takeSequence(world, "nextPersonalFavorSequence")}`,
    kind,
    fromId: cultivator.id,
    toId: target.id,
    ...(third ? { thirdId: third.id } : {}),
    ...(kind === "deliver-gift" ? { itemId: FAVOR_HERB_ID } : {}),
    status: "offered",
    createdAtTick: world.tick,
    deadlineTick: world.tick + FAVOR_OFFER_TTL,
    locationId: cultivator.locationId,
    line: spoken,
  };
  world.personalFavors![favor.id] = favor;
  markCool(cultivator, `ask-favor:${target.id}`, world.tick);
  const detail = FAVOR_ASK[kind](cultivator.name, target.name, third?.name ?? "某人", herbName(world));
  const withLine = `${detail}${cultivator.name}当面说：「${spoken}」`;
  writePeople(world, [cultivator, target], "开口请托", withLine, "把事情说出口了", "favor", { speakerName: cultivator.name, line: spoken });
  postMessage(world, target.id, cultivator.name, "有人请托", withLine, cultivator.id, spoken);
  return {
    tick: world.tick,
    cultivatorId: cultivator.id,
    actionId: `ask-favor:${target.id}:${kind}${third ? `:${third.id}` : ""}` as ActionExecutionResult["actionId"],
    accepted: true,
    summary: withLine,
  };
}

function acceptFavor(world: WorldState, cultivator: Cultivator, favorId: string, speechLine?: string | null): ActionExecutionResult {
  const favor = requireFavor(world, favorId);
  if (favor.toId !== cultivator.id || favor.status !== "offered") throw new GameplayRejection("这件请托不是在等你应。");
  const asker = world.cultivators[favor.fromId];
  if (!asker) throw new GameplayRejection("请托的人已经不在了。");
  const spoken = errandLine(world, cultivator.id, asker.id, "accept", speechLine, { heard: favor.line, herb: herbName(world) });
  favor.status = "accepted";
  favor.deadlineTick = world.tick + FAVOR_WORK_TTL;
  const detail = `${cultivator.name}应下了${asker.name}的请托，说：「${spoken}」事情还没办完，可话已经接住了。`;
  writePeople(world, [cultivator, asker], "应下了请托", detail, "事情接住了", "favor", { speakerName: cultivator.name, line: spoken });
  postMessage(world, asker.id, cultivator.name, "请托有人应", detail, cultivator.id, spoken);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `accept-favor:${favor.id}`, accepted: true, summary: detail };
}

function waitForPerson(world: WorldState, cultivator: Cultivator, targetId: string): ActionExecutionResult {
  const target = world.cultivators[targetId];
  if (!target) throw new GameplayRejection("你要等的人不在这世上。");
  if (target.id === cultivator.id) throw new GameplayRejection("不用等自己。");
  if (cultivator.waitingFor) throw new GameplayRejection(`你已经在等${personName(world, cultivator.waitingFor.targetId)}。先见到了，再等下一个。`);
  if (cooling(cultivator, `wait-for:${target.id}`, world.tick, REUNITE_COOLDOWN_TICKS)) {
    throw new GameplayRejection(`你刚和${target.name}见过面。隔一阵再等。`);
  }
  const party = getPartyOf(world, cultivator.id);
  const mate = Boolean(party && party.memberIds.includes(target.id));
  if (!mate && !isFavorPartner(world, cultivator, target)) {
    throw new GameplayRejection(`只有同队的人，或有人情往来的人，才值得在这里等${target.name}。`);
  }
  const moving = isOnTheRoad(world, cultivator) || isOnTheRoad(world, target);
  if (!moving && samePlace(cultivator, target)) throw new GameplayRejection(`${target.name}就在眼前，不必专门等。`);
  if (!moving && !inAnotherCity(world, cultivator, target)) {
    throw new GameplayRejection(`${target.name}还在这城里。等人出了城，再在这里等。`);
  }
  cultivator.waitingFor = { targetId: target.id, sinceTick: world.tick, placeId: cultivator.locationId };
  markCool(cultivator, `wait-for:${target.id}`, world.tick);
  const place = placeName(world, cultivator.locationId);
  const detail = `${cultivator.name}在${place}等${target.name}。人还在路上，这一面先记着。`;
  pushTravelNote(cultivator, travelNote({
    tick: world.tick,
    kind: "person",
    title: `在原地等${target.name}`,
    detail,
    locationId: cultivator.locationId,
    mood: "人还在路上",
  }));
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `wait-for:${target.id}`, accepted: true, summary: detail };
}

function declineFavor(world: WorldState, cultivator: Cultivator, favorId: string): ActionExecutionResult {
  const favor = requireFavor(world, favorId);
  if (favor.toId !== cultivator.id || favor.status !== "offered") throw new GameplayRejection("这件请托不是在等你回绝。");
  resolveFavorFailure(world, favor, "declined");
  const asker = personName(world, favor.fromId);
  const detail = `${cultivator.name}没有应下${asker}的请托。`;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `decline-favor:${favor.id}`, accepted: true, summary: detail };
}

function abandonFavor(world: WorldState, cultivator: Cultivator, favorId: string): ActionExecutionResult {
  const favor = requireFavor(world, favorId);
  if (favor.toId !== cultivator.id || favor.status !== "accepted") throw new GameplayRejection("这件请托不是你正在办的。");
  resolveFavorFailure(world, favor, "abandoned");
  const detail = `${cultivator.name}把应下的请托放下了。这件事黄了。`;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `abandon-favor:${favor.id}`, accepted: true, summary: detail };
}

function fulfillFavor(world: WorldState, cultivator: Cultivator, favorId: string): ActionExecutionResult {
  const favor = requireFavor(world, favorId);
  if (favor.toId !== cultivator.id || favor.status !== "accepted") throw new GameplayRejection("这件请托不是你正在办的。");
  if (world.tick > favor.deadlineTick) {
    resolveFavorFailure(world, favor, "expired");
    throw new GameplayRejection("这件请托过了时辰，已经黄了。");
  }
  const asker = world.cultivators[favor.fromId];
  if (!asker) throw new GameplayRejection("请托的人已经不在了。");
  const herb = herbName(world);
  if (favor.kind === "fetch-herb") {
    if (!samePlace(cultivator, asker)) throw new GameplayRejection(`${asker.name}不在眼前，${herb}交不出去。`);
    if (!takeItem(cultivator, FAVOR_HERB_ID)) throw new GameplayRejection(`身上还没有${herb}。采到了再来交。`);
    giveItem(asker, FAVOR_HERB_ID);
    return finishFavor(world, favor, `${cultivator.name}把一株${herb}交到${asker.name}手里。差事办成了，${asker.name}欠${cultivator.name}一份人情。`);
  }
  if (favor.kind === "escort-gate") {
    if (!samePlace(cultivator, asker) || !isDungeonGate(world, cultivator.locationId)) {
      throw new GameplayRejection(`两个人得一起站在地宫门口，这件护送才算送到。`);
    }
    return finishFavor(world, favor, `${cultivator.name}把${asker.name}送到了${placeName(world, cultivator.locationId)}的门口。人到了，${asker.name}欠${cultivator.name}一份人情。`);
  }
  if (favor.kind === "guard-breakthrough") {
    if (cultivator.locationId !== asker.residence.locationId || asker.locationId !== asker.residence.locationId) {
      throw new GameplayRejection(`得守在${asker.name}的洞府外面。人没到洞府，这班守不了。`);
    }
    asker.breakthroughWatch = { guardId: cultivator.id, guardName: cultivator.name, untilTick: world.tick + 3 };
    return finishFavor(world, favor, `${cultivator.name}守在${asker.name}的洞府外。这一场破境有人看着，${asker.name}欠${cultivator.name}一份人情。`);
  }
  const third = favor.thirdId ? world.cultivators[favor.thirdId] : undefined;
  if (!third) throw new GameplayRejection("收礼的人已经不在了，这件礼送不出去。");
  if (favor.itemId) giveItem(third, favor.itemId);
  const handed = samePlace(cultivator, third) ? "当面交到" : "送到";
  const detail = `${cultivator.name}把${asker.name}托付的${herb}${handed}了${third.name}手里。差事办成了，${asker.name}欠${cultivator.name}一份人情。`;
  postMessage(world, third.id, cultivator.name, "有人送来东西", detail, cultivator.id);
  return finishFavor(world, favor, detail);
}

function leaveNote(world: WorldState, cultivator: Cultivator, targetId: string, speechLine?: string | null): ActionExecutionResult {
  const target = world.cultivators[targetId];
  if (!target) throw new GameplayRejection("你要留字条的人不在这世上。");
  if (target.id === cultivator.id) throw new GameplayRejection("字条不能留给自己。");
  if (cooling(cultivator, `note:${target.id}`, world.tick, NOTE_COOLDOWN_TICKS)) {
    throw new GameplayRejection(`你刚给${target.name}留过字条。隔几刻再留。`);
  }
  if (unreadFor(world, target.id).length >= UNREAD_NOTE_LIMIT) {
    throw new GameplayRejection(`${target.name}的字条已经堆着了。等对方看过再留。`);
  }
  const line = lineOr(speechLine, cleanSpokenLine(`人没见着。回来先看这张字条，我在${placeName(world, cultivator.locationId)}。`) ?? "人没见着，回来先看这张字条。");
  const note: PersonalNote = {
    id: `note-${takeSequence(world, "nextPersonalNoteSequence")}`,
    fromId: cultivator.id,
    toId: target.id,
    locationId: cultivator.locationId,
    line,
    tick: world.tick,
  };
  world.personalNotes![note.id] = note;
  markCool(cultivator, `note:${target.id}`, world.tick);
  const away = samePlace(cultivator, target) ? "人就在附近" : "人这会儿不在眼前";
  const detail = `${cultivator.name}给${target.name}留了字条：「${line}」${away}，回来可以看，也可以回一句。`;
  writePeople(world, [cultivator, target], "留了字条", detail, "话先放下了", "note", { speakerName: cultivator.name, line });
  postMessage(world, target.id, cultivator.name, "有人留了字条", detail, cultivator.id, line);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `leave-note:${target.id}`, accepted: true, summary: detail };
}

function readNote(world: WorldState, cultivator: Cultivator, noteId: string): ActionExecutionResult {
  const note = world.personalNotes?.[noteId];
  if (!note || note.toId !== cultivator.id) throw new GameplayRejection("没有这张留给你的字条。");
  const fromName = personName(world, note.fromId);
  if (note.seenTick === undefined) {
    note.seenTick = world.tick;
    const author = world.cultivators[note.fromId];
    const base = `${cultivator.name}看到了${fromName}留下的字条：「${note.line}」`;
    const detail = author ? relationBeat(world, cultivator, author, base, 3) : base;
    writePeople(world, author ? [cultivator, author] : [cultivator], "看了字条", detail, "话还在纸上", "note");
    return { tick: world.tick, cultivatorId: cultivator.id, actionId: `read-note:${note.id}`, accepted: true, summary: detail };
  }
  const detail = `${cultivator.name}看过${fromName}的字条了。`;
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `read-note:${note.id}`, accepted: true, summary: detail };
}

function rememberReply(note: { replies?: NoteReply[] }, reply: NoteReply): void {
  note.replies = [...(note.replies ?? []), reply].slice(-4);
}

function replyNote(world: WorldState, cultivator: Cultivator, noteId: string, speechLine?: string | null): ActionExecutionResult {
  const note = world.personalNotes?.[noteId];
  if (!note || note.toId !== cultivator.id) throw new GameplayRejection("没有这张留给你的字条。");
  if ((note.replies ?? []).length > 0) throw new GameplayRejection("这张字条你已经回过了。");
  const author = world.cultivators[note.fromId];
  if (!author) throw new GameplayRejection("留字条的人已经不在了。");
  if (note.seenTick === undefined) note.seenTick = world.tick;
  const line = errandLine(world, cultivator.id, author.id, "note", speechLine, { heard: note.line });
  rememberReply(note, { fromId: cultivator.id, fromName: cultivator.name, line, tick: world.tick });
  const detail = relationBeat(world, cultivator, author, `${cultivator.name}回了${author.name}的字条：「${line}」`, 4);
  writePeople(world, [cultivator, author], "字条有了回音", detail, "话接上了", "note", { speakerName: cultivator.name, line });
  recordLife(cultivator, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  recordLife(author, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  postMessage(world, author.id, cultivator.name, "字条有回音", detail, cultivator.id, line);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `reply-note:${note.id}`, accepted: true, summary: detail };
}

function leaveSpotNote(world: WorldState, cultivator: Cultivator, speechLine?: string | null): ActionExecutionResult {
  const location = world.locations[cultivator.locationId];
  if (!location || location.kind !== "safe") throw new GameplayRejection("只有安稳的地方才好留字条。");
  if (cooling(cultivator, `spot:${cultivator.locationId}`, world.tick, NOTE_COOLDOWN_TICKS)) {
    throw new GameplayRejection("你刚在这里留过字条。隔几刻再留。");
  }
  const pinned = Object.values(world.personalNotes ?? {}).filter((note) => note.toId === null && note.locationId === cultivator.locationId);
  if (pinned.length >= SPOT_NOTE_LIMIT) throw new GameplayRejection("这里的字条已经贴满了。等旧的被人看见再留。");
  const line = lineOr(speechLine, cleanSpokenLine(`后来的人看见，替我在${placeName(world, cultivator.locationId)}问一声。`) ?? "后来的人看见，替我问一声。");
  const note: PersonalNote = {
    id: `note-${takeSequence(world, "nextPersonalNoteSequence")}`,
    fromId: cultivator.id,
    toId: null,
    locationId: cultivator.locationId,
    line,
    tick: world.tick,
  };
  world.personalNotes![note.id] = note;
  markCool(cultivator, `spot:${cultivator.locationId}`, world.tick);
  const detail = `${cultivator.name}在${placeName(world, cultivator.locationId)}留了字条：「${line}」后来的人看见了可以回一句。`;
  writePeople(world, [cultivator], "在原地留了话", detail, "话留在了原地", "note", { speakerName: cultivator.name, line });
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: "leave-spot-note", accepted: true, summary: detail };
}

function replySpotNote(world: WorldState, cultivator: Cultivator, noteId: string, speechLine?: string | null): ActionExecutionResult {
  const note = world.personalNotes?.[noteId];
  if (!note || note.toId !== null) throw new GameplayRejection("这里没有这张字条。");
  if (note.locationId !== cultivator.locationId) throw new GameplayRejection("字条留在别处。人得到那地方才能回。");
  if (note.fromId === cultivator.id) throw new GameplayRejection("这是你自己留的字条。");
  if ((note.replies ?? []).some((reply) => reply.fromId === cultivator.id)) throw new GameplayRejection("这张字条你已经回过了。");
  if ((note.replies ?? []).length >= 4) throw new GameplayRejection("这张字条下面已经写满了，不必再添一句。");
  const author = world.cultivators[note.fromId];
  if (!author) throw new GameplayRejection("留字条的人已经不在了。");
  const line = errandLine(world, cultivator.id, author.id, "note", speechLine, { heard: note.line });
  rememberReply(note, { fromId: cultivator.id, fromName: cultivator.name, line, tick: world.tick });
  const detail = relationBeat(world, cultivator, author, `${cultivator.name}在${placeName(world, note.locationId)}回了${author.name}的留话：「${line}」`, 4);
  writePeople(world, [cultivator, author], "留话有了回音", detail, "话接上了", "note", { speakerName: cultivator.name, line });
  recordLife(cultivator, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  recordLife(author, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  postMessage(world, author.id, cultivator.name, "留话有回音", detail, cultivator.id, line);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `reply-spot-note:${note.id}`, accepted: true, summary: detail };
}

function postSectNotice(world: WorldState, cultivator: Cultivator, speechLine?: string | null): ActionExecutionResult {
  const key = sectKeyOf(cultivator);
  if (!key) throw new GameplayRejection("你还没有宗门，告示上没有你的位置。");
  const location = world.locations[cultivator.locationId];
  if (!location || location.kind !== "safe") throw new GameplayRejection("得到安稳的地方，才能把话写上宗门告示。");
  if (cooling(cultivator, "sect-notice", world.tick, SECT_NOTICE_COOLDOWN_TICKS)) {
    throw new GameplayRejection("你刚在宗门告示上留过话。隔几刻再写。");
  }
  const sectDefaults = [
    "同门路过驻地时看一眼告示，有事再回我。",
    "告示上记一笔。差事有变，回来再说。",
    "人在路上。同门看见这条，知道我还在。",
  ];
  const line = lineOr(speechLine, sectDefaults[Math.abs(world.tick) % sectDefaults.length] ?? sectDefaults[0]!);
  const notice: SectNotice = {
    id: `sect-notice-${takeSequence(world, "nextSectNoticeSequence")}`,
    sectKey: key,
    authorId: cultivator.id,
    authorName: cultivator.name,
    tick: world.tick,
    text: line,
  };
  const board = world.sectBoards![key] ?? [];
  world.sectBoards![key] = [notice, ...board].slice(0, SECT_NOTICE_LIMIT);
  markCool(cultivator, "sect-notice", world.tick);
  const detail = `${cultivator.name}在${sectNameOf(world, cultivator)}的告示上写了一句：「${line}」同门回头都能看见。`;
  writePeople(world, [cultivator], "宗门告示上留了话", detail, "话留给了同门", "sect", { speakerName: cultivator.name, line });
  for (const mate of Object.values(world.cultivators)) {
    if (mate.id === cultivator.id || sectKeyOf(mate) !== key) continue;
    postMessage(world, mate.id, cultivator.name, "宗门告示", detail, cultivator.id, line);
    recordLife(mate, { tick: world.tick, kind: "relationship", text: detail, topic: "sect", names: [cultivator.name, mate.name] });
  }
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: "post-sect-notice", accepted: true, summary: detail };
}

function replySectNotice(world: WorldState, cultivator: Cultivator, noticeId: string, speechLine?: string | null): ActionExecutionResult {
  const key = sectKeyOf(cultivator);
  if (!key) throw new GameplayRejection("你还没有宗门。");
  const notice = (world.sectBoards?.[key] ?? []).find((row) => row.id === noticeId);
  if (!notice) throw new GameplayRejection("宗门告示上没有这一条。");
  if (notice.authorId === cultivator.id) throw new GameplayRejection("这是你自己写的告示。");
  if ((notice.replies ?? []).some((reply) => reply.fromId === cultivator.id)) throw new GameplayRejection("这条告示你已经回过了。");
  const author = world.cultivators[notice.authorId];
  if (!author) throw new GameplayRejection("写告示的人已经不在了。");
  const line = errandLine(world, cultivator.id, author.id, "note", speechLine, { heard: notice.text });
  rememberReply(notice, { fromId: cultivator.id, fromName: cultivator.name, line, tick: world.tick });
  const detail = relationBeat(world, cultivator, author, `${cultivator.name}回了${author.name}的宗门告示：「${line}」`, 4);
  writePeople(world, [cultivator, author], "告示有了回音", detail, "同门把话接上了", "sect", { speakerName: cultivator.name, line });
  recordLife(cultivator, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  recordLife(author, { tick: world.tick, kind: "quote", text: `${cultivator.name}说：「${line}」`, speakerName: cultivator.name, line });
  postMessage(world, author.id, cultivator.name, "告示有回音", detail, cultivator.id, line);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `reply-sect-notice:${notice.id}`, accepted: true, summary: detail };
}

function joinSectTask(world: WorldState, cultivator: Cultivator, mateId: string): ActionExecutionResult {
  const mate = world.cultivators[mateId];
  const key = sectKeyOf(cultivator);
  if (!mate || !key || key !== sectKeyOf(mate)) throw new GameplayRejection("只有同门才一起办这趟差事。");
  if (!samePlace(cultivator, mate)) throw new GameplayRejection("人得在一起，这趟差事才办得成。");
  if (cultivator.activeJobId || mate.activeJobId) throw new GameplayRejection("有人还在忙，这趟差事先放一放。");
  if (cooling(cultivator, `joint:${mate.id}`, world.tick, JOINT_SECT_COOLDOWN_TICKS)) {
    throw new GameplayRejection(`你和${mate.name}刚一起办过差事。隔几刻再去。`);
  }
  markCool(cultivator, `joint:${mate.id}`, world.tick);
  markCool(mate, `joint:${cultivator.id}`, world.tick);
  addContribution(cultivator, JOINT_CONTRIBUTION);
  addContribution(mate, JOINT_CONTRIBUTION);
  cultivator.spiritStones += 6;
  mate.spiritStones += 6;
  addMutualAffinity(world, cultivator.id, mate.id, 8);
  const detail = `${cultivator.name}和${mate.name}一起办完了${sectNameOf(world, cultivator)}的一趟差事。两个人都记了一笔贡献，口袋里也各进了六枚灵石。`;
  writePeople(world, [cultivator, mate], "同门一起办了差事", detail, "同门在身边", "sect");
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `join-sect-task:${mate.id}`, accepted: true, summary: detail };
}

function guideJunior(world: WorldState, cultivator: Cultivator, juniorId: string): ActionExecutionResult {
  const junior = world.cultivators[juniorId];
  const key = sectKeyOf(cultivator);
  if (!junior || !key || key !== sectKeyOf(junior)) throw new GameplayRejection("只能提点同门的后辈。");
  if (!samePlace(cultivator, junior)) throw new GameplayRejection("人得在眼前，才能提点。");
  if (!isSenior(cultivator, junior)) throw new GameplayRejection(`${junior.name}并不是你的后辈。`);
  if (cooling(cultivator, `guide:${junior.id}`, world.tick, GUIDE_COOLDOWN_TICKS)) {
    throw new GameplayRejection(`你刚提点过${junior.name}。隔几刻再带。`);
  }
  if (cultivator.spiritualPower < GUIDE_SPIRIT) throw new GameplayRejection("灵力不够，这程带不了。");
  cultivator.spiritualPower -= GUIDE_SPIRIT;
  markCool(cultivator, `guide:${junior.id}`, world.tick);
  addContribution(cultivator, GUIDE_SENIOR_CONTRIBUTION);
  addContribution(junior, GUIDE_JUNIOR_CONTRIBUTION);
  junior.realmProgress = Math.min(100, junior.realmProgress + GUIDE_PROGRESS);
  addMutualAffinity(world, cultivator.id, junior.id, 10);
  const detail = `${cultivator.name}带${junior.name}走了一程。后辈的修为长了一点，两个人的宗门贡献也各自记上了。`;
  writePeople(world, [cultivator, junior], "前辈带了后辈", detail, "同门把你带了一程", "sect");
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `guide-junior:${junior.id}`, accepted: true, summary: detail };
}

function mentionGossip(
  world: WorldState,
  cultivator: Cultivator,
  gossipId: string,
  targetId: string,
  speechLine?: string | null,
): ActionExecutionResult {
  const heard = (cultivator.heardGossip ?? []).find((item) => item.id === gossipId);
  if (!heard) throw new GameplayRejection("你没有听见这件事，说不出口。");
  const target = world.cultivators[targetId];
  if (!target) throw new GameplayRejection("你要告诉的人不在这世上。");
  if (!samePlace(cultivator, target)) throw new GameplayRejection("闲话要当面说。人得在眼前。");
  const line = lineOr(speechLine, heard.shortLine);
  const spoken = openSpokenLine(world, cultivator.id, target.id, "say", world.tick, line);
  heard.mentioned = true;
  const board = (world.gossip ?? []).find((item) => item.id === heard.id);
  const aimed = Boolean(board?.aboutIds.includes(target.id) || heard.text.includes(target.name) || heard.shortLine.includes(target.name));
  let detail: string;
  if (heard.kind === "feud" && aimed) {
    detail = `${cultivator.name}把嫌隙的闲话当着${target.name}的面说了：「${spoken}」话没热，剑拔弩张，好感没有涨。`;
    const mood = `${cultivator.name}和${target.name}话没热，剑拔弩张。`;
    shiftCultivatorMood(world, cultivator, "rejection", mood);
    shiftCultivatorMood(world, target, "rejection", mood);
  } else {
    addMutualAffinity(world, cultivator.id, target.id, heard.kind === "bond" ? 3 : 2);
    detail = `${cultivator.name}把听见的事告诉了${target.name}：「${spoken}」好感轻轻动了一点。`;
    shiftCultivatorMood(world, cultivator, "spoken", `${cultivator.name}把听见的事告诉了${target.name}。`);
  }
  writePeople(world, [cultivator, target], "把闲话告诉了身边的人", detail, "话传出去了", "gossip", { speakerName: cultivator.name, line: spoken });
  postMessage(world, target.id, cultivator.name, "听见一件闲话", detail, cultivator.id, spoken);
  return { tick: world.tick, cultivatorId: cultivator.id, actionId: `mention-gossip:${gossipId}:${target.id}`, accepted: true, summary: detail };
}

export function socialDeepenView(world: WorldState, cultivator: Cultivator): {
  favors?: FavorView[];
  pendingNotes?: PendingNoteView[];
  spotNotes?: SpotNoteView[];
  sectBoard?: SectNoticeView[];
  gossip?: GossipView[];
} {
  ensureMaps(world);
  const favors: FavorView[] = [];
  for (const favor of openFavors(world)) {
    const incoming = favor.toId === cultivator.id && favor.status === "offered";
    const doing = favor.toId === cultivator.id && favor.status === "accepted";
    const outgoing = favor.fromId === cultivator.id;
    if (!incoming && !doing && !outgoing) continue;
    const otherId = outgoing ? favor.toId : favor.fromId;
    favors.push({
      id: favor.id,
      kind: favor.kind,
      status: favor.status === "accepted" ? "accepted" : "offered",
      role: doing ? "doing" : incoming ? "incoming" : "outgoing",
      otherId,
      otherName: personName(world, otherId),
      ...(favor.thirdId ? { thirdId: favor.thirdId, thirdName: personName(world, favor.thirdId) } : {}),
      summary: favorSummary(world, favor),
      deadlineTick: favor.deadlineTick,
      ...(incoming ? { acceptActionId: `accept-favor:${favor.id}`, declineActionId: `decline-favor:${favor.id}` } : {}),
      ...(doing ? { fulfillActionId: `fulfill-favor:${favor.id}`, abandonActionId: `abandon-favor:${favor.id}` } : {}),
    });
  }
  const pendingNotes: PendingNoteView[] = Object.values(world.personalNotes ?? {})
    .filter((note) => note.toId === cultivator.id && (note.replies ?? []).length === 0)
    .map((note) => ({
      id: note.id,
      fromId: note.fromId,
      fromName: personName(world, note.fromId),
      line: note.line,
      tick: note.tick,
      placeName: placeName(world, note.locationId),
      readActionId: `read-note:${note.id}`,
      replyActionId: `reply-note:${note.id}`,
    }));
  const spotNotes: SpotNoteView[] = Object.values(world.personalNotes ?? {})
    .filter((note) => note.toId === null && note.locationId === cultivator.locationId && note.fromId !== cultivator.id && !(note.replies ?? []).some((reply) => reply.fromId === cultivator.id))
    .map((note) => ({
      id: note.id,
      fromId: note.fromId,
      fromName: personName(world, note.fromId),
      line: note.line,
      tick: note.tick,
      replyActionId: `reply-spot-note:${note.id}`,
    }));
  const key = sectKeyOf(cultivator);
  const sectBoard: SectNoticeView[] = key
    ? (world.sectBoards?.[key] ?? []).slice(0, 6).map((notice) => ({
        id: notice.id,
        authorId: notice.authorId,
        authorName: notice.authorName,
        text: notice.text,
        tick: notice.tick,
        ...((notice.authorId === cultivator.id || (notice.replies ?? []).some((reply) => reply.fromId === cultivator.id))
          ? {}
          : { replyActionId: `reply-sect-notice:${notice.id}` }),
      }))
    : [];
  const gossip: GossipView[] = (cultivator.heardGossip ?? [])
    .filter((item) => world.tick - item.tick <= 6)
    .map((item) => ({ id: item.id, kind: item.kind, text: item.text, shortLine: item.shortLine, tick: item.tick }));
  return {
    ...(favors.length > 0 ? { favors } : {}),
    ...(pendingNotes.length > 0 ? { pendingNotes } : {}),
    ...(spotNotes.length > 0 ? { spotNotes } : {}),
    ...(sectBoard.length > 0 ? { sectBoard } : {}),
    ...(gossip.length > 0 ? { gossip } : {}),
  };
}
