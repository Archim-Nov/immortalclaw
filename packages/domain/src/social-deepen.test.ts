import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";
import { addMutualAffinity, getSocialLink } from "./social.js";
import { ASK_FAVOR_COOLDOWN_TICKS, FAVOR_HERB_ID } from "./social-deepen.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawn(names: string[]) {
  const world = createSeedWorld();
  const people = [world.cultivators[CULTIVATOR_ID]!];
  for (const name of names) {
    const summary = syncCultivatorFromPersona(world, { agentId: `agent-${name}`, name });
    people.push(world.cultivators[summary.selectedCultivatorId]!);
  }
  for (const person of people) {
    person.locationId = "qingzhou:main-city";
    person.qi = person.maxQi;
    person.spiritualPower = person.maxSpiritualPower;
    person.residence = { ...person.residence, locationId: "qingzhou:main-city" };
  }
  return { world, people };
}

function ids(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  return new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
}

test("a fetch-herb favor is accepted, fulfilled, owed, repaid, and retold in the digest", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  const herbsBefore = first.inventory[FAVOR_HERB_ID] ?? 0;
  second.inventory[FAVOR_HERB_ID] = (second.inventory[FAVOR_HERB_ID] ?? 0) + 1;
  const asked = performAction(world, first.id, `ask-favor:${second.id}:fetch-herb`, "帮我带一株云心草。");
  assert.equal(asked.accepted, true);
  assert.match(asked.summary, /云心草/);
  const favorId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(favorId);
  assert.equal(ids(world, second.id).has(`accept-favor:${favorId}`), true);
  assert.equal(ids(world, second.id).has(`decline-favor:${favorId}`), true);

  performAction(world, second.id, `accept-favor:${favorId}`);
  const done = performAction(world, second.id, `fulfill-favor:${favorId}`);
  assert.match(done.summary, /人情/);
  assert.equal(first.inventory[FAVOR_HERB_ID] ?? 0, herbsBefore + 1);
  assert.equal(second.inventory[FAVOR_HERB_ID] ?? 0, 0);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance, 1);
  assert.ok((getSocialLink(world, first.id, second.id)?.affinity ?? 0) >= 12);
  assert.equal(getCultivatorState(world, first.id).mood?.cause, "gift");
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("人情") && note.detail.includes("云心草")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("人情")));

  const askerDigest = getCultivatorState(world, first.id).digest;
  const helperDigest = getCultivatorState(world, second.id).digest;
  assert.match(askerDigest?.summary ?? "", /人情|云心草/);
  assert.match(helperDigest?.summary ?? "", /人情|云心草/);
  assert.ok(askerDigest?.relationships.some((line) => line.includes("人情")));

  assert.equal(ids(world, second.id).has(`call-favor:${first.id}`), true);
  performAction(world, second.id, `call-favor:${first.id}`);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance ?? 0, 0);
});

test("declining a favor changes grudge and mood, and a neighbor hears it", () => {
  const { world, people } = spawn(["青萝", "阿宁"]);
  const [first, second, third] = people;
  assert.ok(first && second && third);
  performAction(world, first.id, `ask-favor:${second.id}:escort-gate`);
  const favorId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(favorId);
  performAction(world, second.id, `decline-favor:${favorId}`);
  assert.equal(getSocialLinksViewGrudge(world, first.id, second.id), "嫌隙");
  assert.equal(getCultivatorState(world, first.id).mood?.cause, "rejection");
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("没有应下")));
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /请托|嫌隙/);
  assert.ok((third.travelNotes ?? []).some((note) => note.detail.includes("托付") || note.detail.includes("嫌隙")));
  assert.ok((getCultivatorState(world, third.id).gossip ?? []).some((item) => item.kind === "favor-failed" || item.kind === "feud"));
  assert.equal(world.personalFavors?.[favorId]?.status, "declined");
});

