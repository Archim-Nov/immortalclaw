import assert from "node:assert/strict";
import test from "node:test";

import { GUIXU_EVENT_POOL, eventPoolForNode } from "./guixu-events.js";
import { GUIXU_FACING, guixuScenes } from "./guixu-scenes.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";

function asFutureActionId(value: string) {
  return value as never;
}

function prepareGuixuCandidate() {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  const inventory = cultivator.inventory as Record<string, number>;

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "閲戜腹" as typeof cultivator.realm;
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 260;
  cultivator.qi = cultivator.maxQi = 160;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 150;
  inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;

  return { world, cultivator, inventory };
}

test("bahuang attunement can unlock the Guixu threshold node", () => {
  const { world, cultivator } = prepareGuixuCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-bahuang:balanced"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("retreat-from-bahuang"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  const actions = listAvailableActions(world, cultivator.id);
  const unlockAction = actions.find((action) => action.actionId === "unlock-guixu:guixu-threshold-gate");

  assert.ok(unlockAction);

  const result = performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  const state = getCultivatorState(world, cultivator.id) as ReturnType<typeof getCultivatorState> & {
    guixu?: {
      wildernessAttunement: number;
      unlockedNodeIds: string[];
      sharedUnlockedNodeIds: string[];
    };
  };

  assert.equal(result.accepted, true);
  assert.ok((state.guixu?.wildernessAttunement ?? 0) >= 2);
  assert.ok(state.guixu?.unlockedNodeIds.includes("guixu-threshold-gate"));
});

test("shared Guixu nodes unlock once and become available to other cultivators", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  const second = syncCultivatorFromPersona(world, {
    agentId: "agent-guixu-peer",
    name: "Shen Qing",
  });
  const secondCultivator = world.cultivators[second.selectedCultivatorId]!;
  const secondInventory = secondCultivator.inventory as Record<string, number>;

  secondCultivator.locationId = "qingzhou:dungeon-a";
  secondCultivator.realm = "閲戜腹" as typeof secondCultivator.realm;
  secondCultivator.realmLevel = 1;
  secondInventory["eight-wastes-pass"] = 1;

  performAction(world, cultivator.id, asFutureActionId("enter-bahuang:balanced"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("retreat-from-bahuang"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));

  const result = performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));
  const otherActions = listAvailableActions(world, secondCultivator.id);

  assert.equal(result.accepted, true);
  assert.ok(otherActions.some((action) => action.actionId === "explore-guixu:guixu-ancient-seal"));
});

test("exploring Guixu resolves endgame events and grants exclusive rewards", () => {
  const { world, cultivator, inventory } = prepareGuixuCandidate();

  performAction(world, cultivator.id, asFutureActionId("enter-bahuang:balanced"));
  advanceWorld(world, 2);
  performAction(world, cultivator.id, asFutureActionId("retreat-from-bahuang"));

  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));

  const result = performAction(world, cultivator.id, asFutureActionId("explore-guixu:guixu-ancient-seal"));
  while (cultivator.activeJobId) {
    advanceWorld(world, 1);
  }

  assert.equal(result.accepted, true);
  assert.ok((inventory["legendary-artifact"] ?? 0) > 0);
  assert.ok(
    world.worldEvents.some((event) => event.tags.includes("guixu") && event.tags.includes("endgame")),
  );
  const closing = world.worldEvents.find((event) => event.tags.includes("guixu") && event.tags.includes("endgame"));
  assert.match(closing?.title ?? "", /[\u4e00-\u9fff]/u);
  assert.doesNotMatch(`${closing?.title ?? ""} ${closing?.content ?? ""}`, /Guixu|Ancient|Threshold|Spirit Nexus|Void Corridor|Origin Heart/u);
});

function advanceUntil(world: ReturnType<typeof createSeedWorld>, pred: () => boolean, max = 40) {
  for (let i = 0; i < max; i += 1) {
    if (pred()) return;
    advanceWorld(world, 1);
  }
  assert.fail("timed out waiting for 归虚");
}

test("归虚节点名、收尾和岔路都是中文，池子比一条英文事件厚", () => {
  for (const [nodeId, facing] of Object.entries(GUIXU_FACING)) {
    assert.match(facing.name, /^归虚/u);
    assert.ok(guixuScenes(nodeId).length >= 1);
    for (const scene of guixuScenes(nodeId)) {
      assert.ok(scene.options.length >= 3);
      assert.match(scene.context, /[\u4e00-\u9fff]/u);
      assert.doesNotMatch(scene.context, /[A-Za-z]{3,}/u);
    }
    assert.ok(eventPoolForNode(nodeId, ["guixu-threshold-vision"]).length >= 3);
  }
  for (const event of Object.values(GUIXU_EVENT_POOL)) {
    assert.match(event.title, /[\u4e00-\u9fff]/u);
    assert.doesNotMatch(`${event.title} ${event.content} ${event.summary}`, /Guixu|Threshold|Ancient Seal|Spirit Nexus|Void Corridor|Origin Heart/u);
  }
  assert.equal(eventPoolForNode("guixu-ancient-seal", ["guixu-ancient-seal"]).length, 3);
});

