import assert from "node:assert/strict";
import test from "node:test";
import type { CultivationRegistrationRecord } from "./index.js";
import {
  advanceWorld,
  createSeedWorld,
  getAgentBindingInfo,
  getCultivationRegistration,
  getMessages,
  getCultivatorState,
  getStrategySnapshot,
  performAction,
  saveCultivationRegistration,
  sendDirectMessage,
  syncCultivatorFromPersona,
} from "./index.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record" as const,
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "C",
      Q2: "C",
      Q3: "C",
      Q4: "C",
      Q5: "C",
      Q6: "C",
      Q7: "C",
      Q8: "A",
      Q9: "C",
      Q10: "C",
      Q11: "C",
      Q12: "C",
      Q13: "B",
      Q14: "B",
      Q15: "B",
      Q16: "B",
      Q17: "C",
      Q18: "B",
    },
    result: {
      core_temperament: "潜渊型",
      secondary_temperament: "观澜型",
      behavior_aspect: "水土 / 潜守",
      cultivation_motive: "求真知",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 9,
      },
      spirit_root_result: "水土双灵根",
      confidence: {
        core: "high" as const,
        behavior: "high" as const,
        motive: "medium" as const,
        overall: "high" as const,
      },
    },
    summary: "其心性偏潜守，行路以观势为先，求知之念最重。",
  };
}

function createCultivationFocusedRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament: "\u5411\u8363\u578b",
      secondary_temperament: "\u70bd\u5fc3\u578b",
      behavior_aspect: "\u6728\u706b / \u8363\u7130",
      cultivation_motive: "\u8bc1\u5927\u9053",
      five_element_scores: {
        metal: 3,
        wood: 11,
        water: 4,
        fire: 10,
        earth: 5,
      },
      spirit_root_result: "\u6728\u706b\u53cc\u7075\u6839",
    },
    summary: "\u751f\u957f\u4e0e\u6267\u884c\u5fc3\u8f83\u5f3a\uff0c\u9002\u5408\u7a33\u5b9a\u4fee\u70bc\u4e0e\u7834\u5883\u3002",
  };
}

function createSupportTaskRegistrationRecord(): CultivationRegistrationRecord {
  const record = createRegistrationRecord();
  return {
    ...record,
    result: {
      ...record.result,
      core_temperament: "\u9547\u5cb3\u578b",
      secondary_temperament: "\u5b88\u6212\u578b",
      behavior_aspect: "\u571f / \u9547\u6301",
      cultivation_motive: "\u6d4e\u4e16\u4eba",
      five_element_scores: {
        metal: 8,
        wood: 4,
        water: 6,
        fire: 3,
        earth: 12,
      },
      spirit_root_result: "\u571f\u5355\u7075\u6839",
    },
    summary: "\u91cd\u6839\u57fa\u4e0e\u627f\u538b\uff0c\u9002\u5408\u7a33\u5b9a\u5de5\u4f5c\u4e0e\u5929\u52ab\u51c6\u5907\u3002",
  };
}

test("cultivation action creates a job and advances realm progress after ticks", () => {
  const world = createSeedWorld();

  const result = performAction(world, "yun-zhong-he", "cultivate");
  assert.equal(result.accepted, true);
  assert.ok(result.job);

  const before = getCultivatorState(world, "yun-zhong-he");
  assert.equal(before.currentJob?.actionId, "cultivate");

  const tickSummary = advanceWorld(world, 4);
  assert.equal(tickSummary.completedJobs.length, 1);

  const after = getCultivatorState(world, "yun-zhong-he");
  assert.equal(after.currentJob, null);
  assert.ok(after.cultivator.realmProgress > before.cultivator.realmProgress);
});

test("joining the sect updates sect state immediately", () => {
  const world = createSeedWorld();

  performAction(world, "yun-zhong-he", "travel-sect-gate");
  advanceWorld(world, 1);
  const result = performAction(world, "yun-zhong-he", "join-sect");

  assert.equal(result.accepted, true);
  const state = getCultivatorState(world, "yun-zhong-he");
  assert.ok(state.sect?.name);
});

