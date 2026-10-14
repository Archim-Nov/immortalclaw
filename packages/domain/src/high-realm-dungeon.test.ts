import assert from "node:assert/strict";
import test from "node:test";
import { listResolvedSkills, type SkillContext } from "./combat-skills.js";
import { STATUS_BURNING, STATUS_ILLUSION_BLUR, STATUS_SUPPRESSION } from "./combat-statuses.js";
import {
  advanceWorld,
  createSeedWorld,
  getCultivatorState,
  performAction,
} from "./index.js";
import {
  dungeonAdvice,
  jiaBandFailCost,
  jiaDirectEncounterScale,
  jiaGuardianSpellId,
} from "./high-realm-dungeon.js";
import type { DungeonExpeditionPolicy, DungeonGrade, PartyRoleId } from "./model.js";
import {
  buildGuardianPack,
  companionWoundTicks,
  runPartyBattle,
  woundTicksForGuardian,
  type BattleCombatant,
} from "./party-battle.js";

function unbandedScale(grade: DungeonGrade, rank: number): number {
  const gradeOffset = grade === "丙" ? 0 : grade === "乙" ? 1 : 2;
  return (136 + gradeOffset * 34 + (rank - 1) * 6) / 136;
}

function unbandedEliteHp(grade: DungeonGrade, rank: number): number {
  const hard = rank >= 3 || grade !== "丙";
  return Math.round(200 * unbandedScale(grade, rank) * (hard ? 1.18 : 1));
}

