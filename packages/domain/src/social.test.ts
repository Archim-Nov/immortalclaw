import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceWorld,
  createSeedWorld,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import { actionFailureBody } from "./gameplay-error.js";
import {
  AFFINITY_GAINS,
  AFFINITY_THRESHOLDS,
  CHAT_UP_COOLDOWN_TICKS,
  getAffinityLevel,
  getDaoCompanionId,
  getPartyOf,
  getPartyPartner,
  getSocialLink,
  getSocialLinksView,
  hasDaoCompanion,
  isInParty,
} from "./social.js";

function chatUpTimes(
  world: ReturnType<typeof createSeedWorld>,
  fromId: string,
  toId: string,
  times: number,
) {
  for (let i = 0; i < times; i += 1) {
    const link = getSocialLink(world, fromId, toId);
    const lastChat = link?.lastChatUpTick;
    if (typeof lastChat === "number" && world.tick - lastChat < CHAT_UP_COOLDOWN_TICKS) {
      advanceWorld(world, CHAT_UP_COOLDOWN_TICKS - (world.tick - lastChat));
    }
    performAction(world, fromId, `chat-up:${toId}`);
  }
}

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
  second.locationId = "yangzhou:dungeon-b";

  assert.throws(
    () => performAction(world, first.id, `chat-up:${second.id}`),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      const body = actionFailureBody(error);
      assert.equal(body.error, "要跟对方在同一地点才能搭讪。");
      assert.equal(body.summary, body.error);
      assert.equal(/[A-Za-z]/u.test(body.summary), false, body.summary);
      assert.equal((error as { status?: number }).status, 409);
      return true;
    },
  );

  assert.throws(
    () => performAction(world, first.id, `chat-up:${first.id}`),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      const body = actionFailureBody(error);
      assert.equal(body.error, "不能搭讪自己。");
      assert.equal(body.summary, body.error);
      assert.equal(/[A-Za-z]/u.test(body.summary), false, body.summary);
      return true;
    },
  );
});

test("voice-transmit requires 朋友 level relationship", () => {
  const { world, first, second } = createTwoCultivators();

  // No existing link — should fail
  assert.throws(
    () => performAction(world, first.id, `voice-transmit:${second.id}`),
    /朋友/,
  );

  // Build affinity to 朋友 level (60), waiting out the chat-up cooldown between attempts.
  chatUpTimes(world, first.id, second.id, 6);
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link);
  assert.ok(link.affinity >= AFFINITY_THRESHOLDS["朋友"]);

  // Now voice-transmit should work
  const result = performAction(world, first.id, `voice-transmit:${second.id}`);
  assert.equal(result.accepted, true);
});

test("voice-transmit works from any location", () => {
  const { world, first, second } = createTwoCultivators();

  chatUpTimes(world, first.id, second.id, 6);

  // Move first to a different location
  first.locationId = "yangzhou:main-city";

  const result = performAction(world, first.id, `voice-transmit:${second.id}`);
  assert.equal(result.accepted, true);
});

test("dao companion proposal-accept flow creates mutual bond", () => {
  const { world, first, second } = createTwoCultivators();

  chatUpTimes(world, first.id, second.id, 12);
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link && link.affinity >= AFFINITY_THRESHOLDS["好友"]);

  // Propose
  const proposeResult = performAction(world, first.id, `propose-dao-companion:${second.id}`);
  assert.equal(proposeResult.accepted, true);
  assert.match(proposeResult.summary, /道侣之约/);
  assert.doesNotMatch(proposeResult.summary, /tick|proposed/i);
  const proposalLetter = (world.messages ?? []).find((message) => message.subject.includes("道侣"));
  assert.match(proposalLetter?.content ?? "", /时辰/);
  assert.doesNotMatch(proposalLetter?.content ?? "", /tick/);

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

  chatUpTimes(world, first.id, second.id, 12);

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

  chatUpTimes(world, first.id, second.id, 5);

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

  // Each fresh chat-up gives 10 affinity. Repeats wait out the cooldown.
  // 认识: 0, 熟识: 20, 朋友: 60, 好友: 120, 挚友: 200
  chatUpTimes(world, first.id, second.id, 2);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "熟识");

  chatUpTimes(world, first.id, second.id, 4);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "朋友");

  chatUpTimes(world, first.id, second.id, 6);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "好友");

  chatUpTimes(world, first.id, second.id, 8);
  assert.equal(getAffinityLevel(getSocialLink(world, first.id, second.id)!.affinity), "挚友");
});

