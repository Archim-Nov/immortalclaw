import assert from "node:assert/strict";
import test from "node:test";
import { listResolvedSkills, type SkillContext } from "./combat-skills.js";
import {
  buildGuardianPack,
  companionWoundTicks,
  runPartyBattle,
  woundTicksForGuardian,
  type BattleCombatant,
} from "./party-battle.js";
import {
  advanceWorld,
  createSeedWorld,
  listAvailableActions,
  performAction,
  syncCultivatorFromPersona,
} from "./index.js";
import type { DungeonExpeditionPolicy, PartyRoleId } from "./model.js";
import { getPartyOf, getSocialLink, markRival } from "./social.js";

const CULTIVATOR_ID = "yun-zhong-he";

function spawnAgent(world: ReturnType<typeof createSeedWorld>, agentId: string, name: string) {
  const summary = syncCultivatorFromPersona(world, { agentId, name });
  const cultivator = world.cultivators[summary.selectedCultivatorId]!;
  cultivator.locationId = "qingzhou:main-city";
  cultivator.qi = cultivator.maxQi;
  cultivator.spiritualPower = cultivator.maxSpiritualPower;
  return cultivator;
}

function roleContext(role: PartyRoleId): SkillContext {
  if (role === "guard") {
    return { weaponType: "hammer", weaponFamily: "heavy", spellBranch: "earth-wall", spellElement: "earth", rootElements: ["earth"], weaponAttack: 48, spellAttack: 36, defense: 24 };
  }
  if (role === "support") {
    return { weaponType: "fan", weaponFamily: "ranged-mystic", spellBranch: "wood-growth", spellElement: "wood", rootElements: ["wood"], weaponAttack: 48, spellAttack: 36, defense: 24 };
  }
  if (role === "control") {
    return { weaponType: "fan", weaponFamily: "ranged-mystic", spellBranch: "water-frost", spellElement: "water", rootElements: ["water"], weaponAttack: 48, spellAttack: 36, defense: 24 };
  }
  if (role === "breaker") {
    return { weaponType: "axe", weaponFamily: "heavy", spellBranch: "metal-break", spellElement: "metal", rootElements: ["metal"], weaponAttack: 48, spellAttack: 36, defense: 24 };
  }
  return { weaponType: "sword", weaponFamily: "quick", spellBranch: "fire-blaze", spellElement: "fire", rootElements: ["fire"], weaponAttack: 48, spellAttack: 36, defense: 24 };
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

function pack(rank: number, policy: DungeonExpeditionPolicy = "balanced", grade: "丙" | "乙" | "甲" = "丙") {
  const gradeOffset = grade === "丙" ? 0 : grade === "乙" ? 1 : 2;
  const base = (136 + gradeOffset * 34 + (rank - 1) * 6) / 136;
  const posture = policy === "aggressive" ? 1.18 : policy === "conservative" ? 0.84 : 1;
  return buildGuardianPack({
    id: "ruins-guardian",
    name: "重甲守卫",
    patternKey: "ruins-guardian",
    grade,
    rank,
    policy,
    combatScale: base * posture,
    baseHp: 200,
    attack: 50,
    defense: 30,
    speed: 18,
    hit: 35,
    dodge: 10,
    crit: 12,
    critDamage: 50,
    guardHeart: 10,
    spirit: 60,
    maxSpirit: 60,
  });
}

test("rank 3 and higher grades field a pack, rank 1 丙 stays one elite", () => {
  assert.equal(pack(1).length, 1);
  assert.equal(pack(2).length, 1);
  const rank3 = pack(3);
  assert.equal(rank3.length, 2);
  assert.equal(rank3[0]?.elite, true);
  assert.equal(rank3[1]?.elite, false);
  assert.match(rank3[1]?.name ?? "", /从者/);
  assert.equal(pack(6).length, 3);
  assert.equal(pack(1, "balanced", "乙").length, 3);
  assert.ok((pack(3, "aggressive")[0]?.hp ?? 0) > (pack(3)[0]?.hp ?? 0));
});

test("a hard loss wounds deeper than a rank 1 loss, and a bloody win still leaves a mark", () => {
  assert.equal(woundTicksForGuardian({
    rank: 1, grade: "丙", policy: "balanced", outcome: "loss", leaderHpLostRatio: 1, pressureInjury: 0,
  }), 4);
  assert.equal(woundTicksForGuardian({
    rank: 3, grade: "丙", policy: "balanced", outcome: "loss", leaderHpLostRatio: 1, pressureInjury: 0,
  }), 6);
  assert.equal(woundTicksForGuardian({
    rank: 3, grade: "丙", policy: "balanced", outcome: "win", leaderHpLostRatio: 0.5, pressureInjury: 0,
  }), 3);
  assert.equal(woundTicksForGuardian({
    rank: 3, grade: "丙", policy: "aggressive", outcome: "win", leaderHpLostRatio: 0.25, pressureInjury: 0,
  }), 2);
  assert.equal(woundTicksForGuardian({
    rank: 1, grade: "丙", policy: "balanced", outcome: "win", leaderHpLostRatio: 0.5, pressureInjury: 0,
  }), 0);
  assert.equal(companionWoundTicks({ rank: 3, grade: "丙", outcome: "loss", qiLoss: 1 }), 4);
  assert.equal(companionWoundTicks({ rank: 3, grade: "丙", outcome: "win", qiLoss: 4 }), 2);
});

test("rotate, leave-reserve, rival chat, and a healing gift name both people", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  leader.locationId = "qingzhou:main-city";
  const names = ["墨儿", "青萝", "芷儿", "阿宁"] as const;
  const companions = names.map((name, index) => spawnAgent(world, `agent-v3-party-${index}`, name));
  for (const companion of companions) {
    performAction(world, leader.id, `chat-up:${companion.id}`);
    performAction(world, leader.id, `party-invite:${companion.id}`);
    const inviteId = Object.keys(world.partyInvitations).find((id) => world.partyInvitations[id]?.toCultivatorId === companion.id);
    assert.ok(inviteId);
    performAction(world, companion.id, `accept-party:${inviteId}`);
  }
  const shenLi = spawnAgent(world, "agent-v3-shenli", "沈砺");
  performAction(world, leader.id, `chat-up:${shenLi.id}`);
  performAction(world, shenLi.id, `queue-party-reserve:${leader.id}`);
  const outgoing = companions[0]!;
  performAction(world, leader.id, `party-rotate:${outgoing.id}`);
  assert.ok((shenLi.travelNotes ?? []).some((note) => note.detail.includes(shenLi.name) && note.detail.includes(outgoing.name)));
  assert.ok((outgoing.travelNotes ?? []).some((note) => note.detail.includes("候补")));

  performAction(world, outgoing.id, "leave-party-reserve");
  assert.equal(getPartyOf(world, leader.id)?.reserveIds?.includes(outgoing.id), false);
  assert.ok((outgoing.travelNotes ?? []).some((note) => note.detail.includes("候补")));
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes(outgoing.name) && note.detail.includes("候补")));

  const rival = spawnAgent(world, "agent-v3-rival", "楚晚");
  markRival(world, leader.id, rival.id);
  performAction(world, leader.id, `chat-up:${rival.id}`);
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes("楚晚") && note.detail.includes("宿敌")));
  assert.ok((rival.travelNotes ?? []).some((note) => note.detail.includes(leader.name) && note.detail.includes("宿敌")));

  for (const key of Object.keys(leader.inventory)) {
    leader.inventory[key as keyof typeof leader.inventory] = 0;
  }
  leader.inventory["healing-pill"] = 1;
  rival.injuryTicksRemaining = 4;
  performAction(world, leader.id, `send-message:${rival.id}:gift-item`);
  const gift = rival.pendingGifts?.[0];
  assert.ok(gift);
  performAction(world, rival.id, `accept-gift:${gift.messageId}`);
  assert.ok((rival.travelNotes ?? []).some((note) => note.detail.includes("疗伤丹") && note.detail.includes("伤")));
});

