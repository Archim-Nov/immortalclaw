# Dungeon turn combat

## Summary

Dungeon guardian rooms resolve as turn-based fights. Each cultivator brings a role and a skill list opened by their spirit root, weapon, and equipped spell. The expedition report names who did what. Search steps, the 30-tick job, gate sharing, and the party cap of five stay in place.

## Problem

A guardian step already picks an enemy such as 术式守卫, then throws that fight away. The report the agent reads is still a qi and spiritual-power total. `combatProfile` already has weapon attack, spell attack, hit, dodge, and crit, and loadouts already know their weapon type and spell branch, but a turn only chooses a generic basic attack or core skill. Companions at the gate lose a little qi and never take a turn.

## Goals

- Resolve guardian steps with initiative order, hit, dodge, crit, and an outcome of win, loss, or withdraw.
- Let each party member act on their own turn. Roles are 主攻, 破法, 护卫, 辅助, and 控场, assigned from the loadout and spirit root.
- Give each role several skills. A skill is available only when the weapon family or type, the spirit root, or the equipped spell branch matches. Starter sword plus a metal-edge spell stays playable.
- Keep the expensive hits expensive. A high multiplier needs spirit and a cooldown. An area attack is weaker per target than a single-target hit.
- Put `partyRole` and `availableSkills` on `combatProfile`. Put up to three `combatRounds` on the expedition report, each with one to three Chinese beats.
- Scale guardian enemies up for higher rank and for an aggressive posture, and give those fights a longer round cap.
- Leave enter-dungeon, abort, sharedDungeon, and the five-person cap alone.

## Non-Goals

- A new client combat screen.
- Rewriting the travelogue system. A fight may add a short note; older notes stay.
- A new party-invite action, or a way to set the role by hand. The role function accepts an override later; this change does not add an action id.
- Replacing the city-duel resolver. Duels still use the existing one-on-one rounds.

## Behavior

On a guardian step the leader and every idle companion still at that gate enter one fight. Speed sets the order each round. A cultivator can strike, guard, cast a skill they actually have, or withdraw when their posture's health line says to leave.

Enemies keep the existing names and lean on a pattern: 重压 presses whoever is open, 术式 bursts, 消耗 drains spirit, 速袭 goes for the fast target, 守印 spends a turn sealing itself.

A win keeps the guardian loot the step already grants and adds a small stone bonus that is larger on an aggressive run. A loss withholds that loot, adds injury, and spends more qi. A withdraw leaves without the guardian cache. Qi and spiritual power still move, scaled from how much of the fight the leader actually lost, and they stay in the same band as the old posture drain so a healthy rank-1 run can finish and a rank-4 aggressive run can still collapse.

`lastReport.summary` repeats the latest fight in one sentence. `lastReport.combatRounds` holds the compact log. Search steps still write the old room beats and do not open a fight.

Skills:

- Shared arts (寻常一击, 蓄力, 守势, 垫步, 护持, 托底, 缠步, 扰神, 拆招) are always available, so a fresh 炼气 cultivator can fill their role.
- Each weapon family adds two arts. Each weapon type adds one signature, so a saber casts 刀势 and a spear casts 枪出.
- Each spirit-root element adds two arts. The equipped spell's element also opens those arts; if the element is not in the root, the power is nine tenths.
- A spell branch can add one more art that requires that branch.

An unset registration is treated as a metal-wood dual root, which matches the existing tie-break on equal element scores.

## Constraints

- New report and profile fields are additive. Older saves hydrate `combatRounds` to an empty list.
- No new action id.
- A missing party does not throw. The fight ends as a withdraw and says nobody stepped in.
- One companion error must not abort the leader's step. If the new fight throws, the step falls back to the previous one-on-one resolver.

## Acceptance

- Initiative, role bias, win, loss, withdraw, an empty party, and a two-person contribution are covered by unit tests.
- A frontier dungeon run's `lastReport.combatRounds` names a role and a result. A gate companion is named and never receives a second job.
- Existing enter-dungeon, abort, catastrophic collapse, and shared-dungeon tests still pass.
- Starter sword plus metal-edge exposes 破法 and at least two breaker skills, including 剑引 and not 枪出.
- No skill at power 1.5 or higher is cheap, and area skills stay at or below 0.8 power.
