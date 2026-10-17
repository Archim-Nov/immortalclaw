import assert from "node:assert/strict";
import test from "node:test";
import { createCultivator } from "./engine.js";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction } from "./index.js";
import type { Cultivator, ItemId } from "./model.js";

function finish(world: ReturnType<typeof createSeedWorld>, id: string) {
  for (let step = 0; step < 16 && world.cultivators[id]?.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
}

function give(cultivator: Cultivator, ids: readonly ItemId[]) {
  for (const id of ids) cultivator.inventory[id] = (cultivator.inventory[id] ?? 0) + 1;
}

function outpostId(world: ReturnType<typeof createSeedWorld>): string {
  const found = Object.values(world.locations).find((location) => location.nodeType === "sect-outpost");
  if (!found) throw new Error("seed world has no sect outpost");
  return found.id;
}

function prepare(level: number, realm: Cultivator["realm"], items: readonly ItemId[]) {
  const world = createSeedWorld();
  const created = createCultivator(world, { name: "破境的人" });
  const cultivator = world.cultivators[created.id]!;
  cultivator.realm = realm;
  cultivator.realmLevel = level;
  cultivator.realmProgress = 100;
  cultivator.spiritStones = 2000;
  give(cultivator, items);
  return { world, cultivator };
}

const NARRATIVE_ACTION_IDS = [
  "residence-breakthrough",
  "core-rite:steady",
  "core-rite:press",
  "infant-fire-temper",
  "refine-nascent",
  "begin-soul-vigil",
  "seal-soul-vigil",
  "face-tribulation",
  "begin-divine-step",
  "seal-divine-step",
  "hold-divine-platform",
] as const;

function assertNarrativeHasNoActionIds(text: string) {
  for (const id of NARRATIVE_ACTION_IDS) {
    assert.equal(text.includes(id), false, id);
  }
}

const CORE_ITEMS = ["golden-spirit-flower", "purple-celestial-leaf", "star-fall-sand", "flowing-aurora-core"] as const;
const NASCENT_GATE = ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "nine-turn-golden-marrow"] as const;
const VIGIL_ITEMS = ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "nurture-nascent-dew"] as const;
const ANCHOR_ITEMS = ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "anchor-nascent-sand"] as const;
const SEAL_ITEMS = ["divine-thought-crystal", "heaven-soul-silk", "divine-pattern-stone", "divine-transformation-seal"] as const;
const SPIRIT_GATE = ["divine-thought-crystal", "heaven-soul-silk", "divine-pattern-stone", "shatter-nascent-lotus"] as const;
const DIVINE_ITEMS = ["divine-thought-crystal", "heaven-soul-silk", "divine-pattern-stone", "divine-embryo-dew"] as const;

