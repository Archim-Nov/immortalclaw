import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { createCultivator } from "./engine.js";
import { GameplayRejection } from "./gameplay-error.js";
import { noteWound, shiftCultivatorMood } from "./inner-life.js";
import { MOOD_LINE_POOLS, SPEECH_MAX_CHARS } from "./spoken-lines.js";
import { addMutualAffinity, addMutualGrudge, getSocialLink, getSocialLinksView } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawn(name: string) {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, { agentId: `agent-${name}`, name });
  const second = world.cultivators[summary.selectedCultivatorId]!;
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  first.spiritualPower = first.maxSpiritualPower;
  second.spiritualPower = second.maxSpiritualPower;
  return { world, first, second };
}

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string, limit = 12) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < limit) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  return ticks;
}

function actionIds(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  return new Set(listAvailableActions(world, cultivatorId).map((action) => action.actionId));
}

test("affinity crossings write 点头之交, 好友, and 知己 on both travelogues", () => {
  const { world, first, second } = spawn("青萝");
  addMutualAffinity(world, first.id, second.id, 20);
  assert.equal(getSocialLinksView(world, first.id).find((link) => link.targetCultivatorId === second.id)?.bondArc, "点头之交");
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("点头之交")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("点头之交")));

  addMutualAffinity(world, first.id, second.id, 100);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity, 120);
  assert.equal(getSocialLinksView(world, first.id).find((link) => link.targetCultivatorId === second.id)?.bondArc, "好友");
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("好友")));

  addMutualAffinity(world, first.id, second.id, 80);
  const view = getSocialLinksView(world, first.id).find((link) => link.targetCultivatorId === second.id);
  assert.equal(view?.bondArc, "知己");
  assert.match(view?.arcLine ?? "", /知己/);
  assert.match(view?.arcLine ?? "", /灵石|指点/);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("知己")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("知己")));
  assert.equal(actionIds(world, first.id).has(`spar-teach:${second.id}`), true);
});

test("知己 can spar-teach and share stones, and earlier stages cannot", () => {
  const { world, first, second } = spawn("阿宁");
  addMutualAffinity(world, first.id, second.id, 120);
  assert.equal(actionIds(world, first.id).has(`spar-teach:${second.id}`), false);
  assert.equal(actionIds(world, first.id).has(`share-resource:${second.id}`), false);

  addMutualAffinity(world, first.id, second.id, 80);
  assert.equal(actionIds(world, first.id).has(`spar-teach:${second.id}`), true);
  assert.equal(actionIds(world, first.id).has(`share-resource:${second.id}`), true);

  const practiceBefore = Object.values(second.skillProficiency ?? {}).reduce((sum, value) => sum + value, 0);
  const progressBefore = second.realmProgress;
  const taught = performAction(world, first.id, `spar-teach:${second.id}`);
  assert.equal(taught.accepted, true);
  const practiceAfter = Object.values(second.skillProficiency ?? {}).reduce((sum, value) => sum + value, 0);
  assert.ok(practiceAfter > practiceBefore || second.realmProgress > progressBefore);
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("走了两遍") || note.detail.includes("拆了几手")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes(first.name)));
  assert.throws(
    () => performAction(world, first.id, `spar-teach:${second.id}`),
    (error: unknown) => error instanceof GameplayRejection && /刻/.test((error as Error).message),
  );

  const giverBefore = first.spiritStones;
  const receiverBefore = second.spiritStones;
  const shared = performAction(world, first.id, `share-resource:${second.id}`);
  assert.equal(shared.accepted, true);
  assert.equal(first.spiritStones, giverBefore - 8);
  assert.equal(second.spiritStones, receiverBefore + 8);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("八枚灵石")));
  assert.equal(getCultivatorState(world, second.id).mood?.cause, "gift");
});

test("grudge crossings unlock a feud challenge", () => {
  const { world, first, second } = spawn("楚晚");
  addMutualGrudge(world, first.id, second.id, 8);
  assert.equal(getSocialLinksView(world, first.id).find((link) => link.targetCultivatorId === second.id)?.grudgeArc, "嫌隙");
  assert.ok((first.travelNotes ?? []).some((note) => note.detail.includes("嫌隙")));
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("嫌隙")));
  assert.equal(actionIds(world, first.id).has(`grudge-challenge:${second.id}`), false);

  addMutualGrudge(world, first.id, second.id, 10);
  const view = getSocialLinksView(world, second.id).find((link) => link.targetCultivatorId === first.id);
  assert.equal(view?.grudgeArc, "宿怨");
  assert.match(view?.arcLine ?? "", /挑战/);
  assert.equal(actionIds(world, first.id).has(`grudge-challenge:${second.id}`), true);

  const challenged = performAction(world, first.id, `grudge-challenge:${second.id}`);
  assert.equal(challenged.accepted, true);
  assert.match(challenged.summary, /因宿怨向楚晚下了挑战书/);
  assert.equal(challenged.summary.includes("feud"), false);
  assert.equal(challenged.summary.includes("duel"), false);
  assert.ok(second.pendingPvpChallengeId);
  const letter = (world.messages ?? []).find((message) => message.toCultivatorId === second.id && message.subject.includes("挑战"));
  assert.match(letter?.content ?? "", /宿怨/);
  assert.ok((second.travelNotes ?? []).some((note) => note.detail.includes("挑战书")));
});