test("a wound blocks the next dungeon until rest, a pill, or a teammate tends it", () => {
  const world = createSeedWorld();
  const leader = world.cultivators[CULTIVATOR_ID]!;
  const mate = spawnAgent(world, "agent-v3-heal", "青萝");
  leader.locationId = "qingzhou:dungeon-c";
  leader.injuryTicksRemaining = 6;
  assert.throws(() => performAction(world, leader.id, "enter-dungeon:rank-1:balanced"), /身上有伤/);

  leader.locationId = "qingzhou:main-city";
  mate.locationId = "qingzhou:main-city";
  for (const key of Object.keys(mate.inventory)) {
    mate.inventory[key as keyof typeof mate.inventory] = 0;
  }
  assert.ok(listAvailableActions(world, mate.id).some((action) => action.actionId === `tend-wound:${leader.id}`));
  const beforeSpirit = mate.spiritualPower;
  performAction(world, mate.id, `tend-wound:${leader.id}`);
  assert.equal(leader.injuryTicksRemaining, 3);
  assert.ok(mate.spiritualPower < beforeSpirit);
  assert.equal(getSocialLink(world, mate.id, leader.id)?.favorBalance, 1);
  assert.ok((leader.travelNotes ?? []).some((note) => note.detail.includes(mate.name) && note.detail.includes("人情")));
  assert.ok((mate.travelNotes ?? []).some((note) => note.detail.includes(leader.name)));

  for (const key of Object.keys(mate.inventory)) {
    mate.inventory[key as keyof typeof mate.inventory] = 0;
  }
  mate.inventory["healing-pill"] = 1;
  performAction(world, mate.id, `tend-wound:${leader.id}`);
  assert.equal(leader.injuryTicksRemaining, 0);
  assert.equal(mate.inventory["healing-pill"], 0);
  assert.equal(getSocialLink(world, mate.id, leader.id)?.favorBalance, 2);

  leader.injuryTicksRemaining = 2;
  leader.inventory["healing-pill"] = 1;
  performAction(world, leader.id, "use-healing-pill");
  assert.equal(leader.injuryTicksRemaining, 0);
  assert.ok((leader.travelNotes ?? []).some((note) => note.title === "服下疗伤丹"));

  leader.injuryTicksRemaining = 2;
  advanceWorld(world, 1);
  assert.equal(leader.injuryTicksRemaining, 1);
  leader.locationId = "qingzhou:dungeon-c";
  assert.throws(() => performAction(world, leader.id, "enter-dungeon:rank-1:balanced"), /身上有伤/);
});