test("炼气仍在洞府破境，金丹以后的做法各不相同", () => {
  const early = prepare(1, "炼气", ["cloud-heart-grass", "moon-dew-flower", "clear-zhi-leaf", "condensed-qi-dew"]);
  const earlyState = getCultivatorState(early.world, early.cultivator.id);
  assert.equal(earlyState.realmPath.method, "residence");
  assert.equal(earlyState.breakthrough?.method, "residence");
  assert.equal(earlyState.breakthrough?.recommendedAction, "residence-breakthrough");
  assert.match(earlyState.realmPath.sequence?.join("") ?? "", /材料齐了，回自己的洞府破境。/);
  assert.match(earlyState.realmPath.goals.join(""), /材料齐了，回自己的洞府破境。/);
  assert.equal(earlyState.breakthrough?.sequence?.join(""), earlyState.realmPath.sequence?.join(""));
  assertNarrativeHasNoActionIds(`${earlyState.realmPath.sequence?.join("") ?? ""}${earlyState.realmPath.goals.join("")}${earlyState.realmPath.risk}`);
  assert.equal((earlyState.realmPath.sequence ?? []).join("").includes("结丹仪"), false);
  assert.ok(listAvailableActions(early.world, early.cultivator.id).some((action) => action.actionId === "residence-breakthrough"));
  performAction(early.world, early.cultivator.id, "residence-breakthrough");
  finish(early.world, early.cultivator.id);
  assert.equal(early.cultivator.realmLevel, 2);

  const core = prepare(7, "金丹", CORE_ITEMS);
  const coreState = getCultivatorState(core.world, core.cultivator.id);
  assert.equal(coreState.realmPath.method, "core-rite");
  assert.equal(coreState.realmPath.methodName, "结丹仪");
  assert.match(coreState.realmPath.sequence?.join("") ?? "", /结丹仪/);
  assert.match(coreState.realmPath.sequence?.join("") ?? "", /催丹/);
  assert.match(coreState.realmPath.risk, /稳妥结丹仪/);
  assertNarrativeHasNoActionIds(`${coreState.realmPath.sequence?.join("") ?? ""}${coreState.realmPath.goals.join("")}${coreState.realmPath.risk}`);
  assert.match(coreState.breakthrough?.help ?? "", /护法/);
  assert.equal(listAvailableActions(core.world, core.cultivator.id).some((action) => action.actionId === "residence-breakthrough"), false);
  assert.notEqual(coreState.breakthrough?.recommendedAction, "residence-breakthrough");

  const fire = prepare(9, "金丹", NASCENT_GATE);
  const fireState = getCultivatorState(fire.world, fire.cultivator.id);
  assert.equal(fireState.realmPath.method, "infant-fire");
  assert.match(fireState.realmPath.sequence?.join("") ?? "", /婴火淬体/);
  assert.match(fireState.realmPath.sequence?.join("") ?? "", /甲级/);
  assert.match(fireState.digest?.nextStep ?? "", /婴火淬体/);
  assertNarrativeHasNoActionIds(`${fireState.realmPath.sequence?.join("") ?? ""}${fireState.realmPath.goals.join("")}${fireState.digest?.nextStep ?? ""}`);

  const refine = prepare(10, "元婴", VIGIL_ITEMS);
  const refineState = getCultivatorState(refine.world, refine.cultivator.id);
  assert.equal(refineState.realmPath.method, "nascent-refine");
  assert.equal(refineState.realmPath.methodName, "炼婴");
  assert.match(refineState.realmPath.sequence?.join("") ?? "", /炼婴|炼稳/);
  assert.match(refineState.digest?.nextStep ?? "", /炼婴/);
  assert.equal((refineState.digest?.nextStep ?? "").includes("点上魂灯"), false);
  assertNarrativeHasNoActionIds(`${refineState.realmPath.sequence?.join("") ?? ""}${refineState.realmPath.goals.join("")}${refineState.digest?.nextStep ?? ""}`);

  const vigil = prepare(11, "元婴", ANCHOR_ITEMS);
  const vigilState = getCultivatorState(vigil.world, vigil.cultivator.id);
  assert.equal(vigilState.realmPath.method, "soul-vigil");
  assert.match(vigilState.realmPath.sequence?.join("") ?? "", /魂灯/);
  assert.match(vigilState.realmPath.sequence?.join("") ?? "", /收口/);
  assert.match(vigilState.digest?.nextStep ?? "", /魂灯/);
  assertNarrativeHasNoActionIds(`${vigilState.realmPath.sequence?.join("") ?? ""}${vigilState.digest?.nextStep ?? ""}`);

  const bolt = prepare(12, "元婴", SPIRIT_GATE);
  assert.equal(getCultivatorState(bolt.world, bolt.cultivator.id).realmPath.method, "tribulation");
  assert.equal(getCultivatorState(bolt.world, bolt.cultivator.id).realmPath.methodName, "渡劫");
  assert.match(getCultivatorState(bolt.world, bolt.cultivator.id).realmPath.sequence?.join("") ?? "", /迎天劫/);
  assert.match(getCultivatorState(bolt.world, bolt.cultivator.id).realmPath.sequence?.join("") ?? "", /渡/);
  assert.match(getCultivatorState(bolt.world, bolt.cultivator.id).digest?.nextStep ?? "", /天劫/);
  assertNarrativeHasNoActionIds(`${getCultivatorState(bolt.world, bolt.cultivator.id).realmPath.sequence?.join("") ?? ""}${getCultivatorState(bolt.world, bolt.cultivator.id).digest?.nextStep ?? ""}`);

  const pattern = prepare(13, "化神", DIVINE_ITEMS);
  const patternState = getCultivatorState(pattern.world, pattern.cultivator.id);
  assert.equal(patternState.realmPath.method, "divine-pattern");
  assert.match(patternState.realmPath.sequence?.join("") ?? "", /神纹铺开/);
  assert.match(patternState.realmPath.sequence?.join("") ?? "", /落印/);
  assert.match(patternState.digest?.nextStep ?? "", /神纹/);
  assert.equal((patternState.digest?.nextStep ?? "").includes("下一阶是化神"), false);
  assert.equal((patternState.digest?.nextStep ?? "").includes("迎天劫"), false);
  assertNarrativeHasNoActionIds(`${patternState.realmPath.sequence?.join("") ?? ""}${patternState.digest?.nextStep ?? ""}`);

  const platform = prepare(14, "化神", SEAL_ITEMS);
  const platformState = getCultivatorState(platform.world, platform.cultivator.id);
  assert.equal(platformState.realmPath.method, "divine-vigil");
  assert.equal(platformState.realmPath.methodName, "守神台");
  assert.match(platformState.realmPath.sequence?.join("") ?? "", /神台/);
  assert.match(platformState.digest?.nextStep ?? "", /守神台/);
  assert.equal((platformState.digest?.nextStep ?? "").includes("迎天劫"), false);
  assertNarrativeHasNoActionIds(`${platformState.realmPath.sequence?.join("") ?? ""}${platformState.realmPath.goals.join("")}${platformState.digest?.nextStep ?? ""}`);
});

