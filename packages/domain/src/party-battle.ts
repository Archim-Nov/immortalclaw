import type { DungeonCombatSummary, DungeonExpeditionPolicy, PartyRoleId } from "./model.js";
import {
  PARTY_ROLE_LABEL,
  type ResolvedCombatSkill,
} from "./combat-skills.js";

export type EnemyPattern = "pressure" | "burst" | "drain" | "swift" | "seal";

export interface BattleCombatant {
  id: string;
  name: string;
  side: "party" | "enemy";
  role: PartyRoleId;
  hp: number;
  maxHp: number;
  weaponAttack: number;
  spellAttack: number;
  defense: number;
  speed: number;
  hit: number;
  dodge: number;
  crit: number;
  critDamage: number;
  guardHeart: number;
  spirit: number;
  maxSpirit: number;
  skills: ResolvedCombatSkill[];
  pattern?: EnemyPattern;
  elite?: boolean;
}

interface LiveFighter extends BattleCombatant {
  cooldowns: Record<string, number>;
  guardRatio: number;
  wardRatio: number;
  slowRounds: number;
  tauntRounds: number;
  skillsUsed: string[];
}

export interface PartyBattleResult {
  outcome: "win" | "loss" | "withdraw" | "draw";
  roundsPlayed: number;
  leaderHpLostRatio: number;
  leaderSpiritSpentRatio: number;
  companionQiLoss: Record<string, number>;
  summary: DungeonCombatSummary;
  beats: Array<{ kind: "close-call" | "injury" | "insight"; title: string; detail: string; mood: string }>;
  strikeLog: Array<{ leader: "hit" | "miss" | "crit" | null; enemy: "hit" | "miss" | "crit" | null }>;
  /** Who left the field. Set only when the outcome is withdraw. */
  retreatingSide: "party" | "enemy" | null;
  finalHp: Record<string, number>;
  /** Skill ids actually cast, keyed by combatant id. */
  practice: Array<{ id: string; skillIds: string[] }>;
}

interface PlannedAction {
  skill: ResolvedCombatSkill | null;
  flee: boolean;
  enemyName?: string;
  enemyPower?: number;
  enemySpirit?: number;
  enemyCrit?: number;
  enemySlow?: boolean;
  enemyDrain?: number;
  enemyGuard?: number;
  enemyFocus?: boolean;
}

const FLEE_SKILL: ResolvedCombatSkill = {
  id: "withdraw",
  name: "撤步",
  role: "dps",
  roles: ["dps", "breaker", "guard", "support", "control"],
  channel: "weapon",
  spiritCost: 0,
  qiCost: 0,
  cooldown: 0,
  target: "self",
  power: 0,
  guardRatio: 1,
  wardRatio: 1,
  healRatio: 0,
  hitBonus: 0,
  critBonus: 0,
  slow: false,
  focus: false,
  shred: 1,
  summary: "脱离这一场。",
};

