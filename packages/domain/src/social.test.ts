import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import {
  AFFINITY_GAINS,
  AFFINITY_THRESHOLDS,
  getAffinityLevel,
  getDaoCompanionId,
  getSocialLink,
  getSocialLinksView,
  hasDaoCompanion,
} from "./social.js";

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < 100) {
    advanceWorld(world, 1);
    ticks++;
  }
}

function createTwoCultivators() {
  const world = createSeedWorld();
  const first = world.cultivators["yun-zhong-he"]!;
  const secondSummary = syncCultivatorFromPersona(world, {
    agentId: "agent-social-peer",
    name: "Lian Qiu",
  });
  const second = world.cultivators[secondSummary.selectedCultivatorId]!;
  // Place both at the same safe location (main city)
  first.locationId = "qingzhou:main-city";
  second.locationId = "qingzhou:main-city";
  return { world, first, second };
}

test("chat-up creates mutual social links and grows affinity", () => {
  const { world, first, second } = createTwoCultivators();

  // Ensure no social links exist
  assert.equal(getSocialLink(world, first.id, second.id), null);

  // Chat up (need to build the action ID with the target's ID)
  const result = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(result.accepted, true);

  // Both sides should have affinity now
  const linkAB = getSocialLink(world, first.id, second.id);
  const linkBA = getSocialLink(world, second.id, first.id);
  assert.ok(linkAB);
  assert.ok(linkBA);
  assert.equal(linkAB.affinity, AFFINITY_GAINS.chatUp);
  assert.equal(linkBA.affinity, AFFINITY_GAINS.chatUp);
  assert.equal(getAffinityLevel(linkAB.affinity), "认识");
});

test("chat-up requires same location", () => {
  const { world, first, second } = createTwoCultivators();
  second.locationId = "yangzhou:main-city"; // different location

  assert.throws(
    () => performAction(world, first.id, `chat-up:${second.id}`),
    /same location/,
  );
});

test("voice-transmit requires 朋友 level relationship", () => {
  const { world, first, second } = createTwoCultivators();

  // No existing link — should fail
  assert.throws(
    () => performAction(world, first.id, `voice-transmit:${second.id}`),
    /朋友/,
  );

  // Build affinity to 朋友 level (60)
  for (let i = 0; i < 20; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link);
  assert.ok(link.affinity >= AFFINITY_THRESHOLDS["朋友"]);

  // Now voice-transmit should work
  const result = performAction(world, first.id, `voice-transmit:${second.id}`);
  assert.equal(result.accepted, true);
});

test("voice-transmit works from any location", () => {
  const { world, first, second } = createTwoCultivators();

  // Build 朋友 level
  for (let i = 0; i < 20; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }

  // Move first to a different location
  first.locationId = "yangzhou:main-city";

  const result = performAction(world, first.id, `voice-transmit:${second.id}`);
  assert.equal(result.accepted, true);
});

test("dao companion proposal-accept flow creates mutual bond", () => {
  const { world, first, second } = createTwoCultivators();

  // Build 好友 level (120)
  for (let i = 0; i < 40; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link && link.affinity >= AFFINITY_THRESHOLDS["好友"]);

  // Propose
  const proposeResult = performAction(world, first.id, `propose-dao-companion:${second.id}`);
  assert.equal(proposeResult.accepted, true);

  // Find proposal
  const proposals = Object.values(world.daoCompanionProposals);
  assert.equal(proposals.length, 1);
  const proposal = proposals[0]!;

  // Accept
  const acceptResult = performAction(world, second.id, `accept-dao-companion:${proposal.id}`);
  assert.equal(acceptResult.accepted, true);

  // Both should have 道侣 bond
  assert.equal(hasDaoCompanion(world, first.id), true);
  assert.equal(hasDaoCompanion(world, second.id), true);
  assert.equal(getDaoCompanionId(world, first.id), second.id);
  assert.equal(getDaoCompanionId(world, second.id), first.id);
});

test("dao companion proposal can be rejected", () => {
  const { world, first, second } = createTwoCultivators();

  // Build 好友 level
  for (let i = 0; i < 40; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }

  performAction(world, first.id, `propose-dao-companion:${second.id}`);
  const proposals = Object.values(world.daoCompanionProposals);
  const proposal = proposals[0]!;

  const rejectResult = performAction(world, second.id, `reject-dao-companion:${proposal.id}`);
  assert.equal(rejectResult.accepted, true);
  assert.equal(hasDaoCompanion(world, first.id), false);
  assert.equal(Object.keys(world.daoCompanionProposals).length, 0);
});

test("dao companion requires 好友 level affinity", () => {
  const { world, first, second } = createTwoCultivators();

  // Just a few chat-ups — not enough
  for (let i = 0; i < 5; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }

  assert.throws(
    () => performAction(world, first.id, `propose-dao-companion:${second.id}`),
    /好友/,
  );
});

test("social links show up in getCultivatorState view", () => {
  const { world, first, second } = createTwoCultivators();

  performAction(world, first.id, `chat-up:${second.id}`);

  const views = getSocialLinksView(world, first.id);
  assert.equal(views.length, 1);
  assert.equal(views[0]!.targetCultivatorId, second.id);
  assert.equal(views[0]!.level, "认识");
  assert.equal(views[0]!.affinity, AFFINITY_GAINS.chatUp);
});

test("affinity levels progress through tiers with repeated interaction", () => {
  const { world, first, second } = createTwoCultivators();

  // Each chat-up gives 3 affinity
  // 认识: 0, 熟识: 20, 朋友: 60, 好友: 120, 挚友: 200
  for (let i = 0; i < 7; i++) performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "熟识"); // 21

  for (let i = 0; i < 14; i++) performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "朋友"); // 63

  for (let i = 0; i < 20; i++) performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "好友"); // 123

  for (let i = 0; i < 27; i++) performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "挚友"); // 204
});

test("chat-up and voice-transmit actions appear in available actions", () => {
  const { world, first, second } = createTwoCultivators();

  // At same location — chat-up should appear
  const actions1 = listAvailableActions(world, first.id).map((a) => a.actionId);
  assert.ok(actions1.some((a) => a.startsWith("chat-up:")), "Expected chat-up action when others are at same location");

  // Build 朋友 level for voice-transmit
  for (let i = 0; i < 20; i++) {
    performAction(world, first.id, `chat-up:${second.id}`);
  }

  const actions2 = listAvailableActions(world, first.id).map((a) => a.actionId);
  assert.ok(actions2.some((a) => a.startsWith("voice-transmit:")), "Expected voice-transmit action for 朋友+ friends");
});

test("social actions are allowed while injured", () => {
  const { world, first, second } = createTwoCultivators();

  first.injuryTicksRemaining = 5;

  // chat-up should still work while injured
  const result = performAction(world, first.id, `chat-up:${second.id}`);
  assert.equal(result.accepted, true);
});

test("residence-socialize grows affinity when others are nearby", () => {
  const { world, first, second } = createTwoCultivators();

  // Give first a residence at main-city
  first.residence = { ...first.residence, locationId: "qingzhou:main-city" };
  first.locationId = "qingzhou:main-city";

  performAction(world, first.id, "residence-socialize");
  runUntilIdle(world, first.id);

  // Should have grown affinity with second (both at main-city)
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link, "Should have social link after residence-socialize with nearby cultivator");
  assert.ok(link.affinity >= AFFINITY_GAINS.residenceSocialize);
});
