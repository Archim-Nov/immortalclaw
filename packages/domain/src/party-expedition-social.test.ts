import assert from "node:assert/strict";
import test from "node:test";
import { createDungeonExpeditionProgress } from "./dungeon-expedition-service.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { DungeonExpeditionProgress, WakeNode, WorldState } from "./model.js";
import {
  createPartyExpeditionWake,
  partyWakeIsReady,
  partyWakeResolvedOption,
  publishPartyExpeditionMemories,
  resolvePartyExpeditionWake,
} from "./party-expedition-social.js";
import { getSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function lootNode(votes: WakeNode["votes"]): WakeNode {
  return {
    nodeId: "loot",
    context: "灵石还没凉。",
    partyKind: "loot-contention",
    options: [
      { optionId: "yield-loot", label: "把这一份让出去", description: "留在队里。" },
      { optionId: "take-shortcut", label: "走短路先拿", description: "自己多拿。" },
    ],
    defaultOptionId: "yield-loot",
    safeOptionId: "yield-loot",
    timeoutTicks: 10,
    votes,
  };
}

test("a party wake that does not lock falls back to the safe side", () => {
  const five = ["a", "b", "c", "d", "e"];
  const oneGrab = lootNode([{ cultivatorId: "a", optionId: "take-shortcut" }]);
  assert.equal(partyWakeIsReady(oneGrab, five), false);
  assert.equal(partyWakeResolvedOption(oneGrab, five, "aggressive"), "yield-loot");
  assert.equal(partyWakeResolvedOption(oneGrab, five, "conservative"), "yield-loot");

  const tied = lootNode([
    { cultivatorId: "a", optionId: "take-shortcut" },
    { cultivatorId: "b", optionId: "take-shortcut" },
    { cultivatorId: "c", optionId: "yield-loot" },
    { cultivatorId: "d", optionId: "yield-loot" },
  ]);
  assert.equal(partyWakeIsReady(tied, ["a", "b", "c", "d"]), true);
  assert.equal(partyWakeResolvedOption(tied, ["a", "b", "c", "d"], "aggressive"), "yield-loot");

  const alone = lootNode([{ cultivatorId: "a", optionId: "take-shortcut" }]);
  assert.equal(partyWakeIsReady(alone, ["a"]), true);
  assert.equal(partyWakeResolvedOption(alone, ["a"], "balanced"), "take-shortcut");
});

test("three votes out of five lock the party wake", () => {
  const node: WakeNode = {
    ...lootNode([]),
    partyKind: "treasure-split",
    safeOptionId: "split-treasure",
    defaultOptionId: "split-treasure",
    options: [
      { optionId: "split-treasure", label: "当面分开", description: "谁也不多拿。" },
      { optionId: "seize-treasure", label: "先伸手", description: "收进自己口袋。" },
    ],
    votes: [
      { cultivatorId: "a", optionId: "seize-treasure" },
      { cultivatorId: "b", optionId: "seize-treasure" },
      { cultivatorId: "c", optionId: "seize-treasure" },
    ],
  };
  const five = ["a", "b", "c", "d", "e"];
  assert.equal(partyWakeIsReady(node, five), true);
  assert.equal(partyWakeResolvedOption(node, five, "balanced"), "seize-treasure");
});

test("a shared run schedules tend, loot, then the unclaimed find", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  const companion = world.cultivators[CULTIVATOR_ID]!;
  const base = createDungeonExpeditionProgress({
    cultivatorId: leader.id,
    jobId: "job-party",
    locationId: leader.locationId,
    grade: "丙",
    targetRank: 1,
    policy: "aggressive",
    startedAtTick: 0,
  });
  const at = (step: number, kinds: DungeonExpeditionProgress["partyWakeKinds"] = []): DungeonExpeditionProgress => ({
    ...base,
    stepIndex: step,
    partyWakeKinds: kinds,
    wakeNodesEncountered: kinds.length,
  });
  const tend = createPartyExpeditionWake({ progress: at(3), leader, companions: [companion] });
  assert.equal(tend?.kind, "tend-wound");
  assert.equal(tend?.node.safeOptionId, "tend-companion");
  assert.equal(tend?.node.timeoutTicks, 10);
  assert.equal(tend?.bruise?.ticks, 2);
  const loot = createPartyExpeditionWake({
    progress: at(6, ["tend-wound"]),
    leader,
    companions: [companion],
  });
  assert.equal(loot?.kind, "loot-contention");
  assert.equal(loot?.node.timeoutTicks, 10);
  const treasure = createPartyExpeditionWake({
    progress: at(8, ["tend-wound", "loot-contention"]),
    leader,
    companions: [companion],
  });
  assert.equal(treasure?.kind, "treasure-split");
  assert.equal(treasure?.node.timeoutTicks, 10);
  assert.equal(createPartyExpeditionWake({ progress: at(4, ["tend-wound"]), leader, companions: [companion] }), null);
  assert.equal(createPartyExpeditionWake({ progress: at(3), leader, companions: [] }), null);
});

