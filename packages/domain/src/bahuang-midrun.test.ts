import assert from "node:assert/strict";
import test from "node:test";

import { previewBahuangWakes, canEnterBahuang } from "./bahuang-service.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  performAction,
} from "./index.js";
import { createCultivator } from "./engine.js";
import type { BahuangExpeditionProgress, Cultivator, WorldState } from "./model.js";
import { addMutualGrudge, getSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function assertChinese(text: string): void {
  assert.match(text, /[\u4e00-\u9fff]/);
  assert.equal(/[A-Za-z]/.test(text), false, text);
}

function blankProgress(depth: number): BahuangExpeditionProgress {
  return {
    cultivatorId: CULTIVATOR_ID,
    status: "active",
    depth,
    supplies: { rations: 4, talismans: 1 },
    pressure: 1,
    strategy: { posture: "balanced", bias: "survival-first", pushPreference: "neutral" },
    encounteredWakeNodes: [],
    pendingWakeNodeIndex: null,
    pendingWakeNodeDeadlineTick: null,
    resolvedWakeNodeCount: 0,
    rewards: { spiritStones: 0, items: {}, realmProgress: 0 },
  };
}

function preparePair(): { world: WorldState; left: Cultivator; right: Cultivator } {
  const world = createSeedWorld();
  const left = world.cultivators[CULTIVATOR_ID]!;
  left.locationId = "qingzhou:dungeon-a";
  left.realm = "金丹";
  left.realmLevel = 5;
  left.totalContribution = 220;
  left.injuryTicksRemaining = 0;
  left.qi = left.maxQi = 400;
  left.spiritualPower = left.maxSpiritualPower = 400;
  left.spiritStones = 500;
  left.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[left.id] = 80;
  world.tick = 10;

  const summary = createCultivator(world, { name: "沈石" });
  const right = world.cultivators[summary.id]!;
  right.locationId = left.locationId;
  right.realm = "金丹";
  right.realmLevel = 5;
  right.totalContribution = 220;
  right.injuryTicksRemaining = 0;
  right.qi = right.maxQi = 400;
  right.spiritualPower = right.maxSpiritualPower = 400;
  right.spiritStones = 500;
  right.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[right.id] = 80;
  return { world, left, right };
}

function openMeeting(world: WorldState, leftId: string) {
  performAction(world, leftId, "enter-bahuang:aggressive" as never);
  const others = Object.keys(world.cultivators).filter((id) => id !== leftId);
  for (const id of others) {
    if ((world.cultivators[id]?.inventory["eight-wastes-pass"] ?? 0) > 0) {
      performAction(world, id, "enter-bahuang:aggressive" as never);
    }
  }
  advanceWorld(world, 1);
  const pending = getCultivatorState(world, leftId).bahuang?.pendingWakeNode;
  assert.ok(pending);
  assert.equal(pending?.sceneKind, "meeting");
  return pending!;
}

test("each bahuang band has its own Chinese wakes", () => {
  const dust = previewBahuangWakes(blankProgress(1));
  const stele = previewBahuangWakes(blankProgress(5));
  const ravine = previewBahuangWakes(blankProgress(8));
  for (const wakes of [dust, stele, ravine]) {
    assert.equal(wakes.length, 4);
    for (const wake of wakes) {
      assert.ok(wake.options.length >= 3 && wake.options.length <= 4);
      assertChinese(wake.context);
      for (const option of wake.options) {
        assertChinese(option.label);
        assertChinese(option.description);
      }
    }
  }
  const dustText = dust.map((wake) => `${wake.context}\n${wake.options.map((option) => option.label).join("")}`).join("\n");
  const steleText = stele.map((wake) => wake.context).join("\n");
  const ravineText = ravine.map((wake) => wake.context).join("\n");
  assert.match(dustText, /沙客/);
  assert.match(dustText, /尘骑/);
  assert.match(dustText, /断法/);
  assert.match(dustText, /井/);
  assert.doesNotMatch(dustText, /碑影|灯烬/);
  assert.match(steleText, /碑影/);
  assert.match(steleText, /碑仆/);
  assert.match(steleText, /定根/);
  assert.match(steleText, /干粮/);
  assert.doesNotMatch(steleText, /沙客|灯烬/);
  assert.match(ravineText, /灯烬/);
  assert.match(ravineText, /壑影/);
  assert.match(ravineText, /幻惑/);
  assert.match(ravineText, /灭掉的灯/);
  assert.doesNotMatch(ravineText, /沙客|碑影/);
});

test("meeting someone in the same bahuang band can be settled as a skill duel", () => {
  const { world, left, right } = preparePair();
  const beforeLogs = world.combatLogs.length;
  const pending = openMeeting(world, left.id);
  assert.ok(pending.options.some((option) => option.optionId === "cross-hands" && option.label === "交手"));
  assertChinese(pending.context);
  assert.match(pending.context, new RegExp(right.name));

  const result = performAction(world, left.id, "bahuang-wake-decision:cross-hands" as never);
  assert.equal(result.accepted, true);
  assertChinese(result.summary);
  assert.match(result.summary, /赢了|输给了|平手|撤了/);
  assert.match(result.summary, /使出/);

  const leftState = getCultivatorState(world, left.id);
  const rightState = getCultivatorState(world, right.id);
  const leftRounds = leftState.recentCombats[0]?.combatRounds ?? [];
  const rightRounds = rightState.recentCombats[0]?.combatRounds ?? [];
  assert.ok(leftRounds.length > 0);
  assert.deepEqual(leftRounds, rightRounds);
  assert.match(leftRounds[0]?.beats.join("") ?? "", /使出/);
  assert.ok(["win", "loss", "draw", "withdraw"].includes(leftRounds[0]?.outcome ?? ""));
  assert.ok(world.combatLogs.length > beforeLogs);
  assert.equal(world.bahuangProgress[left.id]?.status, "active");
  assert.equal(world.bahuangProgress[right.id]?.pendingWakeNodeIndex ?? null, null);

  const link = getSocialLink(world, left.id, right.id);
  assert.ok((link?.grudge ?? 0) >= 8);
  assert.ok((link?.affinity ?? 0) >= 4);
  const digest = `${leftState.digest?.summary ?? ""}\n${(leftState.digest?.fights ?? []).join("\n")}\n${(leftState.digest?.relationships ?? []).join("\n")}`;
  assert.match(digest, /赢了|输给了|平手|嫌隙|交手|使出/);
});

test("avoiding a bahuang meeting leaves a 见闻 and does not fight", () => {
  const { world, left, right } = preparePair();
  openMeeting(world, left.id);
  const stones = left.spiritStones;
  const logs = world.combatLogs.length;
  const result = performAction(world, left.id, "bahuang-wake-decision:slip-past" as never);
  assert.equal(result.accepted, true);
  assertChinese(result.summary);
  assert.match(result.summary, /避开/);
  assert.equal(left.spiritStones, stones);
  assert.equal(world.combatLogs.length, logs);
  assert.equal(getSocialLink(world, left.id, right.id), null);
  const notes = getCultivatorState(world, left.id).travelogue.notes.map((note) => `${note.title} ${note.detail}`).join("\n");
  assert.match(notes, /见闻/);
  assert.match(notes, /避开/);
  assert.equal(world.bahuangProgress[left.id]?.status, "active");
});

test("talking on a bahuang meeting raises affinity unless the pair is already feuding", () => {
  const friendly = preparePair();
  openMeeting(friendly.world, friendly.left.id);
  const talked = performAction(friendly.world, friendly.left.id, "bahuang-wake-decision:speak-with" as never);
  assertChinese(talked.summary);
  assert.match(talked.summary, /攀谈/);
  assert.match(talked.summary, /两人更近了些（认识）/);
  assert.doesNotMatch(talked.summary, /好感\+\d|现在是\d|好感至\d/);
  assert.equal(getSocialLink(friendly.world, friendly.left.id, friendly.right.id)?.affinity, 3);
  assert.equal(friendly.world.combatLogs.length, 0);

  const hostile = preparePair();
  openMeeting(hostile.world, hostile.left.id);
  addMutualGrudge(hostile.world, hostile.left.id, hostile.right.id, 8);
  const hard = performAction(hostile.world, hostile.left.id, "bahuang-wake-decision:speak-with" as never);
  assert.match(hard.summary, /剑拔弩张/);
  assert.equal(getSocialLink(hostile.world, hostile.left.id, hostile.right.id)?.affinity ?? 0, 0);
});

test("a bahuang wake timeout does not grant the pocket the player did not choose", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.qi = cultivator.maxQi = 800;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 800;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;
  performAction(world, cultivator.id, "enter-bahuang:aggressive" as never);
  advanceWorld(world, 1);
  const pending = getCultivatorState(world, cultivator.id).bahuang?.pendingWakeNode;
  assert.ok(pending);
  assert.ok(pending?.options.some((option) => option.optionId.endsWith("-pocket")));
  const stones = cultivator.spiritStones;
  const rations = world.bahuangProgress[cultivator.id]?.supplies.rations;
  advanceWorld(world, 3);
  assert.equal(cultivator.spiritStones, stones);
  assert.equal(world.bahuangProgress[cultivator.id]?.supplies.rations, rations);
  assert.equal(getCultivatorState(world, cultivator.id).bahuang?.pendingWakeNode ?? null, null);
  const notes = getCultivatorState(world, cultivator.id).travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /时辰到了/);
  assert.match(notes, /没有进袋子/);
});

