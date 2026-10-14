import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawn(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

test("chat-up, a gift, and a party line carry a spoken sentence", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-mate", "青萝");
  performAction(world, leader.id, `chat-up:${mate.id}`, "今晚门口见，别让我一个人等。");
  const chat = (world.messages ?? []).find((message) => message.toCultivatorId === mate.id && message.spokenLine);
  assert.equal(chat?.spokenLine, "今晚门口见，别让我一个人等。");
  assert.match(chat?.content ?? "", /「今晚门口见，别让我一个人等。」/);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("「今晚门口见，别让我一个人等。」")));
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("「今晚门口见")));

  for (const key of Object.keys(leader.inventory)) leader.inventory[key as keyof typeof leader.inventory] = 0;
  leader.inventory["healing-pill"] = 1;
  performAction(world, leader.id, `send-message:${mate.id}:gift-item`);
  const gift = (world.messages ?? []).find((message) => message.toCultivatorId === mate.id && message.subject.includes("赠礼"));
  assert.ok(gift?.spokenLine);
  assert.match(gift.spokenLine, /疗伤丹/);
  assert.match(gift?.content ?? "", /疗伤丹/);
  assert.match(gift?.content ?? "", /「/);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("「") && note.detail.includes(leader.name)));

  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  assert.throws(
    () => performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`),
    (error: unknown) => error instanceof GameplayRejection && /刚传过|刚说过/.test((error as Error).message),
  );
  performAction(world, leader.id, `send-message:${mate.id}:wait`);
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes("先别下") && note.detail.includes("「")));
});

test("a recipient can reply once or twice, then the exchange pauses", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-reply", "阿宁");
  performAction(world, leader.id, `say:${mate.id}`, "门口风大，你带灯了吗？");
  const state = getCultivatorState(world, mate.id);
  assert.equal(state.pendingDialogue?.[0]?.line, "门口风大，你带灯了吗？");
  assert.ok(listAvailableActions(world, mate.id).some((action) => action.actionId === `reply-line:${leader.id}`));
  performAction(world, mate.id, `reply-line:${leader.id}`, "灯在我袖子里。");
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("「灯在我袖子里。」")));
  assert.equal(getCultivatorState(world, mate.id).pendingDialogue?.some((row) => row.fromId === leader.id) ?? false, false);

  advanceWorld(world, 2);
  performAction(world, leader.id, `say:${mate.id}`, "那一起走。");
  advanceWorld(world, 2);
  assert.throws(
    () => performAction(world, mate.id, `reply-line:${leader.id}`, "好。"),
    (error: unknown) => error instanceof GameplayRejection && /说完了/.test((error as Error).message),
  );
});

test("the same rendezvous line does not repeat on the next chance", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-vary", "楚晚");
  performAction(world, leader.id, `chat-up:${mate.id}`);
  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  const first = (world.messages ?? []).find((message) => message.subject === "门口会合" && message.toCultivatorId === mate.id)?.spokenLine;
  assert.ok(first);
  advanceWorld(world, 4);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  const second = (world.messages ?? []).find((message) => message.subject === "门口会合" && message.toCultivatorId === mate.id && message.spokenLine !== first)?.spokenLine;
  assert.ok(second);
  assert.notEqual(second, first);
});

const STIFF = /近来可好|权作照应|城中风平|我听见了|这话我记下了|心气正盛|心里堵着/;

test("a reply stays with the person who spoke, and a line for someone else is refused", () => {
  const world = createSeedWorld();
  const qingluo = spawn(world, "agent-qingluo", "青萝");
  const axu = spawn(world, "agent-axu", "阿絮");
  const gu = spawn(world, "agent-gu", "顾清舟");
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "yangzhou:main-city";
  performAction(world, axu.id, `say:${qingluo.id}`, "门口风大，你带灯了吗？");
  performAction(world, gu.id, `say:${qingluo.id}`, "我先回洞府。");
  const pending = getCultivatorState(world, qingluo.id).pendingDialogue ?? [];
  assert.equal(pending.filter((row) => row.fromId === axu.id || row.fromId === gu.id).length, 2);
  assert.throws(
    () => performAction(world, qingluo.id, `reply-line:${axu.id}`, "顾兄保重"),
    (error: unknown) => error instanceof GameplayRejection && /说给阿絮/.test((error as Error).message),
  );
  performAction(world, qingluo.id, `reply-line:${axu.id}`);
  const reply = (world.messages ?? []).find((message) => message.toCultivatorId === axu.id && message.subject.includes("回话"))?.spokenLine;
  assert.ok(reply);
  assert.doesNotMatch(reply, /顾/);
  assert.match(reply, /。$/);
  const still = getCultivatorState(world, qingluo.id).pendingDialogue ?? [];
  assert.equal(still.some((row) => row.fromId === gu.id), true);
  assert.equal(still.some((row) => row.fromId === axu.id), false);
});

test("generated lines vary, stay short, and skip the stiff stock phrases", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-say-natural", "青萝");
  const spoken: string[] = [];
  const take = (listenerId: string) => {
    const line = (world.messages ?? []).find((message) => message.toCultivatorId === listenerId && message.spokenLine && !spoken.includes(message.spokenLine))?.spokenLine;
    assert.ok(line);
    spoken.push(line);
  };
  performAction(world, leader.id, `chat-up:${mate.id}`);
  take(mate.id);
  advanceWorld(world, 4);
  performAction(world, leader.id, `chat-up:${mate.id}`);
  take(mate.id);
  advanceWorld(world, 2);
  performAction(world, leader.id, `say:${mate.id}`);
  take(mate.id);
  for (const key of Object.keys(leader.inventory)) leader.inventory[key as keyof typeof leader.inventory] = 0;
  leader.inventory["healing-pill"] = 1;
  leader.inventory["qi-pill"] = 1;
  advanceWorld(world, 1);
  performAction(world, leader.id, `send-message:${mate.id}:gift-item`);
  const gift = (world.messages ?? []).find((message) => message.subject.includes("赠礼") && message.spokenLine)?.spokenLine;
  assert.ok(gift);
  spoken.push(gift);
  for (const line of spoken) {
    assert.ok(Array.from(line).length <= 40, line);
    assert.match(line, /。$/);
    assert.doesNotMatch(line, STIFF);
  }
  assert.ok(new Set(spoken).size >= 3);
  assert.match(gift, /疗伤丹|凝气丹|丹/);
});