test("escort, a watched breakthrough, and a delivered gift each finish in a sentence", () => {
  const { world, people } = spawn(["青萝", "阿宁"]);
  const [first, second, third] = people;
  assert.ok(first && second && third);
  performAction(world, first.id, `ask-favor:${second.id}:escort-gate`);
  const escortId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(escortId);
  performAction(world, second.id, `accept-favor:${escortId}`);
  assert.throws(
    () => performAction(world, second.id, `fulfill-favor:${escortId}`),
    (error: unknown) => error instanceof GameplayRejection && /门口/.test((error as Error).message),
  );
  first.locationId = "qingzhou:dungeon-c";
  second.locationId = "qingzhou:dungeon-c";
  const escorted = performAction(world, second.id, `fulfill-favor:${escortId}`);
  assert.match(escorted.summary, /门口/);
  assert.equal(getSocialLink(world, second.id, first.id)?.favorBalance, 1);

  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  advanceWorld(world, ASK_FAVOR_COOLDOWN_TICKS);
  performAction(world, first.id, `ask-favor:${second.id}:guard-breakthrough`);
  const guardId = Object.keys(world.personalFavors ?? {}).find((id) => world.personalFavors?.[id]?.status === "offered");
  assert.ok(guardId);
  performAction(world, second.id, `accept-favor:${guardId}`);
  const guarded = performAction(world, second.id, `fulfill-favor:${guardId}`);
  assert.match(guarded.summary, /洞府/);
  assert.equal(first.breakthroughWatch?.guardId, second.id);

  third.locationId = "yangzhou:main-city";
  first.inventory[FAVOR_HERB_ID] = 1;
  advanceWorld(world, ASK_FAVOR_COOLDOWN_TICKS);
  performAction(world, first.id, `ask-favor:${second.id}:deliver-gift:${third.id}`);
  const giftId = Object.keys(world.personalFavors ?? {}).find((id) => world.personalFavors?.[id]?.kind === "deliver-gift");
  assert.ok(giftId);
  assert.equal(first.inventory[FAVOR_HERB_ID] ?? 0, 0);
  performAction(world, second.id, `accept-favor:${giftId}`);
  const delivered = performAction(world, second.id, `fulfill-favor:${giftId}`);
  assert.match(delivered.summary, /送到了阿宁/);
  assert.equal(third.inventory[FAVOR_HERB_ID] ?? 0, 1);
  assert.match(getCultivatorState(world, third.id).digest?.summary ?? "", /云心草|送到/);
});

test("a note left for someone away can be read and answered, and both digests keep it", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  second.locationId = "yangzhou:main-city";
  assert.equal(ids(world, first.id).has(`leave-note:${second.id}`), true);
  const left = performAction(world, first.id, `leave-note:${second.id}`, "人回来先到城门口找我。");
  assert.match(left.summary, /人回来先到城门口找我/);
  const noteId = Object.keys(world.personalNotes ?? {})[0];
  assert.ok(noteId);
  const waiting = getCultivatorState(world, second.id);
  assert.equal(waiting.pendingNotes?.[0]?.line, "人回来先到城门口找我。");
  assert.equal(waiting.pendingNotes?.[0]?.replyActionId, `reply-note:${noteId}`);
  performAction(world, second.id, `read-note:${noteId}`);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("人回来先到城门口找我")));
  performAction(world, second.id, `reply-note:${noteId}`, "字条看见了，我这就回去。");
  assert.equal(getCultivatorState(world, second.id).pendingNotes, undefined);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /人回来先到城门口找我|字条看见了/);
  assert.match(getCultivatorState(world, second.id).digest?.summary ?? "", /字条看见了，我这就回去/);
  assert.ok(getCultivatorState(world, first.id).digest?.quotes.some((quote) => quote.line === "字条看见了，我这就回去。"));
});

test("a spot note can be answered by someone who comes by later", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  second.locationId = "yangzhou:main-city";
  performAction(world, first.id, "leave-spot-note", "路过的人若看见青萝，让她来城门口。");
  assert.equal(getCultivatorState(world, second.id).spotNotes, undefined);
  second.locationId = "qingzhou:main-city";
  const spot = getCultivatorState(world, second.id).spotNotes?.[0];
  assert.ok(spot);
  assert.match(spot.line, /城门口/);
  performAction(world, second.id, spot.replyActionId as `reply-spot-note:${string}`, "人已经到了城门口。");
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /人已经到了城门口/);
  assert.match(getCultivatorState(world, second.id).digest?.summary ?? "", /人已经到了城门口/);
});