test("mood shifts from a gift, a rejection, a spoken line, a wound, and a breakthrough", () => {
  const { world, first, second } = spawn("何静");
  for (const key of Object.keys(first.inventory)) first.inventory[key as keyof typeof first.inventory] = 0;
  first.inventory["healing-pill"] = 1;
  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const gift = (second.pendingGifts ?? [])[0];
  assert.ok(gift);
  performAction(world, second.id, `accept-gift:${gift.messageId}`);
  assert.equal(getCultivatorState(world, second.id).mood?.cause, "gift");
  assert.match(getCultivatorState(world, second.id).mood?.sentence ?? "", /。/);

  first.inventory["healing-pill"] = 1;
  advanceWorld(world, 1);
  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const returned = (second.pendingGifts ?? [])[0];
  assert.ok(returned);
  performAction(world, second.id, `reject-gift:${returned.messageId}`);
  const stung = getCultivatorState(world, first.id).mood;
  assert.equal(stung?.cause, "rejection");
  assert.equal(getSocialLink(world, first.id, second.id)?.grudge ?? 0, 8);
  assert.equal(getSocialLinksView(world, first.id)[0]?.grudgeArc, "嫌隙");

  const said = performAction(world, first.id, `say:${second.id}`);
  assert.equal(said.accepted, true);
  const spoken = (world.messages ?? []).find((message) => message.toCultivatorId === second.id && message.spokenLine && message.subject.includes("说话"))?.spokenLine
    ?? getSocialLink(world, first.id, second.id)?.lastSpokenLine;
  assert.ok(spoken);
  assert.ok(MOOD_LINE_POOLS.stung.say.includes(spoken!), spoken);
  assert.equal(getCultivatorState(world, second.id).mood?.cause, "spoken");

  noteWound(world, second);
  assert.equal(getCultivatorState(world, second.id).mood?.cause, "wound");
  assert.match(getCultivatorState(world, second.id).digest?.fights.join("") ?? "", /挂了伤/);

  shiftCultivatorMood(world, first, "win");
  assert.equal(getCultivatorState(world, first.id).mood?.id, "lifted");
  assert.equal(getCultivatorState(world, first.id).mood?.cause, "win");
});

test("a breakthrough and a city duel leave a mood the digest can retell", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "破境弟子" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.realmProgress = 100;
  cultivator.inventory["cloud-heart-grass"] = 1;
  cultivator.inventory["moon-dew-flower"] = 1;
  cultivator.inventory["clear-zhi-leaf"] = 1;
  cultivator.inventory["condensed-qi-dew"] = 1;
  performAction(world, created.id, "residence-breakthrough");
  runUntilIdle(world, created.id, 8);
  assert.equal(cultivator.realmLevel, 2);
  assert.equal(getCultivatorState(world, created.id).mood?.cause, "breakthrough");
  assert.match(getCultivatorState(world, created.id).digest?.summary ?? "", /破境|境界/);

  const { world: duelWorld, first, second } = spawn("对手");
  const challenged = performAction(duelWorld, first.id, `challenge-cultivator:${second.id}`);
  assert.equal(challenged.accepted, true);
  assert.match(challenged.summary, /下了切磋挑战书/);
  assert.equal(challenged.summary.includes("duel"), false);
  performAction(duelWorld, second.id, `accept-pvp-challenge:${second.pendingPvpChallengeId}`);
  runUntilIdle(duelWorld, first.id, 10);
  const left = getCultivatorState(duelWorld, first.id);
  const right = getCultivatorState(duelWorld, second.id);
  assert.ok(left.mood && ["win", "loss", "settled"].includes(left.mood.cause));
  assert.ok(right.mood && ["win", "loss", "settled"].includes(right.mood.cause));
  assert.match(`${left.digest?.summary ?? ""}${right.digest?.summary ?? ""}`, /城里|平手|撤/);
});

test("a few social actions fill the digest with a relationship, a quote, and a mood", () => {
  const { world, first, second } = spawn("林晚");
  const progressBefore = first.realmProgress;
  first.realmProgress = 20;
  performAction(world, first.id, "cultivate");
  runUntilIdle(world, first.id, 6);
  assert.ok(first.realmProgress > progressBefore || first.realmProgress >= 25);

  performAction(world, first.id, `chat-up:${second.id}`);
  advanceWorld(world, 4);
  performAction(world, first.id, `chat-up:${second.id}`);
  performAction(world, first.id, `say:${second.id}`, "这句你替我转给主人。");

  const digest = getCultivatorState(world, first.id).digest;
  assert.ok(digest);
  assert.equal(digest.windowTicks, 6);
  assert.equal(digest.windowHours, 12);
  assert.match(digest.summary, /点头之交/);
  assert.match(digest.summary, /「这句你替我转给主人。」/);
  assert.match(digest.summary, /。$/);
  assert.ok(digest.relationships.some((line) => line.includes("点头之交")));
  assert.ok(digest.quotes.some((quote) => quote.line === "这句你替我转给主人。"));
  assert.ok(digest.growth.some((line) => line.includes("进度")) || digest.summary.includes("进度"));
  assert.match(getCultivatorState(world, second.id).digest?.summary ?? "", /点头之交|这句你替我转给主人/);
});

test("generated mood lines stay inside one short sentence", () => {
  for (const pool of Object.values(MOOD_LINE_POOLS)) {
    for (const lines of Object.values(pool)) {
      for (const line of lines) {
        assert.ok(line.endsWith("。"), line);
        assert.ok(Array.from(line).length <= SPEECH_MAX_CHARS, line);
      }
    }
  }
});
