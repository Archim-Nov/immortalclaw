import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, performAction, syncCultivatorFromPersona } from "./index.js";

const CULTIVATOR_ID = "yun-zhong-he";
const LINE = "我走前面，你看着后路。";

function spawn(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

function formParty(world: ReturnType<typeof createSeedWorld>, leaderId: string, mateId: string) {
  performAction(world, leaderId, `chat-up:${mateId}`);
  performAction(world, leaderId, `party-invite:${mateId}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mateId);
  assert.ok(inviteId);
  performAction(world, mateId, `accept-party:${inviteId}`);
}

test("each companion keeps the leader's combatRounds and a quotable shared note", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawn(world, "agent-report-mate", "墨儿");
  const witness = spawn(world, "agent-report-witness", "青萝");
  formParty(world, leader.id, mate.id);
  formParty(world, leader.id, witness.id);

  performAction(world, leader.id, `say:${mate.id}`, LINE);
  mate.injuryTicksRemaining = 4;
  leader.inventory["healing-pill"] = (leader.inventory["healing-pill"] ?? 0) + 1;
  performAction(world, leader.id, `tend-wound:${mate.id}`);

  for (const person of [leader, mate, witness]) {
    person.locationId = "qingzhou:dungeon-c";
    person.qi = person.maxQi;
    person.spiritualPower = person.maxSpiritualPower;
  }
  leader.dungeonProgress["丙"].highestClearedRank = 0;
  const started = performAction(world, leader.id, "enter-dungeon:rank-1:aggressive");
  assert.equal(started.accepted, true);
  assert.equal(mate.activeJobId, null);
  assert.equal(witness.activeJobId, null);

  let guard = 0;
  while (leader.activeJobId && guard < 80) {
    advanceWorld(world, 1);
    guard += 1;
    assert.equal(mate.activeJobId, null);
    assert.equal(witness.activeJobId, null);
  }
  assert.equal(leader.activeJobId, null);

  const leaderReport = getCultivatorState(world, leader.id).dungeonExpedition.lastReport;
  assert.ok(leaderReport);
  assert.ok((leaderReport?.combatRounds?.length ?? 0) > 0);

  for (const companion of [mate, witness]) {
    const report = getCultivatorState(world, companion.id).dungeonExpedition.lastReport;
    assert.equal(report?.sharedLeaderId, leader.id);
    assert.equal(report?.sharedLeaderName, leader.name);
    assert.deepEqual(report?.combatRounds, leaderReport?.combatRounds);
    const skills = (report?.combatRounds ?? []).flatMap((fight) => fight.party.flatMap((member) => member.skills));
    assert.ok(skills.length > 0);
    const chronicle = (companion.travelNotes ?? []).find((note) =>
      note.detail.includes(LINE)
      && note.detail.includes("把伤压")
      && note.detail.includes("使出")
      && /主攻|破法|护卫|辅助|控场/.test(note.detail),
    );
    assert.ok(chronicle, (companion.travelNotes ?? []).map((note) => note.detail).join("\n"));
  }

  const leaderChronicle = (leader.travelNotes ?? []).find((note) =>
    note.detail.includes(LINE)
    && note.detail.includes("把伤压")
    && note.detail.includes("使出")
    && /一起出了|拖出|撤出|离开了/.test(note.detail),
  );
  assert.ok(leaderChronicle, (leader.travelNotes ?? []).map((note) => note.detail).join("\n"));
});

test("a city duel stores the same named combatRounds on both recentCombats", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const second = spawn(world, "agent-report-duel", "青萝");
  const witness = spawn(world, "agent-report-duel-witness", "阿宁");
  first.locationId = "qingzhou:main-city";
  formParty(world, first.id, second.id);
  formParty(world, first.id, witness.id);
  first.qi = first.maxQi;
  second.qi = second.maxQi;

  performAction(world, first.id, `challenge-cultivator:${second.id}`);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  let guard = 0;
  while (first.activeJobId && guard < 12) {
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.equal(first.activeJobId, null);

  const left = getCultivatorState(world, first.id).recentCombats[0];
  const right = getCultivatorState(world, second.id).recentCombats[0];
  assert.ok(left?.combatRounds && left.combatRounds.length > 0);
  assert.deepEqual(left?.combatRounds, right?.combatRounds);
  assert.match(left?.combatRounds?.[0]?.party.map((member) => member.roleLabel).join("") ?? "", /主攻|破法|护卫|辅助|控场/);
  assert.match((left?.combatRounds ?? []).flatMap((fight) => fight.beats).join(""), /使出/);
  assert.ok((witness.travelNotes ?? []).some((note) => note.detail.includes("切磋") && note.detail.includes("使出")));
});