test("金丹在宗门驻地走稳妥结丹仪，催丹要有人看着", () => {
  const steady = prepare(7, "金丹", CORE_ITEMS);
  steady.world.cultivators["yun-zhong-he"]!.locationId = "qingzhou:wilderness";
  assert.throws(
    () => performAction(steady.world, steady.cultivator.id, "residence-breakthrough"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /结丹仪/);
      assert.equal(error.message.includes("core-rite"), false);
      assert.equal(error.message.includes("residence-breakthrough"), false);
      return true;
    },
  );
  assert.throws(
    () => performAction(steady.world, steady.cultivator.id, "core-rite:steady"),
    /宗门驻地/,
  );
  assert.throws(
    () => performAction(steady.world, steady.cultivator.id, "core-rite:press"),
    /看着/,
  );

  steady.cultivator.locationId = outpostId(steady.world);
  const listed = listAvailableActions(steady.world, steady.cultivator.id);
  const steadyAction = listed.find((action) => action.actionId === "core-rite:steady");
  assert.ok(steadyAction);
  assert.match(steadyAction?.description ?? "", /结丹仪|走稳/);
  assert.equal(listed.some((action) => action.actionId === "core-rite:press"), false);
  performAction(steady.world, steady.cultivator.id, "core-rite:steady");
  finish(steady.world, steady.cultivator.id);
  assert.equal(steady.cultivator.realmLevel, 8);
  assert.equal(steady.cultivator.inventory["flowing-aurora-core"], 0);

  const pressed = prepare(7, "金丹", CORE_ITEMS);
  const witness = createCultivator(pressed.world, { name: "护法的人" });
  pressed.world.cultivators[witness.id]!.locationId = pressed.cultivator.locationId;
  assert.ok(listAvailableActions(pressed.world, pressed.cultivator.id).some((action) => action.actionId === "core-rite:press"));
  let hurried = false;
  let calm = false;
  for (let tick = 1; tick < 80 && (!hurried || !calm); tick += 1) {
    const attempt = prepare(7, "金丹", CORE_ITEMS);
    attempt.world.tick = tick;
    const other = createCultivator(attempt.world, { name: "护法的人" });
    attempt.world.cultivators[other.id]!.locationId = attempt.cultivator.locationId;
    performAction(attempt.world, attempt.cultivator.id, "core-rite:press");
    finish(attempt.world, attempt.cultivator.id);
    assert.equal(attempt.cultivator.realmLevel, 8);
    if (attempt.cultivator.statusEffects.some((effect) => effect.id === "deviation")) hurried = true;
    else calm = true;
  }
  assert.ok(hurried);
  assert.ok(calm);
});