test("agent persona sync auto-provisions and reuses a single character", () => {
  const world = createSeedWorld();

  const first = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
    startingPath: "alchemy",
  });
  const second = syncCultivatorFromPersona(world, {
    agentId: "openclaw-main",
    name: "Liu Ruyan",
    genderPresentation: "female",
    pronouns: "she/her",
    temperament: "calm",
    startingPath: "sword",
  });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.selectedCultivatorId, second.selectedCultivatorId);
  assert.equal(
    getAgentBindingInfo(world, "openclaw-main").selectedCultivatorId,
    first.selectedCultivatorId,
  );

  const state = getCultivatorState(world, first.selectedCultivatorId);
  assert.equal(state.cultivator.name, "Liu Ruyan");
  assert.equal(state.cultivator.pronouns, "she/her");
  assert.equal(state.cultivator.temperament, "calm");
});

test("studying a manual adds technique and strategy recommends safe progression", () => {
  const world = createSeedWorld();
  const before = getCultivatorState(world, "yun-zhong-he");
  const beforeManualCount = before.inventory["sword-manual"];
  const beforeTechniqueCount = before.cultivation.techniques.length;

  const act = performAction(world, "yun-zhong-he", "study-sword-manual");
  assert.equal(act.accepted, true);

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(beforeManualCount, 1);
  assert.equal(state.inventory["sword-manual"], 0);
  assert.ok(state.cultivation.techniques.length >= beforeTechniqueCount);
  assert.ok(state.statusEffects.some((effect) => effect.id === "insight"));

  const strategy = getStrategySnapshot(world, "yun-zhong-he");
  assert.equal(strategy.cultivatorId, "yun-zhong-he");
  assert.ok(strategy.recommendedSequence.length > 0);
});

test("registration records save and surface through cultivator state", () => {
  const world = createSeedWorld();

  const saved = saveCultivationRegistration(
    world,
    "yun-zhong-he",
    createRegistrationRecord(),
    "openclaw-main",
  );

  assert.equal(saved.cultivator_id, "yun-zhong-he");
  assert.equal(saved.agent_id, "openclaw-main");
  assert.ok(saved.saved_at);

  const stored = getCultivationRegistration(world, "yun-zhong-he");
  assert.equal(stored?.saved_at, saved.saved_at);
  assert.equal(stored?.result.core_temperament, "潜渊型");
  assert.equal(stored?.result.behavior_aspect, "水土 / 潜守");
  assert.equal(stored?.result.core_temperament_id, "qian_yuan");
  assert.equal(stored?.result.cultivation_motive_id, "seek-truth");

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.deepEqual(state.registration, {
    saved_at: saved.saved_at ?? null,
    label_locale: "zh-CN",
    core_temperament_id: "qian_yuan",
    core_temperament: "潜渊型",
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "观澜型",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "水土 / 潜守",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "求真知",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "水土双灵根",
    overall_confidence: "high",
  });
});

test("v2 registration records preserve explicit taxonomy IDs through save and read", () => {
  const world = createSeedWorld();

  const v2Record: CultivationRegistrationRecord = {
    record_type: "registration_record" as const,
    questionnaire_version: "immortal-claw-oc-v2",
    answers: {
      Q1: "C", Q2: "C", Q3: "C", Q4: "C", Q5: "C", Q6: "C",
      Q7: "C", Q8: "A", Q9: "C", Q10: "C", Q11: "C", Q12: "C",
      Q13: "B", Q14: "B", Q15: "B", Q16: "B", Q17: "C", Q18: "B",
    },
    result: {
      label_locale: "en",
      core_temperament_id: "qian_yuan",
      core_temperament: "Calm strategist",
      secondary_temperament_id: "guan_lan",
      secondary_temperament: "Patient observer",
      behavior_aspect_id: "water-earth",
      behavior_aspect: "Water-Earth / Latent Guard",
      cultivation_motive_id: "seek-truth",
      cultivation_motive: "Seek truth",
      five_element_scores: { metal: 5, wood: 6, water: 11, fire: 3, earth: 9 },
      spirit_root_kind_id: "dual-root",
      spirit_root_result: "Water-Earth dual root",
      confidence: { core: "high" as const, behavior: "high" as const, motive: "medium" as const, overall: "high" as const },
    },
    summary: "A cautious cultivator whose water and earth tendencies stay closely paired.",
  };

  const saved = saveCultivationRegistration(world, "yun-zhong-he", v2Record, "openclaw-main");

  assert.equal(saved.result.core_temperament_id, "qian_yuan");
  assert.equal(saved.result.core_temperament, "Calm strategist");
  assert.equal(saved.result.spirit_root_kind_id, "dual-root");
  assert.equal(saved.result.spirit_root_result, "Water-Earth dual root");
  assert.equal(saved.result.label_locale, "en");

  const state = getCultivatorState(world, "yun-zhong-he");
  assert.deepEqual(state.registration, {
    saved_at: saved.saved_at ?? null,
    label_locale: "en",
    core_temperament_id: "qian_yuan",
    core_temperament: "Calm strategist",
    secondary_temperament_id: "guan_lan",
    secondary_temperament: "Patient observer",
    behavior_aspect_id: "water-earth",
    behavior_aspect: "Water-Earth / Latent Guard",
    cultivation_motive_id: "seek-truth",
    cultivation_motive: "Seek truth",
    spirit_root_kind_id: "dual-root",
    spirit_root_result: "Water-Earth dual root",
    overall_confidence: "high",
  });
});

