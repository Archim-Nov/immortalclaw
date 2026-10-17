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
import { wildBeats, wildBeatsForState, WILD_DECISION_LINE } from "./wild-beats.js";
import { wildPlaceForState, wildPlaces } from "./wild-places.js";

const CULTIVATOR_ID = "yun-zhong-he";

function prepare(locationId: string) {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = locationId;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 800;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 800;
  return { world, cultivator };
}

function enter(locationId: string) {
  const ready = prepare(locationId);
  performAction(ready.world, CULTIVATOR_ID, "enter-wilderness:starter-wilderness-tier-1" as never);
  return ready;
}

function ids(world: ReturnType<typeof createSeedWorld>, cultivatorId = CULTIVATOR_ID) {
  return listAvailableActions(world, cultivatorId).map((action) => action.actionId);
}

test("each wilderness has two beats of its own, and the sentences stay Chinese", () => {
  const labels: string[] = [];
  const prompts: string[] = [];
  for (const place of wildPlaces()) {
    const beats = wildBeatsForState(place.stateId);
    assert.equal(beats.length, 2, place.name);
    assert.equal(beats[0]?.kind, "历练");
    assert.ok(beats[1]?.kind === "奇遇" || beats[1]?.kind === "人情");
    assert.match(beats[0]?.prompt ?? "", new RegExp(place.enemy));
    assert.match(beats[0]?.prompt ?? "", new RegExp(place.statusLabel));
    assert.match(beats[0]?.prompt ?? "", new RegExp(place.follower));
    for (const beat of beats) {
      prompts.push(beat.prompt);
      assert.equal(beat.options.length, 3);
      for (const option of beat.options) {
        labels.push(option.label);
        for (const text of [beat.prompt, option.label, option.detail, option.line, option.helpedLine, option.aloneLine, option.favorReason]) {
          if (!text) continue;
          assert.equal(/[A-Za-z]/.test(text), false, text);
        }
      }
    }
  }
  assert.equal(wildBeats().length, 18);
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(new Set(prompts).size, prompts.length);
  assert.match(wildBeatsForState("leizhou")[0]?.prompt ?? "", /不是雷泽残阵/);
  assert.equal((wildBeatsForState("leizhou")[0]?.prompt ?? "").includes("露蛛"), false);
  assert.match(wildBeatsForState("zhongzhou")[0]?.prompt ?? "", /不是旧驿石廊/);
  assert.equal(wildPlaceForState("leizhou")?.enemy, "雷雀");
});

test("entering 青岚坡 opens a Chinese choice and records the 见闻 when it is answered", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  const ore = cultivator.inventory["spirit-ore"];
  const actions = listAvailableActions(world, CULTIVATOR_ID);
  assert.deepEqual(actions.map((action) => action.actionId), [
    "wild-choice:qing-cut",
    "wild-choice:qing-spider",
    "wild-choice:qing-vine",
    "withdraw-from-wilderness",
  ]);
  for (const action of actions) {
    assert.equal(/[A-Za-z]/.test(action.label), false, action.label);
    assert.equal(/[A-Za-z]/.test(action.description), false, action.description);
  }
  assert.match(actions[2]?.label ?? "", /药藤/);
  const pending = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(pending.wilderness?.beat?.step, 1);
  assert.equal(pending.wilderness?.beat?.kind, "历练");
  assert.equal(pending.wilderness?.beat?.decisionLine, WILD_DECISION_LINE);
  assert.ok(pending.digest?.priorities?.includes(WILD_DECISION_LINE));
  assert.match(pending.wilderness?.beat?.prompt ?? "", /露蛛/);

  const chosen = performAction(world, CULTIVATOR_ID, "wild-choice:qing-vine" as never);
  assert.equal(chosen.accepted, true);
  assert.match(chosen.summary, /你选了/);
  assert.match(chosen.summary, /青岚坡这一段的见闻/);
  assert.match(chosen.summary, /药藤/);
  assert.equal(chosen.summary.includes("wild-choice"), false);
  assert.equal(/[A-Za-z]/.test(chosen.summary), false, chosen.summary);
  assert.equal(cultivator.inventory["spirit-ore"], ore + 1);
  const after = getCultivatorState(world, CULTIVATOR_ID);
  const notes = after.travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(notes, /青岚坡这一段的见闻/);
  assert.match(notes, /药藤/);
  assert.match(after.digest?.summary ?? "", /见闻/);
  assert.match((after.digest?.growth ?? []).join("\n"), /药藤/);
  assert.equal(after.digest?.priorities?.includes(WILD_DECISION_LINE) ?? false, false);
  assert.equal(after.wilderness?.beat, undefined);
  assert.ok(ids(world).includes("survey-wilderness"));
});