test("婴火淬体在甲级门口，失败会反噬，元婴守魂灯再收口", () => {
  const blocked = prepare(9, "金丹", NASCENT_GATE);
  assert.equal(listAvailableActions(blocked.world, blocked.cultivator.id).some((action) => action.actionId === "infant-fire-temper"), false);
  assert.throws(
    () => performAction(blocked.world, blocked.cultivator.id, "residence-breakthrough"),
    /婴火/,
  );

  let failed = false;
  for (let tick = 1; tick < 40 && !failed; tick += 1) {
    const attempt = prepare(9, "金丹", NASCENT_GATE);
    attempt.world.tick = tick;
    attempt.cultivator.locationId = "qingzhou:dungeon-a";
    performAction(attempt.world, attempt.cultivator.id, "infant-fire-temper");
    finish(attempt.world, attempt.cultivator.id);
    if (attempt.cultivator.realmLevel === 9) {
      failed = true;
      assert.equal(attempt.cultivator.realmProgress, 60);
      assert.ok(attempt.cultivator.injuryTicksRemaining >= 8);
      assert.ok(attempt.cultivator.statusEffects.some((effect) => effect.id === "deviation"));
      assert.equal(getCultivatorState(attempt.world, attempt.cultivator.id).statusEffects.find((effect) => effect.id === "deviation")?.name, "走火入魔");
      assert.match(attempt.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /婴火反噬/);
    }
  }
  assert.ok(failed);

  const vigil = prepare(11, "元婴", ANCHOR_ITEMS);
  const lamp = listAvailableActions(vigil.world, vigil.cultivator.id).find((action) => action.actionId === "begin-soul-vigil");
  assert.ok(lamp);
  assert.match(lamp.description, /收口/);
  assert.equal(lamp.description.includes("seal-soul-vigil"), false);
  assert.throws(
    () => performAction(vigil.world, vigil.cultivator.id, "residence-breakthrough"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /魂灯/);
      assert.equal(error.message.includes("begin-soul-vigil"), false);
      return true;
    },
  );
  const before = vigil.cultivator.inventory["anchor-nascent-sand"];
  performAction(vigil.world, vigil.cultivator.id, "begin-soul-vigil");
  finish(vigil.world, vigil.cultivator.id);
  assert.equal((vigil.cultivator.lifeLog ?? []).some((event) => event.text.includes("seal-soul-vigil")), false);
  assert.equal(vigil.cultivator.realmLevel, 11);
  assert.equal(vigil.cultivator.inventory["anchor-nascent-sand"], before);
  assert.equal(getCultivatorState(vigil.world, vigil.cultivator.id).breakthrough?.rite?.method, "soul-vigil");
  performAction(vigil.world, vigil.cultivator.id, "seal-soul-vigil");
  assert.equal(vigil.cultivator.realmLevel, 12);
  assert.equal(vigil.cultivator.inventory["anchor-nascent-sand"], before - 1);
  assert.match(vigil.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /魂灯/);

  const expired = prepare(11, "元婴", ANCHOR_ITEMS);
  performAction(expired.world, expired.cultivator.id, "begin-soul-vigil");
  finish(expired.world, expired.cultivator.id);
  advanceWorld(expired.world, 9);
  assert.throws(
    () => performAction(expired.world, expired.cultivator.id, "seal-soul-vigil"),
    /灭了/,
  );
  assert.equal(expired.cultivator.inventory["anchor-nascent-sand"], 1);
  performAction(expired.world, expired.cultivator.id, "begin-soul-vigil");
  finish(expired.world, expired.cultivator.id);
  performAction(expired.world, expired.cultivator.id, "seal-soul-vigil");
  assert.equal(expired.cultivator.realmLevel, 12);
});