test("乙级组队第六步换成这一层的人情，窗口是十刻", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  const base = createDungeonExpeditionProgress({
    cultivatorId: leader.id,
    jobId: "job-yi-bond",
    locationId: leader.locationId,
    grade: "乙",
    targetRank: 1,
    policy: "aggressive",
    startedAtTick: 0,
  });
  const at = (step: number, rank: 1 | 5 | 8): DungeonExpeditionProgress => ({
    ...base,
    stepIndex: step,
    targetRank: rank,
    partyWakeKinds: step === 6 ? ["tend-wound"] : [],
    wakeNodesEncountered: step === 6 ? 1 : 0,
  });
  const bond = createPartyExpeditionWake({ progress: at(6, 1), leader, companions: [leader] });
  assert.equal(bond?.kind, "floor-bond");
  assert.equal(bond?.node.timeoutTicks, 10);
  assert.equal(bond?.node.safeOptionId, "cover-mate");
  assert.match(bond?.node.context ?? "", /残阵/);
  assert.equal(/[A-Za-z]/.test(bond?.node.context ?? ""), false);
  for (const option of bond?.node.options ?? []) {
    assert.equal(/[A-Za-z]/.test(option.label), false);
    assert.equal(/[A-Za-z]/.test(option.description), false);
  }
  assert.equal(partyWakeResolvedOption(bond!.node, [leader.id, "other"], "aggressive"), "cover-mate");
  const fog = createPartyExpeditionWake({ progress: at(6, 5), leader, companions: [leader] });
  assert.match(fog?.node.context ?? "", /雾/);
  const frost = createPartyExpeditionWake({ progress: at(6, 8), leader, companions: [leader] });
  assert.match(frost?.node.context ?? "", /霜|棺/);
  const later = createPartyExpeditionWake({
    progress: { ...at(8, 1), partyWakeKinds: ["tend-wound", "floor-bond"], wakeNodesEncountered: 2 },
    leader,
    companions: [leader],
  });
  assert.equal(later?.kind, "treasure-split");
});

function spawn(name: string, index: number) {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  const summary = syncCultivatorFromPersona(world, {
    agentId: `agent-party-wake-${index}-${name}`,
    name,
  });
  const person = world.cultivators[summary.selectedCultivatorId]!;
  return { world, leader, person };
}

function addCompanion(world: WorldState, name: string, index: number) {
  const summary = syncCultivatorFromPersona(world, {
    agentId: `agent-party-wake-${index}-${name}`,
    name,
  });
  return world.cultivators[summary.selectedCultivatorId]!;
}

function formParty(world: WorldState, leaderId: string, partnerId: string) {
  performAction(world, leaderId, `chat-up:${partnerId}`);
  performAction(world, leaderId, `party-invite:${partnerId}`);
  const inviteId = Object.keys(world.partyInvitations ?? {})[0];
  assert.ok(inviteId);
  performAction(world, partnerId, `accept-party:${inviteId}`);
}

function freshen(person: { qi: number; maxQi: number; spiritualPower: number; maxSpiritualPower: number; injuryTicksRemaining: number; spiritStones: number }) {
  person.maxQi = 400;
  person.qi = 400;
  person.maxSpiritualPower = 200;
  person.spiritualPower = 200;
  person.injuryTicksRemaining = 0;
  person.spiritStones = 80;
}

