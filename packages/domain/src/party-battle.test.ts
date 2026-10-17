import assert from "node:assert/strict";
import test from "node:test";
import {
  allSkillDrafts,
  catalogSkillCountForRole,
  inferPartyRole,
  listResolvedSkills,
  type SkillContext,
} from "./combat-skills.js";
import type { BattleCombatant } from "./party-battle.js";
import { runPartyBattle } from "./party-battle.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { PartyRoleId } from "./model.js";

function ctx(partial: Partial<SkillContext> & Pick<SkillContext, "weaponType" | "weaponFamily">): SkillContext {
  return {
    spellBranch: null,
    spellElement: null,
    rootElements: ["metal", "wood"],
    weaponAttack: 40,
    spellAttack: 36,
    defense: 20,
    ...partial,
  };
}

function skill(id: string, name: string, role: PartyRoleId, extra: Partial<BattleCombatant["skills"][number]> = {}) {
  return {
    id,
    name,
    role,
    roles: [role] as PartyRoleId[],
    channel: "weapon" as const,
    spiritCost: 0,
    qiCost: 0,
    cooldown: 0,
    target: "enemy" as const,
    power: 1,
    guardRatio: 1,
    wardRatio: 1,
    healRatio: 0,
    hitBonus: 0,
    critBonus: 0,
    slow: false,
    focus: false,
    shred: 1,
    summary: name,
    ...extra,
  };
}

function fighter(partial: Partial<BattleCombatant> & Pick<BattleCombatant, "id" | "name">): BattleCombatant {
  return {
    side: "party",
    role: "dps",
    hp: 120,
    maxHp: 120,
    weaponAttack: 36,
    spellAttack: 30,
    defense: 8,
    speed: 20,
    hit: 90,
    dodge: 4,
    crit: 5,
    critDamage: 150,
    guardHeart: 4,
    spirit: 60,
    maxSpirit: 60,
    skills: [skill("basic-strike", "寻常一击", "dps")],
    ...partial,
  };
}

test("faster combatants act before slower ones", () => {
  const result = runPartyBattle({
    allies: [
      fighter({ id: "slow", name: "慢", speed: 4 }),
      fighter({ id: "fast", name: "快", speed: 90 }),
    ],
    enemies: [fighter({ id: "enemy", name: "石哨", side: "enemy", speed: 1, hp: 400, maxHp: 400, weaponAttack: 1, skills: [] })],
    policy: "balanced",
    seed: "initiative",
    leaderId: "fast",
    maxRounds: 1,
  });
  assert.equal(result.summary.highlights[0]?.actorName, "快");
});

test("support heals a wounded ally before spending the turn on damage", () => {
  const supportSkills = listResolvedSkills(ctx({
    weaponType: "staff",
    weaponFamily: "polearm",
    spellBranch: "wood-growth",
    spellElement: "wood",
    rootElements: ["wood"],
    spellAttack: 48,
  }));
  assert.equal(inferPartyRole(ctx({
    weaponType: "staff",
    weaponFamily: "polearm",
    spellBranch: "wood-growth",
    spellElement: "wood",
    rootElements: ["wood"],
    spellAttack: 48,
  })), "support");
  const result = runPartyBattle({
    allies: [
      fighter({
        id: "support",
        name: "青萝",
        role: "support",
        speed: 40,
        spirit: 80,
        maxSpirit: 80,
        skills: supportSkills,
      }),
      fighter({ id: "hurt", name: "慢", hp: 20, maxHp: 100, speed: 1, weaponAttack: 1 }),
    ],
    enemies: [fighter({ id: "enemy", name: "术式守卫", side: "enemy", hp: 80, maxHp: 80, speed: 1, weaponAttack: 1, skills: [] })],
    policy: "balanced",
    seed: "support-bias",
    leaderId: "support",
    maxRounds: 1,
  });
  assert.ok(result.summary.highlights.some((line) => line.result === "heal" && line.actorName === "青萝"));
});

test("a guard draws the next hit off a wounded ally", () => {
  const guardSkills = listResolvedSkills(ctx({
    weaponType: "hammer",
    weaponFamily: "heavy",
    rootElements: ["earth"],
    defense: 40,
    weaponAttack: 28,
  }));
  const result = runPartyBattle({
    allies: [
      fighter({ id: "guard", name: "沈砺", role: "guard", speed: 70, skills: guardSkills }),
      fighter({ id: "hurt", name: "乙", hp: 40, maxHp: 100, speed: 1, weaponAttack: 1 }),
    ],
    enemies: [fighter({
      id: "enemy",
      name: "重压守卫",
      side: "enemy",
      role: "dps",
      speed: 8,
      hp: 300,
      maxHp: 300,
      weaponAttack: 20,
      skills: [],
      pattern: "pressure",
    })],
    policy: "balanced",
    seed: "guard-taunt",
    leaderId: "guard",
    maxRounds: 1,
  });
  const enemyHit = result.summary.highlights.find((line) => line.actorName === "重压守卫" && line.result !== "guard");
  assert.ok(enemyHit);
  assert.equal(enemyHit?.targetName, "沈砺");
});