test("天劫在荒野迎，化神在驻地分两步落印", () => {
  const blocked = prepare(12, "元婴", SPIRIT_GATE);
  assert.throws(
    () => performAction(blocked.world, blocked.cultivator.id, "face-tribulation"),
    /荒野|甲级/,
  );

  let soloFailure = false;
  let sharedFailure = false;
  let success = false;
  for (let tick = 1; tick < 50 && (!soloFailure || !sharedFailure || !success); tick += 1) {
    const alone = prepare(12, "元婴", SPIRIT_GATE);
    alone.world.tick = tick;
    alone.cultivator.locationId = "qingzhou:wilderness";
    performAction(alone.world, alone.cultivator.id, "face-tribulation");
    finish(alone.world, alone.cultivator.id);
    if (alone.cultivator.realm === "化神") {
      success = true;
      assert.match(alone.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /天劫/);
    } else if (!soloFailure) {
      soloFailure = true;
      assert.ok(alone.cultivator.injuryTicksRemaining >= 10);
      assert.match(alone.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /一个人扛/);
    }

    const shared = prepare(12, "元婴", SPIRIT_GATE);
    shared.world.tick = tick + 200;
    shared.cultivator.locationId = "qingzhou:wilderness";
    const mate = createCultivator(shared.world, { name: "分雷的人" });
    const companion = shared.world.cultivators[mate.id]!;
    companion.locationId = "qingzhou:wilderness";
    performAction(shared.world, shared.cultivator.id, "face-tribulation");
    finish(shared.world, shared.cultivator.id);
    if (shared.cultivator.realmLevel === 12 && !sharedFailure) {
      sharedFailure = true;
      assert.equal(shared.cultivator.injuryTicksRemaining, 6);
      assert.ok(companion.injuryTicksRemaining >= 2);
      assert.match(companion.lifeLog?.map((event) => event.text).join("") ?? "", /分了一道雷/);
    }
  }
  assert.ok(soloFailure);
  assert.ok(sharedFailure);
  assert.ok(success);

  const alone = prepare(13, "化神", DIVINE_ITEMS);
  alone.cultivator.locationId = outpostId(alone.world);
  const patternCard = listAvailableActions(alone.world, alone.cultivator.id).find((action) => action.actionId === "begin-divine-step");
  assert.ok(patternCard);
  assert.match(patternCard.description, /落印/);
  assert.equal(patternCard.description.includes("seal-divine-step"), false);
  performAction(alone.world, alone.cultivator.id, "begin-divine-step");
  finish(alone.world, alone.cultivator.id);
  assert.equal(alone.cultivator.inventory["divine-embryo-dew"], 1);
  performAction(alone.world, alone.cultivator.id, "seal-divine-step");
  assert.equal(alone.cultivator.realmLevel, 14);
  assert.equal(alone.cultivator.injuryTicksRemaining, 4);
  assert.match(alone.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /反噬/);

  const watched = prepare(13, "化神", DIVINE_ITEMS);
  watched.cultivator.locationId = outpostId(watched.world);
  const witness = createCultivator(watched.world, { name: "看印的人" });
  watched.world.cultivators[witness.id]!.locationId = watched.cultivator.locationId;
  performAction(watched.world, watched.cultivator.id, "begin-divine-step");
  finish(watched.world, watched.cultivator.id);
  performAction(watched.world, watched.cultivator.id, "seal-divine-step");
  assert.equal(watched.cultivator.realmLevel, 14);
  assert.equal(watched.cultivator.injuryTicksRemaining, 0);
  assert.match(watched.cultivator.lifeLog?.map((event) => event.text).join("") ?? "", /看印的人/);
});

