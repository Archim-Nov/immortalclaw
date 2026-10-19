import assert from "node:assert/strict";
import test from "node:test";
import { advanceWorld, createSeedWorld, getCultivatorState, performAction } from "./index.js";
import { getAllEnemyConfigs, pickDungeonGuardianBuildId } from "./encounters/index.js";
import type { DungeonExpeditionReport } from "./model.js";

const CULTIVATOR_ID = "yun-zhong-he";

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function englishFoeNames(): string[] {
  return getAllEnemyConfigs()
    .map((config) => config.name)
    .filter((name) => /[A-Za-z]/u.test(name));
}

function assertNoEnglishFoe(text: string, label: string): void {
  for (const name of englishFoeNames()) {
    assert.equal(text.includes(name), false, `${label} still names ${name}: ${text}`);
  }
  assert.equal(/\bHeavy Warden\b/u.test(text), false, text);
  assert.equal(/\bGuardian\b/u.test(text), false, text);
}

function placeAtJiaGate(tick: number) {
  const world = createSeedWorld();
  world.tick = tick;
  const cultivator = world.cultivators[CULTIVATOR_ID]!;
  cultivator.realm = "金丹";
  cultivator.realmLevel = 9;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress["甲"].highestClearedRank = 3;
  cultivator.maxQi = 8000;
  cultivator.qi = 8000;
  cultivator.maxSpiritualPower = 8000;
  cultivator.spiritualPower = 8000;
  cultivator.injuryTicksRemaining = 0;
  cultivator.travelNotes = [];
  cultivator.activeJobId = null;
  return { world, cultivator };
}

function heavyGuardianTick(): number {
  for (let tick = 0; tick < 40; tick += 1) {
    const seed = hashString(`${tick}:${CULTIVATOR_ID}:guardian-encounter:甲:4`);
    if (pickDungeonGuardianBuildId(seed) === "dungeon-guardian-heavy") return tick;
  }
  throw new Error("no tick selects Heavy Warden");
}

test("单独守关的见闻和战报写重压守卫", () => {
  const { world, cultivator } = placeAtJiaGate(heavyGuardianTick());
  const started = performAction(world, CULTIVATOR_ID, "challenge-guardian:rank-4");
  assert.equal(started.accepted, true);

  for (let step = 0; step < 20 && cultivator.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
  assert.equal(cultivator.activeJobId, null);

  const note = (cultivator.travelNotes ?? []).find((entry) => entry.title.includes("过了手"));
  assert.ok(note, (cultivator.travelNotes ?? []).map((entry) => entry.title).join(" | "));
  assert.equal(note.title, "与重压守卫过了手");
  assert.match(note.detail, /云中鹤与重压守卫过了/);
  assertNoEnglishFoe(`${note.title}\n${note.detail}`, "diary");

  const state = getCultivatorState(world, CULTIVATOR_ID);
  const combat = state.recentCombats[0];
  assert.ok(combat);
  assert.equal(combat.enemyName, "重压守卫");
  assertNoEnglishFoe(`${combat.enemyName}\n${combat.summary}`, "combat");
  const shown = state.travelogue.notes.map((entry) => `${entry.title} ${entry.detail}`).join("\n");
  assert.match(shown, /与重压守卫过了手/);
  assertNoEnglishFoe(shown, "travelogue");
});

test("甲级四层远征的见闻写重压守卫，战报仍写重压守卫·魂灯", () => {
  const seen: string[] = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { world, cultivator } = placeAtJiaGate(attempt * 5);
    const started = performAction(world, CULTIVATOR_ID, "enter-dungeon:rank-4:aggressive");
    assert.equal(started.accepted, true);

    let fight: { title: string; detail: string } | null = null;
    for (let step = 0; step < 90 && cultivator.activeJobId; step += 1) {
      advanceWorld(world, 1);
      fight = (cultivator.travelNotes ?? []).find((entry) => entry.title.includes("过了手")) ?? null;
      if (fight) break;
    }
    if (!fight) {
      seen.push(`tick ${attempt * 5}: no fight`);
      continue;
    }
    assertNoEnglishFoe(`${fight.title}\n${fight.detail}`, "expedition diary");
    if (!fight.title.includes("重压守卫")) {
      seen.push(fight.title);
      continue;
    }

    const foughtNow = [
      ...(world.dungeonExpeditions[CULTIVATOR_ID]?.combatRounds ?? []),
      ...(world.dungeonExpeditionReports[CULTIVATOR_ID]?.combatRounds ?? []),
    ].map((round) => round.enemyName).join("\n");
    assert.match(foughtNow, /重压守卫/);
    assert.match(foughtNow, /重压守卫·魂灯/);
    assert.equal(/[A-Za-z]/u.test(foughtNow), false, foughtNow);

    for (let step = 0; step < 80 && cultivator.activeJobId; step += 1) {
      advanceWorld(world, 1);
    }

    const state = getCultivatorState(world, CULTIVATOR_ID);
    const notes = state.travelogue.notes.map((entry) => `${entry.title} ${entry.detail}`).join("\n");
    assert.match(notes, /与重压守卫过了手/);
    assert.match(notes, /与重压守卫过了/);
    assertNoEnglishFoe(notes, "return travelogue");

    const report = state.dungeonExpedition?.lastReport as DungeonExpeditionReport | null | undefined;
    if (report) {
      const kept = (report.combatRounds ?? []).map((round) => round.enemyName).join("\n");
      assert.equal(/[A-Za-z]/u.test(`${report.summary}\n${kept}`), false, report.summary);
      assertNoEnglishFoe(`${report.summary}\n${kept}`, "report");
    }
    const combatNames = state.recentCombats.map((combat) => `${combat.enemyName} ${combat.summary}`).join("\n");
    assertNoEnglishFoe(combatNames, "recent combats");
    return;
  }
  assert.fail(`甲级四层没有碰上重压守卫。见到的是：${seen.join("；")}`);
});