test("five cultivators on one run leave favors, a crack, and paired lines", () => {
  const { world, leader } = spawn("苏晚", 1);
  const mates = ["石不语", "阿宁", "陆沉舟"].map((name, index) => addCompanion(world, name, index + 2));
  const second = world.cultivators[Object.keys(world.cultivators).find((id) => world.cultivators[id]?.name === "苏晚")!]!;
  const party = [second, ...mates];
  for (const person of [leader, ...party]) {
    person.locationId = "qingzhou:main-city";
    freshen(person);
  }
  for (const person of party) formParty(world, leader.id, person.id);
  for (const person of [leader, ...party]) person.locationId = "qingzhou:dungeon-c";
  leader.dungeonProgress["丙"].highestClearedRank = 1;

  performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  assert.equal(party.every((person) => person.activeJobId === null), true);

  const seen = new Set<string>();
  let guard = 0;
  while (leader.activeJobId && guard < 80) {
    guard += 1;
    const hint = getCultivatorState(world, leader.id).dungeonExpedition.wakeNodeHint;
    if (hint?.partyKind === "tend-wound") {
      seen.add("tend-wound");
      assert.match(hint.context, /伤|肩/);
      assert.equal(hint.context.includes("Stable Route"), false);
      assert.equal(hint.safeOptionId, "tend-companion");
      const companion = party[0]!;
      const shared = getCultivatorState(world, companion.id).sharedDungeon?.partyWake;
      assert.equal(shared?.kind, "tend-wound");
      assert.ok(listAvailableActions(world, companion.id).some((action) => action.actionId === "dungeon-wake-decision:tend-companion"));
      for (const person of [leader, ...party]) {
        if (!world.dungeonExpeditions[leader.id]?.pendingWakeNode) break;
        performAction(world, person.id, "dungeon-wake-decision:tend-companion");
      }
      assert.equal(world.dungeonExpeditions[leader.id]?.pendingWakeNode ?? null, null);
      const owed = [leader, ...party].flatMap((person) => getCultivatorState(world, person.id).owedFavors ?? []);
      assert.ok(owed.some((row) => row.reason === "替我挡了一剑"));
      continue;
    }
    if (hint?.partyKind === "loot-contention") {
      seen.add("loot-contention");
      const grabber = party[0]!;
      const stonesBefore = grabber.spiritStones;
      performAction(world, grabber.id, "dungeon-wake-decision:take-shortcut");
      assert.ok(world.dungeonExpeditions[leader.id]?.pendingWakeNode);
      advanceWorld(world, hint.timeoutTicks);
      assert.equal(world.dungeonExpeditions[leader.id]?.pendingWakeNode?.partyKind === "loot-contention", false);
      assert.equal(grabber.spiritStones, stonesBefore);
      assert.equal(getSocialLink(world, grabber.id, leader.id)?.grudge ?? 0, 0);
      const owed = [leader, ...party].flatMap((person) => getCultivatorState(world, person.id).owedFavors ?? []);
      assert.ok(owed.some((row) => row.reason === "把灵材让给我"));
      continue;
    }
    if (hint?.partyKind === "treasure-split") {
      seen.add("treasure-split");
      const stonesBefore = leader.spiritStones;
      performAction(world, leader.id, "dungeon-wake-decision:seize-treasure");
      performAction(world, party[0]!.id, "dungeon-wake-decision:seize-treasure");
      performAction(world, party[1]!.id, "dungeon-wake-decision:seize-treasure");
      assert.equal(world.dungeonExpeditions[leader.id]?.pendingWakeNode ?? null, null);
      assert.equal(leader.spiritStones, stonesBefore + 10);
      const bystander = party[2]!;
      assert.ok((getSocialLink(world, bystander.id, leader.id)?.grudge ?? 0) >= 3);
      assert.ok((getSocialLink(world, bystander.id, leader.id)?.grudge ?? 0) < 8);
      continue;
    }
    advanceWorld(world, 1);
  }

  assert.equal(leader.activeJobId, null);
  assert.deepEqual([...seen].sort(), ["loot-contention", "tend-wound", "treasure-split"]);
  const notes = [leader, ...party].flatMap((person) => person.travelNotes ?? []);
  assert.ok(notes.some((note) => note.detail.includes("上回你替我挡了一剑")));
  assert.ok(notes.some((note) => note.detail.includes("上回我替你挡了一剑")));
  assert.ok(notes.some((note) => note.detail.includes("上回你把那份灵材让给我")));
  assert.ok(notes.some((note) => note.detail.includes("上回你先伸手拿走了那件东西")));
  for (const person of [leader, ...party]) {
    const digest = getCultivatorState(world, person.id).digest;
    assert.ok(digest);
    const blob = `${digest.summary}\n${digest.relationships.join("\n")}`;
    assert.match(blob, /上回|同队的人都看见了/);
  }
});