test("chat-up and voice-transmit actions appear in available actions", () => {
  const { world, first, second } = createTwoCultivators();

  // At same location — chat-up should appear
  const actions1 = listAvailableActions(world, first.id).map((a) => a.actionId);
  assert.ok(actions1.some((a) => a.startsWith("chat-up:")), "Expected chat-up action when others are at same location");

  chatUpTimes(world, first.id, second.id, 6);

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

// ---- Party System Tests ----

test("party invite-accept flow creates a party", () => {
  const { world, first, second } = createTwoCultivators();

  // Need at least 认识 level (any social link with affinity >= 0)
  performAction(world, first.id, `chat-up:${second.id}`);

  // Invite
  const inviteResult = performAction(world, first.id, `party-invite:${second.id}`);
  assert.equal(inviteResult.accepted, true);

  // Find invitation
  const invitations = Object.values(world.partyInvitations);
  assert.equal(invitations.length, 1);
  const inv = invitations[0]!;

  // Accept
  const acceptResult = performAction(world, second.id, `accept-party:${inv.id}`);
  assert.equal(acceptResult.accepted, true);

  // Both should be in the same party
  assert.equal(isInParty(world, first.id), true);
  assert.equal(isInParty(world, second.id), true);
  const party = getPartyOf(world, first.id);
  assert.ok(party);
  assert.equal(party.leaderId, first.id);
  assert.equal(getPartyPartner(world, first.id)?.id, second.id);
  assert.equal(getPartyPartner(world, second.id)?.id, first.id);
});

test("party invite requires social link", () => {
  const { world, first, second } = createTwoCultivators();

  // No social link yet — should fail because 认识 requires a social link
  assert.throws(
    () => performAction(world, first.id, `party-invite:${second.id}`),
    /认识/,
  );
});

test("party invite requires same location", () => {
  const { world, first, second } = createTwoCultivators();
  performAction(world, first.id, `chat-up:${second.id}`);
  second.locationId = "yangzhou:main-city";

  assert.throws(
    () => performAction(world, first.id, `party-invite:${second.id}`),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      const body = actionFailureBody(error);
      assert.equal(body.error, "要跟对方在同一地点才能组队。");
      assert.equal(body.summary, body.error);
      assert.equal(/[A-Za-z]/u.test(body.summary), false, body.summary);
      return true;
    },
  );
});

test("disband party removes it", () => {
  const { world, first, second } = createTwoCultivators();
  performAction(world, first.id, `chat-up:${second.id}`);
  const inv = performAction(world, first.id, `party-invite:${second.id}`);
  const invId = Object.keys(world.partyInvitations)[0]!;
  performAction(world, second.id, `accept-party:${invId}`);

  assert.equal(isInParty(world, first.id), true);
  const disbandResult = performAction(world, first.id, "disband-party");
  assert.equal(disbandResult.accepted, true);
  assert.equal(isInParty(world, first.id), false);
  assert.equal(isInParty(world, second.id), false);
});

test("party actions (invite, accept, disband) are allowed while injured", () => {
  const { world, first, second } = createTwoCultivators();
  performAction(world, first.id, `chat-up:${second.id}`);
  first.injuryTicksRemaining = 5;

  const inviteResult = performAction(world, first.id, `party-invite:${second.id}`);
  assert.equal(inviteResult.accepted, true);
});

test("party-invite action appears in available actions after chat-up", () => {
  const { world, first, second } = createTwoCultivators();
  performAction(world, first.id, `chat-up:${second.id}`);

  const actions = listAvailableActions(world, first.id).map((a) => a.actionId);
  assert.ok(actions.some((a) => a.startsWith("party-invite:")), "Expected party-invite action for 认识+ cultivators");
});

test("disband-party action appears when in a party", () => {
  const { world, first, second } = createTwoCultivators();
  performAction(world, first.id, `chat-up:${second.id}`);
  performAction(world, first.id, `party-invite:${second.id}`);
  const invId = Object.keys(world.partyInvitations)[0]!;
  performAction(world, second.id, `accept-party:${invId}`);

  const actions = listAvailableActions(world, first.id).map((a) => a.actionId);
  assert.ok(actions.includes("disband-party"), "Expected disband-party action when in a party");
});