function hashString(input: string): number {
  return Array.from(input).reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function enemyPatternFor(id: string, name: string): EnemyPattern {
  const text = `${id} ${name}`;
  if (text.includes("swift") || text.includes("速")) return "swift";
  if (text.includes("drain") || text.includes("消耗") || text.includes("抽")) return "drain";
  if (text.includes("seal") || text.includes("iron") || text.includes("铁") || text.includes("印")) return "seal";
  if (text.includes("spell") || text.includes("术")) return "burst";
  if (text.includes("heavy") || text.includes("重")) return "pressure";
  return "pressure";
}

function living(fighters: readonly LiveFighter[]): LiveFighter[] {
  return fighters.filter((fighter) => fighter.hp > 0);
}

function tickCooldowns(fighter: LiveFighter): void {
  for (const id of Object.keys(fighter.cooldowns)) {
    fighter.cooldowns[id] = Math.max(0, (fighter.cooldowns[id] ?? 0) - 1);
  }
  fighter.slowRounds = Math.max(0, fighter.slowRounds - 1);
  fighter.tauntRounds = Math.max(0, fighter.tauntRounds - 1);
}

function initiative(fighter: LiveFighter, seed: string): number {
  const slow = fighter.slowRounds > 0 ? 8 : 0;
  return fighter.speed - slow + (hashString(seed) % 11);
}

function fleeThreshold(policy: DungeonExpeditionPolicy): number {
  if (policy === "conservative") return 0.45;
  if (policy === "balanced") return 0.3;
  return 0.18;
}

function shouldFlee(
  fighter: LiveFighter,
  allies: readonly LiveFighter[],
  policy: DungeonExpeditionPolicy,
  duel = false,
): boolean {
  if (!duel && fighter.side !== "party") return false;
  const selfRatio = fighter.maxHp > 0 ? fighter.hp / fighter.maxHp : 0;
  const party = living(allies);
  const partyRatio = party.length === 0
    ? 0
    : party.reduce((sum, ally) => sum + ally.hp / Math.max(1, ally.maxHp), 0) / party.length;
  if (selfRatio < fleeThreshold(policy)) return true;
  return policy === "conservative" && partyRatio < 0.4;
}

function legalSkills(fighter: LiveFighter): ResolvedCombatSkill[] {
  return fighter.skills.filter((skill) => {
    if (!skill.roles.includes(fighter.role) && skill.id !== "basic-strike") return false;
    if ((fighter.cooldowns[skill.id] ?? 0) > 0) return false;
    if (fighter.spirit < skill.spiritCost) return false;
    if (fighter.hp <= skill.qiCost) return false;
    return true;
  });
}

function woundedAlly(allies: readonly LiveFighter[], self: LiveFighter): LiveFighter | null {
  const hurt = living(allies)
    .filter((ally) => ally.hp / Math.max(1, ally.maxHp) < 0.55)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  return hurt.find((ally) => ally.id !== self.id) ?? hurt[0] ?? null;
}

function pickSkill(skills: readonly ResolvedCombatSkill[], prefer: (skill: ResolvedCombatSkill) => boolean): ResolvedCombatSkill | null {
  return skills.find(prefer) ?? null;
}

export function choosePartyAction(
  fighter: LiveFighter,
  allies: readonly LiveFighter[],
  enemies: readonly LiveFighter[],
  policy: DungeonExpeditionPolicy,
  round = 1,
  duel = false,
): PlannedAction {
  if (shouldFlee(fighter, allies, policy, duel)) {
    return { skill: FLEE_SKILL, flee: true };
  }
  const skills = legalSkills(fighter);
  const basic = skills.find((skill) => skill.id === "basic-strike") ?? skills[0] ?? null;
  const hurt = woundedAlly(allies, fighter);
  const slowed = living(enemies).some((enemy) => enemy.slowRounds > 0);
  const reserve = fighter.maxSpirit > 0 ? fighter.spirit / fighter.maxSpirit : 0;
  const affordable = (skill: ResolvedCombatSkill) => skill.spiritCost === 0 || skill.spiritCost <= fighter.spirit * 0.45 || reserve > 0.55;

  if (fighter.role === "guard") {
    const guard = pickSkill(skills, (skill) => skill.focus || skill.guardRatio < 1 || skill.wardRatio < 1);
    if (hurt && guard) return { skill: guard, flee: false };
    if (guard && hashString(`${fighter.id}:${round}:guard`) % 2 === 0) return { skill: guard, flee: false };
  }
  if (fighter.role === "support") {
    const heal = pickSkill(skills, (skill) => skill.healRatio > 0 && affordable(skill));
    const ward = pickSkill(skills, (skill) => skill.wardRatio < 1 && affordable(skill));
    if (hurt && heal) return { skill: heal, flee: false };
    if (hurt && ward) return { skill: ward, flee: false };
    if (ward && affordable(ward)) return { skill: ward, flee: false };
  }
  if (fighter.role === "control" && !slowed) {
    const control = pickSkill(skills, (skill) => skill.slow && affordable(skill));
    if (control) return { skill: control, flee: false };
  }
  if (fighter.role === "breaker") {
    const breaker = skills
      .filter((skill) => skill.shred < 1 && skill.power > 0 && affordable(skill))
      .sort((a, b) => b.power - a.power)[0];
    if (breaker) return { skill: breaker, flee: false };
  }
  if (fighter.role === "dps") {
    const burst = skills
      .filter((skill) => skill.power > 1 && skill.target === "enemy" && affordable(skill))
      .sort((a, b) => b.power / Math.max(1, b.spiritCost) - a.power / Math.max(1, a.spiritCost))[0];
    if (burst) return { skill: burst, flee: false };
  }
  return { skill: basic, flee: false };
}

function chooseEnemyAction(fighter: LiveFighter, round: number): PlannedAction {
  const pattern = fighter.pattern ?? "pressure";
  if (pattern === "seal" && round % 2 === 1) {
    return { skill: null, flee: false, enemyName: "封架", enemyGuard: 0.55, enemyFocus: true };
  }
  if (pattern === "burst" && round % 2 === 0 && fighter.spirit >= 8) {
    return { skill: null, flee: false, enemyName: "术爆", enemyPower: 1.4, enemySpirit: 8, enemyCrit: 6 };
  }
  if (pattern === "drain") {
    return { skill: null, flee: false, enemyName: "抽灵", enemyPower: 0.9, enemyDrain: 6 };
  }
  if (pattern === "swift") {
    return { skill: null, flee: false, enemyName: "速袭", enemyPower: 1.05, enemyCrit: 8 };
  }
  if (pattern === "seal") {
    return { skill: null, flee: false, enemyName: "砸击", enemyPower: 1 };
  }
  if (pattern === "burst") {
    return { skill: null, flee: false, enemyName: "术击", enemyPower: 1 };
  }
  return { skill: null, flee: false, enemyName: "重压", enemyPower: 1.15 };
}

function pickEnemyTarget(attacker: LiveFighter, allies: readonly LiveFighter[]): LiveFighter | null {
  const open = living(allies);
  if (open.length === 0) return null;
  const taunt = open.find((ally) => ally.tauntRounds > 0);
  if (taunt && attacker.pattern !== "burst") return taunt;
  if (attacker.pattern === "swift") {
    return [...open].sort((a, b) => b.speed - a.speed)[0] ?? null;
  }
  if (attacker.pattern === "drain") {
    return [...open].sort((a, b) => b.spirit - a.spirit)[0] ?? null;
  }
  return [...open].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? null;
}

function pickPartyTarget(attacker: LiveFighter, enemies: readonly LiveFighter[]): LiveFighter | null {
  const open = living(enemies);
  if (open.length === 0) return null;
  if (attacker.role === "dps") {
    return open.find((enemy) => enemy.elite) ?? [...open].sort((a, b) => b.hp - a.hp)[0] ?? null;
  }
  if (attacker.role === "breaker") {
    return [...open].sort((a, b) => b.defense - a.defense)[0] ?? null;
  }
  return [...open].sort((a, b) => a.hp - b.hp)[0] ?? null;
}

function pickAllyTarget(allies: readonly LiveFighter[], self: LiveFighter): LiveFighter {
  const hurt = woundedAlly(allies, self);
  return hurt ?? self;
}

interface ActRecord {
  round: number;
  actorName: string;
  roleLabel: string;
  skillName: string;
  targetName: string;
  result: DungeonCombatSummary["highlights"][number]["result"];
  note: string;
  leaderStrike: "hit" | "miss" | "crit" | null;
  enemyStrike: "hit" | "miss" | "crit" | null;
}

function noteOf(actor: string, role: string, skill: string, target: string, resultText: string): string {
  return `${actor}以${role}使出${skill}，${resultText}${target}。`;
}

function applyDamage(
  attacker: LiveFighter,
  defender: LiveFighter,
  power: number,
  channel: "weapon" | "spell",
  hitBonus: number,
  critBonus: number,
  shred: number,
  seed: string,
): { result: "hit" | "miss" | "crit"; damage: number } {
  const hitChance = clamp(75 + ((attacker.hit + hitBonus - defender.dodge) * 0.2), 35, 97);
  if ((hashString(`${seed}:hit`) % 100) >= hitChance) {
    return { result: "miss", damage: 0 };
  }
  const critChance = clamp(attacker.crit + critBonus - defender.guardHeart * 0.7, 0, 55);
  const isCrit = (hashString(`${seed}:crit`) % 100) < critChance;
  const attack = channel === "spell" ? attacker.spellAttack : attacker.weaponAttack;
  const defense = Math.max(0, Math.round(defender.defense * shred));
  const base = Math.max(1, attack - defense * 0.5);
  const critMult = isCrit ? Math.max(1.1, attacker.critDamage / 100) : 1;
  const taken = defender.guardRatio * defender.wardRatio;
  const damage = Math.max(1, Math.round(base * power * critMult * taken));
  defender.guardRatio = 1;
  defender.wardRatio = 1;
  defender.hp = Math.max(0, defender.hp - damage);
  return { result: isCrit ? "crit" : "hit", damage };
}

function spend(fighter: LiveFighter, skill: ResolvedCombatSkill): void {
  fighter.spirit = Math.max(0, fighter.spirit - skill.spiritCost);
  fighter.hp = Math.max(1, fighter.hp - skill.qiCost);
  if (skill.cooldown > 0) fighter.cooldowns[skill.id] = skill.cooldown;
  if (!fighter.skillsUsed.includes(skill.id)) fighter.skillsUsed.push(skill.id);
}

function applySelfBuff(fighter: LiveFighter, skill: ResolvedCombatSkill): void {
  if (skill.guardRatio < 1) fighter.guardRatio = Math.min(fighter.guardRatio, skill.guardRatio);
  if (skill.wardRatio < 1) fighter.wardRatio = Math.min(fighter.wardRatio, skill.wardRatio);
  if (skill.focus) fighter.tauntRounds = 2;
}

function fleeChance(fighter: LiveFighter, enemies: readonly LiveFighter[], duel: boolean): number {
  const pursuer = living(enemies).sort((a, b) => b.speed - a.speed)[0];
  const speedGap = fighter.speed - (pursuer?.speed ?? fighter.speed);
  const ratio = fighter.hp / Math.max(1, fighter.maxHp);
  let chance = clamp(35 + (speedGap * 0.2) + (ratio <= 0.2 ? 20 : 0), 10, 85);
  if (duel && ratio <= 0.15 && speedGap >= 200) chance = 100;
  return chance;
}

function actParty(
  fighter: LiveFighter,
  allies: LiveFighter[],
  enemies: LiveFighter[],
  action: PlannedAction,
  round: number,
  seed: string,
  leaderId: string,
  duel = false,
): ActRecord {
  const roleLabel = PARTY_ROLE_LABEL[fighter.role];
  if (action.flee) {
    const chance = fleeChance(fighter, enemies, duel);
    const success = (hashString(`${seed}:flee`) % 100) < chance;
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName: "撤步",
      targetName: fighter.name,
      result: "flee",
      note: success
        ? `${fighter.name}以${roleLabel}撤步，这一场退出去了。`
        : `${fighter.name}想撤，没能离开。`,
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  const skill = action.skill;
  if (!skill) {
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName: "寻常一击",
      targetName: fighter.name,
      result: "miss",
      note: `${fighter.name}这一拍没有出手。`,
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  spend(fighter, skill);
  if (skill.healRatio > 0) {
    const target = skill.target === "self" ? fighter : pickAllyTarget(allies, fighter);
    const amount = Math.max(1, Math.round(target.maxHp * skill.healRatio));
    target.hp = Math.min(target.maxHp, target.hp + amount);
    if (skill.wardRatio < 1) target.wardRatio = Math.min(target.wardRatio, skill.wardRatio);
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName: skill.name,
      targetName: target.name,
      result: "heal",
      note: noteOf(fighter.name, roleLabel, skill.name, target.name, "补上了"),
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  if (skill.power <= 0) {
    const targets = skill.target === "all-allies" ? living(allies) : [skill.target === "ally" ? pickAllyTarget(allies, fighter) : fighter];
    for (const target of targets) {
      if (skill.guardRatio < 1 && target.id === fighter.id) applySelfBuff(fighter, skill);
      if (skill.wardRatio < 1) target.wardRatio = Math.min(target.wardRatio, skill.wardRatio);
      if (skill.focus && target.id === fighter.id) fighter.tauntRounds = 2;
    }
    if (skill.guardRatio < 1 && skill.target === "self") applySelfBuff(fighter, skill);
    const targetName = targets.map((target) => target.name).join("、");
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName: skill.name,
      targetName,
      result: skill.wardRatio < 1 && skill.guardRatio >= 1 ? "ward" : "guard",
      note: noteOf(fighter.name, roleLabel, skill.name, targetName, skill.focus ? "守住并引开了" : "护住了"),
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  const targets = skill.target === "all-enemies" ? living(enemies) : [pickPartyTarget(fighter, enemies)].filter((target): target is LiveFighter => Boolean(target));
  let best: "hit" | "miss" | "crit" = "miss";
  const names: string[] = [];
  for (const target of targets) {
    const strike = applyDamage(fighter, target, skill.power, skill.channel, skill.hitBonus, skill.critBonus, skill.shred, `${seed}:${target.id}`);
    if (skill.slow && strike.result !== "miss") target.slowRounds = 2;
    if (strike.result === "crit") best = "crit";
    else if (strike.result === "hit" && best !== "crit") best = "hit";
    names.push(target.name);
  }
  const targetName = names.join("、") || "空处";
  const resultText = best === "crit" ? "一击会心打在" : best === "hit" ? "击中" : "没打中";
  return {
    round,
    actorName: fighter.name,
    roleLabel,
    skillName: skill.name,
    targetName,
    result: best,
    note: noteOf(fighter.name, roleLabel, skill.name, targetName, resultText),
    leaderStrike: fighter.id === leaderId ? best : null,
    enemyStrike: fighter.side === "enemy" ? best : null,
  };
}

function actEnemy(
  fighter: LiveFighter,
  allies: LiveFighter[],
  action: PlannedAction,
  round: number,
  seed: string,
): ActRecord {
  const roleLabel = "敌手";
  const skillName = action.enemyName ?? "进攻";
  if (action.enemyGuard && action.enemyGuard < 1) {
    fighter.guardRatio = Math.min(fighter.guardRatio, action.enemyGuard);
    if (action.enemyFocus) fighter.tauntRounds = 1;
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName,
      targetName: fighter.name,
      result: "guard",
      note: `${fighter.name}以${skillName}封住了自己的门。`,
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  fighter.spirit = Math.max(0, fighter.spirit - (action.enemySpirit ?? 0));
  const target = pickEnemyTarget(fighter, allies);
  if (!target) {
    return {
      round,
      actorName: fighter.name,
      roleLabel,
      skillName,
      targetName: "无人",
      result: "miss",
      note: `${fighter.name}没有找到能打的人。`,
      leaderStrike: null,
      enemyStrike: null,
    };
  }
  const strike = applyDamage(
    fighter,
    target,
    action.enemyPower ?? 1,
    fighter.spellAttack > fighter.weaponAttack ? "spell" : "weapon",
    0,
    action.enemyCrit ?? 0,
    1,
    seed,
  );
  if (action.enemyDrain && strike.result !== "miss") {
    target.spirit = Math.max(0, target.spirit - action.enemyDrain);
  }
  if (action.enemySlow && strike.result !== "miss") target.slowRounds = 1;
  const result = action.enemyDrain && strike.result !== "miss" ? "drain" as const : strike.result;
  const resultText = result === "crit" ? "会心打在" : result === "drain" ? "抽走灵力，打在" : result === "hit" ? "击中" : "没打中";
  return {
    round,
    actorName: fighter.name,
    roleLabel,
    skillName,
    targetName: target.name,
    result,
    note: `${fighter.name}以${skillName}${resultText}${target.name}。`,
    leaderStrike: null,
    enemyStrike: strike.result,
  };
}

function readableBeats(records: readonly ActRecord[], enemyName: string, outcome: PartyBattleResult["outcome"]): string[] {
  const beats: string[] = [];
  const first = records.find((record) => record.result === "crit" || record.result === "hit" || record.result === "heal" || record.result === "guard");
  if (first) beats.push(first.note);
  const support = records.find((record) => (record.result === "heal" || record.result === "guard" || record.result === "ward") && record !== first);
  if (support && beats.length < 3) beats.push(support.note);
  const ending = outcome === "win"
    ? `${enemyName}撑不住，这一场赢了。`
    : outcome === "loss"
      ? `人倒在${enemyName}面前，这一场输了。`
      : outcome === "draw"
        ? `${enemyName}和这边都还站着，这一场算平手。`
        : `有人撤步，这一场退出${enemyName}。`;
  if (beats.length < 3) beats.push(ending);
  return beats.slice(0, 3);
}

function awaken(combatant: BattleCombatant): LiveFighter {
  return {
    ...combatant,
    hp: Math.max(1, combatant.hp),
    maxHp: Math.max(1, combatant.maxHp),
    cooldowns: {},
    guardRatio: 1,
    wardRatio: 1,
    slowRounds: 0,
    tauntRounds: 0,
    skillsUsed: [],
    skills: combatant.skills.map((skill) => ({ ...skill })),
  };
}

export function runPartyBattle(input: {
  allies: BattleCombatant[];
  enemies: BattleCombatant[];
  policy: DungeonExpeditionPolicy;
  seed: string;
  maxRounds?: number;
  leaderId?: string;
  /** Both sides cast their own skills. A close timeout is a draw, not a retreat. */
  duel?: boolean;
}): PartyBattleResult {
  const allies = input.allies.map(awaken);
  const enemies = input.enemies.map(awaken);
  const leaderId = input.leaderId ?? allies[0]?.id ?? "";
  const leaderStartHp = allies.find((ally) => ally.id === leaderId)?.hp ?? 0;
  const leaderStartSpirit = allies.find((ally) => ally.id === leaderId)?.spirit ?? 0;
  const leaderMaxHp = allies.find((ally) => ally.id === leaderId)?.maxHp ?? 1;
  const leaderMaxSpirit = Math.max(1, allies.find((ally) => ally.id === leaderId)?.maxSpirit ?? 1);
  const enemyName = enemies.map((enemy) => enemy.name).join("、") || "空阵";
  const records: ActRecord[] = [];
  const strikeLog: PartyBattleResult["strikeLog"] = [];
  let outcome: PartyBattleResult["outcome"] | null = null;
  let retreatingSide: PartyBattleResult["retreatingSide"] = null;
  const maxRounds = input.maxRounds ?? (input.policy === "conservative" ? 5 : input.policy === "aggressive" ? 8 : 6);

  if (allies.length === 0) {
    const summary: DungeonCombatSummary = {
      enemyName,
      outcome: "withdraw",
      rounds: 0,
      party: [],
      beats: ["没有人站进这一场。"],
      highlights: [],
    };
    return {
      outcome: "withdraw",
      roundsPlayed: 0,
      leaderHpLostRatio: 0,
      leaderSpiritSpentRatio: 0,
      companionQiLoss: {},
      summary,
      beats: [{ kind: "insight", title: "无人应战", detail: "没有人站进这一场。", mood: "门口是空的" }],
      strikeLog: [],
      retreatingSide: null,
      finalHp: {},
      practice: [],
    };
  }

  let round = 0;
  while (round < maxRounds && !outcome) {
    round += 1;
    const order = [...living(allies), ...living(enemies)].sort((a, b) => {
      const delta = initiative(b, `${input.seed}:init:${round}:${b.id}`) - initiative(a, `${input.seed}:init:${round}:${a.id}`);
      if (delta !== 0) return delta;
      return hashString(`${input.seed}:tie:${round}:${a.id}`) - hashString(`${input.seed}:tie:${round}:${b.id}`);
    });
    let leaderStrike: ActRecord["leaderStrike"] = null;
    let enemyStrike: ActRecord["enemyStrike"] = null;
    for (const fighter of order) {
      if (fighter.hp <= 0) continue;
      if (living(allies).length === 0 || living(enemies).length === 0) break;
      const seed = `${input.seed}:r${round}:${fighter.id}`;
      const ownSide = fighter.side === "party" ? allies : enemies;
      const otherSide = fighter.side === "party" ? enemies : allies;
      const record = fighter.side === "party" || input.duel
        ? actParty(
          fighter,
          ownSide,
          otherSide,
          choosePartyAction(fighter, ownSide, otherSide, input.policy, round, Boolean(input.duel)),
          round,
          seed,
          leaderId,
          Boolean(input.duel),
        )
        : actEnemy(fighter, allies, chooseEnemyAction(fighter, round), round, seed);
      records.push(record);
      if (record.leaderStrike) leaderStrike = record.leaderStrike;
      if (record.enemyStrike) enemyStrike = record.enemyStrike;
      if (record.result === "flee" && record.note.includes("退出去了")) {
        outcome = "withdraw";
        retreatingSide = fighter.side;
        break;
      }
      if (living(enemies).length === 0) {
        outcome = "win";
        break;
      }
      if (living(allies).length === 0) {
        outcome = "loss";
        break;
      }
    }
    strikeLog.push({ leader: leaderStrike, enemy: enemyStrike });
    for (const fighter of [...allies, ...enemies]) tickCooldowns(fighter);
  }

  if (!outcome) {
    const allyRatio = living(allies).reduce((sum, ally) => sum + ally.hp / ally.maxHp, 0) / Math.max(1, allies.length);
    const enemyRatio = living(enemies).reduce((sum, enemy) => sum + enemy.hp / enemy.maxHp, 0) / Math.max(1, enemies.length);
    if (living(enemies).length === 0) outcome = "win";
    else if (living(allies).length === 0) outcome = "loss";
    else if (input.duel) {
      const gap = Math.abs(allyRatio - enemyRatio);
      if (gap < 0.08) outcome = "draw";
      else outcome = allyRatio > enemyRatio ? "win" : "loss";
    } else if (allyRatio > enemyRatio) outcome = "win";
    else outcome = input.policy === "aggressive" ? "loss" : "withdraw";
  }

  const leader = allies.find((ally) => ally.id === leaderId) ?? allies[0]!;
  const beats = readableBeats(records, enemyName, outcome);
  const highlights = records.slice(0, 4).map((record) => ({
    round: record.round,
    actorName: record.actorName,
    roleLabel: record.roleLabel,
    skillName: record.skillName,
    targetName: record.targetName,
    result: record.result,
    note: record.note,
  }));
  const summary: DungeonCombatSummary = {
    enemyName,
    outcome,
    rounds: round,
    party: allies.map((ally) => ({
      name: ally.name,
      roleLabel: PARTY_ROLE_LABEL[ally.role],
      skills: ally.skillsUsed.slice(0, 3).map((id) => ally.skills.find((skill) => skill.id === id)?.name ?? id),
    })),
    beats,
    highlights,
  };
  const companionQiLoss: Record<string, number> = {};
  for (const ally of allies) {
    if (ally.id === leaderId) continue;
    const start = input.allies.find((candidate) => candidate.id === ally.id);
    const lost = Math.max(0, (start?.hp ?? ally.maxHp) - ally.hp);
    const ratio = lost / Math.max(1, ally.maxHp);
    if (ratio > 0) companionQiLoss[ally.id] = Math.max(1, Math.min(12, Math.round(ratio * 10)));
  }
  return {
    outcome,
    roundsPlayed: round,
    leaderHpLostRatio: clamp((leaderStartHp - leader.hp) / Math.max(1, leaderMaxHp), 0, 1),
    leaderSpiritSpentRatio: clamp((leaderStartSpirit - leader.spirit) / leaderMaxSpirit, 0, 1),
    companionQiLoss,
    summary,
    beats: beats.map((detail, index) => ({
      kind: outcome === "win" ? "close-call" as const : outcome === "draw" ? "insight" as const : "injury" as const,
      title: index === 0 ? enemyName : `${enemyName}·${index + 1}`,
      detail,
      mood: outcome === "win" ? "这一场是打赢的" : outcome === "loss" ? "这一场没站住" : outcome === "draw" ? "这一架没分出高下" : "人先撤了",
    })),
    strikeLog,
    retreatingSide,
    finalHp: Object.fromEntries([...allies, ...enemies].map((fighter) => [fighter.id, fighter.hp])),
    practice: [...allies, ...enemies].map((fighter) => ({ id: fighter.id, skillIds: [...fighter.skillsUsed] })),
  };
}
