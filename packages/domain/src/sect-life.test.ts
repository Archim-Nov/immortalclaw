import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import { GameplayRejection } from "./gameplay-error.js";
import { getSocialLink, writeSocialLink } from "./social.js";

const QI_ITEMS = ["condensed-qi-dew", "azure-stone-marrow", "meridian-lotus-essence"] as const;
const CORE_ITEMS = ["flowing-aurora-core", "dragon-radiance-crystal", "core-nourish-dew"] as const;

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  let guard = 0;
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
    guard += 1;
    if (guard > 20) throw new Error(`job did not finish for ${cultivatorId}`);
  }
}

function actionIds(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  return new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
}

function joinCangMu(world: ReturnType<typeof createSeedWorld>) {
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:sect-outpost:cang-mu-gu";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  performAction(world, cultivator.id, "join-neutral-sect:cang-mu-gu");
  return cultivator;
}

test("a disciple can take and resign an outer post", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const before = actionIds(world, cultivator.id);

  assert.equal(before.has("take-post:outer-chore"), true);
  assert.equal(before.has("take-post:master-seat"), false);

  const taken = performAction(world, cultivator.id, "take-post:outer-chore");
  assert.equal(taken.accepted, true);
  assert.equal(cultivator.sectPost, "outer-chore");
  const life = getCultivatorState(world, cultivator.id).sectLife;
  assert.equal(life?.post?.name, "外门杂役");
  assert.match(life?.post?.duty ?? "", /扫院/);
  assert.match(life?.daily ?? "", /杂役|药田/);

  performAction(world, cultivator.id, "resign-post");
  assert.equal(cultivator.sectPost ?? null, null);
  assert.equal(getCultivatorState(world, cultivator.id).sectLife?.post ?? null, null);
});

test("outer duties raise the sect from 初立山门 to 小宗", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const before = getCultivatorState(world, cultivator.id).sectLife;
  assert.equal(before?.tierName, "初立山门");
  assert.match(before?.nextRequirement ?? "", /小宗/);

  performAction(world, cultivator.id, "take-post:outer-chore");
  for (let i = 0; i < 4; i += 1) {
    performAction(world, cultivator.id, "post-duty");
    runUntilIdle(world, cultivator.id);
  }

  const after = getCultivatorState(world, cultivator.id).sectLife;
  assert.ok((after?.merit ?? 0) >= 24);
  assert.equal(after?.tierName, "小宗");
  assert.match(after?.nextRequirement ?? "", /中宗/);
  assert.ok((cultivator.totalContribution ?? 0) > 0);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /本职|声望/);
});

test("owned veins produce the breakthrough materials of their band", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const herb = world.spiritVeins?.["qingzhou:herb-field"];
  assert.ok(herb);
  assert.equal(herb.ownerId, "cang-mu-gu");
  assert.equal(herb.band, "qi");
  herb.lastYieldTick = world.tick - 8;
  advanceWorld(world, 1);
  assert.ok(herb.pouch.reduce((sum, row) => sum + row.count, 0) > 0);

  cultivator.locationId = herb.locationId;
  const described = getCultivatorState(world, cultivator.id).sectLife?.veins.find((vein) => vein.id === herb.id);
  assert.match(described?.materials ?? "", /凝气清露/);
  performAction(world, cultivator.id, `gather-vein:${herb.id}`);
  runUntilIdle(world, cultivator.id);
  assert.ok(QI_ITEMS.some((itemId) => (cultivator.inventory[itemId] ?? 0) > 0));

  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  const mine = world.spiritVeins?.["zhongzhou:mine"];
  assert.ok(mine);
  assert.equal(mine.band, "core");
  mine.ownerKind = "neutral";
  mine.ownerId = "cang-mu-gu";
  mine.lastYieldTick = world.tick - 8;
  advanceWorld(world, 1);
  cultivator.locationId = mine.locationId;
  const coreLine = getCultivatorState(world, cultivator.id).sectLife?.veins.find((vein) => vein.id === mine.id);
  assert.match(coreLine?.materials ?? "", /丹霞露/);
  performAction(world, cultivator.id, `gather-vein:${mine.id}`);
  runUntilIdle(world, cultivator.id);
  assert.ok(CORE_ITEMS.some((itemId) => (cultivator.inventory[itemId] ?? 0) > 0));
});

