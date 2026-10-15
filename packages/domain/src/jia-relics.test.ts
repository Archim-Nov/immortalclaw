import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, listAvailableActions, performAction, syncCultivatorFromPersona } from "./index.js";
import { chronicleRelic, JIA_RELICS } from "./jia-relics.js";
import type { Cultivator, DungeonGrade, DungeonRank, ItemId } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function relicIds(mysteryId: "danxia" | "infant-pool" | "divine-rift"): ItemId[] {
  return JIA_RELICS.filter((relic) => relic.mysteryId === mysteryId).map((relic) => relic.itemId);
}

function heldCount(cultivator: Cultivator, ids: readonly ItemId[]): number {
  return ids.reduce((sum, itemId) => sum + (cultivator.inventory[itemId] ?? 0), 0);
}

function prepare(
  world: ReturnType<typeof createSeedWorld>,
  realm: Cultivator["realm"],
  level: number,
  grade: DungeonGrade,
) {
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = realm;
  cultivator.realmLevel = level;
  cultivator.locationId = grade === "甲"
    ? "qingzhou:dungeon-a"
    : grade === "乙"
      ? "qingzhou:dungeon-b"
      : "qingzhou:dungeon-c";
  cultivator.dungeonProgress[grade].highestClearedRank = 9;
  cultivator.qi = cultivator.maxQi = 400;
  cultivator.spiritualPower = cultivator.maxSpiritualPower = 400;
  cultivator.injuryTicksRemaining = 0;
  return cultivator;
}

