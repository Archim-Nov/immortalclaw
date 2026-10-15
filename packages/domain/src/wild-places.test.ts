import assert from "node:assert/strict";
import test from "node:test";

import { mysteryForRank } from "./high-realm.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
} from "./index.js";
import { lightMysteryHint } from "./yi-mystery.js";
import { wildPlaceForState, wildPlaces } from "./wild-places.js";

const CULTIVATOR_ID = "yun-zhong-he";

test("each state wilderness has its own place, and 雷州 is not the dungeon 雷泽残阵", () => {
  const names = wildPlaces().map((place) => place.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(wildPlaceForState("qingzhou")?.name, "青岚坡");
  assert.match(wildPlaceForState("qingzhou")?.advice ?? "", /缠绕/);
  assert.match(wildPlaceForState("qingzhou")?.advice ?? "", /露蛛/);
  assert.match(wildPlaceForState("qingzhou")?.advice ?? "", /药藤/);
  assert.equal(wildPlaceForState("leizhou")?.name, "焦林野");
  assert.match(wildPlaceForState("leizhou")?.advice ?? "", /焚灼/);
  assert.match(wildPlaceForState("leizhou")?.advice ?? "", /雷雀/);
  assert.equal((wildPlaceForState("leizhou")?.line ?? "").includes("雷泽残阵"), true);
  assert.equal((wildPlaceForState("leizhou")?.name ?? "").includes("雷泽残阵"), false);
  assert.equal(wildPlaceForState("qingzhou")?.line.includes("焦林野"), false);
});

test("the road to a wilderness names that place before the cultivator leaves", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;

  const qing = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "travel-to:qingzhou:wilderness");
  assert.ok(qing);
  assert.match(qing?.label ?? "", /青岚坡/);
  assert.match(qing?.description ?? "", /缠绕/);
  assert.match(qing?.description ?? "", /露蛛/);

  cultivator.locationId = "leizhou:main-city";
  const lei = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "travel-to:leizhou:wilderness");
  assert.ok(lei);
  assert.match(lei?.description ?? "", /焦林野/);
  assert.equal((lei?.description ?? "").includes("青岚坡"), false);
  assert.equal((lei?.description ?? "").includes("雷泽残阵"), true);
});

test("a wilderness trip leaves a 见闻 on the road and again inside the place", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 400;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 400;

  performAction(world, CULTIVATOR_ID, "travel-to:qingzhou:wilderness" as never);
  const underway = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(underway.wildRoute?.placeName, "青岚坡");
  assert.match(underway.wildRoute?.mysteryLine ?? "", /露蛛/);
  assert.equal(cultivator.locationId, "qingzhou:main-city");

  let guard = 0;
  while (cultivator.activeJobId && guard < 8) {
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.equal(cultivator.locationId, "qingzhou:wilderness");
  const arrived = getCultivatorState(world, CULTIVATOR_ID);
  const roadNotes = arrived.travelogue.notes.map((note) => `${note.title} ${note.detail}`).join("\n");
  assert.match(roadNotes, /青岚坡/);
  assert.match(roadNotes, /见闻/);
  assert.match(`${arrived.digest?.growth.join("\n") ?? ""}`, /青岚坡/);

  const stones = cultivator.spiritStones;
  performAction(world, CULTIVATOR_ID, "enter-wilderness:starter-wilderness-tier-1" as never);
  advanceWorld(world, 4);
  const inside = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(inside.wilderness?.placeName, "青岚坡");
  assert.match(inside.wilderness?.mysteryLine ?? "", /药藤/);
  const layerNotes = inside.travelogue.notes.map((note) => note.detail).join("\n");
  assert.match(layerNotes, /青岚坡这一段的见闻/);

  performAction(world, CULTIVATOR_ID, "withdraw-from-wilderness" as never);
  const left = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(left.wilderness, null);
  assert.match(left.travelogue.notes.map((note) => note.detail).join("\n"), /从青岚坡退出来/);
  assert.equal(cultivator.spiritStones, stones);
});

