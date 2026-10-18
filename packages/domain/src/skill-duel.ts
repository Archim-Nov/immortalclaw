import { buildCultivatorCombatSnapshot } from "./combat-snapshot.js";
import { partyRoleForCultivator, skillsForCultivator } from "./combat-skills.js";
import type { CombatSnapshot, Cultivator } from "./model.js";
import { runPartyBattle, type BattleCombatant, type PartyBattleResult } from "./party-battle.js";

/**
 * Immediate cultivator-versus-cultivator skill fight.
 *
 * A city challenge does the same thing inside `resolveCityDuelWithSkills`:
 * both sides become battle combatants from `buildCultivatorCombatSnapshot`,
 * then `runPartyBattle` runs with `duel: true`. A bahuang meeting is not a
 * job, so the wake calls this helper and settles on the same tick.
 */
export function runCultivatorSkillDuel(input: {
  left: Cultivator;
  right: Cultivator;
  seed: string;
  maxRounds?: number;
}): PartyBattleResult {
  const leftSnap = buildCultivatorCombatSnapshot(input.left, true);
  const rightSnap = buildCultivatorCombatSnapshot(input.right, true);
  return runPartyBattle({
    allies: [duelCombatant(input.left, leftSnap, "party")],
    enemies: [duelCombatant(input.right, rightSnap, "enemy")],
    policy: "balanced",
    seed: input.seed,
    maxRounds: input.maxRounds ?? 7,
    leaderId: input.left.id,
    duel: true,
  });
}

function duelCombatant(
  cultivator: Cultivator,
  snap: CombatSnapshot,
  side: "party" | "enemy",
): BattleCombatant {
  const role = partyRoleForCultivator(cultivator);
  const roleXp = cultivator.roleExperience?.[role.id] ?? 0;
  return {
    id: cultivator.id,
    name: cultivator.name,
    side,
    role: role.id,
    hp: Math.max(1, snap.hp),
    maxHp: Math.max(1, snap.maxHp),
    weaponAttack: Math.max(1, snap.weaponAttack ?? snap.attack),
    spellAttack: Math.max(1, snap.spellAttack ?? snap.attack),
    defense: snap.defense,
    speed: snap.speed,
    hit: snap.hit + Math.min(3, Math.floor(roleXp / 8)),
    dodge: snap.dodge,
    crit: snap.crit,
    critDamage: snap.critDamage,
    guardHeart: snap.guardHeart,
    spirit: Math.max(0, cultivator.spiritualPower),
    maxSpirit: Math.max(1, cultivator.maxSpiritualPower),
    skills: skillsForCultivator(cultivator),
  };
}