test("打开归虚的标签和拒绝是中文，仙缘或境界不够时说清原因", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  cultivator.realm = "炼气" as typeof cultivator.realm;
  cultivator.realmLevel = 3;
  assert.throws(
    () => performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate")),
    /境界/,
  );

  cultivator.realm = "金丹" as typeof cultivator.realm;
  cultivator.realmLevel = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 0;
  assert.throws(
    () => performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate")),
    /仙缘/,
  );

  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  const actions = listAvailableActions(world, cultivator.id);
  const unlock = actions.find((action) => action.actionId === "unlock-guixu:guixu-threshold-gate");
  assert.ok(unlock);
  assert.match(unlock.label, /归虚门槛/);
  assert.doesNotMatch(`${unlock.label} ${unlock.description}`, /Guixu|Threshold|attunement/u);

  const opened = performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  assert.match(opened.summary, /归虚门槛/);
  assert.doesNotMatch(opened.summary, /unlocked|Guixu/u);
  assert.throws(
    () => performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate")),
    /已经开过了/,
  );
});

test("探归虚古印会停下，摸一把才进三十六枚灵石，摘要和见闻是中文", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  world.guixuNodes["guixu-ancient-seal"]!.name = "Guixu Ancient Seal";
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-threshold-gate"));
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));
  const explore = listAvailableActions(world, cultivator.id).find((action) => action.actionId === "explore-guixu:guixu-ancient-seal");
  assert.match(explore?.label ?? "", /探归虚古印/);
  assert.doesNotMatch(explore?.label ?? "", /Guixu/);

  performAction(world, cultivator.id, asFutureActionId("explore-guixu:guixu-ancient-seal"));
  advanceUntil(world, () => listAvailableActions(world, cultivator.id).some((action) => String(action.actionId).startsWith("guixu-choice:")));
  const open = getCultivatorState(world, cultivator.id);
  assert.equal(open.guixu?.run?.decisionLine, "归虚岔路待决");
  assert.match(open.guixu?.run?.context ?? "", /古印/);
  assert.ok(open.digest?.priorities?.includes("归虚岔路待决"));
  const choices = listAvailableActions(world, cultivator.id);
  assert.ok(choices.length >= 3);
  assert.ok(choices.every((action) => String(action.actionId).startsWith("guixu-choice:")));
  const pocket = choices.find((action) => action.label.includes("摸一把"));
  assert.ok(pocket);

  const job = world.jobs[cultivator.activeJobId!]!;
  const held = job.remainingTicks;
  const tick = world.tick;
  advanceWorld(world, 3);
  assert.equal(world.tick, tick + 3);
  assert.equal(job.remainingTicks, held);

  const stones = cultivator.spiritStones;
  const chosen = performAction(world, cultivator.id, pocket.actionId);
  assert.equal(cultivator.spiritStones, stones + 36);
  assert.match(chosen.summary, /三十六枚灵石/);
  assert.doesNotMatch(chosen.summary, /[A-Za-z]{3,}/u);
  const notes = getCultivatorState(world, cultivator.id).travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /见闻/);

  while (cultivator.activeJobId) advanceWorld(world, 1);
  assert.ok((cultivator.inventory["legendary-artifact"] ?? 0) > 0);
  const finished = getCultivatorState(world, cultivator.id).travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(finished, /带出何物/);
  assert.match(finished, /传说遗宝/);
});

test("归虚岔路时辰到了不代选，也不把这一步的灵石放进袋子", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-ancient-seal"));
  performAction(world, cultivator.id, asFutureActionId("explore-guixu:guixu-ancient-seal"));
  advanceUntil(world, () => Boolean(getCultivatorState(world, cultivator.id).guixu?.run));
  const stones = cultivator.spiritStones;
  advanceWorld(world, 9);
  assert.ok(getCultivatorState(world, cultivator.id).guixu?.run);
  advanceWorld(world, 1);
  assert.equal(getCultivatorState(world, cultivator.id).guixu?.run ?? null, null);
  assert.equal(cultivator.spiritStones, stones);
  const notes = getCultivatorState(world, cultivator.id).travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /时辰到了/);
  assert.match(notes, /没选/);
  assert.doesNotMatch(notes, /代选了/);
});

test("归虚本源心会先后停下两处不同的场面", () => {
  const { world, cultivator } = prepareGuixuCandidate();
  performAction(world, cultivator.id, asFutureActionId("unlock-guixu:guixu-origin-heart"));
  performAction(world, cultivator.id, asFutureActionId("explore-guixu:guixu-origin-heart"));
  advanceUntil(world, () => Boolean(getCultivatorState(world, cultivator.id).guixu?.run));
  const first = getCultivatorState(world, cultivator.id).guixu?.run;
  assert.match(first?.context ?? "", /本源心/);
  const listen = listAvailableActions(world, cultivator.id).find((action) => action.label.includes("先听它跳完"));
  assert.ok(listen);
  const stones = cultivator.spiritStones;
  performAction(world, cultivator.id, listen.actionId);
  assert.equal(cultivator.spiritStones, stones);
  advanceUntil(world, () => {
    const run = getCultivatorState(world, cultivator.id).guixu?.run;
    return Boolean(run && run.context !== first?.context);
  });
  const second = getCultivatorState(world, cultivator.id).guixu?.run;
  assert.match(second?.context ?? "", /火/);
  assert.notEqual(second?.context, first?.context);
  const stoke = listAvailableActions(world, cultivator.id).find((action) => action.label.includes("把火吹旺"));
  assert.ok(stoke);
  performAction(world, cultivator.id, stoke.actionId);
  assert.ok(cultivator.injuryTicksRemaining >= 2);
  assert.equal(cultivator.spiritStones, stones + 64);
  while (cultivator.activeJobId) advanceWorld(world, 1);
  assert.ok((cultivator.inventory["legendary-artifact"] ?? 0) >= 2);
});