function finishJob(world: ReturnType<typeof createSeedWorld>, id: string) {
  const cultivator = world.cultivators[id]!;
  let guard = 0;
  while (cultivator.activeJobId && guard < 80) {
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.equal(cultivator.activeJobId, null);
}

test("甲 relics stay inside one mystery, and unfinished runs pick nothing", () => {
  assert.equal(chronicleRelic({ grade: "丙", rank: 9, outcome: "completed", seed: "bing" }), null);
  assert.equal(chronicleRelic({ grade: "乙", rank: 5, outcome: "completed", seed: "yi" }), null);
  assert.equal(chronicleRelic({ grade: "甲", rank: 1, outcome: "withdrew", seed: "left" }), null);
  assert.equal(chronicleRelic({ grade: "甲", rank: 7, outcome: "aborted", seed: "stop" }), null);

  for (const [rank, mysteryId] of [[1, "danxia"], [4, "infant-pool"], [7, "divine-rift"]] as const) {
    const kinds = new Set<string>();
    for (let index = 0; index < 24; index += 1) {
      const note = chronicleRelic({ grade: "甲", rank, outcome: "completed", seed: `${mysteryId}:${index}` });
      assert.equal(note?.mysteryId, mysteryId);
      assert.equal(note?.rank, rank);
      assert.match(note?.arcLine ?? "", /。$/);
      kinds.add(note?.kind ?? "");
    }
    assert.deepEqual([...kinds].sort(), ["ash", "flake", "page"]);
  }
});

test("甲 yield hints name the three relics, and 丙 does not", () => {
  const jia = createSeedWorld();
  const core = prepare(jia, "金丹", 7, "甲");
  const hints = getCultivatorState(jia, core.id).dungeon?.rankYieldHints ?? [];
  assert.match(hints.find((hint) => hint.rank === 1)?.relicLine ?? "", /丹霞残页、丹霞炉灰、丹霞纹屑/);
  assert.equal(hints.find((hint) => hint.rank === 4)?.relicLine, undefined);

  const late = createSeedWorld();
  prepare(late, "金丹", 9, "甲");
  const mid = getCultivatorState(late, CULTIVATOR_ID).dungeon?.rankYieldHints.find((hint) => hint.rank === 4);
  assert.match(mid?.relicLine ?? "", /婴火残页、婴火炉灰、婴火纹屑/);

  const spirit = createSeedWorld();
  prepare(spirit, "元婴", 12, "甲");
  const high = getCultivatorState(spirit, CULTIVATOR_ID).dungeon?.rankYieldHints.find((hint) => hint.rank === 7);
  assert.match(high?.relicLine ?? "", /神纹残页、神纹炉灰、神纹纹屑/);

  const low = createSeedWorld();
  const novice = prepare(low, "炼气", 3, "丙");
  const bing = getCultivatorState(low, novice.id).dungeon?.rankYieldHints ?? [];
  assert.ok(bing.length > 0);
  assert.equal(bing.some((hint) => hint.relicLine), false);
});

test("finishing each 甲 mystery leaves one quotable relic", () => {
  const runs: Array<{
    realm: Cultivator["realm"];
    level: number;
    rank: DungeonRank;
    mysteryId: "danxia" | "infant-pool" | "divine-rift";
    name: string;
  }> = [
    { realm: "金丹", level: 7, rank: 1, mysteryId: "danxia", name: "丹霞内府" },
    { realm: "金丹", level: 9, rank: 4, mysteryId: "infant-pool", name: "婴火莲池" },
    { realm: "元婴", level: 12, rank: 7, mysteryId: "divine-rift", name: "神纹天隙" },
  ];
  for (const run of runs) {
    const world = createSeedWorld();
    const cultivator = prepare(world, run.realm, run.level, "甲");
    const before = heldCount(cultivator, relicIds(run.mysteryId));
    performAction(world, cultivator.id, `start-dungeon-expedition:rank-${run.rank}:conservative`);
    finishJob(world, cultivator.id);
    const state = getCultivatorState(world, cultivator.id);
    const relic = state.dungeonExpedition.lastReport?.relic;
    assert.equal(state.dungeonExpedition.lastReport?.outcome, "completed");
    assert.equal(relic?.mysteryId, run.mysteryId);
    assert.equal(relic?.mysteryName, run.name);
    assert.equal(relic?.rank, run.rank);
    assert.equal(heldCount(cultivator, relicIds(run.mysteryId)) - before, 1);
    assert.equal(cultivator.inventory[relic!.itemId], 1);
    assert.equal(state.dungeonExpedition.lastReport?.secondaryDrops[relic!.itemId], 1);
    assert.match(state.dungeonExpedition.lastReport?.summary ?? "", new RegExp(relic!.arcLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    const notes = state.travelogue.notes.map((note) => note.detail).join("\n");
    assert.match(notes, new RegExp(relic!.name));
    assert.match(notes, new RegExp(relic!.arcLine.slice(0, 12)));
    const quoted = state.digest?.quotes.some((quote) => quote.line === relic!.arcLine);
    assert.equal(quoted, true);
    assert.match(state.digest?.summary ?? "", /说过/);
  }
});

test("a companion quotes the relic and does not receive a second copy", () => {
  const world = createSeedWorld();
  const leader = prepare(world, "金丹", 7, "甲");
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-relic-mate", name: "墨儿" });
  const mate = world.cultivators[summary.selectedCultivatorId]!;
  mate.locationId = "qingzhou:main-city";
  leader.locationId = "qingzhou:main-city";
  performAction(world, leader.id, `chat-up:${mate.id}`);
  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  leader.locationId = "qingzhou:dungeon-a";
  mate.locationId = "qingzhou:dungeon-a";
  mate.qi = mate.maxQi;
  mate.spiritualPower = mate.maxSpiritualPower;
  performAction(world, leader.id, "enter-dungeon:rank-1:conservative");
  finishJob(world, leader.id);

  const leaderState = getCultivatorState(world, leader.id);
  const relic = leaderState.dungeonExpedition.lastReport?.relic;
  assert.ok(relic);
  assert.equal(heldCount(leader, relicIds("danxia")), 1);
  assert.equal(heldCount(mate, relicIds("danxia")), 0);

  const mateState = getCultivatorState(world, mate.id);
  assert.equal(mateState.dungeonExpedition.lastReport?.relic?.arcLine, relic!.arcLine);
  assert.equal(mateState.dungeonExpedition.lastReport?.sharedLeaderId, leader.id);
  assert.match(mateState.dungeonExpedition.lastReport?.summary ?? "", /你跟着/);
  assert.match(mate.travelNotes?.map((note) => note.detail).join("\n") ?? "", new RegExp(relic!.arcLine.slice(0, 8)));
  assert.equal(mateState.digest?.quotes.some((quote) => quote.line === relic!.arcLine && quote.speakerName === leader.name), true);
});

test("aborting 甲, withdrawing, and finishing 丙 leave no story relic", () => {
  const aborted = createSeedWorld();
  const stopper = prepare(aborted, "金丹", 7, "甲");
  performAction(aborted, stopper.id, "start-dungeon-expedition:rank-1:conservative");
  performAction(aborted, stopper.id, "abort-dungeon-expedition");
  assert.equal(getCultivatorState(aborted, stopper.id).dungeonExpedition.lastReport?.outcome, "aborted");
  assert.equal(getCultivatorState(aborted, stopper.id).dungeonExpedition.lastReport?.relic, undefined);
  assert.equal(heldCount(stopper, JIA_RELICS.map((relic) => relic.itemId)), 0);

  const weak = createSeedWorld();
  const tired = prepare(weak, "金丹", 7, "甲");
  tired.qi = 40;
  tired.maxQi = 100;
  performAction(weak, tired.id, "start-dungeon-expedition:rank-1:conservative");
  finishJob(weak, tired.id);
  assert.equal(getCultivatorState(weak, tired.id).dungeonExpedition.lastReport?.outcome, "withdrew");
  assert.equal(getCultivatorState(weak, tired.id).dungeonExpedition.lastReport?.relic, undefined);
  assert.equal(heldCount(tired, JIA_RELICS.map((relic) => relic.itemId)), 0);

  const low = createSeedWorld();
  const novice = prepare(low, "炼气", 3, "丙");
  performAction(low, novice.id, "start-dungeon-expedition:rank-1:conservative");
  finishJob(low, novice.id);
  assert.equal(getCultivatorState(low, novice.id).dungeonExpedition.lastReport?.outcome, "completed");
  assert.equal(getCultivatorState(low, novice.id).dungeonExpedition.lastReport?.relic, undefined);
  assert.equal(heldCount(novice, JIA_RELICS.map((relic) => relic.itemId)), 0);
});

test("the cave table shows one relic without taking it out of the bag", () => {
  const world = createSeedWorld();
  const host = world.cultivators[CULTIVATOR_ID]!;
  host.locationId = host.residence.locationId;
  const page = JIA_RELICS.find((relic) => relic.itemId === "danxia-page-scrap")!;
  const ash = JIA_RELICS.find((relic) => relic.itemId === "danxia-kiln-ash")!;
  host.inventory[page.itemId] = 1;
  host.inventory[ash.itemId] = 1;

  const listed = listAvailableActions(world, host.id).map((action) => action.actionId);
  assert.ok(listed.includes(`display-relic:${page.itemId}`));
  performAction(world, host.id, `display-relic:${page.itemId}`);
  assert.equal(host.inventory[page.itemId], 1);

  let state = getCultivatorState(world, host.id);
  const home = state.residences.find((residence) => residence.id === host.residence.id);
  assert.equal(home?.displayedRelic?.arcLine, page.arcLine);
  assert.match(home?.glance ?? "", new RegExp(page.arcLine.slice(0, 8)));
  assert.equal(listAvailableActions(world, host.id).some((action) => action.actionId === `display-relic:${page.itemId}`), false);
  assert.ok(listAvailableActions(world, host.id).some((action) => action.actionId === "clear-displayed-relic"));

  performAction(world, host.id, `display-relic:${ash.itemId}`);
  state = getCultivatorState(world, host.id);
  const replaced = state.residences.find((residence) => residence.id === host.residence.id);
  assert.equal(replaced?.displayedRelic?.name, ash.name);
  assert.equal(replaced?.glance.includes(page.arcLine), false);
  assert.equal(host.inventory[page.itemId], 1);
  assert.equal(host.inventory[ash.itemId], 1);

  const guestSummary = syncCultivatorFromPersona(world, { agentId: "agent-relic-guest", name: "青萝" });
  const guest = world.cultivators[guestSummary.selectedCultivatorId]!;
  guest.locationId = host.locationId;
  const visit = getCultivatorState(world, guest.id);
  const seen = visit.nearbyHomes?.find((row) => row.ownerId === host.id);
  assert.equal(seen?.displayedRelic?.arcLine, ash.arcLine);
  assert.match(seen?.glance ?? "", /丹霞炉灰/);
  assert.match(visit.nearbyCultivators?.find((person) => person.cultivatorId === host.id)?.homeLine ?? "", /丹霞炉灰/);

  performAction(world, host.id, "clear-displayed-relic");
  const cleared = getCultivatorState(world, host.id).residences.find((residence) => residence.id === host.residence.id);
  assert.equal(cleared?.displayedRelic, undefined);
  assert.equal(cleared?.glance.includes(ash.name), false);
  assert.equal(host.inventory[ash.itemId], 1);

  host.locationId = "qingzhou:dungeon-a";
  assert.throws(() => performAction(world, host.id, `display-relic:${page.itemId}`), /洞府/);
  host.locationId = host.residence.locationId;
  assert.throws(() => performAction(world, host.id, "display-relic:healing-pill"), /甲级遗物/);
  assert.throws(() => performAction(world, host.id, "display-relic:rift-page-scrap"), /袋子里没有/);
  assert.throws(() => performAction(world, host.id, "clear-displayed-relic"), /案上本来就空着/);
});
