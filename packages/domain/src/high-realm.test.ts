import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, getCultivatorState, listAvailableActions, performAction, advanceWorld } from "./index.js";
import type { Cultivator, ItemId, SpellLoadoutId, WeaponLoadoutId } from "./model.js";
import { mysteryEntry } from "./high-realm.js";

function finish(world: ReturnType<typeof createSeedWorld>, id: string) {
  for (let step = 0; step < 12 && world.cultivators[id]?.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
}

function place(world: ReturnType<typeof createSeedWorld>, realm: Cultivator["realm"], level: number) {
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = realm;
  cultivator.realmLevel = level;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 9 },
  };
  return cultivator;
}

test("炼气仍走原来的材料，看不到高境界秘境", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.cultivator.realm, "炼气");
  assert.equal(state.breakthrough?.specialRequirement.itemId, "meridian-lotus-essence");
  assert.equal(state.realmPath.method, "residence");
  const text = `${state.realmPath.goals.join("")}${state.realmPath.resources?.join("") ?? ""}`;
  assert.equal(text.includes("丹霞露"), false);
  assert.equal(text.includes("婴火莲池"), false);
  assert.equal(text.includes("神纹天隙"), false);
  assert.equal(state.digest?.nextStep, undefined);
  assert.equal(mysteryEntry("丙", 9, 3).ok, true);
  assert.equal(mysteryEntry("甲", 4, 3).ok, false);
});

test("甲级秘境按境界开门，掉落跟这一层走", () => {
  const early = createSeedWorld();
  const core = place(early, "金丹", 7);
  assert.throws(() => performAction(early, core.id, "search-fortune:rank-4"), /婴火莲池/);
  const earlyRanks = getCultivatorState(early, core.id).dungeon?.availableRanks ?? [];
  assert.deepEqual(earlyRanks, [1, 2, 3]);
  performAction(early, core.id, "search-fortune:rank-1");
  finish(early, core.id);
  assert.ok((core.inventory["core-nourish-dew"] ?? 0) >= 1);
  assert.equal(core.inventory["nascent-nourish-sand"] ?? 0, 0);
  assert.equal(core.inventory["spirit-nourish-dust"] ?? 0, 0);

  const lateCore = createSeedWorld();
  const nascentGate = place(lateCore, "金丹", 9);
  performAction(lateCore, nascentGate.id, "search-fortune:rank-4");
  finish(lateCore, nascentGate.id);
  assert.ok((nascentGate.inventory["nascent-nourish-sand"] ?? 0) >= 1);
  assert.equal(nascentGate.inventory["spirit-nourish-dust"] ?? 0, 0);
  assert.throws(() => performAction(lateCore, nascentGate.id, "enter-dungeon:rank-7:balanced"), /神纹天隙/);
  const midHint = getCultivatorState(lateCore, nascentGate.id).dungeon?.rankYieldHints.find((hint) => hint.rank === 4);
  assert.equal(midHint?.mysteryName, "婴火莲池");
  assert.match(midHint?.mysteryLine ?? "", /养魂砂/);

  const spirit = createSeedWorld();
  const late = place(spirit, "元婴", 12);
  performAction(spirit, late.id, "search-fortune:rank-7");
  finish(spirit, late.id);
  assert.ok((late.inventory["spirit-nourish-dust"] ?? 0) >= 1);
  const highHint = getCultivatorState(spirit, late.id).dungeon?.rankYieldHints.find((hint) => hint.rank === 7);
  assert.equal(highHint?.mysteryName, "神纹天隙");
});

test("金丹闭关用掉丹霞露，修为比不用时多十二点", () => {
  const sit = (withDew: boolean) => {
    const world = createSeedWorld();
    const cultivator = world.cultivators["yun-zhong-he"]!;
    cultivator.realm = "金丹";
    cultivator.realmLevel = 7;
    cultivator.realmProgress = 10;
    cultivator.locationId = cultivator.residence.locationId;
    if (withDew) cultivator.inventory["core-nourish-dew"] = 1;
    performAction(world, cultivator.id, "residence-meditate");
    finish(world, cultivator.id);
    return { world, cultivator };
  };
  const plain = sit(false);
  const fed = sit(true);
  assert.equal(fed.cultivator.realmProgress - plain.cultivator.realmProgress, 12);
  assert.equal(fed.cultivator.inventory["core-nourish-dew"], 0);
  assert.match(fed.world.daoLogs.map((entry) => entry.content).join(""), /丹霞露/);
});

test("大圆满兵器不在坊市，五条途径和宗门差事都写得出来", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "元婴";
  cultivator.realmLevel = 10;
  cultivator.unlockedWeaponLoadoutIds = [
    ...cultivator.unlockedWeaponLoadoutIds,
    "sword-tier-2" as WeaponLoadoutId,
    "sword-tier-3" as WeaponLoadoutId,
  ];
  cultivator.unlockedSpellLoadoutIds = [
    ...cultivator.unlockedSpellLoadoutIds,
    "metal-edge-tier-2" as SpellLoadoutId,
    "metal-edge-tier-3" as SpellLoadoutId,
  ];
  const state = getCultivatorState(world, cultivator.id);
  const weapon = state.combatProfile.nextWeapon;
  assert.equal(weapon?.name, "游龙剑");
  assert.equal(weapon?.soldAtShop, false);
  assert.equal(weapon?.reachable, true);
  const kinds = (weapon?.paths ?? []).map((path) => path.kind);
  assert.deepEqual(kinds, ["秘境", "配方", "宗门", "任务", "破境"]);
  assert.match(weapon?.paths?.map((path) => path.line).join("") ?? "", /婴火莲池/);
  assert.match(weapon?.seek ?? "", /坊市不卖/);
  assert.match(state.realmPath.resources?.join("") ?? "", /养魂砂/);
  const actions = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.equal(actions.includes("buy-next-weapon"), false);
  assert.throws(() => performAction(world, cultivator.id, "buy-next-weapon"), /坊市不卖/);

  const hall = Object.values(world.neutralSects).find((sect) => sect.stateId === "qingzhou");
  assert.ok(hall);
  cultivator.neutralSectId = hall.id;
  cultivator.neutralContribution = 140;
  cultivator.locationId = hall.headquarters;
  const atHall = listAvailableActions(world, cultivator.id).map((action) => action.actionId);
  assert.ok(atHall.includes("exchange-sect-weapon"));
  assert.ok(atHall.includes("band-errand:weapon"));
  performAction(world, cultivator.id, "band-errand:weapon");
  finish(world, cultivator.id);
  assert.equal(cultivator.inventory["weapon-material-sword-tier-4" as ItemId], 1);
  assert.throws(() => performAction(world, cultivator.id, "band-errand:weapon"), /六个时辰/);
});
