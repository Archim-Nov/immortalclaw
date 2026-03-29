import assert from "node:assert/strict";
import test from "node:test";
import { createSeedWorld, saveCultivationRegistration, type CultivationRegistrationRecord } from "../../domain/src/runtime.js";
import { createInMemoryWorldRepository } from "./in-memory-world-repository.js";

function createRegistrationRecord(): CultivationRegistrationRecord {
  return {
    record_type: "registration_record",
    questionnaire_version: "immortal-claw-oc-v1",
    answers: {
      Q1: "A",
      Q2: "B",
      Q3: "C",
      Q4: "D",
      Q5: "A",
      Q6: "B",
      Q7: "C",
      Q8: "D",
      Q9: "A",
      Q10: "B",
      Q11: "C",
      Q12: "D",
      Q13: "A",
      Q14: "B",
      Q15: "C",
      Q16: "D",
      Q17: "A",
      Q18: "B",
    },
    result: {
      core_temperament: "Calm strategist",
      secondary_temperament: "Patient observer",
      behavior_aspect: "Water / Observation",
      cultivation_motive: "Seek truth",
      five_element_scores: {
        metal: 5,
        wood: 6,
        water: 11,
        fire: 3,
        earth: 8,
      },
      spirit_root_result: "Water single root",
      confidence: {
        core: "high",
        behavior: "high",
        motive: "medium",
        overall: "high",
      },
    },
    summary: "A cautious cultivator with clear water dominance.",
  };
}

test("readWorld seeds state and getWorldMetadata reflects the current tick", async () => {
  const repository = createInMemoryWorldRepository();

  const world = await repository.readWorld();
  const metadata = await repository.getWorldMetadata();

  assert.equal(metadata.tick, world.tick);
  assert.equal(metadata.updatedAt, world.updatedAt);
});

test("transactWorld persists world mutations while returning a cloned result", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const mutatedCultivator = await repository.transactWorld((draftWorld) => {
    draftWorld.cultivators[cultivatorId].spiritStones += 42;
    return draftWorld.cultivators[cultivatorId];
  });

  mutatedCultivator.spiritStones = -1;

  const refreshedWorld = await repository.readWorld();
  assert.equal(refreshedWorld.cultivators[cultivatorId].spiritStones, world.cultivators[cultivatorId].spiritStones + 42);
  assert.notEqual(refreshedWorld.cultivators[cultivatorId].spiritStones, mutatedCultivator.spiritStones);
});

test("auth methods persist profiles and credentials", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const profile = await repository.saveAgentProfile({
    agentId: "agent-profile-test",
    name: "Su Mingyue",
    selectedCultivatorId: cultivatorId,
    origin: "Frost Harbor",
  });
  const issued = await repository.issueAgentCredential(profile.agentId);
  const authenticated = await repository.authenticateAgent(issued.credential);
  const reset = await repository.resetAgentCredential(profile.agentId, issued.credential);
  const stale = await repository.authenticateAgent(issued.credential);
  const refreshed = await repository.authenticateAgent(reset.credential);

  assert.equal(profile.agentId, "agent-profile-test");
  assert.equal(authenticated?.agentId, profile.agentId);
  assert.equal(reset.agentId, profile.agentId);
  assert.equal(stale, null);
  assert.equal(refreshed?.agentId, profile.agentId);
});

test("world methods expose action, registration, and tick behavior", async () => {
  const repository = createInMemoryWorldRepository();
  const world = await repository.readWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  const actions = await repository.listAvailableActions(cultivatorId);
  const action = actions[0];

  assert.ok(action);

  const actionResult = await repository.performAction(cultivatorId, action.actionId);
  const summary = await repository.advanceWorld(1);
  const latestTickRun = await repository.getLatestTickRun();

  await repository.transactWorld((draftWorld) => {
    saveCultivationRegistration(draftWorld, cultivatorId, createRegistrationRecord(), "agent-1");
    return null;
  });

  const registration = await repository.getCultivationRegistration(cultivatorId);

  assert.equal(actionResult.cultivatorId, cultivatorId);
  assert.equal(latestTickRun?.tick, summary.tick);
  assert.ok(registration);
});