test("炼婴和守神台校验这一阶的材料，见闻不写行动标识", () => {
  const home = prepare(10, "元婴", VIGIL_ITEMS);
  assert.equal(listAvailableActions(home.world, home.cultivator.id).some((action) => action.actionId === "refine-nascent"), false);
  assert.throws(() => performAction(home.world, home.cultivator.id, "refine-nascent"), /宗门驻地|甲级/);
  assert.throws(
    () => performAction(home.world, home.cultivator.id, "begin-soul-vigil"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /炼婴/);
      assert.equal(error.message.includes("refine-nascent"), false);
      assert.equal(error.message.includes("begin-soul-vigil"), false);
      return true;
    },
  );

  const wrong = prepare(10, "元婴", ["infant-fire-lotus", "nascent-jade", "soul-lamp-wick", "anchor-nascent-sand"]);
  wrong.cultivator.locationId = outpostId(wrong.world);
  assert.throws(() => performAction(wrong.world, wrong.cultivator.id, "refine-nascent"), /材料/);
  assert.equal(wrong.cultivator.inventory["anchor-nascent-sand"], 1);
  assert.equal(wrong.cultivator.inventory["infant-fire-lotus"], 1);
  assert.equal(wrong.cultivator.realmLevel, 10);

  const solo = prepare(10, "元婴", VIGIL_ITEMS);
  solo.cultivator.locationId = "qingzhou:dungeon-a";
  for (const other of Object.values(solo.world.cultivators)) {
    if (other.id !== solo.cultivator.id && other.locationId === solo.cultivator.locationId) {
      other.locationId = "qingzhou:main-city";
    }
  }
  const card = listAvailableActions(solo.world, solo.cultivator.id).find((action) => action.actionId === "refine-nascent");
  assert.ok(card);
  assert.match(card.label, /炼婴/);
  assert.equal(card.description.includes("refine-nascent"), false);
  performAction(solo.world, solo.cultivator.id, "refine-nascent");
  finish(solo.world, solo.cultivator.id);
  assert.equal(solo.cultivator.realmLevel, 11);
  assert.equal(solo.cultivator.realm, "元婴");
  assert.equal(solo.cultivator.inventory["nurture-nascent-dew"], 0);
  assert.equal(solo.cultivator.inventory["infant-fire-lotus"], 0);
  assert.equal(solo.cultivator.injuryTicksRemaining, 4);
  const life = solo.cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
  assert.match(life, /婴身挣了一下/);
  assert.equal(life.includes("refine-nascent"), false);
  const sight = solo.world.worldEvents.find((event) => event.cultivatorId === solo.cultivator.id && event.title === "破境");
  assert.match(sight?.content ?? "", /婴身/);
  assert.equal(sight?.content.includes("refine-nascent"), false);

  const watched = prepare(10, "元婴", VIGIL_ITEMS);
  watched.cultivator.locationId = outpostId(watched.world);
  const witness = createCultivator(watched.world, { name: "护法的人" });
  watched.world.cultivators[witness.id]!.locationId = watched.cultivator.locationId;
  performAction(watched.world, watched.cultivator.id, "refine-nascent");
  finish(watched.world, watched.cultivator.id);
  assert.equal(watched.cultivator.realmLevel, 11);
  assert.equal(watched.cultivator.injuryTicksRemaining, 0);
  const watchedLife = watched.cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
  assert.match(watchedLife, /护法的人/);
  assert.match(watched.world.worldEvents.find((event) => event.cultivatorId === watched.cultivator.id && event.title === "破境")?.content ?? "", /护法的人/);

  const mid = prepare(11, "元婴", ANCHOR_ITEMS);
  mid.cultivator.locationId = outpostId(mid.world);
  assert.throws(() => performAction(mid.world, mid.cultivator.id, "refine-nascent"), /魂灯/);

  const hall = prepare(14, "化神", SEAL_ITEMS);
  hall.cultivator.locationId = outpostId(hall.world);
  assert.equal(listAvailableActions(hall.world, hall.cultivator.id).some((action) => action.actionId === "hold-divine-platform"), false);
  assert.throws(() => performAction(hall.world, hall.cultivator.id, "begin-divine-step"), /守神台/);
  assert.throws(() => performAction(hall.world, hall.cultivator.id, "hold-divine-platform"), /荒野|甲级/);

  const wrongSeal = prepare(14, "化神", DIVINE_ITEMS);
  wrongSeal.cultivator.locationId = "qingzhou:wilderness";
  assert.throws(() => performAction(wrongSeal.world, wrongSeal.cultivator.id, "hold-divine-platform"), /材料/);
  assert.equal(wrongSeal.cultivator.inventory["divine-embryo-dew"], 1);
  assert.equal(wrongSeal.cultivator.realmLevel, 14);

  const sky = prepare(14, "化神", SEAL_ITEMS);
  sky.cultivator.locationId = "qingzhou:dungeon-a";
  for (const other of Object.values(sky.world.cultivators)) {
    if (other.id !== sky.cultivator.id && other.locationId === sky.cultivator.locationId) {
      other.locationId = "qingzhou:main-city";
    }
  }
  const platformCard = listAvailableActions(sky.world, sky.cultivator.id).find((action) => action.actionId === "hold-divine-platform");
  assert.ok(platformCard);
  assert.equal(platformCard.description.includes("hold-divine-platform"), false);
  performAction(sky.world, sky.cultivator.id, "hold-divine-platform");
  finish(sky.world, sky.cultivator.id);
  assert.equal(sky.cultivator.realmLevel, 15);
  assert.equal(sky.cultivator.realm, "化神");
  assert.equal(sky.cultivator.inventory["divine-transformation-seal"], 0);
  assert.equal(sky.cultivator.injuryTicksRemaining, 4);
  const skyLife = sky.cultivator.lifeLog?.map((event) => event.text).join("") ?? "";
  assert.match(skyLife, /神台/);
  assert.equal(skyLife.includes("hold-divine-platform"), false);
  const skySight = sky.world.worldEvents.find((event) => event.cultivatorId === sky.cultivator.id && event.title === "破境");
  assert.match(skySight?.content ?? "", /神台/);
  assert.equal(skySight?.content.includes("hold-divine-platform"), false);
  assert.ok(skyLife.includes(skySight?.content ?? ""));
});
