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
  CAVE_REPUTATION_CAP,
  FIXTURE_FAMILIES,
  fixtureFamily,
  fixturePrice,
  HOST_AFFINITY_BASE,
  HOST_AFFINITY_CAP,
  meditateProgressBonus,
  QI_BONUS_CAP,
  HEAL_TICK_CAP,
  MEDITATE_PROGRESS_CAP,
  PRODUCE_DISCOUNT_CAP,
  reputationEntitled,
  RESIDENCE_BENEFIT_LINE,
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

test("upgrade prices climb through 洞天 and then keep tripling", () => {
  const home = bareResidence();
  assert.equal(residenceTierName(home), "草庐");
  assert.equal(upgradePrice(home), 8_000);
  home.grandeur = 2;
  assert.equal(residenceTierName(home), "洞府");
  assert.equal(upgradePrice(home), 36_000);
  home.grandeur = 3;
  assert.equal(upgradePrice(home), 160_000);
  home.grandeur = 4;
  assert.equal(upgradePrice(home), 720_000);
  home.grandeur = 5;
  const firstExpansion = upgradePrice(home);
  assert.equal(firstExpansion, 2_160_000);
  home.grandeur = 6;
  assert.equal(upgradePrice(home), firstExpansion * 3);
  home.grandeur = 7;
  assert.equal(upgradePrice(home), firstExpansion * 9);
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
      { id: "putuan", tier: 5 },
      { id: "juling", tier: 5 },
      { id: "danlu", tier: 5 },
      { id: "lianqi", tier: 5 },
      { id: "lingquan", tier: 5 },
      { id: "yaopu", tier: 5 },
      { id: "cangjing", tier: 5 },
      { id: "pingfeng", tier: 3 },
      { id: "lingshou", tier: 5 },
      { id: "guanjing", tier: 3 },
      { id: "hushan", tier: 5 },
      { id: "chaan", tier: 4 },
    ],
  });
  const benefits = benefitsOf(stuffed);
  assert.equal(benefits.produceDiscount, PRODUCE_DISCOUNT_CAP);
  assert.equal(benefits.healBonus, HEAL_TICK_CAP);
  assert.equal(benefits.qiBonus, QI_BONUS_CAP);
  assert.equal(benefits.hostAffinity, HOST_AFFINITY_CAP);
  assert.equal(meditateProgressBonus(stuffed, 4), 2);
  assert.equal(meditateProgressBonus(stuffed, 10), 4);
  assert.equal(meditateProgressBonus(stuffed, 12), 5);
  assert.equal(meditateProgressBonus(stuffed, 14), MEDITATE_PROGRESS_CAP);
  assert.equal(meditateProgressBonus(stuffed, 40), MEDITATE_PROGRESS_CAP);
  assert.equal(meditateProgressBonus(bareResidence(), 40), 0);
  const fullCost = 30;
  const paid = discountedSpiritCost(stuffed, fullCost);
  assert.equal(paid, Math.floor(fullCost * (1 - PRODUCE_DISCOUNT_CAP)));
  assert.equal(discountedSpiritCost(bareResidence(), fullCost), fullCost);
  const cosmetic = benefitsOf(bareResidence({
    fixtures: [{ id: "pingfeng", tier: 3 }, { id: "guanjing", tier: 3 }],
  }));
  assert.equal(cosmetic.meditateFraction, 0);
  assert.equal(cosmetic.qiBonus, 0);
  assert.equal(cosmetic.healBonus, 0);
  assert.equal(cosmetic.produceDiscount, 0);
  assert.equal(cosmetic.hostAffinity, 0);
  assert.match(RESIDENCE_BENEFIT_LINE, /六分进境/);
  assert.match(RESIDENCE_BENEFIT_LINE, /三刻/);
  assert.match(RESIDENCE_BENEFIT_LINE, /十二点气血/);
  assert.match(RESIDENCE_BENEFIT_LINE, /不到三成灵石/);
  assert.match(RESIDENCE_BENEFIT_LINE, /六点好感/);
  assert.match(RESIDENCE_BENEFIT_LINE, /二十四点/);
  assert.match(RESIDENCE_BENEFIT_LINE, /屏风和观景台只给人看/);
  assert.equal(reputationEntitled(stuffed), CAVE_REPUTATION_CAP);
  assert.equal(reputationEntitled(bareResidence()), 0);
});

