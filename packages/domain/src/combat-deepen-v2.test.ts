import assert from "node:assert/strict";
import test from "node:test";
import {
  listResolvedSkills,
  proficiencyPowerMultiplier,
  skillContextOf,
  type SkillContext,
} from "./combat-skills.js";
import type { BattleCombatant } from "./party-battle.js";
import { runPartyBattle } from "./party-battle.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { PartyRoleId } from "./model.js";
import { getPartyOf, getSocialLink } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";
const ROLES: readonly PartyRoleId[] = ["dps", "breaker", "guard", "support", "control"];

function spawnAgent(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

function runUntilIdle(world: ReturnType<typeof createSeedWorld>, cultivatorId: string, cap = 12) {
  let ticks = 0;
  while (world.cultivators[cultivatorId]?.activeJobId && ticks < cap) {
    advanceWorld(world, 1);
    ticks += 1;
  }
  return ticks;
}

function roleContext(role: PartyRoleId): SkillContext {
  if (role === "guard") {
    return {
      weaponType: "hammer",
      weaponFamily: "heavy",
      spellBranch: "earth-wall",
      spellElement: "earth",
      rootElements: ["earth"],
      weaponAttack: 48,
      spellAttack: 36,
      defense: 24,
    };
  }
  if (role === "support") {
    return {
      weaponType: "fan",
      weaponFamily: "ranged-mystic",
      spellBranch: "wood-growth",
      spellElement: "wood",
      rootElements: ["wood"],
      weaponAttack: 48,
      spellAttack: 36,
      defense: 24,
    };
  }
  if (role === "control") {
    return {
      weaponType: "fan",
      weaponFamily: "ranged-mystic",
      spellBranch: "water-frost",
      spellElement: "water",
      rootElements: ["water"],
      weaponAttack: 48,
      spellAttack: 36,
      defense: 24,
    };
  }
  if (role === "breaker") {
    return {
      weaponType: "axe",
      weaponFamily: "heavy",
      spellBranch: "metal-break",
      spellElement: "metal",
      rootElements: ["metal"],
      weaponAttack: 48,
      spellAttack: 36,
      defense: 24,
    };
  }
  return {
    weaponType: "sword",
    weaponFamily: "quick",
    spellBranch: "fire-blaze",
    spellElement: "fire",
    rootElements: ["fire"],
    weaponAttack: 48,
    spellAttack: 36,
    defense: 24,
  };
}

function ally(role: PartyRoleId, index: number): BattleCombatant {
  const skills = listResolvedSkills(roleContext(role)).filter(
    (skill) => skill.id === "basic-strike" || skill.roles.includes(role),
  );
  return {
    id: `${role}-${index}`,
    name: `${role}${index}`,
    side: "party",
    role,
    hp: 130,
    maxHp: 130,
    weaponAttack: 48,
    spellAttack: 36,
    defense: 24,
    speed: 26,
    hit: 42,
    dodge: 16,
    crit: 12,
    critDamage: 150,
    guardHeart: 8,
    spirit: 80,
    maxSpirit: 80,
    skills,
  };
}

function guardian(rank: number): BattleCombatant {
  const scale = (136 + (rank - 1) * 6) / 136;
  const hp = Math.round(200 * scale);
  const attack = Math.round(50 * scale);
  return {
    id: `guardian-${rank}`,
    name: "重甲守卫",
    side: "enemy",
    role: "dps",
    hp,
    maxHp: hp,
    weaponAttack: attack,
    spellAttack: Math.round(attack * 0.9),
    defense: Math.round(30 * scale),
    speed: 18,
    hit: 35,
    dodge: 10,
    crit: 8,
    critDamage: 140,
    guardHeart: 10,
    spirit: 40,
    maxSpirit: 40,
    skills: [],
    pattern: "pressure",
    elite: true,
  };
}

test("a city duel names skills for both sides and still grows affinity", () => {
  const world = createSeedWorld();
  const first = world.cultivators[CULTIVATOR_ID]!;
  const second = spawnAgent(world, "agent-v2-duel", "青萝");
  first.locationId = "qingzhou:main-city";
  first.qi = first.maxQi;
  second.qi = second.maxQi;
  const before = getSocialLink(world, first.id, second.id)?.affinity ?? 0;

  performAction(world, first.id, `challenge-cultivator:${second.id}`);
  const challengeId = second.pendingPvpChallengeId;
  assert.ok(challengeId);
  performAction(world, second.id, `accept-pvp-challenge:${challengeId}`);
  const ticks = runUntilIdle(world, first.id, 12);
  assert.ok(ticks < 12);

  const duelNote = (notes: { detail: string }[] | undefined) =>
    (notes ?? []).find((note) => note.detail.includes("切磋") && note.detail.includes("使出"));
  assert.ok(duelNote(first.travelNotes));
  assert.ok(duelNote(second.travelNotes));
  assert.equal(duelNote(first.travelNotes)?.detail, duelNote(second.travelNotes)?.detail);
  const after = getSocialLink(world, first.id, second.id)?.affinity ?? 0;
  const link = getSocialLink(world, first.id, second.id);
  assert.ok(link?.lastDuelResult);
  if (link?.lastDuelResult !== "retreat") {
    assert.ok(after >= before + 4);
  }
  const practice = [...Object.values(first.skillProficiency ?? {}), ...Object.values(second.skillProficiency ?? {})];
  assert.ok(practice.length > 0);
  assert.ok(practice.every((points) => points >= 1 && points <= 2));
});

test("practice can nudge a skill and stops before it trivializes 炼气", () => {
  const world = createSeedWorld();
  const hero = world.cultivators[CULTIVATOR_ID]!;
  const ctx = skillContextOf(hero);
  const plain = listResolvedSkills({ ...ctx, proficiency: {} }).find((skill) => skill.id === "stored-strike");
  const capped = listResolvedSkills({ ...ctx, proficiency: { "stored-strike": 100 } }).find((skill) => skill.id === "stored-strike");
  assert.ok(plain && capped);
  assert.ok(capped.power > plain.power);
  assert.ok(capped.power <= Math.round(plain.power * proficiencyPowerMultiplier(24) * 100) / 100 + 0.001);
  assert.equal(proficiencyPowerMultiplier(24), 1.048);
  assert.equal(proficiencyPowerMultiplier(100), 1.048);
});

test("an agent can choose a legal party role and three skill slots", () => {
  const world = createSeedWorld();
  const hero = world.cultivators[CULTIVATOR_ID]!;
  const view = getCultivatorState(world, hero.id);
  const legal = view.combatProfile.legalPartyRoles ?? [];
  assert.ok(legal.length >= 1);
  const chosen = legal[0]!;
  assert.ok(listAvailableActions(world, hero.id).some((action) => action.actionId === `set-party-role:${chosen.id}`));
  performAction(world, hero.id, `set-party-role:${chosen.id}`);
  assert.equal(getCultivatorState(world, hero.id).combatProfile.partyRole?.id, chosen.id);

  const missing = ROLES.find((role) => !legal.some((entry) => entry.id === role));
  if (missing) {
    assert.throws(
      () => performAction(world, hero.id, `set-party-role:${missing}`),
      /站不了/,
    );
  }

  const slots = listAvailableActions(world, hero.id)
    .map((action) => action.actionId)
    .filter((actionId) => actionId.startsWith("equip-skill-slot:"));
  assert.ok(slots.length >= 1);
  const picked = slots.slice(0, 4);
  for (const actionId of picked.slice(0, 3)) {
    performAction(world, hero.id, actionId);
  }
  const equipped = getCultivatorState(world, hero.id).combatProfile.equippedSkillIds ?? [];
  assert.equal(equipped.length, Math.min(3, picked.length));
  if (picked.length > 3) {
    assert.throws(() => performAction(world, hero.id, picked[3]!), /3/);
  }
  performAction(world, hero.id, "clear-skill-loadout");
  assert.equal((getCultivatorState(world, hero.id).combatProfile.equippedSkillIds ?? []).length, 0);
});

test("stepping away from the gate keeps a companion until they explicitly leave", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const mate = spawnAgent(world, "agent-v2-gate", "墨儿");
  performAction(world, leader.id, `chat-up:${mate.id}`);
  performAction(world, leader.id, `party-invite:${mate.id}`);
  const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === mate.id);
  assert.ok(inviteId);
  performAction(world, mate.id, `accept-party:${inviteId}`);
  leader.locationId = "qingzhou:dungeon-c";
  mate.locationId = "qingzhou:dungeon-c";
  performAction(world, leader.id, "enter-dungeon:rank-1:balanced");
  assert.ok(world.dungeonExpeditions[leader.id]?.companionIds?.includes(mate.id));

  mate.locationId = "qingzhou:main-city";
  advanceWorld(world, 4);
  assert.equal(leader.activeJobId === null, false);
  assert.ok(world.dungeonExpeditions[leader.id]?.companionIds?.includes(mate.id));
  assert.ok(getCultivatorState(world, mate.id).sharedDungeon);

  performAction(world, mate.id, "leave-shared-expedition");
  assert.equal(world.dungeonExpeditions[leader.id]?.companionIds?.includes(mate.id), false);
  assert.equal(getCultivatorState(world, mate.id).sharedDungeon ?? null, null);
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("明确退出")));
});