test("an escort to the gate and a rendezvous are quoted when the run ends", () => {
  const { world, leader, person: mate } = spawn("青萝", 9);
  leader.locationId = "qingzhou:main-city";
  mate.locationId = "qingzhou:main-city";
  freshen(leader);
  freshen(mate);
  formParty(world, leader.id, mate.id);
  performAction(world, leader.id, `ask-favor:${mate.id}:escort-gate`);
  const favorId = Object.keys(world.personalFavors ?? {})[0];
  assert.ok(favorId);
  performAction(world, mate.id, `accept-favor:${favorId}`);
  leader.locationId = "qingzhou:dungeon-c";
  mate.locationId = "qingzhou:dungeon-c";
  performAction(world, mate.id, `fulfill-favor:${favorId}`);
  performAction(world, leader.id, `send-message:${mate.id}:rendezvous-at-gate`);
  leader.dungeonProgress["丙"].highestClearedRank = 1;
  performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  performAction(world, leader.id, "abort-dungeon-expedition");

  const leaderDigest = getCultivatorState(world, leader.id).digest;
  const mateDigest = getCultivatorState(world, mate.id).digest;
  assert.ok(leaderDigest && mateDigest);
  const leaderBlob = [
    ...(leader.travelNotes ?? []).map((note) => note.detail),
    ...leaderDigest.relationships,
  ].join("\n");
  const mateBlob = [
    ...(mate.travelNotes ?? []).map((note) => note.detail),
    ...mateDigest.relationships,
  ].join("\n");
  assert.match(`${leaderBlob}\n${mateBlob}`, /上回你把我送到地宫门口/);
  assert.match(`${leaderBlob}\n${mateBlob}`, /上回我把你送到地宫门口/);
  assert.match(`${leaderBlob}\n${mateBlob}`, /上回你约我在门口见/);
  assert.match(`${leaderBlob}\n${mateBlob}`, /上回我约你在门口见/);
});

