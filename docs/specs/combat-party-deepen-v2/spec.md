# Combat And Party Deepen v2

## Summary

City duels use the same turn-based skill fight as dungeon guardians. An agent can choose a party role and up to three ready skills when the loadout can actually cast them. A companion who steps away from the gate stays on the expedition until they explicitly leave. A sixth person can wait as reserve and rotate in without raising the cap of five. Using a skill, and winning a harder fight, adds a small amount of practice.

## Problem

Dungeon guardians already resolve as turn-based fights. City duels still used the older round resolver, so the two sides did not cast the same named skills. The role was inferred and could not be chosen. A companion who left the dungeon location was dropped from the run with no action that said they were leaving. A full party refused a sixth person outright, so someone like 沈砺 could not wait for a seat. Skills did not improve from being used.

## Goals

- Resolve a city duel with the party battle, including both cultivators' roles and skills, and write one short report both travelogues can retell.
- Keep the existing stone, reputation, affinity, and rivalry results of a city duel.
- Let an agent set `set-party-role:<role>` only for a role this weapon, spell, and spirit root can stand, and keep up to three skills with `equip-skill-slot:<skillId>`.
- Keep a companion on a dungeon run if they were in it at the start. Remove them only with `leave-shared-expedition`.
- Let a leader `party-kick` a member, and let an outsider `queue-party-reserve` so the leader can `party-rotate` them in. The field stays at five.
- Grant a little skill practice and role experience. The power gain stops at 4.8%.
- Check role-mix win rates at dungeon ranks 1–3 so one role does not clear every fight alone at 炼气.

## Non-Goals

- A new client for the fight log.
- Raising the party cap above five.
- Rewriting wilderness clashes, which still use the older round resolver.
- Letting practice replace a weapon, a spell, or a realm.

## User-Visible Behavior

A city duel still starts with `challenge-cultivator` and `accept-pvp-challenge`. When the job ticks, both sides act by speed and cast skills from their role. The travelogue on each side keeps the older stance line and adds a 切磋 note that names the skills. Stones, reputation, affinity, and `lastDuel` follow the same outcome rules as before, including a retreat and a draw when the fight times out with both sides still close.

`combatProfile.partyRole` is the role that will be used. `legalPartyRoles` lists the roles this loadout can stand. `preferredPartyRole` is the choice, when there is one. `equippedSkillIds` is the ready list, at most three, and `equippedSkills` is what the fight will cast. An empty ready list means every skill that role can cast. `skillProficiency` and `roleExperience` show the small practice totals.

If a companion was on the expedition when it started, walking away from the gate or starting another job skips that step's qi chip and that step's fight. Their id stays on the run. `leave-shared-expedition` is the explicit exit. Coming back before the run ends puts them in the next fight. Only people still in the dungeon at the end share the stones or the injury.

`party-invite` still fails when five people are already on the field. `queue-party-reserve:<leaderId>` puts one outsider in the reserve seat after they are at least 认识 with the leader. `party-rotate:<memberId>` swaps that member with the reserve. `party-kick:<memberId>` removes a member, and if someone is waiting they take the open seat. `leave-party-reserve` drops out of the queue.

Winning a guardian at rank 2 or higher, or winning a city duel that lasts at least five rounds, grants one extra practice point on the skills that were cast. Other fights that cast a skill grant one. The bonus to power is `0.2%` per point, and it stops at 24 points.

## Constraints

- New fields are optional and old saves hydrate with empty practice, no preferred role, and no reserve.
- No new required action. Existing enter, share-at-gate, challenge, and party invite ids stay valid.
- The party field never holds a sixth member.

## Acceptance Criteria

- A finished city duel mentions a skill with 使出 on both travelogues, and affinity still rises when nobody retreated.
- Setting a role the loadout cannot stand is refused. Three skill slots fill, and a fourth is refused.
- A companion who leaves the gate mid-run is still on `companionIds` until `leave-shared-expedition`.
- 沈砺 can queue against a full party and rotate in. The field length stays five, and `party-invite` of a sixth person still fails.
- A skill at 24 practice is stronger than the same skill at 0, and not stronger than a 4.8% increase.
- Role-mix checks at ranks 1–3 are recorded in the pull request.

## Open Questions

- None for this pass. Wilderness clashes stay on the older resolver until a later change.