test("a raid moves the vein, and a failed raid costs the attacker", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  cultivator.realm = "筑基";
  cultivator.realmLevel = 4;
  cultivator.totalContribution = 200;
  const rivalSummary = syncCultivatorFromPersona(world, { agentId: "agent-vein-rival", name: "石不语" });
  const rival = world.cultivators[rivalSummary.selectedCultivatorId]!;
  rival.neutralSectId = "ting-chao-ge";
  world.neutralSects["ting-chao-ge"]!.memberIds.push(rival.id);

  const mine = world.spiritVeins?.["qingzhou:mine"];
  assert.ok(mine);
  assert.equal(mine.band, "foundation");
  mine.ownerKind = "neutral";
  mine.ownerId = "ting-chao-ge";
  world.neutralSects["cang-mu-gu"]!.sectMerit = 30;

  performAction(world, cultivator.id, "take-post:elder");
  assert.equal(actionIds(world, cultivator.id).has(`declare-raid:${mine.id}`), true);
  performAction(world, cultivator.id, `declare-raid:${mine.id}`);
  runUntilIdle(world, cultivator.id);

  assert.equal(mine.ownerKind, "neutral");
  assert.equal(mine.ownerId, "cang-mu-gu");
  assert.match((rival.lifeLog ?? []).map((event) => event.text).join(""), /山门失守/);

  const failed = createSeedWorld();
  const attacker = joinCangMu(failed);
  attacker.realm = "筑基";
  attacker.realmLevel = 4;
  attacker.totalContribution = 80;
  const lost = failed.spiritVeins?.["qingzhou:mine"];
  assert.ok(lost);
  lost.ownerKind = "neutral";
  lost.ownerId = "ting-chao-ge";
  failed.neutralSects["cang-mu-gu"]!.sectMerit = 24;
  failed.neutralSects["ting-chao-ge"]!.sectMerit = 80;
  performAction(failed, attacker.id, "take-post:steward");
  const beforeContribution = attacker.totalContribution;
  performAction(failed, attacker.id, `declare-raid:${lost.id}`);
  runUntilIdle(failed, attacker.id);

  assert.equal(lost.ownerId, "ting-chao-ge");
  assert.ok(attacker.injuryTicksRemaining > 0);
  assert.ok(attacker.totalContribution < beforeContribution);
  assert.match((attacker.lifeLog ?? []).map((event) => event.text).join(""), /没能拿下/);
});

test("a duel leaves 嫌隙, and the next meeting is tense", () => {
  const world = createSeedWorld();
  const first = world.cultivators["yun-zhong-he"]!;
  first.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  first.injuryTicksRemaining = 0;
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-feud", name: "楚晚" });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  second.locationId = first.locationId;
  second.qi = second.maxQi;
  second.injuryTicksRemaining = 0;
  second.activeJobId = null;

  performAction(world, first.id, `challenge-cultivator:${second.id}`);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  runUntilIdle(world, first.id);

  assert.ok((getSocialLink(world, first.id, second.id)?.grudge ?? 0) >= 8);
  const life = getCultivatorState(world, first.id);
  assert.match(life.digest?.summary ?? "", /剑拔弩张|嫌隙/);
  assert.match(life.nearbyCultivators?.find((person) => person.cultivatorId === second.id)?.placeLine ?? "", /剑拔弩张/);

  const actions = listAvailableActions(world, first.id);
  const chat = actions.find((action) => action.actionId === `chat-up:${second.id}`);
  assert.match(chat?.description ?? "", /剑拔弩张/);
  assert.equal(actions.some((action) => action.actionId === `refuse-gift:${second.id}`), true);

  const spoken = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(spoken.accepted, true);
  const said = (first.travelNotes ?? []).map((note) => note.detail).join("");
  assert.match(said, /那一架|再战|不收|说硬/);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /剑拔弩张/);

  const fresh = getSocialLink(world, first.id, second.id);
  if (fresh && (fresh.grudge ?? 0) < 18) {
    writeSocialLink(world, first.id, { ...fresh, grudge: 18 });
    const back = getSocialLink(world, second.id, first.id);
    if (back) writeSocialLink(world, second.id, { ...back, grudge: 18 });
  }
  first.inventory["healing-pill"] = (first.inventory["healing-pill"] ?? 0) + 1;
  first.lastGiftTick = -1;
  assert.throws(
    () => performAction(world, first.id, `send-message:${second.id}:gift-item`),
    (error: unknown) => error instanceof GameplayRejection && /剑拔弩张|拒/.test((error as Error).message),
  );
});