function pack(rank: number, policy: DungeonExpeditionPolicy = "balanced", grade: DungeonGrade = "丙") {
  const posture = policy === "aggressive" ? 1.18 : policy === "conservative" ? 0.84 : 1;
  return buildGuardianPack({
    id: "ruins-guardian",
    name: "重甲守卫",
    patternKey: "ruins-guardian",
    grade,
    rank,
    policy,
    combatScale: unbandedScale(grade, rank) * posture,
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

function fighter(role: PartyRoleId, index: number, hp: number, attack: number, defense: number): BattleCombatant {
  const skills = listResolvedSkills({ ...roleContext(role), weaponAttack: attack, defense }).filter(
    (skill) => skill.id === "basic-strike" || skill.roles.includes(role),
  );
  return {
    id: `${role}-${index}`,
    name: `${role}${index}`,
    side: "party",
    role,
    hp,
    maxHp: hp,
    weaponAttack: attack,
    spellAttack: Math.max(1, Math.round(attack * 0.75)),
    defense,
    speed: 48,
    hit: 86,
    dodge: 22,
    crit: 16,
    critDamage: 150,
    guardHeart: 12,
    spirit: 100,
    maxSpirit: 100,
    skills,
  };
}

const ROLES: PartyRoleId[] = ["guard", "support", "control", "breaker", "dps"];

function partyOf(hp: number, attack: number, defense: number): BattleCombatant[] {
  return ROLES.map((role, index) => fighter(role, index, hp, attack, defense));
}

function winsOf(allies: BattleCombatant[], grade: DungeonGrade, rank: number): number {
  let wins = 0;
  for (let seed = 0; seed < 8; seed += 1) {
    const result = runPartyBattle({
      allies,
      enemies: pack(rank, "balanced", grade),
      policy: "balanced",
      seed: `band-clear:${grade}:${rank}:${seed}`,
      maxRounds: 8,
      leaderId: allies[0]?.id,
    });
    if (result.outcome === "win") wins += 1;
  }
  return wins;
}

test("丙级一层仍是单人练手，乙级一层不吃甲级倍率", () => {
  const bing = pack(1);
  assert.equal(bing.length, 1);
  assert.equal(bing[0]?.hp, 200);
  assert.equal(bing[0]?.threat, undefined);
  const yi = pack(1, "balanced", "乙");
  assert.equal(yi.length, 3);
  assert.equal(yi[0]?.hp, unbandedEliteHp("乙", 1));
  assert.equal(yi[0]?.threat, undefined);
  assert.equal(jiaDirectEncounterScale("丙", 1), 1);
  assert.equal(jiaDirectEncounterScale("乙", 6), 1);
  assert.equal(jiaGuardianSpellId("丙", 1), null);
  assert.equal(woundTicksForGuardian({
    rank: 1, grade: "丙", policy: "balanced", outcome: "loss", leaderHpLostRatio: 1, pressureInjury: 0,
  }), 4);
  assert.equal(companionWoundTicks({ rank: 1, grade: "丙", outcome: "loss", qiLoss: 8 }), 4);
  assert.equal(jiaBandFailCost("丙", 1, "loss"), null);
  assert.match(dungeonAdvice("丙", 1), /练手/);
  assert.match(dungeonAdvice("乙", 3), /练手/);
});

test("甲级三层秘境的守关按层数变重，威胁也不一样", () => {
  const danxia = pack(1, "balanced", "甲");
  assert.equal(danxia.length, 3);
  assert.ok((danxia[0]?.hp ?? 0) > unbandedEliteHp("甲", 1));
  assert.match(danxia.map((body) => body.name).join(""), /炉卫/);
  assert.match(danxia.map((body) => body.name).join(""), /余火/);
  assert.equal(danxia[0]?.threat?.statusId, STATUS_BURNING);
  assert.equal(danxia[0]?.pattern, "pressure");
  assert.equal(danxia[2]?.pattern, "swift");
  assert.ok((danxia[2]?.speed ?? 0) > (danxia[0]?.speed ?? 0));
  assert.equal(jiaGuardianSpellId("甲", 1), "fire-blaze-tier-2");
  assert.equal(jiaGuardianSpellId("甲", 3), "fire-blaze-tier-3");

  const infant = pack(6, "balanced", "甲");
  const danxiaLate = pack(3, "balanced", "甲");
  assert.ok((infant[0]?.weaponAttack ?? 0) > (danxiaLate[0]?.weaponAttack ?? 0));
  assert.match(infant.map((body) => body.name).join(""), /莲侍/);
  assert.equal(infant[0]?.threat?.statusId, STATUS_ILLUSION_BLUR);
  assert.equal(infant[0]?.threat?.selfStatusId, "spirit-breath");
  assert.ok((infant[0]?.threat?.extraSpiritDrain ?? 0) > (danxia[0]?.threat?.extraSpiritDrain ?? 0));
  assert.equal(jiaGuardianSpellId("甲", 5), "water-illusion-tier-3");
  assert.equal(jiaGuardianSpellId("甲", 6), "water-illusion-tier-4");

  const rift = pack(9, "balanced", "甲");
  const riftAttackGrowth = (rift[0]?.weaponAttack ?? 1) / (danxia[0]?.weaponAttack ?? 1);
  const riftDefenseGrowth = (rift[0]?.defense ?? 1) / (danxia[0]?.defense ?? 1);
  assert.ok(riftAttackGrowth > riftDefenseGrowth);
  assert.match(rift.map((body) => body.name).join(""), /纹卫/);
  assert.equal(rift[0]?.threat?.statusId, STATUS_SUPPRESSION);
  assert.equal(rift[1]?.pattern, "seal");
  assert.equal(jiaGuardianSpellId("甲", 7), "earth-suppress-tier-4");
  assert.equal(jiaGuardianSpellId("甲", 8), "earth-suppress-tier-5");
  assert.ok(jiaDirectEncounterScale("甲", 9) > jiaDirectEncounterScale("甲", 1));
});

test("焚灼会在回合结束再烧一截，婴火抽灵，神纹的战报写得出镇压", () => {
  const bag: BattleCombatant = {
    ...fighter("dps", 0, 8000, 8, 10),
    skills: [],
  };
  const burned = runPartyBattle({
    allies: [bag],
    enemies: pack(2, "balanced", "甲"),
    policy: "balanced",
    seed: "burn-tick",
    maxRounds: 1,
    leaderId: bag.id,
  });
  const plain = runPartyBattle({
    allies: [bag],
    enemies: pack(2, "balanced", "甲").map((body) => ({ ...body, threat: undefined })),
    policy: "balanced",
    seed: "burn-tick",
    maxRounds: 1,
    leaderId: bag.id,
  });
  assert.ok((burned.finalHp[bag.id] ?? 0) < (plain.finalHp[bag.id] ?? 0));
  assert.match(burned.summary.beats.join(""), /焚灼/);

  const drained = runPartyBattle({
    allies: [{ ...bag, spirit: 80, maxSpirit: 80 }],
    enemies: pack(5, "balanced", "甲"),
    policy: "balanced",
    seed: "spirit-pull",
    maxRounds: 1,
    leaderId: bag.id,
  });
  const undrained = runPartyBattle({
    allies: [{ ...bag, spirit: 80, maxSpirit: 80 }],
    enemies: pack(5, "balanced", "甲").map((body) => ({ ...body, threat: undefined })),
    policy: "balanced",
    seed: "spirit-pull",
    maxRounds: 1,
    leaderId: bag.id,
  });
  assert.match(drained.summary.beats.join(""), /幻惑/);
  assert.ok(drained.leaderSpiritSpentRatio > undrained.leaderSpiritSpentRatio);

  const sealed = runPartyBattle({
    allies: [fighter("guard", 0, 400, 40, 30)],
    enemies: pack(8, "balanced", "甲"),
    policy: "balanced",
    seed: "seal-note",
    maxRounds: 2,
    leaderId: "guard-0",
  });
  assert.match(sealed.summary.beats.join("") + sealed.summary.highlights.map((line) => line.note).join(""), /镇压/);
});

test("五人结队比同境界的单人更容易清甲级，丙级单人仍打得过一层", () => {
  const training = fighter("dps", 0, 205, 52, 30);
  const trainingWins = winsOf([training], "丙", 1);
  assert.ok(trainingWins >= 3);
  assert.ok(trainingWins > winsOf([training], "甲", 3));

  const coreParty = partyOf(240, 70, 36);
  const coreSolo = [fighter("dps", 0, 240, 70, 36)];
  assert.ok(winsOf(coreParty, "甲", 2) > winsOf(coreSolo, "甲", 2));

  const nascentParty = partyOf(320, 100, 48);
  const nascentSolo = [fighter("dps", 0, 320, 100, 48)];
  assert.ok(winsOf(nascentParty, "甲", 5) > winsOf(nascentSolo, "甲", 5));

  const spiritParty = partyOf(400, 130, 58);
  const spiritSolo = [fighter("dps", 0, 400, 130, 58)];
  assert.ok(winsOf(spiritParty, "甲", 8) > winsOf(spiritSolo, "甲", 8));
  assert.ok(winsOf(spiritSolo, "甲", 8) <= 1);
});

test("甲级输掉或撤出会挂伤、掉灵石，层数越高越重", () => {
  const early = jiaBandFailCost("甲", 2, "loss");
  const late = jiaBandFailCost("甲", 7, "loss");
  const fled = jiaBandFailCost("甲", 7, "withdraw");
  assert.ok(early);
  assert.ok(late);
  assert.ok(fled);
  assert.ok(late.injuryTicks > early.injuryTicks);
  assert.ok(late.stoneLoss > early.stoneLoss);
  assert.ok(fled.injuryTicks > 2);
  assert.match(fled.sentence, /神纹天隙/);
  assert.match(early.sentence, /丹霞内府/);
  assert.equal(jiaBandFailCost("乙", 9, "loss"), null);
  assert.equal(woundTicksForGuardian({
    rank: 8, grade: "甲", policy: "balanced", outcome: "loss", leaderHpLostRatio: 1, pressureInjury: 0,
  }), 11);
  assert.equal(companionWoundTicks({ rank: 8, grade: "甲", outcome: "loss", qiLoss: 1 }), 8);
  assert.equal(companionWoundTicks({ rank: 2, grade: "甲", outcome: "withdraw", qiLoss: 1 }), 0);
  assert.equal(companionWoundTicks({ rank: 5, grade: "甲", outcome: "loss", qiLoss: 1 }), 6);
});

test("地宫提醒和境界路线用完整的中文写出这一层的危险", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.locationId = "qingzhou:dungeon-c";
  const training = getCultivatorState(world, cultivator.id);
  assert.match(training.dungeon?.advice ?? "", /练手/);
  assert.equal((training.realmPath.where + training.realmPath.goals.join("")).includes("神纹天隙"), false);
  assert.equal((training.realmPath.where + (training.realmPath.resources ?? []).join("")).includes("丹霞露"), false);

  cultivator.realm = "金丹";
  cultivator.realmLevel = 9;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 9 },
  };
  const lateCore = getCultivatorState(world, cultivator.id);
  assert.match(lateCore.dungeon?.advice ?? "", /婴火莲池/);
  assert.match(lateCore.dungeon?.advice ?? "", /五人/);
  const midHint = lateCore.dungeon?.rankYieldHints.find((hint) => hint.rank === 4);
  assert.match(midHint?.mysteryLine ?? "", /养魂砂/);
  assert.match(midHint?.mysteryLine ?? "", /幻惑/);
  assert.match(lateCore.realmPath.where, /婴火莲池/);
  assert.match(lateCore.digest?.nextStep ?? "", /抽灵力/);
});