test("cheap furniture stays under the ceiling and a second piece counts half", () => {
  const cheapCushion = bareResidence({ fixtures: [{ id: "putuan", tier: 1 }] });
  assert.equal(meditateProgressBonus(cheapCushion, 14), 1);
  assert.ok(meditateProgressBonus(cheapCushion, 40) < MEDITATE_PROGRESS_CAP);
  const immortalCushion = bareResidence({ fixtures: [{ id: "putuan", tier: 4 }] });
  const cushionAlone = meditateProgressBonus(immortalCushion, 12);
  assert.ok(cushionAlone > 2);
  assert.ok(cushionAlone < MEDITATE_PROGRESS_CAP);

  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 1 }] })).qiBonus, 2);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 2 }] })).qiBonus, 4);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 3 }] })).qiBonus, 6);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 4 }] })).qiBonus, 8);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 5 }] })).qiBonus, 11);
  assert.ok(benefitsOf(bareResidence({ fixtures: [{ id: "juling", tier: 5 }] })).qiBonus < QI_BONUS_CAP);

  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "lingquan", tier: 1 }] })).healBonus, 1);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "lingquan", tier: 3 }] })).healBonus, 1);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "lingquan", tier: 4 }] })).healBonus, 2);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "lingquan", tier: 5 }] })).healBonus, 2);
  const springAndWard = benefitsOf(bareResidence({
    fixtures: [{ id: "lingquan", tier: 3 }, { id: "hushan", tier: 2 }],
  }));
  assert.equal(springAndWard.healBonus, 2);
  assert.ok(springAndWard.healBonus < HEAL_TICK_CAP);
  assert.equal(benefitsOf(bareResidence({
    fixtures: [{ id: "lingquan", tier: 5 }, { id: "hushan", tier: 5 }],
  })).healBonus, HEAL_TICK_CAP);

  const oneFurnace = benefitsOf(bareResidence({ fixtures: [{ id: "danlu", tier: 2 }] })).produceDiscount;
  const furnaceAndBench = benefitsOf(bareResidence({
    fixtures: [{ id: "danlu", tier: 2 }, { id: "lianqi", tier: 2 }],
  })).produceDiscount;
  assert.ok(furnaceAndBench > oneFurnace);
  assert.ok(furnaceAndBench < oneFurnace + 0.05);
  assert.ok(benefitsOf(bareResidence({ fixtures: [{ id: "danlu", tier: 4 }] })).produceDiscount < PRODUCE_DISCOUNT_CAP);

  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "chaan", tier: 1 }] })).hostAffinity, 1);
  assert.equal(benefitsOf(bareResidence({ fixtures: [{ id: "chaan", tier: 3 }] })).hostAffinity, 3);
  const teaAndLibrary = benefitsOf(bareResidence({
    fixtures: [{ id: "chaan", tier: 2 }, { id: "lingshou", tier: 4 }],
  })).hostAffinity;
  assert.equal(teaAndLibrary, 3);
  assert.ok(teaAndLibrary < 2 + 2);
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

