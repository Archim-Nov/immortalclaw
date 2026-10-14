import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";
import type { ActionId, WorldState } from "./model.js";
import { addMutualAffinity, getSocialLink } from "./social.js";
import { FAVOR_HERB_ID } from "./social-deepen.js";

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

function ids(world: WorldState, cultivatorId: string) {
  return new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
}

function runUntilIdle(world: WorldState, cultivatorId: string, cap = 24) {
  let steps = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && steps < cap) {
    advanceWorld(world, 1);
    steps += 1;
  }
  assert.equal(world.cultivators[cultivatorId]?.activeJobId ?? null, null);
  return steps;
}

function finishGuard(world: WorldState, askerId: string, helperId: string) {
  performAction(world, askerId, `ask-favor:${helperId}:guard-breakthrough`);
  const favorId = Object.keys(world.personalFavors ?? {}).find((id) => world.personalFavors?.[id]?.status === "offered" && world.personalFavors?.[id]?.toId === helperId);
  assert.ok(favorId);
  performAction(world, helperId, `accept-favor:${favorId}`);
  performAction(world, helperId, `fulfill-favor:${favorId}`);
  return favorId;
}

test("standing watch keeps a reason, and calling it in quotes both halves", () => {
  const { world, people } = spawn(["青萝"]);
  const [asker, helper] = people;
  assert.ok(asker && helper);
  finishGuard(world, asker.id, helper.id);
  const owed = getCultivatorState(world, helper.id).owedFavors ?? [];
  assert.equal(owed.some((row) => row.direction === "they-owe" && row.reason === "替我守关" && row.otherId === asker.id), true);
  assert.equal((getCultivatorState(world, asker.id).owedFavors ?? []).some((row) => row.direction === "you-owe" && row.reason === "替我守关"), true);

  performAction(world, helper.id, `call-favor:${asker.id}`);
  assert.equal(getSocialLink(world, helper.id, asker.id)?.favorBalance ?? 0, 0);
  assert.equal(getCultivatorState(world, helper.id).owedFavors, undefined);
  assert.equal(getCultivatorState(world, asker.id).owedFavors, undefined);
  for (const person of [asker, helper]) {
    const summary = getCultivatorState(world, person.id).digest?.summary ?? "";
    assert.match(summary, /守关/);
    assert.match(summary, /还这份人情/);
    assert.doesNotMatch(summary, /过得平常/);
  }
});

test("a different favor repays the earlier one, including when it is done for a friend", () => {
  const { world, people } = spawn(["青萝", "阿宁"]);
  const [asker, helper, friend] = people;
  assert.ok(asker && helper && friend);
  finishGuard(world, asker.id, helper.id);
  asker.inventory[FAVOR_HERB_ID] = 1;
  performAction(world, helper.id, `ask-favor:${asker.id}:fetch-herb`);
  const favorId = Object.keys(world.personalFavors ?? {}).find((id) => world.personalFavors?.[id]?.kind === "fetch-herb");
  assert.ok(favorId);
  performAction(world, asker.id, `accept-favor:${favorId}`);
  const repaid = performAction(world, asker.id, `fulfill-favor:${favorId}`);
  assert.match(repaid.summary, /守关/);
  assert.match(repaid.summary, /还这份人情/);
  assert.match(getCultivatorState(world, helper.id).digest?.summary ?? "", /守关/);
  assert.match(getCultivatorState(world, asker.id).digest?.summary ?? "", /还这份人情/);

  const chain = spawn(["青萝", "阿宁"]);
  const [creditor, debtor, close] = chain.people;
  assert.ok(creditor && debtor && close);
  addMutualAffinity(chain.world, creditor.id, close.id, 20);
  finishGuard(chain.world, debtor.id, creditor.id);
  debtor.inventory[FAVOR_HERB_ID] = 1;
  performAction(chain.world, close.id, `ask-favor:${debtor.id}:fetch-herb`);
  const friendFavor = Object.keys(chain.world.personalFavors ?? {}).find((id) => chain.world.personalFavors?.[id]?.kind === "fetch-herb");
  assert.ok(friendFavor);
  performAction(chain.world, debtor.id, `accept-favor:${friendFavor}`);
  const forFriend = performAction(chain.world, debtor.id, `fulfill-favor:${friendFavor}`);
  assert.match(forFriend.summary, /守关/);
  assert.ok(forFriend.summary.includes(close.name));
  assert.ok(forFriend.summary.includes(creditor.name));
  assert.match(getCultivatorState(chain.world, close.id).digest?.summary ?? "", /守关/);
  assert.ok((getCultivatorState(chain.world, creditor.id).digest?.summary ?? "").includes(close.name));
});

test("a quiet note or a sect errand is told by name instead of an empty stretch", () => {
  const noted = spawn(["青萝"]);
  const [author, reader] = noted.people;
  assert.ok(author && reader);
  reader.locationId = "yangzhou:main-city";
  performAction(noted.world, author.id, `leave-note:${reader.id}`);
  const noteSummary = getCultivatorState(noted.world, author.id).digest?.summary ?? "";
  assert.match(noteSummary, /青萝/);
  assert.doesNotMatch(noteSummary, /过得平常/);

  const sect = spawn(["青萝"]);
  const [senior, junior] = sect.people;
  assert.ok(senior && junior);
  senior.sectId = "sect-qingyun";
  junior.sectId = "sect-qingyun";
  performAction(sect.world, senior.id, `join-sect-task:${junior.id}`);
  const sectSummary = getCultivatorState(sect.world, senior.id).digest?.summary ?? "";
  assert.match(sectSummary, /青萝/);
  assert.doesNotMatch(sectSummary, /过得平常/);
});

test("only a partner can be waited for, and the reunion is written once", () => {
  const { world, people } = spawn(["青萝", "阿宁"]);
  const [asker, helper, stranger] = people;
  assert.ok(asker && helper && stranger);
  stranger.locationId = "yangzhou:main-city";
  assert.equal(ids(world, asker.id).has(`wait-for:${stranger.id}`), false);
  assert.throws(
    () => performAction(world, asker.id, `wait-for:${stranger.id}`),
    (error: unknown) => error instanceof GameplayRejection && /同队|人情/.test((error as Error).message),
  );

  finishGuard(world, asker.id, helper.id);
  const origin = helper.locationId;
  const outbound = listAvailableActions(world, helper.id).find((action) => action.actionId.startsWith("travel-to:"));
  assert.ok(outbound);
  performAction(world, helper.id, outbound.actionId as ActionId);
  assert.equal(ids(world, asker.id).has(`wait-for:${helper.id}`), true);
  performAction(world, asker.id, `wait-for:${helper.id}`);
  runUntilIdle(world, helper.id);
  assert.notEqual(helper.locationId, origin);
  const back = listAvailableActions(world, helper.id).find((action) => action.actionId === `travel-to:${origin}`);
  assert.ok(back);
  performAction(world, helper.id, back.actionId);
  runUntilIdle(world, helper.id);
  assert.equal(helper.locationId, origin);
  for (const person of [asker, helper]) {
    assert.match(getCultivatorState(world, person.id).digest?.summary ?? "", /重逢/);
  }

  helper.locationId = "yangzhou:main-city";
  assert.throws(
    () => performAction(world, asker.id, `wait-for:${helper.id}`),
    (error: unknown) => error instanceof GameplayRejection && /见过面/.test((error as Error).message),
  );
});
