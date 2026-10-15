import assert from "node:assert/strict";
import test from "node:test";
import { STATE_IDS } from "./constants.js";
import { createCultivator } from "./engine.js";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import { residencePriceForState } from "./residence.js";
import { getSocialLink } from "./social.js";
import {
  allHostLines,
  benefitsOf,
  discountedSpiritCost,
  fixtureOffers,
  fixtureSlotCount,
  HOST_AFFINITY_BASE,
  HOST_AFFINITY_CAP,
  meditateProgressBonus,
  QI_BONUS_CAP,
  HEAL_TICK_CAP,
  MEDITATE_PROGRESS_CAP,
  PRODUCE_DISCOUNT_CAP,
  residenceTierName,
  upgradePrice,
} from "./residence-grandeur.js";
import type { Residence } from "./model.js";

function bareResidence(patch: Partial<Residence> = {}): Residence {
  return {
    id: "residence-test",
    locationId: "qingzhou:main-city",
    level: 1,
    name: "青岚洞府",
    stateId: "qingzhou",
    description: "测试用的洞府。",
    grandeur: 1,
    origin: "starter",
    fixtures: [],
    ...patch,
  };
}

test("host lines stay inside one spoken breath", () => {
  const lines = allHostLines();
  assert.ok(lines.length >= 12);
  for (const line of lines) {
    assert.ok(line.length <= 40, line);
    assert.ok(line.length > 0);
    assert.equal(line.includes("欢迎"), false);
    assert.equal(line.includes("为您"), false);
  }
});

test("upgrade prices climb through 洞天 and then keep doubling", () => {
  const home = bareResidence();
  assert.equal(residenceTierName(home), "草庐");
  assert.equal(upgradePrice(home), 8_000);
  home.grandeur = 2;
  assert.equal(residenceTierName(home), "洞府");
  assert.equal(upgradePrice(home), 28_000);
  home.grandeur = 3;
  assert.equal(upgradePrice(home), 96_000);
  home.grandeur = 4;
  assert.equal(upgradePrice(home), 280_000);
  home.grandeur = 5;
  const firstExpansion = upgradePrice(home);
  home.grandeur = 6;
  assert.equal(upgradePrice(home), firstExpansion * 2);
  home.grandeur = 7;
  assert.equal(upgradePrice(home), firstExpansion * 4);
  assert.equal(residenceTierName(bareResidence({ grandeur: 6 })), "洞天·二重");
  assert.equal(residenceTierName(bareResidence({ origin: "bought" })), "石室");
});

test("high-risk states charge twice the safe upgrade price", () => {
  const safe = upgradePrice(bareResidence({ stateId: "qingzhou" }));
  const harsh = upgradePrice(bareResidence({ stateId: "liangzhou" }));
  assert.equal(harsh, safe * 2);
});

test("slots grow with the cave and then stop", () => {
  assert.equal(fixtureSlotCount(1), 2);
  assert.equal(fixtureSlotCount(5), 8);
  assert.equal(fixtureSlotCount(9), 12);
  assert.equal(fixtureSlotCount(40), 12);
});