test("乙级组队护住对方会欠人情，趁空拿走会结仇", () => {
  const { world, leader, person } = spawn("青萝", 21);
  leader.locationId = "qingzhou:dungeon-b";
  person.locationId = "qingzhou:dungeon-b";
  freshen(leader);
  freshen(person);
  leader.inventory["qi-pill"] = 1;
  person.maxSpiritualPower = 40;
  person.spiritualPower = 40;
  const progress = createDungeonExpeditionProgress({
    cultivatorId: leader.id,
    jobId: "bond-resolve",
    locationId: leader.locationId,
    grade: "乙",
    targetRank: 1,
    policy: "aggressive",
    startedAtTick: 0,
  });
  progress.stepIndex = 6;
  progress.partyWakeKinds = ["tend-wound"];
  progress.wakeNodesEncountered = 1;
  const draft = createPartyExpeditionWake({ progress, leader, companions: [person] });
  assert.equal(draft?.kind, "floor-bond");
  const awaiting = [leader.id, person.id];
  const before = getSocialLink(world, leader.id, person.id)?.affinity ?? 0;
  const covered = resolvePartyExpeditionWake({
    world,
    progress: {
      ...progress,
      pendingWakeNode: {
        ...draft!.node,
        votes: [{ cultivatorId: leader.id, optionId: "cover-mate" }],
      },
    },
    optionId: "cover-mate",
    awaitingIds: awaiting,
    timedOut: false,
  });
  const owed = getSocialLink(world, leader.id, person.id)?.owedFavors ?? [];
  assert.ok(owed.some((row) => row.reason === "断法的时候把丹递给我"));
  assert.ok((getSocialLink(world, leader.id, person.id)?.affinity ?? 0) >= before + 2);
  assert.equal(leader.inventory["qi-pill"] ?? 0, 0);
  const during = [...(leader.travelNotes ?? []), ...(person.travelNotes ?? [])].map((note) => note.detail).join("\n");
  assert.match(during, /回气丹/);
  publishPartyExpeditionMemories(world, covered);
  const remembered = [...(leader.travelNotes ?? []), ...(person.travelNotes ?? [])].map((note) => note.detail).join("\n");
  assert.match(remembered, /上回断法的时候/);

  const again = createDungeonExpeditionProgress({
    cultivatorId: leader.id,
    jobId: "bond-take",
    locationId: leader.locationId,
    grade: "乙",
    targetRank: 5,
    policy: "aggressive",
    startedAtTick: 0,
  });
  again.stepIndex = 6;
  const takeDraft = createPartyExpeditionWake({ progress: again, leader, companions: [person] });
  const stones = leader.spiritStones;
  const grudgeBefore = getSocialLink(world, person.id, leader.id)?.grudge ?? 0;
  resolvePartyExpeditionWake({
    world,
    progress: {
      ...again,
      pendingWakeNode: {
        ...takeDraft!.node,
        votes: [
          { cultivatorId: leader.id, optionId: "take-opening" },
          { cultivatorId: person.id, optionId: "take-opening" },
        ],
      },
    },
    optionId: "take-opening",
    awaitingIds: awaiting,
    timedOut: false,
  });
  assert.equal(leader.spiritStones, stones + 8);
  const grudge = getSocialLink(world, person.id, leader.id)?.grudge ?? 0;
  assert.ok(grudge >= grudgeBefore + 3);
  assert.ok(grudge < 8);
  const taken = [...(leader.travelNotes ?? []), ...(person.travelNotes ?? [])].map((note) => note.detail).join("\n");
  assert.match(taken, /干处/);
});

test("两个人走进乙级，第六步能把丹递出去", () => {
  const { world, leader, person } = spawn("阿宁", 22);
  for (const one of [leader, person]) {
    one.locationId = "qingzhou:main-city";
    one.realm = "筑基";
    one.realmLevel = 4;
    one.dungeonProgress["乙"].highestClearedRank = 1;
    freshen(one);
  }
  leader.inventory["qi-pill"] = 1;
  formParty(world, leader.id, person.id);
  for (const one of [leader, person]) one.locationId = "qingzhou:dungeon-b";
  performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  assert.equal(person.activeJobId, null);

  let guard = 0;
  let sawBond = false;
  while (leader.activeJobId && guard < 90) {
    guard += 1;
    const hint = getCultivatorState(world, leader.id).dungeonExpedition.wakeNodeHint;
    if (hint?.partyKind === "tend-wound") {
      performAction(world, leader.id, "dungeon-wake-decision:tend-companion");
      performAction(world, person.id, "dungeon-wake-decision:tend-companion");
      continue;
    }
    if (hint?.partyKind === "floor-bond") {
      sawBond = true;
      assert.equal(hint.timeoutTicks, 10);
      assert.match(hint.context, /残阵|丹/);
      assert.equal(/[A-Za-z]/.test(hint.context), false);
      assert.equal(hint.safeOptionId, "cover-mate");
      const before = getSocialLink(world, leader.id, person.id)?.affinity ?? 0;
      performAction(world, leader.id, "dungeon-wake-decision:cover-mate");
      performAction(world, person.id, "dungeon-wake-decision:cover-mate");
      const owed = [leader, person].flatMap((one) => getCultivatorState(world, one.id).owedFavors ?? []);
      assert.ok(owed.some((row) => row.reason === "断法的时候把丹递给我"));
      assert.ok((getSocialLink(world, leader.id, person.id)?.affinity ?? 0) >= before);
      const notes = [...(leader.travelNotes ?? []), ...(person.travelNotes ?? [])].map((note) => note.detail).join("\n");
      assert.match(notes, /丹/);
      break;
    }
    advanceWorld(world, 1);
  }
  assert.equal(sawBond, true);
});