test("a wilderness hunt names the place's beast, status, and follower", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:wilderness";
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;

  const hunt = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "hunt-mine-beast");
  assert.match(hunt?.description ?? "", /露蛛/);
  assert.match(hunt?.description ?? "", /缠绕/);
  assert.match(hunt?.description ?? "", /药藤/);

  performAction(world, CULTIVATOR_ID, "hunt-mine-beast" as never);
  let guard = 0;
  while (cultivator.activeJobId && guard < 8) {
    advanceWorld(world, 1);
    guard += 1;
  }
  const state = getCultivatorState(world, CULTIVATOR_ID);
  const combat = state.recentCombats[0];
  assert.equal(combat?.enemyName, "露蛛");
  assert.match(combat?.summary ?? "", /缠绕/);
  assert.match(combat?.summary ?? "", /药藤/);
  assert.match(state.travelogue.notes.map((note) => note.detail).join("\n"), /青岚坡/);
});

test("八荒 names 荒尘驿, then 断碑原, then 无灯壑", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.realm = "金丹";
  cultivator.realmLevel = 5;
  cultivator.totalContribution = 220;
  cultivator.injuryTicksRemaining = 0;
  cultivator.qi = cultivator.maxQi = 5000;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 5000;
  cultivator.inventory["eight-wastes-pass"] = 1;
  world.guixuProgress.wildernessAttunement[cultivator.id] = 80;
  world.tick = 10;

  const entry = listAvailableActions(world, CULTIVATOR_ID).find((action) => action.actionId === "enter-bahuang:balanced");
  assert.match(entry?.description ?? "", /荒尘驿/);
  assert.match(entry?.description ?? "", /断碑原/);
  assert.match(entry?.description ?? "", /无灯壑/);

  performAction(world, CULTIVATOR_ID, "enter-bahuang:balanced" as never);
  const started = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(started.bahuang?.placeName, "荒尘驿");
  assert.equal(started.wildRoute?.placeName, "荒尘驿");
  assert.match(started.bahuang?.mysteryLine ?? "", /断法/);
  assert.match(started.bahuang?.advice ?? "", /沙客/);

  const progress = world.bahuangProgress[CULTIVATOR_ID]!;
  progress.depth = 5;
  const mid = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(mid.bahuang?.placeName, "断碑原");
  assert.match(mid.bahuang?.mysteryLine ?? "", /定根/);
  assert.equal(mid.wildRoute?.followerLabel, "碑仆");

  progress.depth = 8;
  const deep = getCultivatorState(world, CULTIVATOR_ID);
  assert.equal(deep.bahuang?.placeName, "无灯壑");
  assert.match(deep.bahuang?.advice ?? "", /幻惑/);
  assert.equal(deep.wildRoute?.enemyLabel, "灯烬");

  progress.depth = 5;
  performAction(world, CULTIVATOR_ID, "retreat-from-bahuang" as never);
  const left = getCultivatorState(world, CULTIVATOR_ID);
  assert.match(left.travelogue.notes.map((note) => note.detail).join("\n"), /断碑原/);
  assert.match(left.travelogue.notes.map((note) => note.detail).join("\n"), /撤出来/);
});

test("dungeon place names from the earlier floors stay put", () => {
  assert.equal(lightMysteryHint("乙", 1)?.name, "雷泽残阵");
  assert.equal(lightMysteryHint("乙", 5)?.name, "沉雾沼");
  assert.equal(lightMysteryHint("乙", 9)?.name, "铜棺窟");
  assert.equal(mysteryForRank("甲", 1)?.name, "丹霞内府");
  assert.equal(mysteryForRank("甲", 4)?.name, "婴火莲池");
  assert.equal(mysteryForRank("甲", 7)?.name, "神纹天隙");
});
