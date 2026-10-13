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