test("sect mates share a notice, a joint errand, and a senior's guidance", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  first.sectId = "sect-qingyun";
  second.sectId = "sect-qingyun";
  first.sectTitle = "内门";
  second.sectTitle = "外门";
  first.totalContribution = 30;
  second.totalContribution = 4;
  const beforeJunior = second.realmProgress;
  performAction(world, first.id, "post-sect-notice", "今晚在驻地集合，别迟到。");
  const board = getCultivatorState(world, second.id).sectBoard;
  assert.equal(board?.[0]?.text, "今晚在驻地集合，别迟到。");
  assert.ok(board?.[0]?.replyActionId);
  performAction(world, second.id, board![0]!.replyActionId as `reply-sect-notice:${string}`, "我准时到。");
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /今晚在驻地集合|我准时到/);

  const seniorBefore = first.totalContribution;
  performAction(world, first.id, `join-sect-task:${second.id}`);
  assert.equal(first.totalContribution, seniorBefore + 8);
  assert.equal(second.totalContribution, 4 + 8);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("一起办完了")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("贡献")));

  performAction(world, first.id, `guide-junior:${second.id}`);
  assert.ok(second.realmProgress > beforeJunior);
  assert.ok(first.totalContribution > seniorBefore + 8);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("带") && note.detail.includes(first.name)));
  assert.throws(
    () => performAction(world, second.id, `guide-junior:${first.id}`),
    (error: unknown) => error instanceof GameplayRejection,
  );
});

test("a neighbor mentions a new 知己 bond in a generated line", () => {
  const { world, people } = spawn(["青萝", "阿宁"]);
  const [first, second, third] = people;
  assert.ok(first && second && third);
  addMutualAffinity(world, first.id, second.id, 200);
  const gossip = getCultivatorState(world, third.id).gossip ?? [];
  assert.ok(gossip.some((item) => item.kind === "bond" && item.text.includes("知己")));
  performAction(world, third.id, `say:${first.id}`);
  const spoken = world.messages.find((message) => message.fromCultivatorId === third.id)?.spokenLine ?? "";
  assert.match(spoken, /知己/);
});

test("open favors and repeated notes are refused", () => {
  const { world, people } = spawn(["青萝", "阿宁", "小林"]);
  const [first, second, third, fourth] = people;
  assert.ok(first && second && third && fourth);
  performAction(world, first.id, `ask-favor:${second.id}:fetch-herb`);
  performAction(world, first.id, `ask-favor:${third.id}:escort-gate`);
  assert.throws(
    () => performAction(world, first.id, `ask-favor:${fourth.id}:guard-breakthrough`),
    (error: unknown) => error instanceof GameplayRejection && /两件/.test((error as Error).message),
  );
  const favorId = Object.values(world.personalFavors ?? {}).find((favor) => favor.toId === second.id)?.id;
  assert.ok(favorId);
  performAction(world, second.id, `decline-favor:${favorId}`);
  assert.throws(
    () => performAction(world, first.id, `ask-favor:${second.id}:fetch-herb`),
    (error: unknown) => error instanceof GameplayRejection && /刚托过/.test((error as Error).message),
  );
  advanceWorld(world, 4);
  performAction(world, first.id, `ask-favor:${second.id}:fetch-herb`);

  performAction(world, first.id, `leave-note:${fourth.id}`, "第一张。");
  assert.throws(
    () => performAction(world, first.id, `leave-note:${fourth.id}`, "第二张不该这么快。"),
    (error: unknown) => error instanceof GameplayRejection && /刚给/.test((error as Error).message),
  );
});

test("an unanswered favor fails once the deadline passes", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  performAction(world, first.id, `ask-favor:${second.id}:fetch-herb`);
  const favorId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(favorId);
  advanceWorld(world, 7);
  assert.equal(world.personalFavors?.[favorId]?.status, "failed");
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /黄了|请托|嫌隙/);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("黄了") || note.detail.includes("没有应")));
});

function getSocialLinksViewGrudge(world: ReturnType<typeof createSeedWorld>, fromId: string, toId: string) {
  return getCultivatorState(world, fromId).socialLinks.find((link) => link.targetCultivatorId === toId)?.grudgeArc;
}
