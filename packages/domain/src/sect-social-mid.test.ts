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
import { addMutualAffinity, addMutualGrudge, getSocialLink } from "./social.js";
import { noteArrivalReunion } from "./social-deepen.js";
import { SECT_DUTY_KEYS, buildSectDutyScene, listSectDutyVariantIds } from "./sect-duty-scenes.js";

const LATIN = /[A-Za-z]/;
const POSTS = new Set(["outer-chore", "inner-cultivate", "steward", "elder", "master-seat"]);

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  let guard = 0;
  while (world.cultivators[cultivatorId]?.activeJobId) {
    advanceWorld(world, 1);
    guard += 1;
    if (guard > 12) throw new Error(`job did not finish for ${cultivatorId}`);
  }
}

function joinCangMu(world: ReturnType<typeof createSeedWorld>) {
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:sect-outpost:cang-mu-gu";
  cultivator.injuryTicksRemaining = 0;
  cultivator.activeJobId = null;
  performAction(world, cultivator.id, "join-neutral-sect:cang-mu-gu");
  return cultivator;
}

function spawn(names: string[]) {
  const world = createSeedWorld();
  const people = [world.cultivators["yun-zhong-he"]!];
  for (const name of names) {
    const summary = syncCultivatorFromPersona(world, { agentId: `agent-${name}`, name });
    people.push(world.cultivators[summary.selectedCultivatorId]!);
  }
  for (const person of people) {
    person.locationId = "qingzhou:main-city";
    person.qi = person.maxQi;
    person.spiritualPower = person.maxSpiritualPower;
    person.injuryTicksRemaining = 0;
    person.activeJobId = null;
  }
  return { world, people };
}

test("every sect post and chain has two Chinese scenes", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  for (const key of SECT_DUTY_KEYS) {
    const variants = listSectDutyVariantIds(key);
    assert.equal(variants.length, 2, key);
    if (POSTS.has(key)) cultivator.sectPost = key as typeof cultivator.sectPost;
    const actionId = POSTS.has(key) ? "post-duty" : `sect-chain:${key}`;
    const seen = new Set<string>();
    for (let tick = 0; tick < 40 && seen.size < 2; tick += 1) {
      world.tick = tick;
      const scene = buildSectDutyScene(world, cultivator, actionId);
      assert.ok(scene, key);
      seen.add(scene.sceneId);
      assert.equal(LATIN.test(scene.context), false, scene.context);
      assert.equal(scene.defaultOptionId, "plain");
      assert.ok(scene.options.length === 3 || scene.options.length === 4);
      assert.ok(scene.options.some((option) => option.optionId === "plain"));
      assert.ok(scene.options.some((option) => option.optionId === "take" && option.line.includes("六枚")));
      const spend = scene.options.find((option) => option.optionId === "spend");
      const hard = scene.options.find((option) => option.optionId === "hard");
      assert.ok(spend || hard);
      if (spend) assert.match(spend.line, /四枚/);
      if (hard) assert.match(hard.line, /剑拔弩张/);
      for (const option of scene.options) {
        assert.equal(LATIN.test(option.label), false, option.label);
        assert.equal(LATIN.test(option.line), false, option.line);
        assert.equal(LATIN.test(option.description), false, option.description);
      }
    }
    assert.equal(seen.size, 2, `${key} only rolled ${[...seen].join(",")}`);
  }
});

test("an outer duty pauses for a Chinese choice, then still pays the post", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  performAction(world, cultivator.id, "take-post:outer-chore");
  const beforeMerit = getCultivatorState(world, cultivator.id).sectLife?.merit ?? 0;
  performAction(world, cultivator.id, "post-duty");
  advanceWorld(world, 1);
  const scene = getCultivatorState(world, cultivator.id).currentJob?.meta?.sectScene;
  assert.ok(scene);
  assert.equal(scene.defaultOptionId, "plain");
  assert.ok(scene.options.length >= 3);
  assert.match(scene.context, /苍木谷|药|册子/);
  const actions = listAvailableActions(world, cultivator.id);
  const plain = actions.find((action) => action.actionId === "sect-scene:plain");
  assert.ok(plain);
  assert.equal(LATIN.test(plain.label), false);
  assert.equal(LATIN.test(plain.description), false);
  const chosen = performAction(world, cultivator.id, "sect-scene:plain");
  assert.match(chosen.summary, /见闻/);
  advanceWorld(world, 1);
  assert.equal(cultivator.activeJobId, null);
  const after = getCultivatorState(world, cultivator.id);
  assert.ok((after.sectLife?.merit ?? 0) > beforeMerit);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /见闻/);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /本职|声望/);
});

test("an unanswered duty times out onto the plain line and still finishes", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  performAction(world, cultivator.id, "take-post:outer-chore");
  const beforeMerit = getCultivatorState(world, cultivator.id).sectLife?.merit ?? 0;
  performAction(world, cultivator.id, "post-duty");
  runUntilIdle(world, cultivator.id);
  assert.ok((getCultivatorState(world, cultivator.id).sectLife?.merit ?? 0) > beforeMerit);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /时辰到了/);
  assert.equal(cultivator.activeJobId, null);
});