test("a full party keeps five on the field while 沈砺 waits and rotates in", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const names = ["墨儿", "青萝", "芷儿", "阿宁"] as const;
  const companions = names.map((name, index) => spawnAgent(world, `agent-v2-party-${index}`, name));
  for (const companion of companions) {
    performAction(world, leader.id, `chat-up:${companion.id}`);
    performAction(world, leader.id, `party-invite:${companion.id}`);
    const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === companion.id);
    assert.ok(inviteId);
    performAction(world, companion.id, `accept-party:${inviteId}`);
  }
  assert.equal(getPartyOf(world, leader.id)?.memberIds.length, 5);

  const shenLi = spawnAgent(world, "agent-v2-shenli", "沈砺");
  performAction(world, leader.id, `chat-up:${shenLi.id}`);
  assert.throws(() => performAction(world, leader.id, `party-invite:${shenLi.id}`), /满/);
  assert.ok(listAvailableActions(world, shenLi.id).some((action) => action.actionId === `queue-party-reserve:${leader.id}`));
  performAction(world, shenLi.id, `queue-party-reserve:${leader.id}`);
  const queued = getPartyOf(world, leader.id);
  assert.equal(queued?.memberIds.length, 5);
  assert.deepEqual(queued?.reserveIds, [shenLi.id]);
  assert.equal(getCultivatorState(world, leader.id).party?.reserve?.name, "沈砺");

  const outgoing = companions[0]!;
  performAction(world, leader.id, `party-rotate:${outgoing.id}`);
  const rotated = getPartyOf(world, leader.id);
  assert.equal(rotated?.memberIds.length, 5);
  assert.ok(rotated?.memberIds.includes(shenLi.id));
  assert.equal(rotated?.memberIds.includes(outgoing.id), false);
  assert.deepEqual(rotated?.reserveIds, [outgoing.id]);
});

