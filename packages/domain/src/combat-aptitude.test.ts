import assert from "node:assert/strict";
import test from "node:test";
import { grantCombatPractice, skillsForCultivator } from "./combat-skills.js";
import { fightDigestText, runPartyBattle, type BattleCombatant } from "./party-battle.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { Cultivator } from "./model.js";

function spawn(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string, temperament: string): Cultivator {
  const summary = syncCultivatorFromPersona(world, { agentId, name, temperament });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

test("a weapon-leaning cultivator and a root-leaning cultivator cast different skills", () => {
  const world = createSeedWorld();
  const weaponUser = spawn(world, "agent-aptitude-weapon", "沈砺", "刚猛");
  weaponUser.mainAttributeGrowth.tipu = (weaponUser.mainAttributeGrowth.tipu ?? 0) + 40;
  weaponUser.equippedWeaponLoadoutId = "starter-axe" as Cultivator["equippedWeaponLoadoutId"];
  weaponUser.equippedSpellLoadoutId = "starter-metal-edge" as Cultivator["equippedSpellLoadoutId"];

  const rootUser = spawn(world, "agent-aptitude-root", "青萝", "灵静");
  rootUser.mainAttributeGrowth.lingyuan = (rootUser.mainAttributeGrowth.lingyuan ?? 0) + 50;
  rootUser.equippedWeaponLoadoutId = "starter-fan" as Cultivator["equippedWeaponLoadoutId"];
  rootUser.equippedSpellLoadoutId = "starter-fire-blaze" as Cultivator["equippedSpellLoadoutId"];

  const weaponState = getCultivatorState(world, weaponUser.id);
  const rootState = getCultivatorState(world, rootUser.id);
  assert.equal(weaponState.combatProfile.combatLeaning?.id, "weapon");
  assert.equal(weaponState.combatProfile.combatLeaning?.label, "兵器偏");
  assert.match(weaponState.combatProfile.combatLeaning?.roleHint ?? "", /主攻|破法/);
  assert.equal(rootState.combatProfile.combatLeaning?.id, "spell");
  assert.equal(rootState.combatProfile.combatLeaning?.label, "法术偏");
  assert.match(rootState.combatProfile.combatLeaning?.roleHint ?? "", /护卫|辅助|控场/);

  const weaponNames = (weaponState.combatProfile.weaponSkills ?? []).map((skill) => skill.name);
  const rootSpellNames = (rootState.combatProfile.rootSkills ?? []).map((skill) => skill.name);
  assert.ok(weaponNames.includes("裂阵"));
  assert.equal((rootState.combatProfile.weaponSkills ?? []).some((skill) => skill.name === "裂阵"), false);
  assert.ok(rootSpellNames.includes("炽焰"));
  assert.equal((weaponState.combatProfile.rootSkills ?? []).some((skill) => skill.name === "炽焰"), false);

  const weaponIds = new Set([
    ...(weaponState.combatProfile.weaponSkills ?? []),
    ...(weaponState.combatProfile.rootSkills ?? []),
  ].map((skill) => skill.id));
  for (const skill of weaponState.combatProfile.availableSkills ?? []) {
    assert.ok(weaponIds.has(skill.id), skill.id);
    assert.ok(skill.pool === "weapon" || skill.pool === "root");
  }

  const weaponStrike = weaponState.combatProfile.weaponSkills?.find((skill) => skill.id === "basic-strike");
  const rootStrike = rootState.combatProfile.weaponSkills?.find((skill) => skill.id === "basic-strike");
  assert.ok(weaponStrike && rootStrike);
  assert.ok(weaponStrike.power > rootStrike.power);
  assert.equal(weaponStrike.aptitude, "favored");
  assert.equal(weaponStrike.aptitudeLabel, "顺手");
  assert.equal(rootStrike.aptitude, "off");
  assert.equal(rootStrike.poolLabel, "兵器");

  const weaponDaze = weaponState.combatProfile.rootSkills?.find((skill) => skill.id === "shared-daze");
  const rootDaze = rootState.combatProfile.rootSkills?.find((skill) => skill.id === "shared-daze");
  assert.ok(weaponDaze && rootDaze);
  assert.ok(rootDaze.power > weaponDaze.power);
  assert.ok(rootDaze.spiritCost < weaponDaze.spiritCost);
  assert.equal(rootDaze.aptitude, "favored");
  assert.equal(rootDaze.pool, "root");

  assert.equal(weaponState.combatProfile.partyRole?.label, "破法");
  assert.equal(rootState.combatProfile.partyRole?.label, "控场");
  const yun = getCultivatorState(world, "yun-zhong-he");
  assert.equal(yun.combatProfile.partyRole?.label, "破法");
  assert.ok(["weapon", "spell", "balanced"].includes(yun.combatProfile.combatLeaning?.id ?? ""));

  const readied = performAction(world, weaponUser.id, "equip-skill-slot:metal-edge-cut");
  assert.equal(readied.accepted, true);
  const mixed = getCultivatorState(world, weaponUser.id);
  assert.ok(mixed.combatProfile.equippedSkillIds?.includes("metal-edge-cut"));
  assert.match(mixed.combatProfile.loadoutGuidance ?? "", /逆/);
  assert.match(readied.summary, /逆/);

  grantCombatPractice(weaponUser, ["weapon-axe", "shared-daze"], 1);
  assert.ok((weaponUser.skillProficiency?.["weapon-axe"] ?? 0) > (weaponUser.skillProficiency?.["shared-daze"] ?? 0));

  const ally: BattleCombatant = {
    id: weaponUser.id,
    name: weaponUser.name,
    side: "party",
    role: "breaker",
    hp: 200,
    maxHp: 200,
    weaponAttack: 80,
    spellAttack: 40,
    defense: 20,
    speed: 30,
    hit: 90,
    dodge: 4,
    crit: 4,
    critDamage: 150,
    guardHeart: 4,
    spirit: 80,
    maxSpirit: 80,
    skills: skillsForCultivator(weaponUser),
  };
  const battle = runPartyBattle({
    allies: [ally],
    enemies: [{
      id: "post",
      name: "木桩",
      side: "enemy",
      role: "dps",
      hp: 40,
      maxHp: 40,
      weaponAttack: 8,
      spellAttack: 8,
      defense: 2,
      speed: 1,
      hit: 10,
      dodge: 1,
      crit: 0,
      critDamage: 100,
      guardHeart: 0,
      spirit: 10,
      maxSpirit: 10,
      skills: [],
      pattern: "pressure",
    }],
    policy: "aggressive",
    seed: "aptitude-note",
    maxRounds: 4,
    leaderId: weaponUser.id,
  });
  const notes = battle.summary.highlights.map((line) => `${line.note}${line.skillPoolLabel ?? ""}`).join("");
  assert.match(notes, /（兵器）|（法术）/);
  assert.match(fightDigestText(battle.summary) ?? "", /兵器|法术/);
  assert.match(battle.summary.party.flatMap((member) => member.skills).join(""), /（兵器）|（法术）/);
});

test("a city duel digest names whether the skill was a weapon or a spell", () => {
  const world = createSeedWorld();
  const left = world.cultivators["yun-zhong-he"]!;
  const right = spawn(world, "agent-aptitude-duel", "青萝", "灵静");
  left.locationId = "qingzhou:main-city";
  right.locationId = "qingzhou:main-city";
  left.qi = left.maxQi;
  right.qi = right.maxQi;
  left.spiritualPower = left.maxSpiritualPower;
  right.spiritualPower = right.maxSpiritualPower;

  performAction(world, left.id, `challenge-cultivator:${right.id}`);
  const challengeId = right.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, right.id, `accept-pvp-challenge:${challengeId}`);
  let guard = 0;
  while (left.activeJobId && guard < 12) {
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.equal(left.activeJobId, null);

  const state = getCultivatorState(world, left.id);
  const rounds = state.recentCombats[0]?.combatRounds ?? [];
  const text = rounds.flatMap((fight) => [...fight.beats, ...fight.highlights.map((line) => line.note)]).join("");
  assert.match(text, /兵器|法术/);
  assert.match((state.digest?.fights ?? []).join(""), /兵器|法术/);
});