test("legacy world input is hydrated with migrated P3 persistence defaults", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  delete (world as unknown as Record<string, unknown>).sects;
  delete (world as unknown as Record<string, unknown>).wildernessLayers;
  delete (world as unknown as Record<string, unknown>).wildernessProgress;
  delete (world as unknown as Record<string, unknown>).dungeonExpeditions;
  delete (world as unknown as Record<string, unknown>).dungeonExpeditionReports;
  delete (world as unknown as Record<string, unknown>).guixuNodes;
  delete (world as unknown as Record<string, unknown>).guixuProgress;
  delete (world as unknown as Record<string, unknown>).factionWars;
  delete (world as unknown as Record<string, unknown>).itemDefinitions;
  delete (world.cultivators[cultivatorId] as unknown as Record<string, unknown>).breakthroughRecords;
  delete (world.cultivators[cultivatorId] as unknown as Record<string, unknown>).dungeonProgress;
  world.cultivators[cultivatorId]!.realmProgress = 145;

  world.cultivators[cultivatorId]!.inventory = ({
    "healing-pill": 1,
    "qi-pill": 0,
    "ward-talisman": 0,
    "spirit-ore": 0,
    "ruin-fragment": 0,
    "beast-core": 0,
    "sword-manual": 2,
    "alchemy-manual": 1,
    "array-manual": 1,
  } as unknown) as typeof world.cultivators[typeof cultivatorId]["inventory"];

  const repository = createInMemoryWorldRepository({ world });
  const hydrated = await repository.readWorld();

  assert.deepEqual(hydrated.sects, {});
  assert.ok(hydrated.wildernessLayers["eight-wastes-threshold"]);
  assert.deepEqual((hydrated as typeof hydrated & { dungeonExpeditions?: Record<string, unknown> }).dungeonExpeditions, {});
  assert.deepEqual((hydrated as typeof hydrated & { dungeonExpeditionReports?: Record<string, unknown> }).dungeonExpeditionReports, {});
  assert.ok(hydrated.guixuNodes["guixu-threshold-gate"]);
  assert.ok(hydrated.factionWars["war-qingzhou-frontier"]);
  assert.ok(hydrated.itemDefinitions["legendary-artifact"]);
  assert.ok(hydrated.itemDefinitions["qi-common"]);
  assert.ok(hydrated.itemDefinitions["foundation-major-special"]);
  assert.ok(hydrated.itemDefinitions["healing-pill"].tags.includes("pill"));
  assert.equal(hydrated.itemDefinitions["eight-wastes-pass"].use.kind, "ticket");
  assert.deepEqual(hydrated.itemDefinitions["eight-wastes-pass"].use.ticketTargets, ["eight-wastes-threshold"]);
  assert.equal(hydrated.cultivators[cultivatorId]!.inventory["eight-wastes-pass"], 0);
  assert.deepEqual(hydrated.cultivators[cultivatorId]!.breakthroughRecords, []);
  assert.deepEqual(hydrated.cultivators[cultivatorId]!.dungeonProgress, {
    丙: { highestClearedRank: 0 },
    乙: { highestClearedRank: 0 },
    甲: { highestClearedRank: 0 },
  });
  assert.equal(hydrated.cultivators[cultivatorId]!.realmProgress, 100);
  assert.equal("sword-manual" in (hydrated.itemDefinitions as Record<string, unknown>), false);
  assert.equal("alchemy-manual" in (hydrated.itemDefinitions as Record<string, unknown>), false);
  assert.equal("array-manual" in (hydrated.itemDefinitions as Record<string, unknown>), false);
  assert.equal("sword-manual" in (hydrated.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
  assert.equal("alchemy-manual" in (hydrated.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
  assert.equal("array-manual" in (hydrated.cultivators[cultivatorId]!.inventory as Record<string, number>), false);
});

test("legacy dungeon expedition snapshots backfill flavor arrays", async () => {
  const world = createSeedWorld();
  const cultivatorId = Object.keys(world.cultivators)[0];

  if (!cultivatorId) {
    throw new Error("Seed world should include at least one cultivator.");
  }

  world.dungeonExpeditions = ({
    [cultivatorId]: {
      cultivatorId,
      jobId: "legacy-expedition-job",
      locationId: "qingzhou:dungeon-c",
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      startedAtTick: 12,
      stepIndex: 1,
      maxSteps: 10,
      nextResolutionTick: 15,
      searchSteps: 1,
      guardianSteps: 0,
      primaryMaterialCount: 2,
      secondaryDrops: { "ruin-fragment": 1 },
      spiritStoneGain: 18,
      realmProgressGain: 4,
      unlockedNextRank: false,
      lastResolvedAction: "search",
    },
  } as unknown) as typeof world.dungeonExpeditions;
  world.dungeonExpeditionReports = ({
    [cultivatorId]: {
      cultivatorId,
      grade: "丙",
      targetRank: 1,
      policy: "balanced",
      outcome: "completed",
      startedAtTick: 12,
      endedAtTick: 42,
      stepsResolved: 10,
      primaryMaterial: {
        itemId: "qi-common",
        count: 3,
      },
      secondaryDrops: { "ruin-fragment": 2 },
      spiritStoneGain: 60,
      realmProgressGain: 12,
      unlockedNextRank: true,
      returnLocationId: "qingzhou:main-city",
      summary: "Legacy expedition summary.",
    },
  } as unknown) as typeof world.dungeonExpeditionReports;

  const repository = createInMemoryWorldRepository({ world });
  const hydrated = await repository.readWorld();

  assert.deepEqual(hydrated.dungeonExpeditions[cultivatorId]?.flavorEventTitles, []);
  assert.deepEqual(hydrated.dungeonExpeditionReports[cultivatorId]?.flavorEvents, []);
});