test("a mid-tier spring heals two ticks faster and a mid-tier furnace stays under the craft cap", () => {
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
  assert.equal(cultivator.injuryTicksRemaining, 4);

  const before = cultivator.spiritStones;
  performAction(world, created.id, "residence-produce:recipe-healing-pill");
  while (cultivator.activeJobId) advanceWorld(world, 1);
  const spent = before - cultivator.spiritStones;
  assert.equal(spent, 23);
  assert.ok(spent > Math.floor(30 * (1 - PRODUCE_DISCOUNT_CAP)));
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

test("a full catalog costs more than a purse can fill, and the last tier pays more without clearing the cap", () => {
  let sum = 0;
  for (let grandeur = 1; grandeur < 9; grandeur += 1) {
    sum += upgradePrice(bareResidence({ grandeur, stateId: "qingzhou" }));
  }
  for (const family of FIXTURE_FAMILIES) {
    for (let tier = 1; tier <= family.maxTier; tier += 1) {
      sum += fixturePrice("qingzhou", family, tier);
    }
  }
  assert.ok(sum > 20_000_000, `catalog fill cost was ${sum}`);

  const array = fixtureFamily("juling");
  assert.ok(array);
  const top = fixturePrice("qingzhou", array, 5);
  const mid = fixturePrice("qingzhou", array, 3);
  assert.ok(top > mid * 10);

  const cheap = meditateProgressBonus(bareResidence({ fixtures: [{ id: "putuan", tier: 1 }] }), 12);
  const expensive = meditateProgressBonus(bareResidence({ fixtures: [{ id: "putuan", tier: 5 }] }), 12);
  assert.ok(expensive > cheap);
  assert.ok(expensive < MEDITATE_PROGRESS_CAP);

  const heaven = benefitsOf(bareResidence({ grandeur: 5 }));
  assert.ok(heaven.qiBonus > 0);
  assert.ok(heaven.qiBonus < QI_BONUS_CAP);
  assert.ok(heaven.healBonus > 0);
  assert.ok(heaven.healBonus < HEAL_TICK_CAP);
  assert.ok(meditateProgressBonus(bareResidence({ grandeur: 40 }), 40) < MEDITATE_PROGRESS_CAP);

  const offer = fixtureOffers(bareResidence({
    grandeur: 5,
    fixtures: [{ id: "putuan", tier: 4 }],
  })).find((row) => row.fixtureId === "putuan");
  assert.equal(offer?.tierName, "绝品");
  assert.ok((offer?.price ?? 0) >= 1_600_000);
  assert.match(offer?.line ?? "", /最贵/);
  assert.equal((offer?.line ?? "").includes("putuan"), false);
  assert.equal((offer?.line ?? "").includes("place-fixture"), false);
  const oneFurnace = benefitsOf(bareResidence({ fixtures: [{ id: "danlu", tier: 5 }] })).produceDiscount;
  assert.ok(oneFurnace < PRODUCE_DISCOUNT_CAP);
  assert.equal(benefitsOf(bareResidence({
    fixtures: [{ id: "danlu", tier: 5 }, { id: "lianqi", tier: 5 }],
  })).produceDiscount, PRODUCE_DISCOUNT_CAP);
});

test("rebuilding raises local reputation once and clearing the piece does not pay it again", () => {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "声望府" });
  const cultivator = world.cultivators[created.id]!;
  const stateId = cultivator.residence.stateId as keyof typeof cultivator.stateReputation;
  const before = cultivator.stateReputation[stateId] ?? 0;
  cultivator.spiritStones = 5_000_000;
  const first = performAction(world, created.id, "upgrade-residence");
  assert.match(first.summary, /声望涨了/);
  assert.equal(first.summary.includes("upgrade-residence"), false);
  const afterFirst = cultivator.stateReputation[stateId] ?? 0;
  assert.equal(afterFirst, before + 1);
  performAction(world, created.id, "upgrade-residence");
  const afterSecond = cultivator.stateReputation[stateId] ?? 0;
  assert.ok(afterSecond > afterFirst);
  assert.ok(afterSecond - before <= CAVE_REPUTATION_CAP);

  performAction(world, created.id, "place-fixture:putuan");
  const afterPiece = cultivator.stateReputation[stateId] ?? 0;
  performAction(world, created.id, "clear-fixture:putuan");
  performAction(world, created.id, "place-fixture:putuan");
  assert.equal(cultivator.stateReputation[stateId], afterPiece);
  const cards = listAvailableActions(world, created.id);
  for (const card of cards) {
    if (!String(card.actionId).startsWith("place-fixture") && card.actionId !== "upgrade-residence" && !String(card.actionId).startsWith("clear-fixture")) continue;
    assert.equal(card.description.includes("place-fixture"), false);
    assert.equal(card.description.includes("upgrade-residence"), false);
    assert.equal(card.description.includes("glance"), false);
    assert.equal(card.description.includes("homeLine"), false);
  }
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