test("a deadline does not skip the open beat or grant its find", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  const ore = cultivator.inventory["spirit-ore"];
  const stones = cultivator.spiritStones;
  const cores = cultivator.inventory["beast-core"];
  const qi = cultivator.qi;
  advanceWorld(world, 20);
  assert.equal(cultivator.locationId, "qingzhou:wilderness");
  assert.ok(cultivator.qi < qi);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(state.wilderness?.status, "active");
  assert.equal(state.wilderness?.beat?.step, 1);
  assert.match(state.wilderness?.beat?.prompt ?? "", /露蛛/);
  assert.equal(cultivator.inventory["spirit-ore"], ore);
  assert.equal(cultivator.inventory["beast-core"], cores);
  assert.equal(cultivator.spiritStones, stones);
  assert.throws(
    () => performAction(world, CULTIVATOR_ID, "survey-wilderness" as never),
    /这一处还没走完/,
  );
  assert.throws(
    () => performAction(world, CULTIVATOR_ID, "wild-choice:lei-bird" as never),
    /不在当前岔路/,
  );
  assert.throws(
    () => performAction(world, CULTIVATOR_ID, "wild-choice:qing-pocket" as never),
    /不在当前岔路/,
  );
  assert.equal(cultivator.inventory["spirit-ore"], ore);
  assert.equal(cultivator.spiritStones, stones);
  const left = performAction(world, CULTIVATOR_ID, "withdraw-from-wilderness" as never);
  assert.match(left.summary, /从青岚坡退出来/);
  assert.equal(/[A-Za-z]/.test(left.summary), false, left.summary);
  assert.equal(cultivator.spiritStones, stones);
  assert.equal(cultivator.inventory["spirit-ore"], ore);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness, null);
});

test("the second beat waits two ticks, and a later deadline still does not pay it", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  const stones = cultivator.spiritStones;
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-cut" as never);
  advanceWorld(world, 1);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness?.beat, undefined);
  assert.ok(ids(world).includes("survey-wilderness"));
  assert.equal(ids(world).some((actionId) => actionId.startsWith("wild-choice:")), false);
  advanceWorld(world, 1);
  const second = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(second.wilderness?.beat?.step, 2);
  assert.equal(second.wilderness?.beat?.kind, "人情");
  assert.match(second.wilderness?.beat?.prompt ?? "", /露/);
  advanceWorld(world, 20);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness?.beat?.step, 2);
  assert.equal(cultivator.spiritStones, stones);
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-pass" as never);
  assert.equal(cultivator.spiritStones, stones);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness?.beat, undefined);
});

test("pressure still sends the cultivator out after both beats, without an extra stone loss", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-cut" as never);
  advanceWorld(world, 2);
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-pass" as never);
  const stones = cultivator.spiritStones;
  let guard = 0;
  while (getCultivatorState(world, CULTIVATOR_ID).wilderness && guard < 12) {
    advanceWorld(world, 1);
    guard += 1;
  }
  const left = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(left.wilderness, null);
  assert.ok(guard < 12);
  assert.equal(cultivator.spiritStones, stones);
  assert.match(left.travelogue.notes.map((note) => note.detail).join("\n"), /从青岚坡退出来/);
});