test("furniture benefits diminish and stay inside the caps", () => {
  const stuffed = bareResidence({
    grandeur: 12,
    fixtures: [
      { id: "putuan", tier: 4 },
      { id: "juling", tier: 4 },
      { id: "danlu", tier: 4 },
      { id: "lianqi", tier: 4 },
      { id: "lingquan", tier: 4 },
      { id: "yaopu", tier: 4 },
      { id: "cangjing", tier: 4 },
      { id: "pingfeng", tier: 3 },
      { id: "lingshou", tier: 4 },
      { id: "guanjing", tier: 3 },
      { id: "hushan", tier: 4 },
      { id: "chaan", tier: 3 },
    ],
  });
  const benefits = benefitsOf(stuffed);
  assert.ok(benefits.produceDiscount <= PRODUCE_DISCOUNT_CAP);
  assert.ok(benefits.produceDiscount > 0);
  assert.equal(benefits.healBonus <= HEAL_TICK_CAP, true);
  assert.equal(benefits.qiBonus <= QI_BONUS_CAP, true);
  assert.equal(benefits.hostAffinity <= HOST_AFFINITY_CAP, true);
  assert.equal(meditateProgressBonus(stuffed, 4), 1);
  assert.ok(meditateProgressBonus(stuffed, 40) <= MEDITATE_PROGRESS_CAP);
  assert.equal(meditateProgressBonus(bareResidence(), 40), 0);
  const fullCost = 30;
  const paid = discountedSpiritCost(stuffed, fullCost);
  assert.ok(paid < fullCost);
  assert.ok(paid >= Math.floor(fullCost * (1 - PRODUCE_DISCOUNT_CAP)));
  assert.equal(discountedSpiritCost(bareResidence(), fullCost), fullCost);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "pingfeng", tier: 3 }] })).meditateFraction, 0);
});

test("a full slot list hides new families and still offers an upgrade of a placed one", () => {
  const home = bareResidence({
    fixtures: [
      { id: "putuan", tier: 1 },
      { id: "pingfeng", tier: 1 },
    ],
  });
  const offers = fixtureOffers(home);
  assert.equal(offers.some((offer) => offer.fixtureId === "danlu"), false);
  const cushion = offers.find((offer) => offer.fixtureId === "putuan");
  assert.equal(cushion?.nextTier, 2);
  assert.ok((cushion?.price ?? 0) > 2_400);
});

test("buy-residence still buys a 石室, and the starter cave is a 草庐", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "置业人" });
  const cultivator = world.cultivators[created.id]!;
  const starter = cultivator.locationId.split(":")[0]!;
  assert.equal(residenceTierName(cultivator.residence), "草庐");
  const other = STATE_IDS.find((id) => id !== starter)!;
  cultivator.locationId = `${other}:main-city`;
  cultivator.spiritStones = 20_000;
  const before = cultivator.spiritStones;
  const price = residencePriceForState(other);
  const bought = performAction(world, created.id, `buy-residence:${other}`);
  assert.equal(bought.accepted, true);
  const home = cultivator.residences.find((residence) => residence.stateId === other)!;
  assert.equal(residenceTierName(home), "石室");
  assert.equal(cultivator.spiritStones, before - price);
  const atNewHome = listAvailableActions(world, created.id).some((action) => action.actionId === "upgrade-residence");
  assert.equal(atNewHome, true);
});

test("upgrade spends the listed price, refuses a short purse, and is absent away from home", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "修府人" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.spiritStones = 100;
  assert.throws(
    () => performAction(world, created.id, "upgrade-residence"),
    /灵石不够/,
  );
  assert.equal(cultivator.spiritStones, 100);
  assert.equal(residenceTierName(cultivator.residence), "草庐");

  const price = upgradePrice(cultivator.residence);
  cultivator.spiritStones = price;
  const upgraded = performAction(world, created.id, "upgrade-residence");
  assert.match(upgraded.summary, /洞府/);
  assert.equal(cultivator.spiritStones, 0);
  assert.equal(residenceTierName(cultivator.residences[0]!), "洞府");
  assert.match(getCultivatorState(world, created.id).digest?.summary ?? "", /洞府|修成/);

  const away = `${cultivator.locationId.split(":")[0]}:sub-town-east`;
  cultivator.locationId = away;
  assert.equal(
    listAvailableActions(world, created.id).some((action) => action.actionId === "upgrade-residence"),
    false,
  );
  assert.throws(() => performAction(world, created.id, "upgrade-residence"), /先回去/);
});

