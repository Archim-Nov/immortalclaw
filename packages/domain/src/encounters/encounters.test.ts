import { describe, test } from "node:test";
import * as assert from "node:assert/strict";
import {
  getAllEnemyConfigs,
  getEnemyConfig,
  getEnemyConfigsByTag,
  getAllEncounterBuilds,
  getEncounterBuild,
  getEncounterBuildsByFamily,
  getEncounterBuildsBySource,
  getEncounterBuildsByTag,
  pickDungeonGuardianBuildId,
  pickWildernessCombatBuildId,
} from "./index.js";

describe("enemy config registry", () => {
  test("all enemy configs are readable and have unique ids", () => {
    const configs = getAllEnemyConfigs();
    assert.ok(configs.length >= 29, `expected >=29 configs, got ${configs.length}`);
    const ids = new Set(configs.map((c) => c.id));
    assert.equal(ids.size, configs.length, "duplicate enemy config ids found");
    for (const config of configs) {
      assert.ok(config.name.length > 0, `empty name for ${config.id}`);
      assert.ok(config.nameCn.length > 0, `empty nameCn for ${config.id}`);
      assert.ok(config.contextTags.length > 0, `no contextTags for ${config.id}`);
      assert.ok(config.stylePreference.length > 0, `no stylePreference for ${config.id}`);
      assert.ok(config.maxRounds > 0, `invalid maxRounds for ${config.id}`);
      const fetched = getEnemyConfig(config.id);
      assert.deepEqual(fetched, config);
    }
  });

  test("context tag filtering returns correct results", () => {
    const wilderness = getEnemyConfigsByTag("wilderness");
    assert.ok(wilderness.length >= 9);
    for (const c of wilderness) {
      assert.ok(c.contextTags.includes("wilderness"), `${c.id} missing wilderness tag`);
    }

    const guardian = getEnemyConfigsByTag("guardian");
    assert.ok(guardian.length >= 20);
    for (const c of guardian) {
      assert.ok(c.contextTags.includes("guardian"), `${c.id} missing guardian tag`);
    }
  });
});

describe("encounter build registry", () => {
  test("all encounter builds are readable and have unique ids", () => {
    const builds = getAllEncounterBuilds();
    assert.ok(builds.length >= 30, `expected >=30 builds, got ${builds.length}`);
    const ids = new Set(builds.map((b) => b.id));
    assert.equal(ids.size, builds.length, "duplicate encounter build ids found");
    for (const build of builds) {
      assert.ok(build.name.length > 0, `empty name for ${build.id}`);
      assert.ok(build.enemyConfigIds.length > 0, `no enemyConfigIds for ${build.id}`);
      const fetched = getEncounterBuild(build.id);
      assert.deepEqual(fetched, build);
    }
  });

  test("every build references existing enemy configs", () => {
    for (const build of getAllEncounterBuilds()) {
      for (const enemyId of build.enemyConfigIds) {
        assert.ok(
          getEnemyConfig(enemyId),
          `enemy config ${enemyId} not found for build ${build.id}`,
        );
      }
    }
  });

  test("battle source kind distinguishes pve-event and pve-direct", () => {
    const direct = getEncounterBuildsBySource("pve-direct");
    const event = getEncounterBuildsBySource("pve-event");
    assert.ok(direct.length >= 11, `expected >=11 pve-direct, got ${direct.length}`);
    assert.ok(event.length >= 19, `expected >=19 pve-event, got ${event.length}`);
    for (const b of direct) {
      assert.equal(b.battleSourceKind, "pve-direct");
    }
    for (const b of event) {
      assert.equal(b.battleSourceKind, "pve-event");
    }
  });

  test("encounter family grouping works", () => {
    const heavyBuilds = getEncounterBuildsByFamily("dungeon-guardian-heavy");
    assert.ok(heavyBuilds.length >= 4, `expected >=4 heavy builds, got ${heavyBuilds.length}`);
    for (const b of heavyBuilds) {
      assert.equal(b.encounterFamily, "dungeon-guardian-heavy");
    }
  });

  test("encounter tag filtering works", () => {
    const dungeonBuilds = getEncounterBuildsByTag("dungeon");
    assert.ok(dungeonBuilds.length >= 20, `expected >=20 dungeon builds, got ${dungeonBuilds.length}`);
    for (const b of dungeonBuilds) {
      assert.ok(b.contextTags.includes("dungeon"), `${b.id} missing dungeon tag`);
    }
  });
});

describe("encounter picker functions", () => {
  test("pickWildernessCombatBuildId returns valid builds for various seeds", () => {
    for (let seed = 0; seed < 20; seed++) {
      const id = pickWildernessCombatBuildId(seed);
      assert.ok(getEncounterBuild(id), `wilderness build ${id} not found for seed ${seed}`);
    }
  });

  test("pickDungeonGuardianBuildId returns valid builds for various seeds", () => {
    for (let seed = 0; seed < 20; seed++) {
      const id = pickDungeonGuardianBuildId(seed);
      assert.ok(getEncounterBuild(id), `guardian build ${id} not found for seed ${seed}`);
    }
  });

  test("pickers distribute across all available options", () => {
    const wildIds = new Set<string>();
    const guardIds = new Set<string>();
    for (let seed = 0; seed < 100; seed++) {
      wildIds.add(pickWildernessCombatBuildId(seed));
      guardIds.add(pickDungeonGuardianBuildId(seed));
    }
    assert.ok(wildIds.size >= 6, `expected >=6 unique wilderness picks, got ${wildIds.size}`);
    assert.ok(guardIds.size >= 5, `expected >=5 unique guardian picks, got ${guardIds.size}`);
  });

  test("grade-tiered guardian builds cover all grades", () => {
    for (const family of ["heavy", "spell", "seal", "swift", "drain"] as const) {
      for (const grade of ["bing", "yi", "jia"] as const) {
        const buildId = `dungeon-guardian-${family}-${grade}`;
        const build = getEncounterBuild(buildId as import("./catalog.js").EncounterBuildId);
        assert.ok(build, `grade-tiered build ${buildId} not found`);
        for (const enemyId of build.enemyConfigIds) {
          assert.ok(getEnemyConfig(enemyId), `enemy ${enemyId} for build ${buildId} not found`);
        }
      }
    }
  });
});