test("choosing the bahuang pocket puts stones in the bag", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.qi = cultivator.maxQi = 800;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 800;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;
  performAction(world, cultivator.id, "enter-bahuang:aggressive" as never);
  advanceWorld(world, 1);
  const pending = getCultivatorState(world, cultivator.id).bahuang?.pendingWakeNode;
  const pocket = pending?.options.find((option) => option.optionId.endsWith("-pocket"));
  assert.ok(pocket);
  const stones = cultivator.spiritStones;
  const result = performAction(world, cultivator.id, `bahuang-wake-decision:${pocket!.optionId}` as never);
  assert.equal(result.accepted, true);
  assertChinese(result.summary);
  assert.equal(cultivator.spiritStones, stones + 28);
});

test("bahuang gate refusals are Chinese", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;
  const wrongPlace = canEnterBahuang(cultivator, cultivator.locationId, world);
  assert.equal(wrongPlace.allowed, false);
  assertChinese(wrongPlace.reason ?? "");

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.inventory["eight-wastes-pass"] = 0;
  const noTicket = canEnterBahuang(cultivator, cultivator.locationId, world);
  assert.match(noTicket.reason ?? "", /八荒令/);
  assertChinese(noTicket.reason ?? "");

  cultivator.inventory["eight-wastes-pass"] = 1;
  cultivator.totalContribution = 0;
  const poor = canEnterBahuang(cultivator, cultivator.locationId, world);
  assert.match(poor.reason ?? "", /贡献/);

  cultivator.totalContribution = 220;
  world.tick = 200;
  const closed = canEnterBahuang(cultivator, cultivator.locationId, world);
  assert.match(closed.reason ?? "", /关着/);
  assertChinese(closed.reason ?? "");
});