test("furniture fills slots, replaces in place, and does not refund", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "置办人" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.spiritStones = 500_000;
  performAction(world, created.id, "place-fixture:putuan");
  performAction(world, created.id, "place-fixture:pingfeng");
  const afterTwo = cultivator.spiritStones;
  assert.throws(() => performAction(world, created.id, "place-fixture:danlu"), /位子/);
  assert.equal(cultivator.spiritStones, afterTwo);
  assert.equal(cultivator.residence.fixtures?.length, 2);

  performAction(world, created.id, "place-fixture:putuan");
  assert.equal(cultivator.residence.fixtures?.find((fixture) => fixture.id === "putuan")?.tier, 2);
  assert.equal(cultivator.residence.fixtures?.length, 2);

  const beforeClear = cultivator.spiritStones;
  performAction(world, created.id, "clear-fixture:pingfeng");
  assert.equal(cultivator.spiritStones, beforeClear);
  assert.equal(cultivator.residence.fixtures?.some((fixture) => fixture.id === "pingfeng"), false);
  performAction(world, created.id, "place-fixture:danlu");
  assert.equal(cultivator.residence.fixtures?.some((fixture) => fixture.id === "danlu"), true);
});

test("a furnished cave heals one tick faster and discounts crafting inside the cap", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "养伤人" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.residence.fixtures = [{ id: "lingquan", tier: 4 }, { id: "danlu", tier: 4 }, { id: "lianqi", tier: 4 }];
  cultivator.residences[0]!.fixtures = cultivator.residence.fixtures;
  cultivator.injuryTicksRemaining = 10;
  cultivator.inventory["beast-core"] = 1;
  cultivator.inventory["spirit-ore"] = 1;
  cultivator.spiritStones = 100;
  performAction(world, created.id, "residence-heal");
  while (cultivator.activeJobId) advanceWorld(world, 1);
  assert.equal(cultivator.injuryTicksRemaining, 5);

  const before = cultivator.spiritStones;
  performAction(world, created.id, "residence-produce:recipe-healing-pill");
  while (cultivator.activeJobId) advanceWorld(world, 1);
  const spent = before - cultivator.spiritStones;
  assert.ok(spent < 30);
  assert.ok(spent >= 27);
});

test("hosting is visible to the guest, then waits", () => {
  const world = createSeedWorld();
  const host = createCultivator(world, { name: "府主" });
  const guest = createCultivator(world, { name: "过客" });
  const hostCultivator = world.cultivators[host.id]!;
  const guestCultivator = world.cultivators[guest.id]!;
  guestCultivator.locationId = hostCultivator.locationId;
  hostCultivator.spiritStones = 200_000;
  performAction(world, host.id, "upgrade-residence");
  performAction(world, host.id, "upgrade-residence");
  assert.equal(residenceTierName(hostCultivator.residence), "灵府");
  const stones = hostCultivator.spiritStones;
  const hosted = performAction(world, host.id, `host-guest:${guest.id}`);
  assert.match(hosted.summary, /灵府/);
  assert.match(hosted.summary, /说：「/);
  assert.ok(hostCultivator.spiritStones < stones);
  const link = getSocialLink(world, host.id, guest.id);
  assert.ok(link);
  assert.ok(link.affinity >= HOST_AFFINITY_BASE);
  assert.ok(link.affinity <= HOST_AFFINITY_BASE + HOST_AFFINITY_CAP);
  const guestState = getCultivatorState(world, guest.id);
  assert.match(guestState.nearbyCultivators?.find((person) => person.cultivatorId === host.id)?.homeLine ?? "", /灵府/);
  assert.match(guestState.nearbyHomes?.find((home) => home.ownerId === host.id)?.glance ?? "", /灵府/);
  assert.match(guestState.digest?.summary ?? "", /灵府|府/);
  assert.throws(() => performAction(world, host.id, `host-guest:${guest.id}`), /再过/);
});

test("an injured cultivator can still rebuild the cave", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "带伤修府" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.injuryTicksRemaining = 4;
  cultivator.spiritStones = upgradePrice(cultivator.residence);
  const result = performAction(world, created.id, "upgrade-residence");
  assert.match(result.summary, /洞府/);
  assert.equal(cultivator.spiritStones, 0);
});