test("dps focuses the elite instead of the weaker add", () => {
  const result = runPartyBattle({
    allies: [fighter({ id: "dps", name: "云中鹤", speed: 50, weaponAttack: 12 })],
    enemies: [
      fighter({ id: "add", name: "杂兵", side: "enemy", hp: 8, maxHp: 8, speed: 1, defense: 0, skills: [], weaponAttack: 1 }),
      fighter({ id: "elite", name: "精英", side: "enemy", hp: 200, maxHp: 200, speed: 1, defense: 0, skills: [], elite: true, weaponAttack: 1 }),
    ],
    policy: "aggressive",
    seed: "focus-elite",
    leaderId: "dps",
    maxRounds: 1,
  });
  const strike = result.summary.highlights.find((line) => line.actorName === "云中鹤");
  assert.equal(strike?.targetName, "精英");
});

test("battle outcomes cover a win, a loss, a withdraw, and an empty party", () => {
  const win = runPartyBattle({
    allies: [fighter({ id: "a", name: "甲", weaponAttack: 400, hit: 200 })],
    enemies: [fighter({ id: "e", name: "乙", side: "enemy", hp: 15, maxHp: 15, defense: 0, skills: [], weaponAttack: 1 })],
    policy: "balanced",
    seed: "win",
    leaderId: "a",
  });
  assert.equal(win.outcome, "win");
  assert.ok(win.summary.beats.length >= 1 && win.summary.beats.length <= 3);

  const loss = runPartyBattle({
    allies: [fighter({ id: "a", name: "甲", hp: 40, maxHp: 100, weaponAttack: 1, defense: 0 })],
    enemies: [fighter({ id: "e", name: "乙", side: "enemy", hp: 400, maxHp: 400, weaponAttack: 400, defense: 0, skills: [] })],
    policy: "aggressive",
    seed: "loss",
    leaderId: "a",
  });
  assert.equal(loss.outcome, "loss");

  let withdrew = false;
  for (let n = 0; n < 12; n += 1) {
    const attempt = runPartyBattle({
      allies: [fighter({ id: "a", name: "甲", hp: 8, maxHp: 100, speed: 80, weaponAttack: 1 })],
      enemies: [fighter({ id: "e", name: "乙", side: "enemy", hp: 400, maxHp: 400, speed: 4, weaponAttack: 5, skills: [] })],
      policy: "conservative",
      seed: `withdraw-${n}`,
      leaderId: "a",
      maxRounds: 3,
    });
    if (attempt.outcome === "withdraw") {
      withdrew = true;
      assert.match(attempt.summary.beats.join(""), /撤/);
      break;
    }
  }
  assert.equal(withdrew, true);

  const empty = runPartyBattle({
    allies: [],
    enemies: [fighter({ id: "e", name: "乙", side: "enemy", skills: [] })],
    policy: "balanced",
    seed: "empty",
  });
  assert.equal(empty.outcome, "withdraw");
  assert.match(empty.summary.beats.join(""), /没有人/);
});

test("each companion is named when more than one cultivator fights", () => {
  const result = runPartyBattle({
    allies: [
      fighter({ id: "lead", name: "云中鹤", speed: 30, weaponAttack: 20 }),
      fighter({ id: "mate", name: "墨儿", speed: 28, weaponAttack: 20, role: "breaker", skills: [skill("shared-break", "拆招", "breaker", { spiritCost: 0, power: 1.05, shred: 0.85 })] }),
    ],
    enemies: [fighter({ id: "e", name: "术式守卫", side: "enemy", hp: 500, maxHp: 500, speed: 1, weaponAttack: 1, skills: [] })],
    policy: "balanced",
    seed: "party",
    leaderId: "lead",
    maxRounds: 2,
  });
  const named = result.summary.party.map((member) => member.name);
  assert.deepEqual(named, ["云中鹤", "墨儿"]);
  const text = `${result.summary.beats.join("")}${result.summary.highlights.map((line) => line.note).join("")}`;
  assert.match(text, /云中鹤/);
  assert.match(text, /墨儿/);
  assert.match(text, /主攻|破法/);
});

