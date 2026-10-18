import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";
import type { ItemId } from "./model.js";
import { addMutualAffinity, addMutualGrudge, getSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawn(name: string) {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: `agent-${name}`, name });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.activeJobId = null;
  second.activeJobId = null;
  first.lastGiftTick = -1;
  second.lastGiftTick = -1;
  addMutualAffinity(world, first.id, second.id, 1);
  return { world, first, second };
}

function clearBag(inventory: Record<string, number>) {
  for (const itemId of Object.keys(inventory)) inventory[itemId] = 0;
}

test("the listed gift-item is the item that leaves, including a body itemId", () => {
  const { world, first, second } = spawn("青萝");
  clearBag(first.inventory);
  first.inventory["healing-pill"] = 2;
  first.inventory["ward-talisman"] = 1;

  const cards = listAvailableActions(world, first.id).filter((action) =>
    String(action.actionId).startsWith(`send-message:${second.id}:gift-item:`),
  );
  const talisman = cards.find((action) => String(action.actionId).endsWith(":ward-talisman"));
  assert.ok(talisman);
  assert.match(talisman.label, /镇煞符/);
  assert.equal(talisman.label.includes("ward-talisman"), false);
  assert.equal(talisman.description.includes("ward-talisman"), false);

  const given = performAction(world, first.id, talisman.actionId);
  assert.match(given.summary, /镇煞符/);
  assert.equal(given.summary.includes("ward-talisman"), false);
  assert.equal(first.inventory["ward-talisman"], 0);
  assert.equal(first.inventory["healing-pill"], 2);
  assert.equal(second.pendingGifts?.[0]?.itemId, "ward-talisman");

  const replies = listAvailableActions(world, second.id).filter((action) =>
    String(action.actionId).startsWith("accept-gift:") || String(action.actionId).startsWith("reject-gift:"),
  );
  assert.ok(replies.some((action) => action.label.includes("收下") && action.label.includes("镇煞符")));
  assert.ok(replies.some((action) => action.label.includes("退回") && action.label.includes("镇煞符")));
  assert.equal(replies.some((action) => action.label.includes("ward-talisman") || action.description.includes("ward-talisman")), false);

  const returned = performAction(world, second.id, `reject-gift:${second.pendingGifts![0]!.messageId}`);
  assert.match(returned.summary, /镇煞符/);
  assert.equal(returned.summary.includes("ward-talisman"), false);
  assert.equal(first.inventory["ward-talisman"], 1);
  const rejectNotice = (world.messages ?? []).find((message) => message.toCultivatorId === first.id && message.subject.includes("退回"));
  assert.match(rejectNotice?.subject ?? "", /镇煞符/);
  assert.match(rejectNotice?.content ?? "", /镇煞符/);
  assert.equal((rejectNotice?.content ?? "").includes("ward-talisman"), false);

  advanceWorld(world, 1);
  const fromBody = performAction(world, first.id, `send-message:${second.id}:gift-item`, undefined, "healing-pill");
  assert.match(fromBody.summary, /疗伤丹/);
  assert.equal(first.inventory["healing-pill"], 1);
  assert.equal(first.inventory["ward-talisman"], 1);
  const healing = second.pendingGifts?.find((gift) => gift.itemId === "healing-pill");
  assert.ok(healing);

  advanceWorld(world, 1);
  const namedWins = performAction(
    world,
    first.id,
    `send-message:${second.id}:gift-item:ward-talisman`,
    undefined,
    "healing-pill",
  );
  assert.match(namedWins.summary, /镇煞符/);
  assert.equal(first.inventory["ward-talisman"], 0);
  assert.equal(first.inventory["healing-pill"], 1);
});

test("a stone gift waits for accept, and rejecting returns the stones", () => {
  const { world, first, second } = spawn("阿宁");
  first.spiritStones = 100;
  second.spiritStones = 5;
  assert.throws(
    () => performAction(world, first.id, `share-resource:${second.id}`),
    (error: unknown) => error instanceof GameplayRejection && /知己/.test((error as Error).message),
  );

  const cards = listAvailableActions(world, first.id).filter((action) =>
    String(action.actionId).startsWith(`gift-stones:${second.id}:`),
  );
  assert.ok(cards.length > 0);
  assert.equal(cards.some((action) => String(action.actionId).endsWith(":36")), false);
  assert.match(cards[0]?.description ?? "", /不再退|退回/);

  const paid = performAction(world, first.id, `gift-stones:${second.id}:36`);
  assert.equal(paid.accepted, true);
  assert.match(paid.summary, /36枚灵石/);
  assert.match(paid.summary, /还没说收不收/);
  assert.equal(first.spiritStones, 64);
  assert.equal(second.spiritStones, 5);
  const pending = (second.pendingGifts ?? []).find((gift) => gift.spiritStones === 36);
  assert.ok(pending);
  assert.equal(pending.itemId, undefined);
  const shown = getCultivatorState(world, second.id).pendingGifts.find((gift) => gift.spiritStones === 36);
  assert.equal(shown?.itemName, "灵石");
  assert.equal(shown?.count, 36);
  const offer = listAvailableActions(world, second.id).find((action) => action.actionId === `reject-gift:${pending.messageId}`);
  assert.match(offer?.label ?? "", /退回/);
  assert.match(offer?.label ?? "", /36枚灵石/);

  const rejected = performAction(world, second.id, `reject-gift:${pending.messageId}`);
  assert.match(rejected.summary, /36枚灵石/);
  assert.match(rejected.summary, /退了回去/);
  assert.equal(first.spiritStones, 100);
  assert.equal(second.spiritStones, 5);
  assert.equal((second.pendingGifts ?? []).length, 0);
  const notice = (world.messages ?? []).find((message) => message.toCultivatorId === first.id && message.subject.includes("退回"));
  assert.match(notice?.subject ?? "", /36枚灵石/);
  assert.match(notice?.content ?? "", /回到你手里/);
  assert.equal((notice?.content ?? "").includes("spirit"), false);
});