test("神纹天隙打输会扣灵石、挂伤，并在见闻里留下这一场", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "元婴";
  cultivator.realmLevel = 12;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 6 },
  };
  const stonesBefore = cultivator.spiritStones;
  const started = performAction(world, cultivator.id, "challenge-guardian:rank-7");
  assert.equal(started.accepted, true);
  for (let step = 0; step < 12 && cultivator.activeJobId; step += 1) {
    advanceWorld(world, 1);
  }
  assert.equal(cultivator.activeJobId, null);
  const log = world.combatLogs[0];
  assert.equal(log?.outcome, "defeat");
  assert.equal(log?.enemySnapshot.spellLoadoutId, "earth-suppress-tier-4");
  assert.equal(cultivator.spiritStones, stonesBefore - 60);
  assert.equal(cultivator.injuryTicksRemaining, 11);
  assert.ok(cultivator.statusEffects.some((effect) => effect.id === "deviation" && effect.remainingTicks === 3));
  const state = getCultivatorState(world, cultivator.id);
  assert.match(state.digest?.fights.join("") ?? "", /神纹天隙/);
  assert.match((cultivator.lifeLog ?? []).map((event) => event.text).join(""), /神纹天隙/);
});

test("丹霞内府的守关改用法术，不再被兵器功法盖住", () => {
  const world = createSeedWorld();
  const cultivator = world.cultivators["yun-zhong-he"]!;
  cultivator.realm = "金丹";
  cultivator.realmLevel = 7;
  cultivator.locationId = "qingzhou:dungeon-a";
  cultivator.dungeonProgress = {
    丙: { highestClearedRank: 9 },
    乙: { highestClearedRank: 9 },
    甲: { highestClearedRank: 0 },
  };
  performAction(world, cultivator.id, "challenge-guardian:rank-1");
  advanceWorld(world, 7);
  const log = world.combatLogs[0];
  assert.equal(log?.enemySnapshot.spellLoadoutId, "fire-blaze-tier-2");
  assert.equal(log?.enemySnapshot.weaponLoadoutId, null);
});
