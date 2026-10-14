import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorld, createSeedWorld, listAvailableActions, performAction } from "./index.js";

test("a road scene queues three or four labeled actions and pays only the chosen thin outcome", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.moralityScore = 2;
  const beforeStones = cultivator.spiritStones;
  const beforeQi = cultivator.qi;
  const scene = world.eventPools.globalCommon.find((event) => event.id === "g-sc-01");
  assert.ok(scene?.sceneChoice);
  assert.equal(scene.sceneChoice.options.length, 4);

  world.eventPools = {
    ...world.eventPools,
    globalCommon: [scene],
    travelPool: [],
    stateSpecific: {
      ...world.eventPools.stateSpecific,
      qingzhou: [],
    },
    travelStateSpecific: {
      ...world.eventPools.travelStateSpecific,
      qingzhou: [],
    },
    nodeSpecific: {
      ...world.eventPools.nodeSpecific,
      "qingzhou:sub-town-east": [],
    },
  };

  const started = performAction(world, cultivator.id, "travel-to:qingzhou:sub-town-east");
  assert.equal(started.accepted, true);
  advanceWorld(world, 1);

  assert.ok(cultivator.pendingSceneChoiceId);
  assert.equal(cultivator.pendingMoralityChoiceId, null);
  assert.equal(cultivator.spiritStones, beforeStones);
  assert.equal(cultivator.moralityScore, 2);

  cultivator.activeJobId = "job-still-on-the-road";
  const actions = listAvailableActions(world, cultivator.id);
  const choiceActions = actions.filter((action) => action.actionId.startsWith("choose-event:"));
  assert.equal(choiceActions.length, 4);
  assert.deepEqual(
    choiceActions.map((action) => action.actionId),
    ["choose-event:walk", "choose-event:help", "choose-event:take", "choose-event:risk"],
  );
  for (const action of choiceActions) {
    assert.match(action.label, /[\u4e00-\u9fff]/);
    assert.match(action.description, /井沿只剩这只空桶/);
  }

  const taken = performAction(world, cultivator.id, "choose-event:take");
  assert.equal(taken.accepted, true);
  assert.match(taken.summary, /拿走桶底压着的灵石/);
  assert.equal(cultivator.spiritStones, beforeStones + 8);
  assert.equal(cultivator.qi, beforeQi);
  assert.equal(cultivator.moralityScore, 2);
  assert.equal(cultivator.pendingSceneChoiceId, null);
  assert.equal(listAvailableActions(world, cultivator.id).some((action) => action.actionId.startsWith("choose-event:")), false);
});

test("walking away from a scene choice leaves stones, qi, and morality unchanged", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const beforeStones = cultivator.spiritStones;
  const beforeQi = cultivator.qi;
  const beforeReputation = cultivator.stateReputation.qingzhou ?? 0;
  world.pendingSceneChoices = {
    "scene-choice-9": {
      id: "scene-choice-9",
      cultivatorId: cultivator.id,
      eventId: "g-sc-04",
      createdAtTick: world.tick,
      expiresAtTick: world.tick + 12,
      title: "没人看的香",
      prompt: "香快尽了。你怎么做？",
      options: [
        { id: "walk", label: "在门口停一下就走", summary: "你离开了。口袋和当地的名声都没有变。", effectBundle: {} },
        { id: "help", label: "补上一炷", summary: "你补了香。口袋里多了四枚灵石，当地记下了一份薄人情。", effectBundle: { spiritStones: 4, reputationChange: 1 } },
        { id: "take", label: "从香灰里拣出那几枚", summary: "你拣走了。口袋里多了六枚灵石。", effectBundle: { spiritStones: 6 } },
      ],
    },
  };
  cultivator.pendingSceneChoiceId = "scene-choice-9";

  const walked = performAction(world, cultivator.id, "choose-event:walk");
  assert.equal(walked.accepted, true);
  assert.equal(cultivator.spiritStones, beforeStones);
  assert.equal(cultivator.qi, beforeQi);
  assert.equal(cultivator.moralityScore, 0);
  assert.equal(cultivator.stateReputation.qingzhou ?? 0, beforeReputation);
  assert.equal(cultivator.pendingSceneChoiceId, null);
});

test("the risk option pays a little more and spends qi, without moving morality", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const beforeStones = cultivator.spiritStones;
  world.pendingSceneChoices = {
    "scene-choice-3": {
      id: "scene-choice-3",
      cultivatorId: cultivator.id,
      eventId: "g-sc-02",
      createdAtTick: world.tick,
      expiresAtTick: world.tick + 12,
      title: "桥上松了的板",
      prompt: "这块板再踩一次就会翻。你怎么处理？",
      options: [
        { id: "walk", label: "绕过去", summary: "你绕开了。口袋和当地的名声都没有变。", effectBundle: {} },
        { id: "help", label: "把板钉回去", summary: "你钉好了。口袋里多了四枚灵石，当地记下了一份薄人情。", effectBundle: { spiritStones: 4, reputationChange: 1 } },
        { id: "take", label: "拿走灵石", summary: "你拿走了。口袋里多了八枚灵石。", effectBundle: { spiritStones: 8 } },
        { id: "risk", label: "连桥缝里的碎石一起带走", summary: "你又抠了一把。口袋里多了十二枚灵石，灵力沉了四点。", effectBundle: { spiritStones: 12, qi: -4 } },
      ],
    },
  };
  cultivator.pendingSceneChoiceId = "scene-choice-3";
  const beforeQi = cultivator.qi;

  const risked = performAction(world, cultivator.id, "choose-event:risk");
  assert.equal(risked.accepted, true);
  assert.equal(cultivator.spiritStones, beforeStones + 12);
  assert.equal(cultivator.qi, beforeQi - 4);
  assert.equal(cultivator.moralityScore, 0);
});