test("焦林野 asks about 雷雀, not the 青岚坡 cards", () => {
  const { world } = enter("leizhou:wilderness");
  const actions = listAvailableActions(world, CULTIVATOR_ID);
  const text = actions.map((action) => `${action.label} ${action.description}`).join("\n");
  assert.match(text, /雷雀/);
  assert.match(text, /焦木/);
  assert.match(text, /焚灼/);
  assert.equal(text.includes("露蛛"), false);
  assert.equal(text.includes("药藤"), false);
  assert.equal(actions.some((action) => action.actionId === "wild-choice:qing-vine"), false);
  const state = getCultivatorState(world, CULTIVATOR_ID);
  assert.match(state.wilderness?.beat?.prompt ?? "", /不是雷泽残阵/);
});

test("a companion keeps a separate wilderness beat", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  const created = syncCultivatorFromPersona(world, { agentId: "agent-wild-mate", name: "青萝" });
  const mate = world.cultivators[created.selectedCultivatorId]!;
  mate.locationId = "qingzhou:wilderness";
  mate.injuryTicksRemaining = 0;
  mate.qi = mate.maxQi = 800;
  mate.spiritualPower = mate.maxSpiritualPower = 800;
  assert.equal(ids(world, mate.id).some((actionId) => actionId.startsWith("wild-choice:")), false);
  performAction(world, mate.id, "enter-wilderness:starter-wilderness-tier-1" as never);
  const mateOre = mate.inventory["spirit-ore"];
  const leaderOre = cultivator.inventory["spirit-ore"];
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-vine" as never);
  assert.equal(cultivator.inventory["spirit-ore"], leaderOre + 1);
  assert.equal(mate.inventory["spirit-ore"], mateOre);
  assert.equal(getCultivatorState(world, mate.id).wilderness?.beat?.step, 1);
  assert.ok(ids(world, mate.id).includes("wild-choice:qing-vine"));
});

test("survey between beats finishes in Chinese, and the next favor is recorded", () => {
  const { world, cultivator } = enter("qingzhou:wilderness");
  performAction(world, CULTIVATOR_ID, "wild-choice:qing-cut" as never);
  const started = performAction(world, CULTIVATOR_ID, "survey-wilderness" as never);
  assert.equal(started.accepted, true);
  assert.match(started.summary, /再探青岚坡|青岚坡/);
  const job = cultivator.activeJobId ? world.jobs[cultivator.activeJobId] : null;
  assert.ok(job);
  job.meta = { ...(job.meta ?? {}), wildernessEventId: "wilderness-lost-cache" };
  let summary = "";
  let guard = 0;
  while (cultivator.activeJobId && guard < 6) {
    const tick = advanceWorld(world, 1);
    const done = tick.completedJobs.find((entry) => entry.cultivatorId === CULTIVATOR_ID && entry.actionId === "survey-wilderness");
    if (done) summary = done.summary;
    guard += 1;
  }
  assert.match(summary, /青岚坡这一段走完了/);
  assert.equal(/[A-Za-z]/.test(summary), false, summary);
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness?.status, "active");

  const created = syncCultivatorFromPersona(world, { agentId: "agent-wild-favor", name: "青萝" });
  const mate = world.cultivators[created.selectedCultivatorId]!;
  mate.locationId = cultivator.locationId;
  let wait = 0;
  while (!getCultivatorState(world, CULTIVATOR_ID).wilderness?.beat && wait < 4) {
    advanceWorld(world, 1);
    wait += 1;
  }
  assert.equal(getCultivatorState(world, CULTIVATOR_ID).wilderness?.beat?.step, 2);
  const stones = cultivator.spiritStones;
  const helped = performAction(world, CULTIVATOR_ID, "wild-choice:qing-gather" as never);
  assert.match(helped.summary, /把洒了的露拢给我/);
  assert.equal(/[A-Za-z]/.test(helped.summary), false, helped.summary);
  assert.equal(cultivator.spiritStones, stones);
  const owed = getCultivatorState(world, CULTIVATOR_ID).owedFavors ?? [];
  assert.equal(owed.some((row) => row.direction === "you-owe" && row.reason === "把洒了的露拢给我"), true);
});