test("accepting stones or an item does not refund the victim when the other hand never comes", () => {
  const { world, first, second } = spawn("沈砺");
  clearBag(first.inventory);
  clearBag(second.inventory);
  first.inventory["ward-talisman"] = 1;
  first.inventory["healing-pill"] = 1;
  first.spiritStones = 180;
  second.spiritStones = 10;

  performAction(world, first.id, `send-message:${second.id}:gift-item:ward-talisman`);
  const item = (second.pendingGifts ?? []).find((gift) => gift.itemId === "ward-talisman");
  assert.ok(item);
  const acceptedItem = performAction(world, second.id, `accept-gift:${item.messageId}`);
  assert.match(acceptedItem.summary, /镇煞符/);
  const acceptNotice = (world.messages ?? []).find((message) => message.toCultivatorId === first.id && message.subject.includes("收下"));
  assert.match(acceptNotice?.subject ?? "", /镇煞符/);
  assert.equal((acceptNotice?.content ?? "").includes("ward-talisman"), false);
  assert.equal(first.inventory["ward-talisman"], 0);
  assert.equal(second.inventory["ward-talisman"], 1);
  assert.equal(first.spiritStones, 180);
  assert.equal(second.spiritStones, 10);

  advanceWorld(world, 6);
  assert.equal(first.inventory["ward-talisman"], 0);
  assert.equal(second.inventory["ward-talisman"], 1);
  assert.equal(first.inventory["healing-pill"], 1);
  assert.equal((first.pendingGifts ?? []).some((gift) => gift.itemId === "ward-talisman"), false);
  assert.equal((second.pendingGifts ?? []).some((gift) => gift.itemId === "ward-talisman"), false);
  const returnedLater = (world.messages ?? []).some((message) =>
    message.toCultivatorId === first.id && /退回/.test(message.subject) && /镇煞符/.test(message.content),
  );
  assert.equal(returnedLater, false);

  const sellerStones = first.spiritStones;
  const buyerStones = second.spiritStones;
  first.lastGiftTick = world.tick - 1;
  const paid = performAction(world, first.id, `gift-stones:${second.id}:40`);
  assert.match(paid.summary, /40枚灵石/);
  assert.equal(first.spiritStones, sellerStones - 40);
  assert.equal(second.spiritStones, buyerStones);
  const stones = (second.pendingGifts ?? []).find((gift) => gift.spiritStones === 40);
  assert.ok(stones);
  performAction(world, second.id, `accept-gift:${stones.messageId}`);
  assert.equal(first.spiritStones, sellerStones - 40);
  assert.equal(second.spiritStones, buyerStones + 40);
  assert.equal(first.inventory["healing-pill"], 1);
  const heldByPayer = first.spiritStones;
  const heldByReceiver = second.spiritStones;
  advanceWorld(world, 4);
  assert.equal(first.spiritStones, heldByPayer);
  assert.equal(second.spiritStones, heldByReceiver);
  assert.equal(first.inventory["healing-pill"], 1);
  assert.equal((first.pendingGifts ?? []).some((gift) => (gift.spiritStones ?? 0) > 0), false);
});

test("a stone gift outside the cap or during 宿怨 does not move the purse", () => {
  const { world, first, second } = spawn("柳如烟");
  first.spiritStones = 50;
  second.spiritStones = 7;
  assert.throws(
    () => performAction(world, first.id, `gift-stones:${second.id}:801`),
    (error: unknown) => error instanceof GameplayRejection && /800/.test((error as Error).message),
  );
  assert.equal(first.spiritStones, 50);
  assert.throws(
    () => performAction(world, first.id, `gift-stones:${second.id}:0`),
    (error: unknown) => error instanceof GameplayRejection,
  );
  assert.equal(first.spiritStones, 50);

  addMutualGrudge(world, first.id, second.id, 18);
  const refused = performAction(world, first.id, `gift-stones:${second.id}:20`);
  assert.match(refused.summary, /宿怨/);
  assert.match(refused.summary, /没有递出去/);
  assert.equal(first.spiritStones, 50);
  assert.equal(second.spiritStones, 7);
  assert.equal((second.pendingGifts ?? []).length, 0);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity ?? 0, 1);
});

test("refusing a pending stone gift to someone's face puts the stones back", () => {
  const { world, first, second } = spawn("楚晚");
  addMutualGrudge(world, first.id, second.id, 8);
  first.spiritStones = 80;
  second.spiritStones = 3;
  const paid = performAction(world, first.id, `gift-stones:${second.id}:20`);
  assert.match(paid.summary, /嫌隙/);
  assert.equal(first.spiritStones, 60);
  assert.equal(second.spiritStones, 3);
  const refused = performAction(world, second.id, `refuse-gift:${first.id}`);
  assert.match(refused.summary, /拒了/);
  assert.equal(first.spiritStones, 80);
  assert.equal(second.spiritStones, 3);
  assert.equal((second.pendingGifts ?? []).length, 0);
});