test("role mixes at rank 1-3 do not collapse into one dominant role", () => {
  const mixes: Array<{ name: string; roles: PartyRoleId[] }> = [
    ...ROLES.map((role) => ({ name: `solo-${role}`, roles: [role] })),
    { name: "dps-guard-support", roles: ["dps", "guard", "support"] },
    { name: "dps-breaker-control", roles: ["dps", "breaker", "control"] },
    { name: "three-dps", roles: ["dps", "dps", "dps"] },
    { name: "full-mixed", roles: ["dps", "breaker", "guard", "support", "control"] },
    { name: "five-dps", roles: ["dps", "dps", "dps", "dps", "dps"] },
  ];
  const seeds = 16;
  const table: Record<string, Record<string, number>> = {};
  for (const mix of mixes) {
    table[mix.name] = {};
    for (const rank of [1, 2, 3]) {
      let wins = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        const result = runPartyBattle({
          allies: mix.roles.map((role, index) => ally(role, index)),
          enemies: [guardian(rank)],
          policy: "balanced",
          seed: `${mix.name}:${rank}:${seed}`,
          maxRounds: 6,
          leaderId: `${mix.roles[0]}-0`,
        });
        if (result.outcome === "win") wins += 1;
      }
      table[mix.name]![String(rank)] = Math.round((wins / seeds) * 1000) / 1000;
    }
  }
  console.log(`ROLE_MIX_WIN_RATES ${JSON.stringify(table)}`);

  const damageTrios = ["dps-guard-support", "dps-breaker-control", "three-dps"];
  for (const rank of ["1", "2", "3"]) {
    const rates = damageTrios.map((name) => table[name]![rank]!);
    const spread = Math.max(...rates) - Math.min(...rates);
    assert.ok(spread <= 0.45, `rank ${rank} trio spread ${spread}: ${JSON.stringify(table)}`);
  }
  assert.ok((table["solo-dps"]!["1"] ?? 1) <= 0.85, JSON.stringify(table));
  assert.ok((table["five-dps"]!["1"] ?? 0) - (table["full-mixed"]!["1"] ?? 0) <= 0.35, JSON.stringify(table));
  assert.ok((table["full-mixed"]!["3"] ?? 1) <= (table["full-mixed"]!["1"] ?? 0) + 0.15, JSON.stringify(table));
});
