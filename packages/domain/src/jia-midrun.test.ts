import assert from "node:assert/strict";
import test from "node:test";

import { chooseDungeonExpeditionStepKind } from "./dungeon-expedition-service.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import type { DungeonGrade } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function assertChineseCard(text: string): void {
  assert.match(text, /[\u4e00-\u9fff]/);
  assert.equal(/[A-Za-z]/.test(text), false, text);
  assert.equal(/[a-z]+-[a-z0-9-]+/i.test(text), false, text);
}

test("筑基 at 丹霞内府 still sees the locked gate", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = "筑基";
  cultivator.realmLevel = 5;
  cultivator.locationId = "yangzhou:dungeon-a";
  cultivator.injuryTicksRemaining = 0;

  const actions = listAvailableActions(world, CULTIVATOR_ID);
  const locked = actions.find((action) => action.actionId === "dungeon-gate-locked");
  assert.ok(locked);
  assert.match(locked.label, /丹霞内府/);
  assert.match(locked.description, /金丹/);
  assert.match(locked.description, /丹霞露/);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("enter-dungeon:")), false);
  assert.equal(actions.some((action) => String(action.actionId).startsWith("start-dungeon-expedition:")), false);
  assert.match(getCultivatorState(world, CULTIVATOR_ID).dungeon?.lockReason ?? "", /丹霞内府要得到金丹才进得去/);
});

test("an uncleared 甲 floor searches the first three steps, and 乙 can still meet the guardian early", () => {
  let jiaEarlyGuardian = 0;
  let jiaLaterGuardian = 0;
  let yiEarlyGuardian = 0;
  for (let n = 0; n < 40; n += 1) {
    const base = {
      targetRank: 1 as const,
      frontierRank: 1 as const,
      highestClearedRank: 0,
      policy: "aggressive" as const,
      jobId: `job-${n}`,
      worldTick: n,
      cultivatorId: "gu-changchuan",
    };
    const kind = (stepIndex: number, grade: DungeonGrade) => chooseDungeonExpeditionStepKind({
      ...base,
      stepIndex,
      grade,
    });
    if (kind(0, "甲") === "guardian" || kind(1, "甲") === "guardian" || kind(2, "甲") === "guardian") {
      jiaEarlyGuardian += 1;
    }
    if (kind(3, "甲") === "guardian") jiaLaterGuardian += 1;
    if (kind(0, "乙") === "guardian") yiEarlyGuardian += 1;
  }
  assert.equal(jiaEarlyGuardian, 0);
  assert.ok(jiaLaterGuardian > 0);
  assert.ok(yiEarlyGuardian > 0);
});

test("金丹 opening 丹霞内府 gets a choice before the guardian, and the gate lists one door", () => {
  for (const posture of ["conservative", "balanced", "aggressive"] as const) {
    const world = createSeedWorld();
    const cultivator = world.cultivators[CULTIVATOR_ID]!;
    cultivator.realm = "金丹";
    cultivator.realmLevel = 7;
    cultivator.qi = cultivator.maxQi;
    cultivator.spiritualPower = cultivator.maxSpiritualPower;
    cultivator.injuryTicksRemaining = 0;
    cultivator.locationId = "yangzhou:dungeon-a";
    cultivator.dungeonProgress = {
      丙: { highestClearedRank: 9 },
      乙: { highestClearedRank: 9 },
      甲: { highestClearedRank: 0 },
    };

    const gate = listAvailableActions(world, CULTIVATOR_ID);
    assert.equal(gate.some((action) => action.actionId === "dungeon-gate-locked"), false);
    assert.equal(gate.some((action) => String(action.actionId).startsWith("start-dungeon-expedition:")), false);
    const card = gate.find((action) => action.actionId === `enter-dungeon:rank-1:${posture}`);
    assert.ok(card, posture);
    assert.match(card.label, /进甲级地宫第1阶/);
    assert.match(card.description, /三十刻/);
    assert.match(card.description, /岔路和侧室在守关前面/);
    assertChineseCard(`${card.label} ${card.description}`);
    if (posture === "conservative") assert.match(card.description, /稳妥偏守/);
    if (posture === "balanced") assert.match(card.description, /这一趟走均衡/);
    if (posture === "aggressive") assert.match(card.description, /凶猛偏攻/);

    performAction(world, CULTIVATOR_ID, `enter-dungeon:rank-1:${posture}` as never);
    let sawChoice = false;
    for (let step = 0; step < 24 && cultivator.activeJobId && !sawChoice; step += 1) {
      advanceWorld(world, 1);
      const progress = world.dungeonExpeditions[CULTIVATOR_ID];
      const actions = listAvailableActions(world, CULTIVATOR_ID);
      const choices = actions.filter((action) => (
        String(action.actionId).startsWith("dungeon-wake-decision:")
        || String(action.actionId).startsWith("choose-event:")
      ));
      if (choices.length === 0) continue;
      assert.equal(progress?.guardianSteps ?? 0, 0, `${posture} met the guardian before a choice`);
      assert.ok(actions.some((action) => action.actionId === "abort-dungeon-expedition"));
      for (const choice of choices) {
        assertChineseCard(`${choice.label} ${choice.description}`);
      }
      const hint = getCultivatorState(world, CULTIVATOR_ID).dungeonExpedition.wakeNodeHint;
      if (hint) assert.equal(hint.timeoutTicks, 10);
      sawChoice = true;
    }
    assert.equal(sawChoice, true, `${posture} listed only abort before the run ended`);
  }

  const legacy = createSeedWorld();
  const cultivator = legacy.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.qi = cultivator.maxQi;
  cultivator.locationId = "yangzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 0 },
  };
  const started = performAction(legacy, CULTIVATOR_ID, "start-dungeon-expedition:rank-1:balanced" as never);
  assert.equal(started.accepted, true);
  assert.equal(started.job?.totalTicks, 30);
  assert.equal(legacy.dungeonExpeditions[CULTIVATOR_ID]?.grade, "甲");
});