test("five-man mixed is not an automatic win at rank 3, and solo 炼气 stays hard", () => {
  const seeds = 16;
  const mixes: Array<{ name: string; roles: PartyRoleId[] }> = [
    { name: "solo-dps", roles: ["dps"] },
    { name: "full-mixed", roles: ["dps", "breaker", "guard", "support", "control"] },
    { name: "five-dps", roles: ["dps", "dps", "dps", "dps", "dps"] },
  ];
  const table: Record<string, Record<string, number>> = {};
  for (const mix of mixes) {
    table[mix.name] = {};
    for (const rank of [1, 3]) {
      let wins = 0;
      for (let seed = 0; seed < seeds; seed += 1) {
        const result = runPartyBattle({
          allies: mix.roles.map((role, index) => ally(role, index)),
          enemies: pack(rank),
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
  let aggressiveWins = 0;
  for (let seed = 0; seed < seeds; seed += 1) {
    const result = runPartyBattle({
      allies: ["dps", "breaker", "guard", "support", "control"].map((role, index) => ally(role as PartyRoleId, index)),
      enemies: pack(3, "aggressive"),
      policy: "aggressive",
      seed: `full-mixed:aggressive:3:${seed}`,
      maxRounds: 8,
      leaderId: "dps-0",
    });
    if (result.outcome === "win") aggressiveWins += 1;
  }
  table["full-mixed-aggressive"] = { "3": Math.round((aggressiveWins / seeds) * 1000) / 1000 };
  console.log(`DEEPEN_V3_WIN_RATES ${JSON.stringify(table)}`);
  assert.ok((table["solo-dps"]?.["1"] ?? 1) < 0.2);
  assert.ok((table["full-mixed"]?.["3"] ?? 1) < 0.95);
  assert.ok((table["full-mixed"]?.["3"] ?? 0) > 0.15);
  assert.ok((table["full-mixed-aggressive"]?.["3"] ?? 1) <= (table["full-mixed"]?.["3"] ?? 0));
});