test("registration effects surface and improve cultivation output", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createCultivationFocusedRegistrationRecord(),
    "openclaw-main",
  );

  performAction(baselineWorld, "yun-zhong-he", "cultivate");
  performAction(registeredWorld, "yun-zhong-he", "cultivate");

  advanceWorld(baselineWorld, 4);
  advanceWorld(registeredWorld, 4);

  const baselineState = getCultivatorState(baselineWorld, "yun-zhong-he");
  const registeredState = getCultivatorState(registeredWorld, "yun-zhong-he");

  assert.ok(registeredState.registrationEffects);
  assert.ok(registeredState.registrationEffects?.dominantElements.some((element) => element.id === "wood"));
  assert.ok(registeredState.registrationEffects?.modifiers.some((modifier) => modifier.source === "cultivation-motive"));
  assert.ok(registeredState.cultivator.realmProgress > baselineState.cultivator.realmProgress);
});

test("registration bonuses improve task rewards and tribulation support", () => {
  const baselineWorld = createSeedWorld();
  const registeredWorld = createSeedWorld();

  saveCultivationRegistration(
    registeredWorld,
    "yun-zhong-he",
    createSupportTaskRegistrationRecord(),
    "openclaw-main",
  );

  const baselineSupport = getCultivatorState(baselineWorld, "yun-zhong-he").tribulation.supportScore;
  const registeredSupport = getCultivatorState(registeredWorld, "yun-zhong-he").tribulation.supportScore;
  assert.ok(registeredSupport > baselineSupport);

  const baselineBefore = getCultivatorState(baselineWorld, "yun-zhong-he").cultivator.spiritStones;
  const registeredBefore = getCultivatorState(registeredWorld, "yun-zhong-he").cultivator.spiritStones;

  performAction(baselineWorld, "yun-zhong-he", "take-mortal-task");
  performAction(registeredWorld, "yun-zhong-he", "take-mortal-task");

  advanceWorld(baselineWorld, 2);
  advanceWorld(registeredWorld, 2);

  const baselineAfter = getCultivatorState(baselineWorld, "yun-zhong-he").cultivator.spiritStones;
  const registeredAfter = getCultivatorState(registeredWorld, "yun-zhong-he").cultivator.spiritStones;

  assert.ok((registeredAfter - registeredBefore) > (baselineAfter - baselineBefore));
});

test("direct messages are visible to both sender and recipient mailboxes", () => {
  const world = createSeedWorld();
  const sender = syncCultivatorFromPersona(world, {
    agentId: "openclaw-sender",
    name: "Su Mingyue",
    startingPath: "sword",
  });
  const recipient = syncCultivatorFromPersona(world, {
    agentId: "openclaw-recipient",
    name: "Li Aotian",
    startingPath: "alchemy",
  });

  const message = sendDirectMessage(
    world,
    sender.selectedCultivatorId,
    recipient.selectedCultivatorId,
    "Su Mingyue",
    "Private Telepathy",
    "Meet me at the sect gate before the next tick.",
  );

  const senderMessages = getMessages(world, sender.selectedCultivatorId);
  const recipientMessages = getMessages(world, recipient.selectedCultivatorId);

  assert.equal(message.fromCultivatorId, sender.selectedCultivatorId);
  assert.equal(message.toCultivatorId, recipient.selectedCultivatorId);
  assert.ok(senderMessages.some((entry) => entry.id === message.id));
  assert.ok(recipientMessages.some((entry) => entry.id === message.id));
});