test("spirit root and weapon type open different skills, and early burst stays expensive", () => {
  for (const role of ["dps", "breaker", "guard", "support", "control"] as const) {
    assert.ok(catalogSkillCountForRole(role) >= 3, role);
  }
  const sword = listResolvedSkills(ctx({ weaponType: "sword", weaponFamily: "quick", spellBranch: "metal-edge", spellElement: "metal" }));
  const spear = listResolvedSkills(ctx({ weaponType: "spear", weaponFamily: "polearm", spellBranch: null, spellElement: null }));
  assert.ok(sword.some((entry) => entry.name === "剑引"));
  assert.equal(sword.some((entry) => entry.name === "枪出"), false);
  assert.ok(spear.some((entry) => entry.name === "枪出"));
  assert.equal(spear.some((entry) => entry.name === "刀势"), false);
  assert.equal(inferPartyRole(ctx({
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "metal-edge",
    spellElement: "metal",
  })), "breaker");

  const rooted = listResolvedSkills(ctx({
    weaponType: "fan",
    weaponFamily: "ranged-mystic",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["fire"],
  }));
  const borrowed = listResolvedSkills(ctx({
    weaponType: "fan",
    weaponFamily: "ranged-mystic",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["water"],
  }));
  const rootedBurst = rooted.find((entry) => entry.id === "fire-burst");
  const borrowedBurst = borrowed.find((entry) => entry.id === "fire-burst");
  assert.ok(rootedBurst && borrowedBurst);
  assert.ok(borrowedBurst.power < rootedBurst.power);
  assert.ok(rootedBurst.spiritCost >= 12);
  assert.ok(rootedBurst.cooldown >= 3);

  for (const draft of allSkillDrafts()) {
    if (draft.power >= 1.5) {
      assert.ok(draft.spiritCost >= 12 && draft.cooldown >= 3, draft.id);
    }
    if (draft.target === "all-enemies") {
      assert.ok(draft.power <= 0.8, draft.id);
    }
    if (draft.spiritCost <= 6 && draft.cooldown <= 1) {
      assert.ok(draft.power <= 1.25, draft.id);
    }
  }
});

test("starter sword and metal-edge stay playable and show up on combatProfile", () => {
  const world = createSeedWorld();
  const state = getCultivatorState(world, "yun-zhong-he");
  assert.equal(state.combatProfile.partyRole?.label, "破法");
  const names = (state.combatProfile.availableSkills ?? []).map((entry) => entry.name);
  assert.ok(names.includes("寻常一击"));
  assert.ok(names.includes("剑引"));
  assert.ok(names.includes("拆招"));
  assert.ok(names.length >= 6);
  const roleSkills = (state.combatProfile.availableSkills ?? []).filter((entry) => entry.role === "breaker" || entry.roleLabel === "破法");
  assert.ok(roleSkills.length >= 2);
});

test("an uncleared dungeon expedition reports concrete guardian beats", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  cultivator.dungeonProgress["丙"].highestClearedRank = 0;
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  const started = performAction(world, cultivator.id, "enter-dungeon:rank-1:aggressive");
  assert.equal(started.accepted, true);
  let guard = 0;
  while (cultivator.activeJobId && guard < 80) {
    advanceWorld(world, 1);
    guard += 1;
  }
  assert.equal(cultivator.activeJobId, null);
  const report = getCultivatorState(world, cultivator.id).dungeonExpedition.lastReport;
  assert.ok(report);
  assert.ok(["completed", "withdrew", "catastrophic", "aborted"].includes(report?.outcome ?? ""));
  const fights = report?.combatRounds ?? [];
  assert.ok(fights.length > 0);
  const fight = fights[0]!;
  assert.ok(["win", "loss", "withdraw"].includes(fight.outcome));
  assert.ok(fight.beats.length >= 1 && fight.beats.length <= 3);
  assert.match(fight.beats.join(""), /主攻|破法|护卫|辅助|控场/);
  assert.match(report?.summary ?? "", /最近一战/);
  assert.equal(cultivator.locationId, "qingzhou:main-city");
});

test("a gate companion is named in the fight and still has no second job", () => {
  const world = createSeedWorld();
  const leader = world.cultivators["yun-zhong-he"]!;
  leader.locationId = "qingzhou:main-city";
  const summary = syncCultivatorFromPersona(world, { agentId: "agent-battle-mate", name: "墨儿" });
  const mate = world.cultivators[summary.selectedCultivatorId]!;
  mate.locationId = "qingzhou:main-city";
  performAction(world, leader.id, `chat-up:${mate.id}`);
  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  leader.locationId = "qingzhou:dungeon-c";
  mate.locationId = "qingzhou:dungeon-c";
  leader.dungeonProgress["丙"].highestClearedRank = 0;
  leader.qi = leader.maxQi;
  leader.spiritualPower = leader.maxSpiritualPower;
  const started = performAction(world, leader.id, "enter-dungeon:rank-1:aggressive");
  assert.equal(started.accepted, true);
  assert.equal(mate.activeJobId, null);
  let guard = 0;
  while (leader.activeJobId && guard < 80) {
    advanceWorld(world, 1);
    guard += 1;
    assert.equal(mate.activeJobId, null);
  }
  const report = getCultivatorState(world, leader.id).dungeonExpedition.lastReport;
  const named = (report?.combatRounds ?? []).flatMap((fight) => fight.party.map((member) => member.name));
  assert.ok(named.includes("墨儿"));
  assert.ok(named.includes(leader.name));
  assert.equal(getCultivatorState(world, mate.id).sharedDungeon, null);
  const mateReport = getCultivatorState(world, mate.id).dungeonExpedition.lastReport;
  assert.equal(mateReport?.sharedLeaderId, leader.id);
  assert.equal(mateReport?.sharedLeaderName, leader.name);
  assert.deepEqual(mateReport?.combatRounds, report?.combatRounds);
  assert.match(mateReport?.summary ?? "", /你跟着/);
  assert.match((mate.travelNotes ?? []).map((note) => note.detail).join("\n"), /主攻|破法|护卫|辅助|控场/);
});