test("patrol pauses on a later tick with its own scene, and gathering does not", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  performAction(world, cultivator.id, "take-post:outer-chore");
  performAction(world, cultivator.id, "sect-chain:patrol");
  advanceWorld(world, 1);
  assert.ok(cultivator.activeJobId);
  assert.equal(getCultivatorState(world, cultivator.id).currentJob?.meta?.sectScene, undefined);
  advanceWorld(world, 1);
  const scene = getCultivatorState(world, cultivator.id).currentJob?.meta?.sectScene;
  assert.ok(scene);
  assert.match(scene.context, /脚印|山口/);
  assert.equal(scene.sceneId.startsWith("patrol:"), true);
  performAction(world, cultivator.id, "sect-scene:plain");
  runUntilIdle(world, cultivator.id);

  const herb = world.spiritVeins?.["qingzhou:herb-field"];
  assert.ok(herb);
  herb.lastYieldTick = world.tick - 8;
  advanceWorld(world, 1);
  cultivator.locationId = herb.locationId;
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, `gather-vein:${herb.id}`);
  assert.ok(cultivator.activeJobId);
  assert.equal(listAvailableActions(world, cultivator.id).some((action) => String(action.actionId).startsWith("sect-scene:")), false);
  advanceWorld(world, 1);
  assert.equal(cultivator.activeJobId, null);
});

test("a sect mate can be called in, and a nearby feud can be spoken to hard", () => {
  const world = createSeedWorld();
  const cultivator = joinCangMu(world);
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-mate", name: "青萝" });
  const mate = world.cultivators[summary.selectedCultivatorId]!;
  mate.locationId = cultivator.locationId;
  mate.injuryTicksRemaining = 0;
  mate.activeJobId = null;
  performAction(world, mate.id, "join-neutral-sect:cang-mu-gu");
  performAction(world, cultivator.id, "take-post:outer-chore");
  performAction(world, cultivator.id, "post-duty");
  advanceWorld(world, 1);
  const share = listAvailableActions(world, cultivator.id).find((action) => action.actionId === "sect-scene:share");
  assert.match(share?.description ?? "", /青萝/);
  performAction(world, cultivator.id, "sect-scene:share");
  assert.ok((getSocialLink(world, cultivator.id, mate.id)?.affinity ?? 0) >= 4);
  assert.match(getCultivatorState(world, cultivator.id).digest?.summary ?? "", /青萝|见闻/);
  runUntilIdle(world, cultivator.id);

  const rivalSummary = syncCultivatorFromPersona(world, { agentId: "agent-foe", name: "楚晚" });
  const rival = world.cultivators[rivalSummary.selectedCultivatorId]!;
  rival.locationId = cultivator.locationId;
  rival.injuryTicksRemaining = 0;
  rival.activeJobId = null;
  addMutualGrudge(world, cultivator.id, rival.id, 8);
  const beforeAffinity = getSocialLink(world, cultivator.id, rival.id)?.affinity ?? 0;
  const beforeGrudge = getSocialLink(world, cultivator.id, rival.id)?.grudge ?? 0;
  performAction(world, cultivator.id, "post-duty");
  advanceWorld(world, 1);
  const hard = listAvailableActions(world, cultivator.id).find((action) => action.actionId === "sect-scene:hard");
  assert.match(hard?.description ?? "", /楚晚|剑拔弩张/);
  performAction(world, cultivator.id, "sect-scene:hard");
  assert.equal(getSocialLink(world, cultivator.id, rival.id)?.affinity ?? 0, beforeAffinity);
  assert.ok((getSocialLink(world, cultivator.id, rival.id)?.grudge ?? 0) > beforeGrudge);
  assert.match(getCultivatorState(world, cultivator.id).digest?.summary ?? "", /剑拔弩张/);
  assert.throws(
    () => performAction(world, cultivator.id, "sect-scene:spend"),
    (error: unknown) => error instanceof GameplayRejection,
  );
});

test("reading a note moves affinity, and a 嫌隙 reply does not", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  second.locationId = "yangzhou:main-city";
  performAction(world, first.id, `leave-note:${second.id}`, "人回来先到城门口找我。");
  const noteId = Object.keys(world.personalNotes ?? {})[0];
  assert.ok(noteId);
  performAction(world, second.id, `read-note:${noteId}`);
  assert.ok((getSocialLink(world, first.id, second.id)?.affinity ?? 0) >= 3);
  assert.match(getCultivatorState(world, second.id).digest?.summary ?? "", /好感|人回来先到城门口找我/);

  addMutualGrudge(world, first.id, second.id, 8);
  const before = getSocialLink(world, first.id, second.id)?.affinity ?? 0;
  const replied = performAction(world, second.id, `reply-note:${noteId}`, "字条看见了，人还没消气。");
  assert.match(replied.summary, /剑拔弩张/);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity ?? 0, before);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /剑拔弩张/);
});

test("feud gossip told to the person stays cold, and bond gossip warms a bystander", () => {
  const { world, people } = spawn(["青萝", "阿宁", "小林"]);
  const [first, second, third, fourth] = people;
  assert.ok(first && second && third && fourth);
  performAction(world, first.id, `ask-favor:${second.id}:escort-gate`);
  const favorId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(favorId);
  performAction(world, second.id, `decline-favor:${favorId}`);
  const feud = (third.heardGossip ?? []).find((item) => item.kind === "feud");
  assert.ok(feud);
  const before = getSocialLink(world, third.id, first.id)?.affinity ?? 0;
  const told = performAction(world, third.id, `mention-gossip:${feud.id}:${first.id}`, "那件事我当面告诉你。");
  assert.match(told.summary, /剑拔弩张/);
  assert.equal(getSocialLink(world, third.id, first.id)?.affinity ?? 0, before);
  assert.match(getCultivatorState(world, third.id).digest?.summary ?? "", /剑拔弩张/);

  addMutualAffinity(world, first.id, second.id, 200);
  const bond = (fourth.heardGossip ?? []).find((item) => item.kind === "bond")
    ?? (third.heardGossip ?? []).find((item) => item.kind === "bond");
  assert.ok(bond);
  const speaker = (fourth.heardGossip ?? []).some((item) => item.id === bond.id) ? fourth : third;
  const listener = speaker.id === fourth.id ? third : fourth;
  const warmBefore = getSocialLink(world, speaker.id, listener.id)?.affinity ?? 0;
  const warm = performAction(world, speaker.id, `mention-gossip:${bond.id}:${listener.id}`, "听人说他们走近了。");
  assert.match(warm.summary, /好感/);
  assert.ok((getSocialLink(world, speaker.id, listener.id)?.affinity ?? 0) > warmBefore);
});

test("arriving beside a feud writes 剑拔弩张 once, and an open favor says the errand is unfinished", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  addMutualGrudge(world, first.id, second.id, 8);
  second.locationId = "yangzhou:main-city";
  first.locationId = "yangzhou:main-city";
  noteArrivalReunion(world, first);
  const arrived = (note: { detail: string }) => note.detail.includes("已经在") && note.detail.includes("剑拔弩张");
  assert.equal((first.travelNotes ?? []).filter(arrived).length, 1);
  assert.equal((second.travelNotes ?? []).filter(arrived).length, 1);
  assert.match(getCultivatorState(world, first.id).digest?.summary ?? "", /剑拔弩张/);
  noteArrivalReunion(world, first);
  assert.equal((first.travelNotes ?? []).filter(arrived).length, 1);

  const later = createSeedWorld();
  const asker = later.cultivators["yun-zhong-he"]!;
  asker.locationId = "qingzhou:main-city";
  asker.qi = asker.maxQi;
  const helped = syncCultivatorFromPersona(later, { agentId: "agent-help", name: "青萝" });
  const helper = later.cultivators[helped.selectedCultivatorId]!;
  helper.locationId = "qingzhou:main-city";
  helper.qi = helper.maxQi;
  helper.injuryTicksRemaining = 0;
  performAction(later, asker.id, `ask-favor:${helper.id}:escort-gate`);
  const favorId = Object.keys(later.personalFavors ?? {})[0];
  assert.ok(favorId);
  performAction(later, helper.id, `accept-favor:${favorId}`);
  helper.locationId = "yangzhou:main-city";
  asker.locationId = "yangzhou:main-city";
  noteArrivalReunion(later, asker);
  assert.match((asker.travelNotes ?? []).map((note) => note.detail).join(""), /还没办完/);
  assert.match(getCultivatorState(later, helper.id).digest?.summary ?? "", /还没办完/);
});

test("standing together does not warm a feud, and a bare say comes out hard", () => {
  const { world, people } = spawn(["青萝"]);
  const [first, second] = people;
  assert.ok(first && second);
  addMutualAffinity(world, first.id, second.id, 10);
  addMutualGrudge(world, first.id, second.id, 8);
  const before = getSocialLink(world, first.id, second.id)?.affinity ?? 0;
  advanceWorld(world, 6);
  assert.equal(getSocialLink(world, first.id, second.id)?.affinity ?? 0, before);
  first.mood = { id: "steady", label: "平", sentence: "这会儿没什么要报的。", sinceTick: world.tick, cause: "settled" };
  const said = performAction(world, first.id, `say:${second.id}`);
  assert.equal(said.accepted, true);
  const spoken = world.messages.find((message) => message.fromCultivatorId === first.id && message.spokenLine)?.spokenLine ?? "";
  assert.match(spoken, /那一架|再战|不收|说硬/);
  for (const key of Object.keys(first.inventory)) first.inventory[key as keyof typeof first.inventory] = 0;
  first.inventory["healing-pill"] = 1;
  first.lastGiftTick = -1;
  performAction(world, first.id, `send-message:${second.id}:gift-item`);
  const giftLine = (first.travelNotes ?? []).map((note) => note.detail).join("");
  assert.match(giftLine, /那一架|说硬|讲和/);
});
